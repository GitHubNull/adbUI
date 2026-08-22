import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import type { ScreenshotResult, RecordState } from '../types/device';

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

// 1x1 像素不透明蓝色 PNG 的 base64（拉伸后为纯色块，便于浏览器模式验证预览效果）
const MOCK_SCREENSHOT: ScreenshotResult = {
  data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOwbvr2HwAFYgKzn+LXXwAAAABJRU5ErkJggg==',
  width: 1080,
  height: 2400,
};

export function useScreenshot() {
  const screenshot = ref<ScreenshotResult | null>(null);
  const loading = ref(false);
  const recordState = ref<RecordState>({
    recording: false,
    start_time: null,
    device_path: null,
  });
  const recordElapsed = ref(0);
  const recordSupported = ref<boolean | null>(null); // null=未检测, true=支持, false=不支持
  let recordTimer: ReturnType<typeof setInterval> | null = null;

  // ============================================
  // 截图
  // ============================================

  async function takeScreenshot(deviceId: string): Promise<ScreenshotResult | null> {
    loading.value = true;
    try {
      let result: ScreenshotResult;
      if (isTauri()) {
        result = await invoke<ScreenshotResult>('take_screenshot', { deviceId });
      } else {
        await new Promise((r) => setTimeout(r, 500));
        result = MOCK_SCREENSHOT;
      }
      screenshot.value = result;
      return result;
    } catch (err) {
      console.error('Failed to take screenshot:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // 保存截图
  // ============================================

  async function saveScreenshot(deviceId: string): Promise<string | null> {
    try {
      if (isTauri()) {
        const path = await save({
          defaultPath: `screenshot_${Date.now()}.png`,
          filters: [{ name: 'PNG', extensions: ['png'] }],
        });
        if (!path) return null;

        await invoke('save_screenshot', { deviceId, savePath: path });
        return path;
      } else {
        // Mock: 模拟保存
        await new Promise((r) => setTimeout(r, 300));
        return `/mock/path/screenshot_${Date.now()}.png`;
      }
    } catch (err) {
      console.error('Failed to save screenshot:', err);
      return null;
    }
  }

  // ============================================
  // 录屏支持检测
  // ============================================

  async function checkRecordSupport(deviceId: string): Promise<boolean> {
    if (!isTauri()) {
      // Mock 模式默认支持
      recordSupported.value = true;
      return true;
    }

    try {
      const supported = await invoke<boolean>('check_screen_record_support', { deviceId });
      recordSupported.value = supported;
      return supported;
    } catch (err) {
      console.error('Failed to check record support:', err);
      recordSupported.value = false;
      return false;
    }
  }

  // ============================================
  // 录屏
  // ============================================

  async function startRecord(deviceId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      if (isTauri()) {
        const state = await invoke<RecordState>('start_screen_record', { deviceId });
        recordState.value = state;
      } else {
        await new Promise((r) => setTimeout(r, 300));
        recordState.value = {
          recording: true,
          start_time: Math.floor(Date.now() / 1000),
          device_path: '/sdcard/screenrecord_mock.mp4',
        };
      }

      // 开始计时
      recordElapsed.value = 0;
      recordTimer = setInterval(() => {
        recordElapsed.value++;
      }, 1000);

      return { success: true, error: null };
    } catch (err) {
      console.error('Failed to start recording:', err);
      return { success: false, error: String(err) };
    }
  }

  async function stopRecord(deviceId: string): Promise<{ path: string | null; error: string | null }> {
    if (recordTimer) {
      clearInterval(recordTimer);
      recordTimer = null;
    }

    try {
      if (isTauri()) {
        const devicePath = recordState.value.device_path;
        if (!devicePath) {
          return { path: null, error: '录屏状态异常：设备路径为空' };
        }

        const localPath = await save({
          defaultPath: `screenrecord_${Date.now()}.mp4`,
          filters: [{ name: 'MP4', extensions: ['mp4'] }],
        });
        if (!localPath) {
          // 用户取消了保存对话框，仍需停止录屏
          await invoke('stop_screen_record', {
            deviceId,
            devicePath,
            localPath: '/tmp/cancelled.mp4', // 临时路径，仅用于触发停止
          }).catch(() => {}); // 忽略错误，因为用户已取消
          recordState.value = { recording: false, start_time: null, device_path: null };
          return { path: null, error: null };
        }

        await invoke('stop_screen_record', {
          deviceId,
          devicePath,
          localPath,
        });

        recordState.value = { recording: false, start_time: null, device_path: null };
        return { path: localPath, error: null };
      } else {
        await new Promise((r) => setTimeout(r, 300));
        recordState.value = { recording: false, start_time: null, device_path: null };
        return { path: `/mock/path/screenrecord_${Date.now()}.mp4`, error: null };
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      recordState.value = { recording: false, start_time: null, device_path: null };
      return { path: null, error: String(err) };
    }
  }

  // ============================================
  // 工具函数
  // ============================================

  function formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return {
    screenshot,
    loading,
    recordState,
    recordElapsed,
    recordSupported,
    takeScreenshot,
    saveScreenshot,
    checkRecordSupport,
    startRecord,
    stopRecord,
    formatElapsed,
  };
}
