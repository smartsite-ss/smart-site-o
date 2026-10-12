<template>
  <div
    ref="containerRef"
    class="design-canvas-container"
    tabindex="-1"
    :style="themeStyles"
    @mousedown="focusCanvasContainer"
  >
    <GroupEditBar
      :is-in-group-edit="isInGroupEdit"
      @exit="handleExitGroupEdit"
    />
    <CanvasRulerContainer
      :show-ruler="showRuler"
      :show-reference-lines="showReferenceLines"
      :show-auto-fit-centering="showAutoFitCentering"
      :canvas-width="canvasWidth"
      :canvas-height="canvasHeight"
      :scale="pageStore.currentPageScaleFactor"
      :scroll-left="scrollLeft"
      :scroll-top="scrollTop"
      :mouse-position="mousePosition"
      @toggle-reference-lines="toggleReferenceLines"
      @update-mouse-position="updateMousePosition"
      @create-guide-line="handleCreateGuideLine"
    >
      <CanvasCore
        ref="canvasCoreRef"
        :width="canvasWidth"
        :height="canvasHeight"
        :graphics="sortedGraphics"
        :pan-x="panX"
        :pan-y="panY"
        :zoom="pageStore.currentPageScaleFactor"
        :show-grid="showGrid"
        :enable-auto-fit="showAutoFitCentering"
        :cursor-style="cursorStyle || (isSelecting ? 'crosshair' : pageStore.selectedGraphicIds?.length > 0 ? 'pointer' : 'default')"
        @scroll="handleScroll"
        @click="(event) => handleCanvasClick(event, drawCanvas)"
        @mousedown="handleCanvasMouseDown"
        @mousemove="(event) => { handleCanvasMouseMove(event, drawCanvas); updateCanvasMousePosition(event, canvasCoreRef?.canvasRef || canvasRef); }"
        @mouseup="(event) => handleCanvasMouseUp(event, drawCanvas)"
        @mouseleave="(event) => { handleCanvasMouseUp(event, drawCanvas); handleMouseLeave(); }"
        @mouseout="handleMouseLeave"
        @dblclick="(event) => handleCanvasDoubleClick(event, drawCanvas)"
        @dragover="handleDragOver"
        @drop="(event) => handleDrop(event, addGraphic, drawCanvas)"
        @wheel="(event) => handleWheel(event, drawCanvas)"
        @contextmenu="handleContextMenu"
      >
        <template #overlay>
          <SelectionOverlay
            :is-selecting="isSelecting"
            :selection-rect="selectionRect"
            :selected-graphic-rect="selectedGraphicRect"
            :selected-graphic-rotation="selectedGraphicRotation"
            :selected-graphic-ids="pageStore.selectedGraphicIds"
            :scroll-left="scrollLeft"
            :scroll-top="scrollTop"
            :scale="pageStore.currentPageScaleFactor"
            :pan-x="panX"
            :pan-y="panY"
            :show-reference-lines="showReferenceLines"
            :mouse-position="mousePosition"
            :guide-lines="guideLines"
            :use-canvas-selection="useCanvasSelection"
            :align-targets="alignTargets"
            :snap-targets="snapTargets"
            @rotate="handleGraphicRotate"
            @resize="handleGraphicResize"
            @move-guide-line="handleMoveGuideLine"
            @delete-guide-line="handleDeleteGuideLine"
            @enter-group-edit="handleEnterGroupEdit"
            @exit-group-edit="handleExitGroupEdit"
          />
        </template>
      </CanvasCore>
    </CanvasRulerContainer>
    <!-- 右键菜单 -->
    <CanvasContextMenu
      v-if="showContextMenu"
      :visible="showContextMenu"
      :position="contextMenuPosition"
      :selected-graphic-ids="pageStore.selectedGraphicIds"
      :is-graphic-locked="isGraphicLocked"
      :is-graphic-visible="isGraphicVisible"
      :is-group="isGroup"
      @toggle-lock="handleToggleLock"
      @toggle-visibility="handleToggleVisibility"
      @delete="handleDelete"
      @duplicate="handleDuplicate"
      @copy="handleCopy"
      @paste="handlePaste"
      @bring-to-front="handleBringToFront"
      @send-to-back="handleSendToBack"
      @bring-forward="handleBringForward"
      @send-backward="handleSendBackward"
      @group="handleGroup"
      @ungroup="handleUngroup"
      @export-data="handleExportData"
      @export-scene-data="handleExportSceneData"
      @export-scene="handleExportScene"
      @preview="handlePreview"
    />
    <CanvasFooter :center-zoom="handleCenterZoom" />
    <MessageToast />
    <EmptyCanvasGuide
      :visible="showEmptyState"
      :title="t('editor.emptyCanvas.title') || '开始创作'"
      :description="t('editor.emptyCanvas.description') || '从左侧组件面板拖拽组件到此处，或使用工具栏快速添加'"
      :tip-drag="t('editor.emptyCanvas.tipDrag') || '拖拽添加'"
      :tip-shortcut="t('editor.emptyCanvas.tipShortcut') || 'Ctrl+V 粘贴'"
      :tip-tools="t('editor.emptyCanvas.tipTools') || '使用工具栏绘制'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useGraphic } from '../../composables/useGraphic';
