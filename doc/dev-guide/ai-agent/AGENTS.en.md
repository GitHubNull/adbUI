# AGENTS.md

Project guide for AI coding assistants. Please read this document before modifying code in this repository.

## Project Overview

This project is the real implementation of **adbUI**, a cross-platform PC-side ADB (Android Debug Bridge) device management desktop application, built with Tauri (Rust + Vue). It provides device list management, device detail inspection, and ADB command execution capabilities.

**Relationship with `ref/` directory**: `ref/adbUITools_html_ui_design/` is a pure frontend UI design prototype (HTML/CSS/JS + mock data, no real device connection). It serves only as a reference for UI layout and interaction design, and is not part of the runtime source code. Do not treat it as the current application implementation.

## Core Architecture

Tauri Backend (Rust) + Vue Frontend (TypeScript), communicating via Tauri `invoke`:

```
Vue Frontend (src/)  --invoke-->  Rust Backend (src-tauri/src/)
   useDevices.ts                     adb.rs
   useApps.ts                        task.rs
   ...                               lib.rs (command registration)
```

- **Backend**: `src-tauri/src/adb.rs` defines `serde::Serialize` models like `DeviceInfo` / `DeviceDetail` / `AdbResult`, and implements 40+ `#[tauri::command]` functions; `task.rs` provides the task framework (batch operation progress tracking); `lib.rs` registers commands via `generate_handler!`. ADB low-level interaction uses the Rust library `adb_client` (see README tech stack section).
- **Frontend**: `src/composables/useDevices.ts` is the core composable for device-related operations (3-second polling, detail fetching, command execution). It detects the runtime environment via `isTauri()` — calls `invoke` inside Tauri, automatically falls back to mock data in browser for frontend-only debugging.
- **Types**: TypeScript types in `src/types/device.ts` must keep field consistency with Rust `Serialize` structs. Sync when backend models change.
- **Events**: Backend sends `task-progress` (batch task progress) and `script-progress` (script execution progress) events to frontend via `Emitter`.

## Complete Command Reference

All Tauri commands grouped by functionality (source: `src-tauri/src/lib.rs` `generate_handler!`):

### Device Core

| Command | Signature | Description |
|---------|-----------|-------------|
| `list_devices` | `() -> Vec<DeviceInfo>` | Get connected device list |
| `get_device_detail` | `device_id: String -> DeviceDetail` | Get device details |
| `execute_adb` | `device_id, command -> AdbResult` | Execute ADB shell command |

### App Management

| Command | Signature | Description |
|---------|-----------|-------------|
| `list_apps` | `device_id, filter -> Vec<AppInfo>` | List apps (all/user/system) |
| `uninstall_app` | `device_id, package -> AdbResult` | Uninstall app |
| `force_stop_app` | `device_id, package -> AdbResult` | Force stop app |
| `clear_app_data` | `device_id, package -> AdbResult` | Clear app data |
| `freeze_app` | `device_id, package -> AdbResult` | Freeze app |
| `unfreeze_app` | `device_id, package -> AdbResult` | Unfreeze app |
| `extract_apk` | `device_id, package, dest_path -> AdbResult` | Extract APK |
| `install_apk` | `device_id, local_path -> AdbResult` | Install APK |

### File Management

| Command | Signature | Description |
|---------|-----------|-------------|
| `list_files` | `device_id, path -> Vec<FileItem>` | List directory contents |
| `pull_file` | `device_id, remote_path, local_path -> AdbResult` | Download file |
| `push_file` | `device_id, local_path, remote_path -> AdbResult` | Upload file |

### Task Framework

| Command | Signature | Description |
|---------|-----------|-------------|
| `get_tasks` | `() -> Vec<TaskInfo>` | Get all tasks |
| `cancel_task` | `task_id -> ()` | Cancel task |
| `clear_completed_tasks` | `() -> ()` | Clear completed tasks |

### Batch Operations

| Command | Signature | Description |
|---------|-----------|-------------|
| `batch_uninstall` | `device_id, packages -> TaskInfo` | Batch uninstall |
| `batch_install` | `device_id, paths -> TaskInfo` | Batch install |

### M2 Power-User Core

