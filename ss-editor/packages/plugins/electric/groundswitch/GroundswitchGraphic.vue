<template>
  <svg
    class="groundswitch-graphic"
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
    <g :transform="`translate(${cx}, 0)`">
      <circle
        :cx="0"
        :cy="terminalYTop"
        :r="terminalRadius"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <line
        x1="0"
        :y1="terminalYTop + terminalRadius"
        x2="0"
        :y2="bladePivotY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <g :transform="`rotate(${bladeAngle}, 0, ${bladePivotY})`">
        <line
          x1="0"
          :y1="bladePivotY"
          x2="0"
          :y2="groundY + groundLineLen * 0.3"
          :stroke="color"
          :stroke-width="lineWidth"
          stroke-linecap="round"
        />
      </g>
      <line
        v-if="effectiveClosed"
        x1="0"
        :y1="groundY"
        x2="0"
        :y2="groundY + groundLineLen"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <g v-if="effectiveClosed">
        <line
          :x1="-groundBarW / 2"
          :y1="groundY + groundLineLen * 0.35"
          :x2="groundBarW / 2"
          :y2="groundY + groundLineLen * 0.35"
          :stroke="color"
          :stroke-width="lineWidth"
          stroke-linecap="round"
        />
        <line
          :x1="-groundBarW * 0.65"
          :y1="groundY + groundLineLen * 0.6"
          :x2="groundBarW * 0.65"
          :y2="groundY + groundLineLen * 0.6"
          :stroke="color"
          :stroke-width="lineWidth"
          stroke-linecap="round"
        />
        <line
          :x1="-groundBarW * 0.4"
          :y1="groundY + groundLineLen * 0.85"
          :x2="groundBarW * 0.4"
          :y2="groundY + groundLineLen * 0.85"
          :stroke="color"
          :stroke-width="lineWidth"
          stroke-linecap="round"
        />
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTagValue } from '@scada-editor/system';

const props = defineProps<{
  w: number;
  h: number;
  color: string;
  backgroundColor: string;
  closed: boolean;
  lineWidth: number;
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
const terminalRadius = computed(() => 3);
const terminalYTop = computed(() => terminalRadius.value + 8);
const bladePivotY = computed(() => (terminalYTop.value + props.h * 0.55) / 2);
const groundY = computed(() => props.h * 0.5);
const groundLineLen = computed(() => props.h * 0.38);
const groundBarW = computed(() => Math.min(props.w * 0.45, 18));
const bladeAngle = computed(() => (effectiveClosed.value ? 0 : 35));
</script>

<style scoped>
.groundswitch-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
