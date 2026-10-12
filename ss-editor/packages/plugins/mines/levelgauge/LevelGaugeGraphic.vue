<template>
  <svg
    class="levelgauge-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 40 120`"
  >
    <desc>液位计</desc>
    <g>
      <rect
        x="10"
        y="6"
        width="20"
        height="108"
        rx="4"
        :fill="backgroundColor"
        :stroke="'#374151'"
        :stroke-width="lineWidth"
      />
      <rect
        x="12"
        :y="110 - liquidHeight"
        width="16"
        :height="liquidHeight"
        rx="2"
        :fill="color"
        opacity="0.8"
      />
      <line
        x1="7"
        y1="16"
        x2="13"
        y2="16"
        :stroke="'#9ca3af'"
        :stroke-width="0.5"
      />
      <line
        x1="7"
        y1="36"
        x2="13"
        y2="36"
        :stroke="'#9ca3af'"
        :stroke-width="0.5"
      />
      <line
        x1="7"
        y1="56"
        x2="13"
        y2="56"
        :stroke="'#9ca3af'"
        :stroke-width="0.5"
      />
      <line
        x1="7"
        y1="76"
        x2="13"
        y2="76"
        :stroke="'#9ca3af'"
        :stroke-width="0.5"
      />
      <line
        x1="7"
        y1="96"
        x2="13"
        y2="96"
        :stroke="'#9ca3af'"
        :stroke-width="0.5"
      />
      <text
        v-if="showNumeric"
        x="34"
        y="62"
        text-anchor="start"
        :fill="color"
        font-size="9"
        font-weight="bold"
      >{{ tagId ? effectiveValue + unit : '--' }}</text>
      <text
        x="20"
        y="118"
        text-anchor="middle"
        fill="#9ca3af"
        font-size="5"
      >LG</text>
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
  showNumeric: boolean;
  unit: string;
  decimalPlaces: number;
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

/** 液位高度：由有效数据值 0-100 映射 */
const liquidHeight = computed(() => {
  return Math.max(0, Math.min(100, effectiveValue.value)) * 1;
});
</script>

<style scoped>
.levelgauge-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
