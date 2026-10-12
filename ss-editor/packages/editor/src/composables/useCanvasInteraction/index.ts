// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com


import { usePageStore, useGraphicStore, displayToLogical, SelectionMode, TransformGraphicChange } from '@scada-editor/core';
import type { CanvasInteractionOptions, DrawCanvasCallback } from './types';

import { useMouseEvents } from './useMouseEvents';
import { useSelectionBox } from './useSelectionBox';
import { useTransform } from './useTransform';
import { useAlignment } from './useAlignment';
import { useDragDrop } from './useDragDrop';

// 性能优化阈值
const MOVE_THRESHOLD = 3; // 移动超过3像素才重绘
const RESIZE_THRESHOLD = 3; // 缩放超过3像素才重绘

export function useCanvasInteraction(options: CanvasInteractionOptions & { setManipulationState?: (state: { moving?: boolean, resizing?: boolean, rotating?: boolean }) => void }) {
  const { panX, panY, cursorStyle, setManipulationState, formatPainterManager } = options;
  
  // 使用子 composables
  const mouseEvents = useMouseEvents(options);
  const selectionBox = useSelectionBox(options);
  const transform = useTransform(options);
  const alignment = useAlignment();
  const dragDrop = useDragDrop(options);

  const pageStore = usePageStore();
  const graphicStore = useGraphicStore();

  // 记录脏区域
  const dirtyRects: { x: number; y: number; width: number; height: number }[] = [];
  
  // 记录上一次渲染的位置，用于阈值判断
  const lastRenderState = {
    moveClientX: 0,
    moveClientY: 0,
    resizeClientX: 0,
    resizeClientY: 0,
    lastMoved: false, // 标记是否有未渲染的移动
    lastResized: false, // 标记是否有未渲染的缩放
  };

  // 控制点拖拽状态
  const cpDragState = {
    active: false,
    graphicId: null as string | null,
    controlPointIndex: -1,
    startPointX: 0,
    startPointY: 0,
    startClientX: 0,
    startClientY: 0,
    startGeometry: null as { x: number; y: number; width: number; height: number; rotation: number } | null,
  };

  // 标记 mousedown 已通过 Ctrl/Shift 处理了选择，click 事件无需再处理
  let skipClickSelection = false;

  // 计算图元的包围盒（包括边距）
  const getGraphicBounds = (graphic: any) => {
    const { x, y } = graphic.getPosition();
    const { width, height } = graphic.getSize();
    const padding = 20; // 额外的边距，确保手柄也能覆盖
    return {
      x: x - padding,
      y: y - padding,
      width: width + padding * 2,
      height: height + padding * 2,
    };
  };

 
  // 记录选中图元的初始脏区域
  const recordInitialDirtyRects = () => {
    dirtyRects.length = 0;
    for (const graphic of graphicStore.selectedGraphics) {
      dirtyRects.push(getGraphicBounds(graphic));
    }
  };

  // 全局事件监听管理
  let globalMouseUpHandler: ((event: MouseEvent) => void) | null = null;

  const setupGlobalMouseUpListener = (handler: (event: MouseEvent) => void) => {
    if (globalMouseUpHandler) {
      document.removeEventListener('mouseup', globalMouseUpHandler);
    }
    globalMouseUpHandler = handler;
    document.addEventListener('mouseup', globalMouseUpHandler);
  };

  const cleanupGlobalMouseUpListener = () => {
    if (globalMouseUpHandler) {
      document.removeEventListener('mouseup', globalMouseUpHandler);
      globalMouseUpHandler = null;
    }
  };

  // 处理画布点击
  const handleCanvasClick = (event: MouseEvent, drawCanvas: DrawCanvasCallback) => {
    if (selectionBox.isSelecting.value) return;

    const canvas = document.querySelector('canvas.design-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;
    const viewState = { scale: mouseEvents.getScale(), offset: { x: panX.value, y: panY.value } };
    const logicalPos = displayToLogical({ x: displayX, y: displayY }, viewState);
    const x = logicalPos.x;
    const y = logicalPos.y;

    const graphics = graphicStore.sortedGraphics || [];

    let clickedGraphic = null;
    for (let i = graphics.length - 1; i >= 0; i--) {
      const graphic = graphics[i];
      if (!graphic || typeof graphic.containsPoint !== 'function') continue;
      if (graphic.containsPoint(x, y)) {
        clickedGraphic = graphic;
        break;
      }
    }

    if (!clickedGraphic) {
      formatPainterManager?.deactivate();
    }

    if (clickedGraphic) {
      // 格式画笔拦截
      if (formatPainterManager?.isActive()) {
        formatPainterManager.applyFormat(clickedGraphic);
        drawCanvas();
        return;
      }

      // 如果 mousedown 已通过 Ctrl/Shift 处理了多选，click 不再重复处理
      if (skipClickSelection) {
        skipClickSelection = false;
        return;
      }

      const sm = selectionBox.getSelectionManager();
      if (!sm) return;

      if (event.ctrlKey && event.shiftKey) {
        sm.setMode(SelectionMode.SUBTRACTIVE);
      } else if (event.shiftKey || event.ctrlKey) {
        sm.setMode(SelectionMode.ADDITIVE);
      } else {
        sm.setMode(SelectionMode.SINGLE);
      }

      // 检查图元是否在分组中，如果是，则选中整个组
      let idsToSelect = [clickedGraphic.id];
      const currentPage = pageStore.currentPage;
      if (currentPage && typeof currentPage.getGroupManager === 'function') {
        const groupManager = currentPage.getGroupManager();
        if (groupManager) {
          const group = groupManager.getGroupForGraphic(clickedGraphic.id);
          if (group) {
            idsToSelect = group.children;
          }
        }
      }

      const oldSelectedIds = [...pageStore.selectedGraphicIds];
      
      // 如果选中的是分组，则选中所有成员
      if (idsToSelect.length > 1) {
        sm.setMode(SelectionMode.BOX);
        sm.selectMultiple(idsToSelect);
        sm.setMode(SelectionMode.SINGLE);
      } else {
        sm.select(clickedGraphic.id);
      }
      
      // 同步选择状态
      selectionBox.syncSelectionState(idsToSelect, oldSelectedIds);
      drawCanvas();
      return;
    }

    if (selectionBox.selectionMode.value === SelectionMode.SINGLE) {
      const sm = selectionBox.getSelectionManager();
      if (!sm) return;

      const oldSelectedIds = [...pageStore.selectedGraphicIds];
      sm.clear();
      selectionBox.syncSelectionState([], oldSelectedIds);
      drawCanvas();
    }
  };

  // 处理鼠标按下
  const handleCanvasMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return;

    const canvas = document.querySelector('canvas.design-canvas');
    if (!canvas) return;
    if (event.target !== canvas) return;

    const rect = canvas.getBoundingClientRect();

    selectionBox.startX.value = event.clientX;
    selectionBox.startY.value = event.clientY;

    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;
    const viewState = { scale: mouseEvents.getScale(), offset: { x: panX.value, y: panY.value } };
    const logicalPos = displayToLogical({ x: displayX, y: displayY }, viewState);
    const x = logicalPos.x;
    const y = logicalPos.y;

    const handleClick = mouseEvents.checkHandleClick(x, y);
    if (handleClick) {
      if (handleClick.type === 'resize') {
        transform.isResizing.value = true;
        transform.resizeStartX.value = event.clientX;
        transform.resizeStartY.value = event.clientY;
        transform.resizeHandle.value = handleClick.handle;

        transform.startGraphicSizes.value = {};
        for (const graphic of graphicStore.selectedGraphics) {
          const { x: gx, y: gy } = graphic.getPosition();
          const { width, height } = graphic.getSize();
          transform.startGraphicSizes.value[graphic.id] = { width, height, x: gx, y: gy };
        }
        recordInitialDirtyRects();
        
        // 初始化缩放阈值状态
        lastRenderState.resizeClientX = event.clientX;
        lastRenderState.resizeClientY = event.clientY;
        lastRenderState.lastResized = false;
        
        // 开始批量历史记录
        pageStore.currentPage?.startBatch?.('缩放图元');

        // 设置操作状态
        setManipulationState?.({ resizing: true });
        return;
      }
    }

    let clickedOnGraphic = false;
    let clickedOnSelectedGraphic = false;
    let clickedGraphicRef: any = null;

    const graphics = graphicStore.sortedGraphics || [];
    if (pageStore.selectedGraphicIds?.length > 0) {
      for (let i = graphics.length - 1; i >= 0; i--) {
        const graphic = graphics[i];
        if (!graphic || typeof graphic.containsPoint !== 'function') continue;
        if (pageStore.selectedGraphicIds.includes(graphic.id) && graphic.containsPoint(x, y)) {
          clickedOnGraphic = true;
          clickedOnSelectedGraphic = true;
          clickedGraphicRef = graphic;
          break;
        }
      }
    }

    if (!clickedOnGraphic) {
      for (let i = graphics.length - 1; i >= 0; i--) {
        const graphic = graphics[i];
        if (!graphic || typeof graphic.containsPoint !== 'function') continue;
        if (graphic.containsPoint(x, y)) {
          clickedOnGraphic = true;
          clickedGraphicRef = graphic;
          break;
        }
      }
    }

    if (!clickedOnGraphic) {
      const sm = selectionBox.getSelectionManager();
      if (!sm) return;

      selectionBox.isSelecting.value = true;
      selectionBox.selectionRect.value = {
        left: displayX,
        top: displayY,
        width: 0,
        height: 0,
      };

      const boxMode = event.shiftKey || event.ctrlKey
        ? (event.ctrlKey && event.shiftKey ? SelectionMode.SUBTRACTIVE : SelectionMode.ADDITIVE)
        : SelectionMode.BOX;
      selectionBox.selectionMode.value = boxMode;
      sm.setMode(boxMode);
    } else if (clickedOnSelectedGraphic) {
      let hitControlPoint = false;
      for (let i = graphics.length - 1; i >= 0; i--) {
        const graphic = graphics[i];
        if (
          pageStore.selectedGraphicIds.includes(graphic.id) &&
          typeof (graphic as any).getHitControlPoint === 'function' &&
          graphic.containsPoint(x, y)
        ) {
          const cpIndex = (graphic as any).getHitControlPoint(x, y);
          if (cpIndex >= 0) {
            const points = (graphic as any).pluginProps?.points;
            if (points && cpIndex < points.length) {
              cpDragState.startPointX = points[cpIndex].x;
              cpDragState.startPointY = points[cpIndex].y;
            } else {
              cpDragState.startPointX = x;
              cpDragState.startPointY = y;
            }
            cpDragState.active = true;
            cpDragState.graphicId = graphic.id;
            cpDragState.controlPointIndex = cpIndex;
            cpDragState.startClientX = event.clientX;
            cpDragState.startClientY = event.clientY;
            // 记录拖拽前的 geometry 用于撤销
            {
              const currentPos = graphic.getPosition();
              const currentSize = graphic.getSize();
              cpDragState.startGeometry = {
                x: currentPos.x,
                y: currentPos.y,
                width: currentSize.width,
                height: currentSize.height,
                rotation: graphic.config?.geometry?.rotation ?? 0,
              };
            }
            hitControlPoint = true;
            // 开始批量历史记录
            pageStore.currentPage?.startBatch?.('控制点拖动');
            setManipulationState?.({ moving: true });
            break;
          }
        }
      }

      if (!hitControlPoint) {
        transform.isMoving.value = true;
        transform.moveStartX.value = event.clientX;
        transform.moveStartY.value = event.clientY;
        if (cursorStyle) cursorStyle.value = 'move';

        transform.startGraphicPositions.value = {};
        for (const graphic of graphicStore.selectedGraphics) {
          const { x: gx, y: gy } = graphic.getPosition();
          transform.startGraphicPositions.value[graphic.id] = { x: gx, y: gy };
        }
        recordInitialDirtyRects();
        
        lastRenderState.moveClientX = event.clientX;
        lastRenderState.moveClientY = event.clientY;
        lastRenderState.lastMoved = false;
        
        // 开始批量历史记录
        pageStore.currentPage?.startBatch?.('移动图元');

        setManipulationState?.({ moving: true });
      }
    } else {
      if (clickedGraphicRef) {
        const sm = selectionBox.getSelectionManager();
        if (sm) {
          const oldSelectedIds = [...pageStore.selectedGraphicIds];
          if (event.ctrlKey && event.shiftKey) {
            sm.setMode(SelectionMode.SUBTRACTIVE);
            skipClickSelection = true;
          } else if (event.shiftKey || event.ctrlKey) {
            sm.setMode(SelectionMode.ADDITIVE);
            skipClickSelection = true;
          } else {
            sm.setMode(SelectionMode.SINGLE);
          }
          sm.select(clickedGraphicRef.id);
          selectionBox.syncSelectionState([...pageStore.selectedGraphicIds], oldSelectedIds);
        }
        transform.isMoving.value = true;
        transform.moveStartX.value = event.clientX;
        transform.moveStartY.value = event.clientY;
        if (cursorStyle) cursorStyle.value = 'move';

        transform.startGraphicPositions.value = {};
        for (const graphic of graphicStore.selectedGraphics) {
          const { x: gx, y: gy } = graphic.getPosition();
          transform.startGraphicPositions.value[graphic.id] = { x: gx, y: gy };
        }
        recordInitialDirtyRects();

        lastRenderState.moveClientX = event.clientX;
        lastRenderState.moveClientY = event.clientY;
        lastRenderState.lastMoved = false;

        // 开始批量历史记录
        pageStore.currentPage?.startBatch?.('移动图元');

        setManipulationState?.({ moving: true });
      }
    }
  };

  // 处理鼠标移动
  const handleCanvasMouseMove = (event: MouseEvent, drawCanvas: DrawCanvasCallback) => {
    if (
      !selectionBox.isSelecting.value &&
      !transform.isResizing.value &&
      !transform.isRotating.value &&
      !transform.isMoving.value &&
      !transform.isPanning.value &&
      !cpDragState.active
    ) {
      mouseEvents.checkControlPointHover(event);
    }

    if (selectionBox.isSelecting.value) {
      const canvas = document.querySelector('canvas.design-canvas');
      if (canvas) {
        if (event.target !== canvas) return;

        const rect = canvas.getBoundingClientRect();
        const startXRelative = selectionBox.startX.value - rect.left;
        const startYRelative = selectionBox.startY.value - rect.top;
        const clientXRelative = event.clientX - rect.left;
        const clientYRelative = event.clientY - rect.top;

        selectionBox.selectionRect.value = {
          left: Math.min(startXRelative, clientXRelative),
          top: Math.min(startYRelative, clientYRelative),
          width: Math.abs(clientXRelative - startXRelative),
          height: Math.abs(clientYRelative - startYRelative),
        };
      }
    } else if (transform.isResizing.value) {
      const deltaX = event.clientX - lastRenderState.resizeClientX;
      const deltaY = event.clientY - lastRenderState.resizeClientY;
      
      // 检查是否超过阈值
      const shouldRender = Math.abs(deltaX) >= RESIZE_THRESHOLD || Math.abs(deltaY) >= RESIZE_THRESHOLD;
      
      // 先更新图元位置（即使不渲染也要更新，避免跳变）
      const actualDeltaX = (event.clientX - transform.resizeStartX.value) / mouseEvents.getScale();
      const actualDeltaY = (event.clientY - transform.resizeStartY.value) / mouseEvents.getScale();

      for (const graphic of graphicStore.selectedGraphics) {
        if (graphic.getLocked()) continue;
        
        const startSize = transform.startGraphicSizes.value[graphic.id];
        if (startSize) {
          let newWidth = startSize.width;
          let newHeight = startSize.height;
          let newX = startSize.x;
          let newY = startSize.y;

  
          switch (transform.resizeHandle.value) {
            case 'TOP_LEFT':
              newWidth = Math.max(10, startSize.width - actualDeltaX);
              newHeight = Math.max(10, startSize.height - actualDeltaY);
              newX = startSize.x + (startSize.width - newWidth);
              newY = startSize.y + (startSize.height - newHeight);
              break;
            case 'TOP_RIGHT':
              newWidth = Math.max(10, startSize.width + actualDeltaX);
              newHeight = Math.max(10, startSize.height - actualDeltaY);
              newY = startSize.y + (startSize.height - newHeight);
              break;
            case 'BOTTOM_LEFT':
              newWidth = Math.max(10, startSize.width - actualDeltaX);
              newHeight = Math.max(10, startSize.height + actualDeltaY);
              newX = startSize.x + (startSize.width - newWidth);
              break;
            case 'BOTTOM_RIGHT':
              newWidth = Math.max(10, startSize.width + actualDeltaX);
              newHeight = Math.max(10, startSize.height + actualDeltaY);
              break;
            case 'LEFT':
              newWidth = Math.max(10, startSize.width - actualDeltaX);
              newX = startSize.x + (startSize.width - newWidth);
              break;
            case 'RIGHT':
              newWidth = Math.max(10, startSize.width + actualDeltaX);
              break;
            case 'TOP':
              newHeight = Math.max(10, startSize.height - actualDeltaY);
              newY = startSize.y + (startSize.height - newHeight);
              break;
            case 'BOTTOM':
              newHeight = Math.max(10, startSize.height + actualDeltaY);
              break;
          }

          graphic.setSize(newWidth, newHeight);
          graphic.setPosition(newX, newY);
        }
      }
      
      if (shouldRender) {
        // 使用合帧机制重绘
        drawCanvas();
        
        // 更新最后渲染位置
        lastRenderState.resizeClientX = event.clientX;
        lastRenderState.resizeClientY = event.clientY;
        lastRenderState.lastResized = false;
      } else {
        // 记录有未渲染的变化
        lastRenderState.lastResized = true;
      }
    } else if (cpDragState.active && cpDragState.graphicId) {
      const graphic = graphicStore.getGraphicById(cpDragState.graphicId);
      if (graphic && typeof (graphic as any).moveControlPoint === 'function') {
        const deltaX = (event.clientX - cpDragState.startClientX) / mouseEvents.getScale();
        const deltaY = (event.clientY - cpDragState.startClientY) / mouseEvents.getScale();
        const newX = cpDragState.startPointX + deltaX;
        const newY = cpDragState.startPointY + deltaY;
        (graphic as any).moveControlPoint(cpDragState.controlPointIndex, newX, newY);
      }
      drawCanvas();
    } else if (transform.isMoving.value) {
      const deltaX = event.clientX - lastRenderState.moveClientX;
      const deltaY = event.clientY - lastRenderState.moveClientY;
      
      // 检查是否超过阈值
      const shouldRender = Math.abs(deltaX) >= MOVE_THRESHOLD || Math.abs(deltaY) >= MOVE_THRESHOLD;
      
      // 先更新图元位置（即使不渲染也要更新，避免跳变）
      const actualDeltaX = (event.clientX - transform.moveStartX.value) / mouseEvents.getScale();
      const actualDeltaY = (event.clientY - transform.moveStartY.value) / mouseEvents.getScale();

      // 智能对齐检测：只对首个图元做试探位置检测，排除所有选中图元
      const selectedGraphics = graphicStore.selectedGraphics || [];
      let alignApplied = false;
      const firstGraphic = selectedGraphics[0];
      
      if (firstGraphic && selectedGraphics.length > 0) {
        const page = pageStore.currentPage as any;
        const smartAlignManager = page?.getSmartAlignManager?.();
        if (smartAlignManager) {
          // 只把 firstGraphic 移到试探位置，其他选中图元保持原位
          const firstOrigPos = { x: firstGraphic.getPosition().x, y: firstGraphic.getPosition().y };
          const startFirstPos = transform.startGraphicPositions.value[firstGraphic.id];
          if (startFirstPos) {
            firstGraphic.setPosition(startFirstPos.x + actualDeltaX, startFirstPos.y + actualDeltaY);
          }
          
          // 排除所有选中图元（它们正在移动，不能作为对齐参考）
          const selectedIds = new Set(selectedGraphics.map((g: any) => g.id));
          const otherGraphics = (graphicStore.sortedGraphics || []).filter(
            (g: any) => !selectedIds.has(g.id)
          );
          
          const targets = smartAlignManager.detectAlignTargets(firstGraphic, otherGraphics);
          dragDrop.alignTargets.value = targets;
          
          if (targets.length > 0) {
            smartAlignManager.applyAlignment(firstGraphic, targets[0]);
            const newFirstPos = firstGraphic.getPosition();
            const offsetX = newFirstPos.x - (startFirstPos.x + actualDeltaX);
            const offsetY = newFirstPos.y - (startFirstPos.y + actualDeltaY);
            
            // 将对齐偏移同步到其他选中图元
            for (const g of selectedGraphics) {
              if (g.getLocked() || g.id === firstGraphic.id) continue;
              const sp = transform.startGraphicPositions.value[g.id];
              if (sp) {
                g.setPosition(sp.x + actualDeltaX + offsetX, sp.y + actualDeltaY + offsetY);
              }
            }
            drawCanvas();
            alignApplied = true;
          } else {
            // 无对齐目标 → 还原 firstGraphic 位置
            firstGraphic.setPosition(firstOrigPos.x, firstOrigPos.y);
          }
        } else {
          dragDrop.alignTargets.value = [];
        }
      }

      if (!alignApplied) {
        for (const graphic of selectedGraphics) {
          if (graphic.getLocked()) continue;
          
          const startPos = transform.startGraphicPositions.value[graphic.id];
          if (startPos) {
            const newX = startPos.x + actualDeltaX;
            const newY = startPos.y + actualDeltaY;
            const snappedPos = dragDrop.snapToGridPosition(newX, newY);
            graphic.setPosition(snappedPos.x, snappedPos.y);
          }
        }
      }
      
      if (shouldRender) {
        drawCanvas();
        
        lastRenderState.moveClientX = event.clientX;
        lastRenderState.moveClientY = event.clientY;
        lastRenderState.lastMoved = false;
      } else {
        lastRenderState.lastMoved = true;
      }
    }
  };

  // 处理鼠标抬起
  const handleCanvasMouseUp = (_: MouseEvent, drawCanvas: DrawCanvasCallback) => {
    skipClickSelection = false;
    if (selectionBox.isSelecting.value) {
      selectionBox.finishSelecting(drawCanvas);
      // 框选完成后，阻止后续 click 事件清空刚选中的图元
      skipClickSelection = true;
    }

    if (transform.isResizing.value) {
      // 如果有未渲染的变化，强制渲染一次
      if (lastRenderState.lastResized) {
        drawCanvas();
      }
      
      // 记录拖拽缩放的历史：将整个拖拽过程合并为一个批量历史记录
      const page = pageStore.currentPage;
      const historyManager = page?.getHistoryManager?.();
      if (historyManager && page) {
        const selectedGraphics = graphicStore.selectedGraphics || [];
        for (const graphic of selectedGraphics) {
          const startSize = transform.startGraphicSizes.value[graphic.id];
          if (startSize) {
            const currentPos = graphic.getPosition();
            const currentSize = graphic.getSize();
            const rotation = graphic.config?.geometry?.rotation ?? 0;
            const oldTransform = {
              x: startSize.x,
              y: startSize.y,
              width: startSize.width,
              height: startSize.height,
              rotation,
            };
            const newTransform = {
              x: currentPos.x,
              y: currentPos.y,
              width: currentSize.width,
              height: currentSize.height,
              rotation,
            };
            // 只在实际有变化时记录
            if (
              oldTransform.x !== newTransform.x ||
              oldTransform.y !== newTransform.y ||
              oldTransform.width !== newTransform.width ||
              oldTransform.height !== newTransform.height
            ) {
              const change = new TransformGraphicChange(
                page as any,
                graphic.id,
                oldTransform,
                newTransform,
              );
              historyManager.saveChange(change);
            }
          }
        }
      }
      // 结束批量历史记录（匹配 mousedown 时的 startBatch）
      pageStore.currentPage?.endBatch?.();
      
      transform.isResizing.value = false;
      transform.resizeHandle.value = '';
      transform.startGraphicSizes.value = {};
      dirtyRects.length = 0;
      
      // 清除操作状态
      setManipulationState?.({ resizing: false });
    }

    if (transform.isRotating.value) {
      transform.isRotating.value = false;
      transform.startGraphicRotations.value = {};

      // 标记页面已修改
      pageStore.currentPage?.markDirty?.();

      setManipulationState?.({ rotating: false });
    }

    if (transform.isMoving.value) {
      if (lastRenderState.lastMoved) {
        drawCanvas();
      }

      // 记录拖拽移动的历史：将整个拖拽过程（mousedown→mousemove→mouseup）合并为一个批量历史记录
      const page = pageStore.currentPage;
      const historyManager = page?.getHistoryManager?.();
      if (historyManager && page) {
        const selectedGraphics = graphicStore.selectedGraphics || [];
        for (const graphic of selectedGraphics) {
          const startPos = transform.startGraphicPositions.value[graphic.id];
          const currentPos = graphic.getPosition();
          if (startPos && (startPos.x !== currentPos.x || startPos.y !== currentPos.y)) {
            const size = graphic.getSize();
            const rotation = graphic.config?.geometry?.rotation ?? 0;
            const change = new TransformGraphicChange(
              page as any,
              graphic.id,
              { x: startPos.x, y: startPos.y, width: size.width, height: size.height, rotation },
              { x: currentPos.x, y: currentPos.y, width: size.width, height: size.height, rotation },
            );
            historyManager.saveChange(change);
          }
        }
      }
      // 结束批量历史记录（匹配 mousedown 时的 startBatch）
      page?.endBatch?.();

      transform.isMoving.value = false;
      transform.startGraphicPositions.value = {};
      if (cursorStyle) cursorStyle.value = '';
      dirtyRects.length = 0;

      setManipulationState?.({ moving: false });

      dragDrop.clearAlignAndSnapIndicators();
    }

    if (cpDragState.active) {
      const graphic = graphicStore.getGraphicById(cpDragState.graphicId!);
      if (graphic && typeof (graphic as any).endControlPointDrag === 'function') {
        (graphic as any).endControlPointDrag();
        drawCanvas();
      }

      // 记录控制点拖拽的历史
      const startGeo = cpDragState.startGeometry;
      if (graphic && startGeo) {
        const currentPos = graphic.getPosition();
        const currentSize = graphic.getSize();
        const rotation = graphic.config?.geometry?.rotation ?? 0;
        const newGeo = {
          x: currentPos.x,
          y: currentPos.y,
          width: currentSize.width,
          height: currentSize.height,
          rotation,
        };
        if (
          startGeo.x !== newGeo.x ||
          startGeo.y !== newGeo.y ||
          startGeo.width !== newGeo.width ||
          startGeo.height !== newGeo.height
        ) {
          const page = pageStore.currentPage;
          const historyManager = page?.getHistoryManager?.();
          if (historyManager && page) {
            const change = new TransformGraphicChange(page as any, graphic.id, startGeo, newGeo);
            historyManager.saveChange(change);
          }
        }
      }
      pageStore.currentPage?.endBatch?.();

      cpDragState.active = false;
      cpDragState.graphicId = null;
      cpDragState.controlPointIndex = -1;
      cpDragState.startGeometry = null;

      setManipulationState?.({ moving: false });
    }

  };

  // 处理画布双击（用于折弯管道等插入折弯点）
  const handleCanvasDoubleClick = (event: MouseEvent, drawCanvas: DrawCanvasCallback) => {
    const canvas = document.querySelector('canvas.design-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;
    const viewState = { scale: mouseEvents.getScale(), offset: { x: panX.value, y: panY.value } };
    const logicalPos = displayToLogical({ x: displayX, y: displayY }, viewState);
    const x = logicalPos.x;
    const y = logicalPos.y;

    if (!pageStore.selectedGraphicIds || pageStore.selectedGraphicIds.length === 0) return;

    const graphics = graphicStore.sortedGraphics || [];
    for (let i = graphics.length - 1; i >= 0; i--) {
      const graphic = graphics[i];
      if (
        !pageStore.selectedGraphicIds.includes(graphic.id) ||
        typeof (graphic as any).getHitControlPoint !== 'function' ||
        !graphic.containsPoint(x, y)
      ) {
        continue;
      }

      const cpIndex = (graphic as any).getHitControlPoint(x, y);
      const pointCount = (graphic as any).pluginProps?.points?.length || 0;
      if ((cpIndex > 0 && cpIndex < pointCount - 1) || cpIndex >= pointCount) {
        (graphic as any).insertControlPoint(cpIndex);
        drawCanvas();
        return;
      }
    }
  };

  return {
    isSelecting: selectionBox.isSelecting,
    selectionRect: selectionBox.selectionRect,
    isPanning: transform.isPanning,
    snapToGrid: dragDrop.snapToGrid,
    gridSize: dragDrop.gridSize,
    handleDragOver: dragDrop.handleDragOver,
    handleDrop: dragDrop.handleDrop,
    isGraphicLocked: dragDrop.isGraphicLocked,
    zoomIn: transform.zoomIn,
    zoomOut: transform.zoomOut,
    resetZoom: transform.resetZoom,
    toggleSnapToGrid: dragDrop.toggleSnapToGrid,
    fitToWindow: transform.fitToWindow,
    fitToContent: transform.fitToContent,
    centerZoom: transform.centerZoom,
    handleWheel: transform.handleWheel,
    updateSelectionModeFromKeyState: selectionBox.updateSelectionModeFromKeyState,
    handleCanvasClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasDoubleClick,
    alignLeft: alignment.alignLeft,
    alignRight: alignment.alignRight,
    alignTop: alignment.alignTop,
    alignBottom: alignment.alignBottom,
    alignCenter: alignment.alignCenter,
    alignMiddle: alignment.alignMiddle,
    distributeHorizontal: alignment.distributeHorizontal,
    distributeVertical: alignment.distributeVertical,
    setupGlobalMouseUpListener,
    cleanupGlobalMouseUpListener,
    alignTargets: dragDrop.alignTargets,
    snapTargets: dragDrop.snapTargets,
    handleEnterGroupEdit: (groupId: string, drawCanvas?: DrawCanvasCallback) => {
      const currentPage = pageStore.currentPage;
      if (currentPage && typeof (currentPage as any).enterGroupEditMode === 'function') {
        (currentPage as any).enterGroupEditMode(groupId);
        drawCanvas?.();
      }
    },
    handleExitGroupEdit: (drawCanvas?: DrawCanvasCallback) => {
      const currentPage = pageStore.currentPage;
      if (currentPage && typeof (currentPage as any).exitGroupEditMode === 'function') {
        (currentPage as any).exitGroupEditMode();
        drawCanvas?.();
      }
    },
  };
}

export type {
  CanvasInteractionOptions,
  DrawCanvasCallback,
};
