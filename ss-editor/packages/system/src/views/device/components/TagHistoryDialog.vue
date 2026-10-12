<template>
  <div
    v-if="visible"
    class="dialog-overlay"
    @click.self="handleClose"
  >
    <div class="dialog-container">
      <!-- 头部 -->
      <div class="dialog-header">
        <div class="header-left">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            class="header-icon"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <h2 class="dialog-title">
            {{ $t('system.tagHistory.title', { tag: tagName }) }}
          </h2>
        </div>
        <div class="header-right">
          <!-- 视图切换 -->
          <div class="view-toggle">
            <button
              class="view-toggle-btn"
              :class="{ active: viewMode === 'trend' }"
              @click="viewMode = 'trend'"
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
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              {{ $t('system.tagHistory.viewTrend') }}
            </button>
            <button
              class="view-toggle-btn"
              :class="{ active: viewMode === 'table' }"
              @click="viewMode = 'table'"
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
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  ry="2"
                />
                <line
                  x1="3"
                  y1="9"
                  x2="21"
                  y2="9"
                />
                <line
                  x1="3"
                  y1="15"
                  x2="21"
                  y2="15"
                />
                <line
                  x1="9"
                  y1="3"
                  x2="9"
                  y2="21"
                />
              </svg>
              {{ $t('system.tagHistory.viewTable') }}
            </button>
          </div>
          <button
            class="dialog-close"
            :title="$t('common.close')"
            @click="handleClose"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
              />
              <line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 标签信息条 -->
      <div class="tag-info-bar">
        <div class="tag-info-chip">
          <span class="chip-label">{{ $t('system.tagHistory.tagAddress') }}</span>
          <code class="chip-value">{{ tagAddress || '-' }}</code>
        </div>
        <div class="tag-info-divider" />
        <div class="tag-info-chip">
          <span class="chip-label">{{ $t('system.tagHistory.tagId') }}</span>
          <code class="chip-value mono-sm">{{ tagId }}</code>
        </div>
      </div>

      <!-- 查询工具栏：时间范围 + 查询方式 + 间隔 + 查询按钮（整合为一行） -->
      <div class="query-toolbar">
        <TimeRangePicker
          v-model="dateRange"
          mode="datetime"
          :presets="tagPresets"
          size="sm"
        />
        <div class="interp-field">
          <label>{{ $t('system.tagHistory.queryMethod') }}</label>
          <select
            v-model="interpolationMode"
            class="form-select"
          >
            <option value="raw">
              {{ $t('system.tagHistory.rawValue') }}
            </option>
            <option value="linear">
              {{ $t('system.tagHistory.linearInterp') }}
            </option>
            <option value="step">
              {{ $t('system.tagHistory.stepInterp') }}
            </option>
          </select>
        </div>
        <div
          v-if="interpolationMode !== 'raw'"
          class="interp-field"
        >
          <label>{{ $t('system.tagHistory.interval') }}</label>
          <select
            v-model="interpolationInterval"
            class="form-select"
          >
            <option :value="500">
              500ms
            </option>
            <option :value="1000">
              1s
            </option>
            <option :value="5000">
              5s
            </option>
            <option :value="10000">
              10s
            </option>
            <option :value="30000">
              30s
            </option>
            <option :value="60000">
              1min
            </option>
          </select>
        </div>
        <button
          class="query-btn"
          :disabled="queryLoading"
          @click="queryHistory"
        >
          <svg
            v-if="queryLoading"
            class="spinner"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <svg
            v-else
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            />
          </svg>
          {{ queryLoading ? $t('system.tagHistory.querying') : $t('system.tagHistory.query') }}
        </button>
      </div>

      <!-- 内容区 -->
      <div class="content-area">
        <!-- 加载状态 -->
        <div
          v-if="queryLoading"
          class="loading-area"
        >
          <SsLoading
            :text="$t('system.tagHistory.querying')"
            size="small"
          />
        </div>

        <!-- 空状态 -->
        <div
          v-else-if="historyData.length === 0 && hasQueried"
          class="empty-area"
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            class="empty-icon"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <p class="empty-text">
            {{ $t('system.tagHistory.noData') }}
          </p>
        </div>

        <!-- 有数据 -->
        <template v-else-if="historyData.length > 0">
          <!-- 工具栏 -->
          <div class="toolbar">
            <div class="data-count">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {{ $t('system.tagHistory.dataCount', { count: historyData.length }) }}
            </div>
            <div
              v-if="totalRecordCount > 0"
              class="record-count"
            >
              {{ $t('system.tagHistory.recordCount', { n: totalRecordCount }) }}
            </div>
            <div class="toolbar-actions">
              <button
                v-if="viewMode === 'trend'"
                class="tool-btn"
                :title="$t('system.tagHistory.saveImage')"
                @click="saveAsImage"
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
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                  />
                  <circle
                    cx="8.5"
                    cy="8.5"
                    r="1.5"
                  />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                {{ $t('system.tagHistory.saveImage') }}
              </button>
              <button
                class="tool-btn"
                :title="$t('system.tagHistory.exportCsv')"
                :disabled="exportLoading"
                @click="exportAsCsv"
              >
                <svg
                  v-if="exportLoading"
                  class="spinner"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <svg
                  v-else
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line
                    x1="12"
                    y1="15"
                    x2="12"
                    y2="3"
                  />
                </svg>
                {{ exportLoading ? $t('system.tagHistory.exporting') : $t('system.tagHistory.exportCsv') }}
              </button>
            </div>
          </div>

          <!-- 趋势图视图 -->
          <div
            v-if="viewMode === 'trend'"
            class="trend-view"
          >
            <div
              class="trend-chart-area"
              @wheel.prevent="handleChartWheel"
              @mousedown="handleChartMouseDown"
              @mousemove="handleChartMouseMove"
              @mouseleave="handleChartMouseLeave"
              @click="handleChartClick"
            >
              <canvas
                ref="trendCanvasRef"
                class="trend-canvas"
                @dblclick="resetZoom"
              />
            </div>
            <div class="datazoom-slider">
              <canvas
                ref="sliderCanvasRef"
                class="slider-canvas"
                @mousedown="handleSliderMouseDown"
              />
            </div>
          </div>

          <!-- 表格视图 -->
          <div
            v-else
            class="table-view"
          >
            <div class="data-table-wrapper">
              <table class="history-table">
                <thead>
                  <tr>
                    <th class="num-col">
                      {{ $t('system.tagHistory.index') }}
                    </th>
                    <th>{{ $t('system.tagHistory.timestamp') }}</th>
                    <th class="num-col">
                      {{ $t('system.tagHistory.value') }}<span
                        v-if="unit"
                        class="th-unit"
                      > ({{ unit }})</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, idx) in historyData"
                    :key="idx"
                  >
                    <td class="num-col idx-col">
                      {{ idx + 1 }}
                    </td>
                    <td class="mono td-time">
                      {{ formatTime(item.timestamp) }}
                    </td>
                    <td class="num-col">
                      <span
                        class="value-badge"
                        :class="{ 'is-null': item.value === null || item.value === undefined }"
                      >
                        {{ formatTagValue(item.value, displayFormat) }}<span
                          v-if="unit && item.value !== null && item.value !== undefined"
                          class="value-unit"
                        > {{ unit }}</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted, computed } from 'vue';
