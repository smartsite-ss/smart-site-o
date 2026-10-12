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
        ${w - 15}, 22 170, 22 150, 7 40, 7 28, 21 32, 24
        16, 42 16, ${h - 32} 41, ${h - 7} ${w - 15}, ${h - 7}
      `"
      />

      <polyline
        class="ss-border-line-1"
        :stroke="colors[0]"
        :points="`145, ${h - 5} 40, ${h - 5} 10, ${h - 35}
          10, 40 40, 5 150, 5 170, 20 ${w - 15}, 20`"
      />
      <polyline
        :stroke="colors[1]"
        class="ss-border-line-2"
        :points="`245, ${h - 1} 36, ${h - 1} 14, ${h - 23}
          14, ${h - 100}`"
      />

      <polyline
        class="ss-border-line-3"
        :stroke="colors[0]"
        :points="`7, ${h - 40} 7, ${h - 75}`"
      />
      <polyline
        class="ss-border-line-4"
        :stroke="colors[0]"
        :points="`28, 24 13, 41 13, 64`"
      />
      <polyline
        class="ss-border-line-5"
        :stroke="colors[0]"
        :points="`5, 45 5, 140`"
      />
      <polyline
        class="ss-border-line-6"
        :stroke="colors[1]"
        :points="`14, 75 14, 180`"
      />
      <polyline
        class="ss-border-line-7"
        :stroke="colors[1]"
        :points="`55, 11 147, 11 167, 26 250, 26`"
      />
      <polyline
        class="ss-border-line-8"
        :stroke="colors[1]"
        :points="`158, 5 173, 16`"
      />
      <polyline
        class="ss-border-line-9"
        :stroke="colors[0]"
        :points="`200, 17 ${w - 10}, 17`"
      />
      <polyline
        class="ss-border-line-10"
        :stroke="colors[1]"
        :points="`385, 17 ${w - 10}, 17`"
      />
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border10Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 300 },
    colors: { type: Array as () => string[], required: true },
    backgroundColor: { type: String, default: 'transparent' },
  },
});
</script>

<style scoped>
.ss-border-box svg {
  width: 100%;
  height: 100%;
  display: block;
}
.ss-border-box polyline {
  fill: none;
}
.ss-border-line-1,
.ss-border-line-2,
.ss-border-line-3,
.ss-border-line-6,
.ss-border-line-7,
.ss-border-line-10 {
  stroke-width: 1;
}
.ss-border-line-3,
.ss-border-line-4,
.ss-border-line-8,
.ss-border-line-9 {
  stroke-width: 3px;
  stroke-linecap: round;
}
.ss-border-line-9 {
  stroke-dasharray: 100 250;
}
.ss-border-line-10 {
  stroke-dasharray: 80 270;
}
</style>