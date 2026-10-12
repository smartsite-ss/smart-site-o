<template>
  <svg
    class="aircompressor-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 120 100`"
  >
    <desc>空压机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ',60,50)'">
      <rect
        x="15"
        y="55"
        width="90"
        height="35"
        rx="6"
        fill="#374151"
        stroke="#4b5563"
        stroke-width="2"
      />
      <line
        x1="25"
        y1="58"
        x2="95"
        y2="58"
        stroke="#64748b"
        stroke-width="1"
      />
      <line
        x1="25"
        y1="63"
        x2="95"
        y2="63"
        stroke="#64748b"
        stroke-width="1"
      />
      <line
        x1="25"
        y1="68"
        x2="95"
        y2="68"
        stroke="#64748b"
        stroke-width="1"
      />
      <line
        x1="25"
        y1="73"
        x2="95"
        y2="73"
        stroke="#64748b"
        stroke-width="1"
      />
      <line
        x1="25"
        y1="78"
        x2="95"
        y2="78"
        stroke="#64748b"
        stroke-width="1"
      />
      <line
        x1="25"
        y1="83"
        x2="95"
        y2="83"
        stroke="#64748b"
        stroke-width="1"
      />
      <rect
        x="20"
        y="12"
        width="80"
        height="40"
        rx="4"
        fill="#475569"
        stroke="#64748b"
        stroke-width="1.5"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >
        <circle
          cx="45"
          cy="32"
          r="14"
          fill="#334155"
          stroke="#475569"
          stroke-width="2"
          class="screw-body"
        />
        <ellipse
          cx="45"
          cy="32"
          rx="8"
          ry="10"
          fill="url(#screwGrad)"
          class="screw-rotor"
        />
        <path
          d="M42 22 L44 28 L46 24 L48 30 L46 36 L44 34 L42 38 L40 32 Z"
          fill="#94a3b8"
          opacity="0.6"
          class="screw-blade"
        />
        <circle
          cx="85"
          cy="26"
          r="10"
          fill="#e5e7eb"
          stroke="#9ca3af"
          stroke-width="1.5"
          class="gauge-face"
        />
        <circle
          cx="85"
          cy="26"
          r="8"
          fill="#f9fafb"
        />
        <line
          x1="85"
          y1="20"
          x2="85"
          y2="21"
          stroke="#374151"
          stroke-width="0.8"
        />
        <line
          x1="91"
          y1="26"
          x2="92"
          y2="26"
          stroke="#374151"
          stroke-width="0.8"
        />
        <line
          x1="85"
          y1="32"
          x2="85"
          y2="31"
          stroke="#374151"
          stroke-width="0.8"
        />
        <line
          x1="79"
          y1="26"
          x2="78"
          y2="26"
          stroke="#374151"
          stroke-width="0.8"
        />
        <line
          x1="85"
          y1="26"
          x2="89"
          y2="23"
          stroke="#ef4444"
          stroke-width="1.5"
          stroke-linecap="round"
          class="gauge-needle"
        />
        <circle
          cx="85"
          cy="26"
          r="2"
          fill="#374151"
        />
      </g>
      <rect
        x="98"
        y="68"
        width="10"
        height="16"
        rx="2"
        fill="#1e293b"
        stroke="#334155"
        stroke-width="1"
      />
      <line
        x1="101"
        y1="71"
        x2="105"
        y2="71"
        stroke="#64748b"
        stroke-width="0.8"
      />
      <line
        x1="101"
        y1="74"
        x2="105"
        y2="74"
        stroke="#64748b"
        stroke-width="0.8"
      />
      <line
        x1="101"
        y1="77"
        x2="105"
        y2="77"
        stroke="#64748b"
        stroke-width="0.8"
      />
      <line
        x1="101"
        y1="80"
        x2="105"
        y2="80"
        stroke="#64748b"
        stroke-width="0.8"
      />
      <defs>
        <linearGradient
          id="screwGrad"
          x1="37"
          y1="22"
          x2="53"
          y2="42"
        >
          <stop
            offset="0%"
            stop-color="#64748b"
          />
          <stop
            offset="100%"
            stop-color="#475569"
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
.aircompressor-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left .screw-rotor {
  animation: screw_spin var(--dur, 3s) linear infinite;
}
.svg_an_left .screw-blade {
  animation: blade_rotate var(--dur, 3s) linear infinite;
}
.svg_an_left .gauge-needle {
  animation: needle_wiggle calc(var(--dur, 3s) * 0.3) ease-in-out infinite;
}

.svg_an_right .screw-rotor {
  animation: screw_spin_reverse var(--dur, 3s) linear infinite;
}
.svg_an_right .screw-blade {
  animation: blade_rotate_reverse var(--dur, 3s) linear infinite;
}

.svg_an_stop {
  animation: none !important;
}

@keyframes screw_spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes screw_spin_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@keyframes blade_rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes blade_rotate_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@keyframes needle_wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(3deg); }
  75% { transform: rotate(-2deg); }
}
</style>
