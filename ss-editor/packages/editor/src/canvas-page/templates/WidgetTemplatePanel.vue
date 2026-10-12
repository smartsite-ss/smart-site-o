<template>
  <div class="widget-template-panel">
    <!-- 工具栏：分类筛选 + 保存选中为模板 -->
    <div class="wtp-toolbar">
      <select v-model="category" class="wtp-select" @change="onCategoryChange">
        <option value="all">{{ $t('widgetTemplate.category.all') }}</option>
        <option value="chart">{{ $t('widgetTemplate.category.chart') }}</option>
        <option value="device">{{ $t('widgetTemplate.category.device') }}</option>
        <option value="alarm">{{ $t('widgetTemplate.category.alarm') }}</option>
        <option value="control">{{ $t('widgetTemplate.category.control') }}</option>
        <option value="gauge">{{ $t('widgetTemplate.category.gauge') }}</option>
        <option value="media">{{ $t('widgetTemplate.category.media') }}</option>
        <option value="custom">{{ $t('widgetTemplate.category.custom') }}</option>
      </select>
      <button
        class="wtp-btn"
        :title="$t('widgetTemplate.gallery.saveAsTemplate')"
        @click="saveSelectedAsTemplate"
      >
        {{ $t('widgetTemplate.gallery.saveAsTemplate') }}
      </button>
    </div>

    <!-- 列表 -->
    <div class="wtp-list">
      <div v-if="isLoading" class="wtp-loading">
        {{ $t('widgetTemplate.gallery.title') }}
      </div>
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="wtp-item"
        draggable="true"
        :title="tpl.description || tpl.name"
        @dragstart="onDragStart($event, tpl)"
        @dblclick="instantiate(tpl)"
      >
        <div class="wtp-thumb">
          <img v-if="tpl.thumbnail" :src="tpl.thumbnail" :alt="tpl.name" />
          <span v-else class="wtp-thumb-placeholder">◳</span>
        </div>
        <div class="wtp-meta">
          <div class="wtp-name">{{ tpl.name }}</div>
          <div class="wtp-sub">
            <span class="wtp-badge" :class="`src-${tpl.source}`">{{ tpl.source }}</span>
            <span v-if="tpl.hasVariables" class="wtp-badge var">
              {{ $t('templateVariable.title') }} ×{{ tpl.variableCount }}
            </span>
          </div>
        </div>
        <div class="wtp-actions">
          <button class="wtp-icon" :title="$t('widgetTemplate.instanceDialog.confirm')" @click.stop="instantiate(tpl)">＋</button>
          <button
            v-if="tpl.source === 'user'"
            class="wtp-icon danger"
            :title="$t('widgetTemplate.gallery.delete')"
            @click.stop="removeTemplate(tpl)"
          >🗑</button>
        </div>
      </div>
      <div v-if="!isLoading && templates.length === 0" class="wtp-empty">
        {{ $t('widgetTemplate.gallery.noTemplates') }}
      </div>
    </div>

    <!-- 保存为组件模板弹窗 -->
    <div v-if="showSaveDialog" class="wtp-modal-mask" @click.self="showSaveDialog = false">
      <div class="wtp-modal">
        <h3>{{ $t('widgetTemplate.saveDialog.title') }}</h3>
        <label>{{ $t('widgetTemplate.saveDialog.name') }}</label>
        <input v-model="saveForm.name" class="wtp-input" :placeholder="$t('widgetTemplate.saveDialog.namePlaceholder')" />
        <label>{{ $t('widgetTemplate.saveDialog.category') }}</label>
        <select v-model="saveForm.category" class="wtp-input">
          <option value="chart">{{ $t('widgetTemplate.category.chart') }}</option>
          <option value="device">{{ $t('widgetTemplate.category.device') }}</option>
          <option value="alarm">{{ $t('widgetTemplate.category.alarm') }}</option>
          <option value="control">{{ $t('widgetTemplate.category.control') }}</option>
          <option value="gauge">{{ $t('widgetTemplate.category.gauge') }}</option>
          <option value="media">{{ $t('widgetTemplate.category.media') }}</option>
          <option value="custom">{{ $t('widgetTemplate.category.custom') }}</option>
        </select>
        <label>{{ $t('widgetTemplate.saveDialog.description') }}</label>
        <input v-model="saveForm.description" class="wtp-input" :placeholder="$t('widgetTemplate.saveDialog.descriptionPlaceholder')" />
        <label style="margin-top:8px">{{ $t('widgetTemplate.saveDialog.extractVariables') }}</label>
        <TemplateVariableEditor v-model="saveForm.variables" />
        <div class="wtp-modal-actions">
          <button class="wtp-btn" @click="showSaveDialog = false">{{ $t('widgetTemplate.saveDialog.cancel') }}</button>
          <button class="wtp-btn primary" :disabled="!saveForm.name" @click="confirmSave">{{ $t('widgetTemplate.instanceDialog.confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- 实例化变量赋值对话框 -->
    <div v-if="showInstanceDialog" class="wtp-modal-mask" @click.self="showInstanceDialog = false">
      <div class="wtp-modal">
        <h3>{{ $t('widgetTemplate.instanceDialog.title') }}</h3>
        <p class="wtp-instance-name">{{ instanceFull?.name }}</p>
        <template v-if="instanceVars.length">
          <label>{{ $t('widgetTemplate.instanceDialog.variables') }}</label>
          <div v-for="v in instanceVars" :key="v.key" class="wtp-var-row">
            <span class="wtp-var-label" :title="v.key">{{ v.label || v.key }}</span>
            <input
              v-model="instanceValues[v.key]"
              class="wtp-input"
              :placeholder="v.key"
            />
          </div>
        </template>
        <div class="wtp-modal-actions">
          <button class="wtp-btn" @click="showInstanceDialog = false">{{ $t('widgetTemplate.saveDialog.cancel') }}</button>
          <button class="wtp-btn primary" @click="confirmInstantiate">{{ $t('widgetTemplate.instanceDialog.confirm') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { i18n, MessageService, GraphicFactory, normalizeTemplateGraphics, usePageStore } from '@scada-editor/core';
import { useWidgetTemplateStore } from '@scada-editor/core';
import type { WidgetTemplate, WidgetTemplateMeta, WidgetTemplateVariable } from '@scada-editor/core';
import { applyVariables } from '@scada-editor/core';
import {
  onWidgetTemplateDrop,
  WIDGET_TEMPLATE_MIME,
} from './widget-template-drop-bus';
import TemplateVariableEditor from './TemplateVariableEditor.vue';

const { t } = i18n.global;
const $t = t;

const widgetStore = useWidgetTemplateStore();
const pageStore = usePageStore();

const category = ref('all');
const isLoading = ref(false);
const showSaveDialog = ref(false);
const saveForm = ref<{ name: string; description: string; category: string; variables: WidgetTemplateVariable[] }>({
  name: '',
  description: '',
  category: 'custom',
  variables: [],
});

const templates = computed(() => widgetStore.allTemplates());

// ── 实例化变量赋值对话框状态 ──
const showInstanceDialog = ref(false);
const instanceFull = ref<WidgetTemplate | null>(null);
const instanceValues = ref<Record<string, string | number>>({});
const instanceVars = computed(() => instanceFull.value?.variables || []);
let pendingDropPos: { x: number; y: number } | null = null;
let unsubDrop: (() => void) | null = null;

onMounted(async () => {
  isLoading.value = true;
  await widgetStore.loadTemplates();
  isLoading.value = false;
  // 订阅画布拖放（拖拽组件模板到画布指定位置）
  unsubDrop = onWidgetTemplateDrop(handleDropFromCanvas);
});

onUnmounted(() => {
  unsubDrop?.();
  unsubDrop = null;
});

function onCategoryChange() {
  widgetStore.setCategory(category.value);
}

function onDragStart(e: DragEvent, tpl: WidgetTemplateMeta) {
  e.dataTransfer?.setData(WIDGET_TEMPLATE_MIME, tpl.id);
  e.dataTransfer!.effectAllowed = 'copy';
}

/** 画布 drop：读取模板，有变量先弹赋值对话框，否则直接实例化到落点 */
async function handleDropFromCanvas(payload: { templateId: string; logicalPos: { x: number; y: number } }) {
  const page = pageStore.currentPage as any;
  if (!page) {
    MessageService.showWarning($t('widgetTemplate.gallery.selectGraphics'));
    return;
  }
  const full = await widgetStore.readTemplate(payload.templateId);
  if (!full) {
    MessageService.showError($t('widgetTemplate.gallery.loadFailed'));
    return;
  }
  if ((full.variables || []).length > 0) {
    pendingDropPos = payload.logicalPos;
    openInstanceDialog(full);
    return;
  }
  await instantiateFull(full, payload.logicalPos);
}

/** 双击/点击＋：将组件模板实例化到当前页（有变量时先弹赋值对话框） */
async function instantiate(tpl: WidgetTemplateMeta) {
  const page = pageStore.currentPage as any;
  if (!page) {
    MessageService.showWarning($t('widgetTemplate.gallery.selectGraphics'));
    return;
  }
  const full = await widgetStore.readTemplate(tpl.id);
  if (!full) {
    MessageService.showError($t('widgetTemplate.gallery.loadFailed'));
    return;
  }
  if ((full.variables || []).length > 0) {
    pendingDropPos = null;
    openInstanceDialog(full);
    return;
  }
  await instantiateFull(full);
}

function openInstanceDialog(full: WidgetTemplate) {
  instanceFull.value = full;
  const values: Record<string, string | number> = {};
  for (const v of full.variables || []) {
    values[v.key] = v.defaultValue ?? '';
  }
  instanceValues.value = values;
  showInstanceDialog.value = true;
}

async function confirmInstantiate() {
  const full = instanceFull.value;
  showInstanceDialog.value = false;
  if (!full) return;
  const pos = pendingDropPos;
  pendingDropPos = null;
  await instantiateFull(full, pos ?? undefined, { ...instanceValues.value });
}

/** 核心实例化：应用变量占位符替换，可选平移到目标坐标后逐个创建图元 */
async function instantiateFull(
  full: WidgetTemplate,
  atPos?: { x: number; y: number },
  values?: Record<string, string | number>,
) {
  const page = pageStore.currentPage as any;
  if (!page) {
    MessageService.showWarning($t('widgetTemplate.gallery.selectGraphics'));
    return;
  }
  const normalized = normalizeTemplateGraphics(full.graphics as Record<string, any>[]);
  // 合并变量值：调用方传入值优先，否则取模板默认值
  const merged: Record<string, string | number> = {};
  for (const v of full.variables || []) {
    merged[v.key] =
      values && values[v.key] !== undefined && values[v.key] !== ''
        ? values[v.key]
        : v.defaultValue ?? '';
  }
  const resolved = applyVariables(normalized, full.variables || [], merged);

  // 计算包围盒最小点，整体平移使模板对准落点
  let minX = Infinity;
  let minY = Infinity;
  for (const g of resolved) {
    if (typeof g?.x === 'number' && g.x < minX) minX = g.x;
    if (typeof g?.y === 'number' && g.y < minY) minY = g.y;
  }
  const dx = atPos && isFinite(minX) ? atPos.x - minX : 0;
  const dy = atPos && isFinite(minY) ? atPos.y - minY : 0;

  let count = 0;
  for (const g of resolved) {
    try {
      if (dx || dy) {
        if (typeof g?.x === 'number') g.x += dx;
        if (typeof g?.y === 'number') g.y += dy;
      }
      const graphic = GraphicFactory.createGraphicFromJSON(g);
      if (graphic) {
        page.addGraphic(graphic);
        count++;
      }
    } catch (err) {
      console.warn('[WidgetTemplatePanel] 图元实例化失败:', g.type, err);
    }
  }
  if (count > 0) {
    MessageService.showSuccess($t('widgetTemplate.gallery.inserted', { n: count }));
  }
}

/** 将当前选中的图元保存为组件模板 */
function saveSelectedAsTemplate() {
  const page = pageStore.currentPage as any;
  if (!page) {
    MessageService.showWarning($t('widgetTemplate.gallery.selectGraphics'));
    return;
  }
  const selectedIds: string[] = pageStore.selectedGraphicIds || [];
  if (!selectedIds.length) {
    MessageService.showWarning($t('widgetTemplate.gallery.selectGraphics'));
    return;
  }
  // 收集选中图元的序列化 JSON
  const allGraphics: any[] = page.graphics || [];
  const graphics = selectedIds
    .map((id: string) => allGraphics.find((g) => g.id === id))
    .filter(Boolean)
    .map((g: any) => (typeof g.toJSON === 'function' ? g.toJSON() : null))
    .filter(Boolean);
  if (!graphics.length) {
    MessageService.showWarning($t('widgetTemplate.gallery.selectGraphics'));
    return;
  }
  (saveForm.value as any)._graphics = graphics;
  saveForm.value.name = '';
  saveForm.value.description = '';
  saveForm.value.category = 'custom';
  saveForm.value.variables = [];
  showSaveDialog.value = true;
}

async function confirmSave() {
  const graphics = (saveForm.value as any)._graphics || [];
  const result = await widgetStore.saveAsWidgetTemplate({
    name: saveForm.value.name,
    description: saveForm.value.description,
    category: saveForm.value.category,
    graphics,
    variables: saveForm.value.variables.filter((v) => v.key),
  });
  showSaveDialog.value = false;
  delete (saveForm.value as any)._graphics;
  if (result) {
    MessageService.showSuccess($t('widgetTemplate.gallery.saved'));
  } else {
    MessageService.showError($t('widgetTemplate.gallery.saveFailed'));
  }
}

async function removeTemplate(tpl: WidgetTemplateMeta) {
  const ok = await widgetStore.deleteWidgetTemplate(tpl.id);
  if (ok) {
    MessageService.showSuccess($t('widgetTemplate.gallery.deleted'));
  } else {
    MessageService.showError($t('widgetTemplate.gallery.deleteFailed'));
  }
}
</script>

<style scoped>
.widget-template-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text);
  background: var(--panel);
}
.wtp-toolbar {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.wtp-select {
  flex: 1;
  background: var(--control-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
}
.wtp-btn {
  background: var(--control-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}
.wtp-btn.primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.wtp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.wtp-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.wtp-loading,
.wtp-empty {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
}
.wtp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 8px;
  background: var(--control-bg);
  cursor: grab;
}
.wtp-item:active {
  cursor: grabbing;
}
.wtp-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: var(--control-button-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.wtp-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.wtp-thumb-placeholder {
  font-size: 20px;
  color: var(--text-secondary);
}
.wtp-meta {
  flex: 1;
  min-width: 0;
}
.wtp-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wtp-sub {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.wtp-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--control-button-hover);
  color: var(--text-secondary);
}
.wtp-badge.src-builtin {
  background: #1e3a5f;
  color: #9ecbff;
}
.wtp-badge.src-user {
  background: #1e4d2b;
  color: #9ee6b0;
}
.wtp-badge.var {
  background: #4d3a1e;
  color: #ffd79e;
}
.wtp-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}
.wtp-icon {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}
.wtp-icon.danger:hover {
  background: #5c1e1e;
  color: #ff9e9e;
}
.wtp-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.wtp-modal {
  width: 320px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wtp-modal h3 {
  margin: 0 0 8px;
  font-size: 14px;
}
.wtp-modal label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.wtp-input {
  background: var(--control-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 13px;
}
.wtp-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
.wtp-instance-name {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
.wtp-var-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.wtp-var-label {
  flex: 0 0 88px;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
