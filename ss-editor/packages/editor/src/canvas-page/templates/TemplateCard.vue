<template>
  <div
    class="template-card"
    :class="{ 'template-card--selected': selected, 'template-card--user': template.source === 'user' }"
    @click="$emit('select', template.id)"
  >
    <!-- 预览区 -->
    <div class="template-card-preview" :style="{ backgroundColor: template.pageConfig.backgroundColor }">
      <!-- 尺寸标签 -->
      <span class="template-card-size">
        {{ template.pageConfig.width }} × {{ template.pageConfig.height }}
      </span>
      <!-- 图标 -->
      <span class="template-card-icon">{{ template.icon || '📄' }}</span>
      <!-- 来源标记 -->
      <span class="template-card-source" :class="`source-${template.source}`">
        {{ sourceLabel }}
      </span>
      <!-- 范围标记 -->
      <span class="template-card-scope" :class="{ 'scope-project': templateStore.isProjectTemplate(template.id) }">
        {{ scopeLabel }}
      </span>
    </div>

    <!-- 信息区 -->
    <div class="template-card-info">
      <div class="template-card-name">{{ template.name }}</div>
      <div v-if="template.description" class="template-card-desc">
        {{ template.description }}
      </div>
      <!-- 标签 -->
      <div v-if="template.tags && template.tags.length" class="template-card-tags">
        <span v-for="tag in template.tags.slice(0, 3)" :key="tag" class="template-card-tag">
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- 操作区（用户模板） -->
    <div v-if="template.source === 'user' && showActions" class="template-card-actions">
      <button class="control-button" :title="t('template.editTemplate')" @click.stop="$emit('edit', template.id)">
        <span class="icon-emoji">✎</span>
      </button>
      <button class="control-button" :title="t('template.delete')" @click.stop="$emit('delete', template.id)">
        <span class="icon-emoji">✕</span>
      </button>
      <button class="control-button" :title="t('template.duplicate')" @click.stop="$emit('duplicate', template.id)">
        <span class="icon-emoji">⧉</span>
      </button>
      <button class="control-button" :title="t('template.export')" @click.stop="$emit('export', template.id)">
        <span class="icon-emoji">↓</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { i18n, useTemplateStore, type PageTemplate } from '@scada-editor/core';

const { t } = i18n.global;
const templateStore = useTemplateStore();

const props = defineProps({
  template: { type: Object as PropType<PageTemplate>, required: true },
  selected: { type: Boolean, default: false },
  showActions: { type: Boolean, default: false },
});

defineEmits<{
  select: [id: string];
  edit: [id: string];
  delete: [id: string];
  duplicate: [id: string];
  export: [id: string];
}>();

const sourceLabel = computed(() => {
  switch (props.template.source) {
    case 'builtin': return t('template.source.builtin');
    case 'user': return t('template.source.user');
    case 'market': return t('template.source.market');
    default: return '';
  }
});

const scopeLabel = computed(() => {
  return templateStore.isProjectTemplate(props.template.id)
    ? t('template.scope.project')
    : t('template.scope.system');
});
</script>

<style scoped>
.template-card {
  width: 220px;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--surface, #fff);
  flex-shrink: 0;
}
.template-card:hover {
  border-color: var(--primary, #409EFF);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}
.template-card--selected {
  border-color: var(--primary, #409EFF);
  box-shadow: 0 0 0 2px var(--primary, #409EFF);
}

.template-card-preview {
  height: 110px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.template-card-size {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 6px;
  border-radius: 3px;
}

.template-card-icon {
  font-size: 32px;
  opacity: 0.6;
}

.template-card-source {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 6px;
  border-radius: 3px;
}
.source-builtin { background: rgba(64, 158, 255, 0.6); }
.source-user { background: rgba(103, 194, 58, 0.6); }
.source-market { background: rgba(230, 162, 60, 0.6); }

.template-card-scope {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.65);
  background: rgba(0, 0, 0, 0.25);
  padding: 0 5px;
  border-radius: 3px;
}
.scope-project { background: rgba(230, 162, 60, 0.5); }

.template-card-info {
  padding: 8px 10px;
}

.template-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-card-desc {
  font-size: 11px;
  color: var(--text-secondary, #999);
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-card-tags {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.template-card-tag {
  font-size: 10px;
  color: var(--text-secondary, #999);
  background: var(--elevated, #f0f0f0);
  padding: 0 4px;
  border-radius: 2px;
}

.template-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  padding: 0 8px 6px;
}
</style>
