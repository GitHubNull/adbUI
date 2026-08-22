<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useScreenshot } from '../composables/useScreenshot';
import type { DeviceInfo } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const {
  screenshot,
  loading,
  recordState,
  recordElapsed,
  recordSupported,
  takeScreenshot,
  saveScreenshot,
  checkRecordSupport,
  startRecord,
  stopRecord,
  formatElapsed,
} = useScreenshot();

// ============================================
// 自适应缩放设置（默认开启，localStorage 持久化）
// ============================================

const AUTOFIT_STORAGE_KEY = 'adb-ui-screenshot-autofit';
const FRAME_MARGIN = 32;     // 手机框外围留白（px）
const INFO_BAR_HEIGHT = 40;  // 底部分辨率信息条高度（px）
const MAX_SCALE = 1;         // 不放大超过原始分辨率，保证清晰

const autoFit = ref(true);
try {
  const saved = localStorage.getItem(AUTOFIT_STORAGE_KEY);
  if (saved !== null) {
    autoFit.value = saved === 'true';
  }
} catch (e) {
  console.error('读取自适应缩放设置失败:', e);
}

watch(autoFit, (val) => {
  try {
    localStorage.setItem(AUTOFIT_STORAGE_KEY, String(val));
  } catch (e) {
    console.error('保存自适应缩放设置失败:', e);
  }
});

// 预览容器尺寸（ResizeObserver 监听，容器变化时重新计算缩放）
const previewRef = ref<HTMLElement | null>(null);
const containerSize = ref({ width: 0, height: 0 });
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (previewRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        containerSize.value = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
      }
    });
    resizeObserver.observe(previewRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// 自适应缩放系数：完整显示 + 保持宽高比，上限 1（不放大，避免模糊）
const fitScale = computed(() => {
  if (!screenshot.value || !autoFit.value) return 1;
  const availW = containerSize.value.width - FRAME_MARGIN * 2;
  const availH = containerSize.value.height - FRAME_MARGIN * 2 - INFO_BAR_HEIGHT;
  if (availW <= 0 || availH <= 0) return 0; // 容器尚未完成布局
  const scale = Math.min(availW / screenshot.value.width, availH / screenshot.value.height);
  return Math.min(Math.max(scale, 0), MAX_SCALE);
});

// 截图显示尺寸：自适应 = 分辨率 * 缩放；关闭 = 原始像素尺寸（1:1 可滚动）
const displaySize = computed(() => {
  if (!screenshot.value) return { width: 0, height: 0 };
  if (autoFit.value) {
    return {
      width: Math.round(screenshot.value.width * fitScale.value),
      height: Math.round(screenshot.value.height * fitScale.value),
    };
  }
  return { width: screenshot.value.width, height: screenshot.value.height };
});

// ============================================
// 自动截图：进入页面 / 切换设备时立即捕获最新屏幕
// ============================================

watch(() => props.selectedDevice?.id, async (deviceId) => {
  if (deviceId) {
    await checkRecordSupport(deviceId);
    const result = await takeScreenshot(deviceId);
    if (!result) {
      emit('toast', '自动截图失败，请检查设备连接', 'warn');
    }
  } else {
    recordSupported.value = null;
    screenshot.value = null;
  }
}, { immediate: true });

// ============================================
// 手动操作
// ============================================

async function onTakeScreenshot() {
  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }
  const result = await takeScreenshot(props.selectedDevice.id);
  if (result) {
    emit('toast', `截图成功 (${result.width}x${result.height})`, 'success');
  } else {
    emit('toast', '截图失败', 'error');
  }
}

async function onSaveScreenshot() {
  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }
  const path = await saveScreenshot(props.selectedDevice.id);
  if (path) {
    emit('toast', `截图已保存: ${path}`, 'success');
  }
}

async function onToggleRecord() {
  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }

  if (recordState.value.recording) {
    const result = await stopRecord(props.selectedDevice.id);
    if (result.error) {
      emit('toast', `录屏保存失败: ${result.error}`, 'error');
    } else if (result.path) {
      emit('toast', `录屏已保存: ${result.path}`, 'success');
    } else {
      emit('toast', '录屏已停止', 'info');
    }
  } else {
    const result = await startRecord(props.selectedDevice.id);
    if (result.success) {
      emit('toast', '录屏已开始', 'success');
    } else {
      emit('toast', `启动录屏失败: ${result.error}`, 'error');
    }
  }
}
</script>

