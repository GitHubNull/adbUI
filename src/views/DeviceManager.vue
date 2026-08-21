<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDeviceReport } from '../composables/useDeviceReport';
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
  (e: 'toast', message: string, severity: string): void;
}>();

// ============ 设备信息报告（从 DeviceInfoReport 合并） ============
const { report, loading: reportLoading, fetchReport, exportReport } = useDeviceReport();
const showReport = ref(false);

async function loadReport() {
  if (!props.selectedDevice) return;
  await fetchReport(props.selectedDevice.id);
}

watch(() => props.selectedDevice?.id, () => {
  if (showReport.value) {
    loadReport();
  }
});

function toggleReport() {
  showReport.value = !showReport.value;
  if (showReport.value && !report.value) {
    loadReport();
  }
}

function onExportReport() {
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

          <Divider />

          <!-- 完整报告按钮 -->
          <div class="detail-section">
            <Button
              :label="showReport ? '收起报告' : '完整报告'"
              :icon="showReport ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
              text
              size="small"
              @click="toggleReport"
            />
          </div>

          <!-- 设备信息报告（从 DeviceInfoReport 合并） -->
          <template v-if="showReport">
            <div v-if="reportLoading" class="detail-loading">
              <ProgressSpinner style="width: 32px; height: 32px" />
              <span>加载报告中...</span>
            </div>

            <template v-else-if="report">
              <div class="detail-section">
                <h4>系统信息</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">型号</span>
                    <span class="detail-value">{{ report.model }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">品牌</span>
                    <span class="detail-value">{{ report.brand }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Android 版本</span>
                    <span class="detail-value">{{ report.android_version }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">SDK</span>
                    <span class="detail-value">{{ report.sdk_version }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">构建号</span>
                    <span class="detail-value font-mono">{{ report.build_number }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">产品名</span>
                    <span class="detail-value">{{ report.product }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">设备代号</span>
                    <span class="detail-value">{{ report.device }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">CPU ABI</span>
                    <span class="detail-value">{{ report.cpu_abi }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">序列号</span>
                    <span class="detail-value font-mono">{{ report.serial }}</span>
                  </div>
                </div>
              </div>

              <Divider />

              <div class="detail-section">
                <h4>电池信息</h4>
                <div v-if="report.battery" class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">电量</span>
                    <span class="detail-value">{{ report.battery.level }}%</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">温度</span>
                    <span class="detail-value">{{ (report.battery.temperature / 10).toFixed(1) }}°C</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">充电状态</span>
                    <span class="detail-value">{{ batteryStatusLabel(report.battery.status) }}</span>
                  </div>
                </div>
                <p v-else class="empty-text">无法读取电池信息</p>
              </div>

              <Divider />

              <div class="detail-section">
                <h4>显示信息</h4>
                <div v-if="report.display" class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">分辨率</span>
                    <span class="detail-value font-mono">{{ report.display.size }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">密度</span>
                    <span class="detail-value">{{ report.display.density }}dpi</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">过扫描</span>
                    <span class="detail-value font-mono">{{ report.display.overscan.join(',') }}</span>
                  </div>
                </div>
                <p v-else class="empty-text">无法读取显示信息</p>
              </div>

              <Divider />

              <div class="detail-section">
                <Button
                  label="导出报告"
                  icon="pi pi-download"
                  text
                  size="small"
                  @click="onExportReport"
                />
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../components/device-manager/device-manager.css">
</style>
