pub mod adb;
pub mod task;

use adb::{
    batch_install, batch_uninstall, battery_reset, battery_simulate, clear_app_data, execute_adb,
    execute_script, extract_apk, force_stop_app, freeze_app, get_battery_state, get_device_detail,
    get_device_report, get_display_state, install_apk, list_apps, list_devices, list_files,
    pull_file, push_file, reboot_device, reset_display, send_input, set_display, set_system_param,
    unfreeze_app, uninstall_app,
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
            // M2 玩机核心
            get_display_state,
            set_display,
            reset_display,
            set_system_param,
            get_battery_state,
            battery_simulate,
            battery_reset,
            reboot_device,
            send_input,
            execute_script,
            get_device_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