import { useI18n } from '@scada-editor/core';
import { dataQueryApi } from '../../../api/modules/data-query.api';
import { SsLoading, TimeRangePicker } from '@scada-editor/shared';
import type { TimeRange } from '@scada-editor/shared';
import { showSuccess, showError } from '../../../utils/messageBox';
import { formatTagValue, getDecimalsFromFormat } from '../../../utils/format';

const { t } = useI18n();

const props = defineProps<{
  visible: boolean;
  tagId: string;
  tagName: string;
  tagAddress: string;
  /** 标签显示格式串（如 "%.2f"、"%d"、"%04X"），用于列表与趋势图 Y 轴的格式化 */
  displayFormat?: string;
  /** 标签单位（如 "℃"、"kPa"），在列表值后与趋势图 Y 轴标题处显示 */
  unit?: string;
  /** 标签数据类型（如 "float32"、"uint16"），用于辅助展示 */
  dataType?: string;
  projectId: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
}>();

// ===== 视图模式 =====
const viewMode = ref<'trend' | 'table'>('trend');

// ===== 时间预设 =====
const presets = [
  { value: '1h', label: t('system.tagHistory.preset1h') },
  { value: '6h', label: t('system.tagHistory.preset6h') },
  { value: '24h', label: t('system.tagHistory.preset24h') },
  { value: '7d', label: t('system.tagHistory.preset7d') },
];

const selectedPreset = ref('1h');
const startTime = ref('');
const endTime = ref('');

// TimeRangePicker 预设
const tagPresets = computed(() => presets.map((p) => ({ label: p.label, value: p.value })));

// 双向绑定到 TimeRangePicker
const dateRange = computed<TimeRange>({
  get: () => ({ start: startTime.value, end: endTime.value }),
  set: (val: TimeRange) => {
    startTime.value = val.start;
    endTime.value = val.end;
    selectedPreset.value = '';
  },
});

// ===== 查询状态 =====
const queryLoading = ref(false);
const exportLoading = ref(false);
const hasQueried = ref(false);
const historyData = ref<{ value: number | null; timestamp: string }[]>([]);
const totalRecordCount = ref(0);

// ===== 插值 =====
const interpolationMode = ref<'raw' | 'linear' | 'step'>('raw');
const interpolationInterval = ref(1000);

// ===== Canvas 趋势图 =====
const trendCanvasRef = ref<HTMLCanvasElement | null>(null);
const sliderCanvasRef = ref<HTMLCanvasElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
let sliderResizeObserver: ResizeObserver | null = null;

// dataZoom 缩放状态
const zoomRange = ref<{ start: number; end: number } | null>(null);

// 主图表拖拽平移
const isPanning = ref(false);
const panStartX = ref(0);
const panStartRange = ref<{ start: number; end: number } | null>(null);

