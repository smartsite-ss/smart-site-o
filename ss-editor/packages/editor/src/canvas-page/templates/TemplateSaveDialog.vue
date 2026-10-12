<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
      <div class="dialog-panel">
        <!-- 标题栏 -->
        <div class="dialog-header">
          <span class="dialog-title">{{ t('template.saveDialog.title') }}</span>
          <button class="dialog-close" @click="$emit('close')">✕</button>
        </div>

        <!-- 表单 -->
        <div class="dialog-body">
          <!-- 模板名称 -->
          <div class="form-group">
            <label class="form-label">
              {{ t('template.saveDialog.name') }} <span class="required">*</span>
            </label>
            <input
              ref="nameInputRef"
              v-model="form.name"
              class="form-input"
              :placeholder="t('template.saveDialog.namePlaceholder')"
              maxlength="50"
            />
          </div>

          <!-- 保存到 -->
          <div class="form-group">
            <label class="form-label">{{ t('template.saveDialog.scopeLabel') }}</label>
            <select v-model="form.saveToSystem" class="form-select">
              <option :value="false">{{ t('template.saveDialog.scopeProject') }}</option>
              <option :value="true">{{ t('template.saveDialog.scopeSystem') }}</option>
            </select>
          </div>

          <!-- 分类 -->
          <div class="form-group">
            <label class="form-label">{{ t('template.saveDialog.category') }}</label>
            <select v-model="form.category" class="form-select">
              <option
                v-for="cat in templateStore.categories"
                :key="cat.key"
                :value="cat.key"
              >
                {{ t(cat.labelKey) }}
              </option>
            </select>
          </div>

          <!-- 描述 -->
          <div class="form-group">
            <label class="form-label">{{ t('template.saveDialog.description') }}</label>
            <textarea
              v-model="form.description"
              class="form-textarea"
              :placeholder="t('template.saveDialog.descriptionPlaceholder')"
              rows="3"
              maxlength="200"
            />
          </div>

          <!-- 标签 -->
          <div class="form-group">
            <label class="form-label">{{ t('template.saveDialog.tags') }}</label>
            <input
              v-model="form.tagsInput"
              class="form-input"
              :placeholder="t('template.saveDialog.tagsPlaceholder')"
            />
            <span class="form-hint">{{ t('template.saveDialog.tagsHint') }}</span>
          </div>
        </div>

        <!-- 底部 -->
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="$emit('close')">
            {{ t('template.saveDialog.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="!form.name.trim()"
            @click="handleSave"
          >
            {{ t('template.saveDialog.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted, type PropType } from 'vue';
import { i18n, useTemplateStore, type PageTemplate, type TemplateCategory, type TemplateLayoutType } from '@scada-editor/core';

const { t } = i18n.global;
const templateStore = useTemplateStore();

const props = defineProps({
  visible: { type: Boolean, default: false },
  pageName: { type: String, default: '' },
  pageConfig: {
    type: Object as PropType<{ width: number; height: number; backgroundColor: string; layout: TemplateLayoutType }>,
    required: true,
  },
  graphics: { type: Array as PropType<unknown[]>, required: true },
});

const emit = defineEmits<{
  close: [];
  saved: [template: PageTemplate];
}>();

const nameInputRef = ref<HTMLInputElement | null>(null);

const form = reactive({
  name: '',
  category: 'custom' as TemplateCategory,
  saveToSystem: false,
  description: '',
  tagsInput: '',
});

// 默认模板名 = 页面名
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    form.name = props.pageName ? `${props.pageName} 模板` : '';
    form.category = 'custom';
    form.saveToSystem = false;
    form.description = '';
    form.tagsInput = '';
    // 聚焦输入框
    setTimeout(() => nameInputRef.value?.focus(), 100);
  }
});

async function handleSave() {
  if (!form.name.trim()) return;

  const tags = form.tagsInput
    .split(/[,，]/)
    .map(s => s.trim())
    .filter(Boolean);

  const template = await templateStore.saveAsTemplate({
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    category: form.category,
    pageConfig: props.pageConfig,
    graphics: props.graphics,
    tags: tags.length > 0 ? tags : undefined,
  }, form.saveToSystem);

  if (template) {
    emit('saved', template);
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-panel {
  width: 480px;
  max-height: 80vh;
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  box-shadow: var(--shadow-modal, 0 4px 24px rgba(0, 0, 0, 0.15));
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #e0e0e0);
}

.dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #333);
}

.dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary, #999);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-close:hover {
  background: var(--elevated, #f0f0f0);
  color: var(--text, #333);
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 16px;
}
.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text, #333);
  margin-bottom: 6px;
}

.required { color: var(--error, #F56C6C); }

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  color: var(--text, #333);
  background: var(--elevated, #fafafa);
  border: 1px solid var(--border, #d0d0d0);
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--primary, #409EFF);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-hint {
  display: block;
  font-size: 11px;
  color: var(--text-secondary, #999);
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border, #e0e0e0);
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
