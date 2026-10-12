<template>
  <div class="script-template-view">
    <!-- 顶部工具栏 -->
    <div class="template-toolbar">
      <div class="toolbar-left">
        <h2 class="toolbar-title">
          {{ $t('system.scriptTemplates.title') }}
        </h2>
        <button
          class="btn btn-sm btn-text"
          @click="goBackToScripts"
        >
          {{ $t('system.scriptTemplates.backToScripts') }}
        </button>
      </div>
      <div class="toolbar-right">
        <div
          class="search-input-wrapper"
          style="width: 220px"
        >
          <svg
            class="search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          ><circle
            cx="11"
            cy="11"
            r="8"
          /><line
            x1="21"
            y1="21"
            x2="16.65"
            y2="16.65"
          /></svg>
          <input
            v-model="keyword"
            class="input input-sm search-input"
            :placeholder="$t('system.scriptTemplates.searchPlaceholder')"
          >
        </div>
        <select
          class="select select-sm"
          :value="selectedCategory ?? ''"
          style="width: 160px"
          @change="selectedCategory = ($event.target as HTMLSelectElement).value || null"
        >
          <option
            v-for="opt in categoryOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <button
          class="btn btn-sm btn-primary"
          @click="openCreateDialog"
        >
          {{ $t('system.scriptTemplates.createTemplate') }}
        </button>
      </div>
    </div>

    <!-- 模板列表 -->
    <div class="template-content">
      <SsLoading
        v-if="loading"
        size="small"
      />
      <div
        v-else-if="filteredTemplates.length === 0"
        class="empty-state"
      >
        {{ $t('system.scriptTemplates.noTemplates') }}
      </div>
      <div
        v-else
        class="template-grid"
      >
        <div
          v-for="tpl in filteredTemplates"
          :key="tpl.id"
          class="template-grid-item"
        >
          <div class="card template-card">
            <!-- 卡片头部 -->
            <div class="card-header">
              <div class="card-title-row">
                <span
                  class="card-title"
                  :title="tpl.name"
                >{{ tpl.name }}</span>
                <span
                  v-if="tpl.isBuiltin"
                  class="tag tag--sm tag--info"
                >
                  {{ $t('system.scriptTemplates.builtin') }}
                </span>
              </div>
              <div class="card-tags">
                <span
                  class="tag tag--sm"
                  :class="`tag--${categoryTagType(tpl.category)}`"
                >
                  {{ categoryLabel(tpl.category) }}
                </span>
                <span class="tag tag--sm">
                  {{ triggerLabel(tpl.triggerType) }}
                </span>
              </div>
            </div>

            <!-- 卡片描述 -->
            <div
              class="card-desc"
              :title="tpl.description || ''"
            >
              {{ tpl.description || $t('system.scriptTemplates.noDescription') }}
            </div>

            <!-- 标签列表 -->
            <div
              v-if="tpl.tags && tpl.tags.length"
              class="card-tag-list"
            >
              <span
                v-for="tag in tpl.tags"
                :key="tag"
                class="tag tag--xs tag--bordered tag--round"
              >
                {{ tag }}
              </span>
            </div>

            <!-- 卡片底部信息 -->
            <div class="card-footer">
              <div class="footer-meta">
                <span
                  v-if="tpl.author"
                  class="meta-item"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  ><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
                    cx="12"
                    cy="7"
                    r="4"
                  /></svg>
                  {{ tpl.author }}
                </span>
                <span class="meta-item">v{{ tpl.version }}</span>
              </div>
              <div class="footer-actions">
                <button
                  class="btn btn-xs btn-text"
                  @click="openCodeDialog(tpl)"
                >
                  {{ $t('system.scriptTemplates.viewCode') }}
                </button>
                <button
                  class="btn btn-xs btn-text btn-primary"
                  @click="openInstantiateDialog(tpl)"
                >
                  {{ $t('system.scriptTemplates.useTemplate') }}
                </button>
                <button
                  v-if="!tpl.isBuiltin"
                  class="btn btn-xs btn-text"
                  @click="openEditDialog(tpl)"
                >
                  {{ $t('system.scriptTemplates.edit') }}
                </button>
                <button
                  v-if="!tpl.isBuiltin"
                  class="btn btn-xs btn-text btn-error"
                  @click="confirmDelete(tpl)"
                >
                  {{ $t('system.scriptTemplates.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 查看代码对话框 -->
    <div
      v-if="showCodeDialog"
      class="modal-overlay"
      @click.self="showCodeDialog = false"
    >
      <div
        class="modal"
        style="width: 720px; max-width: 90vw"
      >
        <div class="modal-header">
          <h3 class="modal-title">
            {{ $t('system.scriptTemplates.codePreview') }}
          </h3>
          <button
            class="modal-close"
            @click="showCodeDialog = false"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <div class="code-preview-info">
            <span class="info-label">{{ $t('system.scriptTemplates.templateName') }}:</span>
            <span>{{ codeDialogTemplate?.name }}</span>
          </div>
          <pre class="code-block">{{ codeDialogTemplate?.code }}</pre>
        </div>
      </div>
    </div>

    <!-- 从模板创建脚本对话框 -->
    <div
      v-if="showInstantiateDialog"
      class="modal-overlay"
      @click.self="showInstantiateDialog = false"
    >
      <div
        class="modal"
        style="width: 460px; max-width: 90vw"
      >
        <div class="modal-header">
          <h3 class="modal-title">
            {{ $t('system.scriptTemplates.instantiateTitle') }}
          </h3>
          <button
            class="modal-close"
            @click="showInstantiateDialog = false"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <div class="instantiate-form">
            <div class="form-row">
              <label class="form-label">{{ $t('system.scriptTemplates.sourceTemplate') }}</label>
              <div class="form-value">
                {{ instantiateTemplate?.name }}
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">
                {{ $t('system.scriptTemplates.scriptName') }}
                <span class="required">*</span>
              </label>
              <input
                v-model="instantiateForm.name"
                class="input"
                :placeholder="$t('system.scriptTemplates.scriptNamePlaceholder')"
                @keyup.enter="handleInstantiate"
              >
            </div>
            <div class="form-row">
              <label class="form-label">
                {{ $t('system.scriptTemplates.targetProject') }}
                <span class="required">*</span>
              </label>
              <select
                class="select"
                :value="instantiateForm.projectId"
                :disabled="projectLoading"
                @change="instantiateForm.projectId = ($event.target as HTMLSelectElement).value"
              >
                <option
                  value=""
                  disabled
                >
                  {{ projectLoading ? '...' : $t('system.scriptTemplates.selectProject') }}
                </option>
                <option
                  v-for="opt in projectOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <p
              v-if="instantiateError"
              class="form-error"
            >
              {{ instantiateError }}
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <div class="dialog-footer">
            <button
              class="btn"
              @click="showInstantiateDialog = false"
            >
              {{ $t('system.scriptTemplates.cancel') }}
            </button>
            <button
              class="btn btn-primary"
              :disabled="instantiateSubmitting || !instantiateForm.name.trim() || !instantiateForm.projectId"
              @click="handleInstantiate"
            >
              {{ $t('system.scriptTemplates.confirm') }}{{ instantiateSubmitting ? '...' : '' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑模板对话框 -->
    <div
      v-if="showEditDialog"
      class="modal-overlay"
      @click.self="showEditDialog = false"
    >
      <div
        class="modal"
        style="width: 640px; max-width: 90vw"
      >
        <div class="modal-header">
          <h3 class="modal-title">
            {{ editMode === 'create' ? $t('system.scriptTemplates.createTitle') : $t('system.scriptTemplates.editTitle') }}
          </h3>
          <button
            class="modal-close"
            @click="showEditDialog = false"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <div class="edit-form">
            <div class="form-row">
              <label class="form-label">
                {{ $t('system.scriptTemplates.templateName') }}
                <span class="required">*</span>
              </label>
              <input
                v-model="editForm.name"
                class="input"
                :placeholder="$t('system.scriptTemplates.namePlaceholder')"
              >
            </div>
            <div class="form-row form-row-double">
              <div class="form-col">
                <label class="form-label">{{ $t('system.scriptTemplates.categoryLabel') }}</label>
                <select
                  class="select"
                  :value="editForm.category"
                  @change="editForm.category = ($event.target as HTMLSelectElement).value as TemplateCategory"
                >
                  <option
                    v-for="opt in categoryOptions.filter(o => o.value !== '')"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="form-col">
                <label class="form-label">{{ $t('system.scriptTemplates.triggerTypeLabel') }}</label>
                <select
                  class="select"
                  :value="editForm.triggerType"
                  @change="editForm.triggerType = ($event.target as HTMLSelectElement).value as ScriptTriggerType"
                >
                  <option
                    v-for="opt in triggerTypeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>
            <div class="form-row form-row-double">
              <div class="form-col">
                <label class="form-label">{{ $t('system.scriptTemplates.authorLabel') }}</label>
                <input
                  v-model="editForm.author"
                  class="input"
                  :placeholder="$t('system.scriptTemplates.authorPlaceholder')"
                >
              </div>
              <div class="form-col">
                <label class="form-label">{{ $t('system.scriptTemplates.versionLabel') }}</label>
                <input
                  v-model="editForm.version"
                  class="input"
                  placeholder="1.0.0"
                >
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('system.scriptTemplates.descriptionLabel') }}</label>
              <textarea
                v-model="editForm.description"
                rows="2"
                class="input"
                :placeholder="$t('system.scriptTemplates.descPlaceholder')"
              />
            </div>
            <div class="form-row">
              <label class="form-label">
                {{ $t('system.scriptTemplates.codeLabel') }}
                <span class="required">*</span>
              </label>
              <textarea
                v-model="editForm.code"
                rows="10"
                class="input code-input"
                :placeholder="$t('system.scriptTemplates.codePlaceholder')"
              />
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('system.scriptTemplates.tagsLabel') }}</label>
              <input
                v-model="editForm.tagsText"
                class="input"
                :placeholder="$t('system.scriptTemplates.tagsPlaceholder')"
              >
            </div>
            <p
              v-if="editError"
              class="form-error"
            >
              {{ editError }}
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <div class="dialog-footer">
            <button
              class="btn"
              @click="showEditDialog = false"
            >
              {{ $t('system.scriptTemplates.cancel') }}
            </button>
            <button
              class="btn btn-primary"
              :disabled="editSubmitting || !editForm.name.trim() || !editForm.code.trim()"
              @click="handleEditSubmit"
            >
              {{ editMode === 'create' ? $t('system.scriptTemplates.create') : $t('system.scriptTemplates.save') }}{{ editSubmitting ? '...' : '' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { scriptApi } from '../../api/modules/script.api';
import type {
  ScriptTemplate, TemplateCategory, CreateScriptTemplateDto, UpdateScriptTemplateDto,
} from '../../api/modules/script.api';
import type { ScriptTriggerType } from '../../types/api';
import { useProjectStore } from '../../stores/project.store';
import { showSuccess, showError } from '../../utils/messageBox';
import { SsLoading } from '@scada-editor/shared';

const router = useRouter();
const { t } = useI18n();
const projectStore = useProjectStore();

const templates = ref<ScriptTemplate[]>([]);
const loading = ref(false);
const keyword = ref('');
const selectedCategory = ref<string | null>(null);

// 项目选择
const projectLoading = ref(false);
const projectOptions = computed(() =>
  projectStore.projects.map((p) => ({ label: p.projectName, value: p.projectId })),
);

// 分类选项
const categoryOptions = computed(() => [
  { label: t('system.scriptTemplates.allCategories'), value: '' },
  { label: t('system.scriptTemplates.catDataTransform'), value: 'data_transform' },
  { label: t('system.scriptTemplates.catAlarmCondition'), value: 'alarm_condition' },
  { label: t('system.scriptTemplates.catDeviceControl'), value: 'device_control' },
  { label: t('system.scriptTemplates.catReport'), value: 'report' },
  { label: t('system.scriptTemplates.catCustom'), value: 'custom' },
]);

const triggerTypeOptions = computed(() => [
  { label: t('system.scripts.manual'), value: 'manual' },
  { label: t('system.scripts.scheduled'), value: 'scheduled' },
  { label: t('system.scripts.eventDriven'), value: 'event' },
  { label: t('system.scripts.pipeline'), value: 'pipeline' },
]);


// 过滤后的模板列表
const filteredTemplates = computed(() => {
  let result = templates.value;
  if (selectedCategory.value) {
    result = result.filter((tp) => tp.category === selectedCategory.value);
  }
  const kw = keyword.value.trim().toLowerCase();
  if (kw) {
    result = result.filter((tp) => {
      const inName = tp.name.toLowerCase().includes(kw);
      const inDesc = (tp.description || '').toLowerCase().includes(kw);
      const inTags = (tp.tags || []).some((tg) => tg.toLowerCase().includes(kw));
      const inAuthor = (tp.author || '').toLowerCase().includes(kw);
      return inName || inDesc || inTags || inAuthor;
    });
  }
  return result;
});

function categoryLabel(cat: TemplateCategory): string {
  const map: Record<TemplateCategory, string> = {
    data_transform: t('system.scriptTemplates.catDataTransform'),
    alarm_condition: t('system.scriptTemplates.catAlarmCondition'),
    device_control: t('system.scriptTemplates.catDeviceControl'),
    report: t('system.scriptTemplates.catReport'),
    custom: t('system.scriptTemplates.catCustom'),
  };
  return map[cat] || cat;
}

function categoryTagType(cat: TemplateCategory): 'default' | 'success' | 'warning' | 'info' | 'error' {
  const map: Record<TemplateCategory, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
    data_transform: 'success',
    alarm_condition: 'warning',
    device_control: 'info',
    report: 'default',
    custom: 'default',
  };
  return map[cat] || 'default';
}

function triggerLabel(type: ScriptTriggerType): string {
  const map: Record<ScriptTriggerType, string> = {
    manual: t('system.scripts.manual'),
    scheduled: t('system.scripts.scheduled'),
    event: t('system.scripts.eventDriven'),
    pipeline: t('system.scripts.pipeline'),
  };
  return map[type] || type;
}

// ==================== 数据加载 ====================

async function fetchTemplates() {
  loading.value = true;
  try {
    const projectId = projectStore.projects[0]?.projectId;
    if (!projectId) {
      showError(t('system.scriptTemplates.errorNoProject'));
      return;
    }
    templates.value = await scriptApi.getScriptTemplates(projectId);
  } catch (e: unknown) {
    if (!(e as any)._errorHandled) {
      const msg = e instanceof Error ? e.message : t('system.scriptTemplates.errorFetch');
      showError(msg);
    }
    templates.value = [];
  } finally {
    loading.value = false;
  }
}

function goBackToScripts() {
  router.push({ name: 'scripts' });
}

// ==================== 查看代码 ====================

const showCodeDialog = ref(false);
const codeDialogTemplate = ref<ScriptTemplate | null>(null);

function openCodeDialog(tpl: ScriptTemplate) {
  codeDialogTemplate.value = tpl;
  showCodeDialog.value = true;
}

// ==================== 从模板创建脚本 ====================

const showInstantiateDialog = ref(false);
const instantiateTemplate = ref<ScriptTemplate | null>(null);
const instantiateForm = ref({ name: '', projectId: '' as string });
const instantiateError = ref('');
const instantiateSubmitting = ref(false);

function openInstantiateDialog(tpl: ScriptTemplate) {
  instantiateTemplate.value = tpl;
  instantiateForm.value = {
    name: tpl.name,
    projectId: projectStore.projects[0]?.projectId || '',
  };
  instantiateError.value = '';
  showInstantiateDialog.value = true;
}

async function handleInstantiate() {
  if (!instantiateTemplate.value) return;
  instantiateError.value = '';
  if (!instantiateForm.value.name.trim()) {
    instantiateError.value = t('system.scriptTemplates.errorNameRequired');
    return;
  }
  if (!instantiateForm.value.projectId) {
    instantiateError.value = t('system.scriptTemplates.errorProjectRequired');
    return;
  }

  instantiateSubmitting.value = true;
  try {
    const script = await scriptApi.instantiateTemplate(
      instantiateForm.value.projectId,
      instantiateTemplate.value.id,
      instantiateForm.value.name.trim(),
    );
    showSuccess(t('system.scriptTemplates.instantiateSuccess', { name: script.name }));
    showInstantiateDialog.value = false;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('system.scriptTemplates.errorInstantiate');
    instantiateError.value = msg;
  } finally {
    instantiateSubmitting.value = false;
  }
}

// ==================== 创建/编辑模板 ====================

const showEditDialog = ref(false);
const editMode = ref<'create' | 'edit'>('create');
const editingId = ref<string | null>(null);
const editForm = ref({
  name: '',
  description: '',
  category: 'custom' as TemplateCategory,
  triggerType: 'manual' as ScriptTriggerType,
  author: '',
  version: '1.0.0',
  code: '',
  tagsText: '',
});
const editError = ref('');
const editSubmitting = ref(false);

function openCreateDialog() {
  editMode.value = 'create';
  editingId.value = null;
  editForm.value = {
    name: '',
    description: '',
    category: 'custom',
    triggerType: 'manual',
    author: '',
    version: '1.0.0',
    code: t('system.scripts.defaultCode'),
    tagsText: '',
  };
  editError.value = '';
  showEditDialog.value = true;
}

function openEditDialog(tpl: ScriptTemplate) {
  editMode.value = 'edit';
  editingId.value = tpl.id;
  editForm.value = {
    name: tpl.name,
    description: tpl.description || '',
    category: tpl.category,
    triggerType: tpl.triggerType,
    author: tpl.author || '',
    version: tpl.version,
    code: tpl.code,
    tagsText: (tpl.tags || []).join(', '),
  };
  editError.value = '';
  showEditDialog.value = true;
}

async function handleEditSubmit() {
  editError.value = '';
  if (!editForm.value.name.trim()) {
    editError.value = t('system.scriptTemplates.errorNameRequired');
    return;
  }
  if (!editForm.value.code.trim()) {
    editError.value = t('system.scriptTemplates.errorCodeRequired');
    return;
  }

  const projectId = projectStore.projects[0]?.projectId;
  if (!projectId) {
    editError.value = t('system.scriptTemplates.errorNoProject');
    return;
  }

  const tags = editForm.value.tagsText
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  editSubmitting.value = true;
  try {
    if (editMode.value === 'create') {
      const dto: CreateScriptTemplateDto = {
        name: editForm.value.name.trim(),
        description: editForm.value.description.trim() || undefined,
        category: editForm.value.category,
        triggerType: editForm.value.triggerType,
        code: editForm.value.code,
        tags: tags.length > 0 ? tags : undefined,
        author: editForm.value.author.trim() || undefined,
        version: editForm.value.version.trim() || '1.0.0',
      };
      await scriptApi.createScriptTemplate(projectId, dto);
      showSuccess(t('system.scriptTemplates.createSuccess'));
    } else if (editingId.value) {
      const dto: UpdateScriptTemplateDto = {
        name: editForm.value.name.trim(),
        description: editForm.value.description.trim() || undefined,
        category: editForm.value.category,
        triggerType: editForm.value.triggerType,
        code: editForm.value.code,
        tags: tags.length > 0 ? tags : undefined,
        author: editForm.value.author.trim() || undefined,
        version: editForm.value.version.trim() || '1.0.0',
      };
      await scriptApi.updateScriptTemplate(projectId, editingId.value, dto);
      showSuccess(t('system.scriptTemplates.editSuccess'));
    }
    showEditDialog.value = false;
    await fetchTemplates();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('system.scriptTemplates.errorSave');
    editError.value = msg;
  } finally {
    editSubmitting.value = false;
  }
}

// ==================== 删除模板 ====================

function confirmDelete(tpl: ScriptTemplate) {
  if (window.confirm(t('system.scriptTemplates.confirmDelete'))) {
    handleDelete(tpl);
  }
}

async function handleDelete(tpl: ScriptTemplate) {
  const projectId = projectStore.projects[0]?.projectId;
  if (!projectId) return;
  try {
    await scriptApi.deleteScriptTemplate(projectId, tpl.id);
    showSuccess(t('system.scriptTemplates.deleteSuccess'));
    await fetchTemplates();
  } catch (e: unknown) {
    if (!(e as any)._errorHandled) {
      const msg = e instanceof Error ? e.message : t('system.scriptTemplates.errorDelete');
      showError(msg);
    }
  }
}

// ==================== 初始化 ====================

onMounted(async () => {
  if (!projectStore.projects.length) {
    projectLoading.value = true;
    try {
      await projectStore.fetchProjects();
    } finally {
      projectLoading.value = false;
    }
  }
  await fetchTemplates();
});
</script>

<style scoped>
.script-template-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--background);
}

