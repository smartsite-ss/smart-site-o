<template>
  <svg
    class="ceramicfilter-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 130 100"
  >
    <desc>陶瓷过滤机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 65 48)'">
      <rect
        x="15"
        y="20"
        width="90"
        height="56"
        rx="4"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <line
        x1="5"
        y1="35"
        x2="15"
        y2="35"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <line
        x1="105"
        y1="60"
        x2="125"
        y2="60"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <g :class="effectiveCls">
        <g style="transform-origin:65px 48px;">
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 65 48;360 65 48"
            :dur="dur+'s'"
            repeatCount="indefinite"
          />
          <ellipse
            cx="45"
            cy="48"
            rx="14"
            ry="18"
            :fill="colors[1]"
          />
          <ellipse
            cx="85"
            cy="48"
            rx="14"
            ry="18"
            :fill="colors[1]"
          />
          <line
            x1="31"
            y1="30"
            x2="59"
            y2="66"
            :stroke="flowColor[0]"
            :stroke-width="boardWidth"
          />
          <line
            x1="71"
            y1="30"
            x2="99"
            y2="66"
            :stroke="flowColor[0]"
            :stroke-width="boardWidth"
          />
        </g>
        <circle
          cx="40"
          cy="42"
          r="2"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="1;0.3;1"
          :dur="(dur/3)+'s'"
          repeatCount="indefinite"
        /></circle>
        <circle
          cx="90"
          cy="54"
          r="2"
          :fill="flowColor[0]"
        ><animate
          attributeName="opacity"
          values="0.3;1;0.3"
          :dur="(dur/3)+'s'"
          repeatCount="indefinite"
        /></circle>
      </g>
      <path
        d="M108 52 L118 55 L108 58 Z"
        :fill="pipeColor[0]"
      />
      <text
        x="65"
        y="97"
        text-anchor="middle"
        font-size="7"
        fill="#94a3b8"
      >CERAMIC FILTER</text>
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
.ceramicfilter-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
