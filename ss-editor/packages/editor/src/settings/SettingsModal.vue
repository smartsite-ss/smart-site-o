<template>
  <div
    v-if="visible"
    class="settings-modal-overlay"
    @click="handleOverlayClick"
  >
    <div
      class="settings-modal"
      @click.stop
    >
      <!-- 头部 -->
      <div class="settings-modal-header">
        <div class="settings-title">
          <span class="title-icon">⚙️</span>
          <span class="title-text">{{ $t('settings.title') }}</span>
        </div>
        <button
          class="close-button"
          @click="handleClose"
        >
          <span>×</span>
        </button>
      </div>
      
      <!-- 标签页 -->
      <div class="settings-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-text">{{ $t(tab.labelKey) }}</span>
        </button>
      </div>
      
      <!-- 内容区域 -->
      <div class="settings-content">
        <InterfaceTab v-if="activeTab === 'interface'" />
        <CanvasTab v-if="activeTab === 'canvas'" />
        <ToolsTab v-if="activeTab === 'tools'" />
        <ShortcutsTab v-if="activeTab === 'shortcuts'" />
        <LayoutTab v-if="activeTab === 'layout'" />
        <ConfigTab v-if="activeTab === 'config'" />
      </div>
      
      <!-- 底部按钮 -->
      <div class="settings-footer">
        <button
          class="footer-button secondary"
          @click="handleReset"
        >
          <span>{{ $t('settings.reset') }}</span>
        </button>
        <div class="footer-buttons-right">
          <button
            class="footer-button secondary"
            @click="handleCancel"
          >
            <span>{{ $t('settings.cancel') }}</span>
          </button>
          <button
            class="footer-button primary"
            @click="handleConfirm"
          >
            <span>{{ $t('settings.confirm') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useConfigStore, eventBus, i18n } from '@scada-editor/core';

const { t } = i18n.global;
import InterfaceTab from './InterfaceTab.vue';
import CanvasTab from './CanvasTab.vue';
import ToolsTab from './ToolsTab.vue';
import ShortcutsTab from './ShortcutsTab.vue';
import LayoutTab from './LayoutTab.vue';
import ConfigTab from './ConfigTab.vue';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const configStore = useConfigStore();

const tabs = [
  { id: 'interface', icon: '🎨', labelKey: 'settings.interface' },
  { id: 'canvas', icon: '📐', labelKey: 'settings.canvas' },
  { id: 'tools', icon: '🔧', labelKey: 'settings.tools' },
  { id: 'shortcuts', icon: '⌨️', labelKey: 'settings.shortcutsTab' },
  { id: 'layout', icon: '📐', labelKey: 'settings.layout' },
  { id: 'config', icon: '⚙️', labelKey: 'settings.config' },
];

const activeTab = ref('interface');

// 点击遮罩关闭
const handleOverlayClick = (event: MouseEvent) => {
  if ((event.target as HTMLElement).classList.contains('settings-modal-overlay')) {
    handleClose();
  }
};

// 关闭
const handleClose = () => {
  emit('close');
};

// 取消
const handleCancel = () => {
  handleClose();
};

// 确定
const handleConfirm = () => {
  eventBus.emit('settings-confirm', null);
  handleClose();
};

// 重置为默认
const handleReset = () => {
  if (window.confirm(t('settings.confirmResetSettings'))) {
    configStore.resetConfig();
  }
};

// 监听ESC键关闭
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.visible) {
    handleClose();
  }
};

// 事件监听
watch(() => props.visible, (newVal) => {
  if (newVal) {
    document.addEventListener('keydown', handleKeydown);
    activeTab.value = 'interface'; // 重置到第一个标签
  } else {
    document.removeEventListener('keydown', handleKeydown);
  }
});
</script>

<style scoped>
.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.settings-modal {
  background-color: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-large);
  width: 800px;
  max-width: 90vw;
  height: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.settings-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  background-color: var(--surface);
}

.settings-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 20px;
}

.title-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.close-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 24px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.settings-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 24px;
  border-bottom: 1px solid var(--border);
  background-color: var(--surface);
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.tab-button.active {
  background-color: var(--primary);
  color: white;
  font-weight: 600;
}

.tab-icon {
  font-size: 16px;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.settings-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background-color: var(--surface);
}

.footer-buttons-right {
  display: flex;
  gap: 12px;
}

.footer-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--control-button-background);
  color: var(--text);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.footer-button:hover {
  background-color: var(--control-button-hover);
}

.footer-button.primary {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.footer-button.primary:hover {
  filter: brightness(1.1);
}

.footer-button.secondary {
  background-color: var(--surface);
}

/* 滚动条样式 */
.settings-content::-webkit-scrollbar {
  width: 6px;
}

.settings-content::-webkit-scrollbar-track {
  background: var(--surface);
  border-radius: 3px;
}

.settings-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.settings-content::-webkit-scrollbar-thumb:hover {
  background: var(--border-light);
}
</style>
