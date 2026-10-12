<template>
  <div 
    ref="rulerRef" 
    class="vertical-ruler"
    role="slider"
    :aria-label="t('ruler.verticalRuler')"
    aria-valuemin="0"
    :aria-valuemax="canvasHeight"
    :aria-valuenow="Math.round(axisValue)"
    tabindex="0"
    @keydown="handleKeyDown"
  >
    <div
      ref="rulerTrack"
      class="ruler-track"
      :style="{ transform: `scaleY(${scale})`, height: `${canvasHeight}px` }"
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
        :style="{ top: `${tick.position}px` }"
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
      :style="{ top: `${axisValue}px` }"
      role="status"
      aria-live="polite"
      :aria-label="t('ruler.mouseCoord', { axis: 'Y', value: Math.round(axisValue) })"
    />
    <!-- 拖拽辅助线时的预览线 -->
    <div 
      v-if="isDraggingNewGuide" 
      class="guide-line-preview vertical" 
      :style="guideLinePreviewStyle"
      role="progressbar"
      :aria-label="t('ruler.createHGuide', { value: Math.round(dragPosition) })"
    />
    
    <!-- 视口范围指示器（垂直方向） -->
    <div 
      v-if="(containerHeight ?? 0) > 0 && canvasHeight > 0"
      class="viewport-indicator-vertical"
      :style="viewportIndicatorStyle"
      :title="t('ruler.viewportRange', { start: Math.round(scrollTop), end: Math.round(scrollTop + (containerHeight ?? 0) / scale) })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { calculateTicks, RulerOrientation } from './RulerUtils';
import { useRuler } from './useRuler';

const { t } = useI18n();

const props = defineProps<{
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  scrollLeft: number;
  scrollTop: number;
  mousePosition: { x: number; y: number } | null;
  containerHeight?: number;
  canvasOriginOffset?: number;  // 画布原点距标尺上边缘的CSS像素偏移
  unit?: string;           // P3: 单位类型 (px/cm/inch/mm/m)
  gridSize?: number;       // P3: 网格大小（网格联动高亮）
}>();

const emit = defineEmits<{
  updateMousePosition: [position: { x: number; y: number } | null];
  createGuideLine: [position: number, direction: 'horizontal' | 'vertical'];
  deleteLastGuideLine: [];
}>();

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
  orientation: RulerOrientation.VERTICAL,
  canvasSize: props.canvasHeight,
  scrollOffset: props.scrollTop,
  scale: props.scale,
  mousePosition: props.mousePosition,
  onCreateGuideLine: (pos) => emit('createGuideLine', pos, 'horizontal'),
  onUpdateMousePosition: (pos) => emit('updateMousePosition', pos),
  onDeleteLastGuideLine: () => emit('deleteLastGuideLine'),
});

// ===== A11y: 键盘导航（垂直方向特有） =====
const handleKeyDown = (event: KeyboardEvent) => {
  const step = event.shiftKey ? 10 : 1;

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      axisValue.value = Math.max(0, axisValue.value - step);
      emit('updateMousePosition', { x: 0, y: axisValue.value });
      break;

    case 'ArrowDown':
      event.preventDefault();
      axisValue.value = Math.min(props.canvasHeight, axisValue.value + step);
      emit('updateMousePosition', { x: 0, y: axisValue.value });
      break;

    case 'Enter':
      event.preventDefault();
      if (axisValue.value >= 0 && axisValue.value <= props.canvasHeight) {
        emit('createGuideLine', axisValue.value, 'horizontal');
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
      axisValue.value = props.canvasHeight;
      emit('updateMousePosition', { x: 0, y: props.canvasHeight });
      break;
  }
};

// ===== 刻度计算（垂直方向特有） =====
const ticks = computed(() => {
  const safeScale = props.scale > 0 ? props.scale : 1;
  const originOffset = props.canvasOriginOffset ?? 0;
  return calculateTicks({
    start: 0,
    end: Math.max(props.canvasHeight, (props.containerHeight || props.canvasHeight) / safeScale) + originOffset / safeScale + 100,
    scale: props.scale,
    orientation: RulerOrientation.VERTICAL,
    scrollOffset: props.scrollTop,
    originOffset: originOffset / safeScale,
    unit: (props.unit as any) || undefined,
    gridSize: props.gridSize,
  });
});

