<template>
  <div class="ws-monitor-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.websocket.title') }}
      </h1>
      <div class="header-actions">
        <label class="auto-refresh-toggle">
          <input
            v-model="autoRefresh"
            type="checkbox"
            @change="toggleAutoRefresh"
          >
          <span>{{ $t('system.websocket.autoRefresh') }}</span>
        </label>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          :disabled="loading"
          @click="loadData"
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
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {{ $t('common.reload') }}
        </button>
        <button
          class="sys-btn sys-btn-warning sys-btn-sm"
          :disabled="cleanupLoading"
          @click="handleCleanupIdle"
        >
          {{ $t('system.websocket.cleanupIdle') }}
        </button>
      </div>
    </div>

    <!-- WebSocket 状态指示器 -->
    <div class="status-indicator-section">
      <div class="status-card">
        <div class="status-header">
          <span
            class="status-icon"
            :class="backendStatusClass"
          >
            <svg
              v-if="backendStatus === 'online'"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
            </svg>
            <svg
              v-else-if="backendStatus === 'offline'"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                opacity="0.5"
              />
            </svg>
          </span>
          <span class="status-label">{{ $t('system.websocket.backendStatus') }}</span>
        </div>
        <div
          class="status-value"
          :class="backendStatusClass"
        >
          {{ backendStatusText }}
        </div>
        <div class="status-detail">
          {{ $t('system.websocket.serviceUptime') }}: {{ formatUptime(overview?.metrics?.startedAt) }}
        </div>
      </div>
      <div class="status-card">
        <div class="status-header">
          <span
            class="status-icon"
            :class="clientStatusClass"
          >
            <svg
              v-if="clientConnected"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
            </svg>
          </span>
          <span class="status-label">{{ $t('system.websocket.clientStatus') }}</span>
        </div>
        <div
          class="status-value"
          :class="clientStatusClass"
        >
          {{ clientConnected ? $t('system.websocket.clientConnected') : $t('system.websocket.clientDisconnected') }}
        </div>
        <div class="status-detail">
          {{ clientSocketId ? `${$t('system.websocket.socketId')}: ${clientSocketId.slice(0, 8)}...` : '-' }}
        </div>
      </div>
      <div class="status-card">
        <div class="status-header">
          <span
            class="status-icon"
            :class="dataFlowClass"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
          <span class="status-label">{{ $t('system.websocket.dataFlow') }}</span>
        </div>
        <div
          class="status-value"
          :class="dataFlowClass"
        >
          {{ dataFlowText }}
        </div>
        <div class="status-detail">
          {{ overview?.metrics?.totalBroadcasts ?? 0 }} {{ $t('system.websocket.broadcasts') }}
          / {{ overview?.metrics?.totalRecipients ?? 0 }} {{ $t('system.websocket.recipients') }}
        </div>
      </div>
    </div>

    <!-- 数据为0时的提示 -->
    <div
      v-if="showZeroDataHint"
      class="zero-data-hint"
    >
      <div class="hint-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--status-warning)"
          stroke-width="2"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
          />
          <line
            x1="12"
            y1="8"
            x2="12"
            y2="12"
          />
          <line
            x1="12"
            y1="16"
            x2="12.01"
            y2="16"
          />
        </svg>
      </div>
      <div class="hint-content">
        <h4>{{ $t('system.websocket.zeroDataHintTitle') }}</h4>
        <p>{{ $t('system.websocket.zeroDataHintDesc') }}</p>
        <ul class="hint-checklist">
          <li :class="{ checked: backendStatus === 'online' }">
            {{ backendStatus === 'online' ? '✅' : '❌' }} {{ $t('system.websocket.checkBackendRunning') }}
          </li>
          <li :class="{ checked: clientConnected }">
            {{ clientConnected ? '✅' : '❌' }} {{ $t('system.websocket.checkClientConnected') }}
          </li>
          <li :class="{ checked: hasRoomSubscription }">
            {{ hasRoomSubscription ? '✅' : '❌' }} {{ $t('system.websocket.checkRoomSubscription') }}
          </li>
          <li :class="{ checked: hasDataFlow }">
            {{ hasDataFlow ? '✅' : '❌' }} {{ $t('system.websocket.checkDataFlow') }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 概览卡片 -->
    <div class="overview-grid">
      <div class="stat-card">
        <div class="stat-label">
          {{ $t('system.websocket.totalConnections') }}
        </div>
        <div class="stat-value">
          {{ overview?.gateway?.totalConnections ?? 0 }}
        </div>
        <div class="stat-extra">
          {{ $t('system.websocket.roomCount') }}: {{ overview?.gateway?.roomCount ?? 0 }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">
          {{ $t('system.websocket.onlineUsers') }}
        </div>
        <div class="stat-value">
          {{ overview?.limiter?.uniqueUsers ?? 0 }}
        </div>
        <div class="stat-extra">
          {{ $t('system.websocket.uniqueIps') }}: {{ overview?.limiter?.uniqueIps ?? 0 }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">
          {{ $t('system.websocket.totalBroadcasts') }}
        </div>
        <div class="stat-value">
          {{ overview?.metrics?.totalBroadcasts ?? 0 }}
        </div>
        <div class="stat-extra">
          {{ $t('system.websocket.offlineCacheHits') }}: {{ overview?.metrics?.offlineCacheHits ?? 0 }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">
          {{ $t('system.websocket.totalRecipients') }}
        </div>
        <div class="stat-value">
          {{ overview?.metrics?.totalRecipients ?? 0 }}
        </div>
        <div class="stat-extra">
          {{ $t('system.websocket.bridgeLatencyAvg') }}: {{ overview?.metrics?.bridgeLatencyMs?.avgMs?.toFixed(2) ?? '-' }}ms
        </div>
      </div>
    </div>

    <!-- 连接限制配置 -->
    <div class="section-card">
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('system.websocket.connectionConfig') }}
        </h2>
        <button
          class="sys-btn sys-btn-primary sys-btn-sm"
          :disabled="configSaving"
          @click="handleSaveConfig"
        >
          {{ configSaving ? $t('system.websocket.saving') : $t('system.websocket.saveConfig') }}
        </button>
      </div>
      <div class="config-form">
        <div class="form-row">
          <label class="form-label">{{ $t('system.websocket.maxConnectionsPerUser') }}</label>
          <input
            v-model.number="configForm.maxConnectionsPerUser"
            type="number"
            min="1"
            class="form-input"
          >
        </div>
        <div class="form-row">
          <label class="form-label">{{ $t('system.websocket.maxGlobalConnections') }}</label>
          <input
            v-model.number="configForm.maxGlobalConnections"
            type="number"
            min="1"
            class="form-input"
          >
        </div>
        <div class="form-row">
          <label class="form-label">{{ $t('system.websocket.maxConnectionsPerIp') }}</label>
          <input
            v-model.number="configForm.maxConnectionsPerIp"
            type="number"
            min="1"
            class="form-input"
          >
        </div>
        <div class="form-row">
          <label class="form-label">{{ $t('system.websocket.idleTimeoutMinutes') }}</label>
          <input
            v-model.number="configForm.idleTimeoutMinutes"
            type="number"
            min="1"
            class="form-input"
          >
        </div>
      </div>
    </div>

    <!-- 连接列表 -->
    <div class="section-card">
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('system.websocket.connectionList') }}
        </h2>
        <span class="section-count">{{ connectionsData.total }}</span>
      </div>
      <SsLoading
        v-if="loading"
        :text="$t('common.loading')"
        size="small"
      />
      <div
        v-else-if="connectionsData.connections.length === 0"
        class="empty-state"
      >
        {{ $t('system.websocket.noConnections') }}
      </div>
      <div
        v-else
        class="table-wrapper"
      >
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ $t('system.websocket.socketId') }}</th>
              <th>{{ $t('system.websocket.username') }}</th>
              <th>{{ $t('system.websocket.ip') }}</th>
              <th>{{ $t('system.websocket.source') }}</th>
              <th>{{ $t('system.websocket.connectedAt') }}</th>
              <th>{{ $t('system.websocket.messageCount') }}</th>
              <th>{{ $t('system.websocket.lastActivity') }}</th>
              <th>{{ $t('system.websocket.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="conn in paginatedConnections"
              :key="conn.socketId"
            >
              <td class="mono-text">
                {{ conn.socketId }}
              </td>
              <td>{{ conn.username || conn.userId || '-' }}</td>
              <td class="mono-text">
                {{ conn.ip }}
              </td>
              <td
                class="mono-text"
                :title="conn.url || conn.source || ''"
              >
                {{ conn.source || conn.url || '-' }}
              </td>
              <td>{{ formatTime(conn.connectedAt) }}</td>
              <td>{{ conn.messageCount }}</td>
              <td>{{ formatTime(conn.lastActivityAt) }}</td>
              <td>
                <button
                  class="sys-btn sys-btn-danger sys-btn-sm"
                  :disabled="disconnectLoading[conn.socketId]"
                  @click="handleForceDisconnect(conn.socketId)"
                >
                  {{ $t('system.websocket.forceDisconnect') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div
          v-if="connectionsData.connections.length > pageSize"
          class="pagination"
        >
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            ‹
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >
            ›
          </button>
        </div>
      </div>
    </div>

    <!-- 消息速率 -->
    <div class="section-card">
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('system.websocket.messageRates') }}
        </h2>
      </div>
      <div
        v-if="!overview?.monitor?.messageRates?.length"
        class="empty-state"
      >
        {{ $t('system.websocket.noData') }}
      </div>
      <div
        v-else
        class="table-wrapper"
      >
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ $t('system.websocket.socketId') }}</th>
              <th>{{ $t('system.websocket.messagesPerSecond') }}</th>
              <th>{{ $t('system.websocket.messageCount') }}</th>
              <th>{{ $t('system.websocket.windowSeconds') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rate in overview?.monitor?.messageRates"
              :key="rate.socketId"
            >
              <td class="mono-text">
                {{ rate.socketId }}
              </td>
              <td>
                <span
                  class="rate-badge"
                  :class="rateBadgeClass(rate.messagesPerSecond)"
                >
                  {{ rate.messagesPerSecond.toFixed(2) }}
                </span>
              </td>
              <td>{{ rate.totalMessages }}</td>
              <td>{{ rate.windowSeconds }}s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 连接时长分布 -->
    <div class="section-card">
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('system.websocket.durationDistribution') }}
        </h2>
      </div>
      <div
        v-if="overview"
        class="duration-stats"
      >
        <div class="duration-row">
          <span class="duration-label">{{ $t('system.websocket.under1Min') }}</span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: durationPercent('under1Min') + '%' }"
            />
          </div>
          <span class="duration-value">{{ overview?.monitor?.durationStats?.distribution?.under1Min }}</span>
        </div>
        <div class="duration-row">
          <span class="duration-label">{{ $t('system.websocket.under10Min') }}</span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: durationPercent('under10Min') + '%' }"
            />
          </div>
          <span class="duration-value">{{ overview?.monitor?.durationStats?.distribution?.under10Min }}</span>
        </div>
        <div class="duration-row">
          <span class="duration-label">{{ $t('system.websocket.under1Hour') }}</span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: durationPercent('under1Hour') + '%' }"
            />
          </div>
          <span class="duration-value">{{ overview?.monitor?.durationStats?.distribution?.under1Hour }}</span>
        </div>
        <div class="duration-row">
          <span class="duration-label">{{ $t('system.websocket.under1Day') }}</span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: durationPercent('under1Day') + '%' }"
            />
          </div>
          <span class="duration-value">{{ overview?.monitor?.durationStats?.distribution?.under1Day }}</span>
        </div>
        <div class="duration-row">
          <span class="duration-label">{{ $t('system.websocket.over1Day') }}</span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: durationPercent('over1Day') + '%' }"
            />
          </div>
          <span class="duration-value">{{ overview?.monitor?.durationStats?.distribution?.over1Day }}</span>
        </div>
        <div class="duration-summary">
          <span>{{ $t('system.websocket.avgDuration') }}: {{ ((overview?.monitor?.durationStats?.avgMs ?? 0) / 1000).toFixed(2) }}s</span>
          <span>{{ $t('system.websocket.maxDuration') }}: {{ ((overview?.monitor?.durationStats?.maxMs ?? 0) / 1000).toFixed(2) }}s</span>
        </div>
      </div>
      <div
        v-else
        class="empty-state"
      >
        {{ $t('system.websocket.noData') }}
      </div>
    </div>

    <!-- 异常连接 -->
    <div
      v-if="overview?.monitor?.abnormalConnections?.length"
      class="section-card alert-section"
    >
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('system.websocket.abnormalConnections') }}
        </h2>
        <span class="alert-count">{{ overview?.monitor?.abnormalConnections?.length }}</span>
      </div>
      <div class="abnormal-list">
        <span
          v-for="socketId in overview?.monitor?.abnormalConnections"
          :key="socketId"
          class="abnormal-tag"
        >
          {{ socketId }}
        </span>
      </div>
    </div>

    <!-- 诊断信息 -->
    <div class="section-card">
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('system.websocket.diagnostic') }}
        </h2>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="toggleDiagnostic"
        >
          {{ diagnosticExpanded ? $t('system.websocket.collapse') : $t('system.websocket.expand') }}
        </button>
      </div>
      <div
        v-if="diagnosticExpanded"
        class="diagnostic-content"
      >
        <div
          v-if="!diagnostic"
          class="empty-state"
        >
          {{ $t('system.websocket.noData') }}
        </div>
        <template v-else>
          <div
            v-if="diagnostic.conclusions?.length"
            class="diagnostic-block"
          >
            <h4 class="diagnostic-subtitle">
              {{ $t('system.websocket.conclusions') }}
            </h4>
            <ul class="diagnostic-list">
              <li
                v-for="(item, idx) in diagnostic.conclusions"
                :key="'c-' + idx"
              >
                {{ item }}
              </li>
            </ul>
          </div>
          <div
            v-if="diagnostic.suggestions?.length"
            class="diagnostic-block"
          >
            <h4 class="diagnostic-subtitle">
              {{ $t('system.websocket.suggestions') }}
            </h4>
            <ul class="diagnostic-list">
              <li
                v-for="(item, idx) in diagnostic.suggestions"
                :key="'s-' + idx"
              >
                {{ item }}
              </li>
            </ul>
          </div>
          <div
            v-if="diagnostic.details"
            class="diagnostic-block"
          >
            <h4 class="diagnostic-subtitle">
              {{ $t('system.websocket.details') }}
            </h4>
            <pre class="diagnostic-details">{{ JSON.stringify(diagnostic.details, null, 2) }}</pre>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, onDeactivated, onActivated } from 'vue';
