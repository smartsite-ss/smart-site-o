<template>
  <div class="tab-content">
    <div class="property-group">
      <label>{{ $t('dataPanel.formatting') }}</label>
      <div class="property-item">
        <span>dataFormat:</span>
        <select
          v-model="props.graphicProperties.dataSource.dataFormat"
          @change="updateGraphicProperties"
        >
          <option value="">
            {{ $t('dataPanel.empty') }}
          </option>
          <option value="number">
            number
          </option>
          <option value="currency">
            currency
          </option>
          <option value="percent">
            percent
          </option>
          <option value="decimal_1">
            decimal_1
          </option>
          <option value="decimal_2">
            decimal_2
          </option>
        </select>
      </div>

      <div
        v-if="props.graphicProperties.dataSource.dataMapping"
        class="property-subgroup"
      >
        <label>dataMapping</label>
        <div
          v-for="(mapping, index) in props.graphicProperties.dataSource.dataMapping"
          :key="index"
          class="mapping-item"
        >
          <input
            v-model="mapping.value"
            type="text"
            placeholder="value"
            @input="updateGraphicProperties"
          >
          <input
            v-model="mapping.display"
            type="text"
            placeholder="display"
            @input="updateGraphicProperties"
          >
          <button
            type="button"
            @click="removeDataMapping(index as number)"
          >
            {{ $t('dataPanel.remove') }}
          </button>
        </div>
        <button
          type="button"
          @click="addDataMapping"
        >
          {{ $t('dataPanel.addMapping') }}
        </button>
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

const addDataMapping = () => {
  if (props.graphicProperties && props.graphicProperties.dataSource) {
    if (!props.graphicProperties.dataSource.dataMapping) {
      props.graphicProperties.dataSource.dataMapping = [];
    }
    props.graphicProperties.dataSource.dataMapping.push({
      value: '',
      display: '',
    });
    updateGraphicProperties();
  }
};

const removeDataMapping = (index: number) => {
  if (props.graphicProperties && props.graphicProperties.dataSource && props.graphicProperties.dataSource.dataMapping) {
    props.graphicProperties.dataSource.dataMapping.splice(index, 1);
    updateGraphicProperties();
  }
};
</script>

<style scoped>
@import '../../../../panels/styles/property-panel.scss';

.property-item span {
  width: 120px;
}

.mapping-item {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.mapping-item input {
  flex: 1;
}
</style>