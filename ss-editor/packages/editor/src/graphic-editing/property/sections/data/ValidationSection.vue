<template>
  <div class="tab-content">
    <div class="property-group">
      <label>{{ $t('dataPanel.dataValidation') }}</label>
      <div class="property-item">
        <span>required:</span>
        <input
          v-model="props.graphicProperties.dataSource.validation.required"
          type="checkbox"
          @change="updateGraphicProperties"
        >
      </div>
      <div class="property-item">
        <span>min:</span>
        <input
          v-model.number="props.graphicProperties.dataSource.validation.min"
          type="number"
          @input="updateGraphicProperties"
        >
      </div>
      <div class="property-item">
        <span>max:</span>
        <input
          v-model.number="props.graphicProperties.dataSource.validation.max"
          type="number"
          @input="updateGraphicProperties"
        >
      </div>
      <div class="property-item">
        <span>pattern:</span>
        <input
          v-model="props.graphicProperties.dataSource.validation.pattern"
          type="text"
          @input="updateGraphicProperties"
        >
      </div>
      <div class="property-item">
        <span>message:</span>
        <input
          v-model="props.graphicProperties.dataSource.validation.message"
          type="text"
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