import { useI18n } from 'vue-i18n';
import { websocketApi } from '../../api/modules/websocket.api';
import type {
  WsMonitorOverview,
  WsConnectionSnapshot,
  WsConnectionConfig,
  WsDiagnosticInfo,
} from '../../api/modules/websocket.api';
import { showConfirm, showSuccess, showError } from '../../utils/messageBox';
import { SsLoading } from '@scada-editor/shared';
import { useWsStore } from '../../stores/ws.store';
import { useProjectStore } from '../../stores/project.store';

const { t } = useI18n();
const wsStore = useWsStore();
const projectStore = useProjectStore();

const overview = ref<WsMonitorOverview | null>(null);
const connectionsData = reactive<{ total: number; connections: WsConnectionSnapshot[] }>({
  total: 0,
  connections: [],
});
const configForm = reactive<WsConnectionConfig>({
  maxConnectionsPerUser: 5,
  maxGlobalConnections: 1000,
  maxConnectionsPerIp: 20,
  idleTimeoutMinutes: 30,
});
const diagnostic = ref<WsDiagnosticInfo | null>(null);

const loading = ref(false);
const configSaving = ref(false);
const cleanupLoading = ref(false);
const diagnosticExpanded = ref(false);
const autoRefresh = ref(false);
const disconnectLoading = reactive<Record<string, boolean>>({});

