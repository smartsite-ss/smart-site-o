<template>
  <svg
    class="arrester-graphic"
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
        :points="zigzagPoints"
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
  name: 'ArresterGraphic',
  props: {
    w: { type: Number, default: 30 },
    h: { type: Number, default: 70 },
    color: { type: String, default: '#f59e0b' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const topY = computed(() => props.h * 0.18);
    const bottomY = computed(() => props.h * 0.82);
    const zigzagPoints = computed(() => {
      const x = 0;
      const startY = topY.value;
      const endY = bottomY.value;
      const segH = (endY - startY) / 6;
      const amp = props.w * 0.35;
      const pts: string[] = [];
      let curX = x;
      let curY = startY;
      for (let i = 0; i < 6; i++) {
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

    return { cx, topY, bottomY, zigzagPoints };
  },
});
</script>

<style scoped>
.arrester-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
