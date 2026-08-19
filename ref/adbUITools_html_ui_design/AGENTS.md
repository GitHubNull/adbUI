# AGENTS.md

面向 AI 编码助手的项目指南。修改本仓库代码前请先阅读本文。

## 项目概述

本项目是跨平台 PC 端 ADB(Android Debug Bridge)设备管理应用的 **UI 前期设计探索**:以纯前端静态页面呈现设计稿,可视化展示应用管理、文件浏览、日志查看、Shell 命令执行、截图录屏与性能监控等 ADB 操作的界面布局与交互方式,为后期实现真实应用提供 UI 设计参考。

**重要**:本项目仅为 UI 设计稿,所有数据均为内置演示数据(mock),不连接真实 ADB 设备、无后端服务;后期将基于本设计稿,采用 Electron / Tauri 等跨平台桌面技术栈实现真实可用的跨平台 PC 应用。

## 技术栈

- HTML5 + CSS3(自定义属性作为设计令牌)
- 原生 JavaScript(ES6+),无框架、无构建工具、无包管理器、无第三方依赖
- 全部界面文案为中文

## 目录结构

```
├── src/                    # 全部前端源码(唯一源码根)
│   ├── index.html          # 入口页面:组装布局 + 引入 css/js
│   ├── css/
│   │   ├── base.css        # 设计令牌(CSS 变量)与基础样式
│   │   ├── layout.css      # 整体布局(侧边栏、状态栏、内容区)
│   │   ├── components.css  # 通用组件样式(表格、按钮、表单等)
│   │   └── advanced.css    # 各功能视图专属样式
│   ├── js/
│   │   ├── data.js         # 演示数据(mock 设备、应用、日志等)
│   │   ├── utils.js        # 工具函数(escapeHtml、Toast 等)
│   │   ├── components.js   # 渲染函数(renderXxx,返回 HTML 字符串)
│   │   └── app.js          # 应用主逻辑(初始化、视图切换、事件绑定)
│   └── assets/             # 静态资源(当前为空)
├── doc/
│   ├── ROADMAP.md          # 功能规划路线图(后续优化参考)
│   ├── screenshots/        # 界面截图(README 引用)
│   └── .gitkeep
├── tmp/                    # 临时目录,已被 .gitignore 忽略
├── README.md               # 项目文档
└── AGENTS.md               # 本文件
```

## 常用命令

无构建、无测试、无依赖安装。本地运行:

```bash
# 直接打开浏览器访问 src/index.html

# 或启动静态服务器
cd src && python -m http.server 8080
```

## 代码规范

### JavaScript

- 文件职责分明:数据在 `data.js`,渲染函数在 `components.js`,逻辑与事件在 `app.js`
- 渲染函数统一命名 `renderXxx(参数)` 并返回 HTML 模板字符串
- 初始化/事件绑定函数统一命名 `initXxx()`
- 所有插入 HTML 的动态文本必须经 `escapeHtml()` 转义(见 `utils.js`)
- 视图切换集中在 `app.js` 的 `switchView()`(新增功能模块需同步 `views` 映射表与侧边栏 `data-view` 导航项)
- 文件内使用 `// ============` 分节注释;变量/函数使用驼峰命名;字符串统一双引号

### CSS

- 颜色、字号、圆角、间距等一律使用 `base.css` 中 `:root` 定义的设计令牌(`--color-*`、`--font-*`、`--radius-*`、`--space-*`),禁止硬编码色值
- 样式按功能分层:通用组件样式放 `components.css`,视图专属样式放 `advanced.css`
- 图标使用内联 SVG(`stroke="currentColor"`),不引入图标库

### HTML

- 所有视图内容由 JS 渲染进 `#content-body`,`index.html` 仅保留骨架(侧边栏、状态栏、弹窗容器)
- 交互反馈使用全局 `Toast.show(消息, 类型, 标题)`(类型:`success` / `warning` / `danger` / `info`)

## 常见任务指引

| 任务 | 步骤 |
| --- | --- |
| 新增功能模块 | 1. `index.html` 侧边栏添加 `data-view` 导航项 2. `app.js` 的 `views` 映射表登记标题 3. `switchView()` 添加渲染分支 4. `components.js` 编写 `renderXxx()` 5. `advanced.css` 添加视图样式 |
| 修改界面文案 | 中文文案直接内联在渲染模板中,搜索对应 `renderXxx` 函数 |
| 调整主题配色 | 只修改 `base.css` `:root` 中的设计令牌,全局生效 |
| 新增演示数据 | 按 `data.js` 现有 mock 对象结构扩展 |

## 注意事项

- 不要向 `tmp/` 写入需要入库的内容(已被忽略)
- 截图类产物放入 `doc/screenshots/`,并同步更新 `README.md` 引用
- 当前阶段保持纯前端零依赖约束:不要引入框架、CDN 或构建工具(UI 设计稿阶段约束,后期桌面应用实现不受此限)
