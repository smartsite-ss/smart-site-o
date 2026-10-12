<template>
  <div class="event-panel-graphic" :style="containerStyle">
    <div v-if="loading && items.length === 0" class="event-panel-status">{{ t('eventPanel.loading') }}</div>
    <div v-else-if="error" class="event-panel-status event-panel-error">{{ error }}</div>
    <div v-else-if="items.length === 0" class="event-panel-status">{{ t('eventPanel.empty') }}</div>
    <div v-else class="event-panel-scroll">
      <table class="event-panel-table" :style="tableStyle">
        <thead v-if="showHeader" :style="{ background: headerBackgroundColor }">
          <tr>
            <th v-if="showTime">{{ t('eventPanel.columns.time') }}</th>
            <th v-if="showEventType">{{ t('eventPanel.columns.eventType') }}</th>
            <th v-if="showProject">{{ t('eventPanel.columns.project') }}</th>
            <th v-if="showOperator">{{ t('eventPanel.columns.operator') }}</th>
            <th v-if="showStatus">{{ t('eventPanel.columns.status') }}</th>
            <th v-if="showSuccessRatio">{{ t('eventPanel.columns.successRatio') }}</th>
            <th v-if="showDuration">{{ t('eventPanel.columns.duration') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="item.id" :style="rowStyle(index)">
            <td v-if="showTime" class="mono">{{ formatTime(item.eventTimestamp) }}</td>
            <td v-if="showEventType">
              <span class="badge-event-type" :class="getEventTypeClass(item.eventType)">{{ item.eventType }}</span>
            </td>
            <td v-if="showProject">
              <span v-if="item.projectId" class="mono">{{ truncateProject(item.projectId) }}</span>
              <span v-else class="text-secondary">{{ t('eventPanel.systemLevel') }}</span>
            </td>
            <td v-if="showOperator">{{ item.emittedBy || '-' }}</td>
            <td v-if="showStatus">
              <span class="badge-status" :class="getStatusClass(item.status)">{{ statusLabel(item.status) }}</span>
            </td>
            <td v-if="showSuccessRatio">
              <span v-if="item.successRatio" class="mono" :class="getRatioClass(item.successRatio)">{{ item.successRatio }}</span>
              <span v-else class="text-secondary">-</span>
            </td>
            <td v-if="showDuration" class="mono">{{ getMaxDuration(item.subscribers) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { i18n } from '@scada-editor/core';
import { eventLogApi } from '@scada-editor/system';
import type { EventLogItem, EventLogStatus } from '@scada-editor/system';
import { getEventTypeClass, getStatusClass, getMaxDuration, getRatioClass } from './eventPanelUtils';

const { t } = i18n.global;

const props = defineProps<{
  w: number;
  h: number;
  projectId: string;
  eventType: string;
  status: string;
  pageSize: number;
  refreshInterval: number;
  showHeader: boolean;
  showTime: boolean;
  showEventType: boolean;
  showProject: boolean;
  showOperator: boolean;
  showStatus: boolean;
  showSuccessRatio: boolean;
  showDuration: boolean;
  fontSize: number;
  rowHeight: number;
  headerBackgroundColor: string;
  rowBackgroundColor: string;
  alternatingRowColor: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: string;
  borderRadius: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
}>();

const items = ref<EventLogItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
let refreshTimer: ReturnType<typeof setInterval> | null = null;

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await eventLogApi.getEventLogs({
      page: 1,
      pageSize: props.pageSize,
      projectId: props.projectId || undefined,
      eventType: props.eventType || undefined,
      status: (props.status as EventLogStatus) || undefined,
    });
    const list = res?.data?.items || [];
    // 只显示实时事件（未闭环）：未指定状态时前端过滤 emitted/processing
    items.value = props.status
      ? list
      : list.filter((item) => item.status === 'emitted' || item.status === 'processing');
  } catch {
    error.value = t('eventPanel.loadFailed');
  } finally {
    loading.value = false;
  }
}

function scheduleRefresh() {
  stopRefresh();
  if (props.refreshInterval > 0) {
    refreshTimer = setInterval(load, props.refreshInterval * 1000);
  }
}

function stopRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function truncateProject(projectId: string): string {
  return projectId.length > 8 ? `${projectId.slice(0, 8)}…` : projectId;
}

function statusLabel(status: string): string {
  return t(`eventPanel.status.${status}`);
}

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  position: 'relative' as const,
  boxSizing: 'border-box' as const,
  backgroundColor: props.backgroundColor === '#00000000' ? 'transparent' : props.backgroundColor,
  border: `${props.borderWidth}px ${props.borderStyle} ${props.borderColor === '#00000000' ? 'transparent' : props.borderColor}`,
  borderRadius: `${props.borderRadius}px`,
  boxShadow:
    props.shadowColor && props.shadowColor !== '#00000000'
      ? `${props.shadowOffsetX}px ${props.shadowOffsetY}px ${props.shadowBlur}px ${props.shadowColor}`
      : 'none',
  overflow: 'hidden',
}));

const tableStyle = computed(() => ({
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: `${props.fontSize}px`,
  color: props.textColor,
}));

const rowStyle = (index: number) => ({
  height: `${props.rowHeight}px`,
  background: index % 2 === 1 ? props.alternatingRowColor : props.rowBackgroundColor,
});

watch(
  () => [props.projectId, props.eventType, props.status, props.pageSize, props.refreshInterval],
  () => {
    load();
    scheduleRefresh();
  },
);

onMounted(() => {
  load();
  scheduleRefresh();
});

onUnmounted(stopRefresh);
</script>

<style scoped>
.event-panel-graphic {
  font-family: Arial, sans-serif;
}

.event-panel-scroll {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.event-panel-status {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-tertiary, #999999);
}

.event-panel-error {
  color: var(--status-error, #d03050);
}

.event-panel-table th,
.event-panel-table td {
  padding: 2px 6px;
  text-align: left;
  white-space: nowrap;
}

.event-panel-table th {
  font-weight: 600;
  color: var(--text-secondary, #666666);
}

.mono {
  font-variant-numeric: tabular-nums;
}

.text-secondary {
  color: var(--text-secondary, #666666);
}

.badge-event-type,
.badge-status {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 1.5;
}

.event-type-device { background: rgba(26, 115, 232, 0.12); color: #1a73e8; }
.event-type-project { background: rgba(46, 125, 50, 0.12); color: #2e7d32; }
.event-type-alarm { background: rgba(211, 47, 47, 0.12); color: #d32f2f; }
.event-type-plugin { background: rgba(123, 31, 162, 0.12); color: #7b1fa2; }
.event-type-config { background: rgba(245, 124, 0, 0.12); color: #ef6c00; }
.event-type-other { background: rgba(117, 117, 117, 0.12); color: #757575; }

.status-emitted { background: rgba(33, 150, 243, 0.12); color: #2196f3; }
.status-processing { background: rgba(255, 152, 0, 0.12); color: #ff9800; }
.status-processed { background: rgba(76, 175, 80, 0.12); color: #4caf50; }
.status-partial { background: rgba(255, 193, 7, 0.12); color: #f9a825; }
.status-failed { background: rgba(244, 67, 54, 0.12); color: #f44336; }
.status-no_subscribers { background: rgba(158, 158, 158, 0.12); color: #9e9e9e; }

.ratio-success { color: #4caf50; font-weight: 600; }
.ratio-partial { color: #f9a825; font-weight: 600; }
.ratio-failed { color: #f44336; font-weight: 600; }
</style>
