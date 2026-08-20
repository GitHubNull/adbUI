# adbUI — Cross-Platform ADB UI Desktop App

**[中文文档](README.md) | English**

adbUI is a cross-platform ADB (Android Debug Bridge) UI desktop application built on **Tauri (Rust + Vue)**, providing a graphical interface for device management, device detail inspection, and ADB command execution — replacing tedious command-line operations.

## Features

- **Device Management**: Automatically detects and polls (3-second interval) connected Android devices, with USB / WiFi connection type recognition
- **Device Details**: Displays device brand, model, Android version, SDK version, build number, battery level, and more
- **ADB Command Execution**: Execute ADB shell commands directly from the UI and view the output
- **Browser Mock Mode**: The frontend detects the runtime environment via `isTauri()` and automatically falls back to built-in demo data when developing in a browser

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite + PrimeVue
- **Backend**: Tauri 2 (Rust) + tokio async runtime
- **ADB Communication**: The backend ADB communication module has deprecated the native command-line invocation approach in favor of the mature Rust open-source library [cocool97/adb_client](https://github.com/cocool97/adb_client) for low-level interaction, improving stability and performance

## UI Design Reference

The frontend UI design references the HTML/CSS/JS prototype in the [`ref/adbUITools_html_ui_design/`](ref/adbUITools_html_ui_design/) directory. That prototype is a pure frontend static page (built-in mock data, no real device connection) used to explore the layout and interaction patterns for device management, file browsing, log viewing, Shell command execution, screenshot/recording, and performance monitoring. It is kept as a UI design reference for this project.

## Project Structure

```
├── src/                    # Frontend source (Vue 3 + TypeScript)
│   ├── components/         # Shared components (e.g. AppSidebar.vue)
│   ├── composables/        # Composables (e.g. useDevices.ts)
│   ├── types/              # TypeScript type definitions (mirroring Rust structs)
│   └── views/              # Page views (e.g. DeviceManager.vue)
├── src-tauri/              # Tauri backend (Rust)
│   └── src/
│       ├── adb.rs          # ADB communication module (Tauri Commands)
│       └── lib.rs          # App entry and command registration
├── ref/
│   └── adbUITools_html_ui_design/  # UI design reference prototype (HTML/CSS/JS)
├── doc/                    # Project documentation
├── img/                    # Required image assets
└── tmp/                    # Temporary files (not tracked by git)
```

## Directory Conventions

- `doc/`: Project documentation (design docs, plans, notes) — stored here
- `img/`: Required project image assets — stored here
- `tmp/`: Temporary files (screenshots, logs, debug artifacts) — always placed here and ignored by git

## Development & Build

```bash
# Install dependencies
pnpm install

# Desktop development (launches Tauri window; requires adb on your machine)
pnpm tauri dev

# Browser development (Mock mode, no adb required)
pnpm dev

# Build frontend
pnpm build

# Build desktop app
pnpm tauri build
```

> Note: Running the desktop app requires `adb` (Android SDK Platform-Tools) installed locally and devices detectable via `adb devices`.

## License

This project is released under the [MIT License](LICENSE). Please read the [DISCLAIMER.md](DISCLAIMER.md) before using this project.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
