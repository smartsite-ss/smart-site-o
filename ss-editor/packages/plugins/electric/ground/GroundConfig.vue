<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { groundPropertySchema } from './groundPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  groundPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="groundPropertySchema"
    :values="values"
  />
</template>


