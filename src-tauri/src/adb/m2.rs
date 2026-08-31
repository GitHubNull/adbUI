use serde::Serialize;

// ============================================
// M2 玩机核心：数据模型
// ============================================

/// 显示状态（分辨率 / 密度 / 过扫描）
#[derive(Serialize, Clone, Debug)]
pub struct DisplayState {
    pub size: String,          // 如 "1344x2992"
    pub default_size: String,  // 出厂分辨率
    pub density: i32,          // dpi
    pub default_density: i32,  // 出厂密度
    pub overscan: [i32; 4],    // [left, top, right, bottom]
}

/// 电池状态（temperature 已归一化为 0.1°C 单位的整数值）
#[derive(Serialize, Clone, Debug)]
pub struct BatteryState {
    pub level: i32,        // 电量百分比 0-100
    pub temperature: i32,  // 温度，单位 0.1°C（350 表示 35.0°C）
    pub status: i32,       // 2=充电中 3=未充电 4=不充电 5=已充满
    pub simulating: bool,  // 是否处于模拟状态
    pub health: Option<i32>,       // 健康度 1=未知 2=良好 3=过热 ...
    pub voltage: Option<i32>,      // 电压，单位 mV
    pub technology: Option<String>, // 电池技术（如 Li-ion）
}

/// 硬件信息（CPU / 内存 / 存储）
#[derive(Serialize, Clone, Debug)]
pub struct HardwareInfo {
    pub cpu_hardware: String,       // 硬件平台（ro.hardware）
    pub cpu_cores: i32,             // CPU 核心数
    pub cpu_abi: String,            // CPU ABI
    pub memory_total_kb: i64,       // 总内存（KB）
    pub memory_available_kb: i64,   // 可用内存（KB）
    pub storage_total_kb: i64,      // /data 存储总量（KB）
    pub storage_available_kb: i64,  // /data 存储可用（KB）
}

/// 网络信息（设备端接口 / IP / MAC）
#[derive(Serialize, Clone, Debug)]
pub struct NetworkInfo {
    pub interface: String,              // 接口名（如 wlan0）
    pub ip_address: Option<String>,     // IPv4 地址
    pub mac_address: Option<String>,    // MAC 地址
    pub connection_type: String,        // "usb" 或 "wifi"（按 device_id 是否含 ":" 判断）
}

/// 设备信息报告（getprop + dumpsys 聚合）
#[derive(Serialize, Clone, Debug)]
pub struct DeviceReport {
    pub model: String,
    pub brand: String,
    pub android_version: String,
    pub sdk_version: String,
    pub build_number: String,
    pub product: String,
    pub device: String,
    pub cpu_abi: String,
    pub serial: String,
    pub battery: Option<BatteryState>,
    pub display: Option<DisplayState>,
    pub hardware: Option<HardwareInfo>,
    pub network: Option<NetworkInfo>,
}

// ============================================
// M2 玩机核心：输出解析纯函数（便于单测）
// ============================================

/// 解析 `wm size` 输出，如 "Physical size: 1344x2992"
pub(crate) fn parse_wm_size(output: &str) -> Option<String> {
    for line in output.lines() {
        let t = line.trim();
        if let Some(idx) = t.find("Physical size:") {
            let v = t[idx + 14..].trim();
            if !v.is_empty() {
                return Some(v.to_string());
            }
        }
    }
    None
}

/// 解析 `wm density` 输出，如 "Physical density: 480"
pub(crate) fn parse_wm_density(output: &str) -> Option<i32> {
    for line in output.lines() {
        let t = line.trim();
        if let Some(idx) = t.find("Physical density:") {
            let v = t[idx + 17..].trim();
            if let Ok(n) = v.parse::<i32>() {
                return Some(n);
            }
        }
    }
    None
}

/// 解析 `wm overscan` 输出，如 "0,0,0,0" 或含 "overscan 0,0,0,0"
pub(crate) fn parse_overscan(output: &str) -> Option<[i32; 4]> {
    for line in output.lines() {
        let t = line.trim();
        // 在整行中查找形如 "l,t,r,b" 的四元组片段
        for token in t.split_whitespace() {
            let parts: Vec<&str> = token.split(',').collect();
            if parts.len() == 4 {
                let mut vals = [0i32; 4];
                let mut ok = true;
                for (i, p) in parts.iter().enumerate() {
                    match p.trim().parse::<i32>() {
                        Ok(n) => vals[i] = n,
                        Err(_) => {
                            ok = false;
                            break;
                        }
                    }
                }
                if ok {
                    return Some(vals);
                }
            }
        }
    }
    None
}

