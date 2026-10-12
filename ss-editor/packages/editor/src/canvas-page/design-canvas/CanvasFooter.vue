<template>
  <div class="canvas-footer">
    <div class="canvas-footer-left">
      <span class="footer-version">V{{ appVersion }} {{ buildTime }}</span>
      <button
        class="footer-button"
        :class="{ 'footer-button-active': pageStore.enableAutoFit }"
        :title="pageStore.enableAutoFit ? t('canvasFooter.disableAutoFit') : t('canvasFooter.enableAutoFit')"
        @click="pageStore.toggleAutoFit()"
      >
        {{ pageStore.enableAutoFit ? '🖼️' : '📐' }}
      </button>
      <CanvasHistoryPanel />
    </div>
    
    <div class="canvas-footer-right">
      <button
        class="footer-button"
        :title="t('canvasFooter.distribute')"
      >
        ⋮
      </button>
      
      <div class="zoom-control">
        <button
          class="zoom-button"
          :title="t('canvasFooter.zoomOut')"
          @click="handleZoomOut"
        >
          −
        </button>
        <div
          class="zoom-slider"
          @click="handleZoomSliderClick"
        >
          <div
            class="zoom-track"
            :style="{ width: zoomProgressPercent + '%' }"
          >
            <div class="zoom-thumb" />
          </div>
        </div>
        <button
          class="zoom-button"
          :title="t('canvasFooter.zoomIn')"
          @click="handleZoomIn"
        >
          +
        </button>
        <span class="zoom-value">{{ Math.round(pageStore.currentPageScaleFactor * 100) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePageStore, i18n } from '@scada-editor/core';
import { useViewportStore } from '../../stores/useViewportStore';
import CanvasHistoryPanel from './CanvasHistoryPanel.vue';

const pageStore = usePageStore();
const viewportStore = useViewportStore();

const { t } = i18n.global;

const appVersion = __APP_VERSION__;
const buildTime = __BUILD_TIME__;

const props = defineProps<{
  centerZoom: (delta: number) => void;
}>();

const zoomProgressPercent = computed(() => {
  const current = pageStore.currentPageScale;
  const min = viewportStore.scaleMin;
  const max = viewportStore.scaleMax;
  if (max <= min) return 100;
  return Math.max(0, Math.min(100, ((current - min) / (max - min)) * 100));
});

const handleZoomIn = () => props.centerZoom(10);
const handleZoomOut = () => props.centerZoom(-10);

const handleZoomSliderClick = (event: MouseEvent) => {
  if (pageStore.currentPage) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / rect.width;
    const minScale = viewportStore.scaleMin / 100;
    const maxScale = viewportStore.scaleMax / 100;
    const targetScale = minScale + ratio * (maxScale - minScale);
    const delta = targetScale * 100 - pageStore.currentPage.scale;
    props.centerZoom(delta);
  }
};
</script>

<style scoped>
.canvas-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  background-color: var(--surface);
  color: var(--text);
  height: 32px;
  padding: 0 16px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  gap: 16px;
}

.canvas-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.footer-version {
  color: var(--text-tertiary);
  font-size: 11px;
  white-space: nowrap;
}

.canvas-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s ease;
  font-size: 14px;
}

.footer-button:hover {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.footer-button-active {
  background-color: var(--primary);
  color: #fff;
}

.footer-button-active:hover {
  background-color: var(--primary);
  color: #fff;
  opacity: 0.9;
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

.zoom-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: bold;
}

.zoom-button:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
  color: var(--text);
}

.zoom-slider {
  width: 60px;
  height: 4px;
  background-color: var(--border);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  padding: 0 6px;
}

.zoom-track {
  width: 60%;
  height: 100%;
  background-color: var(--primary);
  border-radius: 2px;
  position: relative;
}

.zoom-thumb {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background-color: var(--text);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--shadow-small);
}

.zoom-value {
  min-width: 40px;
  text-align: right;
  color: var(--text-secondary);
  font-size: 12px;
}
</style>