<template>
  <svg
    class="cyclone-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 60 100`"
  >
    <desc>旋流器</desc>
    <g :transform="'rotate(' + roate + ')'">
      <path
        d="M15,8 L45,8 L42,88 L18,88 Z"
        :fill="backgroundColor"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <rect
        x="-6"
        y="28"
        width="14"
        height="8"
        rx="2"
        :fill="pipeColor[0]"
        opacity="0.6"
      />
      <rect
        x="24"
        y="2"
        width="12"
        height="10"
        rx="2"
        :fill="pipeColor[0]"
        opacity="0.6"
      />
      <polygon
        points="26,90 34,90 32,97 28,97"
        :fill="pipeColor[0]"
        opacity="0.6"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
        style="transform-box: fill-box; transform-origin: 30px 48px;"
      >
        <path
          d="M22,14 Q38,22 22,30 Q38,38 22,46 Q38,54 22,62 Q38,70 22,78"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="1.5"
          stroke-dasharray="3,2"
          stroke-linecap="round"
        />
        <circle
          cx="30"
          cy="16"
          r="5"
          fill="none"
          :stroke="colors[0]"
          :stroke-width="boardWidth"
        />
        <line
          x1="25"
          y1="20"
          x2="35"
          y2="12"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <line
          x1="25"
          y1="12"
          x2="35"
          y2="20"
          :stroke="colors[1]"
          :stroke-width="1"
        />
      </g>
      <text
        x="30"
        y="99"
        text-anchor="middle"
        font-size="6"
        fill="#9ca3af"
      >CY</text>
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
.cyclone-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: vortex_spin var(--dur, 3s) linear infinite;
}

.svg_an_right {
  animation: vortex_spin_reverse var(--dur, 3s) linear infinite;
}

.svg_an_stop {
  animation: none;
}

@keyframes vortex_spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes vortex_spin_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
</style>
