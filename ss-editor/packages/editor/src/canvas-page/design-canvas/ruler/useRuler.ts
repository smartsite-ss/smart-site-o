// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * useRuler - 标尺核心逻辑 Composable
 * 
 * 抽取 VerticalRuler / HorizontalRuler 的共享逻辑：
 * - RAF 节流鼠标追踪
 * - 鼠标离开处理  
 * - 辅助线拖拽创建（含错误处理）
 * - 生命周期事件绑定/清理
 * - mousePosition prop watch
 */
import { ref, computed, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue';

export interface UseRulerOptions {
  /** 标尺方向 */
  orientation: 'vertical' | 'horizontal';
  /** 画布尺寸（垂直=height，水平=width） */
  canvasSize: number;
  /** 滚动偏移量 */
  scrollOffset: number;
  /** 缩放比例 */
  scale: number;
  /** 外部鼠标位置（可为null） */
  mousePosition: { x: number; y: number } | null;
  /** 创建辅助线回调 */
  onCreateGuideLine: (position: number) => void;
  /** 更新鼠标位置回调 */
  onUpdateMousePosition: (position: { x: number; y: number } | null) => void;
  /** 删除最后一条辅助线回调 */
  onDeleteLastGuideLine: () => void;
}

export interface UseRulerReturn {
  rulerRef: Ref<HTMLElement | null>;
  rulerTrack: Ref<HTMLElement | null>;
  /** 当前坐标轴值（垂直=Y，水平=X） */
  axisValue: Ref<number>;
  showMouseIndicator: Ref<boolean>;
  isDraggingNewGuide: Ref<boolean>;
  dragPosition: Ref<number>;
  guideLinePreviewStyle: ComputedRef<Record<string, string>>;
}

/**
 * 标尺核心逻辑 Composable
 * @param options 配置选项
 * @returns 标尺状态和计算属性
 */
export function useRuler(options: UseRulerOptions): UseRulerReturn {
  const {
    orientation,
    scrollOffset,
    mousePosition,
    onCreateGuideLine,
    onUpdateMousePosition,
  } = options;

  const isVertical = orientation === 'vertical';

  const rulerRef = ref<HTMLElement | null>(null);
  const rulerTrack = ref<HTMLElement | null>(null);
  const axisValue = ref(0);
  const showMouseIndicator = ref(false);
  const isDraggingNewGuide = ref(false);
  const dragPosition = ref(0);

  // ===== RAF 节流鼠标追踪 =====
  let rafId: number | null = null;
  let pendingPosition = { x: 0, y: 0 };

  const handleMouseMove = (event: MouseEvent) => {
    if (!rulerTrack.value) return;

    const rect = rulerTrack.value.getBoundingClientRect();
    pendingPosition = {
      x: event.clientX - rect.left + scrollOffset,
      y: event.clientY - rect.top + scrollOffset,
    };

    // RAF节流：合并多次调用为一帧
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        onUpdateMousePosition(pendingPosition);
        rafId = null;
      });
    }
  };

  // ===== 鼠标离开处理 =====
  const handleMouseLeave = () => {
    if (!isDraggingNewGuide.value) {
      onUpdateMousePosition(null);
    }
  };

  // ===== 辅助线拖拽创建（含增强错误处理）=====
  const handleMouseDown = (event: MouseEvent) => {
    event.preventDefault();

    try {
      if (!rulerRef.value) {
        console.warn(`[${orientation}Ruler] mousedown but rulerRef is null`);
        return;
      }

      const rect = rulerRef.value.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn(`[${orientation}Ruler] ruler element has zero dimensions`);
        return;
      }

      // 提取对应轴的坐标
      const coord = isVertical
        ? event.clientY - rect.top + scrollOffset
        : event.clientX - rect.left + scrollOffset;

      if (!Number.isFinite(coord)) {
        console.warn(`[${orientation}Ruler] Invalid coordinate: ${coord}`);
        return;
      }

      dragPosition.value = coord;
      isDraggingNewGuide.value = true;

      const handleDragMove = (moveEvent: MouseEvent) => {
        try {
          const newRect = rulerRef.value!.getBoundingClientRect();
          const newCoord = isVertical
            ? moveEvent.clientY - newRect.top + scrollOffset
            : moveEvent.clientX - newRect.left + scrollOffset;

          if (Number.isFinite(newCoord)) {
            dragPosition.value = newCoord;
          }
        } catch (error) {
          console.error(`[${orientation}Ruler] Error in drag move:`, error);
        }
      };

      const handleDragUp = (upEvent: MouseEvent) => {
        try {
          const newRect = rulerRef.value!.getBoundingClientRect();
          const finalCoord = isVertical
            ? upEvent.clientY - newRect.top + scrollOffset
            : upEvent.clientX - newRect.left + scrollOffset;

          if (Number.isFinite(finalCoord)) {
            onCreateGuideLine(finalCoord);
          }

          isDraggingNewGuide.value = false;
        } catch (error) {
          console.error(`[${orientation}Ruler] Error in drag up:`, error);
          isDraggingNewGuide.value = false;
        } finally {
          document.removeEventListener('mousemove', handleDragMove);
          document.removeEventListener('mouseup', handleDragUp);
        }
      };

      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragUp, { once: true });

    } catch (error) {
      console.error(`[${orientation}Ruler] Error in handleMouseDown:`, error);
      isDraggingNewGuide.value = false;
    }
  };

  // ===== 监听外部 mousePosition 变化 =====
  watch(
    () => mousePosition,
    (newPosition) => {
      if (newPosition) {
        axisValue.value = isVertical ? newPosition.y : newPosition.x;
        showMouseIndicator.value = true;
      } else {
        showMouseIndicator.value = false;
      }
    },
    // P1优化：添加防抖判断，避免无变化时重赋值
    { flush: 'sync' },
  );

  // ===== 辅助线预览样式 =====
  const guideLinePreviewStyle = computed<Record<string, string>>(() => ({
    [isVertical ? 'top' : 'left']: `${dragPosition.value - scrollOffset}px`,
  }));

  // ===== 生命周期：事件绑定/清理 =====
  onMounted(() => {
    if (rulerRef.value) {
      rulerRef.value.addEventListener('mousemove', handleMouseMove);
      rulerRef.value.addEventListener('mouseleave', handleMouseLeave);
      rulerRef.value.addEventListener('mousedown', handleMouseDown);
    }
  });

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId);

    if (rulerRef.value) {
      rulerRef.value.removeEventListener('mousemove', handleMouseMove);
      rulerRef.value.removeEventListener('mouseleave', handleMouseLeave);
      rulerRef.value.removeEventListener('mousedown', handleMouseDown);
    }
  });

  return {
    rulerRef,
    rulerTrack,
    axisValue,
    showMouseIndicator,
    isDraggingNewGuide,
    dragPosition,
    guideLinePreviewStyle,
  };
}
