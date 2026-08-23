# AGENTS.md

面向 AI 编码助手的项目指南。修改本仓库代码前请先阅读本文。

## 项目概述

本项目是跨平台 PC 端 ADB(Android Debug Bridge)设备管理桌面应用 **adbUI** 的真实实现，采用 Tauri (Rust + Vue) 技术栈。提供设备列表管理、设备详情查看与 ADB 命令执行等能力。

**与 `ref/` 目录的关系**：`ref/adbUITools_html_ui_design/` 是纯前端 UI 设计稿（HTML/CSS/JS + mock 数据，不连接真实设备），仅作为界面布局与交互的设计参考，不属于运行时源码，不要将其视为当前应用的实现。

## 核心架构

Tauri Backend (Rust) + Vue Frontend (TypeScript)，通过 Tauri `invoke` 通信：

```
Vue Frontend (src/)  --invoke-->  Rust Backend (src-tauri/src/)
   useDevices.ts                     adb/ 模块目录 (device/apps/files/...)
   useApps.ts                        task.rs
   ...                               websocket.rs (WebSocket 推送)
                                     lib.rs (命令注册)
```

- **后端**：`src-tauri/src/adb/` 目录按功能划分为 15 个子模块（device / apps / app_icons / files / batch / m2 / m2_commands / m2_tests / logs / screenshot / performance / history / report / models / helpers），定义 `DeviceInfo` / `DeviceDetail` / `AdbResult` 等 `serde::Serialize` 模型并实现 50+ 个 `#[tauri::command]`，通过 `mod.rs` 统一 re-export；`task.rs` 提供任务框架（批量操作进度跟踪）；`websocket.rs` 提供本地 WebSocket 实时通知服务（设备状态变化推送）；`lib.rs` 通过 `generate_handler!` 注册命令。ADB 底层交互采用 Rust 库 `adb_client`（见 README 技术栈章节）。
- **前端**：`src/composables/useDevices.ts` 是设备相关的核心组合式函数（WebSocket 实时同步 + 5 秒降级轮询、详情获取、命令执行、无线连接），通过 `isTauri()` 检测运行环境——Tauri 内调用 `invoke`，浏览器中自动降级为 mock 数据，方便纯前端调试。
- **类型**：`src/types/device.ts` 中的 TypeScript 类型与 Rust 端 `Serialize` 结构保持字段一致，改动后端模型时需同步。
- **事件**：后端通过 `Emitter` 发送 `task-progress`（批量任务进度）和 `script-progress`（脚本执行进度）事件；通过 `websocket.rs` 启动的本地 WebSocket 服务推送 `device_changed`（设备连接/断开/状态变化）事件，前端 `useWebSocket.ts` 单例客户端订阅，不可用时自动降级为轮询。

## 完整命令清单

以下按功能分组列出所有 Tauri 命令（来源：`src-tauri/src/lib.rs` 的 `generate_handler!`）：

### 设备核心

| 命令 | 签名 | 说明 |
|------|------|------|
| `list_devices` | `() -> Vec<DeviceInfo>` | 获取已连接设备列表 |
| `get_device_detail` | `device_id: String -> DeviceDetail` | 获取设备详细信息 |
| `execute_adb` | `device_id, command -> AdbResult` | 执行 ADB shell 命令 |

### 无线连接

| 命令 | 签名 | 说明 |
|------|------|------|
| `connect_device` | `ip, port -> AdbResult` | 连接无线设备（IP:端口） |
| `disconnect_device` | `ip, port -> AdbResult` | 断开无线设备（IP:端口） |
| `disconnect_device_by_id` | `device_id -> AdbResult` | 按设备 ID 断开设备 |
| `scan_network_devices` | `() -> Vec<NetworkDevice>` | 扫描局域网 ADB 设备（mDNS） |
| `generate_pairing_qr` | `() -> QrPairingInfo` | 生成扫码配对二维码与配对码 |
| `wait_and_pair_device` | `service_name, password, timeout_secs -> String` | 等待手机扫码完成 mDNS 配对并连接 |

### WebSocket 实时通知

| 命令 | 签名 | 说明 |
|------|------|------|
| `get_websocket_port` | `() -> u16` | 获取本地 WebSocket 服务端口（前端连接后订阅 `device_changed` 事件） |

