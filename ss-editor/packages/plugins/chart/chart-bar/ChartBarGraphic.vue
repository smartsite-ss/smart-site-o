<template>
  <div
    class="chart-bar-graphic"
    :style="containerStyle"
  >
    <div
      v-if="result.state === 'empty'"
      class="chart-hint"
    >{{ $t('chartBar.config.noData') }}</div>
    <div
      v-else-if="result.state === 'error'"
      class="chart-hint chart-hint--error"
    >{{ result.error || $t('chartBar.config.loadError') }}</div>
    <VChart
      v-else
      class="chart-canvas"
      :option="chartOption"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import {
  registerChartModules,
  buildContainerStyle,
  buildBarChartOption,
  useChartSource,
  DEFAULT_TREND_COLORS,
  type ChartDataSourceConfig,
} from '@scada-editor/shared';

registerChartModules();

const props = defineProps<{
  w: number;
  h: number;
  dataSource: ChartDataSourceConfig;
  title: string;
  titleColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  horizontal: boolean;
  gridColor: string;
  axisColor: string;
  showLegend: boolean;
  legendPosition: string;
  showTooltip: boolean;
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

const { result } = useChartSource(() => props.dataSource);

const containerStyle = computed(() =>
  buildContainerStyle({
    backgroundColor: props.backgroundColor,
    borderColor: props.borderColor,
    borderWidth: props.borderWidth,
    borderStyle: props.borderStyle,
    borderRadius: props.borderRadius,
    shadowColor: props.shadowColor,
    shadowOffsetX: props.shadowOffsetX,
    shadowOffsetY: props.shadowOffsetY,
    shadowBlur: props.shadowBlur,
  }),
);

const chartOption = computed<Record<string, unknown>>(() =>
  buildBarChartOption({
    result: result.value,
    title: props.title,
    titleColor: props.titleColor,
    titleFontSize: props.titleFontSize,
    titleFontWeight: props.titleFontWeight,
    gridColor: props.gridColor,
    axisColor: props.axisColor,
    showLegend: props.showLegend,
    legendPosition: props.legendPosition,
    showTooltip: props.showTooltip,
    palette: DEFAULT_TREND_COLORS,
    horizontal: props.horizontal,
  }),
);
</script>

<style scoped>
.chart-bar-graphic {
  position: relative;
  font-family: Arial, sans-serif;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.chart-hint {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-tertiary, #999999);
}

.chart-hint--error {
  color: var(--status-error, #d03050);
}
</style>
