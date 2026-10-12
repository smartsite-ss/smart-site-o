// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ScriptValidatorService } from '../script-validator.service';

const mockEngineService = {
  execute: jest.fn(),
};

const mockI18nService = {
  tSync: jest.fn().mockImplementation((key: string) => key),
};

describe('ScriptValidatorService', () => {
  let service: ScriptValidatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScriptValidatorService(mockEngineService as any, mockI18nService as any);
  });

  describe('validate', () => {
    it('should return valid for correct JavaScript syntax', () => {
      const result = service.validate('const x = 1 + 2;');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect syntax errors with line/column info', () => {
      const result = service.validate('const x = { broken: ;');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect forbidden require() pattern', () => {
      const result = service.validate('const fs = require("fs");');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('require'))).toBe(true);
    });

    it('should detect forbidden process global', () => {
      const result = service.validate('process.env.PATH');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('process'))).toBe(true);
    });

    it('should return valid for Math and JSON operations', () => {
      const result = service.validate('const x = Math.max(1, 2); JSON.stringify({a: x});');
      expect(result.valid).toBe(true);
    });

    it('should return valid for async function', () => {
      const result = service.validate('const fn = async () => { return await readTag("t1"); };');
      expect(result.valid).toBe(true);
    });
  });

  describe('dryRun', () => {
    it('should return error for invalid syntax', async () => {
      const result = await service.dryRun('return { broken: ;');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Syntax error');
    });

    it('should execute valid code and return result', async () => {
      mockEngineService.execute.mockResolvedValue({
        success: true,
        result: 42,
        durationMs: 10,
        memoryUsedMb: 2,
      });

      const result = await service.dryRun('42;');
      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should capture execution logs', async () => {
      mockEngineService.execute.mockResolvedValue({
        success: true,
        result: 'ok',
        durationMs: 5,
        memoryUsedMb: 1,
      });

      const result = await service.dryRun('console.log("test");');
      expect(result.success).toBe(true);
      expect(result.logs).toBeDefined();
    });

    it('should handle execution errors', async () => {
      mockEngineService.execute.mockRejectedValue(new Error('Runtime error'));

      const result = await service.dryRun('throw new Error("Runtime error");');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Runtime error');
    });
  });
});
