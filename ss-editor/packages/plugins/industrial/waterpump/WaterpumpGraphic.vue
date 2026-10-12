<template>
  <svg
    :width="w"
    :height="h"
    :title="bindTitle"
    style="display:block; overflow:visible;"
  >
    <defs>
      <radialGradient :id="bodyGradientId" cx="40%" cy="35%" r="70%">
        <stop offset="0" :stop-color="bodyLight" />
        <stop offset="0.5" :stop-color="bodyColor" />
        <stop offset="1" :stop-color="bodyDark" />
      </radialGradient>
    </defs>

    <!-- 左侧管道 -->
    <rect
      :x="0"
      :y="pipeY"
      :width="leftPipeLength"
      :height="pipeHeight"
      :rx="pipeHeight * 0.2"
      :fill="pipeColor"
    />
    <!-- 右侧管道 -->
    <rect
      :x="rightPipeStartX"
      :y="pipeY"
      :width="w - rightPipeStartX"
      :height="pipeHeight"
      :rx="pipeHeight * 0.2"
      :fill="pipeColor"
    />

    <!-- 泵体 -->
    <circle
      :cx="cx"
      :cy="cy"
      :r="bodyRadius"
      :fill="`url(#${bodyGradientId})`"
      :stroke="bodyStroke"
      stroke-width="2"
    />
    <!-- 泵体高光 -->
    <circle
      :cx="cx - bodyRadius * 0.3"
      :cy="cy - bodyRadius * 0.3"
      :r="bodyRadius * 0.55"
      fill="rgba(255, 255, 255, 0.25)"
    />
    <!-- 叶轮舱 -->
    <circle
      :cx="cx"
      :cy="cy"
      :r="innerRadius"
      :fill="chamberColor"
      :stroke="bodyStroke"
      stroke-width="1.5"
    />

    <!-- 叶轮（运行状态旋转） -->
    <g :style="spinStyle">
      <rect
        v-for="index in 6"
        :key="index"
        :x="cx - bladeWidth / 2"
        :y="cy - impellerRadius"
        :width="bladeWidth"
        :height="impellerRadius * 0.8"
        :rx="bladeWidth * 0.5"
        :fill="impellerLight"
        :transform="`rotate(${(index - 1) * 60} ${cx} ${cy})`"
      />
      <circle :cx="cx" :cy="cy" :r="hubRadius" :fill="hubColor" />
    </g>

    <!-- 法兰 -->
    <rect
      v-for="flangeX in [leftFlangeX, rightFlangeX]"
      :key="flangeX"
      :x="flangeX"
      :y="flangeY"
      :width="flangeWidth"
      :height="flangeHeight"
      :rx="2"
      :fill="flangeColor"
    />

    <!-- 法兰螺栓 -->
    <circle
      v-for="(bolt, index) in flangeBolts"
      :key="index"
      :cx="bolt.x"
      :cy="bolt.y"
      :r="boltRadius"
      fill="#BDC3C7"
      stroke="#5D6D7E"
      stroke-width="0.5"
    />

    <!-- 标签 -->
    <text
      v-if="showLabel && labelText"
      :x="cx"
      :y="labelY"
      :fill="labelColor"
      :font-size="labelFontSize"
      text-anchor="middle"
      dominant-baseline="middle"
    >{{ labelText }}</text>

    <!-- 状态灯（带光晕） -->
    <circle
      :cx="statusLightX"
      :cy="statusLightY"
      :r="statusLightRadius * 1.8"
      :fill="statusColor"
      opacity="0.25"
    />
    <circle
      :cx="statusLightX"
      :cy="statusLightY"
      :r="statusLightRadius"
      :fill="statusColor"
      :stroke="bodyStroke"
      stroke-width="0.8"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTagValue } from '@scada-editor/system';

const props = defineProps<{
  w: number;
  h: number;
  status: string;
  bodyColor: string;
  impellerColor: string;
  pipeColor: string;
  flangeColor: string;
  highlightColor: string;
  showAnimation: boolean;
  rotationSpeed: number;
  rotationDirection: string;
  showLabel: boolean;
  labelText: string;
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

const bodyGradientId = `waterpump-body-gradient-${Math.random().toString(36).slice(2, 8)}`;

/** 解析实时值 → 状态：未绑定时用手动 status；绑定时按「值→状态」映射，未命中用 defaultStatus */
const effectiveStatus = computed(() => {
  if (!props.tagId) return props.status;
  const raw = currentValue.value;
  if (typeof raw === 'boolean') return raw ? 'running' : 'stopped';
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.runningValue !== '' && rawStr === props.runningValue) return 'running';
  if (props.stoppedValue !== '' && rawStr === props.stoppedValue) return 'stopped';
  if (props.faultValue !== '' && rawStr === props.faultValue) return 'fault';
  return props.defaultStatus;
});

