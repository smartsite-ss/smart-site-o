<template>
  <div class="canvas-template-admin">
    <!-- 标题栏 -->
    <div class="admin-header">
      <h2 class="admin-title">{{ t('system.canvasTemplate.title') }}</h2>
      <div class="admin-actions">
        <span class="template-count">{{ t('system.canvasTemplate.count', { count: templates.length }) }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="admin-loading">
      {{ t('system.canvasTemplate.loading') }}
    </div>

    <!-- 模板表格 -->
    <table v-else-if="templates.length > 0" class="admin-table">
      <thead>
        <tr>
          <th class="col-icon"></th>
          <th class="col-name">{{ t('system.canvasTemplate.name') }}</th>
          <th class="col-category">{{ t('system.canvasTemplate.category') }}</th>
          <th class="col-size">{{ t('system.canvasTemplate.size') }}</th>
          <th class="col-source">{{ t('system.canvasTemplate.source') }}</th>
          <th class="col-graphics">{{ t('system.canvasTemplate.graphics') }}</th>
          <th class="col-actions">{{ t('system.canvasTemplate.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tpl in templates" :key="tpl.id">
          <td class="col-icon">
            <span class="tpl-icon">{{ tpl.icon || '📄' }}</span>
          </td>
          <td class="col-name">
            <div class="tpl-name">{{ tpl.name }}</div>
            <div v-if="tpl.description" class="tpl-desc">{{ tpl.description }}</div>
          </td>
          <td class="col-category">
            <span class="tpl-tag">{{ categoryLabel(tpl.category) }}</span>
          </td>
          <td class="col-size">{{ tpl.pageConfig.width }} x {{ tpl.pageConfig.height }}</td>
          <td class="col-source">
            <span class="source-badge" :class="`source-${tpl.source}`">
              {{ sourceLabel(tpl.source) }}
            </span>
          </td>
          <td class="col-graphics">{{ (tpl.graphics || []).length }}</td>
          <td class="col-actions">
            <div class="actions-group">
              <button
                class="action-btn action-btn-edit"
                :title="t('system.canvasTemplate.edit')"
                @click="handleEdit(tpl)"
              >
                {{ t('system.canvasTemplate.edit') }}
              </button>
              <button
                class="action-btn action-btn-danger"
                :disabled="tpl.source === 'builtin'"
                :title="tpl.source === 'builtin' ? t('system.canvasTemplate.builtinProtected') : t('system.canvasTemplate.delete')"
                @click="handleDelete(tpl)"
              >
                {{ t('system.canvasTemplate.delete') }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 空状态 -->
    <div v-else class="admin-empty">
      {{ t('system.canvasTemplate.empty') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTemplateStore, useI18n, type TemplateCategory, type PageTemplate } from '@scada-editor/core';

const { t } = useI18n();
const router = useRouter();
const templateStore = useTemplateStore();

const templates = ref<PageTemplate[]>([]);
const isLoading = ref(false);

onMounted(async () => {
  isLoading.value = true;
  try {
    await templateStore.loadSystemTemplates();
    templates.value = templateStore.systemTemplates;
  } finally {
    isLoading.value = false;
  }
});

function categoryLabel(category: TemplateCategory): string {
  return t(`template.category.${category}`);
}

function sourceLabel(source: string): string {
  return t(`template.source.${source}`);
}

function handleEdit(tpl: PageTemplate) {
  const route = router.resolve(`/editor/template/${tpl.id}`);
  window.open(route.href, '_blank');
}

async function handleDelete(tpl: PageTemplate) {
  if (tpl.source === 'builtin') return;
  if (!confirm(t('system.canvasTemplate.confirmDelete', { name: tpl.name }))) return;
  const ok = await templateStore.deleteTemplate(tpl.id);
  if (ok) {
    templates.value = templateStore.systemTemplates;
  }
}
</script>

<style scoped>
.canvas-template-admin {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.admin-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text, #333);
  margin: 0;
}

.admin-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-count {
  font-size: 13px;
  color: var(--text-secondary, #999);
}

.admin-loading,
.admin-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #999);
  font-size: 14px;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  overflow: hidden;
}

.admin-table th,
.admin-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--border, #e0e0e0);
  font-size: 13px;
  color: var(--text, #333);
}

.admin-table th {
  background: var(--elevated, #f5f5f5);
  font-weight: 600;
  font-size: 12px;
  color: var(--text-secondary, #666);
  white-space: nowrap;
}

.admin-table tbody tr:hover {
  background: var(--elevated, #fafafa);
}

.col-icon { width: 40px; text-align: center; }
.col-name { min-width: 160px; }
.col-category { width: 100px; }
.col-size { width: 120px; white-space: nowrap; }
.col-source { width: 80px; }
.col-graphics { width: 60px; text-align: center; }
.col-actions { width: 130px; text-align: center; }

.actions-group {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.tpl-icon { font-size: 18px; }

.tpl-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.tpl-desc {
  font-size: 11px;
  color: var(--text-secondary, #999);
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpl-tag {
  display: inline-block;
  padding: 1px 8px;
  font-size: 11px;
  background: var(--elevated, #f0f0f0);
  border-radius: 10px;
  color: var(--text-secondary, #666);
}

.source-badge {
  display: inline-block;
  padding: 1px 8px;
  font-size: 11px;
  border-radius: 10px;
  color: #fff;
}
.source-builtin { background: #409EFF; }
.source-user { background: #67C23A; }
.source-market { background: #E6A23C; }

.action-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 4px;
  background: transparent;
  color: var(--text, #333);
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover:not(:disabled) {
  border-color: var(--primary, #409EFF);
  color: var(--primary, #409EFF);
}

.action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.action-btn-edit {
  color: var(--primary, #409EFF);
  border-color: var(--primary, #409EFF);
}

.action-btn-edit:hover:not(:disabled) {
  background: var(--primary, #409EFF);
  color: #fff;
}

.action-btn-danger:hover:not(:disabled) {
  border-color: var(--error, #F56C6C);
  color: var(--error, #F56C6C);
}
</style>
