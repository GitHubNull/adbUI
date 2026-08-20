<script setup lang="ts">
import { computed } from 'vue';
import { useTasks } from '../composables/useTasks';
import type { TaskInfo } from '../types/device';

const { tasks, loading, cancelTask, clearCompleted } = useTasks();

const runningTasks = computed(() => tasks.value.filter((t) => t.status === 'Running' || t.status === 'Pending'));
const completedTasks = computed(() => tasks.value.filter((t) => t.status === 'Completed' || t.status === 'Failed' || t.status === 'Cancelled'));

function getStatusSeverity(status: string): string {
  switch (status) {
    case 'Completed': return 'success';
    case 'Running': return 'info';
    case 'Pending': return 'secondary';
    case 'Failed': return 'danger';
    case 'Cancelled': return 'warning';
    default: return 'secondary';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'Completed': return '已完成';
    case 'Running': return '运行中';
    case 'Pending': return '等待中';
    case 'Failed': return '失败';
    case 'Cancelled': return '已取消';
    default: return status;
  }
}

function getSuccessCount(task: TaskInfo): number {
  return task.results.filter((r) => r.success).length;
}

function getFailCount(task: TaskInfo): number {
  return task.results.filter((r) => !r.success).length;
}

async function onCancel(taskId: string) {
  await cancelTask(taskId);
}

async function onClearCompleted() {
  await clearCompleted();
}
</script>

<template>
  <div class="task-center">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="page-title">
          <i class="pi pi-check-circle page-icon"></i>
          任务中心
        </h2>
      </div>
      <div class="toolbar-right">
        <Button
          v-if="completedTasks.length > 0"
          icon="pi pi-trash"
          label="清理已完成"
          text
          severity="danger"
          @click="onClearCompleted"
        />
      </div>
    </div>

    <!-- Running Tasks -->
    <div v-if="runningTasks.length > 0" class="task-section">
      <h3 class="section-title">
        <i class="pi pi-spin pi-spinner"></i>
        进行中
      </h3>
      <div class="task-list">
        <div v-for="task in runningTasks" :key="task.id" class="task-card">
          <div class="task-header">
            <div class="task-info">
              <span class="task-name">{{ task.name }}</span>
              <Tag
                :value="getStatusLabel(task.status)"
                :severity="getStatusSeverity(task.status)"
                class="task-status"
              />
            </div>
            <Button
              v-if="task.status === 'Running'"
              icon="pi pi-times"
              text
              size="small"
              severity="danger"
              label="取消"
              @click="onCancel(task.id)"
            />
          </div>
          <div class="task-progress">
            <ProgressBar :value="task.progress * 100" class="progress-bar" />
            <span class="progress-text">{{ task.completed }}/{{ task.total }}</span>
          </div>
          <p v-if="task.message" class="task-message">{{ task.message }}</p>
        </div>
      </div>
    </div>

    <!-- Completed Tasks -->
    <div v-if="completedTasks.length > 0" class="task-section">
      <h3 class="section-title">
        <i class="pi pi-check-square"></i>
        已完成
      </h3>
      <div class="task-list">
        <div v-for="task in completedTasks" :key="task.id" class="task-card completed">
          <div class="task-header">
            <div class="task-info">
              <span class="task-name">{{ task.name }}</span>
              <Tag
                :value="getStatusLabel(task.status)"
                :severity="getStatusSeverity(task.status)"
                class="task-status"
              />
            </div>
          </div>

          <div class="task-summary">
            <span class="summary-item success">
              <i class="pi pi-check"></i>
              {{ getSuccessCount(task) }} 成功
            </span>
            <span v-if="getFailCount(task) > 0" class="summary-item fail">
              <i class="pi pi-times"></i>
              {{ getFailCount(task) }} 失败
            </span>
          </div>

          <div v-if="task.results.length > 0" class="task-results">
            <div
              v-for="(result, idx) in task.results"
              :key="idx"
              :class="['result-item', result.success ? 'success' : 'fail']"
            >
              <i :class="result.success ? 'pi pi-check-circle' : 'pi pi-times-circle'"></i>
              <span class="result-item-name">{{ result.item }}</span>
              <span class="result-item-msg">{{ result.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="tasks.length === 0 && !loading" class="empty-state">
      <i class="pi pi-inbox empty-icon"></i>
      <h3>暂无任务</h3>
      <p>批量操作将在此显示进度</p>
    </div>
  </div>
</template>

<style scoped>
.task-center {
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
  color: var(--text-color);
}

.page-icon {
  color: var(--primary-color);
  font-size: 1.5rem;
}

.task-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color-secondary);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-card.completed {
  opacity: 0.9;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.task-name {
  font-weight: 600;
  font-size: 1rem;
}

.task-status {
  font-size: 0.75rem;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  min-width: 60px;
  text-align: right;
}

.task-message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.task-summary {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.summary-item.success {
  color: var(--green-500);
}

.summary-item.fail {
  color: var(--red-500);
}

.task-results {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  background: var(--surface-50);
  border-radius: 4px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding: 0.25rem 0;
}

.result-item.success {
  color: var(--green-500);
}

.result-item.fail {
  color: var(--red-500);
}

.result-item-name {
  font-weight: 500;
  min-width: 200px;
}

.result-item-msg {
  color: var(--text-color-secondary);
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
