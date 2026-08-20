import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { AdbResult, CommandTemplate } from '../types/device';

// ============================================
// 环境检测
// ============================================

function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

// ============================================
// 内置命令库（分类 + 模板）
// ============================================

const BUILTIN_COMMANDS: CommandTemplate[] = [
  // 设备信息
  { id: 'dev-list', name: '列出设备', command: 'devices -l', category: '设备信息', builtin: true, description: '显示所有已连接设备' },
  { id: 'dev-model', name: '设备型号', command: 'shell getprop ro.product.model', category: '设备信息', builtin: true },
  { id: 'dev-android', name: 'Android 版本', command: 'shell getprop ro.build.version.release', category: '设备信息', builtin: true },
  // 应用管理
  { id: 'app-all', name: '所有应用', command: 'shell pm list packages', category: '应用管理', builtin: true },
  { id: 'app-third', name: '第三方应用', command: 'shell pm list packages -3', category: '应用管理', builtin: true },
  // 系统控制
  { id: 'sys-reboot', name: '重启设备', command: 'reboot', category: '系统控制', builtin: true },
  { id: 'sys-lock', name: '锁屏', command: 'shell input keyevent KEYCODE_POWER', category: '系统控制', builtin: true },
  // 显示调节
  { id: 'disp-size', name: '查看分辨率', command: 'shell wm size', category: '显示调节', builtin: true },
  { id: 'disp-density', name: '查看密度', command: 'shell wm density', category: '显示调节', builtin: true },
  { id: 'disp-overscan', name: '查看过扫描', command: 'shell wm overscan', category: '显示调节', builtin: true },
  // 网络调试
  { id: 'net-tcpip', name: '开启 TCP/IP', command: 'tcpip 5555', category: '网络调试', builtin: true, description: '重启 adbd 监听 5555 端口' },
  { id: 'net-ip', name: '查看 WLAN IP', command: 'shell ip addr show wlan0', category: '网络调试', builtin: true },
];

const STORAGE_KEY = 'adb-ui-command-lib';

interface StoredLib {
  favorites: string[];           // 收藏的内置命令 id
  custom: CommandTemplate[];     // 自定义命令
}

export function useCommandLib() {
  const favorites = ref<Set<string>>(new Set());
  const customCommands = ref<CommandTemplate[]>([]);
  const activeCategory = ref<string>('全部');
  const outputs = ref<Record<string, string>>({}); // 命令 id -> 输出
  const runningId = ref<string | null>(null);

  // ============================================
  // 持久化
  // ============================================

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: StoredLib = JSON.parse(raw);
        favorites.value = new Set(data.favorites || []);
        customCommands.value = data.custom || [];
      }
    } catch (e) {
      console.error('加载命令库失败:', e);
    }
  }

  function save() {
    const data: StoredLib = {
      favorites: Array.from(favorites.value),
      custom: customCommands.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ============================================
  // 命令列表
  // ============================================

  const allCommands = computed<CommandTemplate[]>(() => {
    const builtin = BUILTIN_COMMANDS.map((c) => ({
      ...c,
      favorite: favorites.value.has(c.id),
    }));
    return [...builtin, ...customCommands.value];
  });

  const categories = computed<string[]>(() => {
    const set = new Set<string>(['全部', '我的收藏']);
    for (const c of allCommands.value) set.add(c.category);
    set.add('自定义');
    return Array.from(set);
  });

  const filteredCommands = computed<CommandTemplate[]>(() => {
    if (activeCategory.value === '全部') return allCommands.value;
    if (activeCategory.value === '我的收藏') {
      return allCommands.value.filter((c) => favorites.value.has(c.id));
    }
    if (activeCategory.value === '自定义') return customCommands.value;
    return allCommands.value.filter((c) => c.category === activeCategory.value);
  });

  // ============================================
  // 收藏
  // ============================================

  function toggleFavorite(id: string) {
    if (favorites.value.has(id)) {
      favorites.value.delete(id);
    } else {
      favorites.value.add(id);
    }
    save();
  }

  // ============================================
  // 自定义命令
  // ============================================

  function addCustom(name: string, command: string, category: string) {
    const cmd: CommandTemplate = {
      id: `custom-${Date.now()}`,
      name,
      command,
      category: category || '自定义',
      builtin: false,
    };
    customCommands.value.push(cmd);
    save();
  }

  function removeCustom(id: string) {
    customCommands.value = customCommands.value.filter((c) => c.id !== id);
    save();
  }

  // ============================================
  // 执行命令
  // ============================================

  async function execute(deviceId: string, cmd: CommandTemplate): Promise<AdbResult> {
    runningId.value = cmd.id;
    try {
      let result: AdbResult;
      if (isTauri()) {
        result = await invoke<AdbResult>('execute_adb', {
          command: cmd.command,
          deviceId,
        });
      } else {
        await new Promise((r) => setTimeout(r, 300));
        result = { stdout: `(Mock) ${cmd.command}`, stderr: '', exit_code: 0 };
      }
      outputs.value[cmd.id] = result.stdout || result.stderr || '(无输出)';
      return result;
    } finally {
      runningId.value = null;
    }
  }

  // 初始化加载
  load();

  return {
    activeCategory,
    categories,
    filteredCommands,
    outputs,
    runningId,
    toggleFavorite,
    addCustom,
    removeCustom,
    execute,
  };
}
