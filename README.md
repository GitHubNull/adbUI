<div align="center">
  <img src="img/adbui_hero_bg.svg" alt="adbUI 项目横幅" width="100%"/>
</div>

# adbUI — 跨平台 ADB UI 桌面应用

**中文 | [English](README.en.md)**

adbUI 是一个基于 **Tauri (Rust + Vue)** 的跨平台 ADB (Android Debug Bridge) UI 桌面应用，提供图形化的设备管理、设备详情查看与 ADB 命令执行能力，替代繁琐的命令行操作。

## 功能特性

<div align="center">
  <img src="img/adbui_icon.svg" alt="adbUI 图标" width="128" height="128"/>
</div>

adbUI 目前提供 **12 个功能模块**（11 个功能页 + 设置）：

- **设备管理**：通过 WebSocket 实时推送检测设备状态变化（不可用时自动降级为 5 秒轮询），支持 USB / WiFi 连接方式识别，展示品牌、型号、Android 版本、SDK 版本、构建号、电量等详细信息；内置无线连接对话框（扫码配对 / 手动 IP:端口 / mDNS 扫描）与 WiFi 设备断开；设备详情页可展开完整设备信息报告（聚合 getprop 与 dumpsys）并导出 JSON
- **应用管理**：查看设备上所有已安装应用，支持按全部/用户/系统筛选；支持卸载、强制停止、清除数据、冻结/解冻、提取 APK、安装 APK；支持批量卸载与批量安装（任务框架）；自动提取并展示应用图标（设备端 dex 提取器，无需 root，本地磁盘缓存）；双击应用查看详情（安装来源、大小、SDK 等）
- **文件管理**：浏览设备文件系统，支持目录导航与面包屑路径；支持上传（push）文件到设备、下载（pull）文件到本地；支持按文件类型筛选（图片/视频/音频/文档/压缩包/APK）；双击图片文件可预览并缩放（10MB 内）
- **日志查看**：实时捕获设备 logcat 输出，支持按日志级别（Verbose / Debug / Info / Warn / Error / Fatal）、Tag、PID 筛选与文本搜索，支持暂停与清空
- **Shell 终端**：交互式 ADB Shell 命令执行，支持命令历史记录、上下键回看、错误输出高亮；内置常用命令库抽屉（分类浏览、收藏、自定义命令）与命令历史抽屉（搜索、重跑、复制、清空）
- **截图录屏**：设备截图预览与本地保存（通过系统对话框选择保存路径，PNG 格式）；自适应缩放预览（手机外框模拟，缩放开关持久化）；屏幕录制启停（Android 16+ 未 root 设备可能受 SELinux 限制）
- **性能监控**：实时展示 CPU 使用率（含历史曲线）、内存使用量/总量、设备温度；进程列表展示各进程的 CPU 和内存占用
- **任务中心**：批量操作（批量安装、批量卸载）的进度跟踪与管理，支持实时进度、取消任务、清理已完成任务
- **显示调节**：查看和修改屏幕分辨率、密度（DPI）、过扫描参数；内置常用分辨率/密度预设；设置失败时自动回滚原值；支持恢复出厂默认；可调节系统参数（动画速度、字体大小、锁屏超时）
- **电池管理**：查看真实电池状态；模拟电量百分比、温度、充电状态；支持一键还原真实电池
- **自动化脚本**：多行 ADB 命令脚本流式执行，支持 `loop` / `end` 循环语法；行号级进度显示与中途停止；支持脚本导入导出；内置输入模拟（点击/长按/滑动/物理按键/文本输入，带坐标校验）与设备重启（normal/recovery/bootloader，带确认弹窗）
- **设置**：主题切换（亮色/暗色）、ADB 命令超时设置、设备轮询间隔调整、应用图标缓存目录配置；设置项通过 localStorage 持久化

此外，应用底部提供**状态栏**：实时显示 WebSocket 同步状态（实时 / 轮询降级）、在线设备数与 USB / WiFi 连接统计、运行中任务数等。

## 技术栈

