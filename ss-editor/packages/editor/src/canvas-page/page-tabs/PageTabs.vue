<template>
  <div
    class="page-tabs"
    :style="themeStyles"
  >
    <button
      v-show="showLeftArrow"
      class="scroll-arrow scroll-arrow-left"
      :title="t('pageTabs.scrollLeft')"
      @click="scrollBy(-1)"
    >
      ‹
    </button>

    <div
      ref="tabsContainerRef"
      class="tabs-container"
      @wheel.prevent="handleWheel"
    >
      <div
        v-for="(page, index) in pages"
        :key="page.id"
        class="tab-item"
        :class="{
          active: page.id === currentPageId,
          dragging: dragIndex === index,
          'drag-over': dragOverIndex === index,
        }"
        :draggable="true"
        @click="switchPage(page.id)"
        @contextmenu.prevent.stop="openContextMenu($event, page, index)"
        @dragstart="handleDragStart($event, index)"
        @dragover.prevent="handleDragOver($event, index)"
        @dragleave="handleDragLeave(index)"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
      >
        <span
          v-if="page.icon"
          class="tab-icon"
        >{{ page.icon }}</span>
        <span
          v-else
          class="tab-icon tab-icon-default"
        >📄</span>
        <span class="tab-name">{{ page.name }}</span>
        <span
          v-if="page.dirty"
          class="tab-dirty"
          :title="t('pageTabs.dirtyMarker')"
        >●</span>
        <button
          class="tab-close"
          :disabled="pages.length <= 1"
          :title="t('pageTabs.closePage')"
          @click.stop="handleClosePage(page.id, page.name)"
        >
          ×
        </button>
      </div>
      <button
        class="add-tab-button"
        :title="t('pageTabs.addPage')"
        @click="openTemplateGallery"
      >
        +
      </button>
    </div>

    <button
      v-show="showRightArrow"
      class="scroll-arrow scroll-arrow-right"
      :title="t('pageTabs.scrollRight')"
      @click="scrollBy(1)"
    >
      ›
    </button>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="tab-context-menu"
        :style="contextMenuStyle"
        @click.stop
      >
        <div
          class="menu-item"
          @click="handleMenuAction('rename', contextMenu.targetPage)"
        >
          <span class="menu-icon">✏️</span>
          <span>{{ t('pageTabs.contextMenu.rename') }}</span>
        </div>
        <div
          class="menu-item"
          @click="handleMenuAction('duplicate', contextMenu.targetPage)"
        >
          <span class="menu-icon">📋</span>
          <span>{{ t('pageTabs.contextMenu.duplicate') }}</span>
        </div>
        <div
          class="menu-item"
          :class="{ disabled: !contextMenu.targetPage || pages.length <= 1 }"
          @click="handleMenuAction('copyGraphics', contextMenu.targetPage)"
        >
          <span class="menu-icon">📑</span>
          <span>{{ t('pageTabs.contextMenu.copyGraphics') }}</span>
        </div>
        <div class="menu-divider" />
        <div
          class="menu-item"
          :class="{ disabled: contextMenu.index === 0 }"
          @click="handleMenuAction('moveFirst', contextMenu.targetPage)"
        >
          <span class="menu-icon">⏮</span>
          <span>{{ t('pageTabs.contextMenu.moveFirst') }}</span>
        </div>
        <div
          class="menu-item"
          :class="{ disabled: contextMenu.index === 0 }"
          @click="handleMenuAction('movePrev', contextMenu.targetPage)"
        >
          <span class="menu-icon">◀</span>
          <span>{{ t('pageTabs.contextMenu.movePrev') }}</span>
        </div>
        <div
          class="menu-item"
          :class="{ disabled: contextMenu.index === pages.length - 1 }"
          @click="handleMenuAction('moveNext', contextMenu.targetPage)"
        >
          <span class="menu-icon">▶</span>
          <span>{{ t('pageTabs.contextMenu.moveNext') }}</span>
        </div>
        <div
          class="menu-item"
          :class="{ disabled: contextMenu.index === pages.length - 1 }"
          @click="handleMenuAction('moveLast', contextMenu.targetPage)"
        >
          <span class="menu-icon">⏭</span>
          <span>{{ t('pageTabs.contextMenu.moveLast') }}</span>
        </div>
        <div class="menu-divider" />
        <div
          class="menu-item"
          @click="handleMenuAction('setIcon', contextMenu.targetPage)"
        >
          <span class="menu-icon">{{ contextMenu.targetPage?.icon || '🖼' }}</span>
          <span>{{ t('pageTabs.contextMenu.setIcon') }}</span>
        </div>
        <div class="menu-divider" />
        <div
          class="menu-item"
          @click="handleMenuAction('saveAsTemplate', contextMenu.targetPage)"
        >
          <span class="menu-icon">💾</span>
          <span>{{ t('pageTabs.contextMenu.saveAsTemplate') }}</span>
        </div>
        <div class="menu-divider" />
        <div
          class="menu-item"
          :class="{ disabled: pages.length <= 1 }"
          @click="handleMenuAction('closeOther', contextMenu.targetPage)"
        >
          <span class="menu-icon">📌</span>
          <span>{{ t('pageTabs.contextMenu.closeOther') }}</span>
        </div>
        <div
          class="menu-item"
          :class="{ disabled: contextMenu.index >= pages.length - 1 }"
          @click="handleMenuAction('closeRight', contextMenu.targetPage)"
        >
          <span class="menu-icon">📌</span>
          <span>{{ t('pageTabs.contextMenu.closeRight') }}</span>
        </div>
        <div class="menu-divider" />
        <div
          class="menu-item menu-item-danger"
          :class="{ disabled: pageStore.pages.length <= 1 }"
          @click="handleMenuAction('remove', contextMenu.targetPage)"
        >
          <span class="menu-icon">🗑️</span>
          <span>{{ t('pageTabs.contextMenu.remove') }}</span>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="iconPicker.visible"
        class="icon-picker-overlay"
        @click="closeIconPicker"
      >
        <div
          class="icon-picker"
          @click.stop
        >
          <div class="icon-picker-header">
            <span>{{ t('pageTabs.iconPicker.title') }}</span>
            <button
              class="icon-picker-close"
              @click="closeIconPicker"
            >
              ×
            </button>
          </div>
          <div class="icon-picker-grid">
            <button
              v-for="emoji in iconOptions"
              :key="emoji"
              class="icon-picker-item"
              :class="{ active: iconPicker.targetPage?.icon === emoji }"
              @click="confirmIcon(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
          <div class="icon-picker-footer">
            <button
              class="icon-picker-clear"
              @click="confirmIcon('')"
            >
              {{ t('pageTabs.iconPicker.clear') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 模板库 -->
    <TemplateGallery
      :visible="templateGalleryVisible"
      :project-id="projectId"
      @close="templateGalleryVisible = false"
      @create="handleTemplateCreate"
    />

    <!-- 保存为模板对话框 -->
    <TemplateSaveDialog
      :visible="templateSaveDialogVisible"
      :page-name="saveAsTemplatePageName"
      :page-config="saveAsTemplatePageConfig"
      :graphics="saveAsTemplateGraphics"
      @close="templateSaveDialogVisible = false"
      @saved="handleTemplateSaved"
    />

    <!-- 模板同步对话框（引用模式） -->
    <TemplateSyncDialog
      :visible="syncDialogVisible"
      :template-name="syncTemplateName"
      :linked-pages="syncLinkedPages"
      @close="syncDialogVisible = false"
      @sync="handleSyncPages"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, nextTick } from 'vue';
import { usePageStore, useGraphicStore, useTheme, useTemplateStore, i18n, eventBus, GraphicFactory, normalizeTemplateGraphics, type PageTemplate } from '@scada-editor/core';
import { pageApi } from '@scada-editor/system';
import { showAlert, showConfirm, showPrompt, showConfirmSave } from '../../utils/messageBox';
import TemplateGallery from '../templates/TemplateGallery.vue';
import TemplateSaveDialog from '../templates/TemplateSaveDialog.vue';
import TemplateSyncDialog from '../templates/TemplateSyncDialog.vue';

const { t } = i18n.global;
const { themeStyles } = useTheme();
const pageStore = usePageStore();
const graphicStore = useGraphicStore();
const templateStore = useTemplateStore();

const props = defineProps({
  projectId: { type: String, default: '' },
});

const pages = computed(() => pageStore.openPages);
const currentPageId = computed(() => pageStore.currentPageId);

const tabsContainerRef = ref<HTMLElement | null>(null);
const showLeftArrow = ref(false);
const showRightArrow = ref(false);

const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  targetPage: null as any,
  index: -1,
});

