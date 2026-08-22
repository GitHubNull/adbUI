pub mod adb;
pub mod task;

use adb::{
    batch_install, batch_uninstall, battery_reset, battery_simulate, check_screen_record_support,
    clear_app_data, clear_command_history, connect_device, disconnect_device, execute_adb,
    execute_script, extract_apk, force_stop_app, freeze_app, generate_pairing_qr, get_battery_state,
    get_command_history, get_device_detail, get_device_logs, get_device_report, get_display_state,
    get_performance_data, install_apk, list_apps, list_devices, list_files, pull_file, push_file,
    read_file_base64, reboot_device, reset_display, save_screenshot, scan_network_devices,
    send_input, set_display, set_system_param, start_screen_record, stop_screen_record,
    take_screenshot, unfreeze_app, uninstall_app, wait_and_pair_device,
};
use task::{cancel_task, clear_completed_tasks, get_tasks};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(task::create_task_state())
        .manage(adb::create_command_history_state())
        .invoke_handler(tauri::generate_handler![
            list_devices,
            get_device_detail,
            execute_adb,
            connect_device,
            disconnect_device,
            scan_network_devices,
            generate_pairing_qr,
            wait_and_pair_device,
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
            read_file_base64,
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
            // 日志查看
            get_device_logs,
            // 截图录屏
            take_screenshot,
            save_screenshot,
            check_screen_record_support,
            start_screen_record,
            stop_screen_record,
            // 性能监控
            get_performance_data,
            // 命令历史
            get_command_history,
            clear_command_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
