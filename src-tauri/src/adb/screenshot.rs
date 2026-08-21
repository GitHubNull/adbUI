use adb_client::ADBDeviceExt;
use adb_client::server_device::ADBServerDevice;
use serde::Serialize;
use std::io::Cursor;
use std::path::Path;

use super::helpers::*;
use super::m2::parse_wm_size;

// ============================================
// 截图录屏
// ============================================

/// 截图结果（base64 编码 PNG）
#[derive(Serialize)]
pub struct ScreenshotResult {
    pub data: String,
    pub width: u32,
    pub height: u32,
}

/// 录屏状态
#[derive(Serialize, Clone)]
pub struct RecordState {
    pub recording: bool,
    pub start_time: Option<u64>,
    pub device_path: Option<String>,
}

/// 通过 screencap -p 获取屏幕 PNG 字节与分辨率
fn screencap_png(device: &mut ADBServerDevice) -> Result<(Vec<u8>, u32, u32), String> {
    let mut png_data = Vec::new();
    device
        .shell_command(&"screencap -p", Some(&mut png_data), None)
        .map_err(|e| format!("screencap 失败: {}", e))?;

    if !png_data.starts_with(&[0x89, b'P', b'N', b'G']) {
        return Err("screencap 输出不是有效 PNG".to_string());
    }

    let (size_out, _, _) = execute_shell_command(device, "wm size")?;
    let size_str = parse_wm_size(&size_out).ok_or_else(|| "无法解析屏幕分辨率".to_string())?;
    let parts: Vec<&str> = size_str.split('x').collect();
    let width: u32 = parts.first().and_then(|s| s.parse().ok()).unwrap_or(0);
    let height: u32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);

    Ok((png_data, width, height))
}

