<template>
  <div
    v-if="visible"
    class="data-panel-overlay"
    @click.self="close"
  >
    <div class="data-panel">
      <div class="data-panel-header">
        <div class="data-panel-title">
          <h2>{{ device?.deviceName }} — {{ $t('system.devices.tagData') }}</h2>
          <span class="data-panel-sub">{{ device?.deviceCode }}</span>
        </div>
        <div class="data-panel-actions">
          <button
            class="btn btn-secondary btn-sm"
            @click="toggleAutoRefresh"
          >
            <span
              class="auto-dot"
              :class="{ active: autoRefresh }"
            />
            {{ autoRefresh ? $t('system.pipeline.autoRefreshOn') : $t('system.pipeline.autoRefreshOff') }}
          </button>
          <button
            class="btn btn-primary btn-sm"
            :disabled="loading"
            @click="refresh"
          >
            {{ loading ? $t('system.pipeline.refreshing') : $t('system.pipeline.refresh') }}
          </button>
          <button
            class="data-panel-close"
            @click="close"
          >
            &times;
          </button>
        </div>
      </div>
      <div class="data-panel-body">
        <SsLoading
          v-if="loading && tagDataList.length === 0"
          :text="$t('common.loading')"
          size="small"
        />
        <div
          v-else-if="tagDataList.length === 0"
          class="data-panel-empty"
        >
          {{ $t('system.devices.noTagData') }}
        </div>
        <table
          v-else
          class="tag-data-table"
        >
          <thead>
            <tr>
              <th>{{ $t('system.devices.tagName') }}</th>
              <th>{{ $t('system.devices.tagAddress') }}</th>
              <th class="desc-col">
                {{ $t('system.devices.tagDescription') }}
              </th>
              <th>{{ $t('system.devices.tagDataType') }}</th>
              <th class="dir-col">
                {{ $t('system.devices.tagDirection') }}
              </th>
              <th class="unit-col">
                {{ $t('system.devices.tagUnit') }}
              </th>
              <th class="num-col">
                {{ $t('system.devices.tagScanRate') }}
              </th>
              <th class="num-col">
                {{ $t('system.devices.tagValue') }}
              </th>
              <th class="quality-col">
                {{ $t('system.devices.tagQuality') }}
              </th>
              <th>{{ $t('system.devices.tagUpdatedAt') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tag in tagDataList"
              :key="tag.id || tag.name"
            >
              <td class="tag-name">
                {{ tag.name }}
              </td>
              <td class="tag-address mono">
                {{ tag.address || '-' }}
              </td>
              <td class="tag-desc">
                {{ tag.description || '-' }}
              </td>
              <td>
                <span class="type-badge">{{ tag.dataType || '-' }}</span>
              </td>
              <td>
                <span
                  class="dir-badge"
                  :class="'dir-' + (tag.direction || 'read')"
                >{{ directionLabel(tag.direction) }}</span>
              </td>
              <td class="tag-unit">
                {{ tag.unit || '-' }}
              </td>
              <td class="num-col mono">
                {{ tag.scanRate != null ? tag.scanRate + 'ms' : '-' }}
              </td>
              <td class="num-col">
                <span
                  class="tag-value"
                  :class="{ 'value-null': tag.value === null || tag.value === undefined }"
                >
                  {{ tag.wsDisplayValue ?? formatTagValue(tag.value, tag.displayFormat) }}
                </span>
              </td>
              <td>
                <span
                  class="quality-badge"
                  :class="'q-' + tag.quality"
                >{{ qualityLabel(tag.quality) }}</span>
              </td>
              <td class="tag-time mono">
                {{ formatTime(tag.timestamp) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="lastRefreshAt"
        class="data-panel-footer"
      >
        {{ $t('system.pipeline.lastRefresh') }}: {{ formatTime(lastRefreshAt) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, onActivated, onDeactivated } from 'vue';
import type { Device, DataTag } from '../../../types/api';
import { deviceApi } from '../../../api/modules/device.api';
import { SsLoading } from '@scada-editor/shared';
import { formatTagValue } from '../../../utils/format';
import { useWsStore } from '../../../stores/ws.store';

/** 标签数据列表项（合并标签定义 + 实时值） */
interface TagDataItem {
  id: string;
  name: string;
  address: string;
  dataType: string;
  value: unknown;
  quality: string;
  timestamp: string | number | null;
  displayFormat?: string;
  /** 后端 FormatStep 产出的格式化字符串，WS 推送时携带 */
  wsDisplayValue?: string;
  /** 标签定义静态字段 */
  description?: string;
  direction?: string;
  unit?: string;
  scanRate?: number;
}

const props = defineProps<{
  device: Device | null;
  projectId: string;
  visible: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const wsStore = useWsStore();
const tagDataList = ref<TagDataItem[]>([]);
const loading = ref(false);
const autoRefresh = ref(false);
const lastRefreshAt = ref<string | null>(null);
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function close() {
  emit('update:visible', false);
}

async function refresh() {
  if (!props.device || !props.projectId) return;
  loading.value = true;
  try {
    const [deviceRes, latestRes] = await Promise.all([
      deviceApi.getById(props.projectId, props.device.id),
      deviceApi.getLatestValues(props.projectId, props.device.id).catch(() => ({ data: {} as Record<string, { value?: unknown; quality?: string; timestamp?: string | null }> })),
    ]);
    const device: Device = deviceRes.data as Device;
    const tags: DataTag[] = Array.isArray(device.tags) ? device.tags : [];
    const latestValues = latestRes?.data || {};
    const wsTagValues = wsStore.tagValues;
    tagDataList.value = tags.map((tag) => {
      const httpEntry = latestValues[tag.id];
      const wsEntry = wsTagValues.get(tag.id);
      // WS 值优先于 HTTP 值
      const entry = wsEntry || (httpEntry ? { value: httpEntry.value, quality: httpEntry.quality || 'good', timestamp: httpEntry.timestamp } : null);
      return {
        id: tag.id,
        name: tag.name,
        address: tag.address,
        dataType: tag.dataType,
        displayFormat: tag.displayFormat,
        value: entry?.value ?? null,
        wsDisplayValue: wsEntry?.displayValue,
        quality: entry?.quality ?? 'N/A',
        timestamp: entry?.timestamp ?? null,
        description: tag.description,
        direction: tag.direction,
        unit: tag.unit,
        scanRate: tag.scanRate,
      };
    });
    lastRefreshAt.value = new Date().toISOString();
  } catch (err: unknown) {
    tagDataList.value = [];
    if (import.meta.env.DEV) console.warn('[DeviceDataPanel] refresh failed:', err);
  } finally {
    loading.value = false;
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => {
    if (props.device && props.projectId) {
      refresh();
    }
  }, 5000);
}

function stopAutoRefresh() {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// ──────── WebSocket 实时订阅 ────────

async function subscribeWsTags() {
  if (!props.projectId || !props.device) return;
  try {
    await wsStore.connect(props.projectId);
    const tags: DataTag[] = Array.isArray(props.device.tags) ? props.device.tags : [];
    const tagIds = tags.map((t) => t.id);
    if (tagIds.length > 0) {
      wsStore.subscribeTags(tagIds);
    }
  } catch {
    // WS 不可用时降级为 HTTP 轮询模式
  }
}

function unsubscribeWsTags() {
  if (!props.device) return;
  const tags: DataTag[] = Array.isArray(props.device.tags) ? props.device.tags : [];
  const tagIds = tags.map((t) => t.id);
  if (tagIds.length > 0) {
    wsStore.unsubscribeTags(tagIds);
  }
}

// WebSocket 实时推送驱动：WS 收到新值即增量更新表格
// store 每次推送都会 reassign tagValues Map 引用，浅 watch 即可触发
watch(
  () => wsStore.tagValues,
  () => {
    if (tagDataList.value.length === 0) return;
    const wsTagValues = wsStore.tagValues;
    let changed = false;
    const newList = tagDataList.value.map((row) => {
      const wsEntry = wsTagValues.get(row.id);
      if (!wsEntry) return row;
      changed = true;
      return {
        ...row,
        value: wsEntry.value,
        wsDisplayValue: wsEntry.displayValue,
        quality: wsEntry.quality,
        timestamp: wsEntry.timestamp,
      };
    });
    if (changed) {
      tagDataList.value = newList;
    }
  },
);

// ──────── 生命周期 ────────

// 面板打开时自动刷新 + WS 订阅
watch(() => props.visible, (val) => {
  if (val) {
    autoRefresh.value = false;
    refresh();
    subscribeWsTags();
  } else {
    tagDataList.value = [];
    stopAutoRefresh();
    unsubscribeWsTags();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
  unsubscribeWsTags();
});

// P1优化：keep-alive 缓存场景下，弹窗关闭/打开时停止/恢复定时器和 WS 订阅
onDeactivated(() => {
  stopAutoRefresh();
  unsubscribeWsTags();
});

onActivated(() => {
  if (autoRefresh.value && props.visible) {
    startAutoRefresh();
  }
  if (props.visible && props.projectId && props.device?.id) {
    subscribeWsTags();
  }
});

function formatTime(val?: string | number | Date | null): string {
  if (!val && val !== 0) return '-';
  try {
    let d: Date;
    if (val instanceof Date) {
      d = val;
    } else if (typeof val === 'number') {
      d = new Date(val);
    } else if (typeof val === 'string') {
      const sqliteMatch = val.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
      if (sqliteMatch) {
        d = new Date(`${sqliteMatch[1]}T${sqliteMatch[2]}Z`);
      } else {
        d = new Date(val);
      }
    } else {
      return '-';
    }
    if (isNaN(d.getTime())) return '-';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  } catch {
    return '-';
  }
}

function qualityLabel(q: string): string {
  const labels: Record<string, string> = {
    good: 'good',
    bad: 'bad',
    uncertain: 'uncertain',
    NOP: 'NOP',
    OOS: 'OOS',
  };
  return labels[q] || q || '-';
}

function directionLabel(d?: string): string {
  const labels: Record<string, string> = {
    read: '读',
    write: '写',
    'read-write': '读写',
  };
  return d ? (labels[d] || d) : '读';
}

</script>

<style scoped>
.data-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.data-panel {
  background: var(--background);
  border-radius: 12px;
  width: 95%;
  max-width: 1200px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
}

.data-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.data-panel-title {
  flex: 1;
  overflow: hidden;
}

.data-panel-title h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-panel-sub {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
}

.data-panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.data-panel-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 18px;
  transition: all 0.15s;
}

.data-panel-close:hover {
  color: var(--text);
  background: var(--border-light);
}

.data-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.data-panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  gap: 12px;
  font-size: 14px;
}

.tag-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tag-data-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
}

.tag-data-table td {
  padding: 10px 12px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.tag-name {
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-address {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.mono {
  font-family: 'Courier New', monospace;
}

.tag-value {
  font-weight: 600;
  color: var(--text);
}

.tag-value.value-null {
  color: var(--text-secondary);
  font-style: italic;
}

.tag-time {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.num-col {
  text-align: right;
  min-width: 120px;
}

.auto-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
  margin-right: 6px;
}

.auto-dot.active {
  background: var(--status-online);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.data-panel-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.5;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: var(--button-text); }
.btn-primary:hover:not(:disabled) { background: var(--button-hover); }
.btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover:not(:disabled) { background: var(--border-light); }
.btn-sm { padding: 6px 12px; font-size: 13px; }

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.dir-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.dir-badge.dir-read { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); }
.dir-badge.dir-write { background: var(--status-warning); color: #fff; }
.dir-badge.dir-read-write { background: var(--primary); color: var(--button-text); }

.quality-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.quality-badge.q-good { background: var(--status-online); color: #fff; }
.quality-badge.q-bad { background: var(--status-error); color: #fff; }
.quality-badge.q-uncertain { background: var(--status-warning); color: #fff; }
.quality-badge.q-NOP, .quality-badge.q-OOS { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); }

.tag-desc {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
  font-size: 12px;
}

.tag-unit {
  color: var(--text-secondary);
  font-size: 12px;
}

.desc-col { min-width: 80px; }
.dir-col { width: 60px; }
.unit-col { width: 60px; }
.quality-col { width: 80px; }
</style>