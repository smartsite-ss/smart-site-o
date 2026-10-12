<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { transformer3wPropertySchema } from './transformer3wPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(
  toRef(props, 'graphicProperties'),
  transformer3wPropertySchema,
  emit,
);
</script>

<template>
  <PluginConfigPanel
    :schema="transformer3wPropertySchema"
    :values="values"
  />
</template>