| Command | Signature | Description |
|---------|-----------|-------------|
| `get_display_state` | `device_id -> DisplayState` | Get display state |
| `set_display` | `device_id, size?, density?, overscan? -> AdbResult` | Set display params |
| `reset_display` | `device_id -> AdbResult` | Reset display to default |
| `set_system_param` | `key, value -> AdbResult` | Set system parameter |
| `get_battery_state` | `device_id -> BatteryState` | Get battery state |
| `battery_simulate` | `device_id, level?, temp?, status? -> AdbResult` | Simulate battery |
| `battery_reset` | `device_id -> AdbResult` | Restore real battery |
| `reboot_device` | `device_id, mode -> AdbResult` | Reboot device |
| `send_input` | `device_id, action, params -> AdbResult` | Send input |
| `execute_script` | `device_id, script -> AdbResult` | Execute script |
| `get_device_report` | `device_id -> DeviceReport` | Device info report |

### Log Viewer

| Command | Signature | Description |
|---------|-----------|-------------|
| `get_device_logs` | `device_id, level?, limit? -> Vec<LogEntry>` | Get logs |

### Screenshot & Recorder

| Command | Signature | Description |
|---------|-----------|-------------|
| `take_screenshot` | `device_id -> ScreenshotResult` | Screenshot (base64 PNG) |
| `save_screenshot` | `device_id, path? -> AdbResult` | Save screenshot (dialog) |
| `check_screen_record_support` | `device_id -> bool` | Check screen record support |
| `start_screen_record` | `device_id -> AdbResult` | Start screen recording |
| `stop_screen_record` | `device_id -> AdbResult` | Stop screen recording |

### Performance Monitor

| Command | Signature | Description |
|---------|-----------|-------------|
| `get_performance_data` | `device_id -> PerformanceData` | Get performance data |

### Command History

| Command | Signature | Description |
|---------|-----------|-------------|
| `get_command_history` | `() -> Vec<CommandHistoryEntry>` | Get command history |
| `clear_command_history` | `() -> ()` | Clear command history |

## Common Commands

```bash
# Install dependencies
pnpm install

# Desktop development (Tauri window, connects to ADB service via adb_client library, no local adb needed)
pnpm tauri dev

# Browser development (Mock mode, no adb needed)
pnpm dev

# Frontend build (includes vue-tsc type checking)
pnpm build

# Package desktop app
pnpm tauri build
```

## Directory Structure

```
├── src/                    # Frontend source (Vue 3 + TypeScript)
│   ├── components/         # Shared components
│   ├── composables/        # Composables (16 total, organized by module)
│   ├── types/              # TS type definitions (device.ts centralized)
│   └── views/              # Page views (16 total)
├── src-tauri/              # Tauri backend (Rust)
│   └── src/
│       ├── adb.rs          # ADB communication module (Tauri Commands, 40+)
│       ├── task.rs         # Task framework (progress, cancellation, state mgmt)
│       └── lib.rs          # App entry and command registration
├── ref/                    # Reference prototype (UI design, read-only)
├── doc/                    # Project documentation
├── img/                    # Required project image assets
└── tmp/                    # Temporary files (ignored by .gitignore)
```

## Coding Standards

### Rust (src-tauri/)

- ADB-related commands go in `adb.rs`, task-related in `task.rs`
- Data models use `#[derive(Serialize)]`, `#[tauri::command]` functions use `snake_case`
- New commands must be registered in `lib.rs`'s `generate_handler!`
- Error handling returns `Result<_, String>`, use `map_err` for readable messages, avoid `unwrap()`

### TypeScript / Vue (src/)

- Use Vue 3 `<script setup>` SFC with Composition API (`ref` / `computed` / `onMounted`)
- Device-related types go in `src/types/device.ts`, no duplicate definitions in components
- Backend calls go through composables like `useDevices`,保留 `isTauri()` mock fallback branch (browser debugging depends on this)
- No magic numbers in components, define constants at top of composables

### General

- Comments in Chinese
- Section comment style: `// ============` or `<!-- ============ -->`
- Do not modify code under `ref/`

## Code Generation Patterns

### Composable Template

When adding a new feature module, composables should follow this pattern:

```typescript
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';

const IS_TAURI = () => !!(window as any).__TAURI__;

// Mock data (for browser debugging)
const mockData = { ... };

export function useXxx() {
  const data = ref(...);
  const loading = ref(false);

  async function fetchData(deviceId: string) {
    loading.value = true;
    try {
      if (IS_TAURI()) {
        data.value = await invoke('command_name', { device_id: deviceId });
      } else {
        data.value = mockData; // Browser fallback
      }
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, fetchData };
}
```

