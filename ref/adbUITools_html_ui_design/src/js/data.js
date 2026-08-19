// ============================================
// ADB UI - Mock Data
// ============================================

const mockDevice = {
  id: "emulator-5554",
  name: "Pixel 8 Pro",
  model: "Google Pixel 8 Pro",
  androidVersion: "14",
  apiLevel: 34,
  status: "connected",
  batteryLevel: 78,
  batteryCharging: true,
  screenResolution: "1344 x 2992",
  density: "480dpi",
  memory: "12 GB",
  storage: "256 GB",
  abi: "arm64-v8a",
  ipAddress: "192.168.1.105",
  tcpipPort: 5555
};

const mockDevices = [
  mockDevice,
  {
    id: "192.168.1.110:5555",
    name: "Xiaomi 14",
    model: "Xiaomi 23127PN0CC",
    androidVersion: "14",
    apiLevel: 34,
    status: "connected",
    batteryLevel: 45,
    batteryCharging: false,
    screenResolution: "1200 x 2670",
    density: "460dpi",
    memory: "16 GB",
    storage: "512 GB",
    abi: "arm64-v8a",
    ipAddress: "192.168.1.110",
    tcpipPort: 5555
  },
  {
    id: "emulator-5556",
    name: "Tablet Emulator",
    model: "Generic Android Tablet",
    androidVersion: "13",
    apiLevel: 33,
    status: "offline",
    batteryLevel: 0,
    batteryCharging: false,
    screenResolution: "2560 x 1600",
    density: "320dpi",
    memory: "8 GB",
    storage: "128 GB",
    abi: "x86_64",
    ipAddress: null,
    tcpipPort: null
  }
];

