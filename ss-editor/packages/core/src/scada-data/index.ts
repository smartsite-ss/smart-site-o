// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export { BindingManager } from './managers/BindingManager';
export type { TagBinding, BindingSnapshot } from './managers/BindingManager';
export type { QualityCode } from './types/quality.types';

export type {
  DataSourceType,
  HttpPollingConfig,
  WebSocketConfig,
  OpcConfig,
  ModbusConfig,
  MqttConfig,
  SqlConfig,
  StaticConfig,
  ExpressionConfig,
  DataSourceConfig,
  DataSourceStatus,
  TagMeta,
  TagValue,
  DataSourceInfo,
} from './types/data-source.types';

export type {
  FilterType,
  FieldExtractConfig,
  TypeConvertConfig,
  ScaleTransformConfig,
  DeadbandConfig,
  FormatConfig,
  CustomConfig,
  FilterConfig,
  DataFilter,
  FilterExecutionResult,
  PipelineResult,
  PipelineErrorStrategy,
  PipelineErrorConfig,
  DataActionType,
  DataActionSetProperty,
  DataActionSetStyle,
  DataActionSetAnimation,
  DataActionTriggerAction,
  DataAction,
  DataInputPayload,
} from './types/pipeline.types';

export type {
  QualityIndicator,
  QualityRule,
  TagMetadata,
  QualityVisual,
} from './types/quality.types';

export { QUALITY_VISUAL_MAP } from './types/quality.types';

export type {
  AlarmLevel,
  AlarmState,
  AlarmRule,
  SuppressionRule,
  EscalationRule,
  AlarmNotifier,
  AlarmSummary,
} from './types/alarm.types';

export type {
  SimulationActionType,
  SimulationStep,
  ScenarioStatus,
  SimulationScenario,
} from './types/simulation.types';

export type {
  MockMode,
  HttpMockConfig,
  WsMockConfig,
  GeneratorType,
  GeneratorParams,
  DeviceTagMockConfig,
  FileImportConfig,
  MockDataSourceConfig,
} from './types/mock.types';

export type {
  ScadaEventType,
  ScadaEvent,
  EventRecord,
  EventListener,
  EventBusConfig,
} from './types/event-bus.types';

export type {
  DataPoint,
  TrendSeries,
  RingBuffer,
  TrendConfig,
  TrendData,
} from './types/trend.types';

export type {
  ProtocolType,
  IProtocolAdapter,
  ProtocolConnectionConfig,
  ProtocolDataPoint,
  ProtocolStatus,
  ProtocolDataPacket,
} from './types/protocol.types';

export { DataSourceManager } from './engine/DataSourceManager';
export { ScadaDataManager } from './engine/ScadaDataManager';
export { extractTagIds, readTagSnapshot, readTagSnapshots, buildSourceSummary } from './engine/DataSourceReader';
export type { TagValueSnapshot, SourceSummary, WsStoreLike } from './engine/DataSourceReader';
export { DataPipeline } from './engine/DataPipeline';
export { DataDriverEngine } from './engine/DataDriverEngine';
export { DataPipelineBridge } from './engine/DataPipelineBridge';
export { QualityManager } from './engine/QualityManager';
export { QualityVisualManager } from './engine/QualityVisualManager';
export { StaticDataSourceDriver } from './engine/StaticDataSource';
export { ExpressionDataSourceDriver } from './engine/ExpressionDataSource';
export { EventBus } from './engine/EventBus';
export { AlarmManager } from './engine/AlarmManager';
export { TrendManager } from './engine/TrendManager';
export { ScriptEngine } from './engine/ScriptEngine';
export { EventExecutionEngine } from './engine/EventExecutionEngine';
export type { ActionExecutor } from './engine/EventExecutionEngine';
export { ClientScriptAPIFactory } from './engine/ClientScriptAPI';
export { TaskScheduler } from './engine/TaskScheduler';
export { ExpressionTriggerManager } from './engine/ExpressionTrigger';
export type { ScriptResult, ScriptContext, ScriptAPI, SandboxEnv } from './types/script.types';
export type {
  ScriptDefinition,
  ScriptType,
  ScriptEditorMode,
  ScriptTrigger,
  ScriptTriggerConfig,
  EventBinding,
  ExecutionContext,
  ScriptLog,
  ScheduledTask,
  ExpressionTrigger,
} from './types/script.types';
export { ALLOWED_GLOBALS, BLOCKED_GLOBALS } from './types/script.types';
export { ProtocolManager } from './engine/ProtocolManager';

export { HttpPollingDriver } from './drivers/HttpPollingDriver';
export { SqlQueryDriver } from './drivers/SqlQueryDriver';
export { AbstractBaseDriver } from './drivers/AbstractBaseDriver';
export type { IDataSourceDriver } from './drivers/IDataSourceDriver';
export type { IFileImporter, TagConfig } from './drivers/IFileImporter';

export { MockEngine } from './mock/MockEngine';
export { SimulationEngine } from './mock/SimulationEngine';
export { SinWaveGenerator } from './mock/generators/SinWaveGenerator';
export { RandomWalkGenerator } from './mock/generators/RandomWalkGenerator';
export { PulseGenerator } from './mock/generators/PulseGenerator';
export { RampGenerator } from './mock/generators/RampGenerator';
export { NoiseGenerator } from './mock/generators/NoiseGenerator';
export type { IDataGenerator } from './mock/generators/IDataGenerator';

export { ExcelImporter } from './importers/ExcelImporter';
export { CsvImporter } from './importers/CsvImporter';
export { JsonImporter } from './importers/JsonImporter';

export type { DriverDefinition } from './engine/DataDriverEngine';

export type {
  TagDataType,
  QualityCode as GraphicQualityCode,
  DataSourceCategory,
  DataPoint as GraphicDataPoint,
  DataColumnDef,
  DataRow,
  DataList,
  GraphicData,
  DataPointMap,
  GraphicContext,
  IGraphicDataReceiver,
  DriverRuntimeContext,
  DriverScriptAPI,
  FilterScriptContext,
  DataSourceManagerStatus,
  DataSourceRefreshStrategy,
} from './types/graphic-data.types';

export { isDataPoint, isDataList } from './types/graphic-data.types';

export type { PageDataSourceInput } from './engine/DataSourceManager';
export type { TagValueChangeHandler } from './engine/DataSourceManager';
export type { PipelineGraphicBinding, PipelineBridgeOptions } from './engine/DataPipelineBridge';