### 应用管理

| 命令 | 签名 | 说明 |
|------|------|------|
| `list_apps` | `device_id, filter -> Vec<AppInfo>` | 获取应用列表（all/user/system） |
| `uninstall_app` | `device_id, package -> AdbResult` | 卸载应用 |
| `force_stop_app` | `device_id, package -> AdbResult` | 强制停止应用 |
| `clear_app_data` | `device_id, package -> AdbResult` | 清除应用数据 |
| `freeze_app` | `device_id, package -> AdbResult` | 冻结应用 |
| `unfreeze_app` | `device_id, package -> AdbResult` | 解冻应用 |
| `extract_apk` | `device_id, package, dest_path -> AdbResult` | 提取 APK |
| `install_apk` | `device_id, local_path -> AdbResult` | 安装 APK |
| `get_app_icons` | `device_id, cache_dir? -> AppIconEntry` | 批量提取应用图标（设备端 dex 提取器，zip 打包返回） |
| `get_app_detail` | `device_id, package -> AppDetail` | 获取应用详情（安装来源/大小/SDK 等） |

### 文件管理

| 命令 | 签名 | 说明 |
|------|------|------|
| `list_files` | `device_id, path -> Vec<FileItem>` | 列出目录内容 |
| `pull_file` | `device_id, remote_path, local_path -> AdbResult` | 下载文件 |
| `push_file` | `device_id, local_path, remote_path -> AdbResult` | 上传文件 |
| `read_file_base64` | `device_id, path -> String` | 读取文件为 base64（10MB 限制，图片预览用） |

### 任务框架

| 命令 | 签名 | 说明 |
|------|------|------|
| `get_tasks` | `() -> Vec<TaskInfo>` | 获取所有任务 |
| `cancel_task` | `task_id -> ()` | 取消任务 |
| `clear_completed_tasks` | `() -> ()` | 清理已完成任务 |

### 批量操作

| 命令 | 签名 | 说明 |
|------|------|------|
| `batch_uninstall` | `device_id, packages -> TaskInfo` | 批量卸载 |
| `batch_install` | `device_id, paths -> TaskInfo` | 批量安装 |

### M2 玩机核心

| 命令 | 签名 | 说明 |
|------|------|------|
| `get_display_state` | `device_id -> DisplayState` | 获取显示状态 |
| `set_display` | `device_id, size?, density?, overscan? -> AdbResult` | 设置显示参数 |
| `reset_display` | `device_id -> AdbResult` | 恢复默认显示 |
| `set_system_param` | `key, value -> AdbResult` | 设置系统参数 |
| `get_battery_state` | `device_id -> BatteryState` | 获取电池状态 |
| `battery_simulate` | `device_id, level?, temp?, status? -> AdbResult` | 模拟电池 |
| `battery_reset` | `device_id -> AdbResult` | 恢复真实电池 |
| `reboot_device` | `device_id, mode -> AdbResult` | 重启设备 |
| `send_input` | `device_id, action, params -> AdbResult` | 输入模拟 |
| `execute_script` | `device_id, script -> AdbResult` | 执行脚本 |
| `get_device_report` | `device_id -> DeviceReport` | 设备信息报告 |

### 日志查看

| 命令 | 签名 | 说明 |
|------|------|------|
| `get_device_logs` | `device_id -> String` | 获取日志（logcat -d 快照，级别/Tag/PID/文本过滤由前端完成） |

### 截图录屏

| 命令 | 签名 | 说明 |
|------|------|------|
| `take_screenshot` | `device_id -> ScreenshotResult` | 截图（base64 PNG） |
| `save_screenshot` | `device_id, path? -> AdbResult` | 保存截图（dialog 选路径） |
| `check_screen_record_support` | `device_id -> bool` | 检测录屏支持 |
| `start_screen_record` | `device_id -> AdbResult` | 开始录屏 |
| `stop_screen_record` | `device_id -> AdbResult` | 停止录屏 |

### 性能监控

| 命令 | 签名 | 说明 |
|------|------|------|
| `get_performance_data` | `device_id -> PerformanceData` | 获取性能数据 |

### 命令历史

