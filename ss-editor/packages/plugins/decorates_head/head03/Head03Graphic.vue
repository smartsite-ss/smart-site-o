<template>
  <div :style="`width: ${w}px; height: ${h}px; display: flex; justify-content: space-between; align-items: center;`">
    <svg
      :width="20"
      :height="20"
    >
      <polyline
        stroke-width="4"
        fill="transparent"
        :stroke="colors[0]"
        points="10, 0 19, 10 10, 20"
      />
      <polyline
        stroke-width="2"
        fill="transparent"
        :stroke="colors[1]"
        points="2, 0 11, 10 2, 20"
      />
    </svg>
    <span :style="`color: ${textColor}; font-size: ${textSize}px; text-align: center; flex: 1;`">{{ dataset }}</span>
    <svg
      :width="20"
      :height="20"
    >
      <polyline
        stroke-width="4"
        fill="transparent"
        :stroke="colors[0]"
        points="11, 0 2, 10 11, 20"
      />
      <polyline
        stroke-width="2"
        fill="transparent"
        :stroke="colors[1]"
        points="19, 0 10, 10 19, 20"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  w: number
  h: number
  colors: string[]
  dataset: string
  textColor: string
  textSize: number
}>();
</script>

<style scoped>
div {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
span {
  text-align: center;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>