<script setup lang="ts">
import { ref, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import ContextMenu from 'primevue/contextmenu';
import type { MenuItem } from 'primevue/menuitem';
import type {
  DataTableRowContextMenuEvent,
  DataTableRowDoubleClickEvent,
} from 'primevue/datatable';
import type { AppInfo, AppIconMap } from '../../types/device';

defineProps<{
  apps: AppInfo[];
  loading: boolean;
  selectedApps: AppInfo[];
  icons: AppIconMap;
}>();

const emit = defineEmits<{
  (e: 'update:selectedApps', value: AppInfo[]): void;
  (e: 'forceStop', app: AppInfo): void;
  (e: 'clearData', app: AppInfo): void;
  (e: 'freeze', app: AppInfo): void;
  (e: 'extractApk', app: AppInfo): void;
  (e: 'uninstall', app: AppInfo): void;
  (e: 'viewDetail', app: AppInfo): void;
}>();

// 行背景区分：用户应用 / 系统应用不同底色
function getRowClass(app: AppInfo): string {
  return app.is_system ? 'app-row-system' : 'app-row-user';
}

// 应用类型分类说明（Tooltip 文案）
function getAppTypeTip(app: AppInfo): string {
  return app.is_system
    ? '系统应用：设备系统预装应用，通常不可卸载'
    : '用户应用：通过安装包或应用商店安装的应用，可自由卸载';
}

function getStatusSeverity(app: AppInfo): string {
  return app.is_enabled ? 'success' : 'danger';
}

function getStatusLabel(app: AppInfo): string {
  return app.is_enabled ? '已启用' : '已冻结';
}

// ============================================
// 右键菜单 + 双击查看详情
// ============================================

const cm = ref();
const contextApp = ref<AppInfo | null>(null);

// 右键菜单模型：随当前右键目标动态生成（冻结/解冻文案与图标随状态切换）
const menuModel = computed<MenuItem[]>(() => {
  const app = contextApp.value;
  const run = (fn: (a: AppInfo) => void) => () => {
    if (app) fn(app);
  };
  return [
    {
      label: '查看详情',
      icon: 'pi pi-info-circle',
      command: run((a) => emit('viewDetail', a)),
    },
    { separator: true },
    {
      label: '强制停止',
      icon: 'pi pi-stop',
      command: run((a) => emit('forceStop', a)),
    },
    {
      label: '清除数据',
      icon: 'pi pi-eraser',
      command: run((a) => emit('clearData', a)),
    },
    {
      label: app?.is_enabled ? '冻结应用' : '解冻应用',
      icon: app?.is_enabled ? 'pi pi-lock' : 'pi pi-lock-open',
      command: run((a) => emit('freeze', a)),
    },
    {
      label: '提取 APK',
      icon: 'pi pi-download',
      command: run((a) => emit('extractApk', a)),
    },
    { separator: true },
    {
      label: '卸载',
      icon: 'pi pi-trash',
      class: 'menu-item-danger',
      command: run((a) => emit('uninstall', a)),
    },
  ];
});

function onRowContextMenu(event: DataTableRowContextMenuEvent) {
  contextApp.value = event.data as AppInfo;
  cm.value?.show(event.originalEvent); // 在鼠标位置显示菜单
}

function onRowDblClick(event: DataTableRowDoubleClickEvent) {
  const target = event.originalEvent.target as HTMLElement;
  // 双击操作按钮 / 复选框时忽略，避免误触发详情
  if (target.closest('button') || target.closest('input') || target.closest('.p-checkbox')) return;
  emit('viewDetail', event.data as AppInfo);
}
</script>

<template>
  <DataTable
    :value="apps"
    :selection="selectedApps"
    @update:selection="emit('update:selectedApps', $event)"
    data-key="package_name"
    :loading="loading"
    :row-class="getRowClass"
    class="app-table"
    context-menu
    @row-contextmenu="onRowContextMenu"
    @row-dblclick="onRowDblClick"
  >
    <Column selection-mode="multiple" style="width: 40px" />

    <Column field="app_name" header="应用名">
      <template #body="{ data }">
        <div class="app-name-cell">
          <!-- 应用图标：置于应用名左侧，水平对齐 -->
          <img v-if="icons[data.package_name]" :src="icons[data.package_name]" class="app-icon" alt="" />
          <div v-else class="app-icon app-icon-placeholder"><i class="pi pi-android"></i></div>
          <span class="app-name-text font-medium" :title="data.app_name">{{ data.app_name }}</span>
        </div>
      </template>
    </Column>

    <!-- 类型列：表头文案 + 行内图标徽章，悬停展示分类说明 -->
    <Column style="width: 80px">
      <template #header>
        <span v-tooltip.top="'应用类型：用户安装的应用与系统预装应用的区分'">类型</span>
      </template>
      <template #body="{ data }">
        <span
          class="type-badge"
          :class="data.is_system ? 'badge-system' : 'badge-user'"
          v-tooltip.top="getAppTypeTip(data)"
        >
          <i :class="data.is_system ? 'pi pi-cog' : 'pi pi-user'"></i>
        </span>
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
            @click="emit('forceStop', data)"
          />
          <Button
            icon="pi pi-eraser"
            text
            size="small"
            v-tooltip.top="'清除数据'"
            @click="emit('clearData', data)"
          />
          <Button
            :icon="data.is_enabled ? 'pi pi-lock' : 'pi pi-lock-open'"
            text
            size="small"
            v-tooltip.top="data.is_enabled ? '冻结应用' : '解冻应用'"
            @click="emit('freeze', data)"
          />
          <Button
            icon="pi pi-download"
            text
            size="small"
            v-tooltip.top="'提取 APK'"
            @click="emit('extractApk', data)"
          />
          <Button
            icon="pi pi-trash"
            text
            size="small"
            severity="danger"
            v-tooltip.top="'卸载'"
            @click="emit('uninstall', data)"
          />
        </div>
      </template>
    </Column>
  </DataTable>

  <!-- 行右键菜单：查看详情与常用操作 -->
  <ContextMenu ref="cm" :model="menuModel" />
</template>

<style scoped>
.app-name-cell {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

/* 应用名：超出列宽时省略，保持行内干净 */
.app-name-text {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
}

.app-icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-surface-100);
  color: var(--p-surface-500);
  font-size: 1.1rem;
}

