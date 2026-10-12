<template>
  <Teleport to="body">
    <div v-if="visible" class="sync-dialog-overlay" @click.self="handleCancel">
      <div class="sync-dialog" :style="themeStyles">
        <div class="sync-dialog-header">
          <span class="sync-dialog-title">{{ t('templateSync.title', { name: templateName }) }}</span>
          <button class="sync-dialog-close" @click="handleCancel">×</button>
        </div>

        <div class="sync-dialog-body">
          <p class="sync-dialog-desc">{{ t('templateSync.description', { count: linkedPages.length }) }}</p>

          <div class="sync-dialog-pages">
            <label
              v-for="page in linkedPages"
              :key="page.id"
              class="sync-dialog-page"
            >
              <input
                v-model="selectedIds"
                type="checkbox"
                :value="page.id"
              />
              <span class="sync-dialog-page-name">{{ page.name }}</span>
            </label>
          </div>

          <div class="sync-dialog-warning">
            <p>{{ t('templateSync.syncContent') }}</p>
            <p class="sync-dialog-warning-text">⚠ {{ t('templateSync.overrideWarning') }}</p>
          </div>
        </div>

        <div class="sync-dialog-footer">
          <button class="sync-dialog-btn sync-dialog-btn-cancel" @click="handleCancel">
            {{ t('templateSync.skip') }}
          </button>
          <button
            class="sync-dialog-btn sync-dialog-btn-confirm"
            :disabled="selectedIds.length === 0"
            @click="handleSync"
          >
            {{ t('templateSync.syncSelected', { count: selectedIds.length }) }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useTheme, i18n } from '@scada-editor/core';

const { t } = i18n.global;
const { themeStyles } = useTheme();

interface LinkedPageInfo {
  id: string;
  name: string;
}

const props = defineProps({
  visible: { type: Boolean, default: false },
  templateName: { type: String, default: '' },
  linkedPages: { type: Array as () => LinkedPageInfo[], default: () => [] },
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'sync', pageIds: string[]): void;
}>();

const selectedIds = ref<string[]>([]);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      // 默认全选
      selectedIds.value = props.linkedPages.map(p => p.id);
    }
  },
);

function handleCancel() {
  selectedIds.value = [];
  emit('close');
}

function handleSync() {
  emit('sync', [...selectedIds.value]);
  selectedIds.value = [];
}
</script>

<style scoped>
.sync-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.sync-dialog {
  width: 480px;
  max-height: 80vh;
  background: var(--color-bg-panel, #fff);
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}
.sync-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
}
.sync-dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary, #333);
}
.sync-dialog-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--color-text-secondary, #999);
  padding: 0;
  line-height: 1;
}
.sync-dialog-close:hover {
  color: var(--color-text-primary, #333);
}
.sync-dialog-body {
  padding: 16px 20px;
  flex: 1;
  overflow-y: auto;
}
.sync-dialog-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--color-text-secondary, #666);
}
.sync-dialog-pages {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  max-height: 200px;
  overflow-y: auto;
}
.sync-dialog-page {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}
.sync-dialog-page:hover {
  background: var(--color-bg-hover, #f5f5f5);
}
.sync-dialog-page input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.sync-dialog-page-name {
  font-size: 13px;
  color: var(--color-text-primary, #333);
}
.sync-dialog-warning {
  padding: 10px 12px;
  background: var(--color-bg-warning, #fffbe6);
  border: 1px solid var(--color-border-warning, #ffe58f);
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-text-secondary, #666);
}
.sync-dialog-warning p {
  margin: 0 0 4px;
}
.sync-dialog-warning-text {
  color: var(--color-text-warning, #d48806);
}
.sync-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border, #e0e0e0);
}
.sync-dialog-btn {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--color-border, #d9d9d9);
  transition: all 0.15s;
}
.sync-dialog-btn-cancel {
  background: var(--color-bg-panel, #fff);
  color: var(--color-text-primary, #333);
}
.sync-dialog-btn-cancel:hover {
  border-color: var(--color-primary, #1890ff);
  color: var(--color-primary, #1890ff);
}
.sync-dialog-btn-confirm {
  background: var(--color-primary, #1890ff);
  color: #fff;
  border-color: var(--color-primary, #1890ff);
}
.sync-dialog-btn-confirm:hover {
  opacity: 0.85;
}
.sync-dialog-btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
