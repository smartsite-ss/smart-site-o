<template>
  <div class="js-editor-wrapper">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-section">
        <button
          class="toolbar-btn"
          :disabled="!canUndo"
          :title="t('jsEditor.undo')"
          @click="undo"
        >
          <span class="btn-icon">↩️</span>
        </button>
        <button
          class="toolbar-btn"
          :disabled="!canRedo"
          :title="t('jsEditor.redo')"
          @click="redo"
        >
          <span class="btn-icon">↪️</span>
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-section">
        <button
          class="toolbar-btn"
          :title="t('jsEditor.toggleComment')"
          @click="toggleComment"
        >
          <span class="btn-icon">📌</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: showSearch }"
          :title="t('jsEditor.search')"
          @click="toggleSearch"
        >
          <span class="btn-icon">🔍</span>
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-section">
        <button
          class="toolbar-btn"
          :title="t('jsEditor.format')"
          @click="formatCode"
        >
          <span class="btn-icon">📝</span>
        </button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div
      v-if="showSearch"
      class="search-bar"
    >
      <div class="search-input-group">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('jsEditor.searchPlaceholder')"
          class="search-input"
          @input="performSearch"
          @keydown="handleSearchKeydown"
        >
        <input
          v-if="showReplace"
          v-model="replaceQuery"
          type="text"
          :placeholder="t('jsEditor.replacePlaceholder')"
          class="search-input replace-input"
        >
      </div>
      <div class="search-controls">
        <button
          class="search-btn"
          :title="t('jsEditor.toggleReplace')"
          @click="toggleReplace"
        >
          {{ showReplace ? t('jsEditor.hide') : t('jsEditor.replace') }}
        </button>
        <button
          class="search-btn"
          :title="t('jsEditor.findPrev')"
          @click="findPrevious"
        >
          ↑
        </button>
        <button
          class="search-btn"
          :title="t('jsEditor.findNext')"
          @click="findNext"
        >
          ↓
        </button>
        <button
          v-if="showReplace"
          class="search-btn"
          :title="t('jsEditor.replaceOne')"
          @click="replaceOne"
        >
          {{ t('jsEditor.replace') }}
        </button>
        <button
          v-if="showReplace"
          class="search-btn"
          :title="t('jsEditor.replaceAll')"
          @click="replaceAll"
        >
          {{ t('jsEditor.replaceAll') }}
        </button>
        <span
          v-if="searchQuery"
          class="search-count"
        >
          {{ matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : t('jsEditor.noMatch') }}
        </span>
        <button
          class="search-btn close-btn"
          @click="closeSearch"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div
      ref="editorBody"
      class="editor-body"
    >
      <!-- 行号 -->
      <div class="line-numbers">
        <div
          v-for="n in lineCount"
          :key="n"
          class="line-number"
        >
          {{ n }}
        </div>
      </div>

      <!-- 高亮层 -->
      <div
        ref="highlightLayer"
        class="highlight-layer"
        v-html="highlightedContent"
      />

      <!-- 编辑层 -->
      <textarea
        ref="editorTextarea"
        v-model="content"
        class="editor-textarea"
        spellcheck="false"
        autocomplete="off"
        @input="handleInput"
        @keydown="handleKeydown"
        @scroll="handleScroll"
      />
    </div>

    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <span
          v-if="!hasError"
          class="status-item valid"
        >
          ✅ {{ t('jsEditor.syntaxOk') }}
        </span>
        <span
          v-else
          class="status-item error"
        >
          ❌ {{ errorMessage }}
        </span>
      </div>
      <div class="status-right">
        <span class="status-item">{{ t('jsEditor.lines') }}: {{ lineCount }}</span>
        <span class="status-item">{{ t('jsEditor.chars') }}: {{ content.length }}</span>
        <span class="status-item">{{ t('jsEditor.line') }} {{ cursorPosition.line }}, {{ t('jsEditor.col') }} {{ cursorPosition.col }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from '@scada-editor/core'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'update:modelValue',
  'change',
])

