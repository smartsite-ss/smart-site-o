<template>
  <div 
    ref="rulerRef" 
    class="horizontal-ruler"
    role="slider"
    :aria-label="t('ruler.horizontalRuler')"
    aria-valuemin="0"
    :aria-valuemax="canvasWidth"
    :aria-valuenow="Math.round(axisValue)"
    tabindex="0"
    @keydown="handleKeyDown"
  >
    <div
      ref="rulerTrack"
      class="ruler-track"
      :style="{ transform: `scaleX(${scale})`, width: `${canvasWidth}px` }"
    >
      <div
        v-for="tick in ticks"
        :key="`${tick.position}-${tick.isMajor}${tick.isMicro ? '-micro' : ''}`"
        class="ruler-tick"
        :class="{
          'major': tick.isMajor,
          'micro': tick.isMicro,
          'grid-aligned': tick.isGridAligned
        }"
        :style="{ left: `${tick.position}px` }"
        role="presentation"
      >
        <div
          v-if="tick.isMajor"
          class="ruler-label"
          aria-hidden="true"
        >
          {{ tick.label }}
        </div>
      </div>
    </div>
    <div 
      v-if="showMouseIndicator" 
      class="mouse-indicator" 
      :style="{ left: `${axisValue}px` }"
      role="status"
      aria-live="polite"
      :aria-label="t('ruler.mouseCoord', { axis: 'X', value: Math.round(axisValue) })"
    />
    <!-- 拖拽辅助线时的预览线 -->
    <div 
      v-if="isDraggingNewGuide" 
      class="guide-line-preview horizontal" 
      :style="guideLinePreviewStyle"
      role="progressbar"
      :aria-label="t('ruler.createVGuide', { value: Math.round(dragPosition) })"
    />
    
    <!-- 视口范围指示器 -->
    <div 
      v-if="containerWidth > 0 && canvasWidth > 0"
      class="viewport-indicator"
      :style="viewportIndicatorStyle"
      :title="t('ruler.viewportRange', { start: Math.round(scrollLeft), end: Math.round(scrollLeft + containerWidth / scale) })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';
import { useI18n } from 'vue-i18n';
import { calculateTicks, RulerOrientation } from './RulerUtils';
import { useRuler } from './useRuler';

const { t } = useI18n();

const props = withDefaults(defineProps<{
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  scrollLeft: number;
  scrollTop: number;
  mousePosition: { x: number; y: number } | null;
  containerWidth?: number;
  canvasOriginOffset?: number;  // 画布原点距标尺左边缘的CSS像素偏移
  unit?: string;           // P3: 单位类型 (px/cm/inch/mm/m)
  gridSize?: number;       // P3: 网格大小（网格联动高亮）
}>(), {
  containerWidth: 0,
  canvasOriginOffset: 0,
});

const emit = defineEmits<{
  updateMousePosition: [position: { x: number; y: number } | null];
  createGuideLine: [position: number, direction: 'horizontal' | 'vertical'];
  deleteLastGuideLine: [];
}>();

// 解构 props 以保持响应式
const { scale, scrollLeft, canvasWidth, containerWidth } = toRefs(props);

// 使用 Composable 提取共享逻辑
const {
  rulerRef,
  rulerTrack,
  axisValue,
  showMouseIndicator,
  isDraggingNewGuide,
  dragPosition,
  guideLinePreviewStyle,
} = useRuler({
  orientation: RulerOrientation.HORIZONTAL,
  canvasSize: props.canvasWidth,
  scrollOffset: props.scrollLeft,
  scale: props.scale,
  mousePosition: props.mousePosition,
  onCreateGuideLine: (pos) => emit('createGuideLine', pos, 'vertical'),
  onUpdateMousePosition: (pos) => emit('updateMousePosition', pos),
  onDeleteLastGuideLine: () => emit('deleteLastGuideLine'),
});

// ===== A11y: 键盘导航（水平方向特有） =====
const handleKeyDown = (event: KeyboardEvent) => {
  const step = event.shiftKey ? 10 : 1;

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      axisValue.value = Math.max(0, axisValue.value - step);
      emit('updateMousePosition', { x: axisValue.value, y: 0 });
      break;

    case 'ArrowRight':
      event.preventDefault();
      axisValue.value = Math.min(props.canvasWidth, axisValue.value + step);
      emit('updateMousePosition', { x: axisValue.value, y: 0 });
      break;

    case 'Enter':
      event.preventDefault();
      if (axisValue.value >= 0 && axisValue.value <= props.canvasWidth) {
        emit('createGuideLine', axisValue.value, 'vertical');
      }
      break;

    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      emit('deleteLastGuideLine');
      break;

    case 'Home':
      event.preventDefault();
      axisValue.value = 0;
      emit('updateMousePosition', { x: 0, y: 0 });
      break;

    case 'End':
      event.preventDefault();
      axisValue.value = props.canvasWidth;
      emit('updateMousePosition', { x: props.canvasWidth, y: 0 });
      break;
  }
};

