<template>
  <svg
    :width="w"
    :height="h"
  >
    <polyline
      :stroke="colors[0]"
      stroke-width="3"
      :points="`0, 2.5 ${w}, 2.5`"
    />
    <polyline
      :stroke="colors[1]"
      stroke-width="3"
      stroke-dasharray="20, 80"
      stroke-dashoffset="-30"
      :points="`0, 2.5 ${w}, 2.5`"
    />
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Head02Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 3 },
    colors: { type: Array as () => string[], required: true },
    dur: { type: Number, default: 3 },
    lineHeight: { type: Number, default: 3 },
  },
  setup() {
    return {};
  },
});
</script>

<style scoped>
svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>