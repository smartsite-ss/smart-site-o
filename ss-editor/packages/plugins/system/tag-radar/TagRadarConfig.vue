<template>
  <div class="tag-radar-config">
    <TagBindingEditor
      mode="multiple"
      :project-id="projectId"
      :tags="tags"
      @add="addVariable"
      @remove="removeTag"
    />

    <PluginConfigPanel
      :schema="tagRadarPropertySchema"
      :values="values"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { TagBindingEditor, useTagBinding } from '@scada-editor/system';
import { tagRadarPropertySchema } from './tagRadarPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), tagRadarPropertySchema, emit);

const { projectId, tags, addVariable, removeTag } = useTagBinding(
  props,
  () => emit('updateGraphicProperties'),
  { mode: 'array-multiple' },
);
</script>

<style scoped>
.tag-radar-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
