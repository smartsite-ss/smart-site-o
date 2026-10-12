<template>
  <div class="security-audit-page">
    <!-- 统一工具栏 -->
    <div class="toolbar">
      <h1 class="page-title">
        {{ $t('system.securityAuditLogs.title') }}
      </h1>
      <div class="toolbar-filters">
        <TimeRangePicker
          v-model="filters.dateRange"
          mode="date"
          size="sm"
          @change="loadData(1)"
        />
        <select
          v-model="filters.type"
          class="filter-select"
          @change="loadData(1)"
        >
          <option value="">
            {{ $t('system.securityAuditLogs.allTypes') }}
          </option>
          <option
            v-for="eventType in auditEventTypes"
            :key="eventType.value"
            :value="eventType.value"
          >
            {{ eventType.label }}
          </option>
        </select>
        <select
          v-model="filters.severity"
          class="filter-select"
          @change="loadData(1)"
        >
          <option value="">
            {{ $t('system.securityAuditLogs.allSeverities') }}
          </option>
          <option value="info">
            {{ $t('system.securityAuditLogs.severityInfo') }}
          </option>
          <option value="warning">
            {{ $t('system.securityAuditLogs.severityWarning') }}
          </option>
          <option value="critical">
            {{ $t('system.securityAuditLogs.severityCritical') }}
          </option>
        </select>
        <input
          v-model="filters.username"
          class="filter-input"
          :placeholder="$t('system.securityAuditLogs.placeholderUser')"
          @keyup.enter="loadData(1)"
        >
      </div>
      <div class="toolbar-actions">
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="handleClearFilters"
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
          ><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
          {{ $t('system.securityAuditLogs.clearFilters') }}
        </button>
        <button
          class="sys-btn sys-btn-primary sys-btn-sm"
          :disabled="verifying"
          @click="handleVerifyChain"
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
          ><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
          {{ verifying ? '...' : $t('system.securityAuditLogs.verifyChain') }}
        </button>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="() => loadData(page)"
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
          ><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          {{ $t('system.securityAuditLogs.refresh') }}
        </button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div
      v-if="stats"
      class="stats-bar"
    >
      <div class="stat-item">
        <span class="stat-label">{{ $t('system.securityAuditLogs.statsTotal') }}</span>
        <span class="stat-value">{{ stats.total }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">{{ $t('system.securityAuditLogs.verifyStatus') }}</span>
        <span
          class="stat-value"
          :class="stats.chainValid ? 'stat-ok' : 'stat-error'"
        >
          {{ stats.chainValid ? $t('system.securityAuditLogs.statsChainValid') : $t('system.securityAuditLogs.statsChainBroken') }}
        </span>
      </div>
      <div
        v-for="(count, severity) in stats.bySeverity"
        :key="severity"
        class="stat-item"
      >
        <span class="stat-label">{{ severityLabel(severity as string) }}</span>
        <span
          class="stat-value"
          :class="severityClass(severity as string)"
        >{{ count }}</span>
      </div>
    </div>

    <!-- 表格 -->
    <SmartTable
      table-id="security-audit-logs"
      :data="logs"
      :columns="auditColumns"
      :loading="loading"
      :pagination="paginationConfig"
      :empty-text="$t('system.securityAuditLogs.empty')"
      :show-column-toggle="true"
      :show-refresh="true"
      @page-change="onPageChange"
      @refresh="() => loadData(page)"
      @row-click="handleRowClick"
    >
      <template #cell-severity="{ row }">
        <span
          class="badge-severity"
          :class="'severity-' + row.severity"
        >
          {{ severityLabel(row.severity) }}
        </span>
      </template>
      <template #cell-type="{ row }">
        <span class="event-type">{{ row.type }}</span>
      </template>
    </SmartTable>

    <!-- 行点击提示 -->
    <div
      v-if="!selectedLog"
      class="click-hint"
    >
      {{ $t('system.securityAuditLogs.clickToView') }}
    </div>

    <!-- 详情面板 -->
    <div
      v-if="selectedLog"
      class="detail-panel"
    >
      <div class="detail-header">
        <h3 class="detail-title">
          {{ $t('system.securityAuditLogs.detailTitle') }}
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
          <span class="detail-label">{{ $t('system.securityAuditLogs.detailTimestamp') }}</span>
          <span class="detail-value">{{ formatTime(selectedLog.timestamp) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.securityAuditLogs.detailType') }}</span>
          <span class="detail-value">{{ selectedLog.type }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.securityAuditLogs.detailSeverity') }}</span>
          <span
            class="badge-severity"
            :class="'severity-' + selectedLog.severity"
          >{{ severityLabel(selectedLog.severity) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.securityAuditLogs.detailUsername') }}</span>
          <span class="detail-value">{{ selectedLog.username || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.securityAuditLogs.detailUserId') }}</span>
          <span class="detail-value mono">{{ selectedLog.userId || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.securityAuditLogs.detailIp') }}</span>
          <span class="detail-value mono">{{ selectedLog.ip || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.securityAuditLogs.detailUserAgent') }}</span>
          <span class="detail-ua">{{ selectedLog.userAgent || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.securityAuditLogs.detailPrevHash') }}</span>
          <span class="detail-value mono hash-value">{{ selectedLog.prevHash || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.securityAuditLogs.detailHash') }}</span>
          <span class="detail-value mono hash-value">{{ selectedLog.hash || '-' }}</span>
        </div>
      </div>
      <div
        v-if="selectedLog.details"
        class="detail-body-section"
      >
        <span class="detail-label">{{ $t('system.securityAuditLogs.detailDetails') }}</span>
        <pre class="detail-body-code">{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
      </div>
    </div>

    <!-- 哈希链验证结果弹窗 -->
    <div
      v-if="verifyResult"
      class="modal-overlay"
      @click.self="verifyResult = null"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ $t('system.securityAuditLogs.verifyTitle') }}
          </h3>
          <button
            class="modal-close"
            @click="verifyResult = null"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <div
            class="verify-result"
            :class="verifyResult.valid ? 'verify-ok' : 'verify-broken'"
          >
            <div class="verify-icon">
              {{ verifyResult.valid ? '✓' : '⚠' }}
            </div>
            <div class="verify-text">
              <div class="verify-status-text">
                {{ verifyResult.valid ? $t('system.securityAuditLogs.verifyValid') : $t('system.securityAuditLogs.verifyBroken') }}
              </div>
              <div class="verify-desc">
                <template v-if="verifyResult.valid">
                  {{ $t('system.securityAuditLogs.verifyValidDesc', { total: verifyResult.totalEntries }) }}
                </template>
                <template v-else>
                  {{ $t('system.securityAuditLogs.verifyBrokenDesc', { index: verifyResult.brokenAtIndex, reason: verifyResult.brokenReason }) }}
                </template>
              </div>
            </div>
          </div>
          <div class="verify-meta">
            <div class="verify-meta-item">
              <span class="detail-label">{{ $t('system.securityAuditLogs.verifyTotal') }}</span>
              <span class="detail-value">{{ verifyResult.totalEntries }}</span>
            </div>
            <div class="verify-meta-item">
              <span class="detail-label">{{ $t('system.securityAuditLogs.verifyDate') }}</span>
              <span class="detail-value">{{ verifyResult.date }}</span>
            </div>
          </div>
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
import { showSuccess, showError } from '../../utils/messageBox';
import type { SecurityAuditLogEntry } from '../../api/types/api';

const { t } = useI18n();

const loading = ref(false);
const verifying = ref(false);
const logs = ref<SecurityAuditLogEntry[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const selectedLog = ref<SecurityAuditLogEntry | null>(null);
const verifyResult = ref<{
  valid: boolean;
  totalEntries: number;
  brokenAtIndex: number | null;
  brokenReason?: string;
  date: string;
} | null>(null);

const stats = ref<{
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  chainValid: boolean;
  date: string;
} | null>(null);

const filters = reactive({
  date: '',
  dateRange: { start: '', end: '' } as { start: string; end: string },
  type: '',
  severity: '',
  username: '',
});

/** 审计事件类型列表（与后端 AuditEventType 对齐） */
const auditEventTypes = [
  { value: 'auth.login.success', label: 'auth.login.success' },
  { value: 'auth.login.failed', label: 'auth.login.failed' },
  { value: 'auth.login.locked', label: 'auth.login.locked' },
  { value: 'auth.refresh.success', label: 'auth.refresh.success' },
  { value: 'auth.refresh.failed', label: 'auth.refresh.failed' },
  { value: 'auth.logout', label: 'auth.logout' },
  { value: 'auth.password.changed', label: 'auth.password.changed' },
  { value: 'auth.password.failed', label: 'auth.password.failed' },
  { value: 'user.created', label: 'user.created' },
  { value: 'user.deleted', label: 'user.deleted' },
  { value: 'user.role_changed', label: 'user.role_changed' },
  { value: 'permission.denied', label: 'permission.denied' },
  { value: 'permission.granted', label: 'permission.granted' },
  { value: 'system.config_changed', label: 'system.config_changed' },
  { value: 'system.data_exported', label: 'system.data_exported' },
];

function severityLabel(severity: string): string {
  switch (severity) {
    case 'info':
      return t('system.securityAuditLogs.severityInfo');
    case 'warning':
      return t('system.securityAuditLogs.severityWarning');
    case 'critical':
      return t('system.securityAuditLogs.severityCritical');
    case 'unknown':
      return t('system.securityAuditLogs.severityUnknown');
    default:
      return severity;
  }
}

function severityClass(severity: string): string {
  switch (severity) {
    case 'info':
      return 'stat-info';
    case 'warning':
      return 'stat-warning';
    case 'critical':
      return 'stat-critical';
    case 'unknown':
      return 'stat-unknown';
    default:
      return '';
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr || dateStr === 'unknown') return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

function handleRowClick(row: SecurityAuditLogEntry) {
  selectedLog.value = selectedLog.value?.timestamp === row.timestamp && selectedLog.value?.hash === row.hash
    ? null
    : row;
}

const auditColumns = computed<SmartTableColumn[]>(() => [
  {
    key: 'time',
    title: t('system.securityAuditLogs.columnTime'),
    dataKey: 'timestamp',
    render: (value) => formatTime(value as string),
  },
  {
    key: 'type',
    title: t('system.securityAuditLogs.columnType'),
    dataKey: 'type',
  },
  {
    key: 'severity',
    title: t('system.securityAuditLogs.columnSeverity'),
    dataKey: 'severity',
  },
  {
    key: 'user',
    title: t('system.securityAuditLogs.columnUser'),
    dataKey: 'username',
    render: (value) => (value as string) || '-',
  },
  {
    key: 'ip',
    title: t('system.securityAuditLogs.columnIp'),
    dataKey: 'ip',
    render: (value) => (value as string) || '-',
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

/** 清空所有筛选条件并重新加载数据 */
function handleClearFilters(): void {
  filters.date = '';
  filters.type = '';
  filters.severity = '';
  filters.username = '';
  selectedLog.value = null;
  loadData(1);
}

async function loadData(p: number) {
  loading.value = true;
  page.value = p;
  try {
    const res = await systemApi.getSecurityAuditLogs({
      date: filters.date || undefined,
      type: filters.type || undefined,
      severity: filters.severity || undefined,
      username: filters.username || undefined,
      page: p,
      pageSize: pageSize.value,
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

async function loadStats() {
  try {
    const res = await systemApi.getAuditStats(filters.date || undefined);
    stats.value = (res as any)?.data || res || null;
  } catch {
    // 静默失败
  }
}

async function handleVerifyChain() {
  verifying.value = true;
  try {
    const res = await systemApi.verifyAuditChain(filters.date || undefined);
    verifyResult.value = (res as any)?.data || res || null;
    showSuccess(t('system.securityAuditLogs.verifySuccess'));
    // 同时刷新统计
    await loadStats();
  } catch (e: any) {
    showError(e?.message || t('system.securityAuditLogs.verifyError'));
  } finally {
    verifying.value = false;
  }
}

onMounted(() => {
  loadData(1);
  loadStats();
});
</script>

<style scoped>
.security-audit-page {
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
  width: 140px;
}

/* ===== 统计概览 ===== */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.stat-ok { color: var(--status-online, #4caf50); }
.stat-error { color: var(--status-error, #f44336); }
.stat-info { color: var(--primary, #2196f3); }
.stat-warning { color: var(--status-warning, #ff9800); }
.stat-critical { color: var(--status-error, #f44336); }
.stat-unknown { color: var(--text-secondary, #999); }

/* ===== 严重级别标签 ===== */
.badge-severity {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.severity-info {
  background: color-mix(in srgb, var(--primary, #2196f3) 15%, transparent);
  color: var(--primary, #2196f3);
}

.severity-warning {
  background: color-mix(in srgb, var(--status-warning, #ff9800) 15%, transparent);
  color: var(--status-warning, #ff9800);
}

.severity-critical {
  background: color-mix(in srgb, var(--status-error, #f44336) 15%, transparent);
  color: var(--status-error, #f44336);
}

.severity-unknown {
  background: color-mix(in srgb, var(--text-secondary, #999) 15%, transparent);
  color: var(--text-secondary, #999);
}

.event-type {
  font-family: monospace;
  font-size: 12px;
  color: var(--text);
}

.mono {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.hash-value {
  font-size: 10px;
  word-break: break-all;
  max-width: 280px;
  display: inline-block;
}

/* ===== 按钮 ===== */
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

.sys-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 行点击提示 ===== */
.click-hint {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
  opacity: 0.7;
}

/* ===== 详情面板 ===== */
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

/* ===== 模态框 ===== */
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
  width: 480px;
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

/* ===== 验证结果 ===== */
.verify-result {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.verify-ok {
  background: color-mix(in srgb, var(--status-online, #4caf50) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-online, #4caf50) 30%, transparent);
}

.verify-broken {
  background: color-mix(in srgb, var(--status-error, #f44336) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-error, #f44336) 30%, transparent);
}

.verify-icon {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}

.verify-ok .verify-icon {
  color: var(--status-online, #4caf50);
}

.verify-broken .verify-icon {
  color: var(--status-error, #f44336);
}

.verify-text {
  flex: 1;
}

.verify-status-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.verify-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.verify-meta {
  display: flex;
  gap: 24px;
  padding: 12px 0;
}

.verify-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
