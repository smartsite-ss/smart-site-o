<template>
  <svg
    class="pressuregauge-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 70 70`"
  >
    <desc>压力表</desc>
    <g>
      <circle
        cx="35"
        cy="35"
        r="33"
        :fill="backgroundColor"
        stroke="#333"
        stroke-width="1.5"
      />
      <circle
        cx="35"
        cy="35"
        r="28"
        fill="#16213e"
        stroke="#444"
        stroke-width="0.8"
      />
      <path
        d="M14 35 A21 21 0 0 1 56 35"
        fill="none"
        stroke="#333"
        stroke-width="6"
        opacity="0.3"
      />
      <line
        v-for="i in 11"
        :key="'tick-' + i"
        :x1="35 + 22 * Math.cos((Math.PI * (i - 6)) / 7)"
        :y1="35 + 22 * Math.sin((Math.PI * (i - 6)) / 7)"
        :x2="35 + (i % 3 === 0 ? 26 : 24) * Math.cos((Math.PI * (i - 6)) / 7)"
        :y2="35 + (i % 3 === 0 ? 26 : 24) * Math.sin((Math.PI * (i - 6)) / 7)"
        :stroke="i % 3 === 0 ? '#ccc' : '#666'"
        :stroke-width="i % 3 === 0 ? 1.2 : 0.8"
      />
      <text
        x="13"
        y="38"
        font-size="5"
        fill="#888"
        text-anchor="end"
      >0</text>
      <text
        x="57"
        y="38"
        font-size="5"
        fill="#888"
        text-anchor="start"
      >{{ maxPressure }}</text>
      <text
        x="35"
        y="15"
        font-size="5"
        fill="#888"
        text-anchor="middle"
      >{{ unit }}</text>
      <line
        x1="35"
        y1="35"
        :x2="35 + 17 * Math.cos((Math.PI * (effectiveValue / 100 - 0.5)))"
        :y2="35 + 17 * Math.sin((Math.PI * (effectiveValue / 100 - 0.5)))"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
        class="needle"
      />
      <circle
        cx="35"
        cy="35"
        r="4"
        fill="#222"
      />
      <circle
        cx="35"
        cy="35"
        r="2"
        :fill="color"
      />
      <text
        x="35"
        y="58"
        font-size="6"
        :fill="color"
        text-anchor="middle"
        font-family="monospace"
        font-weight="bold"
      >
        {{ tagId ? ((effectiveValue / 100) * maxPressure).toFixed(1) : '--' }}
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTagValue } from '@scada-editor/system';

const props = defineProps<{
  w: number;
  h: number;
  color: string;
  backgroundColor: string;
  lineWidth: number;
  dataset: number;
  maxPressure: number;
  decimalPlaces: number;
  unit: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
}>();

const { currentValue, bindTitle } = useTagValue(props);

/** 数据值：绑定实时值，未绑定用静态 dataset */
const effectiveValue = computed(() => {
  if (!props.tagId) return props.dataset;
  const v = currentValue.value;
  return v === null || v === undefined ? props.dataset : Number(v);
});
</script>

<style scoped>
.pressuregauge-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
