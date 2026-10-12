<template>
  <div class="graphic-renderer">
    <canvas
      ref="canvasRef"
      :width="width"
      :height="height"
      class="graphic-canvas"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import type { IGraphic } from '@scada-editor/core';

// 发现问题了！rafThrottle函数使用了requestAnimationFrame来节流，
// 这导致drawCanvas函数被延迟到下一个动画帧执行。当添加图元时，
// 我们先修改graphics数组，然后立即选择图元，但是绘制操作被延迟了，
// 所以图元没有立即显示。需要移除rafThrottle，让drawCanvas函数立即执行。

/*
 * 图形渲染器组件
 * 用于渲染单个图形
 */
const props = defineProps({
  graphic: {
    type: Object as () => IGraphic,
    required: true,
  },
  width: {
    type: Number,
    default: 100,
  },
  height: {
    type: Number,
    default: 100,
  },
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

// 绘制图形
const drawGraphic = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  // 清空画布
  context.clearRect(0, 0, props.width, props.height);

  // 保存当前状态
  context.save();

  // 移动到原点
  context.translate(
    -props.graphic.config.geometry.x,
    -props.graphic.config.geometry.y
  );

  // 绘制图形
  props.graphic.draw(context);

  // 恢复状态
  context.restore();
};

// 监听图形变化
watch(
  () => props.graphic,
  () => {
    drawGraphic();
  },
  { deep: true }
);

// 组件挂载后绘制图形
onMounted(() => {
  nextTick(() => {
    drawGraphic();
  });
});
</script>

<style scoped>
.graphic-renderer {
  position: relative;
  display: inline-block;
}

.graphic-canvas {
  display: block;
}
</style>
