# Changelog

本项目的所有重要变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.3.0] - 2026-08-20

### Added

- 新增应用管理模块：`AppManager` 视图 + `useApps` 组合式函数，支持应用列表（全部/系统/第三方/已禁用过滤与搜索）、卸载、强制停止、清除数据、冻结/解冻、提取 APK、安装 APK
- 新增文件管理模块：`FileManager` 视图 + `useFiles` 组合式函数，支持设备文件浏览（路径导航/面包屑）、拉取文件到本地、推送文件到设备
- 新增任务中心模块：`TaskCenter` 视图 + `useTasks` 组合式函数 + 后端 `task.rs`，支持批量安装/批量卸载任务的进度跟踪、取消与清理已完成任务
- 后端 `adb.rs` 新增应用/文件/批量操作命令：`list_apps`、`uninstall_app`、`force_stop_app`、`clear_app_data`、`freeze_app`、`unfreeze_app`、`extract_apk`、`install_apk`、`list_files`、`pull_file`、`push_file`、`batch_uninstall`、`batch_install`
- 接入 `tauri-plugin-dialog` 插件（文件选择对话框），前端新增 Toast 消息提示与对话框组件

## [0.2.0] - 2026-08-20

### Changed

- 后端 ADB 通信从调用外部 `adb` 命令行切换为 Rust 库 `adb_client`（`list_devices` / `get_device_detail` / `execute_adb` 命令 API 不变，前端无感知）
- 移除基于 `tokio::process::Command` 的命令行解析与输出解析逻辑，改用 `ADBServer` / `ADBServerDevice` 直接交互
- 桌面端不再要求本机安装 adb（Android SDK Platform-Tools），提升跨平台稳定性

## [0.1.0] - 2026-08-20

### Added

- 后端新增 ADB 设备管理命令：`list_devices`（设备列表）、`get_device_detail`（设备详情）、`execute_adb`（命令执行）
- 前端新增设备管理视图 `DeviceManager`（列表/详情/命令执行界面）与侧边栏组件 `AppSidebar`
- 新增设备数据组合式函数 `useDevices`（3 秒轮询、详情获取、命令执行，浏览器环境自动降级为 mock 数据）
- 新增设备类型定义 `src/types/device.ts`，与 Rust 端序列化模型保持一致
- 接入 PrimeVue UI 组件库
- 补充 README（中英文）、LICENSE、AGENTS.md、DISCLAIMER.md 等文档
