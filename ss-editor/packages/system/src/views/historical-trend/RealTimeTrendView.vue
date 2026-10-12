<template>
  <div class="realtime-trend-page">
    <!-- 工具栏：按操作流分组 -->
    <div class="query-bar">
      <!-- ── 数据源 ── -->
      <div class="query-field">
        <label>{{ $t('system.realTimeTrend.project') }}</label>
        <select
          v-model="selectedProjectId"
          class="project-select"
          @change="onProjectChange"
        >
          <option value="">
            {{ $t('system.realTimeTrend.selectProject') }}
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
        <label>{{ $t('system.realTimeTrend.device') }}</label>
        <select
          v-model="selectedDeviceId"
          class="form-select"
          :disabled="!selectedProjectId"
          @change="onDeviceChange"
        >
          <option value="">
            {{ $t('system.realTimeTrend.selectDevice') }}
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
        <label>{{ $t('system.realTimeTrend.tags') }}</label>
        <div class="tag-select-wrapper">
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            :disabled="!selectedDeviceId"
            @click="showTagPicker = !showTagPicker"
          >
            {{ selectedTagIds.length ? $t('system.realTimeTrend.tagsSelected', { n: selectedTagIds.length }) : $t('system.realTimeTrend.selectTags') }}
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
                {{ $t('system.realTimeTrend.selectAll') }}
              </label>
              <input
                v-model="tagSearch"
                class="form-input tag-search-input"
                :placeholder="$t('system.realTimeTrend.searchTag')"
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
                {{ $t('system.realTimeTrend.noTags') }}
              </div>
            </div>
            <div class="tag-picker-footer">
              <button
                class="sys-btn sys-btn-primary sys-btn-sm"
                @click="showTagPicker = false"
              >
                {{ $t('system.realTimeTrend.done') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="query-separator" />

      <!-- ── 查询控制 ── -->
      <div class="query-field">
        <label>{{ $t('system.realTimeTrend.timeRange') }}</label>
        <TimeRangePicker
          v-model="timeRangeMinutes"
          mode="window"
          :window-options="timeWindowOptions"
          size="sm"
        />
      </div>

      <div class="query-field query-actions">
        <button
          class="sys-btn sys-btn-primary sys-btn-sm"
          :disabled="!canQuery"
          @click="() => queryTrendData()"
        >
          {{ queryLoading ? $t('system.realTimeTrend.querying') : $t('system.realTimeTrend.query') }}
        </button>
      </div>

      <div class="query-field">
        <label>{{ $t('system.realTimeTrend.refreshInterval') }}</label>
        <select
          v-model="refreshIntervalSec"
          class="form-select"
        >
          <option :value="1">
            1s
          </option>
          <option :value="3">
            3s
          </option>
          <option :value="5">
            5s
          </option>
          <option :value="10">
            10s
          </option>
          <option :value="30">
            30s
          </option>
        </select>
      </div>

      <div class="query-field">
        <label class="auto-label">
          <input
            v-model="autoRefresh"
            type="checkbox"
            :disabled="!canQuery"
          >
          {{ $t('system.realTimeTrend.autoRefresh') }}
        </label>
      </div>

      <div class="query-separator" />

      <!-- ── 方案管理 ── -->
      <div class="query-field">
        <label>{{ $t('system.realTimeTrend.schemes') }}</label>
        <select
          v-model="selectedSchemeId"
          class="form-select"
          :disabled="!selectedProjectId"
          @change="onSchemeChange"
        >
          <option value="">
            {{ $t('system.realTimeTrend.selectScheme') }}
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
          :title="$t('system.realTimeTrend.saveScheme')"
          @click="showSaveDialog = true"
        >
          {{ $t('system.realTimeTrend.saveScheme') }}
        </button>
      </div>

      <div
        v-if="selectedSchemeId"
        class="query-field query-actions"
      >
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          :title="$t('system.realTimeTrend.deleteScheme')"
          @click="deleteScheme"
        >
          {{ $t('system.realTimeTrend.deleteScheme') }}
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
          <span class="modal-title">{{ $t('system.realTimeTrend.saveSchemeTitle') }}</span>
          <button
            class="modal-close"
            @click="showSaveDialog = false"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <label class="modal-label">{{ $t('system.realTimeTrend.schemeName') }}</label>
          <input
            v-model="schemeName"
            class="form-input modal-input"
            :placeholder="$t('system.realTimeTrend.schemeNamePlaceholder')"
            @keyup.enter="saveScheme"
          >
        </div>
        <div class="modal-footer">
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="showSaveDialog = false"
          >
            {{ $t('system.realTimeTrend.cancel') }}
          </button>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            :disabled="!schemeName.trim()"
            @click="saveScheme"
          >
            {{ $t('system.realTimeTrend.save') }}
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
      <span class="record-count">{{ $t('system.realTimeTrend.recordCount', { n: totalRecordCount }) }}</span>
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
          :text="$t('system.realTimeTrend.loading')"
          size="medium"
        />
        <div
          v-else-if="!chartSeries.length"
          class="chart-empty"
        >
          {{ $t('system.realTimeTrend.noData') }}
        </div>
        <canvas
          v-show="chartSeries.length"
          ref="chartCanvas"
          class="chart-canvas"
        />
      </div>
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
          :title="$t('system.realTimeTrend.resetZoom')"
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { deviceApi, dataQueryApi, trendQuerySchemeApi } from '../../api/modules';
import { useProjectStore } from '../../stores';
import type { TrendQueryScheme } from '../../api/modules/trend-query-scheme.api';
import { SsLoading, TimeRangePicker } from '@scada-editor/shared';
import { showError, showConfirm, showSuccess } from '../../utils/messageBox';
// 跨端接口契约共享解包器（单一来源，详见 @scada-editor/contract）
import { extractListData } from '@scada-editor/contract';

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

// 时间范围
const timeRangeMinutes = ref(60);

const timeWindowOptions = computed(() => [
  { label: '5min', value: 5 },
  { label: '15min', value: 15 },
  { label: '30min', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '6h', value: 360 },
]);
const refreshIntervalSec = ref(5);
const autoRefresh = ref(true);

// 查询
const queryLoading = ref(false);
const chartSeries = ref<Array<{ tagId: string; tagName: string; data: Array<{ timestamp: number; value: number }> }>>([]);
const visibleSeries = ref<Set<string>>(new Set());
const totalRecordCount = ref(0);

// 方案保存
const showSaveDialog = ref(false);
const schemeName = ref('');
const schemes = ref<TrendQueryScheme[]>([]);
const selectedSchemeId = ref('');

const canQuery = computed(() => selectedProjectId.value && selectedDeviceId.value && selectedTagIds.value.length > 0);

// 自动刷新定时器
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// 滑动窗口：记录上次查询截至时间，用于增量拉取
const lastQueryTime = ref<number>(0);

// CSV 颜色色板
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

// 鼠标交互
const mouseX = ref<number | null>(null);
const mouseY = ref<number | null>(null);
const pinnedTimestamp = ref<number | null>(null);

onMounted(async () => {
  try {
    await projectStore.fetchProjects();
  } catch (err: any) {
    if (import.meta.env.DEV) console.warn('[RealTimeTrend] loadProjects failed:', err);
    showError(t('system.realTimeTrend.loadProjectsFailed'));
  }
  resizeObserver = new ResizeObserver(() => drawChart());
  if (chartCanvas.value) resizeObserver.observe(chartCanvas.value);
  sliderResizeObserver = new ResizeObserver(() => drawSlider());
  if (sliderCanvas.value) sliderResizeObserver.observe(sliderCanvas.value);
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);
});

onUnmounted(() => {
  stopAutoRefresh();
  resizeObserver?.disconnect();
  sliderResizeObserver?.disconnect();
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleGlobalMouseUp);
});

