// ============================================
// ADB UI - Components
// ============================================

// ============================================
// Status Bar
// ============================================

function renderStatusBar(device) {
  const statusClass = device.status === "connected" ? "" : "disconnected";
  const statusText = device.status === "connected" ? "已连接" : "未连接";

  return `
    <div class="status-bar-left">
      <div class="status-item" style="cursor: pointer" id="device-selector-toggle">
        <span class="status-indicator ${statusClass}"></span>
        <span class="value">${escapeHtml(device.name)}</span>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style="color: var(--color-text-tertiary); margin-left: 2px">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="status-item">
        <span class="label">型号</span>
        <span class="value">${escapeHtml(device.model)}</span>
      </div>
      <div class="status-item">
        <span class="label">Android</span>
        <span class="value">${device.androidVersion} (API ${device.apiLevel})</span>
      </div>
    </div>
    <div class="status-bar-right">
      <div class="status-item">
        <span class="label">分辨率</span>
        <span class="value">${device.screenResolution}</span>
      </div>
      <div class="status-item">
        <span class="label">内存</span>
        <span class="value">${device.memory}</span>
      </div>
      <div class="status-item battery-level">
        <div class="battery-icon">
          <div class="battery-fill" style="width: ${device.batteryLevel}%"></div>
        </div>
        <span class="value">${device.batteryLevel}%</span>
        ${device.batteryCharging ? `<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="color: var(--color-success)"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>` : ""}
      </div>
    </div>
  `;
}

// ============================================
// Device Selector Dropdown
// ============================================

function renderDeviceSelector() {
  return `
    <div class="device-selector" id="device-selector">
      <div class="device-selector-header">
        <span>已连接设备</span>
        <button class="btn btn-sm btn-primary" id="btn-connect-tcpip">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          无线连接
        </button>
      </div>
      <div class="device-list">
        ${mockDevices.map((d, i) => `
          <div class="device-item ${d.status === 'connected' ? 'active' : ''} ${d.status === 'offline' ? 'offline' : ''}" data-device-id="${escapeHtml(d.id)}">
            <div class="device-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            </div>
            <div class="device-item-info">
              <div class="device-item-name">${escapeHtml(d.name)}</div>
              <div class="device-item-meta">${escapeHtml(d.id)} &middot; Android ${d.androidVersion}</div>
            </div>
            <div class="device-item-status">
              ${d.status === 'connected' ? '<span class="tag tag-success">在线</span>' : '<span class="tag tag-default">离线</span>'}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ============================================
// App List Table
// ============================================

function renderAppRow(app) {
  const initials = getInitials(app.name);
  const typeTag = app.isSystem
    ? `<span class="tag tag-warning">系统应用</span>`
    : `<span class="tag tag-primary">用户应用</span>`;

  return `
    <tr data-app-id="${escapeHtml(app.id)}">
      <td style="padding-right: 0">
        <input type="checkbox" class="app-checkbox" data-app-id="${escapeHtml(app.id)}" style="cursor: pointer">
      </td>
      <td>
        <div class="app-info">
          <div class="app-icon ${app.iconGradient}">${initials}</div>
          <div class="app-info-text">
            <div class="app-name">${escapeHtml(app.name)}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="app-package">${escapeHtml(app.packageName)}</span>
      </td>
      <td>${escapeHtml(app.version)}</td>
      <td>${formatBytes(app.size)}</td>
      <td>${typeTag}</td>
      <td style="text-align: right">
        <div class="app-actions">
          <button class="btn btn-icon btn-ghost btn-sm app-action-launch" data-app-id="${escapeHtml(app.id)}" title="启动">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost btn-sm app-action-uninstall" data-app-id="${escapeHtml(app.id)}" title="卸载">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost btn-sm app-action-detail" data-app-id="${escapeHtml(app.id)}" title="详情">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function attachAppRowEvents(container, apps) {
  container.querySelectorAll("tbody tr").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest("input[type=checkbox]") || e.target.closest("button")) return;
      const appId = row.dataset.appId;
      const app = apps.find((a) => a.id === appId);
      if (app) openDetailPanel(app);
    });
  });

  container.querySelectorAll(".app-action-launch").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const app = apps.find((a) => a.id === btn.dataset.appId);
      Toast.show(`正在启动 ${app.name}...`, "success", "启动应用");
    });
  });

  container.querySelectorAll(".app-action-uninstall").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const app = apps.find((a) => a.id === btn.dataset.appId);
      openUninstallModal(app);
    });
  });

  container.querySelectorAll(".app-action-detail").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const app = apps.find((a) => a.id === btn.dataset.appId);
      openDetailPanel(app);
    });
  });
}

// ============================================
// Detail Panel
// ============================================

function openDetailPanel(app) {
  const panel = document.getElementById("detail-panel");
  const overlay = document.getElementById("detail-panel-overlay");
  const body = document.getElementById("detail-panel-body");
  const header = document.getElementById("detail-panel-header");
  const footer = document.getElementById("detail-panel-footer");

  const initials = getInitials(app.name);
  const totalSize = app.size + app.dataSize + app.cacheSize;

  header.innerHTML = `
    <div class="detail-app-header">
      <div class="detail-app-icon ${app.iconGradient}">${initials}</div>
      <div class="detail-app-info">
        <h3>${escapeHtml(app.name)}</h3>
        <p>${escapeHtml(app.packageName)}</p>
      </div>
    </div>
    <button class="close-btn" id="close-detail-panel">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
    </button>
  `;

  body.innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">基本信息</div>
      <div class="detail-info-grid">
        <div class="detail-info-item">
          <span class="label">版本号</span>
          <span class="value">${escapeHtml(app.version)}</span>
        </div>
        <div class="detail-info-item">
          <span class="label">Version Code</span>
          <span class="value">${app.versionCode}</span>
        </div>
        <div class="detail-info-item">
          <span class="label">应用大小</span>
          <span class="value">${formatBytes(app.size)}</span>
        </div>
        <div class="detail-info-item">
          <span class="label">数据占用</span>
          <span class="value">${formatBytes(app.dataSize)}</span>
        </div>
        <div class="detail-info-item">
          <span class="label">缓存</span>
          <span class="value">${formatBytes(app.cacheSize)}</span>
        </div>
        <div class="detail-info-item">
          <span class="label">总占用</span>
          <span class="value">${formatBytes(totalSize)}</span>
        </div>
        <div class="detail-info-item">
          <span class="label">安装时间</span>
          <span class="value">${formatDate(app.installTime)}</span>
        </div>
        <div class="detail-info-item">
          <span class="label">更新时间</span>
          <span class="value">${formatDate(app.updateTime)}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">存储占用</div>
      <div style="margin-bottom: var(--space-3)">
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2)">
          <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary)">总占用: ${formatBytes(totalSize)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light))"></div>
        </div>
      </div>
      <div style="display: flex; gap: var(--space-4); font-size: var(--font-size-xs)">
        <div style="display: flex; align-items: center; gap: var(--space-1)">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary); display: inline-block"></span>
          <span style="color: var(--color-text-secondary)">应用 ${formatBytes(app.size)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-1)">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-success); display: inline-block"></span>
          <span style="color: var(--color-text-secondary)">数据 ${formatBytes(app.dataSize)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-1)">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-warning); display: inline-block"></span>
          <span style="color: var(--color-text-secondary)">缓存 ${formatBytes(app.cacheSize)}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">权限 (${app.permissions.length})</div>
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-2)">
        ${app.permissions.map((p) => `<span class="tag tag-default">${escapeHtml(p)}</span>`).join("")}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">快捷操作</div>
      <div class="detail-actions-grid">
        <button class="detail-action-btn" data-action="launch">
          <div class="action-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>
          </div>
          <div>
            <div class="action-text">启动应用</div>
            <div class="action-desc">在设备上运行此应用</div>
          </div>
        </button>
        <button class="detail-action-btn" data-action="stop">
          <div class="action-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"/></svg>
          </div>
          <div>
            <div class="action-text">强制停止</div>
            <div class="action-desc">立即停止应用进程</div>
          </div>
        </button>
        <button class="detail-action-btn" data-action="freeze">
          <div class="action-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/></svg>
          </div>
          <div>
            <div class="action-text">${app.isEnabled ? "冻结应用" : "解冻应用"}</div>
            <div class="action-desc">${app.isEnabled ? "停用但不卸载" : "恢复应用使用"}</div>
          </div>
        </button>
        <button class="detail-action-btn" data-action="clear-data">
          <div class="action-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </div>
          <div>
            <div class="action-text">清除数据</div>
            <div class="action-desc">删除所有应用数据</div>
          </div>
        </button>
        <button class="detail-action-btn" data-action="clear-cache">
          <div class="action-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
          </div>
          <div>
            <div class="action-text">清除缓存</div>
            <div class="action-desc">仅删除缓存文件</div>
          </div>
        </button>
        <button class="detail-action-btn" data-action="export">
          <div class="action-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </div>
          <div>
            <div class="action-text">提取 APK</div>
            <div class="action-desc">导出安装包到本地</div>
          </div>
        </button>
        <button class="detail-action-btn" data-action="logs">
          <div class="action-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
          </div>
          <div>
            <div class="action-text">查看日志</div>
            <div class="action-desc">打开日志查看器</div>
          </div>
        </button>
        <button class="detail-action-btn" data-action="app-info">
          <div class="action-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
          </div>
          <div>
            <div class="action-text">应用信息</div>
            <div class="action-desc">查看系统应用详情</div>
          </div>
        </button>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" id="detail-panel-close-btn">关闭</button>
    <button class="btn btn-danger" id="detail-panel-uninstall-btn">卸载应用</button>
  `;

  document.getElementById("close-detail-panel").addEventListener("click", closeDetailPanel);
  document.getElementById("detail-panel-close-btn").addEventListener("click", closeDetailPanel);
  document.getElementById("detail-panel-uninstall-btn").addEventListener("click", () => {
    closeDetailPanel();
    openUninstallModal(app);
  });

  body.querySelectorAll(".detail-action-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const actionNames = {
        launch: "启动",
        stop: "强制停止",
        freeze: app.isEnabled ? "冻结" : "解冻",
        "clear-data": "清除数据",
        "clear-cache": "清除缓存",
        export: "提取 APK",
        logs: "查看日志",
        "app-info": "应用信息"
      };
      
      // 特殊处理需要确认的操作
      if (action === "clear-data") {
        openClearDataConfirmModal(app);
      } else if (action === "freeze") {
        const newState = !app.isEnabled;
        Toast.show(`正在${newState ? "解冻" : "冻结"} ${app.name}...`, "info", actionNames[action]);
        setTimeout(() => {
          app.isEnabled = newState;
          Toast.show(`${app.name} 已${newState ? "解冻" : "冻结"}`, "success", actionNames[action]);
          closeDetailPanel();
        }, 1000);
      } else {
        Toast.show(`${actionNames[action]} 操作已执行`, "success", app.name);
      }
    });
  });

  panel.classList.add("open");
  overlay.classList.add("open");
}