// WebSocket 状态相关
const backendStatus = ref<'online' | 'offline' | 'unknown'>('unknown');
// 客户端状态直接读取全局 wsStore（真实连接来源），不再依赖 window 全局标记
const clientConnected = computed(() => wsStore.isConnected);
const clientSocketId = computed<string | null>(() => wsStore.socketId);
const subscribedRooms = computed<string[]>(() => {
  const rooms: string[] = [];
  if (wsStore.subscribedProjectId) rooms.push(`project:${wsStore.subscribedProjectId}`);
  return rooms;
});

const currentPage = ref(1);
const pageSize = 10;

let refreshTimer: ReturnType<typeof setInterval> | null = null;

const totalPages = computed(() =>
  Math.max(1, Math.ceil(connectionsData.connections.length / pageSize)),
);

const paginatedConnections = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return connectionsData.connections.slice(start, start + pageSize);
});

// ==================== WebSocket 状态计算属性 ====================
const backendStatusClass = computed(() => {
  if (backendStatus.value === 'online') return 'status-online';
  if (backendStatus.value === 'offline') return 'status-offline';
  return 'status-unknown';
});

const backendStatusText = computed(() => {
  if (backendStatus.value === 'online') return t('system.websocket.backendOnline');
  if (backendStatus.value === 'offline') return t('system.websocket.backendOffline');
  return t('system.websocket.backendUnknown');
});

