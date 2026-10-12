<template>
  <svg
    :width="w"
    :height="h"
    :title="bindTitle"
    style="display:block; overflow:visible;"
  >
    <!-- 蝶阀 -->
    <g v-if="valveType === 'butterfly'">
      <!-- 阀体 -->
      <rect
        :x="cx - bodyW / 2"
        :y="cy - bodyH / 2"
        :width="bodyW"
        :height="bodyH"
        :rx="bodyH * 0.3"
        :fill="bodyColor"
      />
      <!-- 法兰 -->
      <rect
        :x="cx - bodyW / 2 - flangeW / 3"
        :y="cy - flangeH / 2"
        :width="flangeW"
        :height="flangeH"
        :rx="3"
        :fill="flangeColor"
      />
      <rect
        :x="cx + bodyW / 2 - flangeW * 0.7"
        :y="cy - flangeH / 2"
        :width="flangeW"
        :height="flangeH"
        :rx="3"
        :fill="flangeColor"
      />
      <!-- 蝶板 -->
      <ellipse
        :cx="cx"
        :cy="cy"
        :rx="discRadius"
        :ry="discRadius * 0.35"
        :fill="indicatorColor"
        :stroke="discStroke"
        stroke-width="1.5"
        :transform="`rotate(${discAngle} ${cx} ${cy})`"
      />
      <!-- 阀杆 -->
      <rect
        :x="cx - stemW / 2"
        :y="cy - bodyH / 2 - stemH"
        :width="stemW"
        :height="stemH"
        :rx="stemW * 0.5"
        :fill="stemColor"
      />
      <!-- 手轮 -->
      <circle :cx="cx" :cy="hwY" :r="hwRadius" fill="none" :stroke="stemColor" stroke-width="2" />
      <line :x1="cx - hwRadius" :y1="hwY" :x2="cx + hwRadius" :y2="hwY" :stroke="stemColor" stroke-width="2" />
    </g>

    <!-- 闸阀 -->
    <g v-else>
      <rect
        :x="cx - gateBodyW / 2"
        :y="cy - gateBodyH / 2"
        :width="gateBodyW"
        :height="gateBodyH"
        :rx="gateBodyH * 0.3"
        :fill="bodyColor"
      />
      <!-- 闸板（开度随状态） -->
      <rect
        :x="cx - gateBodyW * 0.4"
        :y="cy - gateBodyH * 0.5"
        :width="gateBodyW * 0.8"
        :height="gateBodyH * (1 - gateOpen)"
        :fill="indicatorColor"
      />
      <rect
        :x="cx - stemW / 2"
        :y="cy - gateBodyH / 2 - stemH"
        :width="stemW"
        :height="stemH"
        :rx="stemW * 0.5"
        :fill="stemColor"
      />
      <circle :cx="cx" :cy="gateHwY" :r="hwRadius" fill="none" :stroke="stemColor" stroke-width="2" />
    </g>

    <!-- 标签 -->
    <text
      v-if="showLabel"
      :x="cx"
      :y="h * 0.92"
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
  valveType: string;
  bodyColor: string;
  stemColor: string;
  openColor: string;
  closedColor: string;
  faultColor: string;
  showLabel: boolean;
  labelText: string;
  openValue: string;
  closedValue: string;
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

/** 解析实时值 → 状态：未绑定时用手动 status；绑定时按「值→状态」映射，未命中用 defaultStatus */
const effectiveStatus = computed(() => {
  if (!props.tagId) return props.status;
  const raw = currentValue.value;
  if (typeof raw === 'boolean') return raw ? 'open' : 'closed';
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.openValue !== '' && rawStr === props.openValue) return 'open';
  if (props.closedValue !== '' && rawStr === props.closedValue) return 'closed';
  if (props.faultValue !== '' && rawStr === props.faultValue) return 'fault';
  return props.defaultStatus;
});

const cx = computed(() => props.w / 2);
const cy = computed(() => props.h / 2);

const bodyW = computed(() => props.w * 0.7);
const bodyH = computed(() => props.h * 0.55);
const gateBodyW = computed(() => props.w * 0.6);
const gateBodyH = computed(() => props.h * 0.5);
const stemW = computed(() => props.w * 0.06);
const stemH = computed(() => props.h * 0.35);
const hwRadius = computed(() => props.w * 0.1);
const flangeW = computed(() => bodyW.value * 0.12);
const flangeH = computed(() => bodyH.value * 0.6);

const discRadius = computed(() => Math.min(bodyW.value, bodyH.value) * 0.65);
const discAngle = computed(() => {
  switch (effectiveStatus.value) {
    case 'open': return 0;
    case 'opening': return 45;
    case 'closing': return 45;
    case 'fault': return 45;
    default: return 90;
  }
});
const gateOpen = computed(() => (effectiveStatus.value === 'open' ? 0.7 : 0));

const hwY = computed(() => cy.value - bodyH.value / 2 - stemH.value - hwRadius.value * 0.3);
const gateHwY = computed(() => cy.value - gateBodyH.value / 2 - stemH.value - hwRadius.value);

const indicatorColor = computed(() => {
  switch (effectiveStatus.value) {
    case 'open': return normalizeColor(props.openColor);
    case 'fault': return normalizeColor(props.faultColor);
    default: return normalizeColor(props.closedColor);
  }
});
const discStroke = computed(() => darken(indicatorColor.value));
const bodyColor = computed(() => normalizeColor(props.bodyColor));
const stemColor = computed(() => normalizeColor(props.stemColor));
const flangeColor = computed(() => darken(bodyColor.value));

const labelColor = computed(() =>
  effectiveStatus.value === 'open' ? normalizeColor(props.openColor) : '#FFFFFF',
);
const labelFontSize = computed(() => Math.max(8, Math.round(props.h * 0.12)));

const labelText = computed(() => props.labelText || statusLabel(effectiveStatus.value));

function normalizeColor(hex: string): string {
  if (!hex || typeof hex !== 'string') return '#7f8c8d';
  if (hex.length === 9 && hex.startsWith('#')) return hex.substring(0, 7);
  return hex;
}

function darken(hex: string): string {
  const c = normalizeColor(hex);
  const n = parseInt(c.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 40);
  const g = Math.max(0, ((n >> 8) & 0xff) - 40);
  const b = Math.max(0, (n & 0xff) - 40);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function statusLabel(status: string): string {
  const key = `valve.options.status.${status}`;
  const translated = i18n.global.t(key) as string;
  return translated !== key ? translated : status;
}
</script>
