<template>
  <svg
    class="autotransformer-graphic"
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
        :y2="coilTop"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <ellipse
        :cx="0"
        :cy="coilCY"
        :rx="coilRX"
        :ry="coilRY"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <ellipse
        :cx="0"
        :cy="coilCY"
        :rx="innerRX"
        :ry="innerRY"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth * 0.6"
        stroke-dasharray="3 3"
      />
      <line
        x1="0"
        :y1="coilBottom"
        x2="0"
        :y2="h"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        :x1="tapStartX"
        :y1="tapY"
        :x2="tapEndX"
        :y2="tapY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <polygon
        :points="arrowPoints"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linejoin="round"
      />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'AutotransformerGraphic',
  props: {
    w: { type: Number, default: 50 },
    h: { type: Number, default: 100 },
    color: { type: String, default: '#1e90ff' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const coilRX = computed(() => props.w * 0.38);
    const coilRY = computed(() => props.h * 0.3);
    const innerRX = computed(() => coilRX.value * 0.55);
    const innerRY = computed(() => coilRY.value * 0.55);
    const gapTop = computed(() => props.h * 0.08);
    const coilTop = computed(() => gapTop.value + coilRY.value);
    const coilCY = computed(() => props.h / 2);
    const coilBottom = computed(() => coilCY.value + coilRY.value);
    const tapY = computed(() => props.h * 0.55);
    const tapLen = computed(() => coilRX.value + props.lineWidth * 4);
    const tapStartX = computed(() => coilRX.value + props.lineWidth * 2);
    const tapEndX = computed(() => tapStartX.value + tapLen.value);
    const arrowSize = computed(() => Math.min(props.lineWidth * 3, 6));
    const arrowPoints = computed(() => {
      const ax = tapEndX.value - arrowSize.value;
      return `${ax},${tapY.value - arrowSize.value} ${tapEndX.value},${tapY.value} ${ax},${tapY.value + arrowSize.value}`;
    });

    return {
      cx, coilRX, coilRY, innerRX, innerRY, gapTop,
      coilTop, coilCY, coilBottom, tapY, tapLen,
      tapStartX, tapEndX, arrowPoints,
    };
  },
});
</script>

<style scoped>
.autotransformer-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
