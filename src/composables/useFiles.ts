import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { FileItem, AdbResult } from '../types/device';

// ============================================
// 环境检测
// ============================================

function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    (window as any).__TAURI_INTERNALS__ !== undefined;
}

// ============================================
// Mock 数据
// ============================================

const MOCK_FILE_TREE: Record<string, FileItem[]> = {
  '/sdcard/': [
    { name: 'DCIM', path: '/sdcard/DCIM', is_dir: true, size: 0, permissions: 'drwxrwx--x', modified_time: 'Jan 15 08:30' },
    { name: 'Download', path: '/sdcard/Download', is_dir: true, size: 0, permissions: 'drwxrwx--x', modified_time: 'Jan 14 12:00' },
    { name: 'Documents', path: '/sdcard/Documents', is_dir: true, size: 0, permissions: 'drwxrwx--x', modified_time: 'Jan 10 09:15' },
    { name: 'Pictures', path: '/sdcard/Pictures', is_dir: true, size: 0, permissions: 'drwxrwx--x', modified_time: 'Jan 12 16:45' },
    { name: 'Music', path: '/sdcard/Music', is_dir: true, size: 0, permissions: 'drwxrwx--x', modified_time: 'Jan 08 20:00' },
    { name: 'Movies', path: '/sdcard/Movies', is_dir: true, size: 0, permissions: 'drwxrwx--x', modified_time: 'Jan 05 11:30' },
    { name: 'test_file.txt', path: '/sdcard/test_file.txt', is_dir: false, size: 1024, permissions: '-rw-rw----', modified_time: 'Jan 15 10:22' },
    { name: 'backup.zip', path: '/sdcard/backup.zip', is_dir: false, size: 52428800, permissions: '-rw-rw----', modified_time: 'Jan 13 14:05' },
  ],
  '/sdcard/DCIM': [
    { name: 'Camera', path: '/sdcard/DCIM/Camera', is_dir: true, size: 0, permissions: 'drwxrwx--x', modified_time: 'Jan 15 08:30' },
    { name: 'Screenshots', path: '/sdcard/DCIM/Screenshots', is_dir: true, size: 0, permissions: 'drwxrwx--x', modified_time: 'Jan 14 18:20' },
  ],
  '/sdcard/Download': [
    { name: 'app-release.apk', path: '/sdcard/Download/app-release.apk', is_dir: false, size: 15728640, permissions: '-rw-rw----', modified_time: 'Jan 14 12:00' },
    { name: 'document.pdf', path: '/sdcard/Download/document.pdf', is_dir: false, size: 2097152, permissions: '-rw-rw----', modified_time: 'Jan 13 09:40' },
  ],
  '/sdcard/Pictures': [
    { name: 'photo1.jpg', path: '/sdcard/Pictures/photo1.jpg', is_dir: false, size: 2048576, permissions: '-rw-rw----', modified_time: 'Jan 15 14:30' },
    { name: 'screenshot.png', path: '/sdcard/Pictures/screenshot.png', is_dir: false, size: 512000, permissions: '-rw-rw----', modified_time: 'Jan 14 10:15' },
  ],
  '/sdcard/DCIM/Camera': [
    { name: 'IMG_001.jpg', path: '/sdcard/DCIM/Camera/IMG_001.jpg', is_dir: false, size: 3145728, permissions: '-rw-rw----', modified_time: 'Jan 15 09:20' },
  ],
};

const DEFAULT_PATH = '/sdcard/';

// 路径缓存（5秒过期）
const pathCache = new Map<string, { data: FileItem[]; timestamp: number }>();
const CACHE_TTL = 5000;

// 请求序号防止竞态
let fetchSeq = 0;

