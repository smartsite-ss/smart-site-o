<template>
  <div class="ss-border-box">
    <svg
      class="bv-border-svg-container"
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <polygon
        :fill="backgroundColor"
        :points="`
        23, 23 ${w - 24}, 23 ${w - 24}, ${h - 24} 23, ${h - 24}
      `"
      />

      <polyline
        class="ss-border-line-1"
        :stroke="colors[0]"
        :points="`4, 4 ${w - 22} ,4 ${w - 22}, ${h - 22} 4, ${h - 22} 4, 4`"
      />
      <polyline
        class="ss-border-line-3"
        :stroke="colors[1]"
        :points="`10, 10 ${w - 16}, 10 ${w - 16}, ${h - 16} 10, ${
          h - 16
        } 10, 10`"
      />
      <polyline
        class="ss-border-line-3"
        :stroke="colors[1]"
        :points="`16, 16 ${w - 10}, 16 ${w - 10}, ${h - 10} 16, ${
          h - 10
        } 16, 16`"
      />
      <polyline
        class="ss-border-line-3"
        :stroke="colors[1]"
        :points="`22, 22 ${w - 4}, 22 ${w - 4}, ${h - 4} 22, ${h - 4} 22, 22`"
      />
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border11Graphic',
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
.ss-border-line-1 {
  stroke-width: 1;
}
.ss-border-line-3 {
  stroke-width: 3;
}
</style>