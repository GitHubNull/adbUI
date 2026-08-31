# Changelog

本项目的所有重要变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.15.0] - 2026-09-01

### Added

- 设备信息报告增强：新增硬件信息（CPU 平台 / 核心数、内存、存储，单项采集失败不影响整体）与网络信息（wlan0 优先 eth0 回退，USB / WiFi 连接类型判定）
- 设备报告多格式导出：JSON / Markdown / HTML（单文件）/ TXT 四种格式，后端新增 `save_report_file` 命令写盘，目录由系统对话框选择
- 新增真机验证示例 `examples/real_report.rs`（`cargo run --example real_report -- <device_id>` 直接调用报告命令函数）
- 设备详情面板合并展示完整设备信息报告，原独立“设备信息报告”页面移除
- 新增 `HardwareInfo` / `NetworkInfo` 类型与 `deviceReportExport` 导出工具（含电池状态/健康度、容量、温度等中文标签映射）

## [0.14.0] - 2026-08-23

### Added

- 应用管理器新增应用详情查看：后端新增 `get_app_detail` 命令，解析 `dumpsys package` 获取安装来源、APK/数据/缓存大小、目标/最低 SDK、首次安装与更新时间、UID 等扩展字段
- APK 大小兜底：部分 ROM 的 `dumpsys` 无 `codeSize` 字段时，用 `pm path + stat` 逐文件累加（无需 root）；非 root 设备数据/缓存大小返回 null
- 系统应用判定兜底：优先 `SYSTEM` flag，其次 `pm list packages -s` 集合与 `/system/` 等路径前缀
- 新增 `AppDetailDialog.vue` 应用详情对话框（基础信息 + 扩展信息），应用列表行新增详情入口
- 新增 `AppDetail` 类型与 `useApps` 的 `fetchAppDetail` 方法

## [0.13.2] - 2026-08-23

### Fixed

- 修复 PrimeVue 4 下旧版 CSS 变量（`--surface-*` / `--text-color*` / `--green-500` 等）静默失效导致边框、背景、文字颜色不显示：全部迁移为 `--p-*` 前缀新变量（App、侧边栏、状态栏、应用列表、设备管理、电池页等）

### Changed

- App 布局重构：新增 `.app-body` 包装层承载侧边栏与主内容
- “电池模拟”更名为“电池管理”（页面标题、composable 注释与 Mock 文案）

## [0.13.1] - 2026-08-23

### Fixed

- 修复布局溢出产生窗口级滚动条：全局样式重构，`html/body/#app` 清除默认 `margin/padding` 并设置 `overflow: hidden`
- `.app-layout` 与侧边栏高度由 `100vh` 改为 `100%`，配合全局重置消除窗口滚动条

## [0.13.0] - 2026-08-23

### Added

- 应用管理器新增应用图标提取与展示：后端新增 `get_app_icons` 命令，通过设备端 `app_process` 运行内嵌 dex 提取器（无需 root）批量导出应用图标
- 新增设备端图标提取器源码（`icon-extractor/IconExtractor.java`）与构建脚本（`scripts/build-icon-dex.sh`），dex 产物编译期 `include_bytes` 嵌入，常规构建无需 Android SDK
- 图标提取结果 zip 打包后 pull 回本地解压缓存（`zip` crate），缓存命中时不再连接设备；前端内存缓存 + 请求序号防竞态，失败包显示占位图标
- 设置页新增图标缓存目录配置（`iconCacheDir`，默认 `./cache/icons`），相对路径基于应用启动运行目录；后端对路径穿越与非法条目做安全校验
- 新增依赖：`zip` 2.4（deflate，关闭默认特性）；新增 `AppIconEntry` / `AppIconMap` 类型与 `useAppIcons` composable

## [0.12.0] - 2026-08-23

### Added

