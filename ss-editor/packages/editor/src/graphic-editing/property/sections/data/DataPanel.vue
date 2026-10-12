<template>
  <div class="data-panel">
    <div class="graphic-info-bar">
      <div class="graphic-info-row">
        <span class="graphic-label">{{ $t('dataPanel.graphicId') }}:</span>
        <span
          class="graphic-value graphic-id-text"
          :title="graphicId || ''"
        >{{ graphicId || '-' }}</span>
        <button
          v-if="graphicId"
          type="button"
          class="copy-btn-inline"
          @click="copyToClipboard(graphicId)"
        >
          {{ copiedId ? '已复制' : '复制' }}
        </button>
      </div>
      <div class="graphic-info-row">
        <span class="graphic-label">{{ $t('dataPanel.graphicName') }}:</span>
        <span class="graphic-value">{{ graphicName || '-' }}</span>
        <button
          v-if="graphicName"
          type="button"
          class="copy-btn-inline"
          @click="copyToClipboard(graphicName)"
        />
        <span class="type-tag">
          {{ graphicType || '-' }}
        </span>
      </div>
    </div>

    <div class="overlay-toggle-bar">
      <label class="overlay-toggle-label">
        <input
          type="checkbox"
          class="overlay-toggle-checkbox"
          :checked="showValueOverlay"
          @change="onToggleValueOverlay(($event.target as HTMLInputElement).checked)"
        >
        <span>{{ $t('dataPanel.showValueOverlay') || '画布显示原值' }}</span>
      </label>
    </div>

    <div class="steps-panel">
      <div class="property-group">
        <div
          class="group-label"
          @click="toggleGroup('step-source')"
        >
          <div class="step-header">
            <span class="step-badge badge-primary">1</span>
            <span class="step-title">{{ $t('dataPanel.stepSource') }}</span>
          </div>
          <span
            class="status-tag"
            :class="hasBinding ? 'status-success' : 'status-default'"
          >
            {{ hasBinding ? $t('dataPanel.statusBound') : $t('dataPanel.statusUnconfigured') }}
          </span>
          <span :class="['collapse-icon', { expanded: expandedGroups['step-source'] }]" />
        </div>
        <div
          v-show="expandedGroups['step-source']"
          class="group-body"
        >
          <div class="step-content">
            <BindingPanel
              :graphic-properties="props.graphicProperties"
              @change-binding="handleChangeBinding"
              @view-data-source="openSourceConfig"
              @manual-fetch="onManualFetch"
              @select-variable="handleChangeBinding"
              @create-data-source="handleCreateDataSource"
            />

            <div
              v-if="hasBinding && bindableFields.length > 0"
              class="property-selector-row"
            >
              <label class="property-selector-label">绑定属性</label>
              <select
                class="property-selector-select"
                :value="currentPropertyPath"
                @change="onPropertyPathChange(($event.target as HTMLSelectElement).value)"
              >
                <option
                  v-for="field in bindableFields"
                  :key="field.path"
                  :value="field.path"
                >
                  {{ field.label }}（{{ field.fieldName }}）
                </option>
                <option
                  v-if="!bindableFields.some((f) => f.path === currentPropertyPath)"
                  :value="currentPropertyPath"
                >
                  当前：{{ currentPropertyPath }}
                </option>
              </select>
            </div>

            <div class="step-divider" />

            <FetchPanel
              :data-source-id="currentBinding?.dataSourceId"
              @fetch="onManualFetch"
            />
          </div>
        </div>
      </div>

      <div
        class="property-group"
        :class="{ 'group-disabled': !hasBinding }"
      >
        <div
          class="group-label"
          :class="{ 'group-locked': !hasBinding }"
          @click="hasBinding && toggleGroup('step-filter')"
        >
          <div class="step-header">
            <span class="step-badge badge-info">2</span>
            <span class="step-title">{{ $t('dataPanel.stepFilter') }}</span>
            <span
              v-if="!hasBinding"
              class="lock-icon"
            >🔒</span>
            <span
              v-else
              class="lock-icon unlocked"
            >🔓</span>
          </div>
          <span
            class="status-tag"
            :class="hasFilterScript ? 'status-success' : 'status-default'"
          >
            {{ hasFilterScript ? $t('dataPanel.statusConfigured') : $t('dataPanel.statusOptional') }}
          </span>
          <span :class="['collapse-icon', { expanded: expandedGroups['step-filter'] }]" />
        </div>
        <div
          v-show="hasBinding && expandedGroups['step-filter']"
          class="group-body"
        >
          <div class="step-content">
            <div class="filter-hint">
              <span class="text-secondary">{{ $t('dataPanel.filterHint') }}</span>
            </div>
            <FilterScriptEditor
              v-model="filterScript"
              :fetch-result="currentFetchResult"
              class="filter-editor-inline"
            />
          </div>
        </div>
      </div>

      <div
        class="property-group"
        :class="{ 'group-disabled': !hasFilterScript }"
      >
        <div
          class="group-label"
          :class="{ 'group-locked': !hasFilterScript }"
          @click="hasFilterScript && toggleGroup('step-driver')"
        >
          <div class="step-header">
            <span class="step-badge badge-warning">3</span>
            <span class="step-title">{{ $t('dataPanel.stepDriver') }}</span>
            <span
              v-if="!hasFilterScript"
              class="lock-icon"
            >🔒</span>
            <span
              v-else
              class="lock-icon unlocked"
            >🔓</span>
          </div>
          <span
            class="status-tag"
            :class="hasDriverScript ? 'status-success' : 'status-default'"
          >
            {{ hasDriverScript ? $t('dataPanel.statusConfigured') : $t('dataPanel.statusOptional') }}
          </span>
          <span :class="['collapse-icon', { expanded: expandedGroups['step-driver'] }]" />
        </div>
        <div
          v-show="hasFilterScript && expandedGroups['step-driver']"
          class="group-body"
        >
          <div class="step-content">
            <div class="driver-hint">
              <span class="text-secondary">{{ $t('dataPanel.driverHint') }}</span>
            </div>
            <DriverScriptEditor
              v-model="driverScript"
              class="driver-editor-inline"
            />
          </div>
        </div>
      </div>
    </div>

    <DataSourceConfigDialog
      v-model:visible="showSourceConfig"
      :project-id="projectId"
      @saved="onSourceConfigSaved"
    />

    <VariableSelector
      v-model:visible="showVariableSelector"
      :current-data-source-id="currentBinding?.dataSourceId"
      @selected="onDataSourceSelected"
      @open-source-config="onOpenSourceConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n, usePageStore, BindingManager, ConfigTemplateManager, extractTagIds } from '@scada-editor/core';
