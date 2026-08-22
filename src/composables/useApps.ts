import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { AppInfo, AppFilter, AdbResult } from '../types/device';
import { useAppStatus } from './useAppStatus';

// ============================================
// 环境检测
// ============================================

function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

// ============================================
// Mock 数据
// ============================================

const MOCK_APPS: AppInfo[] = [
  {
    package_name: 'com.android.chrome',
    app_name: 'Chrome',
    version_name: '120.0.6099.230',
    version_code: '609923000',
    is_system: false,
    is_enabled: true,
    apk_path: '/data/app/com.android.chrome-1/base.apk',
  },
  {
    package_name: 'com.google.android.gm',
    app_name: 'Gmail',
    version_name: '2024.01.14',
    version_code: '202401140',
    is_system: false,
    is_enabled: true,
    apk_path: '/data/app/com.google.android.gm-1/base.apk',
  },
  {
    package_name: 'com.android.settings',
    app_name: 'Settings',
    version_name: '14',
    version_code: '34',
    is_system: true,
    is_enabled: true,
    apk_path: '/system/priv-app/Settings/Settings.apk',
  },
  {
    package_name: 'com.android.camera2',
    app_name: 'Camera',
    version_name: '3.0.1',
    version_code: '301',
    is_system: true,
    is_enabled: true,
    apk_path: '/system/priv-app/Camera2/Camera2.apk',
  },
  {
    package_name: 'com.tencent.mm',
    app_name: 'WeChat',
    version_name: '8.0.47',
    version_code: '2580',
    is_system: false,
    is_enabled: true,
    apk_path: '/data/app/com.tencent.mm-1/base.apk',
  },
  {
    package_name: 'com.example.oldapp',
    app_name: 'OldApp',
    version_name: '1.0.0',
    version_code: '1',
    is_system: false,
    is_enabled: false,
    apk_path: '/data/app/com.example.oldapp-1/base.apk',
  },
];

export function useApps() {
  const apps = ref<AppInfo[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentFilter = ref<AppFilter>('all');
  const searchQuery = ref('');
  // 请求序号：防止快速切换筛选时，旧的慢请求覆盖新结果
  let fetchSeq = 0;

  // ============================================
  // 获取应用列表（后端统一返回全量，类型过滤由前端本地完成）
  // ============================================

  const { beginRefresh, endRefresh } = useAppStatus();

  async function fetchApps(deviceId: string, filter?: AppFilter) {
    const seq = ++fetchSeq;
    loading.value = true;
    error.value = null;
    const f = filter || currentFilter.value;
    currentFilter.value = f;
    beginRefresh();

    try {
      if (isTauri()) {
        const result = await invoke<AppInfo[]>('list_apps', {
          deviceId,
          filter: f,
        });
        if (seq === fetchSeq) {
          apps.value = result;
        }
      } else {
        // 浏览器 mock 模式
        await new Promise((r) => setTimeout(r, 500));
        if (seq === fetchSeq) {
          apps.value = [...MOCK_APPS];
        }
      }
    } catch (err) {
      if (seq === fetchSeq) {
        error.value = String(err);
        console.error('Failed to fetch apps:', err);
      }
    } finally {
      if (seq === fetchSeq) {
        loading.value = false;
      }
      endRefresh();
    }
  }

  // ============================================
  // 应用操作
  // ============================================

  async function uninstallApp(
    deviceId: string,
    packageName: string,
    keepData: boolean = false
  ): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('uninstall_app', {
        deviceId,
        package: packageName,
        keepData,
      });
    }
    await new Promise((r) => setTimeout(r, 300));
    return { stdout: 'Success', stderr: '', exit_code: 0 };
  }

  async function forceStopApp(deviceId: string, packageName: string): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('force_stop_app', {
        deviceId,
        package: packageName,
      });
    }
    await new Promise((r) => setTimeout(r, 200));
    return { stdout: '', stderr: '', exit_code: 0 };
  }

  async function clearAppData(deviceId: string, packageName: string): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('clear_app_data', {
        deviceId,
        package: packageName,
      });
    }
    await new Promise((r) => setTimeout(r, 300));
    return { stdout: 'Success', stderr: '', exit_code: 0 };
  }

  async function freezeApp(deviceId: string, packageName: string): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('freeze_app', {
        deviceId,
        package: packageName,
      });
    }
    await new Promise((r) => setTimeout(r, 200));
    return { stdout: 'Package com.example new state: disabled-user', stderr: '', exit_code: 0 };
  }

  async function unfreezeApp(deviceId: string, packageName: string): Promise<AdbResult> {
    if (isTauri()) {
      return await invoke<AdbResult>('unfreeze_app', {
        deviceId,
        package: packageName,
      });
    }
    await new Promise((r) => setTimeout(r, 200));
    return { stdout: 'Package com.example new state: enabled', stderr: '', exit_code: 0 };
  }

  // ============================================
  // APK 操作
  // ============================================

  async function extractApk(deviceId: string, packageName: string): Promise<AdbResult | null> {
    if (isTauri()) {
      const savePath = await save({
        defaultPath: `${packageName}.apk`,
        filters: [{ name: 'APK', extensions: ['apk'] }],
      });
      if (!savePath) return null;

      return await invoke<AdbResult>('extract_apk', {
        deviceId,
        package: packageName,
        savePath,
      });
    }
    // Mock 模式
    await new Promise((r) => setTimeout(r, 500));
    return { stdout: `(Mock) APK extracted: ${packageName}`, stderr: '', exit_code: 0 };
  }

  async function installApk(deviceId: string): Promise<AdbResult | null> {
    if (isTauri()) {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'APK', extensions: ['apk'] }],
      });
      if (!selected) return null;

      return await invoke<AdbResult>('install_apk', {
        deviceId,
        localPath: selected,
      });
    }
    // Mock 模式
    await new Promise((r) => setTimeout(r, 800));
    return { stdout: '(Mock) APK installed successfully', stderr: '', exit_code: 0 };
  }

  // ============================================
  // 批量操作
  // ============================================

  async function batchUninstall(deviceId: string, packages: string[]): Promise<string> {
    if (isTauri()) {
      return await invoke<string>('batch_uninstall', {
        deviceId,
        packages,
      });
    }
    // Mock 模式返回假任务 ID
    return 'mock_task_001';
  }

  async function batchInstall(deviceId: string, apkPaths: string[]): Promise<string> {
    if (isTauri()) {
      return await invoke<string>('batch_install', {
        deviceId,
        apkPaths,
      });
    }
    return 'mock_task_002';
  }

  return {
    apps,
    loading,
    error,
    currentFilter,
    searchQuery,
    fetchApps,
    uninstallApp,
    forceStopApp,
    clearAppData,
    freezeApp,
    unfreezeApp,
    extractApk,
    installApk,
    batchUninstall,
    batchInstall,
  };
}
