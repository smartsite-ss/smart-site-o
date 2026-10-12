<template>
  <div
    v-if="visible"
    class="modal-overlay"
    @click.self="emit('update:visible', false)"
  >
    <div
      class="modal-card"
      style="width: 800px; max-width: 95vw;"
    >
      <div class="modal-header">
        <span class="modal-title">{{ $t('dataPanel.fileImport') }}</span>
        <button
          class="btn btn-text btn-tiny"
          @click="emit('update:visible', false)"
        >
          ✕
        </button>
      </div>

      <div class="modal-body">
        <div class="file-import">
          <div
            v-if="!previewData"
            class="upload-section"
          >
            <div
              class="upload-zone"
              @dragover.prevent
              @drop.prevent="handleDrop"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                class="file-input-hidden"
                @change="handleFileChange"
              >
              <div
                class="upload-placeholder"
                @click="triggerFileInput"
              >
                <div class="upload-icon">
                  📁
                </div>
                <div class="upload-text">
                  {{ $t('dataPanel.clickOrDragFile') }}
                </div>
                <div class="upload-hint">
                  {{ $t('dataPanel.supportedFormats') }}
                </div>
              </div>
            </div>

            <div
              v-if="parseError"
              class="alert alert-error"
            >
              <div class="alert-title">
                {{ parseError }}
              </div>
            </div>
          </div>

          <div
            v-else
            class="preview-section"
          >
            <div class="alert alert-success">
              {{ $t('dataPanel.parseSuccess', { rows: previewData.rows.length, cols: previewData.headers.length }) }}
            </div>

            <div class="preview-table-wrapper">
              <div class="preview-label">
                {{ $t('dataPanel.dataPreview10') }}
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th
                      v-for="(header, hIdx) in previewData.headers"
                      :key="hIdx"
                    >
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, rIdx) in previewRows"
                    :key="rIdx"
                  >
                    <td
                      v-for="(cell, cIdx) in row"
                      :key="cIdx"
                    >
                      {{ cell }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <hr class="divider">

            <div class="mapping-section">
              <div class="section-title">
                {{ $t('dataPanel.columnMapping') }}
              </div>
              <div
                v-for="(header, hIdx) in previewData.headers"
                :key="hIdx"
                class="mapping-row"
              >
                <input
                  type="checkbox"
                  :checked="columnMappings[hIdx] !== undefined"
                  @change="(e: Event) => toggleColumnMapping(hIdx, (e.target as HTMLInputElement).checked)"
                >
                <span class="mapping-source">{{ header }}</span>
                <span class="mapping-arrow">→</span>
                <select
                  v-if="columnMappings[hIdx] !== undefined"
                  v-model="columnMappings[hIdx]"
                  class="form-select form-select-sm"
                  style="width: 180px"
                >
                  <option
                    value=""
                    disabled
                  >
                    {{ $t('dataPanel.selectTargetField') }}
                  </option>
                  <option
                    v-for="opt in targetFieldOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
                <input
                  v-if="columnMappings[hIdx] !== undefined"
                  v-model="columnAliases[hIdx]"
                  class="form-input form-input-sm"
                  style="width: 140px"
                  :placeholder="$t('dataPanel.fieldAlias')"
                >
              </div>
            </div>

            <hr class="divider">

            <div class="import-options">
              <div class="section-title">
                {{ $t('dataPanel.importOptions') }}
              </div>
              <div class="row options-list">
                <div class="row row-sm row-center">
                  <span>{{ $t('dataPanel.skipHeaderRow') }}</span>
                  <input
                    v-model="skipHeader"
                    type="checkbox"
                    class="toggle-switch"
                  >
                </div>
                <div class="row row-sm row-center">
                  <span>{{ $t('dataPanel.enableTypeInference') }}</span>
                  <input
                    v-model="inferTypes"
                    type="checkbox"
                    class="toggle-switch"
                  >
                </div>
              </div>
            </div>

            <div
              v-if="importing"
              class="progress-section"
            >
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: importProgress + '%' }"
                >
                  {{ importProgress }}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="row row-between">
          <button
            v-if="previewData"
            class="btn"
            @click="resetImport"
          >
            {{ $t('dataPanel.reselectFile') }}
          </button>
          <span v-else />
          <div class="row row-sm">
            <button
              class="btn"
              @click="emit('update:visible', false)"
            >
              {{ $t('dataPanel.cancel') }}
            </button>
            <button
              v-if="previewData"
              class="btn btn-primary"
              :disabled="importing"
              @click="handleImport"
            >
              <span v-if="importing">{{ $t('dataPanel.importing') }}</span>
              <span v-else>{{ $t('dataPanel.startImport') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { i18n } from '@scada-editor/core'

interface PreviewData {
  headers: string[]
  rows: string[][]
}

const _props = defineProps<{
  visible: boolean
  projectId: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'imported:data', data: Record<string, unknown>[]): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const previewData = ref<PreviewData | null>(null)
const parseError = ref<string | null>(null)
const columnMappings = ref<Record<number, string>>({})
const columnAliases = ref<Record<number, string>>({})
const skipHeader = ref(true)
const inferTypes = ref(true)
const importing = ref(false)
const importProgress = ref(0)

const targetFieldOptions = computed(() => [
  { label: i18n.global.t('dataPanel.fieldTagId'), value: 'tagId' },
  { label: i18n.global.t('dataPanel.fieldTagName'), value: 'tagName' },
  { label: i18n.global.t('dataPanel.fieldValue'), value: 'value' },
  { label: i18n.global.t('dataPanel.fieldTimestamp'), value: 'timestamp' },
  { label: i18n.global.t('dataPanel.fieldQuality'), value: 'quality' },
  { label: i18n.global.t('dataPanel.fieldDescription'), value: 'description' },
  { label: i18n.global.t('dataPanel.fieldUnit'), value: 'unit' },
  { label: i18n.global.t('dataPanel.fieldMinValue'), value: 'minValue' },
  { label: i18n.global.t('dataPanel.fieldMaxValue'), value: 'maxValue' },
  { label: i18n.global.t('dataPanel.fieldDataType'), value: 'dataType' },
])

const previewRows = computed(() => {
  if (!previewData.value) return []
  return previewData.value.rows.slice(0, 10)
})

function triggerFileInput() {
  fileInput.value?.click()
}

function parseCSVContent(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let cell = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(cell.trim())
        cell = ''
      } else {
        cell += ch
      }
    }
    result.push(cell.trim())
    return result
  }
  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}

