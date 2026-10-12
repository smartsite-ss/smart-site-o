<template>
  <svg
    class="slurrypump-graphic"
    :width="w"
    :height="h"
    :viewBox="`0 0 100 80`"
  >
    <desc>泥浆泵</desc>
    <g :transform="'rotate(' + roate + ')'">
      <ellipse
        cx="22"
        cy="40"
        rx="16"
        ry="24"
        :fill="backgroundColor"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <ellipse
        cx="78"
        cy="40"
        rx="14"
        ry="20"
        :fill="backgroundColor"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <rect
        x="30"
        y="26"
        width="42"
        height="28"
        rx="6"
        :fill="backgroundColor"
        :stroke="colors[0]"
        :stroke-width="boardWidth"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
        style="transform-box: fill-box; transform-origin: 51px 40px;"
      >
        <path
          d="M38,32 Q51,36 64,32 Q51,44 38,48 Q51,52 64,48"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="2"
          stroke-linecap="round"
        />
        <path
          d="M38,34 Q51,38 64,34 Q51,46 38,46"
          fill="none"
          :stroke="colors[1]"
          :stroke-width="1.5"
          stroke-linecap="round"
        />
        <circle
          cx="82"
          cy="40"
          r="8"
          fill="none"
          :stroke="colors[0]"
          :stroke-width="boardWidth"
        />
        <line
          x1="78"
          y1="36"
          x2="86"
          y2="44"
          :stroke="colors[1]"
          :stroke-width="1.5"
        />
        <line
          x1="86"
          y1="36"
          x2="78"
          y2="44"
          :stroke="colors[1]"
          :stroke-width="1.5"
        />
      </g>
      <rect
        x="-6"
        y="34"
        width="12"
        height="12"
        rx="2"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <rect
        x="94"
        y="34"
        width="10"
        height="12"
        rx="2"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <text
        x="50"
        y="77"
        text-anchor="middle"
        :fill="pipeColor[0]"
        font-size="7"
      >SP</text>
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
.slurrypump-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: screw_rotate var(--dur, 4s) linear infinite;
}

.svg_an_right {
  animation: screw_rotate_reverse var(--dur, 4s) linear infinite;
}

.svg_an_stop {
  animation: none;
}

@keyframes screw_rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes screw_rotate_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
</style>
