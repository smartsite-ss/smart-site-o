<template>
  <div
    class="layer-panel"
    :style="themeStyles"
  >
    <div class="layer-section">
      <div class="layer-header-bar">
        <h3>{{ $t('layerPanel.title') }} ({{ sortedGraphics.length }})</h3>
        <div class="layer-toolbar">
          <button
            class="toolbar-button"
            :title="$t('layerPanel.refresh')"
            @click="refreshLayerList"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4M22 12.5a10 10 0 0 1-18.8 4" />
            </svg>
          </button>
          <button
            class="toolbar-button"
            :title="$t('layerPanel.lockUnlockAll')"
            @click="toggleAllLayersLock"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
                ry="2"
              />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>
          <button
            class="toolbar-button"
            :title="$t('layerPanel.showHideAll')"
            @click="toggleAllLayersVisible"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle
                cx="12"
                cy="12"
                r="3"
              />
            </svg>
          </button>
          <button
            class="toolbar-button toolbar-button-danger"
            :title="$t('layerPanel.deleteSelected')"
            :disabled="selectedGraphics.length === 0"
            @click="deleteSelectedGraphics"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line
                x1="10"
                y1="11"
                x2="10"
                y2="17"
              />
              <line
                x1="14"
                y1="11"
                x2="14"
                y2="17"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        v-if="selectedGraphics.length > 1"
        class="layer-multi-select-bar"
      >
        <span class="multi-select-count">{{ selectedGraphics.length }}</span>
        <div class="multi-select-actions">
          <button
            class="multi-select-btn tooltip-btn"
            :data-tooltip="$t('layerPanel.delete')"
            @click="batchDelete"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button
            class="multi-select-btn tooltip-btn"
            :data-tooltip="$t('layerPanel.lock')"
            @click="batchLock"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
                ry="2"
              />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>
          <button
            class="multi-select-btn tooltip-btn"
            :data-tooltip="$t('layerPanel.unlock')"
            @click="batchUnlock"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
                ry="2"
              />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
          </button>
          <button
            class="multi-select-btn tooltip-btn"
            :data-tooltip="$t('layerPanel.hide')"
            @click="batchHide"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line
                x1="1"
                y1="1"
                x2="23"
                y2="23"
              />
            </svg>
          </button>
          <button
            class="multi-select-btn tooltip-btn"
            :data-tooltip="$t('layerPanel.show')"
            @click="batchShow"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle
                cx="12"
                cy="12"
                r="3"
              />
            </svg>
          </button>
          <button
            class="multi-select-btn tooltip-btn"
            :data-tooltip="$t('layerPanel.createGroup')"
            @click="createGroupFromSelection"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect
                x="3"
                y="3"
                width="7"
                height="7"
              />
              <rect
                x="14"
                y="3"
                width="7"
                height="7"
              />
              <rect
                x="14"
                y="14"
                width="7"
                height="7"
              />
              <rect
                x="3"
                y="14"
                width="7"
                height="7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="layer-search-bar">
        <input 
          v-model="searchQuery" 
          type="text" 
          :placeholder="$t('layerPanel.searchPlaceholder')"
          class="layer-search"
        >
        <label class="layer-select-all">
          <input
            type="checkbox"
            :checked="selectedAll"
            @change="toggleSelectAll"
          >
          <span>{{ $t('layerPanel.selectAll') }}</span>
        </label>
      </div>

      <div
        class="layer-list"
        @dragover.prevent
      >
        <!-- 递归渲染分组 -->
        <LayerItem
          v-for="(item, _) in layerTree"
          :key="item.id"
          :item="item"
          :group-manager="groupManager"
          :expanded-graphic="expandedGraphic"
          :selected-graphic-id="selectedGraphicId"
          :selected-graphics="selectedGraphics"
          :dragging-id="draggingId"
          :get-graphic-by-id="getGraphicById"
          :get-layer-name="getLayerName"
          :set-thumbnail-canvas="setThumbnailCanvas"
          @select-graphic="handleSelectGraphic"
          @dragstart="handleDragStart"
          @dragend="handleDragEnd"
          @drop="handleDrop"
          @toggle-graphic-lock="toggleGraphicLock"
          @toggle-graphic-visible="toggleGraphicVisibility"
          @toggle-layer-dropdown="toggleLayerDropdown"
          @toggle-expand="toggleExpand"
          @set-group-locked="setGroupLocked"
          @set-group-visible="setGroupVisible"
          @rename-group="renameGroup"
          @remove-group="removeGroup"
          @move-to-top="moveLayerToTop"
          @move-up="moveLayerUp"
          @move-down="moveLayerDown"
          @move-to-bottom="moveLayerToBottom"
          @contextmenu="showContextMenu"
        />

        <div
          v-if="sortedGraphics.length === 0 && getGroups.length === 0"
          class="layer-empty"
        >
          {{ searchQuery ? $t('layerPanel.noResults') : $t('layerPanel.noLayers') }}
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div 
        v-if="contextMenuVisible && contextMenuGraphic" 
        class="layer-context-menu"
        :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
        @click.stop="closeContextMenu"
      >
        <button
          class="context-menu-item"
          @click="duplicateGraphic(contextMenuGraphic)"
        >
          {{ $t('layerPanel.duplicate') }}
        </button>
        <button
          class="context-menu-item"
          @click="renameGraphic(contextMenuGraphic)"
        >
          {{ $t('layerPanel.rename') }}
        </button>
        <div class="context-menu-divider" />
        <button
          v-if="selectedGraphics.length > 1"
          class="context-menu-item"
          @click="groupFromContextMenu"
        >
          {{ $t('layerPanel.group') }}
        </button>
        <button
          v-if="isContextMenuGroup"
          class="context-menu-item"
          @click="ungroupFromContextMenu"
        >
          {{ $t('layerPanel.ungroup') }}
        </button>
        <div
          v-if="selectedGraphics.length > 1 || isContextMenuGroup"
          class="context-menu-divider"
        />
        <button
          class="context-menu-item"
          @click="moveLayerToTop(contextMenuGraphic.id)"
        >
          {{ $t('layerPanel.moveToTop') }}
        </button>
        <button
          class="context-menu-item"
          @click="moveLayerUp(contextMenuGraphic.id)"
        >
          {{ $t('layerPanel.moveUp') }}
        </button>
        <button
          class="context-menu-item"
          @click="moveLayerDown(contextMenuGraphic.id)"
        >
          {{ $t('layerPanel.moveDown') }}
        </button>
        <button
          class="context-menu-item"
          @click="moveLayerToBottom(contextMenuGraphic.id)"
        >
          {{ $t('layerPanel.moveToBottom') }}
        </button>
        <div class="context-menu-divider" />
        <button 
          class="context-menu-item" 
          @click="toggleGraphicLock(contextMenuGraphic.id)"
        >
          {{ contextMenuGraphic.config?.locked ? $t('layerPanel.unlock') : $t('layerPanel.lock') }}
        </button>
        <button 
          class="context-menu-item" 
          @click="toggleGraphicVisibility(contextMenuGraphic.id)"
        >
          {{ contextMenuGraphic.config?.visible ? $t('layerPanel.hide') : $t('layerPanel.show') }}
        </button>
        <div class="context-menu-divider" />
        <button
          class="context-menu-item context-menu-item-danger"
          @click="deleteGraphic(contextMenuGraphic.id)"
        >
          {{ $t('layerPanel.delete') }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useGraphic } from '../../composables/useGraphic';
