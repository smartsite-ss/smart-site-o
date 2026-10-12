<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { fusePropertySchema } from './fusePropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  fusePropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="fusePropertySchema"
    :values="values"
  />
</template>