// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 画布与页面子系统 - 设计态画布
import DesignCanvas from './canvas-page/design-canvas/DesignCanvas.vue';
import CanvasRulers from './canvas-page/design-canvas/CanvasRulers.vue';
import GridOverlay from './canvas-page/design-canvas/overlays/GridOverlay.vue';
import SelectionRectangle from './canvas-page/design-canvas/overlays/SelectionRectangle.vue';
import VueComponentsContainer from './canvas-page/design-canvas/core/VueComponentsContainer.vue';

// 运行态子系统
import PreviewCanvas from './runtime/PreviewCanvas.vue';

// 页面浏览器控件
import PageBrowser from './canvas-page/page-browser/PageBrowser.vue';

// 注册 PageBrowser 到全局组件注册表（供插件通过名称查找，避免循环依赖）
import { GraphicComponentRegistry } from '@scada-editor/plugin-sdk';
GraphicComponentRegistry.register('system-page-browser', PageBrowser);

// 通用组件
export { ColorPicker, ColorField } from '@scada-editor/shared';
import ContextMenu from './common/ContextMenu.vue';
import GenericConfig from './common/GenericConfig.vue';
import Icon from './common/Icon.vue';
import MessageToast from './common/MessageToast.vue';
import ResizeHandle from './common/ResizeHandle.vue';
import TagSelector from './common/TagSelector.vue';
import ValueAdjuster from './common/ValueAdjuster.vue';

// 主题组件
import EditorThemeProvider from './common/theme/ThemeProvider.vue';
import ThemeSwitcher from './common/theme/ThemeSwitcher.vue';

// 布局组件
import SystemLayout from './layouts/SystemLayout.vue';

// 图元编辑子系统 - 图形组件
import GraphicRenderer from './graphic-editing/graphics/GraphicRenderer.vue';
import GraphicWrapper from './graphic-editing/graphics/GraphicWrapper.vue';

// 图元编辑子系统 - 面板
import Toolbar from './graphic-editing/toolbox/Toolbar.vue';
import GraphicLibrary from './graphic-editing/toolbox/GraphicLibrary.vue';
import LayerPanel from './graphic-editing/layer/LayerPanel.vue';
import SidePanel from './graphic-editing/layer/SidePanel.vue';
import PropertyPanel from './graphic-editing/property/PropertyPanel.vue';
import StylePanel from './graphic-editing/property/StylePanel.vue';
import InteractionPanel from './graphic-editing/property/InteractionPanel.vue';

// SCADA数据子系统
import DataPanel from './graphic-editing/property/sections/data/DataPanel.vue';

// 画布与页面子系统 - 页面管理
import PageTabs from './canvas-page/page-tabs/PageTabs.vue';
import TabPanel from './canvas-page/page-tabs/TabPanel.vue';

// 调试面板
import DebugTools from './panels/debug/DebugTools.vue';
import JsonPanel from './panels/json/JsonPanel.vue';
import ConfigTestPage from './test/ConfigTestPage.vue';

// Editor 组件
import AppHeader from './editor/AppHeader/AppHeader.vue';
import BrandLogo from './editor/AppHeader/BrandLogo.vue';
import GlobalTools from './editor/AppHeader/GlobalTools.vue';
import MainNavigation from './editor/AppHeader/MainNavigation.vue';
import UserInfo from './editor/AppHeader/UserInfo.vue';
import EditorTools from './editor/EditorTools/EditorTools.vue';
import MenuContainer from './editor/menu/MenuContainer.vue';
import MenuDropdown from './editor/menu/MenuDropdown.vue';
import MenuItem from './editor/menu/MenuItem.vue';
import MenuSubmenu from './editor/menu/MenuSubmenu.vue';

// Settings 组件
import SettingsModal from './settings/SettingsModal.vue';
import InterfaceTab from './settings/InterfaceTab.vue';
import CanvasTab from './settings/CanvasTab.vue';
import ToolsTab from './settings/ToolsTab.vue';
import ShortcutsTab from './settings/ShortcutsTab.vue';
import LayoutTab from './settings/LayoutTab.vue';

