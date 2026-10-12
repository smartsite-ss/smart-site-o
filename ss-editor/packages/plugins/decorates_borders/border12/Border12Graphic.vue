<template>
  <div class="ss-border-box">
    <svg
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <polygon
        :fill="backgroundColor"
        :points="`
        10, 22 ${w - 22}, 22 ${w - 22}, ${h - 86} ${w - 84}, ${
          h - 24
        } 10, ${h - 24}
      `"
      />

      <polyline
        class="bv-bb5-line-1"
        :stroke="colors[0]"
        :points="`8, 5 ${w - 5}, 5 ${w - 5}, ${h - 100}
          ${w - 100}, ${h - 5} 8, ${h - 5} 8, 5`"
      />
      <polyline
        class="bv-bb5-line-2"
        :stroke="colors[1]"
        :points="`3, 5 ${w - 20}, 5 ${w - 20}, ${h - 60}
          ${w - 74}, ${h - 5} 3, ${h - 5} 3, 5`"
      />
      <polyline
        class="bv-bb5-line-3"
        :stroke="colors[1]"
        :points="`50, 13 ${w - 35}, 13`"
      />
      <polyline
        class="bv-bb5-line-4"
        :stroke="colors[1]"
        :points="`15, 20 ${w - 35}, 20`"
      />
      <polyline
        class="bv-bb5-line-5"
        :stroke="colors[1]"
        :points="`15, ${h - 20} ${w - 110}, ${h - 20}`"
      />
      <polyline
        class="bv-bb5-line-6"
        :stroke="colors[1]"
        :points="`15, ${h - 13} ${w - 110}, ${h - 13}`"
      />
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border12Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 300 },
    colors: { type: Array as () => string[], required: true },
    backgroundColor: { type: String, default: 'transparent' },
  },
});
</script>

<style scoped>
.ss-border-box {
  width: 100%;
  height: 100%;
}
.ss-border-box svg {
  width: 100%;
  height: 100%;
  display: block;
}
.ss-border-box polyline {
  fill: none;
}
</style>