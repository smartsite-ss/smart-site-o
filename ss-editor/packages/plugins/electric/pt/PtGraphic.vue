<template>
  <svg
    class="pt-graphic"
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
    <g :transform="`translate(${cx}, ${cy})`">
      <circle
        cx="0"
        cy="0"
        :r="circleR"
        :fill="'none'"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <path
        :d="coilPath1"
        :fill="'none'"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <path
        :d="coilPath2"
        :fill="'none'"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <path
        :d="coilPath3"
        :fill="'none'"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        x1="-25"
        y1="0"
        x2="25"
        y2="0"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <text
        x="0"
        :y="textY"
        :fill="color"
        :font-size="fontSize"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-weight="bold"
      >PT</text>
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'PtGraphic',
  props: {
    w: { type: Number, default: 50 },
    h: { type: Number, default: 60 },
    color: { type: String, default: '#8b5cf6' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const cy = computed(() => props.h / 2 - 4);
    const circleR = computed(() => Math.min(props.w, props.h) * 0.32);
    const fontSize = computed(() => Math.min(props.w, props.h) * 0.18);
    const textY = computed(() => circleR.value + fontSize.value + 4);

    const coilR1 = computed(() => circleR.value * 0.7);
    const coilR2 = computed(() => circleR.value * 0.48);
    const coilR3 = computed(() => circleR.value * 0.26);

    const coilPath1 = computed(() => {
      const r = coilR1.value;
      return `M ${-r - 1} ${-r * 0.55} A ${r} ${r * 0.9} 0 0 1 ${-r - 1} ${r * 0.55}`;
    });
    const coilPath2 = computed(() => {
      const r = coilR2.value;
      return `M ${r + 1} ${-r * 0.65} A ${r} ${r * 0.85} 0 0 0 ${r + 1} ${r * 0.65}`;
    });
    const coilPath3 = computed(() => {
      const r = coilR3.value;
      return `M ${-r - 1} ${-r * 0.7} A ${r} ${r * 0.8} 0 0 1 ${-r - 1} ${r * 0.7}`;
    });

    return { cx, cy, circleR, fontSize, textY, coilPath1, coilPath2, coilPath3 };
  },
});
</script>

<style scoped>
.pt-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
