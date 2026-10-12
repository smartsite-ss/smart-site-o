<template>
  <div class="plugin-detail">
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
        ><line
          x1="19"
          y1="12"
          x2="5"
          y2="12"
        /><polyline points="12 19 5 12 12 5" /></svg>
        {{ $t('system.plugins.backToList') }}
      </button>
    </div>

    <SsLoading
      v-if="store.loading && !store.currentPlugin"
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
      v-else-if="!store.currentPlugin"
      class="empty-state"
    >
      <p>{{ $t('system.plugins.pluginNotFound') }}</p>
    </div>

    <template v-else>
      <div class="plugin-info-panel">
        <div class="info-header">
          <div class="info-title">
            <h2>{{ store.currentPlugin.displayName || store.currentPlugin.protocol || '—' }}</h2>
            <span
              class="sys-status-badge"
              :class="'sys-status-' + store.currentPlugin.status"
            >
              {{ statusLabel(store.currentPlugin.status) }}
            </span>
            <span class="version-badge">{{ store.currentPlugin.version }}</span>
          </div>
          <div class="info-actions">
            <button
              class="sys-btn sys-btn-primary sys-btn-sm"
              @click="router.push({name: 'plugin-monitor', params: {protocol}})"
            >
              {{ $t('system.plugins.monitor') }}
            </button>
            <button
              v-if="store.currentPlugin.status !== 'active'"
              class="sys-btn sys-btn-primary sys-btn-sm"
              @click="handleActivate"
            >
              {{ $t('system.plugins.activate') }}
            </button>
            <button
              v-if="store.currentPlugin.status === 'active'"
              class="sys-btn sys-btn-secondary sys-btn-sm"
              @click="handleDeactivate"
            >
              {{ $t('system.plugins.deactivate') }}
            </button>
            <button
              class="sys-btn sys-btn-secondary sys-btn-sm"
              @click="handleUpdate"
            >
              {{ $t('system.plugins.update') }}
            </button>
            <button
              class="sys-btn sys-btn-secondary sys-btn-sm"
              @click="handleRollback"
            >
              {{ $t('system.plugins.rollback') }}
            </button>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.protocol') }}</span>
            <span class="info-value mono">{{ store.currentPlugin.protocol || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.description') }}</span>
            <span class="info-value">{{ store.currentPlugin.description || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.category') }}</span>
            <span class="info-value">{{ categoryLabel(store.currentPlugin.category) || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.transport') }}</span>
            <span class="info-value">{{ store.currentPlugin.transport || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.registeredAt') }}</span>
            <span class="info-value">{{ formatDate(store.currentPlugin.registeredAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.activatedAt') }}</span>
            <span class="info-value">{{ formatDate(store.currentPlugin.activatedAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.plugins.isolationMode') }}</span>
            <span class="info-value">
              <span
                class="sys-mode-badge"
                :class="'sys-mode-' + (store.currentPlugin.isolationMode || 'in_process')"
              >{{ isolationModeLabel(store.currentPlugin.isolationMode) }}</span>
            </span>
          </div>
        </div>

        <div
          v-if="store.currentPlugin.tags && store.currentPlugin.tags.length > 0"
          class="info-tags"
        >
          <span class="info-label">{{ $t('system.plugins.tags') }}</span>
          <div class="tags-list">
            <span
              v-for="tag in store.currentPlugin.tags"
              :key="tag"
              class="tag-item"
            >{{ tag }}</span>
          </div>
        </div>
      </div>

      <!-- 运行时配置 -->
      <div class="config-panel">
        <h3 class="section-title">
          {{ $t('system.plugins.runtimeConfig') }}
        </h3>
        <div class="config-grid">
          <div class="config-item">
            <label class="config-label">{{ $t('system.plugins.isolationMode') }}</label>
            <div class="config-control-row">
              <select
                v-model="configForm.isolationMode"
                class="config-select"
              >
                <option value="in_process">
                  {{ $t('system.plugins.isolationInProcess') }}
                </option>
                <option value="worker_thread">
                  {{ $t('system.plugins.isolationWorkerThread') }}
                </option>
                <option value="child_process">
                  {{ $t('system.plugins.isolationChildProcess') }}
                </option>
              </select>
              <button
                class="sys-btn sys-btn-primary sys-btn-sm"
                :disabled="configSaving || !configDirty"
                @click="handleSaveConfig"
              >
                {{ configSaving ? $t('system.plugins.saving') : $t('system.plugins.saveConfig') }}
              </button>
            </div>
            <p class="config-hint">
              {{ $t('system.plugins.isolationModeHint') }}
            </p>
          </div>
        </div>
        <div
          v-if="configMessage"
          class="sys-config-message"
          :class="{ 'sys-config-message-error': configError }"
        >
          {{ configMessage }}
          <button
            v-if="configSaved && !configError"
            class="sys-btn sys-btn-secondary sys-btn-sm"
            style="margin-left: 12px"
            :disabled="restarting"
            @click="handleRestartPlugin"
          >
            {{ restarting ? $t('system.plugins.restarting') : $t('system.plugins.restartPlugin') }}
          </button>
        </div>
      </div>

      <div
        v-if="store.currentPluginStatus"
        class="status-panel"
      >
        <h3 class="section-title">
          {{ $t('system.plugins.status') }}
        </h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">{{ $t('system.plugins.uptime') }}</span>
            <span class="status-value">{{ formatUptime(store.currentPluginStatus.uptime) }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">{{ $t('system.plugins.activeConnections') }}</span>
            <span class="status-value">{{ store.currentPluginStatus.activeConnections }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">{{ $t('system.plugins.totalReads') }}</span>
            <span class="status-value">{{ store.currentPluginStatus.totalReads }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">{{ $t('system.plugins.totalErrors') }}</span>
            <span class="status-value">{{ store.currentPluginStatus.totalErrors }}</span>
          </div>
        </div>
        <div
          v-if="store.currentPluginStatus.errorMessage"
          class="status-error-msg"
        >
          <strong>{{ $t('system.plugins.errorMessage') }}:</strong> {{ store.currentPluginStatus.errorMessage }}
        </div>
      </div>

      <div
        v-if="store.currentPluginSchema"
        class="schema-panel"
      >
        <h3 class="section-title">
          {{ $t('system.plugins.connectionSchema') }}
        </h3>
        <pre class="json-block">{{ JSON.stringify(store.currentPluginSchema, null, 2) }}</pre>
      </div>

      <div class="default-connection-panel">
        <h3 class="section-title">
          {{ $t('system.plugins.defaultConnection') }}
        </h3>
        <pre class="json-block">{{ JSON.stringify(store.currentPlugin.defaultConnection, null, 2) }}</pre>
      </div>

      <div class="data-types-panel">
        <h3 class="section-title">
          {{ $t('system.plugins.supportedDataTypes') }}
        </h3>
        <div class="tags-list">
          <span
            v-for="dt in store.currentPlugin.supportedDataTypes"
            :key="dt"
            class="tag-item"
          >{{ dt }}</span>
        </div>
      </div>

      <div
        v-if="store.currentPlugin.metrics"
        class="metrics-panel"
      >
        <h3 class="section-title">
          {{ $t('system.plugins.metrics') }}
        </h3>
        <div class="metrics-grid">
          <div class="metric-item">
            <span class="metric-label">{{ $t('system.plugins.totalConnections') }}</span>
            <span class="metric-value">{{ store.currentPlugin.metrics.totalConnections }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ $t('system.plugins.activeConnections') }}</span>
            <span class="metric-value">{{ store.currentPlugin.metrics.activeConnections }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ $t('system.plugins.totalReads') }}</span>
            <span class="metric-value">{{ store.currentPlugin.metrics.totalReads }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ $t('system.plugins.totalErrors') }}</span>
            <span class="metric-value">{{ store.currentPlugin.metrics.totalErrors }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ $t('system.plugins.avgResponseTime') }}</span>
            <span class="metric-value">{{ store.currentPlugin.metrics.avgResponseTime }}ms</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">{{ $t('system.plugins.uptime') }}</span>
            <span class="metric-value">{{ formatUptime(store.currentPlugin.metrics.uptime) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { showConfirm } from '../../utils/messageBox';
import { usePluginStore } from '../../stores/plugin.store';
import { pluginApi } from '../../api/modules/plugin.api';
import { SsLoading } from '@scada-editor/shared';

const router = useRouter();
const route = useRoute();
const store = usePluginStore();
const { t } = useI18n();

const protocol = route.params.protocol as string;

// ---- 运行时配置 ----
const configForm = ref({ isolationMode: '' });
const configSaving = ref(false);
const configSaved = ref(false);
const configMessage = ref('');
const configError = ref(false);
const configLoaded = ref(false); // 标记是否已从服务端加载过配置
const restarting = ref(false);

const configDirty = computed(() => {
  const currentMode = store.currentPlugin?.isolationMode || 'in_process';
  return configForm.value.isolationMode !== currentMode && configForm.value.isolationMode !== '';
});

// 加载已持久化的配置
async function loadConfig() {
  try {
    const res = await pluginApi.getPluginConfig(protocol);
    const data = (res as any)?.data;
    if (data?.isolationMode) {
      configForm.value.isolationMode = data.isolationMode;
    } else {
      configForm.value.isolationMode = store.currentPlugin?.isolationMode || 'in_process';
    }
  } catch {
    configForm.value.isolationMode = store.currentPlugin?.isolationMode || 'in_process';
  }
  configLoaded.value = true;
}

// 保存配置到服务端
async function handleSaveConfig() {
  configSaving.value = true;
  configMessage.value = '';
  configError.value = false;

  try {
    const res = await pluginApi.updatePluginConfig(protocol, {
      isolationMode: configForm.value.isolationMode,
    });
    const data = (res as any)?.data;
    if (data) {
      // 同步更新 store 中的值
      if (store.currentPlugin) {
        store.currentPlugin.isolationMode = data.isolationMode || configForm.value.isolationMode;
      }
      configMessage.value = t('system.plugins.configSaved');
      configSaved.value = true;
    }
  } catch (err: any) {
    configError.value = true;
    configSaved.value = false;
    configMessage.value = err?.response?.data?.message || err?.message || t('system.plugins.configSaveFailed');
  } finally {
    configSaving.value = false;
  }
}

// 重启插件以应用隔离模式变更
async function handleRestartPlugin() {
  // 弹确认框
  try {
    await showConfirm(
      t('system.plugins.isolationModeHint'),
      t('system.plugins.restartPlugin'),
    );
  } catch {
    // 用户取消
    return;
  }

  restarting.value = true;
  configError.value = false;

  try {
    await pluginApi.restartPlugin(protocol);
    configMessage.value = t('system.plugins.restartSuccess');
    configSaved.value = false;
    // 刷新 store 中的插件状态
    await store.fetchPlugin(protocol);
    await loadConfig();
  } catch (err: any) {
    configError.value = true;
    configMessage.value = err?.response?.data?.message || err?.message || t('system.plugins.restartFailed');
  } finally {
    restarting.value = false;
  }
}

// 切换插件后重新加载配置
watch(() => route.params.protocol, (newProtocol) => {
  if (newProtocol && store.currentPlugin) {
    configForm.value.isolationMode = '';
    configLoaded.value = false;
    loadConfig();
  }
});

const ISOLATION_MODE_LABELS: Record<string, string> = {
  in_process: t('system.plugins.isolationInProcess'),
  worker_thread: t('system.plugins.isolationWorkerThread'),
  child_process: t('system.plugins.isolationChildProcess'),
};

function isolationModeLabel(mode?: string): string {
  return ISOLATION_MODE_LABELS[mode || ''] || mode || '—';
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

function formatDate(dateStr?: unknown): string {
  if (!dateStr || typeof dateStr !== 'string') return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function formatUptime(seconds: number): string {
  if (!seconds && seconds !== 0) return '-';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function goBack() {
  router.push('/system/plugins');
}

async function handleActivate() {
  if (!store.currentPlugin) return;
  if (!(await showConfirm(t('system.plugins.confirmActivate', { name: store.currentPlugin.displayName })))) return;
  try {
    await store.activatePlugin(protocol);
    await store.fetchPluginStatus(protocol);
  } catch {
    // error handled by store
  }
}

async function handleDeactivate() {
  if (!store.currentPlugin) return;
  if (!(await showConfirm(t('system.plugins.confirmDeactivate', { name: store.currentPlugin.displayName })))) return;
  try {
    await store.deactivatePlugin(protocol);
    await store.fetchPluginStatus(protocol);
  } catch {
    // error handled by store
  }
}

async function handleUpdate() {
  if (!store.currentPlugin) return;
  if (!(await showConfirm(t('system.plugins.confirmUpdate', { name: store.currentPlugin.displayName })))) return;
  try {
    await store.updatePlugin(protocol);
  } catch {
    // error handled by store
  }
}

async function handleRollback() {
  if (!store.currentPlugin) return;
  if (!(await showConfirm(t('system.plugins.confirmRollback', { name: store.currentPlugin.displayName })))) return;
  try {
    await store.rollbackPlugin(protocol);
  } catch {
    // error handled by store
  }
}

async function fetchData() {
  await store.fetchPlugin(protocol);
  if (store.currentPlugin) {
    await Promise.all([
      store.fetchPluginStatus(protocol),
      store.fetchPluginSchema(protocol),
      loadConfig(),
    ]);
  }
}

onMounted(() => {
  if (protocol) {
    fetchData();
  }
});
</script>

<style scoped>
.plugin-detail {
  padding: 20px 24px 32px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
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

.plugin-info-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 20px;
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

.info-actions {
  display: flex;
  gap: 8px;
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

.info-tags {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  display: inline-block;
  padding: 2px 10px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.status-panel,
.schema-panel,
.default-connection-panel,
.data-types-panel,
.metrics-panel,
.config-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 14px 0;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}



.json-block {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text);
  overflow-x: auto;
  white-space: pre;
  margin: 0;
  line-height: 1.6;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: var(--background);
  border-radius: 8px;
}

.metric-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

/* 运行时配置面板 */
.config-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.config-control-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.config-select {
  padding: 6px 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  min-width: 180px;
  cursor: pointer;
  outline: none;
}

.config-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
}

.config-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

</style>