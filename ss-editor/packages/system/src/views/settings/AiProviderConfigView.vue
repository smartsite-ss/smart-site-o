<template>
  <div class="ai-provider-config">
    <div class="page-header">
      <h2>{{ $t('system.aiConfig.title') }}</h2>
      <div class="header-actions">
        <button
          class="btn btn-secondary"
          @click="loadProviders"
        >
          {{ $t('common.refresh') }}
        </button>
      </div>
    </div>

    <div class="page-desc">
      {{ $t('system.aiConfig.description') }}
    </div>

    <!-- Provider 列表 -->
    <SsLoading
      v-if="loading"
      :text="$t('system.aiConfig.loading')"
      size="small"
    />

    <div v-else>
      <!-- 国内供应商 -->
      <div class="section-title">
        {{ $t('system.aiConfig.domestic') }}
      </div>
      <div class="provider-grid">
        <div
          v-for="item in domesticProviders"
          :key="item.providerId"
          class="provider-card"
          :class="{
            'provider-configured': isConfigured(item),
            'provider-enabled': item.enabled,
          }"
        >
          <div class="provider-header">
            <div class="provider-info">
              <span class="provider-name">{{ item.name }}</span>
              <span
                v-if="item.enabled"
                class="tag tag-success"
              >
                {{ $t('system.aiConfig.enabled') }}
              </span>
              <span
                v-else-if="isConfigured(item)"
                class="tag tag-muted"
              >
                {{ $t('system.aiConfig.disabled') }}
              </span>
              <span
                v-else
                class="tag tag-info"
              >
                {{ $t('system.aiConfig.notConfigured') }}
              </span>
            </div>
            <div class="provider-actions">
              <label
                v-if="isConfigured(item)"
                class="toggle-switch"
              >
                <input
                  type="checkbox"
                  :checked="item.enabled"
                  @change="handleToggle(item, ($event.target as HTMLInputElement).checked)"
                >
                <span class="toggle-slider" />
              </label>
            </div>
          </div>

          <div class="provider-desc">
            {{ getPresetDescription(item.providerId) }}
          </div>

          <div class="provider-details">
            <div class="detail-row">
              <span class="detail-label">{{ $t('system.aiConfig.defaultModel') }}:</span>
              <span class="detail-value">{{ item.defaultModel || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ $t('system.aiConfig.apiKey') }}:</span>
              <span class="detail-value mono">{{ item.apiKey === '***' ? '••••••••' : (item.apiKey ? '••••' : '—') }}</span>
            </div>
            <div
              v-if="getTestResult(item.id)"
              class="detail-row"
            >
              <span class="detail-label">{{ $t('system.aiConfig.testConnection') }}:</span>
              <span
                class="detail-value test-result"
                :class="getTestResult(item.id)!.success ? 'test-success' : 'test-failed'"
                :title="getTestResult(item.id)!.error"
              >
                <template v-if="getTestResult(item.id)!.success">
                  {{ $t('system.aiConfig.testSuccess', { latency: getTestResult(item.id)!.latencyMs ?? '—' }) }}
                </template>
                <template v-else>
                  {{ $t('system.aiConfig.testFailed') }}: {{ getTestResult(item.id)!.error }}
                </template>
              </span>
            </div>
          </div>

          <div class="provider-footer">
            <button
              v-if="isConfigured(item)"
              class="btn-link"
              :disabled="testingId === item.id"
              @click="handleTest(item)"
            >
              {{ testingId === item.id ? $t('system.aiConfig.testing') : $t('system.aiConfig.testConnection') }}
            </button>
            <button
              v-if="isConfigured(item)"
              class="btn-link"
              @click="openApiKeyDialog(item)"
            >
              {{ $t('system.aiConfig.updateApiKey') }}
            </button>
            <button
              v-else
              class="btn btn-primary btn-sm"
              @click="openApiKeyDialog(item)"
            >
              {{ $t('system.aiConfig.configure') }}
            </button>
            <button
              v-if="isConfigured(item)"
              class="btn-link btn-danger-link"
              @click="handleDelete(item)"
            >
              {{ $t('common.delete') }}
            </button>
            <a
              v-if="getApiKeyUrl(item.providerId)"
              :href="getApiKeyUrl(item.providerId)"
              target="_blank"
              rel="noopener"
              class="btn-link"
            >
              {{ $t('system.aiConfig.getApiKey') }} →
            </a>
          </div>
        </div>
      </div>

      <!-- 国际供应商 -->
      <div class="section-title">
        {{ $t('system.aiConfig.international') }}
      </div>
      <div class="provider-grid">
        <div
          v-for="item in internationalProviders"
          :key="item.providerId"
          class="provider-card"
          :class="{
            'provider-configured': isConfigured(item),
            'provider-enabled': item.enabled,
          }"
        >
          <div class="provider-header">
            <div class="provider-info">
              <span class="provider-name">{{ item.name }}</span>
              <span
                v-if="item.enabled"
                class="tag tag-success"
              >
                {{ $t('system.aiConfig.enabled') }}
              </span>
              <span
                v-else-if="isConfigured(item)"
                class="tag tag-muted"
              >
                {{ $t('system.aiConfig.disabled') }}
              </span>
              <span
                v-else
                class="tag tag-info"
              >
                {{ $t('system.aiConfig.notConfigured') }}
              </span>
            </div>
            <div class="provider-actions">
              <label
                v-if="isConfigured(item)"
                class="toggle-switch"
              >
                <input
                  type="checkbox"
                  :checked="item.enabled"
                  @change="handleToggle(item, ($event.target as HTMLInputElement).checked)"
                >
                <span class="toggle-slider" />
              </label>
            </div>
          </div>

          <div class="provider-desc">
            {{ getPresetDescription(item.providerId) }}
          </div>

          <div class="provider-details">
            <div class="detail-row">
              <span class="detail-label">{{ $t('system.aiConfig.defaultModel') }}:</span>
              <span class="detail-value">{{ item.defaultModel || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ $t('system.aiConfig.apiKey') }}:</span>
              <span class="detail-value mono">{{ item.apiKey === '***' ? '••••••••' : (item.apiKey ? '••••' : '—') }}</span>
            </div>
            <div
              v-if="getTestResult(item.id)"
              class="detail-row"
            >
              <span class="detail-label">{{ $t('system.aiConfig.testConnection') }}:</span>
              <span
                class="detail-value test-result"
                :class="getTestResult(item.id)!.success ? 'test-success' : 'test-failed'"
                :title="getTestResult(item.id)!.error"
              >
                <template v-if="getTestResult(item.id)!.success">
                  {{ $t('system.aiConfig.testSuccess', { latency: getTestResult(item.id)!.latencyMs ?? '—' }) }}
                </template>
                <template v-else>
                  {{ $t('system.aiConfig.testFailed') }}: {{ getTestResult(item.id)!.error }}
                </template>
              </span>
            </div>
          </div>

          <div class="provider-footer">
            <button
              v-if="isConfigured(item)"
              class="btn-link"
              :disabled="testingId === item.id"
              @click="handleTest(item)"
            >
              {{ testingId === item.id ? $t('system.aiConfig.testing') : $t('system.aiConfig.testConnection') }}
            </button>
            <button
              v-if="isConfigured(item)"
              class="btn-link"
              @click="openApiKeyDialog(item)"
            >
              {{ $t('system.aiConfig.updateApiKey') }}
            </button>
            <button
              v-else
              class="btn btn-primary btn-sm"
              @click="openApiKeyDialog(item)"
            >
              {{ $t('system.aiConfig.configure') }}
            </button>
            <button
              v-if="isConfigured(item)"
              class="btn-link btn-danger-link"
              @click="handleDelete(item)"
            >
              {{ $t('common.delete') }}
            </button>
            <a
              v-if="getApiKeyUrl(item.providerId)"
              :href="getApiKeyUrl(item.providerId)"
              target="_blank"
              rel="noopener"
              class="btn-link"
            >
              {{ $t('system.aiConfig.getApiKey') }} →
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- API Key 输入弹窗 -->
    <div
      v-if="apiKeyDialogVisible"
      class="modal-overlay"
      @click.self="closeApiKeyDialog"
    >
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>{{ editingProvider?.name }} — {{ isConfigured(editingProvider) ? $t('system.aiConfig.updateApiKey') : $t('system.aiConfig.configure') }}</h3>
          <button
            class="btn-icon"
            @click="closeApiKeyDialog"
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
              />
              <line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
              />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label class="field-label">{{ $t('system.aiConfig.apiKey') }}</label>
            <input
              v-model="apiKeyInput"
              type="password"
              class="form-input"
              :placeholder="$t('system.aiConfig.apiKeyPlaceholder')"
              @keyup.enter="handleSaveApiKey"
            >
            <p
              v-if="editingProvider"
              class="field-hint"
            >
              {{ $t('system.aiConfig.apiKeyHint', { provider: editingProvider.name }) }}
            </p>
          </div>

          <!-- 高级设置（可折叠） -->
          <details class="advanced-settings">
            <summary class="advanced-summary">
              {{ $t('system.aiConfig.advancedSettings') }}
            </summary>
            <div class="advanced-body">
              <div class="form-field">
                <label class="field-label">{{ $t('system.aiConfig.apiBase') }}</label>
                <input
                  v-model="advancedForm.apiBase"
                  type="text"
                  class="form-input"
                  :placeholder="editingProvider?.apiBase || ''"
                >
              </div>
              <div class="form-field">
                <label class="field-label">{{ $t('system.aiConfig.defaultModel') }}</label>
                <input
                  v-model="advancedForm.defaultModel"
                  type="text"
                  class="form-input"
                  :placeholder="editingProvider?.defaultModel || ''"
                >
              </div>
            </div>
          </details>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeApiKeyDialog"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="saving || !apiKeyInput.trim()"
            @click="handleSaveApiKey"
          >
            {{ saving ? $t('common.saving') : $t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from '@scada-editor/core';
import { showSuccess, showError, showConfirm } from '../../utils/messageBox';
import {
  aiProviderApi,
  type AiProviderConfig,
  type AiProviderTestResult,
  type ProviderPreset,
} from '../../api/modules/ai-provider.api';
import { SsLoading } from '@scada-editor/shared';

const { t } = useI18n();

const loading = ref(false);
const saving = ref(false);
const providers = ref<AiProviderConfig[]>([]);
const presets = ref<ProviderPreset[]>([]);

// API Key 弹窗
const apiKeyDialogVisible = ref(false);
const editingProvider = ref<AiProviderConfig | null>(null);
const apiKeyInput = ref('');
const advancedForm = reactive({
  apiBase: '',
  defaultModel: '',
});

// 连接测试状态（按 provider id 记录最近一次测试结果）
const testingId = ref<string | null>(null);
const testResults = ref<Record<string, AiProviderTestResult>>({});

/** 国内供应商（按 sortOrder 排序） */
const domesticProviders = computed(() =>
  providers.value.filter((p) => getPreset(p.providerId)?.region === 'domestic'),
);

/** 国际供应商（按 sortOrder 排序） */
const internationalProviders = computed(() =>
  providers.value.filter((p) => getPreset(p.providerId)?.region === 'international'),
);

function getPreset(providerId: string): ProviderPreset | undefined {
  return presets.value.find((p) => p.providerId === providerId);
}

function getPresetDescription(providerId: string): string {
  return getPreset(providerId)?.description || '';
}

function getApiKeyUrl(providerId: string): string {
  return getPreset(providerId)?.apiKeyUrl || '';
}

/** 是否已配置（有 API Key） */
function isConfigured(item: AiProviderConfig | null): boolean {
  if (!item) return false;
  // apiKey 为 '***' 表示已加密存储（后端返回脱敏值）
  // apiKey 为空字符串表示未配置
  return item.apiKey === '***' || (item.apiKey !== '' && item.apiKey !== '—');
}

async function loadProviders() {
  loading.value = true;
  try {
    const [providerList, presetList] = await Promise.all([
      aiProviderApi.list(),
      aiProviderApi.presets(),
    ]);
    providers.value = providerList;
    presets.value = presetList;
    // 配置变更后旧的测试结果可能已失效，重新加载时清空
    testResults.value = {};
  } catch (err: any) {
    if (!err._errorHandled) {
      showError((err as Error).message);
    }
  } finally {
    loading.value = false;
  }
}

function openApiKeyDialog(item: AiProviderConfig) {
  editingProvider.value = item;
  apiKeyInput.value = '';
  advancedForm.apiBase = '';
  advancedForm.defaultModel = '';
  apiKeyDialogVisible.value = true;
}

function closeApiKeyDialog() {
  apiKeyDialogVisible.value = false;
  editingProvider.value = null;
  apiKeyInput.value = '';
}

async function handleSaveApiKey() {
  if (!editingProvider.value || !apiKeyInput.value.trim()) return;

  saving.value = true;
  try {
    const item = editingProvider.value;

    // 如果有高级设置，一并更新
    const hasAdvanced = advancedForm.apiBase.trim() || advancedForm.defaultModel.trim();
    if (hasAdvanced) {
      const payload: Record<string, any> = { apiKey: apiKeyInput.value };
      if (advancedForm.apiBase.trim()) payload.apiBase = advancedForm.apiBase;
      if (advancedForm.defaultModel.trim()) payload.defaultModel = advancedForm.defaultModel;
      await aiProviderApi.update(item.id, payload);
    } else {
      // 仅更新 API Key
      await aiProviderApi.updateApiKey(item.id, apiKeyInput.value);
    }

    showSuccess(t('system.aiConfig.updateSuccess'));
    closeApiKeyDialog();
    await loadProviders();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError((err as Error).message);
    }
  } finally {
    saving.value = false;
  }
}

async function handleToggle(item: AiProviderConfig, enabled: boolean) {
  try {
    await aiProviderApi.toggle(item.id, enabled);
    item.enabled = enabled;
  } catch (err: any) {
    if (!err._errorHandled) {
      showError((err as Error).message);
    }
  }
}

/** 测试供应商连接，结果内联展示在卡片上 */
async function handleTest(item: AiProviderConfig) {
  if (testingId.value) return;
  testingId.value = item.id;
  try {
    const result = await aiProviderApi.test(item.id);
    testResults.value = { ...testResults.value, [item.id]: result };
  } catch (err: any) {
    testResults.value = {
      ...testResults.value,
      [item.id]: {
        success: false,
        error: (err as Error).message,
        checkedAt: Date.now(),
      },
    };
  } finally {
    testingId.value = null;
  }
}

function getTestResult(id: string): AiProviderTestResult | undefined {
  return testResults.value[id];
}

async function handleDelete(item: AiProviderConfig) {
  const confirmed = await showConfirm(t('system.aiConfig.confirmDelete', { name: item.name }));
  if (!confirmed) return;
  try {
    await aiProviderApi.remove(item.id);
    showSuccess(t('system.aiConfig.deleteSuccess'));
    await loadProviders();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError((err as Error).message);
    }
  }
}

