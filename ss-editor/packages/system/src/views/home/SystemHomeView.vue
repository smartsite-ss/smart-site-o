<template>
  <div class="system-home">
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title">
          {{ $t('system.home.title') }}
        </h1>
        <span class="page-subtitle">{{ $t('system.home.subtitle') }}</span>
      </div>
      <button
        class="refresh-btn"
        :title="$t('system.layout.refresh')"
        :disabled="loading"
        @click="loadOverviewData(true)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :class="{ spinning: loading }"
        ><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
      </button>
    </div>

    <div class="stats-grid">
      <div class="stat-card stat-card--devices">
        <div class="stat-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="2"
            ry="2"
          /><rect
            x="9"
            y="9"
            width="6"
            height="6"
          /><line
            x1="9"
            y1="1"
            x2="9"
            y2="4"
          /><line
            x1="15"
            y1="1"
            x2="15"
            y2="4"
          /><line
            x1="9"
            y1="20"
            x2="9"
            y2="23"
          /><line
            x1="15"
            y1="20"
            x2="15"
            y2="23"
          /><line
            x1="20"
            y1="9"
            x2="23"
            y2="9"
          /><line
            x1="20"
            y1="14"
            x2="23"
            y2="14"
          /><line
            x1="1"
            y1="9"
            x2="4"
            y2="9"
          /><line
            x1="1"
            y1="14"
            x2="4"
            y2="14"
          /></svg>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ deviceStats.total }}</span>
          <span class="stat-label">{{ $t('system.home.totalDevices') }}</span>
        </div>
      </div>

      <div class="stat-card stat-card--online">
        <div class="stat-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ deviceStats.online }}</span>
          <span class="stat-label">{{ $t('system.home.onlineDevices') }}</span>
        </div>
      </div>

      <div class="stat-card stat-card--offline">
        <div class="stat-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><circle
            cx="12"
            cy="12"
            r="10"
          /><line
            x1="4.93"
            y1="4.93"
            x2="19.07"
            y2="19.07"
          /></svg>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ deviceStats.offline }}</span>
          <span class="stat-label">{{ $t('system.home.offlineDevices') }}</span>
        </div>
      </div>

      <div class="stat-card stat-card--tags">
        <div class="stat-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line
            x1="7"
            y1="7"
            x2="7.01"
            y2="7"
          /></svg>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ deviceStats.totalTags }}</span>
          <span class="stat-label">{{ $t('system.home.dataTags') }}</span>
        </div>
      </div>

      <div class="stat-card stat-card--projects">
        <div class="stat-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ overview.projectCount }}</span>
          <span class="stat-label">{{ $t('system.home.projectCount') }}</span>
        </div>
      </div>

      <div class="stat-card stat-card--volume">
        <div class="stat-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><ellipse
            cx="12"
            cy="5"
            rx="9"
            ry="3"
          /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ formatBytes(overview.totalDbSize) }}</span>
          <span class="stat-label">{{ $t('system.home.dataVolume') }}</span>
        </div>
      </div>
    </div>

    <div class="panels-row">
      <div class="panel panel--status">
        <div class="panel-header">
          <h2 class="panel-title">
            {{ $t('system.home.deviceStatus') }}
          </h2>
        </div>
        <div class="panel-body">
          <div class="status-bars">
            <div class="status-bar-item">
              <div class="status-bar-header">
                <span class="status-bar-label">{{ $t('system.home.online') }}</span>
                <span class="status-bar-value">{{ deviceStats.online }} / {{ deviceStats.total }}</span>
              </div>
              <div class="status-bar-track">
                <div
                  class="status-bar-fill status-bar-fill--online"
                  :style="{ width: onlinePercent + '%' }"
                />
              </div>
            </div>
            <div class="status-bar-item">
              <div class="status-bar-header">
                <span class="status-bar-label">{{ $t('system.home.offline') }}</span>
                <span class="status-bar-value">{{ deviceStats.offline }} / {{ deviceStats.total }}</span>
              </div>
              <div class="status-bar-track">
                <div
                  class="status-bar-fill status-bar-fill--offline"
                  :style="{ width: offlinePercent + '%' }"
                />
              </div>
            </div>
            <div class="status-bar-item">
              <div class="status-bar-header">
                <span class="status-bar-label">{{ $t('system.home.alarm') }}</span>
                <span class="status-bar-value">{{ alarmStats.active }} / {{ alarmStats.total }}</span>
              </div>
              <div class="status-bar-track">
                <div
                  class="status-bar-fill status-bar-fill--alarm"
                  :style="{ width: alarmPercent + '%' }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel panel--recent">
        <div class="panel-header">
          <h2 class="panel-title">
            {{ $t('system.home.recentActivity') }}
          </h2>
          <a
            class="panel-more"
            @click="goAlarms"
          >
            {{ $t('system.home.viewAll') }}
          </a>
        </div>
        <div class="panel-body">
          <div
            v-if="recentAlarms.length"
            class="alarm-list"
          >
            <div
              v-for="alarm in recentAlarms"
              :key="alarm.id"
              class="alarm-row"
              @click="goAlarms"
            >
              <span
                class="alarm-level-badge"
                :class="'level-' + alarm.level"
              >
                {{ levelText(alarm.level) }}
              </span>
              <div class="alarm-info">
                <span class="alarm-message">{{ alarm.message }}</span>
                <span class="alarm-meta">
                  <span
                    v-if="alarm.deviceName"
                    class="alarm-device"
                  >{{ alarm.deviceName }}</span>
                  <span
                    class="alarm-status"
                    :class="'status-' + alarm.status"
                  >{{ statusText(alarm.status) }}</span>
                  <span class="alarm-time">{{ formatDateTime(alarm.createdAt) }}</span>
                </span>
              </div>
            </div>
          </div>
          <div
            v-else
            class="empty-state"
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="empty-icon"
            ><circle
              cx="12"
              cy="12"
              r="10"
            /><line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            /><line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            /></svg>
            <span class="empty-text">{{ $t('system.home.noAlarms') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panels-row">
      <div class="panel panel--quick">
        <div class="panel-header">
          <h2 class="panel-title">
            {{ $t('system.home.quickEntries') }}
          </h2>
        </div>
        <div class="panel-body">
          <div class="quick-grid">
            <button
              class="quick-card"
              @click="router.push('/system/devices')"
            >
              <div class="quick-icon quick-icon--blue">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ><rect
                  x="4"
                  y="4"
                  width="16"
                  height="16"
                  rx="2"
                  ry="2"
                /><rect
                  x="9"
                  y="9"
                  width="6"
                  height="6"
                /></svg>
              </div>
              <span class="quick-label">{{ $t('system.home.deviceManage') }}</span>
              <span class="quick-desc">{{ $t('system.home.deviceManageDesc') }}</span>
            </button>
            <button
              class="quick-card"
              @click="router.push('/system/alarms')"
            >
              <div class="quick-icon quick-icon--red">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              </div>
              <span class="quick-label">{{ $t('system.home.alarmCenter') }}</span>
              <span class="quick-desc">{{ $t('system.home.alarmCenterDesc') }}</span>
            </button>
            <button
              class="quick-card"
              @click="router.push('/system/scripts')"
            >
              <div class="quick-icon quick-icon--green">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
              </div>
              <span class="quick-label">{{ $t('system.home.scriptManage') }}</span>
              <span class="quick-desc">{{ $t('system.home.scriptManageDesc') }}</span>
            </button>
            <button
              class="quick-card"
              @click="router.push('/system/settings')"
            >
              <div class="quick-icon quick-icon--purple">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ><circle
                  cx="12"
                  cy="12"
                  r="3"
                /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              </div>
              <span class="quick-label">{{ $t('system.home.systemSettings') }}</span>
              <span class="quick-desc">{{ $t('system.home.systemSettingsDesc') }}</span>
            </button>
            <button
              class="quick-card"
              @click="router.push('/system/templates')"
            >
              <div class="quick-icon quick-icon--orange">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ><rect
                  x="3"
                  y="3"
                  width="7"
                  height="7"
                  rx="1"
                /><rect
                  x="14"
                  y="3"
                  width="7"
                  height="7"
                  rx="1"
                /><rect
                  x="3"
                  y="14"
                  width="7"
                  height="7"
                  rx="1"
                /><path d="M14 18h4l1.5-1.5v-4z" /></svg>
              </div>
              <span class="quick-label">{{ $t('system.home.templateManage') }}</span>
              <span class="quick-desc">{{ $t('system.home.templateManageDesc') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onDeactivated, onActivated, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { useProjectStore } from '../../stores';
import { alarmApi } from '../../api/modules/alarm.api';
import { projectApi } from '../../api/modules/project.api';
import type { SystemOverview } from '../../api/modules/project.api';
import type { AlarmRecord } from '../../api/types/api';

const router = useRouter();
const projectStore = useProjectStore();
const { t } = useI18n();

const loading = ref(false);

const overview = ref<SystemOverview>({
  projectCount: 0,
  totalDbSize: 0,
  totalPageCount: 0,
  deviceStats: { total: 0, online: 0, offline: 0, connecting: 0, degraded: 0, error: 0, totalTags: 0 },
  alarmStats: { total: 0, active: 0, acknowledged: 0, cleared: 0, shelved: 0 },
});

const deviceStats = ref({
  total: 0,
  online: 0,
  offline: 0,
  connecting: 0,
  degraded: 0,
  error: 0,
  totalTags: 0,
});

const alarmStats = ref({
  total: 0,
  active: 0,
});

const recentAlarms = ref<AlarmRecord[]>([]);

// 缓存：避免短时间内重复请求
const CACHE_TTL_MS = 30_000;
let lastLoadTime: number | null = null;

const levelKeyMap: Record<string, string> = {
  info: 'system.alarms.levelInfo',
  warning: 'system.alarms.levelWarning',
  error: 'system.alarms.levelError',
  critical: 'system.alarms.levelCritical',
};

function levelText(level: string): string {
  return t(levelKeyMap[level] || 'system.alarms.levelInfo');
}

const statusKeyMap: Record<string, string> = {
  active: 'system.alarms.active',
  acknowledged: 'system.alarms.acknowledged',
  cleared: 'system.alarms.cleared',
  shelved: 'system.alarms.shelved',
};

function statusText(status: string): string {
  return t(statusKeyMap[status] || 'system.alarms.active');
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

function goAlarms() {
  router.push('/system/alarms');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

const onlinePercent = computed(() => {
  if (deviceStats.value.total === 0) return 0;
  return Math.round((deviceStats.value.online / deviceStats.value.total) * 100);
});

const offlinePercent = computed(() => {
  if (deviceStats.value.total === 0) return 0;
  return Math.round((deviceStats.value.offline / deviceStats.value.total) * 100);
});

const alarmPercent = computed(() => {
  if (alarmStats.value.total === 0) return 0;
  return Math.round((alarmStats.value.active / alarmStats.value.total) * 100);
});

async function loadOverviewData(force = false) {
  // 30s 短期缓存：keep-alive 切回时避免重复请求
  const now = Date.now();
  if (!force && lastLoadTime && now - lastLoadTime < CACHE_TTL_MS) {
    return;
  }

  loading.value = true;
  try {
    // 一次请求获取所有聚合统计（设备 + 报警 + 项目）
    const result = await projectApi.getOverview();
    overview.value = result;
    deviceStats.value = result.deviceStats;
    alarmStats.value = {
      total: result.alarmStats.total,
      active: result.alarmStats.active,
    };

    // 最近告警：按项目获取并合并
    await projectStore.fetchProjects(1, 100);
    const allProjects: Array<{ projectId: string; projectName: string }> = [...projectStore.projects];
    if (allProjects.length > 0) {
      const alarmPromises = allProjects.map((p) =>
        alarmApi.getRecords(p.projectId, { limit: 20 }).then((res) => res.data || []).catch(() => []),
      );
      const results = await Promise.all(alarmPromises);
      recentAlarms.value = results
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);
    }

    lastLoadTime = Date.now();
  } catch {
    // 静默失败
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadOverviewData();
});

// keep-alive 缓存：切回时使用缓存（30s 内不重复请求）
let wasActive = false;

onDeactivated(() => {
  wasActive = true;
});

onActivated(() => {
  if (wasActive) {
    wasActive = false;
    loadOverviewData(); // 内部有 30s 缓存判断
  }
});
</script>

<style scoped>
.system-home {
  padding: 28px 32px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.page-header-text {
  display: flex;
  flex-direction: column;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.refresh-btn:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--primary);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn .spinning {
  animation: home-refresh-spin 0.8s linear infinite;
}

@keyframes home-refresh-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card--devices .stat-icon {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--status-info);
}

.stat-card--online .stat-icon {
  background: color-mix(in srgb, var(--status-online) 12%, transparent);
  color: var(--status-success);
}

.stat-card--offline .stat-icon {
  background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
  color: var(--text-secondary);
}

.stat-card--tags .stat-icon {
  background: color-mix(in srgb, var(--chart-5) 12%, transparent);
  color: var(--chart-5);
}

.stat-card--projects .stat-icon {
  background: color-mix(in srgb, var(--status-success) 12%, transparent);
  color: var(--status-success);
}

.stat-card--volume .stat-icon {
  background: color-mix(in srgb, var(--status-warning) 12%, transparent);
  color: var(--status-warning);
}

.stat-body {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.panels-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
}

.panel-more {
  font-size: 12px;
  color: var(--primary);
  cursor: pointer;
  transition: opacity 0.15s;
}

.panel-more:hover {
  opacity: 0.8;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.panel-body {
  padding: 16px 20px 20px;
}

.status-bars {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.status-bar-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.status-bar-label {
  font-size: 12px;
  color: var(--text);
}

.status-bar-value {
  font-size: 12px;
  color: var(--text-secondary);
}

.status-bar-track {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.status-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.status-bar-fill--online {
  background: var(--status-success);
}

.status-bar-fill--offline {
  background: var(--text-secondary);
}

.status-bar-fill--alarm {
  background: var(--status-error);
}

.alarm-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.alarm-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.alarm-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.alarm-level-badge {
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 18px;
  white-space: nowrap;
}

.alarm-level-badge.level-critical {
  background: color-mix(in srgb, var(--status-error) 20%, transparent);
  color: var(--status-error);
  font-weight: 600;
}

.alarm-level-badge.level-error {
  background: color-mix(in srgb, var(--status-error) 14%, transparent);
  color: var(--status-error);
}

.alarm-level-badge.level-warning {
  background: color-mix(in srgb, var(--status-warning) 16%, transparent);
  color: var(--status-warning);
}

.alarm-level-badge.level-info {
  background: color-mix(in srgb, var(--status-info) 16%, transparent);
  color: var(--status-info);
}

.alarm-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.alarm-message {
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.alarm-device {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.alarm-status.status-active { color: var(--status-error); }
.alarm-status.status-acknowledged { color: var(--status-warning); }
.alarm-status.status-cleared { color: var(--status-success); }
.alarm-status.status-shelved { color: var(--text-secondary); }

.alarm-time {
  margin-left: auto;
  white-space: nowrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
}

.empty-icon {
  color: var(--text-secondary);
}

.empty-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.quick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.quick-card:hover {
  background: var(--border);
  border-color: var(--border-light);
  transform: translateY(-1px);
}

.quick-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-icon--blue { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--status-info); }
.quick-icon--red { background: color-mix(in srgb, var(--status-error) 12%, transparent); color: var(--status-error); }
.quick-icon--green { background: color-mix(in srgb, var(--status-online) 12%, transparent); color: var(--status-success); }
.quick-icon--purple { background: color-mix(in srgb, var(--chart-5) 12%, transparent); color: var(--chart-5); }
.quick-icon--orange { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); }

.quick-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.quick-desc {
  font-size: 11px;
  color: var(--text-secondary);
}

/* 响应式：小屏幕时减少列数 */
@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .panels-row {
    grid-template-columns: 1fr;
  }
}
</style>