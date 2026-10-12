<template>
  <svg
    class="reactor-graphic"
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
    <g :transform="`translate(${cx}, 0)`">
      <line
        x1="0"
        y1="4"
        x2="0"
        :y2="topY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <polyline
        :points="coilPoints"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linejoin="miter"
        stroke-linecap="square"
      />
      <line
        x1="0"
        :y1="bottomY"
        x2="0"
        :y2="h - 4"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'ReactorGraphic',
  props: {
    w: { type: Number, default: 40 },
    h: { type: Number, default: 60 },
    color: { type: String, default: '#3b82f6' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const topY = computed(() => props.h * 0.18);
    const bottomY = computed(() => props.h * 0.82);
    const coilPoints = computed(() => {
      const x = 0;
      const startY = topY.value;
      const endY = bottomY.value;
      const segCount = 5;
      const segH = (endY - startY) / segCount;
      const amp = props.w * 0.35;
      const pts: string[] = [];
      let curX = x;
      let curY = startY;
      for (let i = 0; i < segCount; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        curX = x + dir * amp;
        curY = startY + segH * (i + 0.5);
        pts.push(`${curX.toFixed(1)},${curY.toFixed(1)}`);
        curX = x;
        curY = startY + segH * (i + 1);
        pts.push(`${curX.toFixed(1)},${curY.toFixed(1)}`);
      }
      return `${x},${startY.toFixed(1)} ` + pts.join(' ');
    });

    return { cx, topY, bottomY, coilPoints };
  },
});
</script>

<style scoped>
.reactor-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
