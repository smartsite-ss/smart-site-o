<template>
  <svg
    class="ballmill-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 180 90`"
  >
    <desc>球磨机</desc>
    <g :transform="'rotate(' + roate + ')'">
      <rect
        x="2"
        y="28"
        width="176"
        height="34"
        rx="17"
        :fill="backgroundColor"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
        style="transform-box: fill-box; transform-origin: 90px 45px;"
      >
        <ellipse
          cx="30"
          cy="45"
          rx="12"
          ry="14"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
        />
        <ellipse
          cx="150"
          cy="45"
          rx="12"
          ry="14"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
        />
        <rect
          x="35"
          y="31"
          width="110"
          height="28"
          rx="4"
          :fill="backgroundColor"
          :stroke="colors[0]"
          :stroke-width="boardWidth"
        />
        <circle
          cx="55"
          cy="45"
          r="4"
          :fill="flowColor[0]"
        />
        <circle
          cx="80"
          cy="40"
          r="3"
          :fill="flowColor[0]"
        />
        <circle
          cx="100"
          cy="50"
          r="4"
          :fill="flowColor[0]"
        />
        <circle
          cx="125"
          cy="42"
          r="3"
          :fill="flowColor[0]"
        />
        <path
          d="M155,32 L168,38 L168,52 L155,58"
          fill="none"
          :stroke="colors[1]"
          :stroke-width="boardWidth + 1"
        />
        <circle
          cx="162"
          cy="45"
          r="10"
          fill="none"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
        />
        <line
          x1="162"
          y1="37"
          x2="162"
          y2="53"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <line
          x1="154"
          y1="45"
          x2="170"
          y2="45"
          :stroke="colors[1]"
          :stroke-width="1"
        />
      </g>
      <rect
        x="-2"
        y="36"
        width="8"
        height="18"
        rx="2"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <rect
        x="174"
        y="36"
        width="8"
        height="18"
        rx="2"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <text
        x="90"
        y="87"
        text-anchor="middle"
        :fill="pipeColor[0]"
        font-size="7"
      >BM</text>
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
.ballmill-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: mill_rotate var(--dur, 6s) linear infinite;
}

.svg_an_right {
  animation: mill_rotate_reverse var(--dur, 6s) linear infinite;
}

.svg_an_stop {
  animation: none;
}

@keyframes mill_rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes mill_rotate_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
</style>
