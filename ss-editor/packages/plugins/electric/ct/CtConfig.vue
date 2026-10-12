<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { ctPropertySchema } from './ctPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  ctPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="ctPropertySchema"
    :values="values"
  />
</template>