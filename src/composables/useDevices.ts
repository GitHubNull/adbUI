import { ref, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { DeviceInfo, DeviceDetail, AdbResult } from '../types/device';

const POLLING_INTERVAL = 3000; // 3 seconds

// Detect if running inside Tauri
function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

// Mock data for browser development
const MOCK_DEVICES: DeviceInfo[] = [
  {
    id: 'ba1c7715',
    model: 'PHB110',
    status: 'Online',
    connection: 'USB',
  },
];

const MOCK_DEVICE_DETAIL: DeviceDetail = {
  id: 'ba1c7715',
  model: 'PHB110',
  brand: 'OnePlus',
  android_version: '16',
  sdk_version: '36',
  build_number: 'PHB110_16.0.2.400(CN01)',
  product: 'PHB110',
  device: 'OP591BL1',
  battery_level: 33,
};

export function useDevices() {
  const devices = ref<DeviceInfo[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedDevice = ref<DeviceInfo | null>(null);
  const deviceDetail = ref<DeviceDetail | null>(null);
  const detailLoading = ref(false);

  let pollingTimer: ReturnType<typeof setInterval> | null = null;

  async function fetchDevices() {
    loading.value = true;
    error.value = null;
    try {
      let result: DeviceInfo[];
      if (isTauri()) {
        result = await invoke<DeviceInfo[]>('list_devices');
      } else {
        // Browser mock mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        result = MOCK_DEVICES;
      }
      devices.value = result;

      // If selected device is no longer in list, clear selection
      if (selectedDevice.value) {
        const stillExists = result.find((d) => d.id === selectedDevice.value!.id);
        if (!stillExists) {
          selectedDevice.value = null;
          deviceDetail.value = null;
        }
      }
    } catch (err) {
      error.value = String(err);
      console.error('Failed to fetch devices:', err);
    } finally {
      loading.value = false;
    }
  }

  function startPolling() {
    if (pollingTimer) return;
    fetchDevices(); // Immediate first fetch
    pollingTimer = setInterval(fetchDevices, POLLING_INTERVAL);
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  async function refreshDevices() {
    await fetchDevices();
  }

  async function selectDevice(device: DeviceInfo) {
    selectedDevice.value = device;
    detailLoading.value = true;
    try {
      let detail: DeviceDetail;
      if (isTauri()) {
        detail = await invoke<DeviceDetail>('get_device_detail', {
          deviceId: device.id,
        });
      } else {
        // Browser mock mode
        await new Promise((resolve) => setTimeout(resolve, 300));
        detail = { ...MOCK_DEVICE_DETAIL, id: device.id };
      }
      deviceDetail.value = detail;
    } catch (err) {
      console.error('Failed to get device detail:', err);
      deviceDetail.value = null;
    } finally {
      detailLoading.value = false;
    }
  }

  async function executeAdbCommand(
    command: string,
    deviceId?: string
  ): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('execute_adb', {
        command,
        deviceId: deviceId || selectedDevice.value?.id || null,
      });
    } else {
      // Browser mock mode
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        stdout: `(Mock) Command executed: ${command}`,
        stderr: '',
        exit_code: 0,
      };
    }
  }

  onMounted(() => {
    startPolling();
  });

  onUnmounted(() => {
    stopPolling();
  });

  return {
    devices,
    loading,
    error,
    selectedDevice,
    deviceDetail,
    detailLoading,
    fetchDevices,
    startPolling,
    stopPolling,
    refreshDevices,
    selectDevice,
    executeAdbCommand,
  };
}
