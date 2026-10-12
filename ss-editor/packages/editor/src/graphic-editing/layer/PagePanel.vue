<template>
  <div
    class="page-panel"
    :style="themeStyles"
  >
    <div class="page-panel-header">
      <div class="page-panel-header-actions">
        <button
          class="page-add-btn"
          :title="$t('pagePanel.addPage')"
          @click="handleAddPage"
        >
          📄
        </button>
        <button
          class="group-add-btn"
          :title="$t('pagePanel.addGroup')"
          @click="handleAddGroup"
        >
          +
        </button>
        <button
          class="group-toggle-all-btn"
          :title="allExpanded ? $t('pagePanel.collapseAll') : $t('pagePanel.expandAll')"
          @click="toggleAllGroups"
        >
          {{ allExpanded ? '⊟' : '⊞' }}
        </button>
        <button
          class="page-refresh-btn"
          :title="$t('pagePanel.refresh')"
          @click="handleRefresh"
        >
          ↻
        </button>
        <div
          ref="importWrapperRef"
          class="page-import-wrapper"
        >
          <button
            class="page-import-btn"
            :title="$t('pagePanel.import')"
            @click.stop="toggleImportMenu"
          >
            📥
          </button>
          <div
            v-if="importMenuVisible"
            class="import-dropdown-menu"
          >
            <div
              class="dropdown-item"
              @click="handleImportZip"
            >
              <span class="dropdown-icon">📦</span>
              <span>{{ $t('pagePanel.importZip') }}</span>
            </div>
            <div
              class="dropdown-item"
              @click="handleImportJson"
            >
              <span class="dropdown-icon">📄</span>
              <span>{{ $t('pagePanel.importJson') }}</span>
            </div>
            <div
              class="dropdown-item"
              @click="handleImportDirectory"
            >
              <span class="dropdown-icon">📁</span>
              <span>{{ $t('pagePanel.importDirectory') }}</span>
            </div>
          </div>
        </div>
        <button
          class="page-export-btn"
          :title="$t('pagePanel.export')"
          @click="handleExport"
        >
          📤
        </button>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="zipInputRef"
      type="file"
      accept=".zip"
      style="display: none"
      @change="onZipFileSelected"
    >
    <input
      ref="jsonInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="onJsonFileSelected"
    >
    <input
      ref="dirInputRef"
      type="file"
      webkitdirectory
      directory
      style="display: none"
      @change="onDirectorySelected"
    >

    <div class="page-panel-groups">
      <div
        v-for="group in pageGroups"
        :key="group.id"
        class="group-item"
        :class="{
          'group-item-active': selectedGroupId === group.id,
          'group-drag-over': dragOverGroupId === group.id,
        }"
      >
        <div
          class="group-header"
          @click="toggleGroupExpand(group.id)"
          @dragover.prevent="onDragOverGroup($event, group.id)"
          @dragenter.prevent="onDragEnterGroup(group.id)"
          @dragleave="onDragLeaveGroup(group.id)"
          @drop="onDropInGroup($event, group.id)"
        >
          <span
            class="group-arrow"
            :class="{ expanded: expandedGroups.has(group.id) }"
          >▶</span>
          <span class="group-name">{{ stripPrefix(group.name) }}</span>
          <span class="group-count">({{ getGroupPageCount(group.id) }})</span>
          <div class="group-actions">
            <button
              class="group-action-btn"
              :title="$t('pagePanel.addPageToGroup')"
              @click.stop="handleAddPageToGroup(group.id)"
            >
              +
            </button>
            <button
              class="group-action-btn group-action-rename"
              :title="$t('pagePanel.renameGroup')"
              @click.stop="handleRenameGroup(group.id)"
            >
              ✎
            </button>
            <button
              class="group-action-btn group-action-delete"
              :title="$t('pagePanel.deleteGroup')"
              @click.stop="handleDeleteGroup(group.id)"
            >
              ×
            </button>
          </div>
        </div>

        <div
          v-show="expandedGroups.has(group.id)"
          class="group-pages"
        >
          <div
            v-for="(page, _index) in getGroupPages(group.id)"
            :key="page.id"
            class="page-item"
            :class="{
              'page-item-active': page.id === currentPageId,
              'page-item-dragging': page.id === draggedPageId,
              'page-item-drag-over': page.id === dragOverPageId,
            }"
            :data-page-id="page.id"
            draggable="true"
            @click="switchPage(page.id)"
            @contextmenu.prevent="openPageContextMenu($event, page)"
            @dragstart="onDragStart($event, page, group.id)"
            @dragend="onDragEnd"
            @dragover.prevent="onDragOverPage($event, page)"
            @dragenter.prevent="onDragEnterPage(page.id)"
            @dragleave="onDragLeavePage"
            @drop="onDropOnPage($event, page)"
          >
            <span class="page-item-drag-handle">⠿</span>
            <img
              v-if="previewUrls[page.id]"
              :src="previewUrls[page.id]"
              class="page-item-preview"
              @error="() => onPreviewError(page.id)"
            >
            <span
              v-else
              class="page-item-preview-loading"
            />
            <span class="page-item-name">{{ page.name || 'Untitled' }}</span>
            <span
              v-if="page.id === currentPageId"
              class="page-item-badge"
            >{{ $t('pagePanel.current') }}</span>
            <button
              class="page-item-remove"
              :title="$t('pagePanel.deletePage')"
              @click.stop="handleRemovePage(page.id)"
            >
              ×
            </button>
          </div>
          <div
            v-if="getGroupPages(group.id).length === 0"
            class="group-empty"
            :class="{ 'group-empty-drag-over': dragOverGroupId === group.id }"
            @dragover.prevent="onDragOverGroup($event, group.id)"
            @drop="onDropInGroup($event, group.id)"
          >
            {{ $t('pagePanel.emptyGroup') }}
          </div>
        </div>
      </div>

      <div
        v-if="ungroupedPages.length > 0 || pageGroups.length === 0"
        class="ungrouped-section"
        :class="{ 'ungrouped-drag-over': dragOverGroupId === '__ungrouped__' }"
        @dragover.prevent="onDragOverUngrouped"
        @dragenter.prevent="onDragEnterUngrouped"
        @dragleave="onDragLeaveUngrouped"
        @drop="onDropInUngrouped"
      >
        <div
          v-for="page in ungroupedPages"
          :key="page.id"
          class="page-item"
          :class="{
            'page-item-active': page.id === currentPageId,
            'page-item-dragging': page.id === draggedPageId,
            'page-item-drag-over': page.id === dragOverPageId,
          }"
          :data-page-id="page.id"
          draggable="true"
          @click="switchPage(page.id)"
          @contextmenu.prevent="openPageContextMenu($event, page)"
          @dragstart="onDragStart($event, page, null)"
          @dragend="onDragEnd"
          @dragover.prevent="onDragOverPage($event, page)"
          @dragenter.prevent="onDragEnterPage(page.id)"
          @dragleave="onDragLeavePage"
          @drop="onDropOnPage($event, page)"
        >
          <span class="page-item-drag-handle">⠿</span>
          <img
            v-if="previewUrls[page.id]"
            :src="previewUrls[page.id]"
            class="page-item-preview"
            @error="() => onPreviewError(page.id)"
          >
          <span
            v-else
            class="page-item-preview-loading"
          />
          <span class="page-item-name">{{ page.name || 'Untitled' }}</span>
          <span
            v-if="page.id === currentPageId"
            class="page-item-badge"
          >{{ $t('pagePanel.current') }}</span>
          <button
            class="page-item-remove"
            :title="$t('pagePanel.deletePage')"
            @click.stop="handleRemovePage(page.id)"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <div class="page-panel-footer">
      <span class="footer-stats">📊 {{ pages.length }} {{ $t('pagePanel.pages') }} · {{ pageGroups.length }} {{ $t('pagePanel.groups') }}</span>
    </div>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="page-context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop="closeContextMenu"
      >
        <div
          class="menu-item"
          @click="handleContextAddPage"
        >
          <span>{{ $t('pagePanel.addPage') }}</span>
        </div>
        <div
          class="menu-item"
          @click="handleContextAddGroup"
        >
          <span>{{ $t('pagePanel.addGroup') }}</span>
        </div>
        <div class="menu-divider" />
        <div
          class="menu-item"
          @click="handleContextRename"
        >
          <span>{{ $t('pagePanel.rename') }}</span>
        </div>
        <div
          class="menu-item"
          @click="handleContextDuplicate"
        >
          <span>{{ $t('pagePanel.duplicate') }}</span>
        </div>
        <div class="menu-divider" />
        <div
          v-for="group in pageGroups"
          :key="'move-' + group.id"
          class="menu-item"
          @click="handleMoveToGroup(group.id)"
        >
          <span>{{ $t('pagePanel.moveToGroup') }}: {{ stripPrefix(group.name) }}</span>
        </div>
        <div
          v-if="contextMenu.pageGroupId"
          class="menu-item"
          @click="handleRemoveFromGroup"
        >
          <span>{{ $t('pagePanel.removeFromGroup') }}</span>
        </div>
        <div class="menu-divider" />
        <div
          class="menu-item menu-item-danger"
          @click="handleContextDelete"
        >
          <span>{{ $t('pagePanel.delete') }}</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue';