/// 解析 `dumpsys battery` 输出，提取 level / temperature / status / health / voltage / technology
pub(crate) fn parse_battery(output: &str) -> Option<BatteryState> {
    let mut level: Option<i32> = None;
    let mut temperature: Option<i32> = None;
    let mut status: Option<i32> = None;
    let mut health: Option<i32> = None;
    let mut voltage: Option<i32> = None;
    let mut technology: Option<String> = None;

    for line in output.lines() {
        let t = line.trim();
        if let Some(v) = t.strip_prefix("level:") {
            level = v.trim().parse::<i32>().ok();
        } else if let Some(v) = t.strip_prefix("temperature:") {
            temperature = v.trim().parse::<i32>().ok();
        } else if let Some(v) = t.strip_prefix("status:") {
            status = v.trim().parse::<i32>().ok();
        } else if let Some(v) = t.strip_prefix("health:") {
            health = v.trim().parse::<i32>().ok();
        } else if let Some(v) = t.strip_prefix("voltage:") {
            voltage = v.trim().parse::<i32>().ok();
        } else if let Some(v) = t.strip_prefix("technology:") {
            let s = v.trim();
            if !s.is_empty() {
                technology = Some(s.to_string());
            }
        }
    }

    match (level, temperature, status) {
        (Some(l), Some(t), Some(s)) => Some(BatteryState {
            level: l,
            temperature: t,
            status: s,
            simulating: false,
            health,
            voltage,
            technology,
        }),
        _ => None,
    }
}

/// 解析 `/proc/cpuinfo` 输出，统计 `processor` 行数得到核心数；无效时返回 0 表示未知
pub(crate) fn parse_cpu_cores(output: &str) -> i32 {
    output
        .lines()
        .filter(|line| line.trim_start().starts_with("processor"))
        .count() as i32
}

/// 解析 `/proc/meminfo` 输出，返回 (MemTotal KB, MemAvailable KB)；缺失项为 0 表示未知
pub(crate) fn parse_meminfo(output: &str) -> (i64, i64) {
    let mut total: i64 = 0;
    let mut available: i64 = 0;
    for line in output.lines() {
        let t = line.trim();
        let target = if t.starts_with("MemTotal:") {
            &mut total
        } else if t.starts_with("MemAvailable:") {
            &mut available
        } else {
            continue;
        };
        // 值形如 "11793780 kB"
        if let Some(num) = t.split_whitespace().nth(1) {
            if let Ok(n) = num.parse::<i64>() {
                *target = n;
            }
        }
    }
    (total, available)
}

/// 解析 `df -k /data` 输出，返回 (总量 KB, 可用 KB)
/// 输出形如：
/// Filesystem           1K-blocks    Used Available Use% Mounted on
/// /dev/block/...       247658496 ...  ...      ..% /data
pub(crate) fn parse_df_data(output: &str) -> Option<(i64, i64)> {
    for line in output.lines() {
        let t = line.trim();
        let fields: Vec<&str> = t.split_whitespace().collect();
        // 数据行：文件系统 + 5 个数值 + 挂载点，挂载点以 /data 结尾（或整行即数据行）
        if fields.len() >= 6 {
            let mounted = fields[fields.len() - 1];
            if mounted.starts_with("/data") {
                let total = fields[1].parse::<i64>().ok()?;
                let available = fields[3].parse::<i64>().ok()?;
                return Some((total, available));
            }
        }
    }
    None
}

/// 解析 `ip addr show <iface>` 输出，返回 (IPv4 地址, MAC 地址)
/// 输出形如：
/// 12: wlan0: <BROADCAST,...> mtu 1500 ...
///     link/ether a1:b2:c3:d4:e5:f6 brd ...
///     inet 192.168.1.10/24 brd ...
pub(crate) fn parse_ip_addr(output: &str) -> (Option<String>, Option<String>) {
    let mut ip: Option<String> = None;
    let mut mac: Option<String> = None;
    for line in output.lines() {
        let t = line.trim();
        if let Some(v) = t.strip_prefix("inet ") {
            // "192.168.1.10/24 brd ..." 取第一段并去掉掩码
            if let Some(addr) = v.split_whitespace().next() {
                let addr = addr.split('/').next().unwrap_or(addr);
                if addr.contains('.') {
                    ip = Some(addr.to_string());
                }
            }
        } else if let Some(v) = t.strip_prefix("link/ether ") {
            if let Some(addr) = v.split_whitespace().next() {
                mac = Some(addr.to_string());
            }
        }
    }
    (ip, mac)
}

