<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDeviceReport } from '../composables/useDeviceReport';
import {
  REPORT_FORMATS,
  batteryStatusLabel,
  batteryHealthLabel,
  kbToGb,
  temperatureLabel,
  voltageLabel,
  downloadReport,
  saveReportToDir,
  isTauriEnv,
  type ReportFormat,
} from '../composables/deviceReportExport';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { DeviceInfo, DeviceDetail } from '../types/device';
import WirelessConnectDialog from '../components/device-manager/WirelessConnectDialog.vue';

const props = defineProps<{
  devices: DeviceInfo[];
  selectedDevice: DeviceInfo | null;
  deviceDetail: DeviceDetail | null;
  detailLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', device: DeviceInfo): void;
  (e: 'refresh'): void;
  (e: 'disconnect', device: DeviceInfo): void;
  (e: 'toast', message: string, severity: string): void;
}>();

// 正在断开的设备 ID（防止重复点击）
const disconnectingId = ref<string | null>(null);

function onDisconnect(device: DeviceInfo) {
  if (disconnectingId.value) return;
  disconnectingId.value = device.id;
  emit('disconnect', device);
  setTimeout(() => {
    disconnectingId.value = null;
  }, 2000);
}

// 无线连接对话框
const showWirelessDialog = ref(false);

function openWirelessDialog() {
  showWirelessDialog.value = true;
}

function onDeviceConnected(deviceId: string) {
  // 刷新设备列表
  emit('refresh');
  // 延迟后选中新设备（等待列表刷新）
  setTimeout(() => {
    const newDevice = props.devices.find(d => d.id === deviceId);
    if (newDevice) {
      emit('select', newDevice);
    }
  }, 500);
}

// ============ 设备信息报告（从 DeviceInfoReport 合并） ============
const { report, loading: reportLoading, error: reportError, fetchReport } = useDeviceReport();
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

// ============ 报告导出（支持 JSON / Markdown / HTML / TXT 多选 + 目录选择） ============
const showExportDialog = ref(false);
const selectedFormats = ref<ReportFormat[]>(REPORT_FORMATS.map((f) => f.value));
const exporting = ref(false);

function openExportDialog() {
  if (!report.value) return;
  if (selectedFormats.value.length === 0) {
    selectedFormats.value = REPORT_FORMATS.map((f) => f.value);
  }
  showExportDialog.value = true;
}

