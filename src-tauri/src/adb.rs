use adb_client::ADBDeviceExt;
use adb_client::server::{ADBServer, DeviceState};
use adb_client::server_device::ADBServerDevice;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::io::Cursor;
use std::path::Path;
use tauri::{AppHandle, Emitter, State};

use crate::task::{self, TaskState};
use std::sync::Arc;

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

/// 将 adb_client 的 Option<u8> exit code 转为 i32
/// None 表示 adb server 未返回 exit code（shell v1 协议），此时按 0 处理，
/// 由调用方根据 stdout/stderr 内容判断成功失败
fn exit_code_or_default(exit_code: Option<u8>) -> i32 {
    exit_code.map(|c| c as i32).unwrap_or(0)
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
            exit_code: exit_code_or_default(exit_code),
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

// ============================================
// 应用管理数据模型
// ============================================

#[derive(Serialize, Clone, Debug)]
pub struct AppInfo {
    pub package_name: String,
    pub app_name: String,
    pub version_name: String,
    pub version_code: String,
    pub is_system: bool,
    pub is_enabled: bool,
    pub apk_path: String,
}

// ============================================
// 文件管理数据模型
// ============================================

#[derive(Serialize, Clone, Debug)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub permissions: String,
    pub modified_time: String,
}

// ============================================
// 应用管理命令
// ============================================

/// 解析 pm list packages -f 输出，提取包名和 APK 路径
fn parse_package_list(output: &str) -> Vec<(String, String)> {
    let mut packages = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.starts_with("package:") {
            let rest = &line[8..]; // 去掉 "package:" 前缀
            if let Some(eq_pos) = rest.rfind('=') {
                let apk_path = rest[..eq_pos].to_string();
                let package_name = rest[eq_pos + 1..].to_string();
                packages.push((package_name, apk_path));
            }
        }
    }
    packages
}

/// 解析 pm list packages（无 -f）输出，返回包名列表
fn parse_package_names(output: &str) -> Vec<String> {
    output
        .lines()
        .map(|l| l.trim())
        .filter(|l| l.starts_with("package:"))
        .map(|l| l[8..].trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

/// 解析 pm list packages --show-versioncode 输出行，返回 (包名, versionCode)
/// 兼容两种格式（注意路径中可能含 ==，必须用 rfind）：
///   package:com.android.chrome versionCode:609923000
///   package:/data/app/~~xxx==/base.apk=com.android.chrome versionCode:609923000
fn parse_version_line(line: &str) -> Option<(String, String)> {
    let line = line.trim();
    if !line.starts_with("package:") {
        return None;
    }
    let rest = &line[8..];
    let pkg = if let Some(eq_pos) = rest.rfind('=') {
        rest[eq_pos + 1..].split_whitespace().next()?.to_string()
    } else {
        rest.split_whitespace().next()?.to_string()
    };
    let code = rest
        .split("versionCode:")
        .nth(1)?
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_string();
    if pkg.is_empty() || code.is_empty() {
        return None;
    }
    Some((pkg, code))
}

/// 从 dumpsys package 输出中解析 pkgFlags，判断是否为系统应用
/// 兼容两种格式：
///   pkgFlags=[ SYSTEM DEBUGGABLE ]  （字符串标志）
///   pkgFlags=[ 0x1 ]                （位掩码，FLAG_SYSTEM = 0x1）
fn parse_system_flag(output: &str) -> Option<bool> {
    for line in output.lines() {
        let trimmed = line.trim();
        if let Some(idx) = trimmed.find("pkgFlags=") {
            let val = &trimmed[idx + 9..];
            if val.contains("SYSTEM") {
                return Some(true);
            }
            let num = val.trim_matches(|c: char| c == '[' || c == ']' || c == ' ');
            if let Some(hex) = num.strip_prefix("0x") {
                if let Ok(flags) = u64::from_str_radix(hex, 16) {
                    return Some(flags & 0x1 != 0);
                }
            }
        }
    }
    None
}

/// 从 dumpsys package 输出中提取应用信息
fn parse_app_detail(
    output: &str,
    package_name: &str,
    apk_path: &str,
    system_set: &HashSet<String>,
) -> AppInfo {
    let mut version_name = String::new();
    let mut version_code = String::new();
    let mut is_enabled = true;

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("versionName=") {
            version_name = trimmed[12..].to_string();
        } else if trimmed.starts_with("versionCode=") {
            // versionCode=123 minSdk=21 targetSdk=34
            let val = &trimmed[12..];
            if let Some(space_pos) = val.find(' ') {
                version_code = val[..space_pos].to_string();
            } else {
                version_code = val.to_string();
            }
        } else if trimmed.starts_with("enabled=") {
            // enabled=1 或 enabled=2 (disabled)
            let val = &trimmed[8..];
            is_enabled = val.starts_with('1') || val.starts_with('0');
        }
    }

    // 从 APK 路径提取应用名（取包名最后一段作为 fallback）
    let app_name = package_name
        .split('.')
        .last()
        .unwrap_or(package_name)
        .to_string();

    // 系统应用判定：优先 dumpsys 的 SYSTEM flag，其次 pm -s 集合，最后路径兜底
    let is_system = parse_system_flag(output)
        .unwrap_or_else(|| {
            system_set.contains(package_name)
                || apk_path.starts_with("/system/")
                || apk_path.starts_with("/vendor/")
                || apk_path.starts_with("/product/")
                || apk_path.starts_with("/oem/")
        });

    AppInfo {
        package_name: package_name.to_string(),
        app_name,
        version_name,
        version_code,
        is_system,
        is_enabled,
        apk_path: apk_path.to_string(),
    }
}

#[tauri::command]
pub async fn list_apps(device_id: String, _filter: String) -> Result<Vec<AppInfo>, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id.clone(), None);

        // 1. 全量包列表（含 APK 路径），一次命令获取
        let (stdout, _, _) = execute_shell_command(&mut device, "pm list packages -f")?;
        let packages = parse_package_list(&stdout);

        // 2. 系统包集合（按 SYSTEM flag，比路径判断准确）
        let mut system_set: HashSet<String> = HashSet::new();
        if let Ok((sys_out, _, _)) = execute_shell_command(&mut device, "pm list packages -s") {
            system_set = parse_package_names(&sys_out).into_iter().collect();
        }

        // 3. 已禁用（冻结）包集合
        let mut disabled_set: HashSet<String> = HashSet::new();
        if let Ok((d_out, _, _)) = execute_shell_command(&mut device, "pm list packages -d") {
            disabled_set = parse_package_names(&d_out).into_iter().collect();
        }

        // 4. 版本号（API 26+ 支持 --show-versioncode，单命令秒级返回）
        let mut version_map: HashMap<String, String> = HashMap::new();
        let version_supported = match execute_shell_command(
            &mut device,
            "pm list packages --show-versioncode",
        ) {
            Ok((v_out, _, _)) => {
                for line in v_out.lines() {
                    if let Some((pkg, code)) = parse_version_line(line) {
                        version_map.insert(pkg, code);
                    }
                }
                !version_map.is_empty()
            }
            Err(_) => false,
        };

        let mut apps = Vec::with_capacity(packages.len());
        if version_supported {
            // 主路径：快速组装，无需逐包 dumpsys
            for (pkg_name, apk_path) in &packages {
                apps.push(AppInfo {
                    package_name: pkg_name.clone(),
                    app_name: pkg_name
                        .split('.')
                        .last()
                        .unwrap_or(pkg_name)
                        .to_string(),
                    version_name: String::new(),
                    version_code: version_map.get(pkg_name).cloned().unwrap_or_default(),
                    is_system: system_set.contains(pkg_name),
                    is_enabled: !disabled_set.contains(pkg_name),
                    apk_path: apk_path.clone(),
                });
            }
        } else {
            // 老设备（API < 26）fallback：逐包 dumpsys 获取详细信息
            for (pkg_name, apk_path) in &packages {
                let detail_cmd = format!("dumpsys package {}", pkg_name);
                match execute_shell_command(&mut device, &detail_cmd) {
                    Ok((detail_out, _, _)) => {
                        apps.push(parse_app_detail(
                            &detail_out,
                            pkg_name,
                            apk_path,
                            &system_set,
                        ));
                    }
                    Err(_) => {
                        // 如果 dumpsys 失败，仍然添加基本信息
                        apps.push(AppInfo {
                            package_name: pkg_name.clone(),
                            app_name: pkg_name
                                .split('.')
                                .last()
                                .unwrap_or(pkg_name)
                                .to_string(),
                            version_name: String::new(),
                            version_code: String::new(),
                            is_system: system_set.contains(pkg_name),
                            is_enabled: true,
                            apk_path: apk_path.clone(),
                        });
                    }
                }
            }
        }

        // 按应用名排序
        apps.sort_by(|a, b| a.app_name.to_lowercase().cmp(&b.app_name.to_lowercase()));
        Ok(apps)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

