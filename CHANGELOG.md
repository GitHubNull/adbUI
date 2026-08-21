# Changelog

本项目的所有重要变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.6.1] - 2026-08-21

### Changed

- 重构文档体系：根目录 `AGENTS.md` 改为极简指针文件，AI 助手指南完整版迁移至 `doc/dev-guide/ai-agent/`（中英文），新增 `doc/dev-guide/human/` 开发者指南（中英文）与 `doc/user-guide/` 用户指南（中英文），新增 `doc/README.md` 文档索引，移除 `doc/.gitkeep`
- README 全面更新：功能特性扩展至 16 个功能模块（含应用管理、文件管理、任务中心、自动化脚本等）、技术栈说明更新（Vite 6 / PrimeVue 4 / adb_client 3.2）、目录结构与文档索引章节重写

## [0.6.0] - 2026-08-21

### Added

- 新增录屏支持检测：后端 `check_screen_record_support` 命令 + 前端 `recordSupported` 状态，设备切换时自动检测，不支持录屏（Android 16+ / 未 root 设备受 SELinux 限制）时禁用按钮并显示提示
- 截图方案重构：`take_screenshot` / `save_screenshot` 优先使用 `screencap -p`（兼容性最好，直接产出 PNG），失败时降级 framebuffer 原始 RGBA 编码

### Fixed

- 修复 `parse_cpu_usage` 不识别 Android 多核 top 格式（如 `800%cpu ... 745%idle`）与 `Cpu(s):` 单核格式的问题，按 idle 占比换算 CPU 使用率，并新增对应单元测试
- 修复录屏启动/停止的兼容性问题：录屏文件路径从 `/sdcard/` 改为 `/data/local/tmp/`（shell 用户可写）、改用 `setsid` 启动避免 adb shell 退出时 SIGHUP 终止进程、启动后校验进程存在、停止时校验文件存在且非空
- 修复取消保存对话框后录屏进程未停止的问题：`stopRecord` 在用户取消时仍触发后端停止逻辑，返回结构化结果 `{ path, error }`

### Changed

- `startRecord` / `stopRecord` 返回结构化结果（`{ success, error }` / `{ path, error }`），前端 Toast 展示具体失败原因

## [0.5.0] - 2026-08-21

### Added

- 新增日志查看模块：`LogViewer` 视图 + `useLogs` 组合式函数 + 后端 `get_device_logs` 命令，支持实时查看设备日志输出
- 新增 Shell 终端模块：`ShellTerminal` 视图 + `useShell` 组合式函数，基于 `execute_adb` 提供交互式命令终端，支持命令历史、上下键回看与错误高亮
- 新增截图录屏模块：`ScreenshotRecorder` 视图 + `useScreenshot` 组合式函数 + 后端 `take_screenshot` / `save_screenshot` / `start_screen_record` / `stop_screen_record` 命令，支持设备截图预览与本地保存、屏幕录制启停（`save_screenshot` 通过 `tauri-plugin-dialog` 选择保存路径）
- 新增性能监控模块：`PerformanceMonitor` 视图 + `usePerformance` 组合式函数 + 后端 `get_performance_data` 命令，聚合 top / dumpsys 输出展示 CPU、内存等性能指标
- 新增命令历史模块：`CommandHistoryView` 视图 + `useCommandHistory` 组合式函数 + 后端 `get_command_history` / `clear_command_history` 命令，记录并展示本会话执行过的 ADB 命令，支持清空
- 后端 `adb.rs` 新增截图 base64 解码与 PNG 编码保存（新增 `base64`、`image` 依赖）及命令历史 `Mutex` 状态管理（`create_command_history_state`）

## [0.4.0] - 2026-08-21

### Added

- 新增显示设置模块：`DisplaySettings` 视图 + `useDisplay` 组合式函数 + 后端 `get_display_state` / `set_display` / `reset_display` 命令，支持分辨率、密度、过扫描的查看与修改，设置失败时自动回滚原值
- 新增电池模拟模块：`BatterySimulator` 视图 + `useBattery` 组合式函数 + 后端 `get_battery_state` / `battery_simulate` / `battery_reset` 命令，支持电量、温度、充电状态模拟与恢复真实电池
- 新增设备控制模块：`DeviceControl` 视图 + `useControl` 组合式函数 + 后端 `reboot_device` / `send_input` 命令，支持重启（normal/recovery/bootloader）与输入模拟（tap/swipe/keyevent/text）
- 新增脚本自动化模块：`ScriptAutomation` 视图 + `useScripts` 组合式函数 + 后端 `execute_script` 命令，支持多行 ADB 命令脚本流式执行、行号级错误定位、进度上报与中途停止
- 新增命令库模块：`CommandLibrary` 视图 + `useCommandLib` 组合式函数，支持常用 ADB 命令收藏与一键执行
- 新增设备信息报告模块：`DeviceInfoReport` 视图 + `useDeviceReport` 组合式函数 + 后端 `get_device_report` 命令，聚合 getprop 与 dumpsys 输出展示设备完整信息
- 新增设置模块：`Settings` 视图 + `useSettings` 组合式函数 + 后端 `set_system_param` 命令，支持系统参数读写
- 后端 `adb.rs` 新增 M2 玩机核心输出解析与命令构造纯函数（`parse_wm_size` / `parse_wm_density` / `parse_overscan` / `parse_battery` 等），便于单元测试
- 前端注册 `InputNumber`、`Slider`、`Dropdown` PrimeVue 组件

## [0.3.1] - 2026-08-21

### Fixed

- 修复 `adb_client` 未返回 exit code（shell v1 协议）时命令执行与批量卸载被误判为失败的问题，改为以 stdout/stderr 内容判断结果
- 修复 `list_apps` 系统应用判断错误：改用 `pkgFlags` 解析（兼容字符串标志与位掩码格式），不再依赖 apk 路径判断
- 修复包名路径含 `==` 时包名解析错误（统一从最后一个 `=` 后截取）
- 修复应用筛选快速切换时旧请求覆盖新结果的问题（请求序号竞态保护），类型过滤改为前端本地即时过滤

### Changed

- 批量卸载任务完成后通过 `task-progress` 事件自动刷新应用列表
- 应用表格增加加载态；版本列优先显示 `versionCode`

### Added

- 后端新增包名解析、pkgFlags 解析、exit code 处理的单元测试

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
