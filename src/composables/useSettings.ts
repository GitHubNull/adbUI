import { ref } from 'vue';

// ============================================
// 设置模块（localStorage 持久化）
// ============================================

const STORAGE_KEY = 'adb-ui-settings';

export interface AppSettings {
  adbPath: string;        // ADB 路径（预留，桌面化阶段生效）
  theme: string;          // 主题 light/dark
  defaultTimeout: number; // 默认命令超时（秒）
  pollingInterval: number; // 设备轮询间隔（毫秒）
  iconCacheDir: string;   // 应用图标缓存目录（相对路径基于应用启动运行目录）
}

const DEFAULT_SETTINGS: AppSettings = {
  adbPath: '',
  theme: 'light',
  defaultTimeout: 10,
  pollingInterval: 3000,
  iconCacheDir: './cache/icons',
};

export function useSettings() {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        settings.value = { ...DEFAULT_SETTINGS, ...data };
      }
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
  }

  function reset() {
    settings.value = { ...DEFAULT_SETTINGS };
    save();
  }

  load();

  return {
    settings,
    save,
    reset,
  };
}
