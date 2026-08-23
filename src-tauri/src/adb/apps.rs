use adb_client::server_device::ADBServerDevice;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::path::Path;

use super::helpers::*;
use super::models::*;

// ============================================
// 应用管理数据模型
// ============================================

#[derive(Serialize, Clone, Debug)]
pub struct AppInfo {
    pub package_name: String,
    pub app_name: String,
    pub version_name: String,
    pub version_code: String,
    pub is_system: bool,
    pub is_enabled: bool,
    pub apk_path: String,
}

/// 应用详情（get_app_detail 返回，含大小 / 安装来源 / SDK 等扩展字段）
#[derive(Serialize, Clone, Debug)]
pub struct AppDetail {
    pub package_name: String,
    pub app_name: String,
    pub version_name: String,
    pub version_code: String,
    pub is_system: bool,
    pub is_enabled: bool,
    pub apk_path: String,
    /// 安装来源（应用商店包名，如 com.android.vending）
    pub installer_package: String,
    /// APK 本体总大小（字节，dumpsys 缺失时 pm path + stat 累加兜底）
    pub code_size: u64,
    /// 用户数据大小（字节，非 root 设备不可获取，为 null）
    pub data_size: Option<u64>,
    /// 缓存大小（字节，非 root 设备不可获取，为 null）
    pub cache_size: Option<u64>,
    /// 目标 SDK 版本
    pub target_sdk: String,
    /// 最低 SDK 版本
    pub min_sdk: String,
    /// 首次安装时间
    pub first_install_time: String,
    /// 最近更新时间
    pub last_update_time: String,
    /// 应用 UID
    pub uid: String,
}

// ============================================
// 应用管理命令
// ============================================

/// 解析 pm list packages -f 输出，提取包名和 APK 路径
fn parse_package_list(output: &str) -> Vec<(String, String)> {
    let mut packages = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.starts_with("package:") {
            let rest = &line[8..]; // 去掉 "package:" 前缀
            if let Some(eq_pos) = rest.rfind('=') {
                let apk_path = rest[..eq_pos].to_string();
                let package_name = rest[eq_pos + 1..].to_string();
                packages.push((package_name, apk_path));
            }
        }
    }
    packages
}

