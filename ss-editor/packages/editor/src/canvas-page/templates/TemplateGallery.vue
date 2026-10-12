<template>
  <Teleport to="body">
    <div v-if="visible" class="gallery-overlay" @click.self="$emit('close')">
      <div class="gallery-panel">
        <!-- 标题栏 -->
        <div class="gallery-header">
          <span class="gallery-title">{{ t('template.gallery.title') }}</span>
          <div class="gallery-header-right">
            <button class="header-action-btn" :title="t('template.import')" @click="handleImportClick">
              {{ t('template.import') }}
            </button>
            <button class="gallery-close" @click="$emit('close')">✕</button>
          </div>
          <!-- 隐藏的文件输入 -->
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            style="display:none"
            @change="handleFileSelected"
          />
        </div>

        <!-- 分类 Tab -->
        <div class="gallery-tabs">
          <button
            v-for="cat in tabCategories"
            :key="cat.key"
            class="gallery-tab"
            :class="{ active: templateStore.selectedCategory === cat.key }"
            @click="templateStore.setCategory(cat.key)"
          >
            {{ cat.icon }} {{ t(cat.labelKey) }}
          </button>
          <button
            class="gallery-tab gallery-tab-refresh"
            :title="t('editor.refresh')"
            :disabled="templateStore.isLoading"
            @click="handleRefresh"
          >
            ↻
          </button>
        </div>

        <!-- 搜索 -->
        <div class="gallery-search">
          <input
            v-model="searchText"
            class="search-input"
            :placeholder="t('template.gallery.searchPlaceholder')"
            @input="templateStore.setSearchKeyword(searchText)"
          />
        </div>

        <!-- 模板列表 -->
        <div v-if="templateStore.isLoading" class="gallery-loading">
          {{ t('template.gallery.loading') }}
        </div>
        <div v-else-if="filteredTemplates.length === 0" class="gallery-empty">
          <div class="empty-icon">📭</div>
          <div class="empty-text">{{ t('template.gallery.noTemplates') }}</div>
          <div class="empty-hint">{{ t('template.gallery.noTemplatesHint') }}</div>
        </div>
        <div v-else class="gallery-grid">
          <TemplateCard
            v-for="template in filteredTemplates"
            :key="template.id"
            :template="template"
            :selected="selectedTemplateId === template.id"
            :show-actions="template.source === 'user'"
            @select="handleSelect"
            @edit="handleEditTemplate"
            @delete="handleDelete"
            @duplicate="handleDuplicate"
            @export="handleExport"
          />
        </div>

        <!-- 底部 -->
        <div class="gallery-footer">
          <div class="footer-info">
            {{ t('template.gallery.count', { count: filteredTemplates.length }) }}
            <span v-if="selectedTemplate">
              — {{ selectedTemplate.pageConfig.width }} × {{ selectedTemplate.pageConfig.height }}
            </span>
          </div>
          <div class="footer-actions">
            <button class="btn btn-secondary" @click="$emit('close')">
              {{ t('template.gallery.cancel') }}
            </button>
            <button
              class="btn btn-primary"
              :disabled="!selectedTemplateId"
              @click="handleCreate"
            >
              {{ t('template.gallery.create') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { i18n, useTemplateStore, type PageTemplate, type TemplateCategory } from '@scada-editor/core';
import TemplateCard from './TemplateCard.vue';

const { t } = i18n.global;
const templateStore = useTemplateStore();
const router = useRouter();

const props = defineProps({
  visible: { type: Boolean, default: false },
  projectId: { type: String, default: '' },
});

const emit = defineEmits<{
  close: [];
  create: [template: PageTemplate];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedTemplateId = ref<string | null>(null);
const searchText = ref('');

const filteredTemplates = computed(() => templateStore.filteredTemplates);
const selectedTemplate = computed(() =>
  selectedTemplateId.value
    ? templateStore.findTemplate(selectedTemplateId.value)
    : null
);

const tabCategories = computed(() => [
  { key: 'all' as const, labelKey: 'template.category.all', icon: '📂' },
  ...templateStore.categories,
]);

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    templateStore.loadTemplates(props.projectId || undefined);
    selectedTemplateId.value = null;
    searchText.value = '';
    templateStore.setSearchKeyword('');
  }
});

