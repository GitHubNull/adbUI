use adb_client::server_device::ADBServerDevice;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};

use super::helpers::*;

// ============================================
// 应用图标提取(设备端 app_process + 本地磁盘缓存)
//
// 原理:push 内嵌的 IconExtractor dex 到设备,通过 Android 自带
// app_process 以 shell 用户身份运行(无需 root),调用系统
// PackageManager 批量导出所有应用图标 PNG 并打包 zip,pull 回
// 本地解压缓存。缓存命中时不再连接设备。
// ============================================

/// 设备端图标提取器 dex(编译自 icon-extractor/IconExtractor.java,
/// 由 scripts/build-icon-dex.sh 生成)
const ICON_EXTRACTOR_DEX: &[u8] = include_bytes!("../../icon_extractor.dex");

/// 设备端工作目录与文件路径(shell 用户可写)
const DEVICE_WORK_DIR: &str = "/data/local/tmp/adbui_icons";
const DEVICE_DEX_PATH: &str = "/data/local/tmp/adbui_icons.dex";
const DEVICE_ZIP_PATH: &str = "/data/local/tmp/adbui_icons.zip";

/// 单个应用图标结果(base64 PNG,None 表示提取失败,前端展示占位图标)
#[derive(Serialize, Clone, Debug)]
pub struct AppIconEntry {
    pub package_name: String,
    pub icon_base64: Option<String>,
}

/// 将设备 ID 中的非字母数字字符替换为下划线(ip:port 不能作目录名)
fn sanitize_device_id(id: &str) -> String {
    id.chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect()
}

/// 解析图标缓存目录:绝对路径直接使用,相对路径基于当前工作目录(应用启动运行目录)
fn resolve_icon_dir(cache_dir: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(cache_dir);
    if path.is_absolute() {
        Ok(path)
    } else {
        std::env::current_dir()
            .map(|cwd| cwd.join(path))
            .map_err(|e| format!("获取当前工作目录失败: {}", e))
    }
}

/// 读取磁盘缓存图标并转 base64,文件不存在返回 None
fn read_cached_icon(icon_dir: &Path, package: &str) -> Option<String> {
    let file_path = icon_dir.join(format!("{}.png", package));
    std::fs::read(&file_path)
        .ok()
        .map(|bytes| BASE64.encode(&bytes))
}

/// 解压设备端拉回的图标 zip:写入缓存目录并返回 包名 -> base64 映射
fn unzip_icons(zip_bytes: &[u8], icon_dir: &Path) -> Result<HashMap<String, String>, String> {
    let reader = Cursor::new(zip_bytes);
    let mut archive = zip::ZipArchive::new(reader)
        .map_err(|e| format!("打开图标 zip 失败: {}", e))?;

    // 确保缓存目录存在,否则首次写入会因父目录缺失失败
    std::fs::create_dir_all(icon_dir)
        .map_err(|e| format!("创建图标缓存目录失败: {}", e))?;

    let mut result = HashMap::new();
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("读取 zip 条目失败: {}", e))?;

        // 仅接受安全的 <包名>.png 条目,拒绝目录与路径穿越
        let safe_name = entry
            .enclosed_name()
            .map(|p| p.to_string_lossy().to_string())
            .filter(|n| !n.contains('/') && !n.contains('\\'))
            .ok_or_else(|| "图标 zip 包含非法路径条目".to_string())?;
        let package = match safe_name.strip_suffix(".png") {
            Some(pkg) if !pkg.is_empty() => pkg.to_string(),
            _ => continue, // 跳过非图标条目
        };

        let mut bytes = Vec::new();
        entry
            .read_to_end(&mut bytes)
            .map_err(|e| format!("解压图标 {} 失败: {}", safe_name, e))?;

        // 写入磁盘缓存
        std::fs::write(icon_dir.join(&safe_name), &bytes)
            .map_err(|e| format!("写入图标缓存失败: {}", e))?;

        result.insert(package, BASE64.encode(&bytes));
    }
    Ok(result)
}

/// 设备端提取:push dex -> app_process 导出 -> pull zip -> 本地解压缓存
fn extract_from_device(
    device_id: &str,
    icon_dir: &Path,
) -> Result<HashMap<String, String>, String> {
    let mut device = ADBServerDevice::new(device_id.to_string(), None);

    // 1. push 图标提取器 dex
    let mut dex_bytes = Cursor::new(ICON_EXTRACTOR_DEX.to_vec());
    device
        .push(&mut dex_bytes, &DEVICE_DEX_PATH)
        .map_err(|e| format!("推送图标提取器失败: {}", e))?;

    // 2. 执行 app_process 批量导出图标(阻塞等待完成,首次约 10~30 秒)
    //    export CLASSPATH 形式兼容性最好;cmd-dir 用 / 与成熟方案一致
    let cmd = format!(
        "rm -rf {} {}; export CLASSPATH={}; app_process / com.adbui.IconExtractor {}",
        DEVICE_WORK_DIR, DEVICE_ZIP_PATH, DEVICE_DEX_PATH, DEVICE_WORK_DIR
    );
    let (stdout, _, _) = execute_shell_command(&mut device, &cmd)?;
    eprintln!("IconExtractor stdout tail: {}", stdout.lines().last().unwrap_or(""));

    // 校验 zip 已生成
    let (stat_out, _, _) =
        execute_shell_command(&mut device, &format!("stat -c %s {}", DEVICE_ZIP_PATH))?;
    if !stat_out.trim().chars().all(|c| c.is_ascii_digit()) {
        return Err(format!(
            "设备端图标提取失败(可能为 ROM 限制 app_process): {}",
            stat_out.trim()
        ));
    }

    // 3. pull zip 到内存
    let mut zip_bytes = Vec::new();
    device
        .pull(&DEVICE_ZIP_PATH, &mut zip_bytes)
        .map_err(|e| format!("拉取图标 zip 失败: {}", e))?;

    // 4. 清理设备端临时文件
    let _ = execute_shell_command(
        &mut device,
        &format!(
            "rm -rf {} {} {}",
            DEVICE_WORK_DIR, DEVICE_ZIP_PATH, DEVICE_DEX_PATH
        ),
    );

    // 5. 本地解压缓存
    unzip_icons(&zip_bytes, icon_dir)
}

