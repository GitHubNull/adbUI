<script setup lang="ts">
import { computed } from 'vue';
import { useAppStatus } from '../composables/useAppStatus';
import type { TaskInfo } from '../types/device';

const props = defineProps<{
  currentView: string;
  onlineCount: number;
  totalCount: number;
  tasks: TaskInfo[];
}>();

const { refreshing, wsConnected, refreshSource } = useAppStatus();

const VIEW_NAMES: Record<string, string> = {
  devices: '设备管理',
  apps: '应用管理',
  files: '文件管理',
  tasks: '任务中心',
  display: '显示设置',
  battery: '电池模拟',
  scripts: '脚本自动化',
  logs: '日志查看',
  shell: 'Shell 终端',
  screenshots: '截图录屏',
  perf: '性能监控',
  settings: '设置',
};

const viewName = computed(() => VIEW_NAMES[props.currentView] || props.currentView);

// 后台运行中任务数（Running/Pending），无任务时不显示
const runningTaskCount = computed(
  () => props.tasks.filter((t) => t.status === 'Running' || t.status === 'Pending').length
);
</script>

<template>
  <div class="status-bar">
    <!-- 左侧：刷新状态动画 -->
    <div class="status-bar-left">
      <i v-if="!refreshing" class="pi pi-sync status-icon"></i>
      <span v-else class="refresh-spinner" aria-label="刷新中"></span>
      <span v-if="refreshing" class="refresh-text">刷新中...</span>
    </div>

    <!-- 右侧：功能特性状态 -->
    <div class="status-bar-right">
      <span class="status-item">
        <span class="status-dot" :class="wsConnected ? 'dot-success' : 'dot-muted'"></span>
        {{ wsConnected ? '实时' : (refreshSource === 'polling' ? '轮询' : '离线') }}
      </span>
      <span class="status-sep"></span>
      <span class="status-item">{{ onlineCount }}/{{ totalCount }} 设备在线</span>
      <span class="status-sep"></span>
      <span class="status-item">{{ viewName }}</span>
      <template v-if="runningTaskCount > 0">
        <span class="status-sep"></span>
        <span class="status-item">
          <i class="pi pi-spinner pi-spin status-icon"></i>
          {{ runningTaskCount }} 个后台任务
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 柔和分区：与内容区同色系，仅用轻微背景差 + 清晰分隔线划分区域 */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 1rem;
  background: color-mix(in srgb, var(--p-content-background), var(--p-text-color) 5%);
  border-top: 1px solid var(--p-surface-300);
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  user-select: none;
  flex-shrink: 0;
}

.status-bar-left,
.status-bar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-icon {
  font-size: 0.75rem;
  color: var(--p-surface-400);
}

/* 小范围刷新动画（仅状态栏内） */
.refresh-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid var(--p-primary-500);
  border-top-color: transparent;
  border-radius: 50%;
  animation: status-spin 0.8s linear infinite;
}

@keyframes status-spin {
  to {
    transform: rotate(360deg);
  }
}

.refresh-text {
  color: var(--p-primary-500);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-success {
  background: #22c55e;
}

.dot-muted {
  background: var(--p-surface-400);
}

.status-sep {
  width: 1px;
  height: 12px;
  background: var(--p-surface-300);
}
</style>