// 监听自动刷新开关
watch(autoRefresh, (on) => {
  if (on && canQuery.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

// 监听刷新间隔变化
watch(refreshIntervalSec, () => {
  if (autoRefresh.value) {
    stopAutoRefresh();
    startAutoRefresh();
  }
});

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => {
    if (autoRefresh.value && canQuery.value) {
      queryTrendData(true);
    }
  }, refreshIntervalSec.value * 1000);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function onProjectChange() {
  selectedDeviceId.value = '';
  devices.value = [];
  selectedTagIds.value = [];
  allTags.value = [];
  chartSeries.value = [];
  selectedSchemeId.value = '';
  schemes.value = [];
  lastQueryTime.value = 0;
  stopAutoRefresh();
  autoRefresh.value = false;
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
    if (import.meta.env.DEV) console.warn('[RealTimeTrend] loadDevices failed:', err);
    showError(t('system.realTimeTrend.loadDevicesFailed'));
  }
}

async function onDeviceChange() {
  selectedTagIds.value = [];
  allTags.value = [];
  chartSeries.value = [];
  lastQueryTime.value = 0;
  if (selectedDeviceId.value) loadTagsForDevice();
}

async function loadTagsForDevice() {
  if (!selectedProjectId.value || !selectedDeviceId.value) return;
  try {
    // 改用唯一权威入口 GET /devices/:deviceId/tags（替代误读 deviceApi.getById().tags，
    // 后端 findOne 未关联 tags，旧实现取到 undefined）。详见架构设计 07-接口设计规范 §3.3。
    const res: any = await deviceApi.listTagsByDevice(
      selectedProjectId.value,
      selectedDeviceId.value,
      { page: 1, pageSize: 100 },
    );
    // 后端 TransformInterceptor 包装：{code, data:{data:[...], pagination}, message, timestamp}
    // 统一走跨端共享解包器（详见 @smart-site/contract），消除历史扁平结构兼容分支。
    const tagsArray = extractListData<TagInfo>(res?.data ?? res);
    const tags: TagInfo[] = tagsArray.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      address: tag.address || '',
    }));
    allTags.value = tags;
  } catch (err: any) {
    allTags.value = [];
    if (import.meta.env.DEV) console.warn('[RealTimeTrend] loadTags failed:', err);
    showError(t('system.realTimeTrend.loadTagsFailed'));
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

async function queryTrendData(isAutoRefresh = false) {
  if (!canQuery.value) return;
  if (!isAutoRefresh) {
    queryLoading.value = true;
    lastQueryTime.value = 0; // 手动查询重置，触发全量拉取
  }
  try {
    const now = Date.now();
    const windowStart = now - timeRangeMinutes.value * 60000;
    let startTime: Date;
    const endTime = new Date(now);

    // 自动刷新且已有数据：增量拉取（从上次结束到当前）
    const isIncremental = isAutoRefresh && lastQueryTime.value > 0 && chartSeries.value.length > 0;
    if (isIncremental) {
      startTime = new Date(lastQueryTime.value);
    } else {
      startTime = new Date(windowStart);
    }

    const res = await dataQueryApi.queryTrend({
      tagIds: selectedTagIds.value,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      maxPoints: isIncremental ? 500 : 2000,
      projectId: selectedProjectId.value,
    });
    const data = (res as any)?.data ?? (res as any);
    const pages: Array<{ tagId: string; data: Array<{ timestamp: string; value: number | null }> }> =
      data?.data ?? (Array.isArray(data) ? data : [data]).filter(Boolean);

    const parsePoints = (p: any) =>
      (p.data || []).map((d: any) => ({
        timestamp: new Date(d.timestamp).getTime(),
        value: d.value,
      }));

    if (isIncremental) {
      // ── 增量模式：滑动窗口（进一个数据，出一个数据）──
      // 步骤 1：将新数据追加到对应序列
      for (const page of pages) {
        const existing = chartSeries.value.find((s) => s.tagId === page.tagId);
        const newPoints = parsePoints(page);
        if (existing && newPoints.length > 0) {
          existing.data.push(...newPoints);
        }
      }
      // 步骤 2：对所有序列统一执行滑动窗口裁剪 + 去重 + 排序
      // 即使某序列本次无新数据，也要淘汰窗口外的旧数据，保证窗口持续滑动
      for (const s of chartSeries.value) {
        // 淘汰窗口外的旧数据（左侧出）
        s.data = s.data.filter((d) => d.timestamp >= windowStart);
        // 去重（按时间戳）
        const seen = new Set<number>();
        s.data = s.data.filter((d) => {
          if (seen.has(d.timestamp)) return false;
          seen.add(d.timestamp);
          return true;
        });
        // 按时间戳升序排序
        s.data.sort((a, b) => a.timestamp - b.timestamp);
      }
      totalRecordCount.value = chartSeries.value.reduce((sum, s) => sum + s.data.length, 0);
    } else {
      // ── 全量模式 ──
      const seriesMap = new Map<string, typeof chartSeries.value[0]>();
      for (const page of pages) {
        const tag = allTags.value.find((t) => t.id === page.tagId);
        seriesMap.set(page.tagId, {
          tagId: page.tagId,
          tagName: tag?.name || page.tagId,
          data: parsePoints(page),
        });
      }
      // 保留已有选中的标签顺序
      const ordered: typeof chartSeries.value = [];
      for (const tid of selectedTagIds.value) {
        const s = seriesMap.get(tid);
        if (s && s.data.length > 0) ordered.push(s);
        seriesMap.delete(tid);
      }
      // 未在选中列表中的也追加
      for (const s of seriesMap.values()) {
        if (s.data.length > 0) ordered.push(s);
      }
      chartSeries.value = ordered;
      visibleSeries.value = new Set(chartSeries.value.map((s) => s.tagId));
      zoomRange.value = null;
      totalRecordCount.value = (res as any)?.total ?? data?.total ?? ordered.reduce((sum, s) => sum + s.data.length, 0);
    }

    lastQueryTime.value = now;

    await nextTick();
    drawChart();
    drawSlider();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.realTimeTrend.queryFailed'));
    }
  } finally { if (!isAutoRefresh) queryLoading.value = false; }
}