import { usePageDataSourceStore, useWsStore } from '../../../../../../system/src/stores';
import BindingPanel from './BindingPanel.vue';
import DataSourceConfigDialog from './DataSourceConfigDialog.vue';
import FilterScriptEditor from './filter/FilterScriptEditor.vue';
import DriverScriptEditor from './DriverScriptEditor.vue';
import FetchPanel from './FetchPanel.vue';
import VariableSelector from './VariableSelector.vue';

const props = defineProps<{
  graphicProperties: any;
}>();

const _emit = defineEmits<{
  updateGraphicProperties: [];
}>();

useI18n();

const pageStore = usePageStore();
const pageDsStore = usePageDataSourceStore();
const wsStore = useWsStore();

const projectId = ref('default');
const showSourceConfig = ref(false);
const showVariableSelector = ref(false);
const filterScript = ref('');
const driverScript = ref('');
const copiedId = ref(false);

const expandedGroups = ref<Record<string, boolean>>({
  'step-source': true,
});

function toggleGroup(name: string) {
  expandedGroups.value[name] = !expandedGroups.value[name];
}

const graphicId = computed(() => props.graphicProperties?.config?.id ?? '');
const graphicName = computed(() => props.graphicProperties?.config?.name ?? '');
const graphicType = computed(() => props.graphicProperties?.config?.type ?? '');

