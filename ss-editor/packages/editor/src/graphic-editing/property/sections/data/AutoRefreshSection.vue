<template>
  <div class="tab-content">
    <div
      v-if="dataSourceType !== 'static'"
      class="property-group"
    >
      <label>{{ $t('dataPanel.autoRefresh') }}</label>
      <div class="property-item">
        <span>{{ $t('dataPanel.enableAutoRefresh') }}:</span>
        <input
          v-model="openRefresh"
          type="checkbox"
          @change="updateGraphicProperties"
        >
      </div>
      <template v-if="openRefresh">
        <div class="property-item">
          <span>{{ $t('dataPanel.refreshIntervalSeconds') }}:</span>
          <input
            v-model.number="refreshInterval"
            type="number"
            min="1"
            max="3600"
            step="5"
            @input="updateGraphicProperties"
          >
        </div>
        <div class="quick-buttons">
          <button
            type="button"
            class="quick-btn"
            :class="{ active: refreshInterval === 15 }"
            @click="setRefreshInterval(15)"
          >
            [15s]
          </button>
          <button
            type="button"
            class="quick-btn"
            :class="{ active: refreshInterval === 30 }"
            @click="setRefreshInterval(30)"
          >
            [30s]
          </button>
          <button
            type="button"
            class="quick-btn"
            :class="{ active: refreshInterval === 60 }"
            @click="setRefreshInterval(60)"
          >
            [60s]
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGraphicStore } from '@scada-editor/core';

const props = defineProps<{
  graphicProperties: any;
  dataSourceType?: string;
}>();

const emit = defineEmits<{
  updateGraphicProperties: [];
}>();

const graphicStore = useGraphicStore();
const updateGraphic = (graphicStore as any).updateGraphic;

const openRefresh = ref(props.graphicProperties?.openRefresh || false);
const refreshInterval = ref(props.graphicProperties?.refreshInterval || 30);

const setRefreshInterval = (seconds: number) => {
  refreshInterval.value = seconds;
  updateGraphicProperties();
};

const updateGraphicProperties = () => {
  if (props.graphicProperties) {
    const updatedProperties = {
      dataSource: {
        ...props.graphicProperties.dataSource,
        openRefresh: openRefresh.value,
        refreshInterval: refreshInterval.value,
        timestamp: Date.now(),
      },
    };
    updateGraphic(props.graphicProperties.config.id, updatedProperties);
    emit('updateGraphicProperties');
  }
};
</script>

<style scoped>
@import '../../../../panels/styles/property-panel.scss';

.quick-buttons {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.quick-btn {
  padding: 2px 10px;
  font-size: 11px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 3px;
  cursor: pointer;
  color: var(--text-secondary);
}

.quick-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.quick-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
</style>