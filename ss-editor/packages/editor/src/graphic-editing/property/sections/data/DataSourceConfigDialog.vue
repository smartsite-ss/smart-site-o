<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="modal-overlay"
    >
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>{{ $t('dataPanel.sourceConfigTitle') }}</h3>
          <div class="header-actions">
            <button
              type="button"
              class="ds-btn ds-btn--primary ds-btn--sm"
              @click="handleSave"
            >
              {{ $t('dataPanel.save') }}
            </button>
            <button
              type="button"
              class="ds-btn ds-btn--sm"
              @click="emit('update:visible', false)"
            >
              {{ $t('dataPanel.cancel') }}
            </button>
          </div>
        </div>

        <div class="modal-body">
          <div class="modal-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title">{{ $t('dataPanel.sourceList') }}</span>
              <div class="sidebar-header-actions">
                <button
                  type="button"
                  class="ds-btn ds-btn--primary ds-btn--xs"
                  @click="handleAdd"
                >
                  + {{ $t('dataPanel.addNew') }}
                </button>
                <button
                  type="button"
                  class="ds-btn ds-btn--icon ds-btn--xs"
                  :title="$t('dataPanel.refresh')"
                  @click="handleRefresh"
                >
                  ⟳
                </button>
              </div>
            </div>
            <div class="sidebar-list">
              <div
                v-for="ds in pageDsStore.dataSources"
                :key="ds.id"
                class="ds-sidebar-item"
                :class="{ 'ds-sidebar-item--active': selectedId === ds.id }"
                @click="selectSource(ds.id)"
              >
                <div class="sidebar-item-info">
                  <div class="sidebar-item-name">
                    {{ ds.name }}
                  </div>
                  <div class="sidebar-item-type">
                    <span
                      class="ds-tag ds-type-tag"
                      :class="dsTypeTagClass(ds.type)"
                    >
                      {{ typeLabel(ds.type) }}
                    </span>
                    <span
                      v-if="dsVarCount(ds.id) > 0"
                      class="sidebar-var-count"
                    >
                      {{ dsVarCount(ds.id) }} {{ $t('dataPanel.variables') }}
                    </span>
                    <span
                      v-if="dsDataPreview(ds)"
                      class="sidebar-data-preview"
                    >
                      {{ dsDataPreview(ds) }}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  class="ds-btn ds-btn--danger"
                  @click.stop="handleDelete(ds.id)"
                >
                  &times;
                </button>
              </div>
              <div
                v-if="pageDsStore.dataSources.length === 0"
                class="ds-empty"
              >
                {{ $t('dataPanel.noDataSourceHint') }}
              </div>
            </div>
          </div>

          <div class="modal-main">
            <div
              v-if="!isCreating && !editingId"
              class="ds-placeholder"
            >
              <div
                v-if="pageDsStore.dataSources.length > 0"
                class="ds-summary-table-wrapper"
              >
                <h4 class="summary-title">
                  {{ $t('dataPanel.currentPageDataSources') }}
                </h4>
                <table class="ds-summary-table">
                  <thead>
                    <tr>
                      <th>{{ $t('dataPanel.name') }}</th>
                      <th>{{ $t('dataPanel.type') }}</th>
                      <th>{{ $t('dataPanel.pollingInterval') }}</th>
                      <th>{{ $t('dataPanel.timeout') }}</th>
                      <th>{{ $t('dataPanel.retryCount') }}</th>
                      <th>{{ $t('dataPanel.boundGraphics') }}</th>
                      <th>{{ $t('dataPanel.refreshTime') }}</th>
                      <th>{{ $t('dataPanel.status') }}</th>
                      <th>{{ $t('dataPanel.lastData') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="ds in dsSummaryList"
                      :key="ds.id"
                    >
                      <td class="cell-name">
                        {{ ds.name }}
                      </td>
                      <td>
                        <span
                          class="ds-tag"
                          :class="ds.enabled ? 'ds-tag--success' : 'ds-tag--default'"
                        >{{ typeLabel(ds.type) }}</span>
                      </td>
                      <td>{{ ds.pollingInterval ?? '—' }}</td>
                      <td>{{ ds.timeout ?? '—' }}</td>
                      <td>{{ ds.retryCount ?? '—' }}</td>
                      <td class="cell-bound">
                        <span
                          v-if="ds.boundGraphics.length === 0"
                          class="text-muted"
                        >—</span>
                        <span
                          v-for="g in ds.boundGraphics"
                          v-else
                          :key="g.graphicId"
                          class="ds-bound-tag"
                        >{{ g.graphicName || g.graphicId }}</span>
                      </td>
                      <td class="cell-time">
                        {{ formatTime(ds.updatedAt) }}
                      </td>
                      <td>
                        <span
                          class="ds-status-tag"
                          :class="'ds-status-tag--' + (ds.status || 'disconnected')"
                        >{{ statusLabel(ds.status) }}</span>
                      </td>
                      <td class="cell-data">
                        <span
                          v-if="ds.lastData !== null && ds.lastData !== undefined"
                          class="data-value"
                        >{{ ds.lastData }}</span>
                        <span
                          v-else
                          class="text-muted"
                        >—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div
                v-else
                class="placeholder-text"
              >
                {{ $t('dataPanel.selectOrCreateHint') }}
              </div>
            </div>

            <template v-else>
              <div class="ds-row">
                <div class="ds-item">
                  <label class="ds-form-label">
                    {{ $t('dataPanel.name') }}
                    <span class="ds-form-required">*</span>
                  </label>
                  <input
                    v-model="currentForm.name"
                    class="ds-input"
                    :placeholder="$t('dataPanel.enterDataSourceName')"
                  >
                </div>

                <div class="ds-item">
                  <label class="ds-form-label">
                    {{ $t('dataPanel.type') }}
                    <span class="ds-form-required">*</span>
                  </label>
                  <select
                    v-model="currentForm.type"
                    class="ds-select"
                    @change="onTypeChange(($event.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="opt in typeOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
              </div>

              <template v-if="currentForm.type !== 'static'">
                <hr class="ds-divider">

                <div class="ds-row">
                  <div class="ds-item">
                    <label class="ds-form-label">{{ $t('dataPanel.pollingInterval') }}</label>
                    <input
                      v-model.number="currentForm.pollingInterval"
                      type="number"
                      class="ds-input"
                      :min="100"
                      :max="60000"
                      :step="100"
                    >
                  </div>

                  <div class="ds-item">
                    <label class="ds-form-label">{{ $t('dataPanel.timeout') }}</label>
                    <input
                      v-model.number="currentForm.timeout"
                      type="number"
                      class="ds-input"
                      :min="500"
                      :max="60000"
                      :step="500"
                    >
                  </div>

                  <div class="ds-item">
                    <label class="ds-form-label">{{ $t('dataPanel.retryCount') }}</label>
                    <input
                      v-model.number="currentForm.retryCount"
                      type="number"
                      class="ds-input"
                      :min="0"
                      :max="10"
                    >
                  </div>
                </div>

                <hr class="ds-divider">
              </template>

              <component
                :is="currentEditorComponent"
                v-bind="editorProps"
                @update="onEditorUpdate"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useI18n, i18n, extractTagIds, buildSourceSummary } from '@scada-editor/core'
import { usePageDataSourceStore, useWsStore } from '../../../../../../system/src/stores'
import { usePageStore } from '@scada-editor/core'
import type { DataSourceConfig, DataSourceRecord } from '../../../../../../system/src/api/modules/dataSource.api'
import StaticSourceEditor from './source-types/StaticSourceEditor.vue'
import TagSourceSelector from './source-types/TagSourceSelector.vue'
import ApiSourceEditor from './source-types/ApiSourceEditor.vue'
import DbSourceEditor from './source-types/DbSourceEditor.vue'

const props = defineProps<{
  visible: boolean
  projectId: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'saved'): void
}>()

