import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { WsEvent } from '../types/device';

// ============================================
// WebSocket 实时通知客户端
// 连接后端本地 WebSocket 服务，接收设备状态推送；
// 不可用时由调用方降级为轮询。
// 模块级单例：整个应用共享一个连接。
// ============================================

// 环境检测
function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

const MAX_RECONNECT_ATTEMPTS = 5;   // 最多重连次数（超过后保持轮询模式）
const RECONNECT_BASE_DELAY = 1000;   // 重连基础延迟（指数退避）
const HEARTBEAT_INTERVAL = 30000;    // 心跳间隔

type EventCallback = (payload: unknown) => void;

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let manualClosed = false;

const connected = ref(false);
const listeners = new Map<string, Set<EventCallback>>();

function scheduleReconnect() {
  if (manualClosed || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
  const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts);
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => {
    connect();
  }, delay);
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send('ping');
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/** 连接 WebSocket（幂等，已连接或非 Tauri 环境时忽略） */
export function connect(): void {
  if (!isTauri() || ws || manualClosed) return;

  invoke<number>('get_websocket_port')
    .then((port) => {
      if (manualClosed) return;
      try {
        ws = new WebSocket(`ws://127.0.0.1:${port}`);
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        ws = null;
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        connected.value = true;
        reconnectAttempts = 0;
        startHeartbeat();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as WsEvent;
          if (!msg || typeof msg.type !== 'string') return;
          const cbs = listeners.get(msg.type);
          if (cbs) {
            for (const cb of cbs) {
              try {
                cb(msg.payload);
              } catch (err) {
                console.error('WebSocket listener error:', err);
              }
            }
          }
        } catch (err) {
          console.error('Invalid WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        connected.value = false;
        stopHeartbeat();
        ws = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          // ignore
        }
      };
    })
    .catch((err) => {
      // 无法获取端口（非 Tauri 环境或服务未启动）：保持断开，由调用方降级轮询
      console.warn('WebSocket unavailable, fallback to polling:', err);
    });
}

/** 主动断开连接（不再重连） */
export function disconnect(): void {
  manualClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  stopHeartbeat();
  if (ws) {
    ws.close();
    ws = null;
  }
  connected.value = false;
}

/** 订阅指定类型的事件，返回取消订阅函数 */
export function on(eventType: string, callback: EventCallback): () => void {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, new Set());
  }
  listeners.get(eventType)!.add(callback);
  return () => {
    listeners.get(eventType)?.delete(callback);
  };
}

export function useWebSocket() {
  return {
    /** 当前是否已建立 WebSocket 连接 */
    connected,
    connect,
    disconnect,
    on,
  };
}
