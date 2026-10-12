<template>
  <svg
    class="loadcell-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 50 30"
  >
    <desc>称重传感器</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 25 15)'">
      <rect
        x="3"
        y="6"
        width="44"
        height="18"
        rx="4"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <g :class="effectiveCls">
        <text
          x="25"
          y="18"
          text-anchor="middle"
          font-size="9"
          fill="#fff"
          font-weight="bold"
        >{{ tagId ? Math.round(effectiveValue) + unit : '--' }}</text>
        <rect
          x="6"
          y="8"
          :width="(effectiveValue / 100) * 38"
          height="14"
          rx="2"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="0.4;1;0.4"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></rect>
        <line
          x1="25"
          y1="24"
          x2="25"
          y2="28"
          :stroke="pipeColor[0]"
          :stroke-width="boardWidth"
        />
        <circle
          cx="25"
          cy="28"
          r="2"
          :fill="pipeColor[0]"
        />
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
  colors: string[];
  flowColor: string[];
  pipeColor: string[];
  backgroundColor: string;
  bgWidth: number;
  boardWidth: number;
  roate: number;
  cls: string;
  dur: number;
  dataset: number;
  decimalPlaces: number;
  unit: string;
  forwardValue: string;
  backwardValue: string;
  stopValue: string;
  defaultCls: string;
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
.loadcell-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
