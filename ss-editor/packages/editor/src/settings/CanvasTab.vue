<template>
  <div class="canvas-tab">
    <!-- 网格设置 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">📏</span>
        <span class="group-text">{{ $t('settings.gridSettings') }}</span>
      </div>
      
      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.gridSize') }}</label>
        <div class="input-with-unit">
          <input 
            v-model.number="gridSize" 
            type="number" 
            class="setting-input-number" 
            min="5" 
            max="100" 
            @change="handleGridSizeChange"
          >
          <span class="unit-text">px</span>
        </div>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.snapToGrid') }}</label>
        <label class="toggle-switch">
          <input
            v-model="snapToGrid"
            type="checkbox"
            @change="handleSnapToGridChange"
          >
          <span class="toggle-slider" />
        </label>
      </div>
    </div>

    <!-- 缩放设置 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">🔍</span>
        <span class="group-text">{{ $t('settings.zoomSettings') }}</span>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.minZoom') }}</label>
        <div class="input-with-unit">
          <input
            v-model.number="scaleMin"
            type="number"
            class="setting-input-number"
            :min="5"
            :max="100"
            step="5"
            @change="handleScaleMinChange"
          >
          <span class="unit-text">%</span>
        </div>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.maxZoom') }}</label>
        <div class="input-with-unit">
          <input
            v-model.number="scaleMax"
            type="number"
            class="setting-input-number"
            :min="100"
            :max="1000"
            step="10"
            @change="handleScaleMaxChange"
          >
          <span class="unit-text">%</span>
        </div>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.zoomStep') }}</label>
        <div class="input-with-unit">
          <input
            v-model.number="zoomStep"
            type="number"
            class="setting-input-number"
            :min="1"
            :max="50"
            step="1"
            @change="handleZoomStepChange"
          >
          <span class="unit-text">%</span>
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">💡</span>
        <span class="group-text">{{ $t('settings.tips') }}</span>
      </div>
      <div class="tips-content">
        <p>{{ $t('settings.tipGridSize') }}</p>
        <p>{{ $t('settings.tipSnapToGrid') }}</p>
        <p>{{ $t('settings.tipDefault') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useConfigStore } from '@scada-editor/core';
import { usePageStore } from '@scada-editor/core';

const configStore = useConfigStore();
const pageStore = usePageStore();

const gridSize = ref(20);
const snapToGrid = ref(true);
const scaleMin = ref(20);
const scaleMax = ref(300);
const zoomStep = ref(5);

onMounted(() => {
  if (configStore.canvas?.gridSize) {
    gridSize.value = configStore.canvas.gridSize;
  }
  if (typeof configStore.canvas?.snapToGrid !== 'undefined') {
    snapToGrid.value = configStore.canvas.snapToGrid;
  }
  if (configStore.canvas?.scaleMin) {
    scaleMin.value = configStore.canvas.scaleMin;
    pageStore.setScaleMin(scaleMin.value);
  }
  if (configStore.canvas?.scaleMax) {
    scaleMax.value = configStore.canvas.scaleMax;
    pageStore.setScaleMax(scaleMax.value);
  }
  if (configStore.canvas?.zoomStep) {
    zoomStep.value = configStore.canvas.zoomStep;
    pageStore.setZoomStep(1 + zoomStep.value / 100);
  }
});

const handleGridSizeChange = () => {
  configStore.updateCanvasConfig({ gridSize: gridSize.value });
};

const handleSnapToGridChange = () => {
  configStore.updateCanvasConfig({ snapToGrid: snapToGrid.value });
};

const handleScaleMinChange = () => {
  const val = Math.max(5, Math.min(scaleMin.value || 20, scaleMax.value - 10));
  scaleMin.value = val;
  configStore.updateCanvasConfig({ scaleMin: val });
  pageStore.setScaleMin(val);
};

const handleScaleMaxChange = () => {
  const val = Math.max(scaleMin.value + 10, scaleMax.value || 300);
  scaleMax.value = val;
  configStore.updateCanvasConfig({ scaleMax: val });
  pageStore.setScaleMax(val);
};

const handleZoomStepChange = () => {
  const val = Math.max(1, Math.min(zoomStep.value || 5, 50));
  zoomStep.value = val;
  configStore.updateCanvasConfig({ zoomStep: val });
  pageStore.setZoomStep(1 + val / 100);
};
</script>

<style scoped>
.canvas-tab {
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

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-input-number {
  width: 100px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--surface);
  color: var(--text);
  font-size: 14px;
  transition: all 0.2s ease;
}

.setting-input-number:hover {
  border-color: var(--primary);
}

.setting-input-number:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.unit-text {
  font-size: 14px;
  color: var(--text-secondary);
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
</style>
