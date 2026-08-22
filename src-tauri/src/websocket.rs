// ============================================
// WebSocket 实时通知服务
// 后端在 127.0.0.1 上启动本地 WebSocket 服务器，
// 设备状态变化（连接/断开/电量等）时主动推送事件给前端。
// 前端通过 get_websocket_port 命令获取端口后连接。
// ============================================

use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc::{unbounded_channel, UnboundedSender};
use tokio_tungstenite::{accept_async, tungstenite::Message};

/// WebSocket 全局状态（由 Tauri manage 管理）
#[derive(Clone, Default)]
pub struct WsState {
    /// 实际监听端口（启动后写入，0 表示未启动）
    port: Arc<Mutex<u16>>,
    /// 客户端连接池（每个连接一个发送通道）
    clients: Arc<Mutex<Vec<UnboundedSender<Message>>>>,
}

impl WsState {
    pub fn new() -> Self {
        Self::default()
    }

    fn set_port(&self, port: u16) {
        *self.port.lock().unwrap() = port;
    }

    fn port(&self) -> u16 {
        *self.port.lock().unwrap()
    }

    /// 向所有已连接客户端广播一条消息（文本帧）
    fn broadcast(&self, payload: &str) {
        let msg = Message::Text(payload.to_string().into());
        let mut clients = self.clients.lock().unwrap();
        // retain 会在发送失败（对端已断开）时移除该连接
        clients.retain(|c| c.send(msg.clone()).is_ok());
    }
}

/// WebSocket 事件（发送给前端，结构为 { type, payload }）
#[derive(Serialize)]
pub struct WsEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub payload: serde_json::Value,
}

/// 广播设备状态变更事件
pub fn broadcast_device_changed(state: &WsState, action: &str, device_id: &str) {
    let event = WsEvent {
        event_type: "device_changed".to_string(),
        payload: serde_json::json!({
            "action": action,
            "device_id": device_id,
        }),
    };
    let payload = serde_json::to_string(&event).unwrap_or_default();
    state.broadcast(&payload);
}

/// 在应用启动时启动 WebSocket 服务器（绑定随机空闲端口）
pub fn init(app: &AppHandle) {
    let state = app.state::<WsState>().inner().clone();

    tauri::async_runtime::spawn(async move {
        let listener = match TcpListener::bind("127.0.0.1:0").await {
            Ok(l) => l,
            Err(e) => {
                eprintln!("WebSocket server bind failed: {}", e);
                return;
            }
        };

        if let Ok(addr) = listener.local_addr() {
            state.set_port(addr.port());
            eprintln!("WebSocket server listening on ws://127.0.0.1:{}", addr.port());
        }

        loop {
            match listener.accept().await {
                Ok((stream, _)) => {
                    let state = state.clone();
                    tauri::async_runtime::spawn(async move {
                        handle_connection(stream, state).await;
                    });
                }
                Err(e) => {
                    eprintln!("WebSocket accept error: {}", e);
                }
            }
        }
    });
}

/// 处理单个客户端连接：注册到连接池，读取消息直至断开
async fn handle_connection(stream: TcpStream, state: WsState) {
    let ws_stream = match accept_async(stream).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("WebSocket handshake failed: {}", e);
            return;
        }
    };

    let (mut sink, mut reader) = ws_stream.split();
    let (tx, mut rx) = unbounded_channel::<Message>();
    state.clients.lock().unwrap().push(tx.clone());

    // 写入任务：把广播消息和 pong 响应写入连接
    let writer = tauri::async_runtime::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sink.send(msg).await.is_err() {
                break;
            }
        }
    });

    // 读取客户端消息：响应心跳 ping（经 channel 转发给写入任务），其余忽略；断开时循环结束
    while let Some(Ok(msg)) = reader.next().await {
        if let Message::Text(text) = &msg {
            if text.as_str() == "ping" {
                let _ = tx.send(Message::Text("pong".to_string().into()));
            }
        }
    }

    // 客户端断开：关闭发送通道，writer 退出；连接池由下次广播 retain 清理
    drop(tx);
    writer.abort();
}

/// Tauri command：获取 WebSocket 服务器端口，供前端连接
#[tauri::command]
pub fn get_websocket_port(state: State<'_, WsState>) -> Result<u16, String> {
    let port = state.port();
    if port == 0 {
        Err("WebSocket 服务尚未启动".to_string())
    } else {
        Ok(port)
    }
}
