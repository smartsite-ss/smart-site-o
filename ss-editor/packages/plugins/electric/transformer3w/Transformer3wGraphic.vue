<template>
  <svg
    class="transformer3w-graphic"
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
      <line
        x1="0"
        y1="0"
        x2="0"
        :y2="-coilR - gap"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <circle
        cx="0"
        :cy="topCoilCY"
        :r="coilR"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <circle
        cx="0"
        :cy="topCoilCY"
        :r="innerR"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth * 0.6"
        stroke-dasharray="3 3"
      />
      <line
        :x1="leftCoilCX - coilR - gap"
        :y1="leftCoilCY"
        :x2="leftCoilCX"
        :y2="leftCoilCY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <circle
        :cx="leftCoilCX"
        :cy="leftCoilCY"
        :r="coilR"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <circle
        :cx="leftCoilCX"
        :cy="leftCoilCY"
        :r="innerR"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth * 0.6"
        stroke-dasharray="3 3"
      />
      <line
        :x1="rightCoilCX"
        :y1="rightCoilCY"
        :x2="rightCoilCX + coilR + gap"
        :y2="rightCoilCY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <circle
        :cx="rightCoilCX"
        :cy="rightCoilCY"
        :r="coilR"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <circle
        :cx="rightCoilCX"
        :cy="rightCoilCY"
        :r="innerR"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth * 0.6"
        stroke-dasharray="3 3"
      />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'Transformer3wGraphic',
  props: {
    w: { type: Number, default: 100 },
    h: { type: Number, default: 100 },
    color: { type: String, default: '#1e90ff' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const cy = computed(() => props.h / 2);
    const coilR = computed(() => Math.min(props.w * 0.18, props.h * 0.22));
    const innerR = computed(() => coilR.value * 0.55);
    const gap = computed(() => coilR.value * 0.4);
    const spread = computed(() => Math.min(props.w * 0.28, props.h * 0.25));
    const topCoilCY = computed(() => -(spread.value + coilR.value));
    const leftCoilCX = computed(() => -spread.value);
    const leftCoilCY = computed(() => spread.value * 0.6);
    const rightCoilCX = computed(() => spread.value);
    const rightCoilCY = computed(() => spread.value * 0.6);

    return {
      cx, cy, coilR, innerR, gap, spread,
      topCoilCY, leftCoilCX, leftCoilCY, rightCoilCX, rightCoilCY,
    };
  },
});
</script>

<style scoped>
.transformer3w-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