async function onExportReports() {
  if (!report.value || selectedFormats.value.length === 0 || exporting.value) return;
  const formats = [...selectedFormats.value];
  const names = formats
    .map((v) => REPORT_FORMATS.find((f) => f.value === v)?.label)
    .filter(Boolean)
    .join(' / ');

  if (isTauriEnv()) {
    // 桌面端：弹出目录选择对话框，多格式文件写入所选目录
    showExportDialog.value = false;
    let dir: string | null = null;
    try {
      dir = (await openDialog({
        directory: true,
        multiple: false,
        title: '选择报告导出目录',
      })) as string | null;
    } catch (e) {
      emit('toast', `打开目录选择对话框失败：${String(e)}`, 'error');
      return;
    }
    if (!dir) {
      emit('toast', '已取消导出', 'info');
      return;
    }
    exporting.value = true;
    try {
      for (const format of formats) {
        await saveReportToDir(report.value, format, dir);
      }
      emit('toast', `已导出 ${formats.length} 份报告（${names}）到 ${dir}`, 'success');
    } catch (e) {
      emit('toast', `导出失败：${String(e)}`, 'error');
    } finally {
      exporting.value = false;
    }
    return;
  }

  // 浏览器 Mock 环境：直接触发下载（浏览器无法选择目录）
  for (const format of formats) {
    downloadReport(report.value, format);
  }
  emit('toast', `已导出 ${formats.length} 份报告（${names}）`, 'success');
  showExportDialog.value = false;
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
          icon="pi pi-wifi"
          label="无线连接"
          severity="primary"
          @click="openWirelessDialog"
        />
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

          <Column header="操作" style="width: 90px">
            <template #body="{ data }">
              <Button
                v-if="data.status === 'Online' && data.connection === 'WiFi'"
                icon="pi pi-power-off"
                label="断开"
                size="small"
                severity="danger"
                text
                :loading="disconnectingId === data.id"
                @click="onDisconnect(data)"
              />
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
            <div class="report-toolbar">
              <Button
                icon="pi pi-refresh"
                label="刷新报告"
                text
                size="small"
                :loading="reportLoading"
                @click="loadReport"
              />
              <Button
                icon="pi pi-download"
                label="导出报告"
                text
                size="small"
                :disabled="!report"
                @click="openExportDialog"
              />
            </div>

            <div v-if="reportLoading" class="detail-loading">
              <ProgressSpinner style="width: 32px; height: 32px" />
              <span>加载报告中...</span>
            </div>

            <!-- 报告为空的友好提示 -->
            <div v-else-if="!report" class="report-empty">
              <i class="pi pi-exclamation-circle report-empty-icon"></i>
              <p v-if="reportError">报告加载失败：{{ reportError }}</p>
              <p v-else>报告数据为空，点击“刷新报告”重试</p>
            </div>

            <template v-else>
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
                    <span class="detail-label">序列号</span>
                    <span class="detail-value font-mono">{{ report.serial }}</span>
                  </div>
                </div>
              </div>

              <Divider />

              <div class="detail-section">
                <h4>硬件信息</h4>
                <div v-if="report.hardware" class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">硬件平台</span>
                    <span class="detail-value">{{ report.hardware.cpu_hardware || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">CPU 核心数</span>
                    <span class="detail-value">{{ report.hardware.cpu_cores || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">CPU ABI</span>
                    <span class="detail-value font-mono">{{ report.hardware.cpu_abi || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">总内存</span>
                    <span class="detail-value">{{ kbToGb(report.hardware.memory_total_kb) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">可用内存</span>
                    <span class="detail-value">{{ kbToGb(report.hardware.memory_available_kb) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">存储总量</span>
                    <span class="detail-value">{{ kbToGb(report.hardware.storage_total_kb) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">存储可用</span>
                    <span class="detail-value">{{ kbToGb(report.hardware.storage_available_kb) }}</span>
                  </div>
                </div>
                <p v-else class="empty-text">无法读取硬件信息</p>
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
                    <span class="detail-value">{{ temperatureLabel(report.battery.temperature) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">充电状态</span>
                    <span class="detail-value">{{ batteryStatusLabel(report.battery.status) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">健康度</span>
                    <span class="detail-value">{{ batteryHealthLabel(report.battery.health) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">电压</span>
                    <span class="detail-value">{{ voltageLabel(report.battery.voltage) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">电池技术</span>
                    <span class="detail-value">{{ report.battery.technology || '-' }}</span>
                  </div>
                </div>
                <p v-else class="empty-text">无法读取电池信息</p>
              </div>

              <Divider />

              <div class="detail-section">
                <h4>网络信息</h4>
                <div v-if="report.network" class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">连接方式</span>
                    <span class="detail-value">{{ selectedDevice?.connection || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">网络接口</span>
                    <span class="detail-value font-mono">{{ report.network.interface }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">IP 地址</span>
                    <span class="detail-value font-mono">{{ report.network.ip_address || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">MAC 地址</span>
                    <span class="detail-value font-mono">{{ report.network.mac_address || '-' }}</span>
                  </div>
                </div>
                <p v-else class="empty-text">无法读取网络信息</p>
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
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- 无线连接对话框 -->
    <WirelessConnectDialog
      v-model:visible="showWirelessDialog"
      @connected="onDeviceConnected"
      @toast="(msg, sev) => emit('toast', msg, sev)"
    />

    <!-- 报告导出格式选择对话框 -->
    <Dialog
      v-model:visible="showExportDialog"
      modal
      header="导出设备报告"
      :style="{ width: '380px' }"
    >
      <p class="export-hint">选择要导出的格式（可多选，同时生成多个文件）；确认后选择保存目录：</p>
      <div class="export-format-list">
        <div v-for="fmt in REPORT_FORMATS" :key="fmt.value" class="export-format-item">
          <Checkbox
            v-model="selectedFormats"
            :inputId="`export-fmt-${fmt.value}`"
            :value="fmt.value"
          />
          <label :for="`export-fmt-${fmt.value}`">{{ fmt.label }}</label>
        </div>
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" text @click="showExportDialog = false" />
        <Button
          label="导出"
          icon="pi pi-download"
          :disabled="selectedFormats.length === 0"
          @click="onExportReports"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped src="../components/device-manager/device-manager.css">
</style>
