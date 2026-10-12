<template>
  <svg
    class="runlamp-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 50 50`"
  >
    <desc>运行指示灯</desc>
    <g>
      <circle
        cx="25"
        cy="25"
        r="22"
        :fill="backgroundColor"
        stroke="#374151"
        :stroke-width="1.5"
      />
      <circle
        cx="25"
        cy="25"
        r="16"
        :fill="effectiveColor"
        :class="isFault ? 'lamp-fault' : ''"
        :style="{ '--blink-speed': blinkSpeed + 's' }"
      >
        <title>{{ lampColor }}</title>
      </circle>
      <defs>
        <filter id="lamp-glow-filter">
          <feGaussianBlur
            stdDeviation="3"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        v-if="glowing && isRunning"
        cx="25"
        cy="25"
        r="14"
        :fill="effectiveColor"
        filter="url(#lamp-glow-filter)"
        opacity="0.5"
        class="lamp-pulse"
        :style="{ '--blink-speed': blinkSpeed + 's' }"
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
  glowing: boolean;
  blinkSpeed: number;
  backgroundColor: string;
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

/** 解析实时值 → 状态：未绑定时保持原有点亮外观；绑定时按「值→状态」映射，未命中用 defaultStatus */
const effectiveState = computed(() => {
  if (!props.tagId) return 'running';
  const raw = currentValue.value;
  if (typeof raw === 'boolean') return raw ? 'running' : 'stopped';
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.runningValue !== '' && rawStr === props.runningValue) return 'running';
  if (props.stoppedValue !== '' && rawStr === props.stoppedValue) return 'stopped';
  if (props.faultValue !== '' && rawStr === props.faultValue) return 'fault';
  return props.defaultStatus;
});

const colorMap: Record<string, string> = {
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
};

const isRunning = computed(() => effectiveState.value === 'running');
const isFault = computed(() => effectiveState.value === 'fault');

const effectiveColor = computed(() => {
  if (effectiveState.value === 'running') return colorMap[props.lampColor] || '#22c55e';
  if (effectiveState.value === 'fault') return '#ef4444';
  return '#6b7280';
});
</script>

<style scoped>
.runlamp-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.lamp-pulse {
  animation: pulse_glow var(--blink-speed, 1s) ease-in-out infinite;
}

.lamp-fault {
  animation: fault_blink var(--blink-speed, 1s) ease-in-out infinite;
}

@keyframes pulse_glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

@keyframes fault_blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>