<template>
  <div
    v-if="isSelecting"
    class="selection-container"
    :style="selectionStyle"
  >
    <!-- 半透明遮罩 -->
    <div class="selection-mask" />
    <!-- 边框 -->
    <div class="selection-border" />
    
    <!-- 图元选中时显示调整手柄（框选时不显示，自定义控制点的图元不显示） -->
    <template v-if="selectionMode !== 'box' && !disableResizeHandles">
      <!-- 角落手柄 -->
      <div
        class="corner top-left"
        @mousedown.stop="(e) => onResizeStart(e, 'TOP_LEFT')"
      />
      <div
        class="corner top-right"
        @mousedown.stop="(e) => onResizeStart(e, 'TOP_RIGHT')"
      />
      <div
        class="corner bottom-left"
        @mousedown.stop="(e) => onResizeStart(e, 'BOTTOM_LEFT')"
      />
      <div
        class="corner bottom-right"
        @mousedown.stop="(e) => onResizeStart(e, 'BOTTOM_RIGHT')"
      />
      <!-- 边中间手柄 -->
      <div
        class="handle top-middle"
        @mousedown.stop="(e) => onResizeStart(e, 'TOP')"
      />
      <div
        class="handle bottom-middle"
        @mousedown.stop="(e) => onResizeStart(e, 'BOTTOM')"
      />
      <div
        class="handle left-middle"
        @mousedown.stop="(e) => onResizeStart(e, 'LEFT')"
      />
      <div
        class="handle right-middle"
        @mousedown.stop="(e) => onResizeStart(e, 'RIGHT')"
      />
      <!-- 旋转手柄（仅单图元选中时显示） -->
      <div 
        v-if="selectionMode === 'single'"
        class="rotation-container"
        :style="{
          left: '50%',
          top: '-28px',
          transform: 'translateX(-50%)',
        }"
      >
        <!-- 连接线 -->
        <div class="rotation-line" />
        <!-- 旋转手柄 -->
        <div 
          class="rotation-handle" 
          @mousedown.stop="onRotationStart"
        >
          <span class="rotation-icon">↻</span>
          <span class="rotation-degree">{{ Math.round(rotation) }}°</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { usePageStore, useGraphicStore, TransformGraphicChange } from '@scada-editor/core';

const pageStore = usePageStore();
const graphicStore = useGraphicStore();

const props = defineProps({
  isSelecting: {
    type: Boolean,
    default: false,
  },
  selectionRect: {
    type: Object,
    default: () => ({ left: 0, top: 0, width: 0, height: 0 }),
  },
  rotation: {
    type: Number,
    default: 0,
  },
  scale: {
    type: Number,
    default: 1,
  },
  panX: {
    type: Number,
    default: 0,
  },
  panY: {
    type: Number,
    default: 0,
  },
  scrollLeft: {
    type: Number,
    default: 0,
  },
  scrollTop: {
    type: Number,
    default: 0,
  },
  isGraphicSelection: {
    type: Boolean,
    default: false,
  },
  selectionMode: {
    type: String,
    default: 'box',
    validator: (value: string) => ['box', 'single', 'multiple'].includes(value),
  },
  disableResizeHandles: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['rotate', 'resize', 'move']);

const canvasLeft = ref(0);
const canvasTop = ref(0);

const selectionStyle = computed(() => {
  const { left, top, width, height } = props.selectionRect;
  const { scale, panX, panY, rotation } = props;

  // 零尺寸 rect 不渲染，防止 8 个手柄重叠在顶点
  if (width <= 0 || height <= 0) return { display: 'none' };
  
  if (props.isGraphicSelection) {
    return {
      left: `${left * scale + panX + canvasLeft.value}px`,
      top: `${top * scale + panY + canvasTop.value}px`,
      width: `${width * scale}px`,
      height: `${height * scale}px`,
      transform: `rotate(${rotation}deg)`,
      transformOrigin: 'center center',
    };
  } else {
    return {
      left: `${left + canvasLeft.value}px`,
      top: `${top + canvasTop.value}px`,
      width: `${width}px`,
      height: `${height}px`,
      transform: 'none',
    };
  }
});

const isRotating = ref(false);
const startAngle = ref(0);
const startRotation = ref(0);
const rotationStartGeometry = ref<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null);

const isResizing = ref(false);
const resizeHandleType = ref('');
const startResizeClientX = ref(0);
const startResizeClientY = ref(0);
const startRect = ref({ left: 0, top: 0, width: 0, height: 0 });
const resizeStartGeometry = ref<Record<string, { x: number; y: number; width: number; height: number; rotation: number }> | null>(null);

