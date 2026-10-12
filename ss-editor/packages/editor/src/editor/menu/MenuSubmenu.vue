<template>
  <div class="menu-submenu">
    <div class="submenu-header">
      <span>{{ $t('menu.graphicCategories') }}</span>
    </div>
    <div class="submenu-content">
      <div class="primary-tabs">
        <button
          v-for="primary in primaryCategories"
          :key="primary.id"
          class="primary-tab"
          :class="{ active: activePrimary === primary.id }"
          @click="selectPrimary(primary.id)"
        >
          {{ $t(`menu.primaryCategory.${primary.id}`) }}
        </button>
      </div>
      <div class="submenu-categories">
        <button
          v-for="category in currentSecondaryCategories"
          :key="category.id"
          class="category-button"
          :class="{ active: selectedCategory === category.id }"
          @click="selectCategory(category.id)"
        >
          {{ $t(`menu.graphicCategory.${category.id}`) }}
        </button>
      </div>
      <div class="submenu-items">
        <div
          v-for="(graphic, index) in selectedCategoryGraphics"
          :key="graphic.type"
          class="submenu-item"
          :style="{ animationDelay: `${index * 30}ms` }"
          draggable="true"
          @dragstart="handleDragStart($event, graphic.type)"
        >
          <div class="item-icon-wrapper">
            <img
              v-if="hasPluginImage(graphic.type)"
              :src="getPluginImageUrl(graphic.type)"
              :alt="graphic.name"
              class="item-thumbnail"
              draggable="false"
            >
            <Icon
              v-else
              :icon="getGraphicIconConfig(graphic.type)"
              :size="32"
              class="item-icon"
            />
          </div>
          <span class="submenu-item-name">{{ graphic.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Icon from '../../common/Icon.vue';
import { getThreeLevelCategoryTree } from '../../utils/pluginCategories';
import { getPluginIconMap } from '../../utils/PluginIconResolver';
import {
  CheckboxOutline,
  Text,
  BarChart,
  Square,
  Document,
  Image,
  Toggle,
  Settings,
  Ellipse,
  Star
} from '@vicons/ionicons5';

const pluginIconMap = getPluginIconMap();

const iconConfigMap: Record<string, { type: 'vicon' | 'image'; value: any }> = {
  button: { type: 'vicon', value: CheckboxOutline },
  input: { type: 'vicon', value: Text },
  chart: { type: 'vicon', value: BarChart },
  shape: { type: 'vicon', value: Square },
  label: { type: 'vicon', value: Document },
  image: { type: 'vicon', value: Image },
  'naive-button': { type: 'vicon', value: Toggle },
  checkbox: { type: 'vicon', value: CheckboxOutline },
  textbox: { type: 'vicon', value: Text },
  pump: { type: 'vicon', value: Settings },
  gauge: { type: 'vicon', value: BarChart },
  tank: { type: 'vicon', value: Square },
  valve: { type: 'vicon', value: Ellipse },
  indicator: { type: 'vicon', value: Star },
  pipe: { type: 'vicon', value: Square },
  'svg-pipe': { type: 'vicon', value: Square },
  border01: { type: 'vicon', value: Square },
  border02: { type: 'vicon', value: Square },
  border03: { type: 'vicon', value: Square },
  border04: { type: 'vicon', value: Square },
  border05: { type: 'vicon', value: Square },
  border06: { type: 'vicon', value: Square },
  border07: { type: 'vicon', value: Square },
  border08: { type: 'vicon', value: Square },
  border09: { type: 'vicon', value: Square },
  border10: { type: 'vicon', value: Square },
  border11: { type: 'vicon', value: Square },
  border12: { type: 'vicon', value: Square },
  border13: { type: 'vicon', value: Square },
  border14: { type: 'vicon', value: Square },
  motor: { type: 'vicon', value: Settings },
  sensor: { type: 'vicon', value: Star },
  alarm: { type: 'vicon', value: Star },
  switch_icon: { type: 'vicon', value: Toggle },
  head01: { type: 'vicon', value: Square },
  head02: { type: 'vicon', value: Square },
  head03: { type: 'vicon', value: Square },
  head04: { type: 'vicon', value: Square },
  head05: { type: 'vicon', value: Square },
  head06: { type: 'vicon', value: Square },
  clock: { type: 'vicon', value: Star },
  countdown: { type: 'vicon', value: Star },
  'flipper-number': { type: 'vicon', value: Star },
  number: { type: 'vicon', value: Star },
  'pipeline-h': { type: 'vicon', value: Square },
  'pipeline-v': { type: 'vicon', value: Square },
  'time-common': { type: 'vicon', value: Star },
  'page-browser': { type: 'vicon', value: Document },
};

interface Props {
  menuId: string;
}

const _props = defineProps<Props>();
const _emit = defineEmits(['menu-item-click']);

const categoryTree = getThreeLevelCategoryTree();

const primaryCategories = computed(() => categoryTree.map((t) => t.primary));

const activePrimary = ref(
  categoryTree.length > 0 ? categoryTree[0].primary.id : 'general'
);

const activeTree = computed(() =>
  categoryTree.find((t) => t.primary.id === activePrimary.value)
);

const currentSecondaryCategories = computed(() => {
  if (!activeTree.value) return [];
  return activeTree.value.secondaries.filter((s) => s.graphics.length > 0).map((s) => ({
    id: s.id,
    labelKey: `menu.graphicCategory.${s.id}`,
  }));
});

const selectedCategory = ref('');

const selectedCategoryGraphics = computed(() => {
  if (!activeTree.value) return [];
  const sec = activeTree.value.secondaries.find((s) => s.id === selectedCategory.value);
  return sec ? sec.graphics : [];
});

function initDefaultSecondary() {
  const tree = activeTree.value;
  if (tree && tree.secondaries.length > 0) {
    const first = tree.secondaries.find((s) => s.graphics.length > 0);
    if (first) {
      selectedCategory.value = first.id;
    }
  }
}
initDefaultSecondary();

function selectPrimary(primaryId: string) {
  activePrimary.value = primaryId;
  const tree = categoryTree.find((t) => t.primary.id === primaryId);
  if (tree) {
    const first = tree.secondaries.find((s) => s.graphics.length > 0);
    selectedCategory.value = first ? first.id : '';
  }
}

function selectCategory(categoryId: string) {
  selectedCategory.value = categoryId;
}

function handleDragStart(event: DragEvent, graphicType: string) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', graphicType);
  }
}