function closeDetailPanel() {
  document.getElementById("detail-panel").classList.remove("open");
  document.getElementById("detail-panel-overlay").classList.remove("open");
}

// ============================================
// Uninstall Modal
// ============================================

function openUninstallModal(app) {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <div style="text-align: center; padding: var(--space-4) 0">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-danger-bg); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4)">
        <svg width="28" height="28" viewBox="0 0 20 20" fill="var(--color-danger)"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </div>
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin-bottom: var(--space-2)">确认卸载</h3>
      <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">您确定要卸载 <strong>${escapeHtml(app.name)}</strong> 吗？</p>
      <p style="color: var(--color-text-tertiary); font-size: var(--font-size-xs); margin-top: var(--space-2)">包名: ${escapeHtml(app.packageName)}</p>
      <div style="margin-top: var(--space-4); text-align: left; background: var(--color-bg-hover); padding: var(--space-3); border-radius: var(--radius-md)">
        <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-primary); cursor: pointer">
          <input type="checkbox" id="keep-data-checkbox" style="cursor: pointer">
          <span>保留应用数据 (-k)</span>
        </label>
        <p style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: var(--space-2); margin-left: var(--space-6)">卸载后保留应用数据和缓存</p>
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
    Toast.show(`正在卸载 ${app.name}...`, "info", "卸载应用");
    closeModal();
    setTimeout(() => {
      Toast.show(`${app.name} 已成功卸载${keepData ? "（保留数据）" : ""}`, "success", "卸载完成");
    }, 1500);
  });

  overlay.classList.add("open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
}

// ============================================
// Clear Data Confirmation Modal
// ============================================

function openClearDataConfirmModal(app) {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <div style="text-align: center; padding: var(--space-4) 0">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-warning-bg); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4)">
        <svg width="28" height="28" viewBox="0 0 20 20" fill="var(--color-warning)"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </div>
      <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin-bottom: var(--space-2)">清除数据确认</h3>
      <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">您确定要清除 <strong>${escapeHtml(app.name)}</strong> 的所有数据吗？</p>
      <p style="color: var(--color-text-tertiary); font-size: var(--font-size-xs); margin-top: var(--space-2)">包名: ${escapeHtml(app.packageName)}</p>
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
    Toast.show(`正在清除 ${app.name} 的数据...`, "info", "清除数据");
    closeModal();
    setTimeout(() => {
      Toast.show(`${app.name} 的数据已清除`, "success", "清除完成");
      closeDetailPanel();
    }, 1500);
  });

  overlay.classList.add("open");
}

// ============================================
// Install APK Modal
// ============================================

