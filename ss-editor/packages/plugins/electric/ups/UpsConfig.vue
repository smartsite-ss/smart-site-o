<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { upsPropertySchema } from './upsPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  upsPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="upsPropertySchema"
    :values="values"
  />
</template>


