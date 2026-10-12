<template>
  <div class="db-source-editor">
    <div class="section-header">
      {{ $t('sourceEditor.dbConnectionConfig') }}
    </div>

    <div class="form-item">
      <label>{{ $t('sourceEditor.dbType') }}</label>
      <select
        v-model="connectionConfig.dbType"
        @change="onDbTypeChange"
      >
        <option value="">
          {{ $t('dataPanel.selectOrCreateHint') }}
        </option>
        <option value="mysql">
          MySQL
        </option>
        <option value="sqlite">
          SQLite
        </option>
        <option value="oracle">
          Oracle
        </option>
        <option value="postgresql">
          PostgreSQL
        </option>
        <option value="mssql">
          SQL Server
        </option>
      </select>
    </div>

    <template v-if="connectionConfig.dbType">
      <div class="form-row">
        <div class="form-item form-item-half">
          <label>{{ $t('sourceEditor.host') }}</label>
          <input
            v-model="connectionConfig.host"
            placeholder="localhost"
            @input="syncData"
          >
        </div>
        <div class="form-item form-item-half">
          <label>{{ $t('sourceEditor.port') }}</label>
          <input
            v-model.number="connectionConfig.port"
            type="number"
            :placeholder="defaultPort.toString()"
            @input="syncData"
          >
        </div>
      </div>

      <div class="form-item">
        <label>{{ $t('sourceEditor.database') }}</label>
        <input
          v-model="connectionConfig.database"
          :placeholder="dbPlaceholder"
          @input="syncData"
        >
      </div>

      <div class="form-row">
        <div class="form-item form-item-half">
          <label>{{ $t('sourceEditor.username') }}</label>
          <input
            v-model="connectionConfig.username"
            @input="syncData"
          >
        </div>
        <div class="form-item form-item-half">
          <label>{{ $t('sourceEditor.password') }}</label>
          <input
            v-model="connectionConfig.password"
            type="password"
            @input="syncData"
          >
        </div>
      </div>

      <div class="form-item">
        <label>{{ $t('sourceEditor.connectionString') }}</label>
        <input
          :value="connectionString"
          readonly
          class="readonly-input"
        >
      </div>

      <div class="btn-row">
        <button
          type="button"
          class="btn-primary"
          @click="testConnection"
        >
          {{ $t('sourceEditor.testConnection') }}
        </button>
      </div>
    </template>

    <div class="section-header">
      {{ $t('sourceEditor.queryMode') }}
    </div>

    <div class="form-item">
      <label>{{ $t('sourceEditor.queryMode') }}</label>
      <div class="radio-group">
        <label class="radio-label">
          <input
            v-model="localQueryMode"
            type="radio"
            value="table"
            name="queryMode"
            @change="onQueryModeChange"
          >
          <span>{{ $t('sourceEditor.tableQuery') }}</span>
        </label>
        <label class="radio-label">
          <input
            v-model="localQueryMode"
            type="radio"
            value="sql"
            name="queryMode"
            @change="onQueryModeChange"
          >
          <span>{{ $t('sourceEditor.sqlQuery') }}</span>
        </label>
      </div>
    </div>

    <template v-if="localQueryMode === 'table'">
      <div class="section-header">
        {{ $t('sourceEditor.tableModeConfig') }}
      </div>

      <div class="form-item">
        <label>{{ $t('sourceEditor.dataTable') }}</label>
        <select
          v-model="localTableName"
          @change="onTableChange"
        >
          <option
            value=""
            disabled
          >
            {{ $t('dataPanel.selectOrCreateHint') }}
          </option>
          <option
            v-for="opt in tableOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div class="section-header">
        {{ $t('sourceEditor.selectColumns') }}
      </div>

      <div class="column-table">
        <table>
          <thead>
            <tr>
              <th class="col-select">
                {{ $t('sourceEditor.select') }}
              </th>
              <th>{{ $t('sourceEditor.columnName') }}</th>
              <th>{{ $t('sourceEditor.type') }}</th>
              <th>{{ $t('sourceEditor.tagId') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="col in availableColumns"
              :key="col.name"
            >
              <td>
                <input
                  type="checkbox"
                  :checked="isColumnSelected(col.name)"
                  @change="toggleColumn(col, ($event.target as HTMLInputElement).checked)"
                >
              </td>
              <td>{{ col.name }}</td>
              <td>{{ col.type }}</td>
              <td>
                <input
                  v-if="isColumnSelected(col.name)"
                  :value="getColumnTagId(col.name)"
                  :placeholder="$t('sourceEditor.tagIdPlaceholder')"
                  @input="(e: Event) => { updateColumnTagId(col.name, (e.target as HTMLInputElement).value); syncData(); }"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-if="localQueryMode === 'sql'">
      <div class="section-header">
        {{ $t('sourceEditor.sqlQuery') }}
      </div>

      <div class="form-item">
        <textarea
          v-model="localSqlQuery"
          placeholder="SELECT temperature, pressure, humidity&#10;FROM sensor_data&#10;WHERE device_id = 'dev_001'&#10;ORDER BY timestamp DESC&#10;LIMIT 100"
          :rows="8"
          @input="syncData"
        />
      </div>

      <div class="form-item">
        <label>{{ $t('sourceEditor.sqlResultMapping') }}</label>
        <div class="dynamic-pair-list">
          <div
            v-for="(item, idx) in sqlColumnMappings"
            :key="idx"
            class="dynamic-pair-row"
          >
            <input
              v-model="item.key"
              :placeholder="$t('sourceEditor.dbColumnNamePlaceholder')"
              @input="syncData"
            >
            <input
              v-model="item.value"
              :placeholder="$t('sourceEditor.tagIdPlaceholder')"
              @input="syncData"
            >
            <button
              type="button"
              class="btn-remove"
              @click="() => { sqlColumnMappings.splice(idx, 1); syncData(); }"
            >
              ×
            </button>
          </div>
          <button
            type="button"
            class="btn-add"
            @click="() => { sqlColumnMappings.push({ key: '', value: '' }); syncData(); }"
          >
            {{ $t('sourceEditor.addParam') }}
          </button>
        </div>
      </div>
    </template>

    <div class="btn-row action-row">
      <button
        type="button"
        class="btn-primary"
        @click="testQuery"
      >
        {{ $t('sourceEditor.testQuery') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { showSuccess, showError, showAlert } from '../../../../../utils/messageBox';
import type { DataSourceConfig } from '../../../../../../../system/src/api/modules/dataSource.api';
import { dataSourceApi } from '../../../../../../../system/src/api/modules/dataSource.api';
import { dbConnectionApi } from '../../../../../../../system/src/api/modules/dbConnection.api';
import { useSourceEditor } from './useSourceEditor';

interface ColumnInfo {
  name: string;
  type: string;
}

interface ConnectionConfig {
  dbType: string;
  host: string;
  port: number | null;
  database: string;
  username: string;
  password: string;
}

const props = defineProps<{
  form: DataSourceConfig;
  typeData: Record<string, any>;
  projectId?: string;
  dataSourceId?: string;
}>();

const emit = defineEmits<{
  (e: 'update', data: Record<string, any>): void;
}>();

const { t, emitUpdate } = useSourceEditor();

const td = props.typeData;

const connectionConfig = ref<ConnectionConfig>({
  dbType: td?.connectionConfig?.dbType ?? '',
  host: td?.connectionConfig?.host ?? '',
  port: td?.connectionConfig?.port ?? null,
  database: td?.connectionConfig?.database ?? '',
  username: td?.connectionConfig?.username ?? '',
  password: td?.connectionConfig?.password ?? '',
});

const localQueryMode = ref<'table' | 'sql'>(td?.queryMode ?? 'table');
const localTableName = ref(td?.tableName ?? '');
const localSqlQuery = ref(td?.sqlQuery ?? '');

const selectedColumns = ref<Array<{ columnName: string; tagId: string; tagName: string; dataType: string }>>(
  td?.selectedColumns ?? [],
);

const sqlColumnMappings = ref<Array<{ key: string; value: string }>>(
  td?.sqlColumnMappings ?? [],
);

const tableList = ref<string[]>([]);
const availableColumns = ref<ColumnInfo[]>([]);

const defaultPort = computed(() => {
  switch (connectionConfig.value.dbType) {
    case 'mysql': return 3306;
    case 'postgresql': return 5432;
    case 'oracle': return 1521;
    case 'mssql': return 1433;
    default: return 0;
  }
});

const dbPlaceholder = computed(() => {
  switch (connectionConfig.value.dbType) {
    case 'sqlite': return '/path/to/database.db';
    default: return 'database_name';
  }
});

const connectionString = computed(() => {
  const c = connectionConfig.value;
  if (!c.dbType) return '';
  switch (c.dbType) {
    case 'mysql':
      return `mysql://${c.username}:${c.password}@${c.host || 'localhost'}:${c.port || 3306}/${c.database}`;
    case 'postgresql':
      return `postgresql://${c.username}:${c.password}@${c.host || 'localhost'}:${c.port || 5432}/${c.database}`;
    case 'oracle':
      return `oracle://${c.username}:${c.password}@${c.host || 'localhost'}:${c.port || 1521}/${c.database}`;
    case 'mssql':
      return `mssql://${c.username}:${c.password}@${c.host || 'localhost'}:${c.port || 1433}/${c.database}`;
    case 'sqlite':
      return `sqlite://${c.database}`;
    default:
      return '';
  }
});

const tableOptions = computed(() =>
  tableList.value.map((t) => ({ label: t, value: t })),
);

async function loadTables() {
  const projectId = props.projectId || (props.form as any).projectId;
  if (!projectId || !connectionConfig.value.dbType) {
    tableList.value = [];
    return;
  }
  try {
    const res = await dbConnectionApi.executeQuery(projectId, 'tables', JSON.stringify(connectionConfig.value));
    tableList.value = (res.data || []).map((r: any) => r.table_name || r.name || r.TABLE_NAME);
  } catch (err: any) {
    console.warn('Failed to load tables:', err.message);
    tableList.value = [];
  }
}

async function loadColumns() {
  const projectId = props.projectId || (props.form as any).projectId;
  const tableName = localTableName.value;
  if (!projectId || !connectionConfig.value.dbType || !tableName) {
    availableColumns.value = [];
    return;
  }
  try {
    const res = await dbConnectionApi.executeQuery(
      projectId,
      'columns',
      JSON.stringify({ ...connectionConfig.value, tableName }),
    );
    availableColumns.value = (res.data || []).map((c: any) => ({
      name: c.column_name || c.name || c.COLUMN_NAME,
      type: c.data_type || c.type || c.DATA_TYPE,
    }));
  } catch (err: any) {
    console.warn('Failed to load columns:', err.message);
    availableColumns.value = [];
  }
}

function onDbTypeChange() {
  connectionConfig.value.port = defaultPort.value || null;
  tableList.value = [];
  localTableName.value = '';
  availableColumns.value = [];
  selectedColumns.value = [];
  syncData();
}

function onQueryModeChange() {
  syncData();
}

function onTableChange() {
  availableColumns.value = [];
  selectedColumns.value = [];
  loadColumns();
  syncData();
}

watch(
  () => props.typeData,
  (val) => {
    if (val) {
      if (val.connectionConfig) connectionConfig.value = { ...connectionConfig.value, ...val.connectionConfig };
      if (val.queryMode !== undefined) localQueryMode.value = val.queryMode;
      if (val.tableName !== undefined) localTableName.value = val.tableName;
      if (val.sqlQuery !== undefined) localSqlQuery.value = val.sqlQuery;
      if (val.selectedColumns !== undefined) selectedColumns.value = val.selectedColumns;
      if (val.sqlColumnMappings !== undefined) sqlColumnMappings.value = val.sqlColumnMappings;
    }
  },
  { deep: true },
);

function isColumnSelected(columnName: string): boolean {
  return selectedColumns.value.some((c) => c.columnName === columnName);
}

function getColumnTagId(columnName: string): string {
  return selectedColumns.value.find((c) => c.columnName === columnName)?.tagId ?? '';
}

function updateColumnTagId(columnName: string, tagId: string) {
  const col = selectedColumns.value.find((c) => c.columnName === columnName);
  if (col) {
    col.tagId = tagId;
  }
}

function toggleColumn(col: ColumnInfo, checked: boolean) {
  if (checked) {
    selectedColumns.value.push({
      columnName: col.name,
      tagId: `db_${col.name}`,
      tagName: col.name,
      dataType: col.type,
    });
  } else {
    selectedColumns.value = selectedColumns.value.filter((c) => c.columnName !== col.name);
  }
  syncData();
}

function syncData() {
  emitUpdate(emit, {
    connectionConfig: { ...connectionConfig.value },
    queryMode: localQueryMode.value,
    tableName: localTableName.value,
    sqlQuery: localSqlQuery.value,
    selectedColumns: selectedColumns.value,
    sqlColumnMappings: sqlColumnMappings.value,
  });
}

async function testConnection() {
  const projectId = props.projectId || (props.form as any).projectId;
  if (!projectId) {
    showAlert(t('dataPanel.projectNotSelected') || '未选择项目', undefined, 'info');
    return;
  }
  if (!connectionConfig.value.dbType) {
    showAlert(t('dataPanel.pleaseSelectDbType') || '请选择数据库类型', undefined, 'info');
    return;
  }
  try {
    const res = await dbConnectionApi.executeQuery(projectId, 'test', JSON.stringify(connectionConfig.value));
    const testData = res.data as unknown as { success: boolean; latency: number; error?: string };
    if (testData?.success) {
      showSuccess((t('dataPanel.testConnectionSuccess') || '连接成功') + `，耗时 ${testData.latency}ms`);
    } else {
      showError((t('dataPanel.testConnectionFailed') || '连接失败') + ': ' + (testData?.error || t('dataPanel.unknownError')));
    }
  } catch (err: any) {
    showError((t('dataPanel.testConnectionFailed') || '连接失败') + ': ' + (err.message || t('dataPanel.unknownError')));
  }
}

async function testQuery() {
  const projectId = props.projectId || (props.form as any).projectId;
  const dsId = props.dataSourceId || (props.form as any).id;
  if (!projectId || !dsId) {
    showAlert(t('dataPanel.pleaseSaveDataSourceFirst') || '请先保存数据源后再测试查询', undefined, 'info');
    return;
  }
  try {
    const res = await dataSourceApi.test(projectId, dsId);
    if (res.data?.success) {
      showSuccess((t('dataPanel.testQuerySuccess') || '测试查询成功') + `，耗时 ${res.data.latency}ms`);
    } else {
      showError((t('dataPanel.testQueryFailed') || '测试查询失败') + ': ' + (res.data?.error || t('dataPanel.unknownError')));
    }
  } catch (err: any) {
    showError((t('dataPanel.testQueryFailed') || '测试查询失败') + ': ' + (err.message || t('dataPanel.unknownError')));
  }
}

onMounted(() => {
  if (connectionConfig.value.dbType && localTableName.value) {
    loadTables().then(() => {
      if (localTableName.value) {
        loadColumns();
      }
    });
  }
});

syncData();
</script>

<style scoped src="./source-editor-shared.css"></style>
<style scoped>
.db-source-editor {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.form-item-half {
  flex: 1;
  min-width: 0;
}

.readonly-input {
  background: var(--background);
  color: var(--text-secondary);
}

input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

input[type="radio"] {
  width: auto;
  cursor: pointer;
}

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text);
}

.btn-add {
  padding: 2px 8px;
  font-size: 11px;
  border-style: dashed;
}

.btn-remove {
  padding: 0 6px;
  font-size: 14px;
  line-height: 1;
  border: none;
  background: transparent;
  color: var(--status-error, #d03050);
  flex-shrink: 0;
}

.btn-remove:hover {
  background: color-mix(in srgb, var(--status-error, #d03050) 12%, transparent);
}

.column-table {
  margin-top: 2px;
}

.col-select {
  width: 40px;
}

.dynamic-pair-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dynamic-pair-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dynamic-pair-row > :first-child,
.dynamic-pair-row > :nth-child(2) {
  flex: 1;
  min-width: 0;
}
</style>
