<template>
  <PluginConfigPanel
    :schema="multiChartPropertySchema"
    :values="values"
  />
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { multiChartPropertySchema } from './multiChartPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), multiChartPropertySchema, emit);
</script>