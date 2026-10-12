<template>
  <div class="control-logs-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ t('system.controlLogs.title') }}
      </h1>
      <div class="project-selector">
        <label class="selector-label">{{ t('system.controlLogs.project') }}</label>
        <select
          v-model="selectedProjectId"
          class="project-select"
          @change="onProjectChange"
        >
          <option
            v-for="proj in projectStore.projects"
            :key="proj.projectId"
            :value="proj.projectId"
          >
            {{ proj.projectName }}
          </option>
        </select>
      </div>
    </div>

    <!-- 工具栏：筛选 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="toolbar-field">
          <label class="field-label">{{ t('system.controlLogs.keyword') }}</label>
          <input
            v-model="filterKeyword"
            type="text"
            class="form-input"
            :placeholder="t('system.controlLogs.keywordPlaceholder')"
            @keyup.enter="handleSearch"
          >
        </div>
        <div class="toolbar-field">
          <label class="field-label">{{ t('system.controlLogs.result') }}</label>
          <select
            v-model="filterSuccess"
            class="form-select"
            @change="handleSearch"
          >
            <option value="">
              {{ t('system.controlLogs.filterAll') }}
            </option>
            <option value="true">
              {{ t('system.deviceControl.logs.success') }}
            </option>
            <option value="false">
              {{ t('system.deviceControl.logs.failed') }}
            </option>
          </select>
        </div>
        <div class="toolbar-field">
          <label class="field-label">{{ t('system.controlLogs.timeRange') }}</label>
          <TimeRangePicker
            v-model="dateRange"
            mode="date"
            :presets="timePresets"
            size="sm"
          />
        </div>
        <button
          class="btn btn-sm"
          :disabled="loading"
          @click="handleSearch"
        >
          {{ t('system.controlLogs.search') }}
        </button>
      </div>
      <div class="toolbar-right">
        <button
          class="btn btn-sm"
          :disabled="loading"
          @click="handleRefresh"
        >
          {{ loading ? '...' : '↻' }}
        </button>
      </div>
    </div>

    <!-- 表格区（始终显示表头） -->
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t('system.controlLogs.colTime') }}</th>
            <th>{{ t('system.controlLogs.colDevice') }}</th>
            <th>{{ t('system.controlLogs.colTag') }}</th>
            <th>{{ t('system.controlLogs.colValueChange') }}</th>
            <th>{{ t('system.controlLogs.colResult') }}</th>
            <th>{{ t('system.controlLogs.colOperator') }}</th>
            <th>{{ t('system.controlLogs.colIp') }}</th>
            <th>{{ t('system.controlLogs.colLatency') }}</th>
            <th>{{ t('system.controlLogs.colReason') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td
              colspan="9"
              class="status-cell"
            >
              {{ t('common.loading') }}
            </td>
          </tr>
          <tr v-else-if="error">
            <td
              colspan="9"
              class="status-cell"
            >
              <span>{{ t('system.controlLogs.loadFailed') }}</span>
              <button
                class="btn btn-sm btn-outline"
                style="margin-left: 8px;"
                @click="handleSearch"
              >
                {{ t('common.retry') }}
              </button>
            </td>
          </tr>
          <tr v-else-if="logs.length === 0">
            <td
              colspan="9"
              class="status-cell"
            >
              {{ t('system.controlLogs.noLogs') }}
            </td>
          </tr>
          <tr
            v-for="log in logs"
            v-else
            :key="log.id"
          >
            <td class="mono">
              {{ formatDateTime(log.createdAt) }}
            </td>
            <td>{{ log.deviceName }}</td>
            <td>
              <span class="tag-name">{{ log.tagName }}</span>
            </td>
            <td class="mono value-change">
              <span class="prev-value">{{ formatValue(log.previousValue) }}</span>
              <span class="arrow">→</span>
              <span class="new-value">{{ formatValue(log.writtenValue) }}</span>
            </td>
            <td>
              <span
                class="result-badge"
                :class="log.success ? 'result-success' : 'result-failed'"
              >
                {{ log.success ? t('system.deviceControl.logs.success') : t('system.deviceControl.logs.failed') }}
              </span>
              <div
                v-if="!log.success && log.errorMessage"
                class="error-msg"
                :title="log.errorMessage"
              >
                {{ log.errorMessage }}
              </div>
            </td>
            <td>{{ log.operatorName }}</td>
            <td class="mono">
              {{ log.ipAddress || '-' }}
            </td>
            <td class="mono num-col">
              {{ log.latencyMs != null ? log.latencyMs + ' ms' : '-' }}
            </td>
            <td>{{ log.reason || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pagination-bar">
      <span class="page-summary">{{ t('system.controlLogs.totalRecords', { total: pagination.total }) }}</span>
      <button
        class="btn btn-sm"
        :disabled="pagination.page <= 1"
        @click="goToPage(pagination.page - 1)"
      >
        &lt;
      </button>
      <span class="page-info">{{ pagination.page }} / {{ pagination.totalPages || 1 }}</span>
      <button
        class="btn btn-sm"
        :disabled="pagination.page >= pagination.totalPages"
        @click="goToPage(pagination.page + 1)"
      >
        &gt;
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from '@scada-editor/core';
import { useProjectStore } from '../../stores/project.store';
import { useProjectContext } from '../../composables/useProjectContext';
import { deviceApi } from '../../api/modules/device.api';
import { TimeRangePicker } from '@scada-editor/shared';
import type { TimeRange } from '@scada-editor/shared';

const { t } = useI18n();
const projectStore = useProjectStore();
const { loadDefault } = useProjectContext();

// ==================== 状态 ====================
const loading = ref(false);
const error = ref(false);
const logs = ref<any[]>([]);
const selectedProjectId = ref('');

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
});

const filterKeyword = ref('');
const filterSuccess = ref('');
const filterStartDate = ref('');
const filterEndDate = ref('');

const dateRange = computed<TimeRange>({
  get: () => ({ start: filterStartDate.value, end: filterEndDate.value }),
  set: (val: TimeRange) => {
    filterStartDate.value = val.start;
    filterEndDate.value = val.end;
    handleSearch();
  },
});

const timePresets = computed(() => [
  { label: t('system.historicalTrend.last24h'), value: '24h' },
  { label: t('system.historicalTrend.last7d'), value: '7d' },
  { label: t('system.historicalTrend.last30d'), value: '30d' },
]);

// ==================== 方法 ====================
async function loadLogs(page: number = 1) {
  const pid = selectedProjectId.value;
  if (!pid) {
    error.value = true;
    return;
  }

  pagination.page = page;
  loading.value = true;
  error.value = false;

  try {
    const res = await deviceApi.queryProjectControlLogs(pid, {
      page,
      pageSize: pagination.pageSize,
      keyword: filterKeyword.value || undefined,
      success: filterSuccess.value === 'true' ? true : filterSuccess.value === 'false' ? false : undefined,
      startDate: filterStartDate.value ? new Date(filterStartDate.value).toISOString() : undefined,
      endDate: filterEndDate.value ? new Date(filterEndDate.value + 'T23:59:59').toISOString() : undefined,
    });
    // 后端 TransformInterceptor 将 { items, pagination } 转换为
    // { code, data: items[], pagination, message, timestamp }
    // 即 res.data 为日志数组，res.pagination 为分页信息（位于顶层）
    const payload = (res as any)?.data;
    logs.value = Array.isArray(payload) ? payload : (payload?.items ?? []);
    const pag = (res as any)?.pagination ?? payload?.pagination;
    if (pag) {
      pagination.total = pag.total;
      pagination.totalPages = pag.totalPages;
    }
  } catch {
    error.value = true;
    logs.value = [];
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  loadLogs(1);
}

function handleRefresh() {
  loadLogs(pagination.page);
}

function goToPage(page: number) {
  loadLogs(page);
}

function formatDateTime(isoStr: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return isoStr;
  }
}

function formatValue(v: any): string {
  if (v === null || v === undefined || v === '') return '-';
  return String(v);
}

function onProjectChange() {
  loadLogs(1);
}

onMounted(async () => {
  if (!projectStore.projects.length) await projectStore.fetchProjects();
  if (!selectedProjectId.value && projectStore.projects.length > 0) {
    const defaultId = await loadDefault();
    if (defaultId && projectStore.projects.some(p => p.projectId === defaultId)) {
      selectedProjectId.value = defaultId;
    } else {
      selectedProjectId.value = projectStore.projects[0].projectId;
    }
  }
  await loadLogs(1);
});
</script>

<style scoped>
.control-logs-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 12px;
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-shrink: 0;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.project-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selector-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.project-select {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  min-width: 160px;
}

.project-select:focus {
  outline: none;
  border-color: var(--primary);
}

.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: flex-end;
}

.toolbar-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.form-input,
.form-select {
  height: 30px;
  padding: 0 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 13px;
}

.form-input {
  width: 160px;
}

.form-select {
  width: 100px;
}

.table-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  position: sticky;
  top: 0;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  z-index: 1;
}

.data-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.data-table tr:hover td {
  background: var(--surface-hover);
}

.status-cell {
  text-align: center;
  padding: 32px 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

.mono {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.num-col {
  text-align: right;
}

.result-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.result-success {
  background: rgba(34, 197, 94, 0.15);
  color: var(--status-success);
}

.result-failed {
  background: rgba(239, 68, 68, 0.15);
  color: var(--status-error);
}

.tag-name {
  font-weight: 500;
}

.tag-value {
  color: var(--text-secondary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  margin-left: 2px;
}

.value-change {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.value-change .prev-value {
  color: var(--text-secondary);
}

.value-change .arrow {
  color: var(--text-secondary);
}

.value-change .new-value {
  color: var(--text);
  font-weight: 500;
}

.error-msg {
  max-width: 200px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--status-error);
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 4px;
}

.page-summary {
  font-size: 12px;
  color: var(--text-secondary);
  margin-right: 8px;
}

.page-info {
  font-size: 13px;
  color: var(--text);
  min-width: 60px;
  text-align: center;
}

.btn {
  height: 30px;
  padding: 0 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn:hover:not(:disabled) {
  background: var(--surface-hover);
}

.btn-sm {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
}

.btn-outline {
  margin-top: 8px;
}
</style>
