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
        7, 7 ${w - 7}, 7 ${w - 7}, ${h - 7} 7, ${h - 7}
      `"
      />

      <polyline
        :stroke="colors[0]"
        :points="`2, 2 ${w - 2} ,2 ${w - 2}, ${h - 2} 2, ${h - 2} 2, 2`"
      />
      <polyline
        :stroke="colors[1]"
        :points="`6, 6 ${w - 6}, 6 ${w - 6}, ${h - 6} 6, ${h - 6} 6, 6`"
      />
      <circle
        :fill="colors[0]"
        cx="11"
        cy="11"
        r="1"
      />
      <circle
        :fill="colors[0]"
        :cx="w - 11"
        cy="11"
        r="1"
      />
      <circle
        :fill="colors[0]"
        :cx="w - 11"
        :cy="h - 11"
        r="1"
      />
      <circle
        :fill="colors[0]"
        cx="11"
        :cy="h - 11"
        r="1"
      />
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border13Graphic',
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