// ============================================
// 单元测试
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_version_line_with_path() {
        // 真实设备输出：路径中可能含 ==，必须从最后一个 = 后取包名
        let line = "package:/data/app/~~JIkXa2cRnARnLGtGZ6eLMg==/com.coloros.ocrscanner-dcNdvgkkMaHpYSTJc5NWDw==/base.apk=com.coloros.ocrscanner versionCode:160313";
        assert_eq!(
            parse_version_line(line),
            Some(("com.coloros.ocrscanner".to_string(), "160313".to_string()))
        );
    }

    #[test]
    fn test_parse_version_line_plain() {
        // 无路径格式（API 26+ 精简输出）
        let line = "package:com.android.chrome versionCode:609923000";
        assert_eq!(
            parse_version_line(line),
            Some(("com.android.chrome".to_string(), "609923000".to_string()))
        );
    }

    #[test]
    fn test_parse_package_names() {
        let out = "package:com.oplus.metis\npackage:com.android.settings\n";
        assert_eq!(
            parse_package_names(out),
            vec!["com.oplus.metis".to_string(), "com.android.settings".to_string()]
        );
    }

    #[test]
    fn test_parse_package_list_with_double_eq() {
        // -f 输出同样含 ==，rfind 必须正确
        let out = "package:/data/app/~~AUo8tflPa9igkSf3y-M62A==/com.baidu.input_oppo-W3OUOLrgqXmG5KNG6spS6w==/base.apk=com.baidu.input_oppo";
        assert_eq!(
            parse_package_list(out),
            vec![(
                "com.baidu.input_oppo".to_string(),
                "/data/app/~~AUo8tflPa9igkSf3y-M62A==/com.baidu.input_oppo-W3OUOLrgqXmG5KNG6spS6w==/base.apk".to_string()
            )]
        );
    }

    #[test]
    fn test_parse_system_flag() {
        // 字符串标志格式
        let out = "  pkgFlags=[ SYSTEM DEBUGGABLE ]\n  enabled=1\n";
        assert_eq!(parse_system_flag(out), Some(true));

        // 位掩码格式（FLAG_SYSTEM = 0x1）
        let out2 = "  pkgFlags=[ 0x1 ]\n";
        assert_eq!(parse_system_flag(out2), Some(true));

        let out3 = "  pkgFlags=[ 0x4000 ]\n";
        assert_eq!(parse_system_flag(out3), Some(false));

        // 无 pkgFlags
        assert_eq!(parse_system_flag("versionName=1.0\n"), None);
    }
}

