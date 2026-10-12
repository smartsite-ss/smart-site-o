// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 图元编辑子系统 - 图元数据模型
export type { IGraphic, GraphicPropertyChanges, DataBindingPayload } from '@scada-editor/plugin-sdk';
export { BaseGraphic } from '@scada-editor/plugin-sdk';
export * from './graphic-editing/graphic/base/BasePage';
export { DrawPipeline } from '@scada-editor/plugin-sdk';
export { createPropertyAccessor, type PropertyAccessorOptions } from '@scada-editor/plugin-sdk';
export * from './graphic-editing/graphic/factory/GraphicFactory';
export { Graphic, type GraphicFeatureFlags, type GraphicThemeColors, type GraphicOptions } from '@scada-editor/plugin-sdk';

// 图元编辑子系统 - PluginKit (方案A)
export * from './graphic-editing/plugin';

// 图元动画子系统
export * from './animations';

// 画布与页面子系统 - 渲染器
export * from './canvas-page/renderer/types';
export * from './canvas-page/renderer/RendererFactory';
export * from './canvas-page/renderer/CanvasRenderer';
export * from './canvas-page/renderer/canvas2d/Canvas2DBackend';
export * from './canvas-page/renderer/KonvaRenderer';

// 状态管理
export * from './store/graphic.store';
export * from './store/page.store';
export * from './store/config.store';
export * from './store/persistent-store';

// 画布与页面子系统 - 页面模板
export * from './canvas-page/templates';

// 服务
export * from './services/state.service';
export * from './canvas-page/keyboard.service';
export * from './canvas-page/export.service';
export * from './canvas-page/page-export.service';
export * from './platform/collaboration.service';
export * from './services/storage.service';
export * from './services/InterpageTransferService';
// 保存服务
export * from './services/save/types';
export * from './services/save/SaveServiceManager';

// Composables（编辑器专用 composable 已迁移至 @scada-editor/editor）

// 配置
export * from './canvas-page/shortcuts.config';
export * from './config/ConfigTemplateManager';
export * from './config/project.config';

// 插件系统（已迁移至 @scada-editor/plugin-sdk）
// 请使用 @scada-editor/plugin-sdk 中的 definePlugin / createPlugin / usePluginConfig

// 平台扩展子系统 - 事件总线
export * from './platform/event/EventBus';

// 平台扩展子系统 - 消息服务
export * from './utils/event/MessageService';

// 平台扩展子系统 - 依赖注入
export * from './platform/di/DIContainer';

// 图元编辑子系统 - 管理器
export * from './graphic-editing/managers/AlignmentManager';
export * from './graphic-editing/managers/BatchOperationManager';
export * from './graphic-editing/managers/ClipboardManager';
export * from './graphic-editing/managers/GridSnapManager';
export * from './graphic-editing/managers/GroupManager';
export * from './graphic-editing/managers/HistoryManager';
export * from './graphic-editing/managers/SelectionManager';
export * from './graphic-editing/managers/SmartAlignManager';
export * from './graphic-editing/managers/FormatPainterManager';
// 画布与页面子系统 - 管理器
export * from './canvas-page/managers/LayerManager';
export * from './canvas-page/managers/LayoutManager';
export * from './canvas-page/managers/PageManager';
export * from './canvas-page/managers/ZoomManager';
// 运行态子系统 - 管理器
export * from './runtime';

// 项目和编辑器入口
export { Project } from './project/Project';
export type { IProject } from './project/Project';
export * from './project/Editor';

// 布局系统
export * from './canvas-page/layouts/base/ILayout';
export * from './canvas-page/layouts/base/BaseLayout';
export * from './canvas-page/layouts/types/FlowLayout';
export * from './canvas-page/layouts/types/FreeLayout';
export * from './canvas-page/layouts/types/GridLayout';
export * from './canvas-page/layouts/types/CircleLayout';

// 工具（向后兼容）
export * from './utils';

// 画布与页面子系统 - 主题系统
export * from './canvas-page/theme';
export * from './canvas-page/theme/GraphicStyleManager';

// 国际化
export * from './locales';

// 导入主题样式
import './canvas-page/theme/styles/theme.css';

// 类型
// 显式导出 types 中的类型和枚举，避免与 IGraphic 等重名成员冲突
export * from './types/index';

// ── scada-data 数据管理模块 ──
export * from './scada-data/index';

// ── AI Agent 客户端（P1-T04）──
export * from './ai/ai-client';

// ── AI Agent Runtime（P1-T03）──
export { IntentParser, intentParser } from './ai/intent-parser';
export type { IntentType, IntentComplexity, IntentResult } from './ai/intent-parser';
export { SingleStepAgent, singleStepAgent } from './ai/single-step-agent';
export type { SingleStepResult, AgentConfig } from './ai/single-step-agent';
export { ToolExecutor, toolExecutor } from './ai/tool-executor';
export type { ToolParam, ToolDefinition, ToolResult, ToolExecuteOptions } from './ai/tool-executor';
export { ContextManager, contextManager } from './ai/context-manager';
export type { EditorContext, RuntimeContext, UserContext, AgentContext } from './ai/context-manager';

// ── AI Editor Tools（P1-T04）──
export { registerEditorTools, getEditorToolList, isHighRiskTool, getToolsBySafetyLevel } from './ai/editor-tools';

// ── AI Agent — Plugin Dev (P1-T05) ──
export { PluginGeneratorAgent, pluginGeneratorAgent } from './ai/plugin-generator-agent';
export type { PluginPropertyField, PluginSchema, PluginGenInput, PluginGenResult, PluginRenderBackend } from './ai/plugin-generator-agent';
export { PluginFileWriter, pluginFileWriter } from './ai/plugin-writer';
export type { PluginFileTree, PluginBuildResult } from './ai/plugin-writer';

// ── AI Agent — Script Dev (P1-T06) ──
export { ScriptGeneratorAgent, scriptGeneratorAgent } from './ai/script-generator-agent';
export type { ScriptGenInput, ScriptGenResult } from './ai/script-generator-agent';
export { TriggerMatcher, triggerMatcher } from './ai/trigger-matcher';
export type { TriggerType, TriggerMatchResult } from './ai/trigger-matcher';
export { buildScriptPreview, generateInsertableCode } from './ai/script-preview';
export type { ScriptPreview } from './ai/script-preview';

// ── AI Agent — Shared Parser ──
export { parseCodeBlocks, extractCodeBlocks } from './ai/code-parser';
export type { ParsedFile, ParsedResult } from './ai/code-parser';

// ── AI Agent — Code Validator (P1-T05/P1-T06) ──
export { CodeValidator, codeValidator, validateCode, validateCodeForDisplay } from './ai/code-validator';
export type { ValidationError, ValidationResult } from './ai/code-validator';

// ── AI Agent — Evaluation (P1-T10) ──
export {
  EVAL_CASES,
  EVAL_STATS,
  runEvaluation,
  formatReportText,
  formatReportMarkdown,
  buildComparisonMatrix,
  formatComparisonMatrix,
  formatComparisonMarkdown,
} from './ai/evaluation';
export type {
  EvalCase,
  EvalDimension,
  EvalStructureCheck,
  EvalRunConfig,
  EvalAIResponse,
  EvalCaseResult,
  EvalDimensionResult,
  EvalReport,
  EvalSummary,
  CategoryStat,
  ModelComparisonEntry,
} from './ai/evaluation';