import { usePageStore, useTheme, i18n, eventBus } from '@scada-editor/core';
import { useProjectStore, getToken, pageApi } from '@scada-editor/system';
import { showPrompt, showConfirm } from '../../utils/messageBox';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const { t } = i18n.global;
const $t = t;
const { themeStyles } = useTheme();
const pageStore = usePageStore();
const projectStore = useProjectStore();

const expandedGroups = ref<Set<string>>(new Set());
const selectedGroupId = ref<string | null>(null);

const draggedPageId = ref<string | null>(null);
const draggedPageGroupId = ref<string | null>(null);
const dragOverPageId = ref<string | null>(null);
const dragOverGroupId = ref<string | null>(null);

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  page: null as any,
  pageGroupId: null as string | null,
});

// ─── 页面预览图 ───
const previewUrls = ref<Record<string, string>>({});
const previewLoading = ref<Set<string>>(new Set());

/** 内置占位图（preview_small.png 尺寸 80x54 的纯 CSS 风格 SVG） */
const NO_PREVIEW_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="54" viewBox="0 0 80 54">' +
  '<rect width="80" height="54" fill="#e8e8e8" rx="4"/>' +
  '<rect x="28" y="13" width="24" height="18" rx="2" fill="#d0d0d0"/>' +
  '<path d="M20 42 L32 28 L44 36 L56 22 L68 42" stroke="#d0d0d0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
  '<circle cx="52" cy="19" r="3.5" fill="#d0d0d0"/>' +
  '</svg>'
);

