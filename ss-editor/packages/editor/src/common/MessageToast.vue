<template>
  <Teleport to="body">
    <TransitionGroup
      name="msg-toast"
      tag="div"
      class="message-toast-container"
    >
      <div
        v-for="msg in visibleMessages"
        :key="msg.id"
        class="message-toast-item"
        :class="`message-toast-${msg.level}`"
        @click="dismissMessage(msg.id)"
      >
        <span class="message-toast-icon">{{ getIcon(msg) }}</span>
        <span class="message-toast-text">{{ msg.text }}</span>
        <button
          class="message-toast-close"
          @click.stop="dismissMessage(msg.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MessageService, type EditorMessage } from '@scada-editor/core'

const visibleMessages = computed(() => MessageService.messages.value as EditorMessage[])

function dismissMessage(id: string): void {
  MessageService.removeMessage(id)
}

function getIcon(msg: EditorMessage): string {
  if (msg.type === 'save' && msg.level === 'success') return '💾'
  if (msg.type === 'save' && msg.level === 'error') return '❌'
  if (msg.type === 'copy') return '📋'
  if (msg.type === 'paste') return '📄'
  if (msg.type === 'cut') return '✂️'
  if (msg.type === 'undo') return '↩️'
  if (msg.type === 'redo') return '↪️'
  if (msg.type === 'delete') return '🗑️'
  if (msg.type === 'export') return '📤'
  switch (msg.level) {
    case 'success': return '✅'
    case 'error': return '❌'
    case 'warning': return '⚠️'
    default: return 'ℹ️'
  }
}
</script>

<style scoped>
.message-toast-container {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.message-toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.4;
  min-width: 200px;
  max-width: 480px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  pointer-events: auto;
  transition: background-color 0.15s;
}

.message-toast-item:hover {
  filter: brightness(1.05);
}

.message-toast-success {
  background-color: var(--toast-success-bg, #1b5e20);
  color: var(--toast-success-text, #c8e6c9);
  border: 1px solid var(--toast-success-border, #2e7d32);
}

.message-toast-error {
  background-color: var(--toast-error-bg, #b71c1c);
  color: var(--toast-error-text, #ffcdd2);
  border: 1px solid var(--toast-error-border, #c62828);
}

.message-toast-warning {
  background-color: var(--toast-warning-bg, #e65100);
  color: var(--toast-warning-text, #ffe0b2);
  border: 1px solid var(--toast-warning-border, #ef6c00);
}

.message-toast-info {
  background-color: var(--toast-info-bg, #0d47a1);
  color: var(--toast-info-text, #bbdefb);
  border: 1px solid var(--toast-info-border, #1565c0);
}

.message-toast-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.message-toast-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-toast-close {
  background: none;
  border: none;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
  flex-shrink: 0;
}

.message-toast-close:hover {
  opacity: 1;
}

.msg-toast-enter-active {
  transition: all 0.3s ease-out;
}

.msg-toast-leave-active {
  transition: all 0.25s ease-in;
}

.msg-toast-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.msg-toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>