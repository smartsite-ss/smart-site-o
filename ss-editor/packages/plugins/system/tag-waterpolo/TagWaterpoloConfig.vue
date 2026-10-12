<template>
  <div class="tag-waterpolo-config">
    <TagBindingEditor
      mode="single"
      :project-id="projectId"
      :tags="tags"
      @add="addVariable"
      @remove="removeTag"
    />

    <PluginConfigPanel
      :schema="tagWaterpoloPropertySchema"
      :values="values"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { TagBindingEditor, useTagBinding } from '@scada-editor/system';
import { tagWaterpoloPropertySchema } from './tagWaterpoloPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), tagWaterpoloPropertySchema, emit);

const { projectId, tags, addVariable, removeTag } = useTagBinding(
  props,
  () => emit('updateGraphicProperties'),
  { mode: 'array-single' },
);
</script>

<style scoped>
.tag-waterpolo-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
