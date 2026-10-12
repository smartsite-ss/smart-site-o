<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { svgPipePropertySchema } from './svgPipePropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), svgPipePropertySchema, emit);
</script>

<template>
  <PluginConfigPanel
    :schema="svgPipePropertySchema"
    :values="values"
  />
</template>