// Utils
import { showAlert, showConfirm, showPrompt, showError, showSuccess, showInfo } from './utils/messageBox';

// Composables
import { useCanvasInteraction } from './composables/useCanvasInteraction';
import { useCanvasKeyboardShortcuts } from './composables/useCanvasKeyboardShortcuts';
import { useCanvasExport } from './composables/useCanvasExport';
import { useVirtualList } from './composables/useVirtualList';
import { useGraphic } from './composables/useGraphic';
import { useEditorSave } from './composables/useEditorSave';
import { useProjectData } from './composables/useProjectData';
import { useProjectSave } from './composables/useProjectSave';

// Plugin System
import { UIPluginManager, getUIPluginManager } from './plugin/PluginManager';

// Script Editor
import ScriptEditor from './components/script/ScriptEditor.vue';
import ScriptDrawer from './components/script/ScriptDrawer.vue';
import { useScriptDrawer } from './components/script/useScriptDrawer';
export type { ScriptDrawerTab } from './components/script/useScriptDrawer';

// AI Assistant (P1-T04)
import AiAssistantPanel from './components/ai-assistant/AiAssistantPanel.vue';
import FloatingAiPanel from './components/ai-assistant/FloatingAiPanel.vue';
import { useStreamChat } from './components/ai-assistant/useStreamChat';
export type { ChatMessageItem } from './components/ai-assistant/useStreamChat';
import { useAgentStream } from './components/ai-assistant/useAgentStream';
export { useFeatureFlag } from './components/ai-assistant/useFeatureFlag';
export type { AgentStreamStep, AgentStreamCallbacks, AgentStreamOptions } from './components/ai-assistant/useAgentStream';

// Types (UI 特有类型)
export * from './types';

export {
  // 画布与页面子系统 - 设计态画布
  DesignCanvas,
  CanvasRulers,
  GridOverlay,
  SelectionRectangle,
  VueComponentsContainer,

  // 运行态子系统
  PreviewCanvas,

  // 页面浏览器控件
  PageBrowser,

  // 通用组件
  ContextMenu,
  GenericConfig,
  Icon,
  MessageToast,
  ResizeHandle,
  TagSelector,
  ValueAdjuster,

  // 主题组件
  EditorThemeProvider,
  ThemeSwitcher,

  // 布局组件
  SystemLayout,

  // 图元编辑子系统 - 图形组件
  GraphicRenderer,
  GraphicWrapper,

  // 图元编辑子系统 - 面板
  Toolbar,
  GraphicLibrary,
  LayerPanel,
  SidePanel,
  PropertyPanel,
  StylePanel,
  InteractionPanel,

  // SCADA数据子系统
  DataPanel,

  // 画布与页面子系统 - 页面管理
  PageTabs,
  TabPanel,

  // 调试面板
  DebugTools,
  JsonPanel,
  ConfigTestPage,

  // Editor 组件
  AppHeader,
  BrandLogo,
  GlobalTools,
  MainNavigation,
  UserInfo,
  EditorTools,
  MenuContainer,
  MenuDropdown,
  MenuItem,
  MenuSubmenu,

  // Settings 组件
  SettingsModal,
  InterfaceTab,
  CanvasTab,
  ToolsTab,
  ShortcutsTab,
  LayoutTab,

  // Utils
  showAlert,
  showConfirm,
  showPrompt,
  showError,
  showSuccess,
  showInfo,

  // Composables
  useCanvasInteraction,
  useCanvasKeyboardShortcuts,
  useCanvasExport,
  useVirtualList,
  useGraphic,
  useEditorSave,
  useProjectData,
  useProjectSave,

  // Plugin System
  UIPluginManager,
  getUIPluginManager,

  // Script Editor
  ScriptEditor,
  ScriptDrawer,
  useScriptDrawer,

  // AI Assistant (P1-T04)
  AiAssistantPanel,
  FloatingAiPanel,
  useStreamChat,
  useAgentStream,
};