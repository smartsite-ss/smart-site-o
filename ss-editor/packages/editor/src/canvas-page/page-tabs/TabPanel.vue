<template>
  <div class="tab-panel">
    <!-- 标签页切换 - 画布属性/组件属性/JSON -->
    <div class="property-tabs">
      <button
        v-for="tab in mainTabs"
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeMainTab === tab.id }"
        @click="activeMainTab = tab.id"
      >
        {{ $t(tab.labelKey) || tab.label }}
      </button>
    </div>

    <!-- 主内容区 -->
    <div class="tab-content">
      <!-- 画布属性 -->
      <div v-if="activeMainTab === 'canvas'">
        <CanvasProperties
          :page-properties="pageProperties"
          @update-page-properties="updatePageProperties"
        />
      </div>

      <!-- 组件属性 -->
      <div v-else-if="activeMainTab === 'component'">
        <PropertyPanel />
      </div>

      <!-- JSON -->
      <div v-else-if="activeMainTab === 'json'">
        <JsonPanel />
      </div>
    </div>

    <!-- 图层 - 始终显示 -->
    <div class="layer-section">
      <LayerPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { usePageStore } from '@scada-editor/core';
import CanvasProperties from '../CanvasProperties.vue';
import PropertyPanel from '../../graphic-editing/property/PropertyPanel.vue';
import LayerPanel from '../../graphic-editing/layer/LayerPanel.vue';
import JsonPanel from '../../panels/json/JsonPanel.vue';

// 活动主标签
const activeMainTab = ref('canvas');

// 根据是否有选中的图元动态调整标签页
const mainTabs = computed(() => {
  const tabs: Array<{ id: string; labelKey: string; label: string }> = [];

  // 先强制显示画布属性 + JSON，确保能看到
  tabs.push({
    id: 'canvas',
    labelKey: 'canvasProperties.canvasProperties',
    label: '画布属性',
  });
  tabs.push({
    id: 'json',
    labelKey: 'tabPanel.json',
    label: 'JSON',
  });

  return tabs;
});

// 监听标签页变化，确保activeMainTab在标签列表中
watch(mainTabs, (newTabs) => {
  const hasActiveTab = newTabs.some(tab => tab.id === activeMainTab.value);
  if (!hasActiveTab && newTabs.length > 0) {
    // 如果当前标签不在新标签列表中，选择第一个标签
    activeMainTab.value = newTabs[0].id;
  }
}, { immediate: true });

// 页面属性
const pageStore = usePageStore();
const pageProperties = ref<any>(pageStore.currentPage || { id: '', name: '', width: 1920, height: 1080 });

// 监听当前页面变化
watch(() => pageStore.currentPage, (newPage) => {
  if (newPage) {
    pageProperties.value = newPage;
  }
}, { immediate: true });

// 更新页面属性
const updatePageProperties = () => {
  if (pageProperties.value && (pageProperties.value as any).id) {
    pageStore.updatePage((pageProperties.value as any).id, pageProperties.value);
  }
};
</script>

<style scoped>
@import '../../panels/styles/property-panel.scss';

.tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--surface);
  overflow: hidden;
}

/* 确保property-tabs样式正确应用 */
:deep(.property-tabs) {
  display: flex;
  background-color: var(--background);
  border-bottom: 1px solid var(--border);
  margin: 0;
  padding: 0;
}

:deep(.tab-button) {
  flex: 1;
  padding: 4px 8px;
  background-color: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  margin: 0;
}

:deep(.tab-button:hover) {
  background-color: var(--control-button-hover);
  color: var(--text);
}

:deep(.tab-button.active) {
  color: var(--primary);
  font-weight: 600;
}

:deep(.tab-button.active::after) {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--primary);
  border-radius: 2px 2px 0 0;
}

.tab-content {
  flex: 1;
  padding: 0 !important;
  overflow-y: auto;
  background-color: var(--surface);
  margin: 0 !important;
  border: none !important;
  outline: none !important;
}

.tab-content > * {
  margin-top: 0 !important;
}

.layer-section {
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  max-height: 250px;
  overflow: auto;
}
</style>
