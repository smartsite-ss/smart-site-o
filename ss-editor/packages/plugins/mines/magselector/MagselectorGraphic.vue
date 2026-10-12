<template>
  <svg
    class="magselector-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="'0 0 160 90'"
  >
    <desc>磁选机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ',80,45)'">
      <rect
        x="5"
        y="8"
        width="30"
        height="20"
        :fill="pipeColor[0]"
        rx="2"
      />
      <line
        x1="35"
        y1="18"
        x2="55"
        y2="18"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <rect
        x="115"
        y="55"
        width="25"
        height="16"
        :fill="colors[1]"
        rx="2"
      />
      <rect
        x="115"
        y="22"
        width="25"
        height="14"
        :fill="flowColor[0]"
        rx="2"
      />
      <path
        d="M50,18 Q52,45 70,68 L90,68 Q108,45 110,18"
        :fill="none"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+3"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
        style="transform-box:fill-box; transform-origin:center;"
      >
        <ellipse
          cx="80"
          cy="42"
          rx="28"
          ry="24"
          :fill="colors[0]"
          stroke="#333"
          :stroke-width="boardWidth"
        />
        <rect
          x="62"
          y="32"
          width="6"
          height="6"
          :fill="flowColor[0]"
        />
        <rect
          x="76"
          y="26"
          width="6"
          height="6"
          :fill="flowColor[0]"
        />
        <rect
          x="92"
          y="32"
          width="6"
          height="6"
          :fill="flowColor[0]"
        />
        <rect
          x="69"
          y="48"
          width="6"
          height="6"
          :fill="flowColor[0]"
        />
        <rect
          x="85"
          y="48"
          width="6"
          height="6"
          :fill="flowColor[0]"
        />
      </g>
      <circle
        cx="58"
        cy="56"
        r="3"
        :fill="colors[1]"
      />
      <circle
        cx="102"
        cy="56"
        r="3"
        :fill="colors[1]"
      />
      <line
        x1="110"
        y1="29"
        x2="118"
        y2="29"
        :stroke="flowColor[0]"
        :stroke-width="2"
      />
      <line
        x1="95"
        y1="65"
        x2="115"
        y2="63"
        :stroke="colors[1]"
        :stroke-width="2"
      />
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
.magselector-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: ms_spin_left var(--dur, 3s) linear infinite;
}

.svg_an_right {
  animation: ms_spin_right var(--dur, 3s) linear infinite;
}

.svg_an_stop {
  animation: none;
}

@keyframes ms_spin_left {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes ms_spin_right {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
</style>
