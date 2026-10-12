<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { cableheadPropertySchema } from './cableheadPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  cableheadPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="cableheadPropertySchema"
    :values="values"
  />
</template>