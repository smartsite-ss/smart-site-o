<template>
  <svg
    class="impactcrusher-graphic"
    :width="w"
    :height="h"
    :viewBox="`0 0 130 110`"
  >
    <desc>反击式破碎机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ',65,55)'">
      <rect
        x="10"
        y="15"
        width="110"
        height="80"
        rx="6"
        fill="#374151"
        stroke="#4b5563"
        stroke-width="2"
      />
      <path
        d="M10 25 L120 25 L115 15 L15 15 Z"
        fill="#6b7280"
      />
      <path
        d="M10 85 L120 85 L125 95 L5 95 Z"
        fill="#6b7280"
      />
      <line
        x1="35"
        y1="15"
        x2="35"
        y2="95"
        stroke="#9ca3af"
        stroke-width="2"
      />
      <line
        x1="95"
        y1="15"
        x2="95"
        y2="95"
        stroke="#9ca3af"
        stroke-width="2"
      />
      <path
        d="M15 25 L32 45 L15 60 Z"
        fill="#78716c"
        opacity="0.8"
      />
      <path
        d="M115 25 L98 45 L115 60 Z"
        fill="#78716c"
        opacity="0.8"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
        style="transform-box:fill-box; transform-origin:center;"
      >
        <circle
          cx="65"
          cy="55"
          r="22"
          fill="#44403c"
          stroke="#57534e"
          stroke-width="2"
        />
        <circle
          cx="65"
          cy="55"
          r="16"
          fill="url(#rotorGrad)"
        />
        <rect
          x="62"
          y="28"
          width="6"
          height="18"
          rx="2"
          fill="url(#barGrad)"
        />
        <rect
          x="62"
          y="64"
          width="6"
          height="18"
          rx="2"
          fill="url(#barGrad)"
        />
        <rect
          x="38"
          y="52"
          width="18"
          height="6"
          rx="2"
          fill="url(#barGrad)"
        />
        <rect
          x="74"
          y="52"
          width="18"
          height="6"
          rx="2"
          fill="url(#barGrad)"
        />
        <rect
          x="48"
          y="36"
          width="14"
          height="5"
          rx="1"
          fill="url(#barGrad)"
          transform="rotate(-40,55,38)"
        />
        <rect
          x="68"
          y="69"
          width="14"
          height="5"
          rx="1"
          fill="url(#barGrad)"
          transform="rotate(-40,75,71)"
        />
        <circle
          cx="65"
          cy="55"
          r="5"
          fill="#292524"
        />
      </g>
      <g
        v-if="effectiveCls !== 'svg_an_stop'"
        class="spark-group"
      >
        <circle
          cx="33"
          cy="48"
          r="2"
          fill="#fef08a"
          class="spark spark-1"
          opacity="0"
        />
        <circle
          cx="97"
          cy="48"
          r="2"
          fill="#fef08a"
          class="spark spark-2"
          opacity="0"
        />
        <circle
          cx="30"
          cy="54"
          r="1.5"
          fill="#fde047"
          class="spark spark-3"
          opacity="0"
        />
        <circle
          cx="100"
          cy="54"
          r="1.5"
          fill="#fde047"
          class="spark spark-4"
          opacity="0"
        />
      </g>
      <defs>
        <linearGradient
          id="rotorGrad"
          x1="49"
          y1="39"
          x2="81"
          y2="71"
        >
          <stop
            offset="0%"
            stop-color="#ea580c"
          />
          <stop
            offset="100%"
            stop-color="#c2410c"
          />
        </linearGradient>
        <linearGradient
          id="barGrad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            stop-color="#f97316"
          />
          <stop
            offset="100%"
            stop-color="#ea580c"
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
.impactcrusher-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: rotor_spin var(--dur, 3s) linear infinite;
}

.svg_an_right {
  animation: rotor_spin_reverse var(--dur, 3s) linear infinite;
}

.svg_an_stop {
  animation: none;
}

@keyframes rotor_spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes rotor_spin_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

.spark-group .spark {
  animation: flash_spark var(--dur, 3s) ease-in-out infinite;
}

.spark-1 { animation-delay: calc(var(--dur, 3s) * 0.1); }
.spark-2 { animation-delay: calc(var(--dur, 3s) * 0.4); }
.spark-3 { animation-delay: calc(var(--dur, 3s) * 0.6); }
.spark-4 { animation-delay: calc(var(--dur, 3s) * 0.8); }

@keyframes flash_spark {
  0%, 80%, 100% { opacity: 0; }
  85% { opacity: 1; }
  90% { opacity: 0; }
  93% { opacity: 0.8; }
  96% { opacity: 0; }
}
</style>
