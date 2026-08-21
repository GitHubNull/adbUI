import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { CommandHistoryEntry } from '../types/device';

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

const MOCK_HISTORY: CommandHistoryEntry[] = [
  {
    command: 'adb devices',
    stdout: 'List of devices attached\nemulator-5554\tdevice',
    stderr: '',
    exit_code: 0,
    timestamp: '1720000000',
    device_id: 'emulator-5554',
  },
  {
    command: 'adb shell pm list packages',
    stdout: 'package:com.android.chrome\npackage:com.google.android.gm',
    stderr: '',
    exit_code: 0,
    timestamp: '1720000060',
    device_id: 'emulator-5554',
  },
  {
    command: 'adb shell dumpsys battery',
    stdout: 'Current Battery Service state:\n  level: 78\n  status: 2',
    stderr: '',
    exit_code: 0,
    timestamp: '1720000120',
    device_id: 'emulator-5554',
  },
];

export function useCommandHistory() {
  const entries = ref<CommandHistoryEntry[]>([]);
  const loading = ref(false);
  const searchQuery = ref('');

  // ============================================
  // 获取命令历史
  // ============================================

  async function fetchHistory() {
    loading.value = true;
    try {
      if (isTauri()) {
        entries.value = await invoke<CommandHistoryEntry[]>('get_command_history');
      } else {
        await new Promise((r) => setTimeout(r, 200));
        entries.value = [...MOCK_HISTORY];
      }
    } catch (err) {
      console.error('Failed to fetch command history:', err);
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // 清空历史
  // ============================================

  async function clearHistory() {
    try {
      if (isTauri()) {
        await invoke('clear_command_history');
      }
      entries.value = [];
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }

  // ============================================
  // 重新执行命令
  // ============================================

  async function rerunCommand(
    command: string,
    deviceId?: string
  ): Promise<{ stdout: string; stderr: string; exit_code: number }> {
    if (isTauri()) {
      return await invoke('execute_adb', {
        command,
        deviceId: deviceId || null,
      });
    } else {
      await new Promise((r) => setTimeout(r, 300));
      return {
        stdout: `(Mock) ${command}`,
        stderr: '',
        exit_code: 0,
      };
    }
  }

  // ============================================
  // 过滤
  // ============================================

  function filteredEntries(): CommandHistoryEntry[] {
    if (!searchQuery.value) return entries.value;
    const q = searchQuery.value.toLowerCase();
    return entries.value.filter(
      (e) =>
        e.command.toLowerCase().includes(q) ||
        e.stdout.toLowerCase().includes(q)
    );
  }

  // ============================================
  // 格式化时间
  // ============================================

  function formatTime(timestamp: string): string {
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) return timestamp;
    const date = new Date(ts * 1000);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  return {
    entries,
    loading,
    searchQuery,
    fetchHistory,
    clearHistory,
    rerunCommand,
    filteredEntries,
    formatTime,
  };
}
