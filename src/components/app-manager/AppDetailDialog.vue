<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import type { AppInfo, AppDetail } from '../../types/device';

const props = defineProps<{
  visible: boolean;
  app: AppInfo | null;
  detail: AppDetail | null;
  loading: boolean;
  icon: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

// 空值占位（与列表"版本"列展示一致）
function orDash(value: string): string {
  return value || '—';
}

// 安装时间：系统预装应用无有效记录，Android 以默认占位时间返回，需过滤
const INVALID_INSTALL_TIME = '2009-01-01 08:00:00';
function formatInstallTime(value: string): string {
  if (!value || value.startsWith(INVALID_INSTALL_TIME)) return '—';
  return value;
}

// 字节数格式化为人类可读（B / KB / MB / GB），null 表示不可获取
function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// 合计占用：数据/缓存任一不可获取时不计（避免误导）
const totalSize = computed(() => {
  const d = props.detail;
  if (!d || d.data_size === null || d.cache_size === null) return null;
  return d.code_size + d.data_size + d.cache_size;
});

// 常见应用商店包名映射为可读名称（未收录则显示原始包名）
const STORE_NAMES: Record<string, string> = {
  'com.android.vending': 'Google Play',
  'com.xiaomi.market': '小米应用商店',
  'com.huawei.appmarket': '华为应用市场',
  'com.oppo.market': 'OPPO 软件商店',
  'com.oplus.market': 'OPPO 软件商店',
  'com.vivo.appstore': 'vivo 应用商店',
  'com.tencent.android.qqdownloader': '应用宝',
  'com.samsung.android.vending': 'Samsung Galaxy Store',
  'com.amazon.venezia': 'Amazon Appstore',
  'com.android.settings': '系统安装',
};

function storeName(pkg: string): string {
  if (!pkg) return '—';
  return STORE_NAMES[pkg] || pkg;
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    modal
    header="应用详情"
    :style="{ width: '560px' }"
  >
    <div v-if="app" class="app-detail">
      <!-- 头部：图标 + 应用名 + 包名 -->
      <div class="detail-header">
        <img v-if="icon" :src="icon" class="app-icon" alt="" />
        <div v-else class="app-icon app-icon-placeholder"><i class="pi pi-android"></i></div>
        <div class="header-text">
          <div class="app-name">{{ app.app_name }}</div>
        </div>
      </div>

      <!-- 基本信息（来自列表数据，即时展示） -->
      <div class="detail-section">
        <h4 class="detail-section-title">基本信息</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">应用名称</span>
            <span class="detail-value">{{ app.app_name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">包名</span>
            <span class="detail-value font-mono">{{ app.package_name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">版本名</span>
            <span class="detail-value">{{ orDash(app.version_name) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">版本号</span>
            <span class="detail-value">{{ orDash(app.version_code) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">应用类型</span>
            <span class="detail-value">
              <span
                class="type-badge"
                :class="app.is_system ? 'badge-system' : 'badge-user'"
              >
                <i :class="app.is_system ? 'pi pi-cog' : 'pi pi-user'"></i>
              </span>
              {{ app.is_system ? '系统应用' : '用户应用' }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">运行状态</span>
            <span class="detail-value">
              <Tag
                :value="app.is_enabled ? '已启用' : '已冻结'"
                :severity="app.is_enabled ? 'success' : 'danger'"
                class="status-tag"
              />
            </span>
          </div>
          <div class="detail-item detail-item-full">
            <span class="detail-label">安装路径</span>
            <span class="detail-value font-mono">{{ orDash(app.apk_path) }}</span>
          </div>
        </div>
      </div>

      <!-- 详情接口返回后展示扩展字段 -->
      <template v-if="detail">
        <!-- 存储占用 -->
        <div class="detail-section">
          <h4 class="detail-section-title">存储占用</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">APK 大小</span>
              <span class="detail-value">{{ formatSize(detail.code_size) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">数据大小</span>
              <span class="detail-value">{{ formatSize(detail.data_size) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">缓存大小</span>
              <span class="detail-value">{{ formatSize(detail.cache_size) }}</span>
            </div>
            <div v-if="totalSize !== null" class="detail-item">
              <span class="detail-label">合计占用</span>
              <span class="detail-value">{{ formatSize(totalSize) }}</span>
            </div>
          </div>
        </div>

        <!-- 安装与开发者信息 -->
        <div class="detail-section">
          <h4 class="detail-section-title">安装信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">安装来源</span>
              <span class="detail-value">
                {{ storeName(detail.installer_package) }}
                <span
                  v-if="STORE_NAMES[detail.installer_package]"
                  class="detail-sub font-mono"
                >{{ detail.installer_package }}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">UID</span>
              <span class="detail-value font-mono">{{ orDash(detail.uid) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">目标 SDK</span>
              <span class="detail-value">{{ orDash(detail.target_sdk) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">最低 SDK</span>
              <span class="detail-value">{{ orDash(detail.min_sdk) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">首次安装时间</span>
              <span class="detail-value">{{ formatInstallTime(detail.first_install_time) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">最近更新时间</span>
              <span class="detail-value">{{ formatInstallTime(detail.last_update_time) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 详情加载中 -->
      <div v-else-if="loading" class="detail-loading">
        <ProgressSpinner style="width: 32px; height: 32px" />
        <span>正在获取详细信息...</span>
      </div>
    </div>
    <template #footer>
      <Button label="关闭" text @click="emit('update:visible', false)" />
    </template>
  </Dialog>
</template>

<style scoped>
.app-detail {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* 头部：图标 + 名称，与表格行内展示风格一致 */
.detail-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.app-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: contain;
  flex-shrink: 0;
}

.app-icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-surface-100);
  color: var(--p-surface-500);
  font-size: 1.25rem;
}

.header-text {
  min-width: 0;
}

.app-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-text-color);
}

/* 详情分区：标题 + 两列网格 */
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-section-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.detail-item-full {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.detail-value {
  font-size: 0.875rem;
  color: var(--p-text-color);
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 安装来源的原始包名小字（仅在映射为商店名时显示） */
.detail-sub {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* 详情加载中 */
.detail-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.font-mono {
  font-family: 'Courier New', monospace;
}

.status-tag {
  font-size: 0.75rem;
}

/* 类型徽章：与表格行内徽章配色一致 */
.type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.badge-user {
  background: color-mix(in srgb, var(--p-emerald-500), transparent 85%);
  color: var(--p-emerald-500);
}

.badge-system {
  background: color-mix(in srgb, var(--p-sky-500), transparent 85%);
  color: var(--p-sky-500);
}
</style>
