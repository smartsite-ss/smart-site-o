<template>
  <div class="history-panel-wrapper">
    <button
      class="footer-button"
      :title="t('canvasFooter.historyPanel')"
      @click="togglePanel"
    >
      ⏱
    </button>
    <div
      v-if="visible"
      class="history-panel"
    >
      <div class="history-header">
        <div class="history-header-actions">
          <button
            class="history-action-btn"
            :title="t('canvasFooter.historyUndoOne')"
            :disabled="!canUndo"
            @click="undoOne"
          >
            ↩
          </button>
          <button
            class="history-action-btn"
            :title="t('canvasFooter.historyUndoAll')"
            :disabled="!canUndo"
            @click="undoAll"
          >
            ↩↩
          </button>
          <button
            class="history-action-btn history-action-btn-danger"
            :title="t('canvasFooter.historyClear')"
            :disabled="entries.length === 0"
            @click="clearAll"
          >
            ✕
          </button>
        </div>
        <span>{{ t('canvasFooter.historyPanel') }}</span>
        <button
          class="history-close"
          @click="visible = false"
        >
          ✕
        </button>
      </div>
      <div class="history-body">
        <template v-if="entries.length > 0">
          <div class="history-timeline">
            <!-- 初始状态 -->
            <div
              class="history-entry"
              :class="{ 'history-entry-current': currentIndex === -1 }"
              @click="jumpTo(-1)"
            >
              <div
                class="history-dot"
                :class="{ 'history-dot-current': currentIndex === -1 }"
              />
              <span class="history-label">{{ t('canvasFooter.historyCurrentState') }}</span>
            </div>
            <!-- 历史记录列表 -->
            <div
              v-for="(entry, idx) in entries"
              :key="idx"
              class="history-entry"
              :class="{
                'history-entry-active': idx <= currentIndex,
                'history-entry-current': idx === currentIndex,
              }"
              @click="jumpTo(idx)"
            >
              <div
                class="history-dot"
                :class="{
                  'history-dot-active': idx <= currentIndex,
                  'history-dot-current': idx === currentIndex,
                }"
              />
              <span class="history-label">{{ entry.description }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="history-empty">
            {{ t('canvasFooter.historyNoRecords') }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePageStore, i18n } from '@scada-editor/core';

const { t } = i18n.global;
const pageStore = usePageStore();

const visible = ref(false);

const historyManager = computed(() => {
  const page = pageStore.currentPage as any;
  return page?.getHistoryManager?.() ?? null;
});

const entries = computed(() => {
  const hm = historyManager.value;
  if (!hm) return [];
  const changes = hm.getHistoryChanges();
  return changes.map((c: any, idx: number) => ({
    index: idx,
    description: c.getDescription?.() ?? `#${idx + 1}`,
  }));
});

const currentIndex = computed(() => {
  return historyManager.value?.getCurrentIndex?.() ?? -1;
});

const canUndo = computed(() => {
  return historyManager.value?.canUndo?.() ?? false;
});

const undoOne = () => {
  const page = pageStore.currentPage as any;
  page?.undo?.();
};

const undoAll = () => {
  const page = pageStore.currentPage as any;
  page?.jumpToHistory?.(-1);
};

const clearAll = () => {
  const hm = historyManager.value;
  if (hm) {
    hm.clearHistory();
  }
};

const togglePanel = () => {
  visible.value = !visible.value;
};

const jumpTo = (index: number) => {
  const page = pageStore.currentPage as any;
  page?.jumpToHistory?.(index);
};
</script>

<style scoped>
.history-panel-wrapper {
  position: relative;
}

.footer-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 3px;
  transition: var(--transition-fast);
  font-size: 14px;
}

.footer-button:hover {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.history-panel {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-dropdown);
  width: 200px;
  max-height: 320px;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  flex-shrink: 0;
}

.history-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
}

.history-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
  transition: var(--transition-fast);
}

.history-action-btn:hover:not(:disabled) {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.history-action-btn:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
  opacity: 0.4;
}

.history-action-btn-danger:hover:not(:disabled) {
  background-color: var(--danger);
  color: #fff;
}

.history-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-tertiary);
  padding: 2px 4px;
}

.history-close:hover {
  color: var(--text);
}

.history-body {
  overflow-y: auto;
  flex: 1;
  padding: 8px 0;
}

.history-empty {
  padding: 20px 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
}

.history-timeline {
  padding: 0 12px;
}

.history-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 4px;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background-color 0.15s ease;
  position: relative;
}

.history-entry:hover {
  background-color: var(--control-button-hover);
}

.history-entry-current {
  background-color: var(--control-button-hover);
}

.history-entry-current:hover {
  background-color: var(--control-button-hover);
}

.history-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background-color: transparent;
  flex-shrink: 0;
  transition: var(--transition-fast);
}

.history-dot-active {
  border-color: var(--primary);
  background-color: var(--primary);
}

.history-dot-current {
  border-color: var(--primary);
  background-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
}

.history-label {
  font-size: 12px;
  color: var(--text);
  line-height: 1.4;
  word-break: break-all;
}

.history-entry-current .history-label {
  font-weight: 600;
}
</style>