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
  battery: { level: 33, temperature: 350, status: 2, simulating: false },
  display: {
    size: '1344x2992',
    default_size: '1344x2992',
    density: 480,
    default_density: 480,
    overscan: [0, 0, 0, 0],
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

  /** 导出报告为 JSON 文本 */
  function exportReport(): string {
    return JSON.stringify(report.value, null, 2);
  }

  return {
    report,
    loading,
    error,
    fetchReport,
    exportReport,
  };
}