import { useSelection } from '../../composables/useSelection';
import { usePageStore, useTheme, type GraphicGroup, i18n, type IGraphic, eventBus, Events } from '@scada-editor/core';
import LayerItem from './LayerItem.vue';
import { showPrompt } from '../../utils/messageBox';

const { t } = i18n.global;
const $t = t;
const { themeStyles } = useTheme();
const pageStore = usePageStore();
const {
  updateGraphic,
  selectGraphic,
  toggleGraphicLock,
  toggleGraphicVisibility,
  removeGraphic,
  duplicateGraphic: coreDuplicateGraphic,
  selectMultipleGraphics,
  selectAllGraphics: _selectAllGraphics,
  addToSelection,
  removeFromSelection,
  clearSelection,
  deleteSelectedGraphics: coreDeleteSelectedGraphics,
  lockSelectedGraphics,
  unlockSelectedGraphics,
  hideSelectedGraphics,
  showSelectedGraphics,
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
  groupSelectedGraphics,
  ungroupGraphics,
  getGraphicInfo,
  lockGraphic,
  unlockGraphic,
  showGraphic,
  hideGraphic
} = useGraphic();

const graphics = computed(() => {
  refreshTrigger.value;
  const page = pageStore.currentPage;
  if (!page) return [];
  const g = page.graphics;
  return Array.isArray(g) ? g : ((g as { value: IGraphic[] }).value ?? []);
});
const { selectedGraphicId } = useSelection();

