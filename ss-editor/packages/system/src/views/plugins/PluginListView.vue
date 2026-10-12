<template>
  <div class="plugin-list">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          {{ $t('system.plugins.title') }}
        </h1>
        <span
          v-if="!store.loading"
          class="plugin-count"
        >{{ $t('system.plugins.pluginCount', { count: store.plugins.length }) }}</span>
      </div>
      <div class="header-actions">
        <button
          class="sys-btn sys-btn-secondary"
          :disabled="discovering"
          @click="handleRediscover"
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
          {{ discovering ? $t('system.plugins.rediscovering') : $t('system.plugins.rediscover') }}
        </button>
        <button
          class="sys-btn sys-btn-secondary"
          :disabled="healthChecking"
          @click="handleHealthCheck"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          ><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          {{ $t('system.plugins.healthCheck') }}
        </button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <label class="filter-label">{{ $t('system.plugins.status') }}</label>
        <select
          v-model="store.filter.status"
          class="filter-select"
          @change="handleFilterChange"
        >
          <option value="">
            {{ $t('system.plugins.allStatus') }}
          </option>
          <option value="active">
            {{ $t('system.plugins.statusActive') }}
          </option>
          <option value="inactive">
            {{ $t('system.plugins.statusInactive') }}
          </option>
          <option value="error">
            {{ $t('system.plugins.statusError') }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">{{ $t('system.plugins.category') }}</label>
        <select
          v-model="store.filter.category"
          class="filter-select"
          @change="handleFilterChange"
        >
          <option value="">
            {{ $t('system.plugins.allCategories') }}
          </option>
          <option value="industrial_bus">
            {{ $t('system.plugins.categoryIndustrialBus') }}
          </option>
          <option value="iot">
            {{ $t('system.plugins.categoryIot') }}
          </option>
          <option value="power">
            {{ $t('system.plugins.categoryPower') }}
          </option>
          <option value="building">
            {{ $t('system.plugins.categoryBuilding') }}
          </option>
          <option value="custom">
            {{ $t('system.plugins.categoryCustom') }}
          </option>
        </select>
      </div>

      <div
        v-if="store.health"
        class="sys-health-status"
        :class="'sys-health-' + store.health.status"
      >
        <span class="sys-health-dot" />
        <span class="health-text">
          {{ store.health.activePlugins }}/{{ store.health.totalPlugins }} {{ $t('system.plugins.activePlugins') }}
        </span>
      </div>
    </div>

    <SsLoading
      v-if="store.loading"
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
      v-else-if="store.plugins.length === 0"
      class="empty-state"
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      ><rect
        x="2"
        y="6"
        width="20"
        height="12"
        rx="2"
        ry="2"
      /><path d="M12 12h.01" /><path d="M17 12h.01" /><path d="M7 12h.01" /></svg>
      <h3>{{ $t('system.plugins.noPlugins') }}</h3>
      <p>{{ $t('system.plugins.noPluginsHint') }}</p>
      <button
        class="sys-btn sys-btn-primary"
        @click="handleRediscover"
      >
        {{ $t('system.plugins.rediscover') }}
      </button>
    </div>

    <div
      v-else
      class="plugin-grid"
    >
      <div
        v-for="plugin in store.plugins"
        :key="plugin.protocol"
        class="plugin-card"
        @click="openPluginDetail(plugin.protocol)"
      >
        <div class="card-header">
          <div class="card-title-row">
            <h3 class="card-title">
              {{ plugin.displayName || plugin.protocol || '—' }}
            </h3>
            <span class="version-badge">{{ plugin.version }}</span>
          </div>
          <span
            class="sys-status-badge"
            :class="'sys-status-' + plugin.status"
          >
            {{ statusLabel(plugin.status) }}
          </span>
        </div>

        <!-- 信息网格：2列布局，紧凑展示 -->
        <div class="card-body">
          <div class="info-grid">
            <div class="card-info">
              <span class="info-label">{{ $t('system.plugins.protocol') }}</span>
              <code class="info-value sys-protocol-code">{{ plugin.protocol || '—' }}</code>
            </div>
            <div class="card-info">
              <span class="info-label">{{ $t('system.plugins.category') }}</span>
              <span class="tag category-tag">{{ categoryLabel(plugin.category) || '—' }}</span>
            </div>
            <div class="card-info">
              <span class="info-label">{{ $t('system.plugins.transport') }}</span>
              <span class="info-value">{{ plugin.transport || '—' }}</span>
            </div>
            <div class="card-info">
              <span class="info-label">{{ $t('system.plugins.isolationMode') }}</span>
              <span
                class="sys-mode-badge"
                :class="'sys-mode-' + (plugin.isolationMode || 'in_process')"
              >{{ isolationModeLabel(plugin.isolationMode) }}</span>
            </div>
            <div
              v-if="plugin.processId || plugin.threadId"
              class="card-info"
            >
              <span class="info-label">{{ runtimeLabel(plugin) }}</span>
              <span class="info-value mono">{{ runtimeValue(plugin) }}</span>
            </div>
          </div>

          <!-- 指标 + 设备统计合并区 -->
          <div class="stats-section">
            <div
              v-if="plugin.metrics"
              class="card-metrics"
            >
              <div class="metric-item">
                <span class="metric-value">{{ plugin.metrics.activeConnections }}</span>
                <span class="metric-label">{{ $t('system.plugins.activeConnections') }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-value">{{ plugin.metrics.totalReads }}</span>
                <span class="metric-label">{{ $t('system.plugins.totalReads') }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-value">{{ plugin.metrics.totalErrors }}</span>
                <span class="metric-label">{{ $t('system.plugins.totalErrors') }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-value">{{ plugin.metrics.avgResponseTime }}ms</span>
                <span class="metric-label">{{ $t('system.plugins.avgResponseTime') }}</span>
              </div>
            </div>
            <div class="device-stats-row">
              <div class="device-stat-item device-stat-online">
                <span class="sys-device-stat-dot sys-dot-online" />
                <span class="device-stat-label">{{ $t('system.plugins.deviceOnline') }}</span>
                <span class="device-stat-value">{{ getDeviceStat(plugin.protocol, 'online') }}</span>
              </div>
              <div class="device-stat-item device-stat-offline">
                <span class="sys-device-stat-dot sys-dot-offline" />
                <span class="device-stat-label">{{ $t('system.plugins.deviceOffline') }}</span>
                <span class="device-stat-value">{{ getDeviceStat(plugin.protocol, 'offline') }}</span>
              </div>
              <div class="device-stat-item device-stat-total">
                <span class="device-stat-label">{{ $t('system.plugins.deviceTotal') }}</span>
                <span class="device-stat-value">{{ getDeviceStat(plugin.protocol, 'total') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮：主操作 + 折叠更多 -->
        <div
          class="card-actions"
          @click.stop
        >
          <button
            v-if="plugin.status !== 'active'"
            class="sys-btn sys-btn-primary sys-btn-sm"
            @click="handleActivate(plugin)"
          >
            {{ $t('system.plugins.activate') }}
          </button>
          <button
            v-if="plugin.status === 'active'"
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="handleDeactivate(plugin)"
          >
            {{ $t('system.plugins.deactivate') }}
          </button>
          <button
            v-if="plugin.status === 'active'"
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="handleRestartPlugin(plugin)"
          >
            {{ $t('system.plugins.restartPlugin') }}
          </button>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            @click="router.push({name: 'plugin-monitor', params: {protocol: plugin.protocol}})"
          >
            {{ $t('system.plugins.monitor') }}
          </button>
          <div class="actions-more">
            <button
              class="sys-btn sys-btn-secondary sys-btn-sm"
              @click="toggleMoreActions(plugin.protocol)"
            >
              {{ $t('system.plugins.more') }}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            <div
              v-if="expandedProtocol === plugin.protocol"
              class="more-dropdown"
              @click.stop
            >
              <button
                class="dropdown-item"
                @click="openPluginDetail(plugin.protocol)"
              >
                {{ $t('system.plugins.viewSchema') }}
              </button>
              <button
                class="dropdown-item"
                @click="handleCheckUpdate(plugin)"
              >
                {{ $t('system.plugins.checkUpdate') }}
              </button>
              <button
                class="dropdown-item"
                @click="handleUpdate(plugin)"
              >
                {{ $t('system.plugins.update') }}
              </button>
              <button
                class="dropdown-item"
                @click="handleRollback(plugin)"
              >
                {{ $t('system.plugins.rollback') }}
              </button>
              <button
                class="dropdown-item"
                @click="router.push({name: 'pipeline-metrics'})"
              >
                {{ $t('system.pipeline.pipelineMetricsBtn') }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="plugin.errorMessage"
          class="sys-card-error"
        >
          {{ plugin.errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { showAlert, showConfirm } from '../../utils/messageBox';
import { usePluginStore } from '../../stores/plugin.store';
import { pluginApi } from '../../api/modules/plugin.api';
import type { PluginInfo, DeviceStats } from '../../api/types/plugin';
import { SsLoading } from '@scada-editor/shared';

const router = useRouter();
const store = usePluginStore();
const { t } = useI18n();

const discovering = ref(false);
const healthChecking = ref(false);
const expandedProtocol = ref<string | null>(null);

function toggleMoreActions(protocol: string) {
  expandedProtocol.value = expandedProtocol.value === protocol ? null : protocol;
}

const STATUS_LABELS: Record<string, string> = {
  active: t('system.plugins.statusActive'),
  inactive: t('system.plugins.statusInactive'),
  registered: t('system.plugins.statusRegistered'),
  error: t('system.plugins.statusError'),
  unregistered: t('system.plugins.statusUnregistered'),
};

const CATEGORY_LABELS: Record<string, string> = {
  industrial_bus: t('system.plugins.categoryIndustrialBus'),
  iot: t('system.plugins.categoryIot'),
  power: t('system.plugins.categoryPower'),
  building: t('system.plugins.categoryBuilding'),
  custom: t('system.plugins.categoryCustom'),
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

const ISOLATION_MODE_LABELS: Record<string, string> = {
  in_process: t('system.plugins.isolationInProcess'),
  worker_thread: t('system.plugins.isolationWorkerThread'),
  child_process: t('system.plugins.isolationChildProcess'),
};

function isolationModeLabel(mode?: string): string {
  return ISOLATION_MODE_LABELS[mode || ''] || mode || '—';
}

/** 根据隔离模式返回运行时标识标签 */
function runtimeLabel(plugin: PluginInfo): string {
  if (plugin.isolationMode === 'worker_thread') {
    return t('system.plugins.threadId');
  }
  return t('system.plugins.processId');
}

/** 根据隔离模式返回运行时标识值（进程名/线程名 + 进程号/线程号） */
function runtimeValue(plugin: PluginInfo): string {
  const name = plugin.processName || '—';
  if (plugin.isolationMode === 'worker_thread' && plugin.threadId) {
    return `${name} TID: ${plugin.threadId}`;
  }
  if (plugin.processId) {
    return `${name} PID: ${plugin.processId}`;
  }
  return '—';
}

function openPluginDetail(protocol: string) {
  router.push(`/system/plugins/${protocol}`);
}

async function handleActivate(plugin: PluginInfo) {
  if (!(await showConfirm(t('system.plugins.confirmActivate', { name: plugin.displayName })))) return;
  try {
    await store.activatePlugin(plugin.protocol);
  } catch {
    // error handled by store
  }
}

async function handleDeactivate(plugin: PluginInfo) {
  if (!(await showConfirm(t('system.plugins.confirmDeactivate', { name: plugin.displayName })))) return;
  try {
    await store.deactivatePlugin(plugin.protocol);
  } catch {
    // error handled by store
  }
}

async function handleRestartPlugin(plugin: PluginInfo) {
  if (!(await showConfirm(
    t('system.plugins.restartPlugin'),
    t('system.plugins.isolationModeHint'),
  ))) return;
  try {
    await pluginApi.restartPlugin(plugin.protocol);
    await store.fetchPlugins();
  } catch {
    // error handled by caller
  }
}

async function handleCheckUpdate(plugin: PluginInfo) {
  const result = await store.checkUpdate(plugin.protocol);
  if (result) {
    if (result.updateAvailable) {
      showAlert(t('system.plugins.updateAvailable', { version: result.latestVersion }), t('system.messageBox.title'), 'info');
    } else {
      showAlert(t('system.plugins.noUpdate'), t('system.messageBox.title'), 'info');
    }
  }
}

async function handleUpdate(plugin: PluginInfo) {
  if (!(await showConfirm(t('system.plugins.confirmUpdate', { name: plugin.displayName })))) return;
  try {
    await store.updatePlugin(plugin.protocol);
  } catch {
    // error handled by store
  }
}

async function handleRollback(plugin: PluginInfo) {
  if (!(await showConfirm(t('system.plugins.confirmRollback', { name: plugin.displayName })))) return;
  try {
    await store.rollbackPlugin(plugin.protocol);
  } catch {
    // error handled by store
  }
}

async function handleRediscover() {
  discovering.value = true;
  try {
    await store.rediscover();
    await store.fetchPlugins();
  } catch {
    // error handled by store
  } finally {
    discovering.value = false;
  }
}

async function handleHealthCheck() {
  healthChecking.value = true;
  try {
    await store.fetchHealth();
  } catch {
    // error handled by store
  } finally {
    healthChecking.value = false;
  }
}

function handleFilterChange() {
  store.fetchPlugins();
}

function getDeviceStat(protocol: string, key: keyof DeviceStats): number {
  return store.deviceStats[protocol]?.[key] ?? 0;
}

async function fetchData() {
  await store.fetchPlugins();
  // 并行加载设备统计
  store.fetchDeviceStats();
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.plugin-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.plugin-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px 16px;
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.filter-select {
  padding: 6px 28px 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 6px center;
  background-repeat: no-repeat;
  background-size: 18px;
  cursor: pointer;
}

.filter-select option {
  background: var(--background);
  color: var(--text);
}

.sys-health-status {
  margin-left: auto;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  gap: 12px;
  flex: 1;
}

.empty-state h3 { font-size: 18px; color: var(--text); margin: 0; }
.empty-state p { margin: 0; font-size: 14px; }

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.plugin-grid {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-content: start;
}

@media (max-width: 1400px) {
  .plugin-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .plugin-grid {
    grid-template-columns: 1fr;
  }
}

.plugin-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plugin-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  flex-shrink: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 信息网格：2列紧凑布局 */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}

.card-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.info-label {
  font-size: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.info-value {
  font-size: 12px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-tag {
  display: inline-block;
  padding: 1px 6px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

/* 指标 + 设备统计合并区 */
.stats-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: var(--background);
  border-radius: 8px;
}

.card-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.metric-label {
  font-size: 10px;
  color: var(--text-secondary);
  text-align: center;
}

/* 设备在线/离线统计 */
.device-stats-row {
  display: flex;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}

.device-stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.device-stat-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.device-stat-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-left: auto;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.card-actions .sys-btn {
  flex-shrink: 0;
}

.actions-more {
  position: relative;
  margin-left: auto;
}

.more-dropdown {
  position: absolute;
  right: 0;
  bottom: 100%;
  margin-bottom: 4px;
  min-width: 140px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 10;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: var(--background);
}

</style>