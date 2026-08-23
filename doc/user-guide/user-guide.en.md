# adbUI User Guide

> This document is for end users of adbUI. For developers, see the [Developer Guide](../dev-guide/human/developer-guide.en.md).

## Table of Contents

- [Introduction & Feature Overview](#introduction--feature-overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Feature Modules](#feature-modules)
- [Browser Mock Mode](#browser-mock-mode)
- [FAQ](#faq)

---

## Introduction & Feature Overview

adbUI is a cross-platform ADB (Android Debug Bridge) desktop application built on Tauri (Rust + Vue). It provides a graphical interface to replace tedious command-line operations for managing Android devices.

Currently offering **12 feature modules** (11 feature pages + Settings):

| Module | One-line Description |
|--------|---------------------|
| Device Management | Real-time detection of connected devices, wireless connection (QR pairing / manual / scan), detailed info and full report |
| App Management | View all installed apps, support uninstall, freeze, extract APK, icon display and detail dialog |
| File Manager | Browse device file system, support upload, download, type filtering and image preview |
| Log Viewer | Real-time logcat output with level / Tag / PID filtering and search |
| Shell Terminal | Interactive ADB Shell command execution with built-in command library and history drawers |
| Screenshot & Recorder | Device screenshot preview/save (auto-fit zoom), screen recording (limited on some devices) |
| Performance Monitor | Real-time CPU, memory, temperature and process list |
| Task Center | Batch operation (install/uninstall) progress tracking and management |
| Display Settings | View and modify resolution, density, overscan and system parameters (animation / font / lock timeout) |
| Battery Management | Simulate battery level, temperature and charging state, one-click restore |
| Script Automation | Multi-line ADB command script streaming execution with built-in input simulation and reboot |
| Settings | Theme switching, timeout settings, polling interval, icon cache directory |

---

## Installation

### System Dependencies

adbUI is built on Tauri 2. On Linux, the following system dependencies are required:

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev pkg-config

# Ensure Node.js (>= 18) and pnpm are installed
# See https://v2.tauri.app/start/prerequisites/
```

### Build from Source

```bash
# 1. Clone the repository
git clone <repository-url>
cd adbUI

# 2. Install frontend dependencies
pnpm install

# 3. Launch desktop app (development mode)
pnpm tauri dev

# 4. Build desktop app (generates .deb package)
pnpm tauri build
```

After building, the installer is located at `src-tauri/target/release/bundle/deb/`.

> Note: adbUI communicates with the ADB service directly via the Rust `adb_client` library. **No separate adb command-line tool installation is required** on your machine.

---

## Quick Start

### Connect Your Device

1. **USB Connection**: Enable "Developer Options" -> "USB Debugging" on your Android device, then connect via USB cable
2. **WiFi Connection**: Click the "Wireless Connect" button on the Device Management page and choose one of the dialog's options:
   - **QR Pairing**: Generate a pairing QR code, scan it with your phone to complete mDNS pairing and connection automatically (requires Android 11+)
   - **Manual Input**: Enter the device IP and port (default 5555) to connect (the device must first enable wireless debugging via `adb tcpip 5555`)
   - **Scan**: Automatically scan for ADB devices on the LAN and connect with one click

### Interface Layout

adbUI is divided into three main areas:

- **Left Sidebar**: Navigation for 12 feature modules (11 feature pages + Settings at the bottom). Click to switch views. Supports collapsing.
- **Main Content Area**: Operation interface for the currently selected module.
- **Bottom Status Bar**: Shows real-time data sync status (realtime / polling fallback), online device count with USB / WiFi statistics, running task count, and current view.

On first launch, adbUI will automatically detect connected devices and display them on the "Device Management" page.

---

## Feature Modules

The following sections describe each module in sidebar order.

### 1. Device Management

- Real-time device status detection via WebSocket push (auto fallback to 5-second polling when unavailable; polling pauses when the page is hidden)
- Display device ID, model, connection type (USB / WiFi), one-click disconnect for WiFi devices
- Click a device to view details: brand, Android version, SDK version, build number, battery level, etc.
- Expand "Full Report" in the detail panel: aggregates getprop and dumpsys, showing model, CPU ABI, serial number, battery, display parameters, etc. Exportable as JSON.
- Click "Wireless Connect" to open the connection dialog: QR pairing / manual IP:port / LAN scan tabs
- Click "Refresh" to manually refresh the device list

### 2. App Management

- View all installed apps with filtering by "All / User / System" and search
- Automatically extracts and displays app icons (on-device dex extractor, no root needed, local disk cache)
- **Double-click an app** to open the detail dialog: installer package, APK size, target SDK version, etc.
- **Uninstall**: Select an app and click uninstall (system apps require root)
- **Force Stop**: Immediately stop app execution
- **Clear Data**: Reset app data (equivalent to "Clear Storage")
- **Freeze / Unfreeze**: Disable/enable apps (system apps require root, use with caution)
- **Extract APK**: Export app APK to local machine
- **Install APK**: Select a local APK file to install on device
- **Batch Uninstall / Batch Install**: Track progress via Task Center

> Warning: Freezing system apps may cause device instability. Proceed with caution.

### 3. File Manager

- Browse device file system with directory navigation and breadcrumb path
- Filter by file type (image/video/audio/document/archive/APK; directories always shown)
- **Upload**: Click upload button, select local file to push to current device directory
- **Download**: Select a file and click download to pull to local machine
- **Image Preview**: Double-click an image file (within 10MB) to preview in a drawer with zoom

### 4. Log Viewer

- Real-time capture of device logcat output (snapshot mode, auto-refresh)
- Filter by log level (Verbose / Debug / Info / Warn / Error / Fatal)
- Filter by Tag and PID, plus text search
- Pause and clear support

### 5. Shell Terminal

- Interactive ADB Shell command execution
- Command history with up/down arrow key navigation
- Error output highlighted in red
- Type command and press Enter to execute, output displayed in real-time
- **Command Library Drawer**: Browse built-in command templates by category; bookmark, add, edit, delete custom commands; one-click execution
- **Command History Drawer**: Search, rerun, copy, and clear history

### 6. Screenshot & Recorder

- **Screenshot**: Automatically captured when entering the page or switching devices; also available via the "Screenshot" button
- **Preview**: Auto-fit zoom switch scales the screenshot proportionally to the container (scale capped at 1, no upscaling); when off, displays at original resolution 1:1 (scrollable). Preview simulates a phone frame with a zoom ratio badge.
- **Save Screenshot**: Click "Save" button, choose save path via system dialog (PNG format)
- **Screen Record**: Click "Start Recording" to begin, "Stop Recording" to end

> Note: Screen recording may be restricted by SELinux on Android 16+ unrooted devices. The app automatically detects support status and displays a warning.

### 7. Performance Monitor

- Real-time display of CPU usage (with history sparkline), memory used/total, device temperature
- Process list showing CPU and memory usage per process
- Auto-refresh with manual refresh option

### 8. Task Center

- View all batch tasks (batch install, batch uninstall)
- Real-time task progress display (progress bar and percentage)
- Support canceling running tasks
- Support clearing completed tasks
- Each task shows detailed success/failure results

### 9. Display Settings

- View current screen resolution, density (DPI), overscan parameters
- Built-in common resolution/density presets for one-click apply
- Modify overscan (left/top/right/bottom)
- **Rollback on failure**: Automatically restore original values if setting fails
- Click "Reset to Default" to restore factory settings
- **System Parameters**: Adjust animation speed, font scale, and screen lock timeout

> Warning: Setting incompatible resolution may cause display issues. The rollback mechanism automatically restores on error.

### 10. Battery Management

- View current real battery status: level percentage, temperature, charging state
- **Simulate Level**: Set any battery percentage (1-100)
- **Simulate Temperature**: Set battery temperature (20-60°C)
- **Simulate Charging State**: Set charging/discharging/full state
- **One-click Restore**: Cancel all simulations and restore real battery readings (with confirmation dialog)

> Note: Simulated state overrides the device's real battery readings; the battery display may look abnormal until restored. For development and testing only.

### 11. Script Automation

- Write multi-line ADB command scripts in the text area
- Support `loop` / `end` loop syntax
- Click "Execute" to start streaming execution, commands run sequentially
- Real-time line-level progress and output display
- Support "Stop" execution mid-way
- Support script import and export (text files)
- **Input Simulation**: tap, long-press, swipe (with duration), keyevent, text input — all with coordinate validation
- **Device Reboot**: Reboot to normal / recovery / bootloader mode (with confirmation dialog)

### 12. Settings

- **ADB Path**: Reserved field; leave empty to use the built-in adb_client library
- **Theme Switching**: Light / Dark theme
- **Timeout Setting**: Default ADB command timeout (1-120 seconds)
- **Polling Interval**: Fallback polling interval for device list (1000-30000 ms)
- **Icon Cache Directory**: App icon cache directory (relative path based on app launch working directory, default ./cache/icons), browsable via folder picker
- Settings persisted via localStorage

---

## Browser Mock Mode

If you don't have an Android device, you can still experience adbUI's interface via browser:

```bash
pnpm dev
```

In browser mode, device data is built-in mock data. Operations requiring real device interaction will show informational messages. This mode is primarily for frontend development and UI debugging.

---

## FAQ

### Q: Device not detected, list is empty?

- Ensure "USB Debugging" is enabled (in Developer Options)
- Ensure USB cable supports data transfer (some cables are charge-only)
- Allow USB debugging authorization popup on device
- Try re-plugging USB cable or restarting adbUI

### Q: Wireless connection fails?

- QR pairing requires Android 11+ and the device must be on the same LAN as the computer
- Before manual input, enable wireless debugging on the device via `adb tcpip 5555` (first time requires USB authorization)
- Scan-based discovery relies on LAN mDNS; some routers may block mDNS broadcast, try manual IP input instead
- Ensure the firewall does not block the adb port (default 5555)

### Q: Device status shows "Unauthorized"?

- On device, revoke all USB debugging authorizations, then re-plug and re-authorize
- Ensure device screen is unlocked

### Q: Screen record button is disabled?

- Android 16+ unrooted devices may be restricted by SELinux
- The app automatically detects and displays a warning
- Rooted devices are usually not affected

### Q: Device unstable after freezing system app?

- Freezing system apps is risky and may cause instability or boot failure
- If issues occur, restore via command line: `adb shell pm enable <package>`

### Q: Performance monitor data not updating?

- Ensure device is connected and status is Online
- Some devices may not support certain metrics, displayed as N/A

### Q: How to switch language?

- Current UI is in Chinese. Documentation is available in both Chinese and English
- UI language switching will be added in a future version
