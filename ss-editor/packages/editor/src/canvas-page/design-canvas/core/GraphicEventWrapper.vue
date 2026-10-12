<template>
  <div
    ref="wrapperRef"
    class="graphic-event-wrapper"
    :style="graphicStyle"
    :data-graphic-id="graphic.id"
    :data-graphic-type="graphic.type"
  >
    <component
      :is="componentDef"
      v-bind="componentProps"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeMount, onBeforeUnmount } from 'vue';
import type { IGraphic } from '@scada-editor/core';
import { EventExecutionEngine } from '@scada-editor/core';
import type { Component } from 'vue';

const props = defineProps<{
  graphic: IGraphic;
  mode: 'edit' | 'runtime';
  componentDef: Component;
  style: Record<string, any>;
  componentProps: Record<string, any>;
}>();

const wrapperRef = ref<HTMLDivElement | null>(null);
const engine = EventExecutionEngine.getInstance();

/**
 * 编辑态下不注册事件监听器，保持编辑交互（选中/拖拽/缩放）
 * 运行态下注册 DOM 事件监听器并触发生命周期事件
 */
const isRuntime = computed(() => props.mode === 'runtime');

const graphicStyle = computed(() => ({
  ...props.style,
  // 运行态下允许鼠标事件穿透到子组件
  pointerEvents: (isRuntime.value ? 'auto' : undefined) as 'auto' | undefined,
}));

// 生命周期事件：vnodeBeforeMount
onBeforeMount(() => {
  if (isRuntime.value) {
    engine.triggerLifecycleEvent(props.graphic, 'vnodeBeforeMount');
  }
});

// 生命周期事件：vnodeMounted + DOM 事件注册
onMounted(() => {
  if (!isRuntime.value) return;

  // 触发生命周期事件
  engine.triggerLifecycleEvent(props.graphic, 'vnodeMounted');

  // 注册 DOM 事件监听器
  if (wrapperRef.value) {
    const element = wrapperRef.value as HTMLElement;
    engine.registerGraphicEvents(props.graphic, element);
  }
});

// 卸载时清理事件监听器
onBeforeUnmount(() => {
  engine.unregisterGraphicEvents(props.graphic.id);
});
</script>

<style scoped>
.graphic-event-wrapper {
  /* 继承父容器定位 */
  position: absolute;
  /* pointer-events 由 graphicStyle 动态控制 */
}
</style>