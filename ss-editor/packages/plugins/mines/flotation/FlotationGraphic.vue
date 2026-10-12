<template>
  <svg
    class="flotation-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 140 100`"
  >
    <desc>浮选机</desc>
    <g :transform="'rotate(' + roate + ')'">
      <rect
        x="8"
        y="18"
        width="124"
        height="68"
        rx="3"
        :fill="backgroundColor"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <rect
        x="12"
        y="10"
        width="116"
        height="10"
        rx="2"
        :fill="pipeColor[0]"
        opacity="0.4"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
        style="transform-box: fill-box; transform-origin: 70px 52px;"
      >
        <circle
          cx="70"
          cy="52"
          r="14"
          fill="none"
          :stroke="colors[0]"
          :stroke-width="boardWidth + 1"
        />
        <line
          x1="62"
          y1="44"
          x2="78"
          y2="60"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
        />
        <line
          x1="78"
          y1="44"
          x2="62"
          y2="60"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
        />
        <circle
          cx="56"
          cy="26"
          r="3"
          :fill="flowColor[0]"
          opacity="0.7"
        />
        <circle
          cx="84"
          cy="30"
          r="2.5"
          :fill="flowColor[0]"
          opacity="0.6"
        />
        <circle
          cx="48"
          cy="34"
          r="2"
          :fill="flowColor[0]"
          opacity="0.5"
        />
        <circle
          cx="92"
          cy="38"
          r="2.5"
          :fill="flowColor[0]"
          opacity="0.6"
        />
        <circle
          cx="64"
          cy="22"
          r="2"
          :fill="flowColor[0]"
          opacity="0.5"
        />
        <circle
          cx="76"
          cy="24"
          r="1.8"
          :fill="flowColor[0]"
          opacity="0.5"
        />
      </g>
      <polygon
        points="55,88 85,88 80,95 60,95"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <text
        x="70"
        y="99"
        text-anchor="middle"
        font-size="7"
        fill="#9ca3af"
      >FL</text>
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
.flotation-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: impeller_spin var(--dur, 4s) linear infinite;
}

.svg_an_right {
  animation: impeller_spin_reverse var(--dur, 4s) linear infinite;
}

.svg_an_stop {
  animation: none;
}

@keyframes impeller_spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes impeller_spin_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
</style>
