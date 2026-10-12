<template>
  <svg
    class="cablehead-graphic"
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
    <g class="cablehead-body">
      <polygon
        :points="trapezoidPoints"
        :fill="'none'"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <line
        x1="topLeftX"
        :y1="topY"
        x2="bottomCenterX"
        :y2="bottomY"
        :stroke="color"
        :stroke-width="lineWidth * 0.6"
        stroke-linecap="round"
        opacity="0.4"
      />
      <line
        x2="topRightX"
        :y1="topY"
        x1="bottomCenterX"
        :y2="bottomY"
        :stroke="color"
        :stroke-width="lineWidth * 0.6"
        stroke-linecap="round"
        opacity="0.4"
      />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'CableheadGraphic',
  props: {
    w: { type: Number, default: 30 },
    h: { type: Number, default: 50 },
    color: { type: String, default: '#6b7280' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const topY = computed(() => 4);
    const bottomY = computed(() => props.h - 4);
    const topWidth = computed(() => props.w - 4);
    const bottomWidth = computed(() => Math.max(props.w * 0.25, 4));
    const topLeftX = computed(() => (props.w - topWidth.value) / 2);
    const topRightX = computed(() => (props.w + topWidth.value) / 2);
    const bottomCenterX = computed(() => props.w / 2);

    const trapezoidPoints = computed(() =>
      `${topLeftX.value},${topY.value} ${topRightX.value},${topY.value} ${props.w - bottomWidth.value / 2},${bottomY.value} ${bottomWidth.value / 2},${bottomY.value}`
    );

    return { trapezoidPoints, topY, bottomY, topLeftX, topRightX, bottomCenterX };
  },
});
</script>

<style scoped>
.cablehead-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
