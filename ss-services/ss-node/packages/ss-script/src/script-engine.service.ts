// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as acorn from 'acorn';
import { Script, ScriptExecution } from './entities/script.entity';

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  durationMs: number;
  memoryUsedMb: number;
}

export interface AstValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * ScriptEngineService — 脚本沙箱执行引擎
 *
 * Phase 5.4 加固要点：
 * 1. 新增 `runScript()` 纯执行方法（无 DB 副作用），供 ExecutionQueueService 调用；
 *    `execute()` 内部调用 runScript 后再持久化 ScriptExecution 记录，保持向后兼容。
 * 2. 新增 `validateScriptAst(code)` — 基于 acorn AST 遍历，阻断
 *    eval/Function/Reflect/Proxy/WebAssembly/globalThis 引用及 constructor/__proto__ 属性访问。
 * 3. executeSandboxed 加固：AST 校验前置 + `.call(null)` 确保 this 为 null。
 * 4. createSandboxContext 增加危险全局影子化（Function/Reflect/Proxy/WebAssembly/globalThis = undefined）。
 * 5. executeWithPrivileges 移除重复的 httpGet 注入（由 ScriptApiService 统一提供）。
 */
@Injectable()
export class ScriptEngineService {
  private readonly logger = new Logger(ScriptEngineService.name);

  /** AST 校验阻断的危险标识符引用（非属性键） */
  private static readonly DANGEROUS_REFS = new Set([
    'eval',
    'Function',
    'Reflect',
    'Proxy',
    'WebAssembly',
    'globalThis',
  ]);

  /** AST 校验阻断的危险属性访问（非计算属性） */
  private static readonly DANGEROUS_PROPS = new Set(['constructor', '__proto__']);

  constructor(
    @Inject(getRepositoryToken(ScriptExecution))
    private readonly executionRepo: Repository<ScriptExecution>,
  ) {}

