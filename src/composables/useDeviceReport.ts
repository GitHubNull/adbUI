import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { DeviceReport } from '../types/device';

// ============================================
// 环境检测
// ============================================

function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

// ============================================
// Mock 数据
// ============================================

const MOCK_REPORT: DeviceReport = {
  model: 'PHB110',
  brand: 'OnePlus',
  android_version: '16',
  sdk_version: '36',
  build_number: 'PHB110_16.0.2.400(CN01)',
  product: 'PHB110',
  device: 'OP591BL1',
  cpu_abi: 'arm64-v8a',
  serial: 'ba1c7715',
  battery: {
    level: 33,
    temperature: 350,
    status: 2,
    simulating: false,
    health: 2,
    voltage: 4231,
    technology: 'Li-ion',
  },
  display: {
    size: '1344x2992',
    default_size: '1344x2992',
    density: 480,
    default_density: 480,
    overscan: [0, 0, 0, 0],
  },
  hardware: {
    cpu_hardware: 'qcom',
    cpu_cores: 8,
    cpu_abi: 'arm64-v8a',
    memory_total_kb: 12103904,
    memory_available_kb: 8523456,
    storage_total_kb: 251658240,
    storage_available_kb: 198765432,
  },
  network: {
    interface: 'wlan0',
    ip_address: '192.168.1.100',
    mac_address: 'a1:b2:c3:d4:e5:f6',
    connection_type: 'usb',
  },
};

export function useDeviceReport() {
  const report = ref<DeviceReport | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchReport(deviceId: string): Promise<DeviceReport | null> {
    loading.value = true;
    error.value = null;
    try {
      if (isTauri()) {
        report.value = await invoke<DeviceReport>('get_device_report', { deviceId });
      } else {
        await new Promise((r) => setTimeout(r, 500));
        report.value = { ...MOCK_REPORT, serial: deviceId };
      }
      return report.value;
    } catch (err) {
      error.value = String(err);
      console.error('Failed to get device report:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    report,
    loading,
    error,
    fetchReport,
  };
}
