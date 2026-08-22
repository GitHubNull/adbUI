import { ref, computed } from 'vue';

// ============================================
// 全局应用状态（底部状态栏数据源）
// 模块级单例：所有页面共享刷新计数与连接模式。
// ============================================

const refreshingCount = ref(0);
const wsConnected = ref(false);
const refreshSource = ref<'websocket' | 'polling'>('polling');

export function useAppStatus() {
  /** 开始一次数据刷新（支持并发计数） */
  function beginRefresh() {
    refreshingCount.value++;
  }

  /** 结束一次数据刷新 */
  function endRefresh() {
    if (refreshingCount.value > 0) {
      refreshingCount.value--;
    }
  }

  /** 设置 WebSocket 连接状态（联动刷新模式） */
  function setWsStatus(connected: boolean) {
    wsConnected.value = connected;
    refreshSource.value = connected ? 'websocket' : 'polling';
  }

  /** 是否有刷新正在进行中 */
  const refreshing = computed(() => refreshingCount.value > 0);

  return {
    refreshing,
    refreshingCount,
    wsConnected,
    refreshSource,
    beginRefresh,
    endRefresh,
    setWsStatus,
  };
}
