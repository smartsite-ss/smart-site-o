<template>
  <div class="canvas-settings-wrapper">
    <button
      class="footer-button"
      :title="t('canvasFooter.settings')"
      @click="togglePanel"
    >
      ⚙️
    </button>
    <div
      v-if="visible"
      class="canvas-settings-panel"
    >
      <div class="settings-header">
        <span>{{ t('canvasFooter.settings') }}</span>
        <button
          class="settings-close"
          @click="visible = false"
        >
          ✕
        </button>
      </div>
      <div class="settings-body">
        <label class="settings-field">
          <span>{{ t('canvasFooter.scaleMin') }}</span>
          <input
            type="number"
            :value="scaleMin"
            :min="1"
            :max="scaleMax - 1"
            step="1"
            @change="onScaleMinChange"
          >
          <span class="settings-unit">%</span>
        </label>
        <label class="settings-field">
          <span>{{ t('canvasFooter.scaleMax') }}</span>
          <input
            type="number"
            :value="scaleMax"
            :min="scaleMin + 1"
            :max="1000"
            step="1"
            @change="onScaleMaxChange"
          >
          <span class="settings-unit">%</span>
        </label>
        <label class="settings-field">
          <span>{{ t('canvasFooter.zoomStep') }}</span>
          <input
            type="number"
            :value="zoomStep"
            :min="1.01"
            :max="5"
            step="0.01"
            @change="onZoomStepChange"
          >
          <span class="settings-unit">x</span>
        </label>
      </div>
      <div class="settings-footer">
        <button
          class="settings-reset"
          @click="resetDefaults"
        >
          {{ t('canvasFooter.resetDefaults') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePageStore, i18n } from '@scada-editor/core';
import { useViewportStore } from '../../stores/useViewportStore';
import { VIEWPORT } from './constants';

const { t } = i18n.global;
const pageStore = usePageStore();
const viewportStore = useViewportStore();

const visible = ref(false);

const scaleMin = ref(viewportStore.scaleMin);
const scaleMax = ref(viewportStore.scaleMax);
const zoomStep = ref(viewportStore.zoomStep);

const togglePanel = () => {
  scaleMin.value = viewportStore.scaleMin;
  scaleMax.value = viewportStore.scaleMax;
  zoomStep.value = viewportStore.zoomStep;
  visible.value = !visible.value;
};

const onScaleMinChange = (event: Event) => {
  const val = parseInt((event.target as HTMLInputElement).value, 10);
  if (!isNaN(val) && val >= 1 && val < scaleMax.value) {
    pageStore.setScaleMin(val);
    scaleMin.value = val;
  }
};

const onScaleMaxChange = (event: Event) => {
  const val = parseInt((event.target as HTMLInputElement).value, 10);
  if (!isNaN(val) && val > scaleMin.value && val <= 1000) {
    pageStore.setScaleMax(val);
    scaleMax.value = val;
  }
};

const onZoomStepChange = (event: Event) => {
  const val = parseFloat((event.target as HTMLInputElement).value);
  if (!isNaN(val) && val >= 1.01 && val <= 5) {
    const rounded = Math.round(val * 100) / 100;
    pageStore.setZoomStep(rounded);
    zoomStep.value = rounded;
  }
};

const resetDefaults = () => {
  pageStore.setScaleMin(VIEWPORT.SCALE_MIN);
  pageStore.setScaleMax(VIEWPORT.SCALE_MAX);
  pageStore.setZoomStep(VIEWPORT.ZOOM_STEP);
  scaleMin.value = VIEWPORT.SCALE_MIN;
  scaleMax.value = VIEWPORT.SCALE_MAX;
  zoomStep.value = VIEWPORT.ZOOM_STEP;
};
</script>

<style scoped>
.canvas-settings-wrapper {
  position: relative;
}

.canvas-settings-panel {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  width: 200px;
  z-index: 1000;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  font-size: 13px;
  font-weight: 600;
}

.settings-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary, #999);
  padding: 2px 4px;
}

.settings-body {
  padding: 12px;
}

.settings-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
}

.settings-field span:first-child {
  flex: 0 0 60px;
  color: var(--text-secondary, #666);
}

.settings-field input {
  width: 70px;
  padding: 4px 6px;
  border: 1px solid var(--border-color, #d0d0d0);
  border-radius: 4px;
  font-size: 12px;
  text-align: right;
}

.settings-unit {
  flex: 0 0 20px;
  color: var(--text-secondary, #999);
  font-size: 11px;
}

.settings-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--border-color, #f0f0f0);
}

.settings-reset {
  width: 100%;
  padding: 6px 0;
  border: 1px solid var(--border-color, #d0d0d0);
  border-radius: 4px;
  background: var(--bg-secondary, #f5f5f5);
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.settings-reset:hover {
  background: var(--bg-hover, #ebebeb);
}
</style>