<template>
  <div class="reports-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ t('system.reports.title') }}
      </h1>
    </div>

    <!-- 工具栏：报表类型 / 日期 / 生成 / 导出 -->
    <div class="toolbar">
      <div class="toolbar-field">
        <label class="field-label">{{ t('system.reports.reportType') }}</label>
        <select
          v-model="reportType"
          class="form-select"
          @change="handleReportTypeChange"
        >
          <option
            v-for="opt in reportTypeOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- 日报：日期选择 -->
      <div
        v-if="reportType === 'daily'"
        class="toolbar-field"
      >
        <label class="field-label">{{ t('system.reports.date') }}</label>
        <input
          v-model="dateValue"
          type="date"
          class="form-input"
        >
      </div>

      <!-- 月报：月份选择 -->
      <div
        v-else-if="reportType === 'monthly'"
        class="toolbar-field"
      >
        <label class="field-label">{{ t('system.reports.month') }}</label>
        <input
          v-model="monthValue"
          type="month"
          class="form-input"
        >
      </div>

      <!-- 自定义/告警/趋势：日期范围 -->
      <template v-else>
        <div class="toolbar-field">
          <label class="field-label">{{ t('system.reports.dateRange') }}</label>
          <TimeRangePicker
            v-model="dateRange"
            mode="date"
            size="sm"
          />
        </div>
        <div
          v-if="reportType === 'custom' || reportType === 'trend'"
          class="toolbar-field"
        >
          <label class="field-label">{{ t('system.reports.granularity') }}</label>
          <select
            v-model="granularity"
            class="form-select form-select--sm"
          >
            <option
              v-for="opt in granularityOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
      </template>

      <div class="toolbar-actions">
        <button
          class="btn btn-primary"
          :disabled="generating || !canGenerate"
          @click="handleGenerate"
        >
          {{ generating ? t('system.reports.generating') : t('system.reports.generate') }}{{ generating ? '...' : '' }}
        </button>

        <select
          v-model="exportFormat"
          class="form-select form-select--sm"
          :disabled="!currentReport"
        >
          <option
            v-for="opt in exportFormatOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <button
          class="btn btn-secondary"
          :disabled="exporting || !currentReport"
          @click="handleExport"
        >
          {{ exporting ? t('system.reports.exporting') : t('system.reports.export') }}{{ exporting ? '...' : '' }}
        </button>
      </div>
    </div>

    <SsLoading
      v-if="generating"
      :text="t('system.reports.generating')"
      size="small"
    />
    <template v-else-if="currentReport">
      <!-- 报表元信息 -->
      <div class="report-meta">
        <span class="meta-item">
          <span class="meta-label">{{ t('system.reports.reportId') }}:</span>
          <span class="meta-value">{{ currentReport.id }}</span>
        </span>
        <span class="meta-item">
          <span class="meta-label">{{ t('system.reports.generatedAt') }}:</span>
          <span class="meta-value">{{ formatDateTime(currentReport.generatedAt) }}</span>
        </span>
      </div>

      <!-- 摘要卡片 -->
      <div
        v-if="summary"
        class="summary-grid"
      >
        <div class="summary-card">
          <div class="summary-label">
            {{ t('system.reports.totalDevices') }}
          </div>
          <div class="summary-value">
            {{ summary.totalDevices }}
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">
            {{ t('system.reports.onlineDevices') }}
          </div>
          <div class="summary-value summary-value--online">
            {{ summary.onlineDevices }}
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">
            {{ t('system.reports.offlineDevices') }}
          </div>
          <div class="summary-value summary-value--offline">
            {{ summary.offlineDevices }}
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">
            {{ t('system.reports.totalAlarms') }}
          </div>
          <div class="summary-value summary-value--alarm">
            {{ summary.totalAlarms }}
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">
            {{ t('system.reports.avgDataQuality') }}
          </div>
          <div class="summary-value">
            {{ formatPercent(summary.avgDataQuality) }}
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div
        v-if="charts.length > 0"
        class="section-title"
      >
        {{ t('system.reports.charts') }}
      </div>
      <div class="charts-grid">
        <div
          v-for="(chart, idx) in charts"
          :key="idx"
          class="chart-card"
          :class="{ 'full-width': chart.type === 'line' || chart.type === 'bar' }"
        >
          <div class="chart-card-header">
            <h3>{{ chart.title }}</h3>
          </div>
          <div class="chart-body">
            <v-chart
              :option="buildChartOption(chart)"
              autoresize
              style="height: 320px"
            />
          </div>
        </div>
      </div>

      <!-- 指标项表格 -->
      <div
        v-if="items.length > 0"
        class="section-title"
      >
        {{ t('system.reports.itemsTable') }}
      </div>
      <div
        v-if="items.length > 0"
        class="items-table-wrap"
      >
        <table class="items-table">
          <thead>
            <tr>
              <th>{{ t('system.reports.itemLabel') }}</th>
              <th>{{ t('system.reports.itemValue') }}</th>
              <th>{{ t('system.reports.itemUnit') }}</th>
              <th>{{ t('system.reports.itemTrend') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, idx) in items"
              :key="idx"
            >
              <td>{{ item.label }}</td>
              <td>{{ item.value }}</td>
              <td>{{ item.unit || '-' }}</td>
              <td>
                <span
                  class="tag"
                  :class="'tag--' + trendTagType(item.trend)"
                >
                  {{ trendLabel(item.trend) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 空状态 -->
    <div
      v-else
      class="empty-state"
    >
      {{ t('system.reports.noData') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@scada-editor/core';
import { SsLoading, TimeRangePicker } from '@scada-editor/shared';
import type { TimeRange } from '@scada-editor/shared';
import { use } from 'echarts/core';
import { LineChart, PieChart, BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import { reportApi } from '../../api/modules/report.api';
import type {
  Report,
  ReportType,
  ReportGranularity,
  ReportChart,
  ReportItem,
  ReportSummary,
  ExportReportDto,
} from '../../api/modules/report.api';
import { useProjectStore } from '../../stores/project.store';
import { showSuccess, showError } from '../../utils/messageBox';

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

const { t } = useI18n();
const projectStore = useProjectStore();

// ==================== 状态 ====================

const reportType = ref<ReportType>('daily');
const dateValue = ref<string>(formatDate(Date.now()));
const monthValue = ref<string>(formatMonth(Date.now()));
const dateRange = ref<TimeRange>({
  start: formatDate(Date.now() - 6 * 24 * 60 * 60 * 1000),
  end: formatDate(Date.now()),
});
const granularity = ref<ReportGranularity>('day');
const exportFormat = ref<'pdf' | 'excel'>('excel');

const generating = ref(false);
const exporting = ref(false);
const currentReport = ref<Report | null>(null);

// ==================== 计算属性 ====================

const reportTypeOptions = computed(() => [
  { label: t('system.reports.typeDaily'), value: 'daily' as ReportType },
  { label: t('system.reports.typeMonthly'), value: 'monthly' as ReportType },
  { label: t('system.reports.typeCustom'), value: 'custom' as ReportType },
  { label: t('system.reports.typeAlarm'), value: 'alarm' as ReportType },
  { label: t('system.reports.typeTrend'), value: 'trend' as ReportType },
]);

const granularityOptions = computed(() => [
  { label: t('system.reports.granularityHour'), value: 'hour' as ReportGranularity },
  { label: t('system.reports.granularityDay'), value: 'day' as ReportGranularity },
  { label: t('system.reports.granularityMonth'), value: 'month' as ReportGranularity },
]);

const exportFormatOptions = computed(() => [
  { label: t('system.reports.formatExcel'), value: 'excel' as const },
  { label: t('system.reports.formatPdf'), value: 'pdf' as const },
]);

const summary = computed<ReportSummary | null>(() => currentReport.value?.data?.summary ?? null);
const items = computed<ReportItem[]>(() => currentReport.value?.data?.items ?? []);
const charts = computed<ReportChart[]>(() => currentReport.value?.data?.charts ?? []);

const canGenerate = computed(() => {
  if (reportType.value === 'daily') return !!dateValue.value;
  if (reportType.value === 'monthly') return !!monthValue.value;
  return !!dateRange.value.start && !!dateRange.value.end;
});

// ==================== 工具方法 ====================

/** 读取 CSS 变量值（用于 echarts 颜色） */
function cssVar(name: string): string {
  const styles = getComputedStyle(document.documentElement);
  const value = styles.getPropertyValue(name).trim();
  return value || '';
}

/** 获取当前主题下的 echarts 颜色配置 */
function chartColors() {
  return {
    text: cssVar('--text'),
    textSecondary: cssVar('--text-secondary'),
    border: cssVar('--border'),
    surface: cssVar('--surface'),
    primary: cssVar('--primary'),
    success: cssVar('--status-success'),
    warning: cssVar('--status-warning'),
    danger: cssVar('--status-error'),
    palette: [
      cssVar('--chart-1') || cssVar('--primary'),
      cssVar('--chart-2') || cssVar('--status-success'),
      cssVar('--chart-3') || cssVar('--status-warning'),
      cssVar('--chart-4') || cssVar('--status-error'),
      cssVar('--chart-5'),
      cssVar('--chart-7'),
    ],
  };
}

/** 格式化日期为 yyyy-MM-dd */
function formatDate(ts: number | string | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 格式化月份为 yyyy-MM */
function formatMonth(ts: number | string | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** 格式化日期时间 */
function formatDateTime(ts: string): string {
  try {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  } catch {
    return ts;
  }
}

/** 格式化百分比 */
function formatPercent(value: number | undefined): string {
  if (value == null) return '-';
  return `${Math.round(value * 100) / 100}`;
}

/** 趋势标签 */
function trendLabel(trend: ReportItem['trend']): string {
  if (trend === 'up') return t('system.reports.trendUp');
  if (trend === 'down') return t('system.reports.trendDown');
  return t('system.reports.trendStable');
}

/** 趋势标签类型 */
function trendTagType(trend: ReportItem['trend']): 'success' | 'error' | 'default' {
  if (trend === 'up') return 'success';
  if (trend === 'down') return 'error';
  return 'default';
}

/** 构建 echarts 图表配置 */
function buildChartOption(chart: ReportChart) {
  const colors = chartColors();
  const baseAxis = {
    axisLabel: { color: colors.textSecondary, fontSize: 11 },
    axisLine: { lineStyle: { color: colors.border } },
  };

  if (chart.type === 'pie') {
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: colors.textSecondary } },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          label: { color: colors.text },
          data: chart.labels.map((label, i) => ({
            value: chart.datasets[0]?.data[i] ?? 0,
            name: label,
            itemStyle: { color: colors.palette[i % colors.palette.length] },
          })),
        },
      ],
    };
  }

  if (chart.type === 'bar') {
    return {
      tooltip: { trigger: 'axis' },
      legend: {
        bottom: 0,
        textStyle: { color: colors.textSecondary },
        data: chart.datasets.map((d) => d.label),
      },
      grid: { left: 48, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: chart.labels, ...baseAxis },
      yAxis: { type: 'value', ...baseAxis, splitLine: { lineStyle: { color: colors.border } } },
      series: chart.datasets.map((d, i) => ({
        name: d.label,
        type: 'bar',
        data: d.data,
        itemStyle: { color: d.color || colors.palette[i % colors.palette.length] },
      })),
    };
  }

  // 默认 line
  return {
    tooltip: { trigger: 'axis' },
    legend: {
      bottom: 0,
      textStyle: { color: colors.textSecondary },
      data: chart.datasets.map((d) => d.label),
    },
    grid: { left: 48, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: chart.labels, ...baseAxis },
    yAxis: { type: 'value', ...baseAxis, splitLine: { lineStyle: { color: colors.border } } },
    series: chart.datasets.map((d, i) => ({
      name: d.label,
      type: 'line',
      data: d.data,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: d.color || colors.palette[i % colors.palette.length], width: 2 },
      areaStyle: { opacity: 0.1 },
    })),
  };
}

// ==================== 业务方法 ====================

function handleReportTypeChange() {
  currentReport.value = null;
}

/** 获取当前项目 ID */
function getProjectId(): string | null {
  const project = projectStore.projects[0] ?? projectStore.currentProject;
  return project?.projectId ?? null;
}

/** 生成报表 */
async function handleGenerate() {
  const projectId = getProjectId();
  if (!projectId) {
    showError(t('system.reports.noProject'));
    return;
  }

  generating.value = true;
  try {
    let res: { data: Report } | Report;
    if (reportType.value === 'daily') {
      res = await reportApi.generateDaily(projectId, { date: dateValue.value });
    } else if (reportType.value === 'monthly') {
      res = await reportApi.generateMonthly(projectId, { month: monthValue.value });
    } else if (reportType.value === 'alarm') {
      res = await reportApi.generateAlarm(projectId, {
        startDate: dateRange.value.start,
        endDate: dateRange.value.end,
      });
    } else if (reportType.value === 'trend') {
      res = await reportApi.generateTrend(projectId, {
        startDate: dateRange.value.start,
        endDate: dateRange.value.end,
        tagIds: [],
        granularity: granularity.value,
      });
    } else {
      // custom
      res = await reportApi.generateCustom(projectId, {
        startDate: dateRange.value.start,
        endDate: dateRange.value.end,
        granularity: granularity.value,
      });
    }

    // res 可能是 { data: Report }（HTTP 包装）或 Report（直返），
    // 类型不充分重叠，需先转 unknown 再转 Report
    const report = (res as { data: Report }).data ?? (res as unknown as Report);
    currentReport.value = report;
    showSuccess(t('system.reports.generateSuccess'));
  } catch (err) {
    if (!(err as any)._errorHandled) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(message || t('system.reports.generateFailed'));
    }
  } finally {
    generating.value = false;
  }
}

/** 导出报表 */
async function handleExport() {
  if (!currentReport.value) return;
  const projectId = getProjectId();
  if (!projectId) {
    showError(t('system.reports.noProject'));
    return;
  }

  exporting.value = true;
  try {
    const dto: ExportReportDto = { format: exportFormat.value };
    const res = await reportApi.exportReport(projectId, currentReport.value.id, dto);
    const result = (res as { data: unknown }).data ?? res;
    const exportResult = result as { fileUrl?: string; fileName?: string };

    // 尝试触发文件下载
    if (exportResult.fileUrl) {
      try {
        const link = document.createElement('a');
        link.href = exportResult.fileUrl;
        link.download = exportResult.fileName || '';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        /* 下载失败仅忽略，仍提示成功 */
      }
    }
    showSuccess(t('system.reports.exportSuccess'));
  } catch (err) {
    if (!(err as any)._errorHandled) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(message || t('system.reports.exportFailed'));
    }
  } finally {
    exporting.value = false;
  }
}