const { t } = useI18n()
const pageDsStore = usePageDataSourceStore()
const pageStore = usePageStore()
const wsStore = useWsStore()

// 强制触发 computed 重新计算：每次 wsStore flush 时递增
const wsVersion = ref(0)
watch(
  () => wsStore.tagFlushVersion,
  () => { wsVersion.value++ },
)

/** 本对话框通过 wsStore.subscribeTags 订阅的标签列表（关闭时需取消订阅以释放引用计数） */
const dialogSubscribedTagIds = ref<string[]>([])

const selectedId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const isCreating = ref(false)

const typeOptions = computed(() => [
  { label: t('dataPanel.staticJson'), value: 'static' },
  { label: t('dataPanel.tagVariable'), value: 'tag' },
  { label: t('dataPanel.apiInterface'), value: 'api' },
  { label: t('dataPanel.dbQuery'), value: 'sql' },
])

const typeLabel = (type: string) => {
  const map: Record<string, string> = {
    static: t('dataPanel.sourceTypeStatic'),
    tag: t('dataPanel.sourceTypeTag'),
    api: t('dataPanel.sourceTypeApi'),
    sql: t('dataPanel.sourceTypeDb'),
    dynamic: t('dataPanel.dynamic'),
    public: t('dataPanel.publicTag'),
    device: t('dataPanel.device'),
  }
  return map[type] || type
}

