<template>
  <div class="event-panel-config">
    <!-- 1. 项目与筛选 -->
    <div class="filter-section">
      <div class="filter-item">
        <label class="filter-label">{{ $t('eventPanel.config.project') }}</label>
        <select
          :value="projectId"
          class="filter-select"
          @change="writeCustomProps({ projectId: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">{{ $t('eventPanel.config.allProjects') }}</option>
          <option v-for="p in projectStore.projects" :key="p.projectId" :value="p.projectId">
            {{ p.projectName }}
          </option>
        </select>
      </div>

      <div class="filter-item">
        <label class="filter-label">{{ $t('eventPanel.config.eventType') }}</label>
        <select
          :value="eventType"
          class="filter-select"
          @change="writeCustomProps({ eventType: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">{{ $t('eventPanel.config.allEventTypes') }}</option>
          <optgroup v-for="group in EVENT_TYPE_GROUPS" :key="group.id" :label="$t(group.labelKey)">
            <option v-for="type in group.items" :key="type" :value="type">{{ type }}</option>
          </optgroup>
        </select>
      </div>

      <div class="filter-item">
        <label class="filter-label">{{ $t('eventPanel.config.status') }}</label>
        <select
          :value="status"
          class="filter-select"
          @change="writeCustomProps({ status: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">{{ $t('eventPanel.config.allStatus') }}</option>
          <option v-for="s in EVENT_STATUS_LIST" :key="s" :value="s">
            {{ $t(`eventPanel.status.${s}`) }}
          </option>
        </select>
      </div>
    </div>

    <!-- 2. 列表行为 / 列显隐 / 排版 / 容器样式 -->
    <PluginConfigPanel
      :schema="eventPanelPropertySchema"
      :values="values"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { useProjectStore } from '@scada-editor/system';
import { eventPanelPropertySchema } from './eventPanelPropertySchema';
import { EVENT_TYPE_GROUPS, EVENT_STATUS_LIST } from './eventPanelUtils';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), eventPanelPropertySchema, emit);

const projectStore = useProjectStore();

const customProps = computed(() => props.graphicProperties?.config?.customProps ?? {});
const projectId = computed(() => customProps.value.projectId ?? '');
const eventType = computed(() => customProps.value.eventType ?? '');
const status = computed(() => customProps.value.status ?? '');

function writeCustomProps(fields: Record<string, any>) {
  const gp = props.graphicProperties as any;
  if (!gp?.config) return;
  if (!gp.config.customProps) gp.config.customProps = {};
  Object.assign(gp.config.customProps, fields);
  emit('updateGraphicProperties');
}

onMounted(() => {
  if (!projectStore.projects.length) {
    projectStore.fetchProjects(1, 1000, undefined, false);
  }
});
</script>

<style scoped>
.event-panel-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--border, #dddddd);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-select {
  height: 28px;
  padding: 0 6px;
  font-size: 12px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text);
  box-sizing: border-box;
}
</style>
