<template>
  <svg
    :width="w"
    :height="h"
    :title="bindTitle"
    style="display:block; overflow:visible;"
  >
    <defs>
      <clipPath :id="clipId">
        <rect :x="tankX" :y="liquidTop" :width="tankW" :height="liquidH" :rx="6" />
      </clipPath>
    </defs>

    <!-- 罐体 -->
    <rect :x="tankX" :y="tankY" :width="tankW" :height="tankH" :rx="6" :fill="bodyColor" />
    <rect
      :x="tankX + 1"
      :y="tankY + 1"
      :width="tankW - 2"
      :height="tankH - 2"
      :rx="5"
      fill="none"
      :stroke="rimColor"
      stroke-width="3"
    />

    <!-- 液体 -->
    <g v-if="liquidH > 0" :clip-path="`url(#${clipId})`">
      <rect :x="tankX" :y="liquidTop" :width="tankW" :height="liquidH" :fill="liquidColor" />
      <path
        :d="wavePath"
        fill="none"
        :stroke="waveStroke"
        stroke-width="1.5"
        :class="{ 'tank-wave-anim': showAnimation }"
      />
    </g>

    <!-- 刻度线 -->
    <g v-if="showTicks">
      <line
        v-for="(tick, index) in tickLines"
        :key="index"
        :x1="tick.x1"
        :y1="tick.y1"
        :x2="tick.x2"
        :y2="tick.y2"
        :stroke="rimColor"
        stroke-width="1"
      />
    </g>

    <!-- 液位文本 -->
    <text
      v-if="showLevelText"
      :x="tankX + tankW / 2"
      :y="tankH * 0.5"
      fill="#FFFFFF"
      :font-size="levelFontSize"
      font-weight="bold"
      text-anchor="middle"
      dominant-baseline="middle"
    >{{ levelText }}</text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTagValue } from '@scada-editor/system';

const props = defineProps<{
  w: number;
  h: number;
  level: number;
  maxLevel: number;
  unit: string;
  decimalPlaces: number;
  status: string;
  warningLevel: number;
  dangerLevel: number;
  bodyColor: string;
  liquidColor: string;
  warningLiquidColor: string;
  dangerLiquidColor: string;
  rimColor: string;
  showLevelText: boolean;
  showAnimation: boolean;
  showTicks: boolean;
  tickCount: number;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
}>();

const { currentValue, displayValue, bindTitle } = useTagValue(props);

const clipId = `tank-clip-${Math.random().toString(36).slice(2, 9)}`;

const tankX = computed(() => props.w * 0.08);
const tankY = 0;
const tankW = computed(() => props.w - tankX.value * 2);
const tankH = computed(() => props.h);

/** 有效实时液位：绑定标签时读 WS 实时值，未绑定则回退静态 level */
const effectiveLevel = computed(() => {
  if (props.tagId) {
    const v = Number(currentValue.value);
    return Number.isFinite(v) ? v : Number(props.level);
  }
  return Number(props.level);
});

const maxLevel = computed(() => Number(props.maxLevel) || 100);
const liquidH = computed(() => Math.min((effectiveLevel.value / maxLevel.value) * tankH.value, tankH.value));
const liquidTop = computed(() => tankY + tankH.value - liquidH.value);

const liquidColor = computed(() => {
  const level = effectiveLevel.value;
  if (level >= Number(props.dangerLevel)) return normalizeColor(props.dangerLiquidColor);
  if (level >= Number(props.warningLevel)) return normalizeColor(props.warningLiquidColor);
  return normalizeColor(props.liquidColor);
});

const displayText = computed(() => {
  if (props.tagId) return displayValue.value;
  return formatNumber(props.level, props.decimalPlaces);
});
const levelText = computed(() => (props.unit ? `${displayText.value}${props.unit}` : displayText.value));

const waveAmplitude = computed(() => Math.max(1.5, liquidH.value * 0.04));
const wavePath = computed(() =>
  wavePathD(tankX.value, liquidTop.value, tankW.value, waveAmplitude.value),
);
const waveStroke = computed(() => `rgba(255, 255, 255, 0.5)`);

const tickLines = computed(() => {
  const result: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  if (!props.showTicks) return result;
  const count = Math.max(1, Number(props.tickCount));
  for (let i = 1; i <= count; i++) {
    const ty = tankY + tankH.value - (tankH.value * i) / (count + 1);
    result.push({ x1: tankX.value + 6, y1: ty, x2: tankX.value + 20, y2: ty });
  }
  return result;
});

const levelFontSize = computed(() => Math.max(10, Math.round(tankH.value * 0.08)));

function normalizeColor(hex: string): string {
  if (!hex || typeof hex !== 'string') return '#7f8c8d';
  if (hex.length === 9 && hex.startsWith('#')) return hex.substring(0, 7);
  return hex;
}

function wavePathD(x: number, topY: number, width: number, amplitude: number): string {
  let d = `M ${x.toFixed(2)} ${topY.toFixed(2)}`;
  const segments = 40;
  for (let i = 0; i <= segments; i++) {
    const px = x + (width * i) / segments;
    const py = topY + Math.sin((i / segments) * Math.PI * 2 * 2) * amplitude;
    d += ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
  }
  return d;
}

function formatNumber(value: unknown, decimalPlaces?: number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? '');
  return num.toFixed(decimalPlaces ?? 2);
}
</script>

<style scoped>
.tank-wave-anim {
  animation: tank-wave-drift 2.2s linear infinite;
}
@keyframes tank-wave-drift {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-16px);
  }
}
</style>
