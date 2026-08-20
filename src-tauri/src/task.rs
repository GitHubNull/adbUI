use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

// ============================================
// 任务数据模型
// ============================================

#[derive(Serialize, Clone, Debug)]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Serialize, Clone, Debug)]
pub struct TaskResult {
    pub item: String,
    pub success: bool,
    pub message: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct TaskInfo {
    pub id: String,
    pub name: String,
    pub status: TaskStatus,
    pub progress: f32,
    pub total: u32,
    pub completed: u32,
    pub message: String,
    pub results: Vec<TaskResult>,
    pub created_at: String,
}

// ============================================
// 任务状态管理
// ============================================

pub struct TaskState {
    pub tasks: Mutex<HashMap<String, TaskInfo>>,
    pub cancel_flags: Mutex<HashMap<String, bool>>,
}

pub fn create_task_state() -> Arc<TaskState> {
    Arc::new(TaskState {
        tasks: Mutex::new(HashMap::new()),
        cancel_flags: Mutex::new(HashMap::new()),
    })
}

/// 生成任务 ID
fn generate_task_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("task_{}", now.as_millis())
}

/// 获取当前时间字符串
fn now_string() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", now.as_secs())
}

/// 创建新任务并注册到状态管理
pub fn create_task(state: &TaskState, name: &str, total: u32) -> TaskInfo {
    let task = TaskInfo {
        id: generate_task_id(),
        name: name.to_string(),
        status: TaskStatus::Pending,
        progress: 0.0,
        total,
        completed: 0,
        message: String::new(),
        results: Vec::new(),
        created_at: now_string(),
    };

    let mut tasks = state.tasks.lock().unwrap();
    tasks.insert(task.id.clone(), task.clone());
    task
}

/// 更新任务状态并发送进度事件
pub fn update_task(
    app: &AppHandle,
    state: &TaskState,
    task_id: &str,
    status: Option<TaskStatus>,
    completed: Option<u32>,
    message: Option<&str>,
    result: Option<TaskResult>,
) {
    let mut tasks = state.tasks.lock().unwrap();
    if let Some(task) = tasks.get_mut(task_id) {
        if let Some(s) = status {
            task.status = s;
        }
        if let Some(c) = completed {
            task.completed = c;
            task.progress = if task.total > 0 {
                c as f32 / task.total as f32
            } else {
                0.0
            };
        }
        if let Some(m) = message {
            task.message = m.to_string();
        }
        if let Some(r) = result {
            task.results.push(r);
        }

        // 发送进度事件到前端
        let _ = app.emit("task-progress", task.clone());
    }
}

/// 检查任务是否被取消
pub fn is_cancelled(state: &TaskState, task_id: &str) -> bool {
    let flags = state.cancel_flags.lock().unwrap();
    flags.get(task_id).copied().unwrap_or(false)
}

// ============================================
// Tauri Commands
// ============================================

#[tauri::command]
pub async fn get_tasks(state: State<'_, Arc<TaskState>>) -> Result<Vec<TaskInfo>, String> {
    let tasks = state.tasks.lock().unwrap();
    let mut task_list: Vec<TaskInfo> = tasks.values().cloned().collect();
    // 按创建时间倒序排列
    task_list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(task_list)
}

#[tauri::command]
pub async fn cancel_task(task_id: String, state: State<'_, Arc<TaskState>>) -> Result<(), String> {
    let mut flags = state.cancel_flags.lock().unwrap();
    flags.insert(task_id, true);
    Ok(())
}

#[tauri::command]
pub async fn clear_completed_tasks(state: State<'_, Arc<TaskState>>) -> Result<(), String> {
    let mut tasks = state.tasks.lock().unwrap();
    tasks.retain(|_, task| {
        matches!(task.status, TaskStatus::Running | TaskStatus::Pending)
    });
    Ok(())
}
