use adb_client::server_device::ADBServerDevice;
use serde::Serialize;

use super::helpers::*;
use super::models::*;

// ============================================
// 文件管理数据模型
// ============================================

#[derive(Serialize, Clone, Debug)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub permissions: String,
    pub modified_time: String,
}

// ============================================
// 文件管理命令
// ============================================

#[tauri::command]
pub async fn list_files(device_id: String, path: String) -> Result<Vec<FileItem>, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // 使用 ls -la 获取详细文件列表
        let cmd = format!("ls -la '{}'", path);
        let (stdout, _, _) = execute_shell_command(&mut device, &cmd)?;

        let mut items = Vec::new();
        for line in stdout.lines() {
            let line = line.trim();
            // 跳过 . 和 .. 以及空行和 total 行
            if line.is_empty() || line.starts_with("total") {
                continue;
            }

            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 8 {
                continue;
            }

            let permissions = parts[0].to_string();
            let is_dir = permissions.starts_with('d');
            let size: u64 = parts[4].parse().unwrap_or(0);

            // 文件名可能包含空格，从第 8 个字段开始拼接
            let name = parts[7..].join(" ");
            if name == "." || name == ".." {
                continue;
            }

            // 修改时间
            let modified_time = if parts.len() >= 7 {
                format!("{} {} {}", parts[5], parts[6], parts.get(7).unwrap_or(&""))
            } else {
                String::new()
            };

            let item_path = if path.ends_with('/') {
                format!("{}{}", path, name)
            } else {
                format!("{}/{}", path, name)
            };

            items.push(FileItem {
                name,
                path: item_path,
                is_dir,
                size,
                permissions,
                modified_time,
            });
        }

        // 目录排在前面，然后按名称排序
        items.sort_by(|a, b| {
            b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        Ok(items)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn pull_file(
    device_id: String,
    remote_path: String,
    local_path: String,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        let mut output_file = std::fs::File::create(&local_path)
            .map_err(|e| format!("Failed to create file {}: {}", local_path, e))?;

        device
            .pull(&remote_path.as_str(), &mut output_file)
            .map_err(|e| format!("Failed to pull file: {}", e))?;

        Ok(AdbResult {
            stdout: format!("File pulled to {}", local_path),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn push_file(
    device_id: String,
    local_path: String,
    remote_path: String,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        let mut input_file = std::fs::File::open(&local_path)
            .map_err(|e| format!("Failed to open file {}: {}", local_path, e))?;

        device
            .push(&mut input_file, &remote_path.as_str())
            .map_err(|e| format!("Failed to push file: {}", e))?;

        Ok(AdbResult {
            stdout: format!("File pushed to {}", remote_path),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 读取远程文件内容并返回 base64 编码（用于图片预览）
/// 限制文件大小为 10MB，防止内存溢出
#[tauri::command]
pub async fn read_file_base64(device_id: String, remote_path: String) -> Result<String, String> {
    const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB

    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // 先检查文件大小
        let (stat_out, _, _) = execute_shell_command(
            &mut device,
            &format!("stat -c %s '{}'", remote_path),
        )?;
        let file_size: u64 = stat_out.trim().parse().unwrap_or(0);
        if file_size > MAX_FILE_SIZE {
            return Err(format!(
                "文件过大（{} MB），超过预览限制（10 MB）",
                file_size / 1024 / 1024
            ));
        }

        // 使用 pull 读取文件内容到内存
        let mut buffer = Vec::new();
        device
            .pull(&remote_path.as_str(), &mut buffer)
            .map_err(|e| format!("读取文件失败: {}", e))?;

        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&buffer);
        Ok(b64)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
