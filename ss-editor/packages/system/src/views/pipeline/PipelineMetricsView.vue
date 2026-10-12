<template>
  <div class="pipeline-metrics">
    <!-- 页头 -->
    <div class="page-header">
      <div class="header-title">
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
          {{ $t('system.pipeline.backToPlugins') }}
        </button>
        <h2>{{ $t('system.pipeline.title') }}</h2>
        <span
          v-if="lastRefreshAt"
          class="header-hint"
        >
          {{ $t('system.pipeline.lastRefresh') }}: {{ formatTime(lastRefreshAt) }}
        </span>
      </div>
      <div class="header-actions">
        <span class="scope-label">{{ $t('system.pipeline.scope') }}:</span>
        <select
          v-model="selectedProtocol"
          class="scope-select"
          @change="onScopeChange"
        >
          <option value="">
            {{ $t('system.pipeline.scopeGlobal') }}
          </option>
          <option
            v-for="p in protocols"
            :key="p.protocol"
            :value="p.protocol"
          >
            {{ p.protocol }}
          </option>
        </select>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          :disabled="diagnosticLoading"
          @click="runDiagnostic"
        >
          {{ diagnosticLoading ? '...' : $t('system.pipeline.runDiagnostic') }}
        </button>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="toggleAutoRefresh"
        >
          <span
            class="auto-dot"
            :class="{ active: autoRefresh }"
          />
          {{ autoRefresh ? $t('system.pipeline.autoRefreshOn') : $t('system.pipeline.autoRefreshOff') }}
        </button>
        <button
          class="sys-btn sys-btn-primary sys-btn-sm"
          :disabled="loading"
          @click="refreshAll"
        >
          {{ loading ? $t('system.pipeline.refreshing') : $t('system.pipeline.refresh') }}
        </button>
      </div>
    </div>

    <!-- 诊断结果面板 -->
    <div
      v-if="diagnosticResult"
      class="panel diagnostic-panel"
    >
      <div class="panel-header">
        <h3
          class="section-title"
          style="margin: 0"
        >
          {{ $t('system.pipeline.diagnosticTitle') }}
        </h3>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="diagnosticResult = null"
        >
          {{ $t('system.pipeline.close') }}
        </button>
      </div>
      <!-- 自动诊断结论 -->
      <div class="diagnosis-conclusions">
        <div
          v-for="(conclusion, idx) in diagnosticResult.diagnosis"
          :key="idx"
          class="diagnosis-item"
          :class="getDiagnosisClass(conclusion)"
        >
          {{ conclusion }}
        </div>
      </div>
      <!-- 详细状态 -->
      <div class="diagnosis-details">
        <div class="diagnosis-section">
          <h4>Orchestrator</h4>
          <div class="diagnosis-kv">
            <span>{{ $t('system.pipeline.registeredSteps') }}:</span><span>{{ diagnosticResult.orchestrator.stepCount }}</span>
            <span>{{ $t('system.pipeline.executionHistoryCount') }}:</span><span>{{ diagnosticResult.orchestrator.timingHistorySize }} / {{ diagnosticResult.orchestrator.timingHistoryCapacity }}</span>
            <span>{{ $t('system.pipeline.decomposeHistoryCount') }}:</span><span>{{ diagnosticResult.orchestrator.breakdownHistorySize }} / {{ diagnosticResult.orchestrator.breakdownHistoryCapacity }}</span>
            <span>{{ $t('system.pipeline.injected') }}:</span><span>{{ diagnosticResult.orchestrator.metricsServiceInjected }}</span>
          </div>
        </div>
        <div class="diagnosis-section">
          <h4>Scheduler</h4>
          <div class="diagnosis-kv">
            <span>{{ $t('system.pipeline.registeredTasksTotal') }}:</span><span>{{ diagnosticResult.scheduler.totalRegisteredTasks }}</span>
            <span>{{ $t('system.pipeline.runningTasks') }}:</span><span>{{ diagnosticResult.scheduler.runningTasks }}</span>
            <span>{{ $t('system.pipeline.readyQueue') }}:</span><span>{{ diagnosticResult.scheduler.queuedTasks }}</span>
            <span>{{ $t('system.pipeline.completed') }}:</span><span>{{ diagnosticResult.scheduler.completedTasks }}</span>
            <span>{{ $t('system.pipeline.failed') }}:</span><span>{{ diagnosticResult.scheduler.failedTasks }}</span>
          </div>
        </div>
        <div
          v-if="diagnosticResult.scheduler.sampleTasks.length > 0"
          class="diagnosis-section"
        >
          <h4>{{ $t('system.pipeline.taskSamples') }}</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>{{ $t('system.pipeline.deviceName') }}</th>
                <th>{{ $t('system.pipeline.tagName') }}</th>
                <th>Interval</th>
                <th>Enabled</th>
                <th>Last Execution</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="task in diagnosticResult.scheduler.sampleTasks"
                :key="task.id"
              >
                <td
                  class="mono task-id-cell"
                  :title="task.id"
                >
                  {{ task.id }}
                </td>
                <td :title="task.deviceId">
                  {{ task.deviceName || task.deviceId }}
                </td>
                <td :title="task.tagId">
                  {{ task.tagName || task.tagId }}
                </td>
                <td class="num-col">
                  {{ task.interval }}ms
                </td>
                <td>{{ task.enabled ? '✓' : '✗' }}</td>
                <td class="mono">
                  {{ task.lastExecution ? formatTime(new Date(task.lastExecution).getTime()) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 加载状态（首次） -->
    <SsLoading
      v-if="loading && !snapshot"
      :text="$t('system.pipeline.loading')"
      size="small"
    />

    <!-- 错误状态 -->
    <div
      v-else-if="error && !snapshot"
      class="error-state"
    >
      <p>{{ error }}</p>
      <button
        class="sys-btn sys-btn-secondary"
        @click="refreshAll"
      >
        {{ $t('system.pipeline.retry') }}
      </button>
    </div>

    <template v-else-if="snapshot">
      <!-- 按协议维度视图 -->
      <template v-if="selectedProtocol && protocolMetrics">
        <div class="metrics-cards">
          <div class="metric-card">
            <span class="metric-label">{{ $t('system.pipeline.protocolReadsTotal') }}</span>
            <span class="metric-value">{{ protocolMetrics.totalReads }}</span>
          </div>
          <div class="metric-card error">
            <span class="metric-label">{{ $t('system.pipeline.protocolReadsErrors') }}</span>
            <span class="metric-value">{{ protocolMetrics.totalErrors }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ $t('system.pipeline.activeConnections') }}</span>
            <span class="metric-value">{{ protocolMetrics.activeConnections }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ $t('system.pipeline.avgResponseTime') }}</span>
            <span class="metric-value mono">{{ protocolMetrics.avgResponseTime?.toFixed(1) ?? '-' }} ms</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ $t('system.pipeline.totalConnections') }}</span>
            <span class="metric-value">{{ protocolMetrics.totalConnections }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ $t('system.pipeline.lastActivity') }}</span>
            <span class="metric-value">{{ protocolMetrics.lastActivity ? formatTime(new Date(protocolMetrics.lastActivity).getTime()) : '-' }}</span>
          </div>
        </div>
      </template>

      <!-- 全局视图 -->
      <template v-else-if="!selectedProtocol">
        <!-- 顶部指标卡片 -->
        <div class="metrics-cards">
          <div class="metric-card">
            <span class="metric-label">{{ $t('system.pipeline.executionsTotal') }}</span>
            <span class="metric-value">{{ snapshot.pipeline_executions_total }}</span>
          </div>
          <div class="metric-card success">
            <span class="metric-label">{{ $t('system.pipeline.executionsSuccess') }}</span>
            <span class="metric-value">{{ snapshot.pipeline_executions_success }}</span>
            <span class="metric-sub">{{ successRate }}%</span>
          </div>
          <div class="metric-card error">
            <span class="metric-label">{{ $t('system.pipeline.executionsError') }}</span>
            <span class="metric-value">{{ snapshot.pipeline_executions_error }}</span>
            <span class="metric-sub">{{ errorRate }}%</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ $t('system.pipeline.lastDuration') }}</span>
            <span class="metric-value mono">{{ snapshot.pipeline_duration_ms }} ms</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ $t('system.pipeline.queueDepth') }}</span>
            <span class="metric-value">{{ snapshot.pipeline_queue_depth }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ $t('system.pipeline.activeTasks') }}</span>
            <span class="metric-value">{{ snapshot.pipeline_active_tasks }}</span>
          </div>
        </div>

        <!-- 子系统指标 -->
        <div class="dashboard-row">
          <div class="sub-panel">
            <h3 class="section-title">
              {{ $t('system.pipeline.protocolRead') }}
            </h3>
            <div class="sub-stats">
              <div class="sub-stat-item">
                <span class="sub-stat-label">{{ $t('system.pipeline.total') }}</span>
                <span class="sub-stat-value">{{ snapshot.protocol_read_total }}</span>
              </div>
              <div class="sub-stat-item">
                <span class="sub-stat-label">{{ $t('system.pipeline.errors') }}</span>
                <span class="sub-stat-value error">{{ snapshot.protocol_read_errors }}</span>
              </div>
            </div>
          </div>

          <div class="sub-panel">
            <h3 class="section-title">
              {{ $t('system.pipeline.cacheStats') }}
            </h3>
            <div class="sub-stats">
              <div class="sub-stat-item">
                <span class="sub-stat-label">{{ $t('system.pipeline.cacheHit') }}</span>
                <span class="sub-stat-value">{{ snapshot.cache_hit_total }}</span>
              </div>
              <div class="sub-stat-item">
                <span class="sub-stat-label">{{ $t('system.pipeline.cacheMiss') }}</span>
                <span class="sub-stat-value">{{ snapshot.cache_miss_total }}</span>
              </div>
              <div class="sub-stat-item">
                <span class="sub-stat-label">{{ $t('system.pipeline.cacheHitRate') }}</span>
                <span class="sub-stat-value">{{ cacheHitRate }}%</span>
              </div>
            </div>
          </div>

          <div class="sub-panel">
            <h3 class="section-title">
              {{ $t('system.pipeline.persistStats') }}
            </h3>
            <div class="sub-stats">
              <div class="sub-stat-item">
                <span class="sub-stat-label">{{ $t('system.pipeline.total') }}</span>
                <span class="sub-stat-value">{{ snapshot.persist_write_total }}</span>
              </div>
              <div class="sub-stat-item">
                <span class="sub-stat-label">{{ $t('system.pipeline.success') }}</span>
                <span class="sub-stat-value">{{ snapshot.persist_write_total - snapshot.persist_write_errors }}</span>
              </div>
              <div class="sub-stat-item">
                <span class="sub-stat-label">{{ $t('system.pipeline.errors') }}</span>
                <span class="sub-stat-value error">{{ snapshot.persist_write_errors }}</span>
              </div>
            </div>
          </div>

          <div class="sub-panel">
            <h3 class="section-title">
              {{ $t('system.pipeline.deadbandFiltered') }}
            </h3>
            <div class="sub-stats">
              <div class="sub-stat-item">
                <span class="sub-stat-label">{{ $t('system.pipeline.total') }}</span>
                <span class="sub-stat-value">{{ snapshot.deadband_filtered_total }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤耗时统计（P50/P95/P99） -->
        <div class="panel">
          <h3 class="section-title">
            {{ $t('system.pipeline.stepStats') }}
          </h3>
          <div
            v-if="stepStats.length === 0"
            class="empty-state"
          >
            {{ $t('system.pipeline.noStepStats') }}
          </div>
          <table
            v-else
            class="data-table"
          >
            <thead>
              <tr>
                <th class="num-col">
                  #
                </th>
                <th>{{ $t('system.pipeline.stepName') }}</th>
                <th class="num-col">
                  {{ $t('system.pipeline.calls') }}
                </th>
                <th class="num-col">
                  {{ $t('system.pipeline.minMs') }}
                </th>
                <th class="num-col">
                  {{ $t('system.pipeline.avgMs') }}
                </th>
                <th class="num-col">
                  P50
                </th>
                <th class="num-col">
                  P95
                </th>
                <th class="num-col">
                  P99
                </th>
                <th class="num-col">
                  {{ $t('system.pipeline.maxMs') }}
                </th>
                <th class="num-col">
                  {{ $t('system.pipeline.errorCount') }}
                </th>
                <th class="num-col">
                  {{ $t('system.pipeline.errorRate') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="stat in stepStats"
                :key="stat.stepName"
              >
                <td class="num-col mono">
                  {{ stat.order }}
                </td>
                <td class="step-name-cell">
                  {{ stat.stepName }}
                </td>
                <td class="num-col">
                  {{ stat.totalCalls }}
                </td>
                <td class="num-col mono">
                  {{ formatMs(stat.minMs) }}
                </td>
                <td class="num-col mono">
                  {{ formatMs(stat.avgMs) }}
                </td>
                <td class="num-col mono">
                  {{ formatMs(stat.p50Ms) }}
                </td>
                <td class="num-col mono p95">
                  {{ formatMs(stat.p95Ms) }}
                </td>
                <td class="num-col mono p99">
                  {{ formatMs(stat.p99Ms) }}
                </td>
                <td class="num-col mono">
                  {{ formatMs(stat.maxMs) }}
                </td>
                <td
                  class="num-col"
                  :class="{ 'text-error': stat.errorCount > 0 }"
                >
                  {{ stat.errorCount }}
                </td>
                <td
                  class="num-col"
                  :class="{ 'text-error': (stat.errorRate ?? 0) > 0 }"
                >
                  {{ ((stat.errorRate ?? 0) * 100).toFixed(2) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 火焰图（Pipeline 耗时分解） -->
        <div class="panel">
          <div class="panel-header">
            <h3
              class="section-title"
              style="margin: 0"
            >
              {{ $t('system.pipeline.flameGraph') }}
            </h3>
            <span class="panel-hint">{{ $t('system.pipeline.flameGraphHint') }}</span>
          </div>
          <div
            v-if="breakdowns.length === 0"
            class="empty-state"
          >
            {{ $t('system.pipeline.noBreakdowns') }}
          </div>
          <div
            v-else
            class="flame-chart"
          >
            <div
              v-for="(breakdown, idx) in displayBreakdowns"
              :key="idx"
              class="flame-row"
              :title="formatBreakdownTooltip(breakdown)"
            >
              <div class="flame-row-label">
                <span class="flame-time">{{ formatTime(breakdown.timestamp) }}</span>
                <span class="flame-device mono">{{ breakdown.deviceId }}</span>
              </div>
              <div class="flame-bars">
                <div
                  v-for="step in breakdown.steps"
                  :key="step.stepName"
                  class="flame-bar"
                  :class="{ 'is-error': step.isError }"
                  :style="{ width: getStepWidth(step.durationMs, breakdown.pipelineTotalMs) + '%' }"
                  :title="formatStepTooltip(step)"
                >
                  <span
                    v-if="getStepWidth(step.durationMs, breakdown.pipelineTotalMs) > 8"
                    class="flame-bar-label"
                  >
                    {{ step.stepName }}
                  </span>
                </div>
              </div>
              <div class="flame-total mono">
                {{ breakdown.pipelineTotalMs }}ms
              </div>
            </div>
          </div>
        </div>

        <!-- 离线缓存状态 -->
        <div class="panel">
          <div class="panel-header">
            <h3
              class="section-title"
              style="margin: 0"
            >
              {{ $t('system.pipeline.offlineCache') }}
            </h3>
            <div class="panel-actions">
              <button
                class="sys-btn sys-btn-secondary sys-btn-sm"
                :disabled="offlineCacheLoading || !offlineCacheStats || offlineCacheStats.totalBuffered === 0"
                @click="handleFlushOfflineCache"
              >
                {{ $t('system.pipeline.flushCache') }}
              </button>
              <button
                class="sys-btn sys-btn-secondary sys-btn-sm"
                :disabled="offlineCacheLoading || !offlineCacheStats || offlineCacheStats.totalBuffered === 0"
                @click="handleClearOfflineCache"
              >
                {{ $t('system.pipeline.clearCache') }}
              </button>
            </div>
          </div>
          <div
            v-if="offlineCacheStats"
            class="offline-cache-stats"
          >
            <div class="cache-stat-item">
              <span class="cache-stat-label">{{ $t('system.pipeline.bufferedMessages') }}</span>
              <span class="cache-stat-value">
                {{ offlineCacheStats.totalBuffered }} / {{ offlineCacheStats.maxCapacity }}
              </span>
              <div class="cache-bar">
                <div
                  class="cache-bar-fill"
                  :style="{ width: cacheUsagePercent + '%' }"
                  :class="{ warning: cacheUsagePercent > 80 }"
                />
              </div>
            </div>
            <div class="cache-stat-row">
              <div
                class="cache-stat-item-inline"
                style="max-width: 100%"
              >
                <span class="cache-stat-label">{{ $t('system.pipeline.dumpLocation') }}</span>
                <span
                  class="cache-stat-value mono"
                  style="font-size: 12px; word-break: break-all"
                >
                  {{ offlineCacheStats.dumpDir }}
                  <template v-if="offlineCacheStats.dumpFileSize !== null">
                    ({{ formatFileSize(offlineCacheStats.dumpFileSize) }})
                  </template>
                </span>
              </div>
            </div>
          </div>
          <div
            v-else
            class="empty-state"
          >
            {{ $t('system.pipeline.noOfflineCacheData') }}
          </div>
        </div>

        <!-- Prometheus 原始文本 -->
        <div class="panel">
          <div class="panel-header">
            <h3
              class="section-title"
              style="margin: 0"
            >
              {{ $t('system.pipeline.prometheusRaw') }}
            </h3>
            <button
              class="sys-btn sys-btn-secondary sys-btn-sm"
              @click="copyPrometheus"
            >
              {{ $t('system.pipeline.copy') }}
            </button>
          </div>
          <pre
            v-if="prometheusText"
            class="prometheus-text"
          >{{ prometheusText }}</pre>
          <div
            v-else
            class="empty-state"
          >
            {{ $t('system.pipeline.noPrometheus') }}
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, onDeactivated, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { showError, showSuccess, showConfirm } from '../../utils/messageBox';
import { pipelineApi } from '../../api/modules/pipeline.api';
import { offlineCacheApi } from '../../api/modules/offline-cache.api';
import type {
  PipelineMetricsSnapshot,
  StepTimingStats,
  PipelineTimingBreakdown,
  ProtocolMetrics,
  ProtocolSummary,
} from '../../api/types/pipeline';
import type { OfflineCacheStats } from '../../api/types/offline-cache';
import { SsLoading } from '@scada-editor/shared';

const router = useRouter();
const { t } = useI18n();

function goBack() {
  router.push('/system/plugins');
}

const snapshot = ref<PipelineMetricsSnapshot | null>(null);
const stepStats = ref<StepTimingStats[]>([]);
const breakdowns = ref<PipelineTimingBreakdown[]>([]);
const prometheusText = ref<string>('');
const offlineCacheStats = ref<OfflineCacheStats | null>(null);
const offlineCacheLoading = ref(false);

const loading = ref(false);
const error = ref<string>('');
const autoRefresh = ref(false);
const lastRefreshAt = ref<number>(0);

// 诊断相关状态
const diagnosticLoading = ref(false);
const diagnosticResult = ref<any>(null);

// 协议筛选状态
const selectedProtocol = ref('');
const protocols = ref<ProtocolSummary[]>([]);
const protocolMetrics = ref<ProtocolMetrics | null>(null);
const protocolLoading = ref(false);

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let isRefreshing = false; // 防止刷新重叠的同步标志
const AUTO_REFRESH_INTERVAL = 5000;
const REFRESH_TIMEOUT_MS = 20000; // 单次刷新最长 20s，防止永久卡住
const MAX_DISPLAY_BREAKDOWNS = 20;

const displayBreakdowns = computed(() =>
  breakdowns.value.slice(-MAX_DISPLAY_BREAKDOWNS).reverse(),
);

const successRate = computed(() => {
  const total = snapshot.value?.pipeline_executions_total ?? 0;
  if (total === 0) return '0.00';
  const success = snapshot.value?.pipeline_executions_success ?? 0;
  return ((success / total) * 100).toFixed(2);
});

const errorRate = computed(() => {
  const total = snapshot.value?.pipeline_executions_total ?? 0;
  if (total === 0) return '0.00';
  const err = snapshot.value?.pipeline_executions_error ?? 0;
  return ((err / total) * 100).toFixed(2);
});

const cacheHitRate = computed(() => {
  const hit = snapshot.value?.cache_hit_total ?? 0;
  const miss = snapshot.value?.cache_miss_total ?? 0;
  const total = hit + miss;
  if (total === 0) return '0.00';
  return ((hit / total) * 100).toFixed(2);
});

const cacheUsagePercent = computed(() => {
  if (!offlineCacheStats.value || offlineCacheStats.value.maxCapacity === 0) return 0;
  return Math.round(
    (offlineCacheStats.value.totalBuffered / offlineCacheStats.value.maxCapacity) * 100,
  );
});

function formatMs(ms: number | null | undefined): string {
  if (ms == null || isNaN(ms)) return '-';
  if (ms === 0) return '0';
  if (ms < 1) return ms.toFixed(3);
  if (ms < 100) return ms.toFixed(2);
  return ms.toFixed(1);
}

function formatTime(ts: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStepWidth(durationMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  return Math.max(0.5, (durationMs / totalMs) * 100);
}

function formatStepTooltip(step: { stepName: string; durationMs: number; isError: boolean; tagId: string }): string {
  const status = step.isError ? '❌' : '✓';
  return `${step.stepName} ${status}\n${step.durationMs}ms\ntag: ${step.tagId}`;
}

function formatBreakdownTooltip(breakdown: PipelineTimingBreakdown): string {
  return `${t('system.pipeline.total')}: ${breakdown.pipelineTotalMs}ms\ndevice: ${breakdown.deviceId}\ntag: ${breakdown.tagId}`;
}

function unwrap<T>(res: any): T {
  return (res?.data ?? res) as T;
}

/** 带超时的 Promise 包装，防止某个 API 永久挂起导致 loading 卡住 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

async function refreshAll() {
  // 防止刷新重叠：如果上一次刷新仍在进行中，直接跳过
  if (isRefreshing) return;
  isRefreshing = true;
  loading.value = true;
  error.value = '';

  const tasks: Promise<void>[] = [
    (async () => {
      try {
        const res = await withTimeout(pipelineApi.getJsonMetrics(), 10000);
        snapshot.value = unwrap<PipelineMetricsSnapshot>(res);
      } catch {
        // 静默处理，保持现有数据
      }
    })(),
    (async () => {
      try {
        const res = await withTimeout(pipelineApi.getPercentiles(), 10000);
        stepStats.value = unwrap<StepTimingStats[]>(res) || [];
      } catch {
        // 保持现有数据
      }
    })(),
    (async () => {
      try {
        const res = await withTimeout(pipelineApi.getBreakdowns(50), 10000);
        breakdowns.value = unwrap<PipelineTimingBreakdown[]>(res) || [];
      } catch {
        // 保持现有数据
      }
    })(),
    (async () => {
      try {
        prometheusText.value = await withTimeout(pipelineApi.getPrometheusMetrics(), 10000);
      } catch {
        // 保持现有数据
      }
    })(),
    (async () => {
      try {
        const res = await withTimeout(offlineCacheApi.getStats(), 10000);
        offlineCacheStats.value = res.data;
      } catch {
        // 保持现有数据
      }
    })(),
    // 始终刷新协议列表（下拉框数据源）
    (async () => {
      await loadProtocols();
    })(),
  ];

  // 如果当前已在按协议视图，同时刷新协议指标
  if (selectedProtocol.value) {
    tasks.push(
      (async () => {
        try {
          const res = await withTimeout(
            pipelineApi.getProtocolMetrics(selectedProtocol.value),
            10000,
          );
          protocolMetrics.value = unwrap<ProtocolMetrics>(res);
        } catch {
          // 保持现有数据
        }
      })(),
    );
  }

  // 安全超时：无论如何 20s 后强制结束 loading
  const safetyTimer = setTimeout(() => {
    if (loading.value) {
      loading.value = false;
      isRefreshing = false;
    }
  }, REFRESH_TIMEOUT_MS);

  try {
    await Promise.allSettled(tasks);
    if (!snapshot.value) {
      error.value = t('system.pipeline.loadFailed');
    }
    lastRefreshAt.value = Date.now();
  } finally {
    clearTimeout(safetyTimer);
    loading.value = false;
    isRefreshing = false;
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    refreshTimer = setInterval(refreshAll, AUTO_REFRESH_INTERVAL);
  } else if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

async function copyPrometheus() {
  if (!prometheusText.value) return;
  try {
    await navigator.clipboard.writeText(prometheusText.value);
    showSuccess(t('system.pipeline.copySuccess'));
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.pipeline.copyFailed'));
    }
  }
}

async function handleFlushOfflineCache() {
  offlineCacheLoading.value = true;
  try {
    const res = await offlineCacheApi.flush();
    const flushed = res.data?.flushed ?? 0;
    if (flushed > 0) {
      showSuccess(t('system.pipeline.flushSuccess', { count: flushed }));
    } else {
      showError(t('system.pipeline.flushNone'));
    }
    const statsRes = await offlineCacheApi.getStats();
    offlineCacheStats.value = statsRes.data;
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.pipeline.flushFailed'));
    }
  } finally {
    offlineCacheLoading.value = false;
  }
}

async function handleClearOfflineCache() {
  if (!(await showConfirm(t('system.pipeline.confirmClearCache')))) return;
  offlineCacheLoading.value = true;
  try {
    await offlineCacheApi.clear();
    showSuccess(t('system.pipeline.clearSuccess'));
    const res = await offlineCacheApi.getStats();
    offlineCacheStats.value = res.data;
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.pipeline.clearFailed'));
    }
  } finally {
    offlineCacheLoading.value = false;
  }
}

async function runDiagnostic() {
  diagnosticLoading.value = true;
  try {
    const res = await withTimeout(pipelineApi.getDiagnostic(), 10000);
    diagnosticResult.value = unwrap<any>(res);
    showSuccess(t('system.pipeline.diagnosticLoaded'));
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(t('system.pipeline.diagnosticFailed'));
    }
  } finally {
    diagnosticLoading.value = false;
  }
}

/** 根据诊断结论的 emoji 前缀返回样式类 */
function getDiagnosisClass(conclusion: string): string {
  if (conclusion.startsWith('✅')) return 'ok';
  if (conclusion.startsWith('❌')) return 'error';
  if (conclusion.startsWith('⚠️')) return 'warn';
  return '';
}

/** 切换全局/按协议视图 */
async function onScopeChange() {
  if (selectedProtocol.value) {
    protocolLoading.value = true;
    try {
      const res = await withTimeout(
        pipelineApi.getProtocolMetrics(selectedProtocol.value),
        10000,
      );
      protocolMetrics.value = unwrap<ProtocolMetrics>(res);
    } catch {
      protocolMetrics.value = null;
    } finally {
      protocolLoading.value = false;
    }
  } else {
    protocolMetrics.value = null;
  }
}

/** 加载有指标数据的协议列表 */
async function loadProtocols() {
  try {
    const res = await withTimeout(pipelineApi.getProtocols(), 10000);
    const data = unwrap<ProtocolSummary[]>(res);
    if (Array.isArray(data)) {
      protocols.value = data;
    }
  } catch {
    // 静默处理
  }
}

onMounted(() => {
  refreshAll();
  loadProtocols();
});

onBeforeUnmount(() => {
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
  refreshAll();
  if (wasAutoRefreshOn.value) {
    autoRefresh.value = true;
    refreshTimer = setInterval(refreshAll, AUTO_REFRESH_INTERVAL);
    wasAutoRefreshOn.value = false;
  }
});
</script>

<style scoped>
.pipeline-metrics {
  padding: 20px 24px 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.header-title h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.header-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.scope-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: 2px;
}

.scope-select {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  outline: none;
}

.scope-select:focus {
  border-color: var(--primary);
}

.auto-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
  margin-right: 4px;
}

.auto-dot.active {
  background: var(--status-success);
  box-shadow: 0 0 6px var(--status-success);
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

/* 指标卡片 */
.metrics-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.metric-card.success {
  border-color: rgba(var(--status-success-rgb), 0.3);
}

.metric-card.error {
  border-color: rgba(var(--status-error-rgb), 0.3);
}

.metric-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
}

.metric-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 18px;
}

.metric-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

.metric-card.success .metric-sub {
  color: var(--status-success);
}

.metric-card.error .metric-sub {
  color: var(--status-error);
}

/* 子系统指标行 */
.dashboard-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.sub-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 18px;
}

.sub-stats {
  display: flex;
  gap: 16px;
}

.sub-stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sub-stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sub-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.sub-stat-value.error {
  color: var(--status-error);
}

/* 面板通用 */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 14px 0;
}

/* 数据表格 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.data-table th {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--background);
}

.data-table td.num-col {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.data-table td.mono {
  font-family: 'Courier New', monospace;
}

.task-id-cell {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-table td.p95 {
  color: var(--status-warning);
  font-weight: 600;
}

.data-table td.p99 {
  color: var(--status-error);
  font-weight: 600;
}

.data-table td.step-name-cell {
  font-weight: 500;
  color: var(--primary);
}

.data-table td.text-error {
  color: var(--status-error);
  font-weight: 600;
}

.data-table tbody tr:hover {
  background: rgba(var(--primary-rgb), 0.05);
}

/* 火焰图 */
.flame-chart {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 480px;
  overflow-y: auto;
}

.flame-row {
  display: grid;
  grid-template-columns: 180px 1fr 80px;
  gap: 8px;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
}

.flame-row:hover {
  background: rgba(var(--primary-rgb), 0.05);
}

.flame-row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
}

.flame-time {
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
}

.flame-device {
  color: var(--text);
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flame-bars {
  display: flex;
  height: 24px;
  background: var(--background);
  border-radius: 4px;
  overflow: hidden;
}

.flame-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-width: 2px;
  background: var(--primary);
  color: var(--surface);
  font-size: 10px;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: 0 2px;
  transition: opacity 0.2s;
}

.flame-bar:hover {
  opacity: 0.85;
}

.flame-bar.is-error {
  background: var(--status-error);
}

.flame-bar-label {
  pointer-events: none;
}

.flame-total {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  text-align: right;
}

/* Prometheus 文本 */
.prometheus-text {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text);
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

/* 诊断面板 */
.diagnostic-panel {
  border-color: rgba(var(--primary-rgb), 0.4);
}

.diagnosis-conclusions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--background);
  border-radius: 8px;
}

