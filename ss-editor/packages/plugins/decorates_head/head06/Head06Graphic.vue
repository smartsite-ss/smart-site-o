<template>
  <div class="head06-container">
    <svg
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <polygon
        :fill="colors[0]"
        :stroke="colors[1]"
        stroke-width="1"
        :points="`15.5 6.5 20.5 0.5 50.5 0.5 55.5 6.5 15.5 6.5`"
      />
      <polygon
        :fill="colors[0]"
        :stroke="colors[1]"
        stroke-width="1"
        :points="`15.5 ${h-6.5} 20.5 ${h-0.5} 50.5 ${h-0.5} 55.5 ${h-6.5} 15.5 ${h-6.5}`"
      />
      <polygon
        :fill="colors[0]"
        :stroke="colors[1]"
        stroke-width="1"
        :points="`${w-15.5} 6.5 ${w-20.5} 0.5 ${w-50.5} 0.5 ${w-55.5} 6.5 ${w-15.5} 6.5`"
      />
      <polygon
        :fill="colors[0]"
        :stroke="colors[1]"
        stroke-width="1"
        :points="`${w-15.5} ${h-6.5} ${w-20.5} ${h-0.5} ${w-50.5} ${h-0.5} ${w-55.5} ${h-6.5} ${w-15.5} ${h-6.5}`"
      />
      <polygon
        :fill="colors[0]"
        :stroke="colors[1]"
        stroke-width="1"
        :points="`15.5 6.5 0.5 ${h/2} 15.5 ${h-6.5} ${w-15.5} ${h-6.5} ${w-0.5} ${h/2} ${w-15.5} 6.5 15.5 6.5`"
      />
      <polyline
        :stroke="colors[1]"
        stroke-width="1"
        fill="transparent"
        :points="`20.5 14.5 8.5 ${h/2} 20.5 ${h-14.5}`"
      />
      <polyline
        :stroke="colors[1]"
        stroke-width="1"
        fill="transparent"
        :points="`${w-20.5} 14.5 ${w-8.5} ${h/2} ${w-20.5} ${h-14.5}`"
      />
    </svg>
    <span
      class="head06-text"
      :style="{ color: textColor, fontSize: textSize + 'px' }"
    >{{ dataset }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps({
  w: { type: Number, default: 500 },
  h: { type: Number, default: 70 },
  colors: { type: Array as () => string[], required: true },
  dataset: { type: String, default: '' },
  textColor: { type: String, default: '#fff' },
  textSize: { type: Number, default: 32 },
});
</script>

<style scoped>
.head06-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.head06-container svg {
  width: 100%;
  height: 100%;
  display: block;
}
.head06-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
  text-align: center;
}
</style>