<template>
  <svg
    class="busbar-graphic"
    :width="w"
    :height="h"
    :viewBox="`0 0 ${w} ${h}`"
  >
    <rect
      v-if="backgroundColor && backgroundColor !== '#00000000'"
      :width="w"
      :height="h"
      :fill="backgroundColor"
    />
    <g class="busbar-body">
      <rect
        :x="tickSize"
        :y="(h - barHeight) / 2"
        :width="w - tickSize * 2"
        :height="barHeight"
        :fill="color"
        rx="1"
      />
      <line
        :x1="tickSize"
        :y1="0"
        :x2="tickSize"
        :y2="h"
        :stroke="color"
        :stroke-width="lineWidth * 0.6"
        stroke-linecap="round"
      />
      <line
        :x1="w - tickSize"
        :y1="0"
        :x2="w - tickSize"
        :y2="h"
        :stroke="color"
        :stroke-width="lineWidth * 0.6"
        stroke-linecap="round"
      />
    </g>
    <text
      v-if="labelText"
      :x="w / 2"
      :y="h / 2"
      text-anchor="middle"
      dominant-baseline="central"
      :fill="isDarkColor(color) ? '#ffffff' : '#000000'"
      font-size="10"
      font-family="sans-serif"
    >{{ labelText }}</text>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'BusbarGraphic',
  props: {
    w: { type: Number, default: 120 },
    h: { type: Number, default: 16 },
    color: { type: String, default: '#dc2626' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 4 },
    labelText: { type: String, default: '' },
  },
  setup(props) {
    const barHeight = computed(() => Math.max(props.h * 0.6, props.lineWidth));
    const tickSize = computed(() => Math.min(6, props.w * 0.08));

    function isDarkColor(hex: string): boolean {
      if (!hex || hex.length < 7) return true;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    }

    return { barHeight, tickSize, isDarkColor };
  },
});
</script>

<style scoped>
.busbar-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
