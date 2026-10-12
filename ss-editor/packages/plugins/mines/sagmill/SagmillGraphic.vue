<template>
  <svg
    class="sagmill-graphic"
    :width="w"
    :height="h"
    viewBox="0 0 170 95"
  >
    <desc>半自磨机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 85 47.5)'">
      <rect
        x="5"
        y="15"
        width="160"
        height="65"
        rx="32"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <g
        :class="effectiveCls"
        style="transform-box:fill-box; transform-origin:center;"
      >
        <line
          x1="25"
          y1="30"
          x2="145"
          y2="30"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
          stroke-dasharray="8 6"
        />
        <line
          x1="30"
          y1="47.5"
          x2="140"
          y2="47.5"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
          stroke-dasharray="12 8"
        />
        <line
          x1="25"
          y1="65"
          x2="145"
          y2="65"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
          stroke-dasharray="8 6"
        />
        <circle
          cx="85"
          cy="35"
          r="6"
          :fill="flowColor[0]"
        />
        <circle
          cx="70"
          cy="47.5"
          r="5"
          :fill="flowColor[0]"
        />
        <circle
          cx="100"
          cy="47.5"
          r="5"
          :fill="flowColor[0]"
        />
        <circle
          cx="85"
          cy="60"
          r="6"
          :fill="flowColor[0]"
        />
      </g>
      <rect
        x="0"
        y="35"
        width="10"
        height="25"
        rx="2"
        :fill="pipeColor[0]"
      />
      <rect
        x="160"
        y="35"
        width="10"
        height="25"
        rx="2"
        :fill="pipeColor[0]"
      />
      <text
        x="85"
        y="92"
        text-anchor="middle"
        font-size="9"
        fill="#94a3b8"
      >SAG MILL</text>
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
.sagmill-graphic { width: 100%; height: 100%; display: block; }
.svg_an_left {
  animation: sagmill_rotate var(--dur, 5s) linear infinite;
  transform-origin: center;
}
.svg_an_right {
  animation: sagmill_rotate_reverse var(--dur, 5s) linear infinite;
  transform-origin: center;
}
.svg_an_stop {}
@keyframes sagmill_rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes sagmill_rotate_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
</style>
