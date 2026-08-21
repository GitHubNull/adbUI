<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useShell } from '../composables/useShell';
import type { DeviceInfo } from '../types/device';

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
</style>
