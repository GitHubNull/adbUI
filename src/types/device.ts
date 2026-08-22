export type DeviceStatus = 'Online' | 'Offline' | 'Unauthorized' | 'Unknown';

export interface DeviceInfo {
  id: string;
  model: string;
  status: DeviceStatus;
  connection: string;
}

export interface AdbResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface DeviceDetail {
  id: string;
  model: string;
  brand: string;
  android_version: string;
  sdk_version: string;
  build_number: string;
  product: string;
  device: string;
  battery_level: number | null;
}

// ============================================
// 应用管理
// ============================================

export interface AppInfo {
  package_name: string;
  app_name: string;
  version_name: string;
  version_code: string;
  is_system: boolean;
  is_enabled: boolean;
  apk_path: string;
}

export type AppFilter = 'all' | 'user' | 'system';

// ============================================
// 文件管理
// ============================================

export interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  permissions: string;
  modified_time: string;
}

// ============================================
// 任务框架
// ============================================

export type TaskStatus = 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';

export interface TaskResult {
  item: string;
  success: boolean;
  message: string;
}

export interface TaskInfo {
  id: string;
  name: string;
  status: TaskStatus;
  progress: number;
  total: number;
  completed: number;
  message: string;
  results: TaskResult[];
  created_at: string;
}

// ============================================
// M2 玩机核心
// ============================================

/** 显示状态（分辨率 / 密度 / 过扫描） */
export interface DisplayState {
  size: string;           // 如 "1344x2992"
  default_size: string;   // 出厂分辨率
  density: number;        // dpi
  default_density: number; // 出厂密度
  overscan: [number, number, number, number]; // [left, top, right, bottom]
}

/** 电池状态（temperature 单位 0.1°C，350 表示 35.0°C） */
export interface BatteryState {
  level: number;        // 电量百分比 0-100
  temperature: number;  // 温度，单位 0.1°C
  status: number;       // 2=充电中 3=未充电 4=不充电 5=已充满
  simulating: boolean;  // 是否处于模拟状态
}

/** 重启模式 */
export type RebootMode = 'system' | 'recovery' | 'bootloader' | 'fastboot';

/** 设备信息报告（getprop + dumpsys 聚合） */
export interface DeviceReport {
  model: string;
  brand: string;
  android_version: string;
  sdk_version: string;
  build_number: string;
  product: string;
  device: string;
  cpu_abi: string;
  serial: string;
  battery: BatteryState | null;
  display: DisplayState | null;
}

/** 脚本执行进度事件负载 */
export interface ScriptProgress {
  line_no: number;
  index: number;
  total: number;
  status: 'running' | 'done' | 'error' | 'stopped';
  message: string;
}

/** 常用命令模板 */
export interface CommandTemplate {
  id: string;
  name: string;
  command: string;
  category: string;
  description?: string;
  builtin?: boolean;   // 内置命令不可删除
  favorite?: boolean;  // 收藏星标
}

// ============================================
// 日志查看
// ============================================

/** 日志级别 */
export type LogLevel = 'V' | 'D' | 'I' | 'W' | 'E' | 'F';

/** 解析后的单条日志 */
export interface LogEntry {
  time: string;
  pid: number;
  tid: number;
  level: LogLevel;
  tag: string;
  message: string;
  raw: string; // 原始行文本
}

// ============================================
// Shell 终端
// ============================================

/** 终端行类型 */
export type TerminalLineType = 'command' | 'output' | 'error' | 'info';

/** 终端单行记录 */
export interface TerminalLine {
  type: TerminalLineType;
  text: string;
  timestamp: number;
}

// ============================================
// 截图录屏
// ============================================

/** 截图结果（base64 编码 PNG） */
export interface ScreenshotResult {
  /** base64 编码的 PNG 数据 */
  data: string;
  width: number;
  height: number;
}

/** 录屏状态 */
export interface RecordState {
  recording: boolean;
  /** 录制开始时间戳（秒） */
  start_time: number | null;
  /** 设备端文件路径 */
  device_path: string | null;
}

// ============================================
// 性能监控
// ============================================

/** 单个进程信息 */
export interface ProcessInfo {
  pid: number;
  user: string;
  cpu_percent: number;
  memory_kb: number;
  name: string;
}

/** 性能数据快照 */
export interface PerformanceData {
  cpu_usage: number;       // CPU 使用率百分比
  memory_used: number;     // 已用内存 KB
  memory_total: number;    // 总内存 KB
  temperature: number;     // 温度 °C
  processes: ProcessInfo[];
}

// ============================================
// 命令历史
// ============================================

/** 命令历史记录条目 */
export interface CommandHistoryEntry {
  command: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  timestamp: string;
  device_id: string;
}

// ============================================
// 网络设备扫描
// ============================================

/** mDNS 发现的网络设备 */
export interface NetworkDevice {
  ip: string;
  port: number;
  fullname: string;
}

// ============================================
// 扫码配对连接
// ============================================

/** 二维码配对信息 */
export interface QrPairingInfo {
  /** 二维码内容（WIFI:T:ADB;S:xxx;P:xxx;;） */
  qr_data: string;
  /** PNG 图片的 base64 编码 */
  qr_image_base64: string;
  /** mDNS 服务名 */
  service_name: string;
  /** 配对码 */
  password: string;
}