| 命令 | 签名 | 说明 |
|------|------|------|
| `get_command_history` | `() -> Vec<CommandHistoryEntry>` | 获取命令历史 |
| `clear_command_history` | `() -> ()` | 清空命令历史 |

## 常用命令

```bash
# 安装依赖
pnpm install

# 桌面端开发（Tauri 窗口，通过 adb_client 库直连 ADB 服务，无需本机安装 adb）
pnpm tauri dev

# 浏览器开发（Mock 模式，无需 adb）
pnpm dev

# 前端构建（含 vue-tsc 类型检查）
pnpm build

# 打包桌面应用
pnpm tauri build
```

## 目录结构

```
├── src/                    # 前端源码 (Vue 3 + TypeScript)
│   ├── components/         # 通用组件（含 AppSidebar / AppStatusBar 与各模块子组件）
│   ├── composables/        # 组合式函数（19 个，按模块划分）
│   ├── types/              # TS 类型定义（device.ts 集中定义）
│   └── views/              # 页面视图（12 个在用；CommandHistoryView 等 4 个遗留文件未被 App.vue 引用）
├── src-tauri/              # Tauri 后端 (Rust)
│   └── src/
│       ├── adb/            # ADB 通信模块（15 个功能子模块 + mod.rs，50+ 命令）
│       ├── task.rs         # 任务框架（进度、取消、状态管理）
│       ├── websocket.rs    # WebSocket 实时通知服务（device_changed 推送）
│       └── lib.rs          # 应用入口与命令注册
├── ref/                    # 参考原型（UI 设计稿，只读不改）
├── doc/                    # 项目文档（设计文档、规划等）
├── img/                    # 项目必要的图片资源
└── tmp/                    # 临时文件（已被 .gitignore 忽略）
```

## 代码规范

### Rust (src-tauri/)

- ADB 相关命令按功能放在 `adb/` 目录下对应模块文件（如应用相关放 `apps.rs`），任务相关放在 `task.rs`，WebSocket 推送相关放在 `websocket.rs`
- 数据模型使用 `#[derive(Serialize)]`，`#[tauri::command]` 函数命名 `snake_case`
- 新增命令后必须在 `lib.rs` 的 `generate_handler!` 中注册
- 错误处理统一返回 `Result<_, String>`，用 `map_err` 转为可读信息，避免直接 `unwrap()`

### TypeScript / Vue (src/)

- 使用 Vue 3 `<script setup>` SFC 与组合式 API（`ref` / `computed` / `onMounted`）
- 设备相关类型统一放 `src/types/device.ts`，禁止在组件内重复定义
- 调用后端命令统一走 `useDevices` 等 composable，并保留 `isTauri()` 的 mock 降级分支（浏览器调试依赖此模式）
- 组件内不写魔数，轮询间隔等常量在 composable 顶部定义

### 通用

- 注释使用中文，分节注释 `// ============` 或 `<!-- ============ -->`
- 不修改 `ref/` 目录下的参考原型代码

## 代码生成模式

### Composable 模板

新增功能模块时，composable 应遵循以下模式：

```typescript
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';

const IS_TAURI = () => !!(window as any).__TAURI__;

// Mock 数据（浏览器调试用）
const mockData = { ... };

export function useXxx() {
  const data = ref(...);
  const loading = ref(false);

  async function fetchData(deviceId: string) {
    loading.value = true;
    try {
      if (IS_TAURI()) {
        data.value = await invoke('command_name', { device_id: deviceId });
      } else {
        data.value = mockData; // 浏览器降级
      }
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, fetchData };
}
```

### #[tauri::command] 模板

```rust
#[derive(Serialize)]
pub struct MyResult {
    pub field: String,
}

#[tauri::command]
pub async fn my_command(device_id: String) -> Result<MyResult, String> {
    let mut server = ADBServer::default();
    let device = server.get_device_by_name(&device_id)
        .map_err(|e| format!("获取设备失败: {}", e))?;

    // ... 执行操作 ...

    Ok(MyResult { field: "value".to_string() })
}
```

### 类型同步规则

后端修改数据模型时，必须同步前端类型：