/** 安全去前缀：去除 p_/g_ 前缀 */
function stripPrefix(name: string): string {
  return name.replace(/^(p_|g_)/, '');
}

/** 从 URL 路径中提取项目 ID（/editor/:projectId） */
function getProjectIdFromPath(): string {
  const match = window.location.pathname.match(/\/editor\/([^/]+)/);
  return match ? match[1] : '';
}

const projectId = computed(() => projectStore.currentProject?.projectId || getProjectIdFromPath());

function buildPreviewUrl(pageName: string, groupName?: string): string {
  const base = `/api/v1/projects/${projectId.value}/pages/${encodeURIComponent(pageName)}/preview_small.png`;
  return groupName ? `${base}?group=${encodeURIComponent(groupName)}` : base;
}

async function loadPreview(pageId: string, pageName: string, groupName?: string, previewSmallUrl?: string) {
  if (!projectId.value || previewLoading.value.has(pageId) || previewUrls.value[pageId]) return;

  previewLoading.value.add(pageId);
  try {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    // 优先使用大纲返回的 URL，没有则构造
    const url = previewSmallUrl || buildPreviewUrl(pageName, groupName);
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    previewUrls.value[pageId] = URL.createObjectURL(blob);
  } catch {
    // 图片不存在或加载失败时使用内置占位图
    previewUrls.value[pageId] = NO_PREVIEW_PLACEHOLDER;
  } finally {
    previewLoading.value.delete(pageId);
  }
}

function onPreviewError(pageId: string) {
  const current = previewUrls.value[pageId];
  if (current && current !== NO_PREVIEW_PLACEHOLDER) {
    URL.revokeObjectURL(current);
  }
  previewUrls.value[pageId] = NO_PREVIEW_PLACEHOLDER;
}

async function loadAllPreviews() {
  if (!projectId.value) return;

  const pageEntries = pages.value.map(p => ({
    id: p.id,
    name: p.name || p.id,
    group: pageStore.pageGroupMap[p.id] || undefined,
    previewSmallUrl: (p as any).previewSmallUrl,
  }));

  // 并发加载尚未请求过的页面，每次最多 4 个
  const CONCURRENCY = 4;
  const toLoad = pageEntries.filter((e) => !previewUrls.value[e.id]);
  for (let i = 0; i < toLoad.length; i += CONCURRENCY) {
    const batch = toLoad.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (entry) => {
        await loadPreview(entry.id, entry.name, entry.group, entry.previewSmallUrl);
      })
    );
  }
}

function clearPreviews() {
  for (const url of Object.values(previewUrls.value)) {
    if (url !== NO_PREVIEW_PLACEHOLDER) {
      URL.revokeObjectURL(url);
    }
  }
  previewUrls.value = {};
  previewLoading.value = new Set();
}

// 导入相关
const zipInputRef = ref<HTMLInputElement | null>(null);
const jsonInputRef = ref<HTMLInputElement | null>(null);
const dirInputRef = ref<HTMLInputElement | null>(null);
const importMenuVisible = ref(false);
const importWrapperRef = ref<HTMLElement | null>(null);

