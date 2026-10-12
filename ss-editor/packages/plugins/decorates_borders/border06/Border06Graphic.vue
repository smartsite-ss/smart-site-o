<template>
  <div
    class="ss-border-box"
    :style="{
      boxShadow: `inset 0 0 40px ${colors[0]}`,
      border: `1px solid ${colors[1]}`,
      backgroundColor: backgroundColor,
    }"
  >
    <svg
      :width="w"
      :height="h"
    >
      <polyline
        class="ss-border-line-w-2"
        :stroke="colors[0]"
        :points="`0, 25 0, 0 25, 0`"
      />
      <polyline
        class="ss-border-line-w-2"
        :stroke="colors[0]"
        :points="`${w - 25}, 0 ${w}, 0 ${w}, 25`"
      />
      <polyline
        class="ss-border-line-w-2"
        :stroke="colors[0]"
        :points="`${w - 25}, ${h} ${w}, ${h} ${w}, ${h - 25}`"
      />
      <polyline
        class="ss-border-line-w-2"
        :stroke="colors[0]"
        :points="`0, ${h - 25} 0, ${h} 25, ${h}`"
      />

      <polyline
        class="ss-border-line-w-5"
        :stroke="colors[1]"
        :points="`0, 10 0, 0 10, 0`"
      />
      <polyline
        class="ss-border-line-w-5"
        :stroke="colors[1]"
        :points="`${w - 10}, 0 ${w}, 0 ${w}, 10`"
      />
      <polyline
        class="ss-border-line-w-5"
        :stroke="colors[1]"
        :points="`${w - 10}, ${h} ${w}, ${h} ${w}, ${h - 10}`"
      />
      <polyline
        class="ss-border-line-w-5"
        :stroke="colors[1]"
        :points="`0, ${h - 10} 0, ${h} 10, ${h}`"
      />
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border06Graphic',
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
  position: relative;
  overflow: hidden;
}
.ss-border-box svg {
  position: absolute;
  top: 0;
  left: 0;
}
.ss-border-box polyline {
  fill: none;
  stroke-linecap: round;
}
.ss-border-line-w-2 {
  stroke-width: 2;
}
.ss-border-line-w-5 {
  stroke-width: 5;
}
</style>