<template>
  <div>
    <!-- 分组渲染 -->
    <div
      v-if="item.type === 'group'"
      class="layer-group"
    >
      <div 
        class="layer-group-header"
        @click="handleToggleExpand"
      >
        <span class="group-expand-icon">{{ item.data.expanded ? '▼' : '▶' }}</span>
        <span class="group-icon">📁</span>
        <span class="group-name">{{ item.data.name }}</span>
        <span class="group-count">({{ childrenCount }})</span>
        
        <button 
          class="group-lock-btn" 
          :title="item.data.locked ? $t('layerPanel.unlock') : $t('layerPanel.lock')" 
          @click.stop="handleSetGroupLocked(!item.data.locked)"
        >
          {{ item.data.locked ? '🔒' : '🔓' }}
        </button>
        
        <button 
          class="group-visibility-btn" 
          :title="item.data.visible ? $t('layerPanel.hide') : $t('layerPanel.show')" 
          @click.stop="handleSetGroupVisible(!item.data.visible)"
        >
          {{ item.data.visible ? '👁️' : '🙈' }}
        </button>
        
        <button 
          class="group-rename-btn" 
          :title="$t('layerPanel.rename')" 
          @click.stop="handleRenameGroup"
        >
          ✏️
        </button>
        
        <button 
          class="group-delete-btn" 
          :title="$t('layerPanel.delete')" 
          @click.stop="handleRemoveGroup"
        >
          🗑️
        </button>
      </div>
      
      <div
        v-if="item.data.expanded"
        class="layer-group-content"
      >
        <template
          v-for="childId in (item.data.children || [])"
          :key="childId"
        >
          <!-- 检查是子分组还是图元 -->
          <template v-if="isGroupId(childId)">
            <LayerItem
              :item="{ type: 'group', id: childId, data: getGroupById(childId) }"
              :group-manager="groupManager"
              :expanded-graphic="expandedGraphic"
              :selected-graphic-id="selectedGraphicId"
              :selected-graphics="selectedGraphics"
              :dragging-id="draggingId"
              :get-graphic-by-id="getGraphicById"
              :get-layer-name="getLayerName"
              :set-thumbnail-canvas="setThumbnailCanvas"
              @select-graphic="emitSelectGraphic"
              @dragstart="handleDragStart"
              @dragend="handleDragEnd"
              @drop="handleDrop"
              @toggle-graphic-lock="emitToggleGraphicLock"
              @toggle-graphic-visible="emitToggleGraphicVisible"
              @toggle-layer-dropdown="emitToggleLayerDropdown"
              @toggle-expand="emitToggleExpand"
              @set-group-locked="emitSetGroupLocked"
              @set-group-visible="emitSetGroupVisible"
              @rename-group="emitRenameGroup"
              @remove-group="emitRemoveGroup"
              @move-to-top="emitMoveToTop"
              @move-up="emitMoveUp"
              @move-down="emitMoveDown"
              @move-to-bottom="emitMoveToBottom"
            />
          </template>
          
          <!-- 图元渲染 -->
          <template v-else>
            <div
              class="layer-item layer-item-in-group"
              :class="{ 
                selected: selectedGraphicId === childId || selectedGraphics.includes(childId),
                dragging: draggingId === childId
              }"
              :draggable="!getGraphicById(childId)?.config?.config?.locked"
              @dragstart="emitDragStart(childId)"
              @dragend="emitDragEnd"
              @dragover.prevent="handleDragOver"
              @drop="emitDrop($event, childId)"
              @click="handleClickGraphic(childId, $event)"
              @contextmenu.prevent="showContextMenu($event, getGraphicById(childId))"
            >
              <div class="layer-header">
                <div class="layer-checkbox">
                  <input
                    type="checkbox"
                    :checked="selectedGraphics.includes(childId)"
                    @change.stop="handleCheckboxChange(childId, $event as MouseEvent)"
                  >
                </div>
                
                <button
                  class="layer-button layer-lock"
                  :title="getGraphicById(childId)?.config?.config?.locked ? $t('layerPanel.unlock') : $t('layerPanel.lock')"
                  @click.stop="emitToggleGraphicLock(childId)"
                >
                  {{ getGraphicById(childId)?.config?.config?.locked ? '🔒' : '🔓' }}
                </button>
                
                <button
                  class="layer-button layer-visibility"
                  :title="getGraphicById(childId)?.config?.config?.visible ? $t('layerPanel.hide') : $t('layerPanel.show')"
                  @click.stop="emitToggleGraphicVisible(getGraphicById(childId))"
                >
                  {{ getGraphicById(childId)?.config?.config?.visible ? '👁️' : '🙈' }}
                </button>
                
                <div class="layer-thumbnail">
                  <canvas
                    :ref="el => setThumbnailCanvas(el as HTMLCanvasElement, getGraphicById(childId))"
                    :width="24"
                    :height="24"
                  />
                </div>
                
                <span
                  class="layer-name"
                  :title="getLayerName(getGraphicById(childId))"
                >{{ getLayerName(getGraphicById(childId)) }}</span>
                
                <div class="layer-controls">
                  <div
                    class="layer-dropdown"
                    @click.stop
                  >
                    <button
                      class="layer-button layer-action layer-dropdown-toggle"
                      :title="$t('layerPanel.layerOrder')"
                      @click.stop="emitToggleLayerDropdown(childId)"
                    >
                      ⋮⋮
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>
    
    <!-- 图元渲染 -->
    <div
      v-else
      class="layer-item"
      :class="{ 
        selected: selectedGraphicId === item.id || selectedGraphics.includes(item.id),
        dragging: draggingId === item.id
      }"
      :draggable="!item.data.config?.config?.locked"
      @dragstart="emitDragStart(item.id)"
      @dragend="emitDragEnd"
      @dragover.prevent="handleDragOver"
      @drop="emitDrop($event, item.id)"
      @click="handleClickGraphic(item.id, $event)"
      @contextmenu.prevent="showContextMenu($event, item.data)"
    >
      <div class="layer-header">
        <div class="layer-checkbox">
          <input
            type="checkbox"
            :checked="selectedGraphics.includes(item.id)"
            @change.stop="handleCheckboxChange(item.id, $event as MouseEvent)"
          >
        </div>
        
        <button
          class="layer-button layer-lock"
          :title="item.data.config?.config?.locked ? $t('layerPanel.unlock') : $t('layerPanel.lock')"
          @click.stop="emitToggleGraphicLock(item.id)"
        >
          {{ item.data.config?.config?.locked ? '🔒' : '🔓' }}
        </button>
        
        <button
          class="layer-button layer-visibility"
          :title="item.data.config?.config?.visible ? $t('layerPanel.hide') : $t('layerPanel.show')"
          @click.stop="emitToggleGraphicVisible(item.data)"
        >
          {{ item.data.config?.config?.visible ? '👁️' : '🙈' }}
        </button>
        
        <div class="layer-thumbnail">
          <canvas
            :ref="el => setThumbnailCanvas(el as HTMLCanvasElement, item.data)"
            :width="24"
            :height="24"
          />
        </div>
        
        <span
          class="layer-name"
          :title="getLayerName(item.data)"
        >{{ getLayerName(item.data) }}</span>
        
        <div class="layer-controls">
          <div
            class="layer-dropdown"
            @click.stop
          >
            <button
              class="layer-button layer-action layer-dropdown-toggle"
              :title="$t('layerPanel.layerOrder')"
              @click.stop="emitToggleLayerDropdown(item.id)"
            >
              ⋮⋮
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  item: any;
  groupManager: any;
  expandedGraphic: string | null;
  selectedGraphicId: string | null;
  selectedGraphics: string[];
  draggingId: string | null;
  getGraphicById: (id: string) => any;
  getLayerName: (graphic: any) => string;
  setThumbnailCanvas: (canvas: HTMLCanvasElement | null, graphic: any) => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectGraphic: [id: string, addToSelection?: boolean];
  dragstart: [id: string];
  dragend: [];
  drop: [event: DragEvent, targetId: string];
  toggleGraphicLock: [id: string];
  toggleGraphicVisible: [graphic: any];
  toggleLayerDropdown: [id: string];
  toggleExpand: [id: string];
  setGroupLocked: [groupId: string, locked: boolean];
  setGroupVisible: [groupId: string, visible: boolean];
  renameGroup: [groupId: string];
  removeGroup: [groupId: string];
  moveToTop: [id: string];
  moveUp: [id: string];
  moveDown: [id: string];
  moveToBottom: [id: string];
  contextmenu: [event: MouseEvent, graphic: any];
}>();

