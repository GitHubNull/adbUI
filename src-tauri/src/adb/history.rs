use serde::Serialize;
use std::sync::Arc;
use tauri::State;

use super::models::AdbResult;

// ============================================
// 命令历史
// ============================================

/// 命令历史记录条目
#[derive(Serialize, Clone, Debug)]
pub struct CommandHistoryEntry {
    pub command: String,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub timestamp: String,
    pub device_id: String,
}

/// 命令历史状态管理
pub struct CommandHistoryState {
    pub entries: std::sync::Mutex<Vec<CommandHistoryEntry>>,
}

/// 创建命令历史状态
pub fn create_command_history_state() -> Arc<CommandHistoryState> {
    Arc::new(CommandHistoryState {
        entries: std::sync::Mutex::new(Vec::new()),
    })
}

/// 记录命令到历史（在 execute_adb 中自动调用）
pub fn record_command(
    state: &CommandHistoryState,
    command: &str,
    result: &AdbResult,
    device_id: &str,
) {
    let entry = CommandHistoryEntry {
        command: command.to_string(),
        stdout: result.stdout.clone(),
        stderr: result.stderr.clone(),
        exit_code: result.exit_code,
        timestamp: {
            use std::time::{SystemTime, UNIX_EPOCH};
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default();
            format!("{}", now.as_secs())
        },
        device_id: device_id.to_string(),
    };

    let mut entries = state.entries.lock().unwrap();
    entries.insert(0, entry); // 最新的在前面
    // 限制容量 100 条
    if entries.len() > 100 {
        entries.truncate(100);
    }
}

/// 获取命令历史
#[tauri::command]
pub async fn get_command_history(
    state: State<'_, Arc<CommandHistoryState>>,
) -> Result<Vec<CommandHistoryEntry>, String> {
    let entries = state.entries.lock().unwrap();
    Ok(entries.clone())
}

/// 清空命令历史
#[tauri::command]
pub async fn clear_command_history(
    state: State<'_, Arc<CommandHistoryState>>,
) -> Result<(), String> {
    let mut entries = state.entries.lock().unwrap();
    entries.clear();
    Ok(())
}