function parseJSONContent(text: string): { headers: string[]; rows: string[][] } {
  const data = JSON.parse(text)
  const arr = Array.isArray(data) ? data : [data]
  if (arr.length === 0) return { headers: [], rows: [] }
  const headers = Object.keys(arr[0])
  const rows = arr.map((item: Record<string, unknown>) =>
    headers.map((h) => String(item[h] ?? ''))
  )
  return { headers, rows }
}

async function processFile(file: File) {
  parseError.value = null
  previewData.value = null

  const fileName = file.name.toLowerCase()

  try {
    const text = await file.text()

    if (fileName.endsWith('.csv')) {
      previewData.value = parseCSVContent(text)
    } else if (fileName.endsWith('.json')) {
      previewData.value = parseJSONContent(text)
    } else {
      parseError.value = i18n.global.t('dataPanel.unsupportedFileFormat')
      return
    }
  } catch (err: any) {
    parseError.value = i18n.global.t('dataPanel.parseFailed', { error: err instanceof Error ? err.message : i18n.global.t('dataPanel.unknownError') })
    return
  }

  if (previewData.value && previewData.value.headers.length > 0) {
    columnMappings.value = {}
    columnAliases.value = {}
    previewData.value.headers.forEach((header, idx) => {
      const match = targetFieldOptions.value.find(
        (opt) => opt.label === header || opt.value === header
      )
      if (match) {
        columnMappings.value[idx] = match.value
        columnAliases.value[idx] = header
      }
    })
  }
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  processFile(file)
}

