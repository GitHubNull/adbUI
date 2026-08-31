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

        // 硬件信息：CPU 平台 / 核心数 / 内存 / 存储（单项失败不影响整体）
        let hardware = (|| {
            let cpu_hardware = get_prop(&mut device, "ro.hardware");
            let cpu_cores = execute_shell_command(&mut device, "cat /proc/cpuinfo")
                .map(|(out, _, _)| parse_cpu_cores(&out))
                .unwrap_or(0);
            let (memory_total_kb, memory_available_kb) =
                execute_shell_command(&mut device, "cat /proc/meminfo")
                    .map(|(out, _, _)| parse_meminfo(&out))
                    .unwrap_or((0, 0));
            let (storage_total_kb, storage_available_kb) =
                execute_shell_command(&mut device, "df -k /data")
                    .ok()
                    .and_then(|(out, _, _)| parse_df_data(&out))
                    .unwrap_or((0, 0));
            // 全部采集失败（无有效数据）时视为无硬件信息（get_prop 失败返回 "unknown"）
            if cpu_cores == 0 && memory_total_kb == 0 && storage_total_kb == 0
                && (cpu_hardware.is_empty() || cpu_hardware == "unknown") {
                return None;
            }
            Some(HardwareInfo {
                cpu_hardware,
                cpu_cores,
                cpu_abi: get_prop(&mut device, "ro.product.cpu.abi"),
                memory_total_kb,
                memory_available_kb,
                storage_total_kb,
                storage_available_kb,
            })
        })();

        // 网络信息：优先 wlan0，失败回退 eth0；device_id 含 ":" 视为 WiFi 连接（IP:端口）
        // 注：部分设备/协议下 adb 不返回退出码（code 为 None），故以输出含 "link/" 作为接口存在的判据
        let network = (|| {
            for iface in ["wlan0", "eth0"] {
                if let Ok((out, _, _)) = execute_shell_command(&mut device, &format!("ip addr show {}", iface)) {
                    if out.contains("link/") {
                        let (ip_address, mac_address) = parse_ip_addr(&out);
                        return Some(NetworkInfo {
                            interface: iface.to_string(),
                            ip_address,
                            mac_address,
                            connection_type: if device_id.contains(':') { "wifi" } else { "usb" }.to_string(),
                        });
                    }
                }
            }
            None
        })();

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
            hardware,
            network,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 将报告文件内容写入指定路径（前端多格式导出落盘，目录由用户通过对话框选择）
#[tauri::command]
pub async fn save_report_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("保存报告文件失败: {}", e))
}
