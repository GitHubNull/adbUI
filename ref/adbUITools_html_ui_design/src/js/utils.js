// ============================================
// ADB UI - Utilities
// ============================================

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format date to locale string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Format time only
 */
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

/**
 * Get initials from app name (max 2 chars)
 */
function getInitials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Debounce function
 */
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Create DOM element with attributes and children
 */
function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "className") {
      el.className = value;
    } else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  });
  children.forEach((child) => {
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });
  return el;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// Toast Notification System
// ============================================

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    }
  },

  show(message, type = "info", title = "", duration = 3000) {
    this.init();

    const icons = {
      success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
      error: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
      warning: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
      info: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`
    };

    const colors = {
      success: "#22c55e",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6"
    };

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon" style="color: ${colors[type]}">${icons[type]}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ""}
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <div class="toast-close" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      </div>
    `;

    this.container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// ============================================
// SVG Sparkline Generator
// ============================================

function generateSparkline(data, width = 120, height = 36, color = "#3b82f6") {
  if (!data || data.length === 0) return "";
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${width}" cy="${height - ((data[data.length - 1] - min) / range) * height}" r="3" fill="${color}"/>
  </svg>`;
}

// ============================================
// Copy to Clipboard
// ============================================

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      Toast.show("已复制到剪贴板", "success", "复制");
    });
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    Toast.show("已复制到剪贴板", "success", "复制");
  }
}

// ============================================
// Command Library Persistence (localStorage)
// ============================================

const COMMAND_LIB_KEY = "adb-ui-command-lib";

function loadCommandLibrary() {
  const saved = localStorage.getItem(COMMAND_LIB_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      return {
        favorites: Array.isArray(data.favorites) ? data.favorites : [],
        custom: Array.isArray(data.custom) ? data.custom : [],
        activeCategory: data.activeCategory || "全部"
      };
    } catch (e) {
      console.error("Failed to parse command library:", e);
    }
  }
  return { favorites: [], custom: [], activeCategory: "全部" };
}

function saveCommandLibrary(lib) {
  localStorage.setItem(COMMAND_LIB_KEY, JSON.stringify(lib));
}

// ============================================
// Script DSL Parser (1.7 自动化脚本)
// ============================================
// v1 精简版:tap/swipe/keyevent/text/sleep/loop/end,# 开头为注释。
// 返回 { lines: [...], errors: [{ line, message }] }
// lines 元素:{ no, raw, cmd, args, indent }

function parseScriptLines(text) {
  const rawLines = String(text || "").split(/\r?\n/);
  const lines = [];
  const errors = [];
  const loopStack = [];
  const VALID = ["tap", "swipe", "keyevent", "text", "sleep", "loop", "end"];

  rawLines.forEach((raw, idx) => {
    const no = idx + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      lines.push({ no, raw, cmd: "comment", args: [], indent: raw.length - raw.trimStart().length });
      return;
    }
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    const indent = raw.length - raw.trimStart().length;

    if (!VALID.includes(cmd)) {
      errors.push({ line: no, message: `未知指令 "${parts[0]}"` });
      return;
    }

    const isNum = (v) => /^-?\d+(\.\d+)?$/.test(v);
    if (cmd === "tap" && !(args.length === 2 && args.every(isNum))) {
      errors.push({ line: no, message: "tap 需要 2 个数字坐标参数" });
    } else if (cmd === "swipe" && !(args.length === 5 && args.every(isNum))) {
      errors.push({ line: no, message: "swipe 需要 5 个数字参数(x1 y1 x2 y2 时长ms)" });
    } else if (cmd === "keyevent" && !(args.length === 1 && /^[A-Z0-9_]+$/.test(args[0]))) {
      errors.push({ line: no, message: "keyevent 需要 1 个按键名(如 KEYCODE_HOME)" });
    } else if (cmd === "text" && args.length < 1) {
      errors.push({ line: no, message: "text 需要至少 1 个文本参数" });
    } else if (cmd === "sleep" && !(args.length === 1 && isNum(args[0]))) {
      errors.push({ line: no, message: "sleep 需要 1 个数字毫秒参数" });
    } else if (cmd === "loop") {
      if (!(args.length === 1 && isNum(args[0]))) {
        errors.push({ line: no, message: "loop 需要 1 个数字次数参数" });
      } else {
        loopStack.push(no);
        if (loopStack.length > 3) {
          errors.push({ line: no, message: "loop 嵌套最多 3 层" });
        }
      }
    } else if (cmd === "end") {
      if (loopStack.length === 0) {
        errors.push({ line: no, message: "end 没有配对的 loop" });
      } else {
        loopStack.pop();
      }
    }

    lines.push({ no, raw, cmd, args, indent });
  });

  if (loopStack.length > 0) {
    errors.push({ line: loopStack[loopStack.length - 1], message: "loop 缺少配对的 end" });
  }

  return { lines, errors };
}
