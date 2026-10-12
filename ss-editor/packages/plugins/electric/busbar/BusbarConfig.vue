<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { busbarPropertySchema } from './busbarPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  busbarPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="busbarPropertySchema"
    :values="values"
  />
</template>