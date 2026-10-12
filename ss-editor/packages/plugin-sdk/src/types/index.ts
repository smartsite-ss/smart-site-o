// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type { IPluginManifest } from './IPluginManifest';
export type { IPluginInstance } from './IPluginInstance';
export type { IRenderer } from './IRenderer';
export { SCHEMA_GROUP } from './PluginPropertySchema';
export type { PluginPropertySchema, PluginPropertySchemaField, SchemaMigration, PluginTestDefinition, SchemaField } from './PluginPropertySchema';
export { RenderBackend } from './RenderBackend';
export type { RenderBackendCategory } from './RenderBackend';
export { DeployMode } from './DeployMode';
export type { DeployModeType } from './DeployMode';
export type { Rect } from './Rect';
export { ColorUtils } from './ColorUtils';
export { DrawContext } from './DrawContext';
export type {
  PipeOptions,
  FlangeOptions,
  MetallicOptions,
  StatusLightOptions,
  GaugeArcOptions,
  NeedleOptions,
  ValveBodyOptions,
  TankBodyOptions,
  IndicatorRectOptions,
  TextOptions,
  DrawPipePathOptions,
} from './DrawContext';
export type { IPosition, ISize, IGeometry, IGraphicStyle, IGraphicConfig, IGraphicJSON, IEvent, IEventAction, IEventCondition, EventContext, IGraphicEvent, IDataValidation, IDataSource, IAnimation, IGraphicProps } from './IProperty';
export type { EventType, ActionType, ConditionOperator } from './IProperty';
export type { GraphicPropertyChanges, DataBindingPayload, IGraphic } from './IGraphic';
export type { IPage } from './IPage';
export type { IPageContext } from './IPageContext';
export type { QualityCode, QualityIndicator } from './QualityCode';
export { QUALITY_VISUAL_MAP } from './QualityCode';
export type {
  DataActionType,
  DataActionSetProperty,
  DataActionSetStyle,
  DataActionSetAnimation,
  DataActionTriggerAction,
  DataAction,
  AlarmRecord,
  PipelineResult,
  DataInputPayload,
} from './DataInputPayload';