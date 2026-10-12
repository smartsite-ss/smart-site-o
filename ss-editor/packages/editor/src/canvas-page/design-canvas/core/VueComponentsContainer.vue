<template>
  <div
    ref="containerRef"
    class="vue-components-container"
  >
    <template v-if="componentList.length > 0">
      <GraphicEventWrapper
        v-for="(item, index) in componentList"
        :key="item.id || index"
        :graphic="item.graphic"
        :mode="mode"
        :component-def="item.componentDef"
        :style="item.style"
        :component-props="item.componentProps"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, toRef, type PropType } from 'vue';
import { eventBus, Events } from '@scada-editor/core';
import type { IGraphic } from '@scada-editor/core';
import { GraphicComponentRegistry } from '@scada-editor/plugin-sdk';
import type { Component } from 'vue';
import GraphicEventWrapper from './GraphicEventWrapper.vue';
import { useContainerPosition } from '../../../composables/useContainerPosition';

interface ComponentItem {
  id: string;
  graphic: IGraphic;
  componentDef: Component;
  style: Record<string, any>;
  componentProps: Record<string, any>;
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
  /** 运行模式：'edit' | 'runtime' */
  mode: {
    type: String as () => 'edit' | 'runtime',
    default: 'edit',
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

// 图元属性（含 customProps 变量绑定）通过 updateGraphic 原地更新，不改变 graphics 数组引用。
// 依赖 GRAPHIC_UPDATED 事件驱动 componentList 重算，使 Vue 组件能拿到最新 props（编辑态与运行态一致）。
const refreshVersion = ref(0);

function handleGraphicUpdated() {
  refreshVersion.value++;
}

onMounted(() => {
  eventBus.on(Events.GRAPHIC_UPDATED, handleGraphicUpdated);
});

onBeforeUnmount(() => {
  eventBus.off(Events.GRAPHIC_UPDATED, handleGraphicUpdated);
});

const componentList = computed<ComponentItem[]>(() => {
  void refreshVersion.value;
  const rawItems = props.sortedGraphics;
  return (rawItems || [])
    .filter((item): item is IGraphic & { componentName: string; getComponentProps?: () => Record<string, any> } =>
      item && typeof (item as any).componentName === 'string'
    )
    .map(item => {
      const componentDef = GraphicComponentRegistry.get(item.componentName);
      if (!componentDef) {
        return null;
      }
      return {
        id: item.id,
        graphic: item,
        componentDef,
        style: {
          ...calcItemStyle(item, props.zoom, props.panX, props.panY, {
            zoomY: props.zoomY ?? undefined,
          }),
        },
        componentProps: {
          graphic: item,
          ...(item.getComponentProps?.() || {}),
        },
      };
    })
    .filter(Boolean) as ComponentItem[];
});
</script>

<style scoped>
.vue-components-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}
</style>