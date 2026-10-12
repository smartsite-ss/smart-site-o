<template>
  <div class="error-log-page">
    <!-- 统一工具栏：标题 + 统计 + 筛选 + 操作 -->
    <div class="toolbar">
      <!-- 左侧：标题 + 统计 -->
      <div class="toolbar-left">
        <h1 class="page-title">
          {{ $t('system.errorLogs.title') }}
        </h1>
        <div
          v-if="stats"
          class="stats-inline"
        >
          <div class="stat-item">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">{{ $t('system.errorLogs.totalErrors') }}</span>
          </div>
          <div
            v-for="item in stats.byLevel.slice(0, 4)"
            :key="item.level"
            class="stat-item"
          >
            <span
              class="stat-value"
              :class="'level-' + item.level"
            >{{ item.count }}</span>
            <span class="stat-label">{{ item.level }}</span>
          </div>
        </div>
      </div>
      <!-- 右侧：筛选 + 操作 -->
      <div class="toolbar-right">
        <select
          v-model="filters.level"
          class="filter-select"
          @change="loadData(1)"
        >
          <option value="">
            {{ $t('system.errorLogs.allLevels') }}
          </option>
          <option value="error">
            Error
          </option>
          <option value="fatal">
            Fatal
          </option>
          <option value="warning">
            Warning
          </option>
          <option value="info">
            Info
          </option>
        </select>
        <input
          v-model="filters.module"
          class="filter-input"
          :placeholder="$t('system.errorLogs.placeholderModule')"
          @keyup.enter="loadData(1)"
        >
        <TimeRangePicker
          v-model="filters.dateRange"
          mode="date"
          size="sm"
          @change="loadData(1)"
        />
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="openCleanDialog"
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
          {{ $t('system.errorLogs.cleanExpired') }}
        </button>
      </div>
    </div>

    <!-- 表格 -->
    <SmartTable
      table-id="error-logs"
      :data="logs"
      :columns="errorColumns"
      :loading="loading"
      :pagination="paginationConfig"
      :empty-text="$t('system.errorLogs.empty')"
      :show-column-toggle="true"
      :show-export="true"
      :show-refresh="true"
      @page-change="onPageChange"
      @refresh="() => loadData(page)"
    >
      <template #cell-level="{ row }">
        <span
          class="badge-level"
          :class="'level-' + row.level"
        >{{ row.level }}</span>
      </template>
      <template #cell-message="{ row }">
        <div class="message-cell">
          <span class="message-text">{{ row.message }}</span>
          <button
            v-if="row.stack"
            class="stack-toggle"
            @click="toggleStack(row.id)"
          >
            {{ expandedStacks.has(row.id) ? '▼' : '▶' }} stack
          </button>
          <pre
            v-if="row.stack && expandedStacks.has(row.id)"
            class="stack-trace"
          >{{ row.stack }}</pre>
        </div>
      </template>
      <template #cell-action="{ row }">
        <button
          class="sys-btn sys-btn-danger sys-btn-sm"
          @click="handleDelete(row.id)"
        >
          ×
        </button>
      </template>
    </SmartTable>

    <!-- 清理对话框 -->
    <div
      v-if="showCleanDialog"
      class="modal-overlay"
      @click.self="closeCleanDialog"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ $t('system.errorLogs.cleanTitle') }}
          </h3>
          <button
            class="modal-close"
            @click="closeCleanDialog"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-prompt">
            {{ $t('system.errorLogs.cleanPrompt') }}
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
            @click="closeCleanDialog"
          >
            {{ $t('system.errorLogs.cancel') }}
          </button>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            :disabled="cleaning || !cleanDays || cleanDays < 1"
            @click="handleClean"
          >
            {{ cleaning ? $t('system.errorLogs.processing') : $t('system.errorLogs.cleanExpired') }}
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
import type { ErrorLog } from '../../api/types/api';

const { t } = useI18n();

