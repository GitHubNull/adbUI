<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDevices } from '../../composables/useDevices';
import type { NetworkDevice } from '../../types/device';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'connected', deviceId: string): void;
  (e: 'toast', message: string, severity: string): void;
}>();

const { connectDevice, scanNetworkDevices, isConnecting, isScanning } = useDevices();

// Form state
const ipAddress = ref('');
const port = ref(5555);
const scannedDevices = ref<NetworkDevice[]>([]);
const hasScanned = ref(false);

// Validation
const ipError = ref('');
const portError = ref('');

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

// Reset form when dialog opens
watch(() => props.visible, (newVal) => {
  if (newVal) {
    ipAddress.value = '';
    port.value = 5555;
    scannedDevices.value = [];
    hasScanned.value = false;
    ipError.value = '';
    portError.value = '';
  }
});

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
}

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
  emit('update:visible', false);
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="无线连接设备"
    :style="{ width: '450px' }"
    :breakpoints="{ '960px': '90vw', '640px': '95vw' }"
    :modal="true"
    :closable="!isConnecting"
    :close-on-escape="!isConnecting"
  >
    <div class="wireless-connect-form">
      <!-- 手动输入区域 -->
      <div class="form-section">
        <h4 class="section-title">
          <i class="pi pi-pencil"></i>
          手动连接
        </h4>
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

      <Divider />

      <!-- 扫描区域 -->
      <div class="form-section">
        <h4 class="section-title">
          <i class="pi pi-search"></i>
          自动扫描
        </h4>
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

        <!-- 扫描结果 -->
        <div v-if="hasScanned" class="scan-results">
          <div v-if="scannedDevices.length > 0" class="device-list">
            <div
              v-for="device in scannedDevices"
              :key="`${device.ip}:${device.port}`"
              class="device-item"
              :class="{ 'selected': ipAddress === device.ip && port === device.port }"
              @click="selectDevice(device)"
            >
              <i class="pi pi-mobile"></i>
              <span class="device-ip">{{ device.ip }}:{{ device.port }}</span>
              <i class="pi pi-check-circle selected-icon" v-if="ipAddress === device.ip && port === device.port"></i>
            </div>
          </div>
          <div v-else class="empty-scan">
            <i class="pi pi-inbox"></i>
            <p>未发现设备</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button
        label="取消"
        icon="pi pi-times"
        severity="secondary"
        text
        :disabled="isConnecting"
        @click="closeDialog"
      />
      <Button
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
.wireless-connect-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-color);
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

.scan-actions {
  display: flex;
  justify-content: flex-start;
}

.scan-results {
  margin-top: 0.5rem;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 150px;
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

.device-item.selected {
  background: var(--primary-50);
  border-color: var(--primary-color);
}

.device-item i {
  color: var(--text-color-secondary);
}

.device-item.selected i {
  color: var(--primary-color);
}

.device-ip {
  flex: 1;
  font-family: monospace;
  font-size: 0.875rem;
}

.selected-icon {
  color: var(--primary-color);
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

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
