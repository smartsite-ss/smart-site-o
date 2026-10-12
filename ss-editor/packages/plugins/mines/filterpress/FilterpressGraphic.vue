<template>
  <svg
    class="filterpress-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 200 100`"
  >
    <desc>压滤机</desc>
    <g :transform="'rotate(' + roate + ')'">
      <rect
        x="4"
        y="25"
        width="176"
        height="50"
        rx="3"
        :fill="backgroundColor"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >
        <rect
          x="12"
          y="30"
          width="10"
          height="40"
          rx="2"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <rect
          x="28"
          y="30"
          width="10"
          height="40"
          rx="2"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <rect
          x="44"
          y="30"
          width="10"
          height="40"
          rx="2"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <rect
          x="60"
          y="30"
          width="10"
          height="40"
          rx="2"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <rect
          x="76"
          y="30"
          width="10"
          height="40"
          rx="2"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <rect
          x="92"
          y="30"
          width="10"
          height="40"
          rx="2"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <rect
          x="108"
          y="30"
          width="10"
          height="40"
          rx="2"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <rect
          x="124"
          y="30"
          width="10"
          height="40"
          rx="2"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <rect
          x="140"
          y="30"
          width="10"
          height="40"
          rx="2"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <rect
          x="156"
          y="30"
          width="10"
          height="40"
          rx="2"
          :fill="colors[0]"
          :stroke="colors[1]"
          :stroke-width="1"
        />
      </g>
      <rect
        x="182"
        y="35"
        width="14"
        height="30"
        rx="2"
        :fill="colors[1]"
      />
      <circle
        cx="189"
        cy="42"
        r="4"
        :fill="flowColor[0]"
      />
      <line
        x1="186"
        y1="76"
        x2="192"
        y2="88"
        :stroke="flowColor[0]"
        :stroke-width="1"
        stroke-dasharray="2,2"
      />
      <line
        x1="193"
        y1="76"
        x2="197"
        y2="88"
        :stroke="flowColor[0]"
        :stroke-width="1"
        stroke-dasharray="2,2"
      />
      <text
        x="100"
        y="97"
        text-anchor="middle"
        :fill="pipeColor[0]"
        font-size="7"
      >FP</text>
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
.filterpress-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: plate_compress var(--dur, 6s) ease-in-out infinite;
}

.svg_an_right {
  animation: plate_release var(--dur, 6s) ease-in-out infinite;
}

.svg_an_stop {
  animation: none;
}

@keyframes plate_compress {
  0%, 100% { transform: scaleX(1); }
  50% { transform: scaleX(0.96); }
}

@keyframes plate_release {
  0%, 100% { transform: scaleX(1); }
  50% { transform: scaleX(1.02); }
}
</style>
