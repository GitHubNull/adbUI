<script setup lang="ts">
import { onMounted } from 'vue';
import { useCommandHistory } from '../composables/useCommandHistory';
import type { DeviceInfo } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const {
  loading,
  searchQuery,
  fetchHistory,
  clearHistory,
  rerunCommand,
  filteredEntries,
  formatTime,
} = useCommandHistory();

onMounted(() => {
  fetchHistory();
});

async function onRerun(command: string) {
  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }
  try {
    await rerunCommand(command, props.selectedDevice.id);
    emit('toast', `已重新执行: ${command}`, 'success');
    // 刷新历史（execute_adb 会自动记录）
    await fetchHistory();
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onCopy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    emit('toast', `已复制${label}`, 'success');
  } catch {
    emit('toast', '复制失败', 'error');
  }
}

async function onClear() {
  await clearHistory();
  emit('toast', '命令历史已清空', 'info');
}
</script>

<template>
  <div class="command-history">
    <!-- 工具栏 -->
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-history"></i>
        命令历史
      </h2>
      <div class="toolbar-actions">
        <span class="search-wrapper">
          <i class="pi pi-search"></i>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索命令..."
          />
        </span>
        <Button
          icon="pi pi-refresh"
          text
          size="small"
          v-tooltip.bottom="'刷新'"
          @click="fetchHistory"
        />
        <Button
          icon="pi pi-trash"
          text
          size="small"
          severity="danger"
          v-tooltip.bottom="'清空历史'"
          @click="onClear"
        />
      </div>
    </div>

    <!-- 历史列表 -->
    <div class="history-list">
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>加载中...</span>
      </div>

      <div v-else-if="filteredEntries().length === 0" class="empty-state">
        <i class="pi pi-inbox"></i>
        <p>暂无命令历史</p>
        <p class="hint">执行 ADB 命令后会自动记录在这里</p>
      </div>

      <div
        v-for="(entry, index) in filteredEntries()"
        :key="index"
        class="history-item"
      >
        <div class="history-header">
          <code class="history-command">{{ entry.command }}</code>
          <span class="history-time">{{ formatTime(entry.timestamp) }}</span>
        </div>

        <div v-if="entry.stdout" class="history-output">
          <pre>{{ entry.stdout.length > 300 ? entry.stdout.slice(0, 300) + '...' : entry.stdout }}</pre>
        </div>

        <div v-if="entry.stderr" class="history-error">
          <pre>{{ entry.stderr }}</pre>
        </div>

        <div class="history-meta">
          <span class="history-device">
            <i class="pi pi-mobile"></i>
            {{ entry.device_id || '默认设备' }}
          </span>
          <span
            class="history-exit-code"
            :class="{ 'exit-error': entry.exit_code !== 0 }"
          >
            exit: {{ entry.exit_code }}
          </span>
        </div>

        <div class="history-actions">
          <Button
            label="复制命令"
            icon="pi pi-copy"
            text
            size="small"
            @click="onCopy(entry.command, '命令')"
          />
          <Button
            v-if="entry.stdout"
            label="复制输出"
            icon="pi pi-copy"
            text
            size="small"
            @click="onCopy(entry.stdout, '输出')"
          />
          <Button
            label="重新执行"
            icon="pi pi-play"
            size="small"
            @click="onRerun(entry.command)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.command-history {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  gap: 1rem;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
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
  gap: 0.5rem;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-wrapper .pi-search {
  position: absolute;
  left: 0.625rem;
  color: var(--text-color-secondary);
  font-size: 0.8125rem;
}

.search-input {
  padding: 0.375rem 0.625rem 0.375rem 2rem;
  border: 1px solid var(--surface-300);
  border-radius: 6px;
  font-size: 0.8125rem;
  background: var(--surface-card);
  color: var(--text-color);
  width: 200px;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-color-secondary);
  gap: 0.5rem;
}

.empty-state .pi-inbox {
  font-size: 3rem;
  color: var(--surface-300);
}

.empty-state .hint {
  font-size: 0.8125rem;
  color: var(--text-color-secondary);
}

.history-item {
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-command {
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.8125rem;
  color: var(--primary-color);
  background: var(--surface-100);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  word-break: break-all;
}

.history-time {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  flex-shrink: 0;
}

.history-output pre,
.history-error pre {
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  margin: 0;
  padding: 0.5rem;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
}

.history-output pre {
  background: var(--surface-50);
  color: var(--text-color);
}

.history-error pre {
  background: #fef2f2;
  color: #dc2626;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.history-device {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.history-exit-code {
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  background: #dcfce7;
  color: #166534;
}

.history-exit-code.exit-error {
  background: #fef2f2;
  color: #dc2626;
}

.history-actions {
  display: flex;
  gap: 0.375rem;
  justify-content: flex-end;
}

/* 滚动条 */
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: transparent;
}

.history-list::-webkit-scrollbar-thumb {
  background: var(--surface-300);
  border-radius: 3px;
}
</style>
