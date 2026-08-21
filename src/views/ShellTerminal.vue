<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue';
import { useShell } from '../composables/useShell';
import { useCommandLib } from '../composables/useCommandLib';
import { useCommandHistory } from '../composables/useCommandHistory';
import type { DeviceInfo, CommandTemplate } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const {
  lines,
  executing,
  executeCommand,
  clearTerminal,
  getFullOutput,
  navigateHistory,
} = useShell();

const inputCommand = ref('');
const terminalOutputRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

// ============ 常用命令库（从 CommandLibrary 合并） ============
const {
  activeCategory,
  categories,
  filteredCommands,
  outputs: cmdOutputs,
  runningId,
  toggleFavorite,
  addCustom,
  removeCustom,
  execute: executeLibCommand,
} = useCommandLib();

const showCommandLib = ref(false);
const newCmdName = ref('');
const newCmdCommand = ref('');
const newCmdCategory = ref('');

function onAddCustom() {
  if (!newCmdName.value || !newCmdCommand.value) {
    emit('toast', '请填写名称与命令', 'warn');
    return;
  }
  addCustom(newCmdName.value, newCmdCommand.value, newCmdCategory.value);
  newCmdName.value = '';
  newCmdCommand.value = '';
  newCmdCategory.value = '';
  emit('toast', '自定义命令已添加', 'success');
}

async function onExecuteLibCommand(cmd: CommandTemplate) {
  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }
  try {
    await executeLibCommand(props.selectedDevice.id, cmd);
    emit('toast', `已执行: ${cmd.name}`, 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

function insertCommand(cmd: string) {
  inputCommand.value = cmd;
  showCommandLib.value = false;
  focusInput();
}

// ============ 命令历史（从 CommandHistoryView 合并） ============
const {
  loading: historyLoading,
  searchQuery: historySearch,
  fetchHistory,
  clearHistory,
  rerunCommand,
  filteredEntries,
  formatTime,
} = useCommandHistory();

const showHistory = ref(false);

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
    await fetchHistory();
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onCopyHistory(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    emit('toast', `已复制${label}`, 'success');
  } catch {
    emit('toast', '复制失败', 'error');
  }
}

async function onClearHistory() {
  await clearHistory();
  emit('toast', '命令历史已清空', 'info');
}

// 自动滚动到底部
watch(() => lines.value.length, async () => {
  await nextTick();
  if (terminalOutputRef.value) {
    terminalOutputRef.value.scrollTop = terminalOutputRef.value.scrollHeight;
  }
});

async function onSubmit() {
  const cmd = inputCommand.value.trim();
  if (!cmd) return;

  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }

  inputCommand.value = '';
  await executeCommand(cmd, props.selectedDevice.id);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const cmd = navigateHistory('up');
    if (cmd !== null) {
      inputCommand.value = cmd;
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const cmd = navigateHistory('down');
    if (cmd !== null) {
      inputCommand.value = cmd;
    }
  }
}

function onClear() {
  clearTerminal();
}

async function onCopy() {
  try {
    await navigator.clipboard.writeText(getFullOutput());
    emit('toast', '已复制到剪贴板', 'success');
  } catch {
    emit('toast', '复制失败', 'error');
  }
}

function focusInput() {
  inputRef.value?.focus();
}
</script>

