<template>
  <div class="interface-tab">
    <!-- 缓存管理（置顶） -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">🗑️</span>
        <span class="group-text">{{ $t('settings.clearCache') }}</span>
      </div>

      <div class="cache-desc">
        {{ $t('settings.clearCacheDesc') }}
      </div>

      <button
        class="clear-cache-btn"
        @click="handleClearCache"
      >
        {{ $t('settings.clearCacheBtn') }}
      </button>
    </div>

    <!-- 主题设置 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">🎨</span>
        <span class="group-text">{{ $t('settings.theme') }}</span>
      </div>
      
      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.themeLabel') }}</label>
        <select
          v-model="selectedTheme"
          class="setting-select"
          @change="handleThemeChange"
        >
          <option value="light">
            {{ $t('settings.themeOptions.light') }}
          </option>
          <option value="dark">
            {{ $t('settings.themeOptions.dark') }}
          </option>
          <option value="tech-light-blue">
            {{ $t('settings.themeOptions.techLightBlue') }}
          </option>
          <option value="tech-dark-blue">
            {{ $t('settings.themeOptions.techDarkBlue') }}
          </option>
        </select>
      </div>
    </div>

    <!-- 语言设置 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">🌐</span>
        <span class="group-text">{{ $t('settings.language') }}</span>
      </div>
      
      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.languageLabel') }}</label>
        <select
          v-model="selectedLanguage"
          class="setting-select"
          @change="handleLanguageChange"
        >
          <option value="zh-CN">
            {{ $t('settings.languageOptions.zhCN') }}
          </option>
          <option value="en-US">
            {{ $t('settings.languageOptions.enUS') }}
          </option>
        </select>
      </div>
    </div>

    <!-- 显示设置 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">👁️</span>
        <span class="group-text">{{ $t('settings.display') }}</span>
      </div>
      
      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.showRulers') }}</label>
        <label class="toggle-switch">
          <input
            v-model="showRulers"
            type="checkbox"
            @change="handleShowRulersChange"
          >
          <span class="toggle-slider" />
        </label>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.showToolbar') }}</label>
        <label class="toggle-switch">
          <input
            v-model="showToolbar"
            type="checkbox"
            @change="handleShowToolbarChange"
          >
          <span class="toggle-slider" />
        </label>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.showPropertyPanel') }}</label>
        <label class="toggle-switch">
          <input
            v-model="showPropertyPanel"
            type="checkbox"
            @change="handleShowPropertyPanelChange"
          >
          <span class="toggle-slider" />
        </label>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.showLayerPanel') }}</label>
        <label class="toggle-switch">
          <input
            v-model="showLayerPanel"
            type="checkbox"
            @change="handleShowLayerPanelChange"
          >
          <span class="toggle-slider" />
        </label>
      </div>
    </div>
    <!-- 定时保存设置 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">💾</span>
        <span class="group-text">{{ $t('autoSave.title') }}</span>
      </div>

      <div class="tips-content">
        <p>{{ $t('autoSave.tipAutoSave') }}</p>
        <p>{{ $t('autoSave.tipInterval') }}</p>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('autoSave.enabled') }}</label>
        <label class="toggle-switch">
          <input
            v-model="autoSaveEnabled"
            type="checkbox"
            @change="handleAutoSaveEnabledChange"
          >
          <span class="toggle-slider" />
        </label>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('autoSave.interval') }}</label>
        <div class="input-group">
          <input
            v-model.number="autoSaveInterval"
            type="number"
            class="interval-input"
            :min="60"
            :max="600"
            :disabled="!autoSaveEnabled"
            @change="handleAutoSaveIntervalChange"
          >
          <span class="input-unit">{{ $t('autoSave.intervalSeconds') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useConfigStore, useTheme, getLocale, setLocale, i18n, clearStorage } from '@scada-editor/core';
import { showConfirm } from '../utils/messageBox';

const configStore = useConfigStore();
const { switchTheme: useThemeSwitch } = useTheme();
const { t } = i18n.global;

// 主题
const selectedTheme = ref('dark');

// 语言
type LocaleType = 'zh-CN' | 'en-US';
const selectedLanguage = ref<LocaleType>('zh-CN');

// 显示设置
const showRulers = ref(true);
const showToolbar = ref(true);
const showPropertyPanel = ref(true);
const showLayerPanel = ref(true);

// 自动保存设置
const autoSaveEnabled = ref(true);
const autoSaveInterval = ref(300);

// 初始化
onMounted(() => {
  // 恢复保存的主题
  if (configStore.ui?.theme) {
    selectedTheme.value = configStore.ui.theme;
  }
  // 恢复保存的语言，并应用到 i18n 实例
  if (configStore.ui?.language) {
    selectedLanguage.value = configStore.ui.language as LocaleType;
    setLocale(configStore.ui.language as LocaleType);
  }
  // 恢复画布设置
  if (configStore.canvas?.showRulers) {
    showRulers.value = configStore.canvas.showRulers;
  }
  if (configStore.ui?.showToolbar) {
    showToolbar.value = configStore.ui.showToolbar;
  }
  if (configStore.ui?.showPropertyPanel) {
    showPropertyPanel.value = configStore.ui.showPropertyPanel;
  }
  if (configStore.ui?.showLayerPanel) {
    showLayerPanel.value = configStore.ui.showLayerPanel;
  }
  // 恢复自动保存配置
  if (configStore.autoSave?.enabled !== undefined) {
    autoSaveEnabled.value = configStore.autoSave.enabled;
  }
  if (configStore.autoSave?.interval) {
    autoSaveInterval.value = configStore.autoSave.interval;
  }
});

// 监听 configStore 中的语言变化（防止异步加载导致遗漏）
watch(() => configStore.ui?.language, (newLang) => {
  if (newLang && newLang !== getLocale()) {
    selectedLanguage.value = newLang as LocaleType;
    setLocale(newLang as LocaleType);
  }
});

// 主题变化
const handleThemeChange = () => {
  useThemeSwitch(selectedTheme.value as any);
  configStore.updateUIConfig({ theme: selectedTheme.value });
};

// 语言变化
const handleLanguageChange = () => {
  setLocale(selectedLanguage.value);
  configStore.updateUIConfig({ language: selectedLanguage.value });
};

// 显示标尺变化
const handleShowRulersChange = () => {
  configStore.updateCanvasConfig({ showRulers: showRulers.value });
};

// 显示工具栏变化
const handleShowToolbarChange = () => {
  configStore.updateUIConfig({ showToolbar: showToolbar.value });
};

// 显示属性面板变化
const handleShowPropertyPanelChange = () => {
  configStore.updateUIConfig({ showPropertyPanel: showPropertyPanel.value });
};

// 显示图层面板变化
const handleShowLayerPanelChange = () => {
  configStore.updateUIConfig({ showLayerPanel: showLayerPanel.value });
};

// 自动保存启用变化
const handleAutoSaveEnabledChange = () => {
  configStore.updateAutoSaveConfig({ enabled: autoSaveEnabled.value });
};

// 自动保存间隔变化
const handleAutoSaveIntervalChange = () => {
  const val = Math.max(60, Math.min(600, autoSaveInterval.value));
  autoSaveInterval.value = val;
  configStore.updateAutoSaveConfig({ interval: val });
};

// 清空浏览器缓存
const handleClearCache = async () => {
  const confirmed = await showConfirm(t('settings.clearCacheConfirm'), t('settings.clearCache'));
  if (confirmed) {
    clearStorage();
    window.location.reload();
  }
};
</script>

<style scoped>
.interface-tab {
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

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.setting-label {
  font-size: 14px;
  color: var(--text);
  flex: 1;
}

.setting-select {
  width: 200px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--surface);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.setting-select:hover {
  border-color: var(--primary);
}

.setting-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
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
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--primary);
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.cache-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  padding: 8px 0;
}

.clear-cache-btn {
  align-self: flex-start;
  padding: 8px 20px;
  border: 1px solid var(--danger, #e74c3c);
  border-radius: 4px;
  background-color: transparent;
  color: var(--danger, #e74c3c);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-cache-btn:hover {
  background-color: var(--danger, #e74c3c);
  color: white;
}

.input-unit {
  font-size: 12px;
  color: var(--text-secondary);
}

.interval-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--surface);
  color: var(--text);
  font-size: 14px;
  text-align: right;
}

.interval-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.interval-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 4px;
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
</style>
