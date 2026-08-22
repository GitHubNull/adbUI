import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { LogEntry, LogLevel } from '../types/device';
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

const MOCK_LOGS = `08-21 08:42:15.234  1234  5678 I ActivityManager: Start proc 2847:com.android.chrome/u0a123 for activity {com.android.chrome/com.google.android.apps.chrome.Main}
08-21 08:42:15.312  2847  2847 D Chrome: Chrome onCreate() called
08-21 08:42:15.456  1234  5678 I ActivityManager: Displayed com.android.chrome/.MainActivity: +234ms
08-21 08:42:16.123  2847  2860 W chromium: [WARNING:dns_config_service_posix.cc(341)] Failed to read DnsConfig.
08-21 08:42:16.234  2847  2865 E chromium: [ERROR:ssl_client_socket_impl.cc(982)] handshake failed; returned -1, SSL error code 1, net_error -200
08-21 08:42:17.001  1234  5678 I ActivityManager: Killing 1923:com.spotify.music/u0a145 (adj 905): empty #17
08-21 08:42:17.234  1234  5680 D WindowManager: Relayout Window{8a1b2c3d u0 com.android.chrome/com.google.android.apps.chrome.Main}: vis=0 relayoutAsync=0
08-21 08:42:18.567  2847  2870 V Chrome: TabModelSelectorImpl.onTabStateInitialized: mTabStateInitialized = true
08-21 08:42:19.001  1234  5678 W ActivityManager: Slow operation: 78ms so far, now at attachApplicationLocked
08-21 08:42:20.123  2847  2880 I chromium: Navigation to https://www.google.com completed
08-21 08:42:21.456  1234  5682 D ConnectivityService: NetReassign [100, 1, 0, 0]
08-21 08:42:22.001  2847  2890 W chromium: [WARNING:spdy_session.cc(3542)] Received RST_STREAM for stream 5
08-21 08:42:23.234  1234  5678 I ActivityManager: Start proc 3123:com.google.android.gms/u0a101 for service {com.google.android.gms/.location.history.HistoryUploadService}
08-21 08:42:24.567  3123  3123 D GmsCore: GCM HbAlarm scheduled for 900000ms
08-21 08:42:25.001  1234  5684 E JavaBinder: *** Uncaught remote exception! (Exceptions are not yet supported across processes.)
08-21 08:42:26.123  2847  2900 V Chrome: IntentDispatcher.dispatch: Intent { act=android.intent.action.VIEW dat=https://www.google.com/... flg=0x10000000 }
08-21 08:42:27.456  1234  5678 I ActivityManager: Process com.spotify.music (pid 1923) has died: prcp PER
08-21 08:42:28.001  2847  2910 D chromium: [INFO:CONSOLE(1)] "Google Analytics loaded", source: https://www.google.com/ (1)
08-21 08:42:29.234  1234  5686 W BroadcastQueue: Background execution not allowed: receiving Intent { act=android.intent.action.PACKAGE_CHANGED dat=package:com.android.chrome flg=0x4000010 (has extras) } to com.google.android.gms/.chimera.GmsIntentOperationService$GmsExternalReceiver`;

export function useLogs() {
  const logs = ref<LogEntry[]>([]);
  const loading = ref(false);
  const levelFilter = ref<LogLevel | ''>('');
  const tagFilter = ref('');
  const pidFilter = ref('');
  const searchQuery = ref('');
  const paused = ref(false);

  // ============================================
  // 解析 logcat 行
  // ============================================

  function parseLogcatLine(line: string): LogEntry | null {
    // 标准 logcat 格式: "MM-DD HH:MM:SS.mmm  PID  TID L TAG: message"
    const match = line.match(
      /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+([^:]+):\s*(.*)$/
    );
    if (!match) return null;

    return {
      time: match[1],
      pid: parseInt(match[2], 10),
      tid: parseInt(match[3], 10),
      level: match[4] as LogLevel,
      tag: match[5].trim(),
      message: match[6],
      raw: line,
    };
  }

  // ============================================
  // 获取日志
  // ============================================

  const { beginRefresh, endRefresh } = useAppStatus();

  async function fetchLogs(deviceId: string) {
    if (paused.value) return;

    loading.value = true;
    beginRefresh();
    try {
      let rawText: string;
      if (isTauri()) {
        rawText = await invoke<string>('get_device_logs', { deviceId });
      } else {
        await new Promise((r) => setTimeout(r, 300));
        rawText = MOCK_LOGS;
      }

      const entries: LogEntry[] = [];
      for (const line of rawText.split('\n')) {
        if (!line.trim()) continue;
        const entry = parseLogcatLine(line);
        if (entry) {
          entries.push(entry);
        }
      }
      logs.value = entries;
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      loading.value = false;
      endRefresh();
    }
  }

  // ============================================
  // 过滤
  // ============================================

  const filteredLogs = computed(() => {
    let result = logs.value;

    if (levelFilter.value) {
      const minLevel = levelFilter.value;
      const levels: LogLevel[] = ['V', 'D', 'I', 'W', 'E', 'F'];
      const minIdx = levels.indexOf(minLevel);
      result = result.filter((l) => levels.indexOf(l.level) >= minIdx);
    }

    if (tagFilter.value) {
      const q = tagFilter.value.toLowerCase();
      result = result.filter((l) => l.tag.toLowerCase().includes(q));
    }

    if (pidFilter.value) {
      const pid = parseInt(pidFilter.value, 10);
      if (!isNaN(pid)) {
        result = result.filter((l) => l.pid === pid);
      }
    }

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.tag.toLowerCase().includes(q)
      );
    }

    return result;
  });

  // ============================================
  // 操作
  // ============================================

  function clearLogs() {
    logs.value = [];
  }

  function togglePause() {
    paused.value = !paused.value;
  }

  function getLogText(): string {
    return filteredLogs.value.map((l) => l.raw).join('\n');
  }

  function getLevelColor(level: LogLevel): string {
    switch (level) {
      case 'V': return '#6b7280';
      case 'D': return '#3b82f6';
      case 'I': return '#22c55e';
      case 'W': return '#f59e0b';
      case 'E': return '#ef4444';
      case 'F': return '#dc2626';
      default: return '#6b7280';
    }
  }

  return {
    logs,
    loading,
    levelFilter,
    tagFilter,
    pidFilter,
    searchQuery,
    paused,
    filteredLogs,
    fetchLogs,
    clearLogs,
    togglePause,
    getLogText,
    getLevelColor,
  };
}
