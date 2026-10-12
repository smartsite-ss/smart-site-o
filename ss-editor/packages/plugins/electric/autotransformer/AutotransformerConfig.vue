<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { autotransformerPropertySchema } from './autotransformerPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  autotransformerPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="autotransformerPropertySchema"
    :values="values"
  />
</template>