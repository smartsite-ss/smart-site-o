<template>
  <svg
    class="circscreen-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 120 120"
  >
    <desc>圆振动筛</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 60 55)'">
      <g :class="effectiveCls">
        <rect
          x="10"
          y="30"
          width="100"
          height="50"
          rx="4"
          :fill="colors[0]"
          :stroke="pipeColor[0]"
          :stroke-width="boardWidth"
        />
        <line
          x1="20"
          y1="42"
          x2="100"
          y2="42"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
          stroke-dasharray="3 3"
        />
        <line
          x1="20"
          y1="55"
          x2="100"
          y2="55"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
          stroke-dasharray="3 3"
        />
        <line
          x1="20"
          y1="68"
          x2="100"
          y2="68"
          :stroke="colors[1]"
          :stroke-width="boardWidth"
          stroke-dasharray="3 3"
        />
        <circle
          cx="25"
          cy="48"
          r="3"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="25;95;25"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="40"
          cy="61"
          r="3"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="40;90;40"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="55"
          cy="47"
          r="3"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="55;98;55"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="70"
          cy="63"
          r="3"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="70;92;70"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <rect
          x="45"
          y="80"
          width="30"
          height="12"
          rx="3"
          :fill="pipeColor[0]"
        />
        <circle
          cx="60"
          cy="86"
          r="5"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth - 1"
        />
      </g>
      <path
        d="M10 85 L110 85"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth + 1"
      />
      <text
        x="60"
        y="115"
        text-anchor="middle"
        font-size="8"
        fill="#94a3b8"
      >CIRC SCREEN</text>
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
.circscreen-graphic{width:100%;height:100%;display:block}
.svg_an_left{animation:circ_vibrate var(--dur,2s) ease-in-out infinite}
.svg_an_right{animation:circ_vibrate_rev var(--dur,2s) ease-in-out infinite}
.svg_an_stop{}
@keyframes circ_vibrate{
  0%,100%{transform:translate(0,0)}
  25%{transform:translate(3px,-3px)}
  50%{transform:translate(6px,0)}
  75%{transform:translate(3px,3px)}
}
@keyframes circ_vibrate_rev{
  0%,100%{transform:translate(0,0)}
  25%{transform:translate(-3px,3px)}
  50%{transform:translate(-6px,0)}
  75%{transform:translate(-3px,-3px)}
}
</style>
