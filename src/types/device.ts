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