const groupManager = computed(() => {
  const currentPage = pageStore.currentPage;
  if (currentPage && typeof currentPage.getGroupManager === 'function') {
    return currentPage.getGroupManager();
  }
  return null;
});

const searchQuery = ref('');
const draggingId = ref<string | null>(null);
const expandedGraphic = ref<string | null>(null);
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuGraphic = ref<IGraphic | null>(null);
const activeDropdown = ref<string | null>(null);

const selectedGraphics = computed(() => pageStore.currentPage?.selectedGraphicIds || []);
const refreshTrigger = ref<number>(0);

const sortedGraphics = computed(() => {
  return [...graphics.value].sort(
    (a, b) => (a.config.zIndex || 0) - (b.config.zIndex || 0)
  );
});

const filteredGraphics = computed(() => {
  if (!searchQuery.value) return sortedGraphics.value;
  const query = searchQuery.value.toLowerCase();
  return sortedGraphics.value.filter(graphic => 
    getLayerName(graphic).toLowerCase().includes(query) ||
    graphic.type.toLowerCase().includes(query)
  );
});

const selectedAll = computed(() => {
  return filteredGraphics.value.length > 0 && 
         filteredGraphics.value.every(g => selectedGraphics.value.includes(g.id));
});

// 构建图层树
const layerTree = computed(() => {
  refreshTrigger.value;

  const gm = groupManager.value;

  // 搜索模式下使用过滤后的结果，以扁平列表展示（不显示分组结构）
  if (searchQuery.value) {
    return filteredGraphics.value.map(graphic => ({
      type: 'graphic' as const,
      id: graphic.id,
      data: graphic
    }));
  }

  const gList = graphics.value;
  
  if (!gm) {
    return [...gList].sort((a, b) => (a.config.zIndex || 0) - (b.config.zIndex || 0))
      .map(graphic => ({
        type: 'graphic',
        id: graphic.id,
        data: graphic
      }));
  }
  
  const graphicMap = new Map(gList.map(g => [g.id, g]));
  gm.updateReferences(gList, graphicMap);
  
  const rootGroups = gm.getGroupsByParent(null);
  const ungroupedGraphics = gList.filter(g => !gm.isGraphicInGroup(g.id));
  
  const tree: Array<{ type: 'graphic' | 'group'; id: string; data: IGraphic | GraphicGroup }> = [];
  
  rootGroups.forEach(group => {
    tree.push({
      type: 'group',
      id: group.id,
      data: group
    });
  });
  
  ungroupedGraphics.sort((a, b) => (a.config.zIndex || 0) - (b.config.zIndex || 0))
    .forEach(graphic => {
      tree.push({
        type: 'graphic',
        id: graphic.id,
        data: graphic
      });
    });
  
  return tree;
});

const getGroups = computed(() => {
  // 依赖 refreshTrigger 确保组结构变化时重新计算（因 GroupManager 内部 Map 变更不触发响应式）
  refreshTrigger.value;
  const gm = groupManager.value;
  return gm ? gm.getGroupsByParent(null) : [];
});

const getGraphicById = (id: string) => {
  return graphics.value.find(g => g.id === id);
};