import {
  usePageStore, useGraphicStore, useTheme, useConfigStore, i18n, FormatPainterManager,
} from '@scada-editor/core';
const { t } = i18n.global;
import { useCanvasRender } from '../../composables/useCanvasRender';
import { useCanvasInteraction } from '../../composables/useCanvasInteraction';
import { useCanvasExport } from '../../composables/useCanvasExport';
import { useCanvasKeyboardShortcuts } from '../../composables/useCanvasKeyboardShortcuts';
import { useViewportStore } from '../../stores/useViewportStore';
import { useZoomPan } from './composables/useZoomPan';
import { useContextMenu } from './composables/useContextMenu';
import { useGraphicSelection } from './composables/useGraphicSelection';
import { useGuideLines } from './composables/useGuideLines';
import { useCanvasLifecycle } from './composables/useCanvasLifecycle';
import GroupEditBar from './components/GroupEditBar.vue';
import EmptyCanvasGuide from './components/EmptyCanvasGuide.vue';
import CanvasCore from './core/CanvasCore.vue';
import SelectionOverlay from './overlays/SelectionOverlay.vue';
import CanvasContextMenu from './context-menu/CanvasContextMenu.vue';
import CanvasRulerContainer from './ruler/CanvasRulerContainer.vue';
import CanvasFooter from './CanvasFooter.vue';
import MessageToast from '../../common/MessageToast.vue';

const { themeStyles } = useTheme();
const pageStore = usePageStore();
const graphicStore = useGraphicStore();

const props = defineProps({
  width: { type: Number, default: undefined },
  height: { type: Number, default: undefined },
  formatPainterManager: { type: Object as () => FormatPainterManager | undefined, default: undefined },
});

const canvasCoreRef = ref<any>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
onMounted(() => {
  pageStore.setPageMode('edit');
  nextTick(() => { if (canvasCoreRef.value?.canvasRef) canvasRef.value = canvasCoreRef.value.canvasRef; });
});
watch(() => canvasCoreRef.value, (v) => { if (v?.canvasRef) canvasRef.value = v.canvasRef; }, { flush: 'post' });

const canvasWidth = ref(props.width || pageStore.currentPage?.width || 1920);
const canvasHeight = ref(props.height || pageStore.currentPage?.height || 1080);
watch(
  () => [pageStore.currentPage?.width, pageStore.currentPage?.height],
  ([w, h]) => { if (w !== undefined) canvasWidth.value = w; if (h !== undefined) canvasHeight.value = h; },
  { immediate: true },
);

const viewportStore = useViewportStore();
const { panX, panY, scrollLeft, scrollTop } = storeToRefs(viewportStore);