const clientStatusClass = computed(() => {
  return clientConnected.value ? 'status-online' : 'status-offline';
});

const hasRoomSubscription = computed(() => {
  return subscribedRooms.value.length > 0 || (overview.value?.gateway?.roomCount ?? 0) > 0;
});

const hasDataFlow = computed(() => {
  return (overview.value?.metrics?.totalBroadcasts ?? 0) > 0;
});

const dataFlowClass = computed(() => {
  return hasDataFlow.value ? 'status-online' : 'status-warning';
});

const dataFlowText = computed(() => {
  if (hasDataFlow.value) return t('system.websocket.dataFlowActive');
  return t('system.websocket.dataFlowInactive');
});

const showZeroDataHint = computed(() => {
  // 当数据全为0且服务状态已知时显示提示
  const allZero = (overview.value?.gateway?.totalConnections ?? 0) === 0 &&
                  (overview.value?.metrics?.totalBroadcasts ?? 0) === 0;
  return allZero && backendStatus.value !== 'unknown';
});

// ==================== 数据加载 ====================
async function loadOverview() {
  try {
    const res = await websocketApi.getOverview();
    const data = (res as any).data || (res as any);
    overview.value = data;
    backendStatus.value = 'online'; // API 成功响应说明后端服务运行正常
  } catch (err: any) {
    backendStatus.value = 'offline';
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.websocket.loadFailed'));
    }
  }
}

