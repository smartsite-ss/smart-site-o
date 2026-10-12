<template>
  <div class="layout-tab">
    <!-- 布局设置 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">📐</span>
        <span class="group-text">{{ $t('settings.layoutSettings') }}</span>
      </div>
      
      <div class="tips-content">
        <p>{{ $t('settings.tipLayoutResize') }}</p>
        <p>{{ $t('settings.tipLayoutCollapse') }}</p>
        <p>{{ $t('settings.tipLayoutAutoSave') }}</p>
        <p>{{ $t('settings.tipLayoutReset') }}</p>
      </div>
    </div>

    <!-- 默认布局 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">🔄</span>
        <span class="group-text">{{ $t('settings.resetLayout') }}</span>
      </div>
      
      <div class="reset-layout-section">
        <button
          class="reset-button"
          @click="handleResetLayout"
        >
          <span class="reset-icon">↻</span>
          <span class="reset-text">{{ $t('settings.resetToDefault') }}</span>
        </button>
      </div>
    </div>

    <!-- 布局信息 - 可编辑 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">📋</span>
        <span class="group-text">{{ $t('settings.layoutInfo') }}</span>
        <button
          class="save-button"
          :disabled="!hasChanges"
          @click="handleSaveLayout"
        >
          {{ $t('settings.save') }}
        </button>
      </div>
      
      <div class="layout-info-content">
        <div class="info-item">
          <span class="info-label">{{ $t('settings.leftPanelDefaultWidth') }}</span>
          <div class="input-group">
            <input 
              v-model.number="layoutConfig.leftPanelDefaultWidth" 
              type="number" 
              class="info-input"
              :min="layoutConfig.minWidth"
              :max="layoutConfig.maxWidth"
            >
            <span class="input-unit">px</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t('settings.rightPanelDefaultWidth') }}</span>
          <div class="input-group">
            <input 
              v-model.number="layoutConfig.rightPanelDefaultWidth" 
              type="number" 
              class="info-input"
              :min="layoutConfig.minWidth"
              :max="layoutConfig.maxWidth"
            >
            <span class="input-unit">px</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t('settings.minWidth') }}</span>
          <div class="input-group">
            <input 
              v-model.number="layoutConfig.minWidth" 
              type="number" 
              class="info-input"
              :min="48"
              :max="layoutConfig.maxWidth - 1"
            >
            <span class="input-unit">px</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t('settings.maxWidth') }}</span>
          <div class="input-group">
            <input 
              v-model.number="layoutConfig.maxWidth" 
              type="number" 
              class="info-input"
              :min="layoutConfig.minWidth + 1"
              :max="1000"
            >
            <span class="input-unit">px</span>
          </div>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t('settings.collapsedWidth') }}</span>
          <div class="input-group">
            <input 
              v-model.number="layoutConfig.collapsedWidth" 
              type="number" 
              class="info-input"
              :min="24"
              :max="layoutConfig.minWidth - 1"
            >
            <span class="input-unit">px</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useConfigStore, eventBus, i18n, DEFAULT_MIN_PANEL_WIDTH, DEFAULT_MAX_PANEL_WIDTH, DEFAULT_LEFT_WIDTH, DEFAULT_RIGHT_WIDTH, DEFAULT_COLLAPSED_WIDTH } from '@scada-editor/core';
import { showAlert, showConfirm } from '../utils/messageBox';

const { t } = i18n.global;

const configStore = useConfigStore();

interface LayoutConfig {
  leftPanelDefaultWidth: number;
  rightPanelDefaultWidth: number;
  minWidth: number;
  maxWidth: number;
  collapsedWidth: number;
}

const defaultConfig: LayoutConfig = {
  leftPanelDefaultWidth: DEFAULT_LEFT_WIDTH,
  rightPanelDefaultWidth: DEFAULT_RIGHT_WIDTH,
  minWidth: DEFAULT_MIN_PANEL_WIDTH,
  maxWidth: DEFAULT_MAX_PANEL_WIDTH,
  collapsedWidth: DEFAULT_COLLAPSED_WIDTH,
};

const layoutConfig = reactive<LayoutConfig>({
  leftPanelDefaultWidth: DEFAULT_LEFT_WIDTH,
  rightPanelDefaultWidth: DEFAULT_RIGHT_WIDTH,
  minWidth: DEFAULT_MIN_PANEL_WIDTH,
  maxWidth: DEFAULT_MAX_PANEL_WIDTH,
  collapsedWidth: DEFAULT_COLLAPSED_WIDTH,
});

const originalConfig = reactive<LayoutConfig>({
  leftPanelDefaultWidth: DEFAULT_LEFT_WIDTH,
  rightPanelDefaultWidth: DEFAULT_RIGHT_WIDTH,
  minWidth: DEFAULT_MIN_PANEL_WIDTH,
  maxWidth: DEFAULT_MAX_PANEL_WIDTH,
  collapsedWidth: DEFAULT_COLLAPSED_WIDTH,
});