// ── useZoomPan ──
const {
  mousePosition, showGrid, showRuler, showReferenceLines, containerRef, showAutoFitCentering,
  handleScroll, updateCanvasMousePosition, updateMousePosition, handleMouseLeave,
  zoomIn, zoomOut, resetZoom, fitToWindow, fitToContent, centerZoom, handleWheel,
  toggleGrid, toggleRuler, toggleReferenceLines,
} = useZoomPan({ canvasWidth, canvasHeight });

// ── useGraphic ──
const {
  sortedGraphics, addGraphic, selectMultipleGraphics, selectAllGraphics, clearSelection,
  duplicateGraphic, deleteSelectedGraphics, copySelectedGraphics, cutSelectedGraphics, pasteGraphics,
  undo, redo, bringToFront, sendToBack, bringForward, sendBackward,
  lockGraphic, unlockGraphic, toggleGraphicLock,
  showGraphic, hideGraphic, toggleGraphicVisibility,
  groupSelectedGraphics, ungroupGraphics,
} = useGraphic();

const showEmptyState = computed(() => false);
const configStore = useConfigStore();
const useCanvasSelection = computed(() => configStore.canvas.useCanvasSelection || false);

// ── useCanvasExport ──
const { exportGraphicData, exportSceneData, exportScene, previewGraphic } = useCanvasExport({
  getSelectedGraphic: () =>
    pageStore.selectedGraphicIds.length > 0 ? graphicStore.getGraphicById(pageStore.selectedGraphicIds[0]) : null,
  getCurrentPage: () => pageStore.currentPage,
  getCanvasElement: () => canvasCoreRef.value?.canvasRef || canvasRef.value,
});

// ── useContextMenu ──
const {
  showContextMenu, contextMenuPosition, isGraphicLocked, isGraphicVisible, isGroup,
  handleContextMenu, closeContextMenu, handleToggleLock, handleToggleVisibility,
  handleDelete, handleDuplicate, handleCopy, handlePaste,
  handleBringToFront, handleSendToBack, handleBringForward, handleSendBackward,
  handleGroup, handleUngroup,
  handleExportData, handleExportSceneData, handleExportScene, handlePreview,
} = useContextMenu(
  { lockGraphic, unlockGraphic, toggleGraphicLock, showGraphic, hideGraphic, toggleGraphicVisibility,
    deleteSelectedGraphics, duplicateGraphic, copySelectedGraphics, pasteGraphics,
    bringToFront, sendToBack, bringForward, sendBackward, groupSelectedGraphics, ungroupGraphics },
  { exportGraphicData, exportSceneData, exportScene, previewGraphic },
);

const { guideLines, handleCreateGuideLine, handleMoveGuideLine, handleDeleteGuideLine } = useGuideLines();

// ── 光标/渲染 ──
const cursorStyle = ref('');
watch(() => props.formatPainterManager?.mode, (mode) => {
  if (mode === 'pick' || mode === 'paint') {
    cursorStyle.value = 'crosshair';
  } else if (cursorStyle.value === 'crosshair') {
    cursorStyle.value = '';
  }
}, { immediate: true });
const hoveredGraphicId = ref('');
const graphicDecorators = ref<Record<string, any>>({});
const selectRD = computed(() => ({
  isSelecting: isSelecting.value, selectionRect: selectionRect.value,
  selectedGraphicIds: pageStore.selectedGraphicIds, selectedGraphics: graphicStore.selectedGraphics,
}));

const { drawCanvas, setManipulationState } = useCanvasRender(
  canvasRef, canvasWidth, canvasHeight, panX, panY,
  graphicDecorators, hoveredGraphicId, selectRD, useCanvasSelection,
);

watch(() => pageStore.currentPage, (page) => {
  viewportStore.setScrollPosition(0, 0);
  if (page && typeof (page as any).setAnimationFrameCallback === 'function')
    (page as any).setAnimationFrameCallback(() => drawCanvas());
}, { immediate: true });

