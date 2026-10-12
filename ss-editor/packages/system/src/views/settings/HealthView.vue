<template>
  <div class="health-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.settings.systemHealth') }}
      </h1>
      <button
        class="sys-btn sys-btn-secondary sys-btn-sm"
        @click="refresh"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        ><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
        {{ $t('system.health.refresh') }}
      </button>
    </div>

    <!-- 总体状态横幅 -->
    <div
      class="status-banner"
      :class="'status-' + healthStatus"
    >
      <span class="status-dot" />
      <span class="status-text">{{ healthStatusText }}</span>
      <span class="status-uptime">{{ $t('system.health.uptime') }}: {{ formatUptime(detailedHealth?.uptime) }}</span>
    </div>

    <!-- 探针检查结果 -->
    <div class="section">
      <h3 class="section-title">
        {{ $t('system.health.probes') }}
      </h3>
      <div class="probes-grid">
        <div
          v-for="(probe, key) in detailedHealth?.checks"
          :key="key"
          class="probe-card"
          :class="'probe-' + probe.status"
        >
          <div class="probe-header">
            <span class="probe-name">{{ getProbeLabel(key) }}</span>
            <span
              class="probe-badge"
              :class="'badge-' + probe.status"
            >{{ probeStatusText(probe.status) }}</span>
          </div>
          <div class="probe-body">
            <span class="probe-message">{{ probe.message }}</span>
            <span class="probe-latency">{{ probe.latencyMs }}ms</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 资源指标 -->
    <div class="section">
      <h3 class="section-title">
        {{ $t('system.health.resources') }}
      </h3>
      <div class="resources-grid">
        <!-- 内存 -->
        <div class="resource-card">
          <div class="resource-header">
            <span class="resource-label">{{ $t('system.health.memory') }}</span>
            <span class="resource-value">{{ formatBytes(detailedHealth?.memory?.used) }} / {{ formatBytes(detailedHealth?.memory?.total) }}</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: (detailedHealth?.memory?.usagePercent || 0) + '%' }"
              :class="getThresholdClass(detailedHealth?.memory?.usagePercent || 0, 'memory')"
            />
          </div>
          <div class="resource-footer">
            <span class="resource-pct">{{ detailedHealth?.memory?.usagePercent || 0 }}%</span>
            <span
              v-if="detailedHealth?.memoryThresholds"
              class="resource-threshold"
            >
              {{ $t('system.health.memoryWarnThreshold') }}: {{ detailedHealth.memoryThresholds.warnPercent }}% / {{ $t('system.health.memoryCriticalThreshold') }}: {{ detailedHealth.memoryThresholds.criticalPercent }}%
            </span>
          </div>
        </div>

        <!-- CPU -->
        <div class="resource-card">
          <div class="resource-header">
            <span class="resource-label">{{ $t('system.health.cpuLoad') }}</span>
            <span class="resource-value">{{ formattedCpuLoad }}</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: Math.min((cpuLoadPercent || 0), 100) + '%' }"
              :class="getProgressClass(cpuLoadPercent || 0)"
            />
          </div>
          <span class="resource-pct">{{ cpuLoadPercent }}%</span>
        </div>
      </div>
    </div>

    <!-- 磁盘分区详情 -->
    <div
      v-if="detailedHealth?.disks"
      class="section"
    >
      <h3 class="section-title">
        {{ $t('system.health.diskPartitions') }}
      </h3>
      <div class="resources-grid">
        <div
          v-for="(disk, key) in detailedHealth.disks"
          :key="key"
          class="resource-card disk-card"
          :class="'disk-' + disk.status"
        >
          <div class="resource-header">
            <span class="resource-label">{{ getDiskLabel(key) }}</span>
            <span
              class="disk-status-badge"
              :class="'badge-' + disk.status"
            >{{ diskStatusText(disk.status) }}</span>
          </div>
          <div
            class="disk-path mono"
            :title="disk.path"
          >
            {{ disk.path }}
          </div>
          <div class="disk-usage-row">
            <span class="disk-usage-text">{{ disk.usedFormatted }} / {{ disk.totalFormatted }}</span>
            <span class="disk-usage-pct">{{ disk.usagePercent }}%</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: (disk.usagePercent || 0) + '%' }"
              :class="getDiskProgressClass(disk.status)"
            />
          </div>
          <div class="disk-free-row">
            <span class="disk-free-label">{{ $t('system.health.diskFree') }}:</span>
            <span class="disk-free-value">{{ disk.freeFormatted }}</span>
          </div>
        </div>
      </div>
      <div
        v-if="detailedHealth?.diskThresholds"
        class="threshold-info"
      >
        {{ $t('system.health.diskWarnThreshold') }}: {{ detailedHealth.diskThresholds.warnPercent }}% / {{ $t('system.health.diskCriticalThreshold') }}: {{ detailedHealth.diskThresholds.criticalPercent }}%
      </div>
    </div>

    <!-- 系统信息 -->
    <div class="section">
      <h3 class="section-title">
        {{ $t('system.health.systemInfo') }}
      </h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Node.js</span>
          <span class="info-value">{{ detailedHealth?.nodeVersion }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t('system.health.platform') }}</span>
          <span class="info-value">{{ detailedHealth?.platform }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t('system.health.hostname') }}</span>
          <span class="info-value">{{ detailedHealth?.hostname }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">PID</span>
          <span class="info-value">{{ detailedHealth?.pid }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { systemApi } from '../../api/modules/system.api';

const { t } = useI18n();

interface HealthProbeResult {
  status: 'pass' | 'warn' | 'error';
  message?: string;
  latencyMs: number;
}

interface DiskPartitionInfo {
  path: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usagePercent: number;
  totalFormatted: string;
  freeFormatted: string;
  usedFormatted: string;
  status: 'normal' | 'warning' | 'critical';
}

interface DetailedHealth {
  status: 'ok' | 'degraded' | 'error';
  checks: Record<string, HealthProbeResult>;
  uptime: number;
  memory: { total: number; free: number; used: number; usagePercent: number };
  memoryThresholds?: { warnPercent: number; criticalPercent: number };
  cpuLoad: number[];
  nodeVersion: string;
  platform: string;
  hostname: string;
  pid: number;
  disks?: {
    appDir: DiskPartitionInfo;
    dataDir: DiskPartitionInfo;
    backupDir: DiskPartitionInfo;
  };
  diskThresholds?: { warnPercent: number; criticalPercent: number };
}

const detailedHealth = ref<DetailedHealth | null>(null);
const loading = ref(false);

const healthStatus = computed(() => detailedHealth.value?.status || 'ok');
const healthStatusText = computed(() => {
  const map: Record<string, string> = {
    ok: t('system.health.statusOk'),
    degraded: t('system.health.statusDegraded'),
    error: t('system.health.statusError'),
  };
  return map[healthStatus.value] || healthStatus.value;
});

const cpuLoadPercent = computed(() => {
  const load = detailedHealth.value?.cpuLoad;
  if (!load || !load.length) return 0;
  return Math.round(load[0] * 10) / 10;
});

const formattedCpuLoad = computed(() => {
  const load = detailedHealth.value?.cpuLoad;
  if (!load || !load.length) return '-';
  return load.map((v) => v.toFixed(2)).join(' / ');
});

async function fetchHealth() {
  loading.value = true;
  try {
    const res = await systemApi.getHealthDetails();
    detailedHealth.value = (res as any).data || (res as any);
  } catch {
    // 静默失败
  } finally {
    loading.value = false;
  }
}

function refresh() {
  fetchHealth();
}

function getProbeLabel(key: string): string {
  const labels: Record<string, string> = {
    database: t('system.health.probeDatabase'),
    influxdb: t('system.health.probeInfluxdb'),
    memory: t('system.health.probeMemory'),
    disk: t('system.health.probeDisk'),
  };
  return labels[key] || key;
}

function probeStatusText(status: string): string {
  const map: Record<string, string> = {
    pass: t('system.health.probePass'),
    warn: t('system.health.probeWarn'),
    error: t('system.health.probeError'),
  };
  return map[status] || status;
}

function getDiskLabel(key: string): string {
  const labels: Record<string, string> = {
    appDir: t('system.health.appDir'),
    dataDir: t('system.health.dataDir'),
    backupDir: t('system.health.backupDir'),
  };
  return labels[key] || key;
}

function diskStatusText(status: string): string {
  const map: Record<string, string> = {
    normal: t('system.health.statusNormal'),
    warning: t('system.health.statusWarning'),
    critical: t('system.health.statusCritical'),
  };
  return map[status] || status;
}

/** 根据内存/磁盘阈值返回进度条样式类 */
function getThresholdClass(pct: number, type: 'memory' | 'disk'): string {
  const thresholds = type === 'memory'
    ? detailedHealth.value?.memoryThresholds
    : detailedHealth.value?.diskThresholds;
  const warn = thresholds?.warnPercent ?? 70;
  const critical = thresholds?.criticalPercent ?? 85;
  if (pct >= critical) return 'danger';
  if (pct >= warn) return 'warning';
  return 'normal';
}

function getDiskProgressClass(status: string): string {
  if (status === 'critical') return 'danger';
  if (status === 'warning') return 'warning';
  return 'normal';
}

function getProgressClass(pct: number): string {
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warning';
  return 'normal';
}

function formatUptime(seconds?: number): string {
  if (!seconds && seconds !== 0) return '-';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

onMounted(() => {
  fetchHealth();
});
</script>

<style scoped>
.health-page {
  padding: 24px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

/* 总体状态横幅 */
.status-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 10px;
  margin-bottom: 24px;
  font-size: 15px;
  font-weight: 600;
}

.status-banner.status-ok {
  background: color-mix(in srgb, var(--status-online) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-online) 30%, transparent);
  color: var(--status-online);
}

.status-banner.status-degraded {
  background: color-mix(in srgb, var(--status-warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-warning) 30%, transparent);
  color: var(--status-warning);
}

.status-banner.status-error {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-error) 30%, transparent);
  color: var(--status-error);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-ok .status-dot { background: var(--status-online); }
.status-degraded .status-dot { background: var(--status-warning); }
.status-error .status-dot { background: var(--status-error); }

.status-uptime {
  margin-left: auto;
  font-size: 13px;
  opacity: 0.7;
  font-weight: 400;
}

/* 区块 */
.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

/* 探针 */
.probes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.probe-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
}