const pages = computed(() => pageStore.pages || []);
const currentPageId = computed(() => pageStore.currentPage?.id);
const pageGroups = computed(() => pageStore.pageGroups || []);
const ungroupedPages = computed(() => pageStore.getUngroupedPages || []);

// 全部展开/折叠状态
const allExpanded = computed(() => {
  if (pageGroups.value.length === 0) return false;
  return pageGroups.value.every(g => expandedGroups.value.has(g.id));
});

function getGroupPageCount(groupId: string): number {
  return pageStore.getPagesByGroup(groupId)?.length || 0;
}

function getGroupPages(groupId: string) {
  return pageStore.getPagesByGroup(groupId) || [];
}

function switchPage(pageId: string) {
  const target = pages.value.find(p => p.id === pageId);
  if (target) {
    pageStore.setCurrentPage(target.id);
  }
}

// ─── 分组折叠/展开 ───
function toggleGroupExpand(groupId: string) {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId);
  } else {
    expandedGroups.value.add(groupId);
  }
}

function toggleAllGroups() {
  if (allExpanded.value) {
    // 全部折叠
    expandedGroups.value = new Set();
  } else {
    // 全部展开
    expandedGroups.value = new Set(pageGroups.value.map(g => g.id));
  }
}

// ─── 导入/导出 ───
function toggleImportMenu() {
  importMenuVisible.value = !importMenuVisible.value;
}

function closeImportMenu() {
  importMenuVisible.value = false;
}

// 导入 ZIP 压缩包
function handleImportZip() {
  closeImportMenu();
  zipInputRef.value?.click();
}

// 导入 JSON 文件
function handleImportJson() {
  closeImportMenu();
  jsonInputRef.value?.click();
}

// 导入目录
function handleImportDirectory() {
  closeImportMenu();
  dirInputRef.value?.click();
}

async function onZipFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const zip = await JSZip.loadAsync(file);
    const pageFiles: { name: string; data: any }[] = [];

    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      if (filename.endsWith('.json')) {
        const content = await zipEntry.async('string');
        try {
          const data = JSON.parse(content);
          // 提取文件名（去掉路径和 .json 后缀）
          const baseName = filename.split('/').pop()?.replace('.json', '') || filename;
          pageFiles.push({ name: baseName, data });
        } catch {
          console.warn(`[PagePanel] Failed to parse JSON from zip entry: ${filename}`);
        }
      }
    }

    if (pageFiles.length === 0) {
      await showPrompt('', '', t('pagePanel.noPagesFoundInZip') || 'ZIP中没有找到有效的页面文件');
      return;
    }

    importPageData(pageFiles);
  } catch (err: any) {
    console.error('[PagePanel] Failed to read zip file:', err);
    await showPrompt('', '', t('pagePanel.zipReadError') || '读取ZIP文件失败');
  }

  // 重置 input 以便可以重新选择相同文件
  input.value = '';
}

async function onJsonFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const content = await file.text();
    const data = JSON.parse(content);

    if (Array.isArray(data)) {
      // 如果是一个页面数组
      const pageFiles = data.map((pageData: any, _index: number) => ({
        name: pageData.name || file.name.replace('.json', ''),
        data: pageData,
      }));
      importPageData(pageFiles);
    } else {
      // 单个页面
      importPageData([{ name: data.name || file.name.replace('.json', ''), data }]);
    }
  } catch (err: any) {
    console.error('[PagePanel] Failed to read JSON file:', err);
    await showPrompt('', '', t('pagePanel.jsonReadError') || '读取JSON文件失败');
  }

  input.value = '';
}

async function onDirectorySelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;

  const pageFiles: { name: string; data: any }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.name.endsWith('.json')) {
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        const baseName = file.webkitRelativePath?.split('/').pop()?.replace('.json', '') || file.name.replace('.json', '');
        pageFiles.push({ name: baseName, data });
      } catch {
        console.warn(`[PagePanel] Failed to parse JSON from directory file: ${file.name}`);
      }
    }
  }

  if (pageFiles.length === 0) {
    await showPrompt('', '', t('pagePanel.noPagesFoundInDir') || '目录中没有找到有效的JSON页面文件');
    return;
  }

  importPageData(pageFiles);
  input.value = '';
}

