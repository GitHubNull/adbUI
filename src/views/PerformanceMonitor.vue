<script setup lang="ts">
import { watch } from 'vue';
import { usePerformance } from '../composables/usePerformance';
import type { DeviceInfo } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const {
  data,
  loading,
  monitoring,
  cpuHistory,
  fetchPerformance,
  startMonitoring,
  stopMonitoring,
  toggleMonitoring,
  formatMemory,
  memoryPercent,
} = usePerformance();

// 设备切换时自动开始监控
watch(
  () => props.selectedDevice,
  (device) => {
    if (device) {
      startMonitoring(device.id);
    } else {
      stopMonitoring();
    }
  },
  { immediate: true }
);

function onToggle() {
  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }
  toggleMonitoring(props.selectedDevice.id);
}

function onRefresh() {
  if (!props.selectedDevice) {
    emit('toast', '请先选择设备', 'warn');
    return;
  }
  fetchPerformance(props.selectedDevice.id);
}

// 生成迷你折线图 SVG 路径
function sparklinePath(values: number[], width: number, height: number): string {
  if (values.length < 2) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return `M${points.join(' L')}`;
}
</script>

<template>
  <div class="perf-monitor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-chart-line"></i>
        性能监控
      </h2>
      <div class="toolbar-actions">
        <Button
          :icon="monitoring ? 'pi pi-pause' : 'pi pi-play'"
          :label="monitoring ? '暂停' : '开始'"
          size="small"
          :severity="monitoring ? 'warn' : 'success'"
          @click="onToggle"
        />
        <Button
          icon="pi pi-refresh"
          text
          size="small"
          v-tooltip.bottom="'刷新'"
          :loading="loading"
          @click="onRefresh"
        />
      </div>
    </div>

    <div v-if="!selectedDevice" class="empty-state">
      <i class="pi pi-mobile"></i>
      <p>请先选择设备</p>
    </div>

    <template v-else>
      <!-- 性能卡片 -->
      <div class="perf-grid">
        <!-- CPU -->
        <div class="perf-card">
          <div class="perf-card-header">
            <span class="perf-card-title">CPU 使用率</span>
            <span class="perf-card-value">{{ data?.cpu_usage?.toFixed(1) ?? '--' }}%</span>
          </div>
          <div class="perf-sparkline">
            <svg
              v-if="cpuHistory.length > 1"
              :viewBox="`0 0 200 48`"
              preserveAspectRatio="none"
              class="sparkline-svg"
            >
              <path
                :d="sparklinePath(cpuHistory, 200, 48)"
                fill="none"
                stroke="#3b82f6"
                stroke-width="2"
              />
            </svg>
            <div v-else class="sparkline-placeholder">收集中...</div>
          </div>
        </div>

        <!-- 内存 -->
        <div class="perf-card">
          <div class="perf-card-header">
            <span class="perf-card-title">内存使用</span>
            <span class="perf-card-value">
              {{ data ? formatMemory(data.memory_used) : '--' }} / {{ data ? formatMemory(data.memory_total) : '--' }}
            </span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-bar-fill"
              :style="{ width: memoryPercent() + '%' }"
            ></div>
          </div>
          <div class="perf-card-detail">
            {{ memoryPercent() }}% 已使用
          </div>
        </div>

        <!-- 温度 -->
        <div class="perf-card">
          <div class="perf-card-header">
            <span class="perf-card-title">设备温度</span>
            <span class="perf-card-value">{{ data?.temperature?.toFixed(1) ?? '--' }}°C</span>
          </div>
          <div class="temp-display">
            <div
              class="temp-indicator"
              :class="{
                'temp-normal': (data?.temperature ?? 0) < 35,
                'temp-warm': (data?.temperature ?? 0) >= 35 && (data?.temperature ?? 0) < 42,
                'temp-hot': (data?.temperature ?? 0) >= 42,
              }"
            >
              {{ data?.temperature?.toFixed(1) ?? '--' }}°C
            </div>
          </div>
        </div>

        <!-- 状态 -->
        <div class="perf-card">
          <div class="perf-card-header">
            <span class="perf-card-title">监控状态</span>
          </div>
          <div class="monitor-status">
            <span class="status-dot" :class="{ active: monitoring }"></span>
            <span>{{ monitoring ? '实时监控中' : '已暂停' }}</span>
          </div>
          <div class="perf-card-detail">
            每 2 秒刷新
          </div>
        </div>
      </div>

      <!-- 进程列表 -->
      <div class="process-section">
        <div class="section-header">
          <h3>进程列表</h3>
          <span class="process-count" v-if="data">
            {{ data.processes.length }} 个进程
          </span>
        </div>
        <div class="process-table-wrapper">
          <table class="process-table">
            <thead>
              <tr>
                <th>PID</th>
                <th>用户</th>
                <th>CPU%</th>
                <th>内存</th>
                <th>进程名</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="proc in data?.processes ?? []" :key="proc.pid">
                <td>{{ proc.pid }}</td>
                <td>{{ proc.user }}</td>
                <td>
                  <span
                    class="cpu-badge"
                    :class="{
                      'cpu-high': proc.cpu_percent > 10,
                      'cpu-medium': proc.cpu_percent > 5 && proc.cpu_percent <= 10,
                    }"
                  >
                    {{ proc.cpu_percent.toFixed(1) }}%
                  </span>
                </td>
                <td>{{ formatMemory(proc.memory_kb) }}</td>
                <td class="process-name">{{ proc.name }}</td>
              </tr>
              <tr v-if="!data || data.processes.length === 0">
                <td colspan="5" class="empty-row">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped src="../components/performance-monitor/performance-monitor.css">
</style>
