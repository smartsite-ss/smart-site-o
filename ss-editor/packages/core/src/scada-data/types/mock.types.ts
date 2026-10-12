// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type MockMode = 'http' | 'websocket' | 'deviceTag' | 'fileImport' | 'off';

export interface HttpMockConfig {
  url: string;
  method: string;
  responseDelay: number;
  responseBody: unknown;
  statusCode: number;
}

export interface WsMockConfig {
  sendInterval: number;
  eventTypes: string[];
  payloadTemplate: Record<string, unknown>;
}

export type GeneratorType = 'sinWave' | 'randomWalk' | 'pulse' | 'ramp' | 'noise';

export interface GeneratorParams {
  amplitude: number;
  period: number;
  phase: number;
  offset: number;
  step: number;
  min: number;
  max: number;
  dutyCycle: number;
  base: number;
  noiseAmplitude: number;
}

export interface DeviceTagMockConfig {
  tagId: string;
  generatorType: GeneratorType;
  generatorParams: GeneratorParams;
  updateInterval: number;
  minValue: number;
  maxValue: number;
}

export interface FileImportConfig {
  fileName: string;
  importType: 'excel' | 'csv' | 'json';
  importMapping: Record<string, string>;
  dataRows: unknown[];
}

export interface MockDataSourceConfig {
  mode: MockMode;
  httpMock?: HttpMockConfig;
  wsMock?: WsMockConfig;
  deviceTagMock?: DeviceTagMockConfig;
  fileImport?: FileImportConfig;
}