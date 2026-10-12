<template>
  <div class="operation-log-page">
    <!-- 统一工具栏 -->
    <div class="toolbar">
      <h1 class="page-title">
        {{ $t('system.operationLogs.title') }}
      </h1>
      <div class="toolbar-filters">
        <select
          v-model="filters.action"
          class="filter-select"
          @change="loadData(1)"
        >
          <option value="">
            {{ $t('system.operationLogs.allActions') }}
          </option>
          <option value="GET">
            GET
          </option>
          <option value="POST">
            POST
          </option>
          <option value="PUT">
            PUT
          </option>
          <option value="PATCH">
            PATCH
          </option>
          <option value="DELETE">
            DELETE
          </option>
        </select>
        <select
          v-model="filters.status"
          class="filter-select"
          @change="loadData(1)"
        >
          <option value="">
            {{ $t('system.operationLogs.allStatus') }}
          </option>
          <option value="success">
            {{ $t('system.operationLogs.statusSuccess') }}
          </option>
          <option value="error">
            {{ $t('system.operationLogs.statusError') }}
          </option>
        </select>
        <input
          v-model="filters.username"
          class="filter-input"
          :placeholder="$t('system.operationLogs.placeholderUser')"
          @keyup.enter="loadData(1)"
        >
        <TimeRangePicker
          v-model="filters.dateRange"
          mode="date"
          size="sm"
          @change="loadData(1)"
        />
      </div>
      <div class="toolbar-actions">
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="openCleanExpiredDialog"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          {{ $t('system.operationLogs.cleanExpired') }}
        </button>
        <button
          class="sys-btn sys-btn-danger sys-btn-sm"
          @click="handleCleanAll"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          {{ $t('system.operationLogs.cleanAll') }}
        </button>
      </div>
    </div>

    <!-- 表格 -->
    <SmartTable
      table-id="operation-logs"
      :data="logs"
      :columns="operationLogColumns"
      :loading="loading"
      :pagination="paginationConfig"
      :empty-text="$t('system.operationLogs.empty')"
      :show-column-toggle="true"
      :show-export="true"
      :show-refresh="true"
      @page-change="onPageChange"
      @refresh="() => loadData(page)"
      @row-click="handleRowClick"
    >
      <template #cell-action="{ row }">
        <div class="action-cell">
          <span
            class="badge-method"
            :class="'method-' + getMethod(row.action)"
          >{{ getMethod(row.action) }}</span>
          <span class="action-url">{{ getUrl(row.action) }}</span>
        </div>
      </template>
      <template #cell-status="{ row }">
        <span
          class="badge-status"
          :class="'status-' + row.status"
        >
          {{ row.status === 'success' ? $t('system.operationLogs.statusSuccess') : $t('system.operationLogs.statusError') }}
        </span>
      </template>
      <template #cell-user="{ row }">
        <div class="user-cell">
          <span class="user-name">{{ row.username || '-' }}</span>
          <span
            v-if="row.userId"
            class="user-id"
          >{{ row.userId }}</span>
        </div>
      </template>
      <template #cell-duration="{ row }">
        <span class="mono">{{ formatDuration(row.details) }}</span>
      </template>
    </SmartTable>

    <!-- 行点击提示 -->
    <div
      v-if="logs.length > 0 && !selectedLog"
      class="click-hint"
    >
      {{ $t('system.operationLogs.clickToView') }}
    </div>

    <!-- 请求详情面板 -->
    <div
      v-if="selectedLog"
      class="detail-panel"
    >
      <div class="detail-header">
        <h3 class="detail-title">
          {{ $t('system.operationLogs.detailTitle') }}
        </h3>
        <button
          class="detail-close"
          @click="selectedLog = null"
        >
          ×
        </button>
      </div>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.operationLogs.detailMethod') }}</span>
          <span
            class="badge-method"
            :class="'method-' + getMethod(selectedLog.action)"
          >{{ getMethod(selectedLog.action) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.operationLogs.detailUrl') }}</span>
          <span class="detail-value mono">{{ getUrl(selectedLog.action) }}</span>
        </div>
        <div
          v-if="selectedLog.resourceId"
          class="detail-item"
        >
          <span class="detail-label">{{ $t('system.operationLogs.detailResourceId') }}</span>
          <span class="detail-value mono">{{ selectedLog.resourceId }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.operationLogs.detailUser') }}</span>
          <span class="detail-value">{{ selectedLog.username || '-' }} <span
            v-if="selectedLog.userId"
            class="mono"
          >({{ selectedLog.userId }})</span></span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.operationLogs.detailIp') }}</span>
          <span class="detail-value mono">{{ selectedLog.ip || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.operationLogs.detailUserAgent') }}</span>
          <span class="detail-value detail-ua">{{ selectedLog.userAgent || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.operationLogs.detailStatus') }}</span>
          <span
            class="badge-status"
            :class="'status-' + selectedLog.status"
          >{{ selectedLog.status === 'success' ? $t('system.operationLogs.statusSuccess') : $t('system.operationLogs.statusError') }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.operationLogs.detailDuration') }}</span>
          <span class="detail-value mono">{{ formatDuration(selectedLog.details) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.operationLogs.detailTime') }}</span>
          <span class="detail-value">{{ formatTime(selectedLog.createdAt) }}</span>
        </div>
      </div>
      <div class="detail-body-section">
        <span class="detail-label">{{ $t('system.operationLogs.detailBody') }}</span>
        <pre
          v-if="extractBody(selectedLog)"
          class="detail-body-code"
        >{{ extractBody(selectedLog) }}</pre>
        <span
          v-else
          class="detail-body-empty"
        >{{ $t('system.operationLogs.detailBodyEmpty') }}</span>
      </div>
    </div>

    <!-- 清理过期日志对话框 -->
    <div
      v-if="showCleanExpiredDialog"
      class="modal-overlay"
      @click.self="closeCleanExpiredDialog"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ $t('system.operationLogs.cleanExpiredTitle') }}
          </h3>
          <button
            class="modal-close"
            @click="closeCleanExpiredDialog"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-prompt">
            {{ $t('system.operationLogs.cleanExpiredPrompt') }}
          </p>
          <input
            v-model.number="cleanDays"
            type="number"
            min="1"
            class="modal-input"
          >
        </div>
        <div class="modal-footer">
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="closeCleanExpiredDialog"
          >
            {{ $t('system.operationLogs.cancel') }}
          </button>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            :disabled="cleaning || !cleanDays || cleanDays < 1"
            @click="handleCleanExpired"
          >
            {{ cleaning ? $t('system.operationLogs.processing') : $t('system.operationLogs.cleanExpired') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { systemApi } from '../../api/modules/system.api';
import { SmartTable } from '../../components/smart-table';
import type { SmartTableColumn, PaginationConfig, PageChangeEvent } from '../../components/smart-table';
import { showConfirm, showSuccess, showError } from '../../utils/messageBox';
import { TimeRangePicker } from '@scada-editor/shared';
import type { TimeRange } from '@scada-editor/shared';
import type { OperationLog } from '../../api/types/api';

const { t } = useI18n();

const loading = ref(false);
const logs = ref<OperationLog[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const filters = reactive({
  action: '',
  status: '',
  username: '',
  dateRange: { start: '', end: '' } as TimeRange,
});

// 清理过期日志对话框状态
const showCleanExpiredDialog = ref(false);
const cleanDays = ref(30);
const cleaning = ref(false);

// 选中行详情
const selectedLog = ref<OperationLog | null>(null);

function handleRowClick(row: OperationLog) {
  selectedLog.value = selectedLog.value?.id === row.id ? null : row;
}

/** 从 action 字段提取 HTTP 方法（action 格式："GET /api/v1/projects"） */
function getMethod(action: string): string {
  if (!action) return '-';
  return action.split(' ')[0] || '-';
}

/** 从 action 字段提取 URL 路径 */
function getUrl(action: string): string {
  if (!action) return '';
  const idx = action.indexOf(' ');
  return idx >= 0 ? action.substring(idx + 1) : action;
}

/** 从 details 字段提取耗时信息（格式："Duration: 0ms" 或 "error msg (10ms)"） */
function formatDuration(details?: string): string {
  if (!details) return '-';
  // 匹配 "Duration: Xms" 或 "(Xms)"
  const match1 = details.match(/Duration:\s*(\d+ms)/);
  if (match1) return match1[1];
  const match2 = details.match(/\((\d+ms)\)/);
  if (match2) return match2[1];
  return details;
}

/** 从 details 字段提取请求体（格式：'{"key":"val"} | Duration: 5ms' 或 'Error: xxx'） */
function extractBody(log: OperationLog): string | null {
  if (!log.details) return null;
  // 去除后缀的 Duration / Error 信息
  let body = log.details
    .replace(/\s*\|\s*Duration:\s*\d+ms$/, '')
    .replace(/\s*\|\s*Error:.*$/, '')
    .replace(/^Error:\s*/, '')
    .trim();
  if (!body || body.startsWith('Duration:')) return null;
  // 尝试格式化 JSON
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return body;
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString();
}

const operationLogColumns = computed<SmartTableColumn[]>(() => [
  {
    key: 'time',
    title: t('system.operationLogs.columnTime'),
    dataKey: 'createdAt',
    render: (value) => formatTime(value as string),
  },
  {
    key: 'user',
    title: t('system.operationLogs.columnUser'),
    dataKey: 'username',
  },
  {
    key: 'action',
    title: t('system.operationLogs.columnAction'),
    dataKey: 'action',
  },
  {
    key: 'resource',
    title: t('system.operationLogs.columnResource'),
    dataKey: 'resource',
  },
  {
    key: 'ip',
    title: t('system.operationLogs.columnIp'),
    dataKey: 'ip',
  },
  {
    key: 'status',
    title: t('system.operationLogs.columnStatus'),
    dataKey: 'status',
  },
  {
    key: 'duration',
    title: t('system.operationLogs.columnDuration'),
    dataKey: 'details',
  },
]);

const paginationConfig = computed<PaginationConfig>(() => ({
  page: page.value,
  pageSize: pageSize.value,
  total: total.value,
  mode: 'server',
}));

function onPageChange(event: PageChangeEvent) {
  if (event.pageSize !== pageSize.value) {
    pageSize.value = event.pageSize;
  }
  loadData(event.page);
}

async function loadData(p: number) {
  loading.value = true;
  page.value = p;
  try {
    const res = await systemApi.getOperationLogs({
      page: p,
      pageSize: pageSize.value,
      action: filters.action || undefined,
      status: filters.status || undefined,
      username: filters.username || undefined,
      startTime: filters.dateRange.start || undefined,
      endTime: filters.dateRange.end || undefined,
    });
    const data = (res as any)?.data || res || {};
    logs.value = data.items || [];
    total.value = data.total || 0;
  } catch {
    // 静默失败
  } finally {
    loading.value = false;
  }
}

function openCleanExpiredDialog() {
  cleanDays.value = 30;
  showCleanExpiredDialog.value = true;
}

function closeCleanExpiredDialog() {
  showCleanExpiredDialog.value = false;
}

async function handleCleanExpired() {
  if (!cleanDays.value || cleanDays.value < 1) return;
  cleaning.value = true;
  try {
    const res = await systemApi.cleanExpiredOperationLogs(cleanDays.value);
    const deleted = (res as any)?.data?.deleted ?? (res as any)?.deleted ?? 0;
    showSuccess(t('system.operationLogs.cleanSuccess', { count: deleted }));
    closeCleanExpiredDialog();
    await loadData(1);
  } catch (e: any) {
    showError(e?.message || 'Failed to clean expired operation logs');
  } finally {
    cleaning.value = false;
  }
}

async function handleCleanAll() {
  const confirmed = await showConfirm(t('system.operationLogs.cleanAllConfirm'));
  if (!confirmed) return;
  try {
    const res = await systemApi.cleanAllOperationLogs();
    const deleted = (res as any)?.data?.deleted ?? (res as any)?.deleted ?? 0;
    showSuccess(t('system.operationLogs.cleanAllSuccess', { count: deleted }));
    await loadData(1);
  } catch (e: any) {
    showError(e?.message || 'Failed to clean all operation logs');
  }
}

onMounted(() => {
  loadData(1);
});
</script>

<style scoped>
.operation-log-page {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

/* ===== 统一工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.page-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
}

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.filter-select,
.filter-input {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  background: var(--background);
  color: var(--text);
}

.filter-input {
  width: 160px;
}

/* 表格单元格 */
.action-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-method {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
  flex-shrink: 0;
}

.method-GET { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.method-POST { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.method-PUT { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
.method-PATCH { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
.method-DELETE { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }

.action-url {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-success { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.status-error { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 13px;
  color: var(--text);
}

.user-id {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}

.mono {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 按钮（与项目其它页面一致的 sys-btn 样式） */
.sys-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--surface);
  color: var(--text);
}

.sys-btn:hover {
  border-color: var(--primary);
}

.sys-btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

.sys-btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.sys-btn-primary:hover {
  opacity: 0.9;
}

.sys-btn-secondary {
  background: var(--surface);
  color: var(--text);
}

.sys-btn-danger {
  background: transparent;
  border-color: color-mix(in srgb, var(--status-error) 50%, transparent);
  color: var(--status-error);
}

.sys-btn-danger:hover {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
}

.sys-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 20px;
}

.modal-prompt {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.modal-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--background);
  color: var(--text);
  box-sizing: border-box;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
}

/* 行点击提示 */
.click-hint {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
  opacity: 0.7;
}

/* 详情面板 */
.detail-panel {
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  overflow: hidden;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--primary) 5%, var(--surface));
}

.detail-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.detail-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.detail-close:hover {
  color: var(--text);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0;
  padding: 0;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}

.detail-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 13px;
  color: var(--text);
  word-break: break-all;
}

.detail-ua {
  font-size: 11px;
  color: var(--text-secondary);
  word-break: break-all;
}

.detail-body-section {
  padding: 12px 16px;
}

.detail-body-code {
  margin-top: 8px;
  padding: 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  line-height: 1.5;
}

.detail-body-empty {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}
</style>
