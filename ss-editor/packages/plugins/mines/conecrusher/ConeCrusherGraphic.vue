<template>
  <svg
    class="conecrusher-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 100 120`"
  >
    <desc>圆锥破碎机</desc>
    <g :transform="'rotate(' + roate + ')'">
      <path
        d="M10,110 L90,110 L75,30 L25,30 Z"
        :fill="backgroundColor"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
        style="transform-box: fill-box; transform-origin: 50px 35px;"
      >
        <polygon
          points="50,12 68,55 50,95 32,55"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
        />
        <ellipse
          cx="50"
          cy="15"
          rx="14"
          ry="6"
          :fill="colors[1]"
        />
        <circle
          cx="50"
          cy="50"
          r="8"
          :fill="flowColor[0]"
          opacity="0.6"
        />
      </g>
      <rect
        x="38"
        y="2"
        width="24"
        height="12"
        rx="3"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <polygon
        points="40,112 60,112 55,118 45,118"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <text
        x="50"
        y="119"
        text-anchor="middle"
        font-size="7"
        fill="#9ca3af"
      >CC</text>
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
.conecrusher-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: cone_swing var(--dur, 4s) ease-in-out infinite;
}

.svg_an_right {
  animation: cone_swing_reverse var(--dur, 4s) ease-in-out infinite;
}

.svg_an_stop {
  animation: none;
}

@keyframes cone_swing {
  0%, 100% { transform: rotate(0deg) translateX(0); }
  33% { transform: rotate(5deg) translateX(2px); }
  66% { transform: rotate(-5deg) translateX(-2px); }
}

@keyframes cone_swing_reverse {
  0%, 100% { transform: rotate(0deg) translateX(0); }
  33% { transform: rotate(-5deg) translateX(-2px); }
  66% { transform: rotate(5deg) translateX(2px); }
}
</style>
