// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type TagDataType = 'boolean' | 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32' | 'float64' | 'string';

// QualityCode 统一定义于 quality.types.ts，此处 re-export 保持向后兼容
export type { QualityCode } from './quality.types';
import type { QualityCode } from './quality.types';

export type DataSourceCategory = 'static' | 'tag' | 'api' | 'db';

export interface DataPoint {
  tagId: string;
  tagName: string;
  dataSourceId: string;
  dataSourceName: string;
  dataSourceType: DataSourceCategory;
  deviceId?: string;
  value: string | number | boolean | null;
  dataType: TagDataType;
  unit?: string;
  decimalPlaces?: number;
  minValue?: number;
  maxValue?: number;
  scale?: number;
  offset?: number;
  alarmHighHigh?: number;
  alarmHigh?: number;
  alarmLow?: number;
  alarmLowLow?: number;
  quality: QualityCode;
  timestamp: number;
  raw: unknown;
}

export interface DataColumnDef {
  field: string;
  headerName: string;
  dataType: TagDataType;
  unit?: string;
  decimalPlaces?: number;
  tagId?: string;
  tagName?: string;
  width?: number;
}

export interface DataRow {
  _key: string | number;
  [field: string]: unknown;
}

export interface DataList {
  dataSourceId: string;
  dataSourceName: string;
  dataSourceType: DataSourceCategory;
  columns: DataColumnDef[];
  rows: DataRow[];
  totalCount: number;
  timestamp: number;
  raw: unknown;
}

export type GraphicData = DataPoint | DataList;

export type DataPointMap = Record<string, DataPoint>;

export interface GraphicContext {
  graphicId: string;
  graphicName: string;
  graphicType: string;
  pageId: string;
}

export interface IGraphicDataReceiver {
  onDataInput(data: GraphicData, context: GraphicContext): void;
}

export function isDataPoint(d: GraphicData): d is DataPoint {
  return 'tagId' in d && 'value' in d && !('columns' in d);
}

export function isDataList(d: GraphicData): d is DataList {
  return 'columns' in d && 'rows' in d;
}

export interface DriverRuntimeContext {
  data: GraphicData;
  allData: DataPointMap;
  graphic: GraphicContext;
  api: DriverScriptAPI;
}

export interface DriverScriptAPI {
  setText(val: string): void;
  setBackground(color: string): void;
  setVisible(visible: boolean): void;
  setBorder(color: string, width?: number): void;
  setRotation(degrees: number): void;
  setOpacity(value: number): void;
  setPosition(x: number, y: number): void;
  showGraphic(graphicId: string): void;
  hideGraphic(graphicId: string): void;
  setGraphicProps(graphicId: string, props: Record<string, unknown>): void;
  triggerAlarm(level: string, message: string): void;
  clearAlarm(alarmId?: string): void;
  getActiveAlarms(): Array<{ id: string; level: string; message: string }>;
  httpGet(url: string): Promise<unknown>;
  httpPost(url: string, data: unknown): Promise<unknown>;
  readTag(tagId: string): { value: unknown; quality: string; timestamp: number } | null;
  writeTag(tagId: string, value: unknown): void;
  setTimeout(callback: () => void, ms: number): number;
  setInterval(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
  clearInterval(id: number): void;
  clamp(value: number, min: number, max: number): number;
  mapRange(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number;
  colorForValue(value: number, min: number, max: number): string;
  formatNumber(value: number, decimals: number, unit?: string): string;
}

export interface FilterScriptContext {
  value: unknown;
  quality: string;
  tagMeta: {
    tagId: string;
    tagName: string;
    dataType: TagDataType;
    unit?: string;
    decimalPlaces?: number;
    minValue?: number;
    maxValue?: number;
    scale?: number;
    offset?: number;
    alarmHigh?: number;
    alarmHighHigh?: number;
    alarmLow?: number;
    alarmLowLow?: number;
  };
  graphicId: string;
}

export interface DataSourceManagerStatus {
  pageId: string;
  dataSourceCount: number;
  bindingCount: number;
  sources: Array<{
    id: string;
    name: string;
    type: DataSourceCategory;
    status: 'idle' | 'loading' | 'active' | 'error' | 'paused';
    lastFetchTime: number;
    errorMessage?: string;
  }>;
}

export interface DataSourceRefreshStrategy {
  type: DataSourceCategory;
  mode: 'once' | 'push' | 'poll' | 'manual';
  interval?: number;
  dynamicInterval?: boolean;
  timeout?: number;
  retryCount?: number;
  enabled: boolean;
}