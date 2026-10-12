<template>
  <div class="shortcuts-tab">
    <!-- 说明 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">⌨️</span>
        <span class="group-text">{{ $t('settings.shortcuts') }}</span>
      </div>
    </div>

    <!-- 选择类快捷键 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">🎯</span>
        <span class="group-text">{{ $t('settings.shortcutsSelection') }}</span>
      </div>
      
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.deselect') }}</span>
        <span class="shortcut-key">Esc</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.selectAll') }}</span>
        <span class="shortcut-key">Ctrl + A</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.deselectAll') }}</span>
        <span class="shortcut-key">Ctrl + Shift + A</span>
      </div>
    </div>

    <!-- 编辑类快捷键 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">✂️</span>
        <span class="group-text">{{ $t('settings.shortcutsEdit') }}</span>
      </div>
      
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.deleteSelected') }}</span>
        <span class="shortcut-key">Delete</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.copy') }}</span>
        <span class="shortcut-key">Ctrl + C</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.cut') }}</span>
        <span class="shortcut-key">Ctrl + X</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.paste') }}</span>
        <span class="shortcut-key">Ctrl + V</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.duplicate') }}</span>
        <span class="shortcut-key">Ctrl + D</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.undo') }}</span>
        <span class="shortcut-key">Ctrl + Z</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.redo') }}</span>
        <span class="shortcut-key">Ctrl + Y</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.save') }}</span>
        <span class="shortcut-key">Ctrl + S</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.group') }}</span>
        <span class="shortcut-key">Ctrl + G</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.ungroup') }}</span>
        <span class="shortcut-key">Ctrl + Shift + G</span>
      </div>
    </div>

    <!-- 移动类快捷键 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">🖱️</span>
        <span class="group-text">{{ $t('settings.shortcutsMove') }}</span>
      </div>
      
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.moveUp') }}</span>
        <span class="shortcut-key">↑</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.moveDown') }}</span>
        <span class="shortcut-key">↓</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.moveLeft') }}</span>
        <span class="shortcut-key">←</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.moveRight') }}</span>
        <span class="shortcut-key">→</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.moveUpLarge') }}</span>
        <span class="shortcut-key">Shift + ↑</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.moveDownLarge') }}</span>
        <span class="shortcut-key">Shift + ↓</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.moveLeftLarge') }}</span>
        <span class="shortcut-key">Shift + ←</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.moveRightLarge') }}</span>
        <span class="shortcut-key">Shift + →</span>
      </div>
    </div>

    <!-- 层级类快捷键 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">📊</span>
        <span class="group-text">{{ $t('settings.shortcutsLayer') }}</span>
      </div>
      
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.layerUp') }}</span>
        <span class="shortcut-key">Ctrl + ↑</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.layerDown') }}</span>
        <span class="shortcut-key">Ctrl + ↓</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.layerTop') }}</span>
        <span class="shortcut-key">Ctrl + Shift + ↑</span>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('settings.layerBottom') }}</span>
        <span class="shortcut-key">Ctrl + Shift + ↓</span>
      </div>
    </div>

    <!-- 预览类快捷键 -->
    <div class="setting-group">
      <div class="group-title">
        <span class="group-icon">🔍</span>
        <span class="group-text">{{ $t('settings.shortcutsPreview') }}</span>
      </div>
      
      <div class="shortcut-row">
        <span class="shortcut-name">{{ $t('editorTools.previewInNewTab') }}</span>
        <span class="shortcut-key">F5</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
 
</script>

<style scoped>
.shortcuts-tab {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.group-icon {
  font-size: 16px;
}

.group-text {
  font-size: 15px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--surface);
  border-radius: 4px;
  border: 1px solid var(--border);
}

.shortcut-name {
  font-size: 14px;
  color: var(--text);
}

.shortcut-key {
  font-size: 13px;
  color: var(--text-secondary);
  background-color: var(--surface);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
  font-family: monospace;
}
</style>
