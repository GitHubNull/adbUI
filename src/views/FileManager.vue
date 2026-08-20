<script setup lang="ts">
import { watch } from 'vue';
import type { DeviceInfo } from '../types/device';
import { useFiles } from '../composables/useFiles';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const {
  files,
  loading,
  currentPath,
  pathSegments,
  fetchFiles,
  navigateTo,
  navigateUp,
  pullFile,
  pushFile,
} = useFiles();

// 监听选中设备变化
watch(
  () => props.selectedDevice,
  (device) => {
    if (device) {
      fetchFiles(device.id);
    } else {
      files.value = [];
    }
  },
  { immediate: true }
);

function formatSize(size: number): string {
  if (size === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx++;
  }
  return `${value.toFixed(1)} ${units[unitIdx]}`;
}

function getFileIcon(item: { is_dir: boolean; name: string }): string {
  if (item.is_dir) return 'pi pi-folder';
  if (item.name.endsWith('.apk')) return 'pi pi-android';
  if (item.name.endsWith('.txt') || item.name.endsWith('.md')) return 'pi pi-file-edit';
  if (item.name.endsWith('.zip') || item.name.endsWith('.tar') || item.name.endsWith('.gz')) return 'pi pi-box';
  if (item.name.endsWith('.jpg') || item.name.endsWith('.png') || item.name.endsWith('.gif')) return 'pi pi-image';
  if (item.name.endsWith('.mp4') || item.name.endsWith('.avi') || item.name.endsWith('.mkv')) return 'pi pi-video';
  if (item.name.endsWith('.mp3') || item.name.endsWith('.wav') || item.name.endsWith('.flac')) return 'pi pi-volume-up';
  return 'pi pi-file';
}

async function onNavigateTo(path: string) {
  if (props.selectedDevice) {
    await navigateTo(props.selectedDevice.id, path);
  }
}

async function onNavigateUp() {
  if (props.selectedDevice) {
    await navigateUp(props.selectedDevice.id);
  }
}

async function onRefresh() {
  if (props.selectedDevice) {
    await fetchFiles(props.selectedDevice.id);
  }
}

async function onDownload(item: { path: string; name: string }) {
  if (!props.selectedDevice) return;
  try {
    const result = await pullFile(props.selectedDevice.id, item.path, item.name);
    if (result) {
      emit('toast', result.stdout, 'success');
    }
  } catch (err) {
    emit('toast', String(err), 'error');
  }
}

async function onUpload() {
  if (!props.selectedDevice) return;
  try {
    const result = await pushFile(props.selectedDevice.id, currentPath.value);
    if (result) {
      emit('toast', result.stdout, 'success');
      await fetchFiles(props.selectedDevice.id);
    }
  } catch (err) {
    emit('toast', String(err), 'error');
  }
}
</script>

<template>
  <div class="file-manager">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="page-title">
          <i class="pi pi-folder page-icon"></i>
          文件管理
        </h2>
      </div>
      <div class="toolbar-right">
        <Button
          icon="pi pi-arrow-up"
          label="上级"
          text
          :disabled="currentPath === '/'"
          @click="onNavigateUp"
        />
        <Button
          icon="pi pi-refresh"
          label="刷新"
          text
          @click="onRefresh"
        />
        <Button
          icon="pi pi-upload"
          label="上传文件"
          @click="onUpload"
        />
      </div>
    </div>

    <!-- Path Breadcrumb -->
    <div class="breadcrumb-bar">
      <span class="breadcrumb-label">当前路径：</span>
      <span class="breadcrumb-root" @click="onNavigateTo('/')">/</span>
      <span
        v-for="seg in pathSegments"
        :key="seg.path"
        class="breadcrumb-segment"
      >
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-link" @click="onNavigateTo(seg.path)">
          {{ seg.name }}
        </span>
      </span>
    </div>

    <!-- File List -->
    <div class="file-list-panel">
      <DataTable
        v-if="props.selectedDevice"
        :value="files"
        striped-rows
        class="file-table"
      >
        <Column field="name" header="名称">
          <template #body="{ data }">
            <div class="file-name-cell">
              <i :class="getFileIcon(data)" class="file-icon"></i>
              <span
                :class="{ 'dir-name': data.is_dir }"
                @click="data.is_dir ? onNavigateTo(data.path) : null"
              >
                {{ data.name }}
              </span>
            </div>
          </template>
        </Column>

        <Column field="size" header="大小" style="width: 120px">
          <template #body="{ data }">
            {{ formatSize(data.size) }}
          </template>
        </Column>

        <Column field="permissions" header="权限" style="width: 100px">
          <template #body="{ data }">
            <span class="font-mono text-sm">{{ data.permissions }}</span>
          </template>
        </Column>

        <Column field="modified_time" header="修改时间" style="width: 160px" />

        <Column header="操作" style="width: 100px">
          <template #body="{ data }">
            <Button
              v-if="!data.is_dir"
              icon="pi pi-download"
              text
              size="small"
              v-tooltip.top="'下载'"
              @click="onDownload(data)"
            />
          </template>
        </Column>
      </DataTable>

      <!-- Empty State -->
      <div v-if="!props.selectedDevice" class="empty-state">
        <i class="pi pi-mobile empty-icon"></i>
        <h3>未选择设备</h3>
        <p>请先在设备管理页面选择一个设备</p>
      </div>

      <div v-else-if="files.length === 0 && !loading" class="empty-state">
        <i class="pi pi-folder-open empty-icon"></i>
        <h3>目录为空</h3>
        <p>当前目录下没有文件或子目录</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.5rem;
  gap: 1rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--surface-200);
  flex-wrap: wrap;
  gap: 1rem;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.page-icon {
  color: var(--primary-color);
  font-size: 1.5rem;
}

.breadcrumb-bar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: var(--surface-100);
  border-radius: 6px;
  font-size: 0.875rem;
  flex-wrap: wrap;
}

.breadcrumb-label {
  color: var(--text-color-secondary);
}

.breadcrumb-root,
.breadcrumb-link {
  color: var(--primary-color);
  cursor: pointer;
}

.breadcrumb-root:hover,
.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  color: var(--text-color-secondary);
}

.file-list-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.file-table {
  border-radius: 8px;
  overflow: hidden;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-icon {
  color: var(--primary-color);
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.dir-name {
  color: var(--primary-color);
  cursor: pointer;
}

.dir-name:hover {
  text-decoration: underline;
}

.font-mono {
  font-family: 'Courier New', monospace;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  color: var(--surface-400);
}

.empty-state h3 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  color: var(--text-color);
}

.empty-state p {
  margin: 0;
}
</style>