async function importPageData(pageFiles: { name: string; data: any }[]) {
  // 动态导入 GraphicFactory 避免循环依赖导致生产构建 TDZ 错误
  const { GraphicFactory } = await import('@scada-editor/core');

  for (const { name, data } of pageFiles) {
    // 检查是否有重名页面
    const existingPage = pages.value.find(p => p.name === name);
    const pageName = existingPage ? `${name}_imported` : name;

    // 创建新页面
    const newPage = pageStore.addPage(pageName);

    // 如果导入的数据包含页面属性，则更新
    if (data && typeof data === 'object') {
      const updateData: any = {};
      if (data.width) updateData.width = data.width;
      if (data.height) updateData.height = data.height;
      if (data.backgroundColor) updateData.backgroundColor = data.backgroundColor;
      if (data.backgroundImage) updateData.backgroundImage = data.backgroundImage;
      if (data.themeColors) updateData.themeColors = data.themeColors;

      if (Object.keys(updateData).length > 0) {
        pageStore.updatePage(newPage.id, updateData);
      }

      // 导入图元
      if (data.graphics && Array.isArray(data.graphics)) {
        const targetPage = pages.value.find(p => p.id === newPage.id);
        if (targetPage) {
          for (const gData of data.graphics) {
            try {
              const graphic = GraphicFactory.createGraphicFromJSON(gData);
              targetPage.addGraphic(graphic);
            } catch (e) {
              console.warn(`[PagePanel] Failed to import graphic:`, e);
            }
          }
        }
      }
    }
  }

  eventBus.emit('page-imported', { count: pageFiles.length });
}

// 导出所有页面
async function handleExport() {
  try {
    const zip = new JSZip();

    // 导出每个页面为单独的 JSON 文件
    for (const page of pages.value) {
      const jsonData = page.toJSON();
      // 使用页面的 toJSONAsync 以处理 blob URL
      let pageJson: any;
      try {
        if (typeof (page as any).toJSONAsync === 'function') {
          pageJson = await (page as any).toJSONAsync();
        } else {
          pageJson = jsonData;
        }
      } catch {
        pageJson = jsonData;
      }

      const fileName = `${page.name || page.id}.json`;
      zip.file(fileName, JSON.stringify(pageJson, null, 2));
    }

    // 导出分组信息
    const groupsData = {
      pageGroups: pageGroups.value,
      pageGroupMap: pageStore.pageGroupMap,
    };
    zip.file('_page_groups.json', JSON.stringify(groupsData, null, 2));

    // 生成并下载 ZIP
    const blob = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    saveAs(blob, `pages_export_${timestamp}.zip`);
  } catch (err: any) {
    console.error('[PagePanel] Failed to export pages:', err);
    await showPrompt('', '', t('pagePanel.exportError') || '导出页面失败');
  }
}

// ─── 分组操作 ───
async function handleAddGroup() {
  const name = await showPrompt(
    t('pagePanel.addGroupPrompt'),
    '',
    t('pagePanel.addGroup')
  );
  if (name && name.trim()) {
    const group = pageStore.addPageGroup(name.trim());
    expandedGroups.value.add(group.id);
    eventBus.emit('page-group-created', { groupId: group.id, groupName: group.name });
  }
}

async function handleRenameGroup(groupId: string) {
  const group = pageGroups.value.find(g => g.id === groupId);
  if (!group) return;
  const oldName = group.name; // 在 await 前保存，防止异步期间数据变化
  const name = await showPrompt(
    t('pagePanel.renameGroupPrompt'),
    stripPrefix(oldName),
    t('pagePanel.renameGroup')
  );
  if (name && name.trim()) {
    pageStore.renamePageGroup(groupId, name.trim());
    eventBus.emit('page-group-renamed', { groupId, oldName, newName: name.trim() });
  }
}

async function handleDeleteGroup(groupId: string) {
  const group = pageGroups.value.find(g => g.id === groupId);
  if (!group) return;
  const confirmed = await showConfirm(
    t('pagePanel.deleteGroupConfirm', { name: group.name })
  );
  if (confirmed) {
    expandedGroups.value.delete(groupId);
    pageStore.removePageGroup(groupId);
    eventBus.emit('page-group-deleted', { groupId, groupName: group.name });
  }
}

async function handleAddPage() {
  const name = await showPrompt(
    t('pagePanel.newPagePrompt'),
    '',
    t('pagePanel.newPage')
  );
  if (name && name.trim()) {
    pageStore.addPage(name.trim());
  }
}

function handleRefresh() {
  eventBus.emit('page-refresh');
}

async function handleAddPageToGroup(groupId: string) {
  const name = await showPrompt(
    t('pagePanel.newPagePrompt'),
    '',
    t('pagePanel.newPage')
  );
  if (name && name.trim()) {
    pageStore.addPage(name.trim(), groupId);
    expandedGroups.value.add(groupId);
  }
}

