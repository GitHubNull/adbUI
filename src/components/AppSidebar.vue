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
  { label: 'Shell 终端', icon: 'pi pi-code', view: 'shell' },
  { label: '截图录屏', icon: 'pi pi-camera', view: 'screenshots' },
  { label: '性能监控', icon: 'pi pi-chart-line', view: 'perf' },
  { label: '任务中心', icon: 'pi pi-check-circle', view: 'tasks' },
  { label: '显示调节', icon: 'pi pi-desktop', view: 'display' },
  { label: '电池模拟', icon: 'pi pi-bolt', view: 'battery' },
  { label: '自动化脚本', icon: 'pi pi-code', view: 'scripts' },
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
        <img src="../assets/adbui-icon.svg" alt="adbUI" class="logo-icon" />
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
          <span v-if="activeView === item.view" class="marquee-border" aria-hidden="true">
            <span class="marquee-edge marquee-top"></span>
            <span class="marquee-edge marquee-right"></span>
            <span class="marquee-edge marquee-bottom"></span>
            <span class="marquee-edge marquee-left"></span>
          </span>
          <i :class="item.icon" class="nav-icon"></i>
          <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
        </button>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div v-tooltip.right="collapsed ? '设置' : null">
        <button class="nav-item" :class="{ active: activeView === 'settings' }" @click="navigate('settings')">
          <span v-if="activeView === 'settings'" class="marquee-border" aria-hidden="true">
            <span class="marquee-edge marquee-top"></span>
            <span class="marquee-edge marquee-right"></span>
            <span class="marquee-edge marquee-bottom"></span>
            <span class="marquee-edge marquee-left"></span>
          </span>
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
  height: 100%;
  min-height: 0;
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

.logo-icon {
  width: 28px;
  height: 28px;
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
  min-height: 0;
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
  position: relative;
}

.nav-item:hover {
  background: var(--surface-hover);
  color: var(--text-color);
}

.nav-item.active {
  background: var(--primary-color);
  color: var(--primary-color-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-weight: 600;
}

.nav-item.active .marquee-border {
  position: absolute;
  inset: -2px;
  border-radius: 8px;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.nav-item.active .marquee-edge {
  position: absolute;
  background: #3b82f6;
  opacity: 0;
  animation-duration: 2s;
  animation-iteration-count: infinite;
  animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.nav-item.active .marquee-top {
  top: 0;
  left: 0;
  height: 2px;
  width: 100%;
  transform-origin: left;
  animation-name: marqueeTop;
}

.nav-item.active .marquee-right {
  top: 0;
  right: 0;
  width: 2px;
  height: 100%;
  transform-origin: top;
  animation-name: marqueeRight;
  animation-delay: 0.5s;
}

.nav-item.active .marquee-bottom {
  bottom: 0;
  right: 0;
  height: 2px;
  width: 100%;
  transform-origin: right;
  animation-name: marqueeBottom;
  animation-delay: 1s;
}

.nav-item.active .marquee-left {
  bottom: 0;
  left: 0;
  width: 2px;
  height: 100%;
  transform-origin: bottom;
  animation-name: marqueeLeft;
  animation-delay: 1.5s;
}

@keyframes marqueeTop {
  0% {
    transform: scaleX(0);
    opacity: 1;
  }
  25% {
    transform: scaleX(1);
    opacity: 1;
  }
  50% {
    transform: scaleX(1);
    opacity: 0;
  }
  100% {
    transform: scaleX(1);
    opacity: 0;
  }
}

@keyframes marqueeRight {
  0% {
    transform: scaleY(0);
    opacity: 1;
  }
  25% {
    transform: scaleY(1);
    opacity: 1;
  }
  50% {
    transform: scaleY(1);
    opacity: 0;
  }
  100% {
    transform: scaleY(1);
    opacity: 0;
  }
}

@keyframes marqueeBottom {
  0% {
    transform: scaleX(0);
    opacity: 1;
  }
  25% {
    transform: scaleX(1);
    opacity: 1;
  }
  50% {
    transform: scaleX(1);
    opacity: 0;
  }
  100% {
    transform: scaleX(1);
    opacity: 0;
  }
}

@keyframes marqueeLeft {
  0% {
    transform: scaleY(0);
    opacity: 1;
  }
  25% {
    transform: scaleY(1);
    opacity: 1;
  }
  50% {
    transform: scaleY(1);
    opacity: 0;
  }
  100% {
    transform: scaleY(1);
    opacity: 0;
  }
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 60%;
  min-height: 20px;
  background: var(--primary-color-text);
  border-radius: 0 3px 3px 0;
  opacity: 0.9;
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
  flex-shrink: 0;
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
