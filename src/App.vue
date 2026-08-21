<script setup lang="ts">
import { ref } from 'vue';
import AppSidebar from './components/AppSidebar.vue';
import DeviceManager from './views/DeviceManager.vue';
import AppManager from './views/AppManager.vue';
import FileManager from './views/FileManager.vue';
import TaskCenter from './views/TaskCenter.vue';
import DisplaySettings from './views/DisplaySettings.vue';
import BatterySimulator from './views/BatterySimulator.vue';
import DeviceControl from './views/DeviceControl.vue';
import ScriptAutomation from './views/ScriptAutomation.vue';
import CommandLibrary from './views/CommandLibrary.vue';
import DeviceInfoReport from './views/DeviceInfoReport.vue';
import Settings from './views/Settings.vue';
import LogViewer from './views/LogViewer.vue';
import ShellTerminal from './views/ShellTerminal.vue';
import ScreenshotRecorder from './views/ScreenshotRecorder.vue';
import PerformanceMonitor from './views/PerformanceMonitor.vue';
import CommandHistoryView from './views/CommandHistoryView.vue';
import { useDevices } from './composables/useDevices';
import { useToast } from 'primevue/usetoast';

const currentView = ref('devices');
const toast = useToast();

const {
  devices,
  loading,
  selectedDevice,
  deviceDetail,
  detailLoading,
  refreshDevices,
  selectDevice,
} = useDevices();

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
</script>

<template>
  <div class="app-layout">
    <AppSidebar @navigate="onNavigate" />

    <main class="main-content">
      <DeviceManager
        v-if="currentView === 'devices'"
        :devices="devices"
        :selected-device="selectedDevice"
        :device-detail="deviceDetail"
        :detail-loading="detailLoading"
        @select="selectDevice"
        @refresh="refreshDevices"
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

      <DeviceControl
        v-else-if="currentView === 'device-control'"
        :selected-device="selectedDevice"
        @toast="showToast"
      />

      <ScriptAutomation
        v-else-if="currentView === 'scripts'"
        :selected-device="selectedDevice"
        @toast="showToast"
      />

      <CommandLibrary
        v-else-if="currentView === 'command-lib'"
        :selected-device="selectedDevice"
        @toast="showToast"
      />

      <DeviceInfoReport
        v-else-if="currentView === 'device-info'"
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

      <CommandHistoryView
        v-else-if="currentView === 'history'"
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
    </main>

    <!-- Global Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <ProgressSpinner />
      <span>正在刷新设备列表...</span>
    </div>

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

:global(html), :global(body), :global(#app) {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: hidden;
  background: var(--surface-ground);
}

.placeholder-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color-secondary);
  gap: 1rem;
}

.placeholder-icon {
  font-size: 4rem;
  color: var(--surface-400);
}

.placeholder-view h2 {
  color: var(--text-color);
  font-size: 1.5rem;
  text-transform: capitalize;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: white;
  z-index: 9999;
}
</style>