async function handleRemovePage(pageId: string) {
  if (pages.value.length <= 1) return;
  const page = pageStore.pages.find(p => p.id === pageId);
  const pageName = page?.name || '';
  const confirmed = await showConfirm(
    t('pagePanel.deletePageConfirm', { name: pageName }),
    t('pagePanel.deletePage')
  );
  if (!confirmed) return;

  const groupId = pageStore.pageGroupMap[pageId];
  const groupName = groupId
    ? pageStore.pageGroups.find(g => g.id === groupId)?.name
    : undefined;

  pageStore.removePage(pageId);
  // 同步删除服务端页面文件
  if (projectId.value) {
    pageApi.deletePage(projectId.value, pageName, groupName).catch(err => {
      console.warn('[PagePanel] 删除页面文件失败:', err);
    });
  }
}

// ─── 右键菜单 ───
function openPageContextMenu(e: MouseEvent, page: any) {
  const pageGroupId = pageStore.pageGroupMap[page.id] || null;
  contextMenu.x = e.clientX;
  contextMenu.y = e.clientY;
  contextMenu.page = page;
  contextMenu.pageGroupId = pageGroupId;
  contextMenu.visible = true;
}

function closeContextMenu() {
  contextMenu.visible = false;
  contextMenu.page = null;
}

function getGroupNameById(groupId: string | null): string | undefined {
  if (!groupId) return undefined;
  const group = pageGroups.value.find(g => g.id === groupId);
  return group?.name;
}

async function handleContextAddPage() {
  closeContextMenu();
  await handleAddPage();
}

async function handleContextAddGroup() {
  closeContextMenu();
  await handleAddGroup();
}

// ─── 拖拽相关 ───
function onDragStart(e: DragEvent, page: any, groupId: string | null) {
  draggedPageId.value = page.id;
  draggedPageGroupId.value = groupId;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', page.id);
  }
}

function onDragEnd() {
  draggedPageId.value = null;
  draggedPageGroupId.value = null;
  dragOverPageId.value = null;
  dragOverGroupId.value = null;
}

function onDragOverPage(e: DragEvent, page: any) {
  if (!draggedPageId.value || draggedPageId.value === page.id) return;
  const sameGroup = draggedPageGroupId.value === pageStore.pageGroupMap[page.id];
  if (sameGroup) {
    dragOverPageId.value = page.id;
  }
}

function onDragEnterPage(pageId: string) {
  if (!draggedPageId.value || draggedPageId.value === pageId) return;
  dragOverPageId.value = pageId;
}

function onDragLeavePage() {
  dragOverPageId.value = null;
}

function onDropOnPage(e: DragEvent, targetPage: any) {
  e.preventDefault();
  if (!draggedPageId.value || draggedPageId.value === targetPage.id) return;
  const sourceGroupId = draggedPageGroupId.value;
  const targetGroupId = pageStore.pageGroupMap[targetPage.id] || null;
  if (sourceGroupId === targetGroupId) {
    pageStore.reorderPageInGroup(draggedPageId.value, targetPage.id);
  }
  onDragEnd();
}

function onDragOverGroup(e: DragEvent, _groupId: string) {
  if (!draggedPageId.value) return;
  e.preventDefault();
}

function onDragEnterGroup(groupId: string) {
  if (!draggedPageId.value) return;
  dragOverGroupId.value = groupId;
}

function onDragLeaveGroup(groupId: string) {
  if (dragOverGroupId.value === groupId) {
    dragOverGroupId.value = null;
  }
}

function onDropInGroup(e: DragEvent, groupId: string) {
  e.preventDefault();
  if (!draggedPageId.value) return;
  const sourceGroupId = draggedPageGroupId.value;
  if (sourceGroupId !== groupId) {
    const page = pageStore.pages.find(p => p.id === draggedPageId.value);
    const sourceGroupName = getGroupNameById(sourceGroupId);
    const targetGroupName = getGroupNameById(groupId);
    pageStore.movePageToGroup(draggedPageId.value, groupId);
    expandedGroups.value.add(groupId);
    eventBus.emit('page-moved', {
      pageId: draggedPageId.value,
      pageName: page?.name || '',
      fromGroupName: sourceGroupName,
      toGroupName: targetGroupName,
    });
  }
  onDragEnd();
}

function onDragOverUngrouped(e: DragEvent) {
  if (!draggedPageId.value) return;
  e.preventDefault();
}

function onDragEnterUngrouped() {
  if (!draggedPageId.value) return;
  dragOverGroupId.value = '__ungrouped__';
}

function onDragLeaveUngrouped() {
  if (dragOverGroupId.value === '__ungrouped__') {
    dragOverGroupId.value = null;
  }
}

