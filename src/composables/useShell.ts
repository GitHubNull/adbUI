import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { AdbResult, TerminalLine } from '../types/device';

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

const MOCK_RESPONSES: Record<string, string> = {
  'adb devices': 'List of devices attached\nemulator-5554\tdevice',
  'getprop ro.product.model': 'Pixel 8 Pro',
  'dumpsys battery': 'Current Battery Service state:\n  level: 78\n  status: 2\n  temperature: 298',
  'help': 'Available commands: adb devices, getprop, dumpsys, pm, am, input, settings, wm, logcat, screencap, screenrecord',
};

export function useShell() {
  const lines = ref<TerminalLine[]>([]);
  const executing = ref(false);
  const commandHistory = ref<string[]>([]);
  const historyIndex = ref(-1);

  // ============================================
  // 执行命令
  // ============================================

  async function executeCommand(
    command: string,
    deviceId?: string
  ): Promise<AdbResult> {
    if (!command.trim()) {
      return { stdout: '', stderr: '', exit_code: 0 };
    }

    executing.value = true;

    // 添加命令行到终端
    lines.value.push({
      type: 'command',
      text: command,
      timestamp: Date.now(),
    });

    // 记录到命令历史（用于上下键翻阅）
    commandHistory.value.unshift(command);
    historyIndex.value = -1;

    try {
      let result: AdbResult;
      if (isTauri()) {
        result = await invoke<AdbResult>('execute_adb', {
          command,
          deviceId: deviceId || null,
        });
      } else {
        // Browser mock mode
        await new Promise((r) => setTimeout(r, 300));
        const mockOutput = MOCK_RESPONSES[command] || `(Mock) ${command}`;
        result = { stdout: mockOutput, stderr: '', exit_code: 0 };
      }

      // 添加输出到终端
      if (result.stdout) {
        lines.value.push({
          type: 'output',
          text: result.stdout,
          timestamp: Date.now(),
        });
      }
      if (result.stderr) {
        lines.value.push({
          type: 'error',
          text: result.stderr,
          timestamp: Date.now(),
        });
      }
      if (!result.stdout && !result.stderr) {
        lines.value.push({
          type: 'info',
          text: `(exit code: ${result.exit_code})`,
          timestamp: Date.now(),
        });
      }

      return result;
    } catch (err) {
      const errorMsg = String(err);
      lines.value.push({
        type: 'error',
        text: errorMsg,
        timestamp: Date.now(),
      });
      return { stdout: '', stderr: errorMsg, exit_code: -1 };
    } finally {
      executing.value = false;
    }
  }

  // ============================================
  // 终端操作
  // ============================================

  function clearTerminal() {
    lines.value = [{
      type: 'info',
      text: '终端已清空',
      timestamp: Date.now(),
    }];
  }

  function getFullOutput(): string {
    return lines.value
      .map((l) => {
        if (l.type === 'command') return `$ ${l.text}`;
        return l.text;
      })
      .join('\n');
  }

  // ============================================
  // 历史命令导航
  // ============================================

  function navigateHistory(direction: 'up' | 'down'): string | null {
    if (commandHistory.value.length === 0) return null;

    if (direction === 'up') {
      if (historyIndex.value < commandHistory.value.length - 1) {
        historyIndex.value++;
      }
    } else {
      if (historyIndex.value > 0) {
        historyIndex.value--;
      } else {
        historyIndex.value = -1;
        return '';
      }
    }

    return commandHistory.value[historyIndex.value] || null;
  }

  // ============================================
  // 初始化
  // ============================================

  function initTerminal() {
    lines.value = [
      { type: 'info', text: 'adbUI Shell 终端', timestamp: Date.now() },
      { type: 'info', text: '输入 ADB 命令，输入 help 查看常用命令', timestamp: Date.now() },
    ];
  }

  initTerminal();

  return {
    lines,
    executing,
    commandHistory,
    executeCommand,
    clearTerminal,
    getFullOutput,
    navigateHistory,
  };
}