async function loadConnections() {
  try {
    const res = await websocketApi.getConnections();
    const data = (res as any).data || (res as any);
    connectionsData.total = data?.total ?? 0;
    connectionsData.connections = Array.isArray(data?.connections) ? data.connections : [];
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.websocket.loadFailed'));
    }
  }
}

async function loadConfig() {
  try {
    const res = await websocketApi.getConfig();
    const data = (res as any).data || (res as any);
    if (data) {
      configForm.maxConnectionsPerUser = data.maxConnectionsPerUser ?? 5;
      configForm.maxGlobalConnections = data.maxGlobalConnections ?? 1000;
      configForm.maxConnectionsPerIp = data.maxConnectionsPerIp ?? 20;
      configForm.idleTimeoutMinutes = data.idleTimeoutMinutes ?? 30;
    }
  } catch (err: any) {
    // 配置加载失败时使用默认值，不弹窗打扰
    if (import.meta.env.DEV) console.warn('Failed to load WS config:', err);
  }
}

async function loadDiagnostic() {
  try {
    const res = await websocketApi.getDiagnostic();
    const data = (res as any).data || (res as any);
    diagnostic.value = data;
  } catch (err: any) {
    if (import.meta.env.DEV) console.warn('Failed to load WS diagnostic:', err);
  }
}

async function loadData() {
  loading.value = true;
  await Promise.all([loadOverview(), loadConnections(), loadConfig(), loadDiagnostic()]);
  loading.value = false;
}

