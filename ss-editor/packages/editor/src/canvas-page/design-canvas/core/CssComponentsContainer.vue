<template>
  <div
    ref="containerRef"
    class="css-components-container"
  >
    <template v-if="domList.length > 0">
      <div
        v-for="(item, index) in domList"
        :key="item.id || index"
        class="css-plugin-wrapper"
        :style="item.style"
        v-html="item.htmlContent"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, type PropType } from 'vue';
import type { IGraphic } from '@scada-editor/core';
import { useContainerPosition } from '../../../composables/useContainerPosition';

interface DomItem {
  id: string;
  style: Record<string, any>;
  htmlContent: string;
}

const props = defineProps({
  sortedGraphics: {
    type: Array as () => IGraphic[],
    default: () => [],
  },
  zoom: {
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
  /** 纵向缩放（stretch 非均匀缩放），缺省跟随 zoom（均匀缩放） */
  zoomY: {
    type: Number,
    default: null,
  },
  /** 画布元素引用：用于计算图元相对画布的偏移（优化方案 P0-2） */
  canvasEl: {
    type: Object as PropType<HTMLCanvasElement | null>,
    default: null,
  },
});

const { containerRef, calcItemStyle, updateCanvasOffset } = useContainerPosition({
  canvasEl: toRef(props, 'canvasEl'),
});

// 供父组件在适配/容器尺寸变化后刷新画布偏移（优化方案 P0-2）
defineExpose({ updateCanvasOffset });

const domList = computed<DomItem[]>(() => {
  return props.sortedGraphics
    .filter((item): item is IGraphic & { getHtmlTemplate?: () => string; htmlContent?: string } =>
      item != null &&
      (typeof (item as any).getHtmlTemplate === 'function' ||
       typeof (item as any).htmlContent === 'string' ||
       !!(item.type && (item.type.endsWith('-css') || item.type.startsWith('css-'))))
    )
    .map(item => {
      const htmlContent =
        typeof (item as any).getHtmlTemplate === 'function'
          ? (item as any).getHtmlTemplate(item.config?.data || {})
          : (item as any).htmlContent || '';

      return {
        id: item.id || (item as any).type,
        style: {
          ...calcItemStyle(item, props.zoom, props.panX, props.panY, {
            zoomY: props.zoomY ?? undefined,
          }),
          overflow: 'hidden',
        },
        htmlContent,
      };
    });
});
</script>

<style scoped>
.css-components-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 12;
}
.css-plugin-wrapper {
  pointer-events: none;
}
.css-plugin-wrapper :deep(*) {
  pointer-events: none;
}
</style>