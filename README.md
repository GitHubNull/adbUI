# adbUI — 跨平台 ADB UI 桌面应用

**中文 | [English](README.en.md)**

adbUI 是一个基于 **Tauri (Rust + Vue)** 的跨平台 ADB (Android Debug Bridge) UI 桌面应用，提供图形化的设备管理、设备详情查看与 ADB 命令执行能力，替代繁琐的命令行操作。

## 功能特性

- **设备管理**：自动检测并轮询（3 秒间隔）已连接的 Android 设备，支持 USB / WiFi 连接方式识别
- **设备详情**：展示设备的品牌、型号、Android 版本、SDK 版本、构建号、电量等信息
- **ADB 命令执行**：在界面中直接执行 ADB shell 命令并查看输出
- **浏览器 Mock 模式**：前端通过 `isTauri()` 检测运行环境，在浏览器中开发调试时自动降级为内置演示数据

## 技术栈

- **前端**：Vue 3 + TypeScript + Vite + PrimeVue
- **后端**：Tauri 2 (Rust) + tokio 异步运行时
- **ADB 通信**：后端 ADB 通信模块已弃用原生的命令行调用方式，转而采用成熟的 Rust 开源库 [cocool97/adb_client](https://github.com/cocool97/adb_client) 进行底层交互，以提升稳定性和性能

## UI 设计参考

前端界面设计参考了 [`ref/adbUITools_html_ui_design/`](ref/adbUITools_html_ui_design/) 目录下的 HTML/CSS/JS 原型设计。该原型为纯前端静态页面（内置 mock 数据，不连接真实设备），用于探索设备管理、文件浏览、日志查看、Shell 命令执行、截图录屏与性能监控等功能的界面布局与交互方式，作为本项目的 UI 设计稿参考保留。

## 目录结构

```
├── src/                    # 前端源码 (Vue 3 + TypeScript)
│   ├── components/         # 通用组件 (如 AppSidebar.vue)
│   ├── composables/        # 组合式函数 (如 useDevices.ts)
│   ├── types/              # TypeScript 类型定义 (与 Rust 结构对应)
│   └── views/              # 页面视图 (如 DeviceManager.vue)
├── src-tauri/              # Tauri 后端 (Rust)
│   └── src/
│       ├── adb.rs          # ADB 通信模块 (Tauri Commands)
│       └── lib.rs          # 应用入口与命令注册
├── ref/
│   └── adbUITools_html_ui_design/  # UI 设计参考原型 (HTML/CSS/JS)
├── doc/                    # 项目文档
├── img/                    # 项目必要的图片资源
└── tmp/                    # 临时文件 (不入库)
```

## 目录规范

- `doc/`：项目文档（设计文档、规划、说明等），统一存放于此
- `img/`：项目必要的图片资源，统一存放于此
- `tmp/`：临时文件（截图、日志、调试产物等），一律放于此且不被 git 追踪

## 运行与构建

```bash
# 安装依赖
pnpm install

# 桌面端开发（启动 Tauri 窗口，需本机安装 adb）
pnpm tauri dev

# 浏览器开发（Mock 模式，无需 adb）
pnpm dev

# 前端构建
pnpm build

# 打包桌面应用
pnpm tauri build
```

> 注意：运行桌面端需要本机已安装 `adb`（Android SDK Platform-Tools）并可通过 `adb devices` 检测到设备。

## License

本项目基于 [MIT License](LICENSE) 开源发布。使用本项目前请阅读 [DISCLAIMER.md](DISCLAIMER.md) 中的免责声明。

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