const iconPicker = reactive({
  visible: false,
  targetPage: null as any,
});

// 模板相关状态
const templateGalleryVisible = ref(false);
const templateSaveDialogVisible = ref(false);
const saveAsTemplatePageName = ref('');
const saveAsTemplatePageConfig = ref({ width: 1920, height: 1080, backgroundColor: '#808080', layout: 'free' as const });
const saveAsTemplateGraphics = ref<any[]>([]);

// 模板同步状态
const syncDialogVisible = ref(false);
const syncTemplateName = ref('');
const syncLinkedPages = ref<Array<{ id: string; name: string }>>([]);
let syncTemplateGraphics: unknown[] = [];
let syncTemplatePageConfig: PageTemplate['pageConfig'] | null = null;

const iconOptions = ['📄', '🏠', '📊', '📈', '⚙️', '🔧', '🏭', '💡', '🔥', '⚡', '🌡', '💧', '🎛', '🚦', '📡', '🛢', '🛠', '🎨', '📋', '🌐', '📱', '💻', '🖥', '🎯'];

const contextMenuStyle = computed(() => {
  const x = Math.min(contextMenu.x, window.innerWidth - 200);
  const y = Math.min(contextMenu.y, window.innerHeight - 350);
  return { left: `${x}px`, top: `${y}px` };
});

