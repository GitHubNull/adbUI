import { ref, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { ScriptProgress } from '../types/device';

// ============================================
// 环境检测
// ============================================

function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

/** 示例脚本模板 */
export const SCRIPT_TEMPLATES: { name: string; content: string }[] = [
  {
    name: '示例：返回桌面并截图',
    content: '# 返回桌面\nkeyevent KEYCODE_HOME\nsleep 500\n# 点击屏幕中央\ntap 540 1200\n',
  },
  {
    name: '示例：循环滑动',
    content: '# 向上滑动 3 次\nloop 3\n  swipe 540 1500 540 500 300\n  sleep 800\nend\n',
  },
];

export function useScripts() {
  const script = ref<string>(SCRIPT_TEMPLATES[0].content);
  const running = ref(false);
  const currentLine = ref<number>(-1); // 当前执行行号（原始行号）
  const progress = ref<ScriptProgress | null>(null);
  const error = ref<string | null>(null);
  const taskId = ref<string | null>(null);

  let unlisten: UnlistenFn | null = null;

  // ============================================
  // 监听脚本执行进度
  // ============================================

  async function setupListener() {
    if (!isTauri() || unlisten) return;
    unlisten = await listen<ScriptProgress>('script-progress', (event) => {
      progress.value = event.payload;
      if (event.payload.status === 'running') {
        currentLine.value = event.payload.line_no;
      } else if (
        event.payload.status === 'error' ||
        event.payload.status === 'stopped'
      ) {
        running.value = false;
      }
      if (
        event.payload.index >= event.payload.total - 1 &&
        event.payload.status === 'done'
      ) {
        running.value = false;
      }
    });
  }

  // ============================================
  // 执行脚本
  // ============================================

  async function executeScript(deviceId: string): Promise<string | null> {
    error.value = null;
    currentLine.value = -1;
    if (isTauri()) {
      await setupListener();
      running.value = true;
      try {
        const id = await invoke<string>('execute_script', {
          deviceId,
          script: script.value,
        });
        taskId.value = id;
        return id;
      } catch (err) {
        running.value = false;
        error.value = String(err);
        throw err;
      }
    }
    // Mock 模式：模拟逐行执行
    running.value = true;
    const lines = script.value.split('\n');
    let execIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t || t.startsWith('#') || t === 'end' || t.startsWith('loop')) continue;
      currentLine.value = i + 1;
      progress.value = {
        line_no: i + 1,
        index: execIndex,
        total: lines.length,
        status: 'done',
        message: '',
      };
      execIndex++;
      await new Promise((r) => setTimeout(r, 200));
      if (!running.value) break; // 支持停止
    }
    running.value = false;
    return 'mock_script_task';
  }

  // ============================================
  // 停止执行
  // ============================================

  async function stopScript(): Promise<void> {
    if (isTauri() && taskId.value) {
      await invoke('cancel_task', { taskId: taskId.value });
    }
    running.value = false;
    currentLine.value = -1;
  }

  // ============================================
  // 导入 / 导出
  // ============================================

  function importScript(content: string) {
    script.value = content;
    currentLine.value = -1;
    error.value = null;
  }

  function exportScript(): string {
    return script.value;
  }

  onUnmounted(() => {
    if (unlisten) {
      unlisten();
      unlisten = null;
    }
  });

  return {
    script,
    running,
    currentLine,
    progress,
    error,
    executeScript,
    stopScript,
    importScript,
    exportScript,
  };
}