/* ============================================
   应用类型视觉区分：行背景 + 类型徽章
   ============================================ */

/* 用户应用行：淡绿色背景（color-mix 适配明暗主题） */
:deep(.p-datatable-tbody > tr.app-row-user) {
  background: color-mix(in srgb, var(--p-emerald-500), transparent 95%);
}

:deep(.p-datatable-tbody > tr.app-row-user:hover) {
  background: color-mix(in srgb, var(--p-emerald-500), transparent 90%);
}

/* 系统应用行：淡蓝色背景 */
:deep(.p-datatable-tbody > tr.app-row-system) {
  background: color-mix(in srgb, var(--p-sky-500), transparent 93%);
}

:deep(.p-datatable-tbody > tr.app-row-system:hover) {
  background: color-mix(in srgb, var(--p-sky-500), transparent 88%);
}

/* 右键菜单"卸载"项：与行内卸载按钮一致的 danger 配色 */
:deep(.p-contextmenu .menu-item-danger) {
  color: var(--p-red-500);
}

:deep(.p-contextmenu .menu-item-danger .p-contextmenu-item-icon) {
  color: var(--p-red-500);
}

/* 类型图标徽章 */
.type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 0.8rem;
}

.badge-user {
  background: color-mix(in srgb, var(--p-emerald-500), transparent 85%);
  color: var(--p-emerald-500);
}

.badge-system {
  background: color-mix(in srgb, var(--p-sky-500), transparent 85%);
  color: var(--p-sky-500);
}
</style>
