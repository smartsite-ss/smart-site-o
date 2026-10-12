<template>
  <div class="event-log-page">
    <!-- 统一工具栏 -->
    <div class="toolbar">
      <h1 class="page-title">
        {{ $t('system.eventLogs.title') }}
      </h1>
      <div class="toolbar-filters">
        <select
          v-model="filters.eventType"
          class="filter-select"
          @change="loadData(1)"
        >
          <option value="">
            {{ $t('system.eventLogs.allEventTypes') }}
          </option>
          <optgroup
            v-for="group in eventTypeGroups"
            :key="group.label"
            :label="group.label"
          >
            <option
              v-for="item in group.items"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </optgroup>
        </select>
        <select
          v-model="filters.status"
          class="filter-select"
          @change="loadData(1)"
        >
          <option value="">
            {{ $t('system.eventLogs.allStatus') }}
          </option>
          <option value="emitted">
            {{ $t('system.eventLogs.statusEmitted') }}
          </option>
          <option value="processing">
            {{ $t('system.eventLogs.statusProcessing') }}
          </option>
          <option value="processed">
            {{ $t('system.eventLogs.statusProcessed') }}
          </option>
          <option value="partial">
            {{ $t('system.eventLogs.statusPartial') }}
          </option>
          <option value="failed">
            {{ $t('system.eventLogs.statusFailed') }}
          </option>
          <option value="no_subscribers">
            {{ $t('system.eventLogs.statusNoSubscribers') }}
          </option>
        </select>
        <input
          v-model="filters.emittedBy"
          class="filter-input"
          :placeholder="$t('system.eventLogs.placeholderOperator')"
          @keyup.enter="loadData(1)"
        >
        <input
          v-model="filters.projectId"
          class="filter-input filter-input-project"
          :placeholder="$t('system.eventLogs.placeholderProject')"
          @keyup.enter="loadData(1)"
        >
        <TimeRangePicker
          v-model="filters.dateRange"
          mode="date"
          size="sm"
          @change="loadData(1)"
        />
        <label class="filter-checkbox">
          <input
            type="checkbox"
            v-model="filters.hasSubscribers"
            @change="loadData(1)"
          >
          {{ $t('system.eventLogs.hasSubscribers') }}
        </label>
      </div>
      <div class="toolbar-actions">
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="loadData(page)"
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
          {{ $t('system.eventLogs.refresh') }}
        </button>
        <button
          class="sys-btn sys-btn-danger sys-btn-sm"
          :disabled="loading || logs.length === 0"
          @click="handleClear"
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
          {{ $t('system.eventLogs.clear') }}
        </button>
      </div>
    </div>

    <!-- 表格 -->
    <SmartTable
      table-id="event-logs"
      :data="logs"
      :columns="eventLogColumns"
      :loading="loading"
      :pagination="paginationConfig"
      :empty-text="$t('system.eventLogs.empty')"
      :show-column-toggle="true"
      :show-export="true"
      :show-refresh="true"
      @page-change="onPageChange"
      @refresh="() => loadData(page)"
      @row-click="handleRowClick"
    >
      <template #cell-eventType="{ row }">
        <span
          class="badge-event-type"
          :class="getEventTypeClass(row.eventType)"
        >{{ row.eventType }}</span>
      </template>
      <template #cell-projectId="{ row }">
        <span
          v-if="row.projectId"
          class="mono project-id"
          :title="row.projectId"
        >{{ truncateProjectId(row.projectId) }}</span>
        <span
          v-else
          class="text-secondary"
        >{{ $t('system.eventLogs.systemLevel') }}</span>
      </template>
      <template #cell-emittedBy="{ row }">
        <div class="user-cell">
          <span class="user-name">{{ row.emittedBy || '-' }}</span>
          <span class="user-source">{{ row.source }}</span>
        </div>
      </template>
      <template #cell-status="{ row }">
        <span
          class="badge-status"
          :class="'status-' + row.status"
        >
          {{ getStatusLabel(row.status) }}
        </span>
      </template>
      <template #cell-successRatio="{ row }">
        <span
          v-if="row.successRatio"
          class="mono"
          :class="getRatioClass(row.successRatio)"
        >{{ row.successRatio }}</span>
        <span
          v-else
          class="text-secondary"
        >-</span>
      </template>
      <template #cell-duration="{ row }">
        <span class="mono">{{ getMaxDuration(row.subscribers) }}</span>
      </template>
    </SmartTable>

    <!-- 行点击提示 -->
    <div
      v-if="logs.length > 0 && !selectedLog"
      class="click-hint"
    >
      {{ $t('system.eventLogs.clickToView') }}
    </div>

    <!-- 事件详情面板 -->
    <div
      v-if="selectedLog"
      class="detail-panel"
    >
      <div class="detail-header">
        <h3 class="detail-title">
          {{ $t('system.eventLogs.detailTitle') }}
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
          <span class="detail-label">{{ $t('system.eventLogs.detailEventType') }}</span>
          <span
            class="badge-event-type"
            :class="getEventTypeClass(selectedLog.eventType)"
          >{{ selectedLog.eventType }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.eventLogs.detailSource') }}</span>
          <span class="detail-value">{{ selectedLog.source }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.eventLogs.detailOperator') }}</span>
          <span class="detail-value">{{ selectedLog.emittedBy || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.eventLogs.detailProject') }}</span>
          <span
            v-if="selectedLog.projectId"
            class="detail-value mono"
          >{{ selectedLog.projectId }}</span>
          <span
            v-else
            class="detail-value text-secondary"
          >{{ $t('system.eventLogs.systemLevel') }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.eventLogs.detailEventTime') }}</span>
          <span class="detail-value">{{ formatTime(selectedLog.eventTimestamp) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.eventLogs.detailStatus') }}</span>
          <span
            class="badge-status"
            :class="'status-' + selectedLog.status"
          >{{ getStatusLabel(selectedLog.status) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.eventLogs.detailSuccessRatio') }}</span>
          <span
            v-if="selectedLog.successRatio"
            class="detail-value mono"
            :class="getRatioClass(selectedLog.successRatio)"
          >{{ selectedLog.successRatio }}</span>
          <span
            v-else
            class="detail-value text-secondary"
          >-</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ $t('system.eventLogs.detailCreatedAt') }}</span>
          <span class="detail-value">{{ formatTime(selectedLog.createdAt) }}</span>
        </div>
      </div>

      <!-- 错误信息高亮 -->
      <div
        v-if="selectedLog.errorMessage"
        class="detail-error-section"
      >
        <span class="detail-label">{{ $t('system.eventLogs.detailError') }}</span>
        <pre class="detail-error-code">{{ selectedLog.errorMessage }}</pre>
      </div>

      <!-- Payload 展示 -->
      <div class="detail-body-section">
        <div class="detail-section-header">
          <span class="detail-label">{{ $t('system.eventLogs.detailPayload') }}</span>
          <button
            class="toggle-btn"
            @click="payloadExpanded = !payloadExpanded"
          >
            {{ payloadExpanded ? $t('system.eventLogs.collapse') : $t('system.eventLogs.expand') }}
          </button>
        </div>
        <pre
          v-if="hasPayload"
          class="detail-body-code"
          :class="{ collapsed: !payloadExpanded }"
        >{{ formatJson(selectedLog.payload) }}</pre>
        <span
          v-else
          class="detail-body-empty"
        >{{ $t('system.eventLogs.detailPayloadEmpty') }}</span>
      </div>

      <!-- 订阅者时间线 -->
      <div class="detail-body-section">
        <div class="detail-section-header">
          <span class="detail-label">{{ $t('system.eventLogs.detailSubscribers') }}</span>
          <span class="subscriber-count">{{ subscriberCountText }}</span>
        </div>
        <div
          v-if="selectedLog.subscribers && selectedLog.subscribers.length > 0"
          class="subscriber-timeline"
        >
          <div
            v-for="(subscriber, index) in selectedLog.subscribers"
            :key="index"
            class="subscriber-row"
            :class="{ 'subscriber-failed': subscriber.status === 'failed' }"
          >
            <div class="subscriber-main">
              <span
                class="badge-status"
                :class="'status-' + mapSubscriberStatus(subscriber.status)"
              >{{ getSubscriberStatusLabel(subscriber.status) }}</span>
              <span class="subscriber-name">{{ subscriber.name }}</span>
              <span
                v-if="subscriber.duration !== undefined"
                class="subscriber-duration mono"
              >{{ subscriber.duration }}ms</span>
            </div>
            <div
              v-if="subscriber.error"
              class="subscriber-error"
            >
              {{ subscriber.error }}
            </div>
            <div
              v-if="subscriber.result && Object.keys(subscriber.result).length > 0"
              class="subscriber-result"
            >
              <span class="detail-label">{{ $t('system.eventLogs.detailBusinessResult') }}</span>
              <pre class="detail-body-code detail-body-code-sm">{{ formatJson(subscriber.result) }}</pre>
            </div>
            <div class="subscriber-time">
              <span
                v-if="subscriber.startedAt"
                class="mono text-secondary"
              >{{ $t('system.eventLogs.startedAt') }}: {{ formatTime(subscriber.startedAt) }}</span>
              <span
                v-if="subscriber.completedAt"
                class="mono text-secondary"
              >{{ $t('system.eventLogs.completedAt') }}: {{ formatTime(subscriber.completedAt) }}</span>
            </div>
          </div>
        </div>
        <div
          v-else
          class="detail-body-empty"
        >
          {{ $t('system.eventLogs.noSubscribers') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { eventLogApi } from '../../api/modules/eventLog.api';
import { SmartTable } from '../../components/smart-table';
import type { SmartTableColumn, PaginationConfig, PageChangeEvent } from '../../components/smart-table';
import { TimeRangePicker } from '@scada-editor/shared';
import type { TimeRange } from '@scada-editor/shared';
import type { EventLogItem, EventLogStatus } from '../../api/types/api';
import { showConfirm, showSuccess, showError } from '../../utils/messageBox';

const { t } = useI18n();

const loading = ref(false);
const logs = ref<EventLogItem[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const filters = reactive({
  eventType: '',
  status: '',
  emittedBy: '',
  projectId: '',
  dateRange: { start: '', end: '' } as TimeRange,
  hasSubscribers: false,
});

// 选中行详情
const selectedLog = ref<EventLogItem | null>(null);
const payloadExpanded = ref(false);

function handleRowClick(row: EventLogItem) {
  selectedLog.value = selectedLog.value?.id === row.id ? null : row;
  payloadExpanded.value = false;
}

// ===== 事件类型分组（与后端 PERSISTED_EVENTS 白名单对齐） =====
const eventTypeGroups = computed(() => [
  {
    label: t('system.eventLogs.groupDevice'),
    items: [
      { value: 'device.created', label: 'device.created' },
      { value: 'device.updated', label: 'device.updated' },
      { value: 'device.deleted', label: 'device.deleted' },
      { value: 'device.tagsChanged', label: 'device.tagsChanged' },
      { value: 'device.enabled', label: 'device.enabled' },
      { value: 'device.disabled', label: 'device.disabled' },
    ],
  },
  {
    label: t('system.eventLogs.groupProject'),
    items: [
      { value: 'project.created', label: 'project.created' },
      { value: 'project.imported', label: 'project.imported' },
      { value: 'project:enabled', label: 'project:enabled' },
      { value: 'project:disabled', label: 'project:disabled' },
      { value: 'project.beforeDelete', label: 'project.beforeDelete' },
    ],
  },
  {
    label: t('system.eventLogs.groupAlarm'),
    items: [
      { value: 'alarm.triggered', label: 'alarm.triggered' },
      { value: 'alarm_acknowledged', label: 'alarm_acknowledged' },
      { value: 'alarm.cleared', label: 'alarm.cleared' },
      { value: 'alarm.rule_resolved', label: 'alarm.rule_resolved' },
    ],
  },
  {
    label: t('system.eventLogs.groupConfig'),
    items: [
      { value: 'config_changed', label: 'config_changed' },
      { value: 'protocol.config.updated', label: 'protocol.config.updated' },
      { value: 'timer:configChanged', label: 'timer:configChanged' },
    ],
  },
  {
    label: t('system.eventLogs.groupPlugin'),
    items: [
      { value: 'plugin.activated', label: 'plugin.activated' },
      { value: 'plugin.deactivated', label: 'plugin.deactivated' },
      { value: 'plugin.updated', label: 'plugin.updated' },
    ],
  },
]);

// ===== 工具函数 =====

/** 事件类型 CSS 类（按域着色） */
function getEventTypeClass(eventType: string): string {
  if (eventType.startsWith('device.')) return 'event-type-device';
  if (eventType.startsWith('project') || eventType.startsWith('project:')) return 'event-type-project';
  if (eventType.startsWith('alarm')) return 'event-type-alarm';
  if (eventType.startsWith('plugin.')) return 'event-type-plugin';
  if (eventType.startsWith('config') || eventType.startsWith('protocol.') || eventType.startsWith('timer:')) {
    return 'event-type-config';
  }
  return 'event-type-other';
}

/** 订阅者状态映射到徽章颜色类 */
function mapSubscriberStatus(status: string): string {
  switch (status) {
    case 'processed':
      return 'processed';
    case 'failed':
      return 'failed';
    case 'processing':
      return 'processing';
    case 'skipped':
      return 'no_subscribers';
    default:
      return 'emitted';
  }
}

function getStatusLabel(status: EventLogStatus): string {
  const map: Record<EventLogStatus, string> = {
    emitted: t('system.eventLogs.statusEmitted'),
    processing: t('system.eventLogs.statusProcessing'),
    processed: t('system.eventLogs.statusProcessed'),
    partial: t('system.eventLogs.statusPartial'),
    failed: t('system.eventLogs.statusFailed'),
    no_subscribers: t('system.eventLogs.statusNoSubscribers'),
  };
  return map[status] || status;
}

function getSubscriberStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: t('system.eventLogs.subscriberPending'),
    processing: t('system.eventLogs.subscriberProcessing'),
    processed: t('system.eventLogs.subscriberProcessed'),
    failed: t('system.eventLogs.subscriberFailed'),
    skipped: t('system.eventLogs.subscriberSkipped'),
  };
  return map[status] || status;
}

/** 计算订阅者最大耗时 */
function getMaxDuration(subscribers?: EventLogItem['subscribers']): string {
  if (!subscribers || subscribers.length === 0) return '-';
  const max = subscribers.reduce((max, s) => {
    return s.duration !== undefined && s.duration > max ? s.duration : max;
  }, 0);
  return max > 0 ? `${max}ms` : '-';
}

/** 成功率 CSS 类 */
function getRatioClass(ratio: string): string {
  const match = ratio.match(/^(\d+)\/(\d+)$/);
  if (!match) return '';
  const success = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  if (success === total) return 'ratio-success';
  if (success === 0) return 'ratio-failed';
  return 'ratio-partial';
}

function truncateProjectId(projectId: string): string {
  return projectId.length > 16 ? projectId.slice(0, 8) + '…' + projectId.slice(-4) : projectId;
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function formatJson(obj: Record<string, any>): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

const hasPayload = computed(() => {
  const payload = selectedLog.value?.payload;
  return payload && Object.keys(payload).length > 0;
});

const subscriberCountText = computed(() => {
  const count = selectedLog.value?.subscribers?.length || 0;
  return t('system.eventLogs.subscriberCount', { count });
});

// ===== 表格列定义 =====
const eventLogColumns = computed<SmartTableColumn[]>(() => [
  {
    key: 'time',
    title: t('system.eventLogs.columnTime'),
    dataKey: 'eventTimestamp',
    render: (value) => formatTime(value as string),
  },
  {
    key: 'eventType',
    title: t('system.eventLogs.columnEventType'),
    dataKey: 'eventType',
  },
  {
    key: 'projectId',
    title: t('system.eventLogs.columnProject'),
    dataKey: 'projectId',
  },
  {
    key: 'emittedBy',
    title: t('system.eventLogs.columnOperator'),
    dataKey: 'emittedBy',
  },
  {
    key: 'status',
    title: t('system.eventLogs.columnStatus'),
    dataKey: 'status',
  },
  {
    key: 'successRatio',
    title: t('system.eventLogs.columnSuccessRatio'),
    dataKey: 'successRatio',
  },
  {
    key: 'duration',
    title: t('system.eventLogs.columnDuration'),
    dataKey: 'subscribers',
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
    const res = await eventLogApi.getEventLogs({
      page: p,
      pageSize: pageSize.value,
      eventType: filters.eventType || undefined,
      status: (filters.status as EventLogStatus) || undefined,
      emittedBy: filters.emittedBy || undefined,
      projectId: filters.projectId || undefined,
      startTime: filters.dateRange.start || undefined,
      endTime: filters.dateRange.end || undefined,
      hasSubscribers: filters.hasSubscribers || undefined,
    });
    const data = (res as any)?.data || res || {};
    logs.value = data.items || [];
    total.value = data.total || 0;
  } catch (err) {
    console.error('[EventLogListView] 加载事件日志失败:', err);
    logs.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function handleClear() {
  const confirmed = await showConfirm(
    t('system.eventLogs.clearConfirmMessage'),
    t('system.eventLogs.clearConfirmTitle'),
  );
  if (!confirmed) return;
  try {
    const res = await eventLogApi.clearEventLogs();
    const deleted = (res as any)?.data?.deleted ?? (res as any)?.deleted ?? 0;
    showSuccess(t('system.eventLogs.clearSuccess', { count: deleted }));
    selectedLog.value = null;
    await loadData(1);
  } catch (err) {
    console.error('[EventLogListView] 清空事件日志失败:', err);
    showError(t('system.eventLogs.clearFailed'));
  }
}

onMounted(() => {
  loadData(1);
});
</script>

<style scoped>
.event-log-page {
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
  width: 150px;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.filter-checkbox input {
  cursor: pointer;
  accent-color: var(--primary);
}

.filter-input-project {
  width: 120px;
}

/* 表格单元格 */
.badge-event-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
}

.event-type-device { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.event-type-project { background: color-mix(in srgb, #9c27b0 15%, transparent); color: #9c27b0; }
.event-type-alarm { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
.event-type-plugin { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.event-type-config { background: color-mix(in srgb, #00bcd4 15%, transparent); color: #00bcd4; }
.event-type-other { background: color-mix(in srgb, var(--text-secondary) 15%, transparent); color: var(--text-secondary); }

.project-id {
  font-size: 12px;
  color: var(--text-secondary);
}

.badge-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-emitted { background: color-mix(in srgb, var(--text-secondary) 15%, transparent); color: var(--text-secondary); }
.status-processing { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.status-processed { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.status-partial { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
.status-failed { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }
.status-no_subscribers { background: color-mix(in srgb, var(--text-secondary) 15%, transparent); color: var(--text-secondary); }

.ratio-success { color: var(--status-online); font-weight: 600; }
.ratio-partial { color: var(--status-warning); font-weight: 600; }
.ratio-failed { color: var(--status-error); font-weight: 600; }

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 13px;
  color: var(--text);
}

.user-source {
  font-size: 11px;
  color: var(--text-secondary);
}

.text-secondary {
  color: var(--text-secondary);
  font-size: 12px;
}

.mono {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 按钮 */
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

.sys-btn-secondary {
  background: var(--surface);
  color: var(--text);
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

/* 错误信息高亮区 */
.detail-error-section {
  padding: 12px 16px;
  background: color-mix(in srgb, var(--status-error) 5%, var(--surface));
  border-bottom: 1px solid color-mix(in srgb, var(--status-error) 20%, transparent);
}

.detail-error-code {
  margin-top: 8px;
  padding: 12px;
  background: color-mix(in srgb, var(--status-error) 10%, var(--background));
  border: 1px solid color-mix(in srgb, var(--status-error) 30%, transparent);
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  color: var(--status-error);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.detail-body-section {
  padding: 12px 16px;
  border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}

.detail-section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.toggle-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
}

.toggle-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.subscriber-count {
  font-size: 12px;
  color: var(--text-secondary);
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

.detail-body-code.collapsed {
  max-height: 120px;
  overflow-y: auto;
}

.detail-body-code-sm {
  max-height: 180px;
  margin-top: 6px;
  padding: 8px 10px;
  font-size: 11px;
}

.detail-body-empty {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}

/* 订阅者时间线 */
.subscriber-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.subscriber-row {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
}

.subscriber-row.subscriber-failed {
  border-color: color-mix(in srgb, var(--status-error) 40%, transparent);
  background: color-mix(in srgb, var(--status-error) 4%, var(--background));
}

.subscriber-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.subscriber-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  font-family: monospace;
}

.subscriber-duration {
  font-size: 12px;
  color: var(--text-secondary);
}

.subscriber-error {
  margin-top: 6px;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  border-radius: 4px;
  font-size: 12px;
  color: var(--status-error);
  word-break: break-all;
}

.subscriber-result {
  margin-top: 6px;
}

.subscriber-time {
  display: flex;
  gap: 16px;
  margin-top: 4px;
  flex-wrap: wrap;
}
</style>
