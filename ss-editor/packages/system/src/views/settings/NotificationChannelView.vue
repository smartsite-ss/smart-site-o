<template>
  <div class="notification-channel-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.notificationChannel.title') }}
      </h1>
      <router-link
        to="/system/settings"
        class="btn-nav-settings"
        :title="$t('system.settings.backToHome')"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
        <span>{{ $t('system.settings.title') }}</span>
      </router-link>
    </div>

    <div class="tab-bar">
      <button
        class="tab-item"
        :class="{ active: activeTab === 'sms' }"
        @click="activeTab = 'sms'"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        {{ $t('system.notificationChannel.smsTab') }}
      </button>
      <button
        class="tab-item"
        :class="{ active: activeTab === 'tts' }"
        @click="activeTab = 'tts'"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
        {{ $t('system.notificationChannel.ttsTab') }}
      </button>
    </div>

    <!-- SMS 配置 -->
    <div
      v-show="activeTab === 'sms'"
      class="config-panel"
    >
      <form
        class="form-section"
        @submit.prevent
      >
        <input
          type="text"
          autocomplete="username"
          class="sr-only"
        >
        <div class="form-field">
          <label class="field-label">{{ $t('system.notificationChannel.provider') }}</label>
          <select
            v-model="smsForm.provider"
            class="form-select"
          >
            <option value="aliyun">
              {{ $t('system.notificationChannel.providerAliyun') }}
            </option>
            <option value="tencent">
              {{ $t('system.notificationChannel.providerTencent') }}
            </option>
          </select>
        </div>

        <div class="form-field">
          <label class="field-label">API Key</label>
          <input
            v-model="smsForm.apiKey"
            type="password"
            class="form-input"
            autocomplete="new-password"
            :placeholder="$t('system.notificationChannel.apiKeyPlaceholder')"
          >
        </div>

        <div class="form-field">
          <label class="field-label">API Secret</label>
          <input
            v-model="smsForm.apiSecret"
            type="password"
            class="form-input"
            autocomplete="new-password"
            :placeholder="$t('system.notificationChannel.apiSecretPlaceholder')"
          >
        </div>

        <div class="form-field">
          <label class="field-label">{{ $t('system.notificationChannel.signName') }}</label>
          <input
            v-model="smsForm.signName"
            type="text"
            class="form-input"
            :placeholder="$t('system.notificationChannel.signNamePlaceholder')"
          >
        </div>

        <div class="form-field">
          <label class="field-label">{{ $t('system.notificationChannel.templateCode') }}</label>
          <input
            v-model="smsForm.templateCode"
            type="text"
            class="form-input"
            :placeholder="$t('system.notificationChannel.templateCodePlaceholder')"
          >
        </div>

        <div class="form-field">
          <label class="field-label">{{ $t('system.notificationChannel.testPhone') }}</label>
          <input
            v-model="smsTestPhone"
            type="text"
            class="form-input"
            :placeholder="$t('system.notificationChannel.testPhonePlaceholder')"
          >
        </div>

        <div class="form-actions">
          <button
            class="btn btn-secondary"
            :disabled="testing"
            @click="handleTestSms"
          >
            {{ testing ? $t('system.notificationChannel.testing') : $t('system.notificationChannel.testSend') }}
          </button>
        </div>
      </form>
    </div>

    <!-- TTS 配置 -->
    <div
      v-show="activeTab === 'tts'"
      class="config-panel"
    >
      <form
        class="form-section"
        @submit.prevent
      >
        <input
          type="text"
          autocomplete="username"
          class="sr-only"
        >
        <div class="form-field">
          <label class="field-label">{{ $t('system.notificationChannel.provider') }}</label>
          <select
            v-model="ttsForm.provider"
            class="form-select"
          >
            <option value="aliyun">
              {{ $t('system.notificationChannel.providerAliyun') }}
            </option>
          </select>
        </div>

        <div class="form-field">
          <label class="field-label">API Key</label>
          <input
            v-model="ttsForm.apiKey"
            type="password"
            class="form-input"
            autocomplete="new-password"
            :placeholder="$t('system.notificationChannel.apiKeyPlaceholder')"
          >
        </div>

        <div class="form-field">
          <label class="field-label">API Secret</label>
          <input
            v-model="ttsForm.apiSecret"
            type="password"
            class="form-input"
            autocomplete="new-password"
            :placeholder="$t('system.notificationChannel.apiSecretPlaceholder')"
          >
        </div>

        <div class="form-field">
          <label class="field-label">{{ $t('system.notificationChannel.calledNumber') }}</label>
          <input
            v-model="ttsForm.calledNumber"
            type="text"
            class="form-input"
            :placeholder="$t('system.notificationChannel.calledNumberPlaceholder')"
          >
        </div>

        <div class="form-field">
          <label class="field-label">{{ $t('system.notificationChannel.testPhone') }}</label>
          <input
            v-model="ttsTestPhone"
            type="text"
            class="form-input"
            :placeholder="$t('system.notificationChannel.testPhonePlaceholder')"
          >
        </div>

        <div class="form-actions">
          <button
            class="btn btn-secondary"
            :disabled="testing"
            @click="handleTestTts"
          >
            {{ testing ? $t('system.notificationChannel.testing') : $t('system.notificationChannel.testCall') }}
          </button>
        </div>
      </form>
    </div>

    <!-- 底部保存按钮 -->
    <div class="save-bar">
      <button
        class="btn btn-primary"
        :disabled="saving"
        @click="handleSave"
      >
        {{ saving ? $t('system.notificationChannel.saving') : $t('system.notificationChannel.save') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from '@scada-editor/core';
import { systemApi } from '../../api/modules/system.api';
import { alarmApi } from '../../api/modules/alarm.api';
import { showSuccess, showError } from '../../utils/messageBox';

const { t } = useI18n();

const activeTab = ref<'sms' | 'tts'>('sms');
const saving = ref(false);
const testing = ref(false);

interface SmsForm {
  provider: string;
  apiKey: string;
  apiSecret: string;
  signName: string;
  templateCode: string;
}

interface TtsForm {
  provider: string;
  apiKey: string;
  apiSecret: string;
  calledNumber: string;
}

const smsForm = ref<SmsForm>({
  provider: 'aliyun',
  apiKey: '',
  apiSecret: '',
  signName: '',
  templateCode: '',
});

const ttsForm = ref<TtsForm>({
  provider: 'aliyun',
  apiKey: '',
  apiSecret: '',
  calledNumber: '',
});

const smsTestPhone = ref('');
const ttsTestPhone = ref('');

async function loadConfig(key: string): Promise<string> {
  try {
    const res = await systemApi.getConfig(key);
    const data = res as unknown as { value?: string };
    if (data && typeof data.value === 'string') return data.value;
    const resData = (res as unknown as { data?: { value?: string } }).data;
    if (resData && typeof resData.value === 'string') return resData.value;
    return '';
  } catch {
    return '';
  }
}

async function loadAllConfigs(): Promise<void> {
  const [provider, apiKey, apiSecret, signName, templateCode] = await Promise.all([
    loadConfig('SMS_PROVIDER'),
    loadConfig('SMS_API_KEY'),
    loadConfig('SMS_API_SECRET'),
    loadConfig('SMS_SIGN_NAME'),
    loadConfig('SMS_TEMPLATE_CODE'),
  ]);

  if (provider) smsForm.value.provider = provider;
  if (apiKey) smsForm.value.apiKey = apiKey;
  if (apiSecret) smsForm.value.apiSecret = apiSecret;
  if (signName) smsForm.value.signName = signName;
  if (templateCode) smsForm.value.templateCode = templateCode;

  const [ttsProvider, ttsApiKey, ttsApiSecret, ttsCalledNumber] = await Promise.all([
    loadConfig('TTS_PROVIDER'),
    loadConfig('TTS_API_KEY'),
    loadConfig('TTS_API_SECRET'),
    loadConfig('TTS_CALLED_NUMBER'),
  ]);

  if (ttsProvider) ttsForm.value.provider = ttsProvider;
  if (ttsApiKey) ttsForm.value.apiKey = ttsApiKey;
  if (ttsApiSecret) ttsForm.value.apiSecret = ttsApiSecret;
  if (ttsCalledNumber) ttsForm.value.calledNumber = ttsCalledNumber;
}

async function saveConfig(key: string, value: string): Promise<void> {
  await systemApi.saveConfig(key, value);
}

async function handleSave(): Promise<void> {
  saving.value = true;
  try {
    await Promise.all([
      saveConfig('SMS_PROVIDER', smsForm.value.provider),
      saveConfig('SMS_API_KEY', smsForm.value.apiKey),
      saveConfig('SMS_API_SECRET', smsForm.value.apiSecret),
      saveConfig('SMS_SIGN_NAME', smsForm.value.signName),
      saveConfig('SMS_TEMPLATE_CODE', smsForm.value.templateCode),
      saveConfig('TTS_PROVIDER', ttsForm.value.provider),
      saveConfig('TTS_API_KEY', ttsForm.value.apiKey),
      saveConfig('TTS_API_SECRET', ttsForm.value.apiSecret),
      saveConfig('TTS_CALLED_NUMBER', ttsForm.value.calledNumber),
    ]);
    showSuccess(t('system.notificationChannel.saveSuccess'));
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.notificationChannel.saveFailed'));
    }
  } finally {
    saving.value = false;
  }
}

async function handleTestSms(): Promise<void> {
  const target = smsTestPhone.value.trim();
  if (!target) {
    showError(t('system.notificationChannel.testPhoneRequired'));
    return;
  }
  await saveBeforeTest();
  testing.value = true;
  try {
    const ok = await alarmApi.testNotificationChannel('sms', target);
    if (ok) {
      showSuccess(t('system.notificationChannel.testSuccess'));
    } else {
      showError(t('system.notificationChannel.testFailed'));
    }
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.notificationChannel.testFailed'));
    }
  } finally {
    testing.value = false;
  }
}

