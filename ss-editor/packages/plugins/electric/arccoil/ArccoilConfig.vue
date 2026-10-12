<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { arccoilPropertySchema } from './arccoilPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  arccoilPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="arccoilPropertySchema"
    :values="values"
  />
</template>