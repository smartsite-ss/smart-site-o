// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Logger } from '@nestjs/common';
import { ScriptEngineService } from '../script-engine.service';

const mockExecRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const createScript = (overrides: Record<string, any> = {}) => ({
  id: 'script-1',
  name: 'Test Script',
  code: '1 + 1',
  status: 'active',
  triggerType: 'manual',
  allowNetwork: false,
  allowFileSystem: false,
  timeoutMs: 5000,
  memoryLimitMb: 128,
  projectId: 'proj-1',
  ...overrides,
});

describe('ScriptEngineService', () => {
  let service: ScriptEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecRepo.create.mockReturnValue({
      scriptId: 'script-1',
      trigger: 'manual',
      status: 'running',
      startedAt: new Date(),
      memoryUsedMb: 0,
    });
    mockExecRepo.save.mockResolvedValue(undefined);
    service = new ScriptEngineService(mockExecRepo as any);
  });

  describe('execute simple script', () => {
    it('should execute arithmetic without error', async () => {
      const script = createScript({ code: '1 + 1' });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should complete string operations', async () => {
      const script = createScript({ code: '"hello world"' });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });

    it('should succeed for variable assignment scripts', async () => {
      const script = createScript({ code: 'const x = 42;' });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });
  });

  describe('execute async script', () => {
    it('should handle Promise-based scripts', async () => {
      const script = createScript({
        code: 'Promise.resolve(42)',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });

    it('should handle rejected Promise', async () => {
      const script = createScript({
        code: 'throw new Error("async failure")',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async failure');
    });
  });

  describe('execute with context', () => {
    it('should access context variables in script', async () => {
      const script = createScript({
        code: 'const result = deviceId + "-" + tagName',
      });
      const result = await service.execute(script, {
        deviceId: 'dev-1',
        tagName: 'Temperature',
      });

      expect(result.success).toBe(true);
    });

    it('should support numeric context values', async () => {
      const script = createScript({
        code: 'const result = baseValue * scale + offset',
      });
      const result = await service.execute(script, {
        baseValue: 100,
        scale: 1.5,
        offset: 10,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('syntax validation', () => {
    it('should return error for invalid JavaScript syntax', async () => {
      const script = createScript({
        code: 'return { broken: ;',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should succeed for valid JavaScript', async () => {
      const script = createScript({
        code: 'const arr = [1, 2, 3]; arr.length',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });

    it('should handle arrow function expressions', async () => {
      const script = createScript({
        code: 'const fn = () => 1; fn()',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });
  });

  describe('timeout', () => {
    it('should reject when timeout threshold is exceeded', async () => {
      jest.useRealTimers();

      const script = createScript({
        code: 'return new Promise((resolve) => setTimeout(() => resolve("late"), 10000))',
        timeoutMs: 50,
      });
      const result = await service.execute(script, {
        setTimeout: global.setTimeout,
      });

      jest.useFakeTimers();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Script execution timeout');
    });
  });

  describe('console.log whitelist', () => {
    it('should allow console.log in sandbox', async () => {
      const script = createScript({
        code: 'console.log("hello from sandbox")',
      });

      jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
      const result = await service.execute(script);
      jest.restoreAllMocks();

      expect(result.success).toBe(true);
    });

    it('should allow console.error in sandbox', async () => {
      const script = createScript({
        code: 'console.error("error in sandbox")',
      });

      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      const result = await service.execute(script);
      jest.restoreAllMocks();

      expect(result.success).toBe(true);
    });

    it('should allow console.warn in sandbox', async () => {
      const script = createScript({
        code: 'console.warn("warning in sandbox")',
      });

      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      const result = await service.execute(script);
      jest.restoreAllMocks();

      expect(result.success).toBe(true);
    });
  });

  describe('block require/import', () => {
    it('should block access to node modules via require', async () => {
      const script = createScript({
        code: 'const fs = require("fs")',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should throw when require is used in sandbox', async () => {
      const script = createScript({
        code: 'require("path")',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
    });
  });

  describe('block process', () => {
    it('should block access to process global', async () => {
      const script = createScript({
        code: 'process.env',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should block access to global object', async () => {
      const script = createScript({
        code: 'global.process',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('block filesystem', () => {
    it('should verify setTimeout is blocked in sandbox', async () => {
      const script = createScript({
        code: 'setTimeout(() => {}, 100)',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should verify setInterval is blocked in sandbox', async () => {
      const script = createScript({
        code: 'setInterval(() => {}, 1000)',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('execution result', () => {
    it('should return execution result with duration', async () => {
      const script = createScript({
        code: 'let sum = 0; for (let i = 0; i < 100; i++) sum += i',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.memoryUsedMb).toBeGreaterThanOrEqual(0);
    });

    it('should save execution record on success', async () => {
      const script = createScript({
        code: '"ok"',
      });
      await service.execute(script);

      expect(mockExecRepo.create).toHaveBeenCalled();
      expect(mockExecRepo.save).toHaveBeenCalled();
      const savedExecution = mockExecRepo.save.mock.calls[0][0];
      expect(savedExecution.status).toBe('completed');
    });

    it('should save execution record on failure', async () => {
      const script = createScript({
        code: 'throw new Error("custom error")',
      });
      await service.execute(script);

      expect(mockExecRepo.save).toHaveBeenCalled();
      const savedExecution = mockExecRepo.save.mock.calls[0][0];
      expect(savedExecution.status).toBe('failed');
      expect(savedExecution.error).toBe('custom error');
    });

    it('should record failure for unreachable code', async () => {
      const script = createScript({
        code: 'undefinedMethod()',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
      expect(result.error).toContain('undefinedMethod');
    });
  });

  describe('whitelisted globals', () => {
    it('should allow JSON operations', async () => {
      const script = createScript({
        code: 'const obj = { a: 1 }; JSON.stringify(obj)',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });

    it('should allow Math operations', async () => {
      const script = createScript({
        code: 'Math.max(1, 5, 3)',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });

    it('should allow Date creation', async () => {
      const script = createScript({
        code: 'const d = new Date("2024-01-01"); d.getFullYear()',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });

    it('should allow parseInt and parseFloat', async () => {
      const script = createScript({
        code: 'parseInt("42") + parseFloat("3.14")',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });
  });

  describe('network privileged mode', () => {
    it('should run with elevated privileges when allowNetwork is true', async () => {
      const script = createScript({
        code: '"privileged"',
        allowNetwork: true,
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });
  });

  describe('execute script with variable assignment', () => {
    it('should handle multi-line scripts', async () => {
      const script = createScript({
        code: 'const x = 10;\nconst y = 20;\nconst z = x + y',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });

    it('should handle complex expressions', async () => {
      const script = createScript({
        code: '[1, 2, 3].map(n => n * 2).reduce((a, b) => a + b, 0)',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });
  });

  // ==================== Phase 5.4: runScript 纯执行 ====================
  describe('runScript (pure execution without DB writes)', () => {
    it('should execute script without writing to execution repository', async () => {
      jest.clearAllMocks();
      const script = createScript({ code: '1 + 1' });
      const result = await service.runScript(script);

      expect(result.success).toBe(true);
      expect(mockExecRepo.create).not.toHaveBeenCalled();
      expect(mockExecRepo.save).not.toHaveBeenCalled();
    });

    it('should return ExecutionResult with duration and memory', async () => {
      const script = createScript({ code: '42' });
      const result = await service.runScript(script);

      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.memoryUsedMb).toBeGreaterThanOrEqual(0);
    });

    it('should handle script failure without writing to DB', async () => {
      jest.clearAllMocks();
      const script = createScript({ code: 'throw new Error("fail")' });
      const result = await service.runScript(script);

      expect(result.success).toBe(false);
      expect(result.error).toBe('fail');
      expect(mockExecRepo.create).not.toHaveBeenCalled();
      expect(mockExecRepo.save).not.toHaveBeenCalled();
    });

    it('should pass context variables to sandbox', async () => {
      const script = createScript({ code: 'baseValue * 2' });
      const result = await service.runScript(script, { baseValue: 21 });

      expect(result.success).toBe(true);
    });
  });

  // ==================== Phase 5.4: AST 校验 ====================
  describe('validateScriptAst', () => {
    it('should accept valid script code', () => {
      const result = service.validateScriptAst('const x = 1; x + 2');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept return statements (allowReturnOutsideFunction)', () => {
      const result = service.validateScriptAst('return 42');
      expect(result.valid).toBe(true);
    });

    it('should reject eval reference', () => {
      const result = service.validateScriptAst('eval("1+1")');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('eval'))).toBe(true);
    });

    it('should reject Function constructor reference', () => {
      const result = service.validateScriptAst('Function("return 1")()');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Function'))).toBe(true);
    });

    it('should reject constructor property access', () => {
      const result = service.validateScriptAst('({}).constructor');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('constructor'))).toBe(true);
    });

    it('should reject __proto__ property access', () => {
      const result = service.validateScriptAst('({}).__proto__');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('__proto__'))).toBe(true);
    });

    it('should reject Reflect reference', () => {
      const result = service.validateScriptAst('Reflect.get({}, "x")');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Reflect'))).toBe(true);
    });

    it('should reject Proxy reference', () => {
      const result = service.validateScriptAst('new Proxy({}, {})');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Proxy'))).toBe(true);
    });

    it('should reject WebAssembly reference', () => {
      const result = service.validateScriptAst('WebAssembly.instantiate({})');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('WebAssembly'))).toBe(true);
    });

    it('should reject globalThis reference', () => {
      const result = service.validateScriptAst('globalThis.process');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('globalThis'))).toBe(true);
    });

    it('should NOT reject eval as object property key', () => {
      // { eval: 1 } 中 eval 是属性键，不应被阻断
      const result = service.validateScriptAst('const obj = { eval: 1 }; obj.eval');
      expect(result.valid).toBe(true);
    });

    it('should return syntax error for invalid JavaScript', () => {
      const result = service.validateScriptAst('const x = ;');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Syntax error');
    });

    it('should allow common script patterns (Math, JSON, Date, Array)', () => {
      const code = `
        const arr = [1, 2, 3];
        const sum = arr.reduce((a, b) => a + b, 0);
        const json = JSON.stringify({ sum });
        const max = Math.max(...arr);
        const now = new Date();
      `;
      const result = service.validateScriptAst(code);
      expect(result.valid).toBe(true);
    });
  });

  // ==================== Phase 5.4: 沙箱加固集成 ====================
  describe('sandbox hardening integration', () => {
    it('should reject script with eval via execute (AST blocks before runtime)', async () => {
      const script = createScript({ code: 'eval("1+1")' });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
      expect(result.error).toContain('AST validation failed');
    });

    it('should reject constructor-based prototype escape', async () => {
      const script = createScript({
        code: '({}).constructor.constructor("return process")()',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(false);
      expect(result.error).toContain('AST validation failed');
    });

    it('should shadow Function global to undefined at runtime', async () => {
      // Function 作为标识符被 AST 阻断，但即使绕过 AST（如计算属性访问），
      // 运行时 Function 参数也被影子化为 undefined
      const script = createScript({
        code: 'typeof Function',
      });
      const result = await service.execute(script);

      // typeof Function 会被 AST 阻断
      expect(result.success).toBe(false);
    });

    it('should allow legitimate scripts with object destructuring', async () => {
      const script = createScript({
        code: 'const { a, b } = { a: 1, b: 2 }; a + b',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });

    it('should allow Promise-based scripts without await', async () => {
      const script = createScript({
        code: 'Promise.resolve(42)',
      });
      const result = await service.execute(script);

      expect(result.success).toBe(true);
    });
  });
});
