<template>
  <svg
    class="converter-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 110 90"
  >
    <desc>转炉</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 55 48)'">
      <ellipse
        cx="55"
        cy="50"
        rx="40"
        ry="25"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <ellipse
        cx="55"
        cy="45"
        rx="30"
        ry="16"
        :fill="colors[1]"
      />
      <line
        x1="55"
        y1="5"
        x2="55"
        y2="28"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <circle
        cx="55"
        cy="5"
        r="4"
        :fill="pipeColor[0]"
      />
      <g :class="effectiveCls">
        <ellipse
          cx="55"
          cy="46"
          rx="18"
          ry="10"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="0.4;1;0.4"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></ellipse>
        <path
          d="M37 42 L73 42 M38 52 L72 52"
          stroke="#fef08a"
          :stroke-width="boardWidth-1"
        ><animate
          attributeName="opacity"
          values="0.5;1;0.5"
          :dur="(dur/3)+'s'"
          repeatCount="indefinite"
        /></path>
        <circle
          cx="47"
          cy="43"
          r="2"
          fill="#fef08a"
        ><animate
          attributeName="cy"
          values="40;52;40"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="63"
          cy="49"
          r="2"
          fill="#fef08a"
        ><animate
          attributeName="cy"
          values="44;54;44"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <path
          d="M15 65 Q55 80 95 65"
          fill="none"
          :stroke="pipeColor[0]"
          :stroke-width="boardWidth"
        />
      </g>
      <text
        x="55"
        y="87"
        text-anchor="middle"
        font-size="7"
        fill="#94a3b8"
      >CONVERTER</text>
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
.converter-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
