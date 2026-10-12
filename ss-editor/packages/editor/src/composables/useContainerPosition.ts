// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';
import type { IGraphic } from '@scada-editor/core';

export interface ItemStyle {
  position: 'absolute';
  left: string;
  top: string;
  width: string;
  height: string;
  transform: string;
  display: string;
  zIndex: number;
  overflow?: string;
}

/**
 * useContainerPosition 配置项（优化方案 P0-2）
 */
export interface ContainerPositionOptions {
  /**
   * canvas 元素引用：提供时直接用该元素计算偏移，替代全局 querySelector。
   * 修复预览态（canvas class=preview-canvas）查不到 canvas 或错误取到编辑态 canvas 偏移的问题。
   */
  canvasEl?: Ref<HTMLCanvasElement | null>;
}

export function useContainerPosition(positionOptions?: ContainerPositionOptions) {
  const containerRef = ref<HTMLDivElement | null>(null);
  const canvasOffset = ref({ left: 0, top: 0 });

  const updateCanvasOffset = () => {
    // 优先使用显式注入的 canvas 引用；未注入时兼容编辑态旧路径（querySelector 兜底）
    const canvas = positionOptions?.canvasEl?.value
      ?? document.querySelector('canvas.design-canvas');
    const container = containerRef.value;
    if (canvas && container) {
      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      canvasOffset.value = {
        left: canvasRect.left - containerRect.left,
        top: canvasRect.top - containerRect.top,
      };
    }
  };

  onMounted(() => {
    updateCanvasOffset();
    window.addEventListener('resize', updateCanvasOffset);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateCanvasOffset);
  });

  /**
   * 统一计算容器内图元的位置样式（优化方案 P0-1 非均匀缩放）
   * 公式: position = geometry × zoomX/zoomY + pan + canvasOffset
   * zoomY 缺省时退化为均匀缩放（编辑态行为不变）；stretch 模式下 zoomX/zoomY 分别应用
   */
  function calcItemStyle(
    graphic: IGraphic,
    zoom: number,
    panX: number,
    panY: number,
    styleOptions?: { overflowHidden?: boolean; zoomY?: number },
  ): ItemStyle {
    const g = graphic.config?.geometry;
    const zoomY = styleOptions?.zoomY ?? zoom;
    return {
      position: 'absolute',
      left: ((g?.x || 0) * zoom + panX + canvasOffset.value.left) + 'px',
      top: ((g?.y || 0) * zoomY + panY + canvasOffset.value.top) + 'px',
      width: ((g?.width || 100) * zoom) + 'px',
      height: ((g?.height || 100) * zoomY) + 'px',
      transform: `rotate(${g?.rotation || 0}deg)`,
      display: graphic.config?.visible !== false ? 'block' : 'none',
      zIndex: graphic.config?.zIndex || 0,
      ...(styleOptions?.overflowHidden ? { overflow: 'hidden' } : {}),
    };
  }

  return { containerRef, canvasOffset, updateCanvasOffset, calcItemStyle };
}