// ── useCanvasInteraction ──
const {
  isSelecting, selectionRect, handleDragOver, handleDrop,
  handleCanvasClick, handleCanvasMouseDown, handleCanvasMouseMove,
  handleCanvasMouseUp, handleCanvasDoubleClick,
  alignLeft, alignRight, alignTop, alignBottom, alignCenter, alignMiddle,
  distributeHorizontal, distributeVertical,
  setupGlobalMouseUpListener, cleanupGlobalMouseUpListener,
  updateSelectionModeFromKeyState,
  alignTargets, snapTargets, toggleSnapToGrid,
  handleEnterGroupEdit, handleExitGroupEdit,
} = useCanvasInteraction({
  panX, panY, canvasWidth, canvasHeight, cursorStyle, hoveredGraphicId,
  graphicDecorators, setManipulationState, formatPainterManager: props.formatPainterManager,
});

const handleCenterZoom = (delta: number) => centerZoom(delta, drawCanvas);

function focusCanvasContainer() {
  containerRef.value?.focus();
}

const isInGroupEdit = computed(() => {
  const page = pageStore.currentPage as any;
  return page?.groupEditMode?.active === true;
});

const {
  selectedGraphicRotation, selectedGraphicRect,
  handleGraphicRotate, handleGraphicResize,
} = useGraphicSelection(drawCanvas);

// ── 快捷键 ──
function moveSelectedGraphics(dx: number, dy: number) {
  const ids = pageStore.selectedGraphicIds;
  if (!ids?.length) return;
  const page = pageStore.currentPage as any;
  const gm = page?.getGroupManager?.();
  if (gm && ids.length > 1) {
    const g = gm.getGroupForGraphic(ids[0]);
    if (g && ids.every((id: string) => gm.isGraphicInGroup(id))) { gm.moveGroup(g.id, dx, dy); return; }
  }
  for (const g of graphicStore.selectedGraphics) {
    const { x, y } = g.getPosition();
    g.setPosition(x + dx, y + dy);
  }
}

const { registerEditKeys } = useCanvasKeyboardShortcuts({
  drawCanvas, clearSelection, copySelectedGraphics, cutSelectedGraphics, pasteGraphics,
  duplicateGraphic, undo, redo, selectMultipleGraphics, selectAllGraphics,
  moveSelectedGraphics: (dx: number, dy: number) => moveSelectedGraphics(dx, dy),
  groupSelectedGraphics,
  bringForward: (id: string) => bringForward(id),
  sendBackward: (id: string) => sendBackward(id),
  bringToFront: (id: string) => bringToFront(id),
  sendToBack: (id: string) => sendToBack(id),
  deleteGraphic: (fm: boolean) => { if (!fm) deleteSelectedGraphics(); },
  ungroupGraphicsHandler: () => {},
  getCanvasContainer: () => containerRef.value,
});

useCanvasLifecycle({
  drawCanvas, registerEditKeys, closeContextMenu,
  setupGlobalMouseUpListener, cleanupGlobalMouseUpListener,
  updateSelectionModeFromKeyState, handleCanvasMouseUp,
});

defineExpose({
  zoomIn: () => zoomIn(drawCanvas),
  zoomOut: () => zoomOut(drawCanvas),
  resetZoom: () => resetZoom(drawCanvas),
  fitToWindow: () => fitToWindow(drawCanvas),
  fitToContent: () => fitToContent(drawCanvas),
  toggleGrid, toggleSnapToGrid, toggleRuler, toggleReferenceLines,
  alignLeft: () => alignLeft(drawCanvas),
  alignRight: () => alignRight(drawCanvas),
  alignTop: () => alignTop(drawCanvas),
  alignBottom: () => alignBottom(drawCanvas),
  alignCenter: () => alignCenter(drawCanvas),
  alignMiddle: () => alignMiddle(drawCanvas),
  distributeHorizontal: () => distributeHorizontal(drawCanvas),
  distributeVertical: () => distributeVertical(drawCanvas),
  undo: () => undo(), redo: () => redo(),
  refresh: drawCanvas,
});
</script>

<style scoped>
.design-canvas-container {
  position: relative;
  border: 1px solid var(--border);
  background-color: var(--background);
  overflow: hidden;
  min-height: 0;
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.design-canvas-container:focus {
  outline: none;
}
.design-canvas {
  display: block;
  background-color: var(--surface);
  z-index: 1;
}
</style>