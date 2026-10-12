<template>
  <svg
    class="localvent-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 90 70"
  >
    <desc>局部通风机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 45 35)'">
      <rect
        x="5"
        y="18"
        width="40"
        height="34"
        rx="6"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <path
        d="M45 25 L75 15 L75 55 L45 45 Z"
        :fill="colors[1]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <g
        :class="effectiveCls"
        style="transform-box:fill-box; transform-origin:center;"
      >
        <circle
          cx="25"
          cy="35"
          r="12"
          fill="none"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth"
        />
        <line
          x1="25"
          y1="23"
          x2="25"
          y2="47"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth - 1"
        />
        <line
          x1="13"
          y1="35"
          x2="37"
          y2="35"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth - 1"
        />
        <line
          x1="16.5"
          y1="26.5"
          x2="33.5"
          y2="43.5"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth - 1"
        />
        <line
          x1="33.5"
          y1="26.5"
          x2="16.5"
          y2="43.5"
          :stroke="flowColor[0]"
          :stroke-width="boardWidth - 1"
        />
      </g>
      <path
        d="M75 30 Q82 35 75 40"
        fill="none"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <text
        x="45"
        y="67"
        text-anchor="middle"
        font-size="7"
        fill="#94a3b8"
      >LOCAL VENT</text>
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
.localvent-graphic { width: 100%; height: 100%; display: block; }
.svg_an_left { animation: vent_spin var(--dur, 3s) linear infinite; transform-origin: center; }
.svg_an_right { animation: vent_spin_rev var(--dur, 3s) linear infinite; transform-origin: center; }
.svg_an_stop {}
@keyframes vent_spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes vent_spin_rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
</style>
