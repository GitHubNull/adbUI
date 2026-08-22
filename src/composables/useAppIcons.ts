import { reactive, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { AppInfo, AppIconEntry, AppIconMap } from '../types/device';

// ============================================
// 环境检测
// ============================================

function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

// ============================================
// 应用图标加载(后端磁盘缓存 + 前端内存缓存)
//
// 一次批量 invoke get_app_icons,后端对磁盘缓存命中的包直接读文件,
// 缺失的包在设备端批量提取(app_process,首次约 10~30 秒)。
// 失败包以空字符串标记,展示占位图标,不阻塞应用列表。
// ============================================

export function useAppIcons() {
  // 内存缓存:包名 -> data URL('' 表示获取失败,显示占位图标)
  const icons = reactive<AppIconMap>({});
  // 图标提取进行中(供视图层展示提示,可选)
  const loading = ref(false);
  // 请求序号:防止切换设备后旧请求结果覆盖新结果
  let loadSeq = 0;

  async function loadIcons(deviceId: string, apps: AppInfo[], cacheDir: string) {
    const packages = apps
      .map((a) => a.package_name)
      .filter((p) => !(p in icons));
    if (packages.length === 0) return;

    const seq = ++loadSeq;
    loading.value = true;
    try {
      if (isTauri()) {
        const result = await invoke<AppIconEntry[]>('get_app_icons', {
          deviceId,
          packages,
          cacheDir,
        });
        if (seq !== loadSeq) return; // 竞态防护:丢弃过期结果
        for (const entry of result) {
          icons[entry.package_name] = entry.icon_base64
            ? `data:image/png;base64,${entry.icon_base64}`
            : '';
        }
      } else {
        // 浏览器 mock 模式:无后端,全部占位图标
        await new Promise((r) => setTimeout(r, 300));
        if (seq !== loadSeq) return;
        for (const p of packages) {
          icons[p] = '';
        }
      }
    } catch (err) {
      if (seq === loadSeq) {
        // 整体失败(如设备断开):占位图标,不打断列表
        for (const p of packages) {
          icons[p] = '';
        }
        console.error('Failed to load app icons:', err);
      }
    } finally {
      if (seq === loadSeq) {
        loading.value = false;
      }
    }
  }

  function clearIcons() {
    loadSeq++; // 使进行中的旧请求失效
    for (const key of Object.keys(icons)) {
      delete icons[key];
    }
  }

  return {
    icons,
    loading,
    loadIcons,
    clearIcons,
  };
}
