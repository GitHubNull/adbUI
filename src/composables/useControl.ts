import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { AdbResult, RebootMode } from '../types/device';

// ============================================
// 环境检测
// ============================================

function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

/** 重启模式定义 */
export interface RebootModeDef {
  id: RebootMode;
  name: string;
  description: string;
  danger: boolean;
}

export const REBOOT_MODES: RebootModeDef[] = [
  { id: 'system', name: '系统重启', description: '普通重启进入系统', danger: false },
  { id: 'recovery', name: 'Recovery', description: '重启进入恢复模式', danger: false },
  { id: 'bootloader', name: 'Bootloader', description: '重启进入引导加载器', danger: false },
  { id: 'fastboot', name: 'Fastboot', description: '重启进入 Fastboot（部分设备支持）', danger: true },
];

/** 常用物理按键 */
export interface KeyDef {
  name: string;
  keycode: string;
}

export const COMMON_KEYS: KeyDef[] = [
  { name: 'Home', keycode: 'KEYCODE_HOME' },
  { name: '返回', keycode: 'KEYCODE_BACK' },
  { name: '最近任务', keycode: 'KEYCODE_APP_SWITCH' },
  { name: '电源', keycode: 'KEYCODE_POWER' },
  { name: '音量+', keycode: 'KEYCODE_VOLUME_UP' },
  { name: '音量-', keycode: 'KEYCODE_VOLUME_DOWN' },
  { name: '静音', keycode: 'KEYCODE_MUTE' },
  { name: '相机', keycode: 'KEYCODE_CAMERA' },
  { name: '菜单', keycode: 'KEYCODE_MENU' },
  { name: '搜索', keycode: 'KEYCODE_SEARCH' },
];

export function useControl() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ============================================
  // 重启设备
  // ============================================

  async function reboot(deviceId: string, mode: RebootMode): Promise<AdbResult> {
    loading.value = true;
    error.value = null;
    try {
      if (isTauri()) {
        return await invoke<AdbResult>('reboot_device', { deviceId, mode });
      }
      await new Promise((r) => setTimeout(r, 500));
      return { stdout: `(Mock) 重启指令已发送 (${mode})`, stderr: '', exit_code: 0 };
    } catch (err) {
      error.value = String(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // 输入模拟
  // ============================================

  async function sendInput(
    deviceId: string,
    opts: {
      action: 'tap' | 'swipe' | 'keyevent' | 'text';
      x?: number;
      y?: number;
      x2?: number;
      y2?: number;
      durationMs?: number;
      keycode?: string;
      text?: string;
    }
  ): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('send_input', {
        deviceId,
        action: opts.action,
        x: opts.x ?? null,
        y: opts.y ?? null,
        x2: opts.x2 ?? null,
        y2: opts.y2 ?? null,
        durationMs: opts.durationMs ?? null,
        keycode: opts.keycode ?? null,
        text: opts.text ?? null,
      });
    }
    await new Promise((r) => setTimeout(r, 200));
    return { stdout: `(Mock) 已发送 input ${opts.action} 指令`, stderr: '', exit_code: 0 };
  }

  // 便捷方法
  async function tap(deviceId: string, x: number, y: number) {
    return sendInput(deviceId, { action: 'tap', x, y });
  }

  async function longPress(deviceId: string, x: number, y: number, durationMs = 500) {
    // 长按 = 起终点相同的 swipe
    return sendInput(deviceId, { action: 'swipe', x, y, x2: x, y2: y, durationMs });
  }

  async function swipe(
    deviceId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    durationMs = 300
  ) {
    return sendInput(deviceId, { action: 'swipe', x: x1, y: y1, x2, y2, durationMs });
  }

  async function keyevent(deviceId: string, keycode: string) {
    return sendInput(deviceId, { action: 'keyevent', keycode });
  }

  async function inputText(deviceId: string, text: string) {
    return sendInput(deviceId, { action: 'text', text });
  }

  return {
    loading,
    error,
    reboot,
    sendInput,
    tap,
    longPress,
    swipe,
    keyevent,
    inputText,
  };
}
