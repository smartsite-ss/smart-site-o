<template>
  <div
    v-if="showOverlay"
    class="selection-overlay"
    tabindex="0"
    @dblclick="handleDoubleClick"
  >
    <!-- 实时鼠标辅助线 -->
    <div
      v-if="showReferenceLines && mousePosition"
      class="reference-lines"
    >
      <div
        class="reference-line horizontal"
        :style="{ top: `${mousePosition.y}px` }"
      />
      <div
        class="reference-line vertical"
        :style="{ left: `${mousePosition.x}px` }"
      />
    </div>

    <!-- 用户创建的辅助线 -->
    <div
      v-if="showReferenceLines"
      class="user-guide-lines"
    >
      <div
        v-for="line in guideLines"
        :key="line.id"
        class="user-guide-line"
        :class="line.direction"
        :style="getGuideLineStyle(line)"
        @mousedown="(e) => handleGuideLineMouseDown(e, line)"
        @dblclick="(e) => handleGuideLineDoubleClick(e, line.id)"
      />
    </div>

    <!-- ===== 智能对齐线（拖拽时显示） ===== -->
    <div
      v-if="alignTargets && alignTargets.length > 0"
      class="align-lines"
    >
      <div
        v-for="(target, index) in alignTargets"
        :key="'align-' + index"
        class="align-line"
        :class="getAlignLineClass(target)"
        :style="getAlignLineStyle(target)"
      />
    </div>

    <!-- ===== 网格吸附指示器 ===== -->
    <div
      v-if="snapTargets && snapTargets.length > 0"
      class="snap-indicators"
    >
      <div
        v-for="(target, index) in snapTargets"
        :key="'snap-' + index"
        class="snap-indicator"
        :class="getSnapIndicatorClass(target)"
        :style="getSnapIndicatorStyle(target)"
      >
        <span class="snap-icon">{{ getSnapIcon(target.type) }}</span>
      </div>
    </div>

    <!-- 选择框 -->
    <SelectionRectangle
      v-if="!useCanvasSelection && isSelecting"
      :is-selecting="true"
      :selection-rect="selectionRect"
      :scroll-left="scrollLeft"
      :scroll-top="scrollTop"
      :is-graphic-selection="false"
      selection-mode="box"
    />

    <SelectionRectangle
      v-if="!useCanvasSelection && showSelectedRect"
      :is-selecting="true"
      :selection-rect="selectedGraphicRect ?? undefined"
      :rotation="selectedGraphicRotation"
      :scale="scale"
      :pan-x="panX"
      :pan-y="panY"
      :scroll-left="scrollLeft"
      :scroll-top="scrollTop"
      :is-graphic-selection="true"
      :selection-mode="isGroupEditingMode ? 'single' : (selectedGraphicIds.length === 1 ? 'single' : 'multiple')"
      @rotate="(angle) => emit('rotate', angle)"
      @resize="(rect) => emit('resize', rect)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import SelectionRectangle from './SelectionRectangle.vue';

interface SelectionRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface GuideLine {
  id: string;
  position: number;
  direction: 'horizontal' | 'vertical';
  color?: string;
}

const props = defineProps<{
  isSelecting: boolean;
  selectionRect: SelectionRect;
  selectedGraphicRect: SelectionRect | null;
  selectedGraphicRotation: number;
  selectedGraphicIds: string[];
  scrollLeft: number;
  scrollTop: number;
  scale: number;
  panX: number;
  panY: number;
  showReferenceLines: boolean;
  mousePosition: { x: number; y: number } | null;
  guideLines?: GuideLine[];
  useCanvasSelection?: boolean;
  // 智能对齐和网格吸附
  alignTargets?: any[];
  snapTargets?: any[];
}>();

const emit = defineEmits<{
  rotate: [angle: number];
  resize: [rect: SelectionRect];
  'move-guide-line': [id: string, position: number];
  'delete-guide-line': [id: string];
  'enter-group-edit': [groupId: string];
  'exit-group-edit': [];
}>();

// 辅助线拖拽状态
const isDraggingGuideLine = ref(false);
const draggingGuideLineId = ref<string | null>(null);

// ===== 组编辑模式支持 =====
const isGroupEditingMode = ref(false);
let lastClickTime = 0;
const DOUBLE_CLICK_THRESHOLD = 300; // ms

