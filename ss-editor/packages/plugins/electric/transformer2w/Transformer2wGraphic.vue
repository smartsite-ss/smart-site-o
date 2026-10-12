<template>
  <svg
    class="transformer2w-graphic"
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
        y1="0"
        x2="0"
        :y2="coilGapTop"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <circle
        :cx="0"
        :cy="coil1CY"
        :r="coil1R"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <circle
        :cx="0"
        :cy="coil1CY"
        :r="coil1InnerR"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth * 0.6"
        stroke-dasharray="3 3"
      />
      <line
        x1="0"
        :y1="coil1Bottom"
        x2="0"
        :y2="coil2Top"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <circle
        :cx="0"
        :cy="coil2CY"
        :r="coil2R"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <circle
        :cx="0"
        :cy="coil2CY"
        :r="coil2InnerR"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth * 0.6"
        stroke-dasharray="3 3"
      />
      <line
        x1="0"
        :y1="coil2Bottom"
        x2="0"
        :y2="h"
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
  name: 'Transformer2wGraphic',
  props: {
    w: { type: Number, default: 70 },
    h: { type: Number, default: 100 },
    color: { type: String, default: '#1e90ff' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const coil1R = computed(() => Math.min(props.w * 0.32, props.h * 0.18));
    const coil2R = computed(() => Math.min(props.w * 0.38, props.h * 0.2));
    const coil1InnerR = computed(() => coil1R.value * 0.55);
    const coil2InnerR = computed(() => coil2R.value * 0.55);
    const coilGapTop = computed(() => props.h * 0.12);
    const coil1CY = computed(() => coilGapTop.value + coil1R.value + 4);
    const coil1Bottom = computed(() => coil1CY.value + coil1R.value + 4);
    const coil2Top = computed(() => coil1Bottom.value + 6);
    const coil2CY = computed(() => coil2Top.value + coil2R.value + 4);
    const coil2Bottom = computed(() => coil2CY.value + coil2R.value + 4);

    return {
      cx, coilGapTop, coil1R, coil2R, coil1InnerR, coil2InnerR,
      coil1CY, coil1Bottom, coil2Top, coil2CY, coil2Bottom,
    };
  },
});
</script>

<style scoped>
.transformer2w-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