const isSpinning = computed(() => effectiveStatus.value === 'running' && props.showAnimation);
const spinStyle = computed(() => {
  const duration = Math.max(0.2, 1 / Number(props.rotationSpeed || 1));
  const direction = props.rotationDirection === 'counterclockwise' ? 'reverse' : 'normal';
  return {
    transformOrigin: `${cx.value}px ${cy.value}px`,
    animation: isSpinning.value ? `waterpump-spin ${duration}s linear infinite ${direction}` : 'none',
  };
});

const cx = computed(() => props.w / 2);
const cy = computed(() => props.h / 2);

const bodyRadius = computed(() => Math.min(props.w * 0.22, props.h * 0.42));
const innerRadius = computed(() => bodyRadius.value * 0.72);
const impellerRadius = computed(() => bodyRadius.value * 0.58);
const hubRadius = computed(() => bodyRadius.value * 0.2);
const bladeWidth = computed(() => impellerRadius.value * 0.3);

const pipeHeight = computed(() => props.h * 0.35);
const pipeY = computed(() => cy.value - pipeHeight.value / 2);
const leftPipeLength = computed(() => cx.value - props.w * 0.22);
const rightPipeStartX = computed(() => cx.value + props.w * 0.22);

const flangeWidth = computed(() => props.w * 0.04);
const flangeHeight = computed(() => props.h * 0.45);
const flangeY = computed(() => cy.value - flangeHeight.value / 2);
const leftFlangeX = computed(() => cx.value - props.w * 0.22 - flangeWidth.value / 2);
const rightFlangeX = computed(() => cx.value + props.w * 0.22 - flangeWidth.value / 2);

const boltRadius = computed(() => Math.max(1.5, Math.min(props.w, props.h) * 0.015));
const flangeBolts = computed(() => {
  const xs = [leftFlangeX.value + flangeWidth.value / 2, rightFlangeX.value + flangeWidth.value / 2];
  const ys = [cy.value - flangeHeight.value * 0.3, cy.value + flangeHeight.value * 0.3];
  const list: Array<{ x: number; y: number }> = [];
  for (const x of xs) for (const y of ys) list.push({ x, y });
  return list;
});

const labelY = computed(() => props.h * 0.92);
const labelFontSize = computed(() => Math.max(7, Math.round(props.h * 0.1)));

const statusLightX = computed(() => props.w - Math.max(8, props.w * 0.08));
const statusLightY = computed(() => Math.max(8, props.h * 0.15));
const statusLightRadius = computed(() => Math.max(3, props.w * 0.04));

const statusColor = computed(() => {
  switch (effectiveStatus.value) {
    case 'fault': return '#E74C3C';
    case 'running': return normalizeColor(props.highlightColor);
    default: return '#95A5A6';
  }
});

const bodyColor = computed(() => normalizeColor(props.bodyColor));
const bodyLight = computed(() => lighten(bodyColor.value, 25));
const bodyDark = computed(() => darken(bodyColor.value, 30));
const bodyStroke = computed(() => darken(bodyColor.value, 40));
const chamberColor = computed(() => darken(bodyColor.value, 22));
const pipeColor = computed(() => normalizeColor(props.pipeColor));
const flangeColor = computed(() => normalizeColor(props.flangeColor));
const impellerColor = computed(() => normalizeColor(props.impellerColor));
const impellerLight = computed(() => lighten(impellerColor.value, 15));
const hubColor = computed(() => darken(impellerColor.value, 25));

const labelText = computed(() =>
  props.labelText || props.deviceName || props.deviceCode || props.tagName || '',
);
const labelColor = computed(() => darken(bodyColor.value, 30));

function normalizeColor(hex: string): string {
  if (!hex || typeof hex !== 'string') return '#7f8c8d';
  if (hex.length === 9 && hex.startsWith('#')) return hex.substring(0, 7);
  return hex;
}

function parseHex(hex: string): [number, number, number] {
  const c = normalizeColor(hex);
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function toHex(r: number, g: number, b: number): string {
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(Math.min(255, r + amount), Math.min(255, g + amount), Math.min(255, b + amount));
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(Math.max(0, r - amount), Math.max(0, g - amount), Math.max(0, b - amount));
}
</script>

<style scoped>
@keyframes waterpump-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