// 计算子项数量（包括嵌套分组）
const childrenCount = computed(() => {
  if (props.item.type !== 'group') return 0;
  
  let count = 0;
  const children = props.item.data.children || [];
  
  children.forEach((childId: string) => {
    if (props.groupManager.isGroup(childId)) {
      count += countGroupChildren(childId);
    }
    count += 1;
  });
  
  return count;
});

// 递归计算分组包含的图元数量
const countGroupChildren = (groupId: string): number => {
  const group = props.groupManager.getGroup(groupId);
  if (!group) return 0;
  
  let count = 0;
  const children = group.children || [];
  
  children.forEach((childId: string) => {
    if (props.groupManager.isGroup(childId)) {
      count += countGroupChildren(childId);
    }
    count += 1;
  });
  
  return count;
};

// 检查是否是分组ID
const isGroupId = (id: string): boolean => {
  return props.groupManager.isGroup(id);
};

// 获取分组数据
const getGroupById = (id: string): any => {
  return props.groupManager.getGroup(id);
};

// 事件处理
const handleToggleExpand = () => {
  emit('toggleExpand', props.item.id);
};

const handleSetGroupLocked = (locked: boolean) => {
  emit('setGroupLocked', props.item.id, locked);
};

const handleSetGroupVisible = (visible: boolean) => {
  emit('setGroupVisible', props.item.id, visible);
};

