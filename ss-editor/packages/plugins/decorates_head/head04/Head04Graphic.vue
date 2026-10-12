<script setup lang="ts">
const props = defineProps({
  w: Number,
  h: Number,
  colors: Array as () => string[],
  backgroundColor: String,
  reverse: Boolean,
});

const xPos = (pos: number) => {
  if (!props.reverse) return pos;
  return props.w - pos;
};
</script>

<template>
  <svg
    :width="w"
    :height="h"
  >
    <polyline
      :stroke="colors[0]"
      stroke-width="2"
      fill="transparent"
      :points="`${xPos(0)}, 0 ${xPos(30)}, ${h / 2}`"
    />
    <polyline
      :stroke="colors[0]"
      stroke-width="2"
      fill="transparent"
      :points="`${xPos(20)}, 0 ${xPos(50)}, ${h / 2} ${xPos(w)}, ${h / 2}`"
    />
    <polyline
      :stroke="colors[1]"
      fill="transparent"
      stroke-width="3"
      :points="`${xPos(0)}, ${h - 3}, ${xPos(200)}, ${h - 3}`"
    />
  </svg>
</template>