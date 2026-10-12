<template>
  <div class="tools-tab">
    <!-- 颜色设置 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">🎨</span>
        <span class="group-text">{{ $t('settings.colorSettings') }}</span>
      </div>
      
      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.fillColor') }}</label>
        <div class="color-picker-wrapper">
          <input 
            v-model="fillColor" 
            type="color" 
            class="color-input" 
            @change="handleFillColorChange"
          >
          <span class="color-text">{{ fillColor }}</span>
        </div>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.strokeColor') }}</label>
        <div class="color-picker-wrapper">
          <input 
            v-model="strokeColor" 
            type="color" 
            class="color-input" 
            @change="handleStrokeColorChange"
          >
          <span class="color-text">{{ strokeColor }}</span>
        </div>
      </div>
    </div>

    <!-- 线条设置 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">✏️</span>
        <span class="group-text">{{ $t('settings.lineSettings') }}</span>
      </div>
      
      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.lineWidth') }}</label>
        <div class="input-with-unit">
          <input 
            v-model.number="lineWidth" 
            type="number" 
            class="setting-input-number" 
            min="1" 
            max="20" 
            @change="handleLineWidthChange"
          >
          <span class="unit-text">px</span>
        </div>
      </div>
    </div>

    <!-- 字体设置 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">📝</span>
        <span class="group-text">{{ $t('settings.fontSettings') }}</span>
      </div>
      
      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.fontSize') }}</label>
        <div class="input-with-unit">
          <input 
            v-model.number="fontSize" 
            type="number" 
            class="setting-input-number" 
            min="8" 
            max="72" 
            @change="handleFontSizeChange"
          >
          <span class="unit-text">px</span>
        </div>
      </div>

      <div class="setting-row">
        <label class="setting-label">{{ $t('settings.fontFamily') }}</label>
        <select
          v-model="fontFamily"
          class="setting-select"
          @change="handleFontFamilyChange"
        >
          <option value="Arial">
            Arial
          </option>
          <option value="Microsoft YaHei">
            {{ $t('settings.fontOptions.microsoftYaHei') }}
          </option>
          <option value="SimHei">
            {{ $t('settings.fontOptions.simHei') }}
          </option>
          <option value="SimSun">
            {{ $t('settings.fontOptions.simSun') }}
          </option>
          <option value="Times New Roman">
            Times New Roman
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useConfigStore } from '@scada-editor/core';

const configStore = useConfigStore();

const fillColor = ref('#4CAF50');
const strokeColor = ref('#388E3C');
const lineWidth = ref(2);
const fontSize = ref(14);
const fontFamily = ref('Arial');

onMounted(() => {
  if (configStore.tools?.fillColor) {
    fillColor.value = configStore.tools.fillColor;
  }
  if (configStore.tools?.strokeColor) {
    strokeColor.value = configStore.tools.strokeColor;
  }
  if (configStore.tools?.lineWidth) {
    lineWidth.value = configStore.tools.lineWidth;
  }
  if (configStore.tools?.fontSize) {
    fontSize.value = configStore.tools.fontSize;
  }
  if (configStore.tools?.fontFamily) {
    fontFamily.value = configStore.tools.fontFamily;
  }
});

const handleFillColorChange = () => {
  configStore.updateToolConfig({ fillColor: fillColor.value });
};

const handleStrokeColorChange = () => {
  configStore.updateToolConfig({ strokeColor: strokeColor.value });
};

const handleLineWidthChange = () => {
  configStore.updateToolConfig({ lineWidth: lineWidth.value });
};

const handleFontSizeChange = () => {
  configStore.updateToolConfig({ fontSize: fontSize.value });
};

const handleFontFamilyChange = () => {
  configStore.updateToolConfig({ fontFamily: fontFamily.value });
};
</script>

<style scoped>
.tools-tab {
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

.unit-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input {
  width: 40px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  padding: 2px;
}

.color-text {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 80px;
  text-align: right;
}
</style>
