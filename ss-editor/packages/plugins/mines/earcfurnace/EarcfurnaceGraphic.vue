<template>
  <svg
    class="earcfurnace-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 130 100"
  >
    <desc>电弧炉</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 65 55)'">
      <path
        d="M25 50 L105 50 L95 90 L35 90 Z"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <line
        x1="40"
        y1="5"
        x2="45"
        y2="48"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <line
        x1="65"
        y1="5"
        x2="65"
        y2="48"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <line
        x1="90"
        y1="5"
        x2="85"
        y2="48"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <g :class="effectiveCls">
        <circle
          cx="46"
          cy="52"
          r="3"
          fill="#ffffff"
        ><animate
          attributeName="r"
          values="3;8;3;12;3"
          :dur="(dur/3)+'s'"
          repeatCount="indefinite"
        /><animate
          attributeName="opacity"
          values="1;0.6;1;0.3;1"
          :dur="(dur/3)+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="65"
          cy="51"
          r="4"
          fill="#ffffff"
        ><animate
          attributeName="r"
          values="4;10;4;14;4"
          :dur="(dur/3)+'s'"
          repeatCount="indefinite"
        /><animate
          attributeName="opacity"
          values="0.9;0.4;0.9;0.2;0.9"
          :dur="(dur/3)+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="84"
          cy="52"
          r="3"
          fill="#ffffff"
        ><animate
          attributeName="r"
          values="3;7;3;11;3"
          :dur="(dur/3)+'s'"
          repeatCount="indefinite"
        /><animate
          attributeName="opacity"
          values="1;0.5;1;0.4;1"
          :dur="(dur/3)+'s'"
          repeatCount="indefinite"
        /></circle>
        <ellipse
          cx="65"
          cy="70"
          rx="20"
          ry="10"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="0.3;0.8;0.3"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></ellipse>
        <path
          d="M42 58 Q65 75 88 58"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth"
        ><animate
          attributeName="opacity"
          values="0.5;1;0.5"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></path>
      </g>
      <text
        x="65"
        y="98"
        text-anchor="middle"
        font-size="7"
        fill="#94a3b8"
      >EAF</text>
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
  decimalPlaces: number;
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
.earcfurnace-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
