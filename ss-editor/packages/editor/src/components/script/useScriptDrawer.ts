// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { reactive } from 'vue';

/** 抽屉中打开的脚本标签 */
export interface ScriptDrawerTab {
  /** 唯一标识 */
  id: string;
  /** 标签标题 */
  title: string;
  /** 脚本内容 */
  script: string;
  /** 脚本模式 */
  mode: 'timer' | 'driver' | 'filter' | 'interaction' | 'expression';
  /** 来源信息（用于回写） */
  source: {
    type: 'timer' | 'datasource' | 'interaction' | 'filter';
    /** 来源组件标识，如 timerId */
    sourceId: string;
  };
  /** 是否已修改 */
  dirty: boolean;
}

/** 脚本抽屉共享状态 */
const drawerState = reactive({
  /** 抽屉是否可见 */
  visible: false,
  /** 抽屉高度（px） */
  height: 280,
  /** 已打开的标签列表 */
  tabs: [] as ScriptDrawerTab[],
  /** 当前激活的标签ID */
  activeTabId: null as string | null,
  /** 最小高度 */
  minHeight: 100,
  /** 最大高度 */
  maxHeight: 600,
});

/** 回调：当脚本内容更新时，通知来源组件 */
type ScriptUpdateCallback = (script: string) => void;

const updateCallbacks = new Map<string, ScriptUpdateCallback>();

/**
 * 脚本抽屉 composable
 * 用于在编辑器底部打开/关闭脚本编辑抽屉
 */
export function useScriptDrawer() {
  /**
   * 打开或切换到指定脚本标签
   */
  function openScript(tab: Omit<ScriptDrawerTab, 'dirty'>, onUpdate?: ScriptUpdateCallback): void {
    const existing = drawerState.tabs.find((t) => t.id === tab.id);
    if (existing) {
      // 已存在，切换到该标签
      drawerState.activeTabId = tab.id;
      // 更新内容（可能来源组件已修改）
      if (existing.script !== tab.script) {
        existing.script = tab.script;
      }
    } else {
      // 新建标签
      const newTab: ScriptDrawerTab = { ...tab, dirty: false };
      drawerState.tabs.push(newTab);
      drawerState.activeTabId = tab.id;
    }

    if (onUpdate) {
      updateCallbacks.set(tab.id, onUpdate);
    }

    drawerState.visible = true;
  }

  /**
   * 关闭指定标签
   */
  function closeTab(tabId: string): void {
    const idx = drawerState.tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;

    drawerState.tabs.splice(idx, 1);
    updateCallbacks.delete(tabId);

    if (drawerState.tabs.length === 0) {
      drawerState.visible = false;
      drawerState.activeTabId = null;
    } else if (drawerState.activeTabId === tabId) {
      drawerState.activeTabId = drawerState.tabs[Math.min(idx, drawerState.tabs.length - 1)].id;
    }
  }

  /**
   * 关闭所有标签
   */
  function closeAll(): void {
    drawerState.tabs = [];
    drawerState.activeTabId = null;
    drawerState.visible = false;
    updateCallbacks.clear();
  }

  /**
   * 切换抽屉可见性
   */
  function toggle(): void {
    drawerState.visible = !drawerState.visible;
  }

  /**
   * 更新脚本内容（由 ScriptEditor 触发）
   */
  function updateScript(tabId: string, script: string): void {
    const tab = drawerState.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.script = script;
      tab.dirty = true;
    }

    // 通知来源组件
    const cb = updateCallbacks.get(tabId);
    if (cb) {
      cb(script);
    }
  }

  /**
   * 保存脚本（由保存按钮触发）
   * 将脚本内容持久化，并标记 tab 为已保存
   */
  function saveScript(tabId: string, script: string): void {
    const tab = drawerState.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.script = script;
      tab.dirty = false;
    }

    // 通知来源组件保存
    const cb = updateCallbacks.get(tabId);
    if (cb) {
      cb(script);
    }
  }

  /**
   * 设置抽屉高度
   */
  function setHeight(h: number): void {
    drawerState.height = Math.max(drawerState.minHeight, Math.min(drawerState.maxHeight, h));
  }

  return {
    drawerState,
    openScript,
    closeTab,
    closeAll,
    toggle,
    updateScript,
    saveScript,
    setHeight,
  };
}