<template>
  <svg
    class="bucketelevator-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 80 200`"
  >
    <desc>斗式提升机</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g :transform="'rotate(' + roate + ',40,100)'">
      <line
        x1="20"
        y1="15"
        x2="20"
        y2="185"
        stroke="#64748b"
        stroke-width="3"
      />
      <line
        x1="60"
        y1="15"
        x2="60"
        y2="185"
        stroke="#64748b"
        stroke-width="3"
      />
      <circle
        cx="40"
        cy="18"
        r="12"
        fill="#475569"
        stroke="#64748b"
        stroke-width="2"
      />
      <circle
        cx="40"
        cy="182"
        r="10"
        fill="#475569"
        stroke="#64748b"
        stroke-width="2"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's' }"
      >
        <g class="chain-group">
          <circle
            cx="40"
            cy="18"
            r="8"
            fill="#334155"
            class="head-pulley"
          />
          <circle
            cx="40"
            cy="182"
            r="6"
            fill="#334155"
            class="tail-pulley"
          />
          <line
            x1="22"
            y1="30"
            x2="22"
            y2="170"
            stroke="#94a3b8"
            stroke-width="2"
            stroke-dasharray="4,3"
            class="chain-left"
          />
          <line
            x1="58"
            y1="170"
            x2="58"
            y2="30"
            stroke="#94a3b8"
            stroke-width="2"
            stroke-dasharray="4,3"
            class="chain-right"
          />
          <path
            d="M22 28 L40 16 L58 28 Z"
            fill="none"
            stroke="#94a3b8"
            stroke-width="1.5"
            class="chain-top-arc"
          />
          <path
            d="M22 172 L40 184 L58 172 Z"
            fill="none"
            stroke="#94a3b8"
            stroke-width="1.5"
            class="chain-bottom-arc"
          />
          <g class="bucket-up">
            <path
              d="M24 35 L56 35 L52 48 L28 48 Z"
              fill="url(#bucketGrad)"
              opacity="0.9"
            />
            <path
              d="M26 36 L54 36 L50 46 L30 46 Z"
              fill="#a78bfa"
              opacity="0.6"
            />
          </g>
          <g
            class="bucket-up"
            style="transform: translateY(45px)"
          >
            <path
              d="M24 35 L56 35 L52 48 L28 48 Z"
              fill="url(#bucketGrad)"
              opacity="0.9"
            />
            <path
              d="M26 36 L54 36 L50 46 L30 46 Z"
              fill="#a78bfa"
              opacity="0.6"
            />
          </g>
          <g
            class="bucket-up"
            style="transform: translateY(90px)"
          >
            <path
              d="M24 35 L56 35 L52 48 L28 48 Z"
              fill="url(#bucketGrad)"
              opacity="0.9"
            />
            <path
              d="M26 36 L54 36 L50 46 L30 46 Z"
              fill="#a78bfa"
              opacity="0.6"
            />
          </g>
          <g class="bucket-down">
            <path
              d="M24 135 L56 135 L52 148 L28 148 Z"
              fill="url(#bucketGradDark)"
              opacity="0.7"
            />
          </g>
          <g
            class="bucket-down"
            style="transform: translateY(-45px)"
          >
            <path
              d="M24 135 L56 135 L52 148 L28 148 Z"
              fill="url(#bucketGradDark)"
              opacity="0.7"
            />
          </g>
        </g>
      </g>
      <defs>
        <linearGradient
          id="bucketGrad"
          x1="24"
          y1="35"
          x2="52"
          y2="48"
        >
          <stop
            offset="0%"
            stop-color="#a78bfa"
          />
          <stop
            offset="100%"
            stop-color="#7c3aed"
          />
        </linearGradient>
        <linearGradient
          id="bucketGradDark"
          x1="24"
          y1="135"
          x2="52"
          y2="148"
        >
          <stop
            offset="0%"
            stop-color="#7c3aed"
          />
          <stop
            offset="100%"
            stop-color="#5b21b6"
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
.bucketelevator-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left .chain-left {
  animation: chain_move_up var(--dur, 4s) linear infinite;
}
.svg_an_left .chain-right {
  animation: chain_move_down var(--dur, 4s) linear infinite;
}
.svg_an_left .head-pulley {
  animation: pulley_spin var(--dur, 4s) linear infinite;
}
.svg_an_left .tail-pulley {
  animation: pulley_spin var(--dur, 4s) linear infinite;
}
.svg_an_left .bucket-up {
  animation: bucket_lift_up var(--dur, 4s) linear infinite;
}
.svg_an_left .bucket-down {
  animation: bucket_drop_down var(--dur, 4s) linear infinite;
}

.svg_an_right .chain-left {
  animation: chain_move_down var(--dur, 4s) linear infinite;
}
.svg_an_right .chain-right {
  animation: chain_move_up var(--dur, 4s) linear infinite;
}
.svg_an_right .head-pulley {
  animation: pulley_spin_reverse var(--dur, 4s) linear infinite;
}
.svg_an_right .tail-pulley {
  animation: pulley_spin_reverse var(--dur, 4s) linear infinite;
}
.svg_an_right .bucket-up {
  animation: bucket_drop_down var(--dur, 4s) linear infinite;
}
.svg_an_right .bucket-down {
  animation: bucket_lift_up var(--dur, 4s) linear infinite;
}

.svg_an_stop {
  animation: none !important;
}

@keyframes chain_move_up {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -14; }
}

@keyframes chain_move_down {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: 14; }
}

@keyframes pulley_spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulley_spin_reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@keyframes bucket_lift_up {
  0% { transform: translateY(90px); opacity: 1; }
  33% { transform: translateY(45px); opacity: 1; }
  66% { transform: translateY(0px); opacity: 1; }
  99% { transform: translateY(-45px); opacity: 0; }
  100% { transform: translateY(90px); opacity: 0; }
}

@keyframes bucket_drop_down {
  0% { transform: translateY(-45px); opacity: 0; }
  1% { transform: translateY(0px); opacity: 1; }
  34% { transform: translateY(45px); opacity: 1; }
  67% { transform: translateY(90px); opacity: 1; }
  100% { transform: translateY(135px); opacity: 0; }
}
</style>
