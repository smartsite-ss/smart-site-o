// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject } from '@nestjs/common';
import { I18nService } from '@ss-node/ss-i18n';
import { ScriptEngineService } from './script-engine.service';
import { Script, ScriptStatus, ScriptTriggerType } from './entities/script.entity';

export interface ValidationError {
  line: number;
  column: number;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface DryRunResult {
  success: boolean;
  result?: any;
  error?: string;
  durationMs: number;
  memoryUsedMb: number;
  logs: string[];
}

@Injectable()
export class ScriptValidatorService {
  private readonly logger = new Logger(ScriptValidatorService.name);

  constructor(
    private readonly engineService: ScriptEngineService,
    @Inject(I18nService)
    private readonly i18nService: I18nService,
  ) {}

  validate(code: string): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      this.parseWithAcorn(code);
    } catch (e: any) {
      if (e && typeof e === 'object' && 'loc' in e) {
        const loc = (e as any).loc;
        if (loc) {
          errors.push({
            line: loc.line || 1,
            column: (loc.column || 0) + 1,
            message: e.message || String(e),
          });
        } else {
          errors.push({
            line: 1,
            column: 1,
            message: e.message || String(e),
          });
        }
      } else {
        const parsed = this.parseErrorMessage(e, code);
        errors.push(parsed);
      }
    }

    if (errors.length === 0) {
      const forbiddenCheck = this.checkForbiddenPatterns(code);
      errors.push(...forbiddenCheck);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private parseWithAcorn(code: string): void {
    try {
      const acorn = require('acorn');
      acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: 'script',
        locations: true,
      });
    } catch (e) {
      throw e;
    }
  }

  private parseErrorMessage(e: any, code: string): ValidationError {
    const msg = e instanceof Error ? e.message : String(e);

    const lineMatch = msg.match(/\((\d+):(\d+)\)/);
    if (lineMatch) {
      return {
        line: parseInt(lineMatch[1], 10),
        column: parseInt(lineMatch[2], 10),
        message: msg,
      };
    }

    const positionMatch = msg.match(/line\s+(\d+).*?column\s+(\d+)/i);
    if (positionMatch) {
      return {
        line: parseInt(positionMatch[1], 10),
        column: parseInt(positionMatch[2], 10),
        message: msg,
      };
    }

    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('//') && !line.startsWith('/*')) {
        if (line.includes('{') && !line.includes('}')) {
          return { line: i + 1, column: line.lastIndexOf('{') + 1, message: msg };
        }
        if (line.includes('(') && !line.includes(')')) {
          return { line: i + 1, column: line.lastIndexOf('(') + 1, message: msg };
        }
      }
    }

    return { line: 1, column: 1, message: msg };
  }

  private checkForbiddenPatterns(code: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const forbidden = [
      { pattern: /\brequire\s*\(/, message: 'require() is forbidden in sandbox' },
      { pattern: /\bimport\s+/, message: 'import statements are forbidden in sandbox' },
      { pattern: /\bprocess\./, message: 'process global is forbidden in sandbox' },
    ];

    const lines = code.split('\n');
    for (const rule of forbidden) {
      for (let i = 0; i < lines.length; i++) {
        const match = rule.pattern.exec(lines[i]);
        if (match) {
          errors.push({
            line: i + 1,
            column: match.index + 1,
            message: rule.message,
          });
        }
      }
    }

    return errors;
  }

  async dryRun(
    code: string,
    context?: Record<string, any>,
    allowNetwork?: boolean,
    allowFileSystem?: boolean,
  ): Promise<DryRunResult> {
    const validation = this.validate(code);
    if (!validation.valid) {
      const firstError = validation.errors[0];
      return {
        success: false,
        error: `Syntax error at line ${firstError.line}, column ${firstError.column}: ${firstError.message}`,
        durationMs: 0,
        memoryUsedMb: 0,
        logs: [],
      };
    }

    const logs: string[] = [];

    const dryRunScript = {
      id: 'dry-run',
      name: 'dry-run',
      description: null,
      code,
      status: ScriptStatus.DRAFT,
      triggerType: ScriptTriggerType.MANUAL,
      triggerConfig: null,
      allowNetwork: !!allowNetwork,
      allowFileSystem: !!allowFileSystem,
      timeoutMs: 10000,
      memoryLimitMb: 128,
      projectId: 'dry-run',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Script;

    const mockConsole = {
      log: (...args: any[]) => logs.push(`[LOG] ${args.join(' ')}`),
      info: (...args: any[]) => logs.push(`[INFO] ${args.join(' ')}`),
      warn: (...args: any[]) => logs.push(`[WARN] ${args.join(' ')}`),
      error: (...args: any[]) => logs.push(`[ERROR] ${args.join(' ')}`),
    };

    const dryRunContext = {
      ...context,
      console: mockConsole,
    };

    try {
      const result = await this.engineService.execute(dryRunScript, dryRunContext);
      return {
        success: result.success,
        result: result.result,
        error: result.error,
        durationMs: result.durationMs,
        memoryUsedMb: result.memoryUsedMb,
        logs,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
        durationMs: 0,
        memoryUsedMb: 0,
        logs,
      };
    }
  }
}