function dsTypeTagClass(type: string): string {
  const map: Record<string, string> = {
    static: 'ds-tag--type-static',
    tag: 'ds-tag--type-tag',
    api: 'ds-tag--type-api',
    sql: 'ds-tag--type-sql',
    dynamic: 'ds-tag--type-tag',
    public: 'ds-tag--type-tag',
    device: 'ds-tag--type-tag',
    database: 'ds-tag--type-sql',
  }
  return map[type] || 'ds-tag--default'
}

function dsVarCount(dsId: string): number {
  return pageDsStore.variables.filter((v) => v.dataSourceId === dsId).length
}

function dsDataPreview(ds: DataSourceRecord): string | null {
  const props = ds.properties ?? ({} as Record<string, any>)
  switch (ds.type) {
    case 'static': {
      const vars = props.variables as any[] | undefined
      if (!vars || vars.length === 0) return null
      return vars.slice(0, 3).map((v: any) => v.tagId).join(', ') + (vars.length > 3 ? '...' : '')
    }
    case 'tag':
    case 'device': {
      const tagIds = extractTagIds(ds as unknown as Record<string, unknown>)
      if (tagIds.length === 0) return null
      return tagIds.slice(0, 3).join(', ') + (tagIds.length > 3 ? '...' : '')
    }
    case 'api': {
      const url = ds.url || props.url
      if (!url) return null
      return url.length > 30 ? url.substring(0, 30) + '...' : url
    }
    case 'sql':
    case 'database': {
      const queryMode = props.queryMode
      if (queryMode === 'sql' && props.sqlQuery) return 'SQL'
      if (queryMode === 'table' && props.tableName) return props.tableName
      return null
    }
    default:
      return null
  }
}

const currentForm = reactive<DataSourceConfig>({
  type: 'api',
  name: '',
  pollingInterval: 5000,
  timeout: 10000,
  retryCount: 3,
  url: '',
  method: 'GET',
  headers: {},
  dataPath: '',
  tags: [],
})

const editorTypeData = ref<Record<string, any>>({})

const editorComponents: Record<string, any> = {
  static: StaticSourceEditor,
  tag: TagSourceSelector,
  api: ApiSourceEditor,
  sql: DbSourceEditor,
}

const currentEditorComponent = computed(() => {
  return editorComponents[currentForm.type] ?? null
})

const editorProps = computed(() => ({
  form: currentForm,
  typeData: editorTypeData.value[currentForm.type] ?? {},
  projectId: props.projectId,
  dataSourceId: editingId.value ?? undefined,
}))

const resetForm = () => {
  currentForm.name = ''
  currentForm.type = 'api'
  currentForm.pollingInterval = 5000
  currentForm.timeout = 10000
  currentForm.retryCount = 3
  currentForm.url = ''
  currentForm.method = 'GET'
  currentForm.headers = {}
  currentForm.dataPath = ''
  currentForm.tags = []
  editorTypeData.value = {}
}

