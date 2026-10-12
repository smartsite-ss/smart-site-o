<template>
  <div class="daozha-config">
    <TagBindingEditor
      mode="flat"
      :project-id="projectId"
      :current="current"
      @add="addVariable"
      @clear="clearBind"
    />

    <PluginConfigPanel
      :schema="daozhaPropertySchema"
      :values="values"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { TagBindingEditor, useTagBinding } from '@scada-editor/system';
import { daozhaPropertySchema } from './daozhaPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), daozhaPropertySchema, emit);

const { projectId, current, addVariable, clearBind } = useTagBinding(
  props,
  () => emit('updateGraphicProperties'),
  { mode: 'flat' },
);
</script>

<style scoped>
.daozha-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
