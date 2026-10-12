<template>
  <svg
    class="dryer-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 180 65"
  >
    <desc>干燥机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 90 32)'">
      <line
        x1="10"
        y1="22"
        x2="170"
        y2="22"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <line
        x1="10"
        y1="42"
        x2="170"
        y2="42"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <rect
        x="15"
        y="18"
        width="150"
        height="28"
        rx="14"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <circle
        cx="30"
        cy="46"
        r="4"
        :fill="pipeColor[0]"
      /><circle
        cx="150"
        cy="46"
        r="4"
        :fill="pipeColor[0]"
      />
      <g :class="effectiveCls">
        <line
          x1="30"
          y1="25"
          x2="60"
          y2="25"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth"
          stroke-dasharray="4 3"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;15,0;0,0"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></line>
        <line
          x1="80"
          y1="25"
          x2="110"
          y2="25"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth"
          stroke-dasharray="4 3"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;15,0;0,0"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></line>
        <line
          x1="130"
          y1="25"
          x2="155"
          y2="25"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth"
          stroke-dasharray="4 3"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;10,0;0,0"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></line>
        <path
          d="M25 8 L35 16 L25 24 Z"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="1;0.4;1"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></path>
        <path
          d="M85 8 L95 16 L85 24 Z"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="0.4;1;0.4"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></path>
        <path
          d="M145 8 L155 16 L145 24 Z"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="1;0.4;1"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></path>
      </g>
      <text
        x="90"
        y="62"
        text-anchor="middle"
        font-size="7"
        fill="#94a3b8"
      >DRYER</text>
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
.dryer-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