<template>
  <div class="screenshot-recorder">
    <!-- 工具栏 -->
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-camera"></i>
        截图录屏
      </h2>

      <div
        v-tooltip.top="'关闭后按原始分辨率 1:1 显示，可滚动查看'"
        class="autofit-control"
      >
        <InputSwitch v-model="autoFit" input-id="screenshot-autofit" />
        <label for="screenshot-autofit" class="autofit-label">自适应缩放</label>
      </div>
    </div>

    <!-- 预览区 -->
    <div
      ref="previewRef"
      class="preview-area"
      :class="{ 'raw-mode': screenshot && !autoFit, 'center-mode': !screenshot }"
    >
      <div v-if="!selectedDevice" class="empty-state">
        <i class="pi pi-mobile"></i>
        <p>请先选择设备</p>
      </div>

      <div v-else-if="loading && !screenshot" class="empty-state">
        <ProgressSpinner style="width: 40px; height: 40px" />
        <p>正在获取屏幕...</p>
      </div>

      <div v-else-if="!screenshot" class="empty-state">
        <i class="pi pi-image"></i>
        <p>点击截图按钮捕获设备屏幕</p>
        <p class="hint" v-if="selectedDevice">设备: {{ selectedDevice.model }}</p>
      </div>

      <div v-else class="preview-content">
        <!-- 模拟手机外边框（俯视图效果） -->
        <div
          class="phone-frame"
          :style="{
            width: `${displaySize.width}px`,
            height: `${displaySize.height}px`,
          }"
        >
          <img
            :src="`data:image/png;base64,${screenshot.data}`"
            :alt="`截图 ${screenshot.width}x${screenshot.height}`"
            class="screenshot-img"
          />
        </div>
        <div class="screenshot-info">
          {{ screenshot.width }} x {{ screenshot.height }}
          <span v-if="autoFit && fitScale > 0" class="zoom-badge">
            {{ Math.round(fitScale * 100) }}%
          </span>
        </div>
      </div>

      <!-- 刷新截图时的悬浮加载指示 -->
      <div v-if="loading && screenshot" class="capture-overlay">
        <ProgressSpinner style="width: 24px; height: 24px" />
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <Button
        label="截图"
        icon="pi pi-camera"
        :loading="loading"
        :disabled="!selectedDevice || recordState.recording"
        @click="onTakeScreenshot"
      />
      <Button
        label="保存截图"
        icon="pi pi-download"
        severity="secondary"
        :disabled="!selectedDevice || !screenshot"
        @click="onSaveScreenshot"
      />

      <div class="record-section">
        <span
          v-tooltip.top="recordSupported === false ? '当前设备不支持录屏（Android 16+ / 未 root 设备受 SELinux 限制）' : null"
          class="record-button-wrapper"
        >
          <Button
            :label="recordState.recording ? '停止录屏' : '开始录屏'"
            :icon="recordState.recording ? 'pi pi-stop-circle' : 'pi pi-video'"
            :severity="recordState.recording ? 'danger' : 'secondary'"
            :disabled="!selectedDevice || recordSupported === false"
            @click="onToggleRecord"
          />
        </span>
        <span v-if="recordState.recording" class="record-timer">
          <span class="record-dot"></span>
          {{ formatElapsed(recordElapsed) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screenshot-recorder {
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

.autofit-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.autofit-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  user-select: none;
  cursor: pointer;
}

.preview-area {
  flex: 1;
  position: relative;
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  overflow: hidden;
  min-height: 0;
}

/* 无截图状态：内容居中 */
.preview-area.center-mode {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 原始尺寸模式：允许滚动查看 */
.preview-area.raw-mode {
  overflow: auto;
}

.preview-area.raw-mode .preview-content {
  padding: 16px;
}

.preview-area.raw-mode::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.preview-area.raw-mode::-webkit-scrollbar-track {
  background: transparent;
}

.preview-area.raw-mode::-webkit-scrollbar-thumb {
  background: var(--surface-300);
  border-radius: 4px;
}

.preview-area.raw-mode::-webkit-scrollbar-thumb:hover {
  background: var(--surface-400);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
  gap: 0.5rem;
}

.empty-state .pi {
  font-size: 4rem;
  color: var(--surface-300);
}

.empty-state .hint {
  font-size: 0.8125rem;
}

/* 截图内容：margin auto 居中；超出容器时 margin 归零，保证可滚动 */
.preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: fit-content;
  height: fit-content;
  margin: auto;
}

/* 模拟手机外边框：圆角中框 + 多层投影，营造俯视图效果 */
.phone-frame {
  position: relative;
  flex-shrink: 0;
  background: #000;
  border: 3px solid #1f2937;
  border-radius: 36px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.2),
    0 10px 28px rgba(0, 0, 0, 0.35),
    0 28px 72px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

/* 顶部中央摄像头挖孔装饰 */
.phone-frame::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #0b0f19;
  border: 2px solid #1f2937;
  z-index: 2;
}

.screenshot-img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 32px; /* 稍小于外框圆角，贴合内沿 */
}

.screenshot-info {
  font-size: 0.8125rem;
  color: var(--text-color-secondary);
  display: flex;
  align-items: center;
}

.zoom-badge {
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: var(--primary-color);
  color: var(--primary-color-text);
  font-size: 0.75rem;
}

.capture-overlay {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px;
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.record-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.record-button-wrapper {
  display: inline-block;
}

.record-timer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-family: monospace;
  font-size: 0.875rem;
  color: #ef4444;
  font-weight: 600;
}

.record-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