.diagnosis-item {
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 3px solid var(--border);
}

.diagnosis-item.ok {
  color: var(--status-success);
  border-left-color: var(--status-success);
  background: rgba(var(--status-success-rgb), 0.05);
}

.diagnosis-item.error {
  color: var(--status-error);
  border-left-color: var(--status-error);
  background: rgba(var(--status-error-rgb), 0.05);
}

.diagnosis-item.warn {
  color: var(--status-warning);
  border-left-color: var(--status-warning);
  background: rgba(var(--status-warning-rgb), 0.05);
}

.diagnosis-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.diagnosis-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.diagnosis-kv {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  font-size: 12px;
}

.diagnosis-kv span:nth-child(odd) {
  color: var(--text-secondary);
}

.diagnosis-kv span:nth-child(even) {
  color: var(--text);
  font-weight: 500;
}

.empty-state {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

/* 离线缓存面板 */
.panel-actions {
  display: flex;
  gap: 8px;
}

.offline-cache-stats {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cache-stat-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cache-stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cache-stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.cache-stat-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.cache-bar {
  height: 6px;
  background: var(--background);
  border-radius: 3px;
  overflow: hidden;
}

.cache-bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 3px;
  transition: width 0.3s;
}

.cache-bar-fill.warning {
  background: var(--status-warning);
}

.cache-stat-row {
  display: flex;
  gap: 24px;
}

.cache-stat-item-inline {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .metrics-cards {
    grid-template-columns: repeat(3, 1fr);
  }

  .dashboard-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .metrics-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-row {
    grid-template-columns: 1fr;
  }

  .flame-row {
    grid-template-columns: 120px 1fr 60px;
  }
}
</style>
