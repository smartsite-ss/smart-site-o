<template>
  <div class="filter-chain-editor">
    <div class="filter-chain-toolbar">
      <div class="dropdown">
        <button
          class="btn btn-primary btn-sm"
          @click="toggleDropdown"
        >
          {{ $t('filterChain.addFilter') }}
        </button>
        <div
          v-if="dropdownOpen"
          class="dropdown-menu"
        >
          <div
            v-for="opt in addFilterOptions"
            :key="opt.value"
            class="dropdown-item"
            @click="handleAddFilter(opt.value as FilterType); closeDropdown()"
          >
            {{ opt.label }}
          </div>
        </div>
      </div>
      <span class="filter-chain-count">{{ $t('filterChain.totalFilters', { count: filters.length }) }}</span>
    </div>

    <div class="filter-chain-list">
      <div
        v-for="(filter, index) in filters"
        :key="filter.id"
        class="card filter-card"
      >
        <div class="card-header filter-card-header">
          <span class="filter-card-title">{{ typeLabel(filter.type) }}</span>
          <div class="row row-sm row-center">
            <span
              v-if="!filter.enabled"
              class="tag tag-warning"
            >{{ $t('filterChain.disabled') }}</span>
            <button
              class="btn btn-text btn-tiny"
              :disabled="index === 0"
              @click="moveUp(index)"
            >
              ↑
            </button>
            <button
              class="btn btn-text btn-tiny"
              :disabled="index === filters.length - 1"
              @click="moveDown(index)"
            >
              ↓
            </button>
            <button
              class="btn btn-text btn-tiny btn-danger"
              @click="removeFilter(index)"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="card-body filter-card-body">
          <div class="form">
            <div class="form-item">
              <label class="form-label">{{ $t('filterChain.name') }}</label>
              <input
                v-model="filter.name"
                class="form-input form-input-sm"
                @input="emitUpdate"
              >
            </div>

            <div class="form-item">
              <label class="form-label">{{ $t('filterChain.filterType') }}</label>
              <select
                v-model="filter.type"
                class="form-select form-select-sm"
                @change="(e: Event) => onFilterTypeChange(index, (e.target as HTMLSelectElement).value as FilterType)"
              >
                <option
                  v-for="opt in filterTypeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="form-item">
              <label class="form-label">{{ $t('filterChain.enabled') }}</label>
              <input
                v-model="filter.enabled"
                type="checkbox"
                class="toggle-switch"
                @change="emitUpdate"
              >
            </div>

            <hr class="divider">

            <template v-if="filter.type === 'fieldExtract'">
              <div class="form-item">
                <label class="form-label">{{ $t('filterChain.jsonPath') }}</label>
                <input
                  v-model="(filter.config as any).jsonPath"
                  class="form-input form-input-sm"
                  placeholder="$.data.value"
                  @input="emitUpdate"
                >
              </div>
            </template>

            <template v-if="filter.type === 'typeConvert'">
              <div class="form-item">
                <label class="form-label">{{ $t('filterChain.targetType') }}</label>
                <select
                  v-model="(filter.config as any).targetType"
                  class="form-select form-select-sm"
                  @change="emitUpdate"
                >
                  <option
                    v-for="opt in targetTypeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </template>

            <template v-if="filter.type === 'scaleTransform'">
              <div class="form-item">
                <label class="form-label">{{ $t('filterChain.scale') }}</label>
                <input
                  v-model.number="(filter.config as any).scale"
                  type="number"
                  class="form-input form-input-sm"
                  step="0.1"
                  @input="emitUpdate"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('filterChain.offset') }}</label>
                <input
                  v-model.number="(filter.config as any).offset"
                  type="number"
                  class="form-input form-input-sm"
                  step="1"
                  @input="emitUpdate"
                >
              </div>
            </template>

            <template v-if="filter.type === 'deadband'">
              <div class="form-item">
                <label class="form-label">{{ $t('filterChain.threshold') }}</label>
                <input
                  v-model.number="(filter.config as any).threshold"
                  type="number"
                  class="form-input form-input-sm"
                  min="0"
                  step="0.01"
                  @input="emitUpdate"
                >
              </div>
            </template>

            <template v-if="filter.type === 'format'">
              <div class="form-item">
                <label class="form-label">{{ $t('filterChain.precision') }}</label>
                <input
                  v-model.number="(filter.config as any).precision"
                  type="number"
                  class="form-input form-input-sm"
                  min="0"
                  max="10"
                  @input="emitUpdate"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('filterChain.formatType') }}</label>
                <select
                  v-model="(filter.config as any).formatType"
                  class="form-select form-select-sm"
                  @change="emitUpdate"
                >
                  <option
                    v-for="opt in formatTypeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </template>

            <template v-if="filter.type === 'custom'">
              <div class="form-item">
                <label class="form-label">{{ $t('filterChain.script') }}</label>
                <textarea
                  v-model="(filter.config as any).script"
                  class="form-textarea form-textarea-sm"
                  rows="4"
                  :placeholder="$t('filterChain.customScriptPlaceholder')"
                  @input="emitUpdate"
                />
              </div>
            </template>
          </div>
        </div>
      </div>

      <div
        v-if="filters.length === 0"
        class="alert alert-info"
      >
        {{ $t('filterChain.emptyHint') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DataFilter, FilterType } from '@scada-editor/core'
import { i18n } from '@scada-editor/core'

let idCounter = 0

const props = defineProps<{
  modelValue: DataFilter[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: DataFilter[]): void
}>()

const filters = computed<DataFilter[]>({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const dropdownOpen = ref(false)

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const filterTypeOptions = computed(() => [
  { label: i18n.global.t('filterChain.fieldExtract'), value: 'fieldExtract' },
  { label: i18n.global.t('filterChain.typeConvert'), value: 'typeConvert' },
  { label: i18n.global.t('filterChain.scaleTransform'), value: 'scaleTransform' },
  { label: i18n.global.t('filterChain.deadband'), value: 'deadband' },
  { label: i18n.global.t('filterChain.format'), value: 'format' },
  { label: i18n.global.t('filterChain.customScript'), value: 'custom' },
])

const addFilterOptions = computed(() => filterTypeOptions.value.map((opt) => ({
  ...opt,
  key: opt.value,
})))

const targetTypeOptions = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Object', value: 'object' },
  { label: 'Array', value: 'array' },
  { label: 'Date', value: 'date' },
]

const formatTypeOptions = computed(() => [
  { label: i18n.global.t('filterChain.decimal'), value: 'decimal' },
  { label: i18n.global.t('filterChain.scientific'), value: 'scientific' },
  { label: i18n.global.t('filterChain.hex'), value: 'hex' },
  { label: i18n.global.t('filterChain.binary'), value: 'binary' },
  { label: i18n.global.t('filterChain.percentage'), value: 'percentage' },
])

const typeLabel = (type: FilterType) => {
  const opt = filterTypeOptions.value.find((o) => o.value === type)
  return opt?.label ?? type
}

const createDefaultConfig = (type: FilterType) => {
  switch (type) {
    case 'fieldExtract':
      return { jsonPath: '', enabled: true }
    case 'typeConvert':
      return { targetType: 'string', enabled: true }
    case 'scaleTransform':
      return { scale: 1, offset: 0, enabled: true }
    case 'deadband':
      return { threshold: 0, enabled: true }
    case 'format':
      return { precision: 2, formatType: 'decimal', enabled: true }
    case 'custom':
      return { script: '', enabled: true }
  }
}

const generateId = () => `filter-${Date.now()}-${++idCounter}`

const handleAddFilter = (type: FilterType) => {
  const newFilter: DataFilter = {
    id: generateId(),
    name: '',
    type,
    config: createDefaultConfig(type) as any,
    enabled: true,
    order: filters.value.length,
  }
  emit('update:modelValue', [...filters.value, newFilter])
}

const removeFilter = (index: number) => {
  const updated = [...filters.value]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}

const moveUp = (index: number) => {
  if (index <= 0) return
  const updated = [...filters.value]
  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
  emit('update:modelValue', updated)
}

const moveDown = (index: number) => {
  if (index >= filters.value.length - 1) return
  const updated = [...filters.value]
  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
  emit('update:modelValue', updated)
}

const onFilterTypeChange = (index: number, newType: FilterType) => {
  const updated = [...filters.value]
  updated[index] = {
    ...updated[index],
    type: newType,
    config: createDefaultConfig(newType) as any,
  }
  emit('update:modelValue', updated)
}

const emitUpdate = () => {
  emit('update:modelValue', [...filters.value])
}
</script>

<style scoped>
.filter-chain-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-chain-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-chain-count {
  font-size: 12px;
  color: var(--text-tertiary);
}

.filter-chain-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-card {
  border: 1px solid var(--border);
}

.filter-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.filter-card-title {
  font-weight: 600;
  font-size: 13px;
}

.filter-card-body {
  padding: 4px 0;
}

.card {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
}

.card-header {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.card-body {
  padding-top: 8px;
}

.alert {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.alert-info {
  background: color-mix(in srgb, var(--status-info) 8%, transparent);
  border: 1px solid var(--status-info);
}

.tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
}

.tag-warning {
  background: color-mix(in srgb, var(--status-warning) 12%, transparent);
  color: var(--status-warning);
}

.divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 8px 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-label {
  width: 90px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
}

.form-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--surface);
  color: var(--text);
  outline: none;
}

.form-input:focus {
  border-color: var(--status-info);
}

.form-input-sm {
  font-size: 12px;
  padding: 3px 6px;
}

.form-select {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--surface);
  color: var(--text);
  outline: none;
}

.form-select-sm {
  font-size: 12px;
  padding: 3px 6px;
}

.form-textarea {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--surface);
  color: var(--text);
  outline: none;
  resize: vertical;
}

.form-textarea-sm {
  font-size: 12px;
  padding: 3px 6px;
}

.toggle-switch {
  appearance: none;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--border);
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  border: none;
  outline: none;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}

.toggle-switch:checked {
  background: var(--status-info);
}

.toggle-switch:checked::after {
  transform: translateX(16px);
}

.row {
  display: flex;
  gap: 8px;
}

.row-sm {
  gap: 4px;
}

.row-center {
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  opacity: 0.85;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--status-info);
  color: #fff;
  border-color: var(--status-info);
}

.btn-text {
  background: transparent;
  border: none;
  padding: 2px 4px;
}

.btn-tiny {
  font-size: 12px;
  padding: 2px 4px;
}

.btn-danger {
  color: var(--status-error);
}

.btn-sm {
  font-size: 12px;
  padding: 3px 8px;
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  min-width: 160px;
  margin-top: 4px;
  padding: 4px 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: color-mix(in srgb, var(--status-info) 8%, transparent);
}
</style>