/// 批量获取应用图标(base64 PNG),磁盘缓存命中时不再连接设备
#[tauri::command]
pub async fn get_app_icons(
    device_id: String,
    packages: Vec<String>,
    cache_dir: String,
) -> Result<Vec<AppIconEntry>, String> {
    tokio::task::spawn_blocking(move || {
        let icon_dir = resolve_icon_dir(&cache_dir)?.join(sanitize_device_id(&device_id));

        // 1. 缓存过滤:命中直接读文件,缺失进入设备提取
        let mut entries: Vec<AppIconEntry> = Vec::with_capacity(packages.len());
        let mut missing: Vec<String> = Vec::new();
        for pkg in &packages {
            match read_cached_icon(&icon_dir, pkg) {
                Some(b64) => entries.push(AppIconEntry {
                    package_name: pkg.clone(),
                    icon_base64: Some(b64),
                }),
                None => missing.push(pkg.clone()),
            }
        }

        // 2. 全部命中 → 不连接设备直接返回
        if missing.is_empty() {
            return Ok(entries);
        }

        // 3. 设备端批量提取;整体失败(如 ROM 限制 app_process)时
        //    全部降级为占位图标,不阻塞应用列表
        let extracted = match extract_from_device(&device_id, &icon_dir) {
            Ok(map) => map,
            Err(e) => {
                eprintln!("get_app_icons 设备端提取失败: {}", e);
                Default::default()
            }
        };

        for pkg in &missing {
            entries.push(AppIconEntry {
                package_name: pkg.clone(),
                icon_base64: extracted.get(pkg).cloned(),
            });
        }
        Ok(entries)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

// ============================================
// 单元测试
// ============================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_sanitize_device_id() {
        assert_eq!(sanitize_device_id("192.168.1.2:5555"), "192_168_1_2_5555");
        assert_eq!(sanitize_device_id("R58M1234ABC"), "R58M1234ABC");
        assert_eq!(sanitize_device_id(""), "");
    }

    #[test]
    fn test_resolve_icon_dir_relative() {
        let cwd = std::env::current_dir().unwrap();
        let resolved = resolve_icon_dir("./cache/icons").unwrap();
        assert_eq!(resolved, cwd.join("cache/icons"));
    }

    #[test]
    fn test_resolve_icon_dir_absolute() {
        let resolved = resolve_icon_dir("/tmp/adbui-icons").unwrap();
        assert!(resolved.is_absolute());
        assert_eq!(resolved, PathBuf::from("/tmp/adbui-icons"));
    }

    /// 构造内存 zip(条目:包名.png)
    fn build_test_zip(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut buf = Vec::new();
        {
            let mut writer = zip::ZipWriter::new(Cursor::new(&mut buf));
            let options = zip::write::SimpleFileOptions::default();
            for (name, data) in entries {
                writer.start_file(*name, options).unwrap();
                writer.write_all(data).unwrap();
            }
            writer.finish().unwrap();
        }
        buf
    }

    #[test]
    fn test_unzip_icons_writes_cache_and_base64() {
        // 唯一临时目录,避免并行测试冲突
        let dir = std::env::temp_dir().join(format!("adbui_icon_test_{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();

        let zip_bytes = build_test_zip(&[
            ("com.example.app.png", b"fake-png-bytes"),
            ("com.example.system.png", b"another-png"),
        ]);

        let map = unzip_icons(&zip_bytes, &dir).unwrap();
        assert_eq!(map.len(), 2);
        assert_eq!(
            map.get("com.example.app"),
            Some(&BASE64.encode(b"fake-png-bytes"))
        );
        // 磁盘缓存已写入
        assert!(dir.join("com.example.app.png").exists());
        assert!(dir.join("com.example.system.png").exists());
        // 缓存命中可直接读回
        let cached = read_cached_icon(&dir, "com.example.app").unwrap();
        assert_eq!(cached, BASE64.encode(b"fake-png-bytes"));

        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn test_unzip_icons_rejects_unsafe_entries() {
        let dir = std::env::temp_dir().join(format!("adbui_icon_unsafe_{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();

        // 含路径分隔的条目应被拒绝(整个 zip 视为非法)
        let zip_bytes = build_test_zip(&[("../evil.png", b"evil")]);
        assert!(unzip_icons(&zip_bytes, &dir).is_err());

        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn test_read_cached_icon_missing() {
        let dir = std::env::temp_dir().join(format!("adbui_icon_empty_{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        assert!(read_cached_icon(&dir, "no.such.package").is_none());
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
