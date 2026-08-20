<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useDisplay } from '../composables/useDisplay';
import type { DeviceInfo } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const { display, loading, fetchDisplayState, setDisplay, resetDisplay, setSystemParam } = useDisplay();

// ============ 分辨率 / DPI ============
const customSize = ref('');
const customDensity = ref<number | null>(null);

const SIZE_PRESETS = [
  { label: '原生', value: '' },
  { label: '1080P', value: '1080x2400' },
  { label: '720P', value: '720x1600' },
  { label: '2K', value: '1440x3200' },
];
const DENSITY_PRESETS = [
  { label: '原生', value: 0 },
  { label: '480', value: 480 },
  { label: '420', value: 420 },
  { label: '360', value: 360 },
  { label: '320', value: 320 },
];

// ============ 过扫描 ============
const overscan = ref<[number, number, number, number]>([0, 0, 0, 0]);

// ============ 系统参数 ============
const animScale = ref(1.0);
const fontScale = ref(1.0);
const lockTimeout = ref(5000);

// ============================================
// 数据加载
// ============================================

async function load() {
  if (!props.selectedDevice) return;
  const d = await fetchDisplayState(props.selectedDevice.id);
  if (d) {
    overscan.value = [...d.overscan] as [number, number, number, number];
  }
}

onMounted(load);
watch(() => props.selectedDevice?.id, load);

// ============================================
// 分辨率 / DPI 操作
// ============================================

function validSize(s: string): boolean {
  return /^\d+x\d+$/.test(s);
}

