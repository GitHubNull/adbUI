import type { DeviceReport } from '../types/device';
import { invoke } from '@tauri-apps/api/core';

// ============================================
// 设备报告导出：格式生成与下载/写盘
// 支持 JSON / Markdown / HTML（单文件）/ TXT 四种格式
// ============================================

/** 导出格式 */
export type ReportFormat = 'json' | 'markdown' | 'html' | 'txt';

/** 格式展示信息（供 UI 勾选项使用） */
export const REPORT_FORMATS: { value: ReportFormat; label: string; ext: string }[] = [
  { value: 'json', label: 'JSON', ext: 'json' },
  { value: 'markdown', label: 'Markdown', ext: 'md' },
  { value: 'html', label: 'HTML（单文件）', ext: 'html' },
  { value: 'txt', label: '纯文本 (TXT)', ext: 'txt' },
];

/** 判断是否运行于 Tauri 桌面环境（与项目其他模块一致：检测 __TAURI_INTERNALS__） */
export function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

// ============================================
// 标签映射（UI 展示与导出复用）
// ============================================

/** 电池充电状态码 -> 中文 */
export function batteryStatusLabel(s?: number): string {
  const map: Record<number, string> = { 2: '充电中', 3: '未充电', 4: '不充电', 5: '已充满' };
  return s !== undefined ? map[s] || `状态码 ${s}` : '-';
}

/** 电池健康度码 -> 中文 */
export function batteryHealthLabel(h?: number): string {
  const map: Record<number, string> = {
    1: '未知', 2: '良好', 3: '过热', 4: '过期', 5: '过压', 6: '电流过大', 7: '未指定',
  };
  return h !== undefined ? map[h] || `状态码 ${h}` : '-';
}

/** KB -> GB 字符串（保留 1 位小数；0 表示未知） */
export function kbToGb(kb: number): string {
  if (!kb) return '-';
  return `${(kb / 1024 / 1024).toFixed(1)} GB`;
}

/** 温度（0.1°C 单位整数）-> "35.0°C" */
export function temperatureLabel(t: number): string {
  return `${(t / 10).toFixed(1)}°C`;
}

/** 电压（mV）-> "4.23 V"；未采集时返回 "-" */
export function voltageLabel(v?: number): string {
  return v !== undefined ? `${(v / 1000).toFixed(2)} V` : '-';
}

// ============================================
// 报告分节数据（Markdown / HTML 共用）
// ============================================

interface ReportSection {
  title: string;
  rows: [string, string][];
}

/** 将报告聚合为统一的分节键值数据 */
export function buildReportSections(report: DeviceReport): ReportSection[] {
  const sections: ReportSection[] = [];

  sections.push({
    title: '基本信息',
    rows: [
      ['型号', report.model],
      ['品牌', report.brand],
      ['Android 版本', report.android_version],
      ['SDK 版本', report.sdk_version],
      ['构建号', report.build_number],
      ['产品名', report.product],
      ['设备代号', report.device],
      ['序列号', report.serial],
    ],
  });

  if (report.hardware) {
    const h = report.hardware;
    sections.push({
      title: '硬件信息',
      rows: [
        ['硬件平台', h.cpu_hardware || '-'],
        ['CPU 核心数', h.cpu_cores ? String(h.cpu_cores) : '-'],
        ['CPU ABI', h.cpu_abi || '-'],
        ['总内存', kbToGb(h.memory_total_kb)],
        ['可用内存', kbToGb(h.memory_available_kb)],
        ['存储总量', kbToGb(h.storage_total_kb)],
        ['存储可用', kbToGb(h.storage_available_kb)],
      ],
    });
  }

  if (report.battery) {
    const b = report.battery;
    sections.push({
      title: '电池信息',
      rows: [
        ['电量', `${b.level}%`],
        ['温度', temperatureLabel(b.temperature)],
        ['充电状态', batteryStatusLabel(b.status)],
        ['健康度', batteryHealthLabel(b.health)],
        ['电压', voltageLabel(b.voltage)],
        ['电池技术', b.technology || '-'],
      ],
    });
  }

  if (report.network) {
    const n = report.network;
    sections.push({
      title: '网络信息',
      rows: [
        ['连接方式', n.connection_type === 'wifi' ? 'WiFi' : 'USB'],
        ['网络接口', n.interface],
        ['IP 地址', n.ip_address || '-'],
        ['MAC 地址', n.mac_address || '-'],
      ],
    });
  }

  if (report.display) {
    const d = report.display;
    sections.push({
      title: '显示信息',
      rows: [
        ['当前分辨率', d.size],
        ['出厂分辨率', d.default_size],
        ['当前密度', `${d.density}dpi`],
        ['出厂密度', `${d.default_density}dpi`],
        ['过扫描', d.overscan.join(',')],
      ],
    });
  }

  return sections;
}

// ============================================
// 格式生成
// ============================================

