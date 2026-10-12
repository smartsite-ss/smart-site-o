<template>
  <svg
    class="motor-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 ${w} ${h}`"
  >
    <rect
      v-if="backgroundColor && backgroundColor !== '#00000000'"
      :width="w"
      :height="h"
      :fill="backgroundColor"
    />
    <g :transform="`translate(${cx}, ${cy})`">
      <circle
        cx="0"
        cy="0"
        :r="circleR"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <text
        x="0"
        y="0"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="color"
        :font-size="fontSize"
        font-family="Arial, sans-serif"
        font-weight="bold"
      >M</text>
      <path
        v-if="effectiveRunning"
        :d="arrowPathD"
        fill="none"
        :stroke="arrowColor"
        :stroke-width="lineWidth * 0.8"
        stroke-linecap="round"
      />
      <path
        v-if="effectiveRunning"
        :d="arrowHeadD"
        :fill="arrowColor"
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
  color: string;
  backgroundColor: string;
  lineWidth: number;
  running: boolean;
  runningValue: string;
  stoppedValue: string;
  faultValue: string;
  defaultStatus: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
}>();

const { currentValue, bindTitle } = useTagValue(props);

/** 解析实时值 → 启停：未绑定时用手动 running；绑定时按「值→状态」映射，未命中用 defaultStatus */
const effectiveStatus = computed(() => {
  if (!props.tagId) return props.running ? 'running' : 'stopped';
  const raw = currentValue.value;
  if (typeof raw === 'boolean') return raw ? 'running' : 'stopped';
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.runningValue !== '' && rawStr === props.runningValue) return 'running';
  if (props.stoppedValue !== '' && rawStr === props.stoppedValue) return 'stopped';
  if (props.faultValue !== '' && rawStr === props.faultValue) return 'fault';
  return props.defaultStatus;
});

const effectiveRunning = computed(() => effectiveStatus.value === 'running');

const cx = computed(() => props.w / 2);
const cy = computed(() => props.h / 2);
const circleR = computed(() => Math.min(props.w, props.h) * 0.4);
const fontSize = computed(() => circleR.value * 1.0);
const arrowR = computed(() => circleR.value + props.lineWidth + 3);
const arrowColor = computed(() => props.color);

const arrowPathD = computed(() => {
  const r = arrowR.value;
  const startAngle = -40;
  const endAngle = 220;
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = r * Math.cos(startRad);
  const y1 = r * Math.sin(startRad);
  const x2 = r * Math.cos(endRad);
  const y2 = r * Math.sin(endRad);
  return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
});

const arrowHeadD = computed(() => {
  const r = arrowR.value;
  const angle = 220;
  const rad = (angle * Math.PI) / 180;
  const tipX = r * Math.cos(rad);
  const tipY = r * Math.sin(rad);
  const tangentAngle = rad + Math.PI / 2;
  const size = 4;
  const ax1 = tipX + size * Math.cos(tangentAngle + 2.5);
  const ay1 = tipY + size * Math.sin(tangentAngle + 2.5);
  const ax2 = tipX + size * Math.cos(tangentAngle - 2.5);
  const ay2 = tipY + size * Math.sin(tangentAngle - 2.5);
  return `M ${tipX} ${tipY} L ${ax1} ${ay1} L ${ax2} ${ay2} Z`;
});
</script>

<style scoped>
.motor-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
