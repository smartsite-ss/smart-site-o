// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export enum ErrorCategory {
  PROTOCOL = 'protocol',
  DATA = 'data',
  DEVICE = 'device',
  PIPELINE = 'pipeline',
  STORAGE = 'storage',
  SYSTEM = 'system',
}

export enum ErrorCode {
  PROTO_TIMEOUT = 'PROTO_TIMEOUT',
  PROTO_CONNECTION = 'PROTO_CONNECTION',
  PROTO_READ = 'PROTO_READ',
  PROTO_WRITE = 'PROTO_WRITE',
  TRANSFORM_FORMULA = 'TRANSFORM_FORMULA',
  TRANSFORM_RANGE = 'TRANSFORM_RANGE',
  TRANSFORM_SCRIPT = 'TRANSFORM_SCRIPT',
  DATA_RANGE = 'DATA_RANGE',
  DATA_STALE = 'DATA_STALE',
  DATA_COMM = 'DATA_COMM',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  DEVICE_NOT_RESPONDING = 'DEVICE_NOT_RESPONDING',
  DEVICE_CONFIG = 'DEVICE_CONFIG',
  STEP_TIMEOUT = 'STEP_TIMEOUT',
  STEP_EXECUTION = 'STEP_EXECUTION',
  PIPELINE_INTERRUPTED = 'PIPELINE_INTERRUPTED',
  STORAGE_SQLITE = 'STORAGE_SQLITE',
  STORAGE_INFLUXDB = 'STORAGE_INFLUXDB',
  STORAGE_BUFFER_OVERFLOW = 'STORAGE_BUFFER_OVERFLOW',
  SCHEDULER_ERROR = 'SCHEDULER_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
}

export interface ErrorContext {
  deviceId?: string;
  tagId?: string;
  step?: string;
  [key: string]: any;
}

export class ScadaError extends Error {
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly context: ErrorContext;
  readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode,
    category: ErrorCategory,
    context: ErrorContext = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.context = context;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

export class DataAcquisitionError extends ScadaError {
  constructor(message: string, code: ErrorCode, context?: ErrorContext) {
    super(message, code, ErrorCategory.PROTOCOL, context);
  }
}

export class ProtocolTimeoutError extends DataAcquisitionError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.PROTO_TIMEOUT, context);
  }
}

export class ProtocolConnectionError extends DataAcquisitionError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.PROTO_CONNECTION, context);
  }
}

export class ProtocolReadError extends DataAcquisitionError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.PROTO_READ, context);
  }
}

export class ProtocolWriteError extends DataAcquisitionError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.PROTO_WRITE, context);
  }
}

export class DataTransformError extends ScadaError {
  constructor(message: string, code: ErrorCode, context?: ErrorContext) {
    super(message, code, ErrorCategory.DATA, context);
  }
}

export class TransformFormulaError extends DataTransformError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.TRANSFORM_FORMULA, context);
  }
}

export class TransformRangeError extends DataTransformError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.TRANSFORM_RANGE, context);
  }
}

export class TransformScriptError extends DataTransformError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.TRANSFORM_SCRIPT, context);
  }
}

export class DataQualityError extends ScadaError {
  constructor(message: string, code: ErrorCode, context?: ErrorContext) {
    super(message, code, ErrorCategory.DATA, context);
  }
}

export class OutOfRangeError extends DataQualityError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.DATA_RANGE, context);
  }
}

export class StaleDataError extends DataQualityError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.DATA_STALE, context);
  }
}

export class CommError extends DataQualityError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.DATA_COMM, context);
  }
}

export class DeviceError extends ScadaError {
  constructor(message: string, code: ErrorCode, context?: ErrorContext) {
    super(message, code, ErrorCategory.DEVICE, context);
  }
}

export class DeviceOfflineError extends DeviceError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.DEVICE_OFFLINE, context);
  }
}

export class DeviceNotRespondingError extends DeviceError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.DEVICE_NOT_RESPONDING, context);
  }
}

export class DeviceConfigError extends DeviceError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.DEVICE_CONFIG, context);
  }
}

export class PipelineError extends ScadaError {
  constructor(message: string, code: ErrorCode, context?: ErrorContext) {
    super(message, code, ErrorCategory.PIPELINE, context);
  }
}

export class StepTimeoutError extends PipelineError {
  constructor(stepName: string, context?: ErrorContext) {
    super(`Pipeline step "${stepName}" timed out`, ErrorCode.STEP_TIMEOUT, {
      ...context,
      step: stepName,
    });
  }
}

export class StepExecutionError extends PipelineError {
  constructor(stepName: string, originalError: Error, context?: ErrorContext) {
    super(
      `Pipeline step "${stepName}" execution failed: ${originalError.message}`,
      ErrorCode.STEP_EXECUTION,
      { ...context, step: stepName, originalError: originalError.message },
    );
  }
}

export class PipelineInterruptedError extends PipelineError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.PIPELINE_INTERRUPTED, context);
  }
}

export class StorageError extends ScadaError {
  constructor(message: string, code: ErrorCode, context?: ErrorContext) {
    super(message, code, ErrorCategory.STORAGE, context);
  }
}

export class SQLiteWriteError extends StorageError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.STORAGE_SQLITE, context);
  }
}

export class InfluxDBWriteError extends StorageError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.STORAGE_INFLUXDB, context);
  }
}

export class BufferOverflowError extends StorageError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.STORAGE_BUFFER_OVERFLOW, context);
  }
}

export class SystemError extends ScadaError {
  constructor(message: string, code: ErrorCode, context?: ErrorContext) {
    super(message, code, ErrorCategory.SYSTEM, context);
  }
}

export class SchedulerError extends SystemError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.SCHEDULER_ERROR, context);
  }
}

export class ConfigError extends SystemError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.CONFIG_ERROR, context);
  }
}
