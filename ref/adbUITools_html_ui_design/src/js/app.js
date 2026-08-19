// ============================================
// ADB UI - Main Application
// ============================================

let currentApps = [...mockApps];
let currentSort = { field: "name", direction: "asc" };
let activeDevice = mockDevice;
let isRecording = false;
let selectedApps = new Set();

// ============================================
// Initialization
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  initStatusBar();
  initSidebar();
  initAppList();
  initSearch();
  initToolbar();
  initPanelOverlay();
  initModalOverlay();
});

// ============================================
// Status Bar
// ============================================

function initStatusBar() {
  const el = document.getElementById("status-bar");
  if (el) {
    el.innerHTML = renderStatusBar(activeDevice);
    initDeviceSelector();
  }
}

function initDeviceSelector() {
  const toggle = document.getElementById("device-selector-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    let selector = document.getElementById("device-selector");
    if (selector) {
      selector.remove();
      return;
    }
    selector = document.createElement("div");
    selector.innerHTML = renderDeviceSelector();
    toggle.appendChild(selector.querySelector(".device-selector"));

    document.querySelectorAll(".device-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const deviceId = item.dataset.deviceId;
        const device = mockDevices.find((d) => d.id === deviceId);
        if (device && device.status === "connected") {
          activeDevice = device;
          initStatusBar();
          Toast.show(`已切换到 ${device.name}`, "success", "设备切换");
        } else if (device) {
          Toast.show(`${device.name} 当前离线`, "warning", "设备离线");
        }
        const sel = document.getElementById("device-selector");
        if (sel) sel.remove();
      });
    });

    document.getElementById("btn-connect-tcpip")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openTcpipModal();
    });
  });

  document.addEventListener("click", () => {
    const selector = document.getElementById("device-selector");
    if (selector) selector.remove();
  });
}

function openTcpipModal() {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <div style="padding: var(--space-2) 0">
      <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-4)">
        通过 Wi-Fi 无线连接 Android 设备。确保设备和电脑在同一网络下。
      </p>
      <div style="margin-bottom: var(--space-4)">
        <label style="font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); color: var(--color-text-secondary); display: block; margin-bottom: var(--space-2)">设备 IP 地址</label>
        <input type="text" class="input-field" id="tcpip-address" placeholder="例如: 192.168.1.100" style="padding-left: var(--space-3)">
      </div>
      <div style="margin-bottom: var(--space-4)">
        <label style="font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); color: var(--color-text-secondary); display: block; margin-bottom: var(--space-2)">端口 (默认 5555)</label>
        <input type="text" class="input-field" id="tcpip-port" value="5555" style="padding-left: var(--space-3)">
      </div>
      <div style="background: var(--color-bg-hover); padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--font-size-xs); color: var(--color-text-secondary)">
        <strong>提示:</strong> 先在设备上执行 <code>adb tcpip 5555</code> 开启网络调试模式
      </div>
    </div>
  `;

  const footer = document.getElementById("modal-footer");
  footer.innerHTML = `
    <button class="btn btn-secondary" id="modal-cancel">取消</button>
    <button class="btn btn-primary" id="modal-confirm">连接</button>
  `;

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm").addEventListener("click", () => {
    const ip = document.getElementById("tcpip-address").value;
    const port = document.getElementById("tcpip-port").value;
    if (ip) {
      Toast.show(`正在连接 ${ip}:${port}...`, "info", "无线连接");
      setTimeout(() => {
        Toast.show(`成功连接到 ${ip}:${port}`, "success", "连接成功");
        closeModal();
      }, 1500);
    }
  });

  overlay.classList.add("open");
}

// ============================================
// Sidebar Navigation
// ============================================

function initSidebar() {
  const navItems = document.querySelectorAll(".sidebar-item[data-view]");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      const view = item.dataset.view;
      switchView(view);
    });
  });
}

function switchView(view) {
  const titleEl = document.getElementById("page-title");
  const subtitleEl = document.getElementById("page-subtitle");

  const views = {
    apps: { title: "应用管理", subtitle: "查看和管理设备上安装的应用" },
    files: { title: "文件管理", subtitle: "浏览设备文件系统" },
    logs: { title: "日志查看", subtitle: "实时查看设备日志输出" },
    shell: { title: "Shell 终端", subtitle: "执行 ADB Shell 命令" },
    screenshots: { title: "截图录屏", subtitle: "截取屏幕或录制视频" },
    perf: { title: "性能监控", subtitle: "实时监控设备性能指标" },
    history: { title: "命令历史", subtitle: "查看已执行的 ADB 命令记录" },
    tasks: { title: "任务中心", subtitle: "查看和管理异步任务" },
    "device-info": { title: "设备信息", subtitle: "查看设备详细信息和系统属性" },
    display: { title: "显示调节", subtitle: "分辨率 / DPI / 过扫描 / 系统参数调节" },
    battery: { title: "电池模拟", subtitle: "模拟电量 / 温度 / 充电状态" },
    "device-control": { title: "设备控制", subtitle: "重启模式与按键输入模拟" },
    scripts: { title: "自动化脚本", subtitle: "录制 / 编辑 / 执行自动化脚本" },
    "command-lib": { title: "常用命令库", subtitle: "高频 ADB 指令一键执行" },
    settings: { title: "设置", subtitle: "配置 ADB UI 工具选项" }
  };

  const viewInfo = views[view] || views.apps;
  titleEl.textContent = viewInfo.title;
  subtitleEl.textContent = viewInfo.subtitle;

  const contentBody = document.getElementById("content-body");

  switch (view) {
    case "apps":
      initAppList();
      break;
    case "shell":
      contentBody.innerHTML = renderShellTerminal();
      initTerminal();
      break;
    case "logs":
      contentBody.innerHTML = renderLogcatViewer();
      initLogcat();
      break;
    case "files":
      contentBody.innerHTML = renderFileManager();
      initFileManager();
      break;
    case "screenshots":
      contentBody.innerHTML = renderScreenshotTool();
      initScreenshotTool();
      break;
    case "perf":
      contentBody.innerHTML = renderPerformanceMonitor();
      break;
    case "history":
      contentBody.innerHTML = renderCommandHistory();
      break;
    case "tasks":
      contentBody.innerHTML = renderTaskCenter();
      initTaskCenter();
      break;
    case "device-info":
      contentBody.innerHTML = renderDeviceInfo();
      initDeviceInfo();
      break;
    case "display":
      contentBody.innerHTML = renderDisplaySettings();
      initDisplaySettings();
      break;
    case "battery":
      contentBody.innerHTML = renderBatterySimulator();
      initBatterySimulator();
      break;
    case "device-control":
      contentBody.innerHTML = renderDeviceControl();
      initDeviceControl();
      break;
    case "scripts":
      contentBody.innerHTML = renderScriptAutomation();
      initScriptAutomation();
      break;
    case "command-lib":
      contentBody.innerHTML = renderCommandLibrary();
      initCommandLibrary();
      break;
    case "settings":
      contentBody.innerHTML = renderSettings();
      initSettings();
      break;
    default:
      contentBody.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          <div class="empty-state-title">${viewInfo.title}</div>
          <div class="empty-state-desc">该功能模块正在开发中，敬请期待</div>
        </div>
      `;
  }
}

// ============================================
// App List
// ============================================

