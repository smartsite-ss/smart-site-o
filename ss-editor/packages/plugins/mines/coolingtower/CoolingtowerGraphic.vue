<template>
  <svg
    class="coolingtower-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 100 140`"
  >
    <desc>冷却塔</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ',50,70)'">
      <path
        d="M10 8 Q50 2 90 8 L80 130 Q50 138 20 130 Z"
        fill="url(#towerGrad)"
        stroke="#0369a1"
        stroke-width="1.5"
      />
      <ellipse
        cx="50"
        cy="12"
        rx="38"
        ry="6"
        fill="#0284c7"
        stroke="#0369a1"
        stroke-width="1"
      />
      <line
        x1="25"
        y1="30"
        x2="75"
        y2="30"
        stroke="#7dd3fc"
        stroke-width="0.8"
        opacity="0.4"
      />
      <line
        x1="22"
        y1="45"
        x2="78"
        y2="45"
        stroke="#7dd3fc"
        stroke-width="0.8"
        opacity="0.4"
      />
      <line
        x1="21"
        y1="60"
        x2="79"
        y2="60"
        stroke="#7dd3fc"
        stroke-width="0.8"
        opacity="0.4"
      />
      <line
        x1="23"
        y1="75"
        x2="77"
        y2="75"
        stroke="#7dd3fc"
        stroke-width="0.8"
        opacity="0.4"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >
        <circle
          cx="50"
          cy="14"
          r="12"
          fill="#164e63"
          stroke="#0e7490"
          stroke-width="1.5"
          class="fan-housing"
        />
        <circle
          cx="50"
          cy="14"
          r="9"
          fill="#155e75"
          class="fan-blades"
        />
        <line
          x1="50"
          y1="6"
          x2="50"
          y2="22"
          stroke="#67e8f9"
          stroke-width="1.5"
          stroke-linecap="round"
          class="blade-1"
        />
        <line
          x1="42"
          y1="14"
          x2="58"
          y2="14"
          stroke="#67e8f9"
          stroke-width="1.5"
          stroke-linecap="round"
          class="blade-2"
        />
        <line
          x1="44"
          y1="8"
          x2="56"
          y2="20"
          stroke="#67e8f9"
          stroke-width="1.5"
          stroke-linecap="round"
          class="blade-3"
        />
        <line
          x1="44"
          y1="20"
          x2="56"
          y2="8"
          stroke="#67e8f9"
          stroke-width="1.5"
          stroke-linecap="round"
          class="blade-4"
        />
        <circle
          cx="35"
          cy="55"
          r="1.5"
          fill="#38bdf8"
          class="drop drop-1"
          opacity="0"
        />
        <circle
          cx="48"
          cy="60"
          r="1.5"
          fill="#38bdf8"
          class="drop drop-2"
          opacity="0"
        />
        <circle
          cx="62"
          cy="53"
          r="1.5"
          fill="#38bdf8"
          class="drop drop-3"
          opacity="0"
        />
        <circle
          cx="53"
          cy="68"
          r="1.5"
          fill="#38bdf8"
          class="drop drop-4"
          opacity="0"
        />
        <circle
          cx="40"
          cy="72"
          r="1.5"
          fill="#38bdf8"
          class="drop drop-5"
          opacity="0"
        />
        <circle
          cx="65"
          cy="66"
          r="1.5"
          fill="#38bdf8"
          class="drop drop-6"
          opacity="0"
        />
        <circle
          cx="45"
          cy="82"
          r="1.5"
          fill="#38bdf8"
          class="drop drop-7"
          opacity="0"
        />
        <circle
          cx="58"
          cy="78"
          r="1.5"
          fill="#38bdf8"
          class="drop drop-8"
          opacity="0"
        />
        <rect
          x="42"
          y="125"
          width="16"
          height="8"
          rx="2"
          fill="#164e63"
          stroke="#0e7490"
          stroke-width="1"
        />
      </g>
      <defs>
        <linearGradient
          id="towerGrad"
          x1="10"
          y1="8"
          x2="90"
          y2="134"
        >
          <stop
            offset="0%"
            stop-color="#0ea5e9"
          />
          <stop
            offset="50%"
            stop-color="#0284c7"
          />
          <stop
            offset="100%"
            stop-color="#075985"
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
.coolingtower-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left .fan-blades {
  animation: fan_spin var(--dur, 4s) linear infinite;
}

.svg_an_right .fan-blades {
  animation: fan_spin_reverse var(--dur, 4s) linear infinite;
}

.svg_an_left .drop {
  animation: water_fall var(--dur, 4s) ease-in infinite;
}

.svg_an_right .drop {
  animation: water_fall var(--dur, 4s) ease-in infinite;
}

.drop-1 { animation-delay: calc(var(--dur, 4s) * 0.05); }
.drop-2 { animation-delay: calc(var(--dur, 4s) * 0.18); }
.drop-3 { animation-delay: calc(var(--dur, 4s) * 0.32); }
.drop-4 { animation-delay: calc(var(--dur, 4s) * 0.45); }
.drop-5 { animation-delay: calc(var(--dur, 4s) * 0.58); }
.drop-6 { animation-delay: calc(var(--dur, 4s) * 0.70); }
.drop-7 { animation-delay: calc(var(--dur, 4s) * 0.83); }
.drop-8 { animation-delay: calc(var(--dur, 4s) * 0.92); }

.svg_an_stop {
  animation: none !important;
}

@keyframes fan_spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fan_spin_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@keyframes water_fall {
  0% { transform: translateY(0); opacity: 0; }
  15% { opacity: 0.9; }
  70% { opacity: 0.6; }
  100% { transform: translateY(70px); opacity: 0; }
}
</style>
