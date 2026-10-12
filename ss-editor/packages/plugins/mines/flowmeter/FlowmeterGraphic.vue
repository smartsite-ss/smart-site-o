<template>
  <svg
    class="flowmeter-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 70 70`"
  >
    <desc>流量计</desc>
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
      <circle
        v-for="i in 11"
        :key="'tick-' + i"
        :cx="35 + 23 * Math.cos((Math.PI * (i - 6)) / 7)"
        :cy="35 + 23 * Math.sin((Math.PI * (i - 6)) / 7)"
        r="1.5"
        :fill="i % 3 === 0 ? '#aaa' : '#666'"
      />
      <text
        x="35"
        y="14"
        font-size="5"
        fill="#888"
        text-anchor="middle"
      >{{ rangeMax }}</text>
      <text
        x="56"
        y="38"
        font-size="4.5"
        fill="#888"
        text-anchor="start"
      >{{ unit }}</text>
      <line
        x1="35"
        y1="35"
        :x2="35 + 18 * Math.cos((Math.PI * (effectiveValue / 100 - 0.5)))"
        :y2="35 + 18 * Math.sin((Math.PI * (effectiveValue / 100 - 0.5)))"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
        class="needle"
      />
      <circle
        cx="35"
        cy="35"
        r="4"
        fill="#333"
      />
      <circle
        cx="35"
        cy="35"
        r="2"
        :fill="color"
      />
      <g v-if="showDigital">
        <rect
          x="22"
          y="50"
          width="26"
          height="10"
          rx="2"
          fill="#0d1117"
          stroke="#333"
          stroke-width="0.5"
        />
        <text
          x="35"
          y="58"
          font-size="7"
          :fill="color"
          text-anchor="middle"
          font-family="monospace"
          font-weight="bold"
        >
          {{ tagId ? (effectiveValue * rangeMax / 100).toFixed(decimalPlaces) : '--' }}
        </text>
      </g>
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
  showDigital: boolean;
  rangeMax: number;
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
.flowmeter-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
