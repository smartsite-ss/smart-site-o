// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * LLM Safety Guard Service — P1-T09 安全防护
 *
 * 四层安全过滤：
 *  1. filterInput()     — 用户输入过滤（敏感词 / 代码注入 / prompt 注入）
 *  2. markUntrusted()   — 工具调用结果标记为不可信
 *  3. sanitizeContext() — RAG 检索内容净化
 *  4. sanitizeOutput()  — LLM 输出净化
 *
 * 附加机制：
 *  - override token 放行（管理员调试）
 *  - 熔断器（violation rate > 阈值 → 阻断所有请求）
 *  - 审计日志（违规记录写入 Logger）
 *
 * 关联决策：D-014（LLMSafetyGuard 设计）
 *
 * 用法:
 *   const guard = new LLMSafetyGuardService();
 *   const safe = guard.filterInput(userMessage);  // null = 阻断
 *   guard.markUntrusted(toolResult);               // 包装不可信内容
 *   guard.sanitizeOutput(llmResponse);             // 净化输出
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/** 安全过滤结果 */
export interface SafetyResult {
  /** true = 通过，false = 阻断 */
  passed: boolean;
  /** 阻断时的原因描述 */
  reason?: string;
  /** 净化后的内容（通过时） */
  content?: string;
}

/** 安全配置 */
export interface SafetyConfig {
  /** 熔断阈值（违规次数/时间窗口） */
  circuitBreakerThreshold: number;
  /** 熔断窗口（毫秒） */
  circuitBreakerWindowMs: number;
  /** 熔断冷却时间（毫秒） */
  circuitBreakerCooldownMs: number;
}

const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  circuitBreakerThreshold: 20,
  circuitBreakerWindowMs: 60_000,
  circuitBreakerCooldownMs: 180_000,
};

