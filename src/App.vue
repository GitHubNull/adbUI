<script setup lang="ts">
import { ref, computed } from 'vue';
import AppSidebar from './components/AppSidebar.vue';
import AppStatusBar from './components/AppStatusBar.vue';
import DeviceManager from './views/DeviceManager.vue';
import AppManager from './views/AppManager.vue';
import FileManager from './views/FileManager.vue';
import TaskCenter from './views/TaskCenter.vue';
import DisplaySettings from './views/DisplaySettings.vue';
import BatterySimulator from './views/BatterySimulator.vue';
import ScriptAutomation from './views/ScriptAutomation.vue';
import Settings from './views/Settings.vue';
import LogViewer from './views/LogViewer.vue';
import ShellTerminal from './views/ShellTerminal.vue';
import ScreenshotRecorder from './views/ScreenshotRecorder.vue';
import PerformanceMonitor from './views/PerformanceMonitor.vue';
import type { DeviceInfo } from './types/device';
import { useDevices } from './composables/useDevices';
import { useTasks } from './composables/useTasks';
import { useToast } from 'primevue/usetoast';

const currentView = ref('devices');
const toast = useToast();

const {
  devices,
  selectedDevice,
  deviceDetail,
  detailLoading,
  refreshDevices,
  selectDevice,
  disconnectDeviceById,
} = useDevices();

// 根级任务状态：供底部状态栏显示后台运行中任务数
const { tasks } = useTasks();

const onlineCount = computed(() => devices.value.filter((d) => d.status === 'Online').length);
const totalCount = computed(() => devices.value.length);

function onNavigate(view: string) {
  currentView.value = view;
}

function showToast(message: string, severity: string) {
  toast.add({
    severity: severity as any,
    summary: message,
    life: 3000,
  });
}

async function onDisconnectDevice(device: DeviceInfo) {
  try {
    await disconnectDeviceById(device.id);
    showToast(`已断开设备 ${device.id}`, 'success');
  } catch (err) {
    showToast(String(err), 'error');
  }
}
</script>

<template>
  <div class="app-layout">
    <div class="app-body">
      <AppSidebar @navigate="onNavigate" />

      <main class="main-content">
        <div class="view-container">
          <DeviceManager
            v-if="currentView === 'devices'"
            :devices="devices"
            :selected-device="selectedDevice"
            :device-detail="deviceDetail"
            :detail-loading="detailLoading"
            @select="selectDevice"
            @refresh="refreshDevices"
            @disconnect="onDisconnectDevice"
            @toast="showToast"
          />

          <AppManager
            v-else-if="currentView === 'apps'"
            :selected-device="selectedDevice"
            @toast="showToast"
          />

          <FileManager
            v-else-if="currentView === 'files'"
            :selected-device="selectedDevice"
            @toast="showToast"
          />

          <TaskCenter
            v-else-if="currentView === 'tasks'"
          />

          <DisplaySettings
            v-else-if="currentView === 'display'"
            :selected-device="selectedDevice"
            @toast="showToast"
          />

          <BatterySimulator
            v-else-if="currentView === 'battery'"
            :selected-device="selectedDevice"
            @toast="showToast"
          />

          <ScriptAutomation
            v-else-if="currentView === 'scripts'"
            :selected-device="selectedDevice"
            @toast="showToast"
          />

          <LogViewer
            v-else-if="currentView === 'logs'"
            :selected-device="selectedDevice"
            @toast="showToast"
          />

          <ShellTerminal
            v-else-if="currentView === 'shell'"
            :selected-device="selectedDevice"
            @toast="showToast"
          />

          <ScreenshotRecorder
            v-else-if="currentView === 'screenshots'"
            :selected-device="selectedDevice"
            @toast="showToast"
          />

          <PerformanceMonitor
            v-else-if="currentView === 'perf'"
            :selected-device="selectedDevice"
            @toast="showToast"
          />

          <Settings
            v-else-if="currentView === 'settings'"
            @toast="showToast"
          />

          <div v-else class="placeholder-view">
            <i class="pi pi-construction placeholder-icon"></i>
            <h2>{{ currentView }}</h2>
            <p>功能开发中，敬请期待...</p>
          </div>
        </div>
      </main>
    </div>

    <!-- 底部状态栏：占满整个底部横向宽度（含侧边栏下方区域） -->
    <AppStatusBar
      :current-view="currentView"
      :online-count="onlineCount"
      :total-count="totalCount"
      :tasks="tasks"
      :selected-device="selectedDevice"
      :devices="devices"
    />

    <!-- Toast -->
    <Toast />
  </div>
</template>

<style scoped>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 纵向布局：app-body（侧边栏 + 主内容）在上，状态栏全宽在下 */
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.app-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* PrimeVue 4 主题变量：随明暗模式切换的内容区背景，与深色状态栏形成对比 */
  background: var(--p-content-background);
}

.view-container {
  flex: 1;
  overflow: hidden;
  background: var(--p-content-background);
}

.placeholder-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--p-text-muted-color);
  gap: 1rem;
}

.placeholder-icon {
  font-size: 4rem;
  color: var(--p-surface-400);
}

.placeholder-view h2 {
  color: var(--p-text-color);
  font-size: 1.5rem;
  text-transform: capitalize;
}
</style>

<style>
/* 全局重置:清除浏览器默认 margin/padding,防止 100% 布局溢出产生窗口级滚动条 */
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
