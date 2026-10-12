// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export { LoggerModule } from './logger.module';
export { StructuredLogger } from './structured-logger.service';
export { LogEntry, StructuredLoggerConfig, DEFAULT_LOGGER_CONFIG } from './logger.types';
export {
  getLogConfig,
  createAppFileTransport,
  createErrorFileTransport,
  createPluginLogger,
} from './logger-factory';
export type { LogConfig } from './logger-factory';