function initAppList() {
  const container = document.getElementById("content-body");
  container.innerHTML = `
    <div id="app-list-container" style="height: 100%; display: flex; flex-direction: column;">
      <div id="batch-action-bar" class="batch-action-bar" style="display: none;">
        <div class="batch-action-info">
          <span>已选择 <span class="batch-action-count" id="selected-count">0</span> 个应用</span>
        </div>
        <div class="batch-action-buttons">
          <button class="btn btn-sm btn-secondary" id="batch-freeze">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"/></svg>
            冻结
          </button>
          <button class="btn btn-sm btn-secondary" id="batch-stop">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"/></svg>
            强制停止
          </button>
          <button class="btn btn-sm btn-secondary" id="batch-clear-data">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            清除数据
          </button>
          <button class="btn btn-sm btn-danger" id="batch-uninstall">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            卸载
          </button>
        </div>
      </div>
      <div class="table-container" style="flex: 1; overflow: auto;">
        <table class="data-table" style="height: 100%">
          <thead>
            <tr>
              <th style="width: 40px; padding-right: 0">
                <input type="checkbox" id="select-all-apps" style="cursor: pointer">
              </th>
              <th class="sortable" data-sort="name">
                应用
                <svg class="sort-icon" width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              </th>
              <th style="width: 200px">包名</th>
              <th style="width: 110px" class="sortable" data-sort="version">
                版本
                <svg class="sort-icon" width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              </th>
              <th style="width: 90px" class="sortable" data-sort="size">
                大小
                <svg class="sort-icon" width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              </th>
              <th style="width: 100px">类型</th>
              <th style="width: 140px; text-align: right">操作</th>
            </tr>
          </thead>
          <tbody id="app-list-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  renderAppTable(currentApps);
  initSortHeaders();
  initSelectAll();
  initBatchActions();
}

function renderAppTable(apps) {
  const tbody = document.getElementById("app-list-tbody");
  if (!tbody) return;

  if (apps.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state" style="padding: var(--space-10)">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <div class="empty-state-title">未找到应用</div>
            <div class="empty-state-desc">尝试调整搜索关键词或刷新列表</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = apps.map((app) => renderAppRow(app)).join("");
  attachAppRowEvents(tbody.closest(".table-container"), apps);
}

// ============================================
// Sorting
// ============================================

function initSortHeaders() {
  document.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
      } else {
        currentSort.field = field;
        currentSort.direction = "asc";
      }
      sortApps();
      updateSortIcons();
    });
  });
}

function sortApps() {
  const { field, direction } = currentSort;
  currentApps.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    if (typeof valA === "string") {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });
  renderAppTable(currentApps);
}

function updateSortIcons() {
  document.querySelectorAll("th.sortable").forEach((th) => {
    th.classList.remove("sorted");
    const icon = th.querySelector(".sort-icon");
    if (icon) {
      icon.innerHTML = `<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>`;
    }
  });

  const activeTh = document.querySelector(`th[data-sort="${currentSort.field}"]`);
  if (activeTh) {
    activeTh.classList.add("sorted");
    const icon = activeTh.querySelector(".sort-icon");
    if (icon) {
      const path = currentSort.direction === "asc"
        ? `<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>`
        : `<path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"/>`;
      icon.innerHTML = path;
    }
  }
}

// ============================================
// Search
// ============================================

function initSearch() {
  const searchInput = document.getElementById("app-search");
  if (!searchInput) return;

  const doSearch = debounce((query) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      currentApps = [...mockApps];
    } else {
      currentApps = mockApps.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          app.packageName.toLowerCase().includes(q)
      );
    }
    sortApps();
  }, 200);

  searchInput.addEventListener("input", (e) => {
    doSearch(e.target.value);
  });
}

// ============================================
// Toolbar
// ============================================

function initToolbar() {
  const refreshBtn = document.getElementById("btn-refresh");
  const installBtn = document.getElementById("btn-install");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshBtn.style.pointerEvents = "none";
      refreshBtn.style.opacity = "0.6";
      Toast.show("正在刷新应用列表...", "info", "刷新");
      setTimeout(() => {
        currentApps = [...mockApps];
        sortApps();
        refreshBtn.style.pointerEvents = "";
        refreshBtn.style.opacity = "";
        Toast.show("应用列表已刷新", "success", "完成");
      }, 800);
    });
  }

  if (installBtn) {
    installBtn.addEventListener("click", () => {
      openInstallModal();
    });
  }
}

// ============================================
// Select All Checkbox
// ============================================

function initSelectAll() {
  const selectAll = document.getElementById("select-all-apps");
  if (!selectAll) return;

  selectAll.addEventListener("change", (e) => {
    document.querySelectorAll(".app-checkbox").forEach((cb) => {
      cb.checked = e.target.checked;
      const appId = cb.dataset.appId;
      if (e.target.checked) {
        selectedApps.add(appId);
      } else {
        selectedApps.delete(appId);
      }
    });
    updateBatchActionBar();
  });
}

// ============================================
// Batch Actions
// ============================================

function initBatchActions() {
  // 监听单个复选框变化
  document.querySelectorAll(".app-checkbox").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const appId = e.target.dataset.appId;
      if (e.target.checked) {
        selectedApps.add(appId);
      } else {
        selectedApps.delete(appId);
      }
      updateBatchActionBar();
    });
  });

  // 批量操作按钮
  document.getElementById("batch-freeze")?.addEventListener("click", () => {
    if (selectedApps.size === 0) return;
    Toast.show(`正在冻结 ${selectedApps.size} 个应用...`, "info", "批量冻结");
    setTimeout(() => {
      Toast.show(`已冻结 ${selectedApps.size} 个应用`, "success", "批量冻结完成");
      selectedApps.clear();
      updateBatchActionBar();
      initAppList();
    }, 1500);
  });

  document.getElementById("batch-stop")?.addEventListener("click", () => {
    if (selectedApps.size === 0) return;
    Toast.show(`正在强制停止 ${selectedApps.size} 个应用...`, "info", "批量强制停止");
    setTimeout(() => {
      Toast.show(`已强制停止 ${selectedApps.size} 个应用`, "success", "批量强制停止完成");
      selectedApps.clear();
      updateBatchActionBar();
      initAppList();
    }, 1500);
  });

  document.getElementById("batch-clear-data")?.addEventListener("click", () => {
    if (selectedApps.size === 0) return;
    openBatchClearDataModal();
  });

  document.getElementById("batch-uninstall")?.addEventListener("click", () => {
    if (selectedApps.size === 0) return;
    openBatchUninstallModal();
  });
}

function updateBatchActionBar() {
  const bar = document.getElementById("batch-action-bar");
  const count = document.getElementById("selected-count");
  if (!bar || !count) return;

  count.textContent = selectedApps.size;
  bar.style.display = selectedApps.size > 0 ? "flex" : "none";
}

function openBatchUninstallModal() {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");
  const selectedAppsList = Array.from(selectedApps).map(id => 
    mockApps.find(app => app.id === id)
  ).filter(Boolean);

  body.innerHTML = `
    <div style="text-align: center; padding: var(--space-4) 0">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-danger-bg); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4)">
        <svg width="28" height="28" viewBox="0 0 20 20" fill="var(--color-danger)"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </div>
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin-bottom: var(--space-2)">批量卸载确认</h3>
      <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">您确定要卸载选中的 <strong>${selectedApps.size}</strong> 个应用吗？</p>
      <div style="margin-top: var(--space-4); max-height: 200px; overflow-y: auto; text-align: left; background: var(--color-bg-hover); padding: var(--space-3); border-radius: var(--radius-md)">
        ${selectedAppsList.map(app => `
          <div style="padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light); font-size: var(--font-size-sm)">
            <div style="font-weight: var(--font-weight-medium); color: var(--color-text-primary)">${escapeHtml(app.name)}</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); font-family: var(--font-family-mono)">${escapeHtml(app.packageName)}</div>
          </div>
        `).join("")}
      </div>
      <div style="margin-top: var(--space-4); text-align: left">
        <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-primary); cursor: pointer">
          <input type="checkbox" id="keep-data-checkbox" style="cursor: pointer">
          <span>保留应用数据 (-k)</span>
        </label>
      </div>
      <p style="color: var(--color-danger); font-size: var(--font-size-xs); margin-top: var(--space-3)">此操作不可撤销，请谨慎操作。</p>
    </div>
  `;

  const footer = document.getElementById("modal-footer");
  footer.innerHTML = `
    <button class="btn btn-secondary" id="modal-cancel">取消</button>
    <button class="btn btn-danger" id="modal-confirm">确认卸载</button>
  `;

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm").addEventListener("click", () => {
    const keepData = document.getElementById("keep-data-checkbox").checked;
    Toast.show(`正在批量卸载 ${selectedApps.size} 个应用...`, "info", "批量卸载");
    closeModal();
    setTimeout(() => {
      Toast.show(`已成功卸载 ${selectedApps.size} 个应用${keepData ? "（保留数据）" : ""}`, "success", "批量卸载完成");
      selectedApps.clear();
      updateBatchActionBar();
      initAppList();
    }, 2000);
  });

  overlay.classList.add("open");
}

