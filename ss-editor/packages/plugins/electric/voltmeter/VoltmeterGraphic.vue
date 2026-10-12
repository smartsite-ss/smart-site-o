<template>
  <svg
    class="voltmeter-graphic"
    :width="w"
    :height="h"
    :viewBox="`0 0 ${w} ${h}`"
    :title="bindTitle"
    style="display: block; overflow: visible;"
  >
    <rect
      v-if="backgroundColor && backgroundColor !== '#00000000'"
      :width="w"
      :height="h"
      :fill="backgroundColor"
    />
    <g :transform="`translate(${cx}, ${cy})`">
      <circle
        cx="0"
        cy="0"
        :r="circleR"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <text
        x="0"
        :y="symbolY"
        :fill="color"
        :font-size="symbolFontSize"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, sans-serif"
        font-weight="bold"
      >V</text>
      <text
        v-if="showDigital"
        x="0"
        :y="digitalY"
        :fill="color"
        :font-size="digitalFontSize"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, sans-serif"
      >{{ digitalText }}</text>
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

const cx = computed(() => props.w / 2);
const cy = computed(() => props.h / 2);
const circleR = computed(() => Math.min(props.w, props.h) * 0.42);

const symbolFontSize = computed(() => circleR.value * (props.showDigital ? 0.55 : 0.75));
const digitalFontSize = computed(() => circleR.value * 0.5);
const symbolY = computed(() => (props.showDigital ? -circleR.value * 0.24 : 4));
const digitalY = computed(() => circleR.value * 0.4);

/** 绑定标签时取实时值，否则回退静态 dataset */
const effectiveValue = computed(() => (props.tagId ? currentValue.value : props.dataset));

const digitalText = computed(() => {
  if (!props.tagId) return '--';
  const base = formatNumeric(effectiveValue.value);
  return props.unit ? `${base}${props.unit}` : base;
});

function formatNumeric(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '--';
  if (typeof raw === 'boolean') return String(raw);
  const num = Number(raw);
  if (!Number.isNaN(num) && Number.isFinite(num)) return num.toFixed(props.decimalPlaces ?? 2);
  return String(raw);
}
</script>

<style scoped>
.voltmeter-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
