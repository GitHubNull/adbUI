use adb_client::server_device::ADBServerDevice;

use super::helpers::*;
use super::m2::*;

// ============================================
// 设备信息报告
// ============================================

/// 获取设备信息报告（getprop + dumpsys 聚合）
#[tauri::command]
pub async fn get_device_report(device_id: String) -> Result<DeviceReport, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id.clone(), None);

        let get_prop = |dev: &mut ADBServerDevice, prop: &str| -> String {
            execute_shell_command(dev, &format!("getprop {}", prop))
                .map(|(out, _, _)| out.trim().to_string())
                .unwrap_or_else(|_| "unknown".to_string())
        };

        let battery = execute_shell_command(&mut device, "dumpsys battery")
            .ok()
            .and_then(|(out, _, _)| parse_battery(&out));

        let display = (|| {
            let (size_out, _, _) = execute_shell_command(&mut device, "wm size").ok()?;
            let (density_out, _, _) = execute_shell_command(&mut device, "wm density").ok()?;
            let (overscan_out, _, _) = execute_shell_command(&mut device, "wm overscan")
                .unwrap_or((String::new(), String::new(), None));
            let size = parse_wm_size(&size_out)?;
            let density = parse_wm_density(&density_out)?;
            Some(DisplayState {
                default_size: size.clone(),
                size,
                default_density: density,
                density,
                overscan: parse_overscan(&overscan_out).unwrap_or([0, 0, 0, 0]),
            })
        })();

        Ok(DeviceReport {
            model: get_prop(&mut device, "ro.product.model"),
            brand: get_prop(&mut device, "ro.product.brand"),
            android_version: get_prop(&mut device, "ro.build.version.release"),
            sdk_version: get_prop(&mut device, "ro.build.version.sdk"),
            build_number: get_prop(&mut device, "ro.build.display.id"),
            product: get_prop(&mut device, "ro.product.name"),
            device: get_prop(&mut device, "ro.product.device"),
            cpu_abi: get_prop(&mut device, "ro.product.cpu.abi"),
            serial: device_id,
            battery,
            display,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