function openBatchClearDataModal() {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <div style="text-align: center; padding: var(--space-4) 0">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-warning-bg); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4)">
        <svg width="28" height="28" viewBox="0 0 20 20" fill="var(--color-warning)"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </div>
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin-bottom: var(--space-2)">批量清除数据确认</h3>
      <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">您确定要清除选中的 <strong>${selectedApps.size}</strong> 个应用的所有数据吗？</p>
      <p style="color: var(--color-danger); font-size: var(--font-size-xs); margin-top: var(--space-3)">此操作将删除应用的所有数据，包括登录状态、设置和文件，且不可撤销。</p>
    </div>
  `;

  const footer = document.getElementById("modal-footer");
  footer.innerHTML = `
    <button class="btn btn-secondary" id="modal-cancel">取消</button>
    <button class="btn btn-danger" id="modal-confirm">确认清除</button>
  `;

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm").addEventListener("click", () => {
    Toast.show(`正在清除 ${selectedApps.size} 个应用的数据...`, "info", "批量清除数据");
    closeModal();
    setTimeout(() => {
      Toast.show(`已清除 ${selectedApps.size} 个应用的数据`, "success", "批量清除完成");
      selectedApps.clear();
      updateBatchActionBar();
      initAppList();
    }, 2000);
  });

  overlay.classList.add("open");
}

// ============================================
// Terminal
// ============================================

function initTerminal() {
  const input = document.getElementById("terminal-input");
  if (!input) return;

  input.focus();
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const command = input.value.trim();
      if (!command) return;

      appendTerminalOutput(`$ ${command}`, "command");
      input.value = "";

      // Simulate command execution
      setTimeout(() => {
        const responses = {
          help: "Available commands:\n  devices    - List connected devices\n  shell      - Open interactive shell\n  install    - Install APK\n  uninstall  - Uninstall package\n  logcat     - View device logs\n  push/pull  - Transfer files\n  reboot     - Reboot device",
          "adb devices": "List of devices attached\nemulator-5554\tdevice\n192.168.1.110:5555\tdevice",
          "adb shell": "shell@pixel8pro:/ $",
          "adb reboot": "Rebooting device...",
          ls: "acct\nboot\ncache\ndata\ndev\netc\ninit.rc\nproc\nsdcard\nsystem\nvendor",
          pwd: "/",
          whoami: "shell"
        };

        const response = responses[command] || `Command executed: ${command}\n(模拟输出)`;
        appendTerminalOutput(response, "output");
      }, 300);
    }
  });
}

// ============================================
// Logcat
// ============================================

function initLogcat() {
  const output = document.getElementById("logcat-output");
  const pauseBtn = document.getElementById("logcat-pause");
  const clearBtn = document.getElementById("logcat-clear");
  const exportBtn = document.getElementById("logcat-export");
  const levelFilter = document.getElementById("logcat-level");
  const tagFilter = document.getElementById("logcat-tag-filter");
  const pidFilter = document.getElementById("logcat-pid-filter");

  let isPaused = false;

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      isPaused = !isPaused;
      pauseBtn.innerHTML = isPaused
        ? `<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`;
      Toast.show(isPaused ? "日志接收已暂停" : "日志接收已恢复", "info", "Logcat");
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (output) output.innerHTML = "";
      document.getElementById("logcat-count").textContent = "0 条日志";
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      Toast.show("日志已导出到 logcat_20241222.txt", "success", "导出日志");
    });
  }

  function applyFilters() {
    const level = levelFilter?.value || "I";
    const tag = tagFilter?.value?.toLowerCase() || "";
    const pid = pidFilter?.value || "";

    const levels = { V: 0, D: 1, I: 2, W: 3, E: 4 };
    const minLevel = levels[level] || 2;

    document.querySelectorAll(".logcat-line").forEach((line) => {
      const lineLevel = levels[line.dataset.level] || 0;
      const lineTag = line.dataset.tag?.toLowerCase() || "";
      const linePid = line.dataset.pid || "";

      const levelMatch = lineLevel >= minLevel;
      const tagMatch = !tag || lineTag.includes(tag);
      const pidMatch = !pid || linePid === pid;

      line.style.display = levelMatch && tagMatch && pidMatch ? "" : "none";
    });
  }

  levelFilter?.addEventListener("change", applyFilters);
  tagFilter?.addEventListener("input", debounce(applyFilters, 200));
  pidFilter?.addEventListener("input", debounce(applyFilters, 200));
}

// ============================================
// File Manager
// ============================================

function initFileManager() {
  document.querySelectorAll(".file-row.file-dir").forEach((row) => {
    row.addEventListener("dblclick", () => {
      const name = row.dataset.name;
      if (name === "sdcard" || currentPath === "/") {
        currentPath = "/sdcard";
      } else {
        currentPath = currentPath === "/sdcard" ? `/sdcard/${name}` : `/${name}`;
      }
      switchView("files");
    });
  });

  document.getElementById("file-nav-up")?.addEventListener("click", () => {
    if (currentPath !== "/") {
      currentPath = "/";
      switchView("files");
    }
  });

  document.querySelectorAll(".file-action-pull").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = btn.closest(".file-row");
      const fileName = row?.dataset.name || "unknown";
      simulateFileTransfer(fileName, "pull");
    });
  });

  document.querySelectorAll(".file-action-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      Toast.show("文件已删除", "warning", "删除文件");
    });
  });

  document.getElementById("file-push")?.addEventListener("click", () => {
    openFilePushModal();
  });

  document.getElementById("file-mkdir")?.addEventListener("click", () => {
    Toast.show("新建文件夹功能", "info", "文件管理");
  });

  // 拖拽上传
  initFileDropZone();
}

function initFileDropZone() {
  const dropZone = document.getElementById("file-drop-zone");
  const dropZoneContent = document.getElementById("drop-zone-content");
  if (!dropZone) return;

  let dragCounter = 0;

  dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    if (dragCounter === 1) {
      dropZone.classList.add("drag-active");
      if (dropZoneContent) dropZoneContent.style.display = "flex";
    }
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
      dropZone.classList.remove("drag-active");
      if (dropZoneContent) dropZoneContent.style.display = "none";
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    dropZone.classList.remove("drag-active");
    if (dropZoneContent) dropZoneContent.style.display = "none";

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileDrop(files);
    }
  });
}

function handleFileDrop(files) {
  const fileNames = files.map(f => f.name).join(", ");
  Toast.show(`准备上传 ${files.length} 个文件: ${fileNames}`, "info", "文件上传");
  
  // 模拟上传第一个文件
  if (files.length > 0) {
    simulateFileTransfer(files[0].name, "push");
  }
}

function simulateFileTransfer(fileName, direction) {
  const progressContainer = document.getElementById("file-transfer-progress");
  const progressBar = document.getElementById("transfer-progress-bar");
  const transferName = document.getElementById("transfer-name");
  const transferSpeed = document.getElementById("transfer-speed");
  const transferStatus = document.getElementById("transfer-status");

  if (!progressContainer || !progressBar || !transferName || !transferSpeed || !transferStatus) return;

  progressContainer.style.display = "block";
  transferName.textContent = fileName;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 100) progress = 100;

    progressBar.style.width = `${progress}%`;
    transferSpeed.textContent = `${(Math.random() * 3 + 1).toFixed(1)} MB/s`;
    transferStatus.textContent = `正在${direction === "push" ? "上传" : "下载"}... ${Math.round(progress)}%`;

    if (progress >= 100) {
      clearInterval(interval);
      transferStatus.textContent = "传输完成";
      setTimeout(() => {
        progressContainer.style.display = "none";
        Toast.show(`${fileName} ${direction === "push" ? "上传" : "下载"}完成`, "success", "文件传输");
      }, 1000);
    }
  }, 200);
}

function openFilePushModal() {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <div style="padding: var(--space-2) 0">
      <div class="drop-zone" style="margin-bottom: var(--space-4);">
        <svg class="drop-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <div class="drop-zone-text">拖拽文件到此处</div>
        <div class="drop-zone-hint">或点击浏览文件</div>
      </div>
      <div class="form-group">
        <label class="form-label">目标路径</label>
        <input type="text" class="form-control" id="push-target-path" value="${escapeHtml(currentPath)}" placeholder="/sdcard/">
        <p class="form-hint">文件将上传到设备的此路径</p>
      </div>
    </div>
  `;

  const footer = document.getElementById("modal-footer");
  footer.innerHTML = `
    <button class="btn btn-secondary" id="modal-cancel">取消</button>
    <button class="btn btn-primary" id="modal-confirm">选择文件</button>
  `;

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm").addEventListener("click", () => {
    Toast.show("请选择要上传的文件", "info", "Push 文件");
    closeModal();
  });

  overlay.classList.add("open");
}