async function handleTestTts(): Promise<void> {
  const target = ttsTestPhone.value.trim();
  if (!target) {
    showError(t('system.notificationChannel.testPhoneRequired'));
    return;
  }
  await saveBeforeTest();
  testing.value = true;
  try {
    const ok = await alarmApi.testNotificationChannel('tts', target);
    if (ok) {
      showSuccess(t('system.notificationChannel.testSuccess'));
    } else {
      showError(t('system.notificationChannel.testFailed'));
    }
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.notificationChannel.testFailed'));
    }
  } finally {
    testing.value = false;
  }
}

async function saveBeforeTest(): Promise<void> {
  if (activeTab.value === 'sms') {
    await Promise.all([
      saveConfig('SMS_PROVIDER', smsForm.value.provider),
      saveConfig('SMS_API_KEY', smsForm.value.apiKey),
      saveConfig('SMS_API_SECRET', smsForm.value.apiSecret),
      saveConfig('SMS_SIGN_NAME', smsForm.value.signName),
      saveConfig('SMS_TEMPLATE_CODE', smsForm.value.templateCode),
    ]);
  } else {
    await Promise.all([
      saveConfig('TTS_PROVIDER', ttsForm.value.provider),
      saveConfig('TTS_API_KEY', ttsForm.value.apiKey),
      saveConfig('TTS_API_SECRET', ttsForm.value.apiSecret),
      saveConfig('TTS_CALLED_NUMBER', ttsForm.value.calledNumber),
    ]);
  }
}

onMounted(() => {
  loadAllConfigs();
});
</script>

<style scoped>
.notification-channel-page {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.btn-nav-settings {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-nav-settings:hover {
  background: var(--border);
  border-color: var(--primary);
}

.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-item:hover {
  color: var(--text);
}

.tab-item.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.config-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
}

.form-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: var(--text-secondary);
}

.form-input:focus,
.form-select:focus {
  border-color: var(--primary);
}

.form-select {
  appearance: auto;
  -webkit-appearance: auto;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 10px;
  padding-top: 4px;
  grid-column: 1 / -1;
}

.save-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.5;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
