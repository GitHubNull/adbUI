# M2 玩机核心实施规划

> 本文档为 [ROADMAP.md](ROADMAP.md) 中 **M2 玩机核心** 里程碑的详细实施规划:梳理 P1 全部 8 项功能(P2 部分:设备信息报告、设置模块落地)的功能清单、验收标准、mock UI 实现路径与真实 ADB 引擎过渡方案。
>
> 文档状态:规划草案,实施过程中可按实际情况调整优先级与范围。

## 目录

- [1. 范围界定](#1-范围界定)
- [2. ADB 命令执行抽象层(过渡方案核心)](#2-adb-命令执行抽象层过渡方案核心)
- [3. P1 功能清单](#3-p1-功能清单)
- [4. UI 组织方案](#4-ui-组织方案)
- [5. 实施顺序](#5-实施顺序)
- [6. 真实 ADB 引擎集成过渡](#6-真实-adb-引擎集成过渡)
- [7. 验收矩阵](#7-验收矩阵)
- [8. 风险与注意事项](#8-风险与注意事项)

## 1. 范围界定

### 1.1 里程碑范围

| 范围 | 内容 |
| --- | --- |
| P1 全部(本规划重点) | 1.1 分辨率/DPI 调节、1.2 过扫描调节、1.3 系统参数无级调节、1.4 电池模拟、1.5 重启模式、1.6 按键与输入模拟、1.7 自动化脚本、1.8 常用命令库 |
| P2 部分 | 2.1 设备信息报告(getprop + dumpsys 聚合)、2.6 设置模块落地(localStorage 持久化) |
| 不在范围内 | 2.2 界面定制、2.3 Shizuku 集成、2.4 屏幕投屏、2.5 应用保活与广告跳过(归入 M3 生态扩展) |

### 1.2 现状盘点(2026-08 代码基线)

| 功能 | 现有代码 | 当前状态 |
| --- | --- | --- |
| 1.1 分辨率/DPI 调节 | 无 | UI 缺失,需从零搭建 |
| 1.2 过扫描调节 | 无 | UI 缺失,需从零搭建 |
| 1.3 系统参数无级调节 | 无 | UI 缺失,需从零搭建 |
| 1.4 电池模拟 | 无(设备信息页仅有电池信息展示) | UI 缺失,需从零搭建 |
| 1.5 重启模式 | 无 | UI 缺失,需从零搭建 |
| 1.6 按键与输入模拟 | 无 | UI 缺失,需从零搭建 |
| 1.7 自动化脚本 | 无 | UI 缺失,需从零搭建 |
| 1.8 常用命令库 | Shell 终端仅有 6 条硬编码响应(`initTerminal()` 内 `responses` 对象) | UI 缺失,需从零搭建 |
| 2.1 设备信息报告 | `renderDeviceInfo()` + `initDeviceInfo()`(components.js / app.js) | UI 已完成(mock),真实阶段接引擎 |
| 2.6 设置模块落地 | `renderSettings()` + `initSettings()` + `loadSettings()/saveSettings()`(localStorage) | UI 已完成,真实阶段补 ADB 路径生效逻辑 |

**核心结论**:P1 的 8 项功能 UI 全部缺失,且当前所有交互均为 `setTimeout` + `Toast` 散落模拟(mock),无统一命令执行层。M2 实施需先补齐 UI(mock),再通过命令抽象层为真实引擎集成铺路,避免 UI 返工。

## 2. ADB 命令执行抽象层(过渡方案核心)

### 2.1 目标

在纯前端阶段(浏览器 + mock)与桌面化阶段(真实 ADB)之间建立**唯一稳定接口**:业务代码只依赖接口,不感知数据来源。当前阶段所有模拟交互收口到 mock 实现,后期替换实现即可让全部 P1 功能真实生效。

### 2.2 接口契约(新增 `src/js/adb.js`)

```js
// ============================================
// ADB 引擎抽象层 - 唯一命令执行入口
// ============================================

const AdbEngine = {
  /**
   * 执行一条 ADB 命令
   * @param {string} command 完整命令,如 "shell wm size"、"devices"
   * @param {Object} [options] { deviceId, timeout }
   * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
   */
  async execute(command, options) {},

  /** 获取设备列表 @returns {Promise<Array>} */
  async getDevices() {},

  /** 订阅设备状态变化(心跳轮询驱动) @param {Function} cb */
  onDeviceChange(cb) {}
};
```

### 2.3 双实现策略

| 实现 | 阶段 | 说明 |
| --- | --- | --- |
| `MockAdbEngine` | 当前(纯前端) | 内置命令响应表(按命令前缀匹配)+ 模拟延迟(150~1200ms)+ 随机失败注入(约 5%,用于验证错误处理路径)。替代现有散落的 `setTimeout` 模拟逻辑 |
| `RealAdbEngine` | 桌面化 | spawn adb 二进制 / Node adbkit / Rust adb 库,接口契约不变(见第 6 章) |

### 2.4 命令响应表设计(Mock 阶段)

响应表按"命令前缀 → 响应生成器"注册,生成器可读取当前 mock 状态(如 `mockDisplayState` 中的当前分辨率),保证 UI 状态与命令输出一致:

```js
// 伪代码示例:响应表结构
const mockResponses = [
  { pattern: /^shell wm size/, handler: () => `Physical size: ${mockDisplayState.size}` },
  { pattern: /^shell wm size (\d+x\d+)/, handler: (m) => { mockDisplayState.size = m[1]; return ""; } },
  { pattern: /^shell wm size reset/, handler: () => { mockDisplayState.size = mockDisplayState.defaultSize; return ""; } },
  // ...其余命令同理
];
```

### 2.5 使用约束(AGENTS.md 代码规范)

- 文件职责:`adb.js` 属于"工具/服务层",命名遵循 `initXxx()` 之外的服务化命名(`AdbEngine`、`MockAdbEngine`)
- 所有 P1 业务代码只通过 `AdbEngine.execute()` 取数/执行,禁止直接引用 mock 数据
- 既有视图(设备信息、截图等)在真实阶段迁移清单中列明(见 6.3),本里程碑内**不强推迁移**,避免返工

## 3. P1 功能清单

> 每个功能点均含 6 要素:功能定义 / UI 设计要点 / 命令映射 / mock 阶段实现路径 / 真实引擎集成路径 / 双层验收标准。
> 验收标准中"mock 阶段"在当前纯前端仓库内可立即验证;"真实阶段"为桌面化后的验收目标。

### 3.1 功能 1.1:分辨率 / DPI 调节

**功能定义**:预设档位 + 自定义输入,设置屏幕分辨率(`wm size`)与密度(`wm density`),支持恢复默认;失败时自动回滚到原值。

**UI 设计要点**(显示调节视图内"分辨率/DPI"卡片):
- 当前值展示区:`wm size` / `wm density` 实时读取结果(如 `1344 x 2992`、`480dpi`)
- 预设档位按钮组:分辨率(原生 / 1080P / 720P / 2K),DPI(原生 / 480 / 420 / 360 / 320)
- 自定义输入区:宽 × 高(`\d+x\d+` 校验)、密度数值(整数校验),附"应用"按钮
- 每项独立"恢复默认"按钮(即 `wm size reset` / `wm density reset`)
- 执行反馈:Toast 成功/失败;失败时提示已回滚原值

**命令映射**:

| 操作 | 命令 | 说明 |
| --- | --- | --- |
| 读取当前分辨率 | `shell wm size` | 输出形如 `Physical size: 1344x2992`,解析后展示 |
| 设置分辨率 | `shell wm size 1080x2400` | 宽×高,小写 x 分隔 |
| 恢复分辨率 | `shell wm size reset` | 恢复出厂分辨率 |
| 读取当前密度 | `shell wm density` | 输出形如 `Physical density: 480` |
| 设置密度 | `shell wm density 420` | 整数,单位 dpi |
| 恢复密度 | `shell wm density reset` | 恢复出厂密度 |

**回滚策略**:每次 set 前先执行读取命令缓存原值;set 失败(exitCode != 0 或 stderr 含异常)时自动执行恢复命令,并 Toast 提示"设置失败,已恢复原值"。

**mock 阶段实现路径**:
1. `data.js` 新增 `mockDisplayState`:`{ size, defaultSize, density, defaultDensity, presets: { sizes: [...], densities: [...] } }`
2. `components.js` 新增 `renderDisplaySettings()`(含分辨率/DPI 卡片)
3. `app.js` 新增 `initDisplaySettings()`,所有按钮走 `AdbEngine.execute()`(mock 实现更新 `mockDisplayState` 并返回模拟输出)
4. `advanced.css` 新增显示调节卡片、预设按钮组样式

**真实引擎集成路径**:零 UI 改动,仅将 `AdbEngine.execute()` 实现切换为真实 adb 调用;`wm size`/`wm density` 输出解析逻辑保留在业务层(解析函数建议独立为 `parseWmOutput()` 工具,便于单测)。

**验收标准**:
- mock 阶段:预设档位一键生效并更新当前值展示;自定义输入非法格式被拦截;恢复默认恢复初始值;失败注入时出现"已回滚"提示
- 真实阶段:连接真机后设置分辨率/密度即时生效,`adb shell wm size` 在设备侧确认变更;恢复默认还原出厂值;断连设备执行时给出明确错误

### 3.2 功能 1.2:过扫描调节

**功能定义**:四边边界(左/上/右/下)无级调节,实时预览,提供重置。

**UI 设计要点**(显示调节视图内"过扫描"卡片):
- 四个滑块/数字输入(范围 -200 ~ +200 px,步进 10),分别对应左/上/右/下
- 手机屏幕预览示意图:用 CSS 内边框示意当前过扫描偏移量,滑块变化实时联动
- "应用"按钮(提交四边值)与"重置"按钮(`wm overscan reset`)
- 兼容性提示:Android 10+ 部分机型不支持,失败时明确提示

**命令映射**:

| 操作 | 命令 | 说明 |
| --- | --- | --- |
| 读取当前过扫描 | `shell wm overscan` | 输出形如 `0,0,0,0`(l,t,r,b),无输出视为未设置 |
| 设置过扫描 | `shell wm overscan 0,100,0,0` | 四边逗号分隔,正值向屏内收缩 |
| 重置过扫描 | `shell wm overscan reset` | 恢复默认 |

**回滚策略**:与 1.1 相同,set 前缓存原值,失败自动恢复。

**mock 阶段实现路径**:
1. `data.js` `mockDisplayState` 增加 `overscan: { left, top, right, bottom, defaults: {0,0,0,0} }`
2. `components.js` 在 `renderDisplaySettings()` 内输出过扫描卡片(或独立 `renderOverscanCard()`)
3. `app.js` 滑块 change 事件实时更新预览;应用/重置走 `AdbEngine.execute()`
4. `advanced.css` 过扫描预览示意样式

**真实引擎集成路径**:同 1.1,仅切换引擎实现。

**验收标准**:
- mock 阶段:滑块联动预览图;应用后 Toast 成功并展示当前值;重置恢复 0,0,0,0;失败注入提示不支持
- 真实阶段:真机 `wm overscan` 生效,屏幕四周出现偏移;重置后恢复;不支持设备给出兼容性提示

### 3.3 功能 1.3:系统参数无级调节

**功能定义**:动画速度(3 档 + 自定义)、字体大小、锁屏时间无级调节,`settings put` 系列封装,即时反馈。

**UI 设计要点**(显示调节视图内"系统参数"卡片):
- 动画速度:关闭(0) / 0.5x / 1x 三档按钮 + "自定义"输入(0 ~ 10,步进 0.5);三档联动写入三个 scale 属性,自定义值同写
- 字体大小:滑块(0.85 ~ 1.30,步进 0.05),实时显示数值
- 锁屏时间:数字输入(毫秒,如 5000),附说明"锁屏后 N 毫秒自动上锁,0 表示立即"
- 每项独立"应用"按钮,应用后 Toast 反馈;提供"恢复默认"一键还原三组默认值

**命令映射**:

| 参数 | 命令 | 默认值 |
| --- | --- | --- |
| 窗口动画 | `settings put global window_animation_scale 1.0` | 1.0 |
| 过渡动画 | `settings put global transition_animation_scale 1.0` | 1.0 |
| Animator 动画 | `settings put global animator_duration_scale 1.0` | 1.0 |
| 字体大小 | `settings put system font_scale 1.0` | 1.0 |
| 锁屏时间 | `settings put secure lock_screen_lock_after_timeout 5000` | 设备默认 |

**mock 阶段实现路径**:
1. `data.js` `mockDisplayState` 增加 `animations: { window, transition, animator }, fontScale, lockTimeout`
2. `components.js` 在 `renderDisplaySettings()` 内输出系统参数卡片(或独立 `renderSystemParamsCard()`)
3. `app.js` 三档按钮联动写入三个 scale 输入;自定义输入校验(0~10);应用/恢复走 `AdbEngine.execute()`
4. `advanced.css` 参数行布局、档位按钮组样式

**真实引擎集成路径**:`settings` 命令读取可封装 `settings get global <key>` 实现"读取当前值后回显",UI 无需改动。

**验收标准**:
- mock 阶段:三档切换正确联动三个 scale;自定义值校验;恢复默认还原 1.0/1.0/1.0/1.0;Toast 反馈
- 真实阶段:真机动画速度/字体/锁屏时间实际变化;重启设备后 `settings` 持久生效(其中 lock_screen_lock_after_timeout 属 secure,部分设备需 adb 授权)

### 3.4 功能 1.4:电池模拟

**功能定义**:模拟电量 / 温度 / 充电状态,一键还原真实电池状态(测试向功能)。

**UI 设计要点**(电池模拟视图):
- 当前电池状态展示卡:电量(百分比)、温度(°C)、充电状态(充电中/未充电/已充满),数据来自 `dumpsys battery` 解析
- 模拟控制区:
  - 模拟开关(切换启用/停用模拟,启用时自动执行 `dumpsys battery unplug` 断开真实充电)
  - 电量滑块(1% ~ 100%,步进 1)
  - 温度滑块(20°C ~ 60°C,步进 0.5°C,底层单位 0.1°C)
  - 充电状态下拉(充电中 / 未充电 / 已充满 / 不充电)
  - "一键还原"按钮(`dumpsys battery reset`),红色警示样式
- 安全提示条:模拟状态会覆盖设备真实电池读数,还原前设备电池显示可能异常

**命令映射**:

| 操作 | 命令 | 说明 |
| --- | --- | --- |
| 读取电池状态 | `shell dumpsys battery` | 解析 `level` / `temperature`(0.1°C 单位) / `status`(2=充电中,3=未充电,4=不充电,5=已充满) |
| 模拟电量 | `shell dumpsys battery set level 50` | 整数 0~100 |
| 模拟温度 | `shell dumpsys battery set temperature 350` | 单位 0.1°C,UI 显示时除以 10 |
| 模拟充电状态 | `shell dumpsys battery set status 2` | 见上状态码 |
| 模拟拔电 | `shell dumpsys battery unplug` | 断开 AC/USB 充电输入 |
| 一键还原 | `shell dumpsys battery reset` | 恢复真实电池数据 |

**mock 阶段实现路径**:
1. `data.js` 新增 `mockBatteryState`:`{ real: { level, temperature, status }, simulated: null }`
2. `components.js` 新增 `renderBatterySimulator()`
3. `app.js` 新增 `initBatterySimulator()`;启用模拟后滑块/下拉实时写入 `AdbEngine.execute()`;还原按钮弹确认框(复用 `modal-overlay` 模式)
4. `advanced.css` 电池模拟卡片、状态展示、警示条样式

**真实引擎集成路径**:`dumpsys battery` 输出解析独立为 `parseBatteryOutput()` 工具;模拟状态机逻辑(mock 内 simulated 字段)由引擎层负责,UI 只展示引擎返回的当前状态。

**验收标准**:
- mock 阶段:启用模拟后状态卡实时更新;滑块/下拉修改即时生效;一键还原(带确认)恢复真实值;还原后模拟开关自动复位
- 真实阶段:真机状态栏电量/温度按模拟值显示;`dumpsys battery reset` 后恢复真实读数;拔电后充电图标消失

### 3.5 功能 1.5:重启模式

**功能定义**:重启系统 / Recovery / Bootloader / Fastboot,带二次确认。

**UI 设计要点**(设备控制视图内"重启模式"区块):
- 四个模式卡片(系统重启 / Recovery / Bootloader / Fastboot),每个含图标、名称、说明、执行按钮
- 点击执行按钮弹出二次确认模态框:显示目标模式 + 警示文案("设备将立即重启,当前连接会断开,正在进行的操作可能丢失")
- 确认后执行:按钮 loading → Toast"重启指令已发送,设备离线后请稍候重新连接";设备状态模拟为离线再自动恢复(验证状态栏联动)
- 危险模式(Fastboot)增加红色警示样式

**命令映射**:

| 模式 | 命令 | 说明 |
| --- | --- | --- |
| 重启系统 | `reboot` | 普通重启 |
| Recovery | `reboot recovery` | 进入恢复模式 |
| Bootloader | `reboot bootloader` | 进入引导加载器 |
| Fastboot | `reboot fastboot` | 部分设备支持,直接进 fastboot |

**mock 阶段实现路径**:
1. `data.js` 新增 `mockRebootModes` 数组(模式定义: id/名称/说明/危险等级)
2. `components.js` 在设备控制视图渲染函数中输出重启区块(或独立 `renderRebootSection()`)
3. `app.js` 新增 `initDeviceControl()`;确认框复用 `openRebootConfirmModal(mode)`;执行后模拟设备 offline → 2s 后恢复 connected 并刷新状态栏
4. `advanced.css` 模式卡片、危险警示样式

**真实引擎集成路径**:执行后无需本地模拟设备状态,依赖设备心跳(P0.2)自动感知离线/恢复。

**验收标准**:
- mock 阶段:四种模式均可触发确认框;确认后 Toast 反馈;状态栏模拟离线后恢复;取消不执行
- 真实阶段:真机按所选模式重启;设备心跳感知离线并自动重连;取消按钮无副作用

### 3.6 功能 1.6:按键与输入模拟

**功能定义**:点击、滑动、长按、物理按键、文本输入模拟,`input` 系列封装,支持坐标与相对位置。

**UI 设计要点**(设备控制视图内"输入模拟"区块):
- 屏幕坐标输入区:宽高输入(参照当前分辨率)+ 点击按钮 / 长按按钮(长按 = 同坐标 swipe 500ms)
- 滑动输入区:起点坐标、终点坐标、时长(ms),滑动按钮
- 物理按键网格:Home、返回、最近任务、电源、音量 +、音量 -、静音、截图、菜单、搜索 等常用键
- 文本输入区:输入框 + 发送按钮,标注"仅支持 ASCII 字符,中文需用 ADB Keyboard 等输入法"
- 坐标校验:0 ≤ x ≤ 分辨率宽,0 ≤ y ≤ 分辨率高;非数字拦截

**命令映射**:

| 操作 | 命令 | 说明 |
| --- | --- | --- |
| 点击 | `shell input tap 540 1200` | x y 整数坐标 |
| 滑动 | `shell input swipe 540 1200 540 400 300` | x1 y1 x2 y2 duration(ms) |
| 长按 | `shell input swipe 540 1200 540 1200 500` | 起终点相同 + duration |
| 物理按键 | `shell input keyevent KEYCODE_HOME` | 常用键见下表 |
| 文本输入 | `shell input text hello` | 仅 ASCII,空格用 %s 转义 |

常用 KEYCODE:KEYCODE_HOME(3)、KEYCODE_BACK(4)、KEYCODE_APP_SWITCH(187)、KEYCODE_POWER(26)、KEYCODE_VOLUME_UP(24)、KEYCODE_VOLUME_DOWN(25)、KEYCODE_MUTE(91)、KEYCODE_CAMERA(27)、KEYCODE_MENU(82)、KEYCODE_SEARCH(84)

**mock 阶段实现路径**:
1. `data.js` 新增 `mockKeycodes` 数组(按键定义: id/名称/keycode/图标)
2. `components.js` 在设备控制视图渲染函数中输出输入模拟区块(或独立 `renderInputSimulator()`)
3. `app.js` `initDeviceControl()` 内绑定坐标校验、各按钮 `AdbEngine.execute()` 调用;执行成功 Toast"已发送 input 指令"
4. `advanced.css` 按键网格、坐标输入组样式

**真实引擎集成路径**:`input` 系列直接映射为真实命令;坐标参照值(分辨率)从 1.1 的 `wm size` 读取结果联动。

**验收标准**:
- mock 阶段:非法坐标/非数字被拦截;点击/滑动/长按/按键/文本均 Toast 反馈;文本含中文时提示限制
- 真实阶段:真机屏幕产生对应点击/滑动/按键效果;长按触发长按行为;ASCII 文本正确输入

### 3.7 功能 1.7:自动化脚本

**功能定义**:录制 / 编辑 / 执行脚本(点击、滑动、延时、循环),支持脚本文件导入导出与执行中停止。

**UI 设计要点**(自动化脚本视图):
- 脚本编辑器:textarea + 行号显示,语法高亮可按行着色(指令行/注释行)
- 指令插入快捷按钮:tap、swipe、keyevent、text、sleep、loop/end(点击后在光标处插入模板行)
- 录制模式开关:开启后,用户通过"输入模拟"面板(1.6)执行的动作自动追加为脚本行;可配置录制间隔(sleep 自动插入)
- 执行控制:执行 / 停止按钮;执行中当前行高亮 + 进度显示;执行完 Toast 汇总(总行数、耗时)
- 文件操作:导入脚本(文件选择,读取文本)、导出脚本(下载 .adbs 文件)、示例脚本模板按钮
- 脚本语法校验:执行前逐行校验,非法行给出行号提示

**脚本 DSL 定义**(v1 精简版):

```
# 注释
tap 540 1200            # 点击
swipe 540 1200 540 400 300   # 滑动(x1 y1 x2 y2 时长ms)
keyevent KEYCODE_HOME   # 物理按键
text hello              # 文本输入(仅 ASCII)
sleep 1000              # 延时(ms)
loop 3                  # 循环开始(次数)
  tap 100 200           # 循环体(缩进可选,按 loop/end 配对)
end                     # 循环结束
```

**命令映射**:脚本行 → 3.6 的 `input` 系列命令;`sleep` 由引擎层延时(真实阶段为两条命令间的等待);`loop/end` 由引擎层解释展开。

**mock 阶段实现路径**:
1. `data.js` 新增 `mockScriptTemplates`(示例脚本)与脚本解析工具(`parseScriptLines()` 放 utils.js,供编辑校验与执行共用)
2. `components.js` 新增 `renderScriptAutomation()`
3. `app.js` 新增 `initScriptAutomation()`:执行时逐行驱动 `AdbEngine.execute()`(mock 快速完成),停止按钮中断循环;导入导出用 FileReader / Blob 下载
4. `advanced.css` 编辑器、行号、当前行高亮、指令按钮条样式

**真实引擎集成路径**:引擎层提供 `executeScript(lines, { onLine, onStop })` 流式执行接口(进度回调),UI 仅消费回调更新行高亮;停止通过 AbortController 类机制实现。

**验收标准**:
- mock 阶段:示例脚本可执行并逐步高亮;非法行报行号;loop 循环次数正确;执行中可停止;导入导出往返内容一致;录制模式生成的脚本可回放
- 真实阶段:真机按脚本执行点击/滑动/按键序列;sleep 实际延时;loop 展开正确;停止后设备不再接收后续指令

### 3.8 功能 1.8:常用命令库

**功能定义**:高频 ADB 指令一键执行,可收藏自定义,与命令历史联动。

**UI 设计要点**(常用命令库视图):
- 左侧分类导航:全部 / 设备信息 / 应用管理 / 系统控制 / 显示调节 / 网络调试 / 我的收藏 / 自定义
- 右侧命令列表:每条含命令(等宽字体)、说明、执行按钮、收藏星标
- 自定义命令:表单(名称 + 命令 + 分类)添加,持久化到 localStorage
- 收藏:星标切换,收藏项进"我的收藏"分类,持久化 localStorage
- 执行:点击执行调 `AdbEngine.execute()`,输出展示在命令卡片内联展开区(或 Toast),成功后追加写入命令历史(与 `mockCommandHistory` 联动,真实阶段写入历史存储)

**命令映射(命令模板表)**:分类 + 高频指令,示例:
- 设备信息:`devices -l`、`shell getprop ro.product.model`、`shell getprop ro.build.version.release`
- 应用管理:`shell pm list packages`、`shell pm list packages -3`(仅第三方)、`shell pm clear <包名>`
- 系统控制:`reboot`、`shell input keyevent KEYCODE_POWER`(锁屏)
- 显示调节:`shell wm size`、`shell wm density`、`shell wm overscan`
- 网络调试:`tcpip 5555`、`connect 192.168.1.100:5555`、`shell ip addr show wlan0`

**mock 阶段实现路径**:
1. `data.js` 新增 `mockCommandLibrary`(分类 + 命令模板数组);收藏/自定义用 localStorage(键 `adb-ui-command-lib`,与设置持久化模式一致)
2. `components.js` 新增 `renderCommandLibrary()`
3. `app.js` 新增 `initCommandLibrary()`:分类切换、收藏切换、自定义表单、执行(写入命令历史数组)
4. `advanced.css` 左侧分类栏、命令卡片、内联输出区样式

**真实引擎集成路径**:命令模板不变,执行路径切换真实引擎;命令历史由 P0.3 任务框架统一记录。

**验收标准**:
- mock 阶段:分类切换正确;收藏/取消收藏持久化(刷新后仍在);自定义命令增删生效;执行后 Toast 反馈并出现在命令历史列表
- 真实阶段:一键执行真实生效;输出正确解析展示;历史记录完整保存

## 4. UI 组织方案

### 4.1 侧边栏新增 5 个入口

P1 的 8 项功能按交互聚合为 5 个新视图(避免侧边栏膨胀,当前已 10 项):

| 新增视图 | data-view | 承载功能 | 建议图标(SVG stroke="currentColor") |
| --- | --- | --- | --- |
| 显示调节 | display | 1.1 分辨率/DPI + 1.2 过扫描 + 1.3 系统参数 | 显示器图标(rect + 底座线) |
| 电池模拟 | battery | 1.4 | 电池图标(rect + 电量头) |
| 设备控制 | device-control | 1.5 重启 + 1.6 按键输入 | 遥控器/手柄图标(十字键) |
| 自动化脚本 | scripts | 1.7 | 终端/代码图标(尖括号) |
| 常用命令库 | command-lib | 1.8 | 书签/列表图标 |

### 4.2 视图内部布局

- **显示调节**:顶部当前值条(分辨率/密度/过扫描汇总)→ 三个卡片区块横向排布(分辨率/DPI、过扫描、系统参数)
- **电池模拟**:状态展示卡 + 模拟控制卡 + 安全提示条
- **设备控制**:两个区块上下排布(重启模式卡片行、输入模拟面板)
- **自动化脚本**:编辑器(左,约 65% 宽)+ 指令工具条与录制面板(右)
- **常用命令库**:左分类栏(约 200px)+ 右命令列表(自适应)

### 4.3 落地流程(每视图遵循 AGENTS.md 五步)

1. `src/index.html`:侧边栏添加 `data-view` 导航项(含内联 SVG 图标 + tooltip)
2. `src/js/app.js`:`views` 映射表登记标题/副标题
3. `src/js/app.js`:`switchView()` 添加渲染分支(renderXxx + initXxx)
4. `src/js/components.js`:编写 `renderXxx()`(HTML 模板字符串,动态文本 `escapeHtml()`)
5. `src/css/advanced.css`:添加视图专属样式(复用 `--color-*`、`--radius-*`、`--space-*` 设计令牌)

交互反馈统一使用 `Toast.show(消息, 类型, 标题)`;危险操作(重启、还原电池)复用 `modal-overlay` 确认框模式。

## 5. 实施顺序

依赖驱动排序,每步完成即产出自检点:

| 步骤 | 内容 | 依赖 | 完成标志 |
| --- | --- | --- | --- |
| 1 | 命令抽象层 `src/js/adb.js`(MockAdbEngine + 响应表) | 无 | `AdbEngine.execute("shell wm size")` 返回解析可用输出;index.html 引入脚本 |
| 2 | 1.8 常用命令库 | 步骤 1 | 命令模板表可分类浏览、收藏、执行、写历史 |
| 3 | 1.1 + 1.2 + 1.3 显示调节(聚合视图) | 步骤 1 | 三个卡片全部可交互,回滚提示可验证 |
| 4 | 1.4 电池模拟 | 步骤 1 | 模拟/还原流程完整,确认框生效 |
| 5 | 1.5 + 1.6 设备控制(聚合视图) | 步骤 1 | 四种重启确认 + input 系列全部可用 |
| 6 | 1.7 自动化脚本 | 步骤 5(input 命令封装) | 示例脚本可执行/停止,录制回放可用 |
| 7 | 2.1 / 2.6 迁移标注 | 无 | 在本文档 6.3 迁移清单中标注"UI 已具备,待接引擎",README 功能清单同步 |

> 注:步骤 1 响应表优先覆盖 wm/settings/dumpsys battery/reboot/input 五类命令前缀,其余命令返回默认模拟输出。

## 6. 真实 ADB 引擎集成过渡

> 本章为桌面化阶段的文档级方案。当前仓库保持纯前端零依赖约束,不做技术选型定案;UI 层已通过 `AdbEngine` 接口与引擎解耦,届时无需 UI 返工。

### 6.1 技术选型对比

| 方案 | 优点 | 缺点 | 适用场景 |
| --- | --- | --- | --- |
| Electron + 内嵌 adb 二进制 | 成熟稳定,直接 spawn 进程,命令行为与 CLI 完全一致;打包时可随平台分发 platform-tools | 安装包体积大(~150MB+);需维护三平台二进制 | 追求命令兼容性与实现速度 |
| Electron + Node adbkit | 纯 JS 抽象,API 友好,自动处理输出解析;npm 生态成熟 | 部分高级命令需透传原始参数;adbkit 更新节奏一般 | 团队熟悉 JS、减少 spawn 样板代码 |
| Tauri + Rust adb 库(如 adb-client) | 安装包小(~10MB),性能好,安全性高 | Rust 学习成本;adb 库生态不如 Node 成熟 | 追求体积与性能的正式产品 |

**取舍建议**:若以"快速验证 + 命令全覆盖"为目标选 Electron + 内嵌 adb 二进制;若以"长期产品 + 体积控制"为目标选 Tauri。无论选型,`AdbEngine` 接口契约不变。

### 6.2 引擎实现要点(RealAdbEngine)

- `execute(command, options)`:`spawn(adbPath, [ "-s", deviceId, ...command.split(" ") ])`,聚合 stdout/stderr/exitCode 后 resolve;超时(默认 10s,`options.timeout` 可覆盖)强制 kill 并 reject
- `getDevices()`:解析 `adb devices -l` 输出 → `{ id, model, status }` 数组
- `onDeviceChange(cb)`:每 3s 心跳轮询 `getDevices()`,diff 后回调;状态栏订阅该事件刷新(替代现有 `initStatusBar()` 手动刷新)
- 输出解析归一化:`parseWmOutput()`、`parseBatteryOutput()`、`parseOverscanOutput()` 等解析函数从业务层下沉到引擎层,业务层只消费结构化结果

### 6.3 迁移清单(按模块)

| 模块 | 替换点 | 说明 |
| --- | --- | --- |
| 常用命令库 | `initCommandLibrary()` 内 `AdbEngine.execute()` 实现切换 | 命令历史写入改走 P0.3 历史存储 |
| 显示调节 | `initDisplaySettings()` 内所有 execute 调用 | 解析函数换引擎层版本 |
| 电池模拟 | `initBatterySimulator()` 内 execute + `parseBatteryOutput()` | 状态机由引擎层维护 |
| 设备控制 | `initDeviceControl()` 内 execute;设备离线/恢复改由心跳事件驱动 | 移除本地模拟 offline 逻辑 |
| 自动化脚本 | `executeScript()` 流式执行接口 | UI 仅消费行进度回调 |
| 设备信息(2.1) | `renderDeviceInfo()` 数据源由 `mockDeviceDetails` 改为 `getprop`/`dumpsys` 聚合 | UI 结构不变 |
| 设置(2.6) | ADB 路径配置真实生效(引擎初始化读取) | localStorage 配置已就绪 |

### 6.4 与 P0 基建的关系

- P0.3 异步任务框架:批量操作(批量安装/卸载/冻结)任务化,任务中心视图已具备(mock),真实阶段对接任务队列(任务 ID、进度事件、结果回调)
- P0.2 设备生命周期:设备心跳轮询 + 授权状态展示,状态栏/设备下拉已具备 UI 骨架
- 实施约束(ROADMAP 第 5 节):P0 完成前不扩展新模块;M2 的 UI 层先行符合"先假数据 UI 再接真实引擎"原则

## 7. 验收矩阵

> 勾选式验收清单。mock 阶段项在纯前端仓库内验证;真实阶段项在桌面化后验证。

| # | 功能 | mock 阶段验收项 | 真实阶段验收项 |
| --- | --- | --- | --- |
| 1.1 | 分辨率/DPI 调节 | [ ] 预设档位生效 [ ] 自定义校验 [ ] 恢复默认 [ ] 失败回滚提示 | [ ] 真机即时生效 [ ] 设备侧确认变更 [ ] 断连错误提示 |
| 1.2 | 过扫描调节 | [ ] 滑块联动预览 [ ] 应用/重置 [ ] 不支持提示 | [ ] 真机过扫描偏移 [ ] 重置恢复 |
| 1.3 | 系统参数 | [ ] 三档联动 [ ] 自定义校验 [ ] 恢复默认 | [ ] 动画/字体/锁屏实际变化 [ ] 持久生效 |
| 1.4 | 电池模拟 | [ ] 模拟开关 [ ] 滑块/下拉即时反馈 [ ] 还原(带确认) | [ ] 真机电池读数变化 [ ] reset 恢复真实 |
| 1.5 | 重启模式 | [ ] 四种模式确认框 [ ] 取消无副作用 [ ] 状态栏离线联动 | [ ] 真机按模式重启 [ ] 心跳自动重连 |
| 1.6 | 按键输入 | [ ] 坐标校验 [ ] 五类操作反馈 [ ] ASCII 限制提示 | [ ] 真机点击/滑动/按键效果 [ ] 长按行为 |
| 1.7 | 自动化脚本 | [ ] 示例脚本执行 [ ] 非法行报错 [ ] loop 展开 [ ] 停止 [ ] 导入导出 [ ] 录制回放 | [ ] 真机脚本序列 [ ] sleep 实际延时 [ ] 停止即断流 |
| 1.8 | 命令库 | [ ] 分类浏览 [ ] 收藏持久化 [ ] 自定义增删 [ ] 写命令历史 | [ ] 一键执行真实生效 [ ] 输出解析正确 |

## 8. 风险与注意事项

1. **安全优先**(ROADMAP 第 5 节约束):1.5 重启、1.4 电池还原均需二次确认 + 警示说明;Fastboot 等危险模式增加红色警示样式;确认按钮默认不聚焦,防误触
2. **`wm overscan` 兼容性**:Android 10+ 部分厂商机型不支持或行为不一致,应用前读取当前值、失败提示并回滚;UI 需保留"不支持"降级文案
3. **`input text` 中文限制**:`input` 命令仅支持 ASCII,UI 输入框标注限制;后期可通过 ADB Keyboard(IME 方案)扩展中文输入,列入 M3 候选
4. **输出解析差异**:mock 输出与真实 `dumpsys`/`wm` 输出格式存在差异(如 `temperature` 单位 0.1°C),解析函数统一由引擎层负责并归一化,业务层不感知
5. **分辨率/DPI 修改副作用**:修改后可能导致设备 UI 错乱、状态栏/导航栏异常,UI 提供"恢复默认"快捷入口并提示"若设备显示异常请重启或执行恢复"
6. **脚本 DSL 边界**:v1 仅支持顺序 + loop/end 嵌套(最多 3 层),不支持条件分支;解析器需对未配对 loop/end、非法指令给出行号级报错
7. **持久化键冲突**:命令库收藏/自定义使用独立 localStorage 键(`adb-ui-command-lib`),与设置键(`adb-ui-settings`)隔离,避免互相覆盖
8. **文档同步**:每步实施完成更新本文档验收矩阵勾选状态与 ROADMAP.md 文档状态,README 功能清单同步新增 5 个视图说明