.template-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* ==================== 按钮 ==================== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  line-height: 1.5;
}

.btn:hover:not(:disabled) {
  border-color: var(--primary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 13px;
}

.btn-xs {
  padding: 2px 8px;
  font-size: 12px;
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--button-text);
}

.btn-primary:hover:not(:disabled) {
  background: var(--button-hover);
  border-color: var(--button-hover);
}

.btn-error {
  color: var(--status-error);
}

.btn-text {
  background: transparent;
  border: none;
}

.btn-text:hover:not(:disabled) {
  background: var(--control-button-hover);
  border: none;
}

.btn-text.btn-primary {
  background: transparent;
  border: none;
  color: var(--primary);
}

.btn-text.btn-primary:hover:not(:disabled) {
  background: var(--control-button-hover);
}

.btn-text.btn-error {
  background: transparent;
  border: none;
  color: var(--status-error);
}

.btn-text.btn-error:hover:not(:disabled) {
  background: var(--control-button-hover);
}

/* ==================== 输入框 ==================== */
.input {
  width: 100%;
  padding: 6px 10px;
  font-size: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  font-family: inherit;
}

.input:focus {
  border-color: var(--primary);
}

.input-sm {
  padding: 4px 8px;
  font-size: 13px;
}

textarea.input {
  resize: vertical;
  font-family: inherit;
}