- 截图录屏预览增强：新增自适应缩放开关（InputSwitch），按容器尺寸等比缩放完整显示截图，缩放系数上限 1 避免放大模糊
- 关闭自适应缩放时按原始分辨率 1:1 显示，超出容器可滚动查看
- 截图预览模拟手机外边框：圆角中框 + 顶部摄像头挖孔装饰 + 多层投影，缩放时显示缩放比例徽章
- 进入截图页 / 切换设备时自动捕获最新屏幕；新增捕获按钮浮层（capture-overlay）
- 自适应缩放设置通过 localStorage 持久化；预览容器尺寸由 ResizeObserver 监听，窗口变化时实时重算缩放

### Changed

- 浏览器 Mock 模式截图预览图由透明 1x1 像素改为不透明蓝色，便于验证预览效果

## [0.11.0] - 2026-08-23

### Added

- 新增 WebSocket 实时通知服务（`websocket.rs`）：后端在 `127.0.0.1` 启动本地 WebSocket 服务器，设备状态变化（连接/断开/电量等）时主动推送 `{ type, payload }` 事件
- 新增 `spawn_device_monitor` 设备状态监控：检测到设备变化时通过 WebSocket 广播 `device_changed` 事件
- 新增 `get_websocket_port` 命令（前端获取端口后连接）与 `disconnect_device_by_id` 命令（按设备 ID 断开）
- 前端新增 `useWebSocket.ts` 单例客户端：指数退避重连（最多 5 次）、30s 心跳、按事件类型分发监听器
- 新增 `useAppStatus.ts` 全局状态与 `AppStatusBar.vue` 底部状态栏：展示刷新计数与连接模式（WebSocket / 轮询降级）
- 设备管理、应用管理、电量、显示、文件、日志、性能、任务等 composables 接入实时推送，WebSocket 不可用时自动降级为轮询
- 新增依赖：`tokio-tungstenite` 0.24、`futures-util` 0.3；新增 `WsEvent` 类型定义

## [0.10.0] - 2026-08-22

### Added

- 无线连接对话框新增扫码配对（QR Pairing）连接方式：生成 `WIFI:T:ADB` 配对二维码，手机扫码后自动完成 mDNS 配对与连接
- 后端新增 `generate_pairing_qr` 命令：生成随机服务名与 10 位配对码，渲染二维码为 SVG 并转 base64 PNG 返回
- 后端新增 `wait_and_pair_device` 命令：三步流程（监听 `_adb-tls-pairing` 等待扫码 → ADB pair → 监听 `_adb-tls-connect` 发现连接端口并自动 connect），支持超时取消
- 无线连接对话框重构为三页签（扫码连接 / 手动输入 / 扫描连接），配对流程含完整状态机（等待/配对/连接/成功/失败）与中断取消
- 新增依赖：`qrcode` 0.14、`rand` 0.8、`mdns-sd` 0.19；新增 `QrPairingInfo` 数据模型
- 前端注册 PrimeVue Tabs 组件族（Tabs / TabList / Tab / TabPanels / TabPanel）

## [0.9.0-preview.2] - 2026-08-22

### Added

- 设备管理器新增无线连接（Wi-Fi）功能：扫描局域网 ADB 设备（mDNS）、按 IP:端口 连接/断开设备
- 新增 `WirelessConnectDialog.vue` 无线连接对话框，支持自动扫描与手动输入 IP 连接，并提供浏览器 Mock 模式
- 后端新增 `connect_device` / `disconnect_device` / `scan_network_devices` 命令，`adb_client` 启用 `mdns` feature
- 新增 `NetworkDevice` 数据模型（IP / 端口 / 服务全名），扫描结果按 IP+端口去重

## [0.9.0-preview.1] - 2026-08-22

### Added

- 新增 GitHub Actions 自动发布工作流（`.github/workflows/release.yml`），编译打包并发布 GitHub Release（含源码 tarball，Linux 平台）
- 侧边栏激活项新增跑马灯边框动画效果（顶部/右侧/底部/左侧四边依次流光，2s 循环）

### Changed

