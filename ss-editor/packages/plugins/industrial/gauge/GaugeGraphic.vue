<template>
  <svg
    :width="w"
    :height="h"
    :title="bindTitle"
    style="display:block; overflow:visible;"
  >
    <!-- 外圈 rim -->
    <circle :cx="cx" :cy="cy" :r="radius * 1.15" :fill="rimColor" />
    <!-- 表盘 face -->
    <circle :cx="cx" :cy="cy" :r="radius" :fill="faceColor" />

    <!-- 量程彩色弧（正常/警告/危险） -->
    <path :d="normalArc" fill="none" :stroke="normalColor" :stroke-width="arcWidth" />
    <path v-if="warningArcVisible" :d="warningArc" fill="none" :stroke="warningColor" :stroke-width="arcWidth" />
    <path v-if="dangerArcVisible" :d="dangerArc" fill="none" :stroke="dangerColor" :stroke-width="arcWidth" />

    <!-- 刻度线 -->
    <g v-if="showTicks">
      <line
        v-for="(tick, index) in ticks"
        :key="index"
        :x1="tick.x1"
        :y1="tick.y1"
        :x2="tick.x2"
        :y2="tick.y2"
        :stroke="tickColor"
        :stroke-width="tick.major ? 2 : 1"
      />
    </g>

    <!-- 量程标签 -->
    <g v-if="showLabels">
      <text
        v-for="(label, index) in labels"
        :key="index"
        :x="label.x"
        :y="label.y"
        :fill="labelColor"
        :font-size="labelFontSize"
        text-anchor="middle"
        dominant-baseline="middle"
      >{{ label.text }}</text>
    </g>

    <!-- 指针 -->
    <polygon
      :points="needlePoints"
      :fill="needleColor"
      :transform="`rotate(${needleAngle} ${cx} ${cy})`"
    />

    <!-- 中心帽 -->
    <circle :cx="cx" :cy="cy" :r="radius * 0.1" :fill="centerCapColor" />

    <!-- 数值文本 -->
    <text
      v-if="showValue"
      :x="cx"
      :y="cy + radius * 0.38"
      :fill="valueColor"
      :font-size="valueFontSize"
      font-weight="bold"
      text-anchor="middle"
      dominant-baseline="middle"
    >{{ valueText }}</text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTagValue } from '@scada-editor/system';

const props = defineProps<{
  w: number;
  h: number;
  value: number;
  minValue: number;
  maxValue: number;
  unit: string;
  decimalPlaces: number;
  startAngle: number;
  endAngle: number;
  faceColor: string;
  rimColor: string;
  needleColor: string;
  tickColor: string;
  labelColor: string;
  valueColor: string;
  warningColor: string;
  dangerColor: string;
  showTicks: boolean;
  showLabels: boolean;
  showValue: boolean;
  majorTicks: number;
  minorTicks: number;
  warningValue: number;
  dangerValue: number;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
}>();

const { currentValue, displayValue, bindTitle } = useTagValue(props);

const cx = computed(() => props.w / 2);
const cy = computed(() => props.h / 2);
const radius = computed(() => Math.min(props.w, props.h) * 0.42);

const startAngle = computed(() => Number(props.startAngle));
const endAngle = computed(() => Number(props.endAngle));
const totalAngle = computed(() => normalizeDelta(endAngle.value - startAngle.value));

const minValue = computed(() => Number(props.minValue));
const maxValue = computed(() => Number(props.maxValue));

/** 有效实时值：绑定标签时读 WS 实时值，未绑定则回退静态 value */
const effectiveValue = computed(() => {
  if (props.tagId) {
    const v = Number(currentValue.value);
    return Number.isFinite(v) ? v : Number(props.value);
  }
  return Number(props.value);
});

const needleAngle = computed(() =>
  valueToAngle(effectiveValue.value, minValue.value, maxValue.value, startAngle.value, endAngle.value),
);

const displayText = computed(() => {
  if (props.tagId) return displayValue.value;
  return formatNumber(props.value, props.decimalPlaces);
});

const valueText = computed(() =>
  props.unit ? `${displayText.value} ${props.unit}` : displayText.value,
);

