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
   useDevices.ts                     adb.rs
   useApps.ts                        task.rs
   ...                               lib.rs (命令注册)
```

通信流程：
1. 前端通过 `@tauri-apps/api` 的 `invoke()` 调用后端命令
2. 后端 `lib.rs` 通过 `generate_handler!` 注册所有命令
3. 命令实现分布在 `adb.rs`（ADB 交互）和 `task.rs`（任务框架）
4. 后端通过 `Emitter` 向前端发送事件（如 `task-progress`、`script-progress`）

### 关键模块

| 模块 | 文件 | 职责 |
|------|------|------|
| ADB 通信 | `src-tauri/src/adb.rs` | 所有 ADB 相关 Tauri 命令的实现 |
| 任务框架 | `src-tauri/src/task.rs` | 批量任务的创建、进度跟踪、取消 |
| 命令注册 | `src-tauri/src/lib.rs` | Tauri 应用入口，命令注册与插件初始化 |
| 设备核心 | `src/composables/useDevices.ts` | 设备轮询、详情获取、命令执行 |
| 视图入口 | `src/App.vue` | 视图切换（currentView）与全局状态 |
| 侧边栏 | `src/components/AppSidebar.vue` | 导航菜单定义 |

### 事件机制

后端通过 Tauri 的 `Emitter` 向前端发送事件：

- **`task-progress`**：批量任务进度更新（`TaskInfo` 结构）
- **`script-progress`**：脚本执行进度（`ScriptProgress` 结构，含行号、状态、消息）

前端通过 `listen()` 监听这些事件并更新 UI。

---

## 项目结构

```
├── src/                          # 前端源码 (Vue 3 + TypeScript)
│   ├── components/               # 通用组件
│   │   └── AppSidebar.vue        # 侧边栏导航（16 个模块入口）
│   ├── composables/              # 组合式函数（按模块划分）
│   │   ├── useDevices.ts         # 设备管理核心（轮询、详情、命令）
│   │   ├── useApps.ts            # 应用管理
│   │   ├── useFiles.ts           # 文件管理
│   │   ├── useLogs.ts            # 日志查看
│   │   ├── useShell.ts           # Shell 终端
│   │   ├── useScreenshot.ts      # 截图录屏
│   │   ├── usePerformance.ts     # 性能监控
│   │   ├── useCommandHistory.ts  # 命令历史
│   │   ├── useTasks.ts           # 任务中心
│   │   ├── useDeviceReport.ts    # 设备信息报告
│   │   ├── useDisplay.ts         # 显示调节
│   │   ├── useBattery.ts         # 电池模拟
│   │   ├── useControl.ts         # 设备控制
│   │   ├── useScripts.ts         # 自动化脚本
│   │   ├── useCommandLib.ts      # 常用命令库
│   │   └── useSettings.ts        # 设置
│   ├── types/                    # TypeScript 类型定义
│   │   └── device.ts             # 所有设备相关类型（与 Rust 结构对应）
│   ├── views/                    # 页面视图（16 个）
│   │   ├── DeviceManager.vue     # 设备管理
│   │   ├── AppManager.vue        # 应用管理
│   │   ├── FileManager.vue       # 文件管理
│   │   ├── LogViewer.vue         # 日志查看
│   │   ├── ShellTerminal.vue     # Shell 终端
│   │   ├── ScreenshotRecorder.vue # 截图录屏
│   │   ├── PerformanceMonitor.vue # 性能监控
│   │   ├── CommandHistoryView.vue # 命令历史
│   │   ├── TaskCenter.vue        # 任务中心
│   │   ├── DeviceInfoReport.vue  # 设备信息报告
│   │   ├── DisplaySettings.vue   # 显示调节
│   │   ├── BatterySimulator.vue  # 电池模拟
│   │   ├── DeviceControl.vue     # 设备控制
│   │   ├── ScriptAutomation.vue  # 自动化脚本
│   │   ├── CommandLibrary.vue    # 常用命令库
│   │   └── Settings.vue          # 设置
│   ├── App.vue                   # 应用入口（currentView 切换）
│   └── main.ts                   # Vue 应用初始化
├── src-tauri/                    # Tauri 后端 (Rust)
│   └── src/
│       ├── adb.rs                # ADB 通信模块（40+ 命令）
│       ├── task.rs               # 任务框架（进度、取消）
│       └── lib.rs                # 应用入口与命令注册
├── ref/                          # 参考原型（UI 设计稿，只读不改）
├── doc/                          # 项目文档
├── img/                          # 项目必要的图片资源
└── tmp/                          # 临时文件（已被 .gitignore 忽略）
```

---

## 代码规范

### Rust (src-tauri/)

- ADB 相关命令统一放在 `adb.rs`，任务相关放在 `task.rs`
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

示例：

```typescript
const POLL_INTERVAL = 3000; // 轮询间隔 3 秒

export function useDevices() {
  const isTauri = () => !!(window as any).__TAURI__;

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

1. 在 `src-tauri/src/adb.rs` 定义数据模型与 `#[tauri::command]` 函数
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

- 只改 `src-tauri/src/adb.rs`（底层库调用）
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

# 打包桌面应用（生成 deb 安装包）
pnpm tauri build
```

打包产物位于 `src-tauri/target/release/bundle/deb/`。

### 版本管理

- 版本号在 `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 中同步
- 更新版本时同步修改 `CHANGELOG.md`
- 遵循 [语义化版本](https://semver.org/lang/zh-CN/)
