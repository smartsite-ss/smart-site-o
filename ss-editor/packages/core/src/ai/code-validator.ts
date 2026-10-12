// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Code Validator — P1-T05/P1-T06 代码校验工具
 *
 * 对 LLM 生成的代码进行语法校验和安全性检查：
 *   1. JS/TS 语法校验（Function 构造函数 + 正则模式检查）
 *   2. 安全性检查（禁止使用 window/document/eval 等全局对象）
 *   3. 常见错误检测（括号不匹配、未闭合字符串等）
 *
 * 用法:
 *   const result = validateCode(code, 'javascript');
 *   // result.valid → boolean
 *   // result.errors → ValidationError[]
 */

// ============================================================
// 类型定义
// ============================================================

export interface ValidationError {
  /** 错误消息 */
  message: string;
  /** 错误行号（1-based），-1 表示未知 */
  line: number;
  /** 错误列号（1-based），-1 表示未知 */
  column: number;
  /** 错误类型 */
  type: 'syntax' | 'security' | 'style';
  /** 严重级别 */
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  /** 是否通过校验 */
  valid: boolean;
  /** 错误/警告列表 */
  errors: ValidationError[];
  /** 警告列表（severity === 'warning'） */
  warnings: ValidationError[];
}

// ============================================================
// 安全黑名单：禁止在沙箱脚本中使用的全局对象和函数
// ============================================================