async function applySize(size: string) {
  if (!props.selectedDevice) return;
  const target = size || display.value?.default_size || '';
  if (!target) return;
  try {
    await setDisplay(props.selectedDevice.id, { size: target });
    emit('toast', `分辨率已设置为 ${target}`, 'success');
    await load();
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function applyCustomSize() {
  if (!validSize(customSize.value)) {
    emit('toast', '分辨率格式非法，应为 宽x高（如 1080x2400）', 'warn');
    return;
  }
  await applySize(customSize.value);
}

async function applyDensity(density: number) {
  if (!props.selectedDevice) return;
  const target = density || display.value?.default_density || 0;
  if (!target) return;
  try {
    await setDisplay(props.selectedDevice.id, { density: target });
    emit('toast', `密度已设置为 ${target}dpi`, 'success');
    await load();
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function applyCustomDensity() {
  if (!customDensity.value || customDensity.value <= 0) {
    emit('toast', '密度应为正整数', 'warn');
    return;
  }
  await applyDensity(customDensity.value);
}

// ============================================
// 过扫描操作
// ============================================

async function applyOverscan() {
  if (!props.selectedDevice) return;
  try {
    await setDisplay(props.selectedDevice.id, { overscan: overscan.value });
    emit('toast', '过扫描已应用', 'success');
    await load();
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function resetOverscan() {
  overscan.value = [0, 0, 0, 0];
  await applyOverscan();
}

// ============================================
// 系统参数操作
// ============================================

async function applyAnimScale(value: number) {
  if (!props.selectedDevice) return;
  animScale.value = value;
  try {
    await setSystemParam(props.selectedDevice.id, 'global', 'window_animation_scale', String(value));
    await setSystemParam(props.selectedDevice.id, 'global', 'transition_animation_scale', String(value));
    await setSystemParam(props.selectedDevice.id, 'global', 'animator_duration_scale', String(value));
    emit('toast', `动画速度已设置为 ${value}x`, 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function applyFontScale() {
  if (!props.selectedDevice) return;
  try {
    await setSystemParam(props.selectedDevice.id, 'system', 'font_scale', String(fontScale.value));
    emit('toast', `字体大小已设置为 ${fontScale.value}`, 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function applyLockTimeout() {
  if (!props.selectedDevice) return;
  try {
    await setSystemParam(props.selectedDevice.id, 'secure', 'lock_screen_lock_after_timeout', String(lockTimeout.value));
    emit('toast', `锁屏时间已设置为 ${lockTimeout.value}ms`, 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function resetSystemParams() {
  if (!props.selectedDevice) return;
  try {
    await applyAnimScale(1.0);
    fontScale.value = 1.0;
    await applyFontScale();
    emit('toast', '系统参数已恢复默认', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

// ============================================
// 恢复显示默认
// ============================================

async function onResetDisplay() {
  if (!props.selectedDevice) return;
  try {
    await resetDisplay(props.selectedDevice.id);
    emit('toast', '已恢复显示默认值', 'success');
    await load();
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}
</script>

<template>
  <div class="display-settings">
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-desktop page-icon"></i>
        显示调节
      </h2>
      <div class="toolbar-right">
        <Button icon="pi pi-refresh" text :loading="loading" @click="load" />
        <Button icon="pi pi-undo" label="恢复默认" text severity="danger" @click="onResetDisplay" />
      </div>
    </div>

    <div v-if="!selectedDevice" class="empty-state">
      <i class="pi pi-info-circle empty-icon"></i>
      <p>请先在设备管理中选择一个设备</p>
    </div>

    <template v-else>
      <!-- 当前值条 -->
      <div class="current-bar">
        <div class="current-item">
          <span class="current-label">分辨率</span>
          <span class="current-value">{{ display?.size || '-' }}</span>
        </div>
        <div class="current-item">
          <span class="current-label">密度</span>
          <span class="current-value">{{ display?.density ? display.density + 'dpi' : '-' }}</span>
        </div>
        <div class="current-item">
          <span class="current-label">过扫描</span>
          <span class="current-value">{{ display ? display.overscan.join(',') : '-' }}</span>
        </div>
      </div>

      <div class="cards">
        <!-- 分辨率 / DPI 卡片 -->
        <div class="card">
          <h3 class="card-title">分辨率 / DPI</h3>
          <div class="field">
            <label>分辨率预设</label>
            <div class="btn-group">
              <Button
                v-for="p in SIZE_PRESETS"
                :key="p.label"
                :label="p.label"
                size="small"
                :outlined="display?.size !== p.value"
                @click="applySize(p.value)"
              />
            </div>
          </div>
          <div class="field">
            <label>自定义分辨率</label>
            <div class="input-row">
              <InputText v-model="customSize" placeholder="如 1080x2400" class="flex-1" />
              <Button label="应用" size="small" @click="applyCustomSize" />
            </div>
          </div>
          <Divider />
          <div class="field">
            <label>密度预设</label>
            <div class="btn-group">
              <Button
                v-for="p in DENSITY_PRESETS"
                :key="p.label"
                :label="p.label"
                size="small"
                :outlined="display?.density !== p.value"
                @click="applyDensity(p.value)"
              />
            </div>
          </div>
          <div class="field">
            <label>自定义密度</label>
            <div class="input-row">
              <InputNumber v-model="customDensity" placeholder="如 420" class="flex-1" />
              <Button label="应用" size="small" @click="applyCustomDensity" />
            </div>
          </div>
        </div>

        <!-- 过扫描卡片 -->
        <div class="card">
          <h3 class="card-title">过扫描</h3>
          <p class="hint">Android 10+ 部分机型不支持，失败将自动重置</p>
          <div class="overscan-preview">
            <div
              class="overscan-screen"
              :style="{
                borderTopWidth: Math.max(0, overscan[1]) / 4 + 'px',
                borderRightWidth: Math.max(0, overscan[2]) / 4 + 'px',
                borderBottomWidth: Math.max(0, overscan[3]) / 4 + 'px',
                borderLeftWidth: Math.max(0, overscan[0]) / 4 + 'px',
              }"
            ></div>
          </div>
          <div v-for="(label, i) in ['左', '上', '右', '下']" :key="i" class="field">
            <label>{{ label }}: {{ overscan[i] }}px</label>
            <Slider v-model="overscan[i]" :min="-200" :max="200" :step="10" />
          </div>
          <div class="input-row">
            <Button label="应用" size="small" @click="applyOverscan" />
            <Button label="重置" size="small" text severity="danger" @click="resetOverscan" />
          </div>
        </div>

        <!-- 系统参数卡片 -->
        <div class="card">
          <h3 class="card-title">系统参数</h3>
          <div class="field">
            <label>动画速度</label>
            <div class="btn-group">
              <Button label="关闭" size="small" :outlined="animScale !== 0" @click="applyAnimScale(0)" />
              <Button label="0.5x" size="small" :outlined="animScale !== 0.5" @click="applyAnimScale(0.5)" />
              <Button label="1x" size="small" :outlined="animScale !== 1" @click="applyAnimScale(1)" />
            </div>
          </div>
          <div class="field">
            <label>自定义动画: {{ animScale }}x</label>
            <Slider v-model="animScale" :min="0" :max="10" :step="0.5" @change="applyAnimScale(animScale)" />
          </div>
          <Divider />
          <div class="field">
            <label>字体大小: {{ fontScale }}</label>
            <Slider v-model="fontScale" :min="0.85" :max="1.3" :step="0.05" />
            <Button label="应用" size="small" class="mt" @click="applyFontScale" />
          </div>
          <Divider />
          <div class="field">
            <label>锁屏时间（毫秒，0 表示立即）</label>
            <div class="input-row">
              <InputNumber v-model="lockTimeout" :min="0" class="flex-1" />
              <Button label="应用" size="small" @click="applyLockTimeout" />
            </div>
          </div>
          <Divider />
          <Button label="恢复默认" text severity="danger" @click="resetSystemParams" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.display-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.5rem;
  gap: 1rem;
  overflow: auto;
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

.current-bar {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
}

.current-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.current-label {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.current-value {
  font-size: 1.1rem;
  font-weight: 600;
  font-family: monospace;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
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
  font-size: 1rem;
  font-weight: 600;
}

.hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--orange-500);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.flex-1 {
  flex: 1;
}

.mt {
  margin-top: 0.5rem;
  align-self: flex-start;
}

.overscan-preview {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.overscan-screen {
  width: 120px;
  height: 240px;
  border: 2px solid var(--primary-color);
  border-radius: 12px;
  background: var(--surface-100);
  transition: border-width 0.2s;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--surface-400);
}
</style>
