<template>
  <div class="realtime-alarm-view">
    <!-- 统一工具栏 -->
    <div class="unified-toolbar">
      <div class="toolbar-left">
        <h1 class="toolbar-title">
          {{ $t('system.alarms.realtimeTitle') }}
        </h1>
        <div class="toolbar-item">
          <label class="toolbar-label">{{ $t('system.alarms.project') }}</label>
          <select
            v-model="selectedProjectId"
            class="toolbar-select"
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
        <template v-if="!store.loading && !store.error">
          <div class="toolbar-item">
            <label class="toolbar-label">{{ $t('system.alarms.filterLevel') }}</label>
            <select
              v-model="filters.level"
              class="toolbar-select"
              @change="applyFilters"
            >
              <option value="">
                {{ $t('system.alarms.filterAll') }}
              </option>
              <option value="info">
                {{ $t('system.alarms.levelInfo') }}
              </option>
              <option value="warning">
                {{ $t('system.alarms.levelWarning') }}
              </option>
              <option value="error">
                {{ $t('system.alarms.levelError') }}
              </option>
              <option value="critical">
                {{ $t('system.alarms.levelCritical') }}
              </option>
            </select>
          </div>
          <div class="toolbar-item">
            <label class="toolbar-label">{{ $t('system.alarms.filterKeyword') }}</label>
            <input
              v-model="filters.keyword"
              type="text"
              class="toolbar-input"
              :placeholder="$t('system.alarms.filterKeywordPlaceholder')"
              @keyup.enter="applyFilters"
            >
          </div>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            @click="applyFilters"
          >
            {{ $t('system.alarms.filterSearch') }}
          </button>
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="resetFilters"
          >
            {{ $t('system.alarms.filterReset') }}
          </button>
        </template>
      </div>
      <div class="toolbar-right">
        <span
          v-if="store.realtimeCount > 0"
          class="alarm-summary"
        >
          <span class="active-dot" />
          {{ $t('system.alarms.activeAlarmCount', { count: store.realtimeCount }) }}
        </span>
        <label class="auto-refresh-toggle">
          <input
            v-model="autoRefresh"
            type="checkbox"
            @change="onAutoRefreshToggle"
          >
          {{ $t('system.alarms.autoRefresh') }}
        </label>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="fetchData"
        >
          {{ $t('system.alarms.refreshNow') }}
        </button>
      </div>
    </div>

    <SsLoading
      v-if="store.loading"
      :text="$t('system.alarms.loading')"
      size="small"
    />

    <div
      v-else-if="store.error"
      class="error-state"
    >
      <p>{{ store.error }}</p>
      <button
        class="sys-btn sys-btn-secondary sys-btn-sm"
        @click="fetchData"
      >
        {{ $t('system.alarms.retry') }}
      </button>
    </div>

    <template v-else>
      <!-- 批量操作工具栏 -->
      <div
        v-if="selectedIds.size > 0"
        class="batch-bar"
      >
        <span class="batch-info">{{ $t('system.alarms.batchSelected', { count: selectedIds.size }) }}</span>
        <button
          class="sys-btn sys-btn-primary sys-btn-sm"
          @click="handleBatchAcknowledge"
        >
          {{ $t('system.alarms.batchAcknowledge') }}
        </button>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="handleBatchClear"
        >
          {{ $t('system.alarms.batchClear') }}
        </button>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="clearSelection"
        >
          {{ $t('system.alarms.batchCancel') }}
        </button>
      </div>

      <!-- 实时告警列表 -->
      <div class="records-table-wrapper">
        <table class="records-table">
          <thead>
            <tr>
              <th class="col-check">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                >
              </th>
              <th class="col-time">
                {{ $t('system.alarms.time') }}
              </th>
              <th class="col-device">
                {{ $t('system.alarms.device') }}
              </th>
              <th class="col-tag">
                {{ $t('system.alarms.tag') }}
              </th>
              <th class="col-level">
                {{ $t('system.alarms.level') }}
              </th>
              <th class="col-type">
                {{ $t('system.alarms.alarmType') }}
              </th>
              <th class="col-value">
                {{ $t('system.alarms.triggerValue') }}
              </th>
              <th class="col-msg">
                {{ $t('system.alarms.message') }}
              </th>
              <th class="col-status">
                {{ $t('system.alarms.status') }}
              </th>
              <th class="col-actions">
                {{ $t('system.alarms.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredRecords.length === 0">
              <td
                colspan="10"
                class="empty-row"
              >
                <div class="empty-state">
                  {{ $t('system.alarms.noRealtimeAlarms') }}
                  <div class="empty-desc">
                    {{ $t('system.alarms.noRealtimeAlarmsDesc') }}
                  </div>
                </div>
              </td>
            </tr>
            <tr
              v-for="row in paginatedRecords"
              :key="row.id"
              :class="{ 'row-selected': selectedIds.has(row.id) }"
            >
              <td class="col-check">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(row.id)"
                  @change="toggleRow(row.id)"
                >
              </td>
              <td class="col-time">
                {{ formatDate(row.createdAt) }}
              </td>
              <td class="col-device">
                {{ row.deviceName || row.deviceId || '-' }}
              </td>
              <td class="col-tag">
                {{ row.tagName || row.tagId || '-' }}
              </td>
              <td class="col-level">
                <span
                  class="level-badge"
                  :class="'level-' + row.level"
                >{{ levelLabel(row.level) }}</span>
              </td>
              <td class="col-type">
                {{ dictLabel(alarmTypeOptions, row.alarmType) }}
              </td>
              <td class="col-value">
                {{ formatNumber(row.triggerValue) }}
              </td>
              <td class="col-msg">
                {{ row.message || '-' }}
              </td>
              <td class="col-status">
                <span
                  class="status-badge"
                  :class="'status-' + row.status"
                >{{ statusLabel(row.status) }}</span>
              </td>
              <td class="col-actions">
                <div class="row-actions">
                  <button
                    v-if="row.status === 'active'"
                    class="sys-btn sys-btn-secondary sys-btn-sm"
                    @click="handleAcknowledge(row.id)"
                  >
                    {{ $t('system.alarms.acknowledge') }}
                  </button>
                  <button
                    v-if="row.status === 'active' || row.status === 'acknowledged'"
                    class="sys-btn sys-btn-secondary sys-btn-sm"
                    @click="handleClear(row.id)"
                  >
                    {{ $t('system.alarms.clear') }}
                  </button>
                  <button
                    v-if="row.deviceId && row.tagId"
                    class="sys-btn sys-btn-secondary sys-btn-sm"
                    @click="openAlarmDataDialog(row)"
                  >
                    {{ $t('system.alarms.viewRealtime') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <SmartTablePagination
          :current-page="currentPage"
          :total-pages="totalPages"
          :total="filteredRecords.length"
          :showing-from="showingFrom"
          :showing-to="showingTo"
          :page-size="pageSize"
          :page-sizes="pageSizes"
          @go="handlePageGo"
          @go-input="handlePageInput"
          @size-change="handlePageSizeChange"
        />
      </div>
    </template>

    <!-- 告警数据弹窗 -->
    <AlarmDataDialog
      v-model:visible="alarmDialogVisible"
      :alarm-time="alarmDialogRecord?.createdAt || ''"
      :trigger-value="alarmDialogRecord?.triggerValue || ''"
      :tag-id="alarmDialogRecord?.tagId || ''"
      :tag-name="alarmDialogRecord?.tagName"
      :device-id="alarmDialogRecord?.deviceId"
      :device-name="alarmDialogRecord?.deviceName"
      :project-id="alarmDialogRecord?.projectId || ''"
      :rule-name="alarmDialogRecord?.rule?.name"
      :level="alarmDialogRecord?.level || ''"
      :message="alarmDialogRecord?.message"
      :condition="alarmDialogRecord?.rule?.condition"
      :condition-value="alarmDialogRecord?.rule?.conditionValue"
      :acknowledged-at="alarmDialogRecord?.acknowledgedAt || ''"
      :recovered-at="alarmDialogRecord?.recoveredAt || ''"
      :recovered-value="alarmDialogRecord?.recoveredValue || ''"
      :clear-reason="alarmDialogRecord?.clearReason || ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, reactive, watch } from 'vue';
import { useI18n } from '@scada-editor/core';
import { useAlarmStore } from '../../stores/alarm.store';
import { useProjectStore } from '../../stores/project.store';
import { useProjectContext } from '../../composables/useProjectContext';
import { useWsStore } from '../../stores/ws.store';
import { SsLoading } from '@scada-editor/shared';
import { SmartTablePagination } from '../../components/smart-table';
import AlarmDataDialog from './components/AlarmDataDialog.vue';
import { dictApi } from '../../api/modules/dict.api';
import type { DictItem } from '../../api/modules/dict.api';
import type { AlarmRecord } from '../../types/api';

const store = useAlarmStore();
const projectStore = useProjectStore();
const wsStore = useWsStore();
const { loadDefault } = useProjectContext();
const { t } = useI18n();

const selectedProjectId = ref('');
const selectedIds = ref<Set<string>>(new Set());

/** P1-5 混合模式：HTTP 初次全量加载 + WebSocket 增量状态更新
 *  自动刷新间隔从 10s 延长到 60s（降级为兜底），减轻后端压力 */
const autoRefresh = ref(true);
const AUTO_REFRESH_INTERVAL_MS = 60000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// 告警数据弹窗
const alarmDialogVisible = ref(false);
const alarmDialogRecord = ref<any>(null);

// 字典选项（告警类型）
const alarmTypeOptions = ref<DictItem[]>([]);

async function loadDicts() {
  try {
    const typeRes = await dictApi.getDict('alarmType');
    alarmTypeOptions.value = typeRes.data?.items ?? [];
  } catch {
    // 字典加载失败不阻塞主流程
  }
}

function dictLabel(options: DictItem[], value?: string): string {
  if (!value) return '-';
  return options.find((o) => o.value === value)?.label ?? value;
}

// 简化筛选（实时告警均未闭环，无需 status/日期范围）
const filters = reactive({
  level: '',
  keyword: '',
});

// 前端本地过滤兜底（后端已按 isActive 过滤）
const filteredRecords = computed(() => store.records);

// 分页状态（客户端分页）
const currentPage = ref(1);
const pageSize = ref(20);
const pageSizes = [10, 20, 50, 100];
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / pageSize.value)));
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRecords.value.slice(start, start + pageSize.value);
});
const showingFrom = computed(() => filteredRecords.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1);
const showingTo = computed(() => Math.min(currentPage.value * pageSize.value, filteredRecords.value.length));

