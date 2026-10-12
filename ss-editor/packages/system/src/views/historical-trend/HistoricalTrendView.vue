<template>
  <div class="historical-trend-page">
    <!-- 工具栏：按操作流分组 -->
    <div class="query-bar">
      <!-- ── 数据源 ── -->
      <div class="query-field">
        <label>{{ $t('system.historicalTrend.project') }}</label>
        <select
          v-model="selectedProjectId"
          class="project-select"
          @change="onProjectChange"
        >
          <option value="">
            {{ $t('system.historicalTrend.selectProject') }}
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

      <div class="query-field">
        <label>{{ $t('system.historicalTrend.device') }}</label>
        <select
          v-model="selectedDeviceId"
          class="form-select"
          :disabled="!selectedProjectId"
          @change="onDeviceChange"
        >
          <option value="">
            {{ $t('system.historicalTrend.selectDevice') }}
          </option>
          <option
            v-for="d in devices"
            :key="d.id"
            :value="d.id"
          >
            {{ d.deviceName }}
          </option>
        </select>
      </div>

      <div class="query-field">
        <label>{{ $t('system.historicalTrend.tags') }}</label>
        <div class="tag-select-wrapper">
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            :disabled="!selectedDeviceId"
            @click="showTagPicker = !showTagPicker"
          >
            {{ selectedTagIds.length ? $t('system.historicalTrend.tagsSelected', { n: selectedTagIds.length }) : $t('system.historicalTrend.selectTags') }}
          </button>
          <div
            v-if="showTagPicker"
            class="tag-picker-dropdown"
          >
            <div class="tag-picker-header">
              <label>
                <input
                  type="checkbox"
                  :checked="allTagsSelected"
                  @change="toggleAllTags"
                >
                {{ $t('system.historicalTrend.selectAll') }}
              </label>
              <input
                v-model="tagSearch"
                class="form-input tag-search-input"
                :placeholder="$t('system.historicalTrend.searchTag')"
              >
            </div>
            <div class="tag-picker-list">
              <label
                v-for="tag in filteredTags"
                :key="tag.id"
                class="tag-option"
              >
                <input
                  type="checkbox"
                  :value="tag.id"
                  :checked="selectedTagIds.includes(tag.id)"
                  @change="toggleTag(tag.id)"
                >
                <span class="tag-name">{{ tag.name }}</span>
                <span class="tag-address">{{ tag.address }}</span>
              </label>
              <div
                v-if="!filteredTags.length"
                class="tag-empty"
              >
                {{ $t('system.historicalTrend.noTags') }}
              </div>
            </div>
            <div class="tag-picker-footer">
              <button
                class="sys-btn sys-btn-primary sys-btn-sm"
                @click="showTagPicker = false"
              >
                {{ $t('system.historicalTrend.done') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="query-separator" />

      <!-- ── 查询参数 ── -->
      <div class="query-field">
        <label>{{ $t('system.historicalTrend.timeRange') }}</label>
        <TimeRangePicker
          v-model="dateRange"
          mode="datetime"
          :presets="timePresets"
          size="sm"
        />
      </div>

      <div class="query-field">
        <label>{{ $t('system.historicalTrend.queryMethod') }}</label>
        <select
          v-model="interpolationMode"
          class="form-select"
        >
          <option value="raw">
            {{ $t('system.historicalTrend.rawValue') }}
          </option>
          <option value="linear">
            {{ $t('system.historicalTrend.linearInterp') }}
          </option>
          <option value="step">
            {{ $t('system.historicalTrend.stepInterp') }}
          </option>
        </select>
      </div>

      <div
        v-if="interpolationMode !== 'raw'"
        class="query-field"
      >
        <label>{{ $t('system.historicalTrend.interval') }}</label>
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

      <div class="query-field query-actions">
        <button
          class="sys-btn sys-btn-primary sys-btn-sm"
          :disabled="!canQuery"
          @click="queryTrendData"
        >
          {{ queryLoading ? $t('system.historicalTrend.querying') : $t('system.historicalTrend.query') }}
        </button>
      </div>

      <div class="query-separator" />

      <!-- ── 方案管理 ── -->
      <div class="query-field">
        <label>{{ $t('system.historicalTrend.schemes') }}</label>
        <select
          v-model="selectedSchemeId"
          class="form-select"
          :disabled="!selectedProjectId"
          @change="onSchemeChange"
        >
          <option value="">
            {{ $t('system.historicalTrend.selectScheme') }}
          </option>
          <option
            v-for="s in schemes"
            :key="s.id"
            :value="s.id"
          >
            {{ s.name }}
          </option>
        </select>
      </div>

      <div class="query-field query-actions">
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          :disabled="!selectedProjectId"
          :title="$t('system.historicalTrend.saveScheme')"
          @click="showSaveDialog = true"
        >
          {{ $t('system.historicalTrend.saveScheme') }}
        </button>
      </div>

      <div
        v-if="selectedSchemeId"
        class="query-field query-actions"
      >
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          :title="$t('system.historicalTrend.deleteScheme')"
          @click="deleteScheme"
        >
          {{ $t('system.historicalTrend.deleteScheme') }}
        </button>
      </div>
    </div>

    <!-- 保存方案弹框 -->
    <div
      v-if="showSaveDialog"
      class="modal-overlay"
      @click.self="showSaveDialog = false"
    >
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">{{ $t('system.historicalTrend.saveSchemeTitle') }}</span>
          <button
            class="modal-close"
            @click="showSaveDialog = false"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <label class="modal-label">{{ $t('system.historicalTrend.schemeName') }}</label>
          <input
            v-model="schemeName"
            class="form-input modal-input"
            :placeholder="$t('system.historicalTrend.schemeNamePlaceholder')"
            @keyup.enter="saveScheme"
          >
        </div>
        <div class="modal-footer">
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="showSaveDialog = false"
          >
            {{ $t('system.historicalTrend.cancel') }}
          </button>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            :disabled="!schemeName.trim()"
            @click="saveScheme"
          >
            {{ $t('system.historicalTrend.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div
      v-if="chartSeries.length"
      class="legend-bar"
    >
      <span
        v-for="(s, i) in chartSeries"
        :key="s.tagId"
        class="legend-item"
        :class="{ active: visibleSeries.has(s.tagId) }"
        @click="toggleSeries(s.tagId)"
      >
        <span
          class="legend-color"
          :style="{ background: getSeriesColor(i) }"
        />
        {{ s.tagName }}
      </span>
      <span class="record-count">{{ $t('system.historicalTrend.recordCount', { n: totalRecordCount }) }}</span>
    </div>

    <!-- 图表 -->
    <div class="chart-wrapper">
      <div
        class="chart-container"
        @wheel.prevent="handleChartWheel"
        @mousedown="handleChartMouseDown"
        @mousemove="handleChartMouseMove"
        @mouseleave="handleChartMouseLeave"
        @click="handleChartClick"
      >
        <SsLoading
          v-if="queryLoading"
          :text="$t('system.historicalTrend.loading')"
          size="medium"
        />
        <div
          v-else-if="!chartSeries.length"
          class="chart-empty"
        >
          {{ $t('system.historicalTrend.noData') }}
        </div>
        <canvas
          v-show="chartSeries.length"
          ref="chartCanvas"
          class="chart-canvas"
        />
      </div>
      <!-- dataZoom 时间线滑块 -->
      <div
        v-if="chartSeries.length"
        class="datazoom-slider"
      >
        <canvas
          ref="sliderCanvas"
          class="slider-canvas"
          @mousedown="handleSliderMouseDown"
        />
        <button
          class="zoom-reset-btn"
          :title="$t('system.historicalTrend.resetZoom')"
          @click="resetZoom"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line
              x1="21"
              y1="3"
              x2="14"
              y2="10"
            />
            <line
              x1="3"
              y1="21"
              x2="10"
              y2="14"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { deviceApi, dataQueryApi, trendQuerySchemeApi } from '../../api/modules';
import { useProjectStore } from '../../stores';
import type { TrendQueryScheme } from '../../api/modules/trend-query-scheme.api';
import { SsLoading, TimeRangePicker } from '@scada-editor/shared';
import type { TimeRange } from '@scada-editor/shared';
import { showError, showConfirm, showSuccess } from '../../utils/messageBox';

const { t } = useI18n();
const projectStore = useProjectStore();

// 项目
const selectedProjectId = ref('');

// 设备
interface DeviceInfo { id: string; deviceName: string; }
const devices = ref<DeviceInfo[]>([]);
const selectedDeviceId = ref('');

// 标签
const tagSearch = ref('');
const showTagPicker = ref(false);
const selectedTagIds = ref<string[]>([]);
interface TagInfo {
  id: string;
  name: string;
  address: string;
}
const allTags = ref<TagInfo[]>([]);
const filteredTags = computed(() => {
  if (!tagSearch.value) return allTags.value;
  const s = tagSearch.value.toLowerCase();
  return allTags.value.filter((t) => t.name.toLowerCase().includes(s) || t.address.toLowerCase().includes(s));
});
const allTagsSelected = computed(() =>
  allTags.value.length > 0 && selectedTagIds.value.length === allTags.value.length,
);

// 时间
const presetRange = ref('1h');
const startTime = ref('');
const endTime = ref('');

// 时间范围选择器预设
const timePresets = computed(() => [
  { label: t('system.historicalTrend.last1h'), value: '1h' },
  { label: t('system.historicalTrend.last6h'), value: '6h' },
  { label: t('system.historicalTrend.last24h'), value: '24h' },
  { label: t('system.historicalTrend.last7d'), value: '7d' },
]);

// 双向绑定到 TimeRangePicker
const dateRange = computed<TimeRange>({
  get: () => ({ start: startTime.value, end: endTime.value }),
  set: (val: TimeRange) => {
    startTime.value = val.start;
    endTime.value = val.end;
    presetRange.value = '';
  },
});

// 查询
const queryLoading = ref(false);
const chartSeries = ref<Array<{ tagId: string; tagName: string; data: Array<{ timestamp: number; value: number }> }>>([]);
const visibleSeries = ref<Set<string>>(new Set());
const totalRecordCount = ref(0);

// 插值
const interpolationMode = ref<'raw' | 'linear' | 'step'>('raw');
const interpolationInterval = ref(1000);

// 方案保存
const showSaveDialog = ref(false);
const schemeName = ref('');
const schemes = ref<TrendQueryScheme[]>([]);
const selectedSchemeId = ref('');

const canQuery = computed(() => selectedProjectId.value && selectedDeviceId.value && selectedTagIds.value.length > 0 && startTime.value && endTime.value);

/** 从 CSS 变量读取图表色板，支持主题切换 */
function getSeriesColor(index: number): string {
  const el = chartCanvas.value || document.documentElement;
  const style = getComputedStyle(el);
  const varName = `--chart-${(index % 8) + 1}`;
  return style.getPropertyValue(varName).trim() || '#3b82f6';
}

// Canvas
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const sliderCanvas = ref<HTMLCanvasElement | null>(null);
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

// 鼠标交互与Tooltip
const mouseX = ref<number | null>(null);
const mouseY = ref<number | null>(null);
const pinnedTimestamp = ref<number | null>(null);

onMounted(async () => {
  try {
    await projectStore.fetchProjects();
  } catch (err: any) {
    if (import.meta.env.DEV) console.warn('[HistoricalTrend] loadProjects failed:', err);
    showError(t('system.historicalTrend.loadProjectsFailed'));
  }
  applyPresetRange();
  resizeObserver = new ResizeObserver(() => drawChart());
  if (chartCanvas.value) resizeObserver.observe(chartCanvas.value);
  sliderResizeObserver = new ResizeObserver(() => drawSlider());
  if (sliderCanvas.value) sliderResizeObserver.observe(sliderCanvas.value);
  // 全局鼠标事件
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  sliderResizeObserver?.disconnect();
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleGlobalMouseUp);
});

function onProjectChange() {
  selectedDeviceId.value = '';
  devices.value = [];
  selectedTagIds.value = [];
  allTags.value = [];
  chartSeries.value = [];
  selectedSchemeId.value = '';
  schemes.value = [];
  if (selectedProjectId.value) {
    loadDevices();
    loadSchemes();
  }
}

async function loadDevices() {
  try {
    const res = await deviceApi.list(selectedProjectId.value, { page: 1, pageSize: 100 });
    const data = (res as any)?.data ?? (res as any);
    const items = Array.isArray(data) ? data : (data?.items ?? []);
    devices.value = items.map((d: any) => ({ id: d.id, deviceName: d.deviceName }));
  } catch (err: any) {
    devices.value = [];
    if (import.meta.env.DEV) console.warn('[HistoricalTrend] loadDevices failed:', err);
    showError(t('system.historicalTrend.loadDevicesFailed'));
  }
}

async function onDeviceChange() {
  selectedTagIds.value = [];
  allTags.value = [];
  chartSeries.value = [];
  if (selectedDeviceId.value) loadTagsForDevice();
}

async function loadTagsForDevice() {
  if (!selectedProjectId.value || !selectedDeviceId.value) return;
  try {
    const res = await deviceApi.getById(selectedProjectId.value, selectedDeviceId.value);
    const device = (res as any)?.data ?? (res as any);
    const tags: TagInfo[] = [];
    if (device?.tags) {
      for (const tag of device.tags) {
        tags.push({ id: tag.id, name: tag.name, address: tag.address || '' });
      }
    }
    allTags.value = tags;
  } catch (err: any) {
    allTags.value = [];
    if (import.meta.env.DEV) console.warn('[HistoricalTrend] loadTags failed:', err);
    showError(t('system.historicalTrend.loadTagsFailed'));
  }
}

function toggleTag(id: string) {
  const idx = selectedTagIds.value.indexOf(id);
  if (idx >= 0) { selectedTagIds.value.splice(idx, 1); }
  else { selectedTagIds.value.push(id); }
}

function toggleAllTags() {
  if (allTagsSelected.value) { selectedTagIds.value = []; }
  else { selectedTagIds.value = allTags.value.map((t) => t.id); }
}

function applyPresetRange() {
  const now = new Date();
  endTime.value = toLocalDatetime(now);
  switch (presetRange.value) {
    case '1h': startTime.value = toLocalDatetime(new Date(now.getTime() - 3600000)); break;
    case '6h': startTime.value = toLocalDatetime(new Date(now.getTime() - 21600000)); break;
    case '24h': startTime.value = toLocalDatetime(new Date(now.getTime() - 86400000)); break;
    case '7d': startTime.value = toLocalDatetime(new Date(now.getTime() - 604800000)); break;
  }
}

function toLocalDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function queryTrendData() {
  if (!canQuery.value) return;
  queryLoading.value = true;
  try {
    const res = await dataQueryApi.queryTrend({
      tagIds: selectedTagIds.value,
      startTime: new Date(startTime.value).toISOString(),
      endTime: new Date(endTime.value).toISOString(),
      maxPoints: 2000,
      projectId: selectedProjectId.value,
      interpolation: interpolationMode.value,
      interval: interpolationMode.value !== 'raw' ? interpolationInterval.value : undefined,
    });
    const data = (res as any)?.data ?? (res as any);
    const pages: Array<{ tagId: string; data: Array<{ timestamp: string; value: number | null }> }> =
      data?.data ?? (Array.isArray(data) ? data : [data]).filter(Boolean);
    totalRecordCount.value = (res as any)?.total ?? data?.total ?? 0;

    chartSeries.value = pages.map((p: any) => {
      const tag = allTags.value.find((t) => t.id === p.tagId);
      return {
        tagId: p.tagId,
        tagName: tag?.name || p.tagId,
        data: (p.data || []).map((d: any) => ({
          timestamp: new Date(d.timestamp).getTime(),
          value: d.value,
        })),
      };
    }).filter((s: any) => s.data.length > 0);

    visibleSeries.value = new Set(chartSeries.value.map((s) => s.tagId));
    zoomRange.value = null; // 重置缩放为全量范围
    await nextTick();
    drawChart();
    drawSlider();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.historicalTrend.queryFailed'));
    }
  } finally { queryLoading.value = false; }
}

// ────────── 方案保存/加载 ──────────

async function loadSchemes() {
  if (!selectedProjectId.value) return;
  try {
    schemes.value = await trendQuerySchemeApi.list(selectedProjectId.value);
  } catch (err: any) {
    schemes.value = [];
    if (import.meta.env.DEV) console.warn('[HistoricalTrend] loadSchemes failed:', err);
  }
}

async function saveScheme() {
  const name = schemeName.value.trim();
  if (!name || !selectedProjectId.value || !selectedDeviceId.value) return;

  try {
    const scheme = await trendQuerySchemeApi.create({
      name,
      projectId: selectedProjectId.value,
      deviceId: selectedDeviceId.value,
      tagIds: selectedTagIds.value,
      startTime: startTime.value ? new Date(startTime.value).toISOString() : undefined,
      endTime: endTime.value ? new Date(endTime.value).toISOString() : undefined,
      interpolationMode: interpolationMode.value,
      interpolationInterval: interpolationInterval.value,
      presetRange: presetRange.value || undefined,
    });
    showSaveDialog.value = false;
    schemeName.value = '';
    await loadSchemes();
    selectedSchemeId.value = scheme.id;
    showSuccess(t('system.historicalTrend.schemeSaved'));
  } catch (err: any) {
    showError(err?.response?.data?.message || err?.message || t('system.historicalTrend.schemeSaveFailed'));
  }
}

async function onSchemeChange() {
  if (!selectedSchemeId.value) return;
  const scheme = schemes.value.find((s) => s.id === selectedSchemeId.value);
  if (!scheme) return;

  // 回填参数
  if (scheme.deviceId !== selectedDeviceId.value) {
    selectedDeviceId.value = scheme.deviceId;
    await onDeviceChange();
  }
  try {
    selectedTagIds.value = JSON.parse(scheme.tagIds);
  } catch {
    selectedTagIds.value = [];
  }
  if (scheme.startTime) startTime.value = toLocalDatetime(new Date(scheme.startTime));
  if (scheme.endTime) endTime.value = toLocalDatetime(new Date(scheme.endTime));
  interpolationMode.value = (scheme.interpolationMode as 'raw' | 'linear' | 'step') || 'raw';
  interpolationInterval.value = scheme.interpolationInterval ?? 1000;
  if (scheme.presetRange) presetRange.value = scheme.presetRange;
}

async function deleteScheme() {
  if (!selectedSchemeId.value) return;
  const confirmed = await showConfirm(t('system.historicalTrend.confirmDeleteScheme'));
  if (!confirmed) return;

  try {
    await trendQuerySchemeApi.delete(selectedSchemeId.value);
    selectedSchemeId.value = '';
    await loadSchemes();
    showSuccess(t('system.historicalTrend.schemeDeleted'));
  } catch (err: any) {
    showError(err?.response?.data?.message || err?.message || t('system.historicalTrend.schemeDeleteFailed'));
  }
}

function toggleSeries(tagId: string) {
  const next = new Set(visibleSeries.value);
  if (next.has(tagId)) { next.delete(tagId); }
  else { next.add(tagId); }
  visibleSeries.value = next;
  drawChart();
  drawSlider();
}

function drawChart() {
  const canvas = chartCanvas.value;
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = (rect.height || 400) + 'px';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const pw = w - margin.left - margin.right;
  const ph = h - margin.top - margin.bottom;

  ctx.clearRect(0, 0, w, h);

  const visibleData = chartSeries.value.filter((s) => visibleSeries.value.has(s.tagId));
  if (!visibleData.length) return;

  // 计算全量数据范围（用于 Y 轴稳定）
  let fullXMin = Infinity, fullXMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const s of visibleData) {
    for (const d of s.data) {
      if (d.timestamp < fullXMin) fullXMin = d.timestamp;
      if (d.timestamp > fullXMax) fullXMax = d.timestamp;
      if (d.value < yMin) yMin = d.value;
      if (d.value > yMax) yMax = d.value;
    }
  }
  if (!isFinite(fullXMin) || !isFinite(yMin)) return;

  // 使用缩放范围，否则使用全量范围
  const xMin = zoomRange.value ? zoomRange.value.start : fullXMin;
  const xMax = zoomRange.value ? zoomRange.value.end : fullXMax;
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const yPadding = yRange * 0.05;
  const yDrawMin = yMin - yPadding;
  const yDrawMax = yMax + yPadding;
  const yDrawRange = yDrawMax - yDrawMin;

  const toX = (t: number) => margin.left + ((t - xMin) / xRange) * pw;
  const toY = (v: number) => margin.top + ph - ((v - yDrawMin) / yDrawRange) * ph;

  // 网格线
  ctx.strokeStyle = 'var(--border, rgba(255,255,255,0.08))';
  ctx.lineWidth = 0.5;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = margin.top + (ph / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(w - margin.right, y);
    ctx.stroke();

    const val = yDrawMin + ((ph - (y - margin.top)) / ph) * yDrawRange;
    ctx.fillStyle = 'var(--text-secondary, #94a3b8)';
    ctx.font = `${10 * dpr}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const label = Number.isInteger(val) ? val.toString() : val.toFixed(1);
    ctx.fillText(label, margin.left - 8, y);
  }

  // 曲线
  for (let si = 0; si < visibleData.length; si++) {
    const s = visibleData[si];
    const points = s.data;
    if (points.length < 2) continue;

    const color = getSeriesColor(si);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();

    for (let i = 0; i < points.length; i++) {
      const x = toX(points[i].timestamp);
      const y = toY(points[i].value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // ===== 计算Tooltip时间位置 =====
  let tooltipTs: number | null = null;
  let tooltipX: number | null = null;
  let isPinned = false;

  // 优先使用固定时间点
  if (pinnedTimestamp.value !== null) {
    tooltipTs = pinnedTimestamp.value;
    tooltipX = toX(tooltipTs);
    isPinned = true;
  } else if (mouseX.value !== null && mouseY.value !== null) {
    // 鼠标位置转换为时间
    const canvasMouseX = mouseX.value * dpr;
    tooltipX = canvasMouseX;
    // 仅当鼠标在绘图区域时显示
    if (canvasMouseX >= margin.left && canvasMouseX <= margin.left + pw &&
        mouseY.value * dpr >= margin.top && mouseY.value * dpr <= margin.top + ph) {
      tooltipTs = xMin + ((canvasMouseX - margin.left) / pw) * xRange;
    } else {
      tooltipX = null;
    }
  }

  // ===== 绘制Tooltip =====
  if (tooltipX !== null && tooltipTs !== null) {
    const lineX = tooltipX;

    // 垂直十字线
    ctx.save();
    ctx.strokeStyle = isPinned ? 'var(--primary, #3b82f6)' : 'var(--text-secondary, #94a3b8)';
    ctx.lineWidth = isPinned ? 1.5 * dpr : 0.8 * dpr;
    ctx.setLineDash(isPinned ? [] : [4 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.moveTo(lineX, margin.top);
    ctx.lineTo(lineX, margin.top + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 各条曲线在tooltipTs处的数据点
    interface TooltipEntry { tagName: string; value: number | null; color: string; }
    const entries: TooltipEntry[] = [];

    for (let si = 0; si < visibleData.length; si++) {
      const s = visibleData[si];
      const pts = s.data;
      if (pts.length === 0) continue;

      // 二分查找最近的数据点
      let lo = 0, hi = pts.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (pts[mid].timestamp < tooltipTs) lo = mid + 1;
        else hi = mid;
      }
      // 比较 lo 和 lo-1 哪个更近
      let best = lo;
      if (lo > 0 && Math.abs(pts[lo - 1].timestamp - tooltipTs) < Math.abs(pts[lo].timestamp - tooltipTs)) {
        best = lo - 1;
      }
      const pt = pts[best];
      const color = getSeriesColor(si);

      // 绘制数据点圆圈
      const dotX = toX(pt.timestamp);
      const dotY = toY(pt.value);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'var(--surface, #fff)';
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();

      entries.push({
        tagName: s.tagName,
        value: pt.value,
        color,
      });
    }

    // 绘制Tooltip浮框
    if (entries.length > 0) {
      const timeLabel = formatTooltipTime(tooltipTs, xRange);
      const lineHeight = 16 * dpr;
      const boxPaddingX = 10 * dpr;
      const boxPaddingY = 6 * dpr;
      const headerHeight = lineHeight + 4 * dpr;
      const bodyHeight = entries.length * lineHeight;
      const boxH = boxPaddingY * 2 + headerHeight + bodyHeight;
      const boxW = Math.max(
        140 * dpr,
        ...[timeLabel, ...entries.map((e) => `${e.tagName}: ${formatTooltipValue(e.value)}`)].map(
          (s) => ctx.measureText(s).width + boxPaddingX * 2,
        ),
      );

      // 定位浮框（优先在十字线右侧，空间不足时在左侧）
      let boxX = lineX + 12 * dpr;
      if (boxX + boxW > w - margin.right) {
        boxX = lineX - boxW - 12 * dpr;
      }
      const boxY = Math.max(margin.top, Math.min(margin.top + ph - boxH, margin.top + 10 * dpr));

      // 浮框背景
      ctx.fillStyle = 'var(--surface, #1e293b)';
      ctx.strokeStyle = 'var(--border, rgba(255,255,255,0.12))';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6 * dpr);
      ctx.fill();
      ctx.stroke();

      // 时间标题
      ctx.fillStyle = 'var(--text, #e2e8f0)';
      ctx.font = `bold ${11 * dpr}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(timeLabel, boxX + boxPaddingX, boxY + boxPaddingY);

      // 分隔线
      const sepY = boxY + boxPaddingY + headerHeight;
      ctx.strokeStyle = 'var(--border, rgba(255,255,255,0.08))';
      ctx.lineWidth = 0.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(boxX + boxPaddingX, sepY);
      ctx.lineTo(boxX + boxW - boxPaddingX, sepY);
      ctx.stroke();

      // 各系列值
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const ty = sepY + 2 * dpr + i * lineHeight;

        // 颜色方块
        ctx.fillStyle = e.color;
        ctx.fillRect(boxX + boxPaddingX, ty + 3 * dpr, 10 * dpr, 3 * dpr);

        // 标签名
        ctx.fillStyle = 'var(--text-secondary, #94a3b8)';
        ctx.font = `${10 * dpr}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(e.tagName, boxX + boxPaddingX + 14 * dpr, ty);

        // 值（右对齐）
        const valStr = formatTooltipValue(e.value);
        ctx.fillStyle = 'var(--text, #e2e8f0)';
        ctx.textAlign = 'right';
        ctx.fillText(valStr, boxX + boxW - boxPaddingX, ty);
      }

      // 若已固定，显示点击取消提示
      if (isPinned) {
        ctx.fillStyle = 'var(--text-secondary, #94a3b8)';
        ctx.font = `${9 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          t('system.historicalTrend.clickToUnpin'),
          boxX + boxW / 2,
          boxY + boxH - boxPaddingY - lineHeight,
        );
      }
    }
  }

  // ===== X轴线和刻度 =====
  const axisY = margin.top + ph;
  ctx.strokeStyle = 'var(--border, rgba(255,255,255,0.12))';
  ctx.lineWidth = 0.8 * dpr;
  ctx.beginPath();
  ctx.moveTo(margin.left, axisY);
  ctx.lineTo(w - margin.right, axisY);
  ctx.stroke();

  // X轴时间标签
  const labelCount = Math.max(3, Math.min(8, Math.floor(pw / (80 * dpr))));
  ctx.fillStyle = 'var(--text-secondary, #94a3b8)';
  ctx.font = `${9 * dpr}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tickLen = 4 * dpr;

  for (let i = 0; i <= labelCount; i++) {
    const ts = xMin + (xRange / labelCount) * i;
    const x = toX(ts);
    const label = formatXAxisLabel(ts, xRange);

    // 刻度线
    ctx.strokeStyle = 'var(--border, rgba(255,255,255,0.12))';
    ctx.lineWidth = 0.6 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, axisY);
    ctx.lineTo(x, axisY + tickLen);
    ctx.stroke();

    ctx.fillText(label, x, axisY + tickLen + 3 * dpr);
  }
}

/** 格式化X轴标签：根据时间跨度自适应显示 */
function formatXAxisLabel(ts: number, rangeMs: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const MM = (d.getMonth() + 1).toString().padStart(2, '0');
  const DD = d.getDate().toString().padStart(2, '0');

  if (rangeMs < 3600000) {
    // < 1小时：HH:MM
    return `${hh}:${mm}`;
  } else if (rangeMs < 86400000) {
    // < 1天：HH:MM
    return `${hh}:${mm}`;
  } else if (rangeMs < 604800000) {
    // < 7天：MM-DD HH:MM
    return `${MM}-${DD} ${hh}:${mm}`;
  } else {
    // >= 7天：MM-DD
    return `${MM}-${DD}`;
  }
}

/** 格式化Tooltip时间 */
function formatTooltipTime(ts: number, rangeMs: number): string {
  const d = new Date(ts);
  const Y = d.getFullYear();
  const MM = (d.getMonth() + 1).toString().padStart(2, '0');
  const DD = d.getDate().toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');

  if (rangeMs < 86400000) {
    return `${hh}:${mm}:${ss}`;
  } else {
    return `${Y}-${MM}-${DD} ${hh}:${mm}:${ss}`;
  }
}

/** 格式化Tooltip数值 */
function formatTooltipValue(val: number | null): string {
  if (val === null || val === undefined) return '--';
  if (Number.isInteger(val)) return val.toString();
  // 根据数值大小动态精度
  if (Math.abs(val) < 0.01) return val.toFixed(6);
  if (Math.abs(val) < 1) return val.toFixed(4);
  if (Math.abs(val) < 100) return val.toFixed(2);
  return val.toFixed(1);
}

// ===== dataZoom 功能 =====

/** 获取全量数据时间范围 */
function getFullDataRange(): { start: number; end: number } | null {
  let min = Infinity, max = -Infinity;
  for (const s of chartSeries.value) {
    if (!visibleSeries.value.has(s.tagId)) continue;
    for (const d of s.data) {
      if (d.timestamp < min) min = d.timestamp;
      if (d.timestamp > max) max = d.timestamp;
    }
  }
  return isFinite(min) ? { start: min, end: max } : null;
}

/** 绘制 dataZoom 滑块 */
function drawSlider() {
  const canvas = sliderCanvas.value;
  if (!canvas || !chartSeries.value.length) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width;
  const h = 50;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const fullRange = getFullDataRange();
  if (!fullRange) return;

  const padding = { left: 0, right: 0, top: 4, bottom: 4 };
  const pw = w - padding.left - padding.right;
  const ph = h - padding.top - padding.bottom;

  // 背景
  ctx.fillStyle = 'var(--surface, #1e293b)';
  ctx.fillRect(0, 0, w, h);

  const range = fullRange.end - fullRange.start || 1;
  const toX = (t: number) => padding.left + ((t - fullRange.start) / range) * pw;

  // 绘制缩略曲线
  const visibleData = chartSeries.value.filter((s) => visibleSeries.value.has(s.tagId));
  for (let si = 0; si < visibleData.length; si++) {
    const s = visibleData[si];
    const pts = s.data;
    if (pts.length < 2) continue;
    const color = getSeriesColor(si);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    // 降采样到滑块宽度
    const step = Math.max(1, Math.floor(pts.length / pw));
    let first = true;
    for (let i = 0; i < pts.length; i += step) {
      const x = toX(pts[i].timestamp);
      const v = pts[i].value;
      const allVals = visibleData.flatMap((d) => d.data.map((p) => p.value));
      const vMin = Math.min(...allVals);
      const vMax = Math.max(...allVals);
      const vRange = vMax - vMin || 1;
      const y = padding.top + ph - ((v - vMin) / vRange) * ph;
      if (first) { ctx.moveTo(x, y); first = false; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 缩放窗口
  const zr = zoomRange.value || fullRange;
  const zLeft = toX(zr.start);
  const zRight = toX(zr.end);

  // 未选中区域遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, zLeft, h);
  ctx.fillRect(zRight, 0, w - zRight, h);

  // 选中区域边框
  ctx.strokeStyle = 'var(--primary, #3b82f6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(zLeft, padding.top, zRight - zLeft, ph);

  // 手柄
  const handleW = 3;
  ctx.fillStyle = 'var(--primary, #3b82f6)';
  ctx.fillRect(zLeft - handleW / 2, padding.top, handleW, ph);
  ctx.fillRect(zRight - handleW / 2, padding.top, handleW, ph);

  // 手柄拖拽热区指示
  ctx.fillStyle = 'var(--primary, #3b82f6)';
  ctx.globalAlpha = 0.15;
  ctx.fillRect(zLeft - 4, 0, 8, h);
  ctx.fillRect(zRight - 4, 0, 8, h);
  ctx.globalAlpha = 1;
}

/** 鼠标滚轮缩放 */
function handleChartWheel(e: WheelEvent) {
  const fullRange = getFullDataRange();
  if (!fullRange) return;
  const canvas = chartCanvas.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const margin = { left: 60, right: 20 };
  const pw = rect.width - margin.left - margin.right;
  const mouseX = e.clientX - rect.left - margin.left;
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
  drawChart();
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
  e.preventDefault();
}

/** 主图表鼠标移动 —— 更新Tooltip位置 */
function handleChartMouseMove(e: MouseEvent) {
  if (isPanning.value) return;
  const canvas = chartCanvas.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouseX.value = e.clientX - rect.left;
  mouseY.value = e.clientY - rect.top;
  drawChart();
}

/** 鼠标离开图表 */
function handleChartMouseLeave() {
  mouseX.value = null;
  mouseY.value = null;
  drawChart();
}

/** 点击图表 —— 固定/取消固定Tooltip */
function handleChartClick(e: MouseEvent) {
  if (isPanning.value) return;
  const canvas = chartCanvas.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const margin = { left: 60, right: 20 };
  const pw = rect.width - margin.left - margin.right;
  const clickX = e.clientX - rect.left - margin.left;
  if (clickX < 0 || clickX > pw) return;

  const fullRange = getFullDataRange();
  if (!fullRange) return;
  const xMin = zoomRange.value ? zoomRange.value.start : fullRange.start;
  const xMax = zoomRange.value ? zoomRange.value.end : fullRange.end;
  const xRange = xMax - xMin || 1;
  const ts = xMin + (clickX / pw) * xRange;

  // Toggle pin
  if (pinnedTimestamp.value !== null) {
    pinnedTimestamp.value = null;
  } else {
    pinnedTimestamp.value = ts;
  }
  drawChart();
}

/** 全局鼠标移动 */
function handleGlobalMouseMove(e: MouseEvent) {
  // 主图表平移
  if (isPanning.value && panStartRange.value) {
    const canvas = chartCanvas.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const margin = { left: 60, right: 20 };
    const pw = rect.width - margin.left - margin.right;
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
    drawChart();
    drawSlider();
    return;
  }

  // 滑块拖拽
  if (sliderDragging.value !== 'none' && sliderDragStartRange.value) {
    const canvas = sliderCanvas.value;
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
    drawChart();
    drawSlider();
    return;
  }
}

/** 全局鼠标释放 */
function handleGlobalMouseUp(_e: MouseEvent) {
  isPanning.value = false;
  sliderDragging.value = 'none';
}

/** 滑块鼠标按下 */
function handleSliderMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  const fullRange = getFullDataRange();
  if (!fullRange) return;
  const canvas = sliderCanvas.value;
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
    // 点击滑块外部：以点击位置为中心重新定位窗口
    const span = zr.end - zr.start;
    const half = span / 2;
    let center = toTime(x);
    let ns = center - half;
    let ne = center + half;
    if (ns < fullRange.start) { ns = fullRange.start; ne = ns + span; }
    if (ne > fullRange.end) { ne = fullRange.end; ns = ne - span; }
    zoomRange.value = { start: ns, end: ne };
    drawChart();
    drawSlider();
    return;
  }

  sliderDragStartX.value = e.clientX;
  sliderDragStartRange.value = { ...zr };
  e.preventDefault();
}

/** 重置缩放 */
function resetZoom() {
  zoomRange.value = null;
  drawChart();
  drawSlider();
}

defineExpose({
  // reactive state
  projectStore,
  selectedProjectId,
  devices,
  selectedDeviceId,
  allTags,
  selectedTagIds,
  filteredTags,
  allTagsSelected,
  tagSearch,
  showTagPicker,
  startTime,
  endTime,
  presetRange,
  queryLoading,
  chartSeries,
  visibleSeries,
  canQuery,
  // functions
  onProjectChange,
  onDeviceChange,
  loadDevices,
  loadTagsForDevice,
  toggleTag,
  toggleAllTags,
  applyPresetRange,
  queryTrendData,
  toggleSeries,
  toLocalDatetime,
  drawChart,
});
</script>

<style scoped>
.historical-trend-page {
  height: 100%;
  overflow-y: auto;
  padding: 20px 24px;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.query-bar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.query-field { display: flex; flex-direction: column; gap: 4px; }

.query-field label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-select, .form-input {
  padding: 6px 10px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  outline: none;
}

.project-select {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  min-width: 160px;
}

.project-select:focus {
  outline: none;
  border-color: var(--primary);
}

.form-select:focus, .form-input:focus {
  border-color: var(--primary);
}

.time-range-selector {
  display: flex;
  align-items: center;
  gap: 6px;
}

.time-sep {
  color: var(--text-secondary);
  font-size: 13px;
}

.query-actions { padding-bottom: 2px; }

.query-separator {
  width: 1px;
  align-self: stretch;
  background: var(--border);
  flex-shrink: 0;
  margin: 2px 0;
}

/* 标签选择器 */
.tag-select-wrapper { position: relative; }

.tag-picker-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  width: 320px;
  max-height: 300px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.tag-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--text);
  gap: 8px;
}

.tag-picker-header label {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.tag-search-input { width: 120px; padding: 3px 8px; font-size: 12px; }

.tag-picker-list {
  flex: 1;
  overflow-y: auto;
  max-height: 220px;
}

.tag-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text);
}

.tag-option:hover { background: var(--bg, rgba(0, 0, 0, 0.03)); }

.tag-name { font-weight: 500; flex-shrink: 0; }

.tag-address {
  color: var(--text-secondary);
  font-size: 11px;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-empty {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.tag-picker-footer {
  padding: 8px 10px;
  border-top: 1px solid var(--border);
  text-align: right;
}

/* 图例 */
.legend-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.legend-item.active { color: var(--text); }

.legend-color { width: 14px; height: 3px; border-radius: 2px; }

.record-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* 图表 */
.chart-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 400px;
  gap: 0;
}

.chart-container {
  flex: 1;
  min-height: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px 8px 0 0;
  position: relative;
  overflow: hidden;
  cursor: grab;
}

.chart-container:active {
  cursor: grabbing;
}

.chart-canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
}

/* dataZoom 滑块 */
.datazoom-slider {
  display: flex;
  align-items: center;
  gap: 0;
  height: 56px;
  flex-shrink: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 0;
  border-radius: 0 0 8px 8px;
  padding: 0 0 0 4px;
  cursor: pointer;
}

.slider-canvas {
  flex: 1;
  height: 50px;
}

.zoom-reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  margin-right: 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.zoom-reset-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* 通用按钮 */
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

.sys-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.sys-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sys-btn-primary {
  background: var(--primary);
  color: var(--text);
  border-color: var(--primary);
}

.sys-btn-primary:hover:not(:disabled) { opacity: 0.85; color: var(--text); }
.sys-btn-secondary { background: var(--surface); color: var(--text); }
.sys-btn-sm { padding: 4px 10px; font-size: 12px; }

/* 方案保存弹框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: mb-fade-in 0.2s ease;
}

@keyframes mb-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-box {
  width: 400px;
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: mb-scale-in 0.2s ease;
}

@keyframes mb-scale-in {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0 4px;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 20px 24px;
}

.modal-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.modal-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}
</style>
