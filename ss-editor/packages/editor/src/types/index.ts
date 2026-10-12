// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Ref, Component } from 'vue';

// 画布交互选项
export interface CanvasInteractionOptions {
  panX: Ref<number>;
  panY: Ref<number>;
  canvasWidth: Ref<number>;
  canvasHeight: Ref<number>;
  cursorStyle: Ref<string>;
  hoveredGraphicId: Ref<string>;
  graphicDecorators: Ref<Record<string, any>>;
  formatPainterManager?: import('@scada-editor/core').FormatPainterManager;
}

// 面板配置
export interface PanelConfig {
  id: string;
  title: string;
  component: Component;
  position: 'left' | 'right' | 'bottom';
  defaultOpen?: boolean;
  icon?: string;
}

// 工具配置
export interface ToolConfig {
  id: string;
  name: string;
  icon: string;
  component?: Component;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

// UI 插件接口
export interface UIPlugin {
  name: string;
  install(context: any): void;
  components?: Record<string, Component>;
  panels?: PanelConfig[];
  tools?: ToolConfig[];
}
