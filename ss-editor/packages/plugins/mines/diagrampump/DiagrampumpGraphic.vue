<template>
  <svg
    class="diagrampump-graphic"
    :width="w"
    :height="h"
    viewBox="0 0 100 75"
  >
    <desc>隔膜泵</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 50 37)'">
      <rect
        x="15"
        y="10"
        width="70"
        height="55"
        rx="6"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <path
        d="M0 30 L15 30 M85 30 L100 30"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth + 1"
      />
      <circle
        cx="10"
        cy="30"
        r="5"
        fill="none"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <circle
        cx="90"
        cy="30"
        r="5"
        fill="none"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <g :class="effectiveCls">
        <ellipse
          cx="50"
          cy="37"
          rx="22"
          ry="16"
          :fill="colors[1]"
        ><animate
          attributeName="rx"
          values="22;18;22"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></ellipse>
        <line
          x1="28"
          y1="37"
          x2="72"
          y2="37"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth"
        ><animateTransform
          attributeName="transform"
          type="translate"
          values="0,0;0,-3;0,0;0,3;0,0"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></line>
        <path
          d="M35 22 L42 37 L35 52"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth - 1"
        /><path
          d="M65 22 L58 37 L65 52"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth - 1"
        />
        <circle
          cx="25"
          cy="27"
          r="2.5"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="1;0.3;1"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="75"
          cy="47"
          r="2.5"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="0.3;1;0.3"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
      </g>
      <text
        x="50"
        y="72"
        text-anchor="middle"
        font-size="7"
        fill="#94a3b8"
      >DIAPHRAGM PUMP</text>
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
.diagrampump-graphic{width:100%;height:100%;display:block}
.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