const handleRenameGroup = () => {
  emit('renameGroup', props.item.id);
};

const handleRemoveGroup = () => {
  emit('removeGroup', props.item.id);
};

const handleClickGraphic = (id: string, event: MouseEvent) => {
  emit('selectGraphic', id, event.ctrlKey || event.metaKey);
};

const handleCheckboxChange = (id: string, _: MouseEvent) => {
  emit('selectGraphic', id, true);
};

const handleDragStart = (id: string) => {
  emit('dragstart', id);
};

const handleDragEnd = () => {
  emit('dragend');
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
};

const handleDrop = (event: DragEvent, targetId: string) => {
  emit('drop', event, targetId);
};

const emitSelectGraphic = (id: string, addToSelection?: boolean) => {
  emit('selectGraphic', id, addToSelection);
};

const emitDragStart = (id: string) => {
  emit('dragstart', id);
};

const emitDragEnd = () => {
  emit('dragend');
};

const emitDrop = (event: DragEvent, targetId: string) => {
  emit('drop', event, targetId);
};

const emitToggleGraphicLock = (id: string) => {
  emit('toggleGraphicLock', id);
};

const emitToggleGraphicVisible = (graphic: any) => {
  emit('toggleGraphicVisible', graphic);
};

const emitToggleLayerDropdown = (id: string) => {
  emit('toggleLayerDropdown', id);
};

const emitToggleExpand = (id: string) => {
  emit('toggleExpand', id);
};

const emitSetGroupLocked = (groupId: string, locked: boolean) => {
  emit('setGroupLocked', groupId, locked);
};

const emitSetGroupVisible = (groupId: string, visible: boolean) => {
  emit('setGroupVisible', groupId, visible);
};

const emitRenameGroup = (groupId: string) => {
  emit('renameGroup', groupId);
};

const emitRemoveGroup = (groupId: string) => {
  emit('removeGroup', groupId);
};

const emitMoveToTop = (id: string) => {
  emit('moveToTop', id);
};

const emitMoveUp = (id: string) => {
  emit('moveUp', id);
};

const emitMoveDown = (id: string) => {
  emit('moveDown', id);
};

const emitMoveToBottom = (id: string) => {
  emit('moveToBottom', id);
};

const showContextMenu = (event: MouseEvent, graphic: any) => {
  emit('contextmenu', event, graphic);
};
</script>

<style scoped>
.layer-group {
  margin-bottom: 4px;
}

.layer-group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-group-header:hover {
  background-color: var(--control-button-hover);
}

.group-expand-icon {
  font-size: 8px;
  color: var(--text-secondary);
  width: 12px;
  text-align: center;
}

.group-icon {
  font-size: 12px;
}

.group-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  font-size: 11px;
  color: var(--text-secondary);
}

.group-lock-btn,
.group-visibility-btn,
.group-rename-btn,
.group-delete-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 3px;
  font-size: 10px;
  transition: all 0.2s ease;
}

.group-lock-btn:hover,
.group-visibility-btn:hover,
.group-rename-btn:hover,
.group-delete-btn:hover {
  background-color: var(--border);
  color: var(--text);
}

.group-delete-btn:hover {
  color: #ef4444;
}

.layer-group-content {
  padding-left: 16px;
  margin-top: 2px;
}

.layer-item {
  background-color: var(--background);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.layer-item:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
}

.layer-item.selected {
  background-color: rgba(52, 152, 219, 0.15);
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.layer-item.dragging {
  opacity: 0.5;
  border-style: dashed;
}

.layer-item-in-group {
  margin-left: 8px;
}

.layer-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.layer-checkbox {
  flex-shrink: 0;
}

.layer-checkbox input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--primary);
}

.layer-button {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  border-radius: 3px;
}

.layer-button:hover {
  background-color: var(--border);
  color: var(--text);
}

.layer-thumbnail {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  background-color: var(--surface);
  overflow: hidden;
  flex-shrink: 0;
}

.layer-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
}

.layer-controls {
  display: flex;
  gap: 2px;
}

.layer-action {
  width: 18px;
  height: 18px;
  font-size: 10px;
}

.layer-dropdown {
  position: relative;
}
</style>