/** Phase 15.5: 画布原值浮层开关（读写 pageStore.showValueOverlay） */
const showValueOverlay = computed(() => (pageStore as any).showValueOverlay === true);

function onToggleValueOverlay(checked: boolean): void {
  (pageStore as any).showValueOverlay = checked;
}

/** 可被数据源绑定的属性候选列表，从图元类型的 PluginPropertySchema 中筛选 dataBindable: true 字段 */
const bindableFields = computed(() => {
  if (!graphicType.value) return [];
  const schema = ConfigTemplateManager.getPluginSchema(graphicType.value);
  if (!schema?.fields) return [];
  const propsPath = schema.propsPath || 'customProps';
  return schema.fields
    .filter((f) => f.dataBindable === true)
    .map((f) => ({
      label: f.label,
      path: `config.${propsPath}.${f.name}`,
      fieldName: f.name,
    }));
});

/** 当前选中的绑定属性路径，优先从 graphic.dataSource.propertyPath 读取，缺省 fallback 到 text */
const currentPropertyPath = computed(() => {
  const ds = props.graphicProperties?.dataSource;
  return ds?.propertyPath || 'config.customProps.text';
});

const currentBinding = computed(() => {
  if (!graphicId.value) return null;
  const ds = props.graphicProperties?.dataSource;
  if (!ds?.dataSource) return null;
  return {
    dataSourceId: ds.dataSource,
    filterScript: ds.filterScript,
    driverScript: ds.driverScript,
  };
});

const hasBinding = computed(() => !!currentBinding.value);

const currentFetchResult = computed(() => pageDsStore.currentFetchResult);

const hasFilterScript = computed(() => !!filterScript.value.trim());

const hasDriverScript = computed(() => !!driverScript.value.trim());

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = true;
    setTimeout(() => { copiedId.value = false; }, 1500);
  } catch {
    // fallback: ignore
  }
}

watch(() => props.graphicProperties?.dataSource, (ds) => {
  if (ds) {
    filterScript.value = ds.filterScript ?? ''
    driverScript.value = ds.driverScript ?? ''
  } else {
    filterScript.value = ''
    driverScript.value = ''
  }
}, { immediate: true })

// v3.0: 过滤/驱动脚本变更时同步写回图元 dataSource 字段
watch([filterScript, driverScript], ([newFilter, newDriver]) => {
  if (graphicId.value && props.graphicProperties) {
    pageStore.currentPage?.updateGraphic(props.graphicProperties.config.id, {
      dataSource: {
        ...(props.graphicProperties.dataSource || {}),
        filterScript: newFilter,
        driverScript: newDriver,
      },
    })
  }
});

watch(currentBinding, (binding) => {
  if (binding?.dataSourceId) {
    pageDsStore.fetchDataSourceData(binding.dataSourceId)
  } else {
    pageDsStore.clearFetchResult()
  }
}, { immediate: true })

onMounted(async () => {
  const page = pageStore.currentPage as any
  const pid = page?.projectId || page?.project?.id || 'default'
  projectId.value = pid

  // v3.0: 从页面配置 dataSource 加载到页面数据结构，不调后端 API
  const pageData = page as any
  if (pageData?.dataSource?.dataSources) {
    pageDsStore.loadGroup({
      pageId: pid,
      dataSources: pageData.dataSource.dataSources,
      variables: pageData.dataSource.variables ?? [],
      graphicBindings: pageData.dataSource.graphicBindings ?? [],
    })
  } else {
    pageDsStore.initGroup(pid)
  }
  // §12 统一方案：订阅管理由 EditorView 事件层统一处理，DataPanel 不再管理 BindingManager 订阅生命周期
});

onUnmounted(() => {
  // §12 统一方案：不在此处管理 BindingManager 订阅生命周期，
  // 已由 EditorView 事件层（GRAPHIC_ADDED / GRAPHIC_UPDATED / GRAPHIC_REMOVED）统一处理
});

function openSourceConfig() {
  showSourceConfig.value = true;
}

