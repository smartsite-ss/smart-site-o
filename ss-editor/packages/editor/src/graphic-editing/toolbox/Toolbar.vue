<template>
  <div class="toolbar">
    <div class="toolbar-section">
      <h3>{{ t('toolbar.tools') }}</h3>
      <div class="toolbar-buttons">
        <img
          class="toolbar-button"
          :class="{ active: selectedTool === 'select' }"
          :src="iconUrl('select')"
          alt="{{ t('toolbar.select') }}"
          title="{{ t('toolbar.select') }}"
          @click="selectTool('select')"
        >
        <img
          class="toolbar-button"
          :class="{ active: selectedTool === 'button' }"
          :src="iconUrl('button')"
          alt="{{ t('toolbar.button') }}"
          title="{{ t('toolbar.button') }}"
          @click="selectTool('button')"
        >
        <img
          class="toolbar-button"
          :class="{ active: selectedTool === 'input' }"
          :src="iconUrl('input')"
          alt="{{ t('toolbar.input') }}"
          title="{{ t('toolbar.input') }}"
          @click="selectTool('input')"
        >
        <img
          class="toolbar-button"
          :class="{ active: selectedTool === 'shape' }"
          :src="iconUrl('shape')"
          alt="{{ t('toolbar.shape') }}"
          title="{{ t('toolbar.shape') }}"
          @click="selectTool('shape')"
        >
        <img
          class="toolbar-button"
          :class="{ active: selectedTool === 'label' }"
          :src="iconUrl('label')"
          alt="{{ t('toolbar.label') }}"
          title="{{ t('toolbar.label') }}"
          @click="selectTool('label')"
        >
        <img
          class="toolbar-button"
          :class="{ active: selectedTool === 'image' }"
          :src="iconUrl('image')"
          alt="{{ t('toolbar.image') }}"
          title="{{ t('toolbar.image') }}"
          @click="selectTool('image')"
        >
        <img
          class="toolbar-button"
          :class="{ active: selectedTool === 'chart' }"
          :src="iconUrl('chart')"
          alt="{{ t('toolbar.chart') }}"
          title="{{ t('toolbar.chart') }}"
          @click="selectTool('chart')"
        >
      </div>
    </div>

    <div class="toolbar-section">
      <h3>{{ t('toolbar.layout') }}</h3>
      <div class="toolbar-buttons">
        <img
          class="toolbar-button"
          :src="iconUrl('free-layout')"
          alt="{{ t('toolbar.freeLayout') }}"
          title="{{ t('toolbar.freeLayout') }}"
          @click="applyLayout('free')"
        >
        <img
          class="toolbar-button"
          :src="iconUrl('grid-layout')"
          alt="{{ t('toolbar.gridLayout') }}"
          title="{{ t('toolbar.gridLayout') }}"
          @click="applyLayout('grid')"
        >
        <img
          class="toolbar-button"
          :src="iconUrl('flow-layout')"
          alt="{{ t('toolbar.flowLayout') }}"
          title="{{ t('toolbar.flowLayout') }}"
          @click="applyLayout('flow')"
        >
      </div>
    </div>

    <div class="toolbar-section">
      <h3>{{ t('toolbar.actions') }}</h3>
      <div class="toolbar-buttons">
        <img
          class="toolbar-button"
          :src="iconUrl('duplicate')"
          alt="{{ t('toolbar.copy') }}"
          title="{{ t('toolbar.copy') }}"
          @click="duplicateSelected"
        >
        <img
          class="toolbar-button"
          :src="iconUrl('delete')"
          alt="{{ t('toolbar.delete') }}"
          title="{{ t('toolbar.delete') }}"
          @click="deleteSelected"
        >
        <img
          class="toolbar-button"
          :src="iconUrl('clear')"
          alt="{{ t('toolbar.clear') }}"
          title="{{ t('toolbar.clear') }}"
          @click="clearAll"
        >
      </div>
    </div>

    <div class="toolbar-section">
      <h3>{{ t('toolbar.view') }}</h3>
      <div class="toolbar-buttons">
        <button
          class="render-toggle-btn"
          :class="{ active: isCanvasPreviewMode }"
          :title="isCanvasPreviewMode ? t('toolbar.canvasPreviewOn') : t('toolbar.canvasPreviewOff')"
          @click="toggleCanvasPreview"
        >
          {{ isCanvasPreviewMode ? t('toolbar.canvasMode') : t('toolbar.konvaMode') }}
        </button>
      </div>
    </div>

    <div class="toolbar-section">
      <h3>{{ t('toolbar.appearance') }}</h3>
      <div class="toolbar-buttons toolbar-appearance">
        <div
          ref="themeSwitcherContainer"
          class="appearance-item"
        />
        <div
          ref="languageSwitcherContainer"
          class="appearance-item"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useConfigStore, i18n } from '@scada-editor/core';