function onDropInUngrouped(e: DragEvent) {
  e.preventDefault();
  if (!draggedPageId.value) return;
  const sourceGroupId = draggedPageGroupId.value;
  if (sourceGroupId) {
    const page = pageStore.pages.find(p => p.id === draggedPageId.value);
    const sourceGroupName = getGroupNameById(sourceGroupId);
    pageStore.removePageFromGroup(draggedPageId.value);
    eventBus.emit('page-moved', {
      pageId: draggedPageId.value,
      pageName: page?.name || '',
      fromGroupName: sourceGroupName,
      toGroupName: undefined,
    });
  }
  onDragEnd();
}

// ─── 右键菜单操作 ───
async function handleContextRename() {
  if (!contextMenu.page) return;
  const page = contextMenu.page; // 在 await 前保存引用，防止菜单关闭后 contextMenu.page 变为 null
  const oldName = page.name;
  const name = await showPrompt(
    t('pagePanel.renamePrompt'),
    oldName,
    t('pagePanel.rename')
  );
  if (name && name.trim() && name.trim() !== oldName) {
    const newName = name.trim();
    pageStore.renamePage(page.id, newName);
    const groupId = pageStore.pageGroupMap[page.id];
    const groupName = getGroupNameById(groupId);
    eventBus.emit('page-renamed', {
      pageId: page.id,
      oldName,
      newName,
      groupName,
    });
  }
  closeContextMenu();
}

function handleContextDuplicate() {
  if (!contextMenu.page) return;
  pageStore.copyPage(contextMenu.page.id);
  closeContextMenu();
}

function handleMoveToGroup(groupId: string) {
  if (!contextMenu.page) return;
  const sourceGroupId = pageStore.pageGroupMap[contextMenu.page.id] || null;
  const sourceGroupName = getGroupNameById(sourceGroupId);
  const targetGroupName = getGroupNameById(groupId);
  pageStore.movePageToGroup(contextMenu.page.id, groupId);
  eventBus.emit('page-moved', {
    pageId: contextMenu.page.id,
    pageName: contextMenu.page.name,
    fromGroupName: sourceGroupName,
    toGroupName: targetGroupName,
  });
  closeContextMenu();
}

function handleRemoveFromGroup() {
  if (!contextMenu.page) return;
  const sourceGroupId = pageStore.pageGroupMap[contextMenu.page.id] || null;
  const sourceGroupName = getGroupNameById(sourceGroupId);
  pageStore.removePageFromGroup(contextMenu.page.id);
  eventBus.emit('page-moved', {
    pageId: contextMenu.page.id,
    pageName: contextMenu.page.name,
    fromGroupName: sourceGroupName,
    toGroupName: undefined,
  });
  closeContextMenu();
}

async function handleContextDelete() {
  if (!contextMenu.page) return;
  if (pages.value.length <= 1) return;

  const page = contextMenu.page;
  const pageName = page.name || '';
  const confirmed = await showConfirm(
    t('pagePanel.deletePageConfirm', { name: pageName }),
    t('pagePanel.deletePage')
  );
  if (!confirmed) return;

  const groupId = pageStore.pageGroupMap[page.id];
  const groupName = groupId
    ? pageStore.pageGroups.find(g => g.id === groupId)?.name
    : undefined;

  pageStore.removePage(page.id);
  // 同步删除服务端页面文件
  if (projectId.value) {
    pageApi.deletePage(projectId.value, pageName, groupName).catch(err => {
      console.warn('[PagePanel] 删除页面文件失败:', err);
    });
  }
  closeContextMenu();
}

// ─── 点击外部关闭导入菜单 ───
function handleGlobalClick(e: MouseEvent) {
  if (importMenuVisible.value && importWrapperRef.value && !importWrapperRef.value.contains(e.target as Node)) {
    closeImportMenu();
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick);
  // 初始加载预览
  if (projectId.value) {
    loadAllPreviews();
  }
});

// 项目切换时重新加载预览
watch(projectId, (newId, oldId) => {
  if (oldId && oldId !== newId) {
    clearPreviews();
  }
  if (newId) {
    loadAllPreviews();
  }
});

// 页面变化时更新预览
watch(pages, () => {
  if (projectId.value) {
    loadAllPreviews();
  }
}, { deep: false });

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick);
  clearPreviews();
});
</script>

<style scoped>
.page-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text);
}