const getLayerName = (graphic: IGraphic | null) => {
  if (!graphic) return '';
  
  const customName = graphic.config?.name;
  if (customName && typeof customName === 'string' && customName.trim()) {
    return customName;
  }

  const graphicInfo = getGraphicInfo(graphic.type);
  const graphicName = graphicInfo?.name || graphic.type;
  const props = graphic.config?.customProps || {};

  switch (graphic.type) {
    case 'button':
    case 'naive-button':
      return `${graphicName} ${props.text || ''}`;
    case 'input':
    case 'textbox':
      return `${graphicName} ${props.placeholder || ''}`;
    case 'shape':
      return `${graphicName} ${props.shapeType || ''}`;
    case 'label':
      return `${graphicName} ${props.text || ''}`;
    case 'image':
      return `${graphicName} ${props.alt || ''}`;
    case 'chart':
      return `${graphicName} ${props.title || ''}`;
    case 'checkbox':
      return `${graphicName} ${props.label || ''}`;
    default:
      return graphicName;
  }
};

const setThumbnailCanvas = (canvas: HTMLCanvasElement | null, graphic: any) => {
  if (!canvas) return;
  if (!graphic || !graphic.config) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, 24, 24);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;

  const width = graphic.config.width || 100;
  const height = graphic.config.height || 60;
  const scale = Math.min(20 / width, 20 / height);

  const x = (24 - width * scale) / 2;
  const y = (24 - height * scale) / 2;

  ctx.strokeRect(x, y, width * scale, height * scale);

  ctx.font = '8px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.fillText(graphic.type.slice(0, 3).toUpperCase(), 12, 18);
};

const handleSelectGraphic = (id: string, shouldAddToSelection = false) => {
  if (shouldAddToSelection) {
    const isSelected = selectedGraphics.value.includes(id);
    if (isSelected) {
      removeFromSelection(id);
    } else {
      addToSelection(id);
    }
  } else {
    selectMultipleGraphics([id]);
    selectGraphic(id);
  }
};

 

const toggleSelectAll = () => {
  if (selectedAll.value) {
    clearSelection();
    selectGraphic(null);
  } else if (filteredGraphics.value.length > 0) {
    const ids = filteredGraphics.value.map(g => g.id);
    selectMultipleGraphics(ids);
    selectGraphic(ids[0]);
  }
};

const batchDelete = () => {
  coreDeleteSelectedGraphics();
};

const batchLock = () => {
  lockSelectedGraphics();
};

const batchUnlock = () => {
  unlockSelectedGraphics();
};

const batchHide = () => {
  hideSelectedGraphics();
};

const batchShow = () => {
  showSelectedGraphics();
};

const createGroupFromSelection = () => {
  groupSelectedGraphics();
};

const toggleExpand = (id: string) => {
  const gm = groupManager.value;
  if (gm) {
    const group = gm.getGroup(id);
    if (group) {
      gm.toggleGroup(id);
      return;
    }
  }
  expandedGraphic.value = expandedGraphic.value === id ? null : id;
};

const setGroupLocked = (groupId: string, locked: boolean) => {
  const gm = groupManager.value;
  if (!gm) return;

  updateGroupManagerReferences();
  gm.setGroupLocked(groupId, locked);
};

const setGroupVisible = (groupId: string, visible: boolean) => {
  const gm = groupManager.value;
  if (!gm) return;

  updateGroupManagerReferences();
  gm.setGroupVisible(groupId, visible);
};

const renameGroup = async (groupId: string) => {
  const gm = groupManager.value;
  if (!gm) return;

  const group = gm.getGroup(groupId);
  if (group) {
    const newName = await showPrompt(
      t('layerPanel.renameGroupPrompt'), 
      group.name, 
      t('layerPanel.renameGroupTitle')
    );
    if (newName && newName.trim()) {
      gm.renameGroup(groupId, newName.trim());
    }
  }
};

const removeGroup = (groupId: string) => {
  const gm = groupManager.value;
  if (!gm) return;

  gm.deleteGroup(groupId, true);
};

const toggleLayerDropdown = (id: string) => {
  activeDropdown.value = activeDropdown.value === id ? null : id;
};

const closeLayerDropdown = () => {
  activeDropdown.value = null;
};

const moveLayerUp = (id: string) => {
  bringForward(id);
};

const moveLayerDown = (id: string) => {
  sendBackward(id);
};

const moveLayerToTop = (id: string) => {
  bringToFront(id);
};

const moveLayerToBottom = (id: string) => {
  sendToBack(id);
};

