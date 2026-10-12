<template>
  <div
    v-if="visible"
    class="stat-panel"
    @click.stop
  >
    <div class="panel-header">
      <span class="panel-title">
        <span class="panel-icon">📈</span>
        {{ t('statisticsPanel.title') }}
      </span>
      <button
        class="btn-close"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <div class="panel-body">
      <!-- 页面信息 -->
      <div class="stat-section">
        <div class="section-title">
          {{ t('statisticsPanel.pageInfo') }}
        </div>
        <div
          v-if="pageName"
          class="stat-row"
        >
          <span class="stat-label">{{ t('statisticsPanel.name') }}:</span>
          <span class="stat-value">{{ pageName }}</span>
        </div>
        <div
          v-if="pageSize"
          class="stat-row"
        >
          <span class="stat-label">{{ t('statisticsPanel.size') }}:</span>
          <span class="stat-value">{{ pageSize }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">{{ t('statisticsPanel.fitMode') }}:</span>
          <span class="stat-value">{{ fitMode }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">{{ t('statisticsPanel.background') }}:</span>
          <span class="stat-value">{{ backgroundType }}</span>
        </div>
      </div>

      <!-- 图元统计 -->
      <div class="stat-section">
        <div class="section-title">
          {{ t('statisticsPanel.graphicStats') }}
        </div>
        <div class="stat-row">
          <span class="stat-label">{{ t('statisticsPanel.total') }}:</span>
          <span class="stat-value highlight">{{ totalGraphics }}</span>
        </div>
        <div
          v-if="graphicByType.length > 0"
          class="type-table"
        >
          <div
            v-for="item in graphicByType"
            :key="item.type"
            class="type-row"
          >
            <span class="type-name">{{ item.type }}</span>
            <span class="type-count">{{ item.count }}</span>
          </div>
        </div>
        <div
          v-else
          class="stat-row"
        >
          <span class="stat-value dim">{{ t('statisticsPanel.noGraphics') }}</span>
        </div>
        <div
          v-if="totalGraphics > 0"
          class="stat-row"
        >
          <span class="stat-label">{{ t('statisticsPanel.visible') }}:</span>
          <span class="stat-value">{{ visibleGraphics }}</span>
          <span class="stat-sep">|</span>
          <span class="stat-label">{{ t('statisticsPanel.locked') }}:</span>
          <span class="stat-value">{{ lockedGraphics }}</span>
        </div>
        <div
          v-if="zIndexRange"
          class="stat-row"
        >
          <span class="stat-label">{{ t('statisticsPanel.zIndex') }}:</span>
          <span class="stat-value">{{ zIndexRange }}</span>
        </div>
      </div>

      <!-- 数据源统计 -->
      <div class="stat-section">
        <div class="section-title">
          {{ t('statisticsPanel.dataSource') }}
        </div>
        <div class="stat-row">
          <span class="stat-label">{{ t('statisticsPanel.sources') }}:</span>
          <span class="stat-value">{{ dataSourceCount }}</span>
          <span class="stat-sep">|</span>
          <span class="stat-label">{{ t('statisticsPanel.variables') }}:</span>
          <span class="stat-value">{{ variableCount }}</span>
        </div>
        <div
          v-if="activeDataSourceCount > 0"
          class="stat-row"
        >
          <span class="stat-label">{{ t('statisticsPanel.active') }}:</span>
          <span class="stat-value">{{ activeDataSourceCount }}</span>
        </div>
      </div>

      <!-- 定时任务统计 -->
      <div class="stat-section">
        <div class="section-title">
          {{ t('statisticsPanel.timers') }}
        </div>
        <div class="stat-row">
          <span class="stat-label">{{ t('statisticsPanel.total') }}:</span>
          <span class="stat-value">{{ timerCount }}</span>
          <span
            v-if="activeTimerCount > 0"
            class="stat-sep"
          >|</span>
          <span
            v-if="activeTimerCount > 0"
            class="stat-label"
          >{{ t('statisticsPanel.enabled') }}:</span>
          <span
            v-if="activeTimerCount > 0"
            class="stat-value"
          >{{ activeTimerCount }}</span>
        </div>
      </div>

      <!-- 组合/辅助统计 -->
      <div class="stat-section">
        <div class="section-title">
          {{ t('statisticsPanel.other') }}
        </div>
        <div class="stat-row">
          <span class="stat-label">{{ t('statisticsPanel.groups') }}:</span>
          <span class="stat-value">{{ groupCount }}</span>
          <span class="stat-sep">|</span>
          <span class="stat-label">{{ t('statisticsPanel.guides') }}:</span>
          <span class="stat-value">{{ guideCount }}</span>
        </div>
        <div
          v-if="historyCount > 0"
          class="stat-row"
        >
          <span class="stat-label">{{ t('statisticsPanel.history') }}:</span>
          <span class="stat-value">{{ historyCount }}</span>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <button
        class="btn-action"
        @click="refreshStats"
      >
        {{ t('statisticsPanel.refresh') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { usePageStore, i18n } from '@scada-editor/core';

const { t } = i18n.global;
const pageStore = usePageStore();

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['close']);

const pageName = ref('');
const pageSize = ref('');
const fitMode = ref('');
const backgroundType = ref('');
const totalGraphics = ref(0);
const graphicByType = ref<Array<{ type: string; count: number }>>([]);
const visibleGraphics = ref(0);
const lockedGraphics = ref(0);
const zIndexRange = ref('');
const dataSourceCount = ref(0);
const variableCount = ref(0);
const activeDataSourceCount = ref(0);
const timerCount = ref(0);
const activeTimerCount = ref(0);
const groupCount = ref(0);
const guideCount = ref(0);
const historyCount = ref(0);

function refreshStats() {
  const currentPage = pageStore.currentPage as any;
  if (!currentPage) {
    resetStats();
    return;
  }

  pageName.value = currentPage.name || '';
  pageSize.value = `${currentPage.width} × ${currentPage.height} px`;
  fitMode.value = currentPage.fitMode || 'auto';
  backgroundType.value = currentPage.backgroundImage
    ? t('statisticsPanel.image')
    : t('statisticsPanel.color');

  const graphics = currentPage.graphics || [];
  totalGraphics.value = graphics.length;

  const typeMap: Record<string, number> = {};
  for (const g of graphics) {
    const typeName = g.pluginId || g.type || 'unknown';
    typeMap[typeName] = (typeMap[typeName] || 0) + 1;
  }
  graphicByType.value = Object.entries(typeMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  visibleGraphics.value = graphics.filter((g: any) => g.config?.visible !== false).length;
  lockedGraphics.value = graphics.filter((g: any) => g.config?.locked === true).length;

  if (graphics.length > 0) {
    const zIndices = graphics.map((g: any) => g.config?.zIndex ?? 0);
    const minZ = Math.min(...zIndices);
    const maxZ = Math.max(...zIndices);
    zIndexRange.value = minZ === maxZ ? `${minZ}` : `${minZ} ~ ${maxZ}`;
  } else {
    zIndexRange.value = '';
  }

  const ds = currentPage.dataSource;
  if (ds) {
    dataSourceCount.value = ds.dataSources?.length || 0;
    variableCount.value = ds.variables?.length || 0;
    activeDataSourceCount.value = (ds.dataSources || []).filter((d: any) => d.enabled !== false).length;
  } else {
    dataSourceCount.value = 0;
    variableCount.value = 0;
    activeDataSourceCount.value = 0;
  }

  if (currentPage.getAllTimers) {
    const timers = currentPage.getAllTimers();
    timerCount.value = timers.length;
    activeTimerCount.value = timers.filter((t: any) => t.enabled !== false).length;
  } else if (currentPage.timerManager?.getAllTimers) {
    const timers = currentPage.timerManager.getAllTimers();
    timerCount.value = timers.length;
    activeTimerCount.value = timers.filter((t: any) => t.enabled !== false).length;
  } else {
    timerCount.value = 0;
    activeTimerCount.value = 0;
  }

  if (currentPage.getGroupManager) {
    groupCount.value = currentPage.getGroupManager().getAllGroups().length;
  } else if (currentPage.groupManager?.getAllGroups) {
    groupCount.value = currentPage.groupManager.getAllGroups().length;
  } else {
    groupCount.value = 0;
  }

  guideCount.value = currentPage.guides?.length || 0;

  if (currentPage.historyManager?.getHistoryCount) {
    historyCount.value = currentPage.historyManager.getHistoryCount();
  } else {
    historyCount.value = 0;
  }
}

function resetStats() {
  pageName.value = '';
  pageSize.value = '';
  fitMode.value = '';
  backgroundType.value = '';
  totalGraphics.value = 0;
  graphicByType.value = [];
  visibleGraphics.value = 0;
  lockedGraphics.value = 0;
  zIndexRange.value = '';
  dataSourceCount.value = 0;
  variableCount.value = 0;
  activeDataSourceCount.value = 0;
  timerCount.value = 0;
  activeTimerCount.value = 0;
  groupCount.value = 0;
  guideCount.value = 0;
  historyCount.value = 0;
}

watch(
  () => props.visible,
  (vis) => {
    if (vis) {
      refreshStats();
    }
  }
);
</script>

<style scoped>
.stat-panel {
  position: fixed;
  top: 60px;
  right: 20px;
  width: 340px;
  max-height: 80vh;
  overflow-y: auto;
  background: var(--surface, #18181c);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  box-shadow: var(--shadow-modal, 0 8px 40px rgba(0, 0, 0, 0.3));
  z-index: 9999;
  color: var(--text, #e0e0e0);
  font-size: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  background: var(--header-background, rgba(255, 255, 255, 0.03));
  border-radius: 12px 12px 0 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #ffffff);
}

.panel-icon {
  font-size: 16px;
}

.btn-close {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  background: var(--surface, #18181c);
  color: var(--text-secondary, #999);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--elevated, rgba(255, 255, 255, 0.08));
  color: var(--text, #fff);
}

.panel-body {
  padding: 14px 16px;
}

.stat-section {
  margin-bottom: 16px;
}

.stat-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 11px;
  color: var(--text-secondary, #888);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  padding-bottom: 4px;
}

.stat-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 2px;
  align-items: center;
}

.stat-label {
  color: var(--text-secondary, #888);
}

.stat-value {
  color: var(--text, #ccc);
}

.stat-sep {
  color: var(--border, rgba(255, 255, 255, 0.15));
  margin: 0 4px;
}

.stat-value.highlight {
  color: var(--primary, #63e2b7);
  font-weight: 600;
  font-size: 14px;
}

.stat-value.dim {
  color: var(--text-secondary, #666);
  font-style: italic;
}

.type-table {
  margin: 4px 0 6px;
  padding: 4px 8px;
  background: var(--elevated, rgba(255, 255, 255, 0.04));
  border-radius: 4px;
}

.type-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}

.type-name {
  color: var(--text, #bbb);
  text-transform: capitalize;
}

.type-count {
  color: var(--primary, #63e2b7);
  font-weight: 600;
}

.panel-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}

.btn-action {
  width: 100%;
  padding: 7px 0;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  background: var(--surface, #18181c);
  color: var(--text-secondary, #ccc);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: var(--elevated, rgba(255, 255, 255, 0.08));
  color: var(--text, #fff);
  border-color: var(--primary, #63e2b7);
}
</style>