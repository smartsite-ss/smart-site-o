<template>
  <svg
    class="apronfeeder-graphic"
    :width="w"
    :height="h"
    viewBox="0 0 160 45"
  >
    <desc>板式给矿机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 80 22)'">
      <line
        x1="2"
        y1="10"
        x2="158"
        y2="10"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth + 1"
      />
      <line
        x1="2"
        y1="35"
        x2="158"
        y2="35"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth + 1"
      />
      <g :class="effectiveCls">
        <g><animateTransform
             attributeName="transform"
             type="translate"
             values="0,0;-25,0;0,0"
             :dur="dur+'s'"
             repeatCount="indefinite"
           />
          <rect
            x="5"
            y="11"
            width="18"
            height="23"
            rx="1"
            :fill="colors[0]"
            :stroke="pipeColor[0]"
            :stroke-width="boardWidth"
          />
          <rect
            x="30"
            y="11"
            width="18"
            height="23"
            rx="1"
            :fill="colors[1]"
            :stroke="pipeColor[0]"
            :stroke-width="boardWidth"
          />
          <rect
            x="55"
            y="11"
            width="18"
            height="23"
            rx="1"
            :fill="colors[0]"
            :stroke="pipeColor[0]"
            :stroke-width="boardWidth"
          />
          <rect
            x="80"
            y="11"
            width="18"
            height="23"
            rx="1"
            :fill="colors[1]"
            :stroke="pipeColor[0]"
            :stroke-width="boardWidth"
          />
          <rect
            x="105"
            y="11"
            width="18"
            height="23"
            rx="1"
            :fill="colors[0]"
            :stroke="pipeColor[0]"
            :stroke-width="boardWidth"
          />
          <rect
            x="130"
            y="11"
            width="18"
            height="23"
            rx="1"
            :fill="colors[1]"
            :stroke="pipeColor[0]"
            :stroke-width="boardWidth"
          />
        </g>
        <circle
          cx="14"
          cy="22"
          r="3"
          :fill="flowColor[0]"
        /><circle
          cx="39"
          cy="22"
          r="3"
          :fill="flowColor[0]"
        /><circle
          cx="64"
          cy="22"
          r="3"
          :fill="flowColor[0]"
        /><circle
          cx="89"
          cy="22"
          r="3"
          :fill="flowColor[0]"
        /><circle
          cx="114"
          cy="22"
          r="3"
          :fill="flowColor[0]"
        /><circle
          cx="139"
          cy="22"
          r="3"
          :fill="flowColor[0]"
        />
      </g>
      <text
        x="80"
        y="44"
        text-anchor="middle"
        font-size="7"
        fill="#94a3b8"
      >APRON FEEDER</text>
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
.apronfeeder-graphic{width:100%;height:100%;display:block}
.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
