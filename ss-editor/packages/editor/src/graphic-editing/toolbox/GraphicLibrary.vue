<template>
  <div
    class="component-panel"
    :style="themeStyles"
  >
    <div class="panel-header">
      <h3 class="panel-title">
        {{ $t('graphicLibrary.graphicLibrary') }}
      </h3>
    </div>

    <div class="panel-body">
      <div class="primary-categories">
        <button
          v-for="category in primaryCategories"
          :key="category.id"
          class="primary-category-btn"
          :class="{ active: selectedPrimaryCategory === category.id }"
          @click="selectPrimaryCategory(category.id)"
        >
          {{ category.label }}
        </button>
      </div>

      <div
        v-if="secondaryCategories.length > 0"
        class="secondary-categories"
      >
        <button
          v-for="category in secondaryCategories"
          :key="category.id"
          class="secondary-category-btn"
          :class="{ active: selectedSecondaryCategory === category.id }"
          @click="selectSecondaryCategory(category.id)"
        >
          {{ $t('menu.graphicCategory.' + category.id) || category.name }}
        </button>
      </div>

      <div class="components-grid">
        <div
          v-for="item in filteredComponents"
          :key="item.type"
          class="component-card"
          draggable="true"
          @dragstart="handleDragStart($event, item.type)"
        >
          <div class="component-preview">
            <img
              v-if="item.iconInfo?.type === 'image'"
              :src="(item.iconInfo?.value as string) ?? undefined"
              class="preview-image"
              :alt="item.name"
            >
            <component
              :is="item.iconInfo.value"
              v-else-if="item.iconInfo?.type === 'component'"
              class="preview-component"
            />
            <span
              v-else
              class="preview-emoji"
            >{{ item.emoji }}</span>
          </div>
          <div class="component-info">
            <span class="component-name">{{ item.name }}</span>
          </div>
        </div>

        <div
          v-if="filteredComponents.length === 0"
          class="empty-state"
        >
          <span class="empty-icon">📭</span>
          <span class="empty-text">{{ $t('graphicLibrary.noComponents') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTheme, GraphicFactory, i18n } from '@scada-editor/core';
import { getThreeLevelCategoryTree, type PrimaryCategory } from '../../utils/pluginCategories';
import { getPluginIconMap, type PluginIconInfo } from '../../utils/PluginIconResolver';
import { directoryPluginIcons } from '../../shared/directoryIcons';

const { t } = i18n.global;
const { themeStyles } = useTheme();

const pluginIconMap = getPluginIconMap();

interface ComponentItem {
  type: string;
  name: string;
  category: string;
  primaryCategory?: string;
  emoji: string;
  iconInfo: PluginIconInfo | null;
}

const emojiFallback: Record<string, string> = {
  button: '🔘',
  input: '📝',
  chart: '📊',
  shape: '🔲',
  label: '🏷️',
  image: '🖼️',
  'naive-button': '🔘',
  checkbox: '☑️',
  textbox: '📄',
  pump: '⚙️',
  gauge: '📐',
  valve: '🔧',
  tank: '🛢️',
  indicator: '💡',
  pipe: '🔗',
  'svg-pipe': '🔗',
  'pipe-h': '↔️',
  'pipe-v': '↕️',
  'pipe-path': '🔗',
  waterpump: '⚙️',
  'status-indicator': '💡',
  'three-cube': '🧊',
  'three-gauge': '🎯',
  clock: '🕐',
  countdown: '⏱️',
  'flipper-number': '🔢',
  number: '🔢',
  'time-common': '🕒',
  head01: '🔶',
  head02: '🔶',
  head03: '🔶',
  head04: '🔶',
  head05: '🔶',
  head06: '🔶',
  border01: '🔲',
  border02: '🔲',
  border03: '🔲',
  border04: '🔲',
  border05: '🔲',
  border06: '🔲',
  border07: '🔲',
  border08: '🔲',
  border09: '🔲',
  border10: '🔲',
  border11: '🔲',
  border12: '🔲',
  border13: '🔲',
  border14: '🔲',
  'navigation-button': '🧭',
  'tag-variable': '🏷️',
  'tag-trend': '📈',
  'state-variable': '🔄',
  'hikvision-video': '📹',
  'event-panel': '📋',
  'tag-value': '🔷',
  'history-trend': '📊',
  'page-browser': '🌐',
};

function getEmojiForPluginType(type: string): string {
  return emojiFallback[type] || '🧩';
}

const categoryTree = computed(() => getThreeLevelCategoryTree());

const primaryCategories = computed<PrimaryCategory[]>(() => {
  return categoryTree.value.map(item => item.primary);
});

const selectedPrimaryCategory = ref<string>('decoration');
const selectedSecondaryCategory = ref<string>('');

const secondaryCategories = computed(() => {
  const currentPrimary = categoryTree.value.find(
    item => item.primary.id === selectedPrimaryCategory.value
  );
  return currentPrimary?.secondaries || [];
});

watch(selectedPrimaryCategory, (_newVal) => {
  const secondaries = secondaryCategories.value;
  if (secondaries.length > 0) {
    selectedSecondaryCategory.value = secondaries[0].id;
  } else {
    selectedSecondaryCategory.value = '';
  }
}, { immediate: true });

const allComponents = computed<ComponentItem[]>(() => {
  const items: ComponentItem[] = GraphicFactory.getGraphicTypes().map((info) => ({
    type: info.type,
    name: info.name,
    category: info.category,
    primaryCategory: info.primaryCategory,
    emoji: getEmojiForPluginType(info.type),
    iconInfo: pluginIconMap[info.type]
      || (directoryPluginIcons[info.type] ? { type: 'image' as const, value: directoryPluginIcons[info.type] } : null),
  }));

  if (!items.some((item) => item.type === 'naive-button')) {
    items.push({
      type: 'naive-button',
      name: t('graphicLibrary.naiveButton'),
      category: 'basic',
      emoji: getEmojiForPluginType('naive-button'),
      iconInfo: pluginIconMap['naive-button'] || null,
    });
  }

  return items;
});

const filteredComponents = computed(() => {
  if (!selectedSecondaryCategory.value) {
    return [];
  }

  return allComponents.value.filter(
    item => item.category === selectedSecondaryCategory.value
  );
});

const selectPrimaryCategory = (categoryId: string) => {
  selectedPrimaryCategory.value = categoryId;
};

const selectSecondaryCategory = (categoryId: string) => {
  selectedSecondaryCategory.value = categoryId;
};

const handleDragStart = (event: DragEvent, graphicType: string) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', graphicType);
    event.dataTransfer.effectAllowed = 'copy';
  }
};
</script>

