<template>
  <svg
    class="orebin-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 120 130`"
  >
    <desc>料仓/矿仓</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ',60,65)'">
      <path
        d="M20 10 L100 10 L95 70 L25 70 Z"
        fill="#a8a29e"
        stroke="#78716c"
        stroke-width="2"
      />
      <path
        d="M25 70 L95 70 L65 115 L55 115 Z"
        fill="#a8a29e"
        stroke="#78716c"
        stroke-width="2"
      />
      <rect
        x="54"
        y="113"
        width="12"
        height="8"
        rx="2"
        fill="#57534e"
        stroke="#44403c"
        stroke-width="1"
      />
      <line
        x1="56"
        y1="117"
        x2="64"
        y2="117"
        stroke="#78716c"
        stroke-width="1"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >
        <clipPath id="binClip">
          <path d="M22 12 L98 12 L93 68 L27 68 Z" />
        </clipPath>
        <g clip-path="url(#binClip)">
          <rect
            x="22"
            :y="68 - (effectiveValue * 0.56)"
            width="76"
            :height="effectiveValue * 0.56"
            fill="url(#oreGrad)"
            class="ore-fill"
          />
        </g>
        <g
          v-if="showDischarge && cls !== 'svg_an_stop'"
          class="discharge-group"
        >
          <circle
            cx="58"
            cy="122"
            r="2"
            fill="#92400e"
            class="particle p-1"
            opacity="0"
          />
          <circle
            cx="62"
            cy="123"
            r="1.8"
            fill="#b45309"
            class="particle p-2"
            opacity="0"
          />
          <circle
            cx="60"
            cy="124"
            r="2.2"
            fill="#78350f"
            class="particle p-3"
            opacity="0"
          />
        </g>
        <line
          x1="102"
          y1="15"
          x2="102"
          y2="65"
          stroke="#64748b"
          stroke-width="1"
        />
        <line
          x1="102"
          y1="15"
          x2="106"
          y2="15"
          stroke="#64748b"
          stroke-width="0.8"
        />
        <text
          x="107"
          y="17"
          font-size="5"
          fill="#64748b"
        >100</text>
        <line
          x1="102"
          y1="32"
          x2="105"
          y2="32"
          stroke="#64748b"
          stroke-width="0.7"
        />
        <text
          x="106"
          y="34"
          font-size="4.5"
          fill="#64748b"
        >75</text>
        <line
          x1="102"
          y1="49"
          x2="105"
          y2="49"
          stroke="#64748b"
          stroke-width="0.7"
        />
        <text
          x="106"
          y="51"
          font-size="4.5"
          fill="#64748b"
        >50</text>
        <line
          x1="102"
          y1="66"
          x2="105"
          y2="66"
          stroke="#64748b"
          stroke-width="0.7"
        />
        <text
          x="106"
          y="68"
          font-size="4.5"
          fill="#64748b"
        >25</text>
      </g>
      <defs>
        <linearGradient
          id="oreGrad"
          x1="22"
          y1="12"
          x2="98"
          y2="68"
        >
          <stop
            offset="0%"
            stop-color="#92400e"
          />
          <stop
            offset="100%"
            stop-color="#78350f"
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
  showDischarge: boolean;
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
.orebin-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left .ore-fill {
  animation: ore_settle var(--dur, 4s) ease-in-out infinite;
}

.svg_an_left .particle {
  animation: particle_fall var(--dur, 4s) ease-in infinite;
}

.p-1 { animation-delay: calc(var(--dur, 4s) * 0.05); }
.p-2 { animation-delay: calc(var(--dur, 4s) * 0.35); }
.p-3 { animation-delay: calc(var(--dur, 4s) * 0.65); }

.svg_an_right .ore-fill {
  animation: ore_settle var(--dur, 4s) ease-in-out infinite;
}

.svg_an_stop {
  animation: none !important;
}

@keyframes ore_settle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.92; }
}

@keyframes particle_fall {
  0% { transform: translateY(-2px); opacity: 0; }
  20% { opacity: 0.9; }
  80% { opacity: 0.5; transform: translateY(8px); }
  100% { transform: translateY(12px); opacity: 0; }
}
</style>
