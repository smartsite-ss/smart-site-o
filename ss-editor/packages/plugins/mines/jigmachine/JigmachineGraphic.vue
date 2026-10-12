<template>
  <svg
    class="jigmachine-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 120 90"
  >
    <desc>跳汰机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 60 45)'">
      <rect
        x="10"
        y="15"
        width="100"
        height="55"
        rx="4"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <line
        x1="25"
        y1="30"
        x2="95"
        y2="30"
        :stroke="colors[1]"
        :stroke-width="boardWidth"
      />
      <line
        x1="25"
        y1="45"
        x2="95"
        y2="45"
        :stroke="colors[1]"
        :stroke-width="boardWidth"
      />
      <line
        x1="25"
        y1="60"
        x2="95"
        y2="60"
        :stroke="colors[1]"
        :stroke-width="boardWidth"
      />
      <rect
        x="35"
        y="72"
        width="20"
        height="14"
        rx="3"
        :fill="pipeColor[0]"
      />
      <rect
        x="65"
        y="72"
        width="20"
        height="14"
        rx="3"
        :fill="pipeColor[0]"
      />
      <g :class="effectiveCls">
        <rect
          x="37"
          y="74"
          width="16"
          height="10"
          rx="2"
          :fill="flowColor[0]"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-5;0,0"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></rect>
        <rect
          x="67"
          y="74"
          width="16"
          height="10"
          rx="2"
          :fill="flowColor[0]"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,-5;0,0;0,-5"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></rect>
        <circle
          cx="30"
          cy="38"
          r="3"
          :fill="flowColor[0]"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,-6;0,6;0,-6"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="60"
          cy="38"
          r="3.5"
          :fill="flowColor[0]"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,6;0,-6;0,6"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="85"
          cy="53"
          r="3"
          :fill="flowColor[0]"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,-5;0,5;0,-5"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="40"
          cy="52"
          r="2.5"
          :fill="flowColor[0]"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,5;0,-5;0,5"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="75"
          cy="38"
          r="2.8"
          :fill="flowColor[0]"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,-4;0,4;0,-4"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <path
          d="M110 42 L118 47 L110 52 Z"
          fill="#fff"
          opacity="0.6"
        ><animate
          attributeName="opacity"
          values="0.3;0.8;0.3"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></path>
      </g>
      <text
        x="60"
        y="88"
        text-anchor="middle"
        font-size="7"
        fill="#94a3b8"
      >JIG MACHINE</text>
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
.jigmachine-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
