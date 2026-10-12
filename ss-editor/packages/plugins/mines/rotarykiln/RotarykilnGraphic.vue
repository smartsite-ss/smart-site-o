<template>
  <svg
    class="rotarykiln-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 220 70`"
  >
    <desc>回转窑</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ',110,35)'">
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >
        <ellipse
          cx="15"
          cy="35"
          rx="10"
          ry="18"
          fill="url(#kilnGrad)"
          stroke="#991b1b"
          stroke-width="1.5"
        />
        <path
          d="M25 17 L205 22 L200 53 L25 48 Z"
          fill="url(#kilnBodyGrad)"
          stroke="#b91c1c"
          stroke-width="1.5"
          class="kiln-body"
        />
        <line
          x1="55"
          y1="19"
          x2="52"
          y2="51"
          stroke="#7f1d1d"
          stroke-width="3"
          class="tyre-1"
        />
        <line
          x1="115"
          y1="21"
          x2="112"
          y2="50"
          stroke="#7f1d1d"
          stroke-width="3"
          class="tyre-2"
        />
        <line
          x1="175"
          y1="23"
          x2="172"
          y2="49"
          stroke="#7f1d1d"
          stroke-width="3"
          class="tyre-3"
        />
        <rect
          x="48"
          y="51"
          width="14"
          height="8"
          rx="2"
          fill="#374151"
          stroke="#4b5563"
          stroke-width="1"
          class="roller-1"
        />
        <rect
          x="108"
          y="49"
          width="14"
          height="9"
          rx="2"
          fill="#374151"
          stroke="#4b5563"
          stroke-width="1"
          class="roller-2"
        />
        <rect
          x="168"
          y="48"
          width="14"
          height="9"
          rx="2"
          fill="#374151"
          stroke="#4b5563"
          stroke-width="1"
          class="roller-3"
        />
        <path
          d="M195 28 Q215 32 212 45 L198 46 Z"
          fill="#f97316"
          opacity="0.85"
          class="flame"
        />
        <path
          d="M197 30 Q213 34 211 43 L199 44 Z"
          fill="#fbbf24"
          opacity="0.5"
          class="flame-inner"
        />
        <path
          d="M12 20 L5 15 L8 22 Z"
          fill="#78716c"
          opacity="0.6"
        />
        <circle
          cx="7"
          cy="18"
          r="2"
          fill="#a78bfa"
          opacity="0.5"
          class="feed-particle"
        />
        <line
          x1="60"
          y1="23"
          x2="170"
          y2="27"
          stroke="#fef08a"
          stroke-width="0.8"
          opacity="0.3"
          class="heat-line"
        />
        <line
          x1="65"
          y1="29"
          x2="175"
          y2="33"
          stroke="#fef08a"
          stroke-width="0.8"
          opacity="0.3"
          class="heat-line"
        />
        <line
          x1="70"
          y1="36"
          x2="180"
          y2="40"
          stroke="#fef08a"
          stroke-width="0.8"
          opacity="0.3"
          class="heat-line"
        />
      </g>
      <defs>
        <linearGradient
          id="kilnGrad"
          x1="5"
          y1="17"
          x2="25"
          y2="53"
        >
          <stop
            offset="0%"
            stop-color="#dc2626"
          />
          <stop
            offset="100%"
            stop-color="#991b1b"
          />
        </linearGradient>
        <linearGradient
          id="kilnBodyGrad"
          x1="25"
          y1="17"
          x2="205"
          y2="53"
        >
          <stop
            offset="0%"
            stop-color="#ef4444"
          />
          <stop
            offset="30%"
            stop-color="#dc2626"
          />
          <stop
            offset="70%"
            stop-color="#b91c1c"
          />
          <stop
            offset="100%"
            stop-color="#991b1b"
          />
        </linearGradient>
      </defs>
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
.rotarykiln-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left .kiln-body {
  animation: kiln_rotate var(--dur, 8s) linear infinite;
}
.svg_an_left .tyre-1, .svg_an_left .tyre-2, .svg_an_left .tyre-3 {
  animation: kiln_rotate var(--dur, 8s) linear infinite;
}
.svg_an_left .roller-1, .svg_an_left .roller-2, .svg_an_left .roller-3 {
  animation: roller_bounce var(--dur, 8s) ease-in-out infinite;
}
.svg_an_left .flame {
  animation: flame_flicker calc(var(--dur, 8s) * 0.15) ease-in-out infinite;
}
.svg_an_left .flame-inner {
  animation: flame_flicker calc(var(--dur, 8s) * 0.12) ease-in-out infinite reverse;
}
.svg_an_left .feed-particle {
  animation: feed_drop calc(var(--dur, 8s) * 0.5) ease-in infinite;
}
.svg_an_left .heat-line {
  animation: heat_shimmer calc(var(--dur, 8s) * 0.3) ease-in-out infinite;
}

.svg_an_right .kiln-body {
  animation: kiln_rotate_reverse var(--dur, 8s) linear infinite;
}

.svg_an_stop {
  animation: none !important;
}

@keyframes kiln_rotate {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -40; }
}

@keyframes kiln_rotate_reverse {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: 40; }
}

@keyframes roller_bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1px); }
}

@keyframes flame_flicker {
  0%, 100% { transform: scaleY(1); opacity: 0.85; }
  25% { transform: scaleY(1.08); opacity: 0.95; }
  50% { transform: scaleY(0.95); opacity: 0.8; }
  75% { transform: scaleY(1.05); opacity: 0.92; }
}

@keyframes feed_drop {
  0% { transform: translateY(-3px); opacity: 0; }
  30% { opacity: 0.6; }
  70% { transform: translateY(2px); opacity: 0.3; }
  100% { transform: translateY(5px); opacity: 0; }
}

@keyframes heat_shimmer {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.4; }
}
</style>
