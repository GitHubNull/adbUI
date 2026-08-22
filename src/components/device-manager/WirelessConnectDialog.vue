<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDevices } from '../../composables/useDevices';
import type { NetworkDevice, QrPairingInfo } from '../../types/device';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'connected', deviceId: string): void;
  (e: 'toast', message: string, severity: string): void;
}>();

const {
  connectDevice,
  scanNetworkDevices,
  generatePairingQr,
  waitAndPairDevice,
  isConnecting,
  isScanning,
  isPairing,
} = useDevices();

// 当前激活的标签页（PrimeVue Tabs 使用字符串 value）
const activeTab = ref('0');

// ===== 手动输入 =====
const ipAddress = ref('');
const port = ref(5555);
const ipError = ref('');
const portError = ref('');

// ===== 局域网扫描 =====
const scannedDevices = ref<NetworkDevice[]>([]);
const hasScanned = ref(false);

// ===== 扫码连接 =====
const qrInfo = ref<QrPairingInfo | null>(null);
const pairingStatus = ref<'idle' | 'waiting' | 'pairing' | 'connecting' | 'success' | 'error'>('idle');
const pairingMessage = ref('');
let pairingAbortController: AbortController | null = null;

// 计算属性
const isValidIp = computed(() => {
  if (!ipAddress.value) return false;
  const pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ipAddress.value.match(pattern);
  if (!match) return false;
  return match.slice(1).every(octet => parseInt(octet) <= 255);
});

const isValidPort = computed(() => {
  return port.value >= 1 && port.value <= 65535;
});

const canConnect = computed(() => {
  return isValidIp.value && isValidPort.value && !isConnecting.value;
});

const isBusy = computed(() => isConnecting.value || isPairing.value);

// 对话框打开/关闭监听
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetState();
    // 默认打开扫码连接标签页
    activeTab.value = '0';
    // 自动生成二维码
    handleGenerateQr();
  } else {
    // 关闭时取消配对等待
    cancelPairing();
  }
});

// 标签页切换监听
watch(activeTab, (newVal) => {
  if (newVal !== '0') {
    // 离开扫码连接标签页时取消配对
    cancelPairing();
  }
});

function resetState() {
  ipAddress.value = '';
  port.value = 5555;
  scannedDevices.value = [];
  hasScanned.value = false;
  ipError.value = '';
  portError.value = '';
  qrInfo.value = null;
  pairingStatus.value = 'idle';
  pairingMessage.value = '';
}

function validateIp() {
  if (!ipAddress.value) {
    ipError.value = '请输入 IP 地址';
  } else if (!isValidIp.value) {
    ipError.value = 'IP 地址格式不正确';
  } else {
    ipError.value = '';
  }
}

function validatePort() {
  if (!port.value) {
    portError.value = '请输入端口号';
  } else if (!isValidPort.value) {
    portError.value = '端口号范围 1-65535';
  } else {
    portError.value = '';
  }
}

// ===== 扫码连接 =====
async function handleGenerateQr() {
  try {
    pairingStatus.value = 'idle';
    pairingMessage.value = '';
    qrInfo.value = await generatePairingQr();
    // 自动生成后开始等待配对
    startPairing();
  } catch (err) {
    emit('toast', `生成二维码失败: ${err}`, 'error');
  }
}

async function startPairing() {
  if (!qrInfo.value) return;

  pairingStatus.value = 'waiting';
  pairingMessage.value = '等待手机扫码...';
  pairingAbortController = new AbortController();

  try {
    const deviceAddr = await waitAndPairDevice(
      qrInfo.value.service_name,
      qrInfo.value.password,
      120,
    );

    // 检查是否已被取消
    if (pairingAbortController?.signal.aborted) return;

    pairingStatus.value = 'success';
    pairingMessage.value = `配对成功！已连接到 ${deviceAddr}`;
    emit('toast', `成功连接到 ${deviceAddr}`, 'success');
    emit('connected', deviceAddr);

    // 延迟关闭对话框
    setTimeout(() => {
      closeDialog();
    }, 1500);
  } catch (err) {
    if (pairingAbortController?.signal.aborted) return;

    const errStr = String(err);
    if (errStr.includes('Timeout')) {
      pairingStatus.value = 'error';
      pairingMessage.value = '等待超时，请确保手机在同一网络并正确扫码';
    } else {
      pairingStatus.value = 'error';
      pairingMessage.value = `配对失败: ${errStr}`;
    }
  }
}

