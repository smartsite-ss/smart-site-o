<template>
  <svg
    class="thickener-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 160 130`"
  >
    <desc>浓密机</desc>
    <g :transform="'rotate(' + roate + ')'">
      <ellipse
        cx="80"
        cy="70"
        rx="70"
        ry="50"
        :fill="backgroundColor"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <line
        x1="80"
        y1="20"
        x2="80"
        y2="70"
        :stroke="colors[0]"
        :stroke-width="boardWidth"
      />
      <rect
        x="74"
        y="6"
        width="12"
        height="16"
        rx="2"
        :fill="colors[1]"
      />
      <rect
        x="68"
        y="2"
        width="24"
        height="6"
        rx="2"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
        style="transform-box: fill-box; transform-origin: 80px 70px;"
      >
        <line
          x1="80"
          y1="70"
          x2="20"
          y2="75"
          :stroke="colors[0]"
          :stroke-width="boardWidth"
        />
        <line
          x1="80"
          y1="70"
          x2="140"
          y2="75"
          :stroke="colors[0]"
          :stroke-width="boardWidth"
        />
        <line
          x1="50"
          y1="72"
          x2="45"
          y2="82"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <line
          x1="110"
          y1="72"
          x2="115"
          y2="82"
          :stroke="colors[1]"
          :stroke-width="1"
        />
        <circle
          cx="25"
          cy="78"
          r="3"
          :fill="flowColor[0]"
        />
        <circle
          cx="135"
          cy="78"
          r="3"
          :fill="flowColor[0]"
        />
      </g>
      <ellipse
        cx="80"
        cy="95"
        rx="35"
        ry="12"
        fill="none"
        :stroke="flowColor[0]"
        :stroke-width="1"
        stroke-dasharray="4,3"
        opacity="0.5"
      />
      <polygon
        points="72,120 88,120 84,127 76,127"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <text
        x="80"
        y="129"
        text-anchor="middle"
        font-size="7"
        fill="#9ca3af"
      >TK</text>
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
.thickener-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: rake_rotate var(--dur, 10s) linear infinite;
}

.svg_an_right {
  animation: rake_rotate_reverse var(--dur, 10s) linear infinite;
}

.svg_an_stop {
  animation: none;
}

@keyframes rake_rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes rake_rotate_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
</style>
