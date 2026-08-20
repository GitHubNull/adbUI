<script setup lang="ts">
import { ref, computed } from 'vue';
import { useScripts, SCRIPT_TEMPLATES } from '../composables/useScripts';
import type { DeviceInfo } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const {
  script,
  running,
  currentLine,
  progress,
  executeScript,
  stopScript,
  importScript,
  exportScript,
} = useScripts();

const fileInput = ref<HTMLInputElement | null>(null);

// 行号列表
const lineCount = computed(() => script.value.split('\n').length);

// 指令插入模板
const SNIPPETS = [
  { label: 'tap', text: 'tap 540 1200\n' },
  { label: 'swipe', text: 'swipe 540 1500 540 500 300\n' },
  { label: 'keyevent', text: 'keyevent KEYCODE_HOME\n' },
  { label: 'text', text: 'text hello\n' },
  { label: 'sleep', text: 'sleep 1000\n' },
  { label: 'loop/end', text: 'loop 3\n  \nend\n' },
];

function insertSnippet(text: string) {
  script.value += (script.value.endsWith('\n') || script.value === '' ? '' : '\n') + text;
}

function applyTemplate(content: string) {
  script.value = content;
}

async function onExecute() {
  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }
  try {
    await executeScript(props.selectedDevice.id);
    emit('toast', '脚本执行完成', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onStop() {
  await stopScript();
  emit('toast', '脚本已停止', 'info');
}

// 导入
function triggerImport() {
  fileInput.value?.click();
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    importScript(String(reader.result || ''));
    emit('toast', '脚本已导入', 'success');
  };
  reader.readAsText(file);
  target.value = '';
}

// 导出
function onExport() {
  const content = exportScript();
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'script.adbs';
  a.click();
  URL.revokeObjectURL(url);
  emit('toast', '脚本已导出', 'success');
}
</script>

<template>
  <div class="script-automation">
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-code page-icon"></i>
        自动化脚本
      </h2>
      <div class="toolbar-right">
        <Button icon="pi pi-upload" label="导入" text @click="triggerImport" />
        <Button icon="pi pi-download" label="导出" text @click="onExport" />
        <input ref="fileInput" type="file" accept=".adbs,.txt" style="display: none" @change="onFileChange" />
      </div>
    </div>

    <div class="main-area">
      <!-- 编辑器 -->
      <div class="editor-pane">
        <div class="editor">
          <div class="line-numbers">
            <div
              v-for="n in lineCount"
              :key="n"
              :class="['line-no', { active: currentLine === n }]"
            >
              {{ n }}
            </div>
          </div>
          <textarea
            v-model="script"
            class="editor-textarea"
            spellcheck="false"
            :disabled="running"
          ></textarea>
        </div>
        <div v-if="progress" class="progress-info">
          进度: {{ progress.index + 1 }} / {{ progress.total }}（第 {{ progress.line_no }} 行 {{ progress.status }}）
        </div>
      </div>

      <!-- 工具面板 -->
      <div class="tool-pane">
        <div class="card">
          <h3 class="card-title">执行控制</h3>
          <div class="input-row">
            <Button
              label="执行"
              icon="pi pi-play"
              :disabled="running"
              @click="onExecute"
            />
            <Button
              label="停止"
              icon="pi pi-stop"
              severity="danger"
              :disabled="!running"
              @click="onStop"
            />
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">插入指令</h3>
          <div class="snippet-grid">
            <Button
              v-for="s in SNIPPETS"
              :key="s.label"
              :label="s.label"
              size="small"
              outlined
              @click="insertSnippet(s.text)"
            />
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">示例模板</h3>
          <div class="template-list">
            <Button
              v-for="t in SCRIPT_TEMPLATES"
              :key="t.name"
              :label="t.name"
              size="small"
              text
              @click="applyTemplate(t.content)"
            />
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">语法说明</h3>
          <pre class="syntax-help">tap x y
swipe x1 y1 x2 y2 ms
keyevent KEYCODE_HOME
text hello
sleep 1000
loop 3
  ...
end</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.script-automation {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.5rem;
  gap: 1rem;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--surface-200);
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.page-icon {
  color: var(--primary-color);
}

.toolbar-right {
  display: flex;
  gap: 0.5rem;
}

.main-area {
  display: flex;
  gap: 1rem;
  flex: 1;
  overflow: hidden;
}

.editor-pane {
  flex: 1.8;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
}

.editor {
  display: flex;
  flex: 1;
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-card);
}

.line-numbers {
  padding: 0.75rem 0.5rem;
  background: var(--surface-50);
  border-right: 1px solid var(--surface-200);
  text-align: right;
  user-select: none;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-color-secondary);
}

.line-no {
  padding: 0 0.5rem;
  border-radius: 4px;
}

.line-no.active {
  background: var(--primary-color);
  color: var(--primary-color-text);
  font-weight: 700;
}

.editor-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  padding: 0.75rem;
  font-family: monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  background: transparent;
  color: var(--text-color);
}

.progress-info {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  font-family: monospace;
}

.tool-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.card {
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.snippet-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
}

.syntax-help {
  margin: 0;
  font-size: 0.8rem;
  font-family: monospace;
  background: var(--surface-50);
  padding: 0.75rem;
  border-radius: 4px;
  color: var(--text-color-secondary);
  white-space: pre-wrap;
}
</style>
