<template>
  <svg
    class="border02-graphic"
    :width="w"
    :height="h"
    :viewBox="`0 0 ${w} ${h}`"
  >
    <path
      :fill="backgroundColor"
      :stroke="colors[0]"
      stroke-width="2"
      :d="`
        M 5 20 L 5 10 L 12 3  L 60 3 L 68 10
        L ${w - 20} 10 L ${w - 5} 25
        L ${w - 5} ${h - 5} L 20 ${h - 5}
        L 5 ${h - 20} L 5 20
      `"
    />

    <path
      fill="transparent"
      stroke-width="3"
      stroke-linecap="round"
      stroke-dasharray="10, 5"
      :stroke="colors[0]"
      :d="`M 16 9 L 61 9`"
    />

    <path
      fill="transparent"
      :stroke="colors[1]"
      stroke-width="2"
      :d="`M 5 20 L 5 10 L 12 3  L 60 3 L 68 10`"
    />

    <path
      fill="transparent"
      :stroke="colors[1]"
      stroke-width="2"
      :d="`M ${w - 5} ${h - 30} L ${w - 5} ${h - 5} L ${w - 30} ${h - 5}`"
    />
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border02Graphic',
  props: {
    w: {
      type: Number,
      default: 400,
    },
    h: {
      type: Number,
      default: 300,
    },
    colors: {
      type: Array as () => string[],
      required: true,
    },
    backgroundColor: {
      type: String,
      default: 'transparent',
    },
  },
  setup() {
    return {};
  },
});
</script>

<style scoped>
.border02-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>