function checkArrows() {
  const el = tabsContainerRef.value;
  if (!el) return;
  showLeftArrow.value = el.scrollLeft > 0;
  showRightArrow.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
}

function scrollBy(direction: number) {
  const el = tabsContainerRef.value;
  if (!el) return;
  el.scrollBy({ left: direction * 120, behavior: 'smooth' });
}

function handleWheel(e: WheelEvent) {
  const el = tabsContainerRef.value;
  if (!el) return;
  if (e.deltaX !== 0) {
    el.scrollLeft += e.deltaX;
  } else {
    el.scrollLeft += e.deltaY;
  }
  checkArrows();
}

async function switchPage(pageId: string) {
  const currentPage = pages.value.find(p => p.id === currentPageId.value);
  if (currentPage?.dirty && currentPage.id !== pageId) {
    const result = await showConfirmSave(
      t('pageTabs.dirtySwitchWarning', { name: currentPage.name }),
      t('pageTabs.dirtySwitchTitle')
    );
    if (result === 'cancel') return;
    if (result === 'save') {
      eventBus.emit('save-page');
    }
  }
  pageStore.setCurrentPage(pageId);
}

function openTemplateGallery() {
  templateGalleryVisible.value = true;
}

/** 从模板创建新页面 */
function handleTemplateCreate(template: PageTemplate) {
  const pageName = template.name || t('template.pageDefaultName');
  const newPage = pageStore.addPage(pageName);

  // 设置页面尺寸和背景色
  const page = newPage as any;
  if (template.pageConfig) {
    try {
      page.width = template.pageConfig.width;
      page.height = template.pageConfig.height;
      page.backgroundColor = template.pageConfig.backgroundColor;
    } catch { /* ignore */ }
  }

  // 引用模式：记录模板 ID，以便模板更新时同步
  if (templateStore.configMode === 'reference') {
    page.templateId = template.id;
    page.templateMode = 'reference';
  }

  // 还原图元：先规范化模板图元为标准格式，再通过 GraphicFactory 反序列化
  if (template.graphics && template.graphics.length > 0) {
    const normalized = normalizeTemplateGraphics(template.graphics as Record<string, any>[]);
    for (const g of normalized) {
      try {
        const graphic = GraphicFactory.createGraphicFromJSON(g);
        if (graphic) {
          page.addGraphic(graphic);
        }
      } catch (e) {
        console.warn('[PageTabs] Failed to create graphic from template:', g.type, e);
      }
    }
  }

  templateGalleryVisible.value = false;
}

/** 保存为模板 */
function openSaveAsTemplateDialog(page: any) {
  // 设置当前项目 ID，确保模板保存到项目级目录而非系统级
  templateStore.setCurrentProjectId(props.projectId || null);
  saveAsTemplatePageName.value = page.name || '';
  saveAsTemplatePageConfig.value = {
    width: page.width || 1920,
    height: page.height || 1080,
    backgroundColor: page.backgroundColor || '#808080',
    layout: 'free',
  };
  saveAsTemplateGraphics.value = page.getSafeGraphics?.() || page.graphics || [];
  templateSaveDialogVisible.value = true;
}

