<script setup lang="ts">
import { ref } from 'vue';

interface NavItem {
  label: string;
  icon: string;
  view: string;
}

const navItems: NavItem[] = [
  { label: '设备管理', icon: 'pi pi-android', view: 'devices' },
  { label: '应用管理', icon: 'pi pi-th-large', view: 'apps' },
  { label: '文件管理', icon: 'pi pi-folder', view: 'files' },
  { label: '日志查看', icon: 'pi pi-file-edit', view: 'logs' },
  { label: 'Shell 终端', icon: 'pi pi-terminal', view: 'shell' },
  { label: '截图录屏', icon: 'pi pi-camera', view: 'screenshots' },
  { label: '性能监控', icon: 'pi pi-chart-line', view: 'perf' },
  { label: '命令历史', icon: 'pi pi-history', view: 'history' },
  { label: '任务中心', icon: 'pi pi-check-circle', view: 'tasks' },
  { label: '设备信息', icon: 'pi pi-info-circle', view: 'device-info' },
  { label: '显示调节', icon: 'pi pi-desktop', view: 'display' },
  { label: '电池模拟', icon: 'pi pi-battery', view: 'battery' },
  { label: '设备控制', icon: 'pi pi-sliders-h', view: 'device-control' },
  { label: '自动化脚本', icon: 'pi pi-code', view: 'scripts' },
  { label: '常用命令库', icon: 'pi pi-bookmark', view: 'command-lib' },
];

const activeView = ref('devices');
const collapsed = ref(false);

const emit = defineEmits<{
  (e: 'navigate', view: string): void;
}>();

function navigate(view: string) {
  activeView.value = view;
  emit('navigate', view);
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="logo">
        <i class="pi pi-android"></i>
        <span v-if="!collapsed" class="logo-text">adbUI</span>
      </div>
      <Button
        class="collapse-btn"
        :icon="collapsed ? 'pi pi-chevron-right' : 'pi pi-chevron-left'"
        text
        size="small"
        @click="collapsed = !collapsed"
      />
    </div>

    <nav class="sidebar-nav">
      <div
        v-for="item in navItems"
        :key="item.view"
        v-tooltip.right="collapsed ? item.label : null"
      >
        <button
          class="nav-item"
          :class="{ active: activeView === item.view }"
          @click="navigate(item.view)"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
        </button>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div v-tooltip.right="collapsed ? '设置' : null">
        <button class="nav-item" :class="{ active: activeView === 'settings' }" @click="navigate('settings')">
          <i class="pi pi-cog nav-icon"></i>
          <span v-if="!collapsed" class="nav-label">设置</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 220px;
  height: 100vh;
  background: var(--surface-card);
  border-right: 1px solid var(--surface-200);
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-200);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary-color);
}

.logo i {
  font-size: 1.5rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-color);
}

.collapse-btn {
  padding: 0.25rem;
  width: 28px;
  height: 28px;
}

.sidebar-nav {
  flex: 1;
  padding: 0.75rem 0.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-color-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
  font-size: 0.875rem;
}

.nav-item:hover {
  background: var(--surface-hover);
  color: var(--text-color);
}

.nav-item.active {
  background: var(--primary-color);
  color: var(--primary-color-text);
}

.nav-item.active .nav-icon {
  color: var(--primary-color-text);
}

.nav-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  padding: 0.75rem 0.5rem;
  border-top: 1px solid var(--surface-200);
}

/* Scrollbar styling */
.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--surface-300);
  border-radius: 2px;
}
</style>
