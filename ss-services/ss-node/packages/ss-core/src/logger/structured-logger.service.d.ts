// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { LoggerService, LogLevel } from '@nestjs/common';
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  traceId?: string;
  requestId?: string;
  userId?: string;
  deviceId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  durationMs?: number;
}
export interface StructuredLoggerConfig {
  logLevel: LogLevel;
  jsonFormat: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
  consoleOutput: boolean;
  fileOutput: boolean;
  logFilePath: string;
  maxFileSizeMb: number;
  maxFiles: number;
  enableSampling: boolean;
  samplingRate: number;
  sensitiveFields: string[];
  redactSensitiveData: boolean;
}
export declare class StructuredLogger implements LoggerService {
  private config;
  private contextStore;
  private logStream;
  private currentFileSize;
  constructor(config?: Partial<StructuredLoggerConfig>);
  setConfig(config: Partial<StructuredLoggerConfig>): void;
  setContext(key: string, value: any): void;
  getContext(key: string): any;
  clearContext(): void;
  debug(message: any, context?: string): void;
  verbose(message: any, context?: string): void;
  log(message: any, context?: string): void;
  warn(message: any, context?: string): void;
  error(message: any, trace?: string, context?: string): void;
  withContext(context: string): StructuredLogger;
  withMetadata(metadata: Record<string, any>): StructuredLogger;
  startTimer(label: string): () => void;
  private processLog;
  private shouldLog;
  private formatLogEntry;
  private writeToConsole;
  private writeToFile;
  private initializeLogFile;
  private rotateLogFile;
  private redactSensitiveFields;
  private redactObject;
  destroy(): void;
}