function onSourceConfigSaved() {
  const currentPage = pageStore.currentPage as any
  if (currentPage) {
    pageDsStore.persistToPage(currentPage)
  }
}

/**
 * 手动获取数据源数据并推送到选中图元。
 *
 * - tag/device 类型：先连接 WebSocket 并订阅标签，等待数据到达后读取快照
 * - static 类型：从配置直接读取
 * - api 类型：发起 HTTP 请求
 * 拉取结果除了写入 FetchPanel 展示外，还会直接更新画布上图元的绑定属性值。
 */
async function onManualFetch() {
  const dataSourceId = currentBinding.value?.dataSourceId;
  if (!dataSourceId || !graphicId.value) return;

  // 1. 确保数据源标签已激活 WebSocket 订阅（tag/device 类型的关键步骤）
  await ensureDataSourceWsActive(dataSourceId);

  // 2. 拉取数据（tag 类型此时 wsStore.tagValues 已有实时数据）
  await pageDsStore.fetchDataSourceData(dataSourceId);

  // 3. 将拉取结果应用到选中图元的绑定属性（如 elbutton 的 text）
  applyFetchResultToGraphic();
}

/** 连接 WebSocket 并订阅数据源的所有标签（幂等，重复调用不影响） */
async function ensureDataSourceWsActive(dataSourceId: string) {
  const dsInfo = pageDsStore.getDataSourceById(dataSourceId);
  if (!dsInfo) return;

  // 提取该数据源关联的变量
  const dsVars = pageDsStore.variables.filter((v: any) => v.dataSourceId === dataSourceId);
  let tagIds: string[] = dsVars.map((v: any) => v.tagId);

  // 变量为空时，尝试从数据源配置中提取 tagId
  if (tagIds.length === 0) {
    tagIds = extractTagIds(dsInfo as unknown as Record<string, unknown>);
  }
  if (tagIds.length === 0) return;

  // 连接 WS（若已连接则直接复用）
  if (projectId.value) {
    try {
      await wsStore.connect(projectId.value);
    } catch {
      // WS 连接失败时跳过（static/api 类型不需要 WS）
      return;
    }
  }

  // 订阅标签（wsStore 内部有引用计数和去重，重复订阅安全）
  wsStore.subscribeTags(tagIds);

  // 等待 WS 推送首轮数据（最多等 800ms），确保 tag/device 类型能读到实时值
  if (!wsStore.isConnected) return;
  const start = Date.now();
  let hasData = false;
  while (Date.now() - start < 800) {
    hasData = tagIds.some((tid) => wsStore.tagValues.has(tid));
    if (hasData) break;
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** 将 fetch 结果应用到选中图元的绑定属性 */
function applyFetchResultToGraphic() {
  const result = pageDsStore.currentFetchResult;
  if (!result || !result.items || result.items.length === 0) return;

  const graphicIdVal = graphicId.value;
  const propertyPath = currentPropertyPath.value;

  // 取第一个标签的值作为主显示值
  const firstItem = result.items[0];
  const value = firstItem.value;

  // 通过 GraphicStoreAccessor.applyProperty 写入图元属性（驱动画布重绘）
  try {
    BindingManager.getGraphicStore()?.applyProperty(graphicIdVal, propertyPath, value);
  } catch (err) {
    console.warn('[DataPanel] applyFetchResultToGraphic failed:', err);
  }
}

function handleChangeBinding() {
  showVariableSelector.value = true;
}

function onDataSourceSelected(dataSourceId: string) {
  if (graphicId.value && graphicName.value) {
    try {
      pageDsStore.bindGraphicToDataSource(
        graphicId.value,
        graphicName.value,
        graphicType.value,
        dataSourceId,
      )

      // §12 统一方案：不再在此处管理 BindingManager 订阅，
      // 订阅生命周期由 EditorView GRAPHIC_UPDATED 事件层统一处理

      const dsInfo = pageDsStore.getDataSourceById(dataSourceId)
      const dsType = dsInfo?.type || ''

      const updatedDataSource = {
        ...(props.graphicProperties?.dataSource || {}),
        type: dsType,
        dataSource: dataSourceId,
        enabled: true,
      }

      // 1) 更新 PropertyPanel 响应式 ref → 驱动 BindingPanel UI 刷新
      if (props.graphicProperties) {
        props.graphicProperties.dataSource = updatedDataSource
      }

      // 2) 直接合并到图元对象的 dataSource 属性（保证解除选中再重新选中后数据不丢失）
      const graphic: any = pageStore.currentPage?.getGraphicById(graphicId.value)
      if (graphic?.dataSource) {
        Object.assign(graphic.dataSource, updatedDataSource)
      }

      // 3) 通过 updateGraphic 触发历史记录和 GRAPHIC_UPDATED 事件
      pageStore.currentPage?.updateGraphic(props.graphicProperties.config.id, {
        dataSource: updatedDataSource,
      })

      pageDsStore.fetchDataSourceData(dataSourceId)

      // 持久化绑定到 page.dataSource.graphicBindings，确保页面 JSON 保存时包含绑定关系
      // （onPropertyPathChange 已有此调用，onDataSourceSelected 缺失）
      const currentPage = pageStore.currentPage as any;
      if (currentPage) {
        pageDsStore.persistToPage(currentPage);
      }

      showVariableSelector.value = false
    } catch (err: any) {
      console.error('[DataPanel] Failed to bind data source:', err)
      showVariableSelector.value = true
    }
  } else {
    showVariableSelector.value = false
  }
}

/** 切换绑定目标属性时：更新图元 dataSource.propertyPath */
function onPropertyPathChange(newPath: string) {
  if (!graphicId.value || !props.graphicProperties) return;
  const dataSourceId = currentBinding.value?.dataSourceId;
  if (!dataSourceId) return;

  // §12 统一方案：不再在此处管理 BindingManager 订阅，
  // 订阅生命周期由 EditorView GRAPHIC_UPDATED 事件层统一处理

  // 更新图元 dataSource.propertyPath
  const updatedDataSource = {
    ...(props.graphicProperties.dataSource || {}),
    propertyPath: newPath,
  };
  if (props.graphicProperties) {
    props.graphicProperties.dataSource = updatedDataSource;
  }
  const graphic: any = pageStore.currentPage?.getGraphicById(graphicId.value);
  if (graphic) {
    graphic.dataSource = updatedDataSource;
  }
  pageStore.currentPage?.updateGraphic(props.graphicProperties.config.id, {
    dataSource: updatedDataSource,
  });

  // 持久化到页面
  const currentPage = pageStore.currentPage as any;
  if (currentPage) {
    pageDsStore.persistToPage(currentPage);
  }
}

function onOpenSourceConfig() {
  showSourceConfig.value = true;
}

function handleCreateDataSource(data: { name: string; type: string; pollingInterval: number; timeout: number; retryCount: number }) {
  try {
    const dsId = `${data.type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    pageDsStore.addDataSource({
      id: dsId,
      projectId: projectId.value,
      name: data.name,
      type: data.type as any,
      enabled: true,
      status: 'connected',
      pollingInterval: data.pollingInterval,
      timeout: data.timeout,
      retryCount: data.retryCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (graphicId.value && graphicName.value) {
      pageDsStore.bindGraphicToDataSource(
        graphicId.value,
        graphicName.value,
        graphicType.value,
        dsId,
      );

      // §12 统一方案：不再在此处管理 BindingManager 订阅

      const updatedDataSource = {
        ...(props.graphicProperties?.dataSource || {}),
        type: data.type,
        dataSource: dsId,
        enabled: true,
      };

      if (props.graphicProperties) {
        props.graphicProperties.dataSource = updatedDataSource
      }

      const graphic: any = pageStore.currentPage?.getGraphicById(graphicId.value);
      if (graphic) {
        graphic.dataSource = updatedDataSource
      }

      pageStore.currentPage?.updateGraphic(props.graphicProperties.config.id, {
        dataSource: updatedDataSource,
      });
    }

    const currentPage = pageStore.currentPage as any;
    if (currentPage) {
      pageDsStore.persistToPage(currentPage);
    }

    pageDsStore.fetchDataSourceData(dsId)
  } catch (err: any) {
    console.error('[DataPanel] Failed to create data source:', err)
  }
}
</script>

<style scoped>
@import '../../../../panels/styles/property-panel.scss';
@import '../../../../panels/styles/data-panel-theme.scss';

.data-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.graphic-info-bar {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--surface) 0%, color-mix(in srgb, var(--primary) 2%, var(--surface)) 100%);
}

.overlay-toggle-bar {
  padding: 6px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.overlay-toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.overlay-toggle-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--primary, #409EFF);
}

.graphic-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}

.graphic-label {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 56px;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.graphic-value {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

.graphic-id-text {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn-inline {
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background-color: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  flex-shrink: 0;
  font-size: 12px;
  opacity: 0;
}

.graphic-info-row:hover .copy-btn-inline {
  opacity: 1;
}

.copy-btn-inline:hover {
  background-color: color-mix(in srgb, var(--primary) 10%, transparent);
  border-color: var(--primary);
  color: var(--primary);
}

.type-tag {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--color-info));
  line-height: 1.6;
  white-space: nowrap;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.steps-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 4px;
  overflow-y: auto;
}

.steps-panel .property-group {
  margin-bottom: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.15s ease;

  &:hover {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
}

.group-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  padding: 10px 12px;
  background: linear-gradient(90deg, var(--surface) 0%, color-mix(in srgb, var(--background) 60%, var(--surface)) 100%);
  border-bottom: 1px solid var(--border);

  &:hover { background: linear-gradient(90deg, color-mix(in srgb, var(--primary) 3%, var(--surface)) 0%, color-mix(in srgb, var(--primary) 2%, var(--surface)) 100%); }
}

.step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 50%;
  padding: 0;
  line-height: 1;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

.badge-primary {
  background: linear-gradient(135deg, #2080f0, #4098fc);
}

.badge-info {
  background: linear-gradient(135deg, #18a058, #36ad6a);
}

.badge-warning {
  background: linear-gradient(135deg, #f0a020, #fcb040);
}

.step-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.2px;
}

.status-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  line-height: 1.6;
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.status-tag.status-success {
  color: #fff;
  background: linear-gradient(135deg, #10b981, #34d399);
  box-shadow: 0 1px 3px rgba(16, 185, 129, 0.25);
}

.status-tag.status-default {
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--text-tertiary) 10%, transparent);
  border: 1px solid var(--border);
}

.collapse-icon {
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 5px solid var(--text-tertiary);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  transition: transform 0.2s ease, opacity 0.2s ease;
  margin-left: 4px;
  opacity: 0.5;
  flex-shrink: 0;
}

.collapse-icon.expanded {
  transform: rotate(90deg);
  opacity: 0.9;
}

.group-body {
  overflow: hidden;
  padding: 10px 12px;
  background: var(--surface);
}

.group-disabled {
  opacity: 0.45;
  pointer-events: none;
}

.group-disabled .group-label {
  cursor: not-allowed;
}

.group-locked .lock-icon {
  font-size: 11px;
  opacity: 0.5;
  flex-shrink: 0;
}

.lock-icon {
  font-size: 11px;
  flex-shrink: 0;
  margin-left: 4px;
}

.lock-icon.unlocked {
  opacity: 0.25;
}

.step-content {
  padding: 0;
}

.step-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border), transparent);
  margin: 10px 0;
}

.property-selector-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  margin-top: 4px;
}

.property-selector-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 56px;
}

.property-selector-select {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.property-selector-select:hover {
  border-color: var(--primary);
}

.property-selector-select:focus {
  border-color: var(--primary);
}

.filter-hint,
.driver-hint {
  padding: 0 0 8px 0;
}

.text-secondary {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.filter-editor-inline,
.driver-editor-inline {
  margin-top: 0;
}
</style>