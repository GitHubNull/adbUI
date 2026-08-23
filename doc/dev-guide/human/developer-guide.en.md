# adbUI Developer Guide

> This document is for human developers participating in adbUI development, maintenance, or secondary development.
>
> If you are an end user, see the [User Guide](../../user-guide/user-guide.en.md).
> If you are an AI coding assistant, please refer to the [AI Agent Guide](../ai-agent/AGENTS.en.md) first.

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Build & Release](#build--release)

---

## Architecture

### Overview

adbUI uses a **Tauri (Rust) + Vue 3 (TypeScript)** architecture:

```
Vue Frontend (src/)  --invoke-->  Rust Backend (src-tauri/src/)
   useDevices.ts                     adb/ module directory (device/apps/files/...)
   useApps.ts                        task.rs
   ...                               websocket.rs (WebSocket push)
                                     lib.rs (command registration)
```

Communication flow:
1. Frontend calls backend commands via `invoke()` from `@tauri-apps/api`
2. Backend `lib.rs` registers all commands via `generate_handler!`
3. Command implementations are in the `adb/` module directory (ADB interaction), `task.rs` (task framework), and `websocket.rs` (real-time push)
4. Backend sends events to frontend via `Emitter` (e.g., `task-progress`, `script-progress`) and pushes device status changes (`device_changed`) via the WebSocket service

### Key Modules

| Module | File | Responsibility |
|--------|------|---------------|
| ADB Communication | `src-tauri/src/adb/` | All ADB-related Tauri commands, split into 15 sub-modules: device / apps / app_icons / files / batch / m2 / m2_commands / m2_tests / logs / screenshot / performance / history / report / models / helpers, unified re-export via `mod.rs` |
| Task Framework | `src-tauri/src/task.rs` | Batch task creation, progress tracking, cancellation |
| Real-time Notify | `src-tauri/src/websocket.rs` | Local WebSocket server that pushes device status change events |
| Command Registration | `src-tauri/src/lib.rs` | Tauri app entry, command registration, plugin init |
| Device Core | `src/composables/useDevices.ts` | Device sync (WebSocket real-time + fallback polling), detail fetching, command execution, wireless connection |
| Real-time Client | `src/composables/useWebSocket.ts` | WebSocket singleton client (exponential backoff reconnect, heartbeat, event dispatch) |
| View Entry | `src/App.vue` | View switching (currentView) and global state |
| Sidebar | `src/components/AppSidebar.vue` | Navigation menu (11 feature pages + Settings at bottom) |

### Event Mechanism

The backend sends events to the frontend through two channels:

**Tauri `Emitter` events** (listened via `listen()`):

- **`task-progress`**: Batch task progress updates (`TaskInfo` struct)
- **`script-progress`**: Script execution progress (`ScriptProgress` struct with line number, status, message)

**WebSocket real-time push** (subscribed via the `useWebSocket` client):

- **`device_changed`**: Device connect/disconnect/status change (`DeviceChangedPayload`). Module composables subscribe and refresh data automatically; falls back to timed polling when WebSocket is unavailable.

---

## Project Structure

```
├── src/                          # Frontend source (Vue 3 + TypeScript)
│   ├── components/               # Shared components
│   │   ├── AppSidebar.vue        # Sidebar navigation (11 feature pages + Settings at bottom)
│   │   ├── AppStatusBar.vue      # Bottom status bar (sync status, device/task statistics)
│   │   ├── device-manager/       # Device manager sub-components (incl. wireless connect dialog)
│   │   ├── app-manager/          # App manager sub-components (toolbar/table/detail/confirm)
│   │   └── display-settings/     # Display settings sub-components (presets/overscan/system params)
│   ├── composables/              # Composables (19 total, organized by module)
│   │   ├── useDevices.ts         # Device management core (WebSocket real-time + fallback polling, wireless)
│   │   ├── useWebSocket.ts       # WebSocket singleton client (reconnect, heartbeat, event dispatch)
│   │   ├── useAppStatus.ts       # Global refresh/sync status (status bar data source)
│   │   ├── useApps.ts            # App management
│   │   ├── useAppIcons.ts        # App icon extraction and cache
│   │   ├── useFiles.ts           # File management
│   │   ├── useLogs.ts            # Log viewer
│   │   ├── useShell.ts           # Shell terminal
│   │   ├── useScreenshot.ts      # Screenshot & recorder
│   │   ├── usePerformance.ts     # Performance monitor
│   │   ├── useCommandHistory.ts  # Command history (used by Shell terminal drawer)
│   │   ├── useTasks.ts           # Task center
│   │   ├── useDeviceReport.ts    # Device info report (embedded in Device Manager)
│   │   ├── useDisplay.ts         # Display settings
│   │   ├── useBattery.ts         # Battery management
│   │   ├── useControl.ts         # Device control (embedded in Script Automation)
│   │   ├── useScripts.ts         # Script automation
│   │   ├── useCommandLib.ts      # Command library (used by Shell terminal drawer)
│   │   └── useSettings.ts        # Settings
│   ├── types/                    # TypeScript type definitions
│   │   └── device.ts             # All device-related types (mirror Rust structs)
│   ├── views/                    # Page views (12 in use)
│   │   ├── DeviceManager.vue     # Device management (embedded report & wireless)
│   │   ├── AppManager.vue        # App management
│   │   ├── FileManager.vue       # File management
│   │   ├── LogViewer.vue         # Log viewer
│   │   ├── ShellTerminal.vue     # Shell terminal (embedded command lib/history drawers)
│   │   ├── ScreenshotRecorder.vue # Screenshot & recorder
│   │   ├── PerformanceMonitor.vue # Performance monitor
│   │   ├── TaskCenter.vue        # Task center
│   │   ├── DisplaySettings.vue   # Display settings
│   │   ├── BatterySimulator.vue  # Battery management
│   │   ├── ScriptAutomation.vue  # Script automation (embedded input & reboot)
│   │   └── Settings.vue          # Settings
│   ├── App.vue                   # App entry (currentView switching)
│   └── main.ts                   # Vue app initialization
├── src-tauri/                    # Tauri backend (Rust)
│   └── src/
│       ├── adb/                  # ADB communication module (15 sub-modules + mod.rs, 50+ commands)
│       │   ├── mod.rs            # Module entry (unified re-export)
│       │   ├── models.rs         # Data models
│       │   ├── helpers.rs        # Shared helper functions
│       │   ├── device.rs         # Device core (incl. wireless connection / QR pairing)
│       │   ├── apps.rs           # App management
│       │   ├── app_icons.rs      # App icon extraction
│       │   ├── files.rs          # File management
│       │   ├── batch.rs          # Batch operations
│       │   ├── m2.rs             # M2 power-user core (display/battery/control)
│       │   ├── m2_commands.rs    # M2 command builder pure functions
│       │   ├── m2_tests.rs       # M2 unit tests
│       │   ├── logs.rs           # Log viewer
│       │   ├── screenshot.rs     # Screenshot & recorder
│       │   ├── performance.rs    # Performance monitor
│       │   ├── history.rs        # Command history
│       │   └── report.rs         # Device info report
│       ├── task.rs               # Task framework (progress, cancellation)
│       ├── websocket.rs          # WebSocket real-time notification service
│       └── lib.rs                # App entry and command registration
├── ref/                          # Reference prototype (UI design, read-only)
├── doc/                          # Project documentation
├── img/                          # Required project image assets
└── tmp/                          # Temporary files (ignored by .gitignore)
```

> Note: `src/views/` still contains four legacy files — `CommandHistoryView.vue`, `CommandLibrary.vue`, `DeviceControl.vue`, `DeviceInfoReport.vue`. Their capabilities were merged into Shell Terminal, Script Automation, and Device Manager in v0.7.0; they are no longer referenced by `App.vue` and are kept only for historical reference.

---

## Coding Standards

### Rust (src-tauri/)

- ADB-related commands go in the corresponding module file under `adb/`, task-related in `task.rs`, WebSocket push in `websocket.rs`
- Data models use `#[derive(Serialize)]`, keep fields consistent with frontend TypeScript types
- `#[tauri::command]` functions use `snake_case` naming
- New commands must be registered in `lib.rs`'s `generate_handler!`
- Error handling returns `Result<_, String>`, use `map_err` for readable messages, avoid `unwrap()`

Example:

```rust
#[tauri::command]
pub async fn list_devices() -> Result<Vec<DeviceInfo>, String> {
    // ...
    server.list_devices()
        .map_err(|e| format!("Failed to get device list: {}", e))?
    // ...
}
```

### TypeScript / Vue (src/)

- Use Vue 3 `<script setup>` SFC with Composition API (`ref` / `computed` / `onMounted`)
- Device-related types go in `src/types/device.ts`, no duplicate definitions in components
- Backend calls go through composables (e.g., `useDevices`), keep the `isTauri()` mock fallback branch
- No magic numbers in components, define constants at top of composables
- Data sync should prefer the `useWebSocket` real-time push and automatically fall back to polling when unavailable (see the `syncDataMode` pattern in `useDevices`)

Example:

```typescript
const FALLBACK_POLLING_INTERVAL = 5000; // Fallback polling interval 5 seconds when WebSocket unavailable

export function useDevices() {
  const isTauri = () => !!(window as any).__TAURI_INTERNALS__;

  async function refreshDevices() {
    if (isTauri()) {
      return await invoke<DeviceInfo[]>('list_devices');
    } else {
      return mockDevices; // Browser fallback
    }
  }
}
```

### General

- Comments in Chinese
- Section comment style: `// ============` or `<!-- ============ -->`
- Do not modify code under `ref/`
- Do not write git-tracked content to `tmp/`

---

## Debugging

### Browser Mock Mode

```bash
pnpm dev
```

Frontend runs in browser with automatic mock data, no real device needed. Suitable for frontend UI development and debugging.

### Tauri DevTools

During desktop development, press `Ctrl+Shift+I` (Linux/Windows) or `Cmd+Option+I` (macOS) to open DevTools for debugging frontend code.

### Rust Logs

```bash
# View Rust backend logs
RUST_LOG=debug pnpm tauri dev
```

### TypeScript Type Checking

```bash
# Frontend build includes type checking
pnpm build

# Or run separately
npx vue-tsc --noEmit
```

---

## Common Tasks

### Adding a New Backend Command (5 Steps)

1. Define data model and `#[tauri::command]` function in the corresponding module file under `src-tauri/src/adb/` (e.g., `apps.rs`)
2. Register the command in `src-tauri/src/lib.rs`'s `generate_handler!`
3. Add corresponding TypeScript type in `src/types/device.ts`
4. Add `invoke` call in the corresponding composable with mock fallback
5. Integrate the call in the corresponding view

### Modifying UI

- View components are in `src/views/`
- Sidebar navigation items are in `src/components/AppSidebar.vue`'s `navItems` array
- Device data flows through `useDevices` composable

### Adding a New Feature Module

1. Create a new Vue component referencing existing views (e.g., `DeviceManager.vue`)
2. Import and add `v-else-if="currentView === 'xxx'"` branch in `src/App.vue`
3. Add navigation item in `src/components/AppSidebar.vue`'s `navItems`
4. Create corresponding composable (e.g., `useXxx.ts`)
5. If backend support is needed, follow the "5 Steps to Add Backend Command"

### Adjusting ADB Interaction

- Only modify the corresponding module under `src-tauri/src/adb/` (low-level library calls)
- Frontend calls through composables, usually no changes needed

---

## Build & Release

### Development Build

```bash
# Desktop development (Tauri window, connects to ADB service via adb_client library)
pnpm tauri dev

# Browser development (Mock mode, no adb needed)
pnpm dev
```

### Production Build

```bash
# Frontend build (includes vue-tsc type checking)
pnpm build

# Package desktop app (generates deb etc. on Linux)
pnpm tauri build
```

Build artifacts are located at `src-tauri/target/release/bundle/` (includes deb on Linux).

CI release (`.github/workflows/release.yml`) produces deb / AppImage (Linux), msi / dmg, etc. per platform and publishes to GitHub Releases. Each platform's bundle targets are passed by CI via the `--bundles` argument (`tauri.conf.json` no longer configures global targets).

### Version Management

- Version numbers are synchronized across `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`
- Update `CHANGELOG.md` when changing versions
- Follow [Semantic Versioning](https://semver.org/)