const selectSource = (id: string) => {
  selectedId.value = id
  editingId.value = id
  isCreating.value = false
  const ds = pageDsStore.dataSources.find((d) => d.id === id)
  if (ds) {
    currentForm.name = ds.name
    currentForm.type = ds.type
    currentForm.pollingInterval = ds.pollingInterval ?? 5000
    currentForm.timeout = ds.timeout ?? 10000
    currentForm.retryCount = ds.retryCount ?? 3
    currentForm.url = ds.url ?? ''
    currentForm.method = ds.method ?? 'GET'
    currentForm.headers = ds.headers ?? {}
    currentForm.dataPath = ds.dataPath ?? ''
    currentForm.tags = ds.tags ?? []
    editorTypeData.value = {
      [ds.type]: ds.properties ?? {},
    }
  }
}

const handleAdd = () => {
  isCreating.value = true
  editingId.value = null
  selectedId.value = null
  resetForm()
}

const handleDelete = (id: string) => {
  pageDsStore.removeDataSource(id)
  syncDsToPage()
  if (selectedId.value === id) {
    selectedId.value = null
    editingId.value = null
    isCreating.value = false
    resetForm()
  }
}

const handleSave = () => {
  if (!currentForm.name.trim()) {
    alert(t('dataPanel.enterDataSourceName'));
    return;
  }

  const typeData = editorTypeData.value[currentForm.type] ?? {}
  const now = new Date().toISOString()
  const isStatic = currentForm.type === 'static'

  const formData: Record<string, any> = {
    name: currentForm.name,
    type: currentForm.type,
  }
  if (!isStatic) {
    formData.pollingInterval = currentForm.pollingInterval
    formData.timeout = currentForm.timeout
    formData.retryCount = currentForm.retryCount
  }

  if (editingId.value) {
    pageDsStore.updateDataSource(editingId.value, {
      ...formData,
      ...currentForm,
      properties: { ...typeData },
      updatedAt: now,
    })
  } else {
    const newId = 'ds_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
    pageDsStore.addDataSource({
      id: newId,
      projectId: props.projectId,
      ...formData,
      enabled: true,
      status: 'connected',
      createdAt: now,
      updatedAt: now,
      ...currentForm,
      properties: { ...typeData },
    } as any)
    selectedId.value = newId
    editingId.value = newId
    isCreating.value = false
  }

  emit('saved')

  syncDsToPage()
}

const onTypeChange = (_type: string) => {
  currentForm.url = ''
  currentForm.method = 'GET'
  currentForm.dataPath = ''
  currentForm.tags = []
}

const onEditorUpdate = (data: Record<string, any>) => {
  editorTypeData.value = {
    ...editorTypeData.value,
    [currentForm.type]: { ...data },
  }
  // 当 tag 数据源选择标签变化时，订阅新的标签到 WebSocket
  if ((currentForm.type === 'tag' || currentForm.type === 'device') && data.tagIds?.length > 0) {
    wsStore.subscribeTags(data.tagIds);
    // 合并到对话框级别的跟踪列表（wsStore 有引用计数，关闭时统一释放即可）
    const merged = new Set([...dialogSubscribedTagIds.value, ...data.tagIds]);
    dialogSubscribedTagIds.value = [...merged];
  }
}

const syncDsToPage = () => {
  const currentPage = pageStore.currentPage as any
  if (currentPage) {
    // 在序列化前，从数据源派生 variables（tags 等信息）
    syncVariablesFromDataSources()
    pageDsStore.persistToPage(currentPage)
  }
}