function cancelPairing() {
  if (pairingAbortController) {
    pairingAbortController.abort();
    pairingAbortController = null;
  }
  pairingStatus.value = 'idle';
  pairingMessage.value = '';
}

// ===== 局域网扫描 =====
async function handleScan() {
  try {
    emit('toast', '正在扫描局域网设备...', 'info');
    const devices = await scanNetworkDevices();
    scannedDevices.value = devices;
    hasScanned.value = true;
    if (devices.length === 0) {
      emit('toast', '未发现设备，请确保设备已开启 ADB TCP/IP 模式', 'warn');
    } else {
      emit('toast', `发现 ${devices.length} 台设备`, 'success');
    }
  } catch (err) {
    emit('toast', `扫描失败: ${err}`, 'error');
  }
}

function selectDevice(device: NetworkDevice) {
  ipAddress.value = device.ip;
  port.value = device.port;
  ipError.value = '';
  portError.value = '';
  // 自动切换到手动输入标签页
  activeTab.value = '2';
}

// ===== 手动连接 =====
async function handleConnect() {
  validateIp();
  validatePort();

  if (!canConnect.value) return;

  try {
    emit('toast', `正在连接 ${ipAddress.value}:${port.value}...`, 'info');
    await connectDevice(ipAddress.value, port.value);
    emit('toast', `成功连接到 ${ipAddress.value}:${port.value}`, 'success');
    emit('connected', `${ipAddress.value}:${port.value}`);
    closeDialog();
  } catch (err) {
    emit('toast', `连接失败: ${err}`, 'error');
  }
}

function closeDialog() {
  cancelPairing();
  emit('update:visible', false);
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="无线连接设备"
    :style="{ width: '480px' }"
    :breakpoints="{ '960px': '90vw', '640px': '95vw' }"
    :modal="true"
    :closable="!isBusy"
    :close-on-escape="!isBusy"
  >
    <Tabs v-model:value="activeTab" class="wireless-tabs">
      <TabList>
        <Tab value="0">
          <i class="pi pi-qrcode"></i>
          扫码连接
        </Tab>
        <Tab value="1">
          <i class="pi pi-search"></i>
          局域网扫描
        </Tab>
        <Tab value="2">
          <i class="pi pi-pencil"></i>
          手动输入
        </Tab>
      </TabList>

      <TabPanels>
        <!-- 扫码连接 -->
        <TabPanel value="0">
          <div class="qr-panel">
            <div v-if="qrInfo" class="qr-container">
              <img
                :src="`data:image/svg+xml;base64,${qrInfo.qr_image_base64}`"
                alt="配对二维码"
                class="qr-image"
              />
            </div>
            <div v-else class="qr-loading">
              <ProgressSpinner style="width: 40px; height: 40px" />
              <span>正在生成二维码...</span>
            </div>

            <div class="qr-instructions">
              <p class="instruction-step">
                <i class="pi pi-mobile"></i>
                在手机上打开「设置 → 开发者选项 → 无线调试」
              </p>
              <p class="instruction-step">
                <i class="pi pi-qrcode"></i>
                点击「使用二维码配对设备」并扫描上方二维码
              </p>
            </div>

            <div v-if="pairingMessage" class="pairing-status" :class="pairingStatus">
              <i
                :class="{
                  'pi pi-spin pi-spinner': pairingStatus === 'waiting',
                  'pi pi-check-circle': pairingStatus === 'success',
                  'pi pi-exclamation-circle': pairingStatus === 'error',
                }"
              ></i>
              <span>{{ pairingMessage }}</span>
            </div>

            <div class="qr-actions">
              <Button
                label="刷新二维码"
                icon="pi pi-refresh"
                severity="secondary"
                text
                size="small"
                :disabled="isPairing"
                @click="handleGenerateQr"
              />
            </div>
          </div>
        </TabPanel>

        <!-- 局域网扫描 -->
        <TabPanel value="1">
          <div class="scan-panel">
            <div class="scan-actions">
              <Button
                label="扫描设备"
                icon="pi pi-search"
                severity="secondary"
                :loading="isScanning"
                :disabled="isConnecting"
                @click="handleScan"
              />
            </div>

            <div v-if="hasScanned" class="scan-results">
              <div v-if="scannedDevices.length > 0" class="device-list">
                <div
                  v-for="device in scannedDevices"
                  :key="`${device.ip}:${device.port}`"
                  class="device-item"
                  @click="selectDevice(device)"
                >
                  <i class="pi pi-mobile"></i>
                  <span class="device-ip">{{ device.ip }}:{{ device.port }}</span>
                  <i class="pi pi-arrow-right"></i>
                </div>
              </div>
              <div v-else class="empty-scan">
                <i class="pi pi-inbox"></i>
                <p>未发现设备</p>
              </div>
            </div>

            <p v-if="!hasScanned" class="scan-hint">
              <i class="pi pi-info-circle"></i>
              点击「扫描设备」搜索局域网中的 ADB 设备
            </p>
          </div>
        </TabPanel>

        <!-- 手动输入 -->
        <TabPanel value="2">
          <div class="manual-panel">
            <div class="form-grid">
              <div class="form-field">
                <label for="ip-address">IP 地址</label>
                <InputText
                  id="ip-address"
                  v-model="ipAddress"
                  placeholder="例如: 192.168.1.100"
                  :class="{ 'p-invalid': ipError }"
                  :disabled="isConnecting"
                  @blur="validateIp"
                  @input="ipError = ''"
                />
                <small v-if="ipError" class="p-error">{{ ipError }}</small>
              </div>
              <div class="form-field">
                <label for="port">端口号</label>
                <InputNumber
                  id="port"
                  v-model="port"
                  :min="1"
                  :max="65535"
                  :use-grouping="false"
                  :class="{ 'p-invalid': portError }"
                  :disabled="isConnecting"
                  @blur="validatePort"
                />
                <small v-if="portError" class="p-error">{{ portError }}</small>
              </div>
            </div>
            <p class="hint-text">
              <i class="pi pi-info-circle"></i>
              提示: 请先在设备上执行 <code>adb tcpip 5555</code> 开启网络调试模式
            </p>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <template #footer>
      <Button
        label="取消"
        icon="pi pi-times"
        severity="secondary"
        text
        :disabled="isBusy"
        @click="closeDialog"
      />
      <Button
        v-if="activeTab === '2'"
        label="连接"
        icon="pi pi-link"
        :loading="isConnecting"
        :disabled="!canConnect"
        @click="handleConnect"
      />
    </template>
  </Dialog>
