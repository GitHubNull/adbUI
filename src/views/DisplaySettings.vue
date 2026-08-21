<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useDisplay } from '../composables/useDisplay';
import type { DeviceInfo } from '../types/device';
import DisplayPresets from '../components/display-settings/DisplayPresets.vue';
import OverscanPanel from '../components/display-settings/OverscanPanel.vue';
import SystemParamsPanel from '../components/display-settings/SystemParamsPanel.vue';
import Button from 'primevue/button';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const { display, loading, fetchDisplayState, setDisplay, resetDisplay, setSystemParam } = useDisplay();

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
        <DisplayPresets
          :display="display"
          @apply-size="applySize"
          @apply-density="applyDensity"
          @toast="(msg, sev) => emit('toast', msg, sev)"
        />
        <OverscanPanel
          v-model:overscan="overscan"
          @apply="applyOverscan"
          @reset="resetOverscan"
        />
        <SystemParamsPanel
          v-model:anim-scale="animScale"
          v-model:font-scale="fontScale"
          v-model:lock-timeout="lockTimeout"
          @apply-anim-scale="applyAnimScale"
          @apply-font-scale="applyFontScale"
          @apply-lock-timeout="applyLockTimeout"
          @reset-system-params="resetSystemParams"
        />
      </div>
    </template>
  </div>
</template>

<style scoped src="../components/display-settings/display-settings.css">
</style>
