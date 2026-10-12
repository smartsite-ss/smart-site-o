<template>
  <div class="plugin-monitor">
    <div class="page-header">
      <button
        class="sys-btn sys-btn-secondary sys-btn-sm"
        @click="goBack"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <line
            x1="19"
            y1="12"
            x2="5"
            y2="12"
          />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        {{ $t('system.plugins.backToList') }}
      </button>
      <button
        class="sys-btn sys-btn-secondary sys-btn-sm"
        @click="goToDetail"
      >
        {{ $t('system.plugins.pluginDetail') }}
      </button>
    </div>

    <SsLoading
      v-if="store.loading && !pluginInfo"
      :text="$t('system.plugins.loading')"
      size="small"
    />

    <div
      v-else-if="store.error"
      class="error-state"
    >
      <p>{{ store.error }}</p>
      <button
        class="sys-btn sys-btn-secondary"
        @click="fetchData"
      >
        {{ $t('system.plugins.retry') }}
      </button>
    </div>

    <div
      v-else
      class="monitor-content"
    >
      <!-- 插件基本信息 -->
      <div class="info-panel">
        <div class="info-header">
          <div class="info-title">
            <h2>{{ pluginInfo?.displayName || protocol || '—' }}</h2>
            <span
              class="sys-status-badge"
              :class="'sys-status-' + (pluginInfo?.status || 'registered')"
            >
              {{ statusLabel(pluginInfo?.status) }}
            </span>
            <span class="version-badge">{{ pluginInfo?.version }}</span>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.protocol') }}</span>
            <span class="info-value mono">{{ pluginInfo?.protocol || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.description') }}</span>
            <span class="info-value">{{ pluginInfo?.description || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.category') }}</span>
            <span class="info-value">{{ categoryLabel(pluginInfo?.category) || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.transport') }}</span>
            <span class="info-value">{{ pluginInfo?.transport || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.registeredAt') }}</span>
            <span class="info-value">{{ formatDate(pluginInfo?.registeredAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.activatedAt') }}</span>
            <span class="info-value">{{ formatDate(pluginInfo?.activatedAt) }}</span>
          </div>
        </div>
      </div>

      <!-- 设备层 + 进程性能：两列并排 -->
      <div class="dashboard-row">
        <div class="device-panel">
          <h3 class="section-title">
            {{ $t('system.plugins.deviceLayer') }}
          </h3>
          <div class="device-stats-grid">
            <div class="device-stat-card">
              <span class="device-stat-label">{{ $t('system.plugins.deviceTotal') }}</span>
              <span class="device-stat-value">{{ deviceStats?.total ?? 0 }}</span>
            </div>
            <div class="device-stat-card online">
              <span class="device-stat-label">{{ $t('system.plugins.deviceOnline') }}</span>
              <span class="device-stat-value">
                <span class="sys-stat-dot sys-stat-dot-online" />
                {{ deviceStats?.online ?? 0 }}
              </span>
            </div>
            <div class="device-stat-card offline">
              <span class="device-stat-label">{{ $t('system.plugins.deviceOffline') }}</span>
              <span class="device-stat-value">
                <span class="sys-stat-dot sys-stat-dot-offline" />
                {{ deviceStats?.offline ?? 0 }}
              </span>
            </div>
            <div class="device-stat-card error">
              <span class="device-stat-label">{{ $t('system.plugins.deviceError') }}</span>
              <span class="device-stat-value">
                <span class="sys-stat-dot sys-stat-dot-error" />
                {{ deviceStats?.error ?? 0 }}
              </span>
            </div>
          </div>
        </div>

        <div class="process-panel">
          <h3 class="section-title">
            {{ $t('system.plugins.processMetrics') }}
          </h3>
          <div class="process-info-row">
            <div class="process-info-item">
              <span class="process-info-label">{{ $t('system.plugins.processName') }}</span>
              <span class="process-info-value mono">{{ monitorData?.processName || '—' }}</span>
            </div>
            <div class="process-info-item">
              <span class="process-info-label">{{ monitorData?.isolationMode === 'worker_thread' ? $t('system.plugins.threadId') : $t('system.plugins.processId') }}</span>
              <span class="process-info-value mono">{{ monitorData?.isolationMode === 'worker_thread' ? (monitorData?.threadId ? 'TID: ' + monitorData.threadId : '—') : (monitorData?.processId ? 'PID: ' + monitorData.processId : '—') }}</span>
            </div>
            <div class="process-info-item">
              <span class="process-info-label">{{ $t('system.plugins.isolationMode') }}</span>
              <span class="process-info-value">{{ isolationModeLabel(monitorData?.isolationMode) }}</span>
            </div>
            <div class="process-info-item">
              <span class="process-info-label">{{ $t('system.plugins.uptime') }}</span>
              <span class="process-info-value mono">{{ uptime }}</span>
            </div>
          </div>
          <div class="process-grid">
            <div class="process-item">
              <span class="process-label">{{ $t('system.plugins.memoryUsage') }} (Heap)</span>
              <div class="progress-bar">
                <div
                  class="progress-fill heap"
                  :style="{ width: heapPercent + '%' }"
                />
              </div>
              <span class="process-value">{{ heapUsed }} MB / {{ heapTotal }} MB</span>
            </div>
            <div class="process-item">
              <span class="process-label">{{ $t('system.plugins.memoryUsage') }} (RSS)</span>
              <div class="progress-bar">
                <div
                  class="progress-fill rss"
                  :style="{ width: rssPercent + '%' }"
                />
              </div>
              <span class="process-value">{{ rss }} MB</span>
            </div>
            <div class="process-item">
              <span class="process-label">{{ $t('system.plugins.cpuUsage') }}</span>
              <div class="progress-bar">
                <div
                  class="progress-fill cpu"
                  :style="{ width: cpuUsage + '%' }"
                />
              </div>
              <span class="process-value">{{ cpuUsage }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 工作日志 -->
      <div class="log-panel">
        <div class="log-header">
          <h3
            class="section-title"
            style="margin: 0"
          >
            {{ $t('system.plugins.acquisitionLogs') }}
          </h3>
          <div class="log-actions">
            <button
              class="sys-btn sys-btn-secondary sys-btn-sm"
              :disabled="refreshing"
              @click="refreshMonitor"
            >
              {{ refreshing ? $t('system.plugins.refreshing') : $t('system.plugins.refresh') }}
            </button>
            <button
              class="sys-btn sys-btn-danger sys-btn-sm"
              :disabled="clearing"
              @click="handleClearLogs"
            >
              {{ clearing ? $t('system.plugins.clearing') : $t('system.plugins.clearLogs') }}
            </button>
          </div>
        </div>

        <div
          ref="logContainerRef"
          class="log-container"
        >
          <div
            v-if="logs.length === 0"
            class="log-empty"
          >
            {{ $t('system.plugins.noLogs') }}
          </div>
          <div
            v-for="(entry, index) in logs"
            :key="index"
            class="log-entry"
            :class="'log-' + entry.level"
          >
            <span class="log-line-num">{{ index + 1 }}</span>
            <span class="log-timestamp">{{ entry.timestamp }}</span>
            <span
              class="log-level"
              :class="'level-' + entry.level"
            >{{ entry.level.toUpperCase() }}</span>
            <span class="log-message">{{ entry.message }}</span>
          </div>
        </div>

        <div class="log-path-hint">
          <span class="log-file-label">{{ $t('system.plugins.logFile') }}:</span>
          <span class="log-file-path mono">{{ monitorData?.logFilePath || '—' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { showConfirm } from '../../utils/messageBox';
import { pluginApi } from '../../api/modules/plugin.api';
import { usePluginStore } from '../../stores/plugin.store';
import type { PluginInfo, PluginMonitorData, DeviceStats } from '../../api/types/plugin';
import { SsLoading } from '@scada-editor/shared';

const router = useRouter();
const route = useRoute();
const store = usePluginStore();
const { t } = useI18n();

const protocol = route.params.protocol as string;

const monitorData = ref<PluginMonitorData | null>(null);
const pluginInfo = ref<PluginInfo | null>(null);
const deviceStats = ref<DeviceStats | null>(null);
const refreshing = ref(false);
const clearing = ref(false);
const logContainerRef = ref<HTMLElement | null>(null);

const STATUS_LABELS: Record<string, string> = {
  active: t('system.plugins.statusActive'),
  inactive: t('system.plugins.statusInactive'),
  registered: t('system.plugins.statusRegistered'),
  error: t('system.plugins.statusError'),
  unregistered: t('system.plugins.statusUnregistered'),
};

const unregisterChecks = {
  categoryLabels: {
    industrial_bus: t('system.plugins.categoryIndustrialBus'),
    iot: t('system.plugins.categoryIot'),
    power: t('system.plugins.categoryPower'),
    building: t('system.plugins.categoryBuilding'),
    custom: t('system.plugins.categoryCustom'),
  } as Record<string, string>,
};

function isolationModeLabel(mode?: string): string {
  const labels: Record<string, string> = {
    in_process: t('system.plugins.isolationInProcess'),
    worker_thread: t('system.plugins.isolationWorkerThread'),
    child_process: t('system.plugins.isolationChildProcess'),
  };
  return labels[mode || ''] || mode || '—';
}

function statusLabel(status?: string): string {
  return STATUS_LABELS[status || ''] || status || '—';
}

function categoryLabel(category?: string): string {
  if (!category) return '—';
  return unregisterChecks.categoryLabels[category] || category;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

const metrics = computed(() => monitorData.value?.metrics || { heapUsed: 0, heapTotal: 0, rss: 0, cpuUsage: 0, uptime: 0 });

const LOG_LINE_REGEX = /^\[([^\]]+)\]\s*\[(\w+)\]\s*(.+)$/;

function parseLogLine(line: string): { timestamp: string; level: string; message: string } {
  const match = line.match(LOG_LINE_REGEX);
  if (match) {
    return {
      timestamp: match[1],
      level: match[2].toLowerCase(),
      message: match[3],
    };
  }
  return {
    timestamp: '',
    level: 'info',
    message: line,
  };
}

const logs = computed(() => {
  const raw = monitorData.value?.logs || [];
  return raw.map((entry: string) => parseLogLine(entry));
});

const heapUsed = computed(() => {
  const v = metrics.value.heapUsed;
  return typeof v === 'number' ? Number(v.toFixed(1)) : 0;
});

const heapTotal = computed(() => {
  const v = metrics.value.heapTotal;
  return typeof v === 'number' ? Number(v.toFixed(1)) : 0;
});

const rss = computed(() => {
  const v = metrics.value.rss;
  return typeof v === 'number' ? Number(v.toFixed(1)) : 0;
});

const cpuUsage = computed(() => {
  const v = metrics.value.cpuUsage;
  return typeof v === 'number' ? Number(v.toFixed(1)) : 0;
});

const heapPercent = computed(() => {
  if (heapTotal.value <= 0) return 0;
  return Math.min(100, (heapUsed.value / heapTotal.value) * 100);
});

const rssPercent = computed(() => {
  return Math.min(100, rss.value / 10); // 每 10MB = 10%
});

const uptime = computed(() => {
  const sec = metrics.value.uptime;
  if (!sec || sec <= 0) return '0s';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
});

function unwrap(res: any): any {
  return res?.data?.data ?? res?.data ?? res;
}

async function fetchData() {
  store.clearError();
  try {
    const res = await pluginApi.getByProtocol(protocol);
    pluginInfo.value = unwrap(res) as PluginInfo;
  } catch {
    // plugin info fetch failed
  }

  try {
    const res = await pluginApi.getDeviceStats();
    const stats = unwrap(res) as Record<string, DeviceStats>;
    deviceStats.value = stats[protocol] || { total: 0, online: 0, offline: 0, error: 0, other: 0 };
  } catch {
    deviceStats.value = { total: 0, online: 0, offline: 0, error: 0, other: 0 };
  }

  try {
    const res = await pluginApi.getMonitor(protocol);
    monitorData.value = unwrap(res) as PluginMonitorData;
  } catch {
    monitorData.value = null;
  }
}

async function refreshMonitor() {
  refreshing.value = true;
  try {
    const res = await pluginApi.getMonitor(protocol);
    monitorData.value = unwrap(res) as PluginMonitorData;
    await nextTick();
    scrollToBottom();
  } catch {
    // keep current data
  } finally {
    refreshing.value = false;
  }
}

async function handleClearLogs() {
  if (!(await showConfirm(t('system.plugins.confirmClearLogs')))) return;
  clearing.value = true;
  try {
    await pluginApi.clearMonitorLogs(protocol);
    if (monitorData.value) {
      monitorData.value.logs = [];
    }
  } catch {
    // error handled silently
  } finally {
    clearing.value = false;
  }
}

function scrollToBottom() {
  if (logContainerRef.value) {
    logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
  }
}

watch(
  () => monitorData.value?.logs,
  () => {
    nextTick(scrollToBottom);
  },
);

function goBack() {
  router.push('/system/plugins');
}

function goToDetail() {
  router.push(`/system/plugins/${protocol}`);
}

onMounted(() => {
  if (protocol) {
    fetchData();
  }
});
</script>

<style scoped>
.plugin-monitor {
  padding: 20px 24px 32px;
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* 信息面板 */
.info-panel,
.log-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 20px;
}

/* 两列并排面板 */
.dashboard-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 20px;
  margin-bottom: 20px;
}

.dashboard-row .device-panel,
.dashboard-row .process-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 0;
}

.info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.info-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-title h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.version-badge {
  display: inline-block;
  padding: 1px 6px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 13px;
  color: var(--text);
}

.info-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--primary);
  background: var(--background);
  padding: 1px 6px;
  border-radius: 3px;
  display: inline-block;
  width: fit-content;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 14px 0;
}

/* 设备统计 */
.device-stats-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.device-stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--background);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.device-stat-card.online {
  border-color: rgba(var(--status-success-rgb), 0.3);
}

.device-stat-card.offline {
  border-color: rgba(var(--text-secondary-rgb), 0.3);
}

.device-stat-card.error {
  border-color: rgba(var(--status-error-rgb), 0.3);
}

.device-stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.device-stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 进程指标 */
.process-info-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 16px;
  margin-bottom: 14px;
  padding: 14px 16px;
  background: var(--background);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.process-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.process-info-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.process-info-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.process-info-value.mono {
  font-family: 'Courier New', monospace;
}

.process-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.process-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.process-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.progress-bar {
  height: 8px;
  background: var(--background);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.progress-fill.heap { background: var(--primary); }
.progress-fill.rss { background: var(--status-info); }
.progress-fill.cpu { background: var(--status-warning); }

.process-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

/* 日志 */
.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.log-actions {
  display: flex;
  gap: 8px;
}

.log-container {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 420px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.7;
}

.log-empty {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-secondary);
}

.log-entry {
  display: flex;
  gap: 8px;
  padding: 3px 12px;
  border-bottom: 1px solid var(--border);
  align-items: baseline;
}

.log-entry:hover {
  background: rgba(var(--primary-rgb), 0.05);
}

.log-line-num {
  color: var(--text-secondary);
  width: 32px;
  text-align: right;
  opacity: 0.6;
  flex-shrink: 0;
}

.log-timestamp {
  color: var(--text-secondary);
  width: 85px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-level {
  width: 48px;
  font-weight: 600;
  flex-shrink: 0;
}

.level-info { color: var(--status-info); }
.level-warn { color: var(--status-warning); }
.level-error { color: var(--status-error); }
.level-debug { color: var(--text-secondary); }

.log-message {
  color: var(--text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-path-hint {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.log-file-label {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.log-file-path {
  color: var(--text);
  opacity: 0.7;
  word-break: break-all;
}

.log-file-path.mono {
  font-family: 'Courier New', monospace;
}

</style>
