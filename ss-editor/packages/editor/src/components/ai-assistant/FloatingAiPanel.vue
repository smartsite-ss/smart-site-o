<template>
  <div>
    <!-- 浮动切换按钮 -->
    <button
      v-if="!panelOpen"
      class="ai-fab"
      :style="fabStyle"
      :title="t('system.aiAssistant.openHint')"
      @click="panelOpen = true"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
        <path d="M8 12h.01M12 8h.01M16 12h.01M12 16h.01" />
      </svg>
    </button>

    <!-- 浮动面板（复用 AiAssistantPanel 的 header 作为拖拽手柄） -->
    <div
      v-if="panelOpen"
      ref="panelRef"
      class="ai-floating-panel"
      :style="panelStyle"
    >
      <AiAssistantPanel @close="panelOpen = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useConfigStore, useI18n } from '@scada-editor/core';
import AiAssistantPanel from './AiAssistantPanel.vue';

const { t } = useI18n();
const configStore = useConfigStore();

const panelOpen = ref(false);
const panelRef = ref<HTMLElement | null>(null);
// 拖拽手柄元素（AiAssistantPanel 内的 .ai-header）
let dragHeaderEl: HTMLElement | null = null;

// 面板位置（像素，相对于 viewport）
const posX = ref<number>(0);
const posY = ref<number>(0);

// 拖拽状态
let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let panelStartX = 0;
let panelStartY = 0;

const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 520;
const MARGIN = 10;

/** 初始化位置：从配置读取或默认右下角 */
function initPosition() {
  const savedX = configStore.ui?.aiAssistantX;
  const savedY = configStore.ui?.aiAssistantY;
  if (savedX != null && savedY != null) {
    posX.value = clampX(savedX);
    posY.value = clampY(savedY);
  } else {
    posX.value = window.innerWidth - PANEL_WIDTH - MARGIN;
    posY.value = window.innerHeight - PANEL_HEIGHT - MARGIN;
  }
}

function clampX(x: number): number {
  return Math.max(MARGIN, Math.min(x, window.innerWidth - PANEL_WIDTH - MARGIN));
}

function clampY(y: number): number {
  return Math.max(MARGIN, Math.min(y, window.innerHeight - PANEL_HEIGHT - MARGIN));
}

const panelStyle = computed(() => ({
  left: `${posX.value}px`,
  top: `${posY.value}px`,
  width: `${PANEL_WIDTH}px`,
  height: `${PANEL_HEIGHT}px`,
}));

const fabStyle = computed(() => ({
  right: `${MARGIN}px`,
  bottom: `${MARGIN}px`,
}));

/**
 * 监听 panelOpen：面板打开后，nextTick 等待 DOM 渲染完成，
 * 再把 mousedown 事件绑定到 AiAssistantPanel 内的 .ai-header 元素上。
 * 同时给 header 加上 cursor: move 视觉提示。
 */
watch(panelOpen, async (open) => {
  if (open) {
    await nextTick();
    bindHeaderDrag();
  } else {
    unbindHeaderDrag();
  }
}, { immediate: true });

function bindHeaderDrag() {
  if (!panelRef.value) return;
  const header = panelRef.value.querySelector('.ai-header') as HTMLElement | null;
  if (!header) return;
  dragHeaderEl = header;
  // 视觉提示：标题栏可拖动
  header.style.cursor = 'move';
  header.style.userSelect = 'none';
  header.addEventListener('mousedown', startDrag);
}

function unbindHeaderDrag() {
  if (dragHeaderEl) {
    dragHeaderEl.style.cursor = '';
    dragHeaderEl.style.userSelect = '';
    dragHeaderEl.removeEventListener('mousedown', startDrag);
    dragHeaderEl = null;
  }
}

function startDrag(e: MouseEvent) {
  // 忽略 header 内按钮的点击（agent 模式切换、清空、关闭等）
  const target = e.target as HTMLElement;
  if (target.closest('button')) return;
  dragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  panelStartX = posX.value;
  panelStartY = posY.value;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none';
  e.preventDefault();
}

function onDrag(e: MouseEvent) {
  if (!dragging) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  posX.value = clampX(panelStartX + dx);
  posY.value = clampY(panelStartY + dy);
}

function stopDrag() {
  if (!dragging) return;
  dragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  // 持久化位置
  configStore.updateUIConfig({
    aiAssistantX: posX.value,
    aiAssistantY: posY.value,
  });
}

function handleResize() {
  posX.value = clampX(posX.value);
  posY.value = clampY(posY.value);
}

onMounted(() => {
  initPosition();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  unbindHeaderDrag();
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});
</script>

<style scoped>
/* 浮动按钮 */
.ai-fab {
  position: fixed;
  z-index: 9998;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent, #6366f1), var(--primary, #3b82f6));
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}

.ai-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 24px rgba(99, 102, 241, 0.4);
}

.ai-fab:active {
  transform: scale(0.95);
}

/* 浮动面板 */
.ai-floating-panel {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

/* 面板主体 — AiAssistantPanel 将填满整个浮动面板 */
.ai-floating-panel > :deep(.ai-assistant-panel) {
  flex: 1;
  border-left: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 标题栏可拖动视觉提示（增强） */
.ai-floating-panel :deep(.ai-header) {
  cursor: move;
  user-select: none;
}

.ai-floating-panel :deep(.ai-header):hover {
  background-color: var(--elevated, var(--background));
}
</style>
