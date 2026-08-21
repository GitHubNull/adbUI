use adb_client::server_device::ADBServerDevice;

use super::helpers::*;

// ============================================
// 日志查看
// ============================================

/// 获取设备日志（logcat -d 快照模式）
#[tauri::command]
pub async fn get_device_logs(device_id: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let (stdout, _, _) = execute_shell_command(&mut device, "logcat -d")?;
        Ok(stdout)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
