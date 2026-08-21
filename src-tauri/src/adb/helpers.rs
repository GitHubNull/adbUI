use adb_client::ADBDeviceExt;
use adb_client::server::DeviceState;
use adb_client::server_device::ADBServerDevice;
use std::io::Cursor;

use super::models::DeviceStatus;

// ============================================
// 内部辅助函数
// ============================================

/// 将 adb_client 的 DeviceState 映射到前端的 DeviceStatus
pub(crate) fn map_device_state(state: &DeviceState) -> DeviceStatus {
    match state {
        DeviceState::Device => DeviceStatus::Online,
        DeviceState::Offline => DeviceStatus::Offline,
        DeviceState::Unauthorized => DeviceStatus::Unauthorized,
        _ => DeviceStatus::Unknown,
    }
}

/// 判断设备连接类型（WiFi 或 USB）
pub(crate) fn detect_connection_type(identifier: &str) -> String {
    if identifier.contains(':') {
        "WiFi".to_string()
    } else {
        "USB".to_string()
    }
}

/// 执行 shell 命令并捕获输出
pub(crate) fn execute_shell_command(
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
pub(crate) fn exit_code_or_default(exit_code: Option<u8>) -> i32 {
    exit_code.map(|c| c as i32).unwrap_or(0)
}

/// 从 dumpsys battery 输出中提取电池电量
pub(crate) fn extract_battery_level(line: &str) -> Option<i32> {
    let trimmed = line.trim();
    if let Some(pos) = trimmed.find("level:") {
        let after_level = &trimmed[pos + 6..];
        let value_str = after_level.trim();
        return value_str.parse::<i32>().ok();
    }
    None
}
