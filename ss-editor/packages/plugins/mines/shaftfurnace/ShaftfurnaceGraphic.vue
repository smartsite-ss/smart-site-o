<template>
  <svg
    class="shaftfurnace-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 90 140"
  >
    <desc>竖炉/焙烧炉</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 45 70)'">
      <path
        d="M20 10 L70 10 L75 120 L15 120 Z"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <path
        d="M30 25 L60 25 L62 105 L28 105 Z"
        :fill="colors[1]"
      />
      <line
        x1="5"
        y1="20"
        x2="20"
        y2="20"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <line
        x1="70"
        y1="115"
        x2="85"
        y2="115"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <g :class="effectiveCls">
        <ellipse
          cx="45"
          cy="50"
          rx="8"
          ry="14"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="1;0.3;1;0.7;1"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></ellipse>
        <ellipse
          cx="42"
          cy="68"
          rx="6"
          ry="10"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="0.5;1;0.4;0.9;0.5"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></ellipse>
        <ellipse
          cx="48"
          cy="82"
          rx="5"
          ry="8"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="0.8;0.3;1;0.5;0.8"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></ellipse>
        <circle
          cx="38"
          cy="40"
          r="2"
          fill="#fef08a"
        ><animate
          attributeName="cy"
          values="35;55;35"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="52"
          cy="65"
          r="1.5"
          fill="#fef08a"
        ><animate
          attributeName="cy"
          values="58;80;58"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="43"
          cy="85"
          r="1.5"
          fill="#fef08a"
        ><animate
          attributeName="cy"
          values="78;95;78"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
      </g>
      <text
        x="45"
        y="136"
        text-anchor="middle"
        font-size="7"
        fill="#94a3b8"
      >SHAFT FURNACE</text>
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
.shaftfurnace-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
