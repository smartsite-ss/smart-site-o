<template>
  <!--
    【图层1 - 滚动容器】.plugin-layer-manager
    作用：作为整个画布区域的滚动容器
    - display: flex + flex: 1 → 自动填充父容器剩余空间
    - padding: 20px → 为画布提供四周呼吸空间
    - overflow: auto → 当画布缩放后超出可视区域时，自动显示滚动条
    - 所有鼠标事件（scroll）在此层捕获并向上 emit
    - active 状态下光标变为 grabbing（拖拽中状态）
  -->
  <div
    ref="layerRootRef"
    class="plugin-layer-manager"
    :style="{ cursor: cursorStyle, padding: layerPadding }"
    @scroll="(event) => emit('scroll', event)"
  >
    <!--
      【图层2 - 视口伸缩区】.canvas-viewport
      作用：承载画布内容的弹性容器，随 zoom 变化动态调整尺寸
      - position: relative → 为内部的绝对定位元素（Vue/SVG/CSS组件容器）提供定位参考
      - flex-shrink: 0 → 缩放后尺寸不能被压缩，只能用滚动条查看
      - margin: auto → 当画布比容器小时自动居中
      - viewportStyle 控制 width/height = 页面原始宽高 × zoom
        示例：1920×1080 的画布在 zoom=0.58 时，viewport 尺寸为 1114×627px
    -->
    <div
      ref="viewportRef"
      class="canvas-viewport"
      :class="{ 'canvas-viewport--centered': enableAutoFit }"
      :style="viewportStyle"
    >
      <!--
        【图层3 - Canvas 画布】.design-canvas
        作用：2D 绘图层，Canvas 2D API 绘制的唯一载体
        - width/height 属性 → Canvas 内部分辨率（保持原始像素，不随 zoom 变化）
        - canvasStyle 控制 CSS 显示尺寸 = 原始宽高 × zoom（与 viewport 等比缩放）
        - background-color: var(--surface) → 画布未绘制区域的背景色（浅灰色）
        - z-index: 1 → 位于最底层，其他组件容器覆盖其上
        - 所有交互事件（click/drag/wheel 等）在此层统一捕获并向上 emit
        - 实际的白色画布内容（fillRect(#FFF)）由 useCanvasRender 在此 canvas 上绘制
      -->
      <canvas
        id="canvas"
        ref="canvasRef"
        :width="width"
        :height="height"
        class="design-canvas"
        :style="canvasStyle"
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
      />

      <!--
        【图层4 - Vue 组件容器】VueComponentsContainer
        作用：渲染 Vue 插件（运行时组件）的 DOM 容器
        - 筛选 graphics 中类型为 'vue-component' 的图元
        - 每个图元对应一个带绝对定位的 DOM 节点
        - zoom 用于同步缩放组件的位置和尺寸
      -->
      <VueComponentsContainer
        :sorted-graphics="graphics"
        :zoom="zoom"
        :mode="mode"
        :canvas-el="canvasRef"
      />

      <!--
        【图层5 - SVG 组件容器】SvgComponentsContainer
        作用：渲染 SVG 矢量图形组件的容器
        - 筛选 graphics 中类型为 'svg' 的图元
        - 返回纯 SVG DOM 节点，支持矢量无损缩放
        - zoom 用于同步缩放 SVG 元素
      -->
      <SvgComponentsContainer
        :sorted-graphics="graphics"
        :zoom="zoom"
        :canvas-el="canvasRef"
      />

      <!--
        【图层6 - CSS 组件容器】CssComponentsContainer
        作用：渲染纯 CSS/HTML 样式组件的容器
        - 筛选 graphics 中类型为 'css' 的图元
        - 使用 CSS transform 控制位置和缩放
        - zoom 用于动态计算 transform 参数
      -->
      <CssComponentsContainer
        :sorted-graphics="graphics"
        :zoom="zoom"
        :canvas-el="canvasRef"
      />

      <!--
        【图层7 - 3D 组件容器】ThreeComponentsContainer
        作用：渲染 Three.js 3D 场景组件的独立容器
        - 不依赖 graphics（由 Three.js scene graph 独立管理）
        - zoom 用于同步 3D 场景的视口缩放
      -->
      <ThreeComponentsContainer
        :sorted-graphics="graphics"
        :zoom="zoom"
        :canvas-el="canvasRef"
      />

      <!--
        【图层8 - 覆盖层插槽】slot name="overlay"
        作用：允许父组件注入自定义覆盖层内容
        典型用途：选区框、对齐辅助线、拖拽预览、测量标尺等
      -->
      <slot name="overlay" />

      <!--
        【图层9 - 网格覆盖层】GridOverlay
        作用：在画布上绘制可选的点阵/网格参考线
        - showGrid 控制显示/隐藏
        - 帮助用户对齐和对位图元
      -->
      <GridOverlay :show-grid="showGrid" />

      <!--
        【图层10 - 图元原值浮层】GraphicValueOverlay
        作用：编辑态在画布上图元旁显示数据原值（tagId/当前值/质量）
        - 由 pageStore.showValueOverlay 控制显示/隐藏（DataPanel checkbox）
        - 仅显示有数据绑定的图元
      -->
      <GraphicValueOverlay
        :graphics="graphics"
        :zoom="zoom"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import VueComponentsContainer from './VueComponentsContainer.vue';
import SvgComponentsContainer from './SvgComponentsContainer.vue';
import CssComponentsContainer from './CssComponentsContainer.vue';
import ThreeComponentsContainer from './ThreeComponentsContainer.vue';
import GridOverlay from '../overlays/GridOverlay.vue';
import GraphicValueOverlay from '../overlays/GraphicValueOverlay.vue';
import { VIEWPORT } from '../constants';
import type { IGraphic } from '@scada-editor/core';

const props = defineProps({
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  graphics: { type: Array as () => IGraphic[], required: true },
  panX: { type: Number, default: 0 },
  panY: { type: Number, default: 0 },
  zoom: { type: Number, default: 1 },
  showGrid: { type: Boolean, default: true },
  enableAutoFit: { type: Boolean, default: false },
  cursorStyle: { type: String, default: 'default' },
  mode: { type: String as () => 'edit' | 'runtime', default: 'edit' },
});

const emit = defineEmits<{
  scroll: [event: Event];
  click: [event: MouseEvent];
  mousedown: [event: MouseEvent];
  mousemove: [event: MouseEvent];
  mouseup: [event: MouseEvent];
  mouseleave: [event: MouseEvent];
  mouseout: [event: MouseEvent];
  dblclick: [event: MouseEvent];
  dragover: [event: DragEvent];
  drop: [event: DragEvent];
  wheel: [event: WheelEvent];
  contextmenu: [event: MouseEvent];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const layerRootRef = ref<HTMLDivElement | null>(null);
const viewportRef = ref<HTMLDivElement | null>(null);

// 滚动层四周留白：由 VIEWPORT.LAYER_PADDING 常量注入，消除 CSS/JS 双轨数值（优化方案 P2-4）
const layerPadding = `${VIEWPORT.LAYER_PADDING}px`;

const viewportStyle = computed(() => ({
  width: (props.width * props.zoom) + 'px',
  height: (props.height * props.zoom) + 'px',
}));

const canvasStyle = computed(() => ({
  width: (props.width * props.zoom) + 'px',
  height: (props.height * props.zoom) + 'px',
}));

defineExpose({ canvasRef, layerRootRef, viewportRef });
</script>

<style scoped>
.plugin-layer-manager {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
.plugin-layer-manager:active {
  cursor: grabbing;
}
.canvas-viewport {
  position: relative;
  flex-shrink: 0;
}
.canvas-viewport--centered {
  margin: auto;
}
.design-canvas {
  display: block;
  background-color: var(--surface);
  z-index: 1;
}
</style>