// ============================================
// M2 玩机核心：命令构造纯函数（便于单测）
// ============================================

/// 构造设置分辨率命令
pub(crate) fn build_wm_size_command(size: &str) -> String {
    format!("wm size {}", size)
}

/// 构造设置密度命令
pub(crate) fn build_wm_density_command(density: i32) -> String {
    format!("wm density {}", density)
}

/// 构造设置过扫描命令
pub(crate) fn build_wm_overscan_command(overscan: &[i32; 4]) -> String {
    format!(
        "wm overscan {},{},{},{}",
        overscan[0], overscan[1], overscan[2], overscan[3]
    )
}

/// 构造 settings put 命令
pub(crate) fn build_settings_put_command(namespace: &str, key: &str, value: &str) -> String {
    format!("settings put {} {} {}", namespace, key, value)
}

/// 构造电池模拟命令（set level/temperature/status）
pub(crate) fn build_battery_set_command(field: &str, value: i32) -> String {
    format!("dumpsys battery set {} {}", field, value)
}

/// 构造 input tap 命令
pub(crate) fn build_input_tap_command(x: i32, y: i32) -> String {
    format!("input tap {} {}", x, y)
}

/// 构造 input swipe 命令
pub(crate) fn build_input_swipe_command(x1: i32, y1: i32, x2: i32, y2: i32, duration_ms: i32) -> String {
    format!("input swipe {} {} {} {} {}", x1, y1, x2, y2, duration_ms)
}

/// 构造 input keyevent 命令
pub(crate) fn build_input_keyevent_command(keycode: &str) -> String {
    format!("input keyevent {}", keycode)
}

/// 构造 input text 命令（空格转 %s）
pub(crate) fn build_input_text_command(text: &str) -> String {
    format!("input text {}", text.replace(' ', "%s"))
}

// ============================================
// M2 玩机核心：自动化脚本 DSL 解析器
// ============================================

/// 脚本指令
#[derive(Serialize, Clone, Debug, PartialEq)]
pub enum ScriptAction {
    Tap { x: i32, y: i32 },
    Swipe { x1: i32, y1: i32, x2: i32, y2: i32, duration_ms: i32 },
    Keyevent { keycode: String },
    Text { text: String },
    Sleep { ms: u64 },
}

/// 脚本行（含原始行号，便于报错与进度高亮）
#[derive(Serialize, Clone, Debug)]
pub struct ScriptLine {
    pub line_no: usize,
    pub action: ScriptAction,
}

/// 展开 loop/end 后的扁平指令序列
#[derive(Serialize, Clone, Debug)]
pub struct FlatScript {
    pub lines: Vec<ScriptLine>,
}

const MAX_LOOP_DEPTH: usize = 3;