const updateCanvasPosition = () => {
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

const getCenterPoint = () => {
  const { left, top, width, height } = props.selectionRect;
  const { scale, panX, panY, isGraphicSelection } = props;
  
  if (isGraphicSelection) {
    return {
      x: left * scale + panX + canvasLeft.value + (width * scale) / 2,
      y: top * scale + panY + canvasTop.value + (height * scale) / 2,
    };
  } else {
    return {
      x: left + canvasLeft.value + width / 2,
      y: top + canvasTop.value + height / 2,
    };
  }
};

const calculateAngle = (clientX: number, clientY: number) => {
  const center = getCenterPoint();
  const dx = clientX - center.x;
  const dy = clientY - center.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
};

const onRotationStart = (event: MouseEvent) => {
  isRotating.value = true;
  startAngle.value = calculateAngle(event.clientX, event.clientY);
  startRotation.value = props.rotation;
  
  // 记录旋转前的 geometry 用于历史记录
  const selectedGraphics = graphicStore.selectedGraphics;
  if (selectedGraphics.length > 0) {
    const graphic = selectedGraphics[0];
    const pos = graphic.getPosition();
    const size = graphic.getSize();
    rotationStartGeometry.value = {
      x: pos.x,
      y: pos.y,
      width: size.width,
      height: size.height,
      rotation: graphic.config?.geometry?.rotation ?? 0,
    };
    // 开始批量历史记录
    pageStore.currentPage?.startBatch?.('旋转图元');
  }
  
  document.addEventListener('mousemove', onRotationMove);
  document.addEventListener('mouseup', onRotationEnd);
  
  event.preventDefault();
};

const onRotationMove = (event: MouseEvent) => {
  if (!isRotating.value) return;
  
  const currentAngle = calculateAngle(event.clientX, event.clientY);
  let deltaAngle = currentAngle - startAngle.value;
  
  if (deltaAngle > 180) deltaAngle -= 360;
  if (deltaAngle < -180) deltaAngle += 360;
  
  const newRotation = (startRotation.value + deltaAngle) % 360;
  emit('rotate', newRotation);
};

const onRotationEnd = () => {
  isRotating.value = false;
  
  // 记录旋转的历史：对比起始和终点的 geometry
  const startGeom = rotationStartGeometry.value;
  if (startGeom) {
    const selectedGraphics = graphicStore.selectedGraphics;
    if (selectedGraphics.length > 0) {
      const graphic = selectedGraphics[0];
      const pos = graphic.getPosition();
      const size = graphic.getSize();
      const currentGeom = {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
        rotation: graphic.config?.geometry?.rotation ?? 0,
      };
      
      const page = pageStore.currentPage;
      const historyManager = page?.getHistoryManager?.();
      if (historyManager && page) {
        if (
          startGeom.x !== currentGeom.x ||
          startGeom.y !== currentGeom.y ||
          startGeom.width !== currentGeom.width ||
          startGeom.height !== currentGeom.height ||
          startGeom.rotation !== currentGeom.rotation
        ) {
          const change = new TransformGraphicChange(
            page as any,
            graphic.id,
            startGeom,
            currentGeom,
          );
          historyManager.saveChange(change);
        }
      }
    }
    // 结束批量历史记录
    pageStore.currentPage?.endBatch?.();
  }
  rotationStartGeometry.value = null;
  
  document.removeEventListener('mousemove', onRotationMove);
  document.removeEventListener('mouseup', onRotationEnd);
};

const onResizeStart = (event: MouseEvent, handleType: string) => {
  isResizing.value = true;
  resizeHandleType.value = handleType;
  startResizeClientX.value = event.clientX;
  startResizeClientY.value = event.clientY;
  startRect.value = { ...props.selectionRect as { left: number; top: number; width: number; height: number } };
  
  // 记录缩放前的 geometry 用于历史记录
  const selectedGraphics = graphicStore.selectedGraphics;
  if (selectedGraphics.length > 0) {
    resizeStartGeometry.value = {};
    for (const graphic of selectedGraphics) {
      if (graphic && typeof graphic.getPosition === 'function' && typeof graphic.getSize === 'function') {
        const pos = graphic.getPosition();
        const size = graphic.getSize();
        resizeStartGeometry.value[graphic.id] = {
          x: pos.x,
          y: pos.y,
          width: size.width,
          height: size.height,
          rotation: graphic.config?.geometry?.rotation ?? 0,
        };
      }
    }
    // 开始批量历史记录
    pageStore.currentPage?.startBatch?.('缩放图元');
  }
  
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
  
  event.preventDefault();
  event.stopPropagation();
};

const onResizeMove = (event: MouseEvent) => {
  if (!isResizing.value) return;
  
  const deltaX = (event.clientX - startResizeClientX.value) / props.scale;
  const deltaY = (event.clientY - startResizeClientY.value) / props.scale;
  
  let newLeft = startRect.value.left;
  let newTop = startRect.value.top;
  let newWidth = startRect.value.width;
  let newHeight = startRect.value.height;
  
  switch (resizeHandleType.value) {
    case 'TOP_LEFT':
      newLeft = startRect.value.left + deltaX;
      newTop = startRect.value.top + deltaY;
      newWidth = startRect.value.width - deltaX;
      newHeight = startRect.value.height - deltaY;
      break;
    case 'TOP_RIGHT':
      newTop = startRect.value.top + deltaY;
      newWidth = startRect.value.width + deltaX;
      newHeight = startRect.value.height - deltaY;
      break;
    case 'BOTTOM_LEFT':
      newLeft = startRect.value.left + deltaX;
      newWidth = startRect.value.width - deltaX;
      newHeight = startRect.value.height + deltaY;
      break;
    case 'BOTTOM_RIGHT':
      newWidth = startRect.value.width + deltaX;
      newHeight = startRect.value.height + deltaY;
      break;
    case 'TOP':
      newTop = startRect.value.top + deltaY;
      newHeight = startRect.value.height - deltaY;
      break;
    case 'BOTTOM':
      newHeight = startRect.value.height + deltaY;
      break;
    case 'LEFT':
      newLeft = startRect.value.left + deltaX;
      newWidth = startRect.value.width - deltaX;
      break;
    case 'RIGHT':
      newWidth = startRect.value.width + deltaX;
      break;
  }
  
  newWidth = Math.max(10, newWidth);
  newHeight = Math.max(10, newHeight);
  
  emit('resize', { left: newLeft, top: newTop, width: newWidth, height: newHeight });
};

const onResizeEnd = () => {
  isResizing.value = false;
  
  // 记录缩放的历史：对比起始和终点的 geometry
  const startGeoms = resizeStartGeometry.value;
  if (startGeoms) {
    const selectedGraphics = graphicStore.selectedGraphics;
    const page = pageStore.currentPage;
    const historyManager = page?.getHistoryManager?.();
    if (historyManager && page) {
      for (const graphic of selectedGraphics) {
        if (!graphic || typeof graphic.getPosition !== 'function' || typeof graphic.getSize !== 'function') continue;
        const startGeom = startGeoms[graphic.id];
        if (startGeom) {
          const pos = graphic.getPosition();
          const size = graphic.getSize();
          const currentGeom = {
            x: pos.x,
            y: pos.y,
            width: size.width,
            height: size.height,
            rotation: graphic.config?.geometry?.rotation ?? 0,
          };
          if (
            startGeom.x !== currentGeom.x ||
            startGeom.y !== currentGeom.y ||
            startGeom.width !== currentGeom.width ||
            startGeom.height !== currentGeom.height ||
            startGeom.rotation !== currentGeom.rotation
          ) {
            const change = new TransformGraphicChange(
              page as any,
              graphic.id,
              startGeom,
              currentGeom,
            );
            historyManager.saveChange(change);
          }
        }
      }
    }
    // 结束批量历史记录
    pageStore.currentPage?.endBatch?.();
  }
  resizeStartGeometry.value = null;
  
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
};

onMounted(() => {
  updateCanvasPosition();
  window.addEventListener('resize', updateCanvasPosition);
  window.addEventListener('scroll', updateCanvasPosition);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasPosition);
  window.removeEventListener('scroll', updateCanvasPosition);
  document.removeEventListener('mousemove', onRotationMove);
  document.removeEventListener('mouseup', onRotationEnd);
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
});

