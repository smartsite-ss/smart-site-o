<template>
  <div class="style-panel-content">
    <!-- 画布尺寸设置 -->
    <div class="property-group">
      <label>{{ $t('canvasProperties.canvasSize') }}</label>
      <div class="canvas-size-container">
        <div class="canvas-size-item">
          <span>{{ $t('canvasProperties.width') }}</span>
          <ValueAdjuster
            v-model="props.pageProperties.width"
            :step="10"
            :min="100"
            input-width="80"
            @update:model-value="updatePageProperties"
          />
        </div>
        <div class="canvas-size-item">
          <span>{{ $t('canvasProperties.height') }}</span>
          <ValueAdjuster
            v-model="props.pageProperties.height"
            :step="10"
            :min="100"
            input-width="80"
            @update:model-value="updatePageProperties"
          />
        </div>
      </div>
    </div>
    
    <!-- 背景设置 -->
    <div class="property-group">
      <label>{{ $t('canvasProperties.backgroundSettings') }}</label>
      
      <!-- 背景图片上传 -->
      <div class="property-item background-upload-container">
        <div class="background-upload-area">
          <input
            type="file"
            accept="image/*"
            class="background-upload-input"
            @change="handleBackgroundImageUpload"
          >
          <div 
            class="background-upload-placeholder" 
            :style="{ backgroundImage: canvasBackgroundImage ? `url(${canvasBackgroundImage})` : 'none' }"
          >
            <div
              v-if="!canvasBackgroundImage"
              class="background-upload-content"
            >
              <div class="background-upload-icon">
                📷
              </div>
              <div class="background-upload-text">
                {{ $t('canvasProperties.clickToUpload') }}
              </div>
            </div>
          </div>
        </div>
        <p class="background-upload-hint">
          {{ $t('canvasProperties.backgroundImageHint') }}
        </p>
      </div>
      
      <!-- 背景颜色 -->
      <div class="property-item">
        <span>{{ $t('canvasProperties.backgroundColor') }}</span>
        <ColorPicker
          :model-value="props.pageProperties.backgroundColor"
          @color-change="handleBackgroundColorChange"
        />
      </div>
      
      <!-- 应用类型 -->
      <div class="property-item">
        <span>{{ $t('canvasProperties.applicationType') }}</span>
        <select
          v-model="canvasApplicationType"
          @change="updateCanvasApplicationType"
        >
          <option value="applicationColor">
            {{ $t('canvasProperties.applicationColor') }}
          </option>
          <option value="applicationImage">
            {{ $t('canvasProperties.applicationImage') }}
          </option>
        </select>
      </div>
      
      <!-- 背景控制按钮 -->
      <div class="property-item background-control-buttons">
        <button
          class="btn btn--text"
          @click="clearBackgroundImage"
        >
          {{ $t('canvasProperties.clearBackground') }}
        </button>
        <button
          class="btn btn--text"
          @click="clearBackgroundColor"
        >
          {{ $t('canvasProperties.clearColor') }}
        </button>
      </div>
    </div>
    
    <!-- 渲染器选择 -->
    <div class="property-group">
      <label>{{ $t('canvasProperties.rendererMode') }}</label>
      <div class="property-item">
        <select
          v-model="renderMode"
          class="renderer-select"
          @change="updateRenderMode"
        >
          <option value="canvas">
            {{ $t('canvasProperties.canvasRenderer') }}
          </option>
          <option value="konva">
            {{ $t('canvasProperties.konvaRenderer') }}
          </option>
          <option value="svg">
            {{ $t('canvasProperties.svgRenderer') }}
          </option>
          <option value="webgl">
            {{ $t('canvasProperties.webglRenderer') }}
          </option>
        </select>
      </div>
      <p class="renderer-hint">
        {{ getRendererHint() }}
      </p>
    </div>
    
    <!-- 选择模式 -->
    <div class="property-group">
      <label>{{ $t('canvasProperties.selectionMode') }}</label>
      <div class="property-item">
        <select
          v-model="selectionMode"
          class="selection-mode-select"
          @change="updateSelectionMode"
        >
          <option value="dom">
            {{ $t('canvasProperties.domSelection') }}
          </option>
          <option value="canvas">
            {{ $t('canvasProperties.canvasSelection') }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- 窗口适配方式（运行态） -->
    <div class="property-group">
      <label>{{ $t('canvasProperties.viewportFit') }}</label>
      <div class="property-item viewport-fit-buttons">
        <button 
          :class="{ active: viewportFitMode === 'auto', 'viewport-fit-button': true }" 
          :title="viewportFitMode === 'auto' ? `🤖 ${$t('canvasProperties.autoFit')}（${$t('canvasProperties.current')}）` : `🤖 ${$t('canvasProperties.autoFit')}：${$t('canvasProperties.autoFitDesc')}`"
          @click="viewportFitMode = 'auto'; updateViewportFitMode()"
        >
          🤖
        </button>
        <button 
          :class="{ active: viewportFitMode === 'contain', 'viewport-fit-button': true }" 
          :title="viewportFitMode === 'contain' ? `📦 ${$t('canvasProperties.containFit')}（${$t('canvasProperties.current')}）` : `📦 ${$t('canvasProperties.containFit')}：${$t('canvasProperties.containFitDesc')}`"
          @click="viewportFitMode = 'contain'; updateViewportFitMode()"
        >
          📦
        </button>
        <button 
          :class="{ active: viewportFitMode === 'fitWidth', 'viewport-fit-button': true }" 
          :title="viewportFitMode === 'fitWidth' ? `↔️ ${$t('canvasProperties.fitWidth')}（${$t('canvasProperties.current')}）` : `↔️ ${$t('canvasProperties.fitWidth')}：${$t('canvasProperties.fitWidthDesc')}`"
          @click="viewportFitMode = 'fitWidth'; updateViewportFitMode()"
        >
          ↔️
        </button>
        <button 
          :class="{ active: viewportFitMode === 'fitHeight', 'viewport-fit-button': true }" 
          :title="viewportFitMode === 'fitHeight' ? `↕️ ${$t('canvasProperties.fitHeight')}（${$t('canvasProperties.current')}）` : `↕️ ${$t('canvasProperties.fitHeight')}：${$t('canvasProperties.fitHeightDesc')}`"
          @click="viewportFitMode = 'fitHeight'; updateViewportFitMode()"
        >
          ↕️
        </button>
        <button 
          :class="{ active: viewportFitMode === 'stretch', 'viewport-fit-button': true }" 
          :title="viewportFitMode === 'stretch' ? `⬜ ${$t('canvasProperties.stretchFit')}（${$t('canvasProperties.current')}）` : `⬜ ${$t('canvasProperties.stretchFit')}：${$t('canvasProperties.stretchFitDesc')}`"
          @click="viewportFitMode = 'stretch'; updateViewportFitMode()"
        >
          ⬜
        </button>
      </div>
      <p class="viewport-hint">
        {{ $t('canvasProperties.viewportDefaultHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { i18n, useConfigStore, resolveAssetPath } from '@scada-editor/core';
import { ColorPicker } from '@scada-editor/shared';
import ValueAdjuster from '../common/ValueAdjuster.vue';
import { showAlert } from '../utils/messageBox';

const { t } = i18n.global;

const props = defineProps<{
  pageProperties: any;
}>();

const emit = defineEmits<{
  updatePageProperties: [];
}>();

// 画布属性
const canvasBackgroundImage = ref('');
const _canvasBackgroundColor = ref('#ffffff');
const canvasApplicationType = ref('applicationColor');
const _canvasFitMode = ref('stretch');
const renderMode = ref<'canvas' | 'konva' | 'svg' | 'webgl'>('canvas');
const viewportFitMode = ref<'auto' | 'contain' | 'fitWidth' | 'fitHeight' | 'stretch'>('auto');
const selectionMode = ref<'dom' | 'canvas'>('dom');

// 获取配置 store
const configStore = useConfigStore();

// 缓存已创建的 object URLs，用于后续释放（必须在 watch 之前声明，避免 TDZ）
let bgObjectUrl: string | null = null;

/**
 * 使用认证加载背景图片，返回 blob URL（确保 CSS background-image 能正常显示 auth 保护的图片）
 * 与 loadImageWithAuth 逻辑一致，但返回 blob URL 供 CSS 使用而非 Image 对象
 */
async function loadBgImageWithAuth(src: string): Promise<string> {
  const resolvedSrc = resolveAssetPath(src);
  // blob/data URL 不需要认证
  if (resolvedSrc.startsWith('blob:') || resolvedSrc.startsWith('data:')) {
    return resolvedSrc;
  }
  try {
    // S-C03: Token 通过 HttpOnly Cookie 传输，使用 credentials: 'include' 携带
    const token = localStorage.getItem('scada_access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(resolvedSrc, { credentials: 'include', headers });
    if (!response.ok) {
      // 404 说明图片资源不存在，直接清空不再重试
      if (response.status === 404) {
        console.debug('[CanvasProperties] 背景图片资源不存在(404)，清空:', resolvedSrc);
        return '';
      }
      throw new Error(`Failed to load background image (${response.status})`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('[CanvasProperties] 背景图片认证加载失败，回退到直连 URL:', err);
    return resolvedSrc;
  }
}

// 组件挂载时加载配置
onMounted(() => {
  renderMode.value = configStore.canvas.renderMode || 'canvas';
  if (props.pageProperties?.fitMode) {
    viewportFitMode.value = props.pageProperties.fitMode;
  }
});

// 监听页面切换：同步背景图片预览（使用 auth 加载确保 CSS background-image 能显示受保护图片）
watch(() => props.pageProperties?.backgroundImage, async (newBg) => {
  // 如果新 URL 与当前的 bgObjectUrl 相同，说明是上传处理函数自己设置的，
  // 跳过 revoke 操作，避免把自己刚创建的 blob URL 给 revoke 掉
  if (newBg === bgObjectUrl) return;

  // 清理旧的 object URL
  if (bgObjectUrl) {
    URL.revokeObjectURL(bgObjectUrl);
    bgObjectUrl = null;
  }
  if (newBg) {
    bgObjectUrl = await loadBgImageWithAuth(newBg);
    canvasBackgroundImage.value = bgObjectUrl;
  } else {
    canvasBackgroundImage.value = '';
  }
}, { immediate: true });

// 更新渲染器模式
const updateRenderMode = () => {
  configStore.updateCanvasConfig({ renderMode: renderMode.value });
  const rendererNames: Record<string, string> = {
    canvas: 'Canvas',
    konva: 'Konva',
    svg: 'SVG',
    webgl: 'WebGL',
  };
  showAlert(t('canvasProperties.rendererSwitched', { renderer: rendererNames[renderMode.value] || renderMode.value }), t('canvasProperties.tip'), 'info');
};

const getRendererHint = () => {
  const hints: Record<string, string> = {
    canvas: 'canvasHint',
    konva: 'konvaHint',
    svg: 'svgHint',
    webgl: 'webglHint',
  };
  return t(`canvasProperties.${hints[renderMode.value] || 'canvasHint'}`);
};

// 更新页面属性
const updatePageProperties = () => {
  if (props.pageProperties) {
    emit('updatePageProperties');
  }
};

// 处理背景图片上传
const handleBackgroundImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    // 检查文件大小
    if (file.size > 10 * 1024 * 1024) {
      await showAlert(i18n.global.t('canvasProperties.errorMessages.fileSizeError'), t('settings.error'), 'error');
      return;
    }
    // 检查文件类型
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      await showAlert(i18n.global.t('canvasProperties.errorMessages.fileTypeError'), t('settings.error'), 'error');
      return;
    }
    // 释放旧 object URL
    if (bgObjectUrl) {
      URL.revokeObjectURL(bgObjectUrl);
    }
    // 将文件转为 base64 data URL 存储（替代 blob URL）
    // blob URL 容易因 revoke 或 GC 而失效，导致保存时 urlToBlob 无法 fetch 到数据
    // data URL 自包含，在任何时候都能被读取，且 urlToBlob 已支持 data URL 路径
    bgObjectUrl = await fileToDataUrl(file);
    canvasBackgroundImage.value = bgObjectUrl;
    // 选择了图片背景，同步切换为应用图片类型
    canvasApplicationType.value = 'applicationImage';
    // 将背景图片保存到页面属性中
    if (props.pageProperties && typeof props.pageProperties.updatePageProperties === 'function') {
      props.pageProperties.updatePageProperties({
        backgroundImage: canvasBackgroundImage.value
      });
    } else if (props.pageProperties) {
      props.pageProperties.backgroundImage = canvasBackgroundImage.value;
    }
  }
};

/** 将 File 转换为 base64 data URL */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as data URL'));
    reader.readAsDataURL(file);
  });
}

// 更新画布背景
const updateCanvasBackground = () => {
  // 这里可以添加更新画布背景的逻辑
};

const handleBackgroundColorChange = (color: string) => {
  props.pageProperties.backgroundColor = color;
  updateCanvasBackground();
};

// 更新应用类型
const updateCanvasApplicationType = () => {
  // 这里可以添加更新应用类型的逻辑
};

// 清除背景图片
const clearBackgroundImage = () => {
  if (bgObjectUrl) {
    URL.revokeObjectURL(bgObjectUrl);
    bgObjectUrl = null;
  }
  canvasBackgroundImage.value = '';
  if (props.pageProperties && typeof props.pageProperties.updatePageProperties === 'function') {
    props.pageProperties.updatePageProperties({
      backgroundImage: ''
    });
  } else if (props.pageProperties) {
    props.pageProperties.backgroundImage = '';
  }
};

// 清除背景颜色
const clearBackgroundColor = () => {
  if (props.pageProperties && typeof props.pageProperties.updatePageProperties === 'function') {
    props.pageProperties.updatePageProperties({
      backgroundColor: ''
    });
  } else if (props.pageProperties) {
    props.pageProperties.backgroundColor = '';
  }
};

// 更新窗口适配模式到页面
const updateViewportFitMode = () => {
  if (props.pageProperties && typeof props.pageProperties.updatePageProperties === 'function') {
    props.pageProperties.updatePageProperties({
      fitMode: viewportFitMode.value
    });
  }
};

// 更新选择模式
const updateSelectionMode = () => {
  configStore.updateCanvasConfig({ useCanvasSelection: selectionMode.value === 'canvas' });
};
</script>

<style scoped>
@import '../panels/styles/property-panel.scss';

.property-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 2px;
}