function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  processFile(file)
}

function toggleColumnMapping(idx: number, val: boolean) {
  if (val) {
    columnMappings.value[idx] = ''
    columnAliases.value[idx] = previewData.value?.headers[idx] || ''
  } else {
    delete columnMappings.value[idx]
    delete columnAliases.value[idx]
  }
}

function resetImport() {
  previewData.value = null
  parseError.value = null
  columnMappings.value = {}
  columnAliases.value = {}
  importing.value = false
  importProgress.value = 0
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function handleImport() {
  if (!previewData.value) return
  importing.value = true
  importProgress.value = 0

  const _headers = previewData.value.headers
  const rows = previewData.value.rows
  const mappedCols = Object.entries(columnMappings.value)

  const totalRows = rows.length
  const importedRows: Record<string, unknown>[] = []

  for (let i = 0; i < totalRows; i++) {
    const row: Record<string, unknown> = {}
    mappedCols.forEach(([colIdx, targetField]) => {
      const idx = Number(colIdx)
      let value: unknown = rowValue(rows[i], idx)
      if (inferTypes.value && typeof value === 'string') {
        value = inferValueType(value)
      }
      row[targetField] = value
      const alias = columnAliases.value[idx]
      if (alias && alias !== targetField) {
        row[`${targetField}_alias`] = alias
      }
    })
    importedRows.push(row)
    importProgress.value = Math.round(((i + 1) / totalRows) * 100)
    if (i % 50 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  emit('imported:data', importedRows)
  importing.value = false
  importProgress.value = 100
  emit('update:visible', false)
}

function rowValue(row: string[], idx: number): string {
  if (idx < row.length) {
    return row[idx]
  }
  return ''
}

function inferValueType(value: string): unknown {
  if (/^\d+\.?\d*$/.test(value)) {
    return parseFloat(value)
  }
  if (/^(true|false)$/i.test(value)) {
    return value.toLowerCase() === 'true'
  }
  if (value === 'null' || value === 'undefined') {
    return null
  }
  return value
}
</script>

<style scoped>
.file-import {
  min-height: 350px;
}

.upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-zone {
  width: 100%;
  border: 2px dashed var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.upload-zone:hover {
  border-color: var(--status-info);
}

.file-input-hidden {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text);
}

.upload-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

.preview-section {
  display: flex;
  flex-direction: column;
}

.preview-table-wrapper {
  margin-bottom: 12px;
  overflow-x: auto;
}

.preview-label {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
}

.data-table th {
  background: color-mix(in srgb, var(--border) 20%, transparent);
  font-weight: 600;
}

.data-table tr:hover td {
  background: color-mix(in srgb, var(--border) 6%, transparent);
}

.mapping-section {
  margin-bottom: 12px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}

.mapping-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  padding: 4px 0;
}

.mapping-source {
  font-size: 13px;
  min-width: 80px;
  color: var(--text);
}

.mapping-arrow {
  color: var(--text-secondary);
  font-size: 14px;
}

.import-options {
  margin-bottom: 12px;
}

.options-list {
  flex-direction: column;
}

.progress-section {
  margin-top: 16px;
}

.progress-bar {
  width: 100%;
  height: 24px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--status-info);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.3s;
  min-width: 40px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: var(--surface);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 12px 0;
}

.alert {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 12px;
}

.alert-success {
  background: color-mix(in srgb, var(--status-success) 8%, transparent);
  border: 1px solid var(--status-success);
  margin-top: 0;
  margin-bottom: 12px;
}

.alert-error {
  background: color-mix(in srgb, var(--status-error) 8%, transparent);
  border: 1px solid var(--status-error);
  width: 100%;
}

.alert-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.form-input {
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

.row-between {
  justify-content: space-between;
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
  opacity: 0.5;
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
  padding: 2px 6px;
}
</style>