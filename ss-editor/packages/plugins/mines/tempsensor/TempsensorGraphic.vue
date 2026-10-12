<template>
  <svg
    class="tempsensor-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    viewBox="0 0 30 60"
  >
    <desc>温度传感器</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ' 15 30)'">
      <line
        x1="15"
        y1="2"
        x2="15"
        y2="20"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth+1"
      />
      <circle
        cx="15"
        cy="22"
        r="8"
        :fill="colors[0]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <circle
        cx="15"
        cy="22"
        r="4"
        :fill="colors[1]"
      />
      <g :class="effectiveCls">
        <text
          x="15"
          y="25"
          text-anchor="middle"
          font-size="7"
          fill="#fff"
          font-weight="bold"
        >{{ tagId ? Math.round(effectiveValue) + unit : '--' }}</text>
        <circle
          cx="15"
          cy="42"
          r="3"
          :fill="flowColor[0]"
        ><animate
          attributeName="r"
          values="3;4;3"
          :dur="dur+'s'"
          repeatCount="indefinite"
        /></circle>
        <line
          x1="12"
          y1="46"
          x2="18"
          y2="54"
          :stroke="pipeColor[0]"
          :stroke-width="boardWidth"
        /><polygon
          points="18,54 16,58 14,54"
          :fill="pipeColor[0]"
        />
        <rect
          x="10"
          y="38"
          width="10"
          height="2"
          rx="1"
          :fill="effectiveValue > 80 ? '#ef4444' : colors[0]"
        ><animate
          v-if="effectiveValue > 80"
          attributeName="opacity"
          values="1;0.4;1"
          :dur="(dur/2)+'s'"
          repeatCount="indefinite"
        /></rect>
      </g>
      <text
        x="15"
        y="59"
        text-anchor="middle"
        font-size="5"
        fill="#94a3b8"
      >T</text>
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
  decimalPlaces: number;
  unit: string;
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
.tempsensor-graphic{width:100%;height:100%;display:block}.svg_an_left,.svg_an_right{opacity:1}.svg_an_stop{}
</style>
