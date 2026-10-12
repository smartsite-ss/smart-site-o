// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { KeyboardContext, KeyModifiers } from './keyboard.service';
import { i18n } from '../locales';

const t = (key: string) => i18n.global.t(key)

// 快捷键配置类型
export interface ShortcutConfig {
  id: string;
  name: string;
  description?: string;
  key: string;
  modifiers: KeyModifiers;
  context: KeyboardContext;
  priority: number;
  category?: string;
}

// 默认快捷键配置
export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // 编辑模式快捷键
  {
    id: 'clearSelection',
    name: t('settings.deselect'),
    key: 'escape',
    modifiers: {},
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsSelection')
  },
  {
    id: 'deleteSelection',
    name: t('settings.deleteSelected'),
    key: 'delete',
    modifiers: {},
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsEdit')
  },
  {
    id: 'deleteSelectionBackspace',
    name: t('settings.deleteSelected'),
    key: 'backspace',
    modifiers: {},
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsEdit')
  },
    {
      id: 'copy',
      name: t('settings.copy'),
      key: 'c',
      modifiers: { ctrl: true },
      context: KeyboardContext.EDIT,
      priority: 5,
      category: t('settings.shortcutsEdit')
    },
    {
      id: 'cut',
      name: t('settings.cut'),
      key: 'x',
      modifiers: { ctrl: true },
      context: KeyboardContext.EDIT,
      priority: 5,
      category: t('settings.shortcutsEdit')
    },
    {
      id: 'paste',
      name: t('settings.paste'),
      key: 'v',
      modifiers: { ctrl: true },
      context: KeyboardContext.EDIT,
      priority: 5,
      category: t('settings.shortcutsEdit')
    },
  {
    id: 'duplicate',
    name: t('settings.duplicate'),
    key: 'd',
    modifiers: { ctrl: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsEdit')
  },
  {
    id: 'undo',
    name: t('settings.undo'),
    key: 'z',
    modifiers: { ctrl: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsEdit')
  },
  {
    id: 'redoY',
    name: t('settings.redo'),
    key: 'y',
    modifiers: { ctrl: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsEdit')
  },
  {
    id: 'redoZ',
    name: t('settings.redo'),
    key: 'z',
    modifiers: { ctrl: true, shift: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsEdit')
  },
  {
    id: 'selectAll',
    name: t('settings.selectAll'),
    key: 'a',
    modifiers: { ctrl: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsSelection')
  },
  {
    id: 'deselectAll',
    name: t('settings.deselectAll'),
    key: 'a',
    modifiers: { ctrl: true, shift: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsSelection')
  },
  {
    id: 'moveUp',
    name: t('settings.moveUp'),
    key: 'arrowup',
    modifiers: {},
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsMove')
  },
  {
    id: 'moveDown',
    name: t('settings.moveDown'),
    key: 'arrowdown',
    modifiers: {},
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsMove')
  },
  {
    id: 'moveLeft',
    name: t('settings.moveLeft'),
    key: 'arrowleft',
    modifiers: {},
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsMove')
  },
  {
    id: 'moveRight',
    name: t('settings.moveRight'),
    key: 'arrowright',
    modifiers: {},
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsMove')
  },
  {
    id: 'moveUpLarge',
    name: t('settings.moveUpLarge'),
    key: 'arrowup',
    modifiers: { shift: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsMove')
  },
  {
    id: 'moveDownLarge',
    name: t('settings.moveDownLarge'),
    key: 'arrowdown',
    modifiers: { shift: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsMove')
  },
  {
    id: 'moveLeftLarge',
    name: t('settings.moveLeftLarge'),
    key: 'arrowleft',
    modifiers: { shift: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsMove')
  },
  {
    id: 'moveRightLarge',
    name: t('settings.moveRightLarge'),
    key: 'arrowright',
    modifiers: { shift: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsMove')
  },
  {
    id: 'group',
    name: t('settings.group'),
    key: 'g',
    modifiers: { ctrl: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsEdit')
  },
  {
    id: 'ungroup',
    name: t('settings.ungroup'),
    key: 'g',
    modifiers: { ctrl: true, shift: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsEdit')
  },
  {
    id: 'bringForward',
    name: t('settings.layerUp'),
    key: 'arrowup',
    modifiers: { ctrl: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsLayer')
  },
  {
    id: 'sendBackward',
    name: t('settings.layerDown'),
    key: 'arrowdown',
    modifiers: { ctrl: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsLayer')
  },
  {
    id: 'bringToFront',
    name: t('settings.layerTop'),
    key: 'arrowup',
    modifiers: { ctrl: true, shift: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsLayer')
  },
  {
    id: 'sendToBack',
    name: t('settings.layerBottom'),
    key: 'arrowdown',
    modifiers: { ctrl: true, shift: true },
    context: KeyboardContext.EDIT,
    priority: 5,
    category: t('settings.shortcutsLayer')
  },
  {
    id: 'save',
    name: t('settings.save'),
    key: 's',
    modifiers: { ctrl: true },
    context: KeyboardContext.EDIT,
    priority: 10,
    category: t('settings.shortcutsEdit')
  },
  {
    id: 'saveAll',
    name: t('settings.saveAll'),
    key: 's',
    modifiers: { ctrl: true, shift: true },
    context: KeyboardContext.EDIT,
    priority: 10,
    category: t('settings.shortcutsEdit')
  },
  {
    id: 'previewInNewTab',
    name: t('settings.previewInNewTab'),
    key: 'f5',
    modifiers: {},
    context: KeyboardContext.EDIT,
    priority: 10,
    category: t('settings.shortcutsPreview')
  }
];

// 快捷键分类
export const SHORTCUT_CATEGORIES = [t('settings.shortcutsSelection'), t('settings.shortcutsEdit'), t('settings.shortcutsMove'), t('settings.shortcutsLayer'), t('settings.shortcutsPreview')];
