<template>
  <div class="trend-chart-config">
    <div class="config-section">
      <h4>{{ $t('trendChart.label') }}</h4>
      <p class="desc">
        {{ $t('trendChart.description') }}
      </p>
      <div class="config-item">
        <label>{{ $t('trendChart.properties.maxPens') }}</label>
        <input
          v-model.number="localProps.maxPens"
          type="range"
          min="1"
          max="8"
        >
        <span class="value">{{ localProps.maxPens }}</span>
      </div>
      <div class="config-item">
        <label>{{ $t('trendChart.properties.timeWindow') }}</label>
        <select v-model.number="localProps.timeWindow">
          <option :value="30">
            30s
          </option>
          <option :value="60">
            60s
          </option>
          <option :value="120">
            120s
          </option>
          <option :value="300">
            5min
          </option>
          <option :value="600">
            10min
          </option>
          <option :value="1800">
            30min
          </option>
          <option :value="3600">
            1h
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { TrendChartProps } from './TrendChartPlugin';

const props = defineProps<{
  pluginProps: TrendChartProps;
}>();

const emit = defineEmits<{
  (e: 'update:pluginProps', props: Partial<TrendChartProps>): void;
}>();

const localProps = reactive({ ...props.pluginProps });

watch(
  () => props.pluginProps,
  (newProps) => {
    Object.assign(localProps, newProps);
  },
  { deep: true },
);

watch(
  localProps,
  (newProps) => {
    emit('update:pluginProps', { ...newProps });
  },
  { deep: true },
);
</script>

<style scoped>
.trend-chart-config {
  padding: 8px;
  font-size: 12px;
}
.config-section {
  margin-bottom: 12px;
}
.config-section h4 {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--text);
}
.config-section .desc {
  margin: 0 0 8px;
  color: var(--text-secondary);
  font-size: 11px;
}
.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.config-item label {
  flex-shrink: 0;
  width: 80px;
  color: var(--text);
}
.config-item .value {
  width: 30px;
  text-align: center;
  color: var(--text);
}
.config-item select {
  flex: 1;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
}
.config-item input[type="range"] {
  flex: 1;
}
</style>