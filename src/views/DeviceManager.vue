<script setup lang="ts">
import { computed } from 'vue';
import type { DeviceInfo, DeviceDetail } from '../types/device';

const props = defineProps<{
  devices: DeviceInfo[];
  selectedDevice: DeviceInfo | null;
  deviceDetail: DeviceDetail | null;
  detailLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', device: DeviceInfo): void;
  (e: 'refresh'): void;
}>();

const onlineCount = computed(() => props.devices.filter(d => d.status === 'Online').length);
const totalCount = computed(() => props.devices.length);

function getStatusSeverity(status: string): string {
  switch (status) {
    case 'Online': return 'success';
    case 'Offline': return 'danger';
    case 'Unauthorized': return 'warning';
    default: return 'secondary';
  }
}

function getConnectionIcon(connection: string): string {
  return connection === 'WiFi' ? 'pi pi-wifi' : 'pi pi-mobile';
}
</script>

<template>
  <div class="device-manager">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="page-title">
          <i class="pi pi-android page-icon"></i>
          设备管理
        </h2>
        <span class="device-count">
          {{ onlineCount }}/{{ totalCount }} 设备在线
        </span>
      </div>
      <div class="toolbar-right">
        <Button
          icon="pi pi-refresh"
          label="刷新"
          severity="secondary"
          @click="emit('refresh')"
        />
      </div>
    </div>

    <div class="content-grid">
      <!-- Device List -->
      <div class="device-list-panel">
        <DataTable
          :value="devices"
          selection-mode="single"
          data-key="id"
          :selection="selectedDevice"
          @row-click="(event: any) => emit('select', event.data)"
          striped-rows
          class="device-table"
        >
          <Column field="id" header="设备 ID">
            <template #body="{ data }">
              <div class="device-id-cell">
                <i :class="getConnectionIcon(data.connection)" class="connection-icon"></i>
                <span class="font-mono">{{ data.id }}</span>
              </div>
            </template>
          </Column>

          <Column field="model" header="型号">
            <template #body="{ data }">
              <span class="font-medium">{{ data.model }}</span>
            </template>
          </Column>

          <Column field="status" header="状态" style="width: 120px">
            <template #body="{ data }">
              <Tag
                :value="data.status"
                :severity="getStatusSeverity(data.status)"
                class="status-tag"
              />
            </template>
          </Column>

          <Column field="connection" header="连接方式" style="width: 100px">
            <template #body="{ data }">
              <span class="text-secondary">{{ data.connection }}</span>
            </template>
          </Column>
        </DataTable>

        <!-- Empty State -->
        <div v-if="devices.length === 0" class="empty-state">
          <i class="pi pi-mobile empty-icon"></i>
          <h3>未检测到设备</h3>
          <p>请连接 Android 设备并启用 USB 调试模式</p>
          <div class="hint">
            <p>提示：在设备上打开「设置 → 开发者选项 → USB 调试」</p>
          </div>
        </div>
      </div>

      <!-- Device Detail Panel -->
      <div v-if="selectedDevice" class="detail-panel">
        <div class="detail-header">
          <h3>
            <i class="pi pi-info-circle"></i>
            设备详情
          </h3>
        </div>

        <div v-if="detailLoading" class="detail-loading">
          <ProgressSpinner style="width: 40px; height: 40px" />
          <span>加载中...</span>
        </div>

        <div v-else-if="deviceDetail" class="detail-content">
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">型号</span>
                <span class="detail-value">{{ deviceDetail.model }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">品牌</span>
                <span class="detail-value">{{ deviceDetail.brand }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">设备 ID</span>
                <span class="detail-value font-mono">{{ deviceDetail.id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">产品名</span>
                <span class="detail-value">{{ deviceDetail.product }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">设备代号</span>
                <span class="detail-value">{{ deviceDetail.device }}</span>
              </div>
            </div>
          </div>

          <Divider />

          <div class="detail-section">
            <h4>系统信息</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Android 版本</span>
                <span class="detail-value">{{ deviceDetail.android_version }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">SDK 版本</span>
                <span class="detail-value">{{ deviceDetail.sdk_version }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">版本号</span>
                <span class="detail-value font-mono">{{ deviceDetail.build_number }}</span>
              </div>
            </div>
          </div>

          <Divider v-if="deviceDetail.battery_level !== null" />

          <div v-if="deviceDetail.battery_level !== null" class="detail-section">
            <h4>电池状态</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">电量</span>
                <div class="battery-display">
                  <ProgressBar
                    :value="deviceDetail.battery_level"
                    :class="{
                      'battery-low': deviceDetail.battery_level < 20,
                      'battery-medium': deviceDetail.battery_level >= 20 && deviceDetail.battery_level < 50,
                    }"
                    class="battery-bar"
                  />
                  <span class="battery-text">{{ deviceDetail.battery_level }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-manager {
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
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
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

.device-count {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  background: var(--surface-100);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
}

.device-list-panel {
  min-height: 0;
  overflow: auto;
}

.device-table {
  border-radius: 8px;
  overflow: hidden;
}

.device-id-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-icon {
  color: var(--primary-color);
  font-size: 0.875rem;
}

.status-tag {
  font-size: 0.75rem;
  font-weight: 600;
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
  margin: 0 0 1rem;
}

.hint {
  background: var(--surface-100);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
}

.hint p {
  margin: 0;
}

/* Detail Panel */
.detail-panel {
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-200);
  overflow: auto;
}

.detail-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--surface-200);
}

.detail-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  color: var(--text-color);
}

.detail-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: var(--text-color-secondary);
}

.detail-content {
  padding: 1rem 1.25rem;
}

.detail-section {
  margin-bottom: 1rem;
}

.detail-section h4 {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--surface-100);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color);
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}

.font-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
}

.battery-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 120px;
}

.battery-bar {
  flex: 1;
  height: 8px;
}

.battery-bar :deep(.p-progressbar-value) {
  background: var(--green-500);
}

.battery-bar.battery-low :deep(.p-progressbar-value) {
  background: var(--red-500);
}

.battery-bar.battery-medium :deep(.p-progressbar-value) {
  background: var(--orange-500);
}

.battery-text {
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .detail-panel {
    max-height: 400px;
  }
}
</style>
