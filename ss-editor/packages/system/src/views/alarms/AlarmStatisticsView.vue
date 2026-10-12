<template>
  <div class="alarm-statistics">
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
          {{ $t('system.alarmStatistics.backToAlarms') }}
        </button>
        <h2>{{ $t('system.alarmStatistics.title') }}</h2>
      </div>
      <div class="header-actions">
        <div class="project-select">
          <label class="date-label">{{ $t('system.alarmStatistics.project') }}</label>
          <select
            v-model="selectedProjectId"
            class="form-select"
            @change="onProjectChange"
          >
            <option value="">
              {{ $t('system.alarmStatistics.selectProject') }}
            </option>
            <option
              v-for="proj in projectStore.projects"
              :key="proj.projectId"
              :value="proj.projectId"
            >
              {{ proj.projectName }}
            </option>
          </select>
        </div>
        <div class="date-range">
          <TimeRangePicker
            v-model="dateRange"
            mode="date"
            :start-label="$t('system.alarmStatistics.startDate')"
            :end-label="$t('system.alarmStatistics.endDate')"
            :apply-label="$t('system.alarmStatistics.query')"
            :cancel-label="$t('system.messageBox.cancel')"
            size="sm"
            @change="onDateChange"
          />
        </div>
        <button
          class="sys-btn sys-btn-primary sys-btn-sm"
          :disabled="loading"
          @click="query"
        >
          {{ loading ? $t('system.alarmStatistics.loading') : $t('system.alarmStatistics.query') }}
        </button>
      </div>
    </div>

    <!-- 加载状态（首次） -->
    <SsLoading
      v-if="loading && !loaded"
      :text="$t('system.alarmStatistics.loading')"
      size="small"
    />

    <!-- 错误状态 -->
    <div
      v-else-if="error && !loaded"
      class="error-state"
    >
      <p>{{ error }}</p>
      <button
        class="sys-btn sys-btn-secondary"
        @click="query"
      >
        {{ $t('system.alarmStatistics.query') }}
      </button>
    </div>

    <template v-else-if="loaded">
      <!-- 顶部指标卡片 -->
      <div class="metrics-cards">
        <div class="metric-card">
          <span class="metric-label">{{ $t('system.alarmStatistics.currentPeriodCount') }}</span>
          <span class="metric-value">{{ currentPeriodCount }}</span>
        </div>
        <div
          class="metric-card"
          :class="trendCardClass"
        >
          <span class="metric-label">{{ $t('system.alarmStatistics.trendChange') }}</span>
          <span class="metric-value">
            <span class="trend-icon">{{ trendIcon }}</span>
            {{ trendPercentText }}
          </span>
        </div>
        <div class="metric-card">
          <span class="metric-label">{{ $t('system.alarmStatistics.avgResponseTime') }}</span>
          <span class="metric-value mono">{{ avgResponseTimeText }}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">{{ $t('system.alarmStatistics.totalSamples') }}</span>
          <span class="metric-value">{{ totalSamples }}</span>
        </div>
      </div>

      <!-- 级别分布面板 -->
      <div class="panel">
        <h3 class="section-title">
          {{ $t('system.alarmStatistics.levelDistribution') }}
        </h3>
        <div
          v-if="levelData.length === 0"
          class="empty-state"
        >
          {{ $t('system.alarmStatistics.noData') }}
        </div>
        <div
          v-else
          class="level-bars"
        >
          <div
            v-for="item in levelData"
            :key="item.level"
            class="level-bar-row"
          >
            <span
              class="level-bar-label"
              :class="'level-' + item.level"
            >{{ levelLabel(item.level) }}</span>
            <div class="level-bar-track">
              <div
                class="level-bar-fill"
                :class="'level-' + item.level"
                :style="{ width: levelBarWidth(item.count) + '%' }"
              />
            </div>
            <span class="level-bar-count">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <!-- 最频繁报警面板 -->
      <div class="panel">
        <h3 class="section-title">
          {{ $t('system.alarmStatistics.topAlarms') }}
        </h3>
        <div
          v-if="topAlarms.length === 0"
          class="empty-state"
        >
          {{ $t('system.alarmStatistics.noData') }}
        </div>
        <table
          v-else
          class="data-table"
        >
          <thead>
            <tr>
              <th>{{ $t('system.alarmStatistics.ruleName') }}</th>
              <th>{{ $t('system.alarmStatistics.message') }}</th>
              <th class="num-col">
                {{ $t('system.alarmStatistics.count') }}
              </th>
              <th>{{ $t('system.alarmStatistics.level') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(alarm, idx) in topAlarms"
              :key="idx"
            >
              <td class="rule-name-cell">
                {{ alarm.ruleName }}
              </td>
              <td>{{ alarm.message }}</td>
              <td class="num-col">
                {{ alarm.count }}
              </td>
              <td>
                <span
                  class="level-badge"
                  :class="'level-' + alarm.level"
                >{{ levelLabel(alarm.level) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 时间序列面板 -->
      <div class="panel">
        <h3 class="section-title">
          {{ $t('system.alarmStatistics.timeSeries') }}
        </h3>
        <div
          v-if="timeSeries.length === 0"
          class="empty-state"
        >
          {{ $t('system.alarmStatistics.noData') }}
        </div>
        <div
          v-else
          class="time-chart"
        >
          <div class="time-bars">
            <div
              v-for="(point, idx) in timeSeries"
              :key="idx"
              class="time-bar-wrap"
              :title="point.time + ': ' + point.count"
            >
              <div class="time-bar-label">
                {{ point.count }}
              </div>
              <div
                class="time-bar"
                :style="{ height: timeBarHeight(point.count) + 'px' }"
              />
              <div class="time-bar-date">
                {{ formatTimeLabel(point.time) }}
              </div>
            </div>
          </div>
          <div class="time-axis-label">
            {{ $t('system.alarmStatistics.time') }}
          </div>
        </div>
      </div>

      <!-- 响应时间统计面板 -->
      <div class="panel">
        <h3 class="section-title">
          {{ $t('system.alarmStatistics.responseTimeStats') }}
        </h3>
        <div
          v-if="!responseTime"
          class="empty-state"
        >
          {{ $t('system.alarmStatistics.noData') }}
        </div>
        <div
          v-else
          class="response-stats"
        >
          <div class="response-stat-item">
            <span class="response-stat-label">{{ $t('system.alarmStatistics.average') }}</span>
            <span class="response-stat-value mono">{{ formatMs(responseTime.average) }} ms</span>
          </div>
          <div class="response-stat-item">
            <span class="response-stat-label">{{ $t('system.alarmStatistics.median') }}</span>
            <span class="response-stat-value mono">{{ formatMs(responseTime.median) }} ms</span>
          </div>
          <div class="response-stat-item">
            <span class="response-stat-label">{{ $t('system.alarmStatistics.max') }}</span>
            <span class="response-stat-value mono">{{ formatMs(responseTime.max) }} ms</span>
          </div>
          <div class="response-stat-item">
            <span class="response-stat-label">{{ $t('system.alarmStatistics.min') }}</span>
            <span class="response-stat-value mono">{{ formatMs(responseTime.min) }} ms</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { showError } from '../../utils/messageBox';
import { alarmApi } from '../../api/modules';
import { useProjectStore } from '../../stores';
import type {
  LevelStatistics,
  TrendAnalysis,
  TopAlarm,
  ResponseTimeStats,
  TimeSeriesPoint,
} from '../../api/types/alarm-statistics';
import { SsLoading, TimeRangePicker } from '@scada-editor/shared';
import type { TimeRange } from '@scada-editor/shared';

const router = useRouter();
const { t } = useI18n();

const dateRange = ref<TimeRange>({ start: '', end: '' });
const loading = ref(false);
const error = ref('');
const loaded = ref(false);

const selectedProjectId = ref('');
const projectStore = useProjectStore();

const levelData = ref<LevelStatistics[]>([]);
const trendData = ref<TrendAnalysis | null>(null);
const topAlarms = ref<TopAlarm[]>([]);
const responseTime = ref<ResponseTimeStats | null>(null);
const timeSeries = ref<TimeSeriesPoint[]>([]);

function goBack(): void {
  router.push('/system/alarms');
}

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  };
}

function detectInterval(start: string, end: string): 'hourly' | 'daily' {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const days = (e - s) / (1000 * 60 * 60 * 24);
  return days <= 2 ? 'hourly' : 'daily';
}

function unwrap<T>(res: T | { data: T }): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

function levelLabel(l: string): string {
  const labels: Record<string, string> = {
    info: t('system.alarms.levelInfo'),
    warning: t('system.alarms.levelWarning'),
    error: t('system.alarms.levelError'),
    critical: t('system.alarms.levelCritical'),
  };
  return labels[l] || l;
}

function levelBarWidth(count: number): number {
  const max = Math.max(...levelData.value.map((d) => d.count), 1);
  return Math.max(2, (count / max) * 100);
}

function timeBarHeight(count: number): number {
  const max = Math.max(...timeSeries.value.map((d) => d.count), 1);
  return Math.max(4, (count / max) * 120);
}

function formatTimeLabel(time: string): string {
  if (!time) return '';
  if (time.length >= 10) {
    return time.substring(5, 10);
  }
  return time;
}

function formatMs(ms: number): string {
  if (Number.isInteger(ms)) return String(ms);
  if (ms < 1) return ms.toFixed(3);
  if (ms < 100) return ms.toFixed(2);
  return ms.toFixed(1);
}

const currentPeriodCount = computed(() => {
  if (trendData.value) return trendData.value.currentPeriod.count;
  return levelData.value.reduce((sum, d) => sum + d.count, 0);
});

const trendIcon = computed(() => {
  if (!trendData.value) return '→';
  if (trendData.value.trend === 'up') return '↑';
  if (trendData.value.trend === 'down') return '↓';
  return '→';
});

const trendPercentText = computed(() => {
  if (!trendData.value) return '0%';
  return `${trendData.value.changePercent.toFixed(1)}%`;
});

const trendCardClass = computed(() => {
  if (!trendData.value) return '';
  if (trendData.value.trend === 'up') return 'trend-up';
  if (trendData.value.trend === 'down') return 'trend-down';
  return 'trend-stable';
});

const avgResponseTimeText = computed(() => {
  if (!responseTime.value) return '—';
  return `${formatMs(responseTime.value.average)} ms`;
});

const totalSamples = computed(() => responseTime.value?.totalSamples ?? 0);

async function query(): Promise<void> {
  if (!dateRange.value.start || !dateRange.value.end) return;
  loading.value = true;
  error.value = '';
  try {
    const pid = selectedProjectId.value || undefined;
    const interval = detectInterval(dateRange.value.start, dateRange.value.end);
    const [levels, trend, top, resp, times] = await Promise.all([
      alarmApi.getByLevel(pid, dateRange.value.start, dateRange.value.end),
      alarmApi.getTrend(dateRange.value.start, dateRange.value.end, pid),
      alarmApi.getTopAlarms(10, pid, dateRange.value.start, dateRange.value.end),
      alarmApi.getResponseTime(pid, dateRange.value.start, dateRange.value.end),
      alarmApi.getByTime(pid, dateRange.value.start, dateRange.value.end, interval),
    ]);
    levelData.value = unwrap(levels) || [];
    trendData.value = unwrap(trend) || null;
    topAlarms.value = unwrap(top) || [];
    responseTime.value = unwrap(resp) || null;
    timeSeries.value = unwrap(times) || [];
    loaded.value = true;
  } catch (e: any) {
    if (!loaded.value) {
      error.value = t('system.alarmStatistics.loadFailed');
    } else if (!e._errorHandled) {
      showError(t('system.alarmStatistics.loadFailed'));
    }
  } finally {
    loading.value = false;
  }
}

async function loadProjects(): Promise<void> {
  try {
    await projectStore.fetchProjects();
  } catch {
    // store handles error internally
  }
}

function onProjectChange(): void {
  loaded.value = false;
  query();
}

function onDateChange(_val: TimeRange | number): void {
  query();
}

onMounted(async () => {
  const range = getDefaultDateRange();
  dateRange.value = { start: range.start, end: range.end };
  await loadProjects();
  query();
});
</script>

<style scoped>
.alarm-statistics {
  padding: 20px 24px 32px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 页头 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.date-input {
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.date-input:focus {
  border-color: var(--primary);
}

.date-sep {
  color: var(--text-secondary);
  font-size: 13px;
}

/* 加载/错误状态 */
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 指标卡片 */
.metrics-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.metric-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 18px;
}

.trend-icon {
  font-size: 20px;
  line-height: 1;
}

.metric-card.trend-up .metric-value {
  color: var(--status-error);
}

.metric-card.trend-down .metric-value {
  color: var(--status-success);
}

.metric-card.trend-stable .metric-value {
  color: var(--text-secondary);
}

/* 面板通用 */
.panel {
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

.data-table td.rule-name-cell {
  font-weight: 500;
  color: var(--primary);
}

.data-table tbody tr:hover {
  background: var(--background);
}

/* 级别徽章 */
.level-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  background: var(--border);
  color: var(--text-secondary);
}

.level-badge.level-critical {
  background: var(--status-error);
  color: var(--button-text);
  font-weight: 700;
}

.level-badge.level-error {
  background: var(--status-error);
  color: var(--button-text);
}

.level-badge.level-warning {
  background: var(--status-warning);
  color: var(--text);
}

.level-badge.level-info {
  background: var(--border);
  color: var(--text-secondary);
}

/* 级别分布条形图 */
.level-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.level-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-bar-label {
  font-size: 13px;
  font-weight: 500;
  min-width: 60px;
}

.level-bar-label.level-critical {
  color: var(--status-error);
}

.level-bar-label.level-error {
  color: var(--status-error);
}

.level-bar-label.level-warning {
  color: var(--status-warning);
}

.level-bar-label.level-info {
  color: var(--text-secondary);
}

.level-bar-track {
  flex: 1;
  height: 20px;
  background: var(--background);
  border-radius: 4px;
  overflow: hidden;
}

.level-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
  background: var(--primary);
}

.level-bar-fill.level-critical {
  background: var(--status-error);
}

.level-bar-fill.level-error {
  background: var(--status-error);
}

.level-bar-fill.level-warning {
  background: var(--status-warning);
}

.level-bar-fill.level-info {
  background: var(--text-secondary);
}

.level-bar-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  min-width: 50px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* 时间序列条形图 */
.time-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 160px;
  padding-bottom: 8px;
  overflow-x: auto;
}

.time-bar-wrap {
  flex: 1;
  min-width: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}

.time-bar-label {
  font-size: 11px;
  color: var(--text);
  margin-bottom: 4px;
}

.time-bar {
  width: 100%;
  max-width: 40px;
  background: var(--primary);
  border-radius: 4px 4px 0 0;
  transition: height 0.3s;
  min-width: 12px;
}

.time-bar-date {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 6px;
}

.time-axis-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 响应时间统计 */
.response-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.response-stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: var(--background);
  border-radius: 8px;
}

.response-stat-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.response-stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}

.response-stat-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 16px;
}

/* 空状态 */
.empty-state {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .metrics-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .response-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .metrics-cards {
    grid-template-columns: 1fr;
  }

  .response-stats {
    grid-template-columns: 1fr;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .date-range {
    flex-wrap: wrap;
  }
}
</style>