import { ThemeSwitcher, LanguageSwitcher } from '@scada-editor/plugin-sdk';
import { useSelection } from '../../composables/useSelection';
import { useLayout } from '../../composables/useLayout';

// 预加载所有工具栏图标（库模式下静态 src 无法被 Rollup 解析，需显式导入）
const iconModules = import.meta.glob('../../assets/icons/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const iconUrl = (name: string) => iconModules[`../../assets/icons/${name}.svg`];

const configStore = useConfigStore();

const { t } = i18n.global;
const { deleteSelectedGraphic, duplicateSelectedGraphic } = useSelection();
const { setPageLayout } = useLayout();

const isCanvasPreviewMode = ref(false);
const themeSwitcherContainer = ref<HTMLDivElement | null>(null);
const languageSwitcherContainer = ref<HTMLDivElement | null>(null);

let themeSwitcher: ThemeSwitcher | null = null;
let languageSwitcher: LanguageSwitcher | null = null;

onMounted(() => {
  if (themeSwitcherContainer.value) {
    themeSwitcher = new ThemeSwitcher({
      container: themeSwitcherContainer.value,
    });
    themeSwitcher.mount(themeSwitcherContainer.value);
  }

  if (languageSwitcherContainer.value) {
    languageSwitcher = new LanguageSwitcher({
      container: languageSwitcherContainer.value,
      supportedLocales: ['zh-CN', 'en-US'],
    });
    languageSwitcher.mount(languageSwitcherContainer.value);
  }
});

onUnmounted(() => {
  themeSwitcher?.unmount();
  languageSwitcher?.unmount();
});

const toggleCanvasPreview = () => {
  isCanvasPreviewMode.value = !isCanvasPreviewMode.value;
  document.dispatchEvent(new CustomEvent('canvas-preview-toggle', {
    detail: { enabled: isCanvasPreviewMode.value }
  }));
};

// 计算当前选择的工具
const selectedTool = computed(() => {
  return configStore.tools.selectedTool;
});

// 选择工具
const selectTool = (tool: string) => {
  configStore.updateToolConfig({ selectedTool: tool });
};

// 应用布局
const applyLayout = (layoutType: string) => {
  setPageLayout(layoutType);
};

// 复制选择的图形
const duplicateSelected = () => {
  duplicateSelectedGraphic();
};

// 删除选择的图形
const deleteSelected = () => {
  deleteSelectedGraphic();
};

// 清空所有图形
const clearAll = () => {
  // 这里应该实现清空所有图形的逻辑
  ('Clear all graphics');
};
</script>

<style scoped>
.toolbar {
  background-color: #f5f5f5;
  border-right: 1px solid #ccc;
  padding: 10px;
  width: 200px;
  height: 100%;
  overflow-y: auto;
}

.toolbar-section {
  margin-bottom: 20px;
}

.toolbar-section h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.toolbar-buttons {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.toolbar-appearance {
  gap: 8px;
}

.toolbar-appearance .appearance-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toolbar-appearance .appearance-item::before {
  content: '';
  font-size: 11px;
  color: #666;
}

.toolbar-appearance .appearance-item:first-child::before {
  content: '主题';
}

.toolbar-appearance .appearance-item:last-child::before {
  content: '语言';
}

.toolbar-appearance :deep(.ss-theme-switcher),
.toolbar-appearance :deep(.ss-language-switcher) {
  width: 100%;
}

.toolbar-button {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
  width: 32px;
  height: 32px;
  object-fit: contain;
  display: block;
}

.toolbar-button:hover {
  background-color: #e3f2fd;
  border-color: #2196f3;
}

.toolbar-button.active {
  background-color: #2196f3;
  border-color: #2196f3;
  filter: brightness(1.2);
}

.render-toggle-btn {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  font-size: 12px;
  color: #333;
  transition: all 0.2s;
  width: 100%;
  text-align: center;
}

.render-toggle-btn:hover {
  background-color: #e3f2fd;
  border-color: #2196f3;
}

.render-toggle-btn.active {
  background-color: #4CAF50;
  border-color: #4CAF50;
  color: white;
}
</style>
