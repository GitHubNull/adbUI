import { ref, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { TaskInfo } from '../types/device';

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

const MOCK_TASKS: TaskInfo[] = [
  {
    id: 'mock_task_001',
    name: '批量卸载',
    status: 'Completed',
    progress: 1.0,
    total: 3,
    completed: 3,
    message: '批量卸载完成',
    results: [
      { item: 'com.example.app1', success: true, message: '卸载成功' },
      { item: 'com.example.app2', success: true, message: '卸载成功' },
      { item: 'com.example.app3', success: false, message: '卸载失败: 包不存在' },
    ],
    created_at: '1720000000',
  },
];

export function useTasks() {
  const tasks = ref<TaskInfo[]>([]);
  const loading = ref(false);
  let unlisten: UnlistenFn | null = null;

  // ============================================
  // 获取任务列表
  // ============================================

  async function fetchTasks() {
    loading.value = true;
    try {
      if (isTauri()) {
        tasks.value = await invoke<TaskInfo[]>('get_tasks');
      } else {
        await new Promise((r) => setTimeout(r, 200));
        tasks.value = [...MOCK_TASKS];
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // 监听任务进度事件
  // ============================================

  async function listenTaskProgress() {
    if (!isTauri()) return;

    try {
      unlisten = await listen<TaskInfo>('task-progress', (event) => {
        const updated = event.payload;
        const idx = tasks.value.findIndex((t) => t.id === updated.id);
        if (idx >= 0) {
          tasks.value[idx] = updated;
        } else {
          tasks.value.unshift(updated);
        }
      });
    } catch (err) {
      console.error('Failed to listen task progress:', err);
    }
  }

  // ============================================
  // 任务操作
  // ============================================

  async function cancelTask(taskId: string) {
    if (isTauri()) {
      try {
        await invoke('cancel_task', { taskId });
        // 本地更新状态
        const task = tasks.value.find((t) => t.id === taskId);
        if (task) {
          task.status = 'Cancelled';
          task.message = '任务已取消';
        }
      } catch (err) {
        console.error('Failed to cancel task:', err);
      }
    }
  }

  async function clearCompleted() {
    if (isTauri()) {
      try {
        await invoke('clear_completed_tasks');
        tasks.value = tasks.value.filter(
          (t) => t.status === 'Running' || t.status === 'Pending'
        );
      } catch (err) {
        console.error('Failed to clear tasks:', err);
      }
    } else {
      tasks.value = [];
    }
  }

  // ============================================
  // 生命周期
  // ============================================

  onMounted(() => {
    fetchTasks();
    listenTaskProgress();
  });

  onUnmounted(() => {
    if (unlisten) {
      unlisten();
    }
  });

  return {
    tasks,
    loading,
    fetchTasks,
    cancelTask,
    clearCompleted,
  };
}
