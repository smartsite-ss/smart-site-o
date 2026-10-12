<template>
  <svg
    class="jawcrusher-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 120 100`"
  >
    <desc>颚式破碎机</desc>
    <g :transform="'rotate(' + roate + ')'">
      <rect
        x="8"
        y="12"
        width="104"
        height="78"
        rx="3"
        :fill="backgroundColor"
        :stroke="pipeColor[0]"
        :stroke-width="boardWidth"
      />
      <line
        x1="32"
        y1="18"
        x2="32"
        y2="84"
        :stroke="colors[0]"
        :stroke-width="boardWidth + 2"
        stroke-linecap="round"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
        style="transform-box: fill-box; transform-origin: 82px 18px;"
      >
        <line
          x1="82"
          y1="18"
          x2="62"
          y2="84"
          :stroke="colors[0]"
          :stroke-width="boardWidth + 2"
          stroke-linecap="round"
        />
        <polygon
          points="82,13 92,20 82,26 72,20"
          :fill="colors[1]"
        />
        <circle
          cx="82"
          cy="18"
          r="3"
          :fill="flowColor[0]"
        />
      </g>
      <rect
        x="12"
        y="4"
        width="96"
        height="10"
        rx="2"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <polygon
        points="40,86 80,86 70,94 50,94"
        :fill="pipeColor[0]"
        opacity="0.5"
      />
      <text
        x="60"
        y="98"
        text-anchor="middle"
        font-size="7"
        fill="#9ca3af"
      >JC</text>
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

/** 动画方向：绑定实时值 → cls 映射，未绑定沿用静态 cls（颚式破碎机仅运行/停止两态） */
const effectiveCls = computed(() => {
  if (!props.tagId) return props.cls;
  const raw = currentValue.value;
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.forwardValue !== '' && rawStr === props.forwardValue) return 'svg_swing_run';
  if (props.backwardValue !== '' && rawStr === props.backwardValue) return 'svg_swing_run';
  if (props.stopValue !== '' && rawStr === props.stopValue) return 'svg_swing_stop';
  return props.defaultCls;
});
</script>

<style scoped>
.jawcrusher-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_swing_run {
  animation: swing_motion var(--dur, 3s) ease-in-out infinite;
}

.svg_swing_stop {
  animation: none;
}

@keyframes swing_motion {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(6deg); }
  75% { transform: rotate(-3deg); }
}
</style>
