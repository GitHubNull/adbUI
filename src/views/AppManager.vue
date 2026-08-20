<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { DeviceInfo, AppInfo, TaskInfo } from '../types/device';
import { useApps } from '../composables/useApps';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const {
  apps,
  loading,
  currentFilter,
  searchQuery,
  fetchApps,
  uninstallApp,
  forceStopApp,
  clearAppData,
  freezeApp,
  unfreezeApp,
  extractApk,
  installApk,
  batchUninstall,
} = useApps();

const selectedApps = ref<AppInfo[]>([]);
const confirmVisible = ref(false);
const confirmAction = ref('');
const confirmTarget = ref<AppInfo | null>(null);
const confirmMessage = ref('');

// 记录正在进行的批量卸载任务 ID，用于监听完成事件后刷新列表
const pendingBatchTaskId = ref<string | null>(null);
let taskUnlisten: UnlistenFn | null = null;

// ============================================
// 批量卸载完成监听
// ============================================

async function setupTaskListener() {
  if (taskUnlisten) return;
  try {
    taskUnlisten = await listen<TaskInfo>('task-progress', (event) => {
      const task = event.payload;
      // 只处理我们发起的批量卸载任务
      if (task.id === pendingBatchTaskId.value && task.status === 'Completed') {
        pendingBatchTaskId.value = null;
        if (props.selectedDevice) {
          fetchApps(props.selectedDevice.id, currentFilter.value);
        }
        emit('toast', '批量卸载完成，列表已刷新', 'success');
      }
    });
  } catch (err) {
    console.error('Failed to listen task progress:', err);
  }
}

function teardownTaskListener() {
  if (taskUnlisten) {
    taskUnlisten();
    taskUnlisten = null;
  }
}

// 过滤后的应用列表（本地过滤，切换筛选即时生效且与类型标签一致）
const filteredApps = computed(() => {
  let result = apps.value;
  if (currentFilter.value === 'user') {
    result = result.filter((a) => !a.is_system);
  } else if (currentFilter.value === 'system') {
    result = result.filter((a) => a.is_system);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (a) =>
        a.app_name.toLowerCase().includes(q) ||
        a.package_name.toLowerCase().includes(q)
    );
  }
  return result;
});

// 监听选中设备变化
watch(
  () => props.selectedDevice,
  (device) => {
    if (device) {
      fetchApps(device.id, currentFilter.value);
    } else {
      apps.value = [];
    }
  },
  { immediate: true }
);

// 生命周期：挂载时注册任务监听，卸载时清理
onMounted(() => {
  setupTaskListener();
});

onUnmounted(() => {
  teardownTaskListener();
});

function onFilterChange(event: any) {
  const filter = event.value as string;
  currentFilter.value = filter as any;
  // 类型过滤为本地即时过滤，无需重新请求后端
  selectedApps.value = [];
}

function getAppTypeSeverity(app: AppInfo): string {
  return app.is_system ? 'info' : 'success';
}

function getAppTypeLabel(app: AppInfo): string {
  return app.is_system ? '系统' : '用户';
}

function getStatusSeverity(app: AppInfo): string {
  return app.is_enabled ? 'success' : 'danger';
}

function getStatusLabel(app: AppInfo): string {
  return app.is_enabled ? '已启用' : '已冻结';
}

// ============================================
// 确认弹窗
// ============================================

function openConfirm(action: string, app: AppInfo, message: string) {
  confirmAction.value = action;
  confirmTarget.value = app;
  confirmMessage.value = message;
  confirmVisible.value = true;
}

async function executeConfirmed() {
  if (!confirmTarget.value || !props.selectedDevice) return;

  const deviceId = props.selectedDevice.id;
  const pkg = confirmTarget.value.package_name;

  try {
    let result;
    switch (confirmAction.value) {
      case 'uninstall':
        result = await uninstallApp(deviceId, pkg);
        break;
      case 'clear':
        result = await clearAppData(deviceId, pkg);
        break;
      default:
        return;
    }

    if (result.exit_code === 0) {
      emit('toast', '操作成功', 'success');
      fetchApps(deviceId, currentFilter.value);
    } else {
      emit('toast', result.stderr || '操作失败', 'error');
    }
  } catch (err) {
    emit('toast', String(err), 'error');
  }

  confirmVisible.value = false;
}

// ============================================
// 快速操作（无需确认）
// ============================================

async function onForceStop(app: AppInfo) {
  if (!props.selectedDevice) return;
  try {
    await forceStopApp(props.selectedDevice.id, app.package_name);
    emit('toast', '已强制停止', 'success');
  } catch (err) {
    emit('toast', String(err), 'error');
  }
}

async function onFreeze(app: AppInfo) {
  if (!props.selectedDevice) return;
  try {
    if (app.is_enabled) {
      await freezeApp(props.selectedDevice.id, app.package_name);
      emit('toast', '应用已冻结', 'success');
    } else {
      await unfreezeApp(props.selectedDevice.id, app.package_name);
      emit('toast', '应用已解冻', 'success');
    }
    fetchApps(props.selectedDevice.id, currentFilter.value);
  } catch (err) {
    emit('toast', String(err), 'error');
  }
}

async function onExtractApk(app: AppInfo) {
  if (!props.selectedDevice) return;
  try {
    const result = await extractApk(props.selectedDevice.id, app.package_name);
    if (result) {
      emit('toast', result.stdout, 'success');
    }
  } catch (err) {
    emit('toast', String(err), 'error');
  }
}

