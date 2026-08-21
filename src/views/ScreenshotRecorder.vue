<script setup lang="ts">
import { watch } from 'vue';
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

// 监听设备切换，检测录屏支持
watch(() => props.selectedDevice, async (newDevice) => {
  if (newDevice) {
    await checkRecordSupport(newDevice.id);
  } else {
    recordSupported.value = null;
  }
}, { immediate: true });

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
    </div>

    <!-- 预览区 -->
    <div class="preview-area">
      <div v-if="!selectedDevice" class="empty-state">
        <i class="pi pi-mobile"></i>
        <p>请先选择设备</p>
      </div>

      <div v-else-if="!screenshot" class="empty-state">
        <i class="pi pi-image"></i>
        <p>点击截图按钮捕获设备屏幕</p>
        <p class="hint" v-if="selectedDevice">设备: {{ selectedDevice.model }}</p>
      </div>

      <div v-else class="screenshot-preview">
        <img
          :src="`data:image/png;base64,${screenshot.data}`"
          :alt="`截图 ${screenshot.width}x${screenshot.height}`"
          class="screenshot-img"
        />
        <div class="screenshot-info">
          {{ screenshot.width }} x {{ screenshot.height }}
        </div>
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

.preview-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  overflow: hidden;
  min-height: 0;
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

.screenshot-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  max-width: 100%;
  max-height: 100%;
  padding: 1rem;
}

.screenshot-img {
  max-width: 100%;
  max-height: calc(100% - 40px);
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.screenshot-info {
  font-size: 0.8125rem;
  color: var(--text-color-secondary);
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
