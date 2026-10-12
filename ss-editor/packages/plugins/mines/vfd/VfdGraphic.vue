<template>
  <svg
    class="vfd-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 80 110`"
  >
    <desc>变频器/VFD</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ',40,55)'">
      <rect
        x="10"
        y="8"
        width="60"
        height="90"
        rx="4"
        fill="#374151"
        stroke="#4b5563"
        stroke-width="2"
      />
      <rect
        x="16"
        y="14"
        width="48"
        height="22"
        rx="2"
        fill="#111827"
        stroke="#333"
        stroke-width="1"
      />
      <text
        x="40"
        y="30"
        font-size="12"
        :fill="runState === 'fault' ? '#ef4444' : runState === 'run' ? '#22c55e' : '#64748b'"
        text-anchor="middle"
        font-family="monospace"
        font-weight="bold"
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >{{ displayFreq }}</text>
      <circle
        cx="24"
        cy="46"
        r="4"
        :fill="runState === 'run' ? '#22c55e' : runState === 'fault' ? '#ef4444' : '#4b5563'"
        :class="effectiveCls + '-indicator'"
        :style="{ '--dur': dur + 's' }"
      />
      <text
        x="32"
        y="49"
        font-size="5"
        fill="#9ca3af"
      >RUN</text>
      <circle
        cx="52"
        cy="46"
        r="4"
        fill="#4b5563"
      />
      <text
        x="59"
        y="49"
        font-size="5"
        fill="#9ca3af"
      >ALM</text>
      <line
        x1="18"
        y1="58"
        x2="62"
        y2="58"
        stroke="#4b5563"
        stroke-width="1"
      />
      <rect
        x="18"
        y="64"
        width="8"
        height="5"
        rx="1"
        fill="#27272a"
        stroke="#3f3f46"
        stroke-width="0.5"
      />
      <rect
        x="28"
        y="64"
        width="8"
        height="5"
        rx="1"
        fill="#27272a"
        stroke="#3f3f46"
        stroke-width="0.5"
      />
      <rect
        x="38"
        y="64"
        width="8"
        height="5"
        rx="1"
        fill="#27272a"
        stroke="#3f3f46"
        stroke-width="0.5"
      />
      <rect
        x="48"
        y="64"
        width="8"
        height="5"
        rx="1"
        fill="#27272a"
        stroke="#3f3f46"
        stroke-width="0.5"
      />
      <rect
        x="58"
        y="64"
        width="8"
        height="5"
        rx="1"
        fill="#27272a"
        stroke="#3f3f46"
        stroke-width="0.5"
      />
      <rect
        x="18"
        y="73"
        width="8"
        height="5"
        rx="1"
        fill="#27272a"
        stroke="#3f3f46"
        stroke-width="0.5"
      />
      <rect
        x="28"
        y="73"
        width="8"
        height="5"
        rx="1"
        fill="#27272a"
        stroke="#3f3f46"
        stroke-width="0.5"
      />
      <rect
        x="38"
        y="73"
        width="8"
        height="5"
        rx="1"
        fill="#27272a"
        stroke="#3f3f46"
        stroke-width="0.5"
      />
      <rect
        x="48"
        y="73"
        width="8"
        height="5"
        rx="1"
        fill="#27272a"
        stroke="#3f3f46"
        stroke-width="0.5"
      />
      <rect
        x="58"
        y="73"
        width="8"
        height="5"
        rx="1"
        fill="#27272a"
        stroke="#3f3f46"
        stroke-width="0.5"
      />
      <rect
        x="15"
        y="84"
        width="50"
        height="10"
        rx="2"
        fill="#1f2937"
        stroke="#334155"
        stroke-width="1"
      />
      <circle
        cx="21"
        cy="89"
        r="2.5"
        fill="#374151"
        stroke="#4b5563"
        stroke-width="0.5"
      />
      <circle
        cx="31"
        cy="89"
        r="2.5"
        fill="#374151"
        stroke="#4b5563"
        stroke-width="0.5"
      />
      <circle
        cx="41"
        cy="89"
        r="2.5"
        fill="#374151"
        stroke="#4b5563"
        stroke-width="0.5"
      />
      <circle
        cx="51"
        cy="89"
        r="2.5"
        fill="#374151"
        stroke="#4b5563"
        stroke-width="0.5"
      />
      <circle
        cx="61"
        cy="89"
        r="2.5"
        fill="#374151"
        stroke="#4b5563"
        stroke-width="0.5"
      />
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
  frequency: number;
  runState: 'run' | 'stop' | 'fault';
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

const displayFreq = computed(() => props.frequency.toFixed(1));
</script>

<style scoped>
.vfd-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: display_blink var(--dur, 3s) ease-in-out infinite;
}

.svg_an_left-indicator {
  animation: indicator_glow var(--dur, 3s) ease-in-out infinite;
}

.svg_an_right {
  animation: display_blink var(--dur, 3s) ease-in-out infinite;
}

.svg_an_stop {
  animation: none !important;
}

@keyframes display_blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

@keyframes indicator_glow {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.3); }
}
</style>