- **前端**：Vue 3 + TypeScript + Vite 6 + PrimeVue 4 + primeicons + @tauri-apps/plugin-dialog + @tauri-apps/plugin-opener
- **后端**：Tauri 2 (Rust) + tokio 异步运行时 + adb_client 3.2
- **ADB 通信**：后端 ADB 通信模块采用成熟的 Rust 开源库 [cocool97/adb_client](https://github.com/cocool97/adb_client) 进行底层交互，以提升稳定性和性能
- **实时通信**：tokio-tungstenite + futures-util（WebSocket 设备状态实时推送）
- **无线连接**：qrcode + rand（扫码配对）、mdns-sd（局域网 mDNS 设备扫描）
- **其他依赖**：serde / serde_json（序列化）、base64（截图编码）、image（截图处理）、zip（图标缓存打包）

> 注意：后端通过 `adb_client` 库与 ADB 服务直接通信，**无需**本机单独安装 adb 命令行工具。

## UI 设计参考

前端界面设计参考了 [`ref/adbUITools_html_ui_design/`](ref/adbUITools_html_ui_design/) 目录下的 HTML/CSS/JS 原型设计。该原型为纯前端静态页面（内置 mock 数据，不连接真实设备），用于探索设备管理、文件浏览、日志查看、Shell 命令执行、截图录屏与性能监控等功能的界面布局与交互方式，作为本项目的 UI 设计稿参考保留。

## 目录结构

```
├── src/                    # 前端源码 (Vue 3 + TypeScript)
│   ├── components/         # 通用组件 (AppSidebar / AppStatusBar 及各模块子组件)
│   ├── composables/        # 组合式函数 (19 个，按模块划分)
│   ├── types/              # TypeScript 类型定义 (与 Rust 结构对应)
│   └── views/              # 页面视图 (12 个在用，另有 4 个已整合模块的遗留文件)
├── src-tauri/              # Tauri 后端 (Rust)
│   └── src/
│       ├── adb/            # ADB 通信模块 (mod.rs 入口 + 15 个功能子模块, 50+ 命令)
│       ├── task.rs         # 任务框架（批量操作进度跟踪）
│       ├── websocket.rs    # WebSocket 实时通知服务（设备状态推送）
│       └── lib.rs          # 应用入口与命令注册
├── ref/                    # 参考原型（UI 设计稿，只读不改）
├── doc/                    # 项目文档（详见下方文档索引）
├── img/                    # 项目必要的图片资源
└── tmp/                    # 临时文件 (不入库)
```

## 文档索引

本项目提供完整的文档体系，按读者类型分层：

| 读者类型 | 文档 | 说明 |
|---------|------|------|
| 最终用户 | [用户指南 (中文)](doc/user-guide/user-guide.md) / [English](doc/user-guide/user-guide.en.md) | 安装、快速上手、各功能详解、常见问题 |
| 人类开发者 | [开发维护指南 (中文)](doc/dev-guide/human/developer-guide.md) / [English](doc/dev-guide/human/developer-guide.en.md) | 架构详解、代码规范、调试方法、构建发布 |
| AI 编程代理 | [AI Agent 指南 (中文)](doc/dev-guide/ai-agent/AGENTS.md) / [English](doc/dev-guide/ai-agent/AGENTS.en.md) | 项目概述、命令清单、代码生成模式、已知陷阱 |

更多文档导航请见 [doc/README.md](doc/README.md)。

## 运行与构建

```bash
# 安装依赖
pnpm install

# 桌面端开发（启动 Tauri 窗口，通过 adb_client 库直连 ADB 服务）
pnpm tauri dev

# 浏览器开发（Mock 模式，无需 adb）
pnpm dev

# 前端构建（含 vue-tsc 类型检查）
pnpm build

# 打包桌面应用（Linux 下生成 deb 等安装包；CI 按平台产出 deb / AppImage / msi / dmg）
pnpm tauri build
```

## 目录规范

- `doc/`：项目文档（设计文档、规划、说明等），统一存放于此
- `img/`：项目必要的图片资源，统一存放于此
- `tmp/`：临时文件（截图、日志、调试产物等），一律放于此且不被 git 追踪

## License

本项目基于 [MIT License](LICENSE) 开源发布。使用本项目前请阅读 [DISCLAIMER.md](DISCLAIMER.md) 中的免责声明。

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
