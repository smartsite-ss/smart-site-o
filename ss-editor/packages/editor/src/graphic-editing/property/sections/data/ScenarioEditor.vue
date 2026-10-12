<template>
  <div
    v-if="visible"
    class="modal-overlay"
    @click.self="emit('update:visible', false)"
  >
    <div
      class="modal-card"
      style="width: 900px; max-width: 95vw;"
    >
      <div class="modal-header">
        <span class="modal-title">{{ $t('scenarioEditor.title') }}</span>
        <button
          class="btn btn-text btn-tiny"
          @click="emit('update:visible', false)"
        >
          ✕
        </button>
      </div>

      <div class="modal-body">
        <div class="scenario-editor">
          <div class="scenario-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title">{{ $t('scenarioEditor.scenarioList') }}</span>
              <button
                class="btn btn-primary btn-tiny"
                @click="addScenario"
              >
                + {{ $t('scenarioEditor.add') }}
              </button>
            </div>
            <div class="scenario-list">
              <div
                v-for="scenario in scenarios"
                :key="scenario.id"
                class="scenario-item"
                :class="{ active: selectedId === scenario.id }"
                @click="selectScenario(scenario.id)"
              >
                <span class="scenario-name">{{ scenario.name }}</span>
                <button
                  class="btn btn-text btn-tiny btn-danger"
                  @click.stop="deleteScenario(scenario.id)"
                >
                  {{ $t('scenarioEditor.delete') }}
                </button>
              </div>
              <div
                v-if="scenarios.length === 0"
                class="empty-hint"
              >
                {{ $t('scenarioEditor.emptyScenarioHint') }}
              </div>
            </div>
          </div>

          <div class="scenario-detail">
            <template v-if="selectedScenario">
              <div class="form-item">
                <label class="form-label">{{ $t('scenarioEditor.scenarioName') }}</label>
                <input
                  v-model="selectedScenario.name"
                  class="form-input"
                  :placeholder="$t('scenarioEditor.scenarioNamePlaceholder')"
                >
              </div>

              <div class="form-item">
                <label class="form-label">{{ $t('scenarioEditor.description') }}</label>
                <textarea
                  v-model="selectedScenario.description"
                  class="form-textarea"
                  rows="3"
                  :placeholder="$t('scenarioEditor.descriptionPlaceholder')"
                />
              </div>

              <hr class="divider">

              <div class="steps-header">
                <span class="steps-title">{{ $t('scenarioEditor.stepList') }}</span>
                <button
                  class="btn btn-primary btn-tiny"
                  @click="addStep"
                >
                  + {{ $t('scenarioEditor.addStep') }}
                </button>
              </div>

              <div class="steps-list">
                <div
                  v-for="(step, index) in selectedScenario.steps"
                  :key="step.id"
                  class="step-item"
                >
                  <div class="step-header">
                    <span class="step-order">#{{ index + 1 }}</span>
                    <select
                      v-model="step.action"
                      class="form-select form-select-sm"
                      style="width: 150px"
                    >
                      <option
                        v-for="opt in actionOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                    <div
                      class="input-group"
                      style="width: 120px"
                    >
                      <input
                        v-model.number="step.delay"
                        type="number"
                        class="form-input form-input-sm"
                        min="0"
                        step="100"
                        :placeholder="$t('scenarioEditor.delay')"
                      >
                      <span class="input-suffix">ms</span>
                    </div>
                    <div
                      v-if="step.action === 'wait'"
                      class="input-group"
                      style="width: 120px"
                    >
                      <input
                        v-model.number="step.duration"
                        type="number"
                        class="form-input form-input-sm"
                        min="0"
                        step="100"
                        :placeholder="$t('scenarioEditor.duration')"
                      >
                      <span class="input-suffix">ms</span>
                    </div>
                    <div class="row row-sm row-center">
                      <button
                        class="btn btn-text btn-tiny"
                        :disabled="index === 0"
                        @click="moveStepUp(index)"
                      >
                        ↑
                      </button>
                      <button
                        class="btn btn-text btn-tiny"
                        :disabled="index === selectedScenario.steps.length - 1"
                        @click="moveStepDown(index)"
                      >
                        ↓
                      </button>
                      <button
                        class="btn btn-text btn-tiny btn-primary"
                        @click="addStepAfter(index)"
                      >
                        +{{ $t('scenarioEditor.insert') }}
                      </button>
                      <button
                        class="btn btn-text btn-tiny btn-danger"
                        @click="removeStep(index)"
                      >
                        {{ $t('scenarioEditor.delete') }}
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="step.action !== 'wait' && step.action !== 'switchScenario'"
                    class="step-params"
                  >
                    <details class="collapse">
                      <summary class="collapse-summary">
                        {{ $t('scenarioEditor.paramConfig') }}
                      </summary>
                      <div class="collapse-content">
                        <div
                          v-for="(paramValue, paramKey, pIndex) in (step.params || {})"
                          :key="pIndex"
                          class="param-row"
                        >
                          <input
                            :value="paramKey"
                            class="form-input form-input-sm"
                            :placeholder="paramKey"
                            style="flex: 1"
                            @input="(e: Event) => updateParamKey(step, paramKey as string, (e.target as HTMLInputElement).value)"
                          >
                          <input
                            :value="paramValue"
                            class="form-input form-input-sm"
                            :placeholder="$t('scenarioEditor.value')"
                            style="flex: 2"
                            @input="(e: Event) => { (step.params as Record<string, unknown>)[paramKey as string] = (e.target as HTMLInputElement).value; }"
                          >
                          <button
                            class="btn btn-text btn-tiny btn-danger"
                            @click="removeParam(step, paramKey as string)"
                          >
                            ×
                          </button>
                        </div>
                        <button
                          class="btn btn-dashed btn-tiny"
                          @click="addParam(step)"
                        >
                          + {{ $t('scenarioEditor.addParam') }}
                        </button>
                      </div>
                    </details>
                  </div>
                </div>

                <div
                  v-if="selectedScenario.steps.length === 0"
                  class="empty-hint"
                >
                  {{ $t('scenarioEditor.emptyStepHint') }}
                </div>
              </div>

              <hr class="divider">

              <div class="global-settings">
                <span class="settings-title">{{ $t('scenarioEditor.globalSettings') }}</span>
                <div class="row row-sm row-center">
                  <span>{{ $t('scenarioEditor.loop') }}</span>
                  <input
                    v-model="selectedScenario.loop"
                    type="checkbox"
                    class="toggle-switch"
                  >
                </div>
                <div class="row row-sm row-center">
                  <span>{{ $t('scenarioEditor.speed') }}</span>
                  <input
                    v-model.number="selectedScenario.speed"
                    type="number"
                    class="form-input form-input-sm"
                    min="0.1"
                    max="10"
                    step="0.1"
                    style="width: 100px"
                  >
                </div>
              </div>
            </template>

            <div
              v-else
              class="no-selection"
            >
              {{ $t('scenarioEditor.selectScenarioHint') }}
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="row row-right">
          <button
            class="btn"
            @click="emit('update:visible', false)"
          >
            {{ $t('scenarioEditor.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            @click="handleSave"
          >
            {{ $t('scenarioEditor.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SimulationScenario, SimulationStep } from '@scada-editor/core'
import { i18n } from '@scada-editor/core'

const props = defineProps<{
  visible: boolean
  projectId: string
  scenarios: SimulationScenario[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'save:scenario', scenario: SimulationScenario): void
}>()

const selectedId = ref<string | null>(null)

const actionOptions = computed(() => [
  { label: i18n.global.t('scenarioEditor.setTagValue'), value: 'setTagValue' },
  { label: i18n.global.t('scenarioEditor.triggerAlarm'), value: 'triggerAlarm' },
  { label: i18n.global.t('scenarioEditor.acknowledgeAlarm'), value: 'acknowledgeAlarm' },
  { label: i18n.global.t('scenarioEditor.wait'), value: 'wait' },
  { label: i18n.global.t('scenarioEditor.executeScript'), value: 'executeScript' },
  { label: i18n.global.t('scenarioEditor.switchScenario'), value: 'switchScenario' },
])

const selectedScenario = computed({
  get: () => props.scenarios.find((s) => s.id === selectedId.value) || null,
  set: () => {},
})

function generateId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function addScenario() {
  const newScenario: SimulationScenario = {
    id: `scenario_${Date.now()}`,
    name: i18n.global.t('scenarioEditor.newScenario'),
    description: '',
    steps: [],
    loop: false,
    speed: 1,
    status: 'idle',
  }
  props.scenarios.push(newScenario)
  selectedId.value = newScenario.id
}

function deleteScenario(id: string) {
  const idx = props.scenarios.findIndex((s) => s.id === id)
  if (idx !== -1) {
    props.scenarios.splice(idx, 1)
    if (selectedId.value === id) {
      selectedId.value = props.scenarios.length > 0 ? props.scenarios[0].id : null
    }
  }
}

function selectScenario(id: string) {
  selectedId.value = id
}

function addStep() {
  if (!selectedScenario.value) return
  const step: SimulationStep = {
    id: generateId(),
    action: 'setTagValue',
    delay: 1000,
    params: {},
  }
  selectedScenario.value.steps.push(step)
}

function addStepAfter(index: number) {
  if (!selectedScenario.value) return
  const step: SimulationStep = {
    id: generateId(),
    action: 'setTagValue',
    delay: 1000,
    params: {},
  }
  selectedScenario.value.steps.splice(index + 1, 0, step)
}

function removeStep(index: number) {
  if (!selectedScenario.value) return
  selectedScenario.value.steps.splice(index, 1)
}

function moveStepUp(index: number) {
  if (!selectedScenario.value || index <= 0) return
  const steps = selectedScenario.value.steps
  ;[steps[index - 1], steps[index]] = [steps[index], steps[index - 1]]
}

function moveStepDown(index: number) {
  if (!selectedScenario.value || index >= selectedScenario.value.steps.length - 1) return
  const steps = selectedScenario.value.steps
  ;[steps[index], steps[index + 1]] = [steps[index + 1], steps[index]]
}

function addParam(step: SimulationStep) {
  if (!step.params) step.params = {}
  step.params[`param_${Object.keys(step.params).length + 1}`] = ''
}

function removeParam(step: SimulationStep, key: string) {
  if (!step.params) return
  delete step.params[key]
}

function updateParamKey(step: SimulationStep, oldKey: string, newKey: string) {
  if (!step.params || oldKey === newKey) return
  const value = step.params[oldKey]
  delete step.params[oldKey]
  step.params[newKey] = value
}

function handleSave() {
  if (!selectedScenario.value) return
  emit('save:scenario', selectedScenario.value)
  emit('update:visible', false)
}
</script>

<style scoped>
.scenario-editor {
  display: flex;
  gap: 16px;
  min-height: 450px;
}

.scenario-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding-right: 16px;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sidebar-title {
  font-weight: 600;
  font-size: 14px;
}

.scenario-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scenario-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.scenario-item:hover {
  background-color: var(--background);
}

.scenario-item.active {
  background-color: color-mix(in srgb, var(--status-info) 8%, transparent);
  border: 1px solid var(--status-info);
}

.scenario-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scenario-detail {
  flex: 1;
  overflow-y: auto;
  padding-left: 16px;
}

.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.steps-title {
  font-weight: 600;
  font-size: 14px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.step-item {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.step-order {
  font-weight: 700;
  color: var(--status-info);
  min-width: 24px;
}

.step-params {
  margin-top: 8px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.global-settings {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  padding: 8px 0;
}

.settings-title {
  font-weight: 600;
  font-size: 14px;
  margin-right: 8px;
}

.empty-hint {
  text-align: center;
  color: var(--text-secondary);
  padding: 24px 0;
  font-size: 13px;
}

.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
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

.form-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.form-label {
  width: 80px;
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

.input-group {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.input-group .form-input {
  border: none;
  border-radius: 0;
}

.input-suffix {
  padding: 0 6px;
  font-size: 12px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--border) 20%, transparent);
  white-space: nowrap;
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

.collapse {
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.collapse-summary {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: color-mix(in srgb, var(--border) 15%, transparent);
  user-select: none;
}

.collapse-content {
  padding: 8px 12px;
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

.row-right {
  justify-content: flex-end;
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
  padding: 2px 6px;
}

.btn-danger {
  color: var(--status-error);
}

.btn-dashed {
  border-style: dashed;
}
</style>