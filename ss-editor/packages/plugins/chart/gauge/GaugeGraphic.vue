<template>
  <div
    class="gauge-graphic"
    :style="containerStyle"
  >
    <div
      v-if="result.state === 'empty'"
      class="gauge-hint"
    >{{ $t('chartGauge.config.noData') }}</div>
    <div
      v-else-if="result.state === 'error'"
      class="gauge-hint gauge-hint--error"
    >{{ result.error || $t('chartGauge.config.loadError') }}</div>
    <VChart
      v-else
      class="gauge-canvas"
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
  buildGaugeChartOption,
  useChartSource,
  type ChartDataResult,
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
  value: number;
  minValue: number;
  maxValue: number;
  unit: string;
  startAngle: number;
  endAngle: number;
  labelColor: string;
  valueColor: string;
  needleColor: string;
  tickColor: string;
  normalColor: string;
  warningColor: string;
  dangerColor: string;
  showTicks: boolean;
  showLabels: boolean;
  showValue: boolean;
  majorTicks: number;
  warningValue: number;
  dangerValue: number;
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

const sourceConfig = computed<ChartDataSourceConfig>(
  () =>
    props.dataSource ?? {
      type: 'static',
      staticConfig: {
        dimensions: ['name', 'value'],
        source: [{ name: '仪表', value: Number(props.value) }],
      },
    },
);

const { result } = useChartSource(() => sourceConfig.value);

/** 从静态/API（source）或数据库（series）结果中提取表盘数值，缺省回退 value 属性 */
function extractGaugeValue(res: ChartDataResult): number {
  const row = res.source?.[0];
  if (row && typeof row === 'object') {
    for (const key of Object.keys(row)) {
      if (key === 'name') continue;
      const num = Number(row[key]);
      if (Number.isFinite(num)) return num;
    }
  }
  const first = res.series?.[0];
  if (first && Array.isArray(first.data) && first.data.length > 0) {
    const num = Number(first.data[0]);
    if (Number.isFinite(num)) return num;
  }
  return Number(props.value);
}

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
  buildGaugeChartOption({
    value: extractGaugeValue(result.value),
    minValue: props.minValue,
    maxValue: props.maxValue,
    unit: props.unit,
    title: props.title,
    titleColor: props.titleColor,
    titleFontSize: props.titleFontSize,
    startAngle: props.startAngle,
    endAngle: props.endAngle,
    labelColor: props.labelColor,
    valueColor: props.valueColor,
    needleColor: props.needleColor,
    tickColor: props.tickColor,
    normalColor: props.normalColor,
    warningColor: props.warningColor,
    dangerColor: props.dangerColor,
    showTicks: props.showTicks,
    showLabels: props.showLabels,
    showValue: props.showValue,
    majorTicks: props.majorTicks,
    warningValue: props.warningValue,
    dangerValue: props.dangerValue,
  }),
);
</script>

<style scoped>
.gauge-graphic {
  position: relative;
  font-family: Arial, sans-serif;
}

.gauge-canvas {
  width: 100%;
  height: 100%;
}

.gauge-hint {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-tertiary, #999999);
}

.gauge-hint--error {
  color: var(--status-error, #d03050);
}
</style>
