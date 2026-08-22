import { ref, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { DeviceInfo, DeviceDetail, AdbResult, NetworkDevice, QrPairingInfo } from '../types/device';

const POLLING_INTERVAL = 5000; // 5 seconds

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
  const isConnecting = ref(false);
  const isScanning = ref(false);
  const isPairing = ref(false);
  const pairingQrInfo = ref<QrPairingInfo | null>(null);

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
    pollingTimer = setInterval(() => {
      // 页面隐藏时暂停轮询
      if (document.visibilityState === 'visible') {
        fetchDevices();
      }
    }, POLLING_INTERVAL);
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

  async function connectDevice(ip: string, port: number): Promise<void> {
    isConnecting.value = true;
    try {
      if (isTauri()) {
        await invoke('connect_device', { ip, port });
      } else {
        // Browser mock mode
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log(`(Mock) Connected to ${ip}:${port}`);
      }
    } finally {
      isConnecting.value = false;
    }
  }

  async function disconnectDevice(ip: string, port: number): Promise<void> {
    if (isTauri()) {
      await invoke('disconnect_device', { ip, port });
    } else {
      // Browser mock mode
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log(`(Mock) Disconnected from ${ip}:${port}`);
    }
  }

  async function scanNetworkDevices(): Promise<NetworkDevice[]> {
    isScanning.value = true;
    try {
      if (isTauri()) {
        return await invoke<NetworkDevice[]>('scan_network_devices');
      } else {
        // Browser mock mode
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return [
          { ip: '192.168.1.100', port: 5555, fullname: 'mock-device-1._adb-tls-connect._tcp.local.' },
          { ip: '192.168.1.101', port: 5555, fullname: 'mock-device-2._adb-tls-connect._tcp.local.' },
        ];
      }
    } finally {
      isScanning.value = false;
    }
  }

  // ============================================
  // 扫码配对连接
  // ============================================

  async function generatePairingQr(): Promise<QrPairingInfo> {
    if (isTauri()) {
      const info = await invoke<QrPairingInfo>('generate_pairing_qr');
      pairingQrInfo.value = info;
      return info;
    } else {
      // Browser mock mode
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockInfo: QrPairingInfo = {
        qr_data: 'WIFI:T:ADB;S:adbui-mock1234;P:mockpass12;;',
        qr_image_base64: 'PHN2ZyB2aWV3Qm94PSIwIDAgMjU2IDI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==',
        service_name: 'adbui-mock1234',
        password: 'mockpass12',
      };
      pairingQrInfo.value = mockInfo;
      return mockInfo;
    }
  }

  async function waitAndPairDevice(serviceName: string, password: string, timeoutSecs?: number): Promise<string> {
    isPairing.value = true;
    try {
      if (isTauri()) {
        return await invoke<string>('wait_and_pair_device', {
          serviceName,
          password,
          timeoutSecs: timeoutSecs || 120,
        });
      } else {
        // Browser mock mode
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return '192.168.1.100:5555';
      }
    } finally {
      isPairing.value = false;
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
    isConnecting,
    isScanning,
    isPairing,
    pairingQrInfo,
    fetchDevices,
    startPolling,
    stopPolling,
    refreshDevices,
    selectDevice,
    executeAdbCommand,
    connectDevice,
    disconnectDevice,
    scanNetworkDevices,
    generatePairingQr,
    waitAndPairDevice,
  };
}
