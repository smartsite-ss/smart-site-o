<template>
  <div class="canvas-ruler-container">
    <!-- 标尺交汇处 -->
    <div
      v-if="showRuler"
      class="ruler-intersection"
    >
      <button
        class="guide-line-toggle"
        :class="{ active: showReferenceLines }"
        @click="toggleReferenceLines"
      >
        <span class="icon">👁️</span>
      </button>
    </div>

    <!-- 垂直标尺 -->
    <VerticalRuler
      v-if="showRuler"
      :canvas-width="canvasWidth"
      :canvas-height="canvasHeight"
      :scale="scale"
      :scroll-left="scrollLeft"
      :scroll-top="scrollTop"
      :mouse-position="mousePosition ?? null"
      @update:mouse-position="updateMousePosition"
    />

    <div class="canvas-content-container">
      <!-- 水平标尺 -->
      <HorizontalRuler
        v-if="showRuler"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
        :scale="scale"
        :scroll-left="scrollLeft"
        :scroll-top="scrollTop"
        :mouse-position="mousePosition ?? null"
        @update:mouse-position="updateMousePosition"
      />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import VerticalRuler from './ruler/VerticalRuler.vue';
import HorizontalRuler from './ruler/HorizontalRuler.vue';
import { usePageStore } from '@scada-editor/core';

interface Props {
  canvasWidth: number;
  canvasHeight: number;
  showRuler?: boolean;
  showReferenceLines?: boolean;
  scrollLeft?: number;
  scrollTop?: number;
  mousePosition?: { x: number; y: number } | null;
}

const props = withDefaults(defineProps<Props>(), {
  showRuler: true,
  showReferenceLines: false,
  scrollLeft: 0,
  scrollTop: 0,
});

const emit = defineEmits<{
  'toggle:reference-lines': [];
  'update:mouse-position': [pos: { x: number; y: number } | null];
}>();

const pageStore = usePageStore();
const scale = computed(() => pageStore.currentPageScaleFactor);

const showReferenceLines = ref(props.showReferenceLines);

const toggleReferenceLines = () => {
  showReferenceLines.value = !showReferenceLines.value;
  emit('toggle:reference-lines');
};

const updateMousePosition = (pos: { x: number; y: number } | null) => {
  emit('update:mouse-position', pos);
};
</script>

<style scoped>
.canvas-ruler-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.ruler-intersection {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  width: 30px;
  height: 30px;
  background-color: var(--surface);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.guide-line-toggle {
  width: 20px;
  height: 20px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background-color: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.guide-line-toggle:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
}

.guide-line-toggle.active {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.guide-line-toggle .icon {
  font-size: 12px;
}

.canvas-content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