async function onInstallApk() {
  if (!props.selectedDevice) return;
  try {
    const result = await installApk(props.selectedDevice.id);
    if (result) {
      emit('toast', result.stdout, 'success');
      fetchApps(props.selectedDevice.id, currentFilter.value);
    }
  } catch (err) {
    emit('toast', String(err), 'error');
  }
}

// ============================================
// 批量操作
// ============================================

async function onBatchUninstall() {
  if (!props.selectedDevice || selectedApps.value.length === 0) return;
  const packages = selectedApps.value.map((a) => a.package_name);
  try {
    const taskId = await batchUninstall(props.selectedDevice.id, packages);
    pendingBatchTaskId.value = taskId;
    emit('toast', '批量卸载任务已启动', 'info');
    selectedApps.value = [];
  } catch (err) {
    emit('toast', String(err), 'error');
  }
}
</script>

<template>
  <div class="app-manager">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="page-title">
          <i class="pi pi-th-large page-icon"></i>
          应用管理
        </h2>
        <SelectButton
          v-model="currentFilter"
          :options="[
            { label: '全部', value: 'all' },
            { label: '用户应用', value: 'user' },
            { label: '系统应用', value: 'system' },
          ]"
          option-label="label"
          option-value="value"
          @change="onFilterChange"
        />
      </div>
      <div class="toolbar-right">
        <InputText
          v-model="searchQuery"
          placeholder="搜索应用..."
          class="search-input"
        />
        <Button
          icon="pi pi-upload"
          label="安装 APK"
          @click="onInstallApk"
        />
        <Button
          v-if="selectedApps.length > 0"
          icon="pi pi-trash"
          label="批量卸载"
          severity="danger"
          @click="onBatchUninstall"
        />
      </div>
    </div>

    <!-- App List -->
    <div class="app-list-panel">
      <DataTable
        v-if="props.selectedDevice"
        :value="filteredApps"
        v-model:selection="selectedApps"
        data-key="package_name"
        striped-rows
        :loading="loading"
        class="app-table"
      >
        <Column selection-mode="multiple" style="width: 40px" />

        <Column field="app_name" header="应用名">
          <template #body="{ data }">
            <div class="app-name-cell">
              <span class="font-medium">{{ data.app_name }}</span>
              <Tag
                :value="getAppTypeLabel(data)"
                :severity="getAppTypeSeverity(data)"
                class="type-tag"
              />
            </div>
          </template>
        </Column>

        <Column field="package_name" header="包名">
          <template #body="{ data }">
            <span class="font-mono text-sm">{{ data.package_name }}</span>
          </template>
        </Column>

        <Column header="版本" style="width: 120px">
          <template #body="{ data }">
            <span>{{ data.version_code || data.version_name || '—' }}</span>
          </template>
        </Column>

        <Column field="status" header="状态" style="width: 100px">
          <template #body="{ data }">
            <Tag
              :value="getStatusLabel(data)"
              :severity="getStatusSeverity(data)"
              class="status-tag"
            />
          </template>
        </Column>

        <Column header="操作" style="width: 280px">
          <template #body="{ data }">
            <div class="action-buttons">
              <Button
                icon="pi pi-stop"
                text
                size="small"
                v-tooltip.top="'强制停止'"
                @click="onForceStop(data)"
              />
              <Button
                icon="pi pi-eraser"
                text
                size="small"
                v-tooltip.top="'清除数据'"
                @click="openConfirm('clear', data, `确定要清除 ${data.app_name} 的所有数据吗？此操作不可恢复。`)"
              />
              <Button
                :icon="data.is_enabled ? 'pi pi-lock' : 'pi pi-lock-open'"
                text
                size="small"
                v-tooltip.top="data.is_enabled ? '冻结应用' : '解冻应用'"
                @click="onFreeze(data)"
              />
              <Button
                icon="pi pi-download"
                text
                size="small"
                v-tooltip.top="'提取 APK'"
                @click="onExtractApk(data)"
              />
              <Button
                icon="pi pi-trash"
                text
                size="small"
                severity="danger"
                v-tooltip.top="'卸载'"
                @click="openConfirm('uninstall', data, `确定要卸载 ${data.app_name} 吗？`)"
              />
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- Empty State -->
      <div v-if="!props.selectedDevice" class="empty-state">
        <i class="pi pi-mobile empty-icon"></i>
        <h3>未选择设备</h3>
        <p>请先在设备管理页面选择一个设备</p>
      </div>

      <div v-else-if="filteredApps.length === 0 && !loading" class="empty-state">
        <i class="pi pi-search empty-icon"></i>
        <h3>未找到应用</h3>
        <p>当前筛选条件下没有匹配的应用</p>
      </div>
    </div>

    <!-- Confirm Dialog -->
    <Dialog v-model:visible="confirmVisible" modal header="确认操作" :style="{ width: '400px' }">
      <p>{{ confirmMessage }}</p>
      <template #footer>
        <Button label="取消" text @click="confirmVisible = false" />
        <Button label="确认" severity="danger" @click="executeConfirmed" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.app-manager {
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

.search-input {
  width: 200px;
}

.app-list-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.app-table {
  border-radius: 8px;
  overflow: hidden;
}

.app-name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.type-tag {
  font-size: 0.7rem;
}

.status-tag {
  font-size: 0.75rem;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
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
