use adb_client::server_device::ADBServerDevice;
use serde::Serialize;

use super::helpers::*;

// ============================================
// 性能监控
// ============================================

/// 单个进程信息
#[derive(Serialize, Clone, Debug)]
pub struct ProcessInfo {
    pub pid: u32,
    pub user: String,
    pub cpu_percent: f32,
    pub memory_kb: u64,
    pub name: String,
}

/// 性能数据快照
#[derive(Serialize)]
pub struct PerformanceData {
    pub cpu_usage: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub temperature: f32,
    pub processes: Vec<ProcessInfo>,
}

/// 获取设备性能数据
#[tauri::command]
pub async fn get_performance_data(device_id: String) -> Result<PerformanceData, String> {
    tokio::task::spawn_blocking(move || {
        let mut device = ADBServerDevice::new(device_id, None);

        // CPU 使用率：解析 top -n 1 -b 第一行
        let cpu_usage = execute_shell_command(&mut device, "top -n 1 -b")
            .ok()
            .and_then(|(out, _, _)| parse_cpu_usage(&out))
            .unwrap_or(0.0);

        // 内存：解析 /proc/meminfo
        let (memory_used, memory_total) = execute_shell_command(&mut device, "cat /proc/meminfo")
            .ok()
            .and_then(|(out, _, _)| parse_meminfo(&out))
            .unwrap_or((0, 0));

        // 温度：dumpsys battery
        let temperature = execute_shell_command(&mut device, "dumpsys battery")
            .ok()
            .and_then(|(out, _, _)| {
                for line in out.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with("temperature:") {
                        let val = trimmed[12..].trim();
                        if let Ok(t) = val.parse::<f32>() {
                            return Some(t / 10.0); // 0.1°C -> °C
                        }
                    }
                }
                None
            })
            .unwrap_or(0.0);

        // 进程列表：top -n 1 -b
        let processes = execute_shell_command(&mut device, "top -n 1 -b")
            .ok()
            .map(|(out, _, _)| parse_process_list(&out))
            .unwrap_or_default();

        Ok(PerformanceData {
            cpu_usage,
            memory_used,
            memory_total,
            temperature,
            processes,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// 从 top 输出解析 CPU 使用率
fn parse_cpu_usage(output: &str) -> Option<f32> {
    // Android top 格式: "800%cpu 14%user 0%nice 31%sys 745%idle 0%iow 7%irq 3%sirq 0%host"
    // 或单核: "Cpu(s):  5.0%us,  3.0%sy, 91.0%id, ..."
    // 旧格式: "User 12%, System 8%, IOW 0%, IRQ 0%"
    for line in output.lines() {
        // 尝试 Android 多核/单核格式
        if line.contains("%cpu") || line.starts_with("Cpu(s):") {
            // 提取 idle 百分比
            if let Some(idle_pos) = line.find("idle") {
                let before_idle = &line[..idle_pos];
                // 从 idle 前面找最近的数字+%
                let num_pct = before_idle
                    .split_whitespace()
                    .last()
                    .and_then(|s| s.strip_suffix('%'));
                if let Some(num_str) = num_pct {
                    if let Ok(idle) = num_str.parse::<f32>() {
                        // 多核格式中 total 可能 >100，但 idle 也是同比例
                        // 例如 800%cpu 745%idle → 使用率 = (800-745)/800*100 = 6.875%
                        // 等价于 100% - 745%*(100/800) = 100-93.125=6.875
                        // 简化：若行首有 "NNN%cpu"，则 total=NNN，否则 total=100
                        let total = line
                            .split_whitespace()
                            .next()
                            .and_then(|s| s.strip_suffix("%cpu"))
                            .and_then(|s| s.parse::<f32>().ok())
                            .unwrap_or(100.0);
                        if total > 0.0 {
                            return Some(((total - idle) / total) * 100.0);
                        }
                    }
                }
            }
            // 回退：找 %id 或类似标记
            if let Some(id_pos) = line.find("%id") {
                let before = &line[..id_pos];
                let num_str = before
                    .rsplit(|c: char| c.is_whitespace() || c == ',')
                    .next()
                    .unwrap_or("")
                    .trim();
                if let Ok(idle) = num_str.parse::<f32>() {
                    return Some(100.0 - idle);
                }
            }
        }

        // 旧格式: "User 12%, System 8%, IOW 0%, IRQ 0%"
        if line.contains("User") && line.contains("System") {
            let mut total = 0.0f32;
            for part in line.split(',') {
                let part = part.trim();
                if let Some(pct_pos) = part.find('%') {
                    let num_str = part[..pct_pos]
                        .rsplit(|c: char| c.is_alphabetic() || c == ' ')
                        .next()?;
                    if let Ok(v) = num_str.trim().parse::<f32>() {
                        total += v;
                    }
                }
            }
            return Some(total);
        }
    }
    None
}

/// 从 /proc/meminfo 解析内存信息，返回 (used_kb, total_kb)
fn parse_meminfo(output: &str) -> Option<(u64, u64)> {
    let mut total = 0u64;
    let mut available = 0u64;

    for line in output.lines() {
        if line.starts_with("MemTotal:") {
            total = line
                .split_whitespace()
                .nth(1)?
                .parse::<u64>()
                .unwrap_or(0);
        } else if line.starts_with("MemAvailable:") {
            available = line
                .split_whitespace()
                .nth(1)?
                .parse::<u64>()
                .unwrap_or(0);
        }
    }

    if total > 0 {
        Some((total - available, total))
    } else {
        None
    }
}

/// 从 top 输出解析进程列表
fn parse_process_list(output: &str) -> Vec<ProcessInfo> {
    let mut processes = Vec::new();
    let mut header_found = false;

    for line in output.lines() {
        if !header_found {
            // 寻找表头行（包含 PID USER 等关键字）
            if line.contains("PID") && line.contains("USER") && line.contains("CPU") {
                header_found = true;
            }
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 9 {
            let pid = parts[0].parse::<u32>().unwrap_or(0);
            if pid == 0 {
                continue;
            }
            let user = parts[1].to_string();
            // CPU% 列位置因版本而异，尝试解析
            let cpu_percent = parts
                .iter()
                .find_map(|p| {
                    if p.ends_with('%') {
                        p.trim_end_matches('%').parse::<f32>().ok()
                    } else {
                        None
                    }
                })
                .unwrap_or(0.0);

            // 内存列（RSS，KB）
            let memory_kb = parts
                .iter()
                .find_map(|p| {
                    if p.ends_with('K') || p.ends_with('k') {
                        p.trim_end_matches(|c| c == 'K' || c == 'k')
                            .parse::<u64>()
                            .ok()
                    } else {
                        None
                    }
                })
                .unwrap_or(0);

            // 进程名是最后一列
            let name = parts.last().unwrap_or(&"").to_string();

            processes.push(ProcessInfo {
                pid,
                user,
                cpu_percent,
                memory_kb,
                name,
            });
        }
    }

    // 按 CPU 使用率降序排列，取前 20 个
    processes.sort_by(|a, b| {
        b.cpu_percent
            .partial_cmp(&a.cpu_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    processes.truncate(20);
    processes
}
