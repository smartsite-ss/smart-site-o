<template>
  <svg
    class="ground-graphic"
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
        :y2="verticalLineEnd"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        :x1="-line1HalfW"
        :y1="line1Y"
        :x2="line1HalfW"
        :y2="line1Y"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        :x1="-line2HalfW"
        :y1="line2Y"
        :x2="line2HalfW"
        :y2="line2Y"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        :x1="-line3HalfW"
        :y1="line3Y"
        :x2="line3HalfW"
        :y2="line3Y"
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
  name: 'GroundGraphic',
  props: {
    w: { type: Number, default: 30 },
    h: { type: Number, default: 30 },
    color: { type: String, default: '#374151' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const verticalLineEnd = computed(() => props.h * 0.35);
    const lineGap = computed(() => (props.h * 0.65) / 3);
    const line1Y = computed(() => verticalLineEnd.value + lineGap.value * 0.6);
    const line2Y = computed(() => line1Y.value + lineGap.value);
    const line3Y = computed(() => line2Y.value + lineGap.value);
    const maxLineW = computed(() => props.w * 0.75);
    const line1HalfW = computed(() => maxLineW.value / 2);
    const line2HalfW = computed(() => (maxLineW.value * 0.65) / 2);
    const line3HalfW = computed(() => (maxLineW.value * 0.35) / 2);

    return { cx, verticalLineEnd, line1Y, line2Y, line3Y, line1HalfW, line2HalfW, line3HalfW };
  },
});
</script>

<style scoped>
.ground-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