<template>
  <div class="shell-terminal" @click="focusInput">
    <!-- 工具栏 -->
    <div class="terminal-toolbar">
      <div class="terminal-tabs">
        <div class="terminal-tab active">
          <i class="pi pi-terminal"></i>
          <span>Shell</span>
        </div>
      </div>
      <div class="terminal-actions">
        <Button
          icon="pi pi-bookmark"
          text
          size="small"
          v-tooltip.bottom="'常用命令'"
          @click="showCommandLib = true"
        />
        <Button
          icon="pi pi-history"
          text
          size="small"
          v-tooltip.bottom="'命令历史'"
          @click="showHistory = true"
        />
        <Button
          icon="pi pi-trash"
          text
          size="small"
          v-tooltip.bottom="'清空'"
          @click="onClear"
        />
        <Button
          icon="pi pi-copy"
          text
          size="small"
          v-tooltip.bottom="'复制输出'"
          @click="onCopy"
        />
      </div>
    </div>

    <!-- 终端输出区 -->
    <div class="terminal-output" ref="terminalOutputRef">
      <div
        v-for="(line, index) in lines"
        :key="index"
        class="terminal-line"
        :class="`line-${line.type}`"
      >
        <span v-if="line.type === 'command'" class="prompt">$</span>
        <span class="line-text">{{ line.text }}</span>
      </div>
      <div v-if="executing" class="terminal-line line-info">
        <i class="pi pi-spin pi-spinner"></i>
        <span class="line-text">执行中...</span>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="terminal-input-wrapper">
      <span class="prompt">$</span>
      <input
        ref="inputRef"
        v-model="inputCommand"
        type="text"
        class="terminal-input"
        placeholder="输入 ADB 命令..."
        autocomplete="off"
        spellcheck="false"
        :disabled="executing"
        @keydown.enter="onSubmit"
        @keydown="onKeydown"
      />
      <Button
        icon="pi pi-send"
        text
        size="small"
        :disabled="executing || !inputCommand.trim()"
        @click="onSubmit"
      />
    </div>
    <!-- 常用命令库侧边面板 -->
    <Drawer v-model:visible="showCommandLib" header="常用命令库" position="right" :style="{ width: '480px' }">
      <div class="drawer-content">
        <!-- 分类筛选 -->
        <div class="category-tabs">
          <div
            v-for="cat in categories"
            :key="cat"
            :class="['category-tab', { active: activeCategory === cat }]"
            @click="activeCategory = cat"
          >
            {{ cat }}
          </div>
        </div>

        <!-- 命令列表 -->
        <div class="cmd-list">
          <div v-if="filteredCommands.length === 0" class="empty-state">
            <i class="pi pi-inbox"></i>
            <p>该分类暂无命令</p>
          </div>

          <div v-for="cmd in filteredCommands" :key="cmd.id" class="cmd-card">
            <div class="cmd-header">
              <div class="cmd-info">
                <span class="cmd-name">{{ cmd.name }}</span>
                <code class="cmd-text">{{ cmd.command }}</code>
                <span v-if="cmd.description" class="cmd-desc">{{ cmd.description }}</span>
              </div>
              <div class="cmd-actions">
                <Button
                  :icon="cmd.favorite ? 'pi pi-star-fill' : 'pi pi-star'"
                  text
                  :class="{ 'fav-active': cmd.favorite }"
                  @click="toggleFavorite(cmd.id)"
                />
                <Button
                  icon="pi pi-play"
                  text
                  :loading="runningId === cmd.id"
                  @click="onExecuteLibCommand(cmd)"
                />
                <Button
                  icon="pi pi-arrow-right"
                  text
                  v-tooltip.bottom="'插入到终端'"
                  @click="insertCommand(cmd.command)"
                />
                <Button
                  v-if="!cmd.builtin"
                  icon="pi pi-trash"
                  text
                  severity="danger"
                  @click="removeCustom(cmd.id)"
                />
              </div>
            </div>
            <div v-if="cmdOutputs[cmd.id]" class="cmd-output">
              <pre>{{ cmdOutputs[cmd.id] }}</pre>
            </div>
          </div>
        </div>

        <!-- 添加自定义命令 -->
        <div class="add-form">
          <h4>添加自定义命令</h4>
          <div class="input-row">
            <InputText v-model="newCmdName" placeholder="名称" class="flex-1" />
            <InputText v-model="newCmdCommand" placeholder="ADB 命令" class="flex-1" />
            <InputText v-model="newCmdCategory" placeholder="分类（可选）" class="flex-1" />
            <Button label="添加" icon="pi pi-plus" @click="onAddCustom" />
          </div>
        </div>
      </div>
    </Drawer>

    <!-- 命令历史侧边面板 -->
    <Drawer v-model:visible="showHistory" header="命令历史" position="right" :style="{ width: '480px' }">
      <div class="drawer-content">
        <div class="history-toolbar">
          <span class="search-wrapper">
            <i class="pi pi-search"></i>
            <input
              v-model="historySearch"
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
            @click="onClearHistory"
          />
        </div>

        <div class="history-list">
          <div v-if="historyLoading" class="loading-state">
            <i class="pi pi-spin pi-spinner"></i>
            <span>加载中...</span>
          </div>

          <div v-else-if="filteredEntries().length === 0" class="empty-state">
            <i class="pi pi-inbox"></i>
            <p>暂无命令历史</p>
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
              <pre>{{ entry.stdout.length > 200 ? entry.stdout.slice(0, 200) + '...' : entry.stdout }}</pre>
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
                label="复制"
                icon="pi pi-copy"
                text
                size="small"
                @click="onCopyHistory(entry.command, '命令')"
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
    </Drawer>
  </div>
