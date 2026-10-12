<template>
  <svg
    class="shakingtable-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 90 42.5`"
  >
    <desc>摇床</desc>
    <g :transform=" 'rotate(' + (roate) + ')' + ' scale(1)' ">
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >
        <polygon
          points="12,6 82,14 78,36 8,28"
          :fill="colors[0]"
          :stroke="pipeColor[0]"
          :stroke-width="boardWidth"
        />
        <line
          x1="18"
          y1="11"
          x2="76"
          y2="19"
          stroke="#d1d5db"
          stroke-width="0.5"
        />
        <line
          x1="16"
          y1="17"
          x2="74"
          y2="25"
          stroke="#d1d5db"
          stroke-width="0.5"
        />
        <line
          x1="13"
          y1="23"
          x2="72"
          y2="31"
          stroke="#d1d5db"
          stroke-width="0.5"
        />
        <line
          x1="22"
          y1="10"
          x2="35"
          y2="22"
          :stroke="flowColor[0]"
          stroke-width="0.8"
          opacity="0.6"
        />
        <line
          x1="32"
          y1="12"
          x2="45"
          y2="24"
          :stroke="flowColor[0]"
          stroke-width="0.8"
          opacity="0.6"
        />
        <line
          x1="42"
          y1="14"
          x2="55"
          y2="26"
          :stroke="flowColor[0]"
          stroke-width="0.8"
          opacity="0.6"
        />
        <line
          x1="52"
          y1="16"
          x2="65"
          y2="28"
          :stroke="flowColor[0]"
          stroke-width="0.8"
          opacity="0.6"
        />
        <circle
          cx="25"
          cy="15"
          r="1"
          :fill="flowColor[0]"
        >
          <animate
            attributeName="cx"
            values="25;30;22;27;25"
            :dur="(dur/2) + 's'"
            repeatCount="indefinite"
          />
          <animate
            attributeName="cy"
            values="15;20;17;21;15"
            :dur="(dur/2) + 's'"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          cx="40"
          cy="18"
          r="1"
          :fill="flowColor[0]"
        >
          <animate
            attributeName="cx"
            values="40;45;37;43;40"
            :dur="(dur/2) + 's'"
            repeatCount="indefinite"
            begin="0.2s"
          />
          <animate
            attributeName="cy"
            values="18;23;20;24;18"
            :dur="(dur/2) + 's'"
            repeatCount="indefinite"
            begin="0.2s"
          />
        </circle>
        <circle
          cx="55"
          cy="21"
          r="1"
          :fill="flowColor[0]"
        >
          <animate
            attributeName="cx"
            values="55;60;52;58;55"
            :dur="(dur/2) + 's'"
            repeatCount="indefinite"
            begin="0.4s"
          />
          <animate
            attributeName="cy"
            values="21;26;23;27;21"
            :dur="(dur/2) + 's'"
            repeatCount="indefinite"
            begin="0.4s"
          />
        </circle>
        <circle
          cx="68"
          cy="24"
          r="1"
          :fill="flowColor[0]"
        >
          <animate
            attributeName="cx"
            values="68;73;65;71;68"
            :dur="(dur/2) + 's'"
            repeatCount="indefinite"
            begin="0.6s"
          />
          <animate
            attributeName="cy"
            values="24;29;26;30;24"
            :dur="(dur/2) + 's'"
            repeatCount="indefinite"
            begin="0.6s"
          />
        </circle>
      </g>
      <rect
        x="2"
        y="18"
        :width="10"
        :height="12"
        rx="2"
        :fill="colors[1]"
      />
      <rect
        x="80"
        y="22"
        :width="8"
        :height="8"
        rx="1"
        fill="#4b5563"
      />
      <text
        x="45"
        y="48"
        text-anchor="middle"
        font-size="5"
        fill="#ecf0f1"
      >{{ tagId ? Math.round(effectiveValue) + 'rpm' : '--' }}</text>
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
.shakingtable-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: ani_shake var(--dur, 5s) ease-in-out infinite;
}

.svg_an_right {
  animation: ani_shake var(--dur, 5s) ease-in-out infinite reverse;
}

.svg_an_stop {
  animation: none;
}

@keyframes ani_shake {
  0% { transform: translateX(0); }
  15% { transform: translateX(3px); }
  30% { transform: translateX(-1px); }
  45% { transform: translateX(2px); }
  60% { transform: translateX(-2px); }
  75% { transform: translateX(1px); }
  90% { transform: translateX(-1px); }
  100% { transform: translateX(0); }
}
</style>