function handleTemplateSaved(template: PageTemplate) {
  templateSaveDialogVisible.value = false;

  // 引用模式：扫描已打开页面，找出引用此模板的页面
  if (templateStore.configMode === 'reference') {
    const linked = pageStore.pages
      .filter(p => p.templateId === template.id)
      .map((p: any) => ({ id: p.id, name: p.name }));

    if (linked.length > 0) {
      syncTemplateName.value = template.name;
      syncLinkedPages.value = linked;
      syncTemplateGraphics = template.graphics;
      syncTemplatePageConfig = template.pageConfig;
      syncDialogVisible.value = true;
    }
  }
}

/** 模板同步：将模板的图元和配置写入选中页面 */
function handleSyncPages(pageIds: string[]) {
  const normalizedGraphics = syncTemplateGraphics.length > 0
    ? normalizeTemplateGraphics(syncTemplateGraphics as Record<string, any>[])
    : [];

  for (const pageId of pageIds) {
    const page = pageStore.pages.find(p => p.id === pageId) as any;
    if (!page) continue;

    // 更新页面配置
    if (syncTemplatePageConfig) {
      page.width = syncTemplatePageConfig.width;
      page.height = syncTemplatePageConfig.height;
      page.backgroundColor = syncTemplatePageConfig.backgroundColor;
    }

    // 替换图元（清空后重新添加）
    if (page.graphics && typeof page.removeGraphic === 'function') {
      const currentGraphics = [...(page.graphics || [])];
      for (const g of currentGraphics) {
        try { page.removeGraphic(g.id); } catch { /* ignore */ }
      }
    }

    for (const g of normalizedGraphics) {
      try {
        const graphic = GraphicFactory.createGraphicFromJSON(g);
        if (graphic) {
          page.addGraphic(graphic);
        }
      } catch (e) {
        console.warn('[PageTabs] Sync graphic failed:', g.type, e);
      }
    }

    page.markDirty?.();
  }

  syncDialogVisible.value = false;
  syncTemplateGraphics = [];
  syncTemplatePageConfig = null;
}

async function handleClosePage(id: string, name: string) {
  if (pageStore.pages.length <= 1) {
    await showAlert(t('pageTabs.minPageKeep'), t('pageTabs.infoTitle'), 'info');
    return;
  }
  const openPages = pageStore.openPages;
  if (openPages.length <= 1) {
    await showAlert(t('pageTabs.minPageKeep'), t('pageTabs.infoTitle'), 'info');
    return;
  }
  const page: any = pageStore.pages.find(p => p.id === id);
  if (page?.dirty) {
    const result = await showConfirmSave(
      t('pageTabs.dirtyCloseWarning', { name }),
      t('pageTabs.closeConfirmTitle')
    );
    if (result === 'cancel') return;
    if (result === 'save') {
      eventBus.emit('save-page');
    }
  }
  pageStore.closePage(id);
}

async function handleRemove(id: string, name: string) {
  if (pageStore.pages.length <= 1) {
    await showAlert(t('pageTabs.minPageKeep'), t('pageTabs.infoTitle'), 'info');
    return;
  }
  const page: any = pageStore.pages.find(p => p.id === id);
  if (page?.dirty) {
    const result = await showConfirmSave(
      t('pageTabs.dirtyDeleteWarning', { name }),
      t('pageTabs.deleteConfirmTitle')
    );
    if (result === 'cancel') return;
    if (result === 'save') {
      eventBus.emit('save-page');
    }
  } else {
    const confirm = await showConfirm(
      t('pageTabs.normalDeleteWarning', { name }),
      t('pageTabs.deleteConfirmTitle')
    );
    if (!confirm) return;
  }
  const pageName = page?.name || name;
  const groupId = pageStore.pageGroupMap[id];
  const groupName = groupId
    ? pageStore.pageGroups.find(g => g.id === groupId)?.name
    : undefined;
  pageStore.removePage(id);
  // 同步删除服务端页面文件
  if (props.projectId) {
    pageApi.deletePage(props.projectId, pageName, groupName).catch(err => {
      console.warn('[PageTabs] 删除页面文件失败:', err);
    });
  }
}

