use adb_client::ADBDeviceExt;
use adb_client::server::{ADBServer, DeviceState};
use adb_client::server_device::ADBServerDevice;
use serde::Serialize;
use std::io::Cursor;

// ============================================
// 数据模型
// ============================================

#[derive(Serialize, Clone, Debug)]
pub struct DeviceInfo {
    pub id: String,
    pub model: String,
    pub status: DeviceStatus,
    pub connection: String,
}

#[derive(Serialize, Clone, Debug)]
pub enum DeviceStatus {
    Online,
    Offline,
    Unauthorized,
    Unknown,
}

#[derive(Serialize, Debug)]
pub struct AdbResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[derive(Serialize, Debug)]
pub struct DeviceDetail {
    pub id: String,
    pub model: String,
    pub brand: String,
    pub android_version: String,
    pub sdk_version: String,
    pub build_number: String,
    pub product: String,
    pub device: String,
    pub battery_level: Option<i32>,
}

// ============================================
// 内部辅助函数
// ============================================

/// 将 adb_client 的 DeviceState 映射到前端的 DeviceStatus
fn map_device_state(state: &DeviceState) -> DeviceStatus {
    match state {
        DeviceState::Device => DeviceStatus::Online,
        DeviceState::Offline => DeviceStatus::Offline,
        DeviceState::Unauthorized => DeviceStatus::Unauthorized,
        _ => DeviceStatus::Unknown,
    }
}

/// 判断设备连接类型（WiFi 或 USB）
fn detect_connection_type(identifier: &str) -> String {
    if identifier.contains(':') {
        "WiFi".to_string()
    } else {
        "USB".to_string()
    }
}

/// 执行 shell 命令并捕获输出
fn execute_shell_command(
    device: &mut ADBServerDevice,
    command: &str,
) -> Result<(String, String, Option<u8>), String> {
    let mut stdout_buffer = Cursor::new(Vec::new());
    let mut stderr_buffer = Cursor::new(Vec::new());

    let exit_code = device
        .shell_command(
            &command,
            Some(&mut stdout_buffer),
            Some(&mut stderr_buffer),
        )
        .map_err(|e| format!("Shell command failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&stdout_buffer.into_inner()).to_string();
    let stderr = String::from_utf8_lossy(&stderr_buffer.into_inner()).to_string();

    Ok((stdout, stderr, exit_code))
}

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
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = match device_id {
            Some(id) => ADBServerDevice::new(id, None),
            None => ADBServerDevice::autodetect(None),
        };

        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &command)?;

        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code.map(|c| c as i32).unwrap_or(-1),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

// ============================================
// Helper functions
// ============================================

/// 从 dumpsys battery 输出中提取电池电量
fn extract_battery_level(line: &str) -> Option<i32> {
    let trimmed = line.trim();
    if let Some(pos) = trimmed.find("level:") {
        let after_level = &trimmed[pos + 6..];
        let value_str = after_level.trim();
        return value_str.parse::<i32>().ok();
    }
    None
}
