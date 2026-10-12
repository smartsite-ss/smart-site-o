<template>
  <div class="tab-content">
    <div class="property-group">
      <label>{{ $t('dataPanel.fieldMapping') }}</label>
      <div class="property-item">
        <span>propertyPath:</span>
        <input
          v-model="props.graphicProperties.dataSource.propertyPath"
          type="text"
          placeholder="configuration.itemStyle.color"
          @input="updateGraphicProperties"
        >
      </div>
      <div class="property-item">
        <span>bindingMode:</span>
        <select
          v-model="props.graphicProperties.dataSource.bindingMode"
          @change="updateGraphicProperties"
        >
          <option value="simple">
            simple
          </option>
          <option value="expression">
            expression
          </option>
        </select>
      </div>
      <div
        v-if="props.graphicProperties.dataSource.bindingMode === 'expression'"
        class="property-item"
      >
        <span>expression:</span>
        <input
          v-model="props.graphicProperties.dataSource.expression"
          type="text"
          placeholder="val > 80 ? 1 : 0"
          @input="updateGraphicProperties"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGraphicStore } from '@scada-editor/core';

const props = defineProps<{
  graphicProperties: any;
}>();

const emit = defineEmits<{
  updateGraphicProperties: [];
}>();

const graphicStore = useGraphicStore();
const updateGraphic = (graphicStore as any).updateGraphic;

const updateGraphicProperties = () => {
  if (props.graphicProperties) {
    const updatedProperties = {
      config: {
        ...props.graphicProperties.config,
        updatedAt: Date.now(),
      },
      dataSource: { ...props.graphicProperties.dataSource },
    };
    updateGraphic(props.graphicProperties.config.id, updatedProperties);
    emit('updateGraphicProperties');
  }
};
</script>

<style scoped>
@import '../../../../panels/styles/property-panel.scss';

.property-item span {
  width: 120px;
}
</style>