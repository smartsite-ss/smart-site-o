<template>
  <svg
    class="faultlamp-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 60 60`"
  >
    <desc>故障报警灯</desc>
    <rect
      x="0"
      y="0"
      :width="w"
      :height="h"
      :fill="backgroundColor"
      rx="4"
    />
    <g>
      <polygon
        points="30,6 52,28 30,50 8,28"
        :fill="currentFill"
        :stroke="currentStroke"
        stroke-width="2.5"
        stroke-linejoin="round"
        :class="lampClass"
        :style="{ '--flash-dur': flashSpeed + 's' }"
      >
        <animate
          v-if="flashing && effectiveAlarming"
          attributeName="opacity"
          values="1;0.3;1"
          :dur="(flashSpeed || 0.5) + 's'"
          repeatCount="indefinite"
        />
      </polygon>
      <text
        x="30"
        y="34"
        font-size="18"
        fill="#fff"
        text-anchor="middle"
        font-weight="bold"
        font-family="Arial"
      >!</text>
      <g
        v-if="showBuzzer && effectiveAlarming"
        class="buzzer-group"
      >
        <path
          d="M44 10 Q50 5 54 12 Q50 14 46 11 Z"
          fill="#fbbf24"
          class="buzzer-icon"
        >
          <animate
            v-if="flashing"
            attributeName="opacity"
            values="1;0.2;1"
            :dur="(flashSpeed || 0.5) + 's'"
            repeatCount="indefinite"
            begin="0.15s"
          />
        </path>
        <line
          x1="48"
          y1="8"
          x2="53"
          y2="14"
          stroke="#f59e0b"
          stroke-width="1"
          opacity="0.7"
        />
        <line
          x1="49"
          y1="6"
          x2="55"
          y2="13"
          stroke="#f59e0b"
          stroke-width="0.8"
          opacity="0.5"
        />
        <line
          x1="51"
          y1="5"
          x2="56"
          y2="12"
          stroke="#f59e0b"
          stroke-width="0.6"
          opacity="0.3"
        />
      </g>
      <circle
        cx="30"
        cy="28"
        r="22"
        fill="none"
        :stroke="glowColor"
        stroke-width="1"
        opacity="0.3"
        :class="lampClass"
        :style="{ '--flash-dur': flashSpeed + 's' }"
      >
        <animate
          v-if="flashing && effectiveAlarming"
          attributeName="r"
          values="22;26;22"
          :dur="(flashSpeed || 0.5) + 's'"
          repeatCount="indefinite"
        />
        <animate
          v-if="flashing && effectiveAlarming"
          attributeName="opacity"
          values="0.3;0;0.3"
          :dur="(flashSpeed || 0.5) + 's'"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTagValue } from '@scada-editor/system';

const props = defineProps<{
  w: number;
  h: number;
  backgroundColor: string;
  alarmColor: string;
  dataset: number;
  flashing: boolean;
  flashSpeed: number;
  showBuzzer: boolean;
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

/** 解析实时值 → 报警：未绑定时用手动 dataset；绑定时按「值→状态」映射，未命中用 defaultStatus */
const effectiveAlarming = computed(() => {
  if (!props.tagId) return props.dataset > 0;
  const raw = currentValue.value;
  if (typeof raw === 'boolean') return raw;
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.alarmValue !== '' && rawStr === props.alarmValue) return true;
  if (props.normalValue !== '' && rawStr === props.normalValue) return false;
  return props.defaultStatus === 'alarm';
});

const currentFill = computed(() => {
  if (!effectiveAlarming.value || props.alarmColor === 'off') return '#374151';
  if (props.alarmColor === 'amber') return '#f59e0b';
  return '#ef4444';
});

const currentStroke = computed(() => {
  if (!effectiveAlarming.value || props.alarmColor === 'off') return '#4b5563';
  if (props.alarmColor === 'amber') return '#d97706';
  return '#dc2626';
});

const glowColor = computed(() => {
  if (!effectiveAlarming.value || props.alarmColor === 'off') return '#374151';
  if (props.alarmColor === 'amber') return '#fbbf24';
  return '#fca5a5';
});

const lampClass = computed(() => (props.flashing && effectiveAlarming.value ? 'lamp-active' : ''));
</script>

<style scoped>
.faultlamp-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.lamp-active {
  filter: drop-shadow(0 0 6px currentColor);
}
</style>