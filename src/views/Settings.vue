<script setup lang="ts">
import { useSettings } from '../composables/useSettings';
import { open } from '@tauri-apps/plugin-dialog';

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const { settings, save, reset } = useSettings();

// 环境检测:浏览器 mock 模式无目录选择对话框
function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

function onSave() {
  save();
  emit('toast', '设置已保存', 'success');
}

function onReset() {
  reset();
  emit('toast', '设置已恢复默认', 'info');
}

// 浏览选择应用图标缓存目录
async function onBrowseIconDir() {
  if (!isTauri()) return;
  const selected = await open({ directory: true });
  if (selected && typeof selected === 'string') {
    settings.value.iconCacheDir = selected;
  }
}
</script>

<template>
  <div class="settings-view">
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-cog page-icon"></i>
        设置
      </h2>
    </div>

    <div class="card">
      <h3 class="card-title">通用</h3>

      <div class="field">
        <label>ADB 路径（预留，桌面化阶段生效；留空使用内置 adb_client 库）</label>
        <InputText v-model="settings.adbPath" placeholder="留空使用内置库" class="w-full" />
      </div>

      <div class="field">
        <label>主题</label>
        <Dropdown
          v-model="settings.theme"
          :options="[
            { label: '浅色', value: 'light' },
            { label: '深色', value: 'dark' },
          ]"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>

      <div class="field">
        <label>默认命令超时（秒）</label>
        <InputNumber v-model="settings.defaultTimeout" :min="1" :max="120" class="w-full" />
      </div>

      <div class="field">
        <label>设备轮询间隔（毫秒）</label>
        <InputNumber v-model="settings.pollingInterval" :min="1000" :max="30000" :step="500" class="w-full" />
      </div>

      <div class="field">
        <label>应用图标缓存目录（相对路径基于应用启动运行目录，默认 ./cache/icons）</label>
        <div class="icon-dir-row">
          <InputText v-model="settings.iconCacheDir" placeholder="./cache/icons" class="w-full" />
          <Button v-if="isTauri()" icon="pi pi-folder-open" text @click="onBrowseIconDir" v-tooltip.top="'浏览目录'" />
        </div>
      </div>

      <div class="input-row">
        <Button label="保存" icon="pi pi-check" @click="onSave" />
        <Button label="恢复默认" icon="pi pi-undo" text severity="danger" @click="onReset" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
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

.card {
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 560px;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
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

.w-full {
  width: 100%;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.icon-dir-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>
