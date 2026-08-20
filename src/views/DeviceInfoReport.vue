<script setup lang="ts">
import { watch, onMounted } from 'vue';
import { useDeviceReport } from '../composables/useDeviceReport';
import type { DeviceInfo } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const { report, loading, fetchReport, exportReport } = useDeviceReport();

async function load() {
  if (!props.selectedDevice) return;
  await fetchReport(props.selectedDevice.id);
}

onMounted(load);
watch(() => props.selectedDevice?.id, load);

function onExport() {
  const content = exportReport();
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `device-report-${report.value?.serial || 'unknown'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  emit('toast', '设备报告已导出', 'success');
}

function batteryStatusLabel(s?: number): string {
  const map: Record<number, string> = { 2: '充电中', 3: '未充电', 4: '不充电', 5: '已充满' };
  return s !== undefined ? map[s] || `状态码 ${s}` : '-';
}
</script>

<template>
  <div class="device-report">
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-info-circle page-icon"></i>
        设备信息报告
      </h2>
      <div class="toolbar-right">
        <Button icon="pi pi-refresh" text :loading="loading" @click="load" />
        <Button icon="pi pi-download" label="导出" text :disabled="!report" @click="onExport" />
      </div>
    </div>

    <div v-if="!selectedDevice" class="empty-state">
      <i class="pi pi-info-circle empty-icon"></i>
      <p>请先在设备管理中选择一个设备</p>
    </div>

    <div v-else-if="report" class="report-grid">
      <!-- 系统信息 -->
      <div class="card">
        <h3 class="card-title">系统信息</h3>
        <div class="kv-list">
          <div class="kv"><span class="k">型号</span><span class="v">{{ report.model }}</span></div>
          <div class="kv"><span class="k">品牌</span><span class="v">{{ report.brand }}</span></div>
          <div class="kv"><span class="k">Android 版本</span><span class="v">{{ report.android_version }}</span></div>
          <div class="kv"><span class="k">SDK</span><span class="v">{{ report.sdk_version }}</span></div>
          <div class="kv"><span class="k">构建号</span><span class="v">{{ report.build_number }}</span></div>
          <div class="kv"><span class="k">产品名</span><span class="v">{{ report.product }}</span></div>
          <div class="kv"><span class="k">设备代号</span><span class="v">{{ report.device }}</span></div>
          <div class="kv"><span class="k">CPU ABI</span><span class="v">{{ report.cpu_abi }}</span></div>
          <div class="kv"><span class="k">序列号</span><span class="v mono">{{ report.serial }}</span></div>
        </div>
      </div>

      <!-- 电池信息 -->
      <div class="card">
        <h3 class="card-title">电池信息</h3>
        <div v-if="report.battery" class="kv-list">
          <div class="kv"><span class="k">电量</span><span class="v">{{ report.battery.level }}%</span></div>
          <div class="kv"><span class="k">温度</span><span class="v">{{ (report.battery.temperature / 10).toFixed(1) }}°C</span></div>
          <div class="kv"><span class="k">充电状态</span><span class="v">{{ batteryStatusLabel(report.battery.status) }}</span></div>
        </div>
        <p v-else class="empty-text">无法读取电池信息</p>
      </div>

      <!-- 显示信息 -->
      <div class="card">
        <h3 class="card-title">显示信息</h3>
        <div v-if="report.display" class="kv-list">
          <div class="kv"><span class="k">分辨率</span><span class="v mono">{{ report.display.size }}</span></div>
          <div class="kv"><span class="k">密度</span><span class="v">{{ report.display.density }}dpi</span></div>
          <div class="kv"><span class="k">过扫描</span><span class="v mono">{{ report.display.overscan.join(',') }}</span></div>
        </div>
        <p v-else class="empty-text">无法读取显示信息</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-report {
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

.toolbar-right {
  display: flex;
  gap: 0.5rem;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

.card {
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 1rem;
}

.card-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
}

.kv-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.9rem;
}

.k {
  color: var(--text-color-secondary);
}

.v {
  font-weight: 500;
  text-align: right;
}

.mono {
  font-family: monospace;
}

.empty-text {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--surface-400);
}
</style>