watch(() => props.isSelecting, (newValue) => {
  if (newValue) {
    updateCanvasPosition();
  }
});

watch([() => props.scale, () => props.panX, () => props.panY, () => props.scrollLeft, () => props.scrollTop], () => {
  updateCanvasPosition();
});

watch(() => props.selectionRect, () => {
  updateCanvasPosition();
}, { deep: true });
</script>

<style scoped>
.selection-container {
  position: absolute;
  pointer-events: none;
  z-index: 1000;
  overflow: visible;
}

.selection-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%);
  border-radius: 4px;
}

.selection-border {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(59, 130, 246, 0.9);
  border-radius: 4px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3), 0 0 12px rgba(59, 130, 246, 0.2);
  animation: selectionPulse 2s ease-in-out infinite;
}

@keyframes selectionPulse {
  0%, 100% {
    border-color: rgba(59, 130, 246, 0.8);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2), 0 0 10px rgba(59, 130, 246, 0.15);
  }
  50% {
    border-color: rgba(59, 130, 246, 1);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), 0 0 18px rgba(59, 130, 246, 0.25);
  }
}

.corner {
  position: absolute;
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 3px;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3), 0 0 0 2px white;
  pointer-events: auto;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.corner:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), 0 0 0 2px white;
}

.corner:active {
  transform: scale(0.95);
  box-shadow: 0 1px 4px rgba(59, 130, 246, 0.3), 0 0 0 2px white;
}