// ==================== 操作处理 ====================
async function handleSaveConfig() {
  configSaving.value = true;
  try {
    await websocketApi.updateConfig({ ...configForm });
    showSuccess(t('system.websocket.configSaved'));
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.websocket.configSaveFailed'));
    }
  } finally {
    configSaving.value = false;
  }
}

async function handleForceDisconnect(socketId: string) {
  const confirmed = await showConfirm(t('system.websocket.confirmDisconnect', { socketId }));
  if (!confirmed) return;

  disconnectLoading[socketId] = true;
  try {
    await websocketApi.forceDisconnect(socketId);
    showSuccess(t('system.websocket.disconnectSuccess'));
    await loadConnections();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.websocket.disconnectFailed'));
    }
  } finally {
    disconnectLoading[socketId] = false;
  }
}

async function handleCleanupIdle() {
  const confirmed = await showConfirm(t('system.websocket.cleanupIdleConfirm'));
  if (!confirmed) return;

  cleanupLoading.value = true;
  try {
    const res = await websocketApi.cleanupIdle();
    const data = (res as any).data || (res as any);
    showSuccess(t('system.websocket.cleanupSuccess', { cleaned: data?.cleaned ?? 0, total: data?.total ?? 0 }));
    await loadConnections();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.websocket.cleanupFailed'));
    }
  } finally {
    cleanupLoading.value = false;
  }
}

function toggleDiagnostic() {
  diagnosticExpanded.value = !diagnosticExpanded.value;
}

function toggleAutoRefresh() {
  if (autoRefresh.value) {
    refreshTimer = setInterval(loadData, 5000);
  } else {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }
}