.probe-card.probe-pass { border-left: 3px solid var(--status-online); }
.probe-card.probe-warn { border-left: 3px solid var(--status-warning); }
.probe-card.probe-error { border-left: 3px solid var(--status-error); }

.probe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.probe-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.probe-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.badge-pass,
.badge-normal { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.badge-warn,
.badge-warning { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
.badge-error,
.badge-critical { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }

.probe-body {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.probe-latency {
  font-family: monospace;
}

/* 资源指标 */
.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.resource-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
}

.disk-card.disk-normal { border-left: 3px solid var(--status-online); }
.disk-card.disk-warning { border-left: 3px solid var(--status-warning); }
.disk-card.disk-critical { border-left: 3px solid var(--status-error); }

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.resource-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.resource-value {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: monospace;
}

.resource-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.resource-pct {
  font-size: 12px;
  color: var(--text-secondary);
}

.resource-threshold {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
}

/* 磁盘卡片 */
.disk-path {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.disk-path.mono {
  font-family: monospace;
}

.disk-usage-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
}

.disk-usage-text {
  color: var(--text);
  font-family: monospace;
}

.disk-usage-pct {
  font-weight: 600;
  color: var(--text);
}

.disk-status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.disk-free-row {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
}

.disk-free-label {
  color: var(--text-secondary);
}

.disk-free-value {
  color: var(--text);
  font-family: monospace;
}

.threshold-info {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
  opacity: 0.8;
}

.progress-bar {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-fill.normal { background: var(--status-online); }
.progress-fill.warning { background: var(--status-warning); }
.progress-fill.danger { background: var(--status-error); }

/* 系统信息 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
}

.info-label {
  color: var(--text-secondary);
}

.info-value {
  font-weight: 500;
  color: var(--text);
  font-family: monospace;
}
</style>
