<script setup lang="ts">
import SelectButton from 'primevue/selectbutton';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

defineProps<{
  currentFilter: string;
  searchQuery: string;
  selectedCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:currentFilter', value: string): void;
  (e: 'update:searchQuery', value: string): void;
  (e: 'filterChange', event: any): void;
  (e: 'installApk'): void;
  (e: 'batchUninstall'): void;
}>();
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <h2 class="page-title">
        <i class="pi pi-th-large page-icon"></i>
        应用管理
      </h2>
      <SelectButton
        :model-value="currentFilter"
        :options="[
          { label: '全部', value: 'all' },
          { label: '用户应用', value: 'user' },
          { label: '系统应用', value: 'system' },
        ]"
        option-label="label"
        option-value="value"
        @change="emit('filterChange', $event)"
      />
    </div>
    <div class="toolbar-right">
      <InputText
        :model-value="searchQuery"
        @update:model-value="emit('update:searchQuery', String($event ?? ''))"
        placeholder="搜索应用..."
        class="search-input"
      />
      <Button
        icon="pi pi-upload"
        label="安装 APK"
        @click="emit('installApk')"
      />
      <Button
        v-if="selectedCount > 0"
        icon="pi pi-trash"
        label="批量卸载"
        severity="danger"
        @click="emit('batchUninstall')"
      />
    </div>
  </div>
</template>