// 检测是否选中了组合图元
const isSelectedGroup = computed(() => {
  if (props.selectedGraphicIds.length === 0) return false;

  try {
    const { usePageStore } = require('@scada-editor/core');
    const pageStore = usePageStore();
    const currentPage = pageStore.currentPage;

    if (!currentPage || typeof currentPage.getGroupManager !== 'function') return false;

    const groupManager = currentPage.getGroupManager();
    if (!groupManager) return false;

    for (const id of props.selectedGraphicIds) {
      if (groupManager.isGraphicInGroup(id) || groupManager.isGroup(id)) {
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to check group selection:', e);
  }

  return false;
});

// 双击处理 - 进入组编辑模式
const handleDoubleClick = (event: MouseEvent) => {
  const currentTime = Date.now();

  if (currentTime - lastClickTime <= DOUBLE_CLICK_THRESHOLD && isSelectedGroup.value) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const { usePageStore } = require('@scada-editor/core');
      const pageStore = usePageStore();
      const currentPage = pageStore.currentPage;

      if (currentPage && typeof currentPage.getGroupManager === 'function') {
        const groupManager = currentPage.getGroupManager();
        if (groupManager && props.selectedGraphicIds.length > 0) {
          const groupId = props.selectedGraphicIds[0];

          // 检查是否是组ID或图元在组中
          let targetGroupId = null;
          if (groupManager.isGroup(groupId)) {
            targetGroupId = groupId;
          } else {
            const group = groupManager.getGroupForGraphic(groupId);
            if (group) targetGroupId = group.id;
          }

          if (targetGroupId) {
            isGroupEditingMode.value = true;
            emit('enter-group-edit', targetGroupId);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to enter group edit mode:', e);
    }
  }

  lastClickTime = currentTime;
};

// Esc键处理 - 退出组编辑模式
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isGroupEditingMode.value) {
    event.preventDefault();
    isGroupEditingMode.value = false;
    emit('exit-group-edit');
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', updateCanvasOffset);
  window.addEventListener('scroll', updateCanvasOffset, true);
  nextTick(() => {
    updateCanvasOffset();
  });
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('resize', updateCanvasOffset);
  window.removeEventListener('scroll', updateCanvasOffset, true);
});

const canvasLeft = ref(0);
const canvasTop = ref(0);

watch([() => props.scale, () => props.panX, () => props.panY], () => {
  nextTick(updateCanvasOffset);
});

const updateCanvasOffset = () => {
  const canvas = document.querySelector('canvas.design-canvas');
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    const wrapper = canvas.parentElement;
    if (wrapper) {
      const wrapperRect = wrapper.getBoundingClientRect();
      canvasLeft.value = rect.left - wrapperRect.left;
      canvasTop.value = rect.top - wrapperRect.top;
    }
  }
};

// ===== 智能对齐线样式计算 =====
const getAlignLineClass = (target: any) => {
  if (target.type === 'left' || target.type === 'right' || target.type === 'centerX') {
    return 'vertical';
  }
  return 'horizontal';
};

const getAlignLineStyle = (target: any) => {
  if (target.type === 'left' || target.type === 'right' || target.type === 'centerX') {
    const displayX = target.value * props.scale + props.panX + canvasLeft.value;
    return {
      left: `${displayX}px`,
      top: '0',
      width: '2px',
      height: '100%',
      backgroundColor: '#00ff00',
      opacity: 0.8,
      zIndex: 6,
    };
  } else {
    const displayY = target.value * props.scale + props.panY + canvasTop.value;
    return {
      left: '0',
      top: `${displayY}px`,
      width: '100%',
      height: '2px',
      backgroundColor: '#00ff00',
      opacity: 0.8,
      zIndex: 6,
    };
  }
};

// ===== 网格吸附指示器样式计算 =====
const getSnapIndicatorClass = (target: any) => {
  return `snap-${target.type}`;
};

const getSnapIndicatorStyle = (target: any) => {
  const x = target.position === 'left' || target.position === 'right' || target.position === 'centerX'
    ? target.value * props.scale + props.panX + canvasLeft.value
    : null;
  const y = target.position === 'top' || target.position === 'bottom' || target.position === 'centerY'
    ? target.value * props.scale + props.panY + canvasTop.value
    : null;

  return {
    left: x !== null ? `${x - 8}px` : 'auto',
    top: y !== null ? `${y - 8}px` : 'auto',
  };
};

const getSnapIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    grid: '⊞',
    edge: '▬',
    center: '◎',
  };
  return iconMap[type] || '●';
};

const showSelectedRect = computed(
  () => props.selectedGraphicIds.length >= 1
    && !props.isSelecting
    && props.selectedGraphicRect !== null
    && (props.selectedGraphicRect.width > 0 || props.selectedGraphicRect.height > 0)
);

const showOverlay = computed(
  () => (props.showReferenceLines && props.mousePosition) ||
        (props.showReferenceLines && (props.guideLines && props.guideLines.length > 0)) ||
        (!props.useCanvasSelection && (props.isSelecting || props.selectedGraphicIds.length > 0))
);

// 获取辅助线样式
const getGuideLineStyle = (line: GuideLine) => {
  if (line.direction === 'horizontal') {
    return {
      top: `${line.position}px`,
      left: '0',
      width: '100%',
      height: '2px',
      backgroundColor: line.color || '#409EFF',
      opacity: 0.8,
      cursor: 'row-resize'
    };
  } else {
    return {
      left: `${line.position}px`,
      top: '0',
      height: '100%',
      width: '2px',
      backgroundColor: line.color || '#409EFF',
      opacity: 0.8,
      cursor: 'col-resize'
    };
  }
};

// 辅助线鼠标按下 - 开始拖拽
const handleGuideLineMouseDown = (event: MouseEvent, line: GuideLine) => {
  event.stopPropagation();
  event.preventDefault();
  
  isDraggingGuideLine.value = true;
  draggingGuideLineId.value = line.id;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    if (isDraggingGuideLine.value && draggingGuideLineId.value) {
      // 获取当前视口位置并转换为逻辑坐标
      const rect = document.querySelector('.selection-overlay')?.getBoundingClientRect();
      if (!rect) return;
      
      let newPosition: number;
      if (line.direction === 'horizontal') {
        newPosition = moveEvent.clientY - rect.top;
      } else {
        newPosition = moveEvent.clientX - rect.left;
      }
      
      emit('move-guide-line', draggingGuideLineId.value, newPosition);
    }
  };

  const handleMouseUp = () => {
    isDraggingGuideLine.value = false;
    draggingGuideLineId.value = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp, { once: true });
};

// 辅助线双击 - 删除
const handleGuideLineDoubleClick = (event: MouseEvent, lineId: string) => {
  event.stopPropagation();
  event.preventDefault();
  emit('delete-guide-line', lineId);
};
</script>

<style scoped>
.selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}
.reference-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.reference-line {
  position: absolute;
  background-color: var(--primary);
  opacity: 1;
}
.reference-line.horizontal {
  left: 0;
  width: 100%;
  height: 1px;
}
.reference-line.vertical {
  top: 0;
  width: 1px;
  height: 100%;
}
.user-guide-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.user-guide-line {
  position: absolute;
  pointer-events: auto;
  transition: opacity 0.15s ease;
}
.user-guide-line:hover {
  opacity: 1 !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
}
.user-guide-line.horizontal {
  left: 0;
  width: 100%;
}
.user-guide-line.vertical {
  top: 0;
  height: 100%;
}

/* ===== 智能对齐线样式 ===== */
.align-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 6;
}

.align-line {
  position: absolute;
  background-color: #00ff00;
  opacity: 0.8;
  animation: align-pulse 1s ease-in-out infinite;
}

.align-line.vertical {
  width: 2px;
  height: 100%;
}

.align-line.horizontal {
  width: 100%;
  height: 2px;
}

@keyframes align-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ===== 网格吸附指示器样式 ===== */
.snap-indicators {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 7;
}

.snap-indicator {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  animation: snap-bounce 0.3s ease-out;
}

.snap-grid {
  background-color: rgba(59, 130, 246, 0.9);
  color: white;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
}

.snap-edge {
  background-color: rgba(16, 185, 129, 0.9);
  color: white;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.snap-center {
  background-color: rgba(245, 158, 11, 0.9);
  color: white;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
}

.snap-icon {
  line-height: 1;
}

@keyframes snap-bounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
</style>
