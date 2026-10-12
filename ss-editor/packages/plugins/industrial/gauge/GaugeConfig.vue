<template>
  <div class="gauge-config">
    <TagBindingEditor
      mode="flat"
      :project-id="projectId"
      :current="current"
      @add="addVariable"
      @clear="clearBind"
    />

    <PluginConfigPanel
      :schema="gaugePropertySchema"
      :values="values"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { TagBindingEditor, useTagBinding } from '@scada-editor/system';
import { gaugePropertySchema } from './gaugePropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), gaugePropertySchema, emit);

const { projectId, current, addVariable, clearBind } = useTagBinding(
  props,
  () => emit('updateGraphicProperties'),
  {
    mode: 'flat',
    extraFields: (variable) => ({ unit: variable.unit, decimalPlaces: variable.decimalPlaces ?? 2 }),
  },
);
</script>

<style scoped>
.gauge-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