// ==================== 生命周期 ====================

onMounted(async () => {
  if (!projectStore.projects.length) {
    await projectStore.fetchProjects();
  }
});
</script>

<style scoped>
.reports-page {
  min-height: 100%;
  padding: 24px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  margin-bottom: 20px;
}

.toolbar-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.toolbar-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-left: auto;
}

/* 原生表单控件 */
.form-select,
.form-input {
  width: 180px;
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-select:focus,
.form-input:focus {
  border-color: var(--primary);
}

.form-select--sm {
  width: 120px;
}

.form-input--sm {
  width: 140px;
}

.form-select:disabled,
.form-input:disabled {
  background: var(--background);
  color: var(--text-secondary);
  cursor: not-allowed;
}

/* 日期范围 */
.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-range-separator {
  color: var(--text-secondary);
  font-size: 12px;
}

/* 按钮 */
.btn {
  height: 32px;
  padding: 0 16px;
  font-size: 13px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: var(--text);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border-light);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

/* 标签 */
.tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  border-radius: 12px;
  line-height: 18px;
}

.tag--success {
  background: var(--status-success);
  color: var(--text);
}

.tag--error {
  background: var(--status-error);
  color: var(--text);
}

.tag--default {
  background: var(--background);
  color: var(--text-secondary);
}

/* 加载状态 */
.loading-state {
  padding: 60px 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.report-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
}

.meta-item {
  display: flex;
  gap: 6px;
}

.meta-label {
  color: var(--text-secondary);
}

.meta-value {
  color: var(--text);
  font-weight: 500;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.summary-card {
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 10px;
}

.summary-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.summary-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.summary-value--online {
  color: var(--status-success);
}

.summary-value--offline {
  color: var(--text-secondary);
}

.summary-value--alarm {
  color: var(--status-error);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 20px 0 12px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.chart-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  overflow: hidden;
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-card-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--background);
}

.chart-card-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.chart-body {
  padding: 12px;
}

.items-table-wrap {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  overflow: hidden;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th,
.items-table td {
  padding: 10px 16px;
  text-align: left;
  border-bottom: 1px solid var(--background);
  font-size: 13px;
}

.items-table th {
  background: var(--background);
  color: var(--text-secondary);
  font-weight: 600;
}

.items-table td {
  color: var(--text);
}

.items-table tbody tr:last-child td {
  border-bottom: none;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