/// 解析 pm list packages（无 -f）输出，返回包名列表
fn parse_package_names(output: &str) -> Vec<String> {
    output
        .lines()
        .map(|l| l.trim())
        .filter(|l| l.starts_with("package:"))
        .map(|l| l[8..].trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

/// 解析 pm list packages --show-versioncode 输出行，返回 (包名, versionCode)
/// 兼容两种格式（注意路径中可能含 ==，必须用 rfind）：
///   package:com.android.chrome versionCode:609923000
///   package:/data/app/~~xxx==/base.apk=com.android.chrome versionCode:609923000
fn parse_version_line(line: &str) -> Option<(String, String)> {
    let line = line.trim();
    if !line.starts_with("package:") {
        return None;
    }
    let rest = &line[8..];
    let pkg = if let Some(eq_pos) = rest.rfind('=') {
        rest[eq_pos + 1..].split_whitespace().next()?.to_string()
    } else {
        rest.split_whitespace().next()?.to_string()
    };
    let code = rest
        .split("versionCode:")
        .nth(1)?
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_string();
    if pkg.is_empty() || code.is_empty() {
        return None;
    }
    Some((pkg, code))
}

/// 从 dumpsys package 输出中解析 pkgFlags，判断是否为系统应用
/// 兼容两种格式：
///   pkgFlags=[ SYSTEM DEBUGGABLE ]  （字符串标志）
///   pkgFlags=[ 0x1 ]                （位掩码，FLAG_SYSTEM = 0x1）
fn parse_system_flag(output: &str) -> Option<bool> {
    for line in output.lines() {
        let trimmed = line.trim();
        if let Some(idx) = trimmed.find("pkgFlags=") {
            let val = &trimmed[idx + 9..];
            if val.contains("SYSTEM") {
                return Some(true);
            }
            let num = val.trim_matches(|c: char| c == '[' || c == ']' || c == ' ');
            if let Some(hex) = num.strip_prefix("0x") {
                if let Ok(flags) = u64::from_str_radix(hex, 16) {
                    return Some(flags & 0x1 != 0);
                }
            }
        }
    }
    None
}

/// 从 dumpsys package 输出中提取应用信息
fn parse_app_detail(
    output: &str,
    package_name: &str,
    apk_path: &str,
    system_set: &HashSet<String>,
) -> AppInfo {
    let mut version_name = String::new();
    let mut version_code = String::new();
    let mut is_enabled = true;

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("versionName=") {
            version_name = trimmed[12..].to_string();
        } else if trimmed.starts_with("versionCode=") {
            // versionCode=123 minSdk=21 targetSdk=34
            let val = &trimmed[12..];
            if let Some(space_pos) = val.find(' ') {
                version_code = val[..space_pos].to_string();
            } else {
                version_code = val.to_string();
            }
        } else if trimmed.starts_with("enabled=") {
            // enabled=1 或 enabled=2 (disabled)
            let val = &trimmed[8..];
            is_enabled = val.starts_with('1') || val.starts_with('0');
        }
    }

    // 从 APK 路径提取应用名（取包名最后一段作为 fallback）
    let app_name = package_name
        .split('.')
        .last()
        .unwrap_or(package_name)
        .to_string();

    // 系统应用判定：优先 dumpsys 的 SYSTEM flag，其次 pm -s 集合，最后路径兜底
    let is_system = parse_system_flag(output)
        .unwrap_or_else(|| {
            system_set.contains(package_name)
                || apk_path.starts_with("/system/")
                || apk_path.starts_with("/vendor/")
                || apk_path.starts_with("/product/")
                || apk_path.starts_with("/oem/")
        });

    AppInfo {
        package_name: package_name.to_string(),
        app_name,
        version_name,
        version_code,
        is_system,
        is_enabled,
        apk_path: apk_path.to_string(),
    }
}

#[tauri::command]
pub async fn list_apps(device_id: String, _filter: String) -> Result<Vec<AppInfo>, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id.clone(), None);

        // 1. 全量包列表（含 APK 路径），一次命令获取
        let (stdout, _, _) = execute_shell_command(&mut device, "pm list packages -f")?;
        let packages = parse_package_list(&stdout);

        // 2. 系统包集合（按 SYSTEM flag，比路径判断准确）
        let mut system_set: HashSet<String> = HashSet::new();
        if let Ok((sys_out, _, _)) = execute_shell_command(&mut device, "pm list packages -s") {
            system_set = parse_package_names(&sys_out).into_iter().collect();
        }

        // 3. 已禁用（冻结）包集合
        let mut disabled_set: HashSet<String> = HashSet::new();
        if let Ok((d_out, _, _)) = execute_shell_command(&mut device, "pm list packages -d") {
            disabled_set = parse_package_names(&d_out).into_iter().collect();
        }

        // 4. 版本号（API 26+ 支持 --show-versioncode，单命令秒级返回）
        let mut version_map: HashMap<String, String> = HashMap::new();
        let version_supported = match execute_shell_command(
            &mut device,
            "pm list packages --show-versioncode",
        ) {
            Ok((v_out, _, _)) => {
                for line in v_out.lines() {
                    if let Some((pkg, code)) = parse_version_line(line) {
                        version_map.insert(pkg, code);
                    }
                }
                !version_map.is_empty()
            }
            Err(_) => false,
        };

        let mut apps = Vec::with_capacity(packages.len());
        if version_supported {
            // 主路径：快速组装，无需逐包 dumpsys
            for (pkg_name, apk_path) in &packages {
                apps.push(AppInfo {
                    package_name: pkg_name.clone(),
                    app_name: pkg_name
                        .split('.')
                        .last()
                        .unwrap_or(pkg_name)
                        .to_string(),
                    version_name: String::new(),
                    version_code: version_map.get(pkg_name).cloned().unwrap_or_default(),
                    is_system: system_set.contains(pkg_name),
                    is_enabled: !disabled_set.contains(pkg_name),
                    apk_path: apk_path.clone(),
                });
            }
        } else {
            // 老设备（API < 26）fallback：逐包 dumpsys 获取详细信息
            for (pkg_name, apk_path) in &packages {
                let detail_cmd = format!("dumpsys package {}", pkg_name);
                match execute_shell_command(&mut device, &detail_cmd) {
                    Ok((detail_out, _, _)) => {
                        apps.push(parse_app_detail(
                            &detail_out,
                            pkg_name,
                            apk_path,
                            &system_set,
                        ));
                    }
                    Err(_) => {
                        // 如果 dumpsys 失败，仍然添加基本信息
                        apps.push(AppInfo {
                            package_name: pkg_name.clone(),
                            app_name: pkg_name
                                .split('.')
                                .last()
                                .unwrap_or(pkg_name)
                                .to_string(),
                            version_name: String::new(),
                            version_code: String::new(),
                            is_system: system_set.contains(pkg_name),
                            is_enabled: true,
                            apk_path: apk_path.clone(),
                        });
                    }
                }
            }
        }

        // 按应用名排序
        apps.sort_by(|a, b| a.app_name.to_lowercase().cmp(&b.app_name.to_lowercase()));
        Ok(apps)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn get_app_detail(device_id: String, package: String) -> Result<AppDetail, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id.clone(), None);

        // 1. 从全量包列表（含 APK 路径）中定位目标包
        let (stdout, _, _) = execute_shell_command(&mut device, "pm list packages -f")?;
        let packages = parse_package_list(&stdout);
        let apk_path = packages
            .iter()
            .find(|(pkg, _)| pkg == &package)
            .map(|(_, path)| path.clone())
            .ok_or_else(|| format!("Package not found: {}", package))?;

        // 2. dumpsys 单包详情（一次调用拿到全部字段）
        let (detail_out, _, _) =
            execute_shell_command(&mut device, &format!("dumpsys package {}", package))?;

        // 3. 逐行解析字段（部分字段缺失时保持默认值）
        let mut version_name = String::new();
        let mut version_code = String::new();
        let mut is_enabled = true;
        let mut installer_package = String::new();
        let mut code_size: u64 = 0;
        let mut data_size: Option<u64> = None;
        let mut cache_size: Option<u64> = None;
        let mut target_sdk = String::new();
        let mut min_sdk = String::new();
        let mut first_install_time = String::new();
        let mut last_update_time = String::new();
        let mut uid = String::new();

        for line in detail_out.lines() {
            let trimmed = line.trim();
            if let Some(val) = trimmed.strip_prefix("versionName=") {
                version_name = val.to_string();
            } else if let Some(rest) = trimmed.strip_prefix("versionCode=") {
                // versionCode=123 minSdk=21 targetSdk=34
                version_code = rest.split_whitespace().next().unwrap_or("").to_string();
                for token in rest.split_whitespace() {
                    if let Some(v) = token.strip_prefix("minSdk=") {
                        min_sdk = v.to_string();
                    } else if let Some(v) = token.strip_prefix("targetSdk=") {
                        target_sdk = v.to_string();
                    }
                }
            } else if let Some(val) = trimmed.strip_prefix("enabled=") {
                // enabled=1 或 enabled=2 (disabled)
                is_enabled = val.starts_with('1') || val.starts_with('0');
            } else if let Some(val) = trimmed.strip_prefix("installerPackageName=") {
                installer_package = val.to_string();
            } else if let Some(val) = trimmed.strip_prefix("codeSize=") {
                code_size = val.trim().parse().unwrap_or(0);
            } else if let Some(val) = trimmed.strip_prefix("dataSize=") {
                data_size = val.trim().parse().ok();
            } else if let Some(val) = trimmed.strip_prefix("cacheSize=") {
                cache_size = val.trim().parse().ok();
            } else if let Some(val) = trimmed.strip_prefix("firstInstallTime=") {
                first_install_time = val.trim_matches('"').to_string();
            } else if let Some(val) = trimmed.strip_prefix("lastUpdateTime=") {
                last_update_time = val.trim_matches('"').to_string();
            } else if let Some(val) = trimmed.strip_prefix("userId=") {
                uid = val.trim().to_string();
            }
        }

        // 4. APK 本体总大小兜底：部分 ROM 的 dumpsys 无 codeSize 字段，
        //    用 pm path 列出全部 APK 文件后逐文件 stat 累加（无需 root）
        if code_size == 0 {
            let size_cmd = format!(
                "pm path {} | sed 's/^package://' | xargs stat -c %s 2>/dev/null | awk '{{s+=$1}} END {{print s+0}}'",
                package
            );
            if let Ok((size_out, _, _)) = execute_shell_command(&mut device, &size_cmd) {
                code_size = size_out.trim().parse().unwrap_or(0);
            }
        }
        
        // 5. 系统应用判定：优先 SYSTEM flag，其次 pm -s 集合与路径兑底
        let mut system_set: HashSet<String> = HashSet::new();
        if let Ok((sys_out, _, _)) = execute_shell_command(&mut device, "pm list packages -s") {
            system_set = parse_package_names(&sys_out).into_iter().collect();
        }
        let is_system = parse_system_flag(&detail_out).unwrap_or_else(|| {
            system_set.contains(&package)
                || apk_path.starts_with("/system/")
                || apk_path.starts_with("/vendor/")
                || apk_path.starts_with("/product/")
                || apk_path.starts_with("/oem/")
        });

        // 应用名：与列表一致，取包名最后一段
        let app_name = package
            .split('.')
            .last()
            .unwrap_or(&package)
            .to_string();

        Ok(AppDetail {
            package_name: package.clone(),
            app_name,
            version_name,
            version_code,
            is_system,
            is_enabled,
            apk_path,
            installer_package,
            code_size,
            data_size,
            cache_size,
            target_sdk,
            min_sdk,
            first_install_time,
            last_update_time,
            uid,
        })
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

    #[test]
    fn test_parse_version_line_with_path() {
        // 真实设备输出：路径中可能含 ==，必须从最后一个 = 后取包名
        let line = "package:/data/app/~~JIkXa2cRnARnLGtGZ6eLMg==/com.coloros.ocrscanner-dcNdvgkkMaHpYSTJc5NWDw==/base.apk=com.coloros.ocrscanner versionCode:160313";
        assert_eq!(
            parse_version_line(line),
            Some(("com.coloros.ocrscanner".to_string(), "160313".to_string()))
        );
    }

    #[test]
    fn test_parse_version_line_plain() {
        // 无路径格式（API 26+ 精简输出）
        let line = "package:com.android.chrome versionCode:609923000";
        assert_eq!(
            parse_version_line(line),
            Some(("com.android.chrome".to_string(), "609923000".to_string()))
        );
    }

    #[test]
    fn test_parse_package_names() {
        let out = "package:com.oplus.metis\npackage:com.android.settings\n";
        assert_eq!(
            parse_package_names(out),
            vec!["com.oplus.metis".to_string(), "com.android.settings".to_string()]
        );
    }

    #[test]
    fn test_parse_package_list_with_double_eq() {
        // -f 输出同样含 ==，rfind 必须正确
        let out = "package:/data/app/~~AUo8tflPa9igkSf3y-M62A==/com.baidu.input_oppo-W3OUOLrgqXmG5KNG6spS6w==/base.apk=com.baidu.input_oppo";
        assert_eq!(
            parse_package_list(out),
            vec![(
                "com.baidu.input_oppo".to_string(),
                "/data/app/~~AUo8tflPa9igkSf3y-M62A==/com.baidu.input_oppo-W3OUOLrgqXmG5KNG6spS6w==/base.apk".to_string()
            )]
        );
    }

    #[test]
    fn test_parse_system_flag() {
        // 字符串标志格式
        let out = "  pkgFlags=[ SYSTEM DEBUGGABLE ]\n  enabled=1\n";
        assert_eq!(parse_system_flag(out), Some(true));

        // 位掩码格式（FLAG_SYSTEM = 0x1）
        let out2 = "  pkgFlags=[ 0x1 ]\n";
        assert_eq!(parse_system_flag(out2), Some(true));

        let out3 = "  pkgFlags=[ 0x4000 ]\n";
        assert_eq!(parse_system_flag(out3), Some(false));

        // 无 pkgFlags
        assert_eq!(parse_system_flag("versionName=1.0\n"), None);
    }
}

