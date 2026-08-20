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
