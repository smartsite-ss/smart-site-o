// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, readonly } from 'vue'

export type MessageType = 'save' | 'copy' | 'paste' | 'cut' | 'delete' | 'undo' | 'redo' | 'export' | 'info'

export type MessageLevel = 'success' | 'info' | 'warning' | 'error'

export interface EditorMessage {
  id: string
  type: MessageType
  level: MessageLevel
  text: string
  timestamp: number
  duration: number
}

export interface MessageOptions {
  text: string
  type?: MessageType
  level?: MessageLevel
  duration?: number
}

let messageIdCounter = 0
const MAX_MESSAGES = 5

const messages = ref<EditorMessage[]>([])

function generateId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`
}

function addMessage(options: MessageOptions): string {
  const id = generateId()
  const message: EditorMessage = {
    id,
    type: options.type || 'info',
    level: options.level || 'info',
    text: options.text,
    timestamp: Date.now(),
    duration: options.duration ?? 3000,
  }

  messages.value = [...messages.value, message]

  if (messages.value.length > MAX_MESSAGES) {
    messages.value = messages.value.slice(-MAX_MESSAGES)
  }

  if (message.duration > 0) {
    setTimeout(() => {
      removeMessage(id)
    }, message.duration)
  }

  return id
}

function removeMessage(id: string): void {
  messages.value = messages.value.filter(m => m.id !== id)
}

function clearAll(): void {
  messages.value = []
}

function showMessage(
  text: string,
  level: MessageLevel = 'info',
  duration?: number,
): string {
  return addMessage({ text, level, duration })
}

function showSuccess(text: string, duration?: number): string {
  return addMessage({ text, level: 'success', duration })
}

function showError(text: string, duration?: number): string {
  return addMessage({ text, level: 'error', duration })
}

function showWarning(text: string, duration?: number): string {
  return addMessage({ text, level: 'warning', duration })
}

function showSaveSuccess(text: string, duration?: number): string {
  return addMessage({ text, type: 'save', level: 'success', duration })
}

function showSaveError(text: string, duration?: number): string {
  return addMessage({ text, type: 'save', level: 'error', duration })
}

function showCopySuccess(text: string, duration?: number): string {
  return addMessage({ text, type: 'copy', level: 'success', duration })
}

function showPasteSuccess(text: string, duration?: number): string {
  return addMessage({ text, type: 'paste', level: 'success', duration })
}

function showCutSuccess(text: string, duration?: number): string {
  return addMessage({ text, type: 'cut', level: 'success', duration })
}

function showUndoSuccess(text: string, duration?: number): string {
  return addMessage({ text, type: 'undo', level: 'info', duration })
}

function showRedoSuccess(text: string, duration?: number): string {
  return addMessage({ text, type: 'redo', level: 'info', duration })
}

function showDeleteSuccess(text: string, duration?: number): string {
  return addMessage({ text, type: 'delete', level: 'info', duration })
}

function showExportSuccess(text: string, duration?: number): string {
  return addMessage({ text, type: 'export', level: 'success', duration })
}

export const MessageService = {
  messages: readonly(messages) as unknown as ReturnType<typeof ref<readonly EditorMessage[]>>,
  addMessage,
  removeMessage,
  clearAll,
  showMessage,
  showSuccess,
  showError,
  showWarning,
  showSaveSuccess,
  showSaveError,
  showCopySuccess,
  showPasteSuccess,
  showCutSuccess,
  showUndoSuccess,
  showRedoSuccess,
  showDeleteSuccess,
  showExportSuccess,
}

export type MessageServiceType = typeof MessageService