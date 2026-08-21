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
   useDevices.ts                     adb.rs
   useApps.ts                        task.rs
   ...                               lib.rs (command registration)
```

Communication flow:
1. Frontend calls backend commands via `invoke()` from `@tauri-apps/api`
2. Backend `lib.rs` registers all commands via `generate_handler!`
3. Command implementations are in `adb.rs` (ADB interaction) and `task.rs` (task framework)
4. Backend sends events to frontend via `Emitter` (e.g., `task-progress`, `script-progress`)

### Key Modules

| Module | File | Responsibility |
|--------|------|---------------|
| ADB Communication | `src-tauri/src/adb.rs` | All ADB-related Tauri command implementations |
| Task Framework | `src-tauri/src/task.rs` | Batch task creation, progress tracking, cancellation |
| Command Registration | `src-tauri/src/lib.rs` | Tauri app entry, command registration, plugin init |
| Device Core | `src/composables/useDevices.ts` | Device polling, detail fetching, command execution |
| View Entry | `src/App.vue` | View switching (currentView) and global state |
| Sidebar | `src/components/AppSidebar.vue` | Navigation menu definition |

### Event Mechanism

Backend sends events to frontend via Tauri's `Emitter`:

- **`task-progress`**: Batch task progress updates (`TaskInfo` struct)
- **`script-progress`**: Script execution progress (`ScriptProgress` struct with line number, status, message)

Frontend listens to these events via `listen()` and updates the UI.

---

## Project Structure

```
├── src/                          # Frontend source (Vue 3 + TypeScript)
│   ├── components/               # Shared components
│   │   └── AppSidebar.vue        # Sidebar navigation (16 module entries)
│   ├── composables/              # Composables (organized by module)
│   │   ├── useDevices.ts         # Device management core (polling, details, commands)
│   │   ├── useApps.ts            # App management
│   │   ├── useFiles.ts           # File management
│   │   ├── useLogs.ts            # Log viewer
│   │   ├── useShell.ts           # Shell terminal
│   │   ├── useScreenshot.ts      # Screenshot & recorder
│   │   ├── usePerformance.ts     # Performance monitor
│   │   ├── useCommandHistory.ts  # Command history
│   │   ├── useTasks.ts           # Task center
│   │   ├── useDeviceReport.ts    # Device info report
│   │   ├── useDisplay.ts         # Display settings
│   │   ├── useBattery.ts         # Battery simulator
│   │   ├── useControl.ts         # Device control
│   │   ├── useScripts.ts         # Script automation
│   │   ├── useCommandLib.ts      # Command library
│   │   └── useSettings.ts        # Settings
│   ├── types/                    # TypeScript type definitions
│   │   └── device.ts             # All device-related types (mirror Rust structs)
│   ├── views/                    # Page views (16 total)
│   │   ├── DeviceManager.vue     # Device management
│   │   ├── AppManager.vue        # App management
│   │   ├── FileManager.vue       # File management
│   │   ├── LogViewer.vue         # Log viewer
│   │   ├── ShellTerminal.vue     # Shell terminal
│   │   ├── ScreenshotRecorder.vue # Screenshot & recorder
│   │   ├── PerformanceMonitor.vue # Performance monitor
│   │   ├── CommandHistoryView.vue # Command history
│   │   ├── TaskCenter.vue        # Task center
│   │   ├── DeviceInfoReport.vue  # Device info report
│   │   ├── DisplaySettings.vue   # Display settings
│   │   ├── BatterySimulator.vue  # Battery simulator
│   │   ├── DeviceControl.vue     # Device control
│   │   ├── ScriptAutomation.vue  # Script automation
│   │   ├── CommandLibrary.vue    # Command library
│   │   └── Settings.vue          # Settings
│   ├── App.vue                   # App entry (currentView switching)
│   └── main.ts                   # Vue app initialization
├── src-tauri/                    # Tauri backend (Rust)
│   └── src/
│       ├── adb.rs                # ADB communication module (40+ commands)
│       ├── task.rs               # Task framework (progress, cancellation)
│       └── lib.rs                # App entry and command registration
├── ref/                          # Reference prototype (UI design, read-only)
├── doc/                          # Project documentation
├── img/                          # Required project image assets
└── tmp/                          # Temporary files (ignored by .gitignore)
```

---

## Coding Standards

### Rust (src-tauri/)

- ADB-related commands go in `adb.rs`, task-related in `task.rs`
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
- Backend calls go through composables (e.g., `useDevices`),保留 `isTauri()` mock fallback branch
- No magic numbers in components, define constants at top of composables

Example:

```typescript
const POLL_INTERVAL = 3000; // Poll interval 3 seconds

export function useDevices() {
  const isTauri = () => !!(window as any).__TAURI__;

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

1. Define data model and `#[tauri::command]` function in `src-tauri/src/adb.rs`
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

- Only modify `src-tauri/src/adb.rs` (low-level library calls)
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

# Package desktop app (generates deb installer)
pnpm tauri build
```

Build artifacts are located at `src-tauri/target/release/bundle/deb/`.

### Version Management

- Version numbers are synchronized across `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`
- Update `CHANGELOG.md` when changing versions
- Follow [Semantic Versioning](https://semver.org/)
