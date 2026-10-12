<template>
  <svg
    class="screwconveyor-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 180 50"
  >
    <desc>螺旋输送机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 90 25)'">
      <path
        d="M5 10 L175 10 L170 40 L10 40 Z"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <line
        x1="5"
        y1="25"
        x2="175"
        y2="25"
        :stroke="pipeColor[0]"
        :stroke-width="0.5"
      />
      <g :class="effectiveCls">
        <path
          d="M15 12 Q30 25 15 38"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth + 1"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;20,0;0,0"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></path>
        <path
          d="M45 12 Q60 25 45 38"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth + 1"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;20,0;0,0"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></path>
        <path
          d="M75 12 Q90 25 75 38"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth + 1"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;20,0;0,0"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></path>
        <path
          d="M105 12 Q120 25 105 38"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth + 1"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;20,0;0,0"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></path>
        <path
          d="M135 12 Q150 25 135 38"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth + 1"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;20,0;0,0"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></path>
        <path
          d="M165 12 Q180 25 165 38"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth + 1"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;20,0;0,0"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></path>
      </g>
      <circle
        cx="8"
        cy="25"
        r="4"
        :fill="pipeColor[0]"
      />
      <rect
        x="172"
        y="18"
        width="6"
        height="14"
        rx="1"
        :fill="pipeColor[0]"
      />
      <text
        x="90"
        y="48"
        text-anchor="middle"
        font-size="7"
        fill="#94a3b8"
      >SCREW CONV</text>
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
.screwconveyor-graphic{width:100%;height:100%;display:block}
.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
