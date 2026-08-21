use adb_client::server::ADBServer;
use adb_client::server_device::ADBServerDevice;
use std::sync::Arc;
use tauri::State;

use super::helpers::*;
use super::history::{record_command, CommandHistoryState};
use super::models::*;

// ============================================
// Tauri Commands
// ============================================

#[tauri::command]
pub async fn list_devices() -> Result<Vec<DeviceInfo>, String> {
    tokio::task::spawn_blocking(|| {
        let mut server = ADBServer::default();
        let devices = server
            .devices_long()
            .map_err(|e| format!("Failed to list devices: {}", e))?;

        let device_infos: Vec<DeviceInfo> = devices
            .into_iter()
            .map(|dev| {
                let model = if dev.model.is_empty() || dev.model == "Unk" {
                    dev.product.clone()
                } else {
                    dev.model.clone()
                };

                DeviceInfo {
                    id: dev.identifier.clone(),
                    model,
                    status: map_device_state(&dev.state),
                    connection: detect_connection_type(&dev.identifier),
                }
            })
            .collect();

        Ok(device_infos)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn get_device_detail(device_id: String) -> Result<DeviceDetail, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id.clone(), None);

        let props = vec![
            ("ro.product.model", "model"),
            ("ro.product.brand", "brand"),
            ("ro.build.version.release", "android_version"),
            ("ro.build.version.sdk", "sdk_version"),
            ("ro.build.display.id", "build_number"),
            ("ro.product.name", "product"),
            ("ro.product.device", "device"),
        ];

        let mut detail = DeviceDetail {
            id: device_id.clone(),
            model: "unknown".to_string(),
            brand: "unknown".to_string(),
            android_version: "unknown".to_string(),
            sdk_version: "unknown".to_string(),
            build_number: "unknown".to_string(),
            product: "unknown".to_string(),
            device: "unknown".to_string(),
            battery_level: None,
        };

        for (prop, field) in &props {
            let command = format!("getprop {}", prop);
            match execute_shell_command(&mut device, &command) {
                Ok((stdout, _, _)) => {
                    let value = stdout.trim().to_string();
                    if !value.is_empty() && value != "unknown" {
                        match *field {
                            "model" => detail.model = value,
                            "brand" => detail.brand = value,
                            "android_version" => detail.android_version = value,
                            "sdk_version" => detail.sdk_version = value,
                            "build_number" => detail.build_number = value,
                            "product" => detail.product = value,
                            "device" => detail.device = value,
                            _ => {}
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Failed to get property {}: {}", prop, e);
                }
            }
        }

        // 获取电池电量
        if let Ok((stdout, _, _)) = execute_shell_command(&mut device, "dumpsys battery") {
            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("level:") {
                    if let Some(level) = extract_battery_level(trimmed) {
                        detail.battery_level = Some(level);
                        break;
                    }
                }
            }
        }

        Ok(detail)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn execute_adb(
    command: String,
    device_id: Option<String>,
    history_state: State<'_, Arc<CommandHistoryState>>,
) -> Result<AdbResult, String> {
    let cmd = command.clone();
    let dev_id = device_id.clone().unwrap_or_default();
    let state_clone = history_state.inner().clone();

    let result = tokio::task::spawn_blocking(move || -> Result<AdbResult, String> {
        let mut device = match device_id {
            Some(id) => ADBServerDevice::new(id, None),
            None => ADBServerDevice::autodetect(None),
        };

        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &command)?;

        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    // 自动记录命令历史
    record_command(&state_clone, &cmd, &result, &dev_id);

    Ok(result)
}
