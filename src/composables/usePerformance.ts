import { ref, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { PerformanceData } from '../types/device';

// ============================================
// 环境检测
// ============================================

function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

const POLLING_INTERVAL = 2000; // 2 秒

// ============================================
// Mock 数据
// ============================================

const MOCK_PERFORMANCE: PerformanceData = {
  cpu_usage: 21.5,
  memory_used: 7_200_000,
  memory_total: 12_000_000,
  temperature: 34.5,
  processes: [
    { pid: 2847, user: 'u0_a123', cpu_percent: 15.2, memory_kb: 234_000, name: 'com.android.chrome' },
    { pid: 3123, user: 'u0_a101', cpu_percent: 8.1, memory_kb: 123_000, name: 'com.google.android.gms' },
    { pid: 1567, user: 'system', cpu_percent: 5.3, memory_kb: 89_000, name: 'system_server' },
    { pid: 2341, user: 'u0_a145', cpu_percent: 3.2, memory_kb: 67_000, name: 'com.whatsapp' },
    { pid: 1890, user: 'u0_a200', cpu_percent: 2.1, memory_kb: 45_000, name: 'com.tencent.mm' },
  ],
};

export function usePerformance() {
  const data = ref<PerformanceData | null>(null);
  const loading = ref(false);
  const monitoring = ref(false);
  const cpuHistory = ref<number[]>([]);
  const maxHistoryLength = 30;

  let pollingTimer: ReturnType<typeof setInterval> | null = null;

  // ============================================
  // 获取性能数据
  // ============================================

  async function fetchPerformance(deviceId: string) {
    loading.value = true;
    try {
      let result: PerformanceData;
      if (isTauri()) {
        result = await invoke<PerformanceData>('get_performance_data', { deviceId });
      } else {
        await new Promise((r) => setTimeout(r, 300));
        // Mock: 随机波动
        result = {
          ...MOCK_PERFORMANCE,
          cpu_usage: Math.round((Math.random() * 30 + 10) * 10) / 10,
          temperature: Math.round((Math.random() * 5 + 32) * 10) / 10,
        };
      }

      data.value = result;

      // 记录 CPU 历史
      cpuHistory.value.push(result.cpu_usage);
      if (cpuHistory.value.length > maxHistoryLength) {
        cpuHistory.value.shift();
      }
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
    } finally {
      loading.value = false;
    }
  }

  // ============================================
  // 轮询控制
  // ============================================

  function startMonitoring(deviceId: string) {
    if (pollingTimer) return;
    monitoring.value = true;
    fetchPerformance(deviceId);
    pollingTimer = setInterval(() => fetchPerformance(deviceId), POLLING_INTERVAL);
  }

  function stopMonitoring() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    monitoring.value = false;
  }

  function toggleMonitoring(deviceId: string) {
    if (monitoring.value) {
      stopMonitoring();
    } else {
      startMonitoring(deviceId);
    }
  }

  // ============================================
  // 工具函数
  // ============================================

  function formatMemory(kb: number): string {
    if (kb >= 1_048_576) {
      return `${(kb / 1_048_576).toFixed(1)} GB`;
    }
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(0)} MB`;
    }
    return `${kb} KB`;
  }

  function memoryPercent(): number {
    if (!data.value || data.value.memory_total === 0) return 0;
    return Math.round((data.value.memory_used / data.value.memory_total) * 100);
  }

  onUnmounted(() => {
    stopMonitoring();
  });

  return {
    data,
    loading,
    monitoring,
    cpuHistory,
    fetchPerformance,
    startMonitoring,
    stopMonitoring,
    toggleMonitoring,
    formatMemory,
    memoryPercent,
  };
}