// ============================================
// Screenshot Tool
// ============================================

function initScreenshotTool() {
  const screenshotBtn = document.getElementById("btn-screenshot");
  const recordBtn = document.getElementById("btn-screenrecord");
  const preview = document.getElementById("screenshot-preview");

  if (screenshotBtn) {
    screenshotBtn.addEventListener("click", () => {
      screenshotBtn.disabled = true;
      screenshotBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/></svg> 截图中...`;
      Toast.show("正在截取屏幕...", "info", "截图");

      setTimeout(() => {
        preview.innerHTML = `
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 100%; height: 100%; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: white; font-size: var(--font-size-2xl); font-weight: bold">
            Screenshot
          </div>
        `;
        screenshotBtn.disabled = false;
        screenshotBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/></svg> 截图`;
        Toast.show("截图已保存到 /sdcard/screenshot_001.png", "success", "截图完成");
      }, 1200);
    });
  }

  if (recordBtn) {
    recordBtn.addEventListener("click", () => {
      isRecording = !isRecording;
      const btnText = document.getElementById("record-btn-text");
      if (isRecording) {
        recordBtn.classList.add("btn-danger");
        recordBtn.classList.remove("btn-secondary");
        btnText.textContent = "停止录屏";
        Toast.show("开始录屏...", "info", "录屏");
      } else {
        recordBtn.classList.remove("btn-danger");
        recordBtn.classList.add("btn-secondary");
        btnText.textContent = "开始录屏";
        Toast.show("录屏已保存到 /sdcard/screenrecord_001.mp4", "success", "录屏完成");
      }
    });
  }
}

// ============================================
// Overlays
// ============================================

function initPanelOverlay() {
  const overlay = document.getElementById("detail-panel-overlay");
  if (overlay) {
    overlay.addEventListener("click", closeDetailPanel);
  }
}

function initModalOverlay() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }
}

// ============================================
// Settings
// ============================================

function loadSettings() {
  const saved = localStorage.getItem("adb-ui-settings");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse settings:", e);
    }
  }
  return JSON.parse(JSON.stringify(mockSettings));
}

function saveSettings(settings) {
  localStorage.setItem("adb-ui-settings", JSON.stringify(settings));
}

function initSettings() {
  // 保存设置
  document.getElementById("save-settings")?.addEventListener("click", () => {
    const settings = {
      adb: {
        adbPath: document.getElementById("setting-adb-path").value,
        defaultPort: parseInt(document.getElementById("setting-adb-port").value) || 5555,
        connectTimeout: parseInt(document.getElementById("setting-adb-timeout").value) || 10
      },
      ui: {
        theme: document.getElementById("setting-ui-theme").value,
        language: document.getElementById("setting-ui-language").value,
        defaultView: document.getElementById("setting-ui-default-view").value
      },
      advanced: {
        logLevel: document.getElementById("setting-advanced-log-level").value,
        autoRefreshInterval: parseInt(document.getElementById("setting-advanced-refresh-interval").value) || 5,
        confirmDangerousOps: document.getElementById("setting-advanced-confirm-ops").checked
      }
    };

    saveSettings(settings);
    Toast.show("设置已保存", "success", "设置");
  });

  // 重置设置
  document.getElementById("reset-settings")?.addEventListener("click", () => {
    openResetSettingsModal();
  });
}

function openResetSettingsModal() {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <div style="text-align: center; padding: var(--space-4) 0">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-warning-bg); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4)">
        <svg width="28" height="28" viewBox="0 0 20 20" fill="var(--color-warning)"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </div>
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin-bottom: var(--space-2)">重置设置确认</h3>
      <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">您确定要将所有设置重置为默认值吗？</p>
      <p style="color: var(--color-text-tertiary); font-size: var(--font-size-xs); margin-top: var(--space-3)">此操作不可撤销，您的自定义配置将丢失。</p>
    </div>
  `;

  const footer = document.getElementById("modal-footer");
  footer.innerHTML = `
    <button class="btn btn-secondary" id="modal-cancel">取消</button>
    <button class="btn btn-danger" id="modal-confirm">确认重置</button>
  `;

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm").addEventListener("click", () => {
    localStorage.removeItem("adb-ui-settings");
    Toast.show("设置已重置为默认值", "success", "设置");
    closeModal();
    switchView("settings");
  });

  overlay.classList.add("open");
}

// ============================================
// Device Info
// ============================================

function initDeviceInfo() {
  // 复制设备信息
  document.getElementById("copy-device-info")?.addEventListener("click", () => {
    const { basic, hardware, battery, network } = mockDeviceDetails;
    const infoText = `
设备信息报告
============

基本信息
--------
设备型号: ${basic.model}
制造商: ${basic.manufacturer}
品牌: ${basic.brand}
设备代号: ${basic.device}
序列号: ${basic.serialNumber}
Android 版本: ${basic.androidVersion} (API ${basic.apiLevel})
版本号: ${basic.buildNumber}
安全补丁: ${basic.securityPatch}

硬件信息
--------
处理器: ${hardware.cpu}
CPU 核心数: ${hardware.cpuCores} 核
CPU 架构: ${hardware.cpuArch}
GPU: ${hardware.gpu}
运行内存: ${hardware.ram}
存储空间: ${hardware.storage} (可用: ${hardware.storageAvailable})
屏幕分辨率: ${hardware.screenResolution}
屏幕密度: ${hardware.screenDensity}
屏幕尺寸: ${hardware.screenSize}

电池信息
--------
电量: ${battery.level}%
健康状态: ${battery.health}
温度: ${battery.temperature}°C
电压: ${battery.voltage} mV
电池技术: ${battery.technology}
充电方式: ${battery.chargingType}
充电循环次数: ${battery.cycleCount} 次