### #[tauri::command] Template

```rust
#[derive(Serialize)]
pub struct MyResult {
    pub field: String,
}

#[tauri::command]
pub async fn my_command(device_id: String) -> Result<MyResult, String> {
    let mut server = ADBServer::default();
    let device = server.get_device_by_name(&device_id)
        .map_err(|e| format!("Failed to get device: {}", e))?;

    // ... execute operation ...

    Ok(MyResult { field: "value".to_string() })
}
```

### Type Sync Rules

When modifying backend data models, sync frontend types:

1. Rust side: `#[derive(Serialize)]` struct fields
2. TS side: Corresponding interface in `src/types/device.ts`
3. Ensure field names, types, and optionality are consistent

## Automated Task Execution Guide

### Adding a New Backend Command (5 Steps)

| Step | Action | File |
|------|--------|------|
| 1 | Define model and `#[tauri::command]` | `src-tauri/src/adb.rs` |
| 2 | Register in `generate_handler!` | `src-tauri/src/lib.rs` |
| 3 | Add TypeScript type | `src/types/device.ts` |
| 4 | Add invoke call in composable with mock fallback | `src/composables/useXxx.ts` |
| 5 | Integrate in view | `src/views/Xxx.vue` |

### View Switching Pattern

When adding a new feature module, modify three places:

1. **App.vue**: Import component and add `v-else-if="currentView === 'xxx'"` branch
2. **AppSidebar.vue**: Add navigation item in `navItems` array
3. **Create**: `src/views/Xxx.vue` view component + `src/composables/useXxx.ts` composable

```typescript
// AppSidebar.vue navItems example
const navItems = [
  { label: 'Device Management', icon: 'pi pi-android', view: 'devices' },
  // ... add new item
  { label: 'New Module', icon: 'pi pi-star', view: 'new-module' },
];
```

## Common Tasks

| Task | Steps |
|------|-------|
| Add backend command | 1. Define model & `#[tauri::command]` in `adb.rs` 2. Register in `lib.rs` 3. Add TS type in `src/types/device.ts` 4. Add `invoke` in composable with mock fallback 5. Integrate in view |
| Modify UI | Views in `src/views/`, sidebar in `src/components/AppSidebar.vue`, device data flows through `useDevices` |
| Add feature module | Reference `App.vue`'s `currentView` switching pattern, sync sidebar nav items, create corresponding composable |
| Adjust ADB interaction | Only modify `src-tauri/src/adb.rs` (low-level library calls), frontend is unaffected |

## Known Pitfalls

### 1. Shell v1 Protocol Missing Exit Code

**Issue**: `adb_client`'s shell v1 protocol doesn't return exit codes. `AdbResult.exit_code` from `execute_adb` may be 0 even when the command actually failed.

**Root Cause**: adb_client shell_command returns `None` as exit code under v1 protocol, and the code defaults to 0.

**Fix Pattern**: Judge result by stdout/stderr content, not exit_code. See related commands in `adb.rs`.

**History**: Fixed in v0.3.1, affecting batch uninstall, command execution, etc.

### 2. System App Detection Using pkgFlags Not Path

**Issue**: Early versions detected system apps by APK path (checking `/system/`), causing misjudgment.

**Root Cause**: Some system apps aren't in `/system/`, and user app paths may contain similar strings.

**Fix Pattern**: Parse `pkgFlags` field, check for `SYSTEM` flag (compatible with both string flags and bitmask formats).

**History**: Fixed in v0.3.1, affecting `list_apps` command.

### 3. Screen Record Path and Permissions

**Issue**: Screen record file write to `/sdcard/` may fail due to permissions. ADB shell exit sends SIGHUP terminating the recording process.

**Fix Pattern**: Use `/data/local/tmp/` path (shell user writable), `setsid` to avoid SIGHUP, verify process exists after start, verify file exists and is non-empty when stopping.

**History**: Fixed in v0.6.0.

## Notes

- Do not write git-tracked content to `tmp/` (it's ignored); screenshots go to `doc/` or `img/`
- Documentation artifacts go to `doc/`
- README tech stack/dependency descriptions must stay consistent with backend implementation. Sync when ADB communication changes.
- When adding new dependencies, sync `package.json` / `Cargo.toml` and README tech stack section
