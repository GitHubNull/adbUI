import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { DisplayState, AdbResult } from '../types/device';

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

const MOCK_DISPLAY: DisplayState = {
  size: '1344x2992',
  default_size: '1344x2992',
  density: 480,
  default_density: 480,
  overscan: [0, 0, 0, 0],
};

export function useDisplay() {
  const display = ref<DisplayState | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ============================================
  // 读取显示状态
  // ============================================

  async function fetchDisplayState(deviceId: string): Promise<DisplayState | null> {
    loading.value = true;
    error.value = null;
    try {
      if (isTauri()) {
        display.value = await invoke<DisplayState>('get_display_state', { deviceId });
      } else {
        await new Promise((r) => setTimeout(r, 300));
        display.value = { ...MOCK_DISPLAY };
      }
      return display.value;
    } catch (err) {
      error.value = String(err);
      console.error('Failed to get display state:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // 设置显示参数（分辨率 / 密度 / 过扫描）
  // ============================================

  async function setDisplay(
    deviceId: string,
    opts: { size?: string; density?: number; overscan?: [number, number, number, number] }
  ): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('set_display', {
        deviceId,
        size: opts.size ?? null,
        density: opts.density ?? null,
        overscan: opts.overscan ?? null,
      });
    }
    // Mock 模式：更新本地状态
    await new Promise((r) => setTimeout(r, 300));
    if (display.value) {
      if (opts.size) display.value.size = opts.size;
      if (opts.density !== undefined) display.value.density = opts.density;
      if (opts.overscan) display.value.overscan = opts.overscan;
    }
    return { stdout: '(Mock) 显示参数已设置', stderr: '', exit_code: 0 };
  }

  // ============================================
  // 恢复显示默认值
  // ============================================

  async function resetDisplay(deviceId: string): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('reset_display', { deviceId });
    }
    await new Promise((r) => setTimeout(r, 300));
    if (display.value) {
      display.value.size = display.value.default_size;
      display.value.density = display.value.default_density;
      display.value.overscan = [0, 0, 0, 0];
    }
    return { stdout: '(Mock) 已恢复显示默认值', stderr: '', exit_code: 0 };
  }

  // ============================================
  // 设置系统参数（动画 / 字体 / 锁屏）
  // ============================================

  async function setSystemParam(
    deviceId: string,
    namespace: string,
    key: string,
    value: string
  ): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('set_system_param', { deviceId, namespace, key, value });
    }
    await new Promise((r) => setTimeout(r, 200));
    return { stdout: `(Mock) settings put ${namespace} ${key} ${value}`, stderr: '', exit_code: 0 };
  }

  return {
    display,
    loading,
    error,
    fetchDisplayState,
    setDisplay,
    resetDisplay,
    setSystemParam,
  };
}
