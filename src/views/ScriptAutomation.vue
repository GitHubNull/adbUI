<script setup lang="ts">
import { ref, computed } from 'vue';
import { useScripts, SCRIPT_TEMPLATES } from '../composables/useScripts';
import { useControl, REBOOT_MODES, COMMON_KEYS } from '../composables/useControl';
import type { DeviceInfo, RebootMode } from '../types/device';

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

// ============ 设备控制（从 DeviceControl 合并） ============
const { reboot, tap, longPress, swipe, keyevent, inputText } = useControl();

// 重启
const showRebootConfirm = ref(false);
const pendingReboot = ref<RebootMode | null>(null);
const rebooting = ref(false);

function confirmReboot(mode: RebootMode) {
  pendingReboot.value = mode;
  showRebootConfirm.value = true;
}

async function doReboot() {
  if (!props.selectedDevice || !pendingReboot.value) return;
  showRebootConfirm.value = false;
  rebooting.value = true;
  try {
    await reboot(props.selectedDevice.id, pendingReboot.value);
    emit('toast', '重启指令已发送，设备离线后请稍候重新连接', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  } finally {
    rebooting.value = false;
    pendingReboot.value = null;
  }
}

function rebootModeName(id: RebootMode | null): string {
  return REBOOT_MODES.find((m) => m.id === id)?.name || '';
}

// 输入模拟
const tapX = ref(540);
const tapY = ref(1200);
const swipeX1 = ref(540);
const swipeY1 = ref(1500);
const swipeX2 = ref(540);
const swipeY2 = ref(500);
const swipeDuration = ref(300);
const inputTextValue = ref('');

function validCoord(...vals: number[]): boolean {
  return vals.every((v) => Number.isFinite(v) && v >= 0);
}

async function onTap() {
  if (!props.selectedDevice) return;
  if (!validCoord(tapX.value, tapY.value)) {
    emit('toast', '坐标非法', 'warn');
    return;
  }
  try {
    await tap(props.selectedDevice.id, tapX.value, tapY.value);
    emit('toast', '已发送点击指令', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onLongPress() {
  if (!props.selectedDevice) return;
  if (!validCoord(tapX.value, tapY.value)) {
    emit('toast', '坐标非法', 'warn');
    return;
  }
  try {
    await longPress(props.selectedDevice.id, tapX.value, tapY.value);
    emit('toast', '已发送长按指令', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onSwipe() {
  if (!props.selectedDevice) return;
  if (!validCoord(swipeX1.value, swipeY1.value, swipeX2.value, swipeY2.value)) {
    emit('toast', '坐标非法', 'warn');
    return;
  }
  try {
    await swipe(props.selectedDevice.id, swipeX1.value, swipeY1.value, swipeX2.value, swipeY2.value, swipeDuration.value);
    emit('toast', '已发送滑动指令', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onKeyevent(keycode: string) {
  if (!props.selectedDevice) return;
  try {
    await keyevent(props.selectedDevice.id, keycode);
    emit('toast', `已发送按键 ${keycode}`, 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onInputText() {
  if (!props.selectedDevice) return;
  if (!inputTextValue.value) {
    emit('toast', '请输入文本', 'warn');
    return;
  }
  try {
    await inputText(props.selectedDevice.id, inputTextValue.value);
    emit('toast', '已发送文本输入', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

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

        <!-- 输入模拟（从设备控制合并） -->
        <div class="card">
          <h3 class="card-title">输入模拟</h3>

          <div class="field">
            <label>点击 / 长按坐标</label>
            <div class="input-row">
              <InputNumber v-model="tapX" placeholder="X" />
              <InputNumber v-model="tapY" placeholder="Y" />
              <Button label="点击" size="small" @click="onTap" />
              <Button label="长按" size="small" outlined @click="onLongPress" />
            </div>
          </div>

          <Divider />

          <div class="field">
            <label>滑动（起点 → 终点 + 时长 ms）</label>
            <div class="input-row">
              <InputNumber v-model="swipeX1" placeholder="X1" />
              <InputNumber v-model="swipeY1" placeholder="Y1" />
              <InputNumber v-model="swipeX2" placeholder="X2" />
              <InputNumber v-model="swipeY2" placeholder="Y2" />
              <InputNumber v-model="swipeDuration" placeholder="时长" />
              <Button label="滑动" size="small" @click="onSwipe" />
            </div>
          </div>

          <Divider />

          <div class="field">
            <label>物理按键</label>
            <div class="key-grid">
              <Button
                v-for="k in COMMON_KEYS"
                :key="k.keycode"
                :label="k.name"
                size="small"
                outlined
                @click="onKeyevent(k.keycode)"
              />
            </div>
          </div>

          <Divider />

          <div class="field">
            <label>文本输入（仅支持 ASCII）</label>
            <div class="input-row">
              <InputText v-model="inputTextValue" placeholder="输入文本" class="flex-1" />
              <Button label="发送" size="small" @click="onInputText" />
            </div>
          </div>
        </div>

        <!-- 重启模式（从设备控制合并） -->
        <div class="card">
          <h3 class="card-title">重启模式</h3>
          <div class="reboot-grid">
            <div
              v-for="mode in REBOOT_MODES"
              :key="mode.id"
              :class="['reboot-card', { danger: mode.danger }]"
            >
              <div class="reboot-name">{{ mode.name }}</div>
              <div class="reboot-desc">{{ mode.description }}</div>
              <Button
                label="执行"
                size="small"
                :severity="mode.danger ? 'danger' : 'primary'"
                :loading="rebooting"
                @click="confirmReboot(mode.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 重启确认框 -->
    <Dialog v-model:visible="showRebootConfirm" header="确认重启" :modal="true" :style="{ width: '420px' }">
      <p>
        确定要重启到 <strong>{{ rebootModeName(pendingReboot) }}</strong> 吗？
      </p>
      <p class="warn-text">设备将立即重启，当前连接会断开，正在进行的操作可能丢失。</p>
      <template #footer>
        <Button label="取消" text @click="showRebootConfirm = false" />
        <Button label="确认重启" severity="danger" @click="doReboot" />
      </template>
    </Dialog>
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

/* 从 DeviceControl 合并的样式 */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.key-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.5rem;
}

.reboot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.reboot-card {
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  align-items: flex-start;
}

.reboot-card.danger {
  border-color: var(--red-300);
  background: var(--red-50);
}

.reboot-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.reboot-desc {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.flex-1 {
  flex: 1;
}

.warn-text {
  color: var(--red-500);
  font-size: 0.875rem;
}
</style>
