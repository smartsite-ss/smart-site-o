<template>
  <div class="canvas-toolbar">
    <div class="selection-mode-toggle">
      <button
        :class="{ active: !useCanvasSelection }"
        title="DOM 选择框方案（支持调整大小和旋转）"
        @click="emit('selection-mode-change', 'dom')"
      >
        DOM
      </button>
      <button
        :class="{ active: useCanvasSelection }"
        title="Canvas 选择框方案（性能更优）"
        @click="emit('selection-mode-change', 'canvas')"
      >
        Canvas
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  useCanvasSelection: boolean;
}>();

const emit = defineEmits<{
  'selection-mode-change': [mode: 'dom' | 'canvas'];
}>();
</script>

<style scoped>
.canvas-toolbar {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 100;
}
.selection-mode-toggle {
  display: flex;
  gap: 5px;
}
.selection-mode-toggle button {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--surface);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.selection-mode-toggle button:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
  color: var(--text-primary);
}
.selection-mode-toggle button.active {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}
</style>