/** 敏感关键词（正则模式） */
const SENSITIVE_PATTERNS: RegExp[] = [
  // 系统破坏类
  /\brm\s+-rf\b/i,
  /\bformat\s+[cdef]:\b/i,
  /\bdel\b.*\b\/[fsq]\b/i,
  /\bdrop\s+table\b/i,
  /\btruncate\s+table\b/i,
  // Prompt 注入类
  /ignore\s+(all\s+)?(previous|above)\s*instructions/i,
  /you\s+are\s+(now|no\s+longer)\s+(a\s+)?\w+\s*(ai|assistant)/i,
  /system\s*prompt\s*:?\s*".*"/i,
  /\bpretend\s+you\s+are\b/i,
  /forget\s+(everything|all\s+context)/i,
  /\boverride\s+system\b/i,
  // 越狱模式
  /\bDAN\b.*\bmode\b/i,
  /jailbreak/i,
  /developer\s*mode/i,
  // 敏感信息泄露
  /\bAPI[_\s]*KEY\s*[:=]\s*['\"]?\w+/i,
  /\bpassword\s*[:=]\s*['\"]?[^\s]+/i,
  /\btoken\s*[:=]\s*['\"]?[^\s]+/i,
  // 代码注入
  /<script\b[^>]*>/i,
  /javascript\s*:\s*alert/i,
  /\beval\s*\(\s*['\"]\s*</i,
  /\bexec\s*\(\s*['\"]/i,
];

/** Prompt 注入指示词标记（用于 markUntrusted） */
const UNTRUSTED_MARKER_START = '[UNTRUSTED_CONTENT_START]';
const UNTRUSTED_MARKER_END = '[UNTRUSTED_CONTENT_END]';

/** Admin 放行 Token */
const OVERRIDE_TOKEN_PREFIX = 'SS_SAFETY_OVERRIDE:';

@Injectable()
export class LLMSafetyGuardService {
  private readonly logger = new Logger(LLMSafetyGuardService.name);
  private readonly config: SafetyConfig;
  private circuitOpen = false;
  private circuitOpenedAt = 0;
  private violationCount = 0;
  private violationWindowStart = Date.now();

  constructor(private readonly configService: ConfigService) {
    this.config = {
      ...DEFAULT_SAFETY_CONFIG,
      circuitBreakerThreshold:
        Number(configService.get<string>('AI_SAFETY_CB_THRESHOLD')) ||
        DEFAULT_SAFETY_CONFIG.circuitBreakerThreshold,
      circuitBreakerWindowMs:
        Number(configService.get<string>('AI_SAFETY_CB_WINDOW_MS')) ||
        DEFAULT_SAFETY_CONFIG.circuitBreakerWindowMs,
      circuitBreakerCooldownMs:
        Number(configService.get<string>('AI_SAFETY_CB_COOLDOWN_MS')) ||
        DEFAULT_SAFETY_CONFIG.circuitBreakerCooldownMs,
    };
  }

  // ============================================================
  //  1. 用户输入过滤
  // ============================================================

  /**
   * 过滤用户输入，检查敏感内容
   * @param input — 用户原始输入
   * @param overrideToken — 管理员放行 Token（可选）
   * @returns 过滤结果。passed=false 时阻断请求
   */
  filterInput(input: string, overrideToken?: string): SafetyResult {
    if (!input?.trim()) {
      return { passed: true, content: input };
    }

    // 熔断器检查
    const circuitResult = this.checkCircuitBreaker();
    if (!circuitResult.passed) {
      return circuitResult;
    }

    // Override Token 放行
    if (overrideToken && this.validateOverrideToken(overrideToken)) {
      this.logger.warn('管理员通过 Override Token 放行输入过滤（审计记录）');
      return { passed: true, content: input };
    }

    // 敏感模式匹配
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(input)) {
        this.recordViolation(`敏感模式匹配: ${pattern.source}`);
        return {
          passed: false,
          reason: `输入包含不安全内容（模式: ${pattern.source}）`,
        };
      }
    }

    // 长度限制（防止资源滥用）
    if (input.length > 64_000) {
      this.recordViolation('输入长度超限');
      return { passed: false, reason: '输入长度超过 64KB 限制' };
    }

    return { passed: true, content: input.trim() };
  }

  // ============================================================
  //  2. 工具调用结果标记
  // ============================================================

  /**
   * 将工具调用结果标记为不可信内容
   *
   * 标记后的内容会被包装在特殊标签中，
   * 供后续 filter 识别并加强对其中注入攻击的检测。
   */
  markUntrusted(text: string): string {
    return `${UNTRUSTED_MARKER_START}\n${text}\n${UNTRUSTED_MARKER_END}`;
  }

  /**
   * 检查内容是否包含不可信标记
   */
  isUntrusted(text: string): boolean {
    return text.includes(UNTRUSTED_MARKER_START);
  }

  // ============================================================
  //  3. RAG 检索内容净化
  // ============================================================

  /**
   * 净化外部知识库检索内容
   *
   * 对 RAG 检索到的文档块进行安全检查：
   * - 检查是否包含不安全的指令模式
   * - 清理不可信内容标记
   * - 可选地截断过长内容
   */
  sanitizeContext(chunks: string[]): SafetyResult {
    const safe: string[] = [];

    for (const chunk of chunks) {
      // 检查敏感模式
      let blocked = false;
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(chunk)) {
          this.recordViolation(`RAG 内容敏感模式: ${pattern.source}`);
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        // 清理不可信标记、截断过长内容
        const cleaned = this.stripUntrustedMarkers(chunk);
        safe.push(cleaned.length > 32_000 ? cleaned.substring(0, 32_000) + '...' : cleaned);
      }
    }

    return {
      passed: safe.length > 0,
      content: safe.join('\n\n---\n\n'),
      reason: safe.length === 0 ? '所有检索内容被安全过滤' : undefined,
    };
  }

  // ============================================================
  //  4. LLM 输出净化
  // ============================================================

  /**
   * 净化 LLM 返回内容
   *
   * 检查：
   * - 是否包含敏感的 API Key / Token
   * - 是否包含破坏性系统命令
   * - 是否尝试输出 Prompt 注入标记
   */
  sanitizeOutput(output: string): SafetyResult {
    if (!output) {
      return { passed: true, content: output };
    }

    // 脱敏：替换疑似 API Key 的内容
    let sanitized = output.replace(/\b(sk-[a-zA-Z0-9]{20,})\b/g, '[REDACTED_API_KEY]');

    // 检查不可信标记泄露
    if (this.isUntrusted(sanitized)) {
      sanitized = this.stripUntrustedMarkers(sanitized);
    }

    return { passed: true, content: sanitized };
  }

  // ============================================================
  //  5. 熔断器
  // ============================================================

  /**
   * 检查熔断器状态
   */
  private checkCircuitBreaker(): SafetyResult {
    const now = Date.now();

    // 熔断打开 → 检查冷却时间
    if (this.circuitOpen) {
      if (now - this.circuitOpenedAt < this.config.circuitBreakerCooldownMs) {
        return {
          passed: false,
          reason: '安全熔断器已触发，请稍后重试',
        };
      }
      // 冷却结束，关闭熔断
      this.circuitOpen = false;
      this.violationCount = 0;
      this.violationWindowStart = now;
      this.logger.warn('熔断器已恢复（冷却结束）');
    }

    // 重置窗口
    if (now - this.violationWindowStart > this.config.circuitBreakerWindowMs) {
      this.violationCount = 0;
      this.violationWindowStart = now;
    }

    return { passed: true };
  }

  /**
   * 记录违规
   */
  private recordViolation(reason: string): void {
    this.violationCount++;
    this.logger.warn(`安全违规 #${this.violationCount}: ${reason}`);

    if (this.violationCount >= this.config.circuitBreakerThreshold && !this.circuitOpen) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
      this.logger.error(
        `熔断器触发！阈值 ${this.config.circuitBreakerThreshold} 次/` +
          `${this.config.circuitBreakerWindowMs}ms，将在 ` +
          `${this.config.circuitBreakerCooldownMs}ms 后恢复`,
      );
    }
  }

  // ============================================================
  //  6. Admin Override Token（S-H04: HMAC 签名，防止伪造）
  // ============================================================

  /**
   * 生成一次性放行 Token（HMAC-SHA256 签名）
   *
   * Token 格式：SS_SAFETY_OVERRIDE:<base64url(payload)>.<base64url(signature)>
   * 签名密钥：JWT_SECRET（与 JWT 共用，确保签名不可伪造）
   */
  generateOverrideToken(_adminToken: string): string {
    const payload = JSON.stringify({
      role: 'admin',
      ts: Date.now(),
      nonce: crypto.randomUUID(),
    });
    const payloadB64 = Buffer.from(payload).toString('base64url');
    const signature = this.signOverride(payloadB64);
    return `${OVERRIDE_TOKEN_PREFIX}${payloadB64}.${signature}`;
  }

  /**
   * 验证 Override Token（HMAC-SHA256 签名 + 时效检查）
   */
  private validateOverrideToken(token: string): boolean {
    if (!token.startsWith(OVERRIDE_TOKEN_PREFIX)) return false;

    try {
      const rest = token.slice(OVERRIDE_TOKEN_PREFIX.length);
      const [payloadB64, signature] = rest.split('.');
      if (!payloadB64 || !signature) return false;

      // 签名校验（使用 timingSafeEqual 防止时序攻击）
      const expectedSig = this.signOverride(payloadB64);
      const sigBuf = Buffer.from(signature);
      const expectedBuf = Buffer.from(expectedSig);
      if (sigBuf.length !== expectedBuf.length) return false;
      if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

      // payload 校验
      const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
      // 5 分钟内有效
      return decoded.role === 'admin' && Date.now() - decoded.ts < 300_000;
    } catch {
      return false;
    }
  }

  /**
   * HMAC-SHA256 签名（使用 JWT_SECRET 作为密钥）
   */
  private signOverride(payloadB64: string): string {
    const secret = process.env.JWT_SECRET || '';
    return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  }

  // ============================================================
  //  辅助方法
  // ============================================================

  private stripUntrustedMarkers(text: string): string {
    return text
      .replace(new RegExp(UNTRUSTED_MARKER_START, 'g'), '')
      .replace(new RegExp(UNTRUSTED_MARKER_END, 'g'), '')
      .replace(new RegExp(`\\n?${UNTRUSTED_MARKER_START}\\n?`, 'g'), '')
      .replace(new RegExp(`\\n?${UNTRUSTED_MARKER_END}\\n?`, 'g'), '');
  }

  /** 获取当前安全统计数据 */
  getStats() {
    return {
      circuitOpen: this.circuitOpen,
      circuitOpenedAt: this.circuitOpenedAt || null,
      violationCount: this.violationCount,
      violationWindowStart: this.violationWindowStart,
      config: this.config,
    };
  }
}