#[tauri::command]
pub async fn uninstall_app(
    device_id: String,
    package: String,
    keep_data: bool,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = if keep_data {
            format!("pm uninstall -k {}", package)
        } else {
            format!("pm uninstall {}", package)
        };
        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn force_stop_app(device_id: String, package: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = format!("am force-stop {}", package);
        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn clear_app_data(device_id: String, package: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = format!("pm clear {}", package);
        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn freeze_app(device_id: String, package: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = format!("pm disable-user --user 0 {}", package);
        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn unfreeze_app(device_id: String, package: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let cmd = format!("pm enable {}", package);
        let (stdout, stderr, exit_code) = execute_shell_command(&mut device, &cmd)?;
        Ok(AdbResult {
            stdout,
            stderr,
            exit_code: exit_code_or_default(exit_code),
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn extract_apk(
    device_id: String,
    package: String,
    save_path: String,
) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // 获取 APK 路径
        let (stdout, _, _) = execute_shell_command(
            &mut device,
            &format!("pm path {}", package),
        )?;

        let apk_remote_path = stdout
            .lines()
            .find_map(|line| {
                let line = line.trim();
                if line.starts_with("package:") {
                    Some(line[8..].to_string())
                } else {
                    None
                }
            })
            .ok_or_else(|| format!("Failed to get APK path for {}", package))?;

        // 拉取文件到本地
        let mut output_file = std::fs::File::create(&save_path)
            .map_err(|e| format!("Failed to create file {}: {}", save_path, e))?;

        device
            .pull(&apk_remote_path.as_str(), &mut output_file)
            .map_err(|e| format!("Failed to pull APK: {}", e))?;

        Ok(AdbResult {
            stdout: format!("APK extracted to {}", save_path),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn install_apk(device_id: String, local_path: String) -> Result<AdbResult, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);
        let path = Path::new(&local_path);

        device
            .install(&path, None)
            .map_err(|e| format!("Failed to install APK: {}", e))?;

        Ok(AdbResult {
            stdout: format!("APK installed successfully: {}", local_path),
            stderr: String::new(),
            exit_code: 0,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
