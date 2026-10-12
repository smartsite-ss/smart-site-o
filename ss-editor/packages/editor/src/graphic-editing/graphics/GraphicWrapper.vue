<template>
  <div
    class="graphic-wrapper"
    :class="{ selected: isComponentSelected }"
    :style="wrapperStyle"
    @click="handleClick"
  >
    <slot />
    <div
      v-if="isComponentSelected"
      class="resize-handles"
    >
      <div class="resize-handle top-left" />
      <div class="resize-handle top-right" />
      <div class="resize-handle bottom-left" />
      <div class="resize-handle bottom-right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSelection } from '../../composables/useSelection';

const props = defineProps({
  graphicId: {
    type: String,
    required: true,
  },
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  width: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
});

const { selectGraphic, isSelected } = useSelection();

// 计算包装器样式
const wrapperStyle = computed(() => {
  return {
    position: 'absolute' as const,
    left: `${props.x}px`,
    top: `${props.y}px`,
    width: `${props.width}px`,
    height: `${props.height}px`,
  };
});

// 检查图形是否被选择
const isComponentSelected = computed(() => {
  return isSelected(props.graphicId);
});

// 处理点击事件
const handleClick = (e: MouseEvent) => {
  e.stopPropagation();
  selectGraphic(props.graphicId);
};
</script>

<style scoped>
.graphic-wrapper {
  position: absolute;
  cursor: move;
  user-select: none;
}

.graphic-wrapper.selected {
  border: 2px solid #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
}

.resize-handles {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #4caf50;
  border: 2px solid white;
  border-radius: 50%;
  pointer-events: all;
  cursor: nwse-resize;
}

.resize-handle.top-left {
  top: 0;
  left: 0;
}

.resize-handle.top-right {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}

.resize-handle.bottom-left {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}

.resize-handle.bottom-right {
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
}
</style>
