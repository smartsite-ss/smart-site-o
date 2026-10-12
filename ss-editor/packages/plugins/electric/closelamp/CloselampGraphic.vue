<template>
  <svg
    class="closelamp-graphic"
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
    <g class="closelamp-body">
      <circle
        :cx="cx"
        :cy="lampCy"
        :r="radius"
        :fill="effectiveColor"
        :stroke="darkenColor(effectiveColor)"
        stroke-width="1"
        :class="{ 'lamp-closed': effectiveClosed, 'lamp-open': !effectiveClosed }"
      />
      <text
        :x="cx"
        :y="textY"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="textColor"
        font-size="11"
        font-family="sans-serif"
        font-weight="500"
      >{{ statusLabel }}</text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { i18n } from '@scada-editor/core';
import { useTagValue } from '@scada-editor/system';
const { t } = i18n.global;

const props = defineProps<{
  w: number;
  h: number;
  lampColor: string;
  backgroundColor: string;
  closed: boolean;
  radius: number;
  closedValue: string;
  openValue: string;
  defaultStatus: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
}>();

const { currentValue, bindTitle } = useTagValue(props);

/** 解析实时值 → 开合：未绑定时用手动 closed；绑定时按「值→状态」映射，未命中用 defaultStatus */
const effectiveClosed = computed(() => {
  if (!props.tagId) return props.closed;
  const raw = currentValue.value;
  if (typeof raw === 'boolean') return raw;
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.closedValue !== '' && rawStr === props.closedValue) return true;
  if (props.openValue !== '' && rawStr === props.openValue) return false;
  return props.defaultStatus === 'closed';
});

const cx = computed(() => props.w / 2);
const lampCy = computed(() => props.h * 0.38);
const textY = computed(() => props.h * 0.78);

const effectiveColor = computed(() => (effectiveClosed.value ? props.lampColor : '#ef4444'));
const textColor = computed(() => (effectiveClosed.value ? '#22c55e' : '#ef4444'));

const statusLabel = computed(() =>
  effectiveClosed.value
    ? t('closelamp.options.closed.yes')
    : t('closelamp.options.closed.no'),
);

function darkenColor(hex: string): string {
  if (!hex || hex.length < 7) return '#000000';
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
</script>

<style scoped>
.closelamp-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
.lamp-closed {
  filter: drop-shadow(0 0 2px currentColor);
}
.lamp-open {
  opacity: 0.85;
}
</style>
