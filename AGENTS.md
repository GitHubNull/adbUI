# AGENTS.md

面向 AI 编码助手的项目指南。修改本仓库代码前请先阅读本文。

## 项目概述

本项目是跨平台 PC 端 ADB(Android Debug Bridge)设备管理桌面应用 **adbUI** 的真实实现，采用 Tauri (Rust + Vue) 技术栈。提供设备列表管理、设备详情查看与 ADB 命令执行等能力。

**与 `ref/` 目录的关系**：`ref/adbUITools_html_ui_design/` 是纯前端 UI 设计稿（HTML/CSS/JS + mock 数据，不连接真实设备），仅作为界面布局与交互的设计参考，不属于运行时源码，不要将其视为当前应用的实现。

## 核心架构

Tauri Backend (Rust) + Vue Frontend (TypeScript)，通过 Tauri `invoke` 通信：

```
Vue Frontend (src/)  --invoke-->  Rust Backend (src-tauri/src/)
   useDevices.ts                     adb.rs
   (设备轮询/详情/命令)              list_devices / get_device_detail / execute_adb
                                     lib.rs (命令注册)
```

- **后端**：`src-tauri/src/adb.rs` 定义 `DeviceInfo` / `DeviceDetail` / `AdbResult` 等 `serde::Serialize` 模型，并实现三个 `#[tauri::command]`；`lib.rs` 通过 `generate_handler!` 注册命令。ADB 底层交互采用 Rust 库 `adb_client`（见 README 技术栈章节）。
- **前端**：`src/composables/useDevices.ts` 是设备相关的核心组合式函数（3 秒轮询、详情获取、命令执行），通过 `isTauri()` 检测运行环境——Tauri 内调用 `invoke`，浏览器中自动降级为 mock 数据，方便纯前端调试。
- **类型**：`src/types/device.ts` 中的 TypeScript 类型与 Rust 端 `Serialize` 结构保持字段一致，改动后端模型时需同步。

## 常用命令

```bash
# 安装依赖
pnpm install

# 桌面端开发（Tauri 窗口，需本机安装 adb）
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
│   ├── components/         # 通用组件
│   ├── composables/        # 组合式函数
│   ├── types/              # TS 类型定义
│   └── views/              # 页面视图
├── src-tauri/              # Tauri 后端 (Rust)
│   └── src/
│       ├── adb.rs          # ADB 通信模块 (Tauri Commands)
│       └── lib.rs          # 应用入口与命令注册
├── ref/                    # 参考原型（UI 设计稿，只读不改）
├── doc/                    # 项目文档（设计文档、规划等）
├── img/                    # 项目必要的图片资源
└── tmp/                    # 临时文件（已被 .gitignore 忽略）
```

## 代码规范

### Rust (src-tauri/)

- ADB 相关命令统一放在 `adb.rs`，数据模型使用 `#[derive(Serialize)]`，`#[tauri::command]` 函数命名 `snake_case`
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

## 常见任务指引

| 任务 | 步骤 |
| --- | --- |
| 新增后端命令 | 1. `adb.rs` 定义模型与 `#[tauri::command]` 2. `lib.rs` 注册 3. `src/types/device.ts` 添加对应 TS 类型 4. composable 中添加 `invoke` 调用并保留 mock 分支 |
| 修改界面 | 视图在 `src/views/`，侧边栏在 `src/components/AppSidebar.vue`，设备数据流经 `useDevices` |
| 新增功能模块 | 参考 `App.vue` 的 `currentView` 视图切换模式，同步侧边栏导航项 |
| 调整 ADB 交互 | 只改 `src-tauri/src/adb.rs`（底层库调用），前端无感知 |

## 注意事项

- 不要向 `tmp/` 写入需要入库的内容（已被忽略）；截图等产物放 `doc/` 或 `img/`
- 文档类产物（设计文档、规划）统一放 `doc/`
- README 的技术栈/依赖说明与后端实现需保持一致，涉及 ADB 通信方式变更时同步更新
