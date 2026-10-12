<template>
  <div
    class="editor-controls"
    :style="themeStyles"
  >
    <img
      class="control-button"
      :src="iconUrl('preview')"
      :alt="t('editorTools.preview')"
      :title="t('editorTools.preview')"
      @click="$emit('preview')"
    >
    <button
      class="control-button"
      :title="t('editorTools.previewInNewTab')"
      @click="$emit('previewInNewTab')"
    >
      <span class="icon-emoji">🌐</span>
    </button>
    <img
      class="control-button"
      :src="iconUrl('export')"
      :alt="t('editorTools.export')"
      :title="t('editorTools.export')"
      @click="$emit('export')"
    >
    <div class="control-separator" />

    <img
      class="control-button"
      :src="iconUrl('fit-to-window')"
      :alt="t('editorTools.fitToWindow')"
      :title="t('editorTools.fitToWindow')"
      @click="$emit('fitToWindow')"
    >
    <img
      class="control-button"
      :src="iconUrl('fit-to-content')"
      :alt="t('editorTools.fitToContent')"
      :title="t('editorTools.fitToContent')"
      @click="$emit('fitToContent')"
    >
    <img
      class="control-button"
      :src="iconUrl('grid')"
      :alt="t('editorTools.grid')"
      :title="t('editorTools.grid')"
      @click="$emit('toggleGrid')"
    >
    <img
      class="control-button"
      :class="{ active: snapToGrid }"
      :src="iconUrl('snap')"
      :alt="t('editorTools.snap')"
      :title="t('editorTools.snap')"
      @click="$emit('toggleSnapToGrid')"
    >
    <img
      class="control-button"
      :src="iconUrl('ruler')"
      :alt="t('editorTools.ruler')"
      :title="t('editorTools.ruler')"
      @click="$emit('toggleRuler')"
    >
    <img
      class="control-button"
      :src="iconUrl('reference-lines')"
      :alt="t('editorTools.referenceLines')"
      :title="t('editorTools.referenceLines')"
      @click="$emit('toggleReferenceLines')"
    >
    <div class="control-separator" />
    <img
      class="control-button"
      :src="iconUrl('align-left')"
      :alt="t('editorTools.alignLeft')"
      :title="t('editorTools.alignLeft')"
      @click="$emit('alignLeft')"
    >
    <img
      class="control-button"
      :src="iconUrl('align-right')"
      :alt="t('editorTools.alignRight')"
      :title="t('editorTools.alignRight')"
      @click="$emit('alignRight')"
    >
    <img
      class="control-button"
      :src="iconUrl('align-top')"
      :alt="t('editorTools.alignTop')"
      :title="t('editorTools.alignTop')"
      @click="$emit('alignTop')"
    >
    <img
      class="control-button"
      :src="iconUrl('align-bottom')"
      :alt="t('editorTools.alignBottom')"
      :title="t('editorTools.alignBottom')"
      @click="$emit('alignBottom')"
    >
    <img
      class="control-button"
      :src="iconUrl('align-center')"
      :alt="t('editorTools.alignCenter')"
      :title="t('editorTools.alignCenter')"
      @click="$emit('alignCenter')"
    >
    <img
      class="control-button"
      :src="iconUrl('align-middle')"
      :alt="t('editorTools.alignMiddle')"
      :title="t('editorTools.alignMiddle')"
      @click="$emit('alignMiddle')"
    >
    <div class="control-separator" />
    <img
      class="control-button"
      :src="iconUrl('distribute-horizontal')"
      :alt="t('editorTools.distributeHorizontal')"
      :title="t('editorTools.distributeHorizontal')"
      @click="$emit('distributeHorizontal')"
    >
    <img
      class="control-button"
      :src="iconUrl('distribute-vertical')"
      :alt="t('editorTools.distributeVertical')"
      :title="t('editorTools.distributeVertical')"
      @click="$emit('distributeVertical')"
    >
    <div class="control-separator" />
    <img
      class="control-button"
      :src="iconUrl('undo')"
      :alt="t('editorTools.undo')"
      :title="t('editorTools.undo')"
      @click="$emit('undo')"
    >
    <img
      class="control-button"
      :src="iconUrl('redo')"
      :alt="t('editorTools.redo')"
      :title="t('editorTools.redo')"
      @click="$emit('redo')"
    >
    <button
      class="control-button"
      :class="{ active: isFormatPainterActive }"
      :title="t('format')"
      @click="$emit('formatPainter')"
    >
      <span class="icon-emoji">🖌️</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTheme, i18n } from '@scada-editor/core';

// 预加载所有编辑器工具图标（库模式下静态 src 无法被 Rollup 解析，需显式导入）
const iconModules = import.meta.glob('../../assets/icons/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const iconUrl = (name: string) => iconModules[`../../assets/icons/${name}.svg`];

const { themeStyles } = useTheme();

// 国际化翻译函数
const { t } = i18n.global;

defineProps({
  snapToGrid: {
    type: Boolean,
    default: true,
  },
  isFormatPainterActive: {
    type: Boolean,
    default: false,
  },
});

defineEmits([
  'refresh',
  'fitToWindow',
  'fitToContent',
  'toggleGrid',
  'toggleSnapToGrid',
  'toggleRuler',
  'toggleReferenceLines',
  'alignLeft',
  'alignRight',
  'alignTop',
  'alignBottom',
  'alignCenter',
  'alignMiddle',
  'distributeHorizontal',
  'distributeVertical',
  'undo',
  'redo',
  'formatPainter',
  'preview',
  'export',
  'previewInNewTab',
]);
</script>

<style scoped>
.editor-controls {
  position: relative;
  z-index: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  color: var(--text);
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}

.editor-controls::-webkit-scrollbar {
  display: none;
}

.control-button {
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  background-color: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  width: 32px;
  height: 32px;
  object-fit: contain;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.control-button .icon-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 16px;
  filter: grayscale(20%);
}

.control-button:hover {
  background-color: var(--control-button-hover);
  border-color: rgba(59, 130, 246, 0.3);
  color: var(--text);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-button:hover .icon-emoji {
  filter: grayscale(0%);
}

.control-button:active {
  transform: translateY(0);
  box-shadow: none;
}

.control-button.active {
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

.control-separator {
  width: 1px;
  height: 28px;
  background: linear-gradient(180deg, transparent 0%, var(--border) 50%, transparent 100%);
  margin: 0 8px;
  opacity: 0.8;
  flex-shrink: 0;
}
</style>
