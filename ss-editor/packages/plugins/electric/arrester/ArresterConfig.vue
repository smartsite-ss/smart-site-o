<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { arresterPropertySchema } from './arresterPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  arresterPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="arresterPropertySchema"
    :values="values"
  />
</template>