// ============================================
// ADB 引擎抽象层 - 唯一命令执行入口
// ============================================
// 业务代码只依赖 AdbEngine 接口,不感知数据来源。
// 当前阶段为 MockAdbEngine(mock),桌面化后替换为 RealAdbEngine,接口契约不变。

const AdbEngine = {
  /**
   * 执行一条 ADB 命令
   * @param {string} command 完整命令,如 "shell wm size"、"devices"
   * @param {Object} [options] { deviceId, timeout }
   * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
   */
  async execute(command, options) {
    return MockAdbEngine.execute(command, options);
  },

  /** 获取设备列表 @returns {Promise<Array>} */
  async getDevices() {
    return MockAdbEngine.getDevices();
  },

  /** 订阅设备状态变化 @param {Function} cb */
  onDeviceChange(cb) {
    return MockAdbEngine.onDeviceChange(cb);
  }
};

// ============================================
// Mock ADB 引擎实现
// ============================================
// 内置命令响应表(按命令前缀匹配)+ 模拟延迟 + 随机失败注入(约 5%,验证错误处理路径)。

const MockAdbEngine = {
  // 模拟延迟范围(ms)
  minDelay: 150,
  maxDelay: 1200,
  // 随机失败概率(验证回滚/错误处理路径)
  failureRate: 0.05,

  _deviceChangeCbs: [],

  /**
   * 执行命令:匹配响应表 → 模拟延迟 → 随机失败注入 → 返回结构化结果
   */
  async execute(command, options = {}) {
    const delay = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 随机失败注入(仅对"写操作"类命令注入,读取类命令保持稳定)
    const isWriteCommand = /\b(set|put|reset|unplug|reboot|tap|swipe|keyevent|text)\b/.test(command);
    if (isWriteCommand && Math.random() < this.failureRate) {
      return {
        stdout: "",
        stderr: "java.lang.SecurityException: Permission denial (模拟失败注入)",
        exitCode: 1
      };
    }

    const cmd = (command || "").trim();
    for (const entry of this._responses) {
      const match = cmd.match(entry.pattern);
      if (match) {
        try {
          const stdout = entry.handler(match, cmd) || "";
          return { stdout, stderr: "", exitCode: 0 };
        } catch (e) {
          return { stdout: "", stderr: String(e.message || e), exitCode: 1 };
        }
      }
    }
    // 默认模拟输出
    return { stdout: `(模拟输出) ${cmd}`, stderr: "", exitCode: 0 };
  },

  async getDevices() {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockDevices.map((d) => ({ id: d.id, model: d.model, status: d.status }));
  },

  onDeviceChange(cb) {
    if (typeof cb === "function") this._deviceChangeCbs.push(cb);
  },

  _emitDeviceChange(device) {
    this._deviceChangeCbs.forEach((cb) => {
      try { cb(device); } catch (e) { /* ignore */ }
    });
  },

  // ============================================
  // 命令响应表:命令前缀 → 响应生成器
  // 生成器可读取/更新当前 mock 状态,保证 UI 状态与命令输出一致
  // ============================================
  _responses: [
    // ---------- wm size(分辨率) ----------
    {
      pattern: /^shell wm size reset$/,
      handler: () => {
        mockDisplayState.size = mockDisplayState.defaultSize;
        return "";
      }
    },
    {
      pattern: /^shell wm size (\d+x\d+)$/,
      handler: (m) => {
        mockDisplayState.size = m[1];
        return "";
      }
    },
    {
      pattern: /^shell wm size$/,
      handler: () => `Physical size: ${mockDisplayState.size}`
    },

    // ---------- wm density(密度) ----------
    {
      pattern: /^shell wm density reset$/,
      handler: () => {
        mockDisplayState.density = mockDisplayState.defaultDensity;
        return "";
      }
    },
    {
      pattern: /^shell wm density (\d+)$/,
      handler: (m) => {
        mockDisplayState.density = parseInt(m[1], 10);
        return "";
      }
    },
    {
      pattern: /^shell wm density$/,
      handler: () => `Physical density: ${mockDisplayState.density}`
    },

    // ---------- wm overscan(过扫描) ----------
    {
      pattern: /^shell wm overscan reset$/,
      handler: () => {
        mockDisplayState.overscan = { ...mockDisplayState.overscanDefaults };
        return "";
      }
    },
    {
      pattern: /^shell wm overscan (-?\d+),(-?\d+),(-?\d+),(-?\d+)$/,
      handler: (m) => {
        mockDisplayState.overscan = {
          left: parseInt(m[1], 10),
          top: parseInt(m[2], 10),
          right: parseInt(m[3], 10),
          bottom: parseInt(m[4], 10)
        };
        return "";
      }
    },
    {
      pattern: /^shell wm overscan$/,
      handler: () => {
        const o = mockDisplayState.overscan;
        return `${o.left},${o.top},${o.right},${o.bottom}`;
      }
    },

    // ---------- settings put/get(系统参数) ----------
    {
      pattern: /^settings put global window_animation_scale ([\d.]+)$/,
      handler: (m) => { mockDisplayState.animations.window = parseFloat(m[1]); return ""; }
    },
    {
      pattern: /^settings put global transition_animation_scale ([\d.]+)$/,
      handler: (m) => { mockDisplayState.animations.transition = parseFloat(m[1]); return ""; }
    },
    {
      pattern: /^settings put global animator_duration_scale ([\d.]+)$/,
      handler: (m) => { mockDisplayState.animations.animator = parseFloat(m[1]); return ""; }
    },
    {
      pattern: /^settings put system font_scale ([\d.]+)$/,
      handler: (m) => { mockDisplayState.fontScale = parseFloat(m[1]); return ""; }
    },
    {
      pattern: /^settings put secure lock_screen_lock_after_timeout (\d+)$/,
      handler: (m) => { mockDisplayState.lockTimeout = parseInt(m[1], 10); return ""; }
    },
    {
      pattern: /^settings get global window_animation_scale$/,
      handler: () => String(mockDisplayState.animations.window)
    },
    {
      pattern: /^settings get global transition_animation_scale$/,
      handler: () => String(mockDisplayState.animations.transition)
    },
    {
      pattern: /^settings get global animator_duration_scale$/,
      handler: () => String(mockDisplayState.animations.animator)
    },
    {
      pattern: /^settings get system font_scale$/,
      handler: () => String(mockDisplayState.fontScale)
    },
    {
      pattern: /^settings get secure lock_screen_lock_after_timeout$/,
      handler: () => String(mockDisplayState.lockTimeout)
    },

    // ---------- dumpsys battery(电池模拟) ----------
    {
      pattern: /^shell dumpsys battery reset$/,
      handler: () => {
        mockBatteryState.simulated = null;
        return "";
      }
    },
    {
      pattern: /^shell dumpsys battery unplug$/,
      handler: () => {
        const s = mockBatteryState.simulated || (mockBatteryState.simulated = { ...mockBatteryState.real });
        s.acPowered = false;
        s.usbPowered = false;
        return "";
      }
    },
    {
      pattern: /^shell dumpsys battery set level (\d+)$/,
      handler: (m) => {
        const s = mockBatteryState.simulated || (mockBatteryState.simulated = { ...mockBatteryState.real });
        s.level = Math.max(0, Math.min(100, parseInt(m[1], 10)));
        return "";
      }
    },
    {
      pattern: /^shell dumpsys battery set temperature (\d+)$/,
      handler: (m) => {
        const s = mockBatteryState.simulated || (mockBatteryState.simulated = { ...mockBatteryState.real });
        s.temperature = parseInt(m[1], 10); // 单位 0.1°C
        return "";
      }
    },
    {
      pattern: /^shell dumpsys battery set status (\d+)$/,
      handler: (m) => {
        const s = mockBatteryState.simulated || (mockBatteryState.simulated = { ...mockBatteryState.real });
        s.status = parseInt(m[1], 10);
        return "";
      }
    },
    {
      pattern: /^shell dumpsys battery$/,
      handler: () => {
        const s = mockBatteryState.simulated || mockBatteryState.real;
        return [
          "Current Battery Service state:",
          `  AC powered: ${!!s.acPowered}`,
          `  USB powered: ${!!s.usbPowered}`,
          "  Wireless powered: false",
          "  Max charging current: 3000000",
          "  Max charging voltage: 5000000",
          `  status: ${s.status}`,
          "  health: 2",
          "  present: true",
          `  level: ${s.level}`,
          "  scale: 100",
          `  voltage: ${s.voltage}`,
          `  temperature: ${s.temperature}`,
          "  technology: Li-ion"
        ].join("\n");
      }
    },

    // ---------- reboot(重启模式) ----------
    {
      pattern: /^reboot( recovery| bootloader| fastboot)?$/,
      handler: () => ""
    },

    // ---------- input(按键与输入模拟) ----------
    {
      pattern: /^shell input tap -?\d+ -?\d+$/,
      handler: () => ""
    },
    {
      pattern: /^shell input swipe -?\d+ -?\d+ -?\d+ -?\d+( \d+)?$/,
      handler: () => ""
    },
    {
      pattern: /^shell input keyevent [A-Z0-9_]+$/,
      handler: () => ""
    },
    {
      pattern: /^shell input text .+$/,
      handler: () => ""
    },

    // ---------- 常用命令库常用读取 ----------
    {
      pattern: /^devices -l$/,
      handler: () => "List of devices attached\nemulator-5554\tdevice product:sdk_gphone64_arm64 model:Pixel_8_Pro device:husky\n192.168.1.110:5555\tdevice product:nuwa model:23127PN0CC device:nuwa"
    },
    {
      pattern: /^shell getprop ro\.product\.model$/,
      handler: () => "Pixel 8 Pro"
    },
    {
      pattern: /^shell getprop ro\.build\.version\.release$/,
      handler: () => "14"
    },
    {
      pattern: /^shell pm list packages -3$/,
      handler: () => "package:com.android.chrome\npackage:com.google.android.gm\npackage:com.whatsapp\npackage:com.spotify.music\npackage:com.instagram.android"
    },
    {
      pattern: /^shell pm list packages$/,
      handler: () => "package:com.android.chrome\npackage:com.google.android.gm\npackage:com.whatsapp\npackage:com.android.settings\n... (120 packages total)"
    },
    {
      pattern: /^shell ip addr show wlan0$/,
      handler: () => "29: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    inet 192.168.1.105/24 brd 192.168.1.255 scope global wlan0"
    }
  ]
};