function handlePageGo(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}
function handlePageInput(val: string) {
  const p = parseInt(val, 10);
  if (!isNaN(p)) handlePageGo(p);
}
function handlePageSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
}

function buildFilterParams() {
  const params: Record<string, any> = { isActive: true };
  if (filters.level) params.level = filters.level;
  if (filters.keyword) params.keyword = filters.keyword;
  return params;
}

// 全选状态
const isAllSelected = computed(() => filteredRecords.value.length > 0 && filteredRecords.value.every((r) => selectedIds.value.has(r.id)));
const isIndeterminate = computed(() => {
  const count = filteredRecords.value.filter((r) => selectedIds.value.has(r.id)).length;
  return count > 0 && count < filteredRecords.value.length;
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(filteredRecords.value.map((r) => r.id));
  }
}

function toggleRow(id: string) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedIds.value = next;
}

function clearSelection() {
  selectedIds.value = new Set();
}

function levelLabel(l: string) {
  const labels: Record<string, string> = {
    info: t('system.alarms.levelInfo'),
    warning: t('system.alarms.levelWarning'),
    error: t('system.alarms.levelError'),
    critical: t('system.alarms.levelCritical'),
  };
  return labels[l] || l;
}

function statusLabel(s: string) {
  const labels: Record<string, string> = {
    active: t('system.alarms.active'),
    acknowledged: t('system.alarms.acknowledged'),
    cleared: t('system.alarms.cleared'),
    shelved: t('system.alarms.shelved'),
  };
  return labels[s] || s;
}

