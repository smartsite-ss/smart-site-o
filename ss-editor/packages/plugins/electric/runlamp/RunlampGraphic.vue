<template>
  <svg
    class="runlamp-graphic"
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
        :id="'runlamp-glow-' + effectiveState"
        cx="50%"
        cy="50%"
        r="50%"
      >
        <stop
          offset="0%"
          :stop-color="effectiveColor"
          stop-opacity="1"
        />
        <stop
          offset="60%"
          :stop-color="effectiveColor"
          :stop-opacity="glowOpacity"
        />
        <stop
          offset="100%"
          :stop-color="effectiveColor"
          stop-opacity="0"
        />
      </radialGradient>
      <filter :id="'runlamp-blur-' + effectiveState">
        <feGaussianBlur :std-deviation="isRunning ? 2 : 0" />
      </filter>
    </defs>
    <g class="runlamp-body">
      <circle
        v-if="isRunning"
        :cx="cx"
        :cy="cy"
        :r="radius + glowRadius"
        :fill="`url(#runlamp-glow-${effectiveState})`"
        opacity="0.5"
      />
      <circle
        :cx="cx"
        :cy="cy"
        :r="radius"
        :fill="effectiveColor"
        :stroke="darkenColor(effectiveColor)"
        stroke-width="1"
        :class="{ 'lamp-running': isRunning, 'lamp-stopped': isStopped, 'lamp-fault': isFault }"
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
  lampColor: string;
  backgroundColor: string;
  state: string;
  radius: number;
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

/** 解析实时值 → 状态：未绑定时用手动 state；绑定时按「值→状态」映射，未命中用 defaultStatus */
const effectiveState = computed(() => {
  if (!props.tagId) return props.state;
  const raw = currentValue.value;
  if (typeof raw === 'boolean') return raw ? 'running' : 'stopped';
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.runningValue !== '' && rawStr === props.runningValue) return 'running';
  if (props.stoppedValue !== '' && rawStr === props.stoppedValue) return 'stopped';
  if (props.faultValue !== '' && rawStr === props.faultValue) return 'fault';
  return props.defaultStatus;
});

const cx = computed(() => props.w / 2);
const cy = computed(() => props.h / 2);
const isRunning = computed(() => effectiveState.value === 'running');
const isStopped = computed(() => effectiveState.value === 'stopped');
const isFault = computed(() => effectiveState.value === 'fault');

const effectiveColor = computed(() => {
  if (effectiveState.value === 'running') return props.lampColor;
  if (effectiveState.value === 'fault') return '#ef4444';
  return '#6b7280';
});

const glowOpacity = computed(() => (effectiveState.value === 'running' ? 0.4 : 0));
const glowRadius = computed(() => (effectiveState.value === 'running' ? props.radius * 0.6 : 0));

function darkenColor(hex: string): string {
  if (!hex || hex.length < 7) return '#000000';
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
</script>

<style scoped>
.runlamp-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
.lamp-running {
  filter: drop-shadow(0 0 3px currentColor);
}
.lamp-stopped {
  opacity: 0.45;
}
.lamp-fault {
  animation: faultPulse 1s ease-in-out infinite;
}
@keyframes faultPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