export function useFiles() {
  const files = ref<FileItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentPath = ref(DEFAULT_PATH);

  // 面包屑路径段
  const pathSegments = computed(() => {
    const segments = currentPath.value.split('/').filter(Boolean);
    return segments.map((seg, i) => ({
      name: seg,
      path: '/' + segments.slice(0, i + 1).join('/') + '/',
    }));
  });

  // ============================================
  // 目录浏览
  // ============================================

  async function fetchFiles(deviceId: string, path?: string) {
    const targetPath = path || currentPath.value;
    const cacheKey = `${deviceId}:${targetPath}`;
    const now = Date.now();

    // 检查缓存
    const cached = pathCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      files.value = cached.data;
      currentPath.value = targetPath;
      return;
    }

    const seq = ++fetchSeq;
    loading.value = true;
    error.value = null;

    try {
      if (isTauri()) {
        const result = await invoke<FileItem[]>('list_files', {
          deviceId,
          path: targetPath,
        });
        // 竞态检查：如果有序号更新的请求，丢弃当前结果
        if (seq !== fetchSeq) return;
        files.value = result;
        pathCache.set(cacheKey, { data: result, timestamp: now });
      } else {
        // 浏览器 mock 模式
        await new Promise((r) => setTimeout(r, 300));
        if (seq !== fetchSeq) return;
        files.value = MOCK_FILE_TREE[targetPath] || [];
        pathCache.set(cacheKey, { data: files.value, timestamp: now });
      }
      currentPath.value = targetPath;
    } catch (err) {
      if (seq !== fetchSeq) return;
      error.value = String(err);
      console.error('Failed to fetch files:', err);
      files.value = [];
    } finally {
      if (seq === fetchSeq) {
        loading.value = false;
      }
    }
  }

  function navigateTo(deviceId: string, path: string) {
    return fetchFiles(deviceId, path);
  }

  function navigateUp(deviceId: string) {
    const segments = currentPath.value.split('/').filter(Boolean);
    if (segments.length <= 1) {
      return fetchFiles(deviceId, '/');
    }
    const parentPath = '/' + segments.slice(0, -1).join('/') + '/';
    return fetchFiles(deviceId, parentPath);
  }

  // ============================================
  // 文件传输
  // ============================================

  async function pullFile(deviceId: string, remotePath: string, fileName: string): Promise<AdbResult | null> {
    if (isTauri()) {
      const localPath = await save({
        defaultPath: fileName,
      });
      if (!localPath) return null;

      return await invoke<AdbResult>('pull_file', {
        deviceId,
        remotePath,
        localPath,
      });
    }
    // Mock 模式
    await new Promise((r) => setTimeout(r, 500));
    return { stdout: `(Mock) File pulled: ${remotePath}`, stderr: '', exit_code: 0 };
  }

  async function pushFile(deviceId: string, remoteDir: string): Promise<AdbResult | null> {
    if (isTauri()) {
      const selected = await open({
        multiple: false,
      });
      if (!selected) return null;

      // 从本地路径提取文件名
      const fileName = selected.split('/').pop() || 'unknown';
      const remotePath = remoteDir.endsWith('/')
        ? `${remoteDir}${fileName}`
        : `${remoteDir}/${fileName}`;

      return await invoke<AdbResult>('push_file', {
        deviceId,
        localPath: selected,
        remotePath,
      });
    }
    // Mock 模式
    await new Promise((r) => setTimeout(r, 500));
    return { stdout: `(Mock) File pushed to ${remoteDir}`, stderr: '', exit_code: 0 };
  }

  // ============================================
  // 图片预览
  // ============================================

  const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

  function isImageFile(fileName: string): boolean {
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    return IMAGE_EXTENSIONS.includes(ext);
  }

  async function fetchImagePreview(deviceId: string, remotePath: string): Promise<string> {
    if (isTauri()) {
      const b64 = await invoke<string>('read_file_base64', {
        deviceId,
        remotePath,
      });
      // 根据扩展名确定 MIME 类型
      const ext = remotePath.toLowerCase().slice(remotePath.lastIndexOf('.'));
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml',
      };
      const mime = mimeMap[ext] || 'image/png';
      return `data:${mime};base64,${b64}`;
    }
    // Mock 模式：返回 1x1 像素透明 PNG
    await new Promise((r) => setTimeout(r, 300));
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  return {
    files,
    loading,
    error,
    currentPath,
    pathSegments,
    fetchFiles,
    navigateTo,
    navigateUp,
    pullFile,
    pushFile,
    isImageFile,
    fetchImagePreview,
  };
}