</template>

<style scoped>
.shell-terminal {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
}

.terminal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: #16162a;
  border-bottom: 1px solid #2a2a4a;
}

.terminal-tabs {
  display: flex;
  gap: 0.25rem;
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8125rem;
  color: #8888a8;
  cursor: pointer;
}

.terminal-tab.active {
  background: #2a2a4a;
  color: #e0e0f0;
}

.terminal-actions {
  display: flex;
  gap: 0.25rem;
}

.terminal-actions :deep(.p-button) {
  color: #8888a8;
}

.terminal-actions :deep(.p-button:hover) {
  color: #e0e0f0;
}

.terminal-output {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.terminal-line {
  display: flex;
  gap: 0.5rem;
  padding: 0.125rem 0;
  word-break: break-all;
  white-space: pre-wrap;
}

.prompt {
  color: #4ade80;
  font-weight: 600;
  flex-shrink: 0;
  user-select: none;
}

.line-command .line-text {
  color: #e0e0f0;
  font-weight: 500;
}

.line-output .line-text {
  color: #a0a0c0;
}

.line-error .line-text {
  color: #f87171;
}

.line-info .line-text {
  color: #60a5fa;
  font-style: italic;
}

.terminal-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: #16162a;
  border-top: 1px solid #2a2a4a;
}

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e0e0f0;
  font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  caret-color: #4ade80;
}

.terminal-input::placeholder {
  color: #4a4a6a;
}

.terminal-input:disabled {
  opacity: 0.5;
}

/* 滚动条 */
.terminal-output::-webkit-scrollbar {
  width: 6px;
}

.terminal-output::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-output::-webkit-scrollbar-thumb {
  background: #2a2a4a;
  border-radius: 3px;
}

/* Drawer 内容 */
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.category-tab {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  cursor: pointer;
  color: var(--text-color-secondary);
  background: var(--surface-100);
  transition: all 0.2s;
}

.category-tab:hover {
  background: var(--surface-hover);
  color: var(--text-color);
}

.category-tab.active {
  background: var(--primary-color);
  color: var(--primary-color-text);
}

.cmd-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.cmd-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.cmd-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.cmd-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.cmd-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.cmd-text {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--primary-color);
  background: var(--surface-50);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  word-break: break-all;
}

.cmd-desc {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.cmd-actions {
  display: flex;
  gap: 0.125rem;
  flex-shrink: 0;
}

.fav-active {
  color: var(--yellow-500) !important;
}

.cmd-output {
  background: var(--surface-50);
  border-radius: 4px;
  padding: 0.5rem;
}

.cmd-output pre {
  margin: 0;
  font-size: 0.75rem;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-color-secondary);
  max-height: 100px;
  overflow-y: auto;
}

.add-form {
  background: var(--surface-card);
  border: 1px dashed var(--surface-300);
  border-radius: 8px;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.add-form h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.input-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.flex-1 {
  flex: 1;
  min-width: 120px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-color-secondary);
  gap: 0.5rem;
}

.empty-state .pi-inbox {
  font-size: 2rem;
  color: var(--surface-300);
}

/* 历史记录 */
.history-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
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
  width: 100%;
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
  gap: 0.625rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-color-secondary);
  gap: 0.5rem;
}

.history-item {
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-command {
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.8rem;
  color: var(--primary-color);
  background: var(--surface-100);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  word-break: break-all;
}

.history-time {
  font-size: 0.7rem;
  color: var(--text-color-secondary);
  flex-shrink: 0;
}

.history-output pre {
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.7rem;
  line-height: 1.4;
  margin: 0;
  padding: 0.375rem;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 80px;
  overflow-y: auto;
  background: var(--surface-50);
  color: var(--text-color);
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.7rem;
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
  gap: 0.25rem;
  justify-content: flex-end;
}
</style>
