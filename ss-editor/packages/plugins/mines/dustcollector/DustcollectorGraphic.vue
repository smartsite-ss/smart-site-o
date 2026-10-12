<template>
  <svg
    class="dustcollector-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 140 120"
  >
    <desc>除尘器</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 70 60)'">
      <rect
        x="20"
        y="10"
        width="100"
        height="90"
        rx="4"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <rect
        x="25"
        y="15"
        width="12"
        height="80"
        rx="2"
        :fill="colors[1]"
      />
      <rect
        x="42"
        y="15"
        width="12"
        height="80"
        rx="2"
        :fill="colors[1]"
      />
      <rect
        x="59"
        y="15"
        width="12"
        height="80"
        rx="2"
        :fill="colors[1]"
      />
      <rect
        x="76"
        y="15"
        width="12"
        height="80"
        rx="2"
        :fill="colors[1]"
      />
      <rect
        x="93"
        y="15"
        width="12"
        height="80"
        rx="2"
        :fill="colors[1]"
      />
      <path
        d="M0 35 L20 35"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth + 1"
      />
      <path
        d="M120 85 L140 85"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth + 1"
      />
      <g
        :class="effectiveCls"
        style="transform-box:fill-box; transform-origin:center;"
      >
        <circle
          cx="31"
          cy="30"
          r="3"
          :fill="flowColor[0]"
        ><animate
          attributeName="cy"
          values="30;75;30"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="48"
          cy="55"
          r="3"
          :fill="flowColor[0]"
        ><animate
          attributeName="cy"
          values="55;20;55"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="65"
          cy="40"
          r="3"
          :fill="flowColor[0]"
        ><animate
          attributeName="cy"
          values="40;80;40"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="82"
          cy="65"
          r="3"
          :fill="flowColor[0]"
        ><animate
          attributeName="cy"
          values="65;25;65"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="99"
          cy="50"
          r="3"
          :fill="flowColor[0]"
        ><animate
          attributeName="cy"
          values="50;78;50"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
      </g>
      <text
        x="70"
        y="115"
        text-anchor="middle"
        font-size="8"
        fill="#94a3b8"
      >DUST COLLECTOR</text>
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
.dustcollector-graphic{width:100%;height:100%;display:block}
.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
