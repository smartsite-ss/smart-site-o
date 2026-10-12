<template>
  <div
    v-if="visible"
    class="dialog-overlay"
    @click.self="handleClose"
  >
    <div class="dialog-panel">
      <div class="dialog-header">
        <h3 class="dialog-title">
          {{ $t('system.deviceTemplate.applyTemplate') }}
        </h3>
        <button
          class="btn-close"
          @click="handleClose"
        >
          <svg
            width="16"
            height="16"
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
      </div>

      <div class="dialog-body">
        <div class="info-row">
          <label>{{ $t('system.deviceTemplate.templateName') }}</label>
          <span class="info-value">{{ templateName }}</span>
        </div>

        <div class="form-group">
          <label>{{ $t('system.deviceTemplate.selectDevice') }}</label>
          <select
            v-model="selectedDeviceId"
            class="form-select"
          >
            <option value="">
              {{ $t('system.deviceTemplate.selectDevicePlaceholder') }}
            </option>
            <option
              v-for="device in availableDevices"
              :key="device.id"
              :value="device.id"
            >
              {{ device.deviceName }} ({{ device.type }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              v-model="replaceExisting"
              type="checkbox"
              class="form-checkbox"
            >
            <span>{{ $t('system.deviceTemplate.replaceExisting') }}</span>
          </label>
        </div>

        <div
          v-if="applyResult"
          class="result-panel"
          :class="{ 'result-has-errors': applyResult.errors.length > 0 }"
        >
          <h4 class="result-title">
            {{ $t('system.deviceTemplate.applyResult') }}
          </h4>
          <div class="result-grid">
            <div class="result-item result-success">
              <span class="result-number">{{ applyResult.created }}</span>
              <span class="result-label">{{ $t('system.deviceTemplate.createdCount') }}</span>
            </div>
            <div class="result-item result-skipped">
              <span class="result-number">{{ applyResult.skipped }}</span>
              <span class="result-label">{{ $t('system.deviceTemplate.skippedCount') }}</span>
            </div>
          </div>
          <div
            v-if="applyResult.errors.length > 0"
            class="errors-list"
          >
            <h5 class="errors-title">
              {{ $t('system.deviceTemplate.applyErrors') }}
            </h5>
            <ul>
              <li
                v-for="(err, i) in applyResult.errors"
                :key="i"
              >
                <strong>{{ err.name }}</strong>: {{ err.message }}
              </li>
            </ul>
          </div>
        </div>

        <div
          v-if="errorMsg"
          class="error-msg"
        >
          {{ errorMsg }}
        </div>
      </div>

      <div class="dialog-footer">
        <button
          class="btn btn-secondary"
          @click="handleClose"
        >
          {{ $t('system.deviceTemplate.cancel') }}
        </button>
        <button
          class="btn btn-primary"
          :disabled="!selectedDeviceId || applying"
          @click="handleApply"
        >
          <svg
            v-if="applying"
            class="spin-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          {{ $t('system.deviceTemplate.apply') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@scada-editor/core';
import { useTemplateStore } from '../../../stores/template.store';
import type { ApplyTemplateResult } from '../../../api/modules/template.api';

const { t } = useI18n();
const templateStore = useTemplateStore();

const props = defineProps<{
  visible: boolean;
  templateId: string;
  templateName: string;
  projectId: string;
}>();

const emit = defineEmits<{
  close: [];
  applied: [result: ApplyTemplateResult];
}>();

const selectedDeviceId = ref('');
const replaceExisting = ref(false);
const applying = ref(false);
const applyResult = ref<ApplyTemplateResult | null>(null);
const errorMsg = ref('');

const availableDevices = computed(() => [
  { id: 'device-001', deviceName: t('system.deviceTemplate.sampleDevices.master'), type: t('system.deviceTemplate.sampleDevices.s71200') },
  { id: 'device-002', deviceName: t('system.deviceTemplate.sampleDevices.slave'), type: t('system.deviceTemplate.sampleDevices.s71200') },
  { id: 'device-003', deviceName: t('system.deviceTemplate.sampleDevices.inverter'), type: 'ABB ACS880' },
  { id: 'device-004', deviceName: t('system.deviceTemplate.sampleDevices.meter'), type: 'Modbus RTU' },
]);

function handleClose() {
  applyResult.value = null;
  errorMsg.value = '';
  selectedDeviceId.value = '';
  replaceExisting.value = false;
  emit('close');
}

async function handleApply() {
  if (!selectedDeviceId.value || !props.projectId || !props.templateId) return;

  applying.value = true;
  errorMsg.value = '';
  applyResult.value = null;

  try {
    const result = await templateStore.applyTemplate(props.templateId, {
      projectId: props.projectId,
      deviceId: selectedDeviceId.value,
      replaceExisting: replaceExisting.value,
    });
    applyResult.value = result;
    emit('applied', result);
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || e?.message || t('system.deviceTemplate.applyFailed');
  } finally {
    applying.value = false;
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
}

.dialog-panel {
  background: var(--surface);
  border-radius: 12px;
  width: 520px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  border: 1px solid var(--border);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.btn-close {
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

.btn-close:hover {
  background: var(--border);
  color: var(--text);
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}

.info-row label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--background);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.form-select:focus {
  border-color: var(--primary);
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px !important;
  color: var(--text) !important;
  margin-bottom: 0 !important;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--primary);
}

.result-panel {
  margin-top: 20px;
  padding: 16px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--status-online) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-online) 20%, transparent);
}

.result-panel.result-has-errors {
  background: rgba(234,179,8,0.05);
  border-color: rgba(234,179,8,0.2);
}

.result-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px 0;
}

.result-grid {
  display: flex;
  gap: 24px;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.result-number {
  font-size: 24px;
  font-weight: 700;
}

.result-success .result-number { color: var(--status-online); }
.result-skipped .result-number { color: var(--text-secondary); }

.result-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.errors-list {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.errors-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--status-warning);
  margin: 0 0 8px 0;
}

.errors-list ul {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
}

.errors-list li {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.errors-list li strong {
  color: var(--text);
}

.error-msg {
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--status-error) 8%, transparent);
  color: var(--status-error);
  font-size: 13px;
  border: 1px solid color-mix(in srgb, var(--status-error) 15%, transparent);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  background: var(--primary);
  color: var(--text);
}

.btn-primary:hover:not(:disabled) { opacity: 0.9; }

.btn-secondary {
  background: var(--border);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--text-secondary);
  color: var(--text);
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>