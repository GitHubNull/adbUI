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

Currently offering **16 feature modules**:

| Module | One-line Description |
|--------|---------------------|
| Device Management | Auto-detect connected devices, display brand, model, Android version, etc. |
| App Management | View all installed apps, support uninstall, freeze, extract APK, etc. |
| File Manager | Browse device file system, support upload and download |
| Log Viewer | Real-time logcat output with level filtering |
| Shell Terminal | Interactive ADB Shell command execution with history and error highlighting |
| Screenshot & Recorder | Device screenshot preview/save, screen recording (limited on some devices) |
| Performance Monitor | Real-time CPU, memory usage and process list |
| Command History | Record all commands executed in this session, view and clear |
| Task Center | Batch operation (install/uninstall) progress tracking and management |
| Device Info Report | Aggregate getprop + dumpsys output for complete device information |
| Display Settings | View and modify screen resolution, density, overscan parameters |
| Battery Simulator | Simulate battery level, temperature and charging state |
| Device Control | Reboot to different modes, simulate tap/swipe/keyevent/text input |
| Script Automation | Multi-line ADB command script execution with loop support and progress tracking |
| Command Library | Bookmark frequently used commands for one-click execution |
| Settings | Theme switching, timeout settings, polling interval adjustment |

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
2. **WiFi Connection**: Ensure device and computer are on the same network. Use `adb tcpip 5555` + `adb connect <ip>:5555` (first time requires USB authorization)

### Interface Layout

adbUI is divided into two main areas:

- **Left Sidebar**: Navigation for 16 feature modules. Click to switch views.
- **Main Content Area**: Operation interface for the currently selected module.

On first launch, adbUI will automatically detect connected devices and display them on the "Device Management" page.

---

## Feature Modules

The following sections describe each module in sidebar order.

### 1. Device Management

- Auto-poll (default 3-second interval) for connected devices
- Display device ID, model, connection type (USB / WiFi)
- Click a device to view details: brand, Android version, SDK version, build number, battery level, etc.
- Click "Refresh" to manually refresh the device list

### 2. App Management

- View all installed apps with filtering by "All / User / System"
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
- **Upload**: Click upload button, select local file to push to current device directory
- **Download**: Select a file and click download to pull to local machine

### 4. Log Viewer

- Real-time capture of device logcat output
- Filter by log level (Verbose / Debug / Info / Warn / Error / Fatal)
- Auto-scroll with pause capability

### 5. Shell Terminal

- Interactive ADB Shell command execution
- Command history with up/down arrow key navigation
- Error output highlighted in red
- Type command and press Enter to execute, output displayed in real-time

### 6. Screenshot & Recorder

- **Screenshot**: Click "Screenshot" button to preview current device screen
- **Save Screenshot**: Click "Save" button, choose save path via system dialog (PNG format)
- **Screen Record**: Click "Start Recording" to begin, "Stop Recording" to end

> Note: Screen recording may be restricted by SELinux on Android 16+ unrooted devices. The app automatically detects support status and displays a warning.

### 7. Performance Monitor

- Real-time display of CPU usage, memory used/total, device temperature
- Process list showing CPU and memory usage per process
- Auto-refresh with manual refresh option

### 8. Command History

- Record all commands executed via Shell Terminal in this session
- Display command content, output, exit code and timestamp
- One-click clear history

### 9. Task Center

- View all batch tasks (batch install, batch uninstall)
- Real-time task progress display (progress bar and percentage)
- Support canceling running tasks
- Support clearing completed tasks
- Each task shows detailed success/failure results

### 10. Device Info Report

- Aggregate `getprop` and `dumpsys` output
- Display complete device info: model, brand, Android version, CPU architecture, serial number, battery status, display parameters, etc.

### 11. Display Settings

- View current screen resolution, density (DPI), overscan parameters
- Modify resolution and density (enter value and apply)
- Modify overscan (left/top/right/bottom)
- **Rollback on failure**: Automatically restore original values if setting fails
- Click "Reset to Default" to restore factory settings

> Warning: Setting incompatible resolution may cause display issues. The rollback mechanism automatically restores on error.

### 12. Battery Simulator

- View current real battery status: level percentage, temperature, charging state
- **Simulate Level**: Set any battery percentage (0-100)
- **Simulate Temperature**: Set battery temperature
- **Simulate Charging State**: Set charging/discharging/full state
- **Restore Real Battery**: Click to cancel all simulations

> Note: Battery simulation requires root permission. For development and testing only.

### 13. Device Control

- **Reboot Device**: Support reboot to system / recovery / bootloader / fastboot mode
- **Input Simulation**:
  - Tap: Simulate screen tap, enter X Y coordinates
  - Swipe: Simulate screen swipe, enter start and end coordinates
  - Keyevent: Simulate physical buttons (power, volume, etc.)
  - Text: Input text string to device

### 14. Script Automation

- Write multi-line ADB command scripts in the text area
- Support `loop` / `end` loop syntax
- Click "Execute" to start streaming execution, commands run sequentially
- Real-time line-level progress and output display
- Support "Stop" execution mid-way
- Support script import and export (text files)

### 15. Command Library

- Built-in common ADB command templates (view device info, clear app data, etc.)
- Bookmark frequently used commands for one-click execution
- Support adding, editing, and deleting custom commands
- Data persisted via localStorage

### 16. Settings

- **Theme Switching**: Light / Dark theme
- **Timeout Setting**: ADB command timeout duration
- **Polling Interval**: Auto-refresh interval for device list (default 3 seconds)
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
