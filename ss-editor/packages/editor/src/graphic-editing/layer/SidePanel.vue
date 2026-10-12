<template>
  <div
    class="side-panel"
    :style="themeStyles"
  >
    <div class="side-panel-tabs">
      <button
        class="side-panel-tab"
        :class="{ active: activeTab === 'pages' }"
        @click="activeTab = 'pages'"
      >
        {{ $t('sidePanel.pages') }}
      </button>
      <button
        class="side-panel-tab"
        :class="{ active: activeTab === 'layers' }"
        @click="activeTab = 'layers'"
      >
        {{ $t('sidePanel.layers') }}
      </button>
      <button
        class="side-panel-tab"
        :class="{ active: activeTab === 'widgets' }"
        @click="activeTab = 'widgets'"
      >
        {{ $t('sidePanel.widgetTemplates') }}
      </button>
    </div>
    <div class="side-panel-content">
      <PagePanel v-show="activeTab === 'pages'" />
      <LayerPanel v-show="activeTab === 'layers'" />
      <WidgetTemplatePanel v-show="activeTab === 'widgets'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useTheme, i18n } from '@scada-editor/core';
import PagePanel from './PagePanel.vue';
import LayerPanel from './LayerPanel.vue';
import WidgetTemplatePanel from '../../canvas-page/templates/WidgetTemplatePanel.vue';

const { t } = i18n.global;
const $t = t;
const { themeStyles } = useTheme();

const activeTab = ref<'pages' | 'layers' | 'widgets'>('pages');
</script>

<style scoped>
.side-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text);
  background: var(--panel);
  border-right: 1px solid var(--border);
}

.side-panel-tabs {
  display: flex;
  border-bottom: 2px solid var(--border);
  flex-shrink: 0;
}

.side-panel-tab {
  flex: 1;
  padding: 10px 8px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  white-space: nowrap;
}

.side-panel-tab:hover {
  color: var(--text);
  background-color: var(--control-button-hover);
}

.side-panel-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.side-panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>