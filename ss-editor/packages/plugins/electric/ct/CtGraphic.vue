<template>
  <svg
    class="ct-graphic"
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
        :d="coilPathLeft"
        :fill="'none'"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <path
        :d="coilPathRight"
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
      >CT</text>
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'CtGraphic',
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
    const coilR = computed(() => circleR.value * 0.55);
    const fontSize = computed(() => Math.min(props.w, props.h) * 0.18);
    const textY = computed(() => circleR.value + fontSize.value + 4);

    const coilPathLeft = computed(() => {
      const r = coilR.value;
      return `M ${-r - 1} ${-r * 0.6} A ${r} ${r} 0 0 1 ${-r - 1} ${r * 0.6}`;
    });
    const coilPathRight = computed(() => {
      const r = coilR.value;
      return `M ${r + 1} ${-r * 0.6} A ${r} ${r} 0 0 0 ${r + 1} ${r * 0.6}`;
    });

    return { cx, cy, circleR, coilR, fontSize, textY, coilPathLeft, coilPathRight };
  },
});
</script>

<style scoped>
.ct-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