/// 截取设备屏幕，返回 base64 编码 PNG
#[tauri::command]
pub async fn take_screenshot(device_id: String) -> Result<ScreenshotResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // 优先使用 screencap -p：兼容性最好，直接产出 PNG
        // （部分设备 framebuffer 协议返回数据长度与分辨率不符，不可用）
        if let Ok((png_data, width, height)) = screencap_png(&mut device) {
            use base64::Engine;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&png_data);
            return Ok(ScreenshotResult {
                data: b64,
                width,
                height,
            });
        }

        // 降级：framebuffer 原始 RGBA 数据编码为 PNG
        let bytes = device
            .framebuffer_bytes()
            .map_err(|e| format!("截图失败（screencap 与 framebuffer 均不可用）: {}", e))?;

        let (size_out, _, _) = execute_shell_command(&mut device, "wm size")?;
        let size_str = parse_wm_size(&size_out)
            .ok_or_else(|| "无法解析屏幕分辨率".to_string())?;
        let parts: Vec<&str> = size_str.split('x').collect();
        if parts.len() != 2 {
            return Err("无法解析屏幕分辨率格式".to_string());
        }
        let width: u32 = parts[0].parse().map_err(|_| "宽度解析失败".to_string())?;
        let height: u32 = parts[1].parse().map_err(|_| "高度解析失败".to_string())?;

        let img = image::ImageBuffer::<image::Rgba<u8>, _>::from_vec(width, height, bytes)
            .ok_or_else(|| "RGBA 数据长度与分辨率不匹配".to_string())?;

        let mut png_buf = Cursor::new(Vec::new());
        img.write_to(&mut png_buf, image::ImageFormat::Png)
            .map_err(|e| format!("PNG 编码失败: {}", e))?;

        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD.encode(png_buf.into_inner());

        Ok(ScreenshotResult {
            data: b64,
            width,
            height,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 保存截图到本地路径
#[tauri::command]
pub async fn save_screenshot(device_id: String, save_path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        // 优先 screencap（兼容性最好）；失败再退到 framebuffer
        match screencap_png(&mut device) {
            Ok((png_data, _, _)) => {
                std::fs::write(&save_path, &png_data)
                    .map_err(|e| format!("写入截图文件失败: {}", e))?;
                Ok(())
            }
            Err(_) => device
                .framebuffer(&Path::new(&save_path))
                .map_err(|e| format!("保存截图失败: {}", e)),
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 检测设备是否支持录屏
#[tauri::command]
pub async fn check_screen_record_support(device_id: String) -> Result<bool, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // 尝试启动一个短暂的录屏来检测权限
        let test_path = "/data/local/tmp/.screenrecord_test.mp4";
        let cmd = format!("screenrecord --time-limit=1 {}", test_path);
        
        // 使用 shell_command 执行，捕获 stderr
        let mut stderr_buffer = Vec::new();
        let result = device.shell_command(
            &cmd,
            None,
            Some(&mut stderr_buffer),
        );

        // 清理测试文件（如果存在）
        let _ = device.shell_command(
            &format!("rm -f {}", test_path),
            None,
            None,
        );

        match result {
            Ok(_) => {
                // 检查 stderr 是否包含 Permission denied
                let stderr = String::from_utf8_lossy(&stderr_buffer);
                if stderr.contains("Permission denied") {
                    Ok(false)
                } else {
                    Ok(true)
                }
            }
            Err(e) => {
                // 如果命令执行失败，检查错误信息
                let err_msg = format!("{}", e);
                if err_msg.contains("Permission denied") {
                    Ok(false)
                } else {
                    // 其他错误，认为不支持
                    Ok(false)
                }
            }
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 开始录屏
#[tauri::command]
pub async fn start_screen_record(device_id: String) -> Result<RecordState, String> {
    let device_id_clone = device_id.clone();
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id_clone.clone(), None);

        // 使用 /data/local/tmp/ 作为录屏路径（shell 用户可写）
        let device_path = format!(
            "/data/local/tmp/screenrecord_{}.mp4",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        );

        // 使用 setsid 让 screenrecord 脱离当前终端会话，避免 adb shell 退出时 SIGHUP 终止子进程
        let bg_cmd = format!(
            "setsid sh -c 'screenrecord {}' > /dev/null 2>&1 &",
            device_path
        );
        execute_shell_command(&mut device, &bg_cmd)?;

        // 验证 screenrecord 进程是否实际启动
        std::thread::sleep(std::time::Duration::from_millis(800));
        let (ps_out, _, _) = execute_shell_command(&mut device, "ps -A | grep screenrecord")
            .unwrap_or_default();
        if !ps_out.contains("screenrecord") {
            // 进程未启动，可能是设备 SELinux 限制导致 screenrecord 无法写入
            return Err(
                "录屏启动失败：当前设备（Android 16+ / 部分 OEM）的 SELinux 策略限制 screenrecord 写入文件。"
                    .to_string(),
            );
        }

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Ok(RecordState {
            recording: true,
            start_time: Some(now),
            device_path: Some(device_path),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 停止录屏并拉取到本地
#[tauri::command]
pub async fn stop_screen_record(
    device_id: String,
    device_path: String,
    local_path: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // 发送 SIGINT 停止 screenrecord 进程
        let _ = execute_shell_command(&mut device, "pkill -INT screenrecord");
        // 等待文件写入完成
        std::thread::sleep(std::time::Duration::from_millis(800));

        // 检查设备端文件是否存在且非空
        let (stat_out, _, _) = execute_shell_command(&mut device, &format!("ls -la {}", device_path))
            .unwrap_or_default();
        if !stat_out.contains(&device_path) {
            return Err(
                "录屏文件不存在：screenrecord 可能因设备权限限制未能写入文件。"
                    .to_string(),
            );
        }
        // 检查文件大小（避免拉取 0 字节文件）
        let size_str = stat_out
            .split_whitespace()
            .nth(4)
            .unwrap_or("0")
            .parse::<u64>()
            .unwrap_or(0);
        if size_str == 0 {
            return Err(
                "录屏文件大小为 0 字节：screenrecord 可能因设备 SELinux 限制未能正常写入。"
                    .to_string(),
            );
        }

        // 拉取文件到本地
        let mut file = std::fs::File::create(&local_path)
            .map_err(|e| format!("创建本地文件失败: {}", e))?;
        device
            .pull(&device_path, &mut file)
            .map_err(|e| format!("拉取录屏文件失败: {}", e))?;

        // 删除设备端文件
        let _ = execute_shell_command(&mut device, &format!("rm -f {}", device_path));

        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
