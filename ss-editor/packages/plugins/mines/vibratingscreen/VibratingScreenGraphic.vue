<template>
  <svg
    class="vibratingscreen-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 200 80`"
  >
    <desc>振动筛</desc>
    <g :transform="'rotate(' + roate + ')'">
      <polyline
        points="10,72 14,60 18,72"
        fill="none"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
        stroke-linecap="round"
      />
      <polyline
        points="190,72 186,60 182,72"
        fill="none"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
        stroke-linecap="round"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >
        <rect
          x="16"
          y="18"
          width="168"
          height="44"
          rx="3"
          :fill="backgroundColor"
          :stroke="colors[0]"
          :stroke-width="boardWidth"
        />
        <line
          x1="28"
          y1="26"
          x2="172"
          y2="26"
          :stroke="flowColor[0]"
          :stroke-width="1"
          stroke-dasharray="4,3"
        />
        <line
          x1="28"
          y1="35"
          x2="172"
          y2="35"
          :stroke="flowColor[0]"
          :stroke-width="1"
          stroke-dasharray="4,3"
        />
        <line
          x1="28"
          y1="44"
          x2="172"
          y2="44"
          :stroke="flowColor[0]"
          :stroke-width="1"
          stroke-dasharray="4,3"
        />
        <line
          x1="28"
          y1="53"
          x2="172"
          y2="53"
          :stroke="flowColor[0]"
          :stroke-width="1"
          stroke-dasharray="4,3"
        />
        <line
          x1="42"
          y1="21"
          x2="42"
          y2="59"
          :stroke="pipeColor[0]"
          :stroke-width="0.5"
        />
        <line
          x1="66"
          y1="21"
          x2="66"
          y2="59"
          :stroke="pipeColor[0]"
          :stroke-width="0.5"
        />
        <line
          x1="90"
          y1="21"
          x2="90"
          y2="59"
          :stroke="pipeColor[0]"
          :stroke-width="0.5"
        />
        <line
          x1="114"
          y1="21"
          x2="114"
          y2="59"
          :stroke="pipeColor[0]"
          :stroke-width="0.5"
        />
        <line
          x1="138"
          y1="21"
          x2="138"
          y2="59"
          :stroke="pipeColor[0]"
          :stroke-width="0.5"
        />
        <line
          x1="162"
          y1="21"
          x2="162"
          y2="59"
          :stroke="pipeColor[0]"
          :stroke-width="0.5"
        />
      </g>
      <rect
        x="174"
        y="30"
        width="18"
        height="20"
        rx="2"
        :fill="colors[1]"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <circle
        cx="183"
        cy="40"
        r="5"
        :fill="flowColor[0]"
      />
      <text
        x="100"
        y="77"
        text-anchor="middle"
        :fill="pipeColor[0]"
        font-size="8"
      >VS</text>
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
.vibratingscreen-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: screen_vibrate var(--dur, 2s) ease-in-out infinite;
}

.svg_an_right {
  animation: screen_vibrate_reverse var(--dur, 2s) ease-in-out infinite;
}

.svg_an_stop {
  animation: none;
}

@keyframes screen_vibrate {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-2px); }
  50% { transform: translateY(1px); }
  75% { transform: translateY(-1px); }
}

@keyframes screen_vibrate_reverse {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(2px); }
  50% { transform: translateY(-1px); }
  75% { transform: translateY(1px); }
}
</style>