// ==================== 工具函数 ====================
function formatTime(ts: number | string): string {
  if (!ts) return '-';
  try {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

function formatUptime(startedAt?: number): string {
  if (!startedAt) return '-';
  const now = Date.now();
  const uptimeMs = now - startedAt;
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function durationPercent(key: keyof WsMonitorOverview['monitor']['durationStats']['distribution']): number {
  if (!overview.value?.monitor?.durationStats?.distribution) return 0;
  const dist = overview.value.monitor.durationStats.distribution;
  const total = dist.under1Min + dist.under10Min + dist.under1Hour + dist.under1Day + dist.over1Day;
  if (total === 0) return 0;
  return Math.round((dist[key] / total) * 100);
}

function rateBadgeClass(rate: number): string {
  if (rate >= 10) return 'rate-high';
  if (rate >= 1) return 'rate-medium';
  return 'rate-low';
}

// ==================== 生命周期 ====================
/**
 * 建立客户端 WebSocket 连接以真实检测前后端 WS 连通性。
 * wsStore 为全局单例，设备监控等视图复用同一连接；此处仅在未连接时发起连接，
 * 不在卸载时断开，以免影响其他正在使用连接的视图。
 */
function connectClient() {
  if (wsStore.isConnected || wsStore.connectionStatus === 'connecting') return;
  // 优先订阅当前选中项目，无项目则传空串仅建立 socket 连接用于连通性检测
  const projectId = projectStore.projects[0]?.projectId || '';
  wsStore.connect(projectId);
}

onMounted(async () => {
  loadData();
  // 确保项目列表已加载，以便建立带项目订阅的 WS 连接
  if (!projectStore.projects.length) {
    await projectStore.fetchProjects().catch(() => {});
  }
  connectClient();
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});

// keep-alive 缓存：离开页面时停止刷新，返回时恢复
const wasAutoRefreshOn = ref(false);

onDeactivated(() => {
  wasAutoRefreshOn.value = autoRefresh.value;
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});

onActivated(() => {
  loadData();
  if (wasAutoRefreshOn.value) {
    autoRefresh.value = true;
    refreshTimer = setInterval(loadData, 5000);
    wasAutoRefreshOn.value = false;
  }
});
</script>

<style scoped>
.ws-monitor-page {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.auto-refresh-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.auto-refresh-toggle input {
  cursor: pointer;
}

/* WebSocket 状态指示器 */
.status-indicator-section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.status-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon.status-online svg {
  fill: var(--status-success);
}

.status-icon.status-offline svg {
  fill: var(--status-error);
}

.status-icon.status-warning svg {
  stroke: var(--status-warning);
}

.status-icon.status-unknown svg {
  fill: var(--text-secondary);
}

.status-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.status-value {
  font-size: 14px;
  font-weight: 600;
}

.status-value.status-online {
  color: var(--status-success);
}

.status-value.status-offline {
  color: var(--status-error);
}

.status-value.status-warning {
  color: var(--status-warning);
}

.status-value.status-unknown {
  color: var(--text-secondary);
}

.status-detail {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 数据为0时的提示 */
.zero-data-hint {
  display: flex;
  gap: 16px;
  background: color-mix(in srgb, var(--status-warning) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-warning) 20%, transparent);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
}

.hint-icon {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.hint-content h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 6px 0;
}

.hint-content p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
}

.hint-checklist {
  list-style: none;
  padding: 0;
  margin: 0;
}

.hint-checklist li {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.hint-checklist li.checked {
  color: var(--status-success);
}

/* 概览卡片 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px 20px;
  transition: border-color 0.15s ease;
}

.stat-card:hover {
  border-color: var(--primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.stat-extra {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

/* 通用区块卡片 */
.section-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 16px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.section-count {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg, rgba(0, 0, 0, 0.04));
  padding: 2px 10px;
  border-radius: 10px;
}

/* 配置表单 */
.config-form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  padding: 18px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-input {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  border-color: var(--primary);
}

/* 数据表格 */
.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 10px 14px;
  color: var(--text-secondary);
  font-weight: 600;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  background: var(--bg, rgba(0, 0, 0, 0.02));
}

.data-table td {
  padding: 10px 14px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.data-table tbody tr:hover {
  background: var(--bg, rgba(0, 0, 0, 0.02));
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.mono-text {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 速率徽章 */
.rate-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  font-family: monospace;
}

.rate-high {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  color: var(--status-error);
}

.rate-medium {
  background: color-mix(in srgb, var(--status-warning) 15%, transparent);
  color: var(--status-warning);
}

.rate-low {
  background: rgba(16, 185, 129, 0.15);
  color: var(--status-success);
}

/* 时长分布 */
.duration-stats {
  padding: 18px;
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.duration-label {
  width: 100px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg, rgba(0, 0, 0, 0.06));
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width 0.3s ease;
  min-width: 2px;
}

.duration-value {
  width: 40px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  text-align: right;
}

.duration-summary {
  display: flex;
  gap: 24px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
  color: var(--text-secondary);
}

/* 异常连接 */
.alert-section {
  border-left: 3px solid var(--status-error);
}

.alert-count {
  font-size: 12px;
  color: var(--status-error);
  background: color-mix(in srgb, var(--status-error) 12%, transparent);
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 600;
}

.abnormal-list {
  padding: 14px 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.abnormal-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  color: var(--status-error);
  border: 1px solid color-mix(in srgb, var(--status-error) 20%, transparent);
}

/* 诊断信息 */
.diagnostic-content {
  padding: 18px;
}

.diagnostic-block {
  margin-bottom: 16px;
}

.diagnostic-block:last-child {
  margin-bottom: 0;
}

.diagnostic-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.diagnostic-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.diagnostic-details {
  margin: 0;
  padding: 12px;
  background: var(--bg, rgba(0, 0, 0, 0.03));
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text);
  overflow-x: auto;
  line-height: 1.5;
}

/* 通用按钮样式 */
.sys-btn {
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sys-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.sys-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sys-btn-primary {
  background: var(--primary);
  color: var(--text);
  border-color: var(--primary);
}

.sys-btn-primary:hover:not(:disabled) {
  opacity: 0.85;
  color: var(--text);
}

.sys-btn-warning {
  background: var(--status-warning);
  color: var(--text);
  border-color: var(--status-warning);
}

.sys-btn-warning:hover:not(:disabled) {
  opacity: 0.85;
  color: var(--text);
}

.sys-btn-danger {
  background: var(--status-error);
  color: var(--text);
  border-color: var(--status-error);
}

.sys-btn-danger:hover:not(:disabled) {
  opacity: 0.85;
  color: var(--text);
}

.sys-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.sys-btn-secondary {
  background: var(--surface);
  color: var(--text);
}

/* 状态提示 */
.loading-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
