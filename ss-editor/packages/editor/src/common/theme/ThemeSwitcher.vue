<template>
  <div
    v-if="visible"
    class="theme-switcher-overlay"
    @click.self="close"
  >
    <div class="theme-switcher-panel">
      <div class="switcher-header">
        <h3 class="switcher-title">
          {{ displayTitle }}
        </h3>
        <button
          class="switcher-close"
          @click="close"
        >
          ✕
        </button>
      </div>

      <div class="switcher-content">
        <div
          v-if="lightThemes.length"
          class="theme-category"
        >
          <div class="category-label">
            {{ lightCategoryLabel }}
          </div>
          <div class="theme-grid">
            <div
              v-for="t in lightThemes"
              :key="t.name"
              :class="['theme-card', { active: currentThemeName === t.name }]"
              @click="select(t.name)"
            >
              <div
                class="theme-preview"
                :style="getPreviewStyle(t.name)"
              >
                <div class="preview-header" />
                <div class="preview-body">
                  <div class="preview-block preview-block--1" />
                  <div class="preview-block preview-block--2" />
                </div>
              </div>
              <div class="theme-info">
                <span class="theme-label">{{ $t(`system.layout.theme.${themeNameToCamel(t.name)}`) }}</span>
                <span class="theme-desc">{{ t.description }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="darkThemes.length"
          class="theme-category"
        >
          <div class="category-label">
            {{ darkCategoryLabel }}
          </div>
          <div class="theme-grid">
            <div
              v-for="t in darkThemes"
              :key="t.name"
              :class="['theme-card', { active: currentThemeName === t.name }]"
              @click="select(t.name)"
            >
              <div
                class="theme-preview"
                :style="getPreviewStyle(t.name)"
              >
                <div class="preview-header" />
                <div class="preview-body">
                  <div class="preview-block preview-block--1" />
                  <div class="preview-block preview-block--2" />
                </div>
              </div>
              <div class="theme-info">
                <span class="theme-label">{{ $t(`system.layout.theme.${themeNameToCamel(t.name)}`) }}</span>
                <span class="theme-desc">{{ t.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useThemeSwitcher } from '@scada-editor/core';
import type { ThemeName } from '@scada-editor/core';
import { getTheme } from '@scada-editor/core';
import { useI18n } from '@scada-editor/core';

const props = withDefaults(defineProps<{
  visible: boolean;
  title?: string;
}>(), {
  title: '',
});

const { t: $t } = useI18n();

const emit = defineEmits<{
  close: [];
  'update:visible': [value: boolean];
}>();

const { currentThemeName, lightThemes, darkThemes, setTheme } = useThemeSwitcher();

const displayTitle = computed(() => props.title || $t('system.settings.selectTheme'));

const lightCategoryLabel = computed(() => $t('system.settings.lightThemes', '浅色主题'));
const darkCategoryLabel = computed(() => $t('system.settings.darkThemes', '深色主题'));

function themeNameToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function select(name: ThemeName) {
  setTheme(name);
  emit('update:visible', false);
  emit('close');
}

function close() {
  emit('update:visible', false);
  emit('close');
}

function getPreviewStyle(name: ThemeName) {
  const theme = getTheme(name);
  return {
    '--preview-primary': theme.primary,
    '--preview-surface': theme.surface,
    '--preview-background': theme.background,
    '--preview-text': theme.text,
    '--preview-border': theme.border,
  };
}

const _isActive = (name: ThemeName) => currentThemeName.value === name;
</script>

<style scoped>
.theme-switcher-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--backdrop);
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.theme-switcher-panel {
  width: 640px;
  max-height: 80vh;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.switcher-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.switcher-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.switcher-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
}

.switcher-close:hover {
  background: var(--control-button-hover);
  color: var(--text);
}

.switcher-content {
  padding: 16px 20px 20px;
  overflow-y: auto;
}

.theme-category {
  margin-bottom: 16px;
}

.theme-category:last-child {
  margin-bottom: 0;
}

.category-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.theme-card {
  border: 2px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.theme-card:hover {
  border-color: var(--border-focus);
  box-shadow: var(--shadow-card);
}

.theme-card.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.theme-preview {
  height: 56px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  height: 12px;
  background: var(--preview-primary);
}

.preview-body {
  flex: 1;
  display: flex;
  gap: 2px;
  padding: 4px;
  background: var(--preview-background);
}

.preview-block--1 {
  flex: 1;
  background: var(--preview-surface);
  border-radius: 2px;
}

.preview-block--2 {
  width: 24px;
  background: var(--preview-primary);
  border-radius: 2px;
  opacity: 0.6;
}

.theme-info {
  padding: 6px 8px;
  background: var(--surface);
}

.theme-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1px;
}

.theme-desc {
  display: block;
  font-size: 10px;
  color: var(--text-tertiary);
}
</style>