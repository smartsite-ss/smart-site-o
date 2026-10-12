<template>
  <div
    v-if="visible"
    class="message-box-overlay"
    :style="themeStyles"
    @click="handleOverlayClick"
  >
    <div
      class="message-box"
      @click.stop
    >
      <div class="message-box-header">
        <h3 class="message-box-title">
          {{ computedTitle }}
        </h3>
        <button
          class="message-box-close"
          @click="handleClose"
        >
          ×
        </button>
      </div>
      <div class="message-box-body">
        <div
          v-if="type === 'warning'"
          class="message-box-icon warning"
        >
          ⚠️
        </div>
        <div
          v-else-if="type === 'error'"
          class="message-box-icon error"
        >
          ❌
        </div>
        <div
          v-else-if="type === 'success'"
          class="message-box-icon success"
        >
          ✅
        </div>
        <div
          v-else-if="type === 'info'"
          class="message-box-icon info"
        >
          ℹ️
        </div>
        <div class="message-box-content">
          {{ message }}
        </div>
      </div>
      <div class="message-box-footer">
        <button 
          v-if="showCancelButton" 
          class="message-box-button cancel"
          @click="handleCancel"
        >
          {{ computedCancelText }}
        </button>
        <button
          class="message-box-button confirm"
          @click="handleConfirm"
        >
          {{ computedConfirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTheme, i18n } from '@scada-editor/core';

const { themeStyles } = useTheme();
const { t } = i18n.global;

interface Props {
  visible: boolean;
  title?: string;
  message: string;
  type?: 'warning' | 'error' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',  // will be computed via t()
  type: 'warning',
  confirmText: '',
  cancelText: '',
  showCancelButton: true
});

const emit = defineEmits(['confirm', 'cancel', 'close']);

// 使用国际化计算默认文本
const computedTitle = computed(() => props.title || t('messageBox.title'));
const computedConfirmText = computed(() => props.confirmText || t('messageBox.confirm'));
const computedCancelText = computed(() => props.cancelText || t('messageBox.cancel'));

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
};

const handleClose = () => {
  emit('close');
};

const handleOverlayClick = () => {
  emit('close');
};
</script>

<style scoped>
.message-box-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.message-box {
  background-color: var(--surface);
  border-radius: 4px;
  box-shadow: var(--shadow-large);
  width: 360px;
  max-width: 90%;
  overflow: hidden;
  border: 1px solid var(--border);
}

.message-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.message-box-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.message-box-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  transition: all 0.2s ease;
}

.message-box-close:hover {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.message-box-body {
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.message-box-icon {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.message-box-icon.warning {
  color: #f59e0b;
}

.message-box-icon.error {
  color: #ef4444;
}

.message-box-icon.success {
  color: #22c55e;
}

.message-box-icon.info {
  color: #3b82f6;
}

.message-box-content {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text);
}

.message-box-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  background-color: var(--background);
}

.message-box-button {
  padding: 6px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
  text-align: center;
}

.message-box-button.cancel {
  background-color: var(--surface);
  color: var(--text);
}

.message-box-button.cancel:hover {
  background-color: var(--control-button-hover);
}

.message-box-button.confirm {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.message-box-button.confirm:hover {
  background-color: var(--button-hover);
  border-color: var(--button-hover);
}
</style>