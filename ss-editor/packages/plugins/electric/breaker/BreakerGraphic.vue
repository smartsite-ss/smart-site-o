<template>
  <svg
    class="breaker-graphic"
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
      <line
        x1="-boxW / 2"
        :y1="topY"
        x2="boxW / 2"
        :y2="topY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <rect
        x="-boxW / 2"
        :y="boxTopY"
        :width="boxW"
        :height="boxH"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
        rx="2"
      />
      <g v-if="effectiveClosed">
        <line
          x1="-boxW / 3"
          :y1="boxCenterY"
          x2="boxW / 3"
          :y2="boxCenterY"
          :stroke="color"
          :stroke-width="lineWidth"
          stroke-linecap="round"
        />
      </g>
      <g v-else>
        <line
          x1="-boxW / 3"
          :y1="boxCenterY - gap / 2"
          x2="-gap / 4"
          :y2="boxCenterY + gap / 4"
          :stroke="color"
          :stroke-width="lineWidth"
          stroke-linecap="round"
        />
        <text
          :x="0"
          :y="boxCenterY + gap / 2 + 6"
          text-anchor="middle"
          :fill="color"
          font-size="14"
          font-weight="bold"
        >×</text>
        <line
          x1="gap / 4"
          :y1="boxCenterY - gap / 4"
          x2="boxW / 3"
          :y2="boxCenterY + gap / 2"
          :stroke="color"
          :stroke-width="lineWidth"
          stroke-linecap="round"
        />
      </g>
      <line
        x1="-boxW / 2"
        :y1="bottomY"
        x2="boxW / 2"
        :y2="bottomY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
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
const boxW = computed(() => props.w * 0.7);
const boxH = computed(() => props.h * 0.35);
const topY = computed(() => props.h * 0.12);
const boxTopY = computed(() => topY.value + props.h * 0.08);
const bottomY = computed(() => boxTopY.value + boxH.value + props.h * 0.08);
const boxCenterY = computed(() => boxTopY.value + boxH.value / 2);
const gap = computed(() => Math.min(boxW.value * 0.35, 8));
</script>

<style scoped>
.breaker-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
