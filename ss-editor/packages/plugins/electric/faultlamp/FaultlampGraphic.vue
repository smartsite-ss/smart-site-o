<template>
  <svg
    class="faultlamp-graphic"
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
    <defs>
      <radialGradient
        id="fault-glow"
        cx="50%"
        cy="40%"
        r="50%"
      >
        <stop
          offset="0%"
          :stop-color="color"
          stop-opacity="1"
        />
        <stop
          offset="50%"
          :stop-color="color"
          :stop-opacity="effectiveAlarming ? 0.5 : 0.1"
        />
        <stop
          offset="100%"
          :stop-color="color"
          stop-opacity="0"
        />
      </radialGradient>
    </defs>
    <g class="faultlamp-body">
      <circle
        v-if="effectiveAlarming"
        :cx="cx"
        :cy="iconCy"
        :r="diamondSize + 6"
        fill="url(#fault-glow)"
        opacity="0.4"
      />
      <polygon
        :points="diamondPoints"
        :fill="effectiveAlarming ? color : dimColor"
        :stroke="darkenColor(color)"
        :stroke-width="lineWidth"
        stroke-linejoin="round"
        :class="{ 'alarm-flash': effectiveAlarming }"
      />
      <text
        :x="cx"
        :y="textY"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="effectiveAlarming ? color : dimColor"
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
  color: string;
  backgroundColor: string;
  alarming: boolean;
  lineWidth: number;
  alarmValue: string;
  normalValue: string;
  defaultStatus: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
}>();

const { currentValue, bindTitle } = useTagValue(props);

/** 解析实时值 → 报警：未绑定时用手动 alarming；绑定时按「值→状态」映射，未命中用 defaultStatus */
const effectiveAlarming = computed(() => {
  if (!props.tagId) return props.alarming;
  const raw = currentValue.value;
  if (typeof raw === 'boolean') return raw;
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.alarmValue !== '' && rawStr === props.alarmValue) return true;
  if (props.normalValue !== '' && rawStr === props.normalValue) return false;
  return props.defaultStatus === 'alarm';
});

const cx = computed(() => props.w / 2);
const iconCy = computed(() => props.h * 0.36);
const textY = computed(() => props.h * 0.78);
const diamondSize = computed(() => Math.min(props.w, props.h * 0.5) * 0.32);

const diamondPoints = computed(() => {
  const s = diamondSize.value;
  return `${cx.value},${iconCy.value - s} ${cx.value + s},${iconCy.value} ${cx.value},${iconCy.value + s} ${cx.value - s},${iconCy.value}`;
});

const dimColor = computed(() => {
  if (!props.color || props.color.length < 7) return '#4b5563';
  const r = Math.round(parseInt(props.color.slice(1, 3), 16) * 0.3);
  const g = Math.round(parseInt(props.color.slice(3, 5), 16) * 0.3);
  const b = Math.round(parseInt(props.color.slice(5, 7), 16) * 0.3);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
});

const statusLabel = computed(() =>
  effectiveAlarming.value
    ? t('faultlamp.options.alarming.yes')
    : t('faultlamp.options.alarming.no'),
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
.faultlamp-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
.alarm-flash {
  animation: alarmBlink 0.8s ease-in-out infinite;
}
@keyframes alarmBlink {
  0%, 100% { opacity: 1; filter: drop-shadow(0 0 4px currentColor); }
  50% { opacity: 0.25; filter: none; }
}
</style>