const loading = ref(false);
const logs = ref<ErrorLog[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const stats = ref<{ total: number; byLevel: { level: string; count: number }[] } | null>(null);

const filters = reactive({
  level: '',
  module: '',
  dateRange: { start: '', end: '' } as TimeRange,
});

const expandedStacks = ref(new Set<string>());

const showCleanDialog = ref(false);
const cleanDays = ref(30);
const cleaning = ref(false);

function toggleStack(id: string) {
  if (expandedStacks.value.has(id)) {
    expandedStacks.value.delete(id);
  } else {
    expandedStacks.value.add(id);
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

const errorColumns = computed<SmartTableColumn[]>(() => [
  {
    key: 'time',
    title: t('system.errorLogs.columnTime'),
    dataKey: 'createdAt',
    render: (value) => formatTime(value as string),
  },
  {
    key: 'level',
    title: t('system.errorLogs.columnLevel'),
    dataKey: 'level',
  },
  {
    key: 'message',
    title: t('system.errorLogs.columnMessage'),
    dataKey: 'message',
  },
  {
    key: 'context',
    title: t('system.errorLogs.columnModule'),
    dataKey: 'context',
  },
  {
    key: 'url',
    title: t('system.errorLogs.columnUrl'),
    dataKey: 'url',
    render: (value) => {
      if (!value) return '-';
      return value as string;
    },
  },
  {
    key: 'ip',
    title: t('system.errorLogs.columnIp'),
    dataKey: 'ip',
  },
  {
    key: 'action',
    title: t('system.errorLogs.columnAction'),
    dataKey: 'id',
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
    const res = await systemApi.getErrorLogs({
      page: p,
      pageSize: pageSize.value,
      level: filters.level || undefined,
      module: filters.module || undefined,
      startTime: filters.dateRange.start ? filters.dateRange.start + 'T00:00:00' : undefined,
      endTime: filters.dateRange.end ? filters.dateRange.end + 'T23:59:59' : undefined,
    });
    const data = (res as any)?.data || res || {};
    logs.value = data.data || [];
    total.value = data.total || 0;
  } catch {
    // 静默失败
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    const res = await systemApi.getErrorStats();
    const data = (res as any)?.data || res || {};
    stats.value = { total: data.total || 0, byLevel: data.byLevel || [] };
  } catch {
    // 静默失败
  }
}

async function handleDelete(id: string) {
  const confirmed = await showConfirm(t('system.errorLogs.confirmDelete'));
  if (!confirmed) return;
  try {
    await systemApi.deleteErrorLog(id);
    showSuccess(t('system.errorLogs.deleteSuccess'));
    await loadData(page.value);
    await loadStats();
  } catch (e: any) {
    showError(e?.message || 'Failed to delete error log');
  }
}

function openCleanDialog() {
  cleanDays.value = 30;
  showCleanDialog.value = true;
}

function closeCleanDialog() {
  showCleanDialog.value = false;
}

async function handleClean() {
  if (!cleanDays.value || cleanDays.value < 1) return;
  cleaning.value = true;
  try {
    const res = await systemApi.cleanupErrorLogs(cleanDays.value);
    const deleted = (res as any)?.data?.deleted ?? (res as any)?.deleted ?? 0;
    showSuccess(t('system.errorLogs.cleanSuccess', { count: deleted }));
    closeCleanDialog();
    await loadData(1);
    await loadStats();
  } catch (e: any) {
    showError(e?.message || 'Failed to cleanup error logs');
  } finally {
    cleaning.value = false;
  }
}

onMounted(() => {
  loadData(1);
  loadStats();
});
</script>

<style scoped>
.error-log-page {
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

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.page-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
}

.stats-inline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
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
  width: 180px;
}

.filter-sep {
  color: var(--text-secondary);
  font-size: 13px;
}

.badge-level {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.level-error,
.level-fatal {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  color: var(--status-error);
}

.level-warning {
  background: color-mix(in srgb, var(--status-warning) 15%, transparent);
  color: var(--status-warning);
}

.level-info {
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}

.message-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-text {
  font-size: 13px;
  color: var(--text);
  word-break: break-all;
}

.stack-toggle {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  align-self: flex-start;
}

.stack-trace {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--background);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

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
  padding: 4px 8px;
  font-size: 12px;
}

.sys-btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.sys-btn-secondary {
  background: var(--surface);
  color: var(--text);
}

.sys-btn-danger {
  background: transparent;
  border-color: color-mix(in srgb, var(--status-error) 50%, transparent);
  color: var(--status-error);
  padding: 2px 8px;
}

.sys-btn-danger:hover {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
}

.sys-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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
</style>