async function handleCloseOtherPages(id: string) {
  const otherPages = pageStore.pages.filter(p => p.id !== id);
  const dirtyPages = otherPages.filter(p => p.dirty);
  if (dirtyPages.length > 0) {
    const result = await showConfirmSave(
      t('pageTabs.dirtyCloseOtherWarning', { count: dirtyPages.length }),
      t('pageTabs.closeConfirmTitle')
    );
    if (result === 'cancel') return;
    if (result === 'save') {
      eventBus.emit('save-page');
    }
  }
  pageStore.closeOtherPages(id);
}

async function handleCloseRightPages(id: string) {
  const index = pageStore.pages.findIndex(p => p.id === id);
  const rightPages = pageStore.pages.slice(index + 1);
  const dirtyPages = rightPages.filter(p => p.dirty);
  if (dirtyPages.length > 0) {
    const result = await showConfirmSave(
      t('pageTabs.dirtyCloseRightWarning', { count: dirtyPages.length }),
      t('pageTabs.closeConfirmTitle')
    );
    if (result === 'cancel') return;
    if (result === 'save') {
      eventBus.emit('save-page');
    }
  }
  pageStore.closeRightPages(id);
}

function openContextMenu(e: MouseEvent, page: any, index: number) {
  contextMenu.x = e.clientX;
  contextMenu.y = e.clientY;
  contextMenu.targetPage = page;
  contextMenu.index = index;
  contextMenu.visible = true;
  switchPage(page.id);
}

function closeContextMenu() {
  contextMenu.visible = false;
  contextMenu.targetPage = null;
  contextMenu.index = -1;
}

async function handleMenuAction(action: string, page: any) {
  if (!page) return;
  const id = page.id;
  closeContextMenu();

  switch (action) {
    case 'rename': {
      const newName = await showPrompt(
        t('pageTabs.renamePrompt'),
        page.name,
        t('pageTabs.renameTitle'),
        t('pageTabs.renamePlaceholder')
      );
      if (newName && newName.trim()) {
        pageStore.renamePage(id, newName.trim());
      }
      break;
    }
    case 'duplicate': {
      pageStore.copyPage(id);
      break;
    }
    case 'copyGraphics': {
      if (currentPageId.value === id) {
        await showAlert(t('pageTabs.cannotCopyToSelf'), t('pageTabs.infoTitle'), 'info');
        return;
      }
      const targetPage = pages.value.find(p => p.id === id);
      if (targetPage) {
        const confirmed = await showConfirm(
          t('pageTabs.confirmCopyGraphics', { name: targetPage.name })
        );
        if (confirmed) {
          graphicStore.copyPageGraphics(currentPageId.value, id);
        }
      }
      break;
    }
    case 'moveFirst': {
      pageStore.movePage(id, 'first');
      break;
    }
    case 'movePrev': {
      pageStore.movePage(id, 'prev');
      break;
    }
    case 'moveNext': {
      pageStore.movePage(id, 'next');
      break;
    }
    case 'moveLast': {
      pageStore.movePage(id, 'last');
      break;
    }
    case 'setIcon': {
      iconPicker.visible = true;
      iconPicker.targetPage = page;
      break;
    }
    case 'saveAsTemplate': {
      openSaveAsTemplateDialog(page);
      break;
    }
    case 'remove': {
      await handleRemove(id, page.name);
      break;
    }
    case 'closeOther': {
      await handleCloseOtherPages(id);
      break;
    }
    case 'closeRight': {
      await handleCloseRightPages(id);
      break;
    }
  }
}

function closeIconPicker() {
  iconPicker.visible = false;
  iconPicker.targetPage = null;
}

function confirmIcon(icon: string) {
  if (iconPicker.targetPage) {
    pageStore.setPageIcon(iconPicker.targetPage.id, icon);
  }
  closeIconPicker();
}

function handleDragStart(e: DragEvent, index: number) {
  dragIndex.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }
}

function handleDragOver(e: DragEvent, index: number) {
  if (dragIndex.value === null || dragIndex.value === index) return;
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  dragOverIndex.value = index;
}

function handleDragLeave(index: number) {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null;
  }
}

function handleDrop(e: DragEvent, index: number) {
  e.preventDefault();
  if (dragIndex.value === null || dragIndex.value === index) {
    resetDrag();
    return;
  }
  pageStore.reorderPages(dragIndex.value, index);
  resetDrag();
}

function handleDragEnd() {
  resetDrag();
}

function resetDrag() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}

function handleGlobalClick(e: MouseEvent) {
  const menu = document.querySelector('.tab-context-menu');
  if (contextMenu.visible && menu && !menu.contains(e.target as Node)) {
    closeContextMenu();
  }
}

