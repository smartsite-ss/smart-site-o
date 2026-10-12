<template>
  <svg
    class="capacitor-graphic"
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
        :y2="plateTopY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        :x1="-plateHalfW"
        :y1="plateTopY"
        :x2="plateHalfW"
        :y2="plateTopY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        :x1="-plateHalfW"
        :y1="plateBottomY"
        :x2="plateHalfW"
        :y2="plateBottomY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <line
        x1="0"
        :y1="plateBottomY"
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
  name: 'CapacitorGraphic',
  props: {
    w: { type: Number, default: 30 },
    h: { type: Number, default: 50 },
    color: { type: String, default: '#22c55e' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const plateHalfW = computed(() => props.w * 0.32);
    const plateTopY = computed(() => props.h * 0.38);
    const plateBottomY = computed(() => props.h * 0.62);

    return { cx, plateHalfW, plateTopY, plateBottomY };
  },
});
</script>

<style scoped>
.capacitor-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
