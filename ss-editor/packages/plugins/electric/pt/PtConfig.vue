<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { ptPropertySchema } from './ptPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  ptPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="ptPropertySchema"
    :values="values"
  />
</template>


