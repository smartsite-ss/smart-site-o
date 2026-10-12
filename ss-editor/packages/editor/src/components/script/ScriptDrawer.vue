<template>
  <div
    v-if="drawerState.visible"
    class="script-drawer"
    :style="{ height: drawerState.height + 'px' }"
  >
    <!-- 拖拽手柄 -->
    <div
      class="drawer-resize-handle"
      @mousedown="startResize"
    >
      <div class="resize-bar" />
    </div>

    <!-- 标签栏 -->
    <div class="drawer-tabs">
      <div class="tabs-list">
        <div
          v-for="tab in drawerState.tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: drawerState.activeTabId === tab.id }"
          @click="drawerState.activeTabId = tab.id"
        >
          <span class="tab-icon">{{ getTabIcon(tab.mode) }}</span>
          <span class="tab-title">{{ tab.title }}</span>
          <span
            v-if="tab.dirty"
            class="tab-dirty"
          >•</span>
          <button
            class="tab-close"
            @click.stop="closeTab(tab.id)"
          >
            ×
          </button>
        </div>
      </div>
      <div class="tabs-actions">
        <button
          class="drawer-btn"
          :title="$t('system.scriptEditor.drawer.collapse')"
          @click="drawerState.visible = false"
        >
          ▼
        </button>
      </div>
    </div>

    <!-- 编辑器内容 -->
    <div class="drawer-editor">
      <template
        v-for="tab in drawerState.tabs"
        :key="tab.id"
      >
        <div
          v-if="drawerState.activeTabId === tab.id"
          class="editor-pane"
        >
          <ScriptEditor
            :ref="(el: any) => setEditorRef(tab.id, el)"
            :mode="getEditorMode(tab.mode)"
            :model-value="tab.script"
            :height="editorHeight"
            :show-toolbar="true"
            :show-debug-panel="true"
            :show-api-panel="false"
            :placeholder="$t('system.scriptEditor.drawer.scriptPlaceholder', { title: tab.title })"
            @update:model-value="(val: string) => updateScript(tab.id, val)"
            @save="(val: string) => saveScript(tab.id, val)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ScriptEditor from './ScriptEditor.vue';
import { useScriptDrawer } from './useScriptDrawer';
import type { ScriptEditorMode } from '@scada-editor/core';

const { drawerState, closeTab, updateScript, saveScript, setHeight } = useScriptDrawer();

const editorRefs = new Map<string, any>();
function setEditorRef(tabId: string, el: any) {
  if (el) editorRefs.set(tabId, el);
}

const editorHeight = computed(() => `${drawerState.height - 48}px`);

function getTabIcon(mode: string): string {
  const icons: Record<string, string> = {
    timer: '⏱',
    driver: '📡',
    filter: '🔍',
    interaction: '🖱',
    expression: '📐',
  };
  return icons[mode] || '📄';
}

function getEditorMode(mode: string): ScriptEditorMode {
  const validModes: ScriptEditorMode[] = ['timer', 'driver', 'filter', 'interaction', 'expression'];
  return validModes.includes(mode as ScriptEditorMode) ? (mode as ScriptEditorMode) : 'timer';
}

// 拖拽调整高度
const isResizing = ref(false);
const resizeStartY = ref(0);
const resizeStartHeight = ref(0);

function startResize(e: MouseEvent) {
  isResizing.value = true;
  resizeStartY.value = e.clientY;
  resizeStartHeight.value = drawerState.height;
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
}

function onResize(e: MouseEvent) {
  if (!isResizing.value) return;
  const delta = resizeStartY.value - e.clientY;
  setHeight(resizeStartHeight.value + delta);
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}
</script>

<style scoped>
.script-drawer {
  display: flex;
  flex-direction: column;
  background-color: var(--surface);
  border-top: 1px solid var(--border);
  min-height: 100px;
  overflow: hidden;
}

.drawer-resize-handle {
  height: 4px;
  cursor: row-resize;
  background-color: var(--border);
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.drawer-resize-handle:hover {
  background-color: var(--accent);
}

.resize-bar {
  height: 1px;
  margin: 0 40%;
  background-color: var(--text-tertiary);
}

.drawer-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--background);
  border-bottom: 1px solid var(--border);
  height: 32px;
  flex-shrink: 0;
}

.tabs-list {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
}

.tabs-list::-webkit-scrollbar {
  height: 2px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  border-right: 1px solid var(--border);
  white-space: nowrap;
  user-select: none;
  transition: all 0.15s;
  position: relative;
  min-width: 0;
}

.tab-item:hover {
  color: var(--text);
  background-color: var(--elevated);
}

.tab-item.active {
  color: var(--text);
  background-color: var(--surface);
  border-bottom: 2px solid var(--accent);
}

.tab-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.tab-title {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.tab-dirty {
  color: var(--status-warning);
  font-weight: bold;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-tertiary);
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: 2px;
}

.tab-close:hover {
  background-color: var(--elevated);
  color: var(--text);
}

.tabs-actions {
  display: flex;
  align-items: center;
  padding: 0 4px;
  flex-shrink: 0;
}

.drawer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-tertiary);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.drawer-btn:hover {
  background-color: var(--elevated);
  color: var(--text);
}

.drawer-editor {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.editor-pane {
  height: 100%;
}
</style>