function openInstallModal() {
  const overlay = document.getElementById("modal-overlay");
  const body = document.getElementById("modal-body");

  body.innerHTML = `
    <div style="padding: var(--space-2) 0">
      <div style="border: 2px dashed var(--color-border); border-radius: var(--radius-lg); padding: var(--space-8); text-align: center; cursor: pointer; transition: all var(--transition-fast)" onmouseover="this.style.borderColor='var(--color-primary)'" onmouseout="this.style.borderColor='var(--color-border)'">
        <svg width="40" height="40" viewBox="0 0 20 20" fill="currentColor" style="color: var(--color-text-tertiary); margin-bottom: var(--space-3)">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
        <p style="font-weight: var(--font-weight-medium); color: var(--color-text-primary); margin-bottom: var(--space-1)">拖拽 APK 文件到此处</p>
        <p style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">或点击浏览文件</p>
      </div>
      <div style="margin-top: var(--space-4)">
        <label style="font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); color: var(--color-text-secondary); display: block; margin-bottom: var(--space-2)">安装选项</label>
        <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-primary); cursor: pointer; margin-bottom: var(--space-2)">
          <input type="checkbox" checked style="cursor: pointer">
          <span>替换现有应用 (-r)</span>
        </label>
        <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-primary); cursor: pointer; margin-bottom: var(--space-2)">
          <input type="checkbox" style="cursor: pointer">
          <span>允许降级 (-d)</span>
        </label>
        <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-primary); cursor: pointer">
          <input type="checkbox" style="cursor: pointer">
          <span>授予所有权限 (-g)</span>
        </label>
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
    Toast.show("请选择 APK 文件进行安装", "info", "安装应用");
    closeModal();
  });

  overlay.classList.add("open");
}

// ============================================
// Shell Terminal Component
// ============================================

function renderShellTerminal() {
  return `
    <div class="terminal-container">
      <div class="terminal-toolbar">
        <div class="terminal-tabs">
          <div class="terminal-tab active">Shell</div>
          <div class="terminal-tab">Fastboot</div>
        </div>
        <div class="terminal-actions">
          <button class="btn btn-icon btn-ghost btn-sm" title="清空" onclick="clearTerminal()">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost btn-sm" title="复制输出" onclick="copyTerminalOutput()">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
          </button>
        </div>
      </div>
      <div class="terminal-output" id="terminal-output">
        <div class="terminal-line terminal-prompt">
          <span class="terminal-prompt-text">$</span>
          <span class="terminal-command">adb shell</span>
        </div>
        <div class="terminal-line">shell@pixel8pro:/ $</div>
        <div class="terminal-line terminal-info">Type 'help' for available commands or enter any adb command</div>
      </div>
      <div class="terminal-input-wrapper">
        <span class="terminal-prompt-text">$</span>
        <input type="text" class="terminal-input" id="terminal-input" placeholder="输入 ADB 命令..." autocomplete="off" spellcheck="false">
      </div>
    </div>
  `;
}

function clearTerminal() {
  const output = document.getElementById("terminal-output");
  if (output) {
    output.innerHTML = `<div class="terminal-line terminal-info">Terminal cleared. Ready for commands.</div>`;
  }
}

function copyTerminalOutput() {
  const output = document.getElementById("terminal-output");
  if (output) {
    copyToClipboard(output.innerText);
  }
}

function appendTerminalOutput(text, type = "output") {
  const output = document.getElementById("terminal-output");
  if (!output) return;
  const line = document.createElement("div");
  line.className = `terminal-line ${type}`;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

// ============================================
// Logcat Viewer Component
// ============================================

function renderLogcatViewer() {
  return `
    <div class="logcat-container">
      <div class="logcat-toolbar">
        <div class="logcat-filters">
          <select class="logcat-filter-select" id="logcat-level">
            <option value="V">Verbose</option>
            <option value="D">Debug</option>
            <option value="I" selected>Info</option>
            <option value="W">Warning</option>
            <option value="E">Error</option>
          </select>
          <input type="text" class="logcat-filter-input" id="logcat-tag-filter" placeholder="过滤 Tag...">
          <input type="text" class="logcat-filter-input" id="logcat-pid-filter" placeholder="过滤 PID...">
        </div>
        <div class="logcat-actions">
          <button class="btn btn-icon btn-ghost btn-sm" id="logcat-pause" title="暂停">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost btn-sm" id="logcat-clear" title="清空">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost btn-sm" id="logcat-export" title="导出">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </div>
      <div class="logcat-output" id="logcat-output">
        ${mockLogcatEntries.map((entry) => renderLogcatLine(entry)).join("")}
      </div>
      <div class="logcat-stats">
        <span id="logcat-count">${mockLogcatEntries.length} 条日志</span>
        <span class="logcat-live-indicator">
          <span class="status-indicator"></span> 实时接收中
        </span>
      </div>
    </div>
  `;
}

function renderLogcatLine(entry) {
  const levelColors = {
    V: "var(--color-text-tertiary)",
    D: "var(--color-primary)",
    I: "var(--color-success)",
    W: "var(--color-warning)",
    E: "var(--color-danger)"
  };
  return `
    <div class="logcat-line" data-level="${entry.level}" data-pid="${entry.pid}" data-tag="${escapeHtml(entry.tag)}">
      <span class="logcat-time">${escapeHtml(entry.time)}</span>
      <span class="logcat-pid">${entry.pid}</span>
      <span class="logcat-tid">${entry.tid}</span>
      <span class="logcat-level" style="color: ${levelColors[entry.level] || levelColors.I}">${entry.level}</span>
      <span class="logcat-tag">${escapeHtml(entry.tag)}</span>
      <span class="logcat-message">${escapeHtml(entry.message)}</span>
    </div>
  `;
}

// ============================================
// File Manager Component
// ============================================

function renderFileManager() {
  const files = currentPath === "/sdcard" ? mockSdcardFiles : mockFileSystem;
  return `
    <div class="file-manager">
      <div class="file-manager-toolbar">
        <div class="file-manager-breadcrumb">
          <button class="btn btn-icon btn-ghost btn-sm" id="file-nav-up" title="上级目录">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
          </button>
          <div class="breadcrumb-path">${escapeHtml(currentPath)}</div>
        </div>
        <div class="file-manager-actions">
          <button class="btn btn-sm btn-secondary" id="file-push">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            Push
          </button>
          <button class="btn btn-sm btn-secondary" id="file-mkdir">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"/></svg>
            新建文件夹
          </button>
        </div>
      </div>
      <div class="file-manager-drop-zone" id="file-drop-zone">
        <div class="drop-zone" id="drop-zone-content" style="display: none;">
          <svg class="drop-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div class="drop-zone-text">拖拽文件到此处上传</div>
          <div class="drop-zone-hint">支持单个或多个文件</div>
        </div>
        <div class="file-manager-list">
          <table class="data-table file-table">
            <thead>
              <tr>
                <th style="width: 40px"></th>
                <th>名称</th>
                <th style="width: 100px">大小</th>
                <th style="width: 120px">权限</th>
                <th style="width: 100px">所有者</th>
                <th style="width: 160px">修改时间</th>
                <th style="width: 100px; text-align: right">操作</th>
              </tr>
            </thead>
            <tbody>
              ${files.map((f) => renderFileRow(f)).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="file-transfer-progress" id="file-transfer-progress" style="display: none;">
        <div class="transfer-info">
          <span class="transfer-name" id="transfer-name">filename.zip</span>
          <span class="transfer-speed" id="transfer-speed">2.3 MB/s</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill" id="transfer-progress-bar" style="width: 0%"></div>
        </div>
        <div class="transfer-status" id="transfer-status">正在传输... 45%</div>
      </div>
    </div>
  `;
}

function renderFileRow(file) {
  const isDir = file.type === "dir";
  const icon = isDir
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-warning)"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-text-tertiary)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

  return `
    <tr class="file-row ${isDir ? 'file-dir' : ''}" data-name="${escapeHtml(file.name)}" data-type="${file.type}">
      <td>${icon}</td>
      <td>
        <span class="file-name">${escapeHtml(file.name)}</span>
      </td>
      <td>${isDir ? "—" : formatBytes(file.size)}</td>
      <td><code>${file.permissions}</code></td>
      <td>${escapeHtml(file.owner)}</td>
      <td>${formatDate(file.modified)}</td>
      <td style="text-align: right">
        <div class="app-actions">
          ${!isDir ? `<button class="btn btn-icon btn-ghost btn-sm file-action-pull" title="下载">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 9.586V3a1 1 0 112 0v6.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </button>` : ""}
          <button class="btn btn-icon btn-ghost btn-sm file-action-delete" title="删除">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ============================================
// Screenshot / Screen Recorder Component
// ============================================

function renderScreenshotTool() {
  return `
    <div class="screenshot-container">
      <div class="screenshot-preview-area">
        <div class="screenshot-placeholder" id="screenshot-preview">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-tertiary); margin-bottom: var(--space-4)">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <p style="color: var(--color-text-tertiary); font-size: var(--font-size-sm)">点击截图按钮捕获设备屏幕</p>
          <p style="color: var(--color-text-tertiary); font-size: var(--font-size-xs); margin-top: var(--space-2)">分辨率: ${mockDevice.screenResolution}</p>
        </div>
      </div>
      <div class="screenshot-toolbar">
        <button class="btn btn-primary btn-lg" id="btn-screenshot">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/></svg>
          截图
        </button>
        <button class="btn btn-secondary" id="btn-screenrecord">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
          <span id="record-btn-text">开始录屏</span>
        </button>
        <div class="screenshot-options">
          <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-secondary); cursor: pointer">
            <input type="checkbox" id="screenshot-include-statusbar" checked>
            <span>包含状态栏</span>
          </label>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// Performance Monitor Component
// ============================================

function renderPerformanceMonitor() {
  const memPercent = Math.round((mockPerformanceData.memory.used / mockPerformanceData.memory.total) * 100);
  return `
    <div class="perf-container">
      <div class="perf-grid">
        <div class="perf-card">
          <div class="perf-card-header">
            <span class="perf-card-title">CPU 使用率</span>
            <span class="perf-card-value">${mockPerformanceData.cpu.average}%</span>
          </div>
          <div class="perf-sparkline">
            ${generateSparkline(mockPerformanceData.cpu.usage, 200, 48, "#3b82f6")}
          </div>
        </div>
        <div class="perf-card">
          <div class="perf-card-header">
            <span class="perf-card-title">内存使用</span>
            <span class="perf-card-value">${mockPerformanceData.memory.used} / ${mockPerformanceData.memory.total} GB</span>
          </div>
          <div class="progress-bar" style="margin: var(--space-3) 0">
            <div class="progress-bar-fill" style="width: ${memPercent}%; background: linear-gradient(90deg, #22c55e, #f59e0b)"></div>
          </div>
          <div style="display: flex; gap: var(--space-4); font-size: var(--font-size-xs); color: var(--color-text-secondary)">
            <span>应用: ${mockPerformanceData.memory.apps} GB</span>
            <span>系统: ${mockPerformanceData.memory.system} GB</span>
          </div>
        </div>
        <div class="perf-card">
          <div class="perf-card-header">
            <span class="perf-card-title">网络流量</span>
            <span class="perf-card-value">↓ ${mockPerformanceData.network.rx[mockPerformanceData.network.rx.length - 1]} KB/s</span>
          </div>
          <div class="perf-sparkline">
            ${generateSparkline(mockPerformanceData.network.rx, 200, 48, "#22c55e")}
          </div>
        </div>
        <div class="perf-card">
          <div class="perf-card-header">
            <span class="perf-card-title">FPS / 温度</span>
            <span class="perf-card-value">${Math.round(mockPerformanceData.fps.reduce((a,b)=>a+b,0)/mockPerformanceData.fps.length)} FPS</span>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-4); margin-top: var(--space-3)">
            <div style="flex: 1">
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--space-1)">帧率</div>
              ${generateSparkline(mockPerformanceData.fps, 100, 32, "#a855f7")}
            </div>
            <div style="text-align: center; padding: var(--space-3); background: var(--color-bg-hover); border-radius: var(--radius-md)">
              <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary)">${mockPerformanceData.temperature}°C</div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">设备温度</div>
            </div>
          </div>
        </div>
      </div>
      <div class="perf-processes">
        <div class="card">
          <div class="card-header">
            <span class="card-title">进程列表 (${mockPerformanceData.processes} 个进程)</span>
            <button class="btn btn-sm btn-secondary" id="perf-refresh">刷新</button>
          </div>
          <div class="card-body" style="padding: 0">
            <table class="data-table">
              <thead>
                <tr>
                  <th>PID</th>
                  <th>用户</th>
                  <th>CPU%</th>
                  <th>内存</th>
                  <th>进程名</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>2847</td><td>u0_a123</td><td>15%</td><td>234 MB</td><td>com.android.chrome</td></tr>
                <tr><td>3123</td><td>u0_a101</td><td>8%</td><td>123 MB</td><td>com.google.android.gms</td></tr>
                <tr><td>1567</td><td>system</td><td>5%</td><td>89 MB</td><td>system_server</td></tr>
                <tr><td>2341</td><td>u0_a145</td><td>3%</td><td>67 MB</td><td>com.whatsapp</td></tr>
                <tr><td>1890</td><td>u0_a200</td><td>2%</td><td>45 MB</td><td>com.tencent.mm</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// Command History Component