// ────────── 方案保存/加载 ──────────

async function loadSchemes() {
  if (!selectedProjectId.value) return;
  try {
    schemes.value = await trendQuerySchemeApi.list(selectedProjectId.value);
  } catch (err: any) {
    schemes.value = [];
    if (import.meta.env.DEV) console.warn('[RealTimeTrend] loadSchemes failed:', err);
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
      interpolationMode: 'raw',
      interpolationInterval: timeRangeMinutes.value * 60000,
      presetRange: `rt-${timeRangeMinutes.value}min`,
    });
    showSaveDialog.value = false;
    schemeName.value = '';
    await loadSchemes();
    selectedSchemeId.value = scheme.id;
    showSuccess(t('system.realTimeTrend.schemeSaved'));
  } catch (err: any) {
    showError(err?.response?.data?.message || err?.message || t('system.realTimeTrend.schemeSaveFailed'));
  }
}

async function onSchemeChange() {
  if (!selectedSchemeId.value) return;
  const scheme = schemes.value.find((s) => s.id === selectedSchemeId.value);
  if (!scheme) return;

  if (scheme.deviceId !== selectedDeviceId.value) {
    selectedDeviceId.value = scheme.deviceId;
    await onDeviceChange();
  }
  try {
    selectedTagIds.value = JSON.parse(scheme.tagIds);
  } catch {
    selectedTagIds.value = [];
  }
}

