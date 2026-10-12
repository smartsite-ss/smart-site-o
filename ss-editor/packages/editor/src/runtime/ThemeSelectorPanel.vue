<template>
  <div
    v-if="visible"
    class="theme-selector-overlay"
    @click.self="close"
  >
    <div class="theme-selector-panel">
      <div class="panel-header">
        <div class="panel-title">
          <span class="panel-icon">🎨</span>
          <span>{{ t('runtime.themeSelector.title') }}</span>
        </div>
        <button
          type="button"
          class="btn-close"
          @click="close"
        >
          ✕
        </button>
      </div>

      <div class="panel-body">
        <div class="theme-grid">
          <div
            v-for="theme in availableThemes"
            :key="theme.name"
            class="theme-item"
            :class="{ active: currentTheme === theme.name }"
            @click="selectTheme(theme.name)"
          >
            <div
              class="theme-preview"
              :style="getThemePreviewStyle(theme)"
            >
              <div class="preview-header" />
              <div class="preview-content">
                <div class="preview-block" />
                <div class="preview-text" />
              </div>
            </div>
            <div class="theme-info">
              <span class="theme-name">{{ theme.label }}</span>
              <span
                v-if="currentTheme === theme.name"
                class="theme-active-badge"
              >
                {{ t('runtime.themeSelector.current') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <span class="footer-info">
          {{ t('runtime.themeSelector.tip') }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@scada-editor/core';

const { t } = useI18n();

const _props = defineProps<{
  visible: boolean;
  currentTheme: string;
}>();

const emit = defineEmits<{
  close: [];
  select: [themeName: string];
}>();

interface ThemeOption {
  name: string;
  label: string;
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
  };
}

const availableThemes = computed<ThemeOption[]>(() => [
  {
    name: 'light',
    label: t('globalTools.lightTheme'),
    colors: { primary: '#2080f0', background: '#f5f5f5', surface: '#ffffff', text: '#333333' }
  },
  {
    name: 'dark',
    label: t('globalTools.darkTheme'),
    colors: { primary: '#63e2b7', background: '#101014', surface: '#18181c', text: '#e0e0e0' }
  },
  {
    name: 'tech-light-blue',
    label: t('globalTools.techLightBlue'),
    colors: { primary: '#00a8e6', background: '#f0f5ff', surface: '#ffffff', text: '#1a1a2e' }
  },
  {
    name: 'tech-dark-blue',
    label: t('globalTools.techDarkBlue'),
    colors: { primary: '#00d4ff', background: '#0a1929', surface: '#132f4c', text: '#e0f2fe' }
  },
  {
    name: 'blue-light',
    label: t('globalTools.blueLight'),
    colors: { primary: '#1890ff', background: '#f0f2f5', surface: '#ffffff', text: '#262626' }
  },
  {
    name: 'blue-dark',
    label: t('globalTools.blueDark'),
    colors: { primary: '#40a9ff', background: '#141414', surface: '#1f1f1f', text: '#d9d9d9' }
  },
  {
    name: 'green-tech',
    label: t('globalTools.greenTech'),
    colors: { primary: '#52c41a', background: '#f6ffed', surface: '#ffffff', text: '#135200' }
  },
  {
    name: 'orange-warm',
    label: t('globalTools.orangeWarm'),
    colors: { primary: '#fa8c16', background: '#fff7e6', surface: '#ffffff', text: '#873800' }
  },
  {
    name: 'enterprise',
    label: t('globalTools.enterprise'),
    colors: { primary: '#2f54eb', background: '#f0f5ff', surface: '#ffffff', text: '#1d39c4' }
  },
]);

function getThemePreviewStyle(theme: ThemeOption) {
  return {
    '--preview-primary': theme.colors.primary,
    '--preview-background': theme.colors.background,
    '--preview-surface': theme.colors.surface,
    '--preview-text': theme.colors.text,
  };
}

function selectTheme(themeName: string) {
  emit('select', themeName);
}

function close() {
  emit('close');
}
</script>

<style scoped>
.theme-selector-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-selector-panel {
  width: 560px;
  max-height: 80vh;
  background: var(--surface, #fff);
  border-radius: 12px;
  box-shadow: var(--shadow-modal, 0 8px 40px rgba(0, 0, 0, 0.2));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #e8eaed);
  background: var(--header-background, #fafbfc);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text, #1a1a2e);
}

.panel-icon {
  font-size: 20px;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  background: var(--surface, #fff);
  color: var(--text-secondary, #606266);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--elevated, #f0f0f0);
  color: var(--text, #1a1a2e);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.theme-item {
  cursor: pointer;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: all 0.2s;
  background: var(--elevated, #f5f7fa);
}

.theme-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium, 0 4px 12px rgba(0, 0, 0, 0.1));
}

.theme-item.active {
  border-color: var(--primary, #2080f0);
}

.theme-preview {
  height: 80px;
  background: var(--preview-background);
  position: relative;
  overflow: hidden;
}

.preview-header {
  height: 20px;
  background: var(--preview-primary);
}

.preview-content {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-block {
  width: 40px;
  height: 24px;
  background: var(--preview-surface);
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.preview-text {
  height: 8px;
  background: var(--preview-text);
  opacity: 0.3;
  border-radius: 2px;
}

.theme-info {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface, #fff);
}

.theme-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text, #1a1a2e);
}

.theme-active-badge {
  font-size: 11px;
  color: var(--primary, #2080f0);
  font-weight: 500;
}

.panel-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border, #e8eaed);
  background: var(--header-background, #fafbfc);
}

.footer-info {
  font-size: 12px;
  color: var(--text-tertiary, #909399);
}

@media (max-width: 640px) {
  .theme-selector-panel {
    width: 90vw;
  }

  .theme-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
