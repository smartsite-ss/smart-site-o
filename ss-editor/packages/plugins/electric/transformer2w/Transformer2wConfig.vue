<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { transformer2wPropertySchema } from './transformer2wPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  transformer2wPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="transformer2wPropertySchema"
    :values="values"
  />
</template>