function formatNumber(val: number): string {
  if (val == null) return '-';
  return Number.isInteger(val) ? String(val) : Number(val).toFixed(2);
}

function formatDate(d?: string): string {
  if (!d) return '-';
  return new Date(d).toLocaleString('zh-CN');
}

async function handleAcknowledge(recordId: string) {
  if (!selectedProjectId.value) return;
  try {
    await store.acknowledgeAlarm(selectedProjectId.value, recordId);
    // 确认后该条仍为 isActive=true（acknowledged 也算未闭环），保留在列表
  } catch { /* ignore */ }
}

async function handleClear(recordId: string) {
  if (!selectedProjectId.value) return;
  try {
    await store.clearAlarm(selectedProjectId.value, recordId);
    // 清除后 isActive=false，从实时列表移除
    removeRecordFromList(recordId);
  } catch { /* ignore */ }
}

function openAlarmDataDialog(row: AlarmRecord) {
  alarmDialogRecord.value = row;
  alarmDialogVisible.value = true;
}

async function handleBatchAcknowledge() {
  if (!selectedProjectId.value || selectedIds.value.size === 0) return;
  try {
    await store.batchAcknowledgeAlarms(selectedProjectId.value, [...selectedIds.value]);
    clearSelection();
  } catch { /* ignore */ }
}

async function handleBatchClear() {
  if (!selectedProjectId.value || selectedIds.value.size === 0) return;
  try {
    const ids = [...selectedIds.value];
    await store.batchClearAlarms(selectedProjectId.value, ids);
    // 清除后批量从实时列表移除
    const next = store.records.filter((r) => !ids.includes(r.id));
    store.records.splice(0, store.records.length, ...next);
    clearSelection();
  } catch { /* ignore */ }
}

/** 从实时列表移除单条（清除后 isActive=false） */
function removeRecordFromList(recordId: string) {
  const idx = store.records.findIndex((r) => r.id === recordId);
  if (idx !== -1) store.records.splice(idx, 1);
}

async function applyFilters() {
  if (!selectedProjectId.value) return;
  clearSelection();
  currentPage.value = 1;
  await store.fetchRecords(selectedProjectId.value, buildFilterParams());
}

