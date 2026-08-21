<script setup lang="ts">
import { watch } from 'vue';
import { useLogs } from '../composables/useLogs';
import type { DeviceInfo } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const {
  logs,
  loading,
  levelFilter,
  tagFilter,
  pidFilter,
  searchQuery,
  paused,
  filteredLogs,
  fetchLogs,
  clearLogs,
  togglePause,
  getLogText,
  getLevelColor,
} = useLogs();

// 设备切换时自动加载日志
watch(
  () => props.selectedDevice,
  (device) => {
    if (device) {
      fetchLogs(device.id);
    } else {
      clearLogs();
    }
  },
  { immediate: true }
);

function onRefresh() {
  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }
  fetchLogs(props.selectedDevice.id);
}

function onClear() {
  clearLogs();
  emit('toast', '日志已清空', 'info');
}

async function onExport() {
  try {
    await navigator.clipboard.writeText(getLogText());
    emit('toast', '日志已复制到剪贴板', 'success');
  } catch {
    emit('toast', '导出失败', 'error');
  }
}
</script>

<template>
  <div class="log-viewer">
    <!-- 工具栏 -->
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-file-edit"></i>
        日志查看
      </h2>
      <div class="toolbar-actions">
        <select v-model="levelFilter" class="filter-select">
          <option value="">全部级别</option>
          <option value="V">Verbose</option>
          <option value="D">Debug</option>
          <option value="I">Info</option>
          <option value="W">Warning</option>
          <option value="E">Error</option>
        </select>
        <input
          v-model="tagFilter"
          type="text"
          class="filter-input"
          placeholder="过滤 Tag..."
        />
        <input
          v-model="pidFilter"
          type="text"
          class="filter-input pid-input"
          placeholder="PID"
        />
        <input
          v-model="searchQuery"
          type="text"
          class="filter-input search-input"
          placeholder="搜索日志..."
        />
        <Button
          :icon="paused ? 'pi pi-play' : 'pi pi-pause'"
          text
          size="small"
          v-tooltip.bottom="paused ? '继续' : '暂停'"
          @click="togglePause"
        />
        <Button
          icon="pi pi-refresh"
          text
          size="small"
          v-tooltip.bottom="'刷新'"
          :loading="loading"
          @click="onRefresh"
        />
        <Button
          icon="pi pi-trash"
          text
          size="small"
          v-tooltip.bottom="'清空'"
          @click="onClear"
        />
        <Button
          icon="pi pi-download"
          text
          size="small"
          v-tooltip.bottom="'导出'"
          @click="onExport"
        />
      </div>
    </div>

    <!-- 日志列表 -->
    <div class="log-list">
      <div v-if="!selectedDevice" class="empty-state">
        <i class="pi pi-mobile"></i>
        <p>请先选择设备</p>
      </div>

      <div v-else-if="filteredLogs.length === 0 && !loading" class="empty-state">
        <i class="pi pi-inbox"></i>
        <p>暂无日志</p>
        <p class="hint">点击刷新按钮获取设备日志</p>
      </div>

      <div v-else class="log-entries">
        <div
          v-for="(entry, index) in filteredLogs"
          :key="index"
          class="log-entry"
        >
          <span class="log-time">{{ entry.time }}</span>
          <span class="log-pid">{{ entry.pid }}</span>
          <span class="log-tid">{{ entry.tid }}</span>
          <span
            class="log-level"
            :style="{ color: getLevelColor(entry.level) }"
          >
            {{ entry.level }}
          </span>
          <span class="log-tag">{{ entry.tag }}</span>
          <span class="log-message">{{ entry.message }}</span>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="log-stats">
      <span>{{ filteredLogs.length }} 条日志</span>
      <span v-if="logs.length !== filteredLogs.length" class="filter-info">
        (共 {{ logs.length }} 条，已过滤)
      </span>
      <span class="live-indicator" :class="{ paused }">
        <span class="status-dot"></span>
        {{ paused ? '已暂停' : '实时接收中' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  gap: 0.75rem;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--surface-300);
  border-radius: 6px;
  font-size: 0.8125rem;
  background: var(--surface-card);
  color: var(--text-color);
}

.filter-input {
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--surface-300);
  border-radius: 6px;
  font-size: 0.8125rem;
  background: var(--surface-card);
  color: var(--text-color);
  width: 120px;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.pid-input {
  width: 70px;
}

.search-input {
  width: 160px;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color-secondary);
  gap: 0.5rem;
}

.empty-state .pi {
  font-size: 3rem;
  color: var(--surface-300);
}

.empty-state .hint {
  font-size: 0.8125rem;
}

.log-entries {
  padding: 0.5rem;
}

.log-entry {
  display: flex;
  gap: 0.5rem;
  padding: 0.1875rem 0.5rem;
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  border-radius: 2px;
}

.log-entry:hover {
  background: var(--surface-hover);
}

.log-time {
  color: var(--text-color-secondary);
  flex-shrink: 0;
  min-width: 130px;
}

.log-pid,
.log-tid {
  color: var(--text-color-secondary);
  flex-shrink: 0;
  min-width: 45px;
  text-align: right;
}

.log-level {
  flex-shrink: 0;
  font-weight: 700;
  min-width: 14px;
  text-align: center;
}

.log-tag {
  color: var(--primary-color);
  flex-shrink: 0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-message {
  color: var(--text-color);
  word-break: break-all;
}

.log-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.375rem 0;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  flex-shrink: 0;
}

.filter-info {
  color: var(--primary-color);
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: auto;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulse 2s infinite;
}

.live-indicator.paused .status-dot {
  background: #f59e0b;
  animation: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 滚动条 */
.log-list::-webkit-scrollbar {
  width: 6px;
}

.log-list::-webkit-scrollbar-track {
  background: transparent;
}

.log-list::-webkit-scrollbar-thumb {
  background: var(--surface-300);
  border-radius: 3px;
}
</style>
