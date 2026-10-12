<template>
  <svg
    class="vibfeeder-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 160 60`"
  >
    <desc>振动给料机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ',80,30)'">
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >
        <path
          d="M10 18 L150 18 L145 38 L15 38 Z"
          fill="url(#troughGrad)"
          stroke="#b45309"
          stroke-width="1.5"
          class="trough"
        />
        <line
          x1="25"
          y1="22"
          x2="135"
          y2="34"
          stroke="#fbbf24"
          stroke-width="1"
          opacity="0.4"
        />
        <line
          x1="30"
          y1="24"
          x2="130"
          y2="32"
          stroke="#fbbf24"
          stroke-width="1"
          opacity="0.4"
        />
        <polygon
          points="145,28 155,26 155,30 148,31"
          fill="#d97706"
          opacity="0.7"
          class="arrow-1"
        />
        <polygon
          points="140,33 152,32 153,35 143,36"
          fill="#d97706"
          opacity="0.6"
          class="arrow-2"
        />
        <rect
          x="55"
          y="40"
          width="50"
          height="16"
          rx="3"
          fill="#374151"
          stroke="#4b5563"
          stroke-width="1.5"
        />
        <circle
          cx="75"
          cy="48"
          r="8"
          fill="#4b5563"
          stroke="#6b7280"
          stroke-width="1.5"
          class="eccentric"
        />
        <circle
          cx="85"
          cy="48"
          r="3"
          fill="#ef4444"
          class="weight-dot"
        />
        <line
          x1="55"
          y1="40"
          x2="45"
          y2="38"
          stroke="#6b7280"
          stroke-width="2"
        />
        <line
          x1="105"
          y1="40"
          x2="115"
          y2="38"
          stroke="#6b7280"
          stroke-width="2"
        />
        <path
          d="M10 16 Q80 12 150 16"
          fill="none"
          stroke="#78716c"
          stroke-width="1"
          opacity="0.5"
        />
      </g>
      <defs>
        <linearGradient
          id="troughGrad"
          x1="10"
          y1="18"
          x2="150"
          y2="38"
        >
          <stop
            offset="0%"
            stop-color="#d97706"
          />
          <stop
            offset="100%"
            stop-color="#b45309"
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
.vibfeeder-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left .trough {
  animation: vibrate_h var(--dur, 2s) ease-in-out infinite;
}
.svg_an_left .eccentric {
  animation: eccentric_spin var(--dur, 2s) linear infinite;
}
.svg_an_left .weight-dot {
  animation: weight_orbit var(--dur, 2s) linear infinite;
}
.svg_an_left .arrow-1 {
  animation: arrow_flow var(--dur, 2s) linear infinite;
}
.svg_an_left .arrow-2 {
  animation: arrow_flow var(--dur, 2s) linear infinite 0.3s;
}

.svg_an_right .trough {
  animation: vibrate_h var(--dur, 2s) ease-in-out infinite reverse;
}
.svg_an_right .eccentric {
  animation: eccentric_spin_reverse var(--dur, 2s) linear infinite;
}
.svg_an_right .weight-dot {
  animation: weight_orbit_reverse var(--dur, 2s) linear infinite;
}

.svg_an_stop {
  animation: none !important;
}

@keyframes vibrate_h {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

@keyframes eccentric_spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes eccentric_spin_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@keyframes weight_orbit {
  from { transform: rotate(0deg) translateX(5px); }
  to { transform: rotate(360deg) translateX(5px); }
}

@keyframes weight_orbit_reverse {
  from { transform: rotate(360deg) translateX(5px); }
  to { transform: rotate(0deg) translateX(5px); }
}

@keyframes arrow_flow {
  0% { opacity: 0; transform: translateX(-5px); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translateX(8px); }
}
</style>
