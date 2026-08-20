use serde::Serialize;
use std::process::Stdio;
use tokio::process::Command;

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
// 内部 ADB 命令执行函数
// ============================================

async fn execute_adb_command(args: &[&str]) -> Result<AdbResult, String> {
    let mut cmd = Command::new("adb");
    cmd.args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute adb: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    Ok(AdbResult {
        stdout,
        stderr,
        exit_code,
    })
}

// ============================================
// Tauri Commands
// ============================================

#[tauri::command]
pub async fn list_devices() -> Result<Vec<DeviceInfo>, String> {
    let result = execute_adb_command(&["devices", "-l"]).await?;

    if result.exit_code != 0 {
        return Err(format!("adb devices failed: {}", result.stderr));
    }

    let devices = parse_devices_output(&result.stdout);
    Ok(devices)
}

#[tauri::command]
pub async fn get_device_detail(device_id: String) -> Result<DeviceDetail, String> {
    let props = vec![
        ("ro.product.model", "unknown"),
        ("ro.product.brand", "unknown"),
        ("ro.build.version.release", "unknown"),
        ("ro.build.version.sdk", "unknown"),
        ("ro.build.display.id", "unknown"),
        ("ro.product.name", "unknown"),
        ("ro.product.device", "unknown"),
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

    for (prop, _) in &props {
        let result = execute_adb_command(&[
            "-s",
            &device_id,
            "shell",
            "getprop",
            prop,
        ])
        .await?;

        let value = result.stdout.trim().to_string();
        if !value.is_empty() && value != "unknown" {
            match *prop {
                "ro.product.model" => detail.model = value,
                "ro.product.brand" => detail.brand = value,
                "ro.build.version.release" => detail.android_version = value,
                "ro.build.version.sdk" => detail.sdk_version = value,
                "ro.build.display.id" => detail.build_number = value,
                "ro.product.name" => detail.product = value,
                "ro.product.device" => detail.device = value,
                _ => {}
            }
        }
    }

    // Try to get battery level
    if let Ok(battery_result) = execute_adb_command(&[
        "-s",
        &device_id,
        "shell",
        "dumpsys",
        "battery",
    ])
    .await
    {
        let output = battery_result.stdout;
        for line in output.lines() {
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
}

#[tauri::command]
pub async fn execute_adb(
    command: String,
    device_id: Option<String>,
) -> Result<AdbResult, String> {
    let mut args: Vec<String> = Vec::new();

    if let Some(id) = device_id {
        args.push("-s".to_string());
        args.push(id);
    }

    // Parse command string into argument list
    let parsed = parse_command_args(&command);
    args.extend(parsed);

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let result = execute_adb_command(&args_ref).await?;

    Ok(result)
}

// ============================================
// Helper functions
// ============================================

fn parse_devices_output(output: &str) -> Vec<DeviceInfo> {
    let mut devices = Vec::new();

    for line in output.lines() {
        let line = line.trim();
        // Skip header and empty lines
        if line.is_empty() || line.starts_with("List of devices") {
            continue;
        }

        // Parse line format: <id> <status> [product:xxx model:xxx device:xxx]
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let id = parts[0].to_string();
        let status_str = parts[1].to_lowercase();

        let status = match status_str.as_str() {
            "device" => DeviceStatus::Online,
            "offline" => DeviceStatus::Offline,
            "unauthorized" => DeviceStatus::Unauthorized,
            _ => DeviceStatus::Unknown,
        };

        // Parse extra info
        let mut model = "Unknown".to_string();
        let rest = &parts[2..].join(" ");

        for item in rest.split_whitespace() {
            if let Some(value) = item.strip_prefix("model:") {
                model = value.to_string();
                break;
            }
        }

        // Fallback to product if model not found
        if model == "Unknown" {
            for item in rest.split_whitespace() {
                if let Some(value) = item.strip_prefix("product:") {
                    model = value.to_string();
                    break;
                }
            }
        }

        // Determine connection type: ID contains colon for WiFi
        let connection = if id.contains(':') {
            "WiFi".to_string()
        } else {
            "USB".to_string()
        };

        devices.push(DeviceInfo {
            id,
            model,
            status,
            connection,
        });
    }

    devices
}

fn extract_battery_level(line: &str) -> Option<i32> {
    // Parse "level: 85" format
    let trimmed = line.trim();
    if let Some(pos) = trimmed.find("level:") {
        let after_level = &trimmed[pos + 6..];
        let value_str = after_level.trim();
        return value_str.parse::<i32>().ok();
    }
    None
}

fn parse_command_args(command: &str) -> Vec<String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for c in command.chars() {
        match c {
            '"' => {
                in_quotes = !in_quotes;
            }
            ' ' if !in_quotes => {
                if !current.is_empty() {
                    args.push(current.clone());
                    current.clear();
                }
            }
            _ => {
                current.push(c);
            }
        }
    }

    if !current.is_empty() {
        args.push(current);
    }

    args
}