网络信息
--------
IP 地址: ${network.ipAddress}
MAC 地址: ${network.macAddress}
WiFi 名称: ${network.wifiSsid}
WiFi 信号: ${network.wifiSignal}
移动数据: ${network.mobileData}
运营商: ${network.operator}
    `.trim();

    copyToClipboard(infoText);
  });

  // 导出设备信息报告
  document.getElementById("export-device-info")?.addEventListener("click", () => {
    Toast.show("设备信息报告已导出到 device_info_20241222.txt", "success", "导出报告");
  });
}

// ============================================
// Task Center
// ============================================

function initTaskCenter() {
  // 清除已完成任务
  document.getElementById("clear-completed-tasks")?.addEventListener("click", () => {
    const completedCount = mockTasks.filter(t => t.status === "completed").length;
    if (completedCount === 0) {
      Toast.show("没有已完成的任务", "info", "任务中心");
      return;
    }
    
    // 从数组中移除已完成的任务
    for (let i = mockTasks.length - 1; i >= 0; i--) {
      if (mockTasks[i].status === "completed") {
        mockTasks.splice(i, 1);
      }
    }
    
    Toast.show(`已清除 ${completedCount} 个已完成任务`, "success", "任务中心");
    switchView("tasks");
  });

  // 取消任务
  document.querySelectorAll(".task-cancel-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.taskId;
      const task = mockTasks.find(t => t.id === taskId);
      if (task) {
        task.status = "cancelled";
        Toast.show(`任务 "${task.name}" 已取消`, "warning", "任务中心");
        switchView("tasks");
      }
    });
  });

  // 重试任务
  document.querySelectorAll(".task-retry-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.taskId;
      const task = mockTasks.find(t => t.id === taskId);
      if (task) {
        task.status = "running";
        task.progress = 0;
        task.success = 0;
        task.failed = 0;
        Toast.show(`正在重试任务 "${task.name}"...`, "info", "任务中心");
        switchView("tasks");
      }
    });
  });

  // 展开/收起任务详情
  document.querySelectorAll(".task-detail-toggle").forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const taskId = toggle.dataset.taskId;
      const detailList = document.getElementById(`task-detail-${taskId}`);
      if (detailList) {
        const isVisible = detailList.style.display !== "none";
        detailList.style.display = isVisible ? "none" : "block";
        const btn = toggle.querySelector("button");
        if (btn) {
          btn.innerHTML = isVisible ? `
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            查看详情
          ` : `
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
            收起详情
          `;
        }
      }
    });
  });
}

// ============================================
// 1.8 常用命令库
// ============================================

function initCommandLibrary() {
  // 分类切换
  document.querySelectorAll(".cmdlib-cat").forEach((el) => {
    el.addEventListener("click", () => {
      const lib = loadCommandLibrary();
      lib.activeCategory = el.dataset.category;
      saveCommandLibrary(lib);
      document.querySelectorAll(".cmdlib-cat").forEach((c) => c.classList.remove("active"));
      el.classList.add("active");
      document.querySelector(".cmdlib-toolbar-title").textContent = lib.activeCategory;
      document.getElementById("cmdlib-list").innerHTML = renderCommandLibraryList(lib.activeCategory);
      bindCommandCardEvents();
    });
  });

  bindCommandCardEvents();

  // 自定义命令
  document.getElementById("cmdlib-add-custom")?.addEventListener("click", openCustomCommandModal);
}

function bindCommandCardEvents() {
  // 收藏切换
  document.querySelectorAll(".cmd-fav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.cmdKey;
      const lib = loadCommandLibrary();
      const idx = lib.favorites.indexOf(key);
      if (idx >= 0) {
        lib.favorites.splice(idx, 1);
        Toast.show("已取消收藏", "info", "命令库");
      } else {
        lib.favorites.push(key);
        Toast.show("已收藏", "success", "命令库");
      }
      saveCommandLibrary(lib);
      document.getElementById("cmdlib-list").innerHTML = renderCommandLibraryList(lib.activeCategory);
      bindCommandCardEvents();
    });
  });

  // 删除自定义命令
  document.querySelectorAll(".cmd-del-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.cmdKey;
      const lib = loadCommandLibrary();
      lib.custom = lib.custom.filter((c) => commandKey(c) !== key);
      lib.favorites = lib.favorites.filter((k) => k !== key);
      saveCommandLibrary(lib);
      Toast.show("已删除自定义命令", "warning", "命令库");
      document.getElementById("cmdlib-list").innerHTML = renderCommandLibraryList(lib.activeCategory);
      bindCommandCardEvents();
    });
  });

  // 执行命令
  document.querySelectorAll(".cmd-run-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.cmdKey;
      const cmd = findCommandByKey(key);
      if (!cmd) return;
      const outputEl = document.getElementById(`cmd-output-${key}`);
      btn.disabled = true;
      const result = await AdbEngine.execute(cmd.command);
      btn.disabled = false;

      // 写入命令历史
      mockCommandHistory.unshift({
        command: `adb ${cmd.command}`,
        timestamp: new Date().toISOString(),
        output: result.stdout || result.stderr || ""
      });

      if (outputEl) {
        outputEl.style.display = "block";
        outputEl.textContent = result.exitCode === 0
          ? (result.stdout || "(无输出)")
          : `执行失败(exit ${result.exitCode}): ${result.stderr}`;
        outputEl.classList.toggle("error", result.exitCode !== 0);
      }
      Toast.show(result.exitCode === 0 ? "命令执行成功" : "命令执行失败", result.exitCode === 0 ? "success" : "error", "命令库");
    });
  });
}

function findCommandByKey(key) {
  const all = [...flattenCommandLibrary(), ...loadCommandLibrary().custom.map((c) => ({ ...c, custom: true }))];
  return all.find((c) => commandKey(c) === key);
}

function openCustomCommandModal() {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <div style="padding: var(--space-2) 0">
      <div class="form-group">
        <label class="form-label">命令名称</label>
        <input type="text" class="form-control" id="custom-cmd-name" placeholder="如:查看当前 Activity">
      </div>
      <div class="form-group">
        <label class="form-label">ADB 命令</label>
        <input type="text" class="form-control" id="custom-cmd-command" placeholder="如:shell dumpsys activity activities | grep mResumedActivity" style="font-family: var(--font-family-mono)">
        <p class="form-hint">无需输入 adb 前缀</p>
      </div>
      <div class="form-group">
        <label class="form-label">分类</label>
        <select class="form-control" id="custom-cmd-category">
          ${mockCommandLibrary.map((g) => `<option value="${escapeHtml(g.category)}">${escapeHtml(g.category)}</option>`).join("")}
          <option value="自定义" selected>自定义</option>
        </select>
      </div>
    </div>
  `;

  const footer = document.getElementById("modal-footer");
  footer.innerHTML = `
    <button class="btn btn-secondary" id="modal-cancel">取消</button>
    <button class="btn btn-primary" id="modal-confirm">添加</button>
  `;

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm").addEventListener("click", () => {
    const name = document.getElementById("custom-cmd-name").value.trim();
    const command = document.getElementById("custom-cmd-command").value.trim();
    const category = document.getElementById("custom-cmd-category").value;
    if (!name || !command) {
      Toast.show("请填写命令名称和命令", "warning", "命令库");
      return;
    }
    const lib = loadCommandLibrary();
    lib.custom.push({ name, command, category });
    lib.activeCategory = "自定义";
    saveCommandLibrary(lib);
    closeModal();
    Toast.show("已添加自定义命令", "success", "命令库");
    switchView("command-lib");
  });

  overlay.classList.add("open");
}

// ============================================
// 1.1+1.2+1.3 显示调节
// ============================================

