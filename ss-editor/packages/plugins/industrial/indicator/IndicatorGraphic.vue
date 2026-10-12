<template>
  <svg
    :width="w"
    :height="h"
    :title="bindTitle"
    style="display:block; overflow:visible;"
  >
    <defs>
      <radialGradient :id="glowGradientId" cx="50%" cy="50%" r="50%">
        <stop offset="0" :stop-color="lightColor" :stop-opacity="0.35" />
        <stop offset="0.5" :stop-color="lightColor" :stop-opacity="0.1" />
        <stop offset="1" :stop-color="lightColor" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- 光晕 -->
    <g v-if="effectiveStatus !== 'off'" :style="blinkStyle">
      <circle :cx="cx" :cy="cy" :r="glowRadius" :fill="`url(#${glowGradientId})`" />
    </g>

    <!-- 外壳 -->
    <circle
      :cx="cx"
      :cy="cy"
      :r="housingRadius"
      fill="#34495E"
      :stroke="housingStroke"
      stroke-width="1"
    />

    <!-- 灯珠 -->
    <g :style="blinkStyle">
      <circle :cx="cx" :cy="cy" :r="radius" :fill="lightColor" />
      <!-- 高光 -->
      <circle
        :cx="cx - radius * 0.25"
        :cy="cy - radius * 0.25"
        :r="radius * 0.45"
        fill="rgba(255, 255, 255, 0.45)"
      />
    </g>

    <!-- 标签 -->
    <text
      v-if="showLabel"
      :x="cx"
      :y="labelY"
      :fill="labelColor"
      :font-size="labelFontSize"
      text-anchor="middle"
      dominant-baseline="hanging"
    >{{ labelText }}</text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { i18n } from '@scada-editor/core';
import { useTagValue } from '@scada-editor/system';

const props = defineProps<{
  w: number;
  h: number;
  status: string;
  onColor: string;
  offColor: string;
  warningColor: string;
  faultColor: string;
  blinkOnAlarm: boolean;
  blinkInterval: number;
  showLabel: boolean;
  labelText: string;
  labelColor: string;
  onValue: string;
  offValue: string;
  warningValue: string;
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

const glowGradientId = `indicator-glow-gradient-${Math.random().toString(36).slice(2, 8)}`;

/** 解析实时值 → 状态：未绑定时用手动 status；绑定时按「值→状态」映射，未命中用 defaultStatus */
const effectiveStatus = computed(() => {
  if (!props.tagId) return props.status;
  const raw = currentValue.value;
  if (typeof raw === 'boolean') return raw ? 'on' : 'off';
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.onValue !== '' && rawStr === props.onValue) return 'on';
  if (props.offValue !== '' && rawStr === props.offValue) return 'off';
  if (props.warningValue !== '' && rawStr === props.warningValue) return 'warning';
  if (props.faultValue !== '' && rawStr === props.faultValue) return 'fault';
  return props.defaultStatus;
});

const shouldBlink = computed(() =>
  (effectiveStatus.value === 'warning' || effectiveStatus.value === 'fault') && props.blinkOnAlarm,
);
const blinkStyle = computed(() => ({
  animation: shouldBlink.value
    ? `indicator-blink ${props.blinkInterval}ms ease-in-out infinite`
    : 'none',
}));

const cx = computed(() => props.w / 2);
const cy = computed(() => props.h / 2);
const radius = computed(() => Math.min(props.w, props.h) * 0.38);
const housingRadius = computed(() => radius.value * 1.15);
const glowRadius = computed(() => radius.value * 2.2);

const labelY = computed(() => cy.value + radius.value * 1.4);
const labelFontSize = computed(() => Math.max(8, Math.round(props.w * 0.28)));

const lightColor = computed(() => {
  switch (effectiveStatus.value) {
    case 'on': return normalizeColor(props.onColor);
    case 'off': return normalizeColor(props.offColor);
    case 'warning': return normalizeColor(props.warningColor);
    case 'fault': return normalizeColor(props.faultColor);
    default: return normalizeColor(props.offColor);
  }
});

const labelColor = computed(() => normalizeColor(props.labelColor));
const housingStroke = computed(() => '#7F8C8D');

const labelText = computed(() =>
  props.labelText || statusLabel(effectiveStatus.value),
);

function normalizeColor(hex: string): string {
  if (!hex || typeof hex !== 'string') return '#7f8c8d';
  if (hex.length === 9 && hex.startsWith('#')) return hex.substring(0, 7);
  return hex;
}

function statusLabel(status: string): string {
  const key = `indicator.options.status.${status}`;
  const translated = i18n.global.t(key) as string;
  return translated !== key ? translated : status;
}
</script>

<style scoped>
@keyframes indicator-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.15;
  }
}
</style>