// ===== 视口范围指示器样式（垂直标尺特有） =====
const viewportIndicatorStyle = computed(() => {
  if (!props.containerHeight || !props.canvasHeight || props.scale === 0) {
    return { display: 'none' };
  }

  const topPercent = (props.scrollTop / props.canvasHeight) * 100;
  const heightPercent = (props.containerHeight / props.scale / props.canvasHeight) * 100;

  return {
    top: `${topPercent}%`,
    height: `${Math.min(heightPercent, 100)}%`,
  };
});
</script>

<style scoped>
.vertical-ruler {
  position: relative;
  width: 30px;
  background-color: var(--surface);
  border-right: 1px solid var(--border);
  overflow: hidden;
  cursor: crosshair;
  height: 100%;
  outline: none;
}

.vertical-ruler:focus-visible {
  box-shadow: inset 0 0 0 2px var(--primary);
}

.ruler-track {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  transform-origin: left top;
}

.ruler-tick {
  position: absolute;
  width: 6px;
  height: 1px;
  background-color: var(--text-secondary);
  right: 0;
}

.ruler-tick.major {
  width: 12px;
  height: 2px;
  background-color: var(--text);
}

/* P2: 微刻度 - 高倍缩放时显示 */
.ruler-tick.micro {
  width: 3px;
  height: 1px;
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
  right: 14px;
  top: 50%;
  font-size: 10px;
  color: var(--text-secondary);
  transform: translate(0, -50%) rotate(-90deg);
  transform-origin: right center;
  white-space: nowrap;
}

.mouse-indicator {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
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

.guide-line-preview.vertical {
  width: 100%;
  height: 3px;
  left: 0;
  box-shadow: 0 0 6px var(--primary);
  animation: guide-pulse 1s ease-in-out infinite;
}

@keyframes guide-pulse {
  0%, 100% { 
    opacity: 0.9; 
    transform: scaleY(1); 
  }
  50% { 
    opacity: 1; 
    transform: scaleY(1.5); 
  }
}

/* ===== 高对比度模式增强 ===== */
[data-theme="high-contrast"] .vertical-ruler {
  border-width: 2px;
}

[data-theme="high-contrast"] .ruler-tick.major {
  height: 16px;
  width: 3px;
  background-color: #ffff00;
}

[data-theme="high-contrast"] .ruler-tick:not(.major) {
  background-color: #ffffff;
  height: 8px;
}

[data-theme="high-contrast"] .ruler-label {
  font-size: 12px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

[data-theme="high-contrast"] .mouse-indicator {
  height: 3px;
  background-color: #00ff00;
  box-shadow: 0 0 4px #00ff00;
}

[data-theme="high-contrast"] .guide-line-preview.vertical {
  height: 3px;
  background-color: #00ffff;
  opacity: 1;
}

/* 视口范围指示器（垂直方向） */
.viewport-indicator-vertical {
  position: absolute;
  left: 0;
  width: 6px;
  background: linear-gradient(to right,
    transparent 0%,
    rgba(24, 144, 255, 0.3) 20%,
    rgba(24, 144, 255, 0.6) 80%,
    rgba(24, 144, 255, 0.3) 100%
  );
  border-top: 2px solid var(--primary);
  border-bottom: 2px solid var(--primary);
  pointer-events: none;
  z-index: 5;
  transition: all 0.2s ease;
}

[data-theme="high-contrast"] .viewport-indicator-vertical {
  width: 8px;
  background: linear-gradient(to right,
    transparent 0%,
    rgba(0, 255, 0, 0.4) 20%,
    rgba(0, 255, 0, 0.8) 80%,
    rgba(0, 255, 0, 0.4) 100%
  );
  border-top: 3px solid #00ff00;
  border-bottom: 3px solid #00ff00;
}
</style>
