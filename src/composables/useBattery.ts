import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { BatteryState, AdbResult } from '../types/device';
import { useAppStatus } from './useAppStatus';

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

const MOCK_BATTERY: BatteryState = {
  level: 33,
  temperature: 350,
  status: 2,
  simulating: false,
};

export function useBattery() {
  const battery = ref<BatteryState | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const simulating = ref(false);

  // ============================================
  // 读取电池状态
  // ============================================

  const { beginRefresh, endRefresh } = useAppStatus();

  async function fetchBatteryState(deviceId: string): Promise<BatteryState | null> {
    loading.value = true;
    error.value = null;
    beginRefresh();
    try {
      if (isTauri()) {
        battery.value = await invoke<BatteryState>('get_battery_state', { deviceId });
      } else {
        await new Promise((r) => setTimeout(r, 300));
        battery.value = { ...MOCK_BATTERY };
      }
      return battery.value;
    } catch (err) {
      error.value = String(err);
      console.error('Failed to get battery state:', err);
      return null;
    } finally {
      loading.value = false;
      endRefresh();
    }
  }

  // ============================================
  // 电池模拟（电量 / 温度 / 充电状态）
  // ============================================

  async function simulate(
    deviceId: string,
    opts: { level?: number; temperature?: number; status?: number }
  ): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('battery_simulate', {
        deviceId,
        level: opts.level ?? null,
        temperature: opts.temperature ?? null,
        status: opts.status ?? null,
      });
    }
    // Mock 模式：更新本地状态
    await new Promise((r) => setTimeout(r, 200));
    if (battery.value) {
      if (opts.level !== undefined) battery.value.level = opts.level;
      if (opts.temperature !== undefined) battery.value.temperature = opts.temperature;
      if (opts.status !== undefined) battery.value.status = opts.status;
      battery.value.simulating = true;
    }
    simulating.value = true;
    return { stdout: '(Mock) 电池模拟已应用', stderr: '', exit_code: 0 };
  }

  // ============================================
  // 一键还原真实电池状态
  // ============================================

  async function resetBattery(deviceId: string): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('battery_reset', { deviceId });
    }
    await new Promise((r) => setTimeout(r, 300));
    if (battery.value) {
      battery.value = { ...MOCK_BATTERY, simulating: false };
    }
    simulating.value = false;
    return { stdout: '(Mock) 已还原真实电池状态', stderr: '', exit_code: 0 };
  }

  return {
    battery,
    loading,
    error,
    simulating,
    fetchBatteryState,
    simulate,
    resetBattery,
  };
}
