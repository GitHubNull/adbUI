<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { DeviceInfo, AppInfo, TaskInfo } from '../types/device';
import { useApps } from '../composables/useApps';
import { useAppIcons } from '../composables/useAppIcons';
import { useSettings } from '../composables/useSettings';
import AppToolbar from '../components/app-manager/AppToolbar.vue';
import AppTable from '../components/app-manager/AppTable.vue';
import AppConfirmDialog from '../components/app-manager/AppConfirmDialog.vue';

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

const { settings } = useSettings();
// 应用图标:内存缓存 + 批量加载(后端磁盘缓存命中时秒显)
const { icons, loadIcons, clearIcons } = useAppIcons();

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
    clearIcons(); // 清空旧设备图标,避免错位残留
    if (device) {
      fetchApps(device.id, currentFilter.value);
    } else {
      apps.value = [];
    }
  },
  { immediate: true }
);

// 应用列表就绪后并行批量加载图标(磁盘缓存命中时秒显,缺失包设备端提取)
watch(apps, (list) => {
  if (props.selectedDevice && list.length > 0) {
    loadIcons(props.selectedDevice.id, list, settings.value.iconCacheDir);
  }
});

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
    <AppToolbar
      v-model:current-filter="currentFilter"
      v-model:search-query="searchQuery"
      :selected-count="selectedApps.length"
      @filter-change="onFilterChange"
      @install-apk="onInstallApk"
      @batch-uninstall="onBatchUninstall"
    />

    <!-- App List -->
    <div class="app-list-panel">
      <AppTable
        v-if="props.selectedDevice"
        :apps="filteredApps"
        :loading="loading"
        :icons="icons"
        v-model:selected-apps="selectedApps"
        @force-stop="onForceStop"
        @clear-data="(app) => openConfirm('clear', app, `确定要清除 ${app.app_name} 的所有数据吗？此操作不可恢复。`)"
        @freeze="onFreeze"
        @extract-apk="onExtractApk"
        @uninstall="(app) => openConfirm('uninstall', app, `确定要卸载 ${app.app_name} 吗？`)"
      />

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
    <AppConfirmDialog
      v-model:visible="confirmVisible"
      :message="confirmMessage"
      @confirm="executeConfirmed"
    />
  </div>
</template>

<style scoped src="../components/app-manager/app-manager.css">
</style>