function handleSelect(templateId: string) {
  selectedTemplateId.value = templateId;
}

function handleCreate() {
  if (!selectedTemplate.value) return;
  emit('create', selectedTemplate.value);
}

async function handleRefresh() {
  await templateStore.refresh();
  selectedTemplateId.value = null;
}

async function handleDelete(templateId: string) {
  if (confirm(t('template.gallery.confirmDelete'))) {
    await templateStore.deleteTemplate(templateId);
    if (selectedTemplateId.value === templateId) {
      selectedTemplateId.value = null;
    }
  }
}

async function handleDuplicate(templateId: string) {
  const dup = await templateStore.duplicateTemplate(templateId);
  if (dup) {
    selectedTemplateId.value = dup.id;
  }
}

async function handleExport(templateId: string) {
  const json = await templateStore.exportTemplate(templateId);
  if (!json) return;

  const template = templateStore.findTemplate(templateId);
  const filename = `${template?.name || 'template'}.json`;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function handleEditTemplate(templateId: string) {
  router.push(`/editor/template/${templateId}`);
}

function handleImportClick() {
  fileInputRef.value?.click();
}

async function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const content = e.target?.result;
    if (typeof content === 'string') {
      const imported = await templateStore.importTemplate(content);
      if (imported) {
        selectedTemplateId.value = imported.id;
      } else {
        alert(t('template.gallery.importFailed'));
      }
    }
  };
  reader.readAsText(file);

  // 重置 input 以允许重复导入同一文件
  target.value = '';
}
</script>

<style scoped>
.gallery-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-panel {
  width: 820px;
  max-height: 85vh;
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  box-shadow: var(--shadow-modal, 0 4px 24px rgba(0, 0, 0, 0.15));
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border, #e0e0e0);
}

.gallery-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #333);
}

.gallery-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-action-btn {
  padding: 5px 12px;
  font-size: 12px;
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 4px;
  background: transparent;
  color: var(--text, #333);
  cursor: pointer;
  transition: all 0.15s;
}
.header-action-btn:hover {
  background: var(--elevated, #f0f0f0);
  border-color: var(--primary, #409EFF);
  color: var(--primary, #409EFF);
}

.gallery-close {
  width: 28px; height: 28px;
  border: none; border-radius: 4px;
  background: transparent;
  color: var(--text-secondary, #999);
  font-size: 14px;
  cursor: pointer;
}
.gallery-close:hover {
  background: var(--elevated, #f0f0f0);
  color: var(--text, #333);
}

.gallery-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border, #e0e0e0);
  overflow-x: auto;
}

.gallery-tab {
  padding: 5px 12px;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary, #666);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.gallery-tab:hover {
  background: var(--elevated, #f0f0f0);
  color: var(--text, #333);
}
.gallery-tab.active {
  background: var(--primary, #409EFF);
  color: #fff;
}

.gallery-search {
  padding: 10px 16px;
}

.search-input {
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--text, #333);
  background: var(--elevated, #fafafa);
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 4px;
  outline: none;
  box-sizing: border-box;
}
.search-input:focus {
  border-color: var(--primary, #409EFF);
}

.gallery-loading,
.gallery-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary, #999);
}

.empty-icon { font-size: 40px; margin-bottom: 8px; }
.empty-text { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.empty-hint { font-size: 12px; }

.gallery-grid {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-content: flex-start;
}

.gallery-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--border, #e0e0e0);
}

.footer-info {
  font-size: 12px;
  color: var(--text-secondary, #999);
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 7px 20px;
  font-size: 13px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background: var(--primary, #409EFF);
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.85;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: var(--text, #333);
  border-color: var(--border, #d0d0d0);
}
.btn-secondary:hover {
  background: var(--elevated, #f0f0f0);
}
</style>