.page-panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-panel-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.page-add-btn,
.page-refresh-btn,
.page-import-btn,
.page-export-btn,
.group-add-btn,
.group-toggle-all-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border);
  background-color: var(--surface);
  color: var(--text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.page-add-btn:hover,
.page-refresh-btn:hover,
.page-import-btn:hover,
.page-export-btn:hover,
.group-add-btn:hover,
.group-toggle-all-btn:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
  color: var(--primary);
}

/* 导入下拉菜单 */
.page-import-wrapper {
  position: relative;
}

.import-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: var(--shadow-medium);
  z-index: 1000;
  min-width: 180px;
  padding: 4px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  white-space: nowrap;
  transition: background-color 0.15s;
}

.dropdown-item:hover {
  background-color: var(--control-button-hover);
}

.dropdown-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.page-panel-groups {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

.group-item {
  margin-bottom: 6px;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.group-item-active {
  border-color: var(--primary);
  box-shadow: inset 3px 0 0 var(--primary), 0 1px 3px rgba(59, 130, 246, 0.1);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  user-select: none;
}

.group-header:hover {
  background-color: var(--control-button-hover);
}

.group-arrow {
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.group-arrow.expanded {
  transform: rotate(90deg);
}

.group-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  font-size: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.group-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.group-header:hover .group-actions {
  opacity: 1;
}

.group-action-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.group-action-btn:hover {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.group-action-rename:hover {
  color: var(--primary);
}

.group-action-delete:hover {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.group-pages {
  padding: 2px 4px 4px;
}

.group-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 11px;
  font-style: italic;
}

.ungrouped-section {
  margin-top: 8px;
}

.page-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
  position: relative;
}

.page-item:hover {
  background-color: var(--control-button-hover);
}

.page-item-active {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.15), transparent 70%);
  color: var(--primary);
  box-shadow: inset 3px 0 0 var(--primary);
}

.page-item-preview {
  width: 80px;
  height: 54px;
  border-radius: 5px;
  border: 1px solid var(--border);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--surface);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.page-item:hover .page-item-preview {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  transform: scale(1.03);
}

/* 预览图加载骨架 */
.page-item-preview-loading {
  width: 80px;
  height: 54px;
  border-radius: 5px;
  border: 1px solid var(--border);
  flex-shrink: 0;
  background: linear-gradient(
    90deg,
    var(--surface) 25%,
    var(--control-button-hover) 50%,
    var(--surface) 75%
  );
  background-size: 200% 100%;
  animation: preview-loading-pulse 1.5s ease-in-out infinite;
}

@keyframes preview-loading-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.page-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 450;
  line-height: 1.4;
  padding: 0 2px;
}

.page-item-badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  flex-shrink: 0;
  font-weight: 500;
  letter-spacing: 0.3px;
  box-shadow: 0 1px 4px rgba(59, 130, 246, 0.3);
}

.page-item-remove {
  width: 18px;
  height: 18px;
  border: none;
  background: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.page-item:hover .page-item-remove {
  opacity: 1;
}

.page-item-remove:hover {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.page-context-menu {
  position: fixed;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 4px;
  z-index: 1000;
  min-width: 180px;
}

.page-context-menu .menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.page-context-menu .menu-item:hover {
  background-color: var(--control-button-hover);
}

.page-context-menu .menu-item-danger {
  color: #ef4444;
}

.page-context-menu .menu-divider {
  height: 1px;
  background-color: var(--border);
  margin: 4px 0;
}

.page-item-drag-handle {
  cursor: grab;
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0;
  flex-shrink: 0;
  user-select: none;
  transition: opacity 0.15s ease;
}

.page-item:hover .page-item-drag-handle {
  opacity: 0.6;
}

.page-item-drag-handle:active {
  cursor: grabbing;
}

.page-item-dragging {
  opacity: 0.4;
}

.page-item-drag-over {
  border-top: 2px solid var(--primary);
}

.group-drag-over {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.group-empty-drag-over {
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px dashed var(--primary);
  border-radius: 4px;
}

.ungrouped-drag-over {
  outline: 2px dashed var(--primary);
  outline-offset: -2px;
  border-radius: 6px;
}

/* ── Footer ── */
.page-panel-footer {
  flex-shrink: 0;
  padding: 8px 14px;
  border-top: 1px solid var(--border);
  background: var(--panel);
}

.footer-stats {
  font-size: 11px;
  color: var(--text-secondary);
  user-select: none;
}

/* ── 滚动条美化 ── */
.page-panel-groups::-webkit-scrollbar {
  width: 4px;
}

.page-panel-groups::-webkit-scrollbar-track {
  background: transparent;
}

.page-panel-groups::-webkit-scrollbar-thumb {
  background-color: var(--border);
  border-radius: 4px;
}

.page-panel-groups::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-secondary);
}
</style>