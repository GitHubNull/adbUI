use adb_client::server_device::ADBServerDevice;
use adb_client::RebootType;
use serde::Serialize;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

use crate::task::{self, TaskState};

use super::helpers::*;
use super::m2::*;
use super::models::*;

/// 将 mode 字符串映射为 RebootType
pub(crate) fn map_reboot_type(mode: &str) -> Result<RebootType, String> {
    match mode {
        "system" => Ok(RebootType::System),
        "recovery" => Ok(RebootType::Recovery),
        "bootloader" => Ok(RebootType::Bootloader),
        "fastboot" => Ok(RebootType::Fastboot),
        _ => Err(format!("不支持的重启模式: {}", mode)),
    }
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