function getGraphicIconConfig(type: string) {
  const pluginIcon = pluginIconMap[type];
  if (pluginIcon?.type === 'image') {
    return { type: 'image', value: pluginIcon.value } as const;
  }
  if (pluginIcon?.type === 'component') {
    return { type: 'vicon', value: pluginIcon.value } as const;
  }
  return iconConfigMap[type] || { type: 'vicon', value: Square } as const;
}

function hasPluginImage(type: string): boolean {
  const pluginIcon = pluginIconMap[type];
  return pluginIcon?.type === 'image' && !!pluginIcon.value;
}

function getPluginImageUrl(type: string): string {
  const pluginIcon = pluginIconMap[type];
  return pluginIcon?.type === 'image' ? (pluginIcon.value as string) : '';
}
</script>

<style scoped>
.menu-submenu {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  min-width: 520px;
  max-width: 640px;
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
  animation: menuFadeIn 0.25s ease-out;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.submenu-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--background) 0%, rgba(var(--primary-rgb, 59, 130, 246), 0.03) 100%);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  letter-spacing: 0.3px;
}

.submenu-content {
  padding: 20px;
}

.primary-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 2px solid var(--border);
  padding-bottom: 0;
}

.primary-tab {
  padding: 10px 16px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: -2px;
  white-space: nowrap;
  position: relative;
  font-weight: 500;
}

.primary-tab::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--primary);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(-50%);
}

.primary-tab:hover {
  color: var(--primary);
  background-color: rgba(var(--primary-rgb, 59, 130, 246), 0.04);
}

.primary-tab:hover::after {
  width: 60%;
}

.primary-tab.active {
  color: var(--primary);
  font-weight: 600;
}

.primary-tab.active::after {
  width: 100%;
}

.submenu-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.category-button {
  padding: 7px 14px;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  background-color: var(--background);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-secondary);
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.category-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--primary);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.category-button:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--primary-rgb, 59, 130, 246), 0.15);
}

.category-button.active {
  background: linear-gradient(135deg, var(--primary) 0%, rgba(var(--primary-rgb, 59, 130, 246), 0.85) 100%);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 2px 12px rgba(var(--primary-rgb, 59, 130, 246), 0.3);
  transform: translateY(-1px);
}

.submenu-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
  padding: 4px;
}

.submenu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  background: linear-gradient(145deg, var(--background) 0%, rgba(var(--surface-rgb, 255, 255, 255), 0.5) 100%);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  cursor: grab;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text);
  min-height: 96px;
  position: relative;
  overflow: hidden;
  animation: itemFadeIn 0.4s ease-out backwards;
}

@keyframes itemFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.submenu-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, rgba(var(--primary-rgb, 59, 130, 246), 0.08) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.submenu-item:hover {
  background: linear-gradient(145deg, var(--control-button-hover) 0%, var(--background) 100%);
  border-color: var(--primary);
  transform: translateY(-4px) scale(1.02);
  box-shadow:
    0 8px 20px rgba(var(--primary-rgb, 59, 130, 246), 0.15),
    0 2px 6px rgba(0, 0, 0, 0.08);
}

.submenu-item:hover::before {
  opacity: 1;
}

.submenu-item:hover .item-icon-wrapper {
  transform: scale(1.1);
}

.submenu-item:hover .item-thumbnail {
  filter: drop-shadow(0 2px 8px rgba(var(--primary-rgb, 59, 130, 246), 0.3));
}

.submenu-item:active {
  cursor: grabbing;
  transform: translateY(-2px) scale(0.98);
  transition-duration: 0.1s;
}

.item-icon-wrapper {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(var(--primary-rgb, 59, 130, 246), 0.06) 0%, rgba(var(--primary-rgb, 59, 130, 246), 0.02) 100%);
  border-radius: 12px;
  margin-bottom: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.item-icon-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  border: 1px solid rgba(var(--primary-rgb, 59, 130, 246), 0.1);
  pointer-events: none;
}

.item-icon {
  color: var(--primary);
  transition: all 0.3s ease;
}

.item-thumbnail {
  width: 44px;
  height: 44px;
  object-fit: contain;
  transition: all 0.3s ease;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.submenu-item-name {
  font-size: 12px;
  text-align: center;
  color: var(--text-secondary);
  line-height: 1.4;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-weight: 500;
  transition: color 0.3s ease;
}

.submenu-item:hover .submenu-item-name {
  color: var(--text);
}

.submenu-items::-webkit-scrollbar {
  width: 8px;
}

.submenu-items::-webkit-scrollbar-track {
  background: var(--background);
  border-radius: 4px;
  margin: 4px;
}

.submenu-items::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--border) 0%, var(--border-light, #d1d5db) 100%);
  border-radius: 4px;
  border: 2px solid var(--background);
}

.submenu-items::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, var(--primary) 0%, rgba(var(--primary-rgb, 59, 130, 246), 0.7) 100%);
}
</style>