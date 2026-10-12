<template>
  <svg
    class="arccoil-graphic"
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
        :y2="coilTopY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <path
        :d="coilPath"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <line
        x1="0"
        :y1="coilBottomY"
        x2="0"
        :y2="groundTopY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        :x1="-groundW"
        :y1="groundTopY"
        :x2="groundW"
        :y2="groundTopY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        :x1="-groundW * 0.6"
        :y1="groundTopY + groundGap"
        :x2="groundW * 0.6"
        :y2="groundTopY + groundGap"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        :x1="-groundW * 0.25"
        :y1="groundTopY + groundGap * 2"
        :x2="groundW * 0.25"
        :y2="groundTopY + groundGap * 2"
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
  name: 'ArccoilGraphic',
  props: {
    w: { type: Number, default: 40 },
    h: { type: Number, default: 70 },
    color: { type: String, default: '#3b82f6' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const coilTopY = computed(() => props.h * 0.14);
    const coilBottomY = computed(() => props.h * 0.65);
    const groundTopY = computed(() => props.h * 0.72);
    const groundW = computed(() => props.w * 0.28);
    const groundGap = computed(() => props.h * 0.055);

    const coilPath = computed(() => {
      const x = 0;
      const startY = coilTopY.value;
      const endY = coilBottomY.value;
      const loops = 4;
      const loopH = (endY - startY) / loops;
      const radiusX = props.w * 0.28;
      const radiusY = loopH * 0.42;
      let d = `M ${x} ${startY.toFixed(1)}`;
      for (let i = 0; i < loops; i++) {
        const cy = startY + loopH * i + loopH / 2;
        d += ` A ${radiusX.toFixed(1)} ${radiusY.toFixed(1)} 0 0 1 ${x} ${(cy + loopH / 2).toFixed(1)}`;
      }
      return d;
    });

    return { cx, coilTopY, coilBottomY, groundTopY, groundW, groundGap, coilPath };
  },
});
</script>

<style scoped>
.arccoil-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
