<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { border01PropertySchema } from './border01PropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  border01PropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="border01PropertySchema"
    :values="values"
  />
</template>