const initConfig = () => {
  const ui = configStore.ui;
  
  layoutConfig.leftPanelDefaultWidth = ui.leftPanelWidth ?? DEFAULT_LEFT_WIDTH;
  layoutConfig.rightPanelDefaultWidth = ui.rightPanelWidth ?? DEFAULT_RIGHT_WIDTH;
  layoutConfig.minWidth = ui.minPanelWidth ?? DEFAULT_MIN_PANEL_WIDTH;
  layoutConfig.maxWidth = ui.maxPanelWidth ?? DEFAULT_MAX_PANEL_WIDTH;
  layoutConfig.collapsedWidth = ui.collapsedPanelWidth ?? DEFAULT_COLLAPSED_WIDTH;
  
  originalConfig.leftPanelDefaultWidth = layoutConfig.leftPanelDefaultWidth;
  originalConfig.rightPanelDefaultWidth = layoutConfig.rightPanelDefaultWidth;
  originalConfig.minWidth = layoutConfig.minWidth;
  originalConfig.maxWidth = layoutConfig.maxWidth;
  originalConfig.collapsedWidth = layoutConfig.collapsedWidth;
  
};

const hasChanges = computed(() => {
  return JSON.stringify(layoutConfig) !== JSON.stringify(originalConfig);
});

watch(layoutConfig, () => {
}, { deep: true });

onMounted(() => {
  initConfig();
  
  eventBus.on('settings-confirm', handleSaveLayout);
});

onUnmounted(() => {
  eventBus.off('settings-confirm', handleSaveLayout);
});

const handleResetLayout = async () => {
  if (await showConfirm(t('settings.confirmResetLayout'))) {
    Object.assign(layoutConfig, defaultConfig);
    Object.assign(originalConfig, defaultConfig);
    
    configStore.updateUIConfig({
      leftPanelWidth: defaultConfig.leftPanelDefaultWidth,
      rightPanelWidth: defaultConfig.rightPanelDefaultWidth,
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      minPanelWidth: defaultConfig.minWidth,
      maxPanelWidth: defaultConfig.maxWidth,
      collapsedPanelWidth: defaultConfig.collapsedWidth,
    });
    
    eventBus.emit('reset-panel-layout', null);
    await showAlert(t('settings.layoutResetSuccess'), t('settings.success'), 'success');
  }
};

const handleSaveLayout = async () => {
  if (!hasChanges.value) return;
  
  if (layoutConfig.minWidth >= layoutConfig.maxWidth) {
    await showAlert(t('settings.minWidthMustBeLessThanMax'), t('settings.error'), 'error');
    return;
  }
  
  if (layoutConfig.collapsedWidth >= layoutConfig.minWidth) {
    await showAlert(t('settings.collapsedWidthMustBeLessThanMin'), t('settings.error'), 'error');
    return;
  }
  
  if (layoutConfig.leftPanelDefaultWidth < layoutConfig.minWidth || 
      layoutConfig.leftPanelDefaultWidth > layoutConfig.maxWidth) {
    await showAlert(t('settings.leftPanelWidthRange'), t('settings.error'), 'error');
    return;
  }
  
  if (layoutConfig.rightPanelDefaultWidth < layoutConfig.minWidth || 
      layoutConfig.rightPanelDefaultWidth > layoutConfig.maxWidth) {
    await showAlert(t('settings.rightPanelWidthRange'), t('settings.error'), 'error');
    return;
  }
  
  Object.keys(layoutConfig).forEach(key => {
    (originalConfig as any)[key] = (layoutConfig as any)[key];
  });
  
  const newConfig = {
    leftPanelWidth: layoutConfig.leftPanelDefaultWidth,
    rightPanelWidth: layoutConfig.rightPanelDefaultWidth,
    minPanelWidth: layoutConfig.minWidth,
    maxPanelWidth: layoutConfig.maxWidth,
    collapsedPanelWidth: layoutConfig.collapsedWidth,
  };
  
  configStore.updateUIConfig(newConfig);
  
  const saveResult = configStore.saveConfig();
  
  if (saveResult.success) {
    eventBus.emit('layout-config-changed', { ...layoutConfig });
    await showAlert(t('settings.layoutSaveSuccess'), t('settings.success'), 'success');
  } else {
    const errorMsg = saveResult.error || t('errors.unknownError');
    await showAlert(`${t('settings.layoutSaveFailed')}: ${errorMsg}`, t('settings.error'), 'error');
  }
};
</script>

<style scoped>
.layout-tab {
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
  justify-content: space-between;
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

.save-button {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--primary);
  color: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.save-button:hover:not(:disabled) {
  background-color: var(--primary-dark);
}

.save-button:disabled {
  background-color: var(--border);
  cursor: not-allowed;
}

.tips-content {
  padding: 12px 16px;
  background-color: var(--surface);
  border-radius: 4px;
  border-left: 3px solid var(--primary);
}

.tips-content p {
  margin: 4px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.reset-layout-section {
  display: flex;
  justify-content: flex-start;
  padding: 8px 0;
}

.reset-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--control-button-background);
  color: var(--text);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.reset-button:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
}

.reset-icon {
  font-size: 18px;
}

.reset-text {
  font-size: 14px;
}

.layout-info-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background-color: var(--surface);
  border-radius: 4px;
  border: 1px solid var(--border);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.info-label {
  font-size: 13px;
  color: var(--text-secondary);
  flex: 1;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--background);
  color: var(--text);
  font-size: 13px;
  text-align: right;
  transition: all 0.2s ease;
}

.info-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.info-input::-webkit-outer-spin-button,
.info-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.info-input[type=number] {
  -moz-appearance: textfield;
}

.input-unit {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>