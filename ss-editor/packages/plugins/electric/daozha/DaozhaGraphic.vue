<template>
  <svg
    class="daozha-graphic"
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
      <circle
        :cx="0"
        :cy="terminalYBottom"
        :r="terminalRadius"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <line
        x1="0"
        :y1="terminalYBottom + terminalRadius"
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
          :y2="terminalYTop + terminalRadius"
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
  terminalRadius: number;
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
const terminalYTop = computed(() => props.terminalRadius + 6);
const terminalYBottom = computed(() => props.h - props.terminalRadius - 6);
const bladePivotY = computed(() => (terminalYTop.value + terminalYBottom.value) / 2);
const bladeAngle = computed(() => (effectiveClosed.value ? 0 : -45));
</script>

<style scoped>
.daozha-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