/** 从所有数据源的 properties 中提取标签，同步到 pageDsStore.variables */
function syncVariablesFromDataSources() {
  const dsList = pageDsStore.dataSources as any[]
  const existingVars = new Set(pageDsStore.variables.map((v: any) => v.tagId))

  const addVariables = (ds: any, items: Array<{ tagId: string; tagName?: string; dataType?: string }>) => {
    const newVars: any[] = []
    for (const item of items) {
      const tagId = item.tagId
      if (!tagId || existingVars.has(tagId)) continue
      newVars.push({
        tagId,
        tagName: item.tagName || tagId,
        dataSourceId: ds.id,
        dataType: item.dataType || 'float',
      })
      existingVars.add(tagId)
    }
    if (newVars.length > 0) {
      pageDsStore.addVariables(newVars)
    }
  }

  for (const ds of dsList) {
    const props = ds.properties ?? {}
    switch (ds.type) {
      case 'tag':
      case 'device': {
        const tagIds = extractTagIds(ds as Record<string, unknown>)
        const tagNames = (props.tagNames ?? ds.tags ?? []) as string[]
        const dataTypes = (props.dataTypes ?? []) as string[]
        addVariables(ds, tagIds.map((tagId, i) => ({
          tagId,
          tagName: tagNames[i],
          dataType: dataTypes[i],
        })))
        break
      }
      case 'api': {
        const mappings = (props.fieldMappings ?? []) as any[]
        addVariables(ds, mappings.map((m) => ({ tagId: m.tagId, tagName: m.tagName, dataType: m.dataType })))
        break
      }
      case 'sql':
      case 'database': {
        if (props.queryMode === 'sql') {
          const mappings = (props.sqlColumnMappings ?? []) as Array<{ key: string; value: string }>
          addVariables(ds, mappings.map((m) => ({ tagId: m.value, tagName: m.key })))
        } else {
          const cols = (props.selectedColumns ?? []) as any[]
          addVariables(ds, cols.map((c) => ({ tagId: c.tagId, tagName: c.tagName || c.columnName, dataType: c.dataType })))
        }
        break
      }
      case 'static': {
        const vars = (props.variables ?? []) as any[]
        addVariables(ds, vars.map((v) => ({ tagId: v.tagId, tagName: v.tagName, dataType: v.dataType })))
        break
      }
    }
  }
}

function buildSummaryRow(ds: DataSourceRecord) {
  const bindings = pageDsStore.graphicBindings
    .filter((b) => b.dataSourceId === ds.id || pageDsStore.variables.some((v) => v.dataSourceId === ds.id && v.tagId === b.tagId))
    .map((b) => ({
      graphicId: b.graphicId,
      graphicName: b.graphicName || b.graphicId,
    }))

  // DataSourceReader 统一提取 tagIds 并构建摘要
  const tagIds = extractTagIds(ds as unknown as Record<string, unknown>);
  let lastData: string | null = null;
  let latestTimestamp: number | undefined;

  if (ds.type === 'tag' || ds.type === 'device') {
    const tagNames = tagIds.map((tid) => {
      const v = pageDsStore.variables.find((x) => x.tagId === tid);
      return v?.tagName || tid;
    });
    const summary = buildSourceSummary(ds, tagIds, tagNames, wsStore);
    lastData = summary.lastValue;
    latestTimestamp = summary.updatedAt ?? undefined;
  } else {
    // 非 tag 类型保持原有的纯展示逻辑
    const lastRaw = buildLastDataFlat(ds);
    // static 类型：仅 JSON/sql/db 等非实时类型使用原有逻辑，tag 回退到 wsStore
    if (ds.type === 'static' && tagIds.length > 0) {
      const tagNames = tagIds.map((tid) => {
        const v = pageDsStore.variables.find((x) => x.tagId === tid);
        return v?.tagName || tid;
      });
      const summary = buildSourceSummary(ds, tagIds, tagNames, wsStore);
      lastData = summary.lastValue ?? lastRaw;
    } else {
      lastData = lastRaw;
    }
  }

  return {
    ...ds,
    boundGraphics: bindings,
    lastData,
    updatedAt: latestTimestamp ? new Date(latestTimestamp).toISOString() : ds.updatedAt,
  }
}

