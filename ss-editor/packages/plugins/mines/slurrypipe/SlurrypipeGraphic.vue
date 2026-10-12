<template>
  <svg
    class="slurrypipe-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 200 20"
  >
    <desc>矿浆管道</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 100 10)'">
      <rect
        x="0"
        y="3"
        width="200"
        height="14"
        rx="7"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <path
        d="M95 6 L100 10 L95 14 Z"
        fill="#fff"
        opacity="0.8"
      />
      <path
        d="M175 6 L180 10 L175 14 Z"
        fill="#fff"
        opacity="0.8"
      />
      <g :class="effectiveCls">
        <circle
          cx="15"
          cy="10"
          r="2.5"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="15;185;15"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="35"
          cy="10"
          r="2"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="35;195;35"
          :dur="(dur*0.85)+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="55"
          cy="10"
          r="2.5"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="55;190;55"
          :dur="(dur*1.1)+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="80"
          cy="10"
          r="1.8"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="80;192;80"
          :dur="(dur*0.9)+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="110"
          cy="10"
          r="2.2"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="110;188;110"
          :dur="(dur*1.05)+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="135"
          cy="10"
          r="2"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="135;193;135"
          :dur="(dur*0.95)+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="160"
          cy="10"
          r="2.5"
          :fill="flowColor[0]"
        ><animate
          attributeName="cx"
          values="160;186;160"
          :dur="(dur*1.15)+'s'"
          repeatCount="indefinite"
        /></circle>
        <rect
          x="30"
          y="7"
          width="140"
          height="6"
          rx="3"
          :fill="colors[1]"
        ><animate
          attributeName="opacity"
          values="0.3;0.6;0.3"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></rect>
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
.slurrypipe-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
