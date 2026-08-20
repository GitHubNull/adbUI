<script setup lang="ts">
import { ref } from 'vue';
import { useCommandLib } from '../composables/useCommandLib';
import type { DeviceInfo, CommandTemplate } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const {
  activeCategory,
  categories,
  filteredCommands,
  outputs,
  runningId,
  toggleFavorite,
  addCustom,
  removeCustom,
  execute,
} = useCommandLib();

// 自定义命令表单
const newName = ref('');
const newCommand = ref('');
const newCategory = ref('');

function onAddCustom() {
  if (!newName.value || !newCommand.value) {
    emit('toast', '请填写名称与命令', 'warn');
    return;
  }
  addCustom(newName.value, newCommand.value, newCategory.value);
  newName.value = '';
  newCommand.value = '';
  newCategory.value = '';
  emit('toast', '自定义命令已添加', 'success');
}

async function onExecute(cmd: CommandTemplate) {
  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }
  try {
    await execute(props.selectedDevice.id, cmd);
    emit('toast', `已执行: ${cmd.name}`, 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}
</script>

<template>
  <div class="command-lib">
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-bookmark page-icon"></i>
        常用命令库
      </h2>
    </div>

    <div class="main-area">
      <!-- 分类栏 -->
      <div class="category-pane">
        <div
          v-for="cat in categories"
          :key="cat"
          :class="['category-item', { active: activeCategory === cat }]"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </div>
      </div>

      <!-- 命令列表 -->
      <div class="command-pane">
        <div v-if="filteredCommands.length === 0" class="empty-state">
          <i class="pi pi-inbox empty-icon"></i>
          <p>该分类暂无命令</p>
        </div>

        <div v-for="cmd in filteredCommands" :key="cmd.id" class="command-card">
          <div class="command-header">
            <div class="command-info">
              <span class="command-name">{{ cmd.name }}</span>
              <code class="command-text">{{ cmd.command }}</code>
              <span v-if="cmd.description" class="command-desc">{{ cmd.description }}</span>
            </div>
            <div class="command-actions">
              <Button
                :icon="cmd.favorite ? 'pi pi-star-fill' : 'pi pi-star'"
                text
                :class="{ 'fav-active': cmd.favorite }"
                @click="toggleFavorite(cmd.id)"
              />
              <Button
                icon="pi pi-play"
                text
                :loading="runningId === cmd.id"
                @click="onExecute(cmd)"
              />
              <Button
                v-if="!cmd.builtin"
                icon="pi pi-trash"
                text
                severity="danger"
                @click="removeCustom(cmd.id)"
              />
            </div>
          </div>
          <div v-if="outputs[cmd.id]" class="command-output">
            <pre>{{ outputs[cmd.id] }}</pre>
          </div>
        </div>

        <!-- 自定义命令表单 -->
        <div class="card add-form">
          <h3 class="card-title">添加自定义命令</h3>
          <div class="input-row">
            <InputText v-model="newName" placeholder="名称" class="flex-1" />
            <InputText v-model="newCommand" placeholder="ADB 命令" class="flex-1" />
            <InputText v-model="newCategory" placeholder="分类（可选）" class="flex-1" />
            <Button label="添加" icon="pi pi-plus" @click="onAddCustom" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.command-lib {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.5rem;
  gap: 1rem;
  overflow: hidden;
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

.main-area {
  display: flex;
  gap: 1rem;
  flex: 1;
  overflow: hidden;
}

.category-pane {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
}

.category-item {
  padding: 0.625rem 0.875rem;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-color-secondary);
  transition: all 0.2s;
}

.category-item:hover {
  background: var(--surface-hover);
  color: var(--text-color);
}

.category-item.active {
  background: var(--primary-color);
  color: var(--primary-color-text);
}

.command-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
}

.command-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.command-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.command-name {
  font-weight: 600;
}

.command-text {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--primary-color);
  background: var(--surface-50);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  word-break: break-all;
}

.command-desc {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.command-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.fav-active {
  color: var(--yellow-500) !important;
}

.command-output {
  background: var(--surface-50);
  border-radius: 4px;
  padding: 0.5rem;
}

.command-output pre {
  margin: 0;
  font-size: 0.8rem;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-color-secondary);
}

.add-form {
  background: var(--surface-card);
  border: 1px dashed var(--surface-300);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.input-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.flex-1 {
  flex: 1;
  min-width: 140px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  color: var(--surface-400);
}
</style>
