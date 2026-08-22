use adb_client::server::ADBServer;
use adb_client::server_device::ADBServerDevice;
use adb_client::mdns::MDNSDiscoveryService;
use std::net::{Ipv4Addr, SocketAddrV4};
use std::sync::Arc;
use std::sync::mpsc::channel;
use std::time::Duration;
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

#[tauri::command]
pub async fn connect_device(ip: String, port: u16) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let ip_addr: Ipv4Addr = ip
            .parse()
            .map_err(|e| format!("Invalid IP address '{}': {}", ip, e))?;
        let addr = SocketAddrV4::new(ip_addr, port);

        let mut server = ADBServer::default();
        server
            .connect_device(addr)
            .map_err(|e| format!("Failed to connect to {}:{}: {}", ip, port, e))?;

        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn disconnect_device(ip: String, port: u16) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let ip_addr: Ipv4Addr = ip
            .parse()
            .map_err(|e| format!("Invalid IP address '{}': {}", ip, e))?;
        let addr = SocketAddrV4::new(ip_addr, port);

        let mut server = ADBServer::default();
        server
            .disconnect_device(addr)
            .map_err(|e| format!("Failed to disconnect from {}:{}: {}", ip, port, e))?;

        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn scan_network_devices() -> Result<Vec<NetworkDevice>, String> {
    tokio::task::spawn_blocking(move || {
        let mut discovery = MDNSDiscoveryService::new()
            .map_err(|e| format!("Failed to create mDNS discovery service: {}", e))?;

        let (sender, receiver) = channel();

        discovery
            .start(sender)
            .map_err(|e| format!("Failed to start mDNS discovery: {}", e))?;

        // 收集设备，等待 3 秒
        let mut devices: Vec<NetworkDevice> = Vec::new();
        let timeout = Duration::from_secs(3);
        let start = std::time::Instant::now();

        while start.elapsed() < timeout {
            match receiver.recv_timeout(Duration::from_millis(500)) {
                Ok(mdns_device) => {
                    // 优先使用 IPv4 地址
                    if let Some(ipv4) = mdns_device.ipv4_addresses().iter().next() {
                        devices.push(NetworkDevice {
                            ip: ipv4.to_string(),
                            port: mdns_device.port().get(),
                            fullname: mdns_device.fullname.clone(),
                        });
                    }
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    // 继续等待
                    continue;
                }
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    break;
                }
            }
        }

        // 去重（基于 IP 和端口）
        devices.sort_by(|a, b| (&a.ip, a.port).cmp(&(&b.ip, b.port)));
        devices.dedup_by(|a, b| a.ip == b.ip && a.port == b.port);

        let _ = discovery.shutdown();

        Ok(devices)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