1. Rust 端：`#[derive(Serialize)]` 结构体字段
2. TS 端：`src/types/device.ts` 对应 interface 字段
3. 确保字段名、类型、可选性一致

## 自动化任务执行指南

### 新增后端命令五步法

| 步骤 | 操作 | 文件 |
|------|------|------|
| 1 | 定义模型与 `#[tauri::command]` | `src-tauri/src/adb/` 对应模块文件（如 `apps.rs`） |
| 2 | 在 `generate_handler!` 中注册 | `src-tauri/src/lib.rs` |
| 3 | 添加 TypeScript 类型 | `src/types/device.ts` |
| 4 | 在 composable 中添加 invoke 调用并保留 mock 分支 | `src/composables/useXxx.ts` |
| 5 | 在视图中集成 | `src/views/Xxx.vue` |

### 视图切换模式

新增功能模块时，需修改三处：

1. **App.vue**：导入组件并添加 `v-else-if="currentView === 'xxx'"` 分支
2. **AppSidebar.vue**：在 `navItems` 数组中添加导航项
3. **新建**：`src/views/Xxx.vue` 视图组件 + `src/composables/useXxx.ts` composable

```typescript
// AppSidebar.vue navItems 示例
const navItems = [
  { label: '设备管理', icon: 'pi pi-android', view: 'devices' },
  // ... 添加新项
  { label: '新模块', icon: 'pi pi-star', view: 'new-module' },
];
```

## 常见任务指引

| 任务 | 步骤 |
| --- | --- |
| 新增后端命令 | 1. `adb/` 对应模块文件定义模型与 `#[tauri::command]` 2. `lib.rs` 注册 3. `src/types/device.ts` 添加对应 TS 类型 4. composable 中添加 `invoke` 调用并保留 mock 分支 5. 视图中集成 |
| 修改界面 | 视图在 `src/views/`，侧边栏在 `src/components/AppSidebar.vue`，设备数据流经 `useDevices` |
| 新增功能模块 | 参考 `App.vue` 的 `currentView` 视图切换模式，同步侧边栏导航项，创建对应 composable |
| 调整 ADB 交互 | 只改 `src-tauri/src/adb/` 对应模块（底层库调用），前端无感知 |
| 新增实时数据源 | 后端 `websocket.rs` 推送事件，前端 `useWebSocket` 订阅并保留降级轮询分支 |

## 已知陷阱

### 1. Shell v1 协议无 exit code 的误判

**问题**：`adb_client` 的 shell v1 协议不返回 exit code，`execute_adb` 等命令的 `AdbResult.exit_code` 可能为 0 即使命令实际失败。

**根因**：adb_client shell_command 在 v1 协议下返回 `None` 作为 exit code，代码中默认填充 0。

**修复模式**：以 stdout/stderr 内容判断结果，而非依赖 exit_code。参见 `adb/` 目录中相关命令的实现。

**历史**：v0.3.1 修复了此问题，涉及批量卸载、命令执行等场景。

### 2. 系统应用判断用 pkgFlags 而非路径

**问题**：早期通过 apk 路径（是否包含 `/system/`）判断系统应用，导致误判。

**根因**：部分系统应用 apk 路径不在 `/system/` 下，且用户应用路径可能含类似字符串。

**修复模式**：解析 `pkgFlags` 字段，检查 `SYSTEM` flag（兼容字符串标志和位掩码格式）。

**历史**：v0.3.1 修复，涉及 `list_apps` 命令。

### 3. 录屏路径与权限

**问题**：录屏文件写入 `/sdcard/` 可能因权限失败，adb shell 退出时 SIGHUP 终止录屏进程。

**修复模式**：使用 `/data/local/tmp/` 路径（shell 用户可写），`setsid` 启动避免 SIGHUP，启动后校验进程存在，停止时校验文件存在且非空。

**历史**：v0.6.0 修复。

## 注意事项

- 不要向 `tmp/` 写入需要入库的内容（已被忽略）；截图等产物放 `doc/` 或 `img/`
- 文档类产物（设计文档、规划）统一放 `doc/`
- README 的技术栈/依赖说明与后端实现需保持一致，涉及 ADB 通信方式变更时同步更新
- 新增依赖时同步更新 `package.json` / `Cargo.toml` 和 README 的技术栈章节