/** 非 tag/device 类型的纯展示值（精简自 buildLastData） */
function buildLastDataFlat(ds: DataSourceRecord): string | null {
  const props = ds.properties ?? ({} as Record<string, any>);
  switch (ds.type) {
    case 'api': {
      const url = ds.url || props.url;
      if (!url) return null;
      const method = ds.method || props.method || 'GET';
      const dataPath = ds.dataPath || props.dataPath || '';
      return `${method} ${url}${dataPath ? ' → ' + dataPath : ''}`;
    }
    case 'sql':
    case 'database': {
      const queryMode = props.queryMode;
      if (queryMode === 'sql' && props.sqlQuery) {
        return `SQL: ${props.sqlQuery.substring(0, 60)}${props.sqlQuery.length > 60 ? '...' : ''}`;
      }
      if (queryMode === 'table' && props.tableName) {
        const cols = props.selectedColumns ?? [];
        return i18n.global.t('dataPanel.tableCols', { table: props.tableName, cols: cols.length });
      }
      return null;
    }
    default:
      return null;
  }
}

// 用 ref + watch 替代 computed，确保 wsStore.tagValues 变化时可靠更新
const dsSummaryList = ref<ReturnType<typeof buildSummaryRow>[]>([])
function refreshSummaryList() {
  const result = pageDsStore.dataSources.map((ds) => buildSummaryRow(ds))
  dsSummaryList.value = result
}
watch(wsVersion, () => refreshSummaryList())
watch(() => pageDsStore.dataSources.length, () => refreshSummaryList())
refreshSummaryList()

const formatTime = (isoString?: string) => {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return '—'
  }
}

const statusLabel = (status?: string) => {
  const map: Record<string, string> = {
    connected: t('dataPanel.statusConnected'),
    disconnected: t('dataPanel.statusDisconnected'),
    connecting: t('dataPanel.statusConnecting'),
    error: t('dataPanel.statusError'),
  }
  return map[status || ''] || status || t('dataPanel.statusDisconnected')
}

const handleRefresh = () => {
  const currentPage = pageStore.currentPage as any
  if (currentPage?.dataSource?.dataSources) {
    pageDsStore.loadGroup({
      pageId: props.projectId,
      dataSources: currentPage.dataSource.dataSources,
      variables: currentPage.dataSource.variables ?? [],
      graphicBindings: currentPage.dataSource.graphicBindings ?? [],
    })
  }
  resetForm()
  selectedId.value = null
  editingId.value = null
  isCreating.value = false
  // 刷新汇总表格
  refreshSummaryList()
}

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      resetForm()
      selectedId.value = null
      editingId.value = null
      isCreating.value = false
      // 连接 WebSocket 并订阅所有 tag 数据源的变量，实现实时数据刷新
      if (props.projectId) {
        try {
          await wsStore.connect(props.projectId)
          const allTagIds: string[] = []
          for (const ds of pageDsStore.dataSources) {
            if (ds.type === 'tag' || ds.type === 'device') {
              const tagIds = extractTagIds(ds as Record<string, unknown>)
              allTagIds.push(...tagIds)
            }
          }
          if (allTagIds.length > 0) {
            wsStore.subscribeTags(allTagIds)
            dialogSubscribedTagIds.value = allTagIds
          }
        } catch (err) {
          console.error('[DataSourceConfigDialog] wsStore 初始化失败:', err);
        }
      } else {
        console.warn('[DataSourceConfigDialog] projectId 为空，跳过 WebSocket 连接');
      }
    } else {
      // 关闭时释放本对话框持有的标签订阅引用计数
      if (dialogSubscribedTagIds.value.length > 0) {
        wsStore.unsubscribeTags(dialogSubscribedTagIds.value)
        dialogSubscribedTagIds.value = []
      }
    }
  },
)
</script>

<style scoped>
@import '../../../../panels/styles/data-panel-theme.scss';

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.modal {
  background: var(--surface);
  border-radius: var(--radius-lg, 12px);
  padding: 0;
  width: 980px;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--border) 50%, transparent),
    0 16px 48px -8px rgba(0, 0, 0, 0.2),
    0 8px 24px -6px rgba(0, 0, 0, 0.12);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 15px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 520px;
}

.modal-sidebar {
  width: 220px;
  min-width: 220px;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.modal-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.modal-main .ds-placeholder {
  display: block;
  min-height: unset;
}
</style>