.corner.top-left {
  top: -3px;
  left: -3px;
  cursor: nwse-resize;
}

.corner.top-right {
  top: -3px;
  right: -3px;
  cursor: nesw-resize;
}

.corner.bottom-left {
  bottom: -3px;
  left: -3px;
  cursor: nesw-resize;
}

.corner.bottom-right {
  bottom: -3px;
  right: -3px;
  cursor: nwse-resize;
}

.handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 3px;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3), 0 0 0 2px white;
  pointer-events: auto;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.handle:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), 0 0 0 2px white;
}

.handle:active {
  transform: scale(0.95);
  box-shadow: 0 1px 4px rgba(59, 130, 246, 0.3), 0 0 0 2px white;
}

.handle.top-middle {
  top: -3px;
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.handle.top-middle:hover {
  transform: translateX(-50%) scale(1.2);
}

.handle.top-middle:active {
  transform: translateX(-50%) scale(0.95);
}

.handle.bottom-middle {
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.handle.bottom-middle:hover {
  transform: translateX(-50%) scale(1.2);
}

.handle.bottom-middle:active {
  transform: translateX(-50%) scale(0.95);
}

.handle.left-middle {
  left: -3px;
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.handle.left-middle:hover {
  transform: translateY(-50%) scale(1.2);
}

.handle.left-middle:active {
  transform: translateY(-50%) scale(0.95);
}

.handle.right-middle {
  right: -3px;
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.handle.right-middle:hover {
  transform: translateY(-50%) scale(1.2);
}

.handle.right-middle:active {
  transform: translateY(-50%) scale(0.95);
}

.rotation-container {
  position: absolute;
  width: auto;
  height: auto;
  pointer-events: none;
  z-index: 10;
}

.rotation-line {
  position: absolute;
  left: 50%;
  top: 26px;
  width: 2px;
  height: 12px;
  background: linear-gradient(to bottom, rgba(59, 130, 246, 0.9) 0%, rgba(59, 130, 246, 0.4) 100%);
  transform: translateX(-50%);
  border-radius: 1px;
  pointer-events: none;
}

.rotation-handle {
  position: absolute;
  top: 0;
  left: 50%;
  min-width: 52px;
  height: 26px;
  padding: 0 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
  border-radius: 16px;
  box-shadow: 
    0 4px 16px rgba(59, 130, 246, 0.4),
    0 0 0 2px rgba(255, 255, 255, 0.9),
    0 0 0 3px rgba(59, 130, 246, 0.25),
    inset 0 1px 3px rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: white;
  cursor: grab;
  pointer-events: auto;
  transform: translateX(-50%);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.rotation-icon {
  font-size: 16px;
  line-height: 1;
  opacity: 0.9;
}

.rotation-degree {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.rotation-handle:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
  transform: translateX(-50%) scale(1.08);
  box-shadow: 
    0 6px 20px rgba(59, 130, 246, 0.5),
    0 0 0 2px rgba(255, 255, 255, 0.9),
    0 0 0 3px rgba(59, 130, 246, 0.35),
    inset 0 1px 3px rgba(255, 255, 255, 0.4);
}

.rotation-handle:active {
  cursor: grabbing;
  transform: translateX(-50%) scale(0.96);
  box-shadow: 
    0 2px 10px rgba(59, 130, 246, 0.45),
    0 0 0 2px rgba(255, 255, 255, 0.9),
    0 0 0 3px rgba(59, 130, 246, 0.25),
    inset 0 1px 3px rgba(255, 255, 255, 0.25);
}
</style>
