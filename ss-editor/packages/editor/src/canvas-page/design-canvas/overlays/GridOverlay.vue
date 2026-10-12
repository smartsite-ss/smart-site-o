<template>
  <div
    v-if="showGrid"
    class="grid-overlay"
  />
</template>

<script setup lang="ts">
defineProps({
  showGrid: {
    type: Boolean,
    default: true,
  },
});
</script>

<style scoped>
.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(var(--border-light) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}
</style>
