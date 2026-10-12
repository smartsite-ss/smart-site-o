<template>
  <div class="new-ds-form">
    <div class="form-title">
      <span class="form-icon">➕</span>
      <span>{{ $t('dataPanel.newDataSourceLabel') }}</span>
    </div>

    <div class="form-body">
      <div class="form-item">
        <label class="form-label">{{ $t('dataPanel.dataSourceName') }} <span class="required">*</span></label>
        <input
          v-model="form.name"
          type="text"
          class="form-input"
          :placeholder="$t('dataPanel.pleaseInputDataSourceName')"
          maxlength="50"
        >
      </div>

      <div class="form-item">
        <label class="form-label">{{ $t('dataPanel.dataSourceType') }} <span class="required">*</span></label>
        <select
          v-model="form.type"
          class="form-select"
        >
          <option value="static">
            {{ $t('dataPanel.sourceTypeStatic') }}
          </option>
          <option value="api">
            API
          </option>
          <option value="tag">
            {{ $t('dataPanel.sourceTypeTag') }}
          </option>
          <option value="database">
            {{ $t('dataPanel.sourceTypeDb') }}
          </option>
        </select>
      </div>

      <template v-if="showPollingFields">
        <div class="divider-label">
          {{ $t('dataPanel.pollingConfig') }}
        </div>

        <div class="form-item">
          <label class="form-label">{{ $t('dataPanel.pollingIntervalMs') }} <span class="required">*</span></label>
          <input
            v-model.number="form.pollingInterval"
            type="number"
            class="form-input"
            placeholder="5000"
            min="1000"
            max="3600000"
            step="1000"
          >
          <span class="form-hint">{{ $t('dataPanel.pollingRange') }}</span>
        </div>

        <div class="form-item">
          <label class="form-label">{{ $t('dataPanel.timeoutMs') }} <span class="required">*</span></label>
          <input
            v-model.number="form.timeout"
            type="number"
            class="form-input"
            placeholder="30000"
            min="1000"
            max="60000"
            step="1000"
          >
          <span class="form-hint">{{ $t('dataPanel.timeoutRange') }}</span>
        </div>

        <div class="form-item">
          <label class="form-label">{{ $t('dataPanel.retryCount') }} <span class="required">*</span></label>
          <input
            v-model.number="form.retryCount"
            type="number"
            class="form-input"
            placeholder="3"
            min="0"
            max="10"
            step="1"
          >
          <span class="form-hint">{{ $t('dataPanel.retryHint') }}</span>
        </div>
      </template>

      <div
        v-if="!showPollingFields"
        class="no-polling-hint"
      >
        <span>{{ form.type === 'static' ? $t('dataPanel.noPollingForStatic') : $t('dataPanel.noPollingForTag') }}</span>
      </div>
    </div>

    <div class="form-footer">
      <button
        type="button"
        class="btn-cancel"
        @click="$emit('cancel')"
      >
        {{ $t('dataPanel.cancel') }}
      </button>
      <button
        type="button"
        class="btn-create"
        :disabled="!isValid"
        @click="handleCreate"
      >
        {{ $t('dataPanel.createDataSource') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue';

type SourceType = 'static' | 'api' | 'tag' | 'database';

interface NewDataSourceFormData {
  name: string;
  type: SourceType;
  pollingInterval: number;
  timeout: number;
  retryCount: number;
}

const emit = defineEmits<{
  create: [data: NewDataSourceFormData];
  cancel: [];
}>();

const form = reactive<NewDataSourceFormData>({
  name: '',
  type: 'api',
  pollingInterval: 5000,
  timeout: 30000,
  retryCount: 3,
});

const showPollingFields = computed(() => form.type === 'api' || form.type === 'database');

const isValid = computed(() => {
  if (!form.name.trim() || form.name.trim().length < 2) return false;
  if (showPollingFields.value) {
    if (form.pollingInterval < 1000 || form.pollingInterval > 3600000) return false;
    if (form.timeout < 1000 || form.timeout > 60000) return false;
    if (form.retryCount < 0 || form.retryCount > 10) return false;
  }
  return true;
});

function handleCreate() {
  if (!isValid.value) return;
  emit('create', {
    name: form.name.trim(),
    type: form.type,
    pollingInterval: showPollingFields.value ? form.pollingInterval : 0,
    timeout: showPollingFields.value ? form.timeout : 0,
    retryCount: showPollingFields.value ? form.retryCount : 0,
  });
}
</script>

<style scoped>
.new-ds-form {
  border: 1px solid var(--primary, #2080f0);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
}

.form-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--primary, #2080f0) 8%, transparent);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.form-icon {
  font-size: 16px;
}

.form-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.required {
  color: var(--status-error, #d03050);
}

.form-input,
.form-select {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--background);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--primary, #2080f0);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary, #2080f0) 20%, transparent);
}

.form-select {
  cursor: pointer;
}

.form-hint {
  font-size: 11px;
  color: var(--text-tertiary);
}

.divider-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 4px 0;
  border-top: 1px dashed var(--border);
  margin-top: 4px;
}

.no-polling-hint {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  background: color-mix(in srgb, var(--background) 70%, var(--surface));
  border-radius: 4px;
  text-align: center;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--background) 80%, var(--surface));
}

.btn-cancel {
  padding: 5px 14px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: var(--control-button-hover);
}

.btn-create {
  padding: 5px 14px;
  border: none;
  border-radius: 4px;
  background: var(--primary, #2080f0);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-create:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>