<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useBattery } from '../composables/useBattery';
import type { DeviceInfo } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const { battery, loading, simulating, fetchBatteryState, simulate, resetBattery } = useBattery();

const simLevel = ref(50);
const simTemp = ref(35.0); // °C
const simStatus = ref(2);
const showResetConfirm = ref(false);

const STATUS_OPTIONS = [
  { label: '充电中', value: 2 },
  { label: '未充电', value: 3 },
  { label: '不充电', value: 4 },
  { label: '已充满', value: 5 },
];

function statusLabel(s: number): string {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label || `状态码 ${s}`;
}

async function load() {
  if (!props.selectedDevice) return;
  const b = await fetchBatteryState(props.selectedDevice.id);
  if (b) {
    simLevel.value = b.level;
    simTemp.value = b.temperature / 10;
    simStatus.value = b.status;
    simulating.value = b.simulating;
  }
}

onMounted(load);
watch(() => props.selectedDevice?.id, load);

async function applySimulate() {
  if (!props.selectedDevice) return;
  try {
    await simulate(props.selectedDevice.id, {
      level: simLevel.value,
      temperature: Math.round(simTemp.value * 10),
      status: simStatus.value,
    });
    simulating.value = true;
    emit('toast', '电池管理已应用', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onReset() {
  if (!props.selectedDevice) return;
  showResetConfirm.value = false;
  try {
    await resetBattery(props.selectedDevice.id);
    simulating.value = false;
    emit('toast', '已还原真实电池状态', 'success');
    await load();
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}
</script>

<template>
  <div class="battery-sim">
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-battery page-icon"></i>
        电池管理
      </h2>
      <Button icon="pi pi-refresh" text :loading="loading" @click="load" />
    </div>

    <div v-if="!selectedDevice" class="empty-state">
      <i class="pi pi-info-circle empty-icon"></i>
      <p>请先在设备管理中选择一个设备</p>
    </div>

    <template v-else>
      <!-- 安全提示 -->
      <div class="warning-bar">
        <i class="pi pi-exclamation-triangle"></i>
        模拟状态会覆盖设备真实电池读数，还原前设备电池显示可能异常
      </div>

      <!-- 当前状态卡 -->
      <div class="card">
        <h3 class="card-title">当前电池状态</h3>
        <div class="state-grid">
          <div class="state-item">
            <span class="state-label">电量</span>
            <span class="state-value">{{ battery ? battery.level + '%' : '-' }}</span>
          </div>
          <div class="state-item">
            <span class="state-label">温度</span>
            <span class="state-value">{{ battery ? (battery.temperature / 10).toFixed(1) + '°C' : '-' }}</span>
          </div>
          <div class="state-item">
            <span class="state-label">充电状态</span>
            <span class="state-value">{{ battery ? statusLabel(battery.status) : '-' }}</span>
          </div>
          <div class="state-item">
            <span class="state-label">模拟中</span>
            <Tag :value="simulating ? '是' : '否'" :severity="simulating ? 'warning' : 'success'" />
          </div>
        </div>
      </div>

      <!-- 模拟控制卡 -->
      <div class="card">
        <h3 class="card-title">模拟控制</h3>
        <div class="field">
          <label>模拟电量: {{ simLevel }}%</label>
          <Slider v-model="simLevel" :min="1" :max="100" :step="1" />
        </div>
        <div class="field">
          <label>模拟温度: {{ simTemp.toFixed(1) }}°C</label>
          <Slider v-model="simTemp" :min="20" :max="60" :step="0.5" />
        </div>
        <div class="field">
          <label>充电状态</label>
          <Dropdown v-model="simStatus" :options="STATUS_OPTIONS" option-label="label" option-value="value" />
        </div>
        <div class="input-row">
          <Button label="应用模拟" icon="pi pi-play" @click="applySimulate" />
          <Button label="一键还原" icon="pi pi-undo" severity="danger" @click="showResetConfirm = true" />
        </div>
      </div>
    </template>

    <!-- 还原确认框 -->
    <Dialog v-model:visible="showResetConfirm" header="确认还原" :modal="true" :style="{ width: '400px' }">
      <p>确定要还原真实电池状态吗？设备电池读数将恢复为真实值。</p>
      <template #footer>
        <Button label="取消" text @click="showResetConfirm = false" />
        <Button label="确认还原" severity="danger" @click="onReset" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.battery-sim {
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

.warning-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--orange-50);
  border: 1px solid var(--orange-200);
  border-radius: 8px;
  color: var(--orange-700);
  font-size: 0.875rem;
}

.card {
  background: var(--surface-card);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.state-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.state-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.state-label {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.state-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.input-row {
  display: flex;
  gap: 0.5rem;
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
