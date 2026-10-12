<template>
  <svg
    :width="w"
    :height="h"
    :title="bindTitle"
    style="display:block; overflow:visible;"
  >
    <defs>
      <linearGradient :id="bodyGradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="bodyLight" />
        <stop offset="0.5" :stop-color="bodyColor" />
        <stop offset="1" :stop-color="bodyDark" />
      </linearGradient>
    </defs>

    <!-- 入口/出口管 -->
    <rect
      :x="cx - bw / 2 - pipeLength"
      :y="cy - pipeHeight / 2"
      :width="pipeLength"
      :height="pipeHeight"
      :rx="pipeHeight * 0.2"
      :fill="pipeColor"
    />
    <rect
      :x="cx + bw / 2"
      :y="cy - pipeHeight / 2"
      :width="pipeLength"
      :height="pipeHeight"
      :rx="pipeHeight * 0.2"
      :fill="pipeColor"
    />

    <!-- 主体阴影 -->
    <rect
      :x="bodyX + 3"
      :y="bodyY + 3"
      :width="bw"
      :height="bh"
      :rx="bodyRadius"
      fill="rgba(0, 0, 0, 0.2)"
    />

    <!-- 泵体 -->
    <rect
      :x="bodyX"
      :y="bodyY"
      :width="bw"
      :height="bh"
      :rx="bodyRadius"
      :fill="`url(#${bodyGradientId})`"
      :stroke="bodyStroke"
      stroke-width="1.5"
    />
    <!-- 泵体高光 -->
    <rect
      :x="bodyX + 2"
      :y="bodyY + 2"
      :width="bw - 4"
      :height="bh * 0.22"
      :rx="bodyRadius * 0.8"
      fill="rgba(255, 255, 255, 0.35)"
    />

    <!-- 叶轮舱 -->
    <rect
      :x="cx - chamberW / 2"
      :y="cy - chamberH / 2"
      :width="chamberW"
      :height="chamberH"
      :rx="chamberRadius"
      :fill="chamberColor"
      :stroke="bodyStroke"
      stroke-width="1"
    />

    <!-- 叶轮（运行状态旋转） -->
    <g :style="spinStyle">
      <circle :cx="cx" :cy="cy" :r="impellerRadius * 0.85" :fill="impellerColor" />
      <rect
        v-for="index in 8"
        :key="index"
        :x="cx - bladeWidth / 2"
        :y="cy - impellerRadius"
        :width="bladeWidth"
        :height="impellerRadius * 0.82"
        :rx="bladeWidth * 0.5"
        :fill="impellerLight"
        :transform="`rotate(${(index - 1) * 45} ${cx} ${cy})`"
      />
      <circle :cx="cx" :cy="cy" :r="impellerRadius * 0.28" :fill="hubColor" />
    </g>

    <!-- 法兰 -->
    <rect
      :x="cx - bw / 2 - flangeWidth"
      :y="cy - flangeHeight / 2"
      :width="flangeWidth"
      :height="flangeHeight"
      :rx="2"
      :fill="pipeColor"
    />
    <rect
      :x="cx + bw / 2"
      :y="cy - flangeHeight / 2"
      :width="flangeWidth"
      :height="flangeHeight"
      :rx="2"
      :fill="pipeColor"
    />

    <!-- 螺栓 -->
    <circle
      v-for="(bolt, index) in bolts"
      :key="index"
      :cx="bolt.x"
      :cy="bolt.y"
      :r="boltSize"
      fill="#BDC3C7"
    />

    <!-- 底座 -->
    <rect
      :x="w / 2 - baseW / 2"
      :y="baseY"
      :width="baseW"
      :height="baseH"
      :rx="2"
      :fill="pipeColor"
    />

    <!-- 标签区 -->
    <g v-if="showLabel">
      <rect
        :x="cx - labelW / 2"
        :y="labelY"
        :width="labelW"
        :height="labelH"
        :rx="3"
        fill="rgba(0, 0, 0, 0.08)"
      />
      <text
        :x="cx"
        :y="labelY + labelH * 0.7"
        :fill="labelColor"
        :font-size="labelFontSize"
        text-anchor="middle"
        dominant-baseline="middle"
      >{{ labelText }}</text>
    </g>

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
  highlightColor: string;
  showAnimation: boolean;
  animationSpeed: number;
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

const bodyGradientId = `pump-body-gradient-${Math.random().toString(36).slice(2, 8)}`;

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
  const duration = Math.max(0.2, 1 / Number(props.animationSpeed || 1));
  const direction = props.rotationDirection === 'counterclockwise' ? 'reverse' : 'normal';
  return {
    transformOrigin: `${cx.value}px ${cy.value}px`,
    animation: isSpinning.value ? `pump-spin ${duration}s linear infinite ${direction}` : 'none',
  };
});

const cx = computed(() => props.w / 2);
const cy = computed(() => props.h * 0.45);
const bw = computed(() => props.w * 0.6);
const bh = computed(() => props.h * 0.55);

const bodyX = computed(() => cx.value - bw.value / 2);
const bodyY = computed(() => cy.value - bh.value / 2);
const bodyRadius = computed(() => Math.min(bw.value, bh.value) * 0.12);

const chamberW = computed(() => bw.value * 0.64);
const chamberH = computed(() => bh.value * 0.64);
const chamberRadius = computed(() => Math.min(chamberW.value, chamberH.value) * 0.15);

const impellerRadius = computed(() => Math.min(bw.value, bh.value) * 0.34);
const bladeWidth = computed(() => impellerRadius.value * 0.24);

const pipeLength = computed(() => Math.max(10, props.w * 0.22));
const pipeHeight = computed(() => Math.max(8, bh.value * 0.42));
const flangeWidth = computed(() => Math.max(4, bw.value * 0.08));
const flangeHeight = computed(() => Math.max(10, bh.value * 0.3));

const boltSize = computed(() => Math.max(1.5, Math.min(bw.value, bh.value) * 0.04));
const bolts = computed(() => {
  const list: Array<{ x: number; y: number }> = [];
  for (const x of [cx.value - bw.value * 0.44, cx.value + bw.value * 0.44]) {
    for (let j = 0; j < 4; j++) {
      list.push({ x, y: cy.value + (j - 1.5) * (bh.value * 0.18) });
    }
  }
  return list;
});

const baseY = computed(() => props.h * 0.88);
const baseW = computed(() => props.w * 0.55);
const baseH = computed(() => Math.max(4, props.h * 0.07));

const labelY = computed(() => props.h * 0.72);
const labelW = computed(() => bw.value * 0.7);
const labelH = computed(() => Math.max(10, props.h * 0.12));
const labelFontSize = computed(() => Math.max(8, Math.round(props.h * 0.1)));

const statusLightX = computed(() => props.w - Math.max(8, props.w * 0.12));
const statusLightY = computed(() => props.h * 0.2);
const statusLightRadius = computed(() => Math.max(3, props.w * 0.05));

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
const pipeColor = computed(() => darken(bodyColor.value, 25));
const chamberColor = computed(() => darken(bodyColor.value, 20));
const impellerColor = computed(() => normalizeColor(props.impellerColor));
const impellerLight = computed(() => lighten(impellerColor.value, 15));
const hubColor = computed(() => darken(impellerColor.value, 30));

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
@keyframes pump-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