/* ==================== 搜索输入 ==================== */
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 8px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input {
  padding-left: 28px;
}

/* ==================== 下拉选择 ==================== */
.select {
  width: 100%;
  padding: 6px 10px;
  font-size: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  outline: none;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.select:focus {
  border-color: var(--primary);
}

.select-sm {
  padding: 4px 8px;
  font-size: 13px;
}

.select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== 卡片 ==================== */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition: box-shadow 0.2s, border-color 0.2s;
}

.card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-card);
}

.template-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 14px 16px;
}

.card-header {
  margin-bottom: 8px;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.card-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}

.card-tag-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.card-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.footer-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

/* ==================== 网格布局 ==================== */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

/* ==================== 标签 ==================== */
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: var(--radius-md);
  background: var(--background);
  color: var(--text-secondary);
  border: none;
  white-space: nowrap;
  line-height: 1.5;
}

.tag--sm {
  font-size: 11px;
  padding: 1px 6px;
}

.tag--xs {
  font-size: 10px;
  padding: 1px 5px;
}

.tag--bordered {
  border: 1px solid var(--border);
}

.tag--round {
  border-radius: 999px;
}

.tag--info {
  color: var(--status-info);
  background: color-mix(in srgb, var(--status-info) 12%, transparent);
}

.tag--success {
  color: var(--status-success);
  background: color-mix(in srgb, var(--status-success) 12%, transparent);
}

.tag--warning {
  color: var(--status-warning);
  background: color-mix(in srgb, var(--status-warning) 15%, transparent);
}

.tag--error {
  color: var(--status-error);
  background: color-mix(in srgb, var(--status-error) 12%, transparent);
}

.tag--default {
  background: var(--background);
  color: var(--text-secondary);
}

/* ==================== 加载与空状态 ==================== */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* ==================== 模态框 ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  line-height: 1;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0 4px;
  transition: color 0.2s;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

/* ==================== 代码预览 ==================== */
.code-preview-info {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  display: flex;
  gap: 6px;
}

.info-label {
  color: var(--text-secondary);
}

.code-block {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}

/* ==================== 表单 ==================== */
.instantiate-form,
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row-double {
  flex-direction: row;
  gap: 12px;
}

.form-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.required {
  color: var(--status-error);
}

.form-value {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}

.form-error {
  color: var(--status-error);
  font-size: 13px;
  margin: 0;
}

.code-input {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