// ============================================

function renderCommandHistory() {
  return `
    <div class="cmd-history-container">
      <div class="cmd-history-list">
        ${mockCommandHistory.map((cmd, i) => `
          <div class="cmd-history-item">
            <div class="cmd-history-header">
              <code class="cmd-history-command">${escapeHtml(cmd.command)}</code>
              <span class="cmd-history-time">${formatTime(cmd.timestamp)}</span>
            </div>
            <pre class="cmd-history-output">${escapeHtml(cmd.output)}</pre>
            <div class="cmd-history-actions">
              <button class="btn btn-sm btn-ghost" onclick="copyToClipboard('${escapeHtml(cmd.command)}')">复制命令</button>
              <button class="btn btn-sm btn-ghost" onclick="copyToClipboard(\`${escapeHtml(cmd.output)}\`)">复制输出</button>
              <button class="btn btn-sm btn-primary" onclick="rerunCommand('${escapeHtml(cmd.command)}')">重新执行</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function rerunCommand(command) {
  Toast.show(`重新执行: ${command}`, "info", "命令历史");
}

// ============================================
// Settings Component
// ============================================

function renderSettings() {
  const settings = loadSettings();

  return `
    <div class="settings-container">
      <div class="settings-header">
        <div class="settings-title">
          <h2>设置</h2>
          <p>配置 ADB UI 工具选项</p>
        </div>
        <button class="btn btn-sm btn-secondary" id="reset-settings">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
          重置为默认
        </button>
      </div>

      <div class="settings-sections">
        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
              ADB 配置
            </div>
          </div>
          <div class="info-card-body">
            <div class="form-group">
              <label class="form-label">ADB 可执行文件路径</label>
              <input type="text" class="form-control" id="setting-adb-path" value="${escapeHtml(settings.adb.adbPath)}" placeholder="C:\platform-tools\adb.exe">
              <p class="form-hint">指定 adb.exe 的完整路径</p>
            </div>
            <div class="form-group">
              <label class="form-label">默认连接端口</label>
              <input type="number" class="form-control" id="setting-adb-port" value="${settings.adb.defaultPort}" placeholder="5555">
              <p class="form-hint">TCP/IP 连接的默认端口号</p>
            </div>
            <div class="form-group">
              <label class="form-label">连接超时时间（秒）</label>
              <input type="number" class="form-control" id="setting-adb-timeout" value="${settings.adb.connectTimeout}" placeholder="10">
              <p class="form-hint">设备连接的超时时间</p>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2"/></svg>
              界面设置
            </div>
          </div>
          <div class="info-card-body">
            <div class="form-group">
              <label class="form-label">主题</label>
              <select class="form-control" id="setting-ui-theme">
                <option value="light" ${settings.ui.theme === "light" ? "selected" : ""}>浅色</option>
                <option value="dark" ${settings.ui.theme === "dark" ? "selected" : ""}>深色</option>
                <option value="auto" ${settings.ui.theme === "auto" ? "selected" : ""}>跟随系统</option>
              </select>
              <p class="form-hint">选择界面主题（深色主题开发中）</p>
            </div>
            <div class="form-group">
              <label class="form-label">语言</label>
              <select class="form-control" id="setting-ui-language">
                <option value="zh-CN" ${settings.ui.language === "zh-CN" ? "selected" : ""}>简体中文</option>
                <option value="en-US" ${settings.ui.language === "en-US" ? "selected" : ""}>English</option>
              </select>
              <p class="form-hint">选择界面语言（英文开发中）</p>
            </div>
            <div class="form-group">
              <label class="form-label">默认视图</label>
              <select class="form-control" id="setting-ui-default-view">
                <option value="apps" ${settings.ui.defaultView === "apps" ? "selected" : ""}>应用管理</option>
                <option value="files" ${settings.ui.defaultView === "files" ? "selected" : ""}>文件管理</option>
                <option value="logs" ${settings.ui.defaultView === "logs" ? "selected" : ""}>日志查看</option>
                <option value="shell" ${settings.ui.defaultView === "shell" ? "selected" : ""}>Shell 终端</option>
              </select>
              <p class="form-hint">启动时显示的默认视图</p>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82.33l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              高级设置
            </div>
          </div>
          <div class="info-card-body">
            <div class="form-group">
              <label class="form-label">日志级别</label>
              <select class="form-control" id="setting-advanced-log-level">
                <option value="verbose" ${settings.advanced.logLevel === "verbose" ? "selected" : ""}>Verbose</option>
                <option value="debug" ${settings.advanced.logLevel === "debug" ? "selected" : ""}>Debug</option>
                <option value="info" ${settings.advanced.logLevel === "info" ? "selected" : ""}>Info</option>
                <option value="warning" ${settings.advanced.logLevel === "warning" ? "selected" : ""}>Warning</option>
                <option value="error" ${settings.advanced.logLevel === "error" ? "selected" : ""}>Error</option>
              </select>
              <p class="form-hint">设置日志输出的最低级别</p>
            </div>
            <div class="form-group">
              <label class="form-label">自动刷新间隔（秒）</label>
              <input type="number" class="form-control" id="setting-advanced-refresh-interval" value="${settings.advanced.autoRefreshInterval}" placeholder="5">
              <p class="form-hint">设备状态和性能数据的自动刷新间隔</p>
            </div>
            <div class="form-group">
              <label class="form-label" style="display: flex; align-items: center; justify-content: space-between;">
                <span>危险操作确认</span>
                <label class="switch">
                  <input type="checkbox" id="setting-advanced-confirm-ops" ${settings.advanced.confirmDangerousOps ? "checked" : ""}>
                  <span class="switch-slider"></span>
                </label>
              </label>
              <p class="form-hint">执行卸载、清除数据等危险操作前需要确认</p>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button class="btn btn-primary" id="save-settings">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          保存设置
        </button>
      </div>
    </div>
  `;
}

// ============================================
// Device Info Component
// ============================================

function renderDeviceInfo() {
  const { basic, hardware, battery, network, systemProps } = mockDeviceDetails;

  return `
    <div class="device-info-container">
      <div class="device-info-header">
        <div class="device-info-title">
          <h2>设备详细信息</h2>
          <p>查看设备的硬件、系统和网络信息</p>
        </div>
        <div class="device-info-actions">
          <button class="btn btn-sm btn-secondary" id="copy-device-info">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
            复制信息
          </button>
          <button class="btn btn-sm btn-primary" id="export-device-info">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            导出报告
          </button>
        </div>
      </div>

      <div class="device-info-grid">
        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              基本信息
            </div>
          </div>
          <div class="info-card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">设备型号</span>
                <span class="value">${escapeHtml(basic.model)}</span>
              </div>
              <div class="info-item">
                <span class="label">制造商</span>
                <span class="value">${escapeHtml(basic.manufacturer)}</span>
              </div>
              <div class="info-item">
                <span class="label">品牌</span>
                <span class="value">${escapeHtml(basic.brand)}</span>
              </div>
              <div class="info-item">
                <span class="label">设备代号</span>
                <span class="value">${escapeHtml(basic.device)}</span>
              </div>
              <div class="info-item">
                <span class="label">序列号</span>
                <span class="value">${escapeHtml(basic.serialNumber)}</span>
              </div>
              <div class="info-item">
                <span class="label">Android 版本</span>
                <span class="value">${escapeHtml(basic.androidVersion)} (API ${basic.apiLevel})</span>
              </div>
              <div class="info-item">
                <span class="label">版本号</span>
                <span class="value">${escapeHtml(basic.buildNumber)}</span>
              </div>
              <div class="info-item">
                <span class="label">安全补丁</span>
                <span class="value">${escapeHtml(basic.securityPatch)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
              硬件信息
            </div>
          </div>
          <div class="info-card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">处理器</span>
                <span class="value">${escapeHtml(hardware.cpu)}</span>
              </div>
              <div class="info-item">
                <span class="label">CPU 核心数</span>
                <span class="value">${hardware.cpuCores} 核</span>
              </div>
              <div class="info-item">
                <span class="label">CPU 架构</span>
                <span class="value">${escapeHtml(hardware.cpuArch)}</span>
              </div>
              <div class="info-item">
                <span class="label">GPU</span>
                <span class="value">${escapeHtml(hardware.gpu)}</span>
              </div>
              <div class="info-item">
                <span class="label">运行内存</span>
                <span class="value">${escapeHtml(hardware.ram)}</span>
              </div>
              <div class="info-item">
                <span class="label">存储空间</span>
                <span class="value">${escapeHtml(hardware.storage)} (可用: ${escapeHtml(hardware.storageAvailable)})</span>
              </div>
              <div class="info-item">
                <span class="label">屏幕分辨率</span>
                <span class="value">${escapeHtml(hardware.screenResolution)}</span>
              </div>
              <div class="info-item">
                <span class="label">屏幕密度</span>
                <span class="value">${escapeHtml(hardware.screenDensity)}</span>
              </div>
              <div class="info-item">
                <span class="label">屏幕尺寸</span>
                <span class="value">${escapeHtml(hardware.screenSize)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"/><line x1="23" y1="13" x2="23" y2="11"/></svg>
              电池信息
            </div>
          </div>
          <div class="info-card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">电量</span>
                <span class="value">${battery.level}%</span>
              </div>
              <div class="info-item">
                <span class="label">健康状态</span>
                <span class="value">${escapeHtml(battery.health)}</span>
              </div>
              <div class="info-item">
                <span class="label">温度</span>
                <span class="value">${battery.temperature}°C</span>
              </div>
              <div class="info-item">
                <span class="label">电压</span>
                <span class="value">${battery.voltage} mV</span>
              </div>
              <div class="info-item">
                <span class="label">电池技术</span>
                <span class="value">${escapeHtml(battery.technology)}</span>
              </div>
              <div class="info-item">
                <span class="label">充电方式</span>
                <span class="value">${escapeHtml(battery.chargingType)}</span>
              </div>
              <div class="info-item">
                <span class="label">充电循环次数</span>
                <span class="value">${battery.cycleCount} 次</span>
              </div>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
              网络信息
            </div>
          </div>
          <div class="info-card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="label">IP 地址</span>
                <span class="value">${escapeHtml(network.ipAddress)}</span>
              </div>
              <div class="info-item">
                <span class="label">MAC 地址</span>
                <span class="value">${escapeHtml(network.macAddress)}</span>
              </div>
              <div class="info-item">
                <span class="label">WiFi 名称</span>
                <span class="value">${escapeHtml(network.wifiSsid)}</span>
              </div>
              <div class="info-item">
                <span class="label">WiFi 信号</span>
                <span class="value">${escapeHtml(network.wifiSignal)}</span>
              </div>
              <div class="info-item">
                <span class="label">移动数据</span>
                <span class="value">${escapeHtml(network.mobileData)}</span>
              </div>
              <div class="info-item">
                <span class="label">运营商</span>
                <span class="value">${escapeHtml(network.operator)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="info-card" style="margin-top: var(--space-4);">
        <div class="info-card-header">
          <div class="info-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            系统属性 (getprop)
          </div>
        </div>
        <div class="info-card-body">
          <div class="system-props-list">
            ${systemProps.map(prop => `
              <div class="system-prop-item">
                <span class="system-prop-key">${escapeHtml(prop.key)}</span>
                <span class="system-prop-value">${escapeHtml(prop.value)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// Task Center Component
// ============================================

function renderTaskCenter() {
  const runningTasks = mockTasks.filter(t => t.status === "running");
  const completedTasks = mockTasks.filter(t => t.status === "completed");
  const failedTasks = mockTasks.filter(t => t.status === "failed");

  return `
    <div class="task-center-container">
      <div class="task-center-header">
        <div class="task-stats">
          <div class="task-stat-item">
            <span class="task-stat-value">${runningTasks.length}</span>
            <span class="task-stat-label">进行中</span>
          </div>
          <div class="task-stat-item">
            <span class="task-stat-value">${completedTasks.length}</span>
            <span class="task-stat-label">已完成</span>
          </div>
          <div class="task-stat-item">
            <span class="task-stat-value">${failedTasks.length}</span>
            <span class="task-stat-label">失败</span>
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" id="clear-completed-tasks">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          清除已完成
        </button>
      </div>
      <div class="task-list">
        ${mockTasks.length === 0 ? `
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div class="empty-state-title">暂无任务</div>
            <div class="empty-state-desc">执行批量操作后，任务将显示在这里</div>
          </div>
        ` : mockTasks.map(task => renderTaskCard(task)).join("")}
      </div>
    </div>
  `;
}

function renderTaskCard(task) {
  const statusMap = {
    running: { text: "进行中", class: "running" },
    completed: { text: "已完成", class: "completed" },
    failed: { text: "失败", class: "failed" },
    cancelled: { text: "已取消", class: "cancelled" }
  };

  const status = statusMap[task.status] || statusMap.running;
  const progressColor = task.status === "failed" ? "var(--color-danger)" : 
                        task.status === "completed" ? "var(--color-success)" : 
                        "var(--color-primary)";

  return `
    <div class="task-card" data-task-id="${escapeHtml(task.id)}">
      <div class="task-card-header">
        <div>
          <div class="task-card-title">${escapeHtml(task.name)}</div>
          <div class="task-card-meta">
            <span>${formatTime(task.createTime)}</span>
            <span class="status-badge ${status.class}">${status.text}</span>
          </div>
        </div>
        ${task.status === "running" ? `
          <button class="btn btn-sm btn-ghost task-cancel-btn" data-task-id="${escapeHtml(task.id)}">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            取消
          </button>
        ` : ""}
      </div>
      <div class="task-card-progress">
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: ${task.progress}%; background-color: ${progressColor}"></div>
        </div>
      </div>
      <div class="task-card-stats">
        <span>进度: ${task.progress}%</span>
        <span>成功: ${task.success}</span>
        ${task.failed > 0 ? `<span style="color: var(--color-danger)">失败: ${task.failed}</span>` : ""}
        <span>总计: ${task.total}</span>
      </div>
      ${task.items ? `
        <div class="task-detail-toggle" data-task-id="${escapeHtml(task.id)}">
          <button class="btn btn-sm btn-ghost">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            查看详情
          </button>
        </div>
        <div class="task-detail-list" id="task-detail-${escapeHtml(task.id)}" style="display: none;">
          ${task.items.map(item => `
            <div class="task-detail-item ${item.status}">
              <span class="task-detail-name">${escapeHtml(item.name)}</span>
              <span class="task-detail-status">
                ${item.status === "success" ? `
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--color-success)"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                ` : item.status === "failed" ? `
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--color-danger)"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
                ` : `
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--color-text-tertiary)"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                `}
              </span>
              ${item.error ? `<span class="task-detail-error">${escapeHtml(item.error)}</span>` : ""}
            </div>
          `).join("")}
        </div>
      ` : ""}
      ${task.status === "failed" ? `
        <div class="task-card-actions">
          <button class="btn btn-sm btn-primary task-retry-btn" data-task-id="${escapeHtml(task.id)}">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
            重试
          </button>
        </div>
      ` : ""}
    </div>
  `;
}

// ============================================
// 1.8 常用命令库 Component
// ============================================

function renderCommandLibrary() {
  const lib = loadCommandLibrary();
  const categories = ["全部", ...mockCommandLibrary.map((c) => c.category), "我的收藏", "自定义"];
  const active = lib.activeCategory || "全部";

  return `
    <div class="cmdlib-container">
      <div class="cmdlib-sidebar">
        ${categories.map((cat) => `
          <div class="cmdlib-cat ${cat === active ? "active" : ""}" data-category="${escapeHtml(cat)}">
            ${escapeHtml(cat)}
          </div>
        `).join("")}
      </div>
      <div class="cmdlib-main">
        <div class="cmdlib-toolbar">
          <div class="cmdlib-toolbar-title">${escapeHtml(active)}</div>
          <button class="btn btn-sm btn-primary" id="cmdlib-add-custom">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
            自定义命令
          </button>
        </div>
        <div class="cmdlib-list" id="cmdlib-list">
          ${renderCommandLibraryList(active)}
        </div>
      </div>
    </div>
  `;
}

function renderCommandLibraryList(category) {
  const lib = loadCommandLibrary();
  let items = [];

  if (category === "我的收藏") {
    const all = flattenCommandLibrary();
    items = all.filter((c) => lib.favorites.includes(commandKey(c)));
  } else if (category === "自定义") {
    items = lib.custom.map((c) => ({ ...c, category: c.category || "自定义", custom: true }));
  } else if (category === "全部") {
    items = flattenCommandLibrary();
  } else {
    const group = mockCommandLibrary.find((g) => g.category === category);
    items = group ? group.commands.map((c) => ({ ...c, category })) : [];
  }

  if (items.length === 0) {
    return `
      <div class="empty-state" style="padding: var(--space-10)">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        <div class="empty-state-title">暂无命令</div>
        <div class="empty-state-desc">${category === "我的收藏" ? "点击命令卡片星标即可收藏" : category === "自定义" ? "点击右上角\"自定义命令\"添加" : "该分类暂无命令"}</div>
      </div>
    `;
  }

  return items.map((cmd) => {
    const key = commandKey(cmd);
    const fav = lib.favorites.includes(key);
    return `
      <div class="cmd-card" data-cmd-key="${escapeHtml(key)}">
        <div class="cmd-card-main">
          <div class="cmd-card-command">${escapeHtml(cmd.command)}</div>
          <div class="cmd-card-name">${escapeHtml(cmd.name)}${cmd.category ? `<span class="cmd-card-cat">${escapeHtml(cmd.category)}</span>` : ""}</div>
          <div class="cmd-card-output" id="cmd-output-${escapeHtml(key)}" style="display:none"></div>
        </div>
        <div class="cmd-card-actions">
          <button class="btn btn-icon btn-ghost cmd-fav-btn ${fav ? "faved" : ""}" data-cmd-key="${escapeHtml(key)}" title="${fav ? "取消收藏" : "收藏"}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${fav ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          ${cmd.custom ? `
          <button class="btn btn-icon btn-ghost cmd-del-btn" data-cmd-key="${escapeHtml(key)}" title="删除">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>` : ""}
          <button class="btn btn-sm btn-primary cmd-run-btn" data-cmd-key="${escapeHtml(key)}">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>
            执行
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function flattenCommandLibrary() {
  const items = [];
  mockCommandLibrary.forEach((group) => {
    group.commands.forEach((c) => items.push({ ...c, category: group.category }));
  });
  return items;
}

function commandKey(cmd) {
  return encodeURIComponent(cmd.command);
}

// ============================================
// 1.1+1.2+1.3 显示调节 Component
// ============================================

function renderDisplaySettings() {
  const s = mockDisplayState;
  const o = s.overscan;

  return `
    <div class="display-container">
      <div class="display-current-bar">
        <div class="display-current-item">
          <span class="display-current-label">当前分辨率</span>
          <span class="display-current-value" id="cur-size">${escapeHtml(s.size.replace("x", " x "))}</span>
        </div>
        <div class="display-current-item">
          <span class="display-current-label">当前密度</span>
          <span class="display-current-value" id="cur-density">${s.density}dpi</span>
        </div>
        <div class="display-current-item">
          <span class="display-current-label">过扫描</span>
          <span class="display-current-value" id="cur-overscan">${o.left},${o.top},${o.right},${o.bottom}</span>
        </div>
      </div>

      <div class="display-grid">
        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              分辨率 / DPI
            </div>
          </div>
          <div class="info-card-body">
            <div class="form-group">
              <label class="form-label">分辨率预设</label>
              <div class="preset-btn-group" id="size-presets">
                ${s.presets.sizes.map((p) => `<button class="preset-btn ${p.value === s.size ? "active" : ""}" data-size="${escapeHtml(p.value)}">${escapeHtml(p.label)}</button>`).join("")}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">自定义分辨率(宽 x 高)</label>
              <div class="inline-input-group">
                <input type="text" class="form-control" id="custom-size" placeholder="如 1080x2400">
                <button class="btn btn-sm btn-primary" id="apply-size">应用</button>
                <button class="btn btn-sm btn-secondary" id="reset-size">恢复默认</button>
              </div>
              <p class="form-hint">格式:宽x高,小写 x 分隔(如 1080x2400)</p>
            </div>
            <div class="form-group">
              <label class="form-label">密度(DPI)预设</label>
              <div class="preset-btn-group" id="density-presets">
                ${s.presets.densities.map((p) => `<button class="preset-btn ${p.value === s.density ? "active" : ""}" data-density="${p.value}">${escapeHtml(p.label)}</button>`).join("")}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">自定义密度</label>
              <div class="inline-input-group">
                <input type="number" class="form-control" id="custom-density" placeholder="如 420">
                <button class="btn btn-sm btn-primary" id="apply-density">应用</button>
                <button class="btn btn-sm btn-secondary" id="reset-density">恢复默认</button>
              </div>
              <p class="form-hint">整数,单位 dpi(常见 320~480)</p>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
              过扫描调节
            </div>
          </div>
          <div class="info-card-body">
            <div class="overscan-preview-wrap">
              <div class="overscan-phone">
                <div class="overscan-screen" id="overscan-screen"></div>
              </div>
            </div>
            ${["left", "top", "right", "bottom"].map((side) => {
              const labels = { left: "左", top: "上", right: "右", bottom: "下" };
              return `
              <div class="form-group overscan-row">
                <label class="form-label">${labels[side]}</label>
                <input type="range" class="overscan-slider" id="overscan-${side}" min="-200" max="200" step="10" value="${o[side]}" data-side="${side}">
                <span class="overscan-val" id="overscan-val-${side}">${o[side]}</span>
              </div>`;
            }).join("")}
            <div class="inline-input-group" style="margin-top: var(--space-2)">
              <button class="btn btn-sm btn-primary" id="apply-overscan">应用</button>
              <button class="btn btn-sm btn-secondary" id="reset-overscan">重置</button>
            </div>
            <p class="form-hint" style="margin-top: var(--space-2)">Android 10+ 部分机型不支持,失败将提示并回滚</p>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2"/></svg>
              系统参数
            </div>
          </div>
          <div class="info-card-body">
            <div class="form-group">
              <label class="form-label">动画速度</label>
              <div class="preset-btn-group" id="anim-presets">
                <button class="preset-btn" data-anim="0">关闭</button>
                <button class="preset-btn" data-anim="0.5">0.5x</button>
                <button class="preset-btn active" data-anim="1">1x</button>
              </div>
              <div class="inline-input-group" style="margin-top: var(--space-2)">
                <input type="number" class="form-control" id="custom-anim" placeholder="0 ~ 10" min="0" max="10" step="0.5">
                <button class="btn btn-sm btn-primary" id="apply-anim">应用</button>
              </div>
              <p class="form-hint">三档联动写入窗口/过渡/Animator 三个 scale</p>
            </div>
            <div class="form-group">
              <label class="form-label">字体大小 <span class="param-val" id="font-scale-val">${s.fontScale.toFixed(2)}x</span></label>
              <input type="range" class="param-slider" id="font-scale" min="0.85" max="1.30" step="0.05" value="${s.fontScale}">
              <div class="inline-input-group" style="margin-top: var(--space-2)">
                <button class="btn btn-sm btn-primary" id="apply-font">应用</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">锁屏时间(毫秒)</label>
              <div class="inline-input-group">
                <input type="number" class="form-control" id="lock-timeout" value="${s.lockTimeout}" placeholder="5000">
                <button class="btn btn-sm btn-primary" id="apply-lock">应用</button>
              </div>
              <p class="form-hint">锁屏后 N 毫秒自动上锁,0 表示立即</p>
            </div>
            <div class="inline-input-group">
              <button class="btn btn-sm btn-secondary" id="reset-params">恢复默认</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// 1.4 电池模拟 Component
// ============================================

function renderBatterySimulator() {
  const cur = mockBatteryState.simulated || mockBatteryState.real;
  const simulating = !!mockBatteryState.simulated;
  const statusMap = { 2: "充电中", 3: "未充电", 4: "不充电", 5: "已充满" };

  return `
    <div class="battery-container">
      <div class="battery-warning-bar">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        模拟状态会覆盖设备真实电池读数,还原前设备电池显示可能异常
      </div>

      <div class="battery-grid">
        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"/><line x1="23" y1="10" x2="23" y2="14"/></svg>
              当前电池状态
              ${simulating ? `<span class="battery-sim-badge">模拟中</span>` : ""}
            </div>
          </div>
          <div class="info-card-body">
            <div class="battery-status-grid">
              <div class="battery-status-item">
                <div class="battery-status-value" id="battery-level">${cur.level}%</div>
                <div class="battery-status-label">电量</div>
              </div>
              <div class="battery-status-item">
                <div class="battery-status-value" id="battery-temp">${(cur.temperature / 10).toFixed(1)}°C</div>
                <div class="battery-status-label">温度</div>
              </div>
              <div class="battery-status-item">
                <div class="battery-status-value" id="battery-status">${statusMap[cur.status] || "未知"}</div>
                <div class="battery-status-label">充电状态</div>
              </div>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              模拟控制
            </div>
          </div>
          <div class="info-card-body">
            <div class="form-group">
              <label class="form-label" style="display: flex; align-items: center; justify-content: space-between;">
                <span>启用电池模拟</span>
                <label class="switch">
                  <input type="checkbox" id="battery-sim-toggle" ${simulating ? "checked" : ""}>
                  <span class="switch-slider"></span>
                </label>
              </label>
              <p class="form-hint">启用后自动执行 unplug 断开真实充电输入</p>
            </div>
            <div class="form-group">
              <label class="form-label">模拟电量 <span class="param-val" id="sim-level-val">${cur.level}%</span></label>
              <input type="range" class="param-slider" id="sim-level" min="1" max="100" step="1" value="${cur.level}" ${simulating ? "" : "disabled"}>
            </div>
            <div class="form-group">
              <label class="form-label">模拟温度 <span class="param-val" id="sim-temp-val">${(cur.temperature / 10).toFixed(1)}°C</span></label>
              <input type="range" class="param-slider" id="sim-temp" min="20" max="60" step="0.5" value="${(cur.temperature / 10).toFixed(1)}" ${simulating ? "" : "disabled"}>
            </div>
            <div class="form-group">
              <label class="form-label">充电状态</label>
              <select class="form-control" id="sim-status" ${simulating ? "" : "disabled"}>
                <option value="2" ${cur.status === 2 ? "selected" : ""}>充电中</option>
                <option value="3" ${cur.status === 3 ? "selected" : ""}>未充电</option>
                <option value="4" ${cur.status === 4 ? "selected" : ""}>不充电</option>
                <option value="5" ${cur.status === 5 ? "selected" : ""}>已充满</option>
              </select>
            </div>
            <div class="inline-input-group" style="margin-top: var(--space-2)">
              <button class="btn btn-sm btn-danger" id="battery-reset" ${simulating ? "" : "disabled"}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
                一键还原
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// 1.5+1.6 设备控制 Component(重启模式 + 输入模拟)
// ============================================

function renderDeviceControl() {
  const sizeParts = mockDisplayState.size.split("x");
  const resW = sizeParts[0];
  const resH = sizeParts[1];

  return `
    <div class="devctrl-container">
      <div class="info-card">
        <div class="info-card-header">
          <div class="info-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            重启模式
          </div>
        </div>
        <div class="info-card-body">
          <div class="reboot-grid">
            ${mockRebootModes.map((m) => `
              <div class="reboot-card ${m.danger ? "danger" : ""}">
                <div class="reboot-card-name">${escapeHtml(m.name)}</div>
                <div class="reboot-card-desc">${escapeHtml(m.desc)}</div>
                <button class="btn btn-sm ${m.danger ? "btn-danger" : "btn-secondary"} reboot-btn" data-mode="${escapeHtml(m.id)}">
                  执行
                </button>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <div class="info-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"/><path d="M6 12h4m-2-2v4"/><circle cx="16" cy="11" r="0.5"/><circle cx="18" cy="13" r="0.5"/></svg>
            输入模拟
          </div>
        </div>
        <div class="info-card-body">
          <div class="inputsim-grid">
            <div class="inputsim-section">
              <div class="inputsim-title">点击 / 长按(参照分辨率 ${resW} x ${resH})</div>
              <div class="inline-input-group">
                <input type="number" class="form-control" id="tap-x" placeholder="x (0~${resW})">
                <input type="number" class="form-control" id="tap-y" placeholder="y (0~${resH})">
              </div>
              <div class="inline-input-group" style="margin-top: var(--space-2)">
                <button class="btn btn-sm btn-primary" id="btn-tap">点击</button>
                <button class="btn btn-sm btn-secondary" id="btn-longpress">长按</button>
              </div>
            </div>

            <div class="inputsim-section">
              <div class="inputsim-title">滑动</div>
              <div class="inline-input-group">
                <input type="number" class="form-control" id="swipe-x1" placeholder="x1">
                <input type="number" class="form-control" id="swipe-y1" placeholder="y1">
              </div>
              <div class="inline-input-group" style="margin-top: var(--space-2)">
                <input type="number" class="form-control" id="swipe-x2" placeholder="x2">
                <input type="number" class="form-control" id="swipe-y2" placeholder="y2">
                <input type="number" class="form-control" id="swipe-duration" placeholder="时长(ms)" value="300">
              </div>
              <div class="inline-input-group" style="margin-top: var(--space-2)">
                <button class="btn btn-sm btn-primary" id="btn-swipe">滑动</button>
              </div>
            </div>

            <div class="inputsim-section">
              <div class="inputsim-title">物理按键</div>
              <div class="keycode-grid">
                ${mockKeycodes.map((k) => `<button class="keycode-btn" data-keycode="${escapeHtml(k.keycode)}">${escapeHtml(k.name)}</button>`).join("")}
              </div>
            </div>

            <div class="inputsim-section">
              <div class="inputsim-title">文本输入</div>
              <div class="inline-input-group">
                <input type="text" class="form-control" id="input-text" placeholder="输入文本(仅 ASCII)">
                <button class="btn btn-sm btn-primary" id="btn-send-text">发送</button>
              </div>
              <p class="form-hint" style="margin-top: var(--space-2)">仅支持 ASCII 字符,中文需用 ADB Keyboard 等输入法</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// 1.7 自动化脚本 Component
// ============================================

function renderScriptAutomation() {
  const defaultScript = mockScriptTemplates[0] ? mockScriptTemplates[0].content : "";

  return `
    <div class="script-container">
      <div class="script-editor-pane">
        <div class="script-editor-toolbar">
          <span class="script-editor-title">脚本编辑器</span>
          <div class="script-editor-actions">
            <button class="btn btn-sm btn-secondary" id="script-import">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
              导入
            </button>
            <button class="btn btn-sm btn-secondary" id="script-export">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              导出
            </button>
            <input type="file" id="script-file-input" accept=".adbs,.txt" style="display:none">
          </div>
        </div>
        <div class="script-editor-wrap">
          <div class="script-line-numbers" id="script-line-numbers">1</div>
          <textarea class="script-editor" id="script-editor" spellcheck="false" placeholder="在此编写脚本...">${escapeHtml(defaultScript)}</textarea>
        </div>
        <div class="script-statusbar">
          <span id="script-status">就绪</span>
          <span id="script-progress"></span>
        </div>
      </div>

      <div class="script-side-pane">
        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">执行控制</div>
          </div>
          <div class="info-card-body">
            <div class="inline-input-group">
              <button class="btn btn-sm btn-primary" id="script-run">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>
                执行
              </button>
              <button class="btn btn-sm btn-danger" id="script-stop" disabled>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"/></svg>
                停止
              </button>
            </div>
            <p class="form-hint" style="margin-top: var(--space-2)">执行前自动逐行校验,非法行给出行号提示</p>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">插入指令</div>
          </div>
          <div class="info-card-body">
            <div class="script-cmd-btns">
              <button class="script-cmd-btn" data-insert="tap 540 1200">tap</button>
              <button class="script-cmd-btn" data-insert="swipe 540 1200 540 400 300">swipe</button>
              <button class="script-cmd-btn" data-insert="keyevent KEYCODE_HOME">keyevent</button>
              <button class="script-cmd-btn" data-insert="text hello">text</button>
              <button class="script-cmd-btn" data-insert="sleep 1000">sleep</button>
              <button class="script-cmd-btn" data-insert="loop 3">loop</button>
              <button class="script-cmd-btn" data-insert="end">end</button>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">录制模式</div>
          </div>
          <div class="info-card-body">
            <label class="form-label" style="display: flex; align-items: center; justify-content: space-between;">
              <span>录制输入模拟动作</span>
              <label class="switch">
                <input type="checkbox" id="script-record-toggle">
                <span class="switch-slider"></span>
              </label>
            </label>
            <p class="form-hint" style="margin-top: var(--space-2)">开启后,在"设备控制"面板执行的点击/滑动/按键将自动追加为脚本行</p>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <div class="info-card-title">示例模板</div>
          </div>
          <div class="info-card-body">
            ${mockScriptTemplates.map((t) => `
              <button class="btn btn-sm btn-secondary script-template-btn" data-template="${escapeHtml(t.id)}" style="width: 100%; margin-bottom: var(--space-2); justify-content: flex-start;">${escapeHtml(t.name)}</button>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}
