// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 菜单配置文件
// 定义菜单项数据结构和默认菜单配置

import { i18n } from '@scada-editor/core'
import { iconMap } from '../common/icons'

export interface MenuItem {
  id: string;
  name: string;
  icon: string | (() => any);
  type: 'normal' | 'dropdown' | 'submenu';
  children?: MenuItem[];
  category?: string; // 用于图元分类
  shortcut?: string; // 快捷键
  action?: string; // 动作类型
}

const t = (key: string) => i18n.global.t(key)

export const menuConfig: MenuItem[] = [
  {
    id: 'project',
    name: t('menu.project'),
    icon: iconMap.project,
    type: 'dropdown',
    children: [
      {
        id: 'open',
        name: t('menu.open'),
        icon: '📂',
        type: 'normal',
        shortcut: 'Ctrl+O',
        action: 'open-project'
      },
      {
        id: 'close',
        name: t('menu.close'),
        icon: '✕',
        type: 'normal',
        action: 'close-project'
      },
      {
        id: 'save',
        name: t('menu.save'),
        icon: '💾',
        type: 'normal',
        action: 'save'
      },
      {
        id: 'export',
        name: t('menu.export'),
        icon: '📤',
        type: 'normal',
        action: 'export-project'
      },
      {
        id: 'import',
        name: t('menu.import'),
        icon: '📥',
        type: 'normal',
        action: 'import-project'
      }
    ]
  },
  {
    id: 'page',
    name: t('menu.page'),
    icon: iconMap.page,
    type: 'dropdown',
    children: [
      {
        id: 'save',
        name: t('menu.save'),
        icon: '💾',
        type: 'normal',
        shortcut: 'Ctrl+S',
        action: 'save'
      },
      {
        id: 'undo',
        name: t('menu.undo'),
        icon: '↩️',
        type: 'normal',
        shortcut: 'Ctrl+Z',
        action: 'undo'
      },
      {
        id: 'redo',
        name: t('menu.redo'),
        icon: '↪️',
        type: 'normal',
        shortcut: 'Ctrl+Y',
        action: 'redo'
      },
      {
        id: 'history',
        name: t('menu.history'),
        icon: '📜',
        type: 'normal',
        action: 'history'
      },
      {
        id: 'select',
        name: t('menu.select'),
        icon: '👆',
        type: 'normal',
        action: 'select'
      },
      {
        id: 'paste',
        name: t('menu.paste'),
        icon: '📋',
        type: 'normal',
        shortcut: 'Ctrl+V',
        action: 'paste'
      }
    ]
  },
  {
    id: 'general',
    name: t('menu.general'),
    icon: iconMap.general,
    type: 'submenu'
  },
  {
    id: 'components',
    name: t('menu.components'),
    icon: iconMap.components,
    type: 'normal'
  }
];
