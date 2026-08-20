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