// 滑块拖拽
const sliderDragging = ref<'none' | 'window' | 'left' | 'right'>('none');
const sliderDragStartX = ref(0);
const sliderDragStartRange = ref<{ start: number; end: number } | null>(null);

// 鼠标交互与 Tooltip（趋势图 hover/click 显示选中点位数据）
const mouseX = ref<number | null>(null);
const mouseY = ref<number | null>(null);
const pinnedTimestamp = ref<number | null>(null);

function toLocalDatetimeStr(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

function applyPreset(preset: string) {
  selectedPreset.value = preset;
  const now = new Date();
  startTime.value = toLocalDatetimeStr(new Date(now.getTime() - getPresetMs(preset)));
  endTime.value = toLocalDatetimeStr(now);
}

function getPresetMs(preset: string): number {
  switch (preset) {
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

function formatTime(val?: string): string {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${mo}-${day} ${h}:${mi}:${s}`;
  } catch {
    return val;
  }
}

// ===== 查询 =====
async function queryHistory() {
  if (!props.tagId || !startTime.value || !endTime.value) {
    // 参数不全时重置加载状态（避免 watch 预设的 queryLoading=true 卡住）
    queryLoading.value = false;
    return;
  }

  queryLoading.value = true;
  hasQueried.value = true;
  const queryStartTime = Date.now();
  try {
    const res = await dataQueryApi.queryTrend({
      tagIds: [props.tagId],
      startTime: new Date(startTime.value).toISOString(),
      endTime: new Date(endTime.value).toISOString(),
      maxPoints: 2000,
      projectId: props.projectId,
      interpolation: interpolationMode.value,
      interval: interpolationMode.value !== 'raw' ? interpolationInterval.value : undefined,
    });
    // 响应结构：{ data: [{ tagId, data: [...] }], total } → 提取第一层的 data
    const data = (res as any)?.data ?? (res as any);
    // data = [{ tagId: "...", data: [...] }] | { tagId: "...", data: [...] }
    const pages: any[] = Array.isArray(data) ? data : [data];
    const page = pages.find((p: any) => p?.tagId === props.tagId);
    historyData.value = page?.data || [];
    totalRecordCount.value = (res as any)?.total ?? 0;
    zoomRange.value = null; // 重置缩放
    pinnedTimestamp.value = null; // 重置固定点位
    mouseX.value = null;
    mouseY.value = null;
    if (viewMode.value === 'trend') {
      await nextTick();
      drawTrendChart();
      drawSlider();
    }
  } catch (e: any) {
    showError(e?.message || t('system.tagHistory.queryFailed'));
    historyData.value = [];
    totalRecordCount.value = 0;
  } finally {
    // 确保加载状态至少显示 300ms，避免 API 响应过快导致 loading 闪烁不可见
    const elapsed = Date.now() - queryStartTime;
    const minLoadingMs = 300;
    if (elapsed < minLoadingMs) {
      setTimeout(() => {
        queryLoading.value = false;
      }, minLoadingMs - elapsed);
    } else {
      queryLoading.value = false;
    }
  }
}

// ===== Canvas 趋势图绘制 =====
function getCanvasSize() {
  const canvas = trendCanvasRef.value;
  if (!canvas) return { w: 0, h: 0, dpr: 1 };
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width;
  const h = rect.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  return { w, h, dpr };
}

function drawTrendChart() {
  const canvas = trendCanvasRef.value;
  if (!canvas || historyData.value.length === 0) return;

  const { w, h, dpr } = getCanvasSize();
  if (w === 0 || h === 0) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const data = historyData.value;
  const padding = { top: 16, right: 24, bottom: 40, left: 64 };
  const pw = w - padding.left - padding.right;
  const ph = h - padding.top - padding.bottom;

  // 解析时间戳和值
  const points = data
    .map((d) => ({
      t: new Date(d.timestamp).getTime(),
      v: d.value,
    }))
    .filter((p) => p.v !== null && !isNaN(p.t));

  if (points.length === 0) return;

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;

  // 使用缩放范围
  const zoomMin = zoomRange.value ? zoomRange.value.start : tMin;
  const zoomMax = zoomRange.value ? zoomRange.value.end : tMax;
  const tRange = zoomMax - zoomMin || 1;

  const values = points.map((p) => p.v as number);
  let vMin = Math.min(...values);
  let vMax = Math.max(...values);
  const vRange = vMax - vMin || 1;
  vMin -= vRange * 0.05;
  vMax += vRange * 0.05;

  const toX = (t: number) => padding.left + ((t - zoomMin) / tRange) * pw;
  const toY = (v: number) => padding.top + (1 - (v - vMin) / (vMax - vMin)) * ph;

  // 根据 displayFormat 推断小数位；无格式时按值域自适应
  const fmtDecimals = getDecimalsFromFormat(props.displayFormat);
  function formatAxisValue(v: number): string {
    if (props.displayFormat) return formatTagValue(v, props.displayFormat);
    if (fmtDecimals !== null) return v.toFixed(fmtDecimals);
    // 自适应精度
    const range = vMax - vMin || 1;
    if (range < 0.01) return v.toFixed(6);
    if (range < 1) return v.toFixed(4);
    if (range < 100) return v.toFixed(2);
    return v.toFixed(1);
  }

  // 背景
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--surface') || '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // 网格线
    const gridColor = getComputedStyle(canvas).getPropertyValue('--border') || '#334155';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (i / ySteps) * ph;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // Y 轴标签
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--text-secondary') || '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= ySteps; i++) {
      const v = vMin + ((ySteps - i) / ySteps) * (vMax - vMin);
      const y = padding.top + (i / ySteps) * ph;
      ctx.fillText(formatAxisValue(v), padding.left - 6, y + 3);
    }

    // Y 轴单位标签
    if (props.unit) {
      ctx.save();
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--text-secondary') || '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`(${props.unit})`, 4, padding.top);
      ctx.restore();
    }

    // X 轴标签
    ctx.textAlign = 'center';
    const xSteps = Math.min(6, Math.max(2, Math.floor(pw / 120)));
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    for (let i = 0; i <= xSteps; i++) {
      const t = zoomMin + (i / xSteps) * tRange;
      const x = padding.left + (i / xSteps) * pw;
      const label = dateFormatter.format(new Date(t));
      ctx.fillText(label, x, h - padding.bottom + 16);
      // 网格竖线
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, h - padding.bottom);
      ctx.strokeStyle = gridColor;
      ctx.stroke();
    }

    // 轴线
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--text-secondary') || '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    // 折线
    const primaryColor = getComputedStyle(canvas).getPropertyValue('--primary') || '#2196F3';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = toX(points[i].t);
      const y = toY(points[i].v as number);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

  // 渐变填充
  const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
  gradient.addColorStop(0, primaryColor + '40');
  gradient.addColorStop(1, primaryColor + '00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = toX(points[i].t);
    const y = toY(points[i].v as number);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(toX(points[points.length - 1].t), h - padding.bottom);
  ctx.lineTo(toX(points[0].t), h - padding.bottom);
  ctx.closePath();
  ctx.fill();

  // 数据点（仅在点数较少时）
  if (points.length <= 200) {
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(toX(p.t), toY(p.v as number), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();
    }
  }

  // ===== Tooltip：hover/click 显示选中点位数据 =====
  drawTrendTooltip(ctx, canvas, points, toX, toY, padding, pw, ph, zoomMin, zoomMax, primaryColor);
}

/** 在趋势图上绘制 hover/click tooltip（垂直十字线 + 数据点圆圈 + 浮框） */
function drawTrendTooltip(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  points: { t: number; v: number | null }[],
  toX: (t: number) => number,
  toY: (v: number) => number,
  padding: { top: number; right: number; bottom: number; left: number },
  pw: number,
  ph: number,
  zoomMin: number,
  zoomMax: number,
  primaryColor: string,
) {
  // 优先使用固定时间点；其次使用鼠标位置
  let tooltipTs: number | null = null;
  let tooltipX: number | null = null;
  let isPinned = false;

  if (pinnedTimestamp.value !== null) {
    tooltipTs = pinnedTimestamp.value;
    tooltipX = toX(tooltipTs);
    isPinned = true;
  } else if (mouseX.value !== null && mouseY.value !== null) {
    // mouseX/mouseY 是相对 canvas 左上角的 CSS 像素，与 ctx 当前坐标系一致（已 setTransform(dpr,...)）
    const cssX = mouseX.value;
    const cssY = mouseY.value;
    if (cssX >= padding.left && cssX <= padding.left + pw &&
        cssY >= padding.top && cssY <= padding.top + ph) {
      const tRange = zoomMax - zoomMin || 1;
      tooltipTs = zoomMin + ((cssX - padding.left) / pw) * tRange;
      tooltipX = cssX;
    } else {
      tooltipX = null;
    }
  }

  if (tooltipX === null || tooltipTs === null) return;
  if (points.length === 0) return;

  // 二分查找最近的数据点
  const pts = points;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (pts[mid].t < tooltipTs) lo = mid + 1;
    else hi = mid;
  }
  let best = lo;
  if (lo > 0 && Math.abs(pts[lo - 1].t - tooltipTs) < Math.abs(pts[lo].t - tooltipTs)) {
    best = lo - 1;
  }
  const pt = pts[best];
  if (pt.v === null) return;

  const dotX = toX(pt.t);
  const dotY = toY(pt.v);

  // 垂直十字线
  ctx.save();
  ctx.strokeStyle = isPinned ? primaryColor : (getComputedStyle(canvas).getPropertyValue('--text-secondary') || '#94a3b8');
  ctx.lineWidth = isPinned ? 1.5 : 0.8;
  ctx.setLineDash(isPinned ? [] : [4, 3]);
  ctx.beginPath();
  ctx.moveTo(tooltipX, padding.top);
  ctx.lineTo(tooltipX, padding.top + ph);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 数据点圆圈
  ctx.beginPath();
  ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
  ctx.fillStyle = primaryColor;
  ctx.fill();
  ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--surface') || '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 浮框内容
  const timeLabel = formatTooltipTime(pt.t);
  const valueLabel = formatTagValue(pt.v, props.displayFormat);
  const valueLine = props.unit ? `${valueLabel} ${props.unit}` : valueLabel;
  const tagNameLine = props.tagName || '';

  ctx.font = '11px sans-serif';
  const lineHeight = 16;
  const boxPaddingX = 10;
  const boxPaddingY = 7;
  const headerHeight = lineHeight + 4;
  const bodyHeight = (tagNameLine ? lineHeight : 0) + lineHeight;
  const boxH = boxPaddingY * 2 + headerHeight + bodyHeight;
  const boxW = Math.max(
    160,
    ctx.measureText(timeLabel).width + boxPaddingX * 2,
    ctx.measureText(valueLine).width + boxPaddingX * 2 + (tagNameLine ? 14 : 0),
  );

  // 定位浮框（优先在十字线右侧，空间不足时在左侧）
  let boxX = tooltipX + 12;
  if (boxX + boxW > pw + padding.left) {
    boxX = tooltipX - boxW - 12;
  }
  if (boxX < padding.left) boxX = padding.left + 4;
  const boxY = Math.max(padding.top, Math.min(padding.top + ph - boxH, padding.top + 10));

  // 浮框背景
  ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--surface') || '#0f172a';
  ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--border') || '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  (ctx as any).roundRect?.(boxX, boxY, boxW, boxH, 6) ?? ctx.rect(boxX, boxY, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  // 时间标题
  ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--text') || '#e2e8f0';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(timeLabel, boxX + boxPaddingX, boxY + boxPaddingY);

  // 分隔线
  const sepY = boxY + boxPaddingY + headerHeight;
  ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--border-light') || '#1e293b';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(boxX + boxPaddingX, sepY);
  ctx.lineTo(boxX + boxW - boxPaddingX, sepY);
  ctx.stroke();

  // 标签名 + 值
  let cursorY = sepY + 2;
  ctx.font = '10px sans-serif';
  if (tagNameLine) {
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--text-secondary') || '#94a3b8';
    ctx.fillText(tagNameLine, boxX + boxPaddingX, cursorY);
    cursorY += lineHeight;
  }
  // 颜色方块
  ctx.fillStyle = primaryColor;
  ctx.fillRect(boxX + boxPaddingX, cursorY + 4, 10, 3);
  // 值（右对齐）
  ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--text') || '#e2e8f0';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(valueLine, boxX + boxW - boxPaddingX, cursorY);
  ctx.textAlign = 'left';

  // 固定提示
  if (isPinned) {
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--text-secondary') || '#94a3b8';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('system.tagHistory.clickToUnpin'), boxX + boxW / 2, boxY + boxH - boxPaddingY - lineHeight + 2);
  }
}

/** 格式化 Tooltip 时间 */
function formatTooltipTime(ts: number): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}:${s}`;
}

// ===== dataZoom 功能 =====

/** 获取全量数据时间范围 */
function getFullDataRange(): { start: number; end: number } | null {
  if (historyData.value.length === 0) return null;
  const pts = historyData.value
    .map((d) => new Date(d.timestamp).getTime())
    .filter((t) => !isNaN(t));
  if (pts.length === 0) return null;
  return { start: pts[0], end: pts[pts.length - 1] };
}

/** 绘制 dataZoom 滑块 */
function drawSlider() {
  const canvas = sliderCanvasRef.value;
  if (!canvas || historyData.value.length === 0) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width;
  const h = 40;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const fullRange = getFullDataRange();
  if (!fullRange) return;

  const padding = { top: 4, bottom: 4 };
  const ph = h - padding.top - padding.bottom;

  // 背景
  ctx.fillStyle = 'var(--surface, #1e293b)';
  ctx.fillRect(0, 0, w, h);

  const range = fullRange.end - fullRange.start || 1;
  const toX = (t: number) => ((t - fullRange.start) / range) * w;

  // 解析数据点
  const pts = historyData.value
    .map((d) => ({ t: new Date(d.timestamp).getTime(), v: d.value }))
    .filter((p) => p.v !== null && !isNaN(p.t));

  if (pts.length < 2) return;

  const vals = pts.map((p) => p.v as number);
  const vMin = Math.min(...vals);
  const vMax = Math.max(...vals);
  const vRange = vMax - vMin || 1;

  // 绘制缩略曲线
  const primaryColor = getComputedStyle(canvas).getPropertyValue('--primary') || '#2196F3';
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  const step = Math.max(1, Math.floor(pts.length / w));
  let first = true;
  for (let i = 0; i < pts.length; i += step) {
    const x = toX(pts[i].t);
    const y = padding.top + ph - ((pts[i].v as number - vMin) / vRange) * ph;
    if (first) { ctx.moveTo(x, y); first = false; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 缩放窗口
  const zr = zoomRange.value || fullRange;
  const zLeft = ((zr.start - fullRange.start) / range) * w;
  const zRight = ((zr.end - fullRange.start) / range) * w;

  // 未选中区域遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, zLeft, h);
  ctx.fillRect(zRight, 0, w - zRight, h);

  // 选中区域边框
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(zLeft, padding.top, zRight - zLeft, ph);

  // 手柄
  const handleW = 3;
  ctx.fillStyle = primaryColor;
  ctx.fillRect(zLeft - handleW / 2, padding.top, handleW, ph);
  ctx.fillRect(zRight - handleW / 2, padding.top, handleW, ph);

  // 手柄热区
  ctx.fillStyle = primaryColor;
  ctx.globalAlpha = 0.15;
  ctx.fillRect(zLeft - 4, 0, 8, h);
  ctx.fillRect(zRight - 4, 0, 8, h);
  ctx.globalAlpha = 1;
}

/** 鼠标滚轮缩放 */
function handleChartWheel(e: WheelEvent) {
  const fullRange = getFullDataRange();
  if (!fullRange) return;
  const canvas = trendCanvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const padding = { left: 64, right: 24 };
  const pw = rect.width - padding.left - padding.right;
  const mouseX = e.clientX - rect.left - padding.left;
  const ratio = Math.max(0, Math.min(1, mouseX / pw));

  const zr = zoomRange.value || fullRange;
  const currentSpan = zr.end - zr.start;
  const zoomFactor = e.deltaY < 0 ? 0.8 : 1.25;
  const newSpan = Math.min(
    fullRange.end - fullRange.start,
    Math.max(1000, currentSpan * zoomFactor),
  );
  const center = zr.start + (zr.end - zr.start) * ratio;
  let newStart = center - newSpan * ratio;
  let newEnd = center + newSpan * (1 - ratio);
  if (newStart < fullRange.start) { newStart = fullRange.start; newEnd = newStart + newSpan; }
  if (newEnd > fullRange.end) { newEnd = fullRange.end; newStart = newEnd - newSpan; }
  newStart = Math.max(fullRange.start, newStart);
  newEnd = Math.min(fullRange.end, newEnd);

  zoomRange.value = { start: newStart, end: newEnd };
  drawTrendChart();
  drawSlider();
}

/** 主图表鼠标按下 —— 开始拖拽平移 */
function handleChartMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  const fullRange = getFullDataRange();
  if (!fullRange) return;
  isPanning.value = true;
  panStartX.value = e.clientX;
  panStartRange.value = zoomRange.value ? { ...zoomRange.value } : { ...fullRange };
  // 平移期间隐藏 hover tooltip，避免视觉抖动
  mouseX.value = null;
  mouseY.value = null;
  e.preventDefault();
}

/** 主图表鼠标移动 —— 更新 Tooltip 位置 */
function handleChartMouseMove(e: MouseEvent) {
  if (isPanning.value) return;
  const canvas = trendCanvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouseX.value = e.clientX - rect.left;
  mouseY.value = e.clientY - rect.top;
  drawTrendChart();
}

/** 鼠标离开图表 —— 清除 hover Tooltip（保留 pinned） */
function handleChartMouseLeave() {
  if (mouseX.value === null && mouseY.value === null) return;
  mouseX.value = null;
  mouseY.value = null;
  drawTrendChart();
}

/** 点击图表 —— 固定/取消固定 Tooltip */
function handleChartClick(e: MouseEvent) {
  if (isPanning.value) return;
  const canvas = trendCanvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const padding = { left: 64, right: 24 };
  const pw = rect.width - padding.left - padding.right;
  const clickX = e.clientX - rect.left - padding.left;
  if (clickX < 0 || clickX > pw) return;

  const fullRange = getFullDataRange();
  if (!fullRange) return;
  const xMin = zoomRange.value ? zoomRange.value.start : fullRange.start;
  const xMax = zoomRange.value ? zoomRange.value.end : fullRange.end;
  const xRange = xMax - xMin || 1;
  const ts = xMin + (clickX / pw) * xRange;

  // Toggle pin
  pinnedTimestamp.value = pinnedTimestamp.value !== null ? null : ts;
  // 固定后清除 hover 状态，由 pinned 接管显示
  mouseX.value = null;
  mouseY.value = null;
  drawTrendChart();
}

/** 全局鼠标移动 */
function handleGlobalMouseMove(e: MouseEvent) {
  if (isPanning.value && panStartRange.value) {
    const canvas = trendCanvasRef.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padding = { left: 64, right: 24 };
    const pw = rect.width - padding.left - padding.right;
    const fullRange = getFullDataRange();
    if (!fullRange) return;
    const dx = e.clientX - panStartX.value;
    const timeDelta = -(dx / pw) * (panStartRange.value.end - panStartRange.value.start);
    let newStart = panStartRange.value.start + timeDelta;
    let newEnd = panStartRange.value.end + timeDelta;
    if (newStart < fullRange.start) { newEnd += fullRange.start - newStart; newStart = fullRange.start; }
    if (newEnd > fullRange.end) { newStart -= newEnd - fullRange.end; newEnd = fullRange.end; }
    newStart = Math.max(fullRange.start, newStart);
    newEnd = Math.min(fullRange.end, newEnd);
    zoomRange.value = { start: newStart, end: newEnd };
    drawTrendChart();
    drawSlider();
    return;
  }

  if (sliderDragging.value !== 'none' && sliderDragStartRange.value) {
    const canvas = sliderCanvasRef.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pw = rect.width;
    const fullRange = getFullDataRange();
    if (!fullRange) return;
    const fullSpan = fullRange.end - fullRange.start;
    const dx = e.clientX - sliderDragStartX.value;
    const timeDelta = (dx / pw) * fullSpan;

    const sr = sliderDragStartRange.value;
    if (sliderDragging.value === 'window') {
      let ns = sr.start + timeDelta;
      let ne = sr.end + timeDelta;
      if (ns < fullRange.start) { ne += fullRange.start - ns; ns = fullRange.start; }
      if (ne > fullRange.end) { ns -= ne - fullRange.end; ne = fullRange.end; }
      zoomRange.value = { start: ns, end: ne };
    } else if (sliderDragging.value === 'left') {
      zoomRange.value = {
        start: Math.max(fullRange.start, Math.min(sr.end - 1000, sr.start + timeDelta)),
        end: sr.end,
      };
    } else if (sliderDragging.value === 'right') {
      zoomRange.value = {
        start: sr.start,
        end: Math.min(fullRange.end, Math.max(sr.start + 1000, sr.end + timeDelta)),
      };
    }
    drawTrendChart();
    drawSlider();
    return;
  }
}

function handleGlobalMouseUp(_e: MouseEvent) {
  isPanning.value = false;
  sliderDragging.value = 'none';
}

/** 滑块鼠标按下 */
function handleSliderMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  const fullRange = getFullDataRange();
  if (!fullRange) return;
  const canvas = sliderCanvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pw = rect.width;
  const fullSpan = fullRange.end - fullRange.start;
  const toTime = (px: number) => fullRange.start + (px / pw) * fullSpan;

  const zr = zoomRange.value || fullRange;
  const zLeft = ((zr.start - fullRange.start) / fullSpan) * pw;
  const zRight = ((zr.end - fullRange.start) / fullSpan) * pw;
  const handleHitWidth = 8;

  if (Math.abs(x - zLeft) < handleHitWidth) {
    sliderDragging.value = 'left';
  } else if (Math.abs(x - zRight) < handleHitWidth) {
    sliderDragging.value = 'right';
  } else if (x >= zLeft - 2 && x <= zRight + 2) {
    sliderDragging.value = 'window';
  } else {
    const span = zr.end - zr.start;
    const half = span / 2;
    let center = toTime(x);
    let ns = center - half;
    let ne = center + half;
    if (ns < fullRange.start) { ns = fullRange.start; ne = ns + span; }
    if (ne > fullRange.end) { ne = fullRange.end; ns = ne - span; }
    zoomRange.value = { start: ns, end: ne };
    drawTrendChart();
    drawSlider();
    return;
  }

  sliderDragStartX.value = e.clientX;
  sliderDragStartRange.value = { ...zr };
  e.preventDefault();
}

// 监听视图切换重新绘制
watch(viewMode, async (mode) => {
  // 切换视图时清理 tooltip 状态
  pinnedTimestamp.value = null;
  mouseX.value = null;
  mouseY.value = null;
  if (mode === 'trend' && historyData.value.length > 0) {
    await nextTick();
    drawTrendChart();
    drawSlider();
  }
});

// ===== 导出 CSV =====
function generateCsv(): string {
  const valueHeader = props.unit
    ? `${t('system.tagHistory.csvHeaderValue')} (${props.unit})`
    : t('system.tagHistory.csvHeaderValue');
  const header = `${t('system.tagHistory.csvHeaderTimestamp')},${valueHeader}`;
  const rows = historyData.value.map((d) => {
    const ts = d.timestamp ? new Date(d.timestamp).toISOString() : '';
    // 与列表显示保持一致：按 displayFormat 格式化；空值留空
    const v = (d.value === null || d.value === undefined)
      ? ''
      : formatTagValue(d.value, props.displayFormat);
    return `${ts},${v}`;
  });
  return [header, ...rows].join('\n');
}

async function exportAsCsv() {
  exportLoading.value = true;
  try {
    const csv = generateCsv();
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.tagName}_${startTime.value}_${endTime.value}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess(t('system.tagHistory.exportSuccess'));
  } catch {
    showError(t('system.tagHistory.exportFailed'));
  } finally {
    exportLoading.value = false;
  }
}

// ===== 保存图片 =====
function saveAsImage() {
  const canvas = trendCanvasRef.value;
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `${props.tagName}_${startTime.value}_${endTime.value}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ===== 缩放重置 =====
function resetZoom() {
  zoomRange.value = null;
  drawTrendChart();
  drawSlider();
}

// ===== 关闭 =====
function handleClose() {
  emit('update:visible', false);
}

// 打开弹窗时自动应用默认预设并查询一次
watch(
  () => props.visible,
  (val) => {
    if (val) {
      viewMode.value = 'trend';
      hasQueried.value = false;
      historyData.value = [];
      totalRecordCount.value = 0;
      zoomRange.value = null;
      pinnedTimestamp.value = null;
      mouseX.value = null;
      mouseY.value = null;
      applyPreset('1h');
      // 立即显示加载状态，避免弹窗打开后到 queryHistory 执行前的空白
      queryLoading.value = true;
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      // 直接调用（不包 nextTick）：queryHistory 内部的 await 会让出事件循环，
      // Vue 得以在 API 响应前完成重渲染，确保 loading 区域可见
      queryHistory();
    } else {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  },
);

// Canvas ResizeObserver
watch(
  () => viewMode.value === 'trend' && historyData.value.length > 0,
  (shouldObserve) => {
    if (shouldObserve) {
      nextTick(() => {
        const canvas = trendCanvasRef.value;
        if (canvas && !resizeObserver) {
          resizeObserver = new ResizeObserver(() => drawTrendChart());
          resizeObserver.observe(canvas.parentElement!);
        }
        const sliderCanvas = sliderCanvasRef.value;
        if (sliderCanvas && !sliderResizeObserver) {
          sliderResizeObserver = new ResizeObserver(() => drawSlider());
          sliderResizeObserver.observe(sliderCanvas.parentElement!);
        }
      });
    } else {
      resizeObserver?.disconnect();
      resizeObserver = null;
      sliderResizeObserver?.disconnect();
      sliderResizeObserver = null;
    }
  },
);

onUnmounted(() => {
  resizeObserver?.disconnect();
  sliderResizeObserver?.disconnect();
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleGlobalMouseUp);
});
</script>

<style scoped>
/* ===== 遮罩 ===== */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(3px);
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ===== 容器 ===== */
.dialog-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 800px;
  max-width: 94vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.35);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* ===== 头部 ===== */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.header-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* 视图切换 */
.view-toggle {
  display: flex;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.view-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.view-toggle-btn:hover {
  color: var(--text);
}

.view-toggle-btn.active {
  background: var(--primary);
  color: var(--button-text);
}

.dialog-close {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.dialog-close:hover {
  color: var(--text);
  border-color: var(--text-secondary);
  background: var(--hover);
}

/* ===== 标签信息条 ===== */
.tag-info-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 20px;
  background: var(--background);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.tag-info-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.chip-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.chip-value {
  font-size: 12px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 7%, transparent);
  padding: 2px 8px;
  border-radius: 4px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mono-sm {
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.tag-info-divider {
  width: 1px;
  height: 16px;
  background: var(--border);
  flex-shrink: 0;
}

/* ===== 查询工具栏（时间范围 + 查询方式 + 间隔 + 查询按钮，整合为一行） ===== */
.query-toolbar {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

/* 查询按钮靠右对齐 */
.query-toolbar .query-btn {
  margin-left: auto;
}

.preset-row {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.preset-chip {
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.preset-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 4%, transparent);
}

.preset-chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--button-text);
}

.range-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px;
  transition: border-color 0.15s;
}

.range-bar:focus-within {
  border-color: var(--primary);
}

.range-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.range-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-left: 4px;
}

.range-datetime-input {
  flex: 1;
  padding: 6px 2px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-family: 'Courier New', monospace;
  outline: none;
  min-width: 0;
}

.range-datetime-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.range-datetime-input::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}

.range-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.query-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: var(--button-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  white-space: nowrap;
}

.query-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent);
}

.query-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 插值方式（已整合到查询工具栏） ===== */
.interp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.interp-field label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-select {
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 20px;
  padding-right: 28px;
}

.form-select option {
  background: var(--background);
  color: var(--text);
}

.form-select:focus { border-color: var(--primary); }

.spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== 内容区 ===== */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.data-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.record-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.toolbar-actions {
  display: flex;
  gap: 6px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.tool-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 加载 / 空状态 ===== */
.loading-area,
.empty-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 52px 20px;
  gap: 14px;
  flex: 1;
}

.empty-icon {
  color: var(--text-secondary);
  opacity: 0.5;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

/* ===== 趋势图视图 ===== */
.trend-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.trend-chart-area {
  flex: 1;
  min-height: 0;
  padding: 12px 12px 0 12px;
  display: flex;
  cursor: grab;
}

.trend-chart-area:hover {
  cursor: crosshair;
}

.trend-chart-area:active {
  cursor: grabbing;
}

.trend-canvas {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
}

/* dataZoom 滑块 */
.datazoom-slider {
  flex-shrink: 0;
  height: 44px;
  padding: 0 12px 8px 12px;
  cursor: pointer;
}

.slider-canvas {
  width: 100%;
  height: 36px;
  border-radius: 4px;
}

/* ===== 表格视图 ===== */
.table-view {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.data-table-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 16px;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.history-table th {
  text-align: left;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}

.history-table tbody tr {
  transition: background 0.1s;
}

.history-table td {
  padding: 8px 12px;
  color: var(--text);
  border-bottom: 1px solid var(--border-light);
}

.history-table tbody tr:hover {
  background: var(--hover);
}

.num-col {
  text-align: right;
}

.mono {
  font-family: 'Courier New', monospace;
}

.td-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.idx-col {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
}

.value-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  font-family: 'Courier New', monospace;
}

.value-badge.is-null {
  color: var(--text-secondary);
  background: transparent;
  font-weight: 400;
  font-style: italic;
}

.value-unit {
  font-weight: 500;
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: 2px;
}

.th-unit {
  font-weight: 400;
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: none;
  letter-spacing: normal;
}
</style>