/** 生成格式化 JSON */
export function generateJson(report: DeviceReport): string {
  return JSON.stringify(report, null, 2);
}

/** 生成 Markdown 报告（分节标题 + 表格） */
export function generateMarkdown(report: DeviceReport): string {
  const lines: string[] = [];
  lines.push(`# 设备信息报告 - ${report.model}`);
  lines.push('');
  lines.push(`> 序列号：${report.serial} ｜ 生成时间：${new Date().toLocaleString()}`);
  lines.push('');
  for (const section of buildReportSections(report)) {
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push('| 项目 | 值 |');
    lines.push('| --- | --- |');
    for (const [k, v] of section.rows) {
      lines.push(`| ${k} | ${v} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** HTML 转义，防止值中的特殊字符破坏结构 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 生成单文件 HTML 报告（内嵌 CSS，无外部依赖） */
export function generateHtml(report: DeviceReport): string {
  const sections = buildReportSections(report)
    .map((section) => {
      const rows = section.rows
        .map(([k, v]) => `        <div class="kv"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`)
        .join('\n');
      return `      <div class="card">\n        <h3>${escapeHtml(section.title)}</h3>\n${rows}\n      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>设备信息报告 - ${escapeHtml(report.model)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; background: #f3f4f6; color: #1f2937; }
  header { background: #1e293b; color: #fff; padding: 24px 32px; text-align: center; }
  header h1 { font-size: 1.4rem; font-weight: 600; }
  header p { margin-top: 6px; font-size: 0.85rem; color: #94a3b8; }
  main { max-width: 960px; margin: 0 auto; padding: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
  .card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; color: #0f766e; }
  .kv { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font-size: 0.9rem; }
  .kv + .kv { border-top: 1px dashed #f1f5f9; }
  .k { color: #6b7280; flex-shrink: 0; }
  .v { font-weight: 500; text-align: right; word-break: break-all; }
  footer { text-align: center; padding: 16px; font-size: 0.75rem; color: #9ca3af; }
</style>
</head>
<body>
  <header>
    <h1>设备信息报告 - ${escapeHtml(report.brand)} ${escapeHtml(report.model)}</h1>
    <p>序列号：${escapeHtml(report.serial)} ｜ Android ${escapeHtml(report.android_version)} ｜ 生成时间：${new Date().toLocaleString()}</p>
  </header>
  <main>
${sections}
  </main>
  <footer>由 adbUI 生成</footer>
</body>
</html>
`;
}

/** 生成纯文本 TXT 报告（分节键值，便于终端/记事本阅读） */
export function generateText(report: DeviceReport): string {
  const sep = '='.repeat(64);
  const lines: string[] = [
    sep,
    `        设备信息报告 — ${report.brand} ${report.model}`,
    sep,
    `序列号：${report.serial}`,
    `报告时间：${new Date().toLocaleString()}`,
    '',
  ];
  for (const section of buildReportSections(report)) {
    lines.push(`【${section.title}】`);
    for (const [k, v] of section.rows) lines.push(`  ${k}：${v}`);
    lines.push('');
  }
  return lines.join('\n');
}

// ============================================
// 下载 / 写盘
// ============================================

const MIME_TYPES: Record<ReportFormat, string> = {
  json: 'application/json',
  markdown: 'text/markdown',
  html: 'text/html',
  txt: 'text/plain',
};

const GENERATORS: Record<ReportFormat, (r: DeviceReport) => string> = {
  json: generateJson,
  markdown: generateMarkdown,
  html: generateHtml,
  txt: generateText,
};

/** 时间戳后缀（如 20260901-153012），避免同秒导出多格式覆盖 */
function timestampSuffix(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** 生成报告文件名（含时间戳） */
export function reportFileName(serial: string, ext: string): string {
  return `device-report-${serial || 'unknown'}-${timestampSuffix()}.${ext}`;
}

/** 生成指定格式报告内容并触发浏览器下载 */
export function downloadReport(report: DeviceReport, format: ReportFormat): void {
  const meta = REPORT_FORMATS.find((f) => f.value === format)!;
  const content = GENERATORS[format](report);
  const blob = new Blob([content], { type: `${MIME_TYPES[format]};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = reportFileName(report.serial, meta.ext);
  a.click();
  URL.revokeObjectURL(url);
}

/** Tauri 桌面环境：将指定格式报告写入用户所选目录，返回完整文件路径 */
export async function saveReportToDir(
  report: DeviceReport,
  format: ReportFormat,
  dir: string
): Promise<string> {
  const meta = REPORT_FORMATS.find((f) => f.value === format);
  if (!meta) throw new Error(`未知导出格式: ${format}`);
  const path = `${dir.replace(/\/+$/, '')}/${reportFileName(report.serial, meta.ext)}`;
  await invoke('save_report_file', { path, content: GENERATORS[format](report) });
  return path;
}
