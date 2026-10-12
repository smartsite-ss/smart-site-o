<template>
  <svg
    class="phmeter-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 50 70"
  >
    <desc>pH计</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 25 35)'">
      <rect
        x="10"
        y="5"
        width="30"
        height="45"
        rx="4"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <rect
        x="14"
        y="9"
        width="22"
        height="37"
        rx="2"
        :fill="colors[1]"
      />
      <g :class="effectiveCls">
        <text
          x="25"
          y="28"
          text-anchor="middle"
          font-size="11"
          fill="#fff"
          font-weight="bold"
        >{{ tagId ? (effectiveValue / 10).toFixed(1) : '--' }}</text>
        <rect
          x="14"
          y="40"
          width="22"
          height="4"
          rx="1"
        ><animate
          attributeName="fill"
          values="#ef4444;#eab308;#22c55e;#3b82f6;#8b5cf6;#8b5cf6"
          :dur="(dur*3)+'s'"
          repeatCount="indefinite"
        /></rect>
        <circle
          cx="18"
          cy="42"
          r="1.5"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="1;0.3;1"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="32"
          cy="42"
          r="1.5"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="0.3;1;0.3"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
      </g>
      <line
        x1="20"
        y1="52"
        x2="25"
        y2="65"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <line
        x1="30"
        y1="52"
        x2="25"
        y2="65"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <polygon
        points="21,65 29,65 25,70"
        :fill="pipeColor[0]"
      />
      <text
        x="25"
        y="69"
        text-anchor="middle"
        font-size="5"
        fill="#94a3b8"
      >{{ unit }}</text>
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

/** 动画方向：绑定实时值 → cls 映射，未绑定沿用静态 cls */
const effectiveCls = computed(() => {
  if (!props.tagId) return props.cls;
  const raw = currentValue.value;
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.forwardValue !== '' && rawStr === props.forwardValue) return 'svg_an_left';
  if (props.backwardValue !== '' && rawStr === props.backwardValue) return 'svg_an_right';
  if (props.stopValue !== '' && rawStr === props.stopValue) return 'svg_an_stop';
  return props.defaultCls;
});
</script>

<style scoped>
.phmeter-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
