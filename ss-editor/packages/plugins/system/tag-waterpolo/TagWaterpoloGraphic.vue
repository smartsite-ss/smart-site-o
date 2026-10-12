<template>
  <div
    class="tag-waterpolo-graphic"
    :style="containerStyle"
  >
    <div
      v-if="tags.length === 0"
      class="waterpolo-hint"
    >{{ $t('tagWaterpolo.config.unbound') }}</div>
    <template v-else>
      <div
        v-if="title"
        class="waterpolo-title"
        :style="titleStyle"
      >{{ title }}</div>
      <div
        class="waterpolo-ball"
        :style="ballStyle"
      >
        <div
          class="waterpolo-fill"
          :style="fillStyle"
        />
        <div
          v-if="showValue"
          class="waterpolo-value"
          :style="valueStyle"
        >{{ displayValue }}</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { dataQueryApi, useWsStore } from '@scada-editor/system';
import {
  buildContainerStyle,
  formatNumber,
  useChartSource,
  type ChartDataSourceConfig,
  type ChartVariableBinding,
} from '@scada-editor/shared';

const props = defineProps<{
  w: number;
  h: number;
  tags: ChartVariableBinding[];
  title: string;
  titleColor: string;
  titleFontSize: number;
  unit: string;
  decimalPlaces: number;
  minValue: number;
  maxValue: number;
  showValue: boolean;
  valueColor: string;
  waterColor: string;
  trackColor: string;
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

const value = computed(() => {
  const first = result.value.series?.[0];
  const raw = Array.isArray(first?.data) ? Number(first.data[0] ?? 0) : 0;
  return Number.isFinite(raw) ? raw : 0;
});

const percentage = computed(() => {
  const range = Number(props.maxValue) - Number(props.minValue);
  if (range <= 0) return 0;
  return Math.max(0, Math.min(100, ((value.value - Number(props.minValue)) / range) * 100));
});

const displayValue = computed(() => `${formatNumber(value.value, props.decimalPlaces)}${props.unit}`);

const containerStyle = computed(() =>
  buildContainerStyle(
    {
      backgroundColor: props.backgroundColor,
      borderColor: props.borderColor,
      borderWidth: props.borderWidth,
      borderStyle: props.borderStyle,
      borderRadius: props.borderRadius,
      shadowColor: props.shadowColor,
      shadowOffsetX: props.shadowOffsetX,
      shadowOffsetY: props.shadowOffsetY,
      shadowBlur: props.shadowBlur,
    },
    { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  ),
);

const titleStyle = computed(() => ({
  color: props.titleColor,
  fontSize: `${props.titleFontSize}px`,
  fontWeight: '600',
}));

const ballSize = computed(() => {
  const reserve = props.title ? Number(props.titleFontSize) + 12 : 0;
  return Math.max(40, Math.min(props.w, props.h - reserve));
});

const ballStyle = computed(() => ({
  width: `${ballSize.value}px`,
  height: `${ballSize.value}px`,
  borderRadius: '50%',
  background: props.trackColor,
  position: 'relative',
  overflow: 'hidden',
}));

const fillStyle = computed(() => ({
  position: 'absolute',
  left: '0',
  right: '0',
  bottom: '0',
  height: `${percentage.value}%`,
  background: props.waterColor,
  borderRadius: '50% 50% 0 0',
  transition: 'height 0.35s ease',
}));

const valueStyle = computed(() => ({
  position: 'absolute',
  inset: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: props.valueColor,
  fontSize: `${Math.max(12, Math.round(ballSize.value * 0.16))}px`,
  fontWeight: '600',
}));
</script>

<style scoped>
.tag-waterpolo-graphic {
  position: relative;
  font-family: Arial, sans-serif;
  box-sizing: border-box;
}

.waterpolo-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.waterpolo-fill::before {
  content: '';
  position: absolute;
  top: -8px;
  left: -20%;
  width: 140%;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
}

.waterpolo-hint {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-tertiary, #999999);
}
</style>