function initDisplaySettings() {
  // ---------- 分辨率 ----------
  document.querySelectorAll("#size-presets .preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyDisplayValue("size", btn.dataset.size, `shell wm size ${btn.dataset.size}`, "shell wm size reset"));
  });

  document.getElementById("apply-size")?.addEventListener("click", () => {
    const val = document.getElementById("custom-size").value.trim();
    if (!/^\d+x\d+$/.test(val)) {
      Toast.show("分辨率格式不正确,应为 宽x高(如 1080x2400)", "warning", "显示调节");
      return;
    }
    applyDisplayValue("size", val, `shell wm size ${val}`, "shell wm size reset");
  });

  document.getElementById("reset-size")?.addEventListener("click", async () => {
    await AdbEngine.execute("shell wm size reset");
    refreshDisplayCurrent();
    Toast.show("已恢复默认分辨率", "success", "显示调节");
  });

  // ---------- 密度 ----------
  document.querySelectorAll("#density-presets .preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyDisplayValue("density", btn.dataset.density, `shell wm density ${btn.dataset.density}`, "shell wm density reset"));
  });

  document.getElementById("apply-density")?.addEventListener("click", () => {
    const val = document.getElementById("custom-density").value.trim();
    if (!/^\d+$/.test(val)) {
      Toast.show("密度应为整数(如 420)", "warning", "显示调节");
      return;
    }
    applyDisplayValue("density", val, `shell wm density ${val}`, "shell wm density reset");
  });

  document.getElementById("reset-density")?.addEventListener("click", async () => {
    await AdbEngine.execute("shell wm density reset");
    refreshDisplayCurrent();
    Toast.show("已恢复默认密度", "success", "显示调节");
  });

  // ---------- 过扫描 ----------
  ["left", "top", "right", "bottom"].forEach((side) => {
    const slider = document.getElementById(`overscan-${side}`);
    slider?.addEventListener("input", () => {
      document.getElementById(`overscan-val-${side}`).textContent = slider.value;
      updateOverscanPreview();
    });
  });
  updateOverscanPreview();

  document.getElementById("apply-overscan")?.addEventListener("click", async () => {
    const l = document.getElementById("overscan-left").value;
    const t = document.getElementById("overscan-top").value;
    const r = document.getElementById("overscan-right").value;
    const b = document.getElementById("overscan-bottom").value;
    const prev = { ...mockDisplayState.overscan };
    const result = await AdbEngine.execute(`shell wm overscan ${l},${t},${r},${b}`);
    if (result.exitCode !== 0) {
      mockDisplayState.overscan = prev;
      refreshDisplayCurrent();
      Toast.show("设置失败,已恢复原值(该设备可能不支持 overscan)", "error", "显示调节");
    } else {
      refreshDisplayCurrent();
      Toast.show("过扫描已应用", "success", "显示调节");
    }
  });

  document.getElementById("reset-overscan")?.addEventListener("click", async () => {
    await AdbEngine.execute("shell wm overscan reset");
    ["left", "top", "right", "bottom"].forEach((side) => {
      document.getElementById(`overscan-${side}`).value = 0;
      document.getElementById(`overscan-val-${side}`).textContent = "0";
    });
    updateOverscanPreview();
    refreshDisplayCurrent();
    Toast.show("过扫描已重置", "success", "显示调节");
  });

  // ---------- 动画速度 ----------
  document.querySelectorAll("#anim-presets .preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#anim-presets .preset-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("custom-anim").value = btn.dataset.anim;
      applyAnimationScale(parseFloat(btn.dataset.anim));
    });
  });

  document.getElementById("apply-anim")?.addEventListener("click", () => {
    const val = parseFloat(document.getElementById("custom-anim").value);
    if (isNaN(val) || val < 0 || val > 10) {
      Toast.show("动画速度应为 0 ~ 10 之间的数值", "warning", "显示调节");
      return;
    }
    applyAnimationScale(val);
  });

  // ---------- 字体大小 ----------
  const fontSlider = document.getElementById("font-scale");
  fontSlider?.addEventListener("input", () => {
    document.getElementById("font-scale-val").textContent = `${parseFloat(fontSlider.value).toFixed(2)}x`;
  });
  document.getElementById("apply-font")?.addEventListener("click", async () => {
    const val = parseFloat(fontSlider.value);
    const result = await AdbEngine.execute(`settings put system font_scale ${val}`);
    Toast.show(result.exitCode === 0 ? `字体大小已设置为 ${val.toFixed(2)}x` : "设置失败", result.exitCode === 0 ? "success" : "error", "显示调节");
  });

  // ---------- 锁屏时间 ----------
  document.getElementById("apply-lock")?.addEventListener("click", async () => {
    const val = parseInt(document.getElementById("lock-timeout").value, 10);
    if (isNaN(val) || val < 0) {
      Toast.show("锁屏时间应为非负整数毫秒", "warning", "显示调节");
      return;
    }
    const result = await AdbEngine.execute(`settings put secure lock_screen_lock_after_timeout ${val}`);
    Toast.show(result.exitCode === 0 ? `锁屏时间已设置为 ${val}ms` : "设置失败(部分设备需 adb 授权)", result.exitCode === 0 ? "success" : "error", "显示调节");
  });

  // ---------- 恢复默认(系统参数) ----------
  document.getElementById("reset-params")?.addEventListener("click", async () => {
    await applyAnimationScale(1.0, true);
    await AdbEngine.execute("settings put system font_scale 1.0");
    await AdbEngine.execute("settings put secure lock_screen_lock_after_timeout 5000");
    document.getElementById("font-scale").value = 1.0;
    document.getElementById("font-scale-val").textContent = "1.00x";
    document.getElementById("lock-timeout").value = 5000;
    Toast.show("系统参数已恢复默认", "success", "显示调节");
  });
}

async function applyDisplayValue(type, value, setCmd, resetCmd) {
  // 先缓存原值(读取命令),失败回滚
  const readCmd = type === "size" ? "shell wm size" : "shell wm density";
  const before = await AdbEngine.execute(readCmd);
  const result = await AdbEngine.execute(setCmd);
  if (result.exitCode !== 0) {
    await AdbEngine.execute(resetCmd);
    refreshDisplayCurrent();
    Toast.show("设置失败,已恢复原值", "error", "显示调节");
    return;
  }
  refreshDisplayCurrent();
  Toast.show(type === "size" ? `分辨率已设置为 ${value}` : `密度已设置为 ${value}dpi`, "success", "显示调节");
}

async function applyAnimationScale(value, silent) {
  await AdbEngine.execute(`settings put global window_animation_scale ${value}`);
  await AdbEngine.execute(`settings put global transition_animation_scale ${value}`);
  const result = await AdbEngine.execute(`settings put global animator_duration_scale ${value}`);
  if (!silent) {
    Toast.show(result.exitCode === 0 ? `动画速度已设置为 ${value}x` : "设置失败", result.exitCode === 0 ? "success" : "error", "显示调节");
  }
}

function refreshDisplayCurrent() {
  const s = mockDisplayState;
  const o = s.overscan;
  const sizeEl = document.getElementById("cur-size");
  const densityEl = document.getElementById("cur-density");
  const overscanEl = document.getElementById("cur-overscan");
  if (sizeEl) sizeEl.textContent = s.size.replace("x", " x ");
  if (densityEl) densityEl.textContent = `${s.density}dpi`;
  if (overscanEl) overscanEl.textContent = `${o.left},${o.top},${o.right},${o.bottom}`;
}

function updateOverscanPreview() {
  const screen = document.getElementById("overscan-screen");
  if (!screen) return;
  const l = parseInt(document.getElementById("overscan-left").value, 10) || 0;
  const t = parseInt(document.getElementById("overscan-top").value, 10) || 0;
  const r = parseInt(document.getElementById("overscan-right").value, 10) || 0;
  const b = parseInt(document.getElementById("overscan-bottom").value, 10) || 0;
  // 预览缩放:每 100px 过扫描映射为 8px 内边距
  const scale = 0.08;
  screen.style.padding = `${Math.max(0, t * scale)}px ${Math.max(0, r * scale)}px ${Math.max(0, b * scale)}px ${Math.max(0, l * scale)}px`;
}

