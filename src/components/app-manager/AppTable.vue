<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import type { AppInfo } from '../../types/device';

defineProps<{
  apps: AppInfo[];
  loading: boolean;
  selectedApps: AppInfo[];
}>();

const emit = defineEmits<{
  (e: 'update:selectedApps', value: AppInfo[]): void;
  (e: 'forceStop', app: AppInfo): void;
  (e: 'clearData', app: AppInfo): void;
  (e: 'freeze', app: AppInfo): void;
  (e: 'extractApk', app: AppInfo): void;
  (e: 'uninstall', app: AppInfo): void;
}>();

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
</script>

<template>
  <DataTable
    :value="apps"
    :selection="selectedApps"
    @update:selection="emit('update:selectedApps', $event)"
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
</template>