- 侧边栏导航图标更新：Shell 终端 `pi-terminal` → `pi-code`，电池模拟 `pi-battery` → `pi-bolt`
- 移除 `tauri.conf.json` 全局 bundle `targets` 配置，改由 CI 按平台传入 `--bundles` 参数（deb / AppImage / msi / dmg），避免跨平台产物为空
- 指定 `packageManager: pnpm@10.32.1` 供 GitHub Actions `pnpm/action-setup` 使用

### Fixed

- 修复 Windows 打包：放弃 msi target（WiX 要求纯数字预发布版本号），改用 bundle 产物收集流程（cmd / PowerShell）
- 修复 macOS / Windows 跨编译产物为空：bundle 路径改用 `GITHUB_WORKSPACE` 基准 + 工作区级搜索，修正 `find -prune` 误跳过 bundle 目录、`find -exec tar` 路径问题
- 修复 AppImage 相对路径在 `cd` 后失效的问题，并兼容 macOS bash 3.2 的 unicode 变量解析
- Cargo.lock 中 `adbui` 包版本同步对齐为 0.9.0-preview.1（此前遗漏同步）

## [0.8.0] - 2026-08-22

### Added

- 品牌视觉更新：新增自定义 adbUI 品牌图标与项目横幅（hero banner）图片资源（SVG + PNG），README 中英文版均引入横幅与图标展示
- 侧边栏 Logo 由 PrimeIcons 安卓图标替换为自定义品牌 SVG 图标（`adbui-icon.svg`）
- 应用图标全套更新为新品牌图标（`src-tauri/icons`：32x32 / 128x128 / 128x128@2x / icon.png 等）

## [0.7.0] - 2026-08-22

### Added

- 文件管理器新增图片预览：后端新增 `read_file_base64` 命令（10MB 限制，超出时提示），前端支持双击图片文件在抽屉中预览、缩放查看
- 文件管理器新增文件类型筛选（图片/视频/音频/文档/压缩包/APK，目录始终显示）
- 文件列表新增路径缓存（5 秒过期）与请求序号竞态保护，快速切换目录时不再显示过期数据
- Shell 终端集成常用命令库抽屉（`Drawer`）：支持命令分类浏览、收藏、一键执行与自定义添加命令
- Shell 终端集成命令历史抽屉：支持历史记录搜索、重跑、复制与清空
- 脚本自动化新增输入模拟（点击/长按/滑动/keyevent/输入文本，带坐标校验）与设备重启（normal/recovery/bootloader，带确认弹窗）
- 设备管理器合并设备信息报告展示与导出（原 `DeviceInfoReport` 视图移除）

### Changed

- 视图整合：移除 `DeviceControl` / `CommandLibrary` / `DeviceInfoReport` / `CommandHistoryView` 四个独立视图，其能力合并至设备管理器、Shell 终端与脚本自动化，侧边栏精简
- 设备轮询优化：轮询间隔从 3 秒调整为 5 秒，页面隐藏（`document.visibilityState`）时暂停轮询
- 文件导航/刷新失败时通过 Toast 反馈具体错误，成功刷新时提示成功
- 前端注册 PrimeVue `Drawer` / `VirtualScroller` 组件；侧边栏滚动区域与底部区域 flex 布局修复

## [0.6.2] - 2026-08-21

### Changed

- 后端重构：单体 `adb.rs`（2827 行）拆分为 `src-tauri/src/adb/` 目录下 15 个模块文件（models / helpers / device / apps / files / batch / m2 / m2_commands / m2_tests / logs / screenshot / performance / history / report / mod），通过 `mod.rs` 统一 re-export，对外命令与行为完全不变
- 前端重构：`AppManager` / `DeviceManager` / `DisplaySettings` / `PerformanceMonitor` 四个视图的模板与样式抽取为独立组件（`AppToolbar` / `AppTable` / `AppConfirmDialog` / `DisplayPresets` / `OverscanPanel` / `SystemParamsPanel`）及独立 CSS 文件，视图代码量缩减 90%+，功能与交互不变

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
