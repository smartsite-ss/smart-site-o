<template>
  <div
    class="test-page"
    :style="themeStyles"
  >
    <h1>{{ t('test.configRenderTest') }}</h1>
    <p class="test-info">
      {{ t('test.registeredTypes', { count: registeredTypes.length }) }}
    </p>

    <div class="test-controls">
      <label>
        <input
          v-model="autoTest"
          type="checkbox"
        >
        {{ t('test.autoTest') }}
      </label>
      <select
        v-model="currentType"
        class="type-select"
      >
        <option value="">
          -- {{ t('test.selectType') }} --
        </option>
        <option
          v-for="typeItem in registeredTypes"
          :key="typeItem"
          :value="typeItem"
        >
          {{ typeItem }}
        </option>
      </select>
    </div>

    <div class="test-results">
      <div
        v-for="typeItem in registeredTypes"
        :key="typeItem"
        class="test-item"
        :class="{
          active: currentType === typeItem,
          error: errors[typeItem],
          success: results[typeItem] === true,
        }"
      >
        <span class="test-name">{{ typeItem }}</span>
        <span
          v-if="errors[typeItem]"
          class="test-status error"
        >❌ {{ errors[typeItem] }}</span>
        <span
          v-else-if="results[typeItem]"
          class="test-status success"
        >✅</span>
        <span
          v-else
          class="test-status"
        >⏳</span>
      </div>
    </div>

    <div
      v-if="currentType"
      class="test-panel"
    >
      <h2>{{ t('test.currentTest', { type: currentType }) }}</h2>
      <GenericConfig
        :key="currentType"
        :graphic-type="currentType"
        :graphic-properties="mockProperties"
        @update-graphic-properties="onUpdate"
      />

      <h3>{{ t('test.updateCount', { count: updateCount }) }}</h3>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTheme, ConfigTemplateManager, i18n } from '@scada-editor/core';
import GenericConfig from '../common/GenericConfig.vue';

const { t } = i18n.global;

const { themeStyles } = useTheme();

const autoTest = ref(false);
const currentType = ref('');
const errors = ref<Record<string, string>>({});
const results = ref<Record<string, boolean>>({});
const updateCount = ref(0);

const mockProperties: any = {
  config: {
    id: 'test-001',
    type: '',
    name: '测试组件',
    geometry: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scale: 1 },
    style: {
      backgroundColor: '#ffffff',
      color: '#000000',
    },
    customProps: {},
  },
  animation: {
    enabled: false,
    type: 'fade',
    duration: 0.5,
    delay: 0,
    easing: 'ease',
    properties: {},
  },
  dataSource: {
    type: '',
    target: null,
    payload: {},
    timestamp: Date.now(),
    validation: {},
    enabled: false,
    dataSource: '',
    dataField: '',
    displayField: '',
    dataMapping: [],
  },
  events: {
    type: '',
    payload: {},
    timestamp: Date.now(),
    eventHandlers: {},
  },
};

const registeredTypes = computed(() => {
  const templates = ConfigTemplateManager.getAllPluginSchemas();
  return Object.keys(templates);
});

function onUpdate() {
  updateCount.value++;
}
</script>

<style scoped>
.test-page {
  padding: 20px;
  max-width: 400px;
  margin: 0 auto;
}

h1 { font-size: 18px; margin-bottom: 8px; }
h2 { font-size: 14px; margin-top: 16px; }
h3 { font-size: 12px; color: var(--text-secondary); }

.test-info {
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 12px;
}

.test-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.type-select {
  flex: 1;
  padding: 4px 8px;
}

.test-results {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.test-item {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.test-item:hover {
  border-color: var(--primary);
}

.test-item.active {
  background: var(--primary-light, #e8e8ff);
  border-color: var(--primary);
}

.test-item.error {
  border-color: #e74c3c;
  background: #fdecea;
}

.test-item.success {
  border-color: #27ae60;
  background: #eafaf1;
}

.test-status.success { color: #27ae60; }
.test-status.error { color: #e74c3c; }
.test-status { color: var(--text-tertiary); }

.test-panel {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
}
</style>