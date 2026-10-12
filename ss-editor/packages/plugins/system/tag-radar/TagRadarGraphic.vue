<template>
  <div
    class="tag-radar-graphic"
    :style="containerStyle"
  >
    <div
      v-if="tags.length === 0"
      class="radar-hint"
    >{{ $t('tagRadar.config.unbound') }}</div>
    <div
      v-else-if="result.state === 'error'"
      class="radar-hint radar-hint--error"
    >{{ result.error || $t('tagRadar.config.loadError') }}</div>
    <VChart
      v-else
      class="radar-canvas"
      :option="chartOption"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { dataQueryApi, useWsStore } from '@scada-editor/system';
import {
  registerChartModules,
  buildContainerStyle,
  buildRadarChartOption,
  latestSeriesToCategoryResult,
  useChartSource,
  DEFAULT_TREND_COLORS,
  type ChartDataSourceConfig,
  type ChartVariableBinding,
} from '@scada-editor/shared';

registerChartModules();

const props = defineProps<{
  w: number;
  h: number;
  tags: ChartVariableBinding[];
  title: string;
  titleColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  indicatorMax: number;
  decimalPlaces: number;
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

const wsStore = useWsStore();

const sourceConfig = computed<ChartDataSourceConfig>(() => ({
  type: 'database',
  databaseConfig: { mode: 'latest', tags: props.tags },
}));

const { result } = useChartSource(() => sourceConfig.value, { dataQueryApi, wsStore });

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
  buildRadarChartOption({
    result: latestSeriesToCategoryResult(result.value),
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
    indicatorMax: props.indicatorMax,
    decimalPlaces: props.decimalPlaces,
  }),
);
</script>

<style scoped>
.tag-radar-graphic {
  position: relative;
  font-family: Arial, sans-serif;
}

.radar-canvas {
  width: 100%;
  height: 100%;
}

.radar-hint {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-tertiary, #999999);
}

.radar-hint--error {
  color: var(--status-error, #d03050);
}
</style>