// ============================================
// 1.4 电池模拟
// ============================================

function initBatterySimulator() {
  const toggle = document.getElementById("battery-sim-toggle");
  const levelSlider = document.getElementById("sim-level");
  const tempSlider = document.getElementById("sim-temp");
  const statusSelect = document.getElementById("sim-status");

  toggle?.addEventListener("change", async () => {
    if (toggle.checked) {
      await AdbEngine.execute("shell dumpsys battery unplug");
      mockBatteryState.simulated = { ...mockBatteryState.real };
      Toast.show("电池模拟已启用", "info", "电池模拟");
    } else {
      await AdbEngine.execute("shell dumpsys battery reset");
      mockBatteryState.simulated = null;
      Toast.show("电池模拟已停用", "info", "电池模拟");
    }
    switchView("battery");
  });

  levelSlider?.addEventListener("input", async () => {
    const val = parseInt(levelSlider.value, 10);
    document.getElementById("sim-level-val").textContent = `${val}%`;
    document.getElementById("battery-level").textContent = `${val}%`;
    await AdbEngine.execute(`shell dumpsys battery set level ${val}`);
  });

  tempSlider?.addEventListener("input", async () => {
    const val = parseFloat(tempSlider.value);
    document.getElementById("sim-temp-val").textContent = `${val.toFixed(1)}°C`;
    document.getElementById("battery-temp").textContent = `${val.toFixed(1)}°C`;
    await AdbEngine.execute(`shell dumpsys battery set temperature ${Math.round(val * 10)}`);
  });

  statusSelect?.addEventListener("change", async () => {
    const val = parseInt(statusSelect.value, 10);
    const statusMap = { 2: "充电中", 3: "未充电", 4: "不充电", 5: "已充满" };
    document.getElementById("battery-status").textContent = statusMap[val] || "未知";
    await AdbEngine.execute(`shell dumpsys battery set status ${val}`);
  });

  document.getElementById("battery-reset")?.addEventListener("click", openBatteryResetModal);
}

function openBatteryResetModal() {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <div style="text-align: center; padding: var(--space-4) 0">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-warning-bg); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4)">
        <svg width="28" height="28" viewBox="0 0 20 20" fill="var(--color-warning)"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </div>
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin-bottom: var(--space-2)">还原电池状态确认</h3>
      <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">您确定要还原设备的真实电池状态吗？</p>
      <p style="color: var(--color-text-tertiary); font-size: var(--font-size-xs); margin-top: var(--space-3)">将执行 dumpsys battery reset,清除所有模拟值。</p>
    </div>
  `;

  const footer = document.getElementById("modal-footer");
  footer.innerHTML = `
    <button class="btn btn-secondary" id="modal-cancel">取消</button>
    <button class="btn btn-danger" id="modal-confirm">确认还原</button>
  `;

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm").addEventListener("click", async () => {
    closeModal();
    await AdbEngine.execute("shell dumpsys battery reset");
    mockBatteryState.simulated = null;
    Toast.show("已还原真实电池状态", "success", "电池模拟");
    switchView("battery");
  });

  overlay.classList.add("open");
}

// ============================================
// 1.5+1.6 设备控制(重启模式 + 输入模拟)
// ============================================

function initDeviceControl() {
  // ---------- 重启模式 ----------
  document.querySelectorAll(".reboot-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = mockRebootModes.find((m) => m.id === btn.dataset.mode);
      if (mode) openRebootConfirmModal(mode);
    });
  });

  // ---------- 点击 / 长按 ----------
  const validateCoord = (x, y) => {
    const [w, h] = mockDisplayState.size.split("x").map(Number);
    if (isNaN(x) || isNaN(y)) {
      Toast.show("坐标必须为数字", "warning", "输入模拟");
      return false;
    }
    if (x < 0 || x > w || y < 0 || y > h) {
      Toast.show(`坐标超出范围(x: 0~${w}, y: 0~${h})`, "warning", "输入模拟");
      return false;
    }
    return true;
  };

  document.getElementById("btn-tap")?.addEventListener("click", async () => {
    const x = parseInt(document.getElementById("tap-x").value, 10);
    const y = parseInt(document.getElementById("tap-y").value, 10);
    if (!validateCoord(x, y)) return;
    const result = await AdbEngine.execute(`shell input tap ${x} ${y}`);
    recordScriptLine(`tap ${x} ${y}`);
    Toast.show(result.exitCode === 0 ? "已发送 input 指令" : "执行失败", result.exitCode === 0 ? "success" : "error", "输入模拟");
  });

  document.getElementById("btn-longpress")?.addEventListener("click", async () => {
    const x = parseInt(document.getElementById("tap-x").value, 10);
    const y = parseInt(document.getElementById("tap-y").value, 10);
    if (!validateCoord(x, y)) return;
    const result = await AdbEngine.execute(`shell input swipe ${x} ${y} ${x} ${y} 500`);
    recordScriptLine(`swipe ${x} ${y} ${x} ${y} 500`);
    Toast.show(result.exitCode === 0 ? "已发送长按指令" : "执行失败", result.exitCode === 0 ? "success" : "error", "输入模拟");
  });

  // ---------- 滑动 ----------
  document.getElementById("btn-swipe")?.addEventListener("click", async () => {
    const x1 = parseInt(document.getElementById("swipe-x1").value, 10);
    const y1 = parseInt(document.getElementById("swipe-y1").value, 10);
    const x2 = parseInt(document.getElementById("swipe-x2").value, 10);
    const y2 = parseInt(document.getElementById("swipe-y2").value, 10);
    const duration = parseInt(document.getElementById("swipe-duration").value, 10) || 300;
    if (!validateCoord(x1, y1) || !validateCoord(x2, y2)) return;
    const result = await AdbEngine.execute(`shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
    recordScriptLine(`swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
    Toast.show(result.exitCode === 0 ? "已发送滑动指令" : "执行失败", result.exitCode === 0 ? "success" : "error", "输入模拟");
  });

  // ---------- 物理按键 ----------
  document.querySelectorAll(".keycode-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const keycode = btn.dataset.keycode;
      const result = await AdbEngine.execute(`shell input keyevent ${keycode}`);
      recordScriptLine(`keyevent ${keycode}`);
      Toast.show(result.exitCode === 0 ? `已发送按键 ${btn.textContent}` : "执行失败", result.exitCode === 0 ? "success" : "error", "输入模拟");
    });
  });

  // ---------- 文本输入 ----------
  document.getElementById("btn-send-text")?.addEventListener("click", async () => {
    const text = document.getElementById("input-text").value;
    if (!text) {
      Toast.show("请输入文本", "warning", "输入模拟");
      return;
    }
    // eslint-disable-next-line no-control-regex
    if (/[^\x00-\x7F]/.test(text)) {
      Toast.show("input text 仅支持 ASCII 字符,中文需用 ADB Keyboard 等输入法", "warning", "输入模拟");
      return;
    }
    const escaped = text.replace(/ /g, "%s");
    const result = await AdbEngine.execute(`shell input text ${escaped}`);
    recordScriptLine(`text ${escaped}`);
    Toast.show(result.exitCode === 0 ? "已发送文本" : "执行失败", result.exitCode === 0 ? "success" : "error", "输入模拟");
  });
}

function openRebootConfirmModal(mode) {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <div style="text-align: center; padding: var(--space-4) 0">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: ${mode.danger ? "var(--color-danger-bg)" : "var(--color-warning-bg)"}; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4)">
        <svg width="28" height="28" viewBox="0 0 20 20" fill="${mode.danger ? "var(--color-danger)" : "var(--color-warning)"}"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </div>
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin-bottom: var(--space-2)">重启确认:${escapeHtml(mode.name)}</h3>
      <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">设备将立即重启到 <strong>${escapeHtml(mode.name)}</strong> 模式。</p>
      <p style="color: var(--color-danger); font-size: var(--font-size-xs); margin-top: var(--space-3)">当前连接会断开,正在进行的操作可能丢失。</p>
    </div>
  `;

  const footer = document.getElementById("modal-footer");
  footer.innerHTML = `
    <button class="btn btn-secondary" id="modal-cancel">取消</button>
    <button class="btn ${mode.danger ? "btn-danger" : "btn-primary"}" id="modal-confirm">确认重启</button>
  `;

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm").addEventListener("click", async () => {
    closeModal();
    const result = await AdbEngine.execute(mode.command);
    if (result.exitCode === 0) {
      Toast.show("重启指令已发送,设备离线后请稍候重新连接", "success", "重启模式");
      simulateDeviceReconnect();
    } else {
      Toast.show("重启指令发送失败", "error", "重启模式");
    }
  });

  overlay.classList.add("open");
}