function resetFilters() {
  filters.level = '';
  filters.keyword = '';
  applyFilters();
}

async function fetchData() {
  if (!selectedProjectId.value) return;
  await store.fetchRecords(selectedProjectId.value, buildFilterParams());
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (autoRefresh.value) {
    refreshTimer = setInterval(() => {
      fetchData();
    }, AUTO_REFRESH_INTERVAL_MS);
  }
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function onAutoRefreshToggle() {
  startAutoRefresh();
}

function onProjectChange() {
  clearSelection();
  resetFilters();
}

onMounted(async () => {
  if (!projectStore.projects.length) await projectStore.fetchProjects();
  if (!selectedProjectId.value && projectStore.projects.length > 0) {
    const defaultId = await loadDefault();
    if (defaultId && projectStore.projects.some((p) => p.projectId === defaultId)) {
      selectedProjectId.value = defaultId;
    } else {
      selectedProjectId.value = projectStore.projects[0].projectId;
    }
  }
  loadDicts();
  await fetchData();
  startAutoRefresh();

  // P1-5: WebSocket 实时监听 — 当 activeAlarms 变化时同步更新本地 records
  // 告警被恢复(cleared)时立即从实时列表移除，不等 60s HTTP 刷新
  watch(
    () => wsStore.activeAlarms,
    (alarmsMap) => {
      if (!alarmsMap || alarmsMap.size === 0) return;
      let hasChanges = false;
      // 过滤掉已恢复(cleared)的告警，同步状态变更
      const updatedRecords = store.records
        .filter((r) => {
          const wsAlarm = alarmsMap.get(r.id);
          if (wsAlarm && wsAlarm.state === 'cleared') {
            hasChanges = true;
            return false; // 已恢复，从实时列表移除
          }
          return true;
        })
        .map((r) => {
          const wsAlarm = alarmsMap.get(r.id);
          if (wsAlarm) {
            const newStatus = wsAlarm.state === 'active' ? 'active'
              : wsAlarm.state === 'acknowledged' ? 'acknowledged'
              : r.status;
            if (newStatus !== r.status) {
              hasChanges = true;
              return { ...r, status: newStatus as any };
            }
          }
          return r;
        });
      if (hasChanges) {
        store.records.splice(0, store.records.length, ...updatedRecords);
      }
    },
    { deep: true },
  );
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.realtime-alarm-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
}

/* ===== 统一工具栏 ===== */
.unified-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
}

.toolbar-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.toolbar-select,
.toolbar-input {
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--text);
  font-size: 13px;
  min-width: 120px;
}

.toolbar-select:focus,
.toolbar-input:focus {
  outline: none;
  border-color: var(--primary);
}

.alarm-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--status-error);
  font-weight: 500;
  white-space: nowrap;
}

.active-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-error);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.auto-refresh-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.auto-refresh-toggle input {
  width: 15px;
  height: 15px;
  accent-color: var(--primary);
  cursor: pointer;
}

/* ===== 批量操作栏 ===== */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: color-mix(in srgb, var(--primary) 10%, var(--surface));
  border: 1px solid var(--primary);
  border-radius: 8px;
}

.batch-info {
  font-size: 13px;
  color: var(--primary);
  font-weight: 500;
  margin-right: auto;
}

/* ===== 表格 ===== */
.records-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.records-table th {
  padding: 10px 12px;
  background: var(--surface);
  color: var(--text-secondary);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
}

.records-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.records-table tbody tr:hover {
  background: var(--surface);
}

.records-table tbody tr.row-selected {
  background: color-mix(in srgb, var(--primary) 8%, var(--background));
}

.col-check { width: 40px; text-align: center; }
.col-time { min-width: 160px; }
.col-level { min-width: 80px; }
.col-type { min-width: 90px; }
.col-value { min-width: 90px; }
.col-msg { min-width: 120px; }
.col-status { min-width: 90px; }
.col-actions { min-width: 130px; }

.empty-row {
  text-align: center !important;
  color: var(--text-secondary) !important;
  padding: 40px 12px !important;
}

.records-table input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: var(--primary);
  cursor: pointer;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.empty-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== Badges ===== */
.level-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.level-info { background: var(--border); color: var(--text-secondary); }
.level-warning { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
.level-error { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }
.level-critical { background: color-mix(in srgb, var(--status-error) 22%, transparent); color: var(--status-error); font-weight: 700; }

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.status-active { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }
.status-acknowledged { background: color-mix(in srgb, var(--status-info) 15%, transparent); color: var(--status-info); }
.status-cleared { background: color-mix(in srgb, var(--status-success) 15%, transparent); color: var(--status-success); }
.status-shelved { background: var(--border); color: var(--text-secondary); }

/* ===== 按钮 ===== */
.row-actions {
  display: flex;
  gap: 4px;
}

/* States */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  gap: 12px;
}
</style>