// ── 量程彩色弧 ──
const arcRadius = computed(() => radius.value * 0.88);
const arcWidth = computed(() => radius.value * 0.08);
const normalColor = '#2ECC71';

const warnAngle = computed(() =>
  valueToAngle(Number(props.warningValue), minValue.value, maxValue.value, startAngle.value, endAngle.value),
);
const dangerAngle = computed(() =>
  valueToAngle(Number(props.dangerValue), minValue.value, maxValue.value, startAngle.value, endAngle.value),
);

const arcEnd = computed(() => startAngle.value + totalAngle.value);
const normalArc = computed(() =>
  arcPath(cx.value, cy.value, arcRadius.value, startAngle.value, Math.min(warnAngle.value, arcEnd.value)),
);
const warningArcVisible = computed(() => Number(props.warningValue) < maxValue.value);
const warningArc = computed(() =>
  arcPath(cx.value, cy.value, arcRadius.value, warnAngle.value, Math.min(dangerAngle.value, arcEnd.value)),
);
const dangerArcVisible = computed(() => Number(props.dangerValue) < maxValue.value);
const dangerArc = computed(() =>
  arcPath(cx.value, cy.value, arcRadius.value, dangerAngle.value, arcEnd.value),
);

// ── 刻度 ──
const ticks = computed(() => {
  const result: Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }> = [];
  if (!props.showTicks) return result;
  const minor = Math.max(1, Number(props.minorTicks));
  const total = Math.max(1, Number(props.majorTicks) * minor);
  for (let i = 0; i <= total; i++) {
    const angle = startAngle.value + totalAngle.value * (i / total);
    const major = i % minor === 0;
    const oR = radius.value * 0.82;
    const iR = major ? radius.value * 0.68 : radius.value * 0.74;
    const p1 = polar(cx.value, cy.value, iR, angle);
    const p2 = polar(cx.value, cy.value, oR, angle);
    result.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, major });
  }
  return result;
});

// ── 量程标签 ──
const labels = computed(() => {
  const result: Array<{ x: number; y: number; text: string }> = [];
  if (!props.showLabels) return result;
  const range = maxValue.value - minValue.value;
  if (range <= 0) return result;
  const lR = radius.value * 0.55;
  const count = Math.max(1, Number(props.majorTicks));
  for (let i = 0; i <= count; i++) {
    const angle = startAngle.value + totalAngle.value * (i / count);
    const value = minValue.value + range * (i / count);
    const p = polar(cx.value, cy.value, lR, angle);
    result.push({ x: p.x, y: p.y, text: Math.round(value).toString() });
  }
  return result;
});

// ── 指针 ──
const needleLength = computed(() => radius.value * 0.75);
const needleWidth = computed(() => radius.value * 0.06);
const needleTail = computed(() => radius.value * 0.18);
const needlePoints = computed(() => {
  const nLen = needleLength.value;
  const nW = needleWidth.value;
  const tLen = needleTail.value;
  return `${cx.value + nLen},${cy.value} ${cx.value},${cy.value - nW} ${cx.value - tLen},${cy.value} ${cx.value},${cy.value + nW}`;
});

const centerCapColor = '#95A5A6';

const labelFontSize = computed(() => Math.max(8, Math.round(radius.value * 0.14)));
const valueFontSize = computed(() => Math.max(10, Math.round(radius.value * 0.22)));

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function normalizeDelta(delta: number): number {
  return ((delta % 360) + 360) % 360;
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const delta = normalizeDelta(endDeg - startDeg);
  const largeArcFlag = delta > 180 ? 1 : 0;
  const sweepFlag = 1;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function valueToAngle(value: number, min: number, max: number, startDeg: number, endDeg: number): number {
  const range = max - min;
  if (range <= 0) return startDeg;
  const ratio = Math.max(0, Math.min(1, (value - min) / range));
  return startDeg + normalizeDelta(endDeg - startDeg) * ratio;
}

function formatNumber(value: unknown, decimalPlaces?: number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? '');
  return num.toFixed(decimalPlaces ?? 2);
}
</script>
