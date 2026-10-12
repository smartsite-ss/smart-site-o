<template>
  <svg
    class="gaspipe-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 200 16"
  >
    <desc>气体管道</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 100 8)'">
      <line
        x1="0"
        y1="8"
        x2="200"
        y2="8"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+2"
        stroke-dasharray="10 5"
      />
      <g :class="effectiveCls">
        <circle
          cx="25"
          cy="8"
          r="1.5"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="25;185;25"
          :dur="(dur*1.3)+'s'"
          repeatCount="indefinite"
        /><animate
          attributeName="opacity"
          values="1;0.4;1;0.6;1"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="70"
          cy="8"
          r="1.2"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="70;190;70"
          :dur="(dur*1.5)+'s'"
          repeatCount="indefinite"
        /><animate
          attributeName="opacity"
          values="0.5;1;0.3;0.9;0.5"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="120"
          cy="8"
          r="1.5"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="120;195;120"
          :dur="(dur*1.2)+'s'"
          repeatCount="indefinite"
        /><animate
          attributeName="opacity"
          values="0.8;0.3;1;0.5;0.8"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="165"
          cy="8"
          r="1.3"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="165;198;165"
          :dur="(dur*1.4)+'s'"
          repeatCount="indefinite"
        /><animate
          attributeName="opacity"
          values="0.4;1;0.5;1;0.4"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <path
          d="M90 4 L95 8 L90 12 Z"
          fill="#fff"
          opacity="0.5"
        />
        <path
          d="M160 4 L165 8 L160 12 Z"
          fill="#fff"
          opacity="0.5"
        />
      </g>
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
.gaspipe-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
