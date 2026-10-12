<template>
  <div
    v-if="visible"
    class="confirm-save-box-overlay"
    :style="themeStyles"
    @click="handleOverlayClick"
  >
    <div
      class="confirm-save-box"
      @click.stop
    >
      <div class="confirm-save-box-header">
        <h3 class="confirm-save-box-title">
          {{ computedTitle }}
        </h3>
        <button
          class="confirm-save-box-close"
          @click="handleCancel"
        >
          ×
        </button>
      </div>
      <div class="confirm-save-box-body">
        <div class="confirm-save-box-icon warning">
          ⚠️
        </div>
        <div class="confirm-save-box-content">
          {{ message }}
        </div>
      </div>
      <div class="confirm-save-box-footer">
        <button
          class="confirm-save-box-button discard"
          @click="handleDiscard"
        >
          {{ computedDiscardText }}
        </button>
        <button
          class="confirm-save-box-button cancel"
          @click="handleCancel"
        >
          {{ computedCancelText }}
        </button>
        <button
          class="confirm-save-box-button save"
          @click="handleSave"
        >
          {{ computedSaveText }}
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
  saveText?: string;
  discardText?: string;
  cancelText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  saveText: '',
  discardText: '',
  cancelText: '',
});

const emit = defineEmits(['save', 'discard', 'cancel']);

const computedTitle = computed(() => props.title || t('messageBox.title'));
const computedSaveText = computed(() => props.saveText || t('messageBox.save'));
const computedDiscardText = computed(() => props.discardText || t('messageBox.dontSave'));
const computedCancelText = computed(() => props.cancelText || t('messageBox.cancel'));

const handleSave = () => emit('save');
const handleDiscard = () => emit('discard');
const handleCancel = () => emit('cancel');
const handleOverlayClick = () => emit('cancel');
</script>

<style scoped>
.confirm-save-box-overlay {
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

.confirm-save-box {
  background-color: var(--surface);
  border-radius: 4px;
  box-shadow: var(--shadow-large);
  width: 400px;
  max-width: 90%;
  overflow: hidden;
  border: 1px solid var(--border);
}

.confirm-save-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.confirm-save-box-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.confirm-save-box-close {
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

.confirm-save-box-close:hover {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.confirm-save-box-body {
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.confirm-save-box-icon {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.confirm-save-box-icon.warning {
  color: #f59e0b;
}

.confirm-save-box-content {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text);
}

.confirm-save-box-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  background-color: var(--background);
}

.confirm-save-box-button {
  padding: 6px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
  text-align: center;
}

.confirm-save-box-button.discard {
  background-color: var(--surface);
  color: var(--text);
}

.confirm-save-box-button.discard:hover {
  background-color: var(--control-button-hover);
}

.confirm-save-box-button.cancel {
  background-color: var(--surface);
  color: var(--text);
}

.confirm-save-box-button.cancel:hover {
  background-color: var(--control-button-hover);
}

.confirm-save-box-button.save {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.confirm-save-box-button.save:hover {
  background-color: var(--button-hover);
  border-color: var(--button-hover);
}
</style>