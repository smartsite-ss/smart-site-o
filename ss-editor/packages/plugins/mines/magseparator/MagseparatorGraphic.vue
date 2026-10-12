<template>
  <svg
    class="magseparator-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 150 80`"
  >
    <desc>磁选机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ',75,40)'">
      <path
        d="M15 10 L30 10 L35 25 L10 25 Z"
        fill="#78716c"
        stroke="#57534e"
        stroke-width="1"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >
        <ellipse
          cx="75"
          cy="45"
          rx="40"
          ry="26"
          fill="url(#drumGrad)"
          stroke="#7f1d1d"
          stroke-width="2"
        />
        <ellipse
          cx="75"
          cy="45"
          rx="32"
          ry="20"
          fill="none"
          stroke="#b91c1c"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="42"
          y1="38"
          x2="108"
          y2="52"
          stroke="#fecaca"
          stroke-width="1"
          opacity="0.4"
        />
        <line
          x1="43"
          y1="44"
          x2="107"
          y2="46"
          stroke="#fecaca"
          stroke-width="1"
          opacity="0.4"
        />
        <path
          d="M115 28 Q130 40 118 55"
          fill="none"
          stroke="#60a5fa"
          stroke-width="1.5"
          stroke-dasharray="3,2"
          class="field-line-1"
          opacity="0.6"
        />
        <path
          d="M120 33 Q132 41 122 52"
          fill="none"
          stroke="#60a5fa"
          stroke-width="1"
          stroke-dasharray="2,2"
          class="field-line-2"
          opacity="0.4"
        />
        <circle
          cx="75"
          cy="45"
          r="8"
          fill="#450a0a"
          stroke="#7f1d1d"
          stroke-width="1"
        />
        <circle
          cx="75"
          cy="45"
          r="3"
          fill="#dc2626"
          class="drum-center"
        />
      </g>
      <path
        d="M110 58 L125 72 L140 68 L125 56 Z"
        fill="#374151"
        stroke="#4b5563"
        stroke-width="1"
      />
      <path
        d="M108 62 L90 74 L95 76 L112 65 Z"
        fill="#4b5563"
        stroke="#6b7280"
        stroke-width="1"
      />
      <rect
        x="128"
        y="66"
        width="18"
        height="6"
        rx="2"
        fill="#22c55e"
        opacity="0.7"
      />
      <text
        x="134"
        y="71"
        font-size="4"
        fill="#fff"
      >精矿</text>
      <rect
        x="88"
        y="73"
        width="16"
        height="5"
        rx="1"
        fill="#94a3b8"
        opacity="0.7"
      />
      <text
        x="89"
        y="77"
        font-size="3.5"
        fill="#fff"
      >尾矿</text>
      <defs>
        <linearGradient
          id="drumGrad"
          x1="35"
          y1="19"
          x2="115"
          y2="71"
        >
          <stop
            offset="0%"
            stop-color="#991b1b"
          />
          <stop
            offset="50%"
            stop-color="#b91c1c"
          />
          <stop
            offset="100%"
            stop-color="#7f1d1d"
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
.magseparator-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left .drum-center {
  animation: drum_spin var(--dur, 5s) linear infinite;
}
.svg_an_left .field-line-1 {
  animation: field_pulse var(--dur, 5s) ease-in-out infinite;
}
.svg_an_left .field-line-2 {
  animation: field_pulse var(--dur, 5s) ease-in-out infinite 0.5s;
}

.svg_an_right .drum-center {
  animation: drum_spin_reverse var(--dur, 5s) linear infinite;
}

.svg_an_stop {
  animation: none !important;
}

@keyframes drum_spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes drum_spin_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@keyframes field_pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
</style>