const toggleAllLayersLock = () => {
  const hasLockedLayers = graphics.value.some(g => g.config.locked);

  graphics.value.forEach(graphic => {
    if (hasLockedLayers) {
      unlockGraphic(graphic.id);
    } else {
      lockGraphic(graphic.id);
    }
  });
};

const toggleAllLayersVisible = () => {
  const hasHiddenLayers = graphics.value.some(g => !g.config.visible);

  graphics.value.forEach(graphic => {
    if (hasHiddenLayers) {
      showGraphic(graphic.id);
    } else {
      hideGraphic(graphic.id);
    }
  });
};

const deleteSelectedGraphics = () => {
  coreDeleteSelectedGraphics();
};

const deleteGraphic = (id: string) => {
  removeGraphic(id);
  closeContextMenu();
};

const duplicateGraphic = (graphic: any) => {
  coreDuplicateGraphic(graphic.id);
  closeContextMenu();
};

const renameGraphic = async (graphic: any) => {
  const newName = await showPrompt(
    t('layerPanel.renamePrompt'), 
    getLayerName(graphic), 
    t('layerPanel.rename')
  );
  if (newName) {
    updateGraphic(graphic.id, {
      config: { ...graphic.config, name: newName },
    });
  }
  closeContextMenu();
};

const handleDragStart = (id: string) => {
  draggingId.value = id;
};

const handleDragEnd = () => {
  draggingId.value = null;
};


const handleDrop = (event: DragEvent, targetId: string) => {
  event.preventDefault();
  if (!draggingId.value || draggingId.value === targetId) {
    draggingId.value = null;
    return;
  }

  // 使用 LayerManager 的 reorderGraphic 方法来正确调整 zIndex，
  // 避免简单的 +1 赋值导致 zIndex 重复
  const currentPage = pageStore.currentPage;
  if (currentPage) {
    const targetGraphic = graphics.value.find(g => g.id === targetId);
    if (targetGraphic) {
      const targetZIndex = targetGraphic.config.zIndex || 0;
      currentPage.reorderGraphic(draggingId.value, targetZIndex);
    }
  }

  draggingId.value = null;
};

const showContextMenu = (event: MouseEvent, graphic: any) => {
  event.preventDefault();
  contextMenuGraphic.value = graphic;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  contextMenuVisible.value = true;
};

const closeContextMenu = () => {
  contextMenuVisible.value = false;
};

const isContextMenuGroup = computed(() => {
  const gm = groupManager.value;
  const graphic = contextMenuGraphic.value;
  if (!gm || !graphic) return false;
  return gm.isGroup(graphic.id);
});

const groupFromContextMenu = () => {
  groupSelectedGraphics();
  closeContextMenu();
};

const ungroupFromContextMenu = () => {
  if (contextMenuGraphic.value) {
    ungroupGraphics(contextMenuGraphic.value.id);
  }
  closeContextMenu();
};

const inputLikeTags = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const modalClassPatterns = ['modal-overlay', 'modal', 'n-modal', 'n-drawer', 'dialog-overlay', 'overlay', 'popup'];