/// 解析脚本 DSL 文本为扁平指令序列（展开 loop/end）
/// 语法：tap x y / swipe x1 y1 x2 y2 ms / keyevent KEY / text s / sleep ms / loop n / end
/// 支持 # 注释与空行；loop 最多嵌套 3 层；loop/end 必须配对
pub(crate) fn parse_script_lines(script: &str) -> Result<Vec<ScriptLine>, String> {
    // 带循环结构的中间表示
    #[derive(Debug)]
    enum Node {
        Action(usize, ScriptAction),
        Loop(u32, Vec<Node>), // count, body
    }

    // 预处理：去注释、去空行，保留原始行号
    let raw: Vec<(usize, &str)> = script
        .lines()
        .enumerate()
        .filter_map(|(i, l)| {
            let no = i + 1;
            let stripped = match l.find('#') {
                Some(pos) => &l[..pos],
                None => l,
            };
            let t = stripped.trim();
            if t.is_empty() {
                None
            } else {
                Some((no, t))
            }
        })
        .collect();

    // 用显式栈解析：frames 栈底是根，每遇到 loop 压入新帧，end 弹出并入父帧
    struct Frame {
        count: u32,
        start_line: usize,
        body: Vec<Node>,
    }
    let mut stack: Vec<Frame> = vec![Frame {
        count: 1,
        start_line: 0,
        body: Vec::new(),
    }];

    for (line_no, text) in &raw {
        let line_no = *line_no;
        let tokens: Vec<&str> = text.split_whitespace().collect();
        if tokens.is_empty() {
            continue;
        }
        let action: Option<ScriptAction> = match tokens[0] {
            "tap" => {
                if tokens.len() != 3 {
                    return Err(format!("第 {} 行: tap 需要 2 个坐标参数", line_no));
                }
                let x = tokens[1].parse::<i32>().map_err(|_| format!("第 {} 行: tap x 坐标非法", line_no))?;
                let y = tokens[2].parse::<i32>().map_err(|_| format!("第 {} 行: tap y 坐标非法", line_no))?;
                Some(ScriptAction::Tap { x, y })
            }
            "swipe" => {
                if tokens.len() != 6 {
                    return Err(format!("第 {} 行: swipe 需要 5 个参数", line_no));
                }
                let p: Result<Vec<i32>, _> = tokens[1..6].iter().map(|t| t.parse::<i32>()).collect();
                let p = p.map_err(|_| format!("第 {} 行: swipe 参数非法", line_no))?;
                Some(ScriptAction::Swipe {
                    x1: p[0], y1: p[1], x2: p[2], y2: p[3], duration_ms: p[4],
                })
            }
            "keyevent" => {
                if tokens.len() != 2 {
                    return Err(format!("第 {} 行: keyevent 需要 1 个按键名", line_no));
                }
                Some(ScriptAction::Keyevent { keycode: tokens[1].to_string() })
            }
            "text" => {
                if tokens.len() < 2 {
                    return Err(format!("第 {} 行: text 需要文本内容", line_no));
                }
                Some(ScriptAction::Text { text: tokens[1..].join(" ") })
            }
            "sleep" => {
                if tokens.len() != 2 {
                    return Err(format!("第 {} 行: sleep 需要 1 个毫秒参数", line_no));
                }
                let ms = tokens[1].parse::<u64>().map_err(|_| format!("第 {} 行: sleep 毫秒非法", line_no))?;
                Some(ScriptAction::Sleep { ms })
            }
            "loop" => {
                if tokens.len() != 2 {
                    return Err(format!("第 {} 行: loop 需要循环次数", line_no));
                }
                // 栈内除根帧外的帧数即当前嵌套深度
                if stack.len() - 1 >= MAX_LOOP_DEPTH {
                    return Err(format!("第 {} 行: loop 嵌套超过 {} 层", line_no, MAX_LOOP_DEPTH));
                }
                let count = tokens[1].parse::<u32>().map_err(|_| format!("第 {} 行: loop 次数非法", line_no))?;
                stack.push(Frame {
                    count,
                    start_line: line_no,
                    body: Vec::new(),
                });
                None
            }
            "end" => {
                if stack.len() <= 1 {
                    return Err(format!("第 {} 行: end 没有匹配的 loop", line_no));
                }
                let frame = stack.pop().unwrap();
                let node = Node::Loop(frame.count, frame.body);
                stack.last_mut().unwrap().body.push(node);
                None
            }
            other => {
                return Err(format!("第 {} 行: 未知指令 '{}'", line_no, other));
            }
        };
        if let Some(a) = action {
            stack.last_mut().unwrap().body.push(Node::Action(line_no, a));
        }
    }

    if stack.len() > 1 {
        let open = stack.last().unwrap();
        return Err(format!("第 {} 行: loop 缺少匹配的 end", open.start_line));
    }

    let root = stack.pop().unwrap();

    // 展开 loop 为扁平序列
    fn flatten(nodes: &[Node], out: &mut Vec<ScriptLine>) {
        for node in nodes {
            match node {
                Node::Action(line_no, action) => out.push(ScriptLine {
                    line_no: *line_no,
                    action: action.clone(),
                }),
                Node::Loop(count, body) => {
                    for _ in 0..*count {
                        flatten(body, out);
                    }
                }
            }
        }
    }

    let mut flat = Vec::new();
    flatten(&root.body, &mut flat);
    Ok(flat)
}
