pub mod adb;
pub mod task;

use adb::{
    batch_install, batch_uninstall, clear_app_data, execute_adb, extract_apk, force_stop_app,
    freeze_app, get_device_detail, install_apk, list_apps, list_devices, list_files, pull_file,
    push_file, unfreeze_app, uninstall_app,
};
use task::{cancel_task, clear_completed_tasks, get_tasks};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(task::create_task_state())
        .invoke_handler(tauri::generate_handler![
            list_devices,
            get_device_detail,
            execute_adb,
            // 应用管理
            list_apps,
            uninstall_app,
            force_stop_app,
            clear_app_data,
            freeze_app,
            unfreeze_app,
            extract_apk,
            install_apk,
            // 文件管理
            list_files,
            pull_file,
            push_file,
            // 任务框架
            get_tasks,
            cancel_task,
            clear_completed_tasks,
            // 批量操作
            batch_uninstall,
            batch_install,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