function handleKeyboard(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
    const active = pages.value.find(p => p.id === currentPageId.value);
    if (active) {
      e.preventDefault();
      handleClosePage(active.id, active.name);
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick);
  document.addEventListener('keydown', handleKeyboard);
  nextTick(() => {
    checkArrows();
    const el = tabsContainerRef.value;
    if (el) el.addEventListener('scroll', checkArrows);
  });
  window.addEventListener('resize', checkArrows);
});

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick);
  document.removeEventListener('keydown', handleKeyboard);
  const el = tabsContainerRef.value;
  if (el) el.removeEventListener('scroll', checkArrows);
  window.removeEventListener('resize', checkArrows);
});
</script>


<style scoped>
.page-tabs {
  background-color: transparent;
  border-bottom: 1px solid var(--border);
  padding: 0 10px;
  height: 40px;
  display: flex;
  align-items: center;
  position: relative;
}

.scroll-arrow {
  width: 24px;
  height: 30px;
  border: 1px solid var(--border);
  background-color: var(--surface);
  color: var(--text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 2;
  transition: all 0.2s;
}

.scroll-arrow:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.tabs-container {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  padding: 0 4px;
}

.tabs-container::-webkit-scrollbar {
  height: 4px;
}

.tabs-container::-webkit-scrollbar-track {
  background: transparent;
}

.tabs-container::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.tabs-container::-webkit-scrollbar-thumb:hover {
  background: var(--border-light);
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  height: 30px;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  bottom: -1px;
  color: var(--text);
  font-size: 12px;
  user-select: none;
  flex-shrink: 0;
  min-width: 80px;
  max-width: 200px;
}

.tab-item:hover {
  background-color: var(--control-button-hover);
}

.tab-item.active {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
  z-index: 1;
}

.tab-item.dragging {
  opacity: 0.4;
}

.tab-item.drag-over {
  border-left: 3px solid var(--primary);
}

.tab-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.tab-icon-default {
  opacity: 0.5;
}

.tab-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.tab-dirty {
  color: #ff9800;
  font-size: 14px;
  flex-shrink: 0;
  line-height: 1;
}

.tab-item.active .tab-dirty {
  color: #fff5cc;
}

.tab-close {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  color: inherit;
  opacity: 0.6;
  flex-shrink: 0;
  padding: 0;
  line-height: 1;
  transition: all 0.2s;
}

.tab-close:hover {
  background-color: var(--primary-hover-overlay, rgba(255, 255, 255, 0.3));
  opacity: 1;
}

.tab-close:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.add-tab-button {
  width: 30px;
  height: 30px;
  border: 1px dashed var(--border);
  background-color: var(--surface);
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
  bottom: -1px;
  color: var(--text);
  flex-shrink: 0;
}

.add-tab-button:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
  border-style: solid;
}

/* 右键菜单 */
.tab-context-menu {
  position: fixed;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: var(--shadow-medium);
  z-index: 9999;
  min-width: 180px;
  padding: 4px 0;
  font-size: 13px;
  color: var(--text);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.menu-item:hover {
  background-color: var(--control-button-hover);
}

.menu-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.menu-item.disabled:hover {
  background-color: transparent;
}

.menu-item-danger {
  color: var(--status-error);
}

.menu-item-danger:hover {
  background-color: rgba(244, 67, 54, 0.1);
}

.menu-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.menu-divider {
  height: 1px;
  background-color: var(--border);
  margin: 4px 0;
}

/* 图标选择器 */
.icon-picker-overlay {
  position: fixed;
  inset: 0;
  background: var(--backdrop, rgba(0, 0, 0, 0.4));
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-picker {
  background-color: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-large);
  width: 380px;
  max-width: 90vw;
  padding: 16px;
}

.icon-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.icon-picker-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--text);
}

.icon-picker-close:hover {
  background-color: var(--control-button-hover);
}

.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  max-height: 280px;
  overflow-y: auto;
}

.icon-picker-item {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  background-color: var(--surface);
  border-radius: 4px;
  cursor: pointer;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-picker-item:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
  transform: scale(1.05);
}

.icon-picker-item.active {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
}

.icon-picker-footer {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.icon-picker-clear {
  padding: 6px 12px;
  border: 1px solid var(--border);
  background-color: var(--surface);
  color: var(--text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.icon-picker-clear:hover {
  background-color: var(--control-button-hover);
}
</style>