// 核心状态
const content = ref('')
const highlightLayer = ref<HTMLElement | null>(null)
const editorTextarea = ref<HTMLTextAreaElement | null>(null)
const editorBody = ref<HTMLElement | null>(null)

// 搜索相关
const showSearch = ref(false)
const showReplace = ref(false)
const searchQuery = ref('')
const replaceQuery = ref('')
const matchCount = ref(0)
const currentMatchIndex = ref(-1)
const matches: Array<{ start: number; end: number }> = []

// 缩进
const indentSize = ref(2)

// 历史记录
const historyStack: string[] = []
const historyIndex = ref(-1)
const MAX_HISTORY = 50

// 错误处理
const hasError = ref(false)
const errorMessage = ref('')

// 计算属性
const lineCount = computed(() => content.value.split('\n').length)

const cursorPosition = computed(() => {
  if (!editorTextarea.value) return { line: 1, col: 1 }
  const textarea = editorTextarea.value
  const text = textarea.value.substring(0, textarea.selectionStart)
  const lines = text.split('\n')
  return {
    line: lines.length,
    col: lines[lines.length - 1].length + 1,
  }
})

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < historyStack.length - 1)

const highlightedContent = computed(() => {
  return syntaxHighlight(content.value)
})

// JavaScript 语法高亮函数
function syntaxHighlight(code: string): string {
  if (!code) return ''

  let result = escapeHtml(code)

  // 注释 (先处理注释，防止被其他规则匹配
  // 多行注释 /* ... */
  result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>')
  // 单行注释 // ...
  result = result.replace(/(\/\/.*$)/gm, '<span class="token comment">$1</span>')

  // 字符串
  // 双引号
  result = result.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
    if (match.includes('<span class="token comment">')) return match
    return `<span class="token string">${match}</span>`
  })
  // 单引号
  result = result.replace(/'(?:[^'\\]|\\.)*'/g, (match) => {
    if (match.includes('<span class="token comment">')) return match
    return `<span class="token string">${match}</span>`
  })
  // 模板字符串
  result = result.replace(/`(?:[^`\\]|\\.)*`/g, (match) => {
    if (match.includes('<span class="token comment">')) return match
    return `<span class="token template-string">${match}</span>`
  })

  // 数字
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="token number">$1</span>')

  // 关键字
  const keywords = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
    'continue', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'new', 'delete', 'in', 'of', 'typeof',
    'void', 'this', 'super', 'class', 'extends', 'import', 'export', 'default', 'async', 'await', 'yield', 'async',
    'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'static', 'get', 'set', 'constructor', 'prototype',
    '__proto__', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__', '__proto__',
  ]
  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  result = result.replace(keywordRegex, (match) => {
    if (match.includes('<span class="token')) return match
    return `<span class="token keyword">${match}</span>`
  })

  // 标点符号
  result = result.replace(/([{}[\]();,.<>+*/%^&|!=~?:])/g, (match) => {
    if (match.includes('<span class="token')) return match
    return `<span class="token punctuation">${match}</span>`
  })

  // 应用搜索高亮
  if (searchQuery.value && matchCount.value > 0) {
    const searchStr = escapeHtml(searchQuery.value)
    const regex = new RegExp(searchStr, 'gi')
    result = result.replace(regex, (match, offset) => {
      if (matches.some((m, idx) => idx === currentMatchIndex.value && offset >= m.start && offset < m.end)) {
        return `<span class="search-match current">${match}</span>`
      }
      return `<span class="search-match">${match}</span>`
    })
  }

  return result
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 处理输入
function handleInput() {
  saveToHistory()
  validateJs()
  updateHighlight()
  emit('update:modelValue', content.value)
  emit('change', content.value)
}

// 保存历史记录
function saveToHistory() {
  const currentContent = content.value
  if (historyStack[historyIndex.value] === currentContent) {
    return
  }

  if (historyIndex.value < historyStack.length - 1) {
    historyStack.splice(historyIndex.value + 1)
  }

  historyStack.push(currentContent)
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift()
  }
  historyIndex.value = historyStack.length - 1
}

// 撤销
function undo() {
  if (historyIndex.value > 0) {
    historyIndex.value--
    content.value = historyStack[historyIndex.value]
    validateJs()
    updateHighlight()
  }
}

// 重做
function redo() {
  if (historyIndex.value < historyStack.length - 1) {
    historyIndex.value++
    content.value = historyStack[historyIndex.value]
    validateJs()
    updateHighlight()
  }
}

// 验证 JavaScript 语法
function validateJs(): boolean {
  try {
    new Function(content.value)
    hasError.value = false
    errorMessage.value = ''
    return true
  } catch (e: any) {
    hasError.value = true
    errorMessage.value = e.message || '语法错误'
    return false
  }
}

// 快捷键处理
function handleKeydown(e: KeyboardEvent) {
  // Ctrl + Z 撤销
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
    return
  }

  // Ctrl + Shift + Z / Ctrl + Y 重做
  if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
    e.preventDefault()
    redo()
    return
  }

  // Ctrl + F 搜索
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault()
    toggleSearch()
    return
  }

  // Ctrl + / 注释
  if (e.ctrlKey && e.key === '/') {
    e.preventDefault()
    toggleComment()
    return
  }

  // Tab 键 - 缩进
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault()
    insertAtCursor(' '.repeat(indentSize.value))
    return
  }

  // Shift + Tab - 反缩进
  if (e.key === 'Tab' && e.shiftKey) {
    e.preventDefault()
    unindent()
    return
  }

  // Enter 键 - 自动缩进
  if (e.key === 'Enter') {
    e.preventDefault()
    handleEnter()
    return
  }

  // 搜索框内处理
  if (showSearch.value) {
    if (e.key === 'Escape') {
      closeSearch()
    }
  }
}

// 插入文本
function insertAtCursor(text: string) {
  if (!editorTextarea.value) return

  const textarea = editorTextarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  const before = content.value.substring(0, start)
  const after = content.value.substring(end)

  content.value = before + text + after
  textarea.focus()

  nextTick(() => {
    textarea.setSelectionRange(start + text.length, start + text.length)
  })
}

// 处理回车缩进
function handleEnter() {
  if (!editorTextarea.value) return

  const textarea = editorTextarea.value
  const before = content.value.substring(0, textarea.selectionStart)
  const after = content.value.substring(textarea.selectionEnd)

  // 获取当前行的缩进
  const currentLine = before.split('\n').pop() || ''
  let indent = currentLine.match(/^(\s*)/)?.[1] || ''

  // 如果最后一个字符是 { 或 [，则增加缩进
  const lastChar = before.trim().slice(-1)
  if (lastChar === '{' || lastChar === '[' || lastChar === '(') {
    indent += ' '.repeat(indentSize.value)
  }

  content.value = before + '\n' + indent + after

  nextTick(() => {
    const newPos = before.length + 1 + indent.length
    textarea.setSelectionRange(newPos, newPos)
  })
}

// 反缩进
function unindent() {
  if (!editorTextarea.value) return

  const textarea = editorTextarea.value
  const lines = content.value.split('\n')
  const startLine = content.value.substring(0, textarea.selectionStart).split('\n').length - 1
  const endLine = content.value.substring(0, textarea.selectionEnd).split('\n').length - 1

  for (let i = startLine; i <= endLine; i++) {
    if (lines[i].startsWith(' '.repeat(indentSize.value))) {
      lines[i] = lines[i].substring(indentSize.value)
    } else if (lines[i].startsWith(' ')) {
      lines[i] = lines[i].substring(1)
    }
  }

  content.value = lines.join('\n')
}

// 搜索功能
function toggleSearch() {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    nextTick(() => {
      const inputs = editorBody.value?.querySelectorAll('.search-input') as NodeListOf<HTMLInputElement>
      if (inputs[0]) inputs[0].focus()
    })
  } else {
    clearSearch()
  }
}

function toggleReplace() {
  showReplace.value = !showReplace.value
}

function closeSearch() {
  showSearch.value = false
  showReplace.value = false
  clearSearch()
}

function clearSearch() {
  searchQuery.value = ''
  replaceQuery.value = ''
  matchCount.value = 0
  currentMatchIndex.value = -1
  matches.length = 0
  updateHighlight()
}

function performSearch() {
  matches.length = 0

  if (!searchQuery.value) {
    matchCount.value = 0
    currentMatchIndex.value = -1
    return
  }

  const regex = new RegExp(escapeRegExp(searchQuery.value), 'gi')
  let match
  while ((match = regex.exec(content.value)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  matchCount.value = matches.length
  if (matchCount.value > 0 && currentMatchIndex.value < 0) {
    currentMatchIndex.value = 0
  }

  updateHighlight()
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findNext() {
  if (matchCount.value === 0) return
  currentMatchIndex.value = (currentMatchIndex.value + 1) % matchCount.value
  scrollToMatch()
}

function findPrevious() {
  if (matchCount.value === 0) return
  currentMatchIndex.value = (currentMatchIndex.value - 1 + matchCount.value) % matchCount.value
  scrollToMatch()
}

function scrollToMatch() {
  if (matches.length === 0) return
  const match = matches[currentMatchIndex.value]
  const textBefore = content.value.substring(0, match.start)
  const line = textBefore.split('\n').length

  const lineHeight = 19.2 // 根据字体大小计算
  if (editorBody.value) {
    editorBody.value.scrollTop = Math.max(0, (line - 5) * lineHeight)
  }

  updateHighlight()
}

function replaceOne() {
  if (!matches.length || currentMatchIndex.value < 0) return
  const match = matches[currentMatchIndex.value]
  content.value = content.value.substring(0, match.start) + replaceQuery.value + content.value.substring(match.end)
  saveToHistory()
  performSearch()
}

function replaceAll() {
  if (!searchQuery.value) return
  content.value = content.value.split(searchQuery.value).join(replaceQuery.value)
  saveToHistory()
  performSearch()
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    findNext()
  } else if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault()
    findPrevious()
  }
}

// 滚动同步
function handleScroll(e: Event) {
  if (!highlightLayer.value || !editorTextarea.value) return

  const target = e.target as HTMLElement
  highlightLayer.value.scrollTop = target.scrollTop
  highlightLayer.value.scrollLeft = target.scrollLeft

  // 同步行号
  const lineNumbers = editorBody.value?.querySelector('.line-numbers') as HTMLElement
  if (lineNumbers) {
    lineNumbers.scrollTop = target.scrollTop
  }
}

function updateHighlight() {
  nextTick(() => {
    // 触发重新计算高亮
  })
}

// 注释/取消注释
function toggleComment() {
  if (!editorTextarea.value) return

  const textarea = editorTextarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  const before = content.value.substring(0, start)
  const selected = content.value.substring(start, end)
  const after = content.value.substring(end)

  // 单行
  if (!selected) {
    const currentLine = before.split('\n').pop() || ''
    const lineStart = before.length - currentLine.length
    const isCommented = currentLine.trim().startsWith('//')

    if (isCommented) {
      const newLine = currentLine.replace(/^\s*\/\/\s?/, '')
      content.value = content.value.substring(0, lineStart) + newLine + content.value.substring(lineStart + currentLine.length)
    } else {
      const indent = currentLine.match(/^(\s*)/)?.[1] || ''
      const newLine = indent + '// ' + currentLine.substring(indent.length)
      content.value = content.value.substring(0, lineStart) + newLine + content.value.substring(lineStart + currentLine.length)
    }
  } else {
    // 多行选择
    const lines = selected.split('\n')
    const isAllCommented = lines.every(line => line.trim().startsWith('//'))

    const newLines = lines.map(line => {
      if (isAllCommented) {
        return line.replace(/^\s*\/\/\s?/, '')
      } else {
        const indent = line.match(/^(\s*)/)?.[1] || ''
        return indent + '// ' + line.substring(indent.length)
      }
    })

    content.value = before + newLines.join('\n') + after
  }

  saveToHistory()
}

// 格式化代码（简单格式化）
function formatCode() {
  // 这里是一个简单的格式化，实际项目可以集成 Prettier 等库
  try {
    // 简单的格式化：去掉行尾空格，统一缩进
    let formatted = content.value
      .replace(/\s+$/gm, '')
      .replace(/\t/g, ' '.repeat(indentSize.value))

    content.value = formatted
    saveToHistory()
  } catch (e) {
    // 忽略错误
  }
}

// 初始化
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== content.value) {
      content.value = newVal
      saveToHistory()
      validateJs()
      updateHighlight()
    }
  },
  { immediate: true }
)

onMounted(() => {
  content.value = props.modelValue || ''
  saveToHistory()
  validateJs()
})
</script>

<style scoped>
.js-editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  min-height: 0;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 2px 4px;
  border-bottom: 1px solid var(--border);
  background-color: var(--background);
  flex-wrap: wrap;
  min-height: 30px;
  row-gap: 2px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 1px;
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background-color: var(--border);
  margin: 0 4px;
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 2px 4px;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 3px;
  background-color: transparent;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 26px;
  min-height: 24px;
}

.toolbar-btn:hover:not(:disabled) {
  background-color: var(--control-button-hover);
  border-color: var(--border);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background-color: var(--primary);
  border-color: var(--primary);
  color: white;
}

.btn-icon {
  font-size: 14px;
  line-height: 1;
}

.search-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--border);
  background-color: var(--background);
}

.search-input-group {
  display: flex;
  flex: 1;
  gap: 8px;
}

.search-input {
  flex: 1;
  min-width: 150px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  background-color: var(--surface);
  color: var(--text);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.search-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-btn {
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-btn:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
}

.search-btn.close-btn {
  background-color: transparent;
  border: none;
  font-size: 16px;
}

.search-count {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 60px;
  text-align: center;
}

.editor-body {
  display: flex;
  flex: 1;
  overflow: auto;
  position: relative;
  min-height: 0;
}

.line-numbers {
  min-width: 50px;
  padding: 8px 0;
  text-align: right;
  background-color: var(--background);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  user-select: none;
  flex-shrink: 0;
}

.line-number {
  padding: 0 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  font-family: 'Consolas', 'Monaco', monospace;
}

.highlight-layer,
.editor-textarea {
  position: absolute;
  top: 0;
  left: 50px;
  right: 0;
  bottom: 0;
  padding: 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.highlight-layer {
  pointer-events: none;
  overflow: auto;
  color: transparent;
  background-color: transparent;
  z-index: 1;
}

.editor-textarea {
  z-index: 2;
  resize: none;
  border: none;
  outline: none;
  background-color: transparent;
  color: var(--text);
  caret-color: var(--text);
}

/* JavaScript 语法高亮样式 */
.token.comment {
  color: #6a9955;
}

.token.string {
  color: #ce9178;
}

.token.template-string {
  color: #dcdcaa;
}

.token.number {
  color: #b5cea8;
}

.token.keyword {
  color: #569cd6;
}

.token.punctuation {
  color: #d4d4d4;
}

.search-match {
  background-color: rgba(255, 235, 59, 0.4);
  border-radius: 2px;
}

.search-match.current {
  background-color: rgba(255, 193, 7, 0.7);
  border: 1px solid #ff9800;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-top: 1px solid var(--border);
  background-color: var(--background);
  font-size: 11px;
  flex-shrink: 0;
  min-height: 30px;
  box-sizing: border-box;
}

.status-left,
.status-right {
  display: flex;
  gap: 16px;
}

.status-item {
  color: var(--text-secondary);
}

.status-item.valid {
  color: #67c23a;
}

.status-item.error {
  color: #f56c6c;
}
</style>