  /**
   * 纯执行方法 — 不写 DB，供 ExecutionQueueService 调用
   *
   * 由调用方（ScriptService）负责创建/更新 ScriptExecution 记录，
   * 实现执行与持久化解耦，便于队列背压控制和异步执行。
   */
  async runScript(script: Script, context: Record<string, any> = {}): Promise<ExecutionResult> {
    const startedAt = Date.now();
    try {
      const apiProvider = context.apiProvider;
      const sandboxContext = this.createSandboxContext(script, context, apiProvider);

      this.logger.debug(`Running script: ${script.name} (${script.id})`);

      let result: any;
      if (script.allowNetwork || script.allowFileSystem) {
        result = await this.executeWithPrivileges(script, sandboxContext);
      } else {
        result = await this.executeSandboxed(script, sandboxContext);
      }

      return { success: true, result, durationMs: Date.now() - startedAt, memoryUsedMb: 0 };
    } catch (error) {
      this.logger.error(`Script ${script.name} failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        durationMs: Date.now() - startedAt,
        memoryUsedMb: 0,
      };
    }
  }

  /**
   * 执行脚本并持久化执行记录（向后兼容入口）
   *
   * 内部调用 runScript 获取结果，再写入 ScriptExecution 表。
   * 队列接入后，手动执行仍走此方法；队列执行走 runScript + 手动管理记录。
   */
  async execute(script: Script, context: Record<string, any> = {}): Promise<ExecutionResult> {
    const startedAt = Date.now();

    const execution = this.executionRepo.create({
      scriptId: script.id,
      trigger: script.triggerType,
      status: 'running',
      startedAt: new Date(),
      memoryUsedMb: 0,
    });

    const result = await this.runScript(script, context);
    const durationMs = Date.now() - startedAt;

    execution.status = result.success ? 'completed' : 'failed';
    execution.result =
      result.success && result.result !== undefined
        ? typeof result.result === 'string'
          ? result.result
          : JSON.stringify(result.result)
        : undefined;
    execution.error = result.error;
    execution.durationMs = durationMs;
    execution.finishedAt = new Date();
    await this.executionRepo.save(execution);

    if (result.success) {
      this.logger.log(`Script ${script.name} completed in ${durationMs}ms`);
    }

    return result;
  }

  /**
   * AST 校验 — 阻断危险全局访问和原型链逃逸
   *
   * 阻断清单：
   * - 标识符引用：eval / Function / Reflect / Proxy / WebAssembly / globalThis
   *   （排除作为对象属性键的情况，避免误杀 { eval: 1 } 这类合法字面量）
   * - 属性访问（非计算）：x.constructor / x.__proto__
   *   （通过原型链获取 Function 构造器是经典沙箱逃逸手法）
   *
   * @param code 脚本代码
   * @returns 校验结果（valid + errors 列表）
   */
  validateScriptAst(code: string): AstValidationResult {
    const errors: string[] = [];
    let ast: any;
    try {
      ast = acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: 'script',
        allowReturnOutsideFunction: true,
      });
    } catch (err: any) {
      return { valid: false, errors: [`Syntax error: ${err.message}`] };
    }

    const visit = (node: any, parent?: any): void => {
      if (!node || typeof node !== 'object') return;

      // 阻断危险属性访问（非计算属性）：x.constructor, x.__proto__
      if (node.type === 'MemberExpression' && !node.computed) {
        const propName = node.property?.name;
        if (propName && ScriptEngineService.DANGEROUS_PROPS.has(propName)) {
          errors.push(`Forbidden property access: "${propName}"`);
        }
      }

      // 阻断危险标识符引用（排除作为属性键的情况）
      if (node.type === 'Identifier') {
        const isPropKey =
          parent &&
          ((parent.type === 'MemberExpression' && parent.property === node && !parent.computed) ||
            (parent.type === 'Property' && parent.key === node && !parent.computed) ||
            (parent.type === 'MethodDefinition' && parent.key === node && !parent.computed));
        if (!isPropKey && ScriptEngineService.DANGEROUS_REFS.has(node.name)) {
          errors.push(`Forbidden global reference: "${node.name}"`);
        }
      }

      // 递归遍历子节点
      for (const key in node) {
        if (key === 'type' || key === 'start' || key === 'end' || key === 'range' || key === 'loc') {
          continue;
        }
        const child = (node as any)[key];
        if (Array.isArray(child)) {
          child.forEach((c: any) => visit(c, node));
        } else if (child && typeof child === 'object' && child.type) {
          visit(child, node);
        }
      }
    };

    visit(ast);
    return { valid: errors.length === 0, errors };
  }

  private async executeSandboxed(script: Script, context: Record<string, any>): Promise<any> {
    // 1. AST 校验前置 — 阻断 eval/Function/constructor/__proto__ 等
    const validation = this.validateScriptAst(script.code);
    if (!validation.valid) {
      throw new Error(`Script AST validation failed: ${validation.errors.join('; ')}`);
    }

    try {
      const contextKeys = Object.keys(context);
      const sandboxFn = new Function(
        ...contextKeys,
        `
        "use strict";
        const ___start = Date.now();
        try {
          ${script.code}
          return { ok: true, value: undefined };
        } catch (___err) {
          return { ok: false, error: ___err.message || String(___err) };
        }
        `,
      );

      // .call(null) 确保 strict 模式下 this 为 null（而非 global 对象）
      const result = await Promise.race([
        sandboxFn.call(null, ...Object.values(context)),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Script execution timeout')), script.timeoutMs),
        ),
      ]);

      if (result && result.ok === false) {
        throw new Error(result.error);
      }

      return result?.value;
    } catch (error) {
      if (error.message === 'Script execution timeout') {
        throw error;
      }
      throw error;
    }
  }

  private async executeWithPrivileges(script: Script, context: Record<string, any>): Promise<any> {
    this.logger.warn(`Script ${script.name} running with elevated privileges`);
    // httpGet/httpPost 已由 ScriptApiService 统一提供（受控 HTTP 工具），
    // 此处不再重复注入原始 require('http')，避免绕过审计。
    return this.executeSandboxed(script, context);
  }

  private createSandboxContext(
    script: Script,
    context: Record<string, any>,
    apiProvider?: any,
  ): Record<string, any> {
    return {
      console: {
        log: (...args: any[]) => this.logger.debug(`[Script ${script.id}] ${args.join(' ')}`),
        info: (...args: any[]) => this.logger.log(`[Script ${script.id}] ${args.join(' ')}`),
        warn: (...args: any[]) => this.logger.warn(`[Script ${script.id}] ${args.join(' ')}`),
        error: (...args: any[]) => this.logger.error(`[Script ${script.id}] ${args.join(' ')}`),
      },
      JSON: JSON,
      Math: Math,
      Date: Date,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Array: Array,
      Object: Object,
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      // ── 危险全局影子化（通过函数参数覆盖全局作用域） ──
      // eval/arguments 在 strict 模式下不能作为参数名，由 AST 校验阻断
      Function: undefined,
      Reflect: undefined,
      Proxy: undefined,
      WebAssembly: undefined,
      globalThis: undefined,
      // ── 原有阻断 ──
      setTimeout: undefined,
      setInterval: undefined,
      require: undefined,
      process: undefined,
      global: undefined,
      ...context,
      ...(apiProvider || {}),
    };
  }
}
