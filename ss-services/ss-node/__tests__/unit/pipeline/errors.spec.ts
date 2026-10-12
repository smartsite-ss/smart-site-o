// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  ErrorCategory,
  ErrorCode,
  ScadaError,
  DataAcquisitionError,
  ProtocolTimeoutError,
  ProtocolConnectionError,
  ProtocolReadError,
  ProtocolWriteError,
  DataTransformError,
  TransformFormulaError,
  TransformRangeError,
  TransformScriptError,
  DataQualityError,
  OutOfRangeError,
  StaleDataError,
  CommError,
  DeviceError,
  DeviceOfflineError,
  DeviceNotRespondingError,
  DeviceConfigError,
  PipelineError,
  StepTimeoutError,
  StepExecutionError,
  PipelineInterruptedError,
  StorageError,
  SQLiteWriteError,
  InfluxDBWriteError,
  BufferOverflowError,
  SystemError,
  SchedulerError,
  ConfigError,
} from '../../../packages/ss-collector/ss-collector-sdk/src/pipeline/errors';

describe('Pipeline Errors', () => {
  describe('ScadaError Base Class', () => {
    it('TC-PIPE-ERR-001: should create with message, code, category, context', () => {
      const err = new ScadaError('test', ErrorCode.PROTO_TIMEOUT, ErrorCategory.PROTOCOL, {
        deviceId: 'd1',
      });
      expect(err.message).toBe('test');
      expect(err.code).toBe('PROTO_TIMEOUT');
      expect(err.category).toBe('protocol');
      expect(err.context.deviceId).toBe('d1');
      expect(err.timestamp).toBeInstanceOf(Date);
    });

    it('TC-PIPE-ERR-002: should have empty context by default', () => {
      const err = new ScadaError('msg', ErrorCode.SYSTEM, ErrorCategory.SYSTEM);
      expect(err.context).toEqual({});
    });

    it('TC-PIPE-ERR-003: toJSON should include all fields', () => {
      const err = new ScadaError('json-test', ErrorCode.DATA_RANGE, ErrorCategory.DATA, {
        tagId: 't1',
      });
      const json = err.toJSON();
      expect(json.name).toBe('ScadaError');
      expect(json.message).toBe('json-test');
      expect(json.code).toBe('DATA_RANGE');
      expect(json.category).toBe('data');
      expect(json.context.tagId).toBe('t1');
      expect(json.stack).toBeDefined();
    });
  });

  describe('DataAcquisitionError', () => {
    it('TC-PIPE-ERR-004: should extend ScadaError with PROTOCOL category', () => {
      const err = new DataAcquisitionError('acq failed', ErrorCode.PROTO_READ);
      expect(err).toBeInstanceOf(ScadaError);
      expect(err.category).toBe(ErrorCategory.PROTOCOL);
      expect(err.code).toBe('PROTO_READ');
    });
  });

  describe('Protocol Errors', () => {
    it('TC-PIPE-ERR-005: ProtocolTimeoutError with context', () => {
      const err = new ProtocolTimeoutError('modbus timeout', { deviceId: 'd1' });
      expect(err).toBeInstanceOf(DataAcquisitionError);
      expect(err.code).toBe('PROTO_TIMEOUT');
      expect(err.context.deviceId).toBe('d1');
    });

    it('TC-PIPE-ERR-006: ProtocolConnectionError with message', () => {
      const err = new ProtocolConnectionError('refused');
      expect(err.code).toBe('PROTO_CONNECTION');
      expect(err).toBeInstanceOf(DataAcquisitionError);
    });

    it('TC-PIPE-ERR-007: ProtocolReadError with context', () => {
      const err = new ProtocolReadError('read failed', { tagId: 't1' });
      expect(err.code).toBe('PROTO_READ');
    });

    it('TC-PIPE-ERR-008: ProtocolWriteError with message', () => {
      const err = new ProtocolWriteError('write timeout');
      expect(err.code).toBe('PROTO_WRITE');
    });
  });

  describe('DataTransform Errors', () => {
    it('TC-PIPE-ERR-009: TransformFormulaError', () => {
      const err = new TransformFormulaError('invalid formula', { tagId: 't1' });
      expect(err).toBeInstanceOf(DataTransformError);
      expect(err.code).toBe('TRANSFORM_FORMULA');
      expect(err.category).toBe(ErrorCategory.DATA);
    });

    it('TC-PIPE-ERR-010: TransformRangeError', () => {
      const err = new TransformRangeError('out of range');
      expect(err.code).toBe('TRANSFORM_RANGE');
    });

    it('TC-PIPE-ERR-011: TransformScriptError', () => {
      const err = new TransformScriptError('script error');
      expect(err.code).toBe('TRANSFORM_SCRIPT');
    });
  });

  describe('DataQuality Errors', () => {
    it('TC-PIPE-ERR-012: OutOfRangeError', () => {
      const err = new OutOfRangeError('value 999 too high');
      expect(err).toBeInstanceOf(DataQualityError);
      expect(err.code).toBe('DATA_RANGE');
    });

    it('TC-PIPE-ERR-013: StaleDataError', () => {
      const err = new StaleDataError('data too old');
      expect(err.code).toBe('DATA_STALE');
    });

    it('TC-PIPE-ERR-014: CommError', () => {
      const err = new CommError('comm failure');
      expect(err.code).toBe('DATA_COMM');
    });
  });

  describe('Device Errors', () => {
    it('TC-PIPE-ERR-015: DeviceOfflineError', () => {
      const err = new DeviceOfflineError('device-1 is offline');
      expect(err).toBeInstanceOf(DeviceError);
      expect(err.code).toBe('DEVICE_OFFLINE');
      expect(err.category).toBe(ErrorCategory.DEVICE);
    });

    it('TC-PIPE-ERR-016: DeviceNotRespondingError', () => {
      const err = new DeviceNotRespondingError('no response');
      expect(err.code).toBe('DEVICE_NOT_RESPONDING');
    });

    it('TC-PIPE-ERR-017: DeviceConfigError', () => {
      const err = new DeviceConfigError('bad config');
      expect(err.code).toBe('DEVICE_CONFIG');
    });
  });

  describe('Pipeline Errors', () => {
    it('TC-PIPE-ERR-018: StepTimeoutError should include step name', () => {
      const err = new StepTimeoutError('collector', { deviceId: 'd1' });
      expect(err).toBeInstanceOf(PipelineError);
      expect(err.code).toBe('STEP_TIMEOUT');
      expect(err.message).toContain('collector');
      expect(err.message).toContain('timed out');
      expect(err.context.step).toBe('collector');
    });

    it('TC-PIPE-ERR-019: StepExecutionError should include original error', () => {
      const original = new Error('type error');
      const err = new StepExecutionError('transform', original, { deviceId: 'd1' });
      expect(err.code).toBe('STEP_EXECUTION');
      expect(err.message).toContain('transform');
      expect(err.message).toContain('type error');
      expect(err.context.originalError).toBe('type error');
    });

    it('TC-PIPE-ERR-020: PipelineInterruptedError', () => {
      const err = new PipelineInterruptedError('stopped by user');
      expect(err.code).toBe('PIPELINE_INTERRUPTED');
      expect(err.category).toBe(ErrorCategory.PIPELINE);
    });
  });

  describe('Storage Errors', () => {
    it('TC-PIPE-ERR-021: SQLiteWriteError', () => {
      const err = new SQLiteWriteError('disk full');
      expect(err).toBeInstanceOf(StorageError);
      expect(err.code).toBe('STORAGE_SQLITE');
      expect(err.category).toBe(ErrorCategory.STORAGE);
    });

    it('TC-PIPE-ERR-022: InfluxDBWriteError', () => {
      const err = new InfluxDBWriteError('connection refused');
      expect(err.code).toBe('STORAGE_INFLUXDB');
    });

    it('TC-PIPE-ERR-023: BufferOverflowError', () => {
      const err = new BufferOverflowError('buffer full');
      expect(err.code).toBe('STORAGE_BUFFER_OVERFLOW');
    });
  });

  describe('System Errors', () => {
    it('TC-PIPE-ERR-024: SchedulerError', () => {
      const err = new SchedulerError('schedule failed');
      expect(err).toBeInstanceOf(SystemError);
      expect(err.code).toBe('SCHEDULER_ERROR');
      expect(err.category).toBe(ErrorCategory.SYSTEM);
    });

    it('TC-PIPE-ERR-025: ConfigError', () => {
      const err = new ConfigError('invalid config key');
      expect(err.code).toBe('CONFIG_ERROR');
    });
  });

  describe('ErrorCode Values', () => {
    it('TC-PIPE-ERR-026: should have unique error codes', () => {
      const codes = Object.values(ErrorCode);
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });
  });

  describe('Error Hierarchy', () => {
    it('TC-PIPE-ERR-027: full chain: ProtocolTimeoutError is ScadaError', () => {
      const err = new ProtocolTimeoutError('timeout');
      expect(err instanceof ScadaError).toBe(true);
      expect(err instanceof DataAcquisitionError).toBe(true);
      expect(err instanceof Error).toBe(true);
    });

    it('TC-PIPE-ERR-028: full chain: StepExecutionError is ScadaError', () => {
      const err = new StepExecutionError('step1', new Error('inner'));
      expect(err instanceof ScadaError).toBe(true);
      expect(err instanceof PipelineError).toBe(true);
      expect(err instanceof Error).toBe(true);
    });

    it('TC-PIPE-ERR-029: full chain: OutOfRangeError is ScadaError', () => {
      const err = new OutOfRangeError('too high');
      expect(err instanceof ScadaError).toBe(true);
      expect(err instanceof DataQualityError).toBe(true);
      expect(err instanceof Error).toBe(true);
    });

    it('TC-PIPE-ERR-030: ErrorCategory values should map correctly', () => {
      expect(ErrorCategory.PROTOCOL).toBe('protocol');
      expect(ErrorCategory.DATA).toBe('data');
      expect(ErrorCategory.DEVICE).toBe('device');
      expect(ErrorCategory.PIPELINE).toBe('pipeline');
      expect(ErrorCategory.STORAGE).toBe('storage');
      expect(ErrorCategory.SYSTEM).toBe('system');
    });
  });
});
