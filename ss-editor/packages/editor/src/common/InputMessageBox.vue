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
          v-if="type"
          class="message-box-icon"
          :class="type"
        >
          <span v-if="type === 'warning'">⚠️</span>
          <span v-else-if="type === 'error'">❌</span>
          <span v-else-if="type === 'success'">✅</span>
          <span v-else-if="type === 'info'">ℹ️</span>
        </div>
        <div class="message-box-content">
          <div class="message-box-text">
            {{ message }}
          </div>
          <input
            v-if="showInput"
            ref="inputRef"
            v-model="inputValue"
            class="message-box-input"
            :placeholder="computedPlaceholder"
            @keyup.enter="handleConfirm"
          >
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
import { ref, onMounted, computed } from 'vue';
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
  showInput?: boolean;
  defaultValue?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  type: 'info',
  confirmText: '',
  cancelText: '',
  showCancelButton: true,
  showInput: false,
  defaultValue: '',
  placeholder: ''
});

// 使用国际化计算默认文本
const computedTitle = computed(() => props.title || t('messageBox.title'));
const computedConfirmText = computed(() => props.confirmText || t('messageBox.confirm'));
const computedCancelText = computed(() => props.cancelText || t('messageBox.cancel'));
const computedPlaceholder = computed(() => props.placeholder || t('messageBox.inputPlaceholder'));

const emit = defineEmits<{
  confirm: [value: string];
  cancel: [];
  close: [];
}>();

const inputValue = ref(props.defaultValue);
const inputRef = ref<HTMLInputElement>();

onMounted(() => {
  if (inputRef.value && props.showInput) {
    setTimeout(() => {
      inputRef.value?.focus();
      inputRef.value?.select();
    }, 100);
  }
});

const handleConfirm = () => {
  emit('confirm', inputValue.value);
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
  width: 400px;
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
}

.message-box-text {
  font-size: 14px;
  line-height: 1.4;
  color: var(--text);
  margin-bottom: 16px;
}

.message-box-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--background);
  color: var(--text);
  transition: all 0.2s ease;
}

.message-box-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
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
