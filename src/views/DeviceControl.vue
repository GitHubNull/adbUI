<script setup lang="ts">
import { ref } from 'vue';
import { useControl, REBOOT_MODES, COMMON_KEYS } from '../composables/useControl';
import type { DeviceInfo, RebootMode } from '../types/device';

const props = defineProps<{
  selectedDevice: DeviceInfo | null;
}>();

const emit = defineEmits<{
  (e: 'toast', message: string, severity: string): void;
}>();

const { reboot, tap, longPress, swipe, keyevent, inputText } = useControl();

// ============ 重启 ============
const showRebootConfirm = ref(false);
const pendingReboot = ref<RebootMode | null>(null);
const rebooting = ref(false);

function confirmReboot(mode: RebootMode) {
  pendingReboot.value = mode;
  showRebootConfirm.value = true;
}

async function doReboot() {
  if (!props.selectedDevice || !pendingReboot.value) return;
  showRebootConfirm.value = false;
  rebooting.value = true;
  try {
    await reboot(props.selectedDevice.id, pendingReboot.value);
    emit('toast', '重启指令已发送，设备离线后请稍候重新连接', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  } finally {
    rebooting.value = false;
    pendingReboot.value = null;
  }
}

function rebootModeName(id: RebootMode | null): string {
  return REBOOT_MODES.find((m) => m.id === id)?.name || '';
}

// ============ 输入模拟 ============
const tapX = ref(540);
const tapY = ref(1200);
const swipeX1 = ref(540);
const swipeY1 = ref(1500);
const swipeX2 = ref(540);
const swipeY2 = ref(500);
const swipeDuration = ref(300);
const text = ref('');

function validCoord(...vals: number[]): boolean {
  return vals.every((v) => Number.isFinite(v) && v >= 0);
}

async function onTap() {
  if (!props.selectedDevice) return;
  if (!validCoord(tapX.value, tapY.value)) {
    emit('toast', '坐标非法', 'warn');
    return;
  }
  try {
    await tap(props.selectedDevice.id, tapX.value, tapY.value);
    emit('toast', '已发送点击指令', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onLongPress() {
  if (!props.selectedDevice) return;
  if (!validCoord(tapX.value, tapY.value)) {
    emit('toast', '坐标非法', 'warn');
    return;
  }
  try {
    await longPress(props.selectedDevice.id, tapX.value, tapY.value);
    emit('toast', '已发送长按指令', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onSwipe() {
  if (!props.selectedDevice) return;
  if (!validCoord(swipeX1.value, swipeY1.value, swipeX2.value, swipeY2.value)) {
    emit('toast', '坐标非法', 'warn');
    return;
  }
  try {
    await swipe(props.selectedDevice.id, swipeX1.value, swipeY1.value, swipeX2.value, swipeY2.value, swipeDuration.value);
    emit('toast', '已发送滑动指令', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onKeyevent(keycode: string) {
  if (!props.selectedDevice) return;
  try {
    await keyevent(props.selectedDevice.id, keycode);
    emit('toast', `已发送按键 ${keycode}`, 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}

async function onInputText() {
  if (!props.selectedDevice) return;
  if (!text.value) {
    emit('toast', '请输入文本', 'warn');
    return;
  }
  try {
    await inputText(props.selectedDevice.id, text.value);
    emit('toast', '已发送文本输入', 'success');
  } catch (e) {
    emit('toast', String(e), 'error');
  }
}
</script>

<template>
  <div class="device-control">
    <div class="toolbar">
      <h2 class="page-title">
        <i class="pi pi-sliders-h page-icon"></i>
        设备控制
      </h2>
    </div>

    <div v-if="!selectedDevice" class="empty-state">
      <i class="pi pi-info-circle empty-icon"></i>
      <p>请先在设备管理中选择一个设备</p>
    </div>

    <template v-else>
      <!-- 重启模式 -->
      <div class="card">
        <h3 class="card-title">重启模式</h3>
        <div class="reboot-grid">
          <div
            v-for="mode in REBOOT_MODES"
            :key="mode.id"
            :class="['reboot-card', { danger: mode.danger }]"
          >
            <div class="reboot-name">{{ mode.name }}</div>
            <div class="reboot-desc">{{ mode.description }}</div>
            <Button
              label="执行"
              size="small"
              :severity="mode.danger ? 'danger' : 'primary'"
              :loading="rebooting"
              @click="confirmReboot(mode.id)"
            />
          </div>
        </div>
      </div>

      <!-- 输入模拟 -->
      <div class="card">
        <h3 class="card-title">输入模拟</h3>

        <div class="field">
          <label>点击 / 长按坐标</label>
          <div class="input-row">
            <InputNumber v-model="tapX" placeholder="X" />
            <InputNumber v-model="tapY" placeholder="Y" />
            <Button label="点击" size="small" @click="onTap" />
            <Button label="长按" size="small" outlined @click="onLongPress" />
          </div>
        </div>

        <Divider />

        <div class="field">
          <label>滑动（起点 → 终点 + 时长 ms）</label>
          <div class="input-row">
            <InputNumber v-model="swipeX1" placeholder="X1" />
            <InputNumber v-model="swipeY1" placeholder="Y1" />
            <InputNumber v-model="swipeX2" placeholder="X2" />
            <InputNumber v-model="swipeY2" placeholder="Y2" />
            <InputNumber v-model="swipeDuration" placeholder="时长" />
            <Button label="滑动" size="small" @click="onSwipe" />
          </div>
        </div>

        <Divider />

        <div class="field">
          <label>物理按键</label>
          <div class="key-grid">
            <Button
              v-for="k in COMMON_KEYS"
              :key="k.keycode"
              :label="k.name"
              size="small"
              outlined
              @click="onKeyevent(k.keycode)"
            />
          </div>
        </div>

        <Divider />

        <div class="field">
          <label>文本输入（仅支持 ASCII，中文需用 ADB Keyboard 等输入法）</label>
          <div class="input-row">
            <InputText v-model="text" placeholder="输入文本" class="flex-1" />
            <Button label="发送" size="small" @click="onInputText" />
          </div>
        </div>
      </div>
    </template>

    <!-- 重启确认框 -->
    <Dialog v-model:visible="showRebootConfirm" header="确认重启" :modal="true" :style="{ width: '420px' }">
      <p>
        确定要重启到 <strong>{{ rebootModeName(pendingReboot) }}</strong> 吗？
      </p>
      <p class="warn-text">设备将立即重启，当前连接会断开，正在进行的操作可能丢失。</p>
      <template #footer>
        <Button label="取消" text @click="showRebootConfirm = false" />
        <Button label="确认重启" severity="danger" @click="doReboot" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.device-control {
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

.reboot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.reboot-card {
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.reboot-card.danger {
  border-color: var(--red-300);
  background: var(--red-50);
}

.reboot-name {
  font-weight: 600;
}

.reboot-desc {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
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
  align-items: center;
  flex-wrap: wrap;
}

.key-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.5rem;
}

.flex-1 {
  flex: 1;
}

.warn-text {
  color: var(--red-500);
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
