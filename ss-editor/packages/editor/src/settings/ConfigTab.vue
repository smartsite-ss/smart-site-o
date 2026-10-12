<template>
  <div class="config-tab">
    <!-- 配置导出 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">📤</span>
        <span class="group-text">{{ $t('settings.exportConfig') }}</span>
      </div>
      
      <div class="config-section">
        <p class="section-description">
          {{ $t('settings.exportConfigDesc') }}
        </p>
        
        <div class="button-group">
          <button
            class="action-button export-btn"
            @click="handleExport"
          >
            <span class="btn-icon">📥</span>
            <span class="btn-text">{{ $t('settings.export') }}</span>
          </button>
        </div>
        
        <div
          v-if="exportedConfig"
          class="config-preview"
        >
          <textarea 
            readonly 
            class="config-textarea"
            :value="exportedConfig"
            rows="8"
            :placeholder="$t('settings.pasteConfig')"
          />
          <button
            class="copy-button"
            @click="copyConfig"
          >
            {{ $t('settings.copy') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 配置导入 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">📥</span>
        <span class="group-text">{{ $t('settings.importConfig') }}</span>
      </div>
      
      <div class="config-section">
        <p class="section-description">
          {{ $t('settings.importConfigDesc') }}
        </p>
        
        <textarea 
          v-model="importConfigText"
          class="config-textarea"
          rows="8"
          :placeholder="$t('settings.pasteConfig')"
        />
        
        <div class="button-group">
          <button
            class="action-button import-btn"
            @click="handleImport"
          >
            <span class="btn-icon">📤</span>
            <span class="btn-text">{{ $t('settings.import') }}</span>
          </button>
          <button
            class="action-button reset-btn"
            @click="handleReset"
          >
            <span class="btn-icon">↻</span>
            <span class="btn-text">{{ $t('settings.reset') }}</span>
          </button>
        </div>
        
        <div
          v-if="importMessage"
          class="message-box"
          :class="importMessageType"
        >
          {{ importMessage }}
        </div>
      </div>
    </div>

    <!-- 配置对比 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">🔍</span>
        <span class="group-text">{{ $t('settings.configDiff') }}</span>
      </div>
      
      <div class="config-section">
        <p class="section-description">
          {{ $t('settings.configDiffDesc') }}
        </p>
        
        <div
          v-if="configDiff"
          class="diff-container"
        >
          <div
            v-for="(diff, key) in configDiff"
            :key="key"
            class="diff-item"
          >
            <span class="diff-key">{{ key }}</span>
            <span class="diff-value default">{{ diff.default }}</span>
            <span class="diff-arrow">→</span>
            <span class="diff-value current">{{ diff.current }}</span>
          </div>
        </div>
        
        <div
          v-else
          class="empty-state"
        >
          {{ $t('settings.noChanges') }}
        </div>
        
        <button
          v-if="configDiff"
          class="action-button apply-btn"
          @click="applyDefault"
        >
          <span class="btn-icon">🔄</span>
          <span class="btn-text">{{ $t('settings.applyDefaults') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { i18n } from '@scada-editor/core';
import { useConfig } from '../composables/useConfig';
import { showAlert } from '../utils/messageBox';

const { t } = i18n.global;

const { exportConfig, importConfig, resetUIConfig, uiConfig } = useConfig();

const exportedConfig = ref('');
const importConfigText = ref('');
const importMessage = ref('');
const importMessageType = ref<'success' | 'error'>('success');

const defaultUIConfig = {
  showToolbar: true,
  showPropertyPanel: true,
  showLayerPanel: true,
  theme: 'dark',
  language: 'zh-CN',
  leftPanelWidth: 280,
  rightPanelWidth: 320,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  minPanelWidth: 200,
  maxPanelWidth: 600,
  collapsedPanelWidth: 48,
};

const configDiff = computed(() => {
  const diff: Record<string, { default: any; current: any }> = {};
  
  Object.keys(defaultUIConfig).forEach(key => {
    const defaultVal = defaultUIConfig[key as keyof typeof defaultUIConfig];
    const currentVal = uiConfig.value[key as keyof typeof uiConfig.value];
    
    if (JSON.stringify(defaultVal) !== JSON.stringify(currentVal)) {
      diff[key] = {
        default: defaultVal,
        current: currentVal,
      };
    }
  });
  
  return Object.keys(diff).length > 0 ? diff : null;
});

const handleExport = () => {
  exportedConfig.value = exportConfig();
};

const copyConfig = async () => {
  if (exportedConfig.value) {
    navigator.clipboard.writeText(exportedConfig.value);
    await showAlert(t('settings.configCopied'), t('settings.success'), 'success');
  }
};

const handleImport = () => {
  if (!importConfigText.value.trim()) {
    importMessage.value = t('settings.pasteConfigFirst');
    importMessageType.value = 'error';
    return;
  }
  
  const result = importConfig(importConfigText.value);
  
  if (result.success) {
    importMessage.value = t('settings.importSuccess');
    importMessageType.value = 'success';
    importConfigText.value = '';
  } else {
    importMessage.value = `${t('settings.importFailed')}: ${result.error}`;
    importMessageType.value = 'error';
  }
  
  setTimeout(() => {
    importMessage.value = '';
  }, 3000);
};

const handleReset = () => {
  if (window.confirm(t('settings.confirmResetSettings'))) {
    resetUIConfig();
    importMessage.value = t('settings.resetSuccess');
    importMessageType.value = 'success';
    setTimeout(() => {
      importMessage.value = '';
    }, 3000);
  }
};

const applyDefault = () => {
  if (window.confirm(t('settings.confirmApplyDefaults'))) {
    resetUIConfig();
    importMessage.value = t('settings.applyDefaultsSuccess');
    importMessageType.value = 'success';
    setTimeout(() => {
      importMessage.value = '';
    }, 3000);
  }
};
</script>

<style scoped>
.config-tab {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.group-icon {
  font-size: 16px;
}

.group-text {
  font-size: 15px;
}

.config-section {
  padding: 16px;
  background-color: var(--surface);
  border-radius: 4px;
  border: 1px solid var(--border);
}

.section-description {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.action-button:hover {
  transform: translateY(-1px);
}

.export-btn {
  background-color: var(--primary);
  color: white;
}

.export-btn:hover {
  background-color: var(--primary-dark);
}

.import-btn {
  background-color: var(--success);
  color: white;
}

.import-btn:hover {
  background-color: var(--success-dark);
}

.reset-btn {
  background-color: var(--warning);
  color: white;
}

.reset-btn:hover {
  background-color: var(--warning-dark);
}

.apply-btn {
  background-color: var(--info);
  color: white;
}

.apply-btn:hover {
  background-color: var(--info-dark);
}

.btn-icon {
  font-size: 16px;
}

.btn-text {
  font-size: 14px;
}

.config-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--background);
  color: var(--text);
  font-family: monospace;
  font-size: 12px;
  resize: vertical;
  box-sizing: border-box;
}

.config-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.config-preview {
  margin-top: 12px;
  position: relative;
}

.copy-button {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--control-button-background);
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.copy-button:hover {
  background-color: var(--control-button-hover);
}

.message-box {
  margin-top: 12px;
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
}

.message-box.success {
  background-color: rgba(39, 174, 96, 0.1);
  color: var(--success);
  border: 1px solid rgba(39, 174, 96, 0.3);
}

.message-box.error {
  background-color: rgba(231, 76, 60, 0.1);
  color: var(--danger);
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.diff-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diff-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background-color: var(--background);
  border-radius: 4px;
}

.diff-key {
  flex: 1;
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}

.diff-value {
  flex: 1;
  font-size: 12px;
  font-family: monospace;
  padding: 4px 8px;
  border-radius: 2px;
}

.diff-value.default {
  background-color: rgba(149, 165, 166, 0.2);
  color: var(--text-secondary);
}

.diff-value.current {
  background-color: rgba(52, 152, 219, 0.2);
  color: var(--primary);
}

.diff-arrow {
  color: var(--text-secondary);
  font-size: 16px;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>