// ===== 刻度计算（水平方向特有） =====
const ticks = computed(() => {
  const safeScale = props.scale > 0 ? props.scale : 1;
  const originOffset = props.canvasOriginOffset ?? 0;
  return calculateTicks({
    start: 0,
    end: Math.max(props.canvasWidth, (props.containerWidth || props.canvasWidth) / safeScale) + originOffset / safeScale + 100,
    scale: props.scale,
    orientation: RulerOrientation.HORIZONTAL,
    scrollOffset: props.scrollLeft,
    originOffset: originOffset / safeScale,
    unit: (props.unit as any) || undefined,
    gridSize: props.gridSize,
  });
});

// ===== 视口范围指示器样式（水平标尺特有） =====
const viewportIndicatorStyle = computed(() => {
  if (!props.containerWidth || !props.canvasWidth || props.scale === 0) {
    return { display: 'none' };
  }

  const leftPercent = (props.scrollLeft / props.canvasWidth) * 100;
  const widthPercent = (props.containerWidth / props.scale / props.canvasWidth) * 100;

  return {
    left: `${leftPercent}%`,
    width: `${Math.min(widthPercent, 100)}%`,
  };
});
</script>

<style scoped>
.horizontal-ruler {
  position: relative;
  height: 30px;
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
  cursor: crosshair;
  width: 100%;
  outline: none;
}

.horizontal-ruler:focus-visible {
  box-shadow: inset 0 0 0 2px var(--primary);
}

.ruler-track {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  display: flex;
  align-items: flex-end;
  transform-origin: left top;
}

.ruler-tick {
  position: absolute;
  height: 6px;
  width: 1px;
  background-color: var(--text-secondary);
  bottom: 0;
}

.ruler-tick.major {
  height: 12px;
  width: 2px;
  background-color: var(--text);
}

/* P2: 微刻度 - 高倍缩放时显示 */
.ruler-tick.micro {
  height: 3px;
  width: 1px;
  opacity: 0.4;
  background-color: var(--text-tertiary, #999);
}

/* P3: 网格联动高亮 - 主刻度与网格线对齐时高亮 */
.ruler-tick.grid-aligned {
  background-color: var(--primary, #1890ff) !important;
  box-shadow: 0 0 4px rgba(24, 144, 255, 0.5);
}

[data-theme="high-contrast"] .ruler-tick.grid-aligned {
  background-color: #00ff00 !important;
  box-shadow: 0 0 6px #00ff00;
}

.ruler-label {
  position: absolute;
  bottom: 14px;
  left: 2px;
  font-size: 10px;
  color: var(--text-secondary);
  transform: translateX(-50%);
}

.mouse-indicator {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background-color: var(--primary);
  z-index: 10;
}

.guide-line-preview {
  position: absolute;
  background-color: var(--primary);
  opacity: 0.9;
  z-index: 20;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.guide-line-preview.horizontal {
  height: 100%;
  width: 3px;
  top: 0;
  box-shadow: 0 0 6px var(--primary);
  animation: guide-pulse-horizontal 1s ease-in-out infinite;
}

@keyframes guide-pulse-horizontal {
  0%, 100% { 
    opacity: 0.9; 
    transform: scaleX(1); 
  }
  50% { 
    opacity: 1; 
    transform: scaleX(1.5); 
  }
}

/* 视口范围指示器 */
.viewport-indicator {
  position: absolute;
  bottom: 0;
  height: 6px;
  background: linear-gradient(to top, 
    transparent 0%, 
    rgba(24, 144, 255, 0.3) 20%, 
    rgba(24, 144, 255, 0.6) 80%, 
    rgba(24, 144, 255, 0.3) 100%
  );
  border-left: 2px solid var(--primary);
  border-right: 2px solid var(--primary);
  pointer-events: none;
  z-index: 5;
  transition: all 0.2s ease;
}

/* ===== 高对比度模式增强 ===== */
[data-theme="high-contrast"] .horizontal-ruler {
  border-width: 2px;
}

[data-theme="high-contrast"] .ruler-tick.major {
  width: 16px;
  height: 3px;
  background-color: #ffff00;
}

[data-theme="high-contrast"] .ruler-tick:not(.major) {
  background-color: #ffffff;
  width: 8px;
}

[data-theme="high-contrast"] .ruler-label {
  font-size: 12px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

[data-theme="high-contrast"] .mouse-indicator {
  width: 3px;
  background-color: #00ff00;
  box-shadow: 0 0 4px #00ff00;
}

[data-theme="high-contrast"] .guide-line-preview.horizontal {
  width: 3px;
  background-color: #00ffff;
  opacity: 1;
}

[data-theme="high-contrast"] .viewport-indicator {
  height: 8px;
  background: linear-gradient(to top, 
    transparent 0%, 
    rgba(0, 255, 0, 0.4) 20%, 
    rgba(0, 255, 0, 0.8) 80%, 
    rgba(0, 255, 0, 0.4) 100%
  );
  border-left: 3px solid #00ff00;
  border-right: 3px solid #00ff00;
}
</style>
