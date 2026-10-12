<template>
  <div
    class="history-trend-graphic"
    :style="containerStyle"
  >
    <div
      v-if="tags.length === 0"
      class="empty-hint"
    >
      {{ $t('historyTrend.config.unbound') }}
    </div>
    <template v-else>
      <!-- 查询栏：时间段 + 查询方式，变更后自动查询（无需查询按钮） -->
      <div class="query-bar">
        <TimeRangePicker
          v-model="runtime.timeRange"
          mode="datetime"
          :presets="timePresets"
          size="sm"
          @change="onQuery"
        />
        <select
          v-model="runtime.interpolation"
          class="query-select"
          :title="$t('historyTrend.config.queryMethod')"
          @change="onQuery"
        >
          <option value="raw">{{ $t('historyTrend.options.interpolation.raw') }}</option>
          <option value="linear">{{ $t('historyTrend.options.interpolation.linear') }}</option>
          <option value="step">{{ $t('historyTrend.options.interpolation.step') }}</option>
        </select>
        <select
          v-if="runtime.interpolation !== 'raw'"
          v-model.number="runtime.interval"
          class="query-select"
          title="interval"
          @change="onQuery"
        >
          <option :value="500">500ms</option>
          <option :value="1000">1s</option>
          <option :value="5000">5s</option>
          <option :value="10000">10s</option>
          <option :value="30000">30s</option>
          <option :value="60000">1min</option>
        </select>
      </div>

      <VChart
        class="trend-chart"
        :option="chartOption"
        autoresize
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { i18n } from '@scada-editor/core';
import { dataQueryApi } from '@scada-editor/system';
import { TimeRangePicker, type TimeRange, registerChartModules, buildContainerStyle, buildTrendChartOption } from '@scada-editor/shared';
import VChart from 'vue-echarts';
import type { HistoryTrendTagBinding } from './HistoryTrendPlugin';

registerChartModules();

const props = defineProps<{
  w: number;
  h: number;
  tags: HistoryTrendTagBinding[];
  defaultInterpolation: string;
  defaultInterval: number;
  defaultPresetRange: string;
  defaultCustomStart: string;
  defaultCustomEnd: string;
  maxPoints: number;
  decimalPlaces: number;
  title: string;
  titleColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  gridColor: string;
  axisColor: string;
  showLegend: boolean;
  legendPosition: string;
  showTooltip: boolean;
  showDataZoom: boolean;
  showXAxis: boolean;
  xAxisLineColor: string;
  xAxisLabelFontSize: number;
  xAxisLabelRotate: number;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: string;
  borderRadius: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
}>();

const runtime = reactive<{
  timeRange: TimeRange;
  interpolation: 'raw' | 'linear' | 'step';
  interval: number;
}>({
  timeRange: { start: '', end: '' },
  interpolation: (props.defaultInterpolation as 'raw' | 'linear' | 'step') || 'raw',
  interval: Number(props.defaultInterval) || 1000,
});

const seriesData = ref<Array<{ tagId: string; data: Array<[number, number]> }>>([]);

const timePresets = [
  { label: i18n.global.t('historyTrend.options.presetRange.1h'), value: '1h' },
  { label: i18n.global.t('historyTrend.options.presetRange.6h'), value: '6h' },
  { label: i18n.global.t('historyTrend.options.presetRange.24h'), value: '24h' },
  { label: i18n.global.t('historyTrend.options.presetRange.7d'), value: '7d' },
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalDatetime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 组态时默认时间范围 → 运行态初始 TimeRange */
function initDefaultRange() {
  const now = new Date();
  const preset = props.defaultPresetRange || '1h';
  if (preset === 'custom' && props.defaultCustomStart && props.defaultCustomEnd) {
    runtime.timeRange = { start: props.defaultCustomStart, end: props.defaultCustomEnd };
    return;
  }
  let startMs = now.getTime() - 3600000;
  if (preset === '6h') startMs = now.getTime() - 6 * 3600000;
  else if (preset === '24h') startMs = now.getTime() - 24 * 3600000;
  else if (preset === '7d') startMs = now.getTime() - 7 * 86400000;
  runtime.timeRange = {
    start: toLocalDatetime(new Date(startMs)),
    end: toLocalDatetime(now),
  };
}

async function onQuery() {
  const tagIds = props.tags.map((t) => t.tagId).filter(Boolean);
  if (!tagIds.length || !runtime.timeRange.start || !runtime.timeRange.end) return;
  try {
    const res = await dataQueryApi.queryTrend({
      tagIds,
      startTime: new Date(runtime.timeRange.start).toISOString(),
      endTime: new Date(runtime.timeRange.end).toISOString(),
      maxPoints: Number(props.maxPoints) || 2000,
      projectId: props.tags[0]?.projectId,
      interpolation: runtime.interpolation,
      interval: runtime.interpolation !== 'raw' ? runtime.interval : undefined,
    });
    const pages = res?.data ?? [];
    seriesData.value = pages.map((p) => ({
      tagId: p.tagId,
      data: (p.data ?? [])
        .map((d) => [new Date(d.timestamp).getTime(), Number(d.value)] as [number, number])
        .filter(([t, v]) => !Number.isNaN(t) && !Number.isNaN(v)),
    }));
  } catch {
    seriesData.value = [];
  }
}

const containerStyle = computed(() => buildContainerStyle({
  backgroundColor: props.backgroundColor,
  borderColor: props.borderColor,
  borderWidth: props.borderWidth,
  borderStyle: props.borderStyle,
  borderRadius: props.borderRadius,
  shadowColor: props.shadowColor,
  shadowOffsetX: props.shadowOffsetX,
  shadowOffsetY: props.shadowOffsetY,
  shadowBlur: props.shadowBlur,
}, {
  display: 'flex',
  flexDirection: 'column',
}));

const chartOption = computed<any>(() => buildTrendChartOption({
  tags: props.tags,
  getSeriesData: (tagId) => seriesData.value.find((d) => d.tagId === tagId)?.data ?? [],
  title: props.title,
  titleColor: props.titleColor,
  titleFontSize: props.titleFontSize,
  titleFontWeight: props.titleFontWeight,
  gridColor: props.gridColor,
  axisColor: props.axisColor,
  showLegend: props.showLegend,
  legendPosition: props.legendPosition,
  showTooltip: props.showTooltip,
  showDataZoom: props.showDataZoom,
  showXAxis: props.showXAxis,
  xAxisLineColor: props.xAxisLineColor,
  xAxisLabelFontSize: props.xAxisLabelFontSize,
  xAxisLabelRotate: props.xAxisLabelRotate,
  decimalPlaces: props.decimalPlaces,
}));

onMounted(() => {
  initDefaultRange();
  onQuery();
});

// 绑定变更（增删变量）：重新查询
watch(
  () => props.tags.map((t) => t.tagId).join('|'),
  () => {
    if (props.tags.length) onQuery();
  },
);
</script>

<style scoped>
.history-trend-graphic {
  position: relative;
  font-family: Arial, sans-serif;
}

.query-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border, #dddddd);
  background: transparent;
}

.query-select {
  height: 24px;
  padding: 2px 6px;
  box-sizing: border-box;
  font-size: 11px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text-primary, #333333);
}

.trend-chart {
  flex: 1;
  min-height: 0;
}

.empty-hint {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-tertiary, #999999);
}
</style>
