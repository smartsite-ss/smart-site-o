<template>
  <svg
    class="gatevalve-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 60 100`"
  >
    <desc>电动闸阀</desc>
    <g>
      <rect
        x="16"
        y="30"
        width="28"
        height="40"
        rx="3"
        :fill="backgroundColor"
        :stroke="colors[0]"
        :stroke-width="lineWidth"
      />
      <rect
        x="20"
        y="6"
        width="20"
        height="26"
        rx="2"
        :fill="colors[1]"
        :stroke="colors[0]"
        :stroke-width="lineWidth"
      />
      <line
        x1="30"
        y1="12"
        x2="30"
        y2="26"
        :stroke="colors[0]"
        :stroke-width="lineWidth"
        stroke-dasharray="2,2"
      />
      <rect
        x="-4"
        y="42"
        width="22"
        height="16"
        rx="2"
        :fill="pipeColor || colors[0]"
        opacity="0.5"
      />
      <rect
        x="42"
        y="42"
        width="22"
        height="16"
        rx="2"
        :fill="pipeColor || colors[0]"
        opacity="0.5"
      />
      <g v-if="state === 'open'">
        <line
          x1="24"
          y1="38"
          x2="36"
          y2="62"
          :stroke="colors[0]"
          :stroke-width="lineWidth + 2"
          stroke-linecap="round"
        />
        <line
          x1="36"
          y1="38"
          x2="24"
          y2="62"
          :stroke="colors[0]"
          :stroke-width="lineWidth + 2"
          stroke-linecap="round"
        />
      </g>
      <g v-else-if="state === 'fault'">
        <rect
          x="25"
          y="38"
          width="10"
          height="24"
          fill="#ef4444"
          :stroke="'#dc2626'"
          :stroke-width="lineWidth"
        />
        <text
          x="30"
          y="54"
          text-anchor="middle"
          font-size="8"
          fill="#fff"
        >!</text>
      </g>
      <g v-else>
        <rect
          x="24"
          y="36"
          width="12"
          height="28"
          :fill="colors[0]"
        />
      </g>
      <polygon
        points="26,72 34,72 32,80 28,80"
        :fill="(pipeColor || colors[0])"
        opacity="0.4"
      />
      <text
        x="30"
        y="97"
        text-anchor="middle"
        font-size="6"
        fill="#9ca3af"
      >GV</text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { useTagValue } from '@scada-editor/system';

const props = defineProps<{
  w: number;
  h: number;
  colors: string[];
  backgroundColor: string;
  lineWidth: number;
  closed: boolean;
  state: string;
  pipeColor?: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
}>();

const { bindTitle } = useTagValue(props);
</script>

<style scoped>
.gatevalve-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
