<template>
  <svg
    class="ballvalve-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 60 70"
  >
    <desc>电动球阀</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 30 35)'">
      <path
        d="M25 0 L35 0 L35 15 L25 15 Z"
        :fill="pipeColor[0]"
      />
      <path
        d="M12 20 L48 20 L44 50 L16 50 Z"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
        rx="4"
      />
      <line
        x1="30"
        y1="22"
        x2="30"
        y2="48"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <g :class="effectiveCls">
        <circle
          cx="30"
          cy="28"
          r="6"
          :fill="colors[1]"
        ><animateTransform
          attributeName="transform"
          type="rotate"
          values="0 30 28;-90 30 28;0 30 28"
          :dur="(dur*2)+'s'"
          repeatCount="indefinite"
        /></circle>
        <line
          x1="24"
          y1="28"
          x2="36"
          y2="28"
          :stroke="flowColor[0]"
          :stroke-width="1.5"
        ><animateTransform
          attributeName="transform"
          type="rotate"
          values="0 30 28;-90 30 28;0 30 28"
          :dur="(dur*2)+'s'"
          repeatCount="indefinite"
        /></line>
        <line
          x1="30"
          y1="22"
          x2="30"
          y2="34"
          :stroke="flowColor[0]"
          :stroke-width="1.5"
        ><animateTransform
          attributeName="transform"
          type="rotate"
          values="0 30 28;-90 30 28;0 30 28"
          :dur="(dur*2)+'s'"
          repeatCount="indefinite"
        /></line>
      </g>
      <rect
        x="26"
        y="52"
        width="8"
        height="18"
        rx="2"
        :fill="pipeColor[0]"
      />
      <text
        x="30"
        y="69"
        text-anchor="middle"
        font-size="6"
        fill="#94a3b8"
      >BALL VALVE</text>
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
.ballvalve-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
