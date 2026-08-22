use adb_client::server::ADBServer;
use adb_client::server_device::ADBServerDevice;
use adb_client::mdns::MDNSDiscoveryService;
use std::collections::HashMap;
use std::net::{Ipv4Addr, SocketAddrV4};
use std::sync::Arc;
use std::sync::mpsc::channel;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};
use qrcode::QrCode;
use qrcode::render::svg;
use rand::Rng;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use mdns_sd::{ServiceDaemon, ServiceEvent};

use crate::websocket::{broadcast_device_changed, WsState};

const ADB_PAIRING_SERVICE: &str = "_adb-tls-pairing._tcp.local.";
const ADB_CONNECT_SERVICE: &str = "_adb-tls-connect._tcp.local.";

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
pub async fn connect_device(
    ip: String,
    port: u16,
    ws_state: State<'_, WsState>,
) -> Result<(), String> {
    let device_id = format!("{}:{}", ip, port);
    tokio::task::spawn_blocking(move || -> Result<(), String> {
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
    .map_err(|e| format!("Task join error: {}", e))??;

    // 广播设备连接事件
    broadcast_device_changed(&ws_state, "connected", &device_id);
    Ok(())
}

#[tauri::command]
pub async fn disconnect_device(
    ip: String,
    port: u16,
    ws_state: State<'_, WsState>,
) -> Result<(), String> {
    let device_id = format!("{}:{}", ip, port);
    tokio::task::spawn_blocking(move || -> Result<(), String> {
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
    .map_err(|e| format!("Task join error: {}", e))??;

    // 广播设备断开事件
    broadcast_device_changed(&ws_state, "disconnected", &device_id);
    Ok(())
}

/// 根据设备 ID（ip:port 或序列号）断开连接。
/// 仅支持 WiFi 设备（id 含 ip:port）；USB 设备提示直接拔除。
#[tauri::command]
pub async fn disconnect_device_by_id(
    device_id: String,
    ws_state: State<'_, WsState>,
) -> Result<(), String> {
    let (ip, port) = device_id
        .rsplit_once(':')
        .ok_or_else(|| "该设备为 USB 连接，请直接拔除数据线".to_string())?;

    let ip_str = ip.to_string();
    let ip_addr: Ipv4Addr = ip_str
        .parse()
        .map_err(|e| format!("Invalid IP address '{}': {}", ip, e))?;
    let port: u16 = port
        .parse()
        .map_err(|e| format!("Invalid port '{}': {}", port, e))?;
    let addr = SocketAddrV4::new(ip_addr, port);

    tokio::task::spawn_blocking(move || {
        let mut server = ADBServer::default();
        server
            .disconnect_device(addr)
            .map_err(|e| format!("Failed to disconnect from {}:{}: {}", ip_str, port, e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    // 广播设备断开事件
    broadcast_device_changed(&ws_state, "disconnected", &device_id);
    Ok(())
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

// ============================================
// 扫码配对连接
// ============================================

/// 生成随机字符串
fn random_string(len: usize) -> String {
    const CHARSET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::thread_rng();
    (0..len)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

/// 生成配对二维码
#[tauri::command]
pub async fn generate_pairing_qr() -> Result<QrPairingInfo, String> {
    tokio::task::spawn_blocking(|| {
        let service_name = format!("adbui-{}", random_string(10));
        let password = random_string(10);
        let qr_data = format!("WIFI:T:ADB;S:{};P:{};;", service_name, password);

        // 生成二维码 SVG
        let code = QrCode::new(qr_data.as_bytes())
            .map_err(|e| format!("Failed to generate QR code: {}", e))?;

        let svg_image = code
            .render::<svg::Color>()
            .min_dimensions(256, 256)
            .dark_color(svg::Color("#000000"))
            .light_color(svg::Color("#ffffff"))
            .build();

        // SVG 转 base64
        let qr_image_base64 = BASE64.encode(svg_image.as_bytes());

        Ok(QrPairingInfo {
            qr_data,
            qr_image_base64,
            service_name,
            password,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 等待手机扫码并完成配对和连接
#[tauri::command]
pub async fn wait_and_pair_device(
    service_name: String,
    password: String,
    timeout_secs: Option<u64>,
    ws_state: State<'_, WsState>,
) -> Result<String, String> {
    let timeout = Duration::from_secs(timeout_secs.unwrap_or(120));

    let addr_str = tokio::task::spawn_blocking(move || -> Result<String, String> {
        // 第一步：监听 _adb-tls-pairing._tcp.local. 等待手机扫码
        let daemon = ServiceDaemon::new()
            .map_err(|e| format!("Failed to create mDNS daemon: {}", e))?;

        let receiver = daemon
            .browse(ADB_PAIRING_SERVICE)
            .map_err(|e| format!("Failed to browse mDNS pairing service: {}", e))?;

        let start = std::time::Instant::now();
        let mut pairing_addr: Option<SocketAddrV4> = None;

        // 等待手机扫码广播配对服务
        while start.elapsed() < timeout {
            match receiver.recv_timeout(Duration::from_millis(500)) {
                Ok(ServiceEvent::ServiceResolved(info)) => {
                    // 检查是否是我们等待的服务名
                    if info.get_fullname().contains(&service_name) {
                        for addr in info.get_addresses() {
                            if let std::net::IpAddr::V4(ipv4) = addr.to_ip_addr() {
                                pairing_addr = Some(SocketAddrV4::new(ipv4, info.get_port()));
                                break;
                            }
                        }
                        if pairing_addr.is_some() {
                            break;
                        }
                    }
                }
                Ok(_) => {
                    // 其他事件，继续等待
                    continue;
                }
                Err(_) => {
                    // 超时或断开，继续等待
                    continue;
                }
            }
        }

        let _ = daemon.shutdown();

        let pairing_addr = pairing_addr
            .ok_or_else(|| "Timeout waiting for device pairing. Please ensure the phone scanned the QR code.".to_string())?;

        // 第二步：执行配对
        let mut server = ADBServer::default();
        server
            .pair(pairing_addr, password)
            .map_err(|e| format!("Failed to pair with {}: {}", pairing_addr, e))?;

        // 第三步：监听 _adb-tls-connect._tcp.local. 获取连接端口
        let daemon2 = ServiceDaemon::new()
            .map_err(|e| format!("Failed to create mDNS daemon: {}", e))?;

        let receiver2 = daemon2
            .browse(ADB_CONNECT_SERVICE)
            .map_err(|e| format!("Failed to browse mDNS connect service: {}", e))?;

        let connect_timeout = Duration::from_secs(30);
        let connect_start = std::time::Instant::now();
        let mut connect_addr: Option<SocketAddrV4> = None;
        let pairing_ip = pairing_addr.ip();

        while connect_start.elapsed() < connect_timeout {
            match receiver2.recv_timeout(Duration::from_millis(500)) {
                Ok(ServiceEvent::ServiceResolved(info)) => {
                    // 查找同一 IP 的连接服务
                    for addr in info.get_addresses() {
                        if let std::net::IpAddr::V4(ipv4) = addr.to_ip_addr() {
                            if ipv4 == *pairing_ip {
                                connect_addr = Some(SocketAddrV4::new(ipv4, info.get_port()));
                                break;
                            }
                        }
                    }
                    if connect_addr.is_some() {
                        break;
                    }
                }
                Ok(_) => {
                    continue;
                }
                Err(_) => {
                    continue;
                }
            }
        }

        let _ = daemon2.shutdown();

        // 第四步：自动连接
        let connect_addr = connect_addr
            .ok_or_else(|| "Could not discover connection port. Please connect manually.".to_string())?;

        server
            .connect_device(connect_addr)
            .map_err(|e| format!("Failed to connect to {}: {}", connect_addr, e))?;

        Ok(connect_addr.to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    // 广播设备连接事件
    broadcast_device_changed(&ws_state, "connected", &addr_str);
    Ok(addr_str)
}

// ============================================
// 设备状态监控（后端定时巡检 + WebSocket 推送）
// ============================================

/// 启动设备状态监控：每 2 秒对比设备列表，
/// 检测到新增 / 移除 / 状态变化时通过 WebSocket 广播事件。
pub fn spawn_device_monitor(app: AppHandle) {
    let ws_state = app.state::<WsState>().inner().clone();

    tauri::async_runtime::spawn(async move {
        let mut last_devices: HashMap<String, DeviceStatus> = HashMap::new();

        loop {
            tokio::time::sleep(Duration::from_secs(2)).await;

            let result = tokio::task::spawn_blocking(|| {
                let mut server = ADBServer::default();
                server.devices_long().map(|devices| {
                    devices
                        .into_iter()
                        .map(|dev| (dev.identifier.clone(), map_device_state(&dev.state)))
                        .collect::<Vec<(String, DeviceStatus)>>()
                })
            })
            .await;

            let devices = match result {
                Ok(Ok(devices)) => devices,
                Ok(Err(e)) => {
                    eprintln!("Device monitor: failed to list devices: {}", e);
                    continue;
                }
                Err(e) => {
                    eprintln!("Device monitor: task join error: {}", e);
                    continue;
                }
            };

            let current: HashMap<String, DeviceStatus> = devices.into_iter().collect();

            // 新增或状态变化
            for (id, status) in &current {
                match last_devices.get(id) {
                    None => broadcast_device_changed(&ws_state, "connected", id),
                    Some(prev) if prev != status => {
                        broadcast_device_changed(&ws_state, "updated", id)
                    }
                    _ => {}
                }
            }

            // 移除
            for id in last_devices.keys() {
                if !current.contains_key(id) {
                    broadcast_device_changed(&ws_state, "disconnected", id);
                }
            }

            last_devices = current;
        }
    });
}