.property-section h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px;
  border-bottom: 1px solid var(--border);
  background-color: var(--background);
}

/* 背景上传容器 */
.background-upload-container {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

/* 背景上传区域 */
.background-upload-area {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: var(--spacing-sm) 0;
  position: relative;
}

/* 背景上传输入 */
.background-upload-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

/* 背景上传占位符 */
.background-upload-placeholder {
  width: 120px;
  height: 120px;
  border: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
}

/* 背景上传内容 */
.background-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* 背景上传图标 */
.background-upload-icon {
  font-size: 24px;
  margin-bottom: 5px;
}

/* 背景上传文本 */
.background-upload-text {
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
}

/* 背景上传提示 */
.background-upload-hint {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  width: 100%;
  margin: 0;
  cursor: help;
}

/* 背景控制按钮 */
.background-control-buttons {
  flex-direction: row;
  gap: var(--spacing-sm);
  justify-content: center;
}

/* 适配方式按钮 */
.fit-mode-buttons {
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  justify-content: center;
}

/* 适配方式按钮 */
.fit-mode-button {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--surface);
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

/* 适配方式按钮悬停 */
.fit-mode-button:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
}

/* 适配方式按钮激活 */
.fit-mode-button.active {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* 视口适配按钮容器 */
.viewport-fit-buttons {
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  justify-content: center;
}

/* 视口适配按钮 */
.viewport-fit-button {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--surface);
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 16px;
}

/* 视口适配按钮悬停 */
.viewport-fit-button:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
}

/* 视口适配按钮激活 */
.viewport-fit-button.active {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* 视口提示 */
.viewport-hint {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  margin: 4px 0 0 0;
}

/* 画布尺寸容器 */
.canvas-size-container {
  display: flex;
  gap: var(--spacing-xs);
  width: 100%;
  margin: 0;
  padding: 0;
}

/* compact property-group style */
.property-group {
  margin: 0 0 4px 0;
  padding: 4px 6px;
  gap: 4px;
  display: flex;
  flex-direction: column;
}

/* 画布尺寸项 */
.canvas-size-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

/* 画布尺寸项标签 */
.canvas-size-item span {
  width: 40px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  flex-shrink: 0;
}

/* 渲染器选择框 */
.renderer-select {
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--surface);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.renderer-select:hover {
  border-color: var(--primary);
}

.renderer-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* 渲染器提示 */
.renderer-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0;
  padding: 0 var(--spacing-xs);
  line-height: 1.4;
  opacity: 0.8;
}

/* 选择模式下拉框 */
.selection-mode-select {
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--surface);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.selection-mode-select:hover {
  border-color: var(--primary);
}

.selection-mode-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
</style>