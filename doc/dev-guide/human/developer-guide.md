# adbUI 开发维护指南

> 本文档面向参与 adbUI 开发、维护或二次开发的人类开发者。
>
> 如果您是 adbUI 用户，请查阅 [用户指南](../user-guide/user-guide.md)。
> 如果您是 AI 编码助手，请优先查阅 [AI Agent 指南](../ai-agent/AGENTS.md)。

## 目录

- [架构详解](#架构详解)
- [项目结构](#项目结构)
- [代码规范](#代码规范)
- [调试方法](#调试方法)
- [常见任务指引](#常见任务指引)
- [构建与发布](#构建与发布)

---

## 架构详解

### 整体架构

adbUI 采用 **Tauri (Rust) + Vue 3 (TypeScript)** 架构：

```
Vue Frontend (src/)  --invoke-->  Rust Backend (src-tauri/src/)
   useDevices.ts                     adb/ 模块目录 (device/apps/files/...)
   useApps.ts                        task.rs
   ...                               websocket.rs (WebSocket 推送)
                                     lib.rs (命令注册)
```

通信流程：
1. 前端通过 `@tauri-apps/api` 的 `invoke()` 调用后端命令
2. 后端 `lib.rs` 通过 `generate_handler!` 注册所有命令
3. 命令实现分布在 `adb/` 模块目录（ADB 交互）、`task.rs`（任务框架）与 `websocket.rs`（实时推送）
4. 后端通过 `Emitter` 向前端发送事件（如 `task-progress`、`script-progress`），通过 WebSocket 服务推送设备状态变化（`device_changed`）

### 关键模块

| 模块 | 文件 | 职责 |
|------|------|------|
| ADB 通信 | `src-tauri/src/adb/` | 所有 ADB 相关 Tauri 命令，按功能划分为 15 个子模块（device / apps / app_icons / files / batch / m2 / m2_commands / m2_tests / logs / screenshot / performance / history / report / models / helpers），`mod.rs` 统一 re-export |
| 任务框架 | `src-tauri/src/task.rs` | 批量任务的创建、进度跟踪、取消 |
| 实时通知 | `src-tauri/src/websocket.rs` | 本地 WebSocket 服务器，设备状态变化时主动推送事件 |
| 命令注册 | `src-tauri/src/lib.rs` | Tauri 应用入口，命令注册与插件初始化 |
| 设备核心 | `src/composables/useDevices.ts` | 设备同步（WebSocket 实时 + 降级轮询）、详情获取、命令执行、无线连接 |
| 实时客户端 | `src/composables/useWebSocket.ts` | WebSocket 单例客户端（指数退避重连、心跳、事件分发） |
| 视图入口 | `src/App.vue` | 视图切换（currentView）与全局状态 |
| 侧边栏 | `src/components/AppSidebar.vue` | 导航菜单定义（11 个功能页 + 底部设置入口） |

### 事件机制

后端通过两种通道向前端发送事件：

**Tauri `Emitter` 事件**（`listen()` 监听）：

- **`task-progress`**：批量任务进度更新（`TaskInfo` 结构）
- **`script-progress`**：脚本执行进度（`ScriptProgress` 结构，含行号、状态、消息）

**WebSocket 实时推送**（`useWebSocket` 客户端订阅）：

- **`device_changed`**：设备连接/断开/状态变化（`DeviceChangedPayload`），各模块 composable 订阅后自动刷新数据；WebSocket 不可用时自动降级为定时轮询

---

## 项目结构

```
├── src/                          # 前端源码 (Vue 3 + TypeScript)
│   ├── components/               # 通用组件
│   │   ├── AppSidebar.vue        # 侧边栏导航（11 个功能页 + 底部设置）
│   │   ├── AppStatusBar.vue      # 底部状态栏（同步状态、设备/任务统计）
│   │   ├── device-manager/       # 设备管理子组件（含无线连接对话框）
│   │   ├── app-manager/          # 应用管理子组件（工具栏/表格/详情/确认）
│   │   └── display-settings/     # 显示调节子组件（预设/过扫描/系统参数）
│   ├── composables/              # 组合式函数（19 个，按模块划分）
│   │   ├── useDevices.ts         # 设备管理核心（WebSocket 实时 + 降级轮询、无线连接）
│   │   ├── useWebSocket.ts       # WebSocket 单例客户端（重连、心跳、事件分发）
│   │   ├── useAppStatus.ts       # 全局刷新/同步状态（状态栏数据源）
│   │   ├── useApps.ts            # 应用管理
│   │   ├── useAppIcons.ts        # 应用图标提取与缓存
│   │   ├── useFiles.ts           # 文件管理
│   │   ├── useLogs.ts            # 日志查看
│   │   ├── useShell.ts           # Shell 终端
│   │   ├── useScreenshot.ts      # 截图录屏
│   │   ├── usePerformance.ts     # 性能监控
│   │   ├── useCommandHistory.ts  # 命令历史（Shell 终端抽屉使用）
│   │   ├── useTasks.ts           # 任务中心
│   │   ├── useDeviceReport.ts    # 设备信息报告（设备管理器内嵌使用）
│   │   ├── useDisplay.ts         # 显示调节
│   │   ├── useBattery.ts         # 电池管理
│   │   ├── useControl.ts         # 设备控制（脚本自动化内嵌使用）
│   │   ├── useScripts.ts         # 自动化脚本
│   │   ├── useCommandLib.ts      # 常用命令库（Shell 终端抽屉使用）
│   │   └── useSettings.ts        # 设置
│   ├── types/                    # TypeScript 类型定义
│   │   └── device.ts             # 所有设备相关类型（与 Rust 结构对应）
│   ├── views/                    # 页面视图（12 个在用）
│   │   ├── DeviceManager.vue     # 设备管理（内嵌信息报告与无线连接）
│   │   ├── AppManager.vue        # 应用管理
│   │   ├── FileManager.vue       # 文件管理
│   │   ├── LogViewer.vue         # 日志查看
│   │   ├── ShellTerminal.vue     # Shell 终端（内嵌命令库/命令历史抽屉）
│   │   ├── ScreenshotRecorder.vue # 截图录屏
│   │   ├── PerformanceMonitor.vue # 性能监控
│   │   ├── TaskCenter.vue        # 任务中心
│   │   ├── DisplaySettings.vue   # 显示调节
│   │   ├── BatterySimulator.vue  # 电池管理
│   │   ├── ScriptAutomation.vue  # 自动化脚本（内嵌输入模拟与重启）
│   │   └── Settings.vue          # 设置
│   ├── App.vue                   # 应用入口（currentView 切换）
│   └── main.ts                   # Vue 应用初始化
├── src-tauri/                    # Tauri 后端 (Rust)
│   └── src/
│       ├── adb/                  # ADB 通信模块（15 个子模块 + mod.rs，50+ 命令）
│       │   ├── mod.rs            # 模块入口（统一 re-export）
│       │   ├── models.rs         # 数据模型
│       │   ├── helpers.rs        # 公共辅助函数
│       │   ├── device.rs         # 设备核心（含无线连接/扫码配对）
│       │   ├── apps.rs           # 应用管理
│       │   ├── app_icons.rs      # 应用图标提取
│       │   ├── files.rs          # 文件管理
│       │   ├── batch.rs          # 批量操作
│       │   ├── m2.rs             # M2 玩机核心（显示/电池/控制）
│       │   ├── m2_commands.rs    # M2 命令构造纯函数
│       │   ├── m2_tests.rs       # M2 单元测试
│       │   ├── logs.rs           # 日志查看
│       │   ├── screenshot.rs     # 截图录屏
│       │   ├── performance.rs    # 性能监控
│       │   ├── history.rs        # 命令历史
│       │   └── report.rs         # 设备信息报告
│       ├── task.rs               # 任务框架（进度、取消）
│       ├── websocket.rs          # WebSocket 实时通知服务
│       └── lib.rs                # 应用入口与命令注册
├── ref/                          # 参考原型（UI 设计稿，只读不改）
├── doc/                          # 项目文档
├── img/                          # 项目必要的图片资源
└── tmp/                          # 临时文件（已被 .gitignore 忽略）
```

> 说明：`src/views/` 目录中仍保留 `CommandHistoryView.vue`、`CommandLibrary.vue`、`DeviceControl.vue`、`DeviceInfoReport.vue` 四个遗留文件，其能力已在 v0.7.0 合并至 Shell 终端、脚本自动化与设备管理器，当前未被 `App.vue` 引用，仅作历史留存。

---

## 代码规范

### Rust (src-tauri/)

- ADB 相关命令按功能放在 `adb/` 目录下对应模块文件，任务相关放在 `task.rs`，WebSocket 推送相关放在 `websocket.rs`
- 数据模型使用 `#[derive(Serialize)]`，与前端 TypeScript 类型保持字段一致
- `#[tauri::command]` 函数命名使用 `snake_case`
- 新增命令后必须在 `lib.rs` 的 `generate_handler!` 中注册
- 错误处理统一返回 `Result<_, String>`，用 `map_err` 转为可读信息，避免直接 `unwrap()`

示例：

```rust
#[tauri::command]
pub async fn list_devices() -> Result<Vec<DeviceInfo>, String> {
    // ...
    server.list_devices()
        .map_err(|e| format!("获取设备列表失败: {}", e))?
    // ...
}
```

### TypeScript / Vue (src/)

- 使用 Vue 3 `<script setup>` SFC 与组合式 API（`ref` / `computed` / `onMounted`）
- 设备相关类型统一放 `src/types/device.ts`，禁止在组件内重复定义
- 调用后端命令统一走 composable（如 `useDevices`），并保留 `isTauri()` 的 mock 降级分支
- 组件内不写魔数，轮询间隔等常量在 composable 顶部定义
- 数据同步优先接入 `useWebSocket` 实时推送，不可用时自动降级为轮询（参考 `useDevices` 的 `syncDataMode` 模式）

示例：

```typescript
const FALLBACK_POLLING_INTERVAL = 5000; // WebSocket 不可用时的降级轮询间隔 5 秒

export function useDevices() {
  const isTauri = () => !!(window as any).__TAURI_INTERNALS__;

  async function refreshDevices() {
    if (isTauri()) {
      return await invoke<DeviceInfo[]>('list_devices');
    } else {
      return mockDevices; // 浏览器降级
    }
  }
}
```

### 通用

- 注释使用中文
- 分节注释风格：`// ============` 或 `<!-- ============ -->`
- 不修改 `ref/` 目录下的参考原型代码
- 不向 `tmp/` 写入需要入库的内容

---

## 调试方法

### 浏览器 Mock 模式

```bash
pnpm dev
```

前端在浏览器中运行，自动使用 mock 数据，无需真实设备。适合前端 UI 开发和调试。

### Tauri DevTools

桌面端开发时，按 `Ctrl+Shift+I`（Linux/Windows）或 `Cmd+Option+I`（macOS）打开 DevTools，可调试前端代码。

### Rust 日志

```bash
# 查看 Rust 后端日志
RUST_LOG=debug pnpm tauri dev
```

### TypeScript 类型检查

```bash
# 前端构建包含类型检查
pnpm build

# 或单独运行
npx vue-tsc --noEmit
```

---

## 常见任务指引

### 新增后端命令（五步法）

1. 在 `src-tauri/src/adb/` 对应模块文件（如 `apps.rs`）定义数据模型与 `#[tauri::command]` 函数
2. 在 `src-tauri/src/lib.rs` 的 `generate_handler!` 中注册命令
3. 在 `src/types/device.ts` 添加对应 TypeScript 类型
4. 在对应 composable 中添加 `invoke` 调用并保留 mock 分支
5. 在对应视图中集成调用

### 修改界面

- 视图组件在 `src/views/`
- 侧边栏导航项在 `src/components/AppSidebar.vue` 的 `navItems` 数组
- 设备数据流经 `useDevices` composable

### 新增功能模块

1. 参考现有视图（如 `DeviceManager.vue`）创建新的 Vue 组件
2. 在 `src/App.vue` 中导入并添加 `v-else-if="currentView === 'xxx'"` 分支
3. 在 `src/components/AppSidebar.vue` 的 `navItems` 中添加导航项
4. 创建对应的 composable（如 `useXxx.ts`）
5. 如需后端支持，按「新增后端命令五步法」添加

### 调整 ADB 交互

- 只改 `src-tauri/src/adb/` 对应模块（底层库调用）
- 前端通过 composable 调用，通常无需修改

---

## 构建与发布

### 开发构建

```bash
# 桌面端开发（Tauri 窗口，通过 adb_client 库直连 ADB 服务）
pnpm tauri dev

# 浏览器开发（Mock 模式，无需 adb）
pnpm dev
```

### 生产构建

```bash
# 前端构建（含 vue-tsc 类型检查）
pnpm build

# 打包桌面应用（Linux 下生成 deb 等安装包）
pnpm tauri build
```

打包产物位于 `src-tauri/target/release/bundle/`（Linux 下含 deb 等）。

CI 发布（`.github/workflows/release.yml`）按平台分别产出 deb / AppImage（Linux）、msi / dmg 等安装包并发布 GitHub Release；各平台 bundle 目标由 CI 通过 `--bundles` 参数传入（`tauri.conf.json` 不再配置全局 targets）。

### 版本管理

- 版本号在 `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 中同步
- 更新版本时同步修改 `CHANGELOG.md`
- 遵循 [语义化版本](https://semver.org/lang/zh-CN/)
