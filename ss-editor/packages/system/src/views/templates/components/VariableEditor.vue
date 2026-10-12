<template>
  <div class="variable-editor">
    <div class="editor-toolbar">
      <h3 class="section-title">
        {{ $t('system.deviceTemplate.variables') }}
        <span class="count">({{ localVariables.length }})</span>
      </h3>
      <div class="toolbar-actions">
        <button
          class="btn btn-primary"
          @click="addVariable"
        >
          + {{ $t('system.deviceTemplate.addVariable') }}
        </button>
        <button
          class="btn btn-success"
          :disabled="!hasChanges"
          @click="handleSave"
        >
          {{ $t('system.deviceTemplate.saveVariables') }}
        </button>
      </div>
    </div>

    <div
      v-if="localVariables.length === 0"
      class="empty-hint"
    >
      {{ $t('system.deviceTemplate.noVariables') }}
    </div>

    <div
      v-else
      class="table-wrapper"
    >
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ $t('system.deviceTemplate.varName') }}</th>
            <th>{{ $t('system.deviceTemplate.varAddress') }}</th>
            <th>{{ $t('system.deviceTemplate.varDataType') }}</th>
            <th>{{ $t('system.deviceTemplate.varScanRate') }}</th>
            <th>{{ $t('system.deviceTemplate.varEnabled') }}</th>
            <th>{{ $t('system.deviceTemplate.varCategory') }}</th>
            <th>{{ $t('system.deviceTemplate.actionsLabel') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(v, idx) in localVariables"
            :key="v._key || idx"
            :class="{ 'edit-row': editingIndex === idx }"
          >
            <td class="text-muted">
              {{ v.order != null ? v.order : idx + 1 }}
            </td>
            <td class="name-cell">
              <input
                v-if="editingIndex === idx"
                v-model="editForm.name"
                class="inline-input"
                :placeholder="$t('system.deviceTemplate.varName')"
              >
              <span v-else>{{ v.name || '-' }}</span>
            </td>
            <td>
              <input
                v-if="editingIndex === idx"
                v-model="editForm.address"
                class="inline-input"
                :placeholder="$t('system.deviceTemplate.varAddress')"
              >
              <code v-else>{{ v.address || '-' }}</code>
            </td>
            <td>
              <select
                v-if="editingIndex === idx"
                v-model="editForm.dataType"
                class="inline-select"
              >
                <option value="">
                  {{ $t('system.deviceTemplate.selectDataType') }}
                </option>
                <option
                  v-for="opt in dataTypeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
              <span
                v-else
                class="badge badge-sm"
              >{{ v.dataType || '-' }}</span>
            </td>
            <td>
              <input
                v-if="editingIndex === idx"
                v-model.number="editForm.scanRate"
                type="number"
                class="inline-input inline-input-narrow"
                :placeholder="$t('system.deviceTemplate.varScanRate')"
                min="0"
              >
              <span v-else>{{ v.scanRate ? v.scanRate + 'ms' : '-' }}</span>
            </td>
            <td class="text-center">
              <input
                v-if="editingIndex === idx"
                v-model="editForm.enabled"
                type="checkbox"
                class="inline-checkbox"
              >
              <span
                v-else
                class="status-dot"
                :class="v.enabled !== false ? 'online' : 'offline'"
              />
            </td>
            <td>
              <select
                v-if="editingIndex === idx"
                v-model="editForm.category"
                class="inline-select"
              >
                <option value="">
                  {{ $t('system.deviceTemplate.selectCategory') }}
                </option>
                <option
                  v-for="opt in categoryOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
              <span v-else>{{ v.category || '-' }}</span>
            </td>
            <td class="action-cell">
              <template v-if="editingIndex === idx">
                <button
                  class="btn-icon btn-icon-save"
                  :title="$t('system.deviceTemplate.confirmSave')"
                  @click="confirmEdit(idx)"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  class="btn-icon btn-icon-cancel"
                  :title="$t('system.deviceTemplate.cancelEdit')"
                  @click="cancelEdit"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line
                      x1="18"
                      y1="6"
                      x2="6"
                      y2="18"
                    /><line
                      x1="6"
                      y1="6"
                      x2="18"
                      y2="18"
                    />
                  </svg>
                </button>
              </template>
              <template v-else>
                <button
                  class="btn-icon"
                  :title="$t('system.deviceTemplate.editVariable')"
                  @click="startEdit(idx)"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  class="btn-icon btn-icon-danger"
                  :title="$t('system.deviceTemplate.deleteVariable')"
                  @click="removeVariable(idx)"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { useI18n } from '@scada-editor/core';
import type { DeviceTemplateVariable } from '../../../api/modules/template.api';
import { useDict } from '../../../composables/useDict';

const { t: _t, locale } = useI18n();
const { loadDict, getOptions } = useDict();

// 加载字典
onMounted(() => {
  loadDict('tagDataType', locale.value);
  loadDict('variableCategory', locale.value);
});

const dataTypeOptions = computed(() => getOptions('tagDataType'));
const categoryOptions = computed(() => getOptions('variableCategory'));

const props = defineProps<{
  variables: DeviceTemplateVariable[];
  templateId: string;
}>();

const emit = defineEmits<{
  save: [variables: DeviceTemplateVariable[]];
}>();

interface VariableWithKey extends DeviceTemplateVariable {
  _key?: string;
}

const localVariables = ref<VariableWithKey[]>([]);
const editingIndex = ref<number | null>(null);
const hasChanges = ref(false);

let keyCounter = 0;

const emptyEditForm = (): DeviceTemplateVariable => ({
  guid: crypto.randomUUID(),
  order: 0,
  name: '',
  address: '',
  dataType: '',
  scanRate: undefined,
  enabled: true,
  category: '',
});

const editForm = reactive<DeviceTemplateVariable>(emptyEditForm());

watch(
  () => props.variables,
  (newVars) => {
    editingIndex.value = null;
    hasChanges.value = false;
    localVariables.value = (newVars || []).map((v) => ({
      ...v,
      _key: `var_${keyCounter++}`,
    }));
  },
  { immediate: true, deep: true },
);

function startEdit(idx: number) {
  const source = localVariables.value[idx];
  Object.assign(editForm, {
    order: source.order ?? idx + 1,
    name: source.name || '',
    address: source.address || '',
    dataType: source.dataType || '',
    scanRate: source.scanRate,
    enabled: source.enabled !== false,
    category: source.category || '',
  });
  editingIndex.value = idx;
}

function confirmEdit(idx: number) {
  localVariables.value[idx] = {
    ...localVariables.value[idx],
    order: idx + 1,
    name: editForm.name,
    address: editForm.address,
    dataType: editForm.dataType,
    scanRate: editForm.scanRate,
    enabled: editForm.enabled,
    category: editForm.category,
  };
  editingIndex.value = null;
  hasChanges.value = true;
}

function cancelEdit() {
  editingIndex.value = null;
}

function addVariable() {
  if (editingIndex.value !== null) return;
  const newVar: VariableWithKey = {
    ...emptyEditForm(),
    order: localVariables.value.length + 1,
    _key: `new_${keyCounter++}`,
  };
  localVariables.value.push(newVar);
  editingIndex.value = localVariables.value.length - 1;
  Object.assign(editForm, newVar);
}

function removeVariable(idx: number) {
  localVariables.value.splice(idx, 1);
  localVariables.value.forEach((v, i) => {
    v.order = i + 1;
  });
  hasChanges.value = true;
}

function handleSave() {
  const cleanVariables: DeviceTemplateVariable[] = localVariables.value.map(
    ({ _key, ...rest }) => rest,
  );
  emit('save', cleanVariables);
  hasChanges.value = false;
}
</script>

<style scoped>
.variable-editor {
  background: var(--surface);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 400;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: var(--text); }
.btn-primary:hover { opacity: 0.9; }
.btn-success { background: var(--status-online); color: var(--text); }
.btn-success:hover { opacity: 0.9; }

.table-wrapper { overflow-x: auto; }

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.data-table tr:hover td {
  background: rgba(255,255,255,0.02);
}

.edit-row td {
  background: rgba(26,115,232,0.04);
}

.name-cell {
  font-weight: 500;
}

.text-muted { color: var(--text-secondary); font-size: 12px; }
.text-center { text-align: center; }

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(26,115,232,0.1);
  color: var(--primary);
  font-size: 11px;
  font-weight: 500;
}

.badge-sm { font-size: 10px; padding: 1px 6px; }

code {
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--background);
  font-size: 12px;
  font-family: monospace;
}

.inline-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--primary);
  border-radius: 4px;
  font-size: 13px;
  background: var(--surface);
  color: var(--text);
  outline: none;
  box-sizing: border-box;
}

.inline-input-narrow {
  max-width: 80px;
}

.inline-select {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--primary);
  border-radius: 4px;
  font-size: 13px;
  background: var(--surface);
  color: var(--text);
  outline: none;
  box-sizing: border-box;
}

.inline-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--primary);
}

.action-cell {
  white-space: nowrap;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: var(--border);
  color: var(--text);
}

.btn-icon-save:hover {
  background: color-mix(in srgb, var(--status-online) 15%, transparent);
  color: var(--status-online);
}

.btn-icon-cancel:hover {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  color: var(--status-error);
}

.btn-icon-danger:hover {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  color: var(--status-error);
}

.empty-hint {
  color: var(--text-secondary);
  font-size: 13px;
  font-style: italic;
  padding: 20px 0;
  text-align: center;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online { background: var(--status-online); }
.status-dot.offline { background: var(--text-secondary); }
</style>