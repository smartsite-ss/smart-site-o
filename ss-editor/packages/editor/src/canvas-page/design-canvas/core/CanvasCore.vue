<template>
  <PluginLayerManager
    ref="layerManagerRef"
    :width="width"
    :height="height"
    :graphics="graphics"
    :pan-x="panX"
    :pan-y="panY"
    :zoom="zoom"
    :show-grid="showGrid"
    :enable-auto-fit="enableAutoFit"
    :cursor-style="cursorStyle"
    :mode="mode"
    @scroll="(event) => emit('scroll', event)"
    @click="(event) => emit('click', event)"
    @mousedown="(event) => emit('mousedown', event)"
    @mousemove="(event) => emit('mousemove', event)"
    @mouseup="(event) => emit('mouseup', event)"
    @mouseleave="(event) => emit('mouseleave', event)"
    @mouseout="(event) => emit('mouseout', event)"
    @dblclick="(event) => emit('dblclick', event)"
    @dragover="(event) => emit('dragover', event)"
    @drop="(event) => emit('drop', event)"
    @wheel="(event) => emit('wheel', event)"
    @contextmenu="(event) => emit('contextmenu', event)"
  >
    <template #overlay>
      <slot name="overlay" />
    </template>
  </PluginLayerManager>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PluginLayerManager from './PluginLayerManager.vue';
import type { IGraphic } from '@scada-editor/core';

const _props = defineProps<{
  width: number;
  height: number;
  graphics: IGraphic[];
  panX: number;
  panY: number;
  zoom: number;
  showGrid: boolean;
  enableAutoFit?: boolean;
  cursorStyle?: string;
  mode?: 'edit' | 'runtime';
}>();

const emit = defineEmits<{
  'scroll': [event: Event];
  'click': [event: MouseEvent];
  'mousedown': [event: MouseEvent];
  'mousemove': [event: MouseEvent];
  'mouseup': [event: MouseEvent];
  'mouseleave': [event: MouseEvent];
  'mouseout': [event: MouseEvent];
  'dblclick': [event: MouseEvent];
  'dragover': [event: DragEvent];
  'drop': [event: DragEvent];
  'wheel': [event: WheelEvent];
  'contextmenu': [event: MouseEvent];
}>();

const layerManagerRef = ref<InstanceType<typeof PluginLayerManager> | null>(null);

defineExpose({
  get canvasRef() { return layerManagerRef.value?.canvasRef || null; },
});
</script>

<style scoped>
</style>