// 模拟设备离线 → 自动恢复(验证状态栏联动)
function simulateDeviceReconnect() {
  const prevStatus = activeDevice.status;
  activeDevice.status = "offline";
  initStatusBar();
  setTimeout(() => {
    activeDevice.status = prevStatus;
    initStatusBar();
    Toast.show(`${activeDevice.name} 已重新连接`, "success", "设备状态");
  }, 2000);
}

// 录制模式:将输入模拟动作追加为脚本行(供 1.7 录制)
function recordScriptLine(line) {
  if (!window.__scriptRecording) return;
  window.__scriptRecordedLines = window.__scriptRecordedLines || [];
  window.__scriptRecordedLines.push(line);
}

// ============================================
// 1.7 自动化脚本
// ============================================

function initScriptAutomation() {
  const editor = document.getElementById("script-editor");
  const lineNumbers = document.getElementById("script-line-numbers");
  const runBtn = document.getElementById("script-run");
  const stopBtn = document.getElementById("script-stop");
  const statusEl = document.getElementById("script-status");
  const progressEl = document.getElementById("script-progress");

  // 应用录制缓冲的脚本行
  if (window.__scriptRecordedLines && window.__scriptRecordedLines.length > 0) {
    editor.value = window.__scriptRecordedLines.join("\n");
    window.__scriptRecordedLines = [];
  }

  const updateLineNumbers = () => {
    const count = editor.value.split("\n").length;
    lineNumbers.textContent = Array.from({ length: count }, (_, i) => i + 1).join("\n");
  };
  updateLineNumbers();
  editor.addEventListener("input", updateLineNumbers);
  editor.addEventListener("scroll", () => {
    lineNumbers.scrollTop = editor.scrollTop;
  });

  // 插入指令
  document.querySelectorAll(".script-cmd-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      insertAtCursor(editor, btn.dataset.insert + "\n");
      updateLineNumbers();
    });
  });

  // 示例模板
  document.querySelectorAll(".script-template-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tpl = mockScriptTemplates.find((t) => t.id === btn.dataset.template);
      if (tpl) {
        editor.value = tpl.content;
        updateLineNumbers();
        Toast.show(`已加载模板:${tpl.name}`, "info", "自动化脚本");
      }
    });
  });

  // 录制模式开关
  document.getElementById("script-record-toggle")?.addEventListener("change", (e) => {
    window.__scriptRecording = e.target.checked;
    if (e.target.checked) {
      window.__scriptRecordedLines = [];
      Toast.show("录制模式已开启,请到\"设备控制\"面板执行动作", "info", "自动化脚本");
    } else {
      Toast.show("录制模式已关闭", "info", "自动化脚本");
    }
  });

  // 导入
  document.getElementById("script-import")?.addEventListener("click", () => {
    document.getElementById("script-file-input").click();
  });
  document.getElementById("script-file-input")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.value = reader.result;
      updateLineNumbers();
      Toast.show(`已导入脚本:${file.name}`, "success", "自动化脚本");
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // 导出
  document.getElementById("script-export")?.addEventListener("click", () => {
    const blob = new Blob([editor.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.adbs";
    a.click();
    URL.revokeObjectURL(url);
    Toast.show("脚本已导出为 script.adbs", "success", "自动化脚本");
  });

  // 执行
  let stopFlag = false;
  runBtn?.addEventListener("click", async () => {
    const { lines, errors } = parseScriptLines(editor.value);
    if (errors.length > 0) {
      const first = errors[0];
      statusEl.textContent = `校验失败:第 ${first.line} 行 ${first.message}`;
      Toast.show(`第 ${first.line} 行:${first.message}`, "error", "脚本校验");
      return;
    }

    // 展开 loop(顺序执行计划)
    const plan = expandScriptPlan(lines);
    if (plan.length === 0) {
      statusEl.textContent = "无可执行指令";
      return;
    }

    stopFlag = false;
    runBtn.disabled = true;
    stopBtn.disabled = false;
    const startTime = Date.now();

    for (let i = 0; i < plan.length; i++) {
      if (stopFlag) {
        statusEl.textContent = "已停止";
        progressEl.textContent = "";
        runBtn.disabled = false;
        stopBtn.disabled = true;
        Toast.show("脚本执行已停止", "warning", "自动化脚本");
        return;
      }
      const step = plan[i];
      statusEl.textContent = `执行中:第 ${step.no} 行 ${step.raw.trim()}`;
      progressEl.textContent = `${i + 1} / ${plan.length}`;
      await executeScriptStep(step);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    statusEl.textContent = "执行完成";
    progressEl.textContent = "";
    runBtn.disabled = false;
    stopBtn.disabled = true;
    Toast.show(`脚本执行完成,共 ${plan.length} 步,耗时 ${elapsed}s`, "success", "自动化脚本");
  });

  stopBtn?.addEventListener("click", () => {
    stopFlag = true;
  });
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
}

// 展开 loop/end 为顺序执行计划(最多 3 层嵌套,解析器已校验配对)
function expandScriptPlan(lines) {
  const plan = [];
  const executable = lines.filter((l) => l.cmd !== "comment");

  const walk = (list, startIdx, endIdx, repeat) => {
    for (let r = 0; r < repeat; r++) {
      for (let i = startIdx; i < endIdx; i++) {
        const line = list[i];
        if (line.cmd === "loop") {
          // 找配对 end
          let depth = 1;
          let j = i + 1;
          for (; j < endIdx; j++) {
            if (list[j].cmd === "loop") depth++;
            if (list[j].cmd === "end") depth--;
            if (depth === 0) break;
          }
          walk(list, i + 1, j, parseInt(line.args[0], 10) || 1);
          i = j;
        } else if (line.cmd !== "end") {
          plan.push(line);
        }
      }
    }
  };
  walk(executable, 0, executable.length, 1);
  return plan;
}

async function executeScriptStep(step) {
  const a = step.args;
  switch (step.cmd) {
    case "tap":
      await AdbEngine.execute(`shell input tap ${a[0]} ${a[1]}`);
      break;
    case "swipe":
      await AdbEngine.execute(`shell input swipe ${a[0]} ${a[1]} ${a[2]} ${a[3]} ${a[4]}`);
      break;
    case "keyevent":
      await AdbEngine.execute(`shell input keyevent ${a[0]}`);
      break;
    case "text":
      await AdbEngine.execute(`shell input text ${a.join(" ").replace(/ /g, "%s")}`);
      break;
    case "sleep":
      await new Promise((resolve) => setTimeout(resolve, Math.min(parseInt(a[0], 10) || 0, 2000)));
      break;
    default:
      break;
  }
}
