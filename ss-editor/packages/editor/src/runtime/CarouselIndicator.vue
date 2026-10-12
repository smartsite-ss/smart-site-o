<template>
  <div
    v-if="visible"
    class="carousel-indicator"
    @click.stop
  >
    <span
      v-for="(page, index) in pages"
      :key="page.id"
      class="carousel-indicator-dot"
      :class="{
        active: index === currentIndex,
        passed: index < currentIndex,
      }"
      :title="page.name"
      @click="$emit('goTo', index)"
    />
  </div>
</template>

<script setup lang="ts">
import type { CarouselPageInfo } from '@scada-editor/core';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  pages: {
    type: Array as () => CarouselPageInfo[],
    required: true,
  },
  currentIndex: {
    type: Number,
    required: true,
  },
});

defineEmits<{
  goTo: [index: number];
}>();
</script>

<style scoped>
.carousel-indicator {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--surface, #18181c);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 16px;
  box-shadow: var(--shadow-modal, 0 4px 16px rgba(0, 0, 0, 0.3));
}

.carousel-indicator-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border, rgba(255, 255, 255, 0.15));
  cursor: pointer;
  transition: all 0.3s ease;
}

.carousel-indicator-dot.active {
  background: var(--primary, #63e2b7);
  transform: scale(1.4);
  box-shadow: 0 0 6px var(--primary, rgba(99, 226, 183, 0.4));
}

.carousel-indicator-dot.passed {
  background: var(--text-secondary, #888);
}

.carousel-indicator-dot:hover {
  background: var(--text, #e0e0e0);
  transform: scale(1.2);
}
</style>
