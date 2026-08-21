use adb_client::server_device::ADBServerDevice;
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, State};

use crate::task::{self, TaskState};

use super::helpers::*;

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
