<template>
  <svg
    class="estopbutton-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 50 50"
  >
    <desc>急停按钮</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 25 25)'">
      <circle
        cx="25"
        cy="25"
        r="22"
        :fill="colors[0]"
        :stroke="pipeColor"
        :stroke-width="boardWidth+1"
      />
      <g :class="effectiveCls">
        <ellipse
          cx="25"
          cy="26"
          rx="14"
          ry="12"
          :fill="colors[1]"
        ><animate
          attributeName="ry"
          values="12;9;12"
          :dur="(effectiveValue>0?dur*2:dur)+'s'"
          repeatCount="indefinite"
        /></ellipse>
        <circle
          cx="25"
          cy="25"
          r="18"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth"
        ><animate
          v-if="effectiveValue > 0"
          attributeName="opacity"
          values="0.5;1;0.5"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></circle>
        <text
          x="25"
          y="29"
          text-anchor="middle"
          font-size="7"
          fill="#fff"
          font-weight="bold"
        >E-STOP</text>
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="1"
          opacity="0.6"
        ><animate
          v-if="effectiveValue > 0"
          attributeName="r"
          values="20;24;20"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></circle>
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
  pipeColor: string;
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
.estopbutton-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