async function deleteScheme() {
  if (!selectedSchemeId.value) return;
  const confirmed = await showConfirm(t('system.realTimeTrend.confirmDeleteScheme'));
  if (!confirmed) return;

  try {
    await trendQuerySchemeApi.delete(selectedSchemeId.value);
    selectedSchemeId.value = '';
    await loadSchemes();
    showSuccess(t('system.realTimeTrend.schemeDeleted'));
  } catch (err: any) {
    showError(err?.response?.data?.message || err?.message || t('system.realTimeTrend.schemeDeleteFailed'));
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

// ========== 图表绘制 ==========

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

  // Tooltip
  let tooltipTs: number | null = null;
  let tooltipX: number | null = null;
  let isPinned = false;

  if (pinnedTimestamp.value !== null) {
    tooltipTs = pinnedTimestamp.value;
    tooltipX = toX(tooltipTs);
    isPinned = true;
  } else if (mouseX.value !== null && mouseY.value !== null) {
    const canvasMouseX = mouseX.value * dpr;
    tooltipX = canvasMouseX;
    if (canvasMouseX >= margin.left && canvasMouseX <= margin.left + pw &&
        mouseY.value * dpr >= margin.top && mouseY.value * dpr <= margin.top + ph) {
      tooltipTs = xMin + ((canvasMouseX - margin.left) / pw) * xRange;
    } else {
      tooltipX = null;
    }
  }

  if (tooltipX !== null && tooltipTs !== null) {
    const lineX = tooltipX;
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

    interface TooltipEntry { tagName: string; value: number | null; color: string; }
    const entries: TooltipEntry[] = [];

    for (let si = 0; si < visibleData.length; si++) {
      const s = visibleData[si];
      const pts = s.data;
      if (pts.length === 0) continue;

      let lo = 0, hi = pts.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (pts[mid].timestamp < tooltipTs) lo = mid + 1;
        else hi = mid;
      }
      let best = lo;
      if (lo > 0 && Math.abs(pts[lo - 1].timestamp - tooltipTs) < Math.abs(pts[lo].timestamp - tooltipTs)) {
        best = lo - 1;
      }
      const pt = pts[best];
      const color = getSeriesColor(si);

      const dotX = toX(pt.timestamp);
      const dotY = toY(pt.value);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'var(--surface, #fff)';
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();

      entries.push({ tagName: s.tagName, value: pt.value, color });
    }

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

      let boxX = lineX + 12 * dpr;
      if (boxX + boxW > w - margin.right) {
        boxX = lineX - boxW - 12 * dpr;
      }
      const boxY = Math.max(margin.top, Math.min(margin.top + ph - boxH, margin.top + 10 * dpr));

      ctx.fillStyle = 'var(--surface, #1e293b)';
      ctx.strokeStyle = 'var(--border, rgba(255,255,255,0.12))';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6 * dpr);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'var(--text, #e2e8f0)';
      ctx.font = `bold ${11 * dpr}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(timeLabel, boxX + boxPaddingX, boxY + boxPaddingY);

      const sepY = boxY + boxPaddingY + headerHeight;
      ctx.strokeStyle = 'var(--border, rgba(255,255,255,0.08))';
      ctx.beginPath();
      ctx.moveTo(boxX + boxPaddingX, sepY);
      ctx.lineTo(boxX + boxW - boxPaddingX, sepY);
      ctx.stroke();

      ctx.font = `${11 * dpr}px sans-serif`;
      for (let ei = 0; ei < entries.length; ei++) {
        const e = entries[ei];
        const ty = sepY + 4 * dpr + ei * lineHeight;
        ctx.fillStyle = e.color;
        ctx.fillText('\u25CF', boxX + boxPaddingX, ty);
        ctx.fillStyle = 'var(--text, #e2e8f0)';
        ctx.fillText(`${e.tagName}: ${formatTooltipValue(e.value)}`, boxX + boxPaddingX + 14 * dpr, ty);
      }
    }
  }
}

function formatTooltipTime(ts: number, xRange: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (xRange < 3600000) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatTooltipValue(v: number | null): string {
  if (v === null || v === undefined) return '--';
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(2);
}

// dataZoom slider
function drawSlider() {
  const canvas = sliderCanvas.value;
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const visibleData = chartSeries.value.filter((s) => visibleSeries.value.has(s.tagId));
  if (!visibleData.length) return;

  let tMin = Infinity, tMax = -Infinity;
  for (const s of visibleData) {
    for (const d of s.data) {
      if (d.timestamp < tMin) tMin = d.timestamp;
      if (d.timestamp > tMax) tMax = d.timestamp;
    }
  }
  if (!isFinite(tMin) || !isFinite(tMax)) return;

  const range = tMax - tMin || 1;
  const toSX = (t: number) => ((t - tMin) / range) * w;

  // 背景
  ctx.fillStyle = 'var(--surface, #1e293b)';
  ctx.fillRect(0, 0, w, h);

  // 迷你曲线
  const miniH = h * 0.5;
  const miniY = h * 0.25;
  for (let si = 0; si < visibleData.length; si++) {
    const pts = visibleData[si].data;
    if (pts.length < 2) continue;
    ctx.strokeStyle = getSeriesColor(si);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const sx = toSX(pts[i].timestamp);
      const sy = miniY + miniH * 0.5;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  // zoom window
  if (zoomRange.value) {
    const zs = toSX(zoomRange.value.start);
    const ze = toSX(zoomRange.value.end);
    ctx.fillStyle = 'rgba(59,130,246,0.15)';
    ctx.fillRect(zs, 0, ze - zs, h);
    // handles
    ctx.fillStyle = 'var(--primary, #3b82f6)';
    ctx.fillRect(zs - 1, 0, 3, h);
    ctx.fillRect(ze - 1, 0, 3, h);
  }
}

// Zoom / Pan handlers (simplified — wheel zoom, click to pin, drag to pan)
function handleChartWheel(e: WheelEvent) {
  if (!chartSeries.value.length) return;
  const visibleData = chartSeries.value.filter((s) => visibleSeries.value.has(s.tagId));
  let tMin = Infinity, tMax = -Infinity;
  for (const s of visibleData) {
    for (const d of s.data) {
      if (d.timestamp < tMin) tMin = d.timestamp;
      if (d.timestamp > tMax) tMax = d.timestamp;
    }
  }
  if (!isFinite(tMin)) return;

  const current = zoomRange.value || { start: tMin, end: tMax };
  const span = current.end - current.start;
  const factor = e.deltaY > 0 ? 1.3 : 0.7;
  const newSpan = Math.max(1000, Math.min(tMax - tMin, span * factor));
  const center = (current.start + current.end) / 2;
  const newStart = Math.max(tMin, center - newSpan / 2);
  const newEnd = Math.min(tMax, newStart + newSpan);
  zoomRange.value = { start: newStart, end: newEnd };
  drawChart();
  drawSlider();
}

function handleChartMouseDown(e: MouseEvent) {
  isPanning.value = true;
  panStartX.value = e.clientX;
  panStartRange.value = zoomRange.value ? { ...zoomRange.value } : null;
}

function handleChartMouseMove(e: MouseEvent) {
  mouseX.value = e.offsetX;
  mouseY.value = e.offsetY;
  if (isPanning.value && panStartRange.value) {
    const canvas = chartCanvas.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const tMin = panStartRange.value.start;
    const tMax = panStartRange.value.end;
    const tRange = tMax - tMin;
    const dx = (e.clientX - panStartX.value) / (rect.width) * tRange;
    const newStart = Math.max(panStartRange.value.start - dx, tMin);
    const newEnd = Math.min(panStartRange.value.end - dx, tMax);
    zoomRange.value = { start: newStart, end: newEnd };
    drawChart();
    drawSlider();
  }
  if (!isPanning.value) {
    drawChart();
  }
}

function handleChartMouseLeave() {
  mouseX.value = null;
  mouseY.value = null;
  isPanning.value = false;
  drawChart();
}

function handleChartClick() {
  if (mouseX.value !== null) {
    // Pin/unpin tooltip
    if (pinnedTimestamp.value !== null) {
      pinnedTimestamp.value = null;
    } else if (chartSeries.value.length) {
      // Find the timestamp at current mouse position
      const dpr = window.devicePixelRatio || 1;
      const canvasX = mouseX.value * dpr;
      const visibleData = chartSeries.value.filter((s) => visibleSeries.value.has(s.tagId));
      let tMin = Infinity, tMax = -Infinity;
      for (const s of visibleData) {
        for (const d of s.data) {
          if (d.timestamp < tMin) tMin = d.timestamp;
          if (d.timestamp > tMax) tMax = d.timestamp;
        }
      }
      if (isFinite(tMin)) {
        const margin = { left: 60, right: 20 };
        const w = chartCanvas.value!.width;
        const pw = w - margin.left - margin.right;
        const xMin = zoomRange.value ? zoomRange.value.start : tMin;
        const xMax = zoomRange.value ? zoomRange.value.end : tMax;
        const xRange = xMax - xMin;
        pinnedTimestamp.value = xMin + ((canvasX - margin.left) / pw) * xRange;
      }
    }
    drawChart();
  }
}

function handleGlobalMouseMove() {
  // handled by local mousemove
}

function handleGlobalMouseUp() {
  isPanning.value = false;
  sliderDragging.value = 'none';
}

function handleSliderMouseDown(e: MouseEvent) {
  if (!zoomRange.value || !sliderCanvas.value) return;
  const canvas = sliderCanvas.value;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = (e.clientX - rect.left) * dpr;
  const w = canvas.width;
  const tMin = zoomRange.value.start;
  const tMax = zoomRange.value.end;
  const range = tMax - tMin || 1;
  const fromSlider = (sx: number) => tMin + (sx / w) * range;

  const zs = ((zoomRange.value.start - tMin) / range) * w;
  const ze = ((zoomRange.value.end - tMin) / range) * w;
  const handleWidth = 6;

  if (Math.abs(x - zs) < handleWidth * dpr) {
    sliderDragging.value = 'left';
  } else if (Math.abs(x - ze) < handleWidth * dpr) {
    sliderDragging.value = 'right';
  } else if (x > zs && x < ze) {
    sliderDragging.value = 'window';
  } else {
    // Click outside — set start to click pos
    const newStart = fromSlider(x);
    sliderDragging.value = 'right';
    zoomRange.value = { start: newStart, end: Math.min(tMax, newStart + 60000) };
    drawChart();
    drawSlider();
    return;
  }

  sliderDragStartX.value = x;
  sliderDragStartRange.value = { ...zoomRange.value };
}

function resetZoom() {
  zoomRange.value = null;
  drawChart();
  drawSlider();
}

const visibleData = computed(() =>
  chartSeries.value.filter((s) => visibleSeries.value.has(s.tagId)),
);

watch(visibleData, () => {
  // data changed from outside
}, { deep: true });
</script>

<style scoped>
.realtime-trend-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  padding: 16px 20px;
  gap: 12px;
  overflow: hidden;
}

.query-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.query-separator {
  width: 1px;
  align-self: stretch;
  background: var(--border);
  flex-shrink: 0;
  margin: 2px 0;
}

.query-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.query-field label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.auto-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
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

/* Tag picker */
.tag-select-wrapper { position: relative; }
.tag-picker-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 280px;
  max-height: 300px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.tag-picker-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-search-input {
  width: 100%;
  box-sizing: border-box;
}

.tag-picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 12px;
}

.tag-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
  font-size: 13px;
}

.tag-option input { flex-shrink: 0; }

.tag-name { flex: 1; color: var(--text); }
.tag-address { font-size: 11px; color: var(--text-secondary); font-family: monospace; }

.tag-empty {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 12px;
  text-align: center;
}

.tag-picker-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  text-align: right;
}

/* Chart */
.chart-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
}

.chart-container {
  flex: 1;
  position: relative;
  min-height: 200px;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.datazoom-slider {
  height: 50px;
  position: relative;
  flex-shrink: 0;
}

.slider-canvas {
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.zoom-reset-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 3px 5px;
}

.zoom-reset-btn:hover { color: var(--primary); }

/* Legend */
.legend-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: opacity 0.2s;
}

.legend-item:not(.active) {
  opacity: 0.4;
  text-decoration: line-through;
}

.legend-color {
  width: 16px;
  height: 3px;
  border-radius: 2px;
}

.record-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
}

.query-actions {
  justify-content: flex-end;
}

.sys-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  white-space: nowrap;
}

.sys-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.sys-btn-primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.sys-btn-secondary { background: var(--surface); }

.sys-btn-sm { padding: 4px 10px; font-size: 12px; }

/* Modal */
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

.modal-close:hover { color: var(--text); }

.modal-body { padding: 20px 24px; }

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
