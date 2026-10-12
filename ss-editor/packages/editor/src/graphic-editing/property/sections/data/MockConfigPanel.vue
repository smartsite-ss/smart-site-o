<template>
  <div class="mock-config-panel">
    <div class="card">
      <div class="card-header">
        <span class="card-title">{{ $t('mockConfig.title') }}</span>
        <input
          v-model="config.enabled"
          type="checkbox"
          class="switch-toggle"
          @change="emitUpdate"
        >
      </div>

      <div class="card-body">
        <div class="form">
          <div class="form-item">
            <label class="form-label">{{ $t('mockConfig.mode') }}</label>
            <select
              v-model="config.mode"
              class="form-select"
              @change="onModeChange(config.mode)"
            >
              <option
                v-for="opt in modeOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <hr class="divider">

          <template v-if="config.mode === 'static'">
            <div class="form-item">
              <label class="form-label">{{ $t('mockConfig.staticValue') }}</label>
              <input
                v-model="config.staticValue"
                type="text"
                class="form-input"
                :placeholder="$t('mockConfig.staticPlaceholder')"
                @input="emitUpdate"
              >
            </div>
            <div class="alert alert-info">
              {{ $t('mockConfig.staticHint') }}
            </div>
          </template>

          <template v-if="config.mode === 'dynamic'">
            <div class="form-item">
              <label class="form-label">{{ $t('mockConfig.generatorType') }}</label>
              <select
                v-model="config.generatorType"
                class="form-select"
                @change="onGeneratorTypeChange"
              >
                <option
                  v-for="opt in generatorTypeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <hr class="divider">

            <template v-if="config.generatorType === 'sinWave'">
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.amplitude') }}</label>
                <input
                  v-model.number="genParams.amplitude"
                  type="number"
                  class="form-input"
                  step="0.1"
                  @input="onGenParamsChange"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.frequency') }}</label>
                <input
                  v-model.number="genParams.period"
                  type="number"
                  class="form-input"
                  min="0.01"
                  step="0.1"
                  @input="onGenParamsChange"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.offset') }}</label>
                <input
                  v-model.number="genParams.offset"
                  type="number"
                  class="form-input"
                  step="0.1"
                  @input="onGenParamsChange"
                >
              </div>
            </template>

            <template v-if="config.generatorType === 'randomWalk'">
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.minValue') }}</label>
                <input
                  v-model.number="genParams.min"
                  type="number"
                  class="form-input"
                  step="1"
                  @input="onGenParamsChange"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.maxValue') }}</label>
                <input
                  v-model.number="genParams.max"
                  type="number"
                  class="form-input"
                  step="1"
                  @input="onGenParamsChange"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.step') }}</label>
                <input
                  v-model.number="genParams.step"
                  type="number"
                  class="form-input"
                  min="0.01"
                  step="0.1"
                  @input="onGenParamsChange"
                >
              </div>
            </template>

            <template v-if="config.generatorType === 'pulse'">
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.amplitude') }}</label>
                <input
                  v-model.number="genParams.amplitude"
                  type="number"
                  class="form-input"
                  step="0.1"
                  @input="onGenParamsChange"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.period') }}</label>
                <input
                  v-model.number="genParams.period"
                  type="number"
                  class="form-input"
                  min="0.1"
                  step="0.5"
                  @input="onGenParamsChange"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.dutyCycle') }}</label>
                <input
                  v-model.number="genParams.dutyCycle"
                  type="number"
                  class="form-input"
                  min="0.01"
                  max="0.99"
                  step="0.05"
                  @input="onGenParamsChange"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.baseValue') }}</label>
                <input
                  v-model.number="genParams.base"
                  type="number"
                  class="form-input"
                  step="0.1"
                  @input="onGenParamsChange"
                >
              </div>
            </template>

            <template v-if="config.generatorType === 'ramp'">
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.startValue') }}</label>
                <input
                  v-model.number="genParams.min"
                  type="number"
                  class="form-input"
                  step="1"
                  @input="onGenParamsChange"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.endValue') }}</label>
                <input
                  v-model.number="genParams.max"
                  type="number"
                  class="form-input"
                  step="1"
                  @input="onGenParamsChange"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.step') }}</label>
                <input
                  v-model.number="genParams.step"
                  type="number"
                  class="form-input"
                  min="0.01"
                  step="0.1"
                  @input="onGenParamsChange"
                >
              </div>
            </template>

            <template v-if="config.generatorType === 'noise'">
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.baseValue') }}</label>
                <input
                  v-model.number="genParams.base"
                  type="number"
                  class="form-input"
                  step="0.1"
                  @input="onGenParamsChange"
                >
              </div>
              <div class="form-item">
                <label class="form-label">{{ $t('mockConfig.noiseAmplitude') }}</label>
                <input
                  v-model.number="genParams.noiseAmplitude"
                  type="number"
                  class="form-input"
                  min="0"
                  step="0.1"
                  @input="onGenParamsChange"
                >
              </div>
            </template>
          </template>

          <template v-if="config.mode === 'replay'">
            <div class="form-item">
              <label class="form-label">{{ $t('mockConfig.replaySource') }}</label>
              <select
                v-model="config.replaySource"
                class="form-select"
                @change="emitUpdate"
              >
                <option
                  value=""
                  disabled
                >
                  {{ $t('mockConfig.selectImportedFile') }}
                </option>
                <option
                  v-for="opt in replaySourceOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="form-item">
              <label class="form-label">{{ $t('mockConfig.replaySpeed') }}</label>
              <input
                v-model.number="config.replaySpeed"
                type="number"
                class="form-input"
                min="0.1"
                max="10"
                step="0.1"
                @input="emitUpdate"
              >
            </div>
            <div class="alert alert-info">
              {{ $t('mockConfig.replayHint') }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <div
      v-if="config.enabled"
      class="card preview-card"
    >
      <div class="card-header">
        <span class="card-title">{{ $t('mockConfig.dataPreview') }}</span>
      </div>
      <div class="card-body">
        <div class="preview-value">
          <span
            class="tag"
            :class="config.mode === 'static' ? 'tag-info' : 'tag-success'"
          >
            {{ config.mode === 'static' ? $t('mockConfig.static') : config.mode === 'dynamic' ? $t('mockConfig.dynamicGenerate') : $t('mockConfig.replay') }}
          </span>
          <span class="preview-label">{{ $t('mockConfig.currentMockValue') }}</span>
          <code class="preview-data">{{ previewValue }}</code>
        </div>
        <button
          type="button"
          class="btn btn-small"
          @click="refreshPreview"
        >
          {{ $t('mockConfig.refreshPreview') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { i18n } from '@scada-editor/core'

const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void
}>()

const config = computed<any>({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const genParams = reactive({
  amplitude: 1,
  period: 2,
  phase: 0,
  offset: 0,
  step: 0.1,
  min: 0,
  max: 100,
  dutyCycle: 0.5,
  base: 50,
  noiseAmplitude: 5,
})

const modeOptions = computed(() => [
  { label: i18n.global.t('mockConfig.staticData'), value: 'static' },
  { label: i18n.global.t('mockConfig.dynamicGenerate'), value: 'dynamic' },
  { label: i18n.global.t('mockConfig.dataReplay'), value: 'replay' },
])

const generatorTypeOptions = computed(() => [
  { label: i18n.global.t('mockConfig.sinWave'), value: 'sinWave' },
  { label: i18n.global.t('mockConfig.randomWalk'), value: 'randomWalk' },
  { label: i18n.global.t('mockConfig.pulse'), value: 'pulse' },
  { label: i18n.global.t('mockConfig.ramp'), value: 'ramp' },
  { label: i18n.global.t('mockConfig.noise'), value: 'noise' },
])

const replaySourceOptions: { label: string; value: string }[] = []

const previewValue = ref<any>(null)

const defaultGenParams = (type: string) => {
  switch (type) {
    case 'sinWave':
      return { amplitude: 3, period: 2, offset: 5 }
    case 'randomWalk':
      return { min: 0, max: 100, step: 1 }
    case 'pulse':
      return { amplitude: 10, period: 4, dutyCycle: 0.5, base: 0 }
    case 'ramp':
      return { min: 0, max: 100, step: 1 }
    case 'noise':
      return { base: 50, noiseAmplitude: 5 }
    default:
      return {}
  }
}

const applyGenParams = () => {
  Object.assign(genParams, defaultGenParams(config.value.generatorType || 'sinWave'))
  if (config.value.generatorParams) {
    Object.assign(genParams, config.value.generatorParams)
  }
}

watch(
  () => config.value.generatorType,
  () => {
    applyGenParams()
    config.value.generatorParams = { ...genParams }
  },
  { immediate: true },
)

const onModeChange = (mode: string) => {
  if (mode === 'dynamic') {
    config.value.generatorType = config.value.generatorType || 'sinWave'
    config.value.generatorParams = config.value.generatorParams || defaultGenParams('sinWave')
    applyGenParams()
  } else if (mode === 'static') {
    config.value.staticValue = config.value.staticValue ?? ''
  } else if (mode === 'replay') {
    config.value.replaySource = config.value.replaySource ?? ''
    config.value.replaySpeed = config.value.replaySpeed ?? 1
  }
  emitUpdate()
}

const onGeneratorTypeChange = () => {
  genParams.amplitude = 1
  genParams.period = 2
  genParams.phase = 0
  genParams.offset = 0
  genParams.step = 1
  genParams.min = 0
  genParams.max = 100
  genParams.dutyCycle = 0.5
  genParams.base = 50
  genParams.noiseAmplitude = 5
  const defaults = defaultGenParams(config.value.generatorType)
  Object.assign(genParams, defaults)
  config.value.generatorParams = { ...genParams }
  emitUpdate()
}

const onGenParamsChange = () => {
  config.value.generatorParams = { ...genParams }
  emitUpdate()
}

const emitUpdate = () => {
  emit('update:modelValue', { ...config.value })
}

const generatePreview = () => {
  if (config.value.mode === 'static') {
    return config.value.staticValue ?? ''
  }
  if (config.value.mode === 'dynamic') {
    const t = Date.now() / 1000
    const p = genParams
    switch (config.value.generatorType) {
      case 'sinWave':
        return Number((p.amplitude * Math.sin(2 * Math.PI * t / p.period) + p.offset).toFixed(3))
      case 'randomWalk':
        return Number((p.min + Math.random() * (p.max - p.min)).toFixed(3))
      case 'pulse':
        return Number(((t % p.period) / p.period < p.dutyCycle ? p.base + p.amplitude : p.base).toFixed(3))
      case 'ramp':
        return Number((p.min + ((t % p.period) / p.period) * (p.max - p.min)).toFixed(3))
      case 'noise':
        return Number((p.base + (Math.random() - 0.5) * 2 * p.noiseAmplitude).toFixed(3))
    }
  }
  return '—'
}

const refreshPreview = () => {
  previewValue.value = generatePreview()
}

refreshPreview()
</script>

<style scoped>
.mock-config-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-body {
  padding: 14px;
}

.switch-toggle {
  appearance: none;
  width: 36px;
  height: 20px;
  background: color-mix(in srgb, var(--text-secondary) 30%, transparent);
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;
  border: none;
  outline: none;
}

.switch-toggle:checked {
  background: var(--status-success);
}

.switch-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.switch-toggle:checked::after {
  transform: translateX(16px);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-label {
  width: 100px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
  text-align: right;
}

.form-input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--surface);
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--status-info);
}

.form-select {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--surface);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}

.form-select:focus {
  border-color: var(--status-info);
}

.divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 4px 0;
}

.alert {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
}

.alert-info {
  background: color-mix(in srgb, var(--status-info) 10%, transparent);
  color: var(--status-info);
  border: 1px solid color-mix(in srgb, var(--status-info) 25%, transparent);
}

.btn {
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn:hover {
  background: color-mix(in srgb, var(--surface) 90%, #000);
}

.btn-small {
  font-size: 12px;
  padding: 4px 10px;
}

.preview-card {
  border: 1px dashed var(--status-success);
}

.preview-value {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.preview-label {
  font-size: 13px;
  color: var(--text);
}

.preview-data {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--status-success);
  background: color-mix(in srgb, var(--status-success) 8%, transparent);
  padding: 2px 8px;
  border-radius: 3px;
}

.tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 1.6;
}

.tag-info {
  background: color-mix(in srgb, var(--status-info) 15%, transparent);
  color: var(--status-info);
}

.tag-success {
  background: color-mix(in srgb, var(--status-success) 15%, transparent);
  color: var(--status-success);
}
</style>