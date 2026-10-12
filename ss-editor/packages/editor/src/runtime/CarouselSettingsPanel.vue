<template>
  <div
    v-if="visible"
    class="carousel-settings-overlay"
    @click.self="$emit('close')"
  >
    <div
      class="carousel-settings-panel"
      @click.stop
    >
      <div class="panel-header">
        <span class="panel-title">
          <span class="panel-icon">&#9881;</span>
          {{ t('carousel.settings.title') }}
        </span>
        <button
          class="btn-close"
          @click="$emit('close')"
        >
          &#10005;
        </button>
      </div>

      <div class="panel-body">
        <!-- 启用开关 -->
        <div class="setting-row">
          <label class="setting-label">{{ t('carousel.settings.enabled') }}</label>
          <label class="toggle-switch">
            <input
              v-model="localConfig.enabled"
              type="checkbox"
              class="toggle-input"
            >
            <span class="toggle-slider" />
          </label>
        </div>

        <!-- 轮播间隔 -->
        <div class="setting-row">
          <label class="setting-label">{{ t('carousel.settings.interval') }}</label>
          <div class="interval-options">
            <button
              v-for="opt in intervalOptions"
              :key="opt.value"
              class="interval-btn"
              :class="{ active: localConfig.interval === opt.value }"
              @click="localConfig.interval = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 参与页面 -->
        <div class="setting-row">
          <label class="setting-label">{{ t('carousel.settings.pages') }}</label>
          <label class="checkbox-label">
            <input
              v-model="useAllPages"
              type="checkbox"
              @change="handleUseAllPagesChange"
            >
            {{ t('carousel.settings.allPages') }}
          </label>
          <div
            v-if="!useAllPages"
            class="page-list"
          >
            <label
              v-for="page in allPages"
              :key="page.id"
              class="page-checkbox"
            >
              <input
                v-model="localConfig.pageIds"
                type="checkbox"
                :value="page.id"
              >
              {{ page.name || `Page ${page.id}` }}
            </label>
          </div>
        </div>

        <!-- 过渡效果 -->
        <div class="setting-row">
          <label class="setting-label">{{ t('carousel.settings.transition') }}</label>
          <div class="transition-options">
            <label
              v-for="opt in transitionOptions"
              :key="opt.value"
              class="radio-label"
            >
              <input
                v-model="localConfig.transition"
                type="radio"
                :value="opt.value"
              >
              {{ opt.label }}
            </label>
          </div>
        </div>

        <!-- 选项 -->
        <div class="setting-row">
          <label class="setting-label" />
          <label class="checkbox-label">
            <input
              v-model="localConfig.loop"
              type="checkbox"
            >
            {{ t('carousel.settings.loop') }}
          </label>
        </div>
        <div class="setting-row">
          <label class="setting-label" />
          <label class="checkbox-label">
            <input
              v-model="localConfig.autoStart"
              type="checkbox"
            >
            {{ t('carousel.settings.autoStart') }}
          </label>
        </div>
        <div class="setting-row">
          <label class="setting-label" />
          <label class="checkbox-label">
            <input
              v-model="localConfig.showSinglePage"
              type="checkbox"
            >
            {{ t('carousel.settings.showSinglePage') }}
          </label>
        </div>
      </div>

      <div class="panel-footer">
        <button
          class="btn-action btn-cancel"
          @click="$emit('close')"
        >
          {{ t('carousel.settings.cancel') }}
        </button>
        <button
          class="btn-action btn-save"
          @click="handleSave"
        >
          {{ t('carousel.settings.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { i18n, type CarouselConfig, DEFAULT_CAROUSEL_CONFIG, type CarouselTransition } from '@scada-editor/core';

const { t } = i18n.global;

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  config: {
    type: Object as () => CarouselConfig,
    required: true,
  },
  allPages: {
    type: Array as () => Array<{ id: string; name: string }>,
    default: () => [],
  },
});

const emit = defineEmits<{
  close: [];
  save: [config: CarouselConfig];
}>();

const localConfig = ref<CarouselConfig>({ ...DEFAULT_CAROUSEL_CONFIG });

const useAllPages = ref(true);

const intervalOptions = [
  { label: '10s', value: 10000 },
  { label: '15s', value: 15000 },
  { label: '30s', value: 30000 },
  { label: '60s', value: 60000 },
  { label: '120s', value: 120000 },
];

const transitionOptions: Array<{ label: string; value: CarouselTransition }> = [
  { label: t('carousel.settings.transitionNone'), value: 'none' },
  { label: t('carousel.settings.transitionFade'), value: 'fade' },
  { label: t('carousel.settings.transitionSlideLeft'), value: 'slide-left' },
  { label: t('carousel.settings.transitionSlideRight'), value: 'slide-right' },
];

watch(
  () => props.visible,
  (vis) => {
    if (vis) {
      localConfig.value = { ...props.config };
      useAllPages.value = localConfig.value.pageIds.length === 0;
    }
  },
);

function handleUseAllPagesChange(): void {
  if (useAllPages.value) {
    localConfig.value.pageIds = [];
    return;
  }
  if (localConfig.value.pageIds.length === 0) {
    localConfig.value.pageIds = props.allPages.map(p => p.id);
  }
}

function handleSave(): void {
  if (useAllPages.value) {
    localConfig.value.pageIds = [];
  }
  emit('save', { ...localConfig.value });
  emit('close');
}
</script>

<style scoped>
.carousel-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.carousel-settings-panel {
  width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  background: var(--surface, #18181c);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  box-shadow: var(--shadow-modal, 0 8px 40px rgba(0, 0, 0, 0.3));
  color: var(--text, #e0e0e0);
  font-size: 13px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  background: var(--header-background, rgba(255, 255, 255, 0.03));
  border-radius: 12px 12px 0 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #ffffff);
}

.panel-icon {
  font-size: 16px;
}

.btn-close {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  background: var(--surface, #18181c);
  color: var(--text-secondary, #999);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--elevated, rgba(255, 255, 255, 0.08));
  color: var(--text, #fff);
}

.panel-body {
  padding: 16px 18px;
}

.setting-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.setting-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-secondary, #888);
  padding-top: 4px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-slider {
  background: var(--primary, #63e2b7);
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.interval-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.interval-btn {
  padding: 4px 10px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  background: var(--surface, #18181c);
  color: var(--text-secondary, #aaa);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.interval-btn.active {
  background: var(--primary, #63e2b7);
  color: #000;
  border-color: var(--primary, #63e2b7);
}

.interval-btn:hover:not(.active) {
  background: var(--elevated, rgba(255, 255, 255, 0.08));
}

.checkbox-label,
.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text, #e0e0e0);
  cursor: pointer;
}

.page-list {
  width: 100%;
  margin-top: 4px;
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text, #e0e0e0);
  cursor: pointer;
  padding: 4px 0;
}

.transition-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-footer {
  display: flex;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  justify-content: flex-end;
}

.btn-action {
  padding: 8px 20px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: var(--surface, #18181c);
  color: var(--text-secondary, #ccc);
}

.btn-cancel:hover {
  background: var(--elevated, rgba(255, 255, 255, 0.08));
  color: var(--text, #fff);
}

.btn-save {
  background: var(--primary, #63e2b7);
  color: #000;
  border-color: var(--primary, #63e2b7);
  font-weight: 600;
}

.btn-save:hover {
  opacity: 0.85;
}
</style>
