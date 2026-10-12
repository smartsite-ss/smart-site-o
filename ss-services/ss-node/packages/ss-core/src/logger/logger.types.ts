// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { LogLevel } from '@nestjs/common';

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

export const DEFAULT_LOGGER_CONFIG: StructuredLoggerConfig = {
  logLevel: 'log',
  jsonFormat: true,
  includeTimestamp: true,
  includeContext: true,
  consoleOutput: true,
  fileOutput: false,
  logFilePath: './logs/app.log',
  maxFileSizeMb: 10,
  maxFiles: 5,
  enableSampling: false,
  samplingRate: 1.0,
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'authorization'],
  redactSensitiveData: true,
};
