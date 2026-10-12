<template>
  <div class="faultlamp-config">
    <TagBindingEditor
      mode="flat"
      :project-id="projectId"
      :current="current"
      @add="addVariable"
      @clear="clearBind"
    />

    <PluginConfigPanel
      :schema="faultlampPropertySchema"
      :values="values"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { TagBindingEditor, useTagBinding } from '@scada-editor/system';
import { faultlampPropertySchema } from './faultlampPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), faultlampPropertySchema, emit);

const { projectId, current, addVariable, clearBind } = useTagBinding(
  props,
  () => emit('updateGraphicProperties'),
  { mode: 'flat' },
);
</script>

<style scoped>
.faultlamp-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>