<style scoped>
.component-panel {
  background-color: var(--surface);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background-color: var(--surface);
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.5px;
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 16px;
}

.primary-categories {
  display: flex;
  gap: 8px;
  padding: 16px 0 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.primary-categories::-webkit-scrollbar {
  display: none;
}

.primary-category-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.25s ease;
  color: var(--text-secondary);
  white-space: nowrap;
  position: relative;
}

.primary-category-btn:hover {
  color: var(--text);
  background-color: var(--control-button-hover);
}

.primary-category-btn.active {
  color: var(--primary);
  background-color: rgba(59, 130, 246, 0.1);
  font-weight: 600;
}

.secondary-categories {
  display: flex;
  gap: 10px;
  padding: 8px 0 16px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.secondary-categories::-webkit-scrollbar {
  display: none;
}

.secondary-category-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background-color: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.25s ease;
  color: var(--text-secondary);
  white-space: nowrap;
}

.secondary-category-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background-color: rgba(59, 130, 246, 0.05);
}

.secondary-category-btn.active {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
}

.components-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 12px 0 20px;
  overflow-y: auto;
  align-content: start;
}

.component-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  background: linear-gradient(145deg, #2a2a2a 0%, #1f1f1f 100%);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: grab;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text);
  min-height: 140px;
  position: relative;
  overflow: hidden;
}

.component-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0) 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.component-card:hover {
  transform: translateY(-4px) scale(1.02);
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.2);
}

.component-card:hover::before {
  opacity: 1;
  background: linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.08) 100%);
}

.component-card:active {
  cursor: grabbing;
  transform: translateY(-1px);
}

.component-preview {
  width: 90px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%);
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.25);
  position: relative;
  overflow: hidden;
}

.preview-image {
  width: 60px;
  height: 50px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.5));
}

.preview-component {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-emoji {
  font-size: 32px;
  filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.5));
}

.component-info {
  text-align: center;
  width: 100%;
}

.component-name {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  font-weight: 500;
}

.component-card:hover .component-name {
  color: var(--text);
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  opacity: 0.7;
}

.components-grid::-webkit-scrollbar {
  width: 6px;
}

.components-grid::-webkit-scrollbar-track {
  background: var(--background);
  border-radius: 3px;
}

.components-grid::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.components-grid::-webkit-scrollbar-thumb:hover {
  background: var(--border-light);
}
</style>
