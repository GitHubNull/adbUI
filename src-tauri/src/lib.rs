pub mod adb;

use adb::{execute_adb, get_device_detail, list_devices};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_devices,
            get_device_detail,
            execute_adb
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
