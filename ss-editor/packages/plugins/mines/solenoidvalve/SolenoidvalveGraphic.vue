<template>
  <svg
    class="solenoidvalve-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 50 40"
  >
    <desc>电磁阀</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 25 20)'">
      <line
        x1="0"
        y1="20"
        x2="12"
        y2="20"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <line
        x1="38"
        y1="20"
        x2="50"
        y2="20"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <g :class="effectiveCls">
        <rect
          x="12"
          y="10"
          width="26"
          height="20"
          rx="3"
          :fill="colors[0]"
          :stroke="pipeColor[0]"
          :stroke-width="boardWidth"
        />
        <rect
          x="15"
          y="14"
          width="20"
          height="12"
          rx="2"
          :fill="colors[1]"
        ><animate
          attributeName="fill"
          values="#f59e0b;#fcd34d;#f59e0b"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></rect>
        <line
          x1="18"
          y1="17"
          x2="32"
          y2="17"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth"
        /><line
          x1="18"
          y1="23"
          x2="32"
          y2="23"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth"
        />
        <circle
          cx="25"
          cy="6"
          r="4"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth-1"
        ><animate
          attributeName="r"
          values="4;5;4"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
      </g>
      <text
        x="25"
        y="39"
        text-anchor="middle"
        font-size="5"
        fill="#94a3b8"
      >SOLENOID</text>
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
.solenoidvalve-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