function isEventFromInputLike(event: KeyboardEvent): boolean {
  const target = event.target as Element | null;
  if (!target) return false;
  if (inputLikeTags.has(target.tagName)) return true;
  if ((target as HTMLElement).isContentEditable) return true;
  const role = target.getAttribute('role');
  if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true;
  let parent: Element | null = target.parentElement;
  while (parent) {
    if (inputLikeTags.has(parent.tagName)) return true;
    if ((parent as HTMLElement).isContentEditable) return true;
    for (const cls of modalClassPatterns) {
      if (parent.classList.contains(cls)) return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

// 键盘事件仅在画布中有选中图元时生效，避免在无选中状态或焦点在输入框等控件时触发误操作。
// Keyboard events only apply when a graphic is selected on the canvas,
// preventing unintended operations when no selection exists or focus is on input controls.
const handleKeydown = (event: KeyboardEvent) => {
  if (!selectedGraphicId.value) return;

  const textEditingKeys = new Set(['Backspace', 'Delete', 'Escape']);
  if (textEditingKeys.has(event.key) && isEventFromInputLike(event)) {
    return;
  }

  switch (event.key) {
    case 'Delete':
    case 'Backspace': {
      const currentId = selectedGraphicId.value;
      const sorted = sortedGraphics.value;
      const currentIndex = sorted.findIndex(g => g.id === currentId);
      removeGraphic(currentId);
      event.preventDefault();
      if (currentIndex !== -1) {
        nextTick(() => {
          const remaining = sortedGraphics.value;
          if (remaining.length > 0) {
            const newIndex = Math.min(currentIndex, remaining.length - 1);
            handleSelectGraphic(remaining[newIndex].id);
          }
        });
      }
      break;
    }
  }
};

const updateGroupManagerReferences = () => {
  const gm = groupManager.value;
  if (!gm) return;

  const graphicMap = new Map(graphics.value.map(g => [g.id, g]));
  gm.updateReferences(graphics.value, graphicMap);
};

// 刷新图层列表
const refreshLayerList = () => {
  const gm = groupManager.value;
  const gList = graphics.value;
  if (!gm) {
    refreshTrigger.value++;
    return;
  }

  // 更新引用
  const graphicMap = new Map(gList.map(g => [g.id, g]));
  gm.updateReferences(gList, graphicMap);
  refreshTrigger.value++;
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', closeContextMenu);
  document.addEventListener('click', closeLayerDropdown);
  updateGroupManagerReferences();
  
  // 监听图元添加/删除事件，刷新图层列表
  eventBus.on(Events.GRAPHIC_ADDED, refreshLayerList);
  eventBus.on(Events.GRAPHIC_REMOVED, refreshLayerList);
  eventBus.on(Events.GRAPHIC_UPDATED, refreshLayerList);
  // 监听组创建/删除/更新事件，刷新图层列表
  eventBus.on(Events.GROUP_CREATED, refreshLayerList);
  eventBus.on(Events.GROUP_DELETED, refreshLayerList);
  eventBus.on(Events.GROUP_UPDATED, refreshLayerList);
  // 监听页面切换事件，刷新图层列表
  eventBus.on(Events.PAGE_SWITCHED, refreshLayerList);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', closeContextMenu);
  document.removeEventListener('click', closeLayerDropdown);
  
  eventBus.off(Events.GRAPHIC_ADDED, refreshLayerList);
  eventBus.off(Events.GRAPHIC_REMOVED, refreshLayerList);
  eventBus.off(Events.GRAPHIC_UPDATED, refreshLayerList);
  eventBus.off(Events.GROUP_CREATED, refreshLayerList);
  eventBus.off(Events.GROUP_DELETED, refreshLayerList);
  eventBus.off(Events.GROUP_UPDATED, refreshLayerList);
  eventBus.off(Events.PAGE_SWITCHED, refreshLayerList);
});
</script>

<style scoped>
.layer-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text);
  background: var(--panel);
  border-right: 1px solid var(--border);
}

.layer-section {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.layer-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.layer-header-bar h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.layer-toolbar {
  display: flex;
  gap: 4px;
}

.toolbar-button {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.toolbar-button:hover:not(:disabled) {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.toolbar-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-button-danger:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.layer-multi-select-bar {
  background: linear-gradient(135deg, var(--surface) 0%, var(--background) 100%);
  border-bottom: 1px solid var(--border);
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  border-radius: 4px;
  margin-bottom: 8px;
}

.multi-select-count {
  background-color: var(--primary);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.multi-select-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.multi-select-btn {
  width: 28px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.multi-select-btn:hover {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.multi-select-btn.tooltip-btn::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--surface);
  color: var(--text);
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 100;
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.multi-select-btn.tooltip-btn:hover::after {
  opacity: 1;
  visibility: visible;
}

.layer-search-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}

.layer-search {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--text);
  font-size: 13px;
}

.layer-select-all {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
}

.layer-select-all input[type="checkbox"] {
  width: 12px;
  height: 12px;
}

.layer-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.layer-empty {
  background-color: var(--background);
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.layer-context-menu {
  position: fixed;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 4px;
  z-index: 1000;
  min-width: 160px;
}

.context-menu-item {
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

.context-menu-item:hover {
  background-color: var(--control-button-hover);
}

.context-menu-item-danger {
  color: #ef4444;
}

.context-menu-divider {
  height: 1px;
  background-color: var(--border);
  margin: 4px 0;
}
</style>
