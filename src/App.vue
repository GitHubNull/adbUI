<script setup lang="ts">
import { ref } from 'vue';
import AppSidebar from './components/AppSidebar.vue';
import DeviceManager from './views/DeviceManager.vue';
import { useDevices } from './composables/useDevices';

const currentView = ref('devices');

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