onMounted(() => {
  loadProviders();
});
</script>

<style scoped>
.ai-provider-config {
  padding: 20px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.page-desc {
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 20px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

/* Provider 卡片网格 */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.provider-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;
}

.provider-card.provider-enabled {
  border-color: var(--primary);
}

.provider-card:hover {
  border-color: var(--primary);
}

.provider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.provider-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.provider-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  line-height: 1.4;
}

.provider-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
  flex: 1;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
}

.detail-label {
  color: var(--text-secondary);
  min-width: 70px;
  flex-shrink: 0;
}

.detail-value {
  color: var(--text);
  word-break: break-all;
}

.detail-value.mono {
  font-family: monospace;
}

.test-result.test-success {
  color: var(--status-success);
}

.test-result.test-failed {
  color: var(--status-error);
  word-break: break-all;
}

.provider-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

/* 标签 */
.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.tag-success { background: rgba(34, 197, 94, 0.15); color: var(--status-success); }
.tag-muted { background: var(--elevated, rgba(128, 128, 128, 0.15)); color: var(--text-secondary); }
.tag-info { background: rgba(59, 130, 246, 0.15); color: var(--status-info); }

/* 按钮 */
.btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:hover { opacity: 0.85; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary { background: var(--primary); color: var(--text); }
.btn-secondary { background: var(--elevated); color: var(--text); }
.btn-sm { padding: 4px 12px; font-size: 12px; }

.btn-link {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  text-decoration: none;
}

.btn-link:hover { text-decoration: underline; }

.btn-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  text-decoration: none;
}

.btn-link.btn-danger-link { color: var(--status-error); }

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: var(--elevated, rgba(255, 255, 255, 0.08));
  color: var(--text);
}

/* Toggle 开关 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 22px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  border-radius: 22px;
  transition: 0.3s;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-sm { width: 460px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
}

/* 表单 */
.form-field {
  margin-bottom: 14px;
}

.field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}

.field-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.form-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--text);
  font-size: 13px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

/* 高级设置折叠 */
.advanced-settings {
  margin-top: 12px;
  border-top: 1px solid var(--border);
  padding-top: 10px;
}

.advanced-summary {
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.advanced-summary:hover {
  color: var(--primary);
}

.advanced-body {
  margin-top: 10px;
}
</style>
