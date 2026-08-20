use adb_client::ADBDeviceExt;
use adb_client::server::{ADBServer, DeviceState};
use adb_client::server_device::ADBServerDevice;
use serde::Serialize;
use std::io::Cursor;
use std::path::Path;
use tauri::{AppHandle, State};

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

/// 从 dumpsys package 输出中提取应用信息
fn parse_app_detail(output: &str, package_name: &str, apk_path: &str) -> AppInfo {
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

    let is_system = apk_path.starts_with("/system/") || apk_path.starts_with("/vendor/") || apk_path.starts_with("/product/");

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
pub async fn list_apps(device_id: String, filter: String) -> Result<Vec<AppInfo>, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // 根据过滤器选择 pm list packages 参数
        let pm_cmd = match filter.as_str() {
            "user" => "pm list packages -f -3",   // 仅第三方
            "system" => "pm list packages -f -s", // 仅系统
            _ => "pm list packages -f",           // 全部
        };

        let (stdout, _, _) = execute_shell_command(&mut device, pm_cmd)?;
        let packages = parse_package_list(&stdout);

        let mut apps = Vec::new();
        for (pkg_name, apk_path) in &packages {
            // 获取每个应用的详细信息
            let detail_cmd = format!("dumpsys package {}", pkg_name);
            match execute_shell_command(&mut device, &detail_cmd) {
                Ok((detail_out, _, _)) => {
                    apps.push(parse_app_detail(&detail_out, pkg_name, apk_path));
                }
                Err(_) => {
                    // 如果 dumpsys 失败，仍然添加基本信息
                    let is_system = apk_path.starts_with("/system/") || apk_path.starts_with("/vendor/");
                    apps.push(AppInfo {
                        package_name: pkg_name.clone(),
                        app_name: pkg_name.split('.').last().unwrap_or(pkg_name).to_string(),
                        version_name: String::new(),
                        version_code: String::new(),
                        is_system,
                        is_enabled: true,
                        apk_path: apk_path.clone(),
                    });
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
            exit_code: exit_code.map(|c| c as i32).unwrap_or(-1),
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
            exit_code: exit_code.map(|c| c as i32).unwrap_or(-1),
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
            exit_code: exit_code.map(|c| c as i32).unwrap_or(-1),
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
            exit_code: exit_code.map(|c| c as i32).unwrap_or(-1),
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
            exit_code: exit_code.map(|c| c as i32).unwrap_or(-1),
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
                    let success = exit_code.map(|c| c == 0).unwrap_or(false)
                        && stdout.contains("Success");
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