const FORBIDDEN_GLOBALS = [
  { pattern: /\bwindow\b(?!\s*\])/g, message: '禁止使用 window 全局对象，请使用 api.* 或 context.*', type: 'security' as const },
  { pattern: /\bdocument\b(?!\s*\])/g, message: '禁止使用 document 对象（沙箱无 DOM）', type: 'security' as const },
  { pattern: /\beval\s*\(/g, message: '禁止使用 eval()', type: 'security' as const },
  { pattern: /\bFunction\s*\(/g, message: '禁止使用 Function 构造函数', type: 'security' as const },
  { pattern: /\blocalStorage\b/g, message: '禁止直接使用 localStorage', type: 'security' as const },
  { pattern: /\bsessionStorage\b/g, message: '禁止直接使用 sessionStorage', type: 'security' as const },
  { pattern: /\bXMLHttpRequest\b/g, message: '禁止直接使用 XMLHttpRequest，请用 api.fetch()', type: 'security' as const },
  { pattern: /\bWebSocket\b(?!\s*\])/g, message: '禁止直接使用 WebSocket', type: 'security' as const },
  { pattern: /\b__proto__\b/g, message: '禁止访问 __proto__', type: 'security' as const },
  { pattern: /\bconstructor\s*\[/g, message: '禁止访问 constructor[]', type: 'security' as const },
];

// ============================================================
// 常见语法错误模式
// ============================================================

const COMMON_SYNTAX_ISSUES = [
  { pattern: /{\s*\.{3}/g, message: '展开运算符不能在对象字面量外部使用', type: 'syntax' as const },
  { pattern: /const\s+\w+\s*:\s*\w+/g, message: 'JS/TS 中变量声明不需要类型注解（const x: number → 移除 : number）', type: 'syntax' as const, severity: 'warning' as const },
];

// ============================================================
// CodeValidator
// ============================================================

export class CodeValidator {
  /**
   * 校验代码
   * @param code 代码字符串
   * @param lang 语言标识（javascript/typescript/js/ts）
   * @param options.sandboxMode 沙箱模式（默认 true），检测禁止的 API
   */
  validate(
    code: string,
    lang: string = 'javascript',
    options: { sandboxMode?: boolean } = {},
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const { sandboxMode = true } = options;

    // 1. 基础模式检查（括号匹配等）
    this._checkBasicSyntax(code, errors);

    // 2. Function 构造函数语法校验
    if (this._isJavaScript(lang)) {
      this._checkWithFunction(code, errors);
    }

    // 3. 安全黑名单检查（仅沙箱模式）
    if (sandboxMode) {
      this._checkSecurity(code, errors);
    }

    // 4. 常见模式检查
    this._checkCommonPatterns(code, errors);

    const warnings = errors.filter((e) => e.severity === 'warning');
    const realErrors = errors.filter((e) => e.severity === 'error');
    const valid = realErrors.length === 0;

    return { valid, errors, warnings };
  }

  /**
   * 快速校验（只返回是否通过）
   */
  isValid(code: string, lang: string = 'javascript'): boolean {
    return this.validate(code, lang).valid;
  }

  // ─── 私有方法 ───

  private _isJavaScript(lang: string): boolean {
    return ['javascript', 'js', 'typescript', 'ts', 'tsx', 'jsx'].includes(lang.toLowerCase());
  }

  private _checkBasicSyntax(code: string, errors: ValidationError[]): void {
    // 括号匹配检查
    const bracketPairs = [
      { open: '{', close: '}', name: '花括号' },
      { open: '[', close: ']', name: '方括号' },
      { open: '(', close: ')', name: '圆括号' },
    ];

    // 排除字符串和注释中的括号
    const cleanCode = this._stripStringsAndComments(code);

    for (const pair of bracketPairs) {
      let depth = 0;
      let line = 1;
      let col = 1;

      for (let i = 0; i < cleanCode.length; i++) {
        const ch = cleanCode[i];
        if (ch === '\n') {
          line++;
          col = 1;
          continue;
        }
        col++;
        if (ch === pair.open) depth++;
        if (ch === pair.close) {
          depth--;
          if (depth < 0) {
            errors.push({
              message: `${pair.name}不匹配：多余的 "${pair.close}"`,
              line,
              column: col,
              type: 'syntax',
              severity: 'error',
            });
            depth = 0; // 重置以继续检查
          }
        }
      }

      if (depth > 0) {
        errors.push({
          message: `${pair.name}未闭合：缺少 ${depth} 个 "${pair.close}"`,
          line: -1,
          column: -1,
          type: 'syntax',
          severity: 'error',
        });
      }
    }
  }

  private _checkWithFunction(code: string, errors: ValidationError[]): void {
    try {
      // 使用 Function 构造函数进行语法检查
      // 注意：只编译不执行，安全
      new Function(code);
    } catch (e) {
      const message = e instanceof SyntaxError ? e.message : String(e);

      // 尝试提取行号
      let line = -1;
      let column = -1;
      const lineMatch = message.match(/at position (\d+)/i)
        || message.match(/Unexpected token.*at (\d+)/i)
        || message.match(/line (\d+)/i);

      if (lineMatch) {
        const pos = parseInt(lineMatch[1], 10);
        if (!isNaN(pos) && pos > 0) {
          // 根据位置计算行列
          const lines = code.substring(0, pos).split('\n');
          line = lines.length;
          column = lines[lines.length - 1].length + 1;
        }
      }

      errors.push({
        message: `语法错误: ${message}`,
        line,
        column,
        type: 'syntax',
        severity: 'error',
      });
    }
  }

  private _checkSecurity(code: string, errors: ValidationError[]): void {
    for (const rule of FORBIDDEN_GLOBALS) {
      // 重置正则 lastIndex
      rule.pattern.lastIndex = 0;
      const cleanCode = this._stripStringsAndComments(code);
      const match = rule.pattern.exec(cleanCode);
      if (match) {
        const lines = code.substring(0, match.index).split('\n');
        errors.push({
          message: rule.message,
          line: lines.length,
          column: lines[lines.length - 1].length + 1,
          type: rule.type,
          severity: 'error',
        });
      }
    }
  }

  private _checkCommonPatterns(code: string, errors: ValidationError[]): void {
    for (const rule of COMMON_SYNTAX_ISSUES) {
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(code);
      if (match) {
        const lines = code.substring(0, match.index).split('\n');
        errors.push({
          message: rule.message,
          line: lines.length,
          column: lines[lines.length - 1].length + 1,
          type: rule.type,
          severity: rule.severity || 'warning',
        });
      }
    }
  }

  /**
   * 移除字符串字面量和注释内容
   */
  private _stripStringsAndComments(code: string): string {
    // 移除单行注释
    let result = code.replace(/\/\/.*$/gm, '');
    // 移除多行注释
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    // 移除模板字符串
    result = result.replace(/`(?:[^`\\]|\\.)*`/g, '``');
    // 移除单引号字符串
    result = result.replace(/'(?:[^'\\]|\\.)*'/g, "''");
    // 移除双引号字符串
    result = result.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    return result;
  }
}

/** 单例 */
export const codeValidator = new CodeValidator();

/**
 * 便捷函数：校验代码
 */
export function validateCode(
  code: string,
  lang: string = 'javascript',
  options?: { sandboxMode?: boolean },
): ValidationResult {
  return codeValidator.validate(code, lang, options);
}

/**
 * 便捷函数：校验并返回格式化错误信息
 */
export function validateCodeForDisplay(
  code: string,
  lang: string = 'javascript',
): { valid: boolean; summary: string } {
  const result = validateCode(code, lang);
  if (result.valid) {
    return { valid: true, summary: '校验通过' };
  }

  const errorMsgs = result.errors
    .filter((e) => e.severity === 'error')
    .map((e) => `[E${e.line > 0 ? ` L${e.line}` : ''}] ${e.message}`)
    .join('; ');

  const warnMsgs = result.warnings
    .map((e) => `[W${e.line > 0 ? ` L${e.line}` : ''}] ${e.message}`)
    .join('; ');

  const parts: string[] = [];
  if (errorMsgs) parts.push(errorMsgs);
  if (warnMsgs) parts.push(warnMsgs);

  return { valid: false, summary: parts.join(' | ') };
}
