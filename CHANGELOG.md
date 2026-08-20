# Changelog

本项目的所有重要变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-08-20

### Added

- 后端新增 ADB 设备管理命令：`list_devices`（设备列表）、`get_device_detail`（设备详情）、`execute_adb`（命令执行）
- 前端新增设备管理视图 `DeviceManager`（列表/详情/命令执行界面）与侧边栏组件 `AppSidebar`
- 新增设备数据组合式函数 `useDevices`（3 秒轮询、详情获取、命令执行，浏览器环境自动降级为 mock 数据）
- 新增设备类型定义 `src/types/device.ts`，与 Rust 端序列化模型保持一致
- 接入 PrimeVue UI 组件库
- 补充 README（中英文）、LICENSE、AGENTS.md、DISCLAIMER.md 等文档
