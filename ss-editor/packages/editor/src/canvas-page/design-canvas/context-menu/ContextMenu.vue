<template>
  <div 
    v-if="visible" 
    class="context-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <!-- 选中图元时的菜单 -->
    <div
      v-if="selectedGraphicIds.length > 0"
      class="context-menu-content"
    >
      <div
        class="context-menu-item"
        @click="$emit('copy')"
      >
        <span class="icon">📋</span>
        <span class="text">复制</span>
        <span class="shortcut">Ctrl+C</span>
      </div>
      <div
        class="context-menu-item"
        @click="$emit('paste')"
      >
        <span class="icon">📋</span>
        <span class="text">粘贴</span>
        <span class="shortcut">Ctrl+V</span>
      </div>
      <div class="context-menu-divider" />
      <div
        class="context-menu-item"
        @click="$emit('bring-to-front')"
      >
        <span class="icon">⬆️</span>
        <span class="text">置顶</span>
        <span class="shortcut">Ctrl+Shift+↑</span>
      </div>
      <div
        class="context-menu-item"
        @click="$emit('send-to-back')"
      >
        <span class="icon">⬇️</span>
        <span class="text">置底</span>
        <span class="shortcut">Ctrl+Shift+↓</span>
      </div>
      <div
        class="context-menu-item"
        @click="$emit('bring-forward')"
      >
        <span class="icon">↗️</span>
        <span class="text">上移一层</span>
        <span class="shortcut">Ctrl+↑</span>
      </div>
      <div
        class="context-menu-item"
        @click="$emit('send-backward')"
      >
        <span class="icon">↘️</span>
        <span class="text">下移一层</span>
        <span class="shortcut">Ctrl+↓</span>
      </div>
      <div class="context-menu-divider" />
      <div
        class="context-menu-item"
        @click="$emit('delete')"
      >
        <span class="icon">🗑️</span>
        <span class="text">删除图层</span>
        <span class="shortcut">Delete</span>
      </div>
      <div
        class="context-menu-item"
        @click="$emit('duplicate')"
      >
        <span class="icon">📋</span>
        <span class="text">创建副本</span>
        <span class="shortcut">Ctrl+D</span>
      </div>
      <div
        v-if="selectedGraphicIds.length > 1"
        class="context-menu-item"
        @click="$emit('group')"
      >
        <span class="icon">🔗</span>
        <span class="text">组合</span>
        <span class="shortcut">Ctrl+G</span>
      </div>
      <div
        v-if="isGroup"
        class="context-menu-item"
        @click="$emit('ungroup')"
      >
        <span class="icon">🔗</span>
        <span class="text">取消组合</span>
        <span class="shortcut">Ctrl+Shift+G</span>
      </div>
      <div
        v-if="selectedGraphicIds.length > 1 || isGroup"
        class="context-menu-divider"
      />
      <div
        class="context-menu-item"
        @click="$emit('toggle-lock')"
      >
        <span class="icon">{{ isGraphicLocked ? '🔓' : '🔒' }}</span>
        <span class="text">{{ isGraphicLocked ? '解锁图层' : '锁定图层' }}</span>
        <span class="shortcut">Shift+Ctrl+L</span>
      </div>
      <div
        class="context-menu-item"
        @click="$emit('toggle-visibility')"
      >
        <span class="icon">{{ isGraphicVisible ? '👁️' : '👁️‍🗨️' }}</span>
        <span class="text">{{ isGraphicVisible ? '隐藏图层' : '显示图层' }}</span>
        <span class="shortcut">Shift+Ctrl+H</span>
      </div>
      <div class="context-menu-divider" />
      <div
        class="context-menu-item"
        @click="$emit('export-data')"
      >
        <span class="icon">📤</span>
        <span class="text">导出图层数据</span>
      </div>
    </div>
    <!-- 未选中图元时的菜单 -->
    <div
      v-else
      class="context-menu-content"
    >
      <div
        class="context-menu-item"
        @click="$emit('paste')"
      >
        <span class="icon">📋</span>
        <span class="text">粘贴</span>
        <span class="shortcut">Ctrl+V</span>
      </div>
      <div class="context-menu-divider" />
      <div
        class="context-menu-item"
        @click="$emit('export-scene-data')"
      >
        <span class="icon">📤</span>
        <span class="text">导出场景数据</span>
      </div>
      <div
        class="context-menu-item"
        @click="$emit('export-scene')"
      >
        <span class="icon">📤</span>
        <span class="text">导出场景</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">


interface Props {
  visible: boolean;
  position: { x: number; y: number };
  selectedGraphicIds: string[];
  isGraphicLocked: boolean;
  isGraphicVisible: boolean;
  isGroup: boolean;
}

const _props = defineProps<Props>();

const _emit = defineEmits([
  'toggle-lock',
  'toggle-visibility',
  'delete',
  'duplicate',
  'copy',
  'paste',
  'bring-to-front',
  'send-to-back',
  'bring-forward',
  'send-backward',
  'group',
  'ungroup',
  'export-data',
  'preview',
  'export-scene-data',
  'export-scene'
]);
</script>

<style scoped>
/* 右键菜单样式 */
.context-menu {
  position: fixed;
  z-index: 10000;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: var(--shadow-large);
  overflow: hidden;
  min-width: 200px;
}

.context-menu-content {
  display: flex;
  flex-direction: column;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text);
}

.context-menu-item:hover {
  background-color: var(--control-button-hover);
}

.context-menu-item .icon {
  margin-right: 8px;
  font-size: 14px;
  width: 16px;
  text-align: center;
}

.context-menu-item .text {
  flex: 1;
  font-size: 13px;
}

.context-menu-item .shortcut {
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: 8px;
}

.context-menu-divider {
  height: 1px;
  background-color: var(--border);
  margin: 4px 0;
}
</style>