const mockApps = [
  {
    id: "com.android.chrome",
    name: "Chrome",
    packageName: "com.android.chrome",
    version: "120.0.6099.230",
    versionCode: 609923000,
    size: 156_780_000,
    installTime: "2024-01-15T08:30:00Z",
    updateTime: "2024-12-20T14:22:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "blue",
    permissions: ["INTERNET", "READ_EXTERNAL_STORAGE", "CAMERA"],
    activities: ["com.google.android.apps.chrome.Main"],
    dataSize: 245_600_000,
    cacheSize: 45_200_000
  },
  {
    id: "com.google.android.gm",
    name: "Gmail",
    packageName: "com.google.android.gm",
    version: "2024.11.24.123456",
    versionCode: 2024112412,
    size: 89_450_000,
    installTime: "2024-02-01T10:15:00Z",
    updateTime: "2024-12-18T09:45:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "red",
    permissions: ["INTERNET", "READ_CONTACTS", "READ_CALENDAR"],
    activities: ["com.google.android.gm.ConversationListActivityGmail"],
    dataSize: 520_300_000,
    cacheSize: 89_100_000
  },
  {
    id: "com.whatsapp",
    name: "WhatsApp",
    packageName: "com.whatsapp",
    version: "2.24.25.12",
    versionCode: 240025012,
    size: 67_230_000,
    installTime: "2023-08-20T16:45:00Z",
    updateTime: "2024-12-22T11:30:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "green",
    permissions: ["INTERNET", "READ_CONTACTS", "RECORD_AUDIO", "CAMERA", "READ_EXTERNAL_STORAGE"],
    activities: ["com.whatsapp.HomeActivity"],
    dataSize: 1250_000_000,
    cacheSize: 320_500_000
  },
  {
    id: "com.spotify.music",
    name: "Spotify",
    packageName: "com.spotify.music",
    version: "8.9.42.575",
    versionCode: 89425750,
    size: 45_670_000,
    installTime: "2023-11-05T20:00:00Z",
    updateTime: "2024-12-19T17:20:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "green",
    permissions: ["INTERNET", "READ_EXTERNAL_STORAGE", "FOREGROUND_SERVICE"],
    activities: ["com.spotify.music.MainActivity"],
    dataSize: 890_400_000,
    cacheSize: 156_700_000
  },
  {
    id: "com.instagram.android",
    name: "Instagram",
    packageName: "com.instagram.android",
    version: "326.0.0.32.93",
    versionCode: 326000032,
    size: 78_910_000,
    installTime: "2023-09-12T14:30:00Z",
    updateTime: "2024-12-21T10:15:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "purple",
    permissions: ["INTERNET", "CAMERA", "READ_EXTERNAL_STORAGE", "ACCESS_FINE_LOCATION"],
    activities: ["com.instagram.mainactivity.MainActivity"],
    dataSize: 2100_000_000,
    cacheSize: 450_200_000
  },
  {
    id: "com.android.settings",
    name: "设置",
    packageName: "com.android.settings",
    version: "14.0.0",
    versionCode: 34,
    size: 25_430_000,
    installTime: "2024-01-01T00:00:00Z",
    updateTime: "2024-01-01T00:00:00Z",
    isSystem: true,
    isEnabled: true,
    iconGradient: "teal",
    permissions: ["WRITE_SETTINGS", "WRITE_SECURE_SETTINGS"],
    activities: ["com.android.settings.Settings"],
    dataSize: 5_200_000,
    cacheSize: 1_800_000
  },
  {
    id: "com.google.android.youtube",
    name: "YouTube",
    packageName: "com.google.android.youtube",
    version: "19.46.42",
    versionCode: 1546421230,
    size: 52_340_000,
    installTime: "2023-10-01T09:00:00Z",
    updateTime: "2024-12-20T08:30:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "red",
    permissions: ["INTERNET", "READ_EXTERNAL_STORAGE", "RECORD_AUDIO"],
    activities: ["com.google.android.apps.youtube.app.WatchWhileActivity"],
    dataSize: 680_500_000,
    cacheSize: 234_100_000
  },
  {
    id: "com.tencent.mm",
    name: "WeChat",
    packageName: "com.tencent.mm",
    version: "8.0.53",
    versionCode: 2300,
    size: 234_560_000,
    installTime: "2023-06-15T12:00:00Z",
    updateTime: "2024-12-15T16:00:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "green",
    permissions: ["INTERNET", "READ_CONTACTS", "RECORD_AUDIO", "CAMERA", "ACCESS_FINE_LOCATION", "READ_EXTERNAL_STORAGE"],
    activities: ["com.tencent.mm.ui.LauncherUI"],
    dataSize: 3500_000_000,
    cacheSize: 890_600_000
  },
  {
    id: "com.netflix.mediaclient",
    name: "Netflix",
    packageName: "com.netflix.mediaclient",
    version: "8.138.0 build 12 51268",
    versionCode: 51268,
    size: 34_560_000,
    installTime: "2023-12-01T19:30:00Z",
    updateTime: "2024-12-10T14:00:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "red",
    permissions: ["INTERNET", "READ_EXTERNAL_STORAGE", "FOREGROUND_SERVICE"],
    activities: ["com.netflix.mediaclient.ui.launch.UIWebViewActivity"],
    dataSize: 450_200_000,
    cacheSize: 123_400_000
  },
  {
    id: "com.microsoft.office.word",
    name: "Microsoft Word",
    packageName: "com.microsoft.office.word",
    version: "16.0.17328.20036",
    versionCode: 1732820036,
    size: 98_760_000,
    installTime: "2024-03-10T11:20:00Z",
    updateTime: "2024-12-05T09:30:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "blue",
    permissions: ["INTERNET", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"],
    activities: ["com.microsoft.office.apphost.LaunchActivity"],
    dataSize: 156_300_000,
    cacheSize: 67_200_000
  },
  {
    id: "com.google.android.apps.maps",
    name: "Google Maps",
    packageName: "com.google.android.apps.maps",
    version: "11.136.0101",
    versionCode: 1113601010,
    size: 45_230_000,
    installTime: "2023-07-20T08:00:00Z",
    updateTime: "2024-12-18T12:00:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "green",
    permissions: ["INTERNET", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    activities: ["com.google.android.maps.MapsActivity"],
    dataSize: 780_400_000,
    cacheSize: 234_500_000
  },
  {
    id: "com.adobe.reader",
    name: "Adobe Acrobat Reader",
    packageName: "com.adobe.reader",
    version: "24.10.0.35812",
    versionCode: 240100358,
    size: 56_780_000,
    installTime: "2024-04-15T15:45:00Z",
    updateTime: "2024-12-12T10:30:00Z",
    isSystem: false,
    isEnabled: true,
    iconGradient: "red",
    permissions: ["INTERNET", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"],
    activities: ["com.adobe.reader.AdobeReader"],
    dataSize: 89_200_000,
    cacheSize: 34_100_000
  }
];

// ============================================
// Mock Data for Advanced Features
// ============================================

const mockLogcatEntries = [
  { time: "08:42:15.234", pid: 1234, tid: 5678, level: "I", tag: "ActivityManager", message: "Start proc 2847:com.android.chrome/u0a123 for activity {com.android.chrome/com.google.android.apps.chrome.Main}" },
  { time: "08:42:15.312", pid: 2847, tid: 2847, level: "D", tag: "Chrome", message: "Chrome onCreate() called" },
  { time: "08:42:15.456", pid: 1234, tid: 5678, level: "I", tag: "ActivityManager", message: "Displayed com.android.chrome/.MainActivity: +234ms" },
  { time: "08:42:16.123", pid: 2847, tid: 2860, level: "W", tag: "chromium", message: "[WARNING:dns_config_service_posix.cc(341)] Failed to read DnsConfig." },
  { time: "08:42:16.234", pid: 2847, tid: 2865, level: "E", tag: "chromium", message: "[ERROR:ssl_client_socket_impl.cc(982)] handshake failed; returned -1, SSL error code 1, net_error -200" },
  { time: "08:42:17.001", pid: 1234, tid: 5678, level: "I", tag: "ActivityManager", message: "Killing 1923:com.spotify.music/u0a145 (adj 905): empty #17" },
  { time: "08:42:17.234", pid: 1234, tid: 5680, level: "D", tag: "WindowManager", message: "Relayout Window{8a1b2c3d u0 com.android.chrome/com.google.android.apps.chrome.Main}: vis=0 relayoutAsync=0" },
  { time: "08:42:18.567", pid: 2847, tid: 2870, level: "V", tag: "Chrome", message: "TabModelSelectorImpl.onTabStateInitialized: mTabStateInitialized = true" },
  { time: "08:42:19.001", pid: 1234, tid: 5678, level: "W", tag: "ActivityManager", message: "Slow operation: 78ms so far, now at attachApplicationLocked" },
  { time: "08:42:20.123", pid: 2847, tid: 2880, level: "I", tag: "chromium", message: "Navigation to https://www.google.com completed" },
  { time: "08:42:21.456", pid: 1234, tid: 5682, level: "D", tag: "ConnectivityService", message: "NetReassign [100, 1, 0, 0]" },
  { time: "08:42:22.001", pid: 2847, tid: 2890, level: "W", tag: "chromium", message: "[WARNING:spdy_session.cc(3542)] Received RST_STREAM for stream 5" },
  { time: "08:42:23.234", pid: 1234, tid: 5678, level: "I", tag: "ActivityManager", message: "Start proc 3123:com.google.android.gms/u0a101 for service {com.google.android.gms/.location.history.HistoryUploadService}" },
  { time: "08:42:24.567", pid: 3123, tid: 3123, level: "D", tag: "GmsCore", message: "GCM HbAlarm scheduled for 900000ms" },
  { time: "08:42:25.001", pid: 1234, tid: 5684, level: "E", tag: "JavaBinder", message: "*** Uncaught remote exception! (Exceptions are not yet supported across processes.)" },
  { time: "08:42:26.123", pid: 2847, tid: 2900, level: "V", tag: "Chrome", message: "IntentDispatcher.dispatch: Intent { act=android.intent.action.VIEW dat=https://www.google.com/... flg=0x10000000 }" },
  { time: "08:42:27.456", pid: 1234, tid: 5678, level: "I", tag: "ActivityManager", message: "Process com.spotify.music (pid 1923) has died: prcp PER" },
  { time: "08:42:28.001", pid: 2847, tid: 2910, level: "D", tag: "chromium", message: "[INFO:CONSOLE(1)] \"Google Analytics loaded\", source: https://www.google.com/ (1)" },
  { time: "08:42:29.234", pid: 1234, tid: 5686, level: "W", tag: "BroadcastQueue", message: "Background execution not allowed: receiving Intent { act=android.intent.action.PACKAGE_CHANGED dat=package:com.android.chrome flg=0x4000010 (has extras) } to com.google.android.gms/.chimera.GmsIntentOperationService$GmsExternalReceiver" }
];

const mockFileSystem = [
  { name: "sdcard", type: "dir", size: 4096, permissions: "drwxrwx--x", owner: "root", group: "sdcard_rw", modified: "2024-12-20T10:00:00Z" },
  { name: "system", type: "dir", size: 4096, permissions: "drwxr-xr-x", owner: "root", group: "root", modified: "2024-01-01T00:00:00Z" },
  { name: "data", type: "dir", size: 4096, permissions: "drwxrwx--x", owner: "system", group: "system", modified: "2024-12-22T08:30:00Z" },
  { name: "storage", type: "dir", size: 4096, permissions: "drwxr-xr-x", owner: "root", group: "root", modified: "2024-12-20T10:00:00Z" },
  { name: "vendor", type: "dir", size: 4096, permissions: "drwxr-xr-x", owner: "root", group: "root", modified: "2024-01-01T00:00:00Z" },
  { name: "product", type: "dir", size: 4096, permissions: "drwxr-xr-x", owner: "root", group: "root", modified: "2024-01-01T00:00:00Z" },
  { name: "init.rc", type: "file", size: 28456, permissions: "-rwxr-x---", owner: "root", group: "shell", modified: "2024-01-01T00:00:00Z" },
  { name: "build.prop", type: "file", size: 8234, permissions: "-rwxr-x---", owner: "root", group: "shell", modified: "2024-01-01T00:00:00Z" }
];

const mockSdcardFiles = [
  { name: "DCIM", type: "dir", size: 4096, permissions: "drwxrwx--x", owner: "root", group: "sdcard_rw", modified: "2024-12-21T15:30:00Z" },
  { name: "Documents", type: "dir", size: 4096, permissions: "drwxrwx--x", owner: "root", group: "sdcard_rw", modified: "2024-12-18T09:15:00Z" },
  { name: "Download", type: "dir", size: 4096, permissions: "drwxrwx--x", owner: "root", group: "sdcard_rw", modified: "2024-12-22T11:00:00Z" },
  { name: "Movies", type: "dir", size: 4096, permissions: "drwxrwx--x", owner: "root", group: "sdcard_rw", modified: "2024-11-05T20:00:00Z" },
  { name: "Music", type: "dir", size: 4096, permissions: "drwxrwx--x", owner: "root", group: "sdcard_rw", modified: "2024-10-12T14:20:00Z" },
  { name: "Pictures", type: "dir", size: 4096, permissions: "drwxrwx--x", owner: "root", group: "sdcard_rw", modified: "2024-12-20T16:45:00Z" },
  { name: "app-debug.apk", type: "file", size: 15_234_567, permissions: "-rw-rw----", owner: "root", group: "sdcard_rw", modified: "2024-12-22T10:30:00Z" },
  { name: "backup_20241220.zip", type: "file", size: 234_567_890, permissions: "-rw-rw----", owner: "root", group: "sdcard_rw", modified: "2024-12-20T08:00:00Z" },
  { name: "screenshot_001.png", type: "file", size: 2_345_678, permissions: "-rw-rw----", owner: "root", group: "sdcard_rw", modified: "2024-12-21T14:22:00Z" },
  { name: "recording_20241221.mp4", type: "file", size: 156_780_000, permissions: "-rw-rw----", owner: "root", group: "sdcard_rw", modified: "2024-12-21T19:30:00Z" }
];

const mockCommandHistory = [
  { command: "adb devices", timestamp: "2024-12-22T08:30:00Z", output: "List of devices attached\nemulator-5554\tdevice\n192.168.1.110:5555\tdevice" },
  { command: "adb shell pm list packages", timestamp: "2024-12-22T08:32:00Z", output: "package:com.android.chrome\npackage:com.google.android.gm\npackage:com.whatsapp\n... (120 packages total)" },
  { command: "adb shell dumpsys battery", timestamp: "2024-12-22T08:35:00Z", output: "Current Battery Service state:\n  AC powered: false\n  USB powered: true\n  Wireless powered: false\n  Max charging current: 3000000\n  Max charging voltage: 5000000\n  Charge counter: 4123456\n  status: 2\n  health: 2\n  present: true\n  level: 78\n  scale: 100\n  voltage: 4201\n  temperature: 298\n  technology: Li-ion" },
  { command: "adb shell screencap -p /sdcard/screenshot.png", timestamp: "2024-12-22T08:40:00Z", output: "" },
  { command: "adb pull /sdcard/screenshot.png ./screenshots/", timestamp: "2024-12-22T08:41:00Z", output: "/sdcard/screenshot.png: 1 file pulled, 0 skipped. 2.3 MB/s (2345678 bytes in 0.987s)" },
  { command: "adb install app-debug.apk", timestamp: "2024-12-22T09:00:00Z", output: "Performing Streamed Install\nSuccess" },
  { command: "adb shell am start -n com.android.chrome/.MainActivity", timestamp: "2024-12-22T09:05:00Z", output: "Starting: Intent { cmp=com.android.chrome/.MainActivity }" },
  { command: "adb logcat -d | grep AndroidRuntime", timestamp: "2024-12-22T09:10:00Z", output: "12-22 09:10:15.234  1234  5678 E AndroidRuntime: FATAL EXCEPTION: main\n12-22 09:10:15.235  1234  5678 E AndroidRuntime: Process: com.example.app, PID: 1234" },
  { command: "adb shell top -n 1", timestamp: "2024-12-22T09:15:00Z", output: "User 12%, System 8%, IOW 0%, IRQ 0%\nPID USER     PR  NI CPU% S  #THR     VSS     RSS PCY Name\n2847 u0_a123  10 -10  15% S    45 3456789 2345672  FG com.android.chrome\n3123 u0_a101  10 -10   8% S    32 2345678 1234567  FG com.google.android.gms" },
  { command: "adb shell dumpsys meminfo com.android.chrome", timestamp: "2024-12-22T09:20:00Z", output: "Applications Memory Usage (in Kilobytes):\nUptime: 1234567890 Realtime: 1234567890\n** MEMINFO in pid 2847 [com.android.chrome] **\n                   Pss  Private  Private  SwapPss     Heap     Heap     Heap\n                 Total    Dirty    Clean    Dirty     Size    Alloc     Free\n                ------   ------   ------   ------   ------   ------   ------\n  Native Heap   123456   123456        0     2345   234567   123456   111111\n  Dalvik Heap    98765    98765        0     1234    87654    76543    11111" }
];

const mockPerformanceData = {
  cpu: { usage: [12, 15, 18, 22, 19, 25, 30, 28, 24, 20, 18, 16, 14, 20, 26, 32, 28, 22, 18, 15], average: 21 },
  memory: { used: 7.2, total: 12, apps: 4.5, system: 2.7 },
  network: { rx: [120, 145, 180, 220, 195, 250, 310, 280, 240, 200, 170, 150, 130, 190, 260, 320, 290, 230, 180, 160], tx: [45, 55, 70, 85, 75, 95, 120, 105, 90, 75, 65, 55, 50, 80, 110, 130, 115, 90, 70, 60] },
  fps: [58, 60, 59, 57, 60, 58, 59, 60, 56, 58, 60, 59, 57, 60, 58, 59, 60, 56, 58, 60],
  temperature: 34.5,
  processes: 245
};

let currentPath = "/sdcard";

// ============================================
// Mock Data for Task Center
// ============================================

const mockTasks = [
  {
    id: "task-001",
    name: "批量卸载应用",
    type: "batch-uninstall",
    status: "running",
    progress: 65,
    total: 10,
    success: 6,
    failed: 1,
    createTime: "2024-12-22T10:30:00Z",
    items: [
      { name: "Chrome", status: "success" },
      { name: "Gmail", status: "success" },
      { name: "WhatsApp", status: "success" },
      { name: "Spotify", status: "failed", error: "应用正在运行" },
      { name: "Instagram", status: "success" },
      { name: "YouTube", status: "success" },
      { name: "WeChat", status: "success" },
      { name: "Netflix", status: "pending" },
      { name: "Word", status: "pending" },
      { name: "Maps", status: "pending" }
    ]
  },
  {
    id: "task-002",
    name: "文件传输 - backup.zip",
    type: "file-push",
    status: "completed",
    progress: 100,
    total: 1,
    success: 1,
    failed: 0,
    createTime: "2024-12-22T09:15:00Z",
    fileSize: 234567890,
    speed: "2.3 MB/s"
  },
  {
    id: "task-003",
    name: "批量冻结应用",
    type: "batch-disable",
    status: "failed",
    progress: 30,
    total: 5,
    success: 1,
    failed: 2,
    createTime: "2024-12-22T08:45:00Z",
    items: [
      { name: "App1", status: "success" },
      { name: "App2", status: "failed", error: "权限不足" },
      { name: "App3", status: "failed", error: "系统应用" },
      { name: "App4", status: "cancelled" },
      { name: "App5", status: "cancelled" }
    ]
  }
];

// ============================================
// Mock Data for Device Info
// ============================================

const mockDeviceDetails = {
  basic: {
    model: "Google Pixel 8 Pro",
    manufacturer: "Google",
    brand: "google",
    device: "husky",
    serialNumber: "1A2B3C4D5E6F",
    androidVersion: "14",
    apiLevel: 34,
    buildNumber: "UP1A.231005.007",
    securityPatch: "2023-12-05"
  },
  hardware: {
    cpu: "Google Tensor G3",
    cpuCores: 9,
    cpuArch: "arm64-v8a",
    gpu: "Mali-G715",
    ram: "12 GB",
    storage: "256 GB",
    storageAvailable: "128 GB",
    screenResolution: "1344 x 2992",
    screenDensity: "480dpi",
    screenSize: "6.7 英寸"
  },
  battery: {
    level: 78,
    health: "良好",
    temperature: 34.5,
    voltage: 4201,
    technology: "Li-ion",
    chargingType: "USB",
    cycleCount: 245
  },
  network: {
    ipAddress: "192.168.1.105",
    macAddress: "A4:B1:C1:D2:E3:F4",
    wifiSsid: "MyHomeWiFi",
    wifiSignal: "优秀 (-45 dBm)",
    mobileData: "已启用",
    operator: "中国移动"
  },
  systemProps: [
    { key: "ro.build.fingerprint", value: "google/husky/husky:14/UP1A.231005.007/10754064:user/release-keys" },
    { key: "ro.product.model", value: "Pixel 8 Pro" },
    { key: "ro.product.brand", value: "google" },
    { key: "ro.build.version.sdk", value: "34" },
    { key: "ro.build.version.release", value: "14" },
    { key: "persist.sys.timezone", value: "Asia/Shanghai" },
    { key: "ro.product.locale", value: "zh-CN" }
  ]
};

// ============================================
// Mock Data for Settings
// ============================================

const mockSettings = {
  adb: {
    adbPath: "C:\\platform-tools\\adb.exe",
    defaultPort: 5555,
    connectTimeout: 10
  },
  ui: {
    theme: "light",
    language: "zh-CN",
    defaultView: "apps"
  },
  advanced: {
    logLevel: "info",
    autoRefreshInterval: 5,
    confirmDangerousOps: true
  }
};

// ============================================
// Mock Data for M2 玩机核心(P1)
// ============================================

// 1.1 分辨率/DPI + 1.2 过扫描 + 1.3 系统参数
const mockDisplayState = {
  size: "1344x2992",
  defaultSize: "1344x2992",
  density: 480,
  defaultDensity: 480,
  presets: {
    sizes: [
      { label: "原生", value: "1344x2992" },
      { label: "2K", value: "1440x3200" },
      { label: "1080P", value: "1080x2400" },
      { label: "720P", value: "720x1600" }
    ],
    densities: [
      { label: "原生", value: 480 },
      { label: "480", value: 480 },
      { label: "420", value: 420 },
      { label: "360", value: 360 },
      { label: "320", value: 320 }
    ]
  },
  overscan: { left: 0, top: 0, right: 0, bottom: 0 },
  overscanDefaults: { left: 0, top: 0, right: 0, bottom: 0 },
  animations: { window: 1.0, transition: 1.0, animator: 1.0 },
  fontScale: 1.0,
  lockTimeout: 5000
};

// 1.4 电池模拟(temperature 单位 0.1°C;status: 2=充电中 3=未充电 4=不充电 5=已充满)
const mockBatteryState = {
  real: {
    level: 78,
    temperature: 298,
    status: 2,
    voltage: 4201,
    acPowered: false,
    usbPowered: true
  },
  simulated: null
};

// 1.5 重启模式
const mockRebootModes = [
  { id: "system", name: "重启系统", command: "reboot", desc: "正常重启设备进入系统", danger: false },
  { id: "recovery", name: "Recovery", command: "reboot recovery", desc: "重启进入恢复模式", danger: false },
  { id: "bootloader", name: "Bootloader", command: "reboot bootloader", desc: "重启进入引导加载器", danger: false },
  { id: "fastboot", name: "Fastboot", command: "reboot fastboot", desc: "重启进入 Fastboot 模式(部分设备支持)", danger: true }
];

// 1.6 按键与输入模拟
const mockKeycodes = [
  { id: "home", name: "Home", keycode: "KEYCODE_HOME" },
  { id: "back", name: "返回", keycode: "KEYCODE_BACK" },
  { id: "recent", name: "最近任务", keycode: "KEYCODE_APP_SWITCH" },
  { id: "power", name: "电源", keycode: "KEYCODE_POWER" },
  { id: "vol-up", name: "音量 +", keycode: "KEYCODE_VOLUME_UP" },
  { id: "vol-down", name: "音量 -", keycode: "KEYCODE_VOLUME_DOWN" },
  { id: "mute", name: "静音", keycode: "KEYCODE_MUTE" },
  { id: "camera", name: "相机", keycode: "KEYCODE_CAMERA" },
  { id: "menu", name: "菜单", keycode: "KEYCODE_MENU" },
  { id: "search", name: "搜索", keycode: "KEYCODE_SEARCH" }
];

// 1.7 自动化脚本示例模板
const mockScriptTemplates = [
  {
    id: "demo-tap",
    name: "示例:点击与滑动",
    content: [
      "# 示例脚本:点击与滑动",
      "tap 540 1200",
      "sleep 500",
      "swipe 540 1200 540 400 300",
      "sleep 1000",
      "keyevent KEYCODE_HOME"
    ].join("\n")
  },
  {
    id: "demo-loop",
    name: "示例:循环点击",
    content: [
      "# 循环点击示例",
      "loop 3",
      "  tap 100 200",
      "  sleep 800",
      "end"
    ].join("\n")
  }
];

// 1.8 常用命令库(分类 + 命令模板)
const mockCommandLibrary = [
  {
    category: "设备信息",
    commands: [
      { name: "列出已连接设备", command: "devices -l" },
      { name: "查看设备型号", command: "shell getprop ro.product.model" },
      { name: "查看系统版本", command: "shell getprop ro.build.version.release" }
    ]
  },
  {
    category: "应用管理",
    commands: [
      { name: "列出全部应用包名", command: "shell pm list packages" },
      { name: "仅列出第三方应用", command: "shell pm list packages -3" },
      { name: "清除应用数据(示例)", command: "shell pm clear com.example.app" }
    ]
  },
  {
    category: "系统控制",
    commands: [
      { name: "重启设备", command: "reboot" },
      { name: "锁屏(电源键)", command: "shell input keyevent KEYCODE_POWER" }
    ]
  },
  {
    category: "显示调节",
    commands: [
      { name: "查看当前分辨率", command: "shell wm size" },
      { name: "查看当前密度", command: "shell wm density" },
      { name: "查看当前过扫描", command: "shell wm overscan" }
    ]
  },
  {
    category: "网络调试",
    commands: [
      { name: "开启 TCP/IP 调试(5555)", command: "tcpip 5555" },
      { name: "连接无线设备", command: "connect 192.168.1.100:5555" },
      { name: "查看 WLAN IP 地址", command: "shell ip addr show wlan0" }
    ]
  }
];