#[tauri::command]
pub async fn uninstall_app(
    device_id: String,
    package: String,
    keep_data: bool,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = if keep_data {
            format!("pm uninstall -k {}", package)
        } else {
            format!("pm uninstall {}", package)
        };
        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn force_stop_app(device_id: String, package: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = format!("am force-stop {}", package);
        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn clear_app_data(device_id: String, package: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = format!("pm clear {}", package);
        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn freeze_app(device_id: String, package: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = format!("pm disable-user --user 0 {}", package);
        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn unfreeze_app(device_id: String, package: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = format!("pm enable {}", package);
        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn extract_apk(
    device_id: String,
    package: String,
    save_path: String,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // 获取 APK 路径
        let (stdout, _, _) = execute_shell_command(
            &mut device,
            &format!("pm path {}", package),
        )?;

        let apk_remote_path = stdout
            .lines()
            .find_map(|line| {
                let line = line.trim();
                if line.starts_with("package:") {
                    Some(line[8..].to_string())
                } else {
                    None
                }
            })
            .ok_or_else(|| format!("Failed to get APK path for {}", package))?;

        // 拉取文件到本地
        let mut output_file = std::fs::File::create(&save_path)
            .map_err(|e| format!("Failed to create file {}: {}", save_path, e))?;

        device
            .pull(&apk_remote_path.as_str(), &mut output_file)
            .map_err(|e| format!("Failed to pull APK: {}", e))?;

        Ok(AdbResult {
            stdout: format!("APK extracted to {}", save_path),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn install_apk(device_id: String, local_path: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let path = Path::new(&local_path);

        device
            .install(&path, None)
            .map_err(|e| format!("Failed to install APK: {}", e))?;

        Ok(AdbResult {
            stdout: format!("APK installed successfully: {}", local_path),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

// ============================================
// 文件管理命令
// ============================================

#[tauri::command]
pub async fn list_files(device_id: String, path: String) -> Result<Vec<FileItem>, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // 使用 ls -la 获取详细文件列表
        let cmd = format!("ls -la '{}'", path);
        let (stdout, _, _) = execute_shell_command(&mut device, &cmd)?;

        let mut items = Vec::new();
        for line in stdout.lines() {
            let line = line.trim();
            // 跳过 . 和 .. 以及空行和 total 行
            if line.is_empty() || line.starts_with("total") {
                continue;
            }

            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 8 {
                continue;
            }

            let permissions = parts[0].to_string();
            let is_dir = permissions.starts_with('d');
            let size: u64 = parts[4].parse().unwrap_or(0);

            // 文件名可能包含空格，从第 8 个字段开始拼接
            let name = parts[7..].join(" ");
            if name == "." || name == ".." {
                continue;
            }

            // 修改时间
            let modified_time = if parts.len() >= 7 {
                format!("{} {} {}", parts[5], parts[6], parts.get(7).unwrap_or(&""))
            } else {
                String::new()
            };

            let item_path = if path.ends_with('/') {
                format!("{}{}", path, name)
            } else {
                format!("{}/{}", path, name)
            };

            items.push(FileItem {
                name,
                path: item_path,
                is_dir,
                size,
                permissions,
                modified_time,
            });
        }

        // 目录排在前面，然后按名称排序
        items.sort_by(|a, b| {
            b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        Ok(items)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn pull_file(
    device_id: String,
    remote_path: String,
    local_path: String,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        let mut output_file = std::fs::File::create(&local_path)
            .map_err(|e| format!("Failed to create file {}: {}", local_path, e))?;

        device
            .pull(&remote_path.as_str(), &mut output_file)
            .map_err(|e| format!("Failed to pull file: {}", e))?;

        Ok(AdbResult {
            stdout: format!("File pulled to {}", local_path),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn push_file(
    device_id: String,
    local_path: String,
    remote_path: String,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        let mut input_file = std::fs::File::open(&local_path)
            .map_err(|e| format!("Failed to open file {}: {}", local_path, e))?;

        device
            .push(&mut input_file, &remote_path.as_str())
            .map_err(|e| format!("Failed to push file: {}", e))?;

        Ok(AdbResult {
            stdout: format!("File pushed to {}", remote_path),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

// ============================================
// 批量操作命令（任务化）
// ============================================

#[tauri::command]
pub async fn batch_uninstall(
    app: AppHandle,
    state: State<'_, Arc<TaskState>>,
    device_id: String,
    packages: Vec<String>,
) -> Result<String, String> {
    let total = packages.len() as u32;
    let task_info = task::create_task(&state, "批量卸载", total);
    let task_id = task_info.id.clone();

    // 在后台执行任务
    let state_arc = Arc::clone(&state);
    let app_clone = app.clone();
    let tid = task_id.clone();

    tokio::spawn(async move {
        let st = &*state_arc;
        task::update_task(
            &app_clone,
            st,
            &tid,
            Some(task::TaskStatus::Running),
            None,
            Some("开始批量卸载..."),
            None,
        );

        let mut completed: u32 = 0;
        for pkg in &packages {
            // 检查是否被取消
            if task::is_cancelled(st, &tid) {
                task::update_task(
                    &app_clone,
                    st,
                    &tid,
                    Some(task::TaskStatus::Cancelled),
                    None,
                    Some("任务已取消"),
                    None,
                );
                return;
            }

            let result_msg = format!("正在卸载: {}", pkg);
            task::update_task(
                &app_clone,
                st,
                &tid,
                None,
                Some(completed),
                Some(&result_msg),
                None,
            );

            // 执行卸载
            let uninstall_result = tokio::task::spawn_blocking({
                let device_id = device_id.clone();
                let pkg = pkg.clone();
                move || {
                    let mut device = ADBServerDevice::new(device_id, None);
                    execute_shell_command(&mut device, &format!("pm uninstall {}", pkg))
                }
            })
            .await;

            completed += 1;
            match uninstall_result {
                Ok(Ok((stdout, stderr, exit_code))) => {
                    // exit_code 为 None 时（shell v1 协议）按 0 处理，以 stdout 内容为准
                    let code_ok = exit_code.map(|c| c == 0).unwrap_or(true);
                    let success = code_ok && stdout.contains("Success");
                    task::update_task(
                        &app_clone,
                        st,
                        &tid,
                        None,
                        Some(completed),
                        None,
                        Some(task::TaskResult {
                            item: pkg.clone(),
                            success,
                            message: if success {
                                "卸载成功".to_string()
                            } else {
                                format!("卸载失败: {}", stderr.trim())
                            },
                        }),
                    );
                }
                Ok(Err(e)) => {
                    task::update_task(
                        &app_clone,
                        st,
                        &tid,
                        None,
                        Some(completed),
                        None,
                        Some(task::TaskResult {
                            item: pkg.clone(),
                            success: false,
                            message: format!("卸载失败: {}", e),
                        }),
                    );
                }
                Err(e) => {
                    task::update_task(
                        &app_clone,
                        st,
                        &tid,
                        None,
                        Some(completed),
                        None,
                        Some(task::TaskResult {
                            item: pkg.clone(),
                            success: false,
                            message: format!("执行错误: {}", e),
                        }),
                    );
                }
            }
        }

        task::update_task(
            &app_clone,
            st,
            &tid,
            Some(task::TaskStatus::Completed),
            Some(completed),
            Some("批量卸载完成"),
            None,
        );
    });

    Ok(task_id)
}

#[tauri::command]
pub async fn batch_install(
    app: AppHandle,
    state: State<'_, Arc<TaskState>>,
    device_id: String,
    apk_paths: Vec<String>,
) -> Result<String, String> {
    let total = apk_paths.len() as u32;
    let task_info = task::create_task(&state, "批量安装", total);
    let task_id = task_info.id.clone();

    let state_arc = Arc::clone(&state);
    let app_clone = app.clone();
    let tid = task_id.clone();

    tokio::spawn(async move {
        let st = &*state_arc;
        task::update_task(
            &app_clone,
            st,
            &tid,
            Some(task::TaskStatus::Running),
            None,
            Some("开始批量安装..."),
            None,
        );

        let mut completed: u32 = 0;
        for apk_path in &apk_paths {
            if task::is_cancelled(st, &tid) {
                task::update_task(
                    &app_clone,
                    st,
                    &tid,
                    Some(task::TaskStatus::Cancelled),
                    None,
                    Some("任务已取消"),
                    None,
                );
                return;
            }

            let file_name = Path::new(apk_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| apk_path.clone());

            let result_msg = format!("正在安装: {}", file_name);
            task::update_task(
                &app_clone,
                st,
                &tid,
                None,
                Some(completed),
                Some(&result_msg),
                None,
            );

            let install_result = tokio::task::spawn_blocking({
                let device_id = device_id.clone();
                let apk_path = apk_path.clone();
                move || {
                    let mut device = ADBServerDevice::new(device_id, None);
                    let path = Path::new(&apk_path);
                    device.install(&path, None)
                }
            })
            .await;

            completed += 1;
            match install_result {
                Ok(Ok(())) => {
                    task::update_task(
                        &app_clone,
                        st,
                        &tid,
                        None,
                        Some(completed),
                        None,
                        Some(task::TaskResult {
                            item: file_name,
                            success: true,
                            message: "安装成功".to_string(),
                        }),
                    );
                }
                Ok(Err(e)) => {
                    task::update_task(
                        &app_clone,
                        st,
                        &tid,
                        None,
                        Some(completed),
                        None,
                        Some(task::TaskResult {
                            item: file_name,
                            success: false,
                            message: format!("安装失败: {}", e),
                        }),
                    );
                }
                Err(e) => {
                    task::update_task(
                        &app_clone,
                        st,
                        &tid,
                        None,
                        Some(completed),
                        None,
                        Some(task::TaskResult {
                            item: file_name,
                            success: false,
                            message: format!("执行错误: {}", e),
                        }),
                    );
                }
            }
        }

        task::update_task(
            &app_clone,
            st,
            &tid,
            Some(task::TaskStatus::Completed),
            Some(completed),
            Some("批量安装完成"),
            None,
        );
    });

    Ok(task_id)
}

// ============================================
// M2 玩机核心：数据模型
// ============================================

use adb_client::RebootType;

/// 显示状态（分辨率 / 密度 / 过扫描）
#[derive(Serialize, Clone, Debug)]
pub struct DisplayState {
    pub size: String,          // 如 "1344x2992"
    pub default_size: String,  // 出厂分辨率
    pub density: i32,          // dpi
    pub default_density: i32,  // 出厂密度
    pub overscan: [i32; 4],    // [left, top, right, bottom]
}

/// 电池状态（temperature 已归一化为 0.1°C 单位的整数值）
#[derive(Serialize, Clone, Debug)]
pub struct BatteryState {
    pub level: i32,        // 电量百分比 0-100
    pub temperature: i32,  // 温度，单位 0.1°C（350 表示 35.0°C）
    pub status: i32,       // 2=充电中 3=未充电 4=不充电 5=已充满
    pub simulating: bool,  // 是否处于模拟状态
}

/// 设备信息报告（getprop + dumpsys 聚合）
#[derive(Serialize, Clone, Debug)]
pub struct DeviceReport {
    pub model: String,
    pub brand: String,
    pub android_version: String,
    pub sdk_version: String,
    pub build_number: String,
    pub product: String,
    pub device: String,
    pub cpu_abi: String,
    pub serial: String,
    pub battery: Option<BatteryState>,
    pub display: Option<DisplayState>,
}

// ============================================
// M2 玩机核心：输出解析纯函数（便于单测）
// ============================================

/// 解析 `wm size` 输出，如 "Physical size: 1344x2992"
fn parse_wm_size(output: &str) -> Option<String> {
    for line in output.lines() {
        let t = line.trim();
        if let Some(idx) = t.find("Physical size:") {
            let v = t[idx + 14..].trim();
            if !v.is_empty() {
                return Some(v.to_string());
            }
        }
    }
    None
}

/// 解析 `wm density` 输出，如 "Physical density: 480"
fn parse_wm_density(output: &str) -> Option<i32> {
    for line in output.lines() {
        let t = line.trim();
        if let Some(idx) = t.find("Physical density:") {
            let v = t[idx + 17..].trim();
            if let Ok(n) = v.parse::<i32>() {
                return Some(n);
            }
        }
    }
    None
}

/// 解析 `wm overscan` 输出，如 "0,0,0,0" 或含 "overscan 0,0,0,0"
fn parse_overscan(output: &str) -> Option<[i32; 4]> {
    for line in output.lines() {
        let t = line.trim();
        // 在整行中查找形如 "l,t,r,b" 的四元组片段
        for token in t.split_whitespace() {
            let parts: Vec<&str> = token.split(',').collect();
            if parts.len() == 4 {
                let mut vals = [0i32; 4];
                let mut ok = true;
                for (i, p) in parts.iter().enumerate() {
                    match p.trim().parse::<i32>() {
                        Ok(n) => vals[i] = n,
                        Err(_) => {
                            ok = false;
                            break;
                        }
                    }
                }
                if ok {
                    return Some(vals);
                }
            }
        }
    }
    None
}

/// 解析 `dumpsys battery` 输出，提取 level / temperature / status
fn parse_battery(output: &str) -> Option<BatteryState> {
    let mut level: Option<i32> = None;
    let mut temperature: Option<i32> = None;
    let mut status: Option<i32> = None;

    for line in output.lines() {
        let t = line.trim();
        if let Some(v) = t.strip_prefix("level:") {
            level = v.trim().parse::<i32>().ok();
        } else if let Some(v) = t.strip_prefix("temperature:") {
            temperature = v.trim().parse::<i32>().ok();
        } else if let Some(v) = t.strip_prefix("status:") {
            status = v.trim().parse::<i32>().ok();
        }
    }

    match (level, temperature, status) {
        (Some(l), Some(t), Some(s)) => Some(BatteryState {
            level: l,
            temperature: t,
            status: s,
            simulating: false,
        }),
        _ => None,
    }
}

// ============================================
// M2 玩机核心：命令构造纯函数（便于单测）
// ============================================

/// 构造设置分辨率命令
fn build_wm_size_command(size: &str) -> String {
    format!("wm size {}", size)
}

/// 构造设置密度命令
fn build_wm_density_command(density: i32) -> String {
    format!("wm density {}", density)
}

/// 构造设置过扫描命令
fn build_wm_overscan_command(overscan: &[i32; 4]) -> String {
    format!(
        "wm overscan {},{},{},{}",
        overscan[0], overscan[1], overscan[2], overscan[3]
    )
}

/// 构造 settings put 命令
fn build_settings_put_command(namespace: &str, key: &str, value: &str) -> String {
    format!("settings put {} {} {}", namespace, key, value)
}

/// 构造电池模拟命令（set level/temperature/status）
fn build_battery_set_command(field: &str, value: i32) -> String {
    format!("dumpsys battery set {} {}", field, value)
}

/// 构造 input tap 命令
fn build_input_tap_command(x: i32, y: i32) -> String {
    format!("input tap {} {}", x, y)
}

/// 构造 input swipe 命令
fn build_input_swipe_command(x1: i32, y1: i32, x2: i32, y2: i32, duration_ms: i32) -> String {
    format!("input swipe {} {} {} {} {}", x1, y1, x2, y2, duration_ms)
}

/// 构造 input keyevent 命令
fn build_input_keyevent_command(keycode: &str) -> String {
    format!("input keyevent {}", keycode)
}

/// 构造 input text 命令（空格转 %s）
fn build_input_text_command(text: &str) -> String {
    format!("input text {}", text.replace(' ', "%s"))
}

/// 将 mode 字符串映射为 RebootType
fn map_reboot_type(mode: &str) -> Result<RebootType, String> {
    match mode {
        "system" => Ok(RebootType::System),
        "recovery" => Ok(RebootType::Recovery),
        "bootloader" => Ok(RebootType::Bootloader),
        "fastboot" => Ok(RebootType::Fastboot),
        _ => Err(format!("不支持的重启模式: {}", mode)),
    }
}

// ============================================
// M2 玩机核心：自动化脚本 DSL 解析器
// ============================================

/// 脚本指令
#[derive(Serialize, Clone, Debug, PartialEq)]
pub enum ScriptAction {
    Tap { x: i32, y: i32 },
    Swipe { x1: i32, y1: i32, x2: i32, y2: i32, duration_ms: i32 },
    Keyevent { keycode: String },
    Text { text: String },
    Sleep { ms: u64 },
}

/// 脚本行（含原始行号，便于报错与进度高亮）
#[derive(Serialize, Clone, Debug)]
pub struct ScriptLine {
    pub line_no: usize,
    pub action: ScriptAction,
}

/// 展开 loop/end 后的扁平指令序列
#[derive(Serialize, Clone, Debug)]
pub struct FlatScript {
    pub lines: Vec<ScriptLine>,
}

const MAX_LOOP_DEPTH: usize = 3;

/// 解析脚本 DSL 文本为扁平指令序列（展开 loop/end）
/// 语法：tap x y / swipe x1 y1 x2 y2 ms / keyevent KEY / text s / sleep ms / loop n / end
/// 支持 # 注释与空行；loop 最多嵌套 3 层；loop/end 必须配对
fn parse_script_lines(script: &str) -> Result<Vec<ScriptLine>, String> {
    // 带循环结构的中间表示
    #[derive(Debug)]
    enum Node {
        Action(usize, ScriptAction),
        Loop(u32, Vec<Node>), // count, body
    }

    // 预处理：去注释、去空行，保留原始行号
    let raw: Vec<(usize, &str)> = script
        .lines()
        .enumerate()
        .filter_map(|(i, l)| {
            let no = i + 1;
            let stripped = match l.find('#') {
                Some(pos) => &l[..pos],
                None => l,
            };
            let t = stripped.trim();
            if t.is_empty() {
                None
            } else {
                Some((no, t))
            }
        })
        .collect();

    // 用显式栈解析：frames 栈底是根，每遇到 loop 压入新帧，end 弹出并入父帧
    struct Frame {
        count: u32,
        start_line: usize,
        body: Vec<Node>,
    }
    let mut stack: Vec<Frame> = vec![Frame {
        count: 1,
        start_line: 0,
        body: Vec::new(),
    }];

    for (line_no, text) in &raw {
        let line_no = *line_no;
        let tokens: Vec<&str> = text.split_whitespace().collect();
        if tokens.is_empty() {
            continue;
        }
        let action: Option<ScriptAction> = match tokens[0] {
            "tap" => {
                if tokens.len() != 3 {
                    return Err(format!("第 {} 行: tap 需要 2 个坐标参数", line_no));
                }
                let x = tokens[1].parse::<i32>().map_err(|_| format!("第 {} 行: tap x 坐标非法", line_no))?;
                let y = tokens[2].parse::<i32>().map_err(|_| format!("第 {} 行: tap y 坐标非法", line_no))?;
                Some(ScriptAction::Tap { x, y })
            }
            "swipe" => {
                if tokens.len() != 6 {
                    return Err(format!("第 {} 行: swipe 需要 5 个参数", line_no));
                }
                let p: Result<Vec<i32>, _> = tokens[1..6].iter().map(|t| t.parse::<i32>()).collect();
                let p = p.map_err(|_| format!("第 {} 行: swipe 参数非法", line_no))?;
                Some(ScriptAction::Swipe {
                    x1: p[0], y1: p[1], x2: p[2], y2: p[3], duration_ms: p[4],
                })
            }
            "keyevent" => {
                if tokens.len() != 2 {
                    return Err(format!("第 {} 行: keyevent 需要 1 个按键名", line_no));
                }
                Some(ScriptAction::Keyevent { keycode: tokens[1].to_string() })
            }
            "text" => {
                if tokens.len() < 2 {
                    return Err(format!("第 {} 行: text 需要文本内容", line_no));
                }
                Some(ScriptAction::Text { text: tokens[1..].join(" ") })
            }
            "sleep" => {
                if tokens.len() != 2 {
                    return Err(format!("第 {} 行: sleep 需要 1 个毫秒参数", line_no));
                }
                let ms = tokens[1].parse::<u64>().map_err(|_| format!("第 {} 行: sleep 毫秒非法", line_no))?;
                Some(ScriptAction::Sleep { ms })
            }
            "loop" => {
                if tokens.len() != 2 {
                    return Err(format!("第 {} 行: loop 需要循环次数", line_no));
                }
                // 栈内除根帧外的帧数即当前嵌套深度
                if stack.len() - 1 >= MAX_LOOP_DEPTH {
                    return Err(format!("第 {} 行: loop 嵌套超过 {} 层", line_no, MAX_LOOP_DEPTH));
                }
                let count = tokens[1].parse::<u32>().map_err(|_| format!("第 {} 行: loop 次数非法", line_no))?;
                stack.push(Frame {
                    count,
                    start_line: line_no,
                    body: Vec::new(),
                });
                None
            }
            "end" => {
                if stack.len() <= 1 {
                    return Err(format!("第 {} 行: end 没有匹配的 loop", line_no));
                }
                let frame = stack.pop().unwrap();
                let node = Node::Loop(frame.count, frame.body);
                stack.last_mut().unwrap().body.push(node);
                None
            }
            other => {
                return Err(format!("第 {} 行: 未知指令 '{}'", line_no, other));
            }
        };
        if let Some(a) = action {
            stack.last_mut().unwrap().body.push(Node::Action(line_no, a));
        }
    }

    if stack.len() > 1 {
        let open = stack.last().unwrap();
        return Err(format!("第 {} 行: loop 缺少匹配的 end", open.start_line));
    }

    let root = stack.pop().unwrap();

    // 展开 loop 为扁平序列
    fn flatten(nodes: &[Node], out: &mut Vec<ScriptLine>) {
        for node in nodes {
            match node {
                Node::Action(line_no, action) => out.push(ScriptLine {
                    line_no: *line_no,
                    action: action.clone(),
                }),
                Node::Loop(count, body) => {
                    for _ in 0..*count {
                        flatten(body, out);
                    }
                }
            }
        }
    }

    let mut flat = Vec::new();
    flatten(&root.body, &mut flat);
    Ok(flat)
}

// ============================================
// M2 玩机核心：Tauri Commands
// ============================================

/// 读取显示状态（分辨率 / 密度 / 过扫描）
#[tauri::command]
pub async fn get_display_state(device_id: String) -> Result<DisplayState, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        let (size_out, _, _) = execute_shell_command(&mut device, "wm size")?;
        let (density_out, _, _) = execute_shell_command(&mut device, "wm density")?;
        let (overscan_out, _, _) = execute_shell_command(&mut device, "wm overscan")
            .unwrap_or((String::new(), String::new(), None));

        let size = parse_wm_size(&size_out).unwrap_or_else(|| "unknown".to_string());
        let density = parse_wm_density(&density_out).unwrap_or(0);
        let overscan = parse_overscan(&overscan_out).unwrap_or([0, 0, 0, 0]);

        Ok(DisplayState {
            default_size: size.clone(),
            size,
            default_density: density,
            density,
            overscan,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 设置显示参数（分辨率 / 密度 / 过扫描），失败自动回滚
#[tauri::command]
pub async fn set_display(
    device_id: String,
    size: Option<String>,
    density: Option<i32>,
    overscan: Option<[i32; 4]>,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // 先读取当前值用于回滚
        let (cur_size_out, _, _) = execute_shell_command(&mut device, "wm size")?;
        let (cur_density_out, _, _) = execute_shell_command(&mut device, "wm density")?;
        let old_size = parse_wm_size(&cur_size_out);
        let old_density = parse_wm_density(&cur_density_out);

        let mut messages: Vec<String> = Vec::new();

        // 设置分辨率
        if let Some(new_size) = &size {
            let cmd = build_wm_size_command(new_size);
            match execute_shell_command(&mut device, &cmd) {
                Ok((stdout, stderr, code)) => {
                    let ok = exit_code_or_default(code) == 0 && !stderr.contains("Exception");
                    if !ok {
                        // 回滚
                        if let Some(os) = &old_size {
                            let _ = execute_shell_command(&mut device, &build_wm_size_command(os));
                        }
                        return Err(format!("设置分辨率失败，已恢复原值: {}", stderr.trim()));
                    }
                    messages.push(format!("分辨率已设置为 {}", new_size));
                    let _ = stdout;
                }
                Err(e) => {
                    if let Some(os) = &old_size {
                        let _ = execute_shell_command(&mut device, &build_wm_size_command(os));
                    }
                    return Err(format!("设置分辨率失败，已恢复原值: {}", e));
                }
            }
        }

        // 设置密度
        if let Some(new_density) = density {
            let cmd = build_wm_density_command(new_density);
            match execute_shell_command(&mut device, &cmd) {
                Ok((_, stderr, code)) => {
                    let ok = exit_code_or_default(code) == 0 && !stderr.contains("Exception");
                    if !ok {
                        if let Some(od) = old_density {
                            let _ = execute_shell_command(&mut device, &build_wm_density_command(od));
                        }
                        return Err(format!("设置密度失败，已恢复原值: {}", stderr.trim()));
                    }
                    messages.push(format!("密度已设置为 {}", new_density));
                }
                Err(e) => {
                    if let Some(od) = old_density {
                        let _ = execute_shell_command(&mut device, &build_wm_density_command(od));
                    }
                    return Err(format!("设置密度失败，已恢复原值: {}", e));
                }
            }
        }

        // 设置过扫描
        if let Some(new_overscan) = &overscan {
            let cmd = build_wm_overscan_command(new_overscan);
            match execute_shell_command(&mut device, &cmd) {
                Ok((_, stderr, code)) => {
                    let ok = exit_code_or_default(code) == 0 && !stderr.contains("Exception");
                    if !ok {
                        let _ = execute_shell_command(&mut device, "wm overscan reset");
                        return Err(format!("设置过扫描失败（部分机型不支持），已重置: {}", stderr.trim()));
                    }
                    messages.push(format!(
                        "过扫描已设置为 {},{},{},{}",
                        new_overscan[0], new_overscan[1], new_overscan[2], new_overscan[3]
                    ));
                }
                Err(e) => {
                    let _ = execute_shell_command(&mut device, "wm overscan reset");
                    return Err(format!("设置过扫描失败（部分机型不支持），已重置: {}", e));
                }
            }
        }

        Ok(AdbResult {
            stdout: messages.join("; "),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 恢复显示默认值
#[tauri::command]
pub async fn reset_display(device_id: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let _ = execute_shell_command(&mut device, "wm size reset");
        let _ = execute_shell_command(&mut device, "wm density reset");
        let _ = execute_shell_command(&mut device, "wm overscan reset");
        Ok(AdbResult {
            stdout: "已恢复显示默认值".to_string(),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 设置系统参数（动画速度 / 字体 / 锁屏时间）
#[tauri::command]
pub async fn set_system_param(
    device_id: String,
    namespace: String,
    key: String,
    value: String,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = build_settings_put_command(&namespace, &key, &value);
        let (stdout, stderr, code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 读取电池状态
#[tauri::command]
pub async fn get_battery_state(device_id: String) -> Result<BatteryState, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let (stdout, _, _) = execute_shell_command(&mut device, "dumpsys battery")?;
        parse_battery(&stdout).ok_or_else(|| "无法解析电池状态".to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 电池模拟（设置电量 / 温度 / 充电状态）
#[tauri::command]
pub async fn battery_simulate(
    device_id: String,
    level: Option<i32>,
    temperature: Option<i32>,
    status: Option<i32>,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let mut messages: Vec<String> = Vec::new();

        if let Some(l) = level {
            let cmd = build_battery_set_command("level", l);
            let (_, stderr, code) = execute_shell_command(&mut device, &cmd)?;
            if exit_code_or_default(code) != 0 {
                return Err(format!("模拟电量失败: {}", stderr.trim()));
            }
            messages.push(format!("电量={}%", l));
        }
        if let Some(t) = temperature {
            let cmd = build_battery_set_command("temperature", t);
            let (_, stderr, code) = execute_shell_command(&mut device, &cmd)?;
            if exit_code_or_default(code) != 0 {
                return Err(format!("模拟温度失败: {}", stderr.trim()));
            }
            messages.push(format!("温度={}°C", t as f32 / 10.0));
        }
        if let Some(s) = status {
            let cmd = build_battery_set_command("status", s);
            let (_, stderr, code) = execute_shell_command(&mut device, &cmd)?;
            if exit_code_or_default(code) != 0 {
                return Err(format!("模拟充电状态失败: {}", stderr.trim()));
            }
            messages.push(format!("状态码={}", s));
        }

        Ok(AdbResult {
            stdout: format!("电池模拟已应用: {}", messages.join(", ")),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 一键还原真实电池状态
#[tauri::command]
pub async fn battery_reset(device_id: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let (stdout, stderr, code) = execute_shell_command(&mut device, "dumpsys battery reset")?;
        Ok(AdbResult {
            stdout: if stdout.is_empty() { "已还原真实电池状态".to_string() } else { stdout },
            stderr,
            exit_code: exit_code_or_default(code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 重启设备（协议级方法，不走 shell）
#[tauri::command]
pub async fn reboot_device(device_id: String, mode: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let reboot_type = map_reboot_type(&mode)?;
        let mut device = ADBServerDevice::new(device_id, None);
        device
            .reboot(reboot_type)
            .map_err(|e| format!("重启失败: {}", e))?;
        Ok(AdbResult {
            stdout: format!("重启指令已发送 ({})", mode),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 输入模拟（tap / swipe / keyevent / text）
#[tauri::command]
pub async fn send_input(
    device_id: String,
    action: String,
    x: Option<i32>,
    y: Option<i32>,
    x2: Option<i32>,
    y2: Option<i32>,
    duration_ms: Option<i32>,
    keycode: Option<String>,
    text: Option<String>,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        let cmd = match action.as_str() {
            "tap" => {
                let (x, y) = match (x, y) {
                    (Some(x), Some(y)) => (x, y),
                    _ => return Err("tap 需要 x 与 y 坐标".to_string()),
                };
                build_input_tap_command(x, y)
            }
            "swipe" => {
                let (x, y, x2, y2) = match (x, y, x2, y2) {
                    (Some(a), Some(b), Some(c), Some(d)) => (a, b, c, d),
                    _ => return Err("swipe 需要起点与终点坐标".to_string()),
                };
                build_input_swipe_command(x, y, x2, y2, duration_ms.unwrap_or(300))
            }
            "keyevent" => {
                let k = keycode.ok_or_else(|| "keyevent 需要按键名".to_string())?;
                build_input_keyevent_command(&k)
            }
            "text" => {
                let t = text.ok_or_else(|| "text 需要文本内容".to_string())?;
                if !t.is_ascii() {
                    return Err("input text 仅支持 ASCII 字符，中文需用 ADB Keyboard 等输入法".to_string());
                }
                build_input_text_command(&t)
            }
            other => return Err(format!("未知的输入类型: {}", other)),
        };

        let (stdout, stderr, code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 脚本执行进度事件负载
#[derive(Serialize, Clone, Debug)]
pub struct ScriptProgress {
    pub line_no: usize,
    pub index: usize,
    pub total: usize,
    pub status: String, // "running" / "done" / "error" / "stopped"
    pub message: String,
}

/// 执行自动化脚本（流式，支持停止）
#[tauri::command]
pub async fn execute_script(
    app: AppHandle,
    state: State<'_, Arc<TaskState>>,
    device_id: String,
    script: String,
) -> Result<String, String> {
    // 先解析（含行号级报错）
    let flat = parse_script_lines(&script)?;
    let total = flat.len();
    let task_info = task::create_task(&state, "脚本执行", total as u32);
    let task_id = task_info.id.clone();

    let state_arc = Arc::clone(&state);
    let app_clone = app.clone();
    let tid = task_id.clone();

    tokio::spawn(async move {
        let st = &*state_arc;
        task::update_task(
            &app_clone,
            st,
            &tid,
            Some(task::TaskStatus::Running),
            None,
            Some("开始执行脚本..."),
            None,
        );

        let mut device = ADBServerDevice::new(device_id.clone(), None);
        let mut completed: u32 = 0;

        for (index, line) in flat.iter().enumerate() {
            // 检查取消
            if task::is_cancelled(st, &tid) {
                let _ = app_clone.emit(
                    "script-progress",
                    ScriptProgress {
                        line_no: line.line_no,
                        index,
                        total,
                        status: "stopped".to_string(),
                        message: "已停止".to_string(),
                    },
                );
                task::update_task(
                    &app_clone,
                    st,
                    &tid,
                    Some(task::TaskStatus::Cancelled),
                    Some(completed),
                    Some("脚本已停止"),
                    None,
                );
                return;
            }

            // 发送当前行进度
            let _ = app_clone.emit(
                "script-progress",
                ScriptProgress {
                    line_no: line.line_no,
                    index,
                    total,
                    status: "running".to_string(),
                    message: String::new(),
                },
            );

            // 执行指令
            let result: Result<(), String> = match &line.action {
                ScriptAction::Sleep { ms } => {
                    tokio::time::sleep(tokio::time::Duration::from_millis(*ms)).await;
                    Ok(())
                }
                ScriptAction::Tap { x, y } => {
                    let cmd = build_input_tap_command(*x, *y);
                    execute_shell_command(&mut device, &cmd).map(|_| ())
                }
                ScriptAction::Swipe { x1, y1, x2, y2, duration_ms } => {
                    let cmd = build_input_swipe_command(*x1, *y1, *x2, *y2, *duration_ms);
                    execute_shell_command(&mut device, &cmd).map(|_| ())
                }
                ScriptAction::Keyevent { keycode } => {
                    let cmd = build_input_keyevent_command(keycode);
                    execute_shell_command(&mut device, &cmd).map(|_| ())
                }
                ScriptAction::Text { text } => {
                    let cmd = build_input_text_command(text);
                    execute_shell_command(&mut device, &cmd).map(|_| ())
                }
            };

            completed += 1;
            match result {
                Ok(()) => {
                    let _ = app_clone.emit(
                        "script-progress",
                        ScriptProgress {
                            line_no: line.line_no,
                            index,
                            total,
                            status: "done".to_string(),
                            message: String::new(),
                        },
                    );
                    task::update_task(&app_clone, st, &tid, None, Some(completed), None, None);
                }
                Err(e) => {
                    let _ = app_clone.emit(
                        "script-progress",
                        ScriptProgress {
                            line_no: line.line_no,
                            index,
                            total,
                            status: "error".to_string(),
                            message: e.clone(),
                        },
                    );
                    task::update_task(
                        &app_clone,
                        st,
                        &tid,
                        Some(task::TaskStatus::Failed),
                        Some(completed),
                        Some(&format!("第 {} 行执行失败: {}", line.line_no, e)),
                        None,
                    );
                    return;
                }
            }
        }

        task::update_task(
            &app_clone,
            st,
            &tid,
            Some(task::TaskStatus::Completed),
            Some(completed),
            Some("脚本执行完成"),
            None,
        );
    });

    Ok(task_id)
}

/// 获取设备信息报告（getprop + dumpsys 聚合）
#[tauri::command]
pub async fn get_device_report(device_id: String) -> Result<DeviceReport, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id.clone(), None);

        let get_prop = |dev: &mut ADBServerDevice, prop: &str| -> String {
            execute_shell_command(dev, &format!("getprop {}", prop))
                .map(|(out, _, _)| out.trim().to_string())
                .unwrap_or_else(|_| "unknown".to_string())
        };

        let battery = execute_shell_command(&mut device, "dumpsys battery")
            .ok()
            .and_then(|(out, _, _)| parse_battery(&out));

        let display = (|| {
            let (size_out, _, _) = execute_shell_command(&mut device, "wm size").ok()?;
            let (density_out, _, _) = execute_shell_command(&mut device, "wm density").ok()?;
            let (overscan_out, _, _) = execute_shell_command(&mut device, "wm overscan")
                .unwrap_or((String::new(), String::new(), None));
            let size = parse_wm_size(&size_out)?;
            let density = parse_wm_density(&density_out)?;
            Some(DisplayState {
                default_size: size.clone(),
                size,
                default_density: density,
                density,
                overscan: parse_overscan(&overscan_out).unwrap_or([0, 0, 0, 0]),
            })
        })();

        Ok(DeviceReport {
            model: get_prop(&mut device, "ro.product.model"),
            brand: get_prop(&mut device, "ro.product.brand"),
            android_version: get_prop(&mut device, "ro.build.version.release"),
            sdk_version: get_prop(&mut device, "ro.build.version.sdk"),
            build_number: get_prop(&mut device, "ro.build.display.id"),
            product: get_prop(&mut device, "ro.product.name"),
            device: get_prop(&mut device, "ro.product.device"),
            cpu_abi: get_prop(&mut device, "ro.product.cpu.abi"),
            serial: device_id,
            battery,
            display,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

// ============================================
// M2 玩机核心：单元测试
// ============================================

#[cfg(test)]
mod m2_tests {
    use super::*;

    // ============ 解析函数 ============

    #[test]
    fn test_parse_wm_size() {
        assert_eq!(
            parse_wm_size("Physical size: 1344x2992\n"),
            Some("1344x2992".to_string())
        );
        assert_eq!(parse_wm_size("Physical size: 1080x2400"), Some("1080x2400".to_string()));
        assert_eq!(parse_wm_size("no size here"), None);
    }

    #[test]
    fn test_parse_wm_density() {
        assert_eq!(parse_wm_density("Physical density: 480\n"), Some(480));
        assert_eq!(parse_wm_density("Physical density: 420"), Some(420));
        assert_eq!(parse_wm_density("garbage"), None);
    }

    #[test]
    fn test_parse_overscan() {
        assert_eq!(parse_overscan("0,0,0,0"), Some([0, 0, 0, 0]));
        assert_eq!(parse_overscan("overscan 0,100,0,0"), Some([0, 100, 0, 0]));
        assert_eq!(parse_overscan("-10,20,-30,40"), Some([-10, 20, -30, 40]));
        assert_eq!(parse_overscan("no overscan"), None);
    }

    #[test]
    fn test_parse_battery() {
        let out = "Current Battery Service state:\n  AC powered: false\n  level: 33\n  temperature: 350\n  status: 2\n";
        let b = parse_battery(out).unwrap();
        assert_eq!(b.level, 33);
        assert_eq!(b.temperature, 350);
        assert_eq!(b.status, 2);
        assert!(!b.simulating);

        assert!(parse_battery("incomplete\nlevel: 1\n").is_none());
    }

    // ============ 命令构造 ============

    #[test]
    fn test_build_wm_commands() {
        assert_eq!(build_wm_size_command("1080x2400"), "wm size 1080x2400");
        assert_eq!(build_wm_density_command(420), "wm density 420");
        assert_eq!(build_wm_overscan_command(&[0, 100, 0, 0]), "wm overscan 0,100,0,0");
    }

    #[test]
    fn test_build_settings_put() {
        assert_eq!(
            build_settings_put_command("global", "window_animation_scale", "1.0"),
            "settings put global window_animation_scale 1.0"
        );
    }

    #[test]
    fn test_build_battery_set() {
        assert_eq!(build_battery_set_command("level", 50), "dumpsys battery set level 50");
        assert_eq!(build_battery_set_command("temperature", 350), "dumpsys battery set temperature 350");
    }

    #[test]
    fn test_build_input_commands() {
        assert_eq!(build_input_tap_command(540, 1200), "input tap 540 1200");
        assert_eq!(
            build_input_swipe_command(540, 1200, 540, 400, 300),
            "input swipe 540 1200 540 400 300"
        );
        assert_eq!(build_input_keyevent_command("KEYCODE_HOME"), "input keyevent KEYCODE_HOME");
        assert_eq!(build_input_text_command("hello world"), "input text hello%sworld");
    }

    // ============ RebootType 映射 ============

    #[test]
    fn test_map_reboot_type() {
        assert!(matches!(map_reboot_type("system").unwrap(), RebootType::System));
        assert!(matches!(map_reboot_type("recovery").unwrap(), RebootType::Recovery));
        assert!(matches!(map_reboot_type("bootloader").unwrap(), RebootType::Bootloader));
        assert!(matches!(map_reboot_type("fastboot").unwrap(), RebootType::Fastboot));
        assert!(map_reboot_type("invalid").is_err());
    }

    // ============ 脚本 DSL 解析器 ============

    #[test]
    fn test_parse_script_basic() {
        let script = "tap 540 1200\nsleep 1000\nkeyevent KEYCODE_HOME\n";
        let flat = parse_script_lines(script).unwrap();
        assert_eq!(flat.len(), 3);
        assert_eq!(flat[0].line_no, 1);
        assert_eq!(flat[0].action, ScriptAction::Tap { x: 540, y: 1200 });
        assert_eq!(flat[1].action, ScriptAction::Sleep { ms: 1000 });
        assert_eq!(flat[2].action, ScriptAction::Keyevent { keycode: "KEYCODE_HOME".to_string() });
    }

    #[test]
    fn test_parse_script_comment_and_blank() {
        let script = "# 注释\n\ntap 1 2  # 行尾注释\n";
        let flat = parse_script_lines(script).unwrap();
        assert_eq!(flat.len(), 1);
        assert_eq!(flat[0].line_no, 3);
    }

    #[test]
    fn test_parse_script_loop_expand() {
        let script = "loop 3\n  tap 100 200\nend\n";
        let flat = parse_script_lines(script).unwrap();
        assert_eq!(flat.len(), 3);
        assert!(flat.iter().all(|l| l.action == ScriptAction::Tap { x: 100, y: 200 }));
    }

    #[test]
    fn test_parse_script_nested_loop() {
        let script = "loop 2\n  loop 2\n    tap 1 1\n  end\nend\n";
        let flat = parse_script_lines(script).unwrap();
        assert_eq!(flat.len(), 4);
    }

    #[test]
    fn test_parse_script_loop_too_deep() {
        let script = "loop 1\nloop 1\nloop 1\nloop 1\ntap 1 1\nend\nend\nend\nend\n";
        let err = parse_script_lines(script).unwrap_err();
        assert!(err.contains("嵌套超过"), "错误信息: {}", err);
    }

    #[test]
    fn test_parse_script_end_without_loop() {
        let script = "tap 1 1\nend\n";
        let err = parse_script_lines(script).unwrap_err();
        assert!(err.contains("没有匹配的 loop"), "错误信息: {}", err);
    }

    #[test]
    fn test_parse_script_loop_without_end() {
        let script = "loop 2\ntap 1 1\n";
        let err = parse_script_lines(script).unwrap_err();
        assert!(err.contains("缺少匹配的 end"), "错误信息: {}", err);
    }

    #[test]
    fn test_parse_script_invalid_line() {
        let script = "tap 1\n"; // 参数不足
        let err = parse_script_lines(script).unwrap_err();
        assert!(err.contains("第 1 行"), "错误信息: {}", err);

        let script2 = "foobar 1 2\n";
        let err2 = parse_script_lines(script2).unwrap_err();
        assert!(err2.contains("未知指令"), "错误信息: {}", err2);
    }

    #[test]
    fn test_parse_script_text_with_spaces() {
        let script = "text hello world\n";
        let flat = parse_script_lines(script).unwrap();
        assert_eq!(flat[0].action, ScriptAction::Text { text: "hello world".to_string() });
    }
}
