<template>
  <div class="chart-bar-config">
    <div class="ds-section">
      <div class="section-title">{{ $t('chartBar.config.dataSource') }}</div>
      <ChartDataSourceEditor
        :model-value="dataSource"
        @update:model-value="setDataSource"
      />
    </div>
    <PluginConfigPanel
      :schema="chartBarPropertySchema"
      :values="values"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import {
  PluginConfigPanel,
  ChartDataSourceEditor,
  type ChartDataSourceConfig,
} from '@scada-editor/shared';
import { chartBarPropertySchema } from './chartBarPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), chartBarPropertySchema, emit);

const dataSource = computed<ChartDataSourceConfig>(() => {
  const raw = props.graphicProperties?.config?.customProps?.dataSource;
  if (raw && typeof raw === 'object' && raw.type) return raw;
  return { type: 'static', staticConfig: { dimensions: ['name', 'value'], source: [] } };
});

function setDataSource(next: ChartDataSourceConfig) {
  const gp = props.graphicProperties as any;
  if (!gp?.config) return;
  if (!gp.config.customProps) gp.config.customProps = {};
  gp.config.customProps.dataSource = next;
  emit('updateGraphicProperties');
}
</script>

<style scoped>
.chart-bar-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ds-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--border, #dddddd);
}

.section-title {
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