</template>

<style scoped>
/* ===== Tabs ===== */
.wireless-tabs :deep(.p-tablist-tab-list) {
  justify-content: center;
}

.wireless-tabs :deep(.p-tab) {
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
}

/* ===== 扫码连接 ===== */
.qr-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.qr-container {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
}

.qr-image {
  width: 200px;
  height: 200px;
  display: block;
}

.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.qr-instructions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.instruction-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.instruction-step i {
  color: var(--primary-color);
  font-size: 0.875rem;
}

.pairing-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  width: 100%;
}

.pairing-status.waiting {
  background: var(--primary-50);
  color: var(--primary-color);
}

.pairing-status.success {
  background: var(--green-50);
  color: var(--green-600);
}

.pairing-status.error {
  background: var(--red-50);
  color: var(--red-600);
}

.qr-actions {
  display: flex;
  justify-content: center;
}

/* ===== 局域网扫描 ===== */
.scan-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.scan-actions {
  display: flex;
  justify-content: flex-start;
}

.scan-results {
  margin-top: 0.25rem;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 180px;
  overflow-y: auto;
}

.device-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-200);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.device-item:hover {
  background: var(--surface-100);
  border-color: var(--primary-color);
}

.device-item i:first-child {
  color: var(--text-color-secondary);
}

.device-item i:last-child {
  color: var(--primary-color);
  font-size: 0.75rem;
}

.device-ip {
  flex: 1;
  font-family: monospace;
  font-size: 0.875rem;
}

.empty-scan {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  color: var(--text-color-secondary);
}

.empty-scan i {
  font-size: 1.5rem;
}

.empty-scan p {
  margin: 0;
  font-size: 0.875rem;
}

.scan-hint {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

/* ===== 手动输入 ===== */
.manual-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.hint-text {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.hint-text code {
  background: var(--surface-100);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.75rem;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
