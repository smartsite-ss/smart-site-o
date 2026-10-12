// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI 成本监控与预算熔断 Service — P2-T08
 *
 * 提供：
 *   1. 用量日志记录（每次 LLM 调用后记录 Token + 费用）
 *   2. 用量统计（按供应商/任务/用户/时间聚合）
 *   3. 预算熔断（月度预算 80% 告警 / 100% 阻断）
 *   4. 模型定价表（供费用估算）
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { ConfigService } from '@nestjs/config';

/** 用量日志输入 */
export interface UsageLogInput {
  providerId: string;
  model: string;
  taskType: string;
  userId?: string;
  projectId?: string;
  conversationId?: string;
  promptTokens: number;
  completionTokens: number;
  success: boolean;
  errorMessage?: string;
  latencyMs?: number;
}

/** 用量统计查询参数 */
export interface UsageStatsQuery {
  startDate: Date;
  endDate: Date;
  providerId?: string;
  taskType?: string;
  userId?: string;
  projectId?: string;
}

/** 用量统计结果 */
export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  totalCalls: number;
  successRate: number;
  byProvider: Record<string, { tokens: number; cost: number; calls: number }>;
  byTaskType: Record<string, { tokens: number; cost: number; calls: number }>;
}

/** 预算状态 */
export interface BudgetStatus {
  /** 月度预算上限（美元） */
  budgetLimit: number;
  /** 当月已花费（美元） */
  currentSpent: number;
  /** 剩余预算（美元） */
  remaining: number;
  /** 使用率（0-1） */
  usageRate: number;
  /** 是否已熔断（100% 阻断） */
  isBlocked: boolean;
  /** 是否需要告警（80%） */
  shouldWarn: boolean;
}

/** 模型定价表（美元/1M tokens） */
const MODEL_PRICES: Record<string, { prompt: number; completion: number }> = {
  // DeepSeek
  'deepseek-chat': { prompt: 0.27, completion: 1.1 },
  'deepseek-coder': { prompt: 0.27, completion: 1.1 },
  // 智谱
  'glm-4': { prompt: 0.55, completion: 0.55 },
  'glm-4-flash': { prompt: 0.0027, completion: 0.0027 },
  // OpenAI
  'gpt-4o': { prompt: 5.0, completion: 15.0 },
  'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
  // Qwen
  'qwen-max': { prompt: 1.8, completion: 6.5 },
  'qwen-plus': { prompt: 0.8, completion: 2.0 },
  // Moonshot
  'moonshot-v1-8k': { prompt: 0.81, completion: 0.81 },
  'moonshot-v1-32k': { prompt: 1.62, completion: 1.62 },
  // Claude
  'claude-3-opus': { prompt: 15.0, completion: 75.0 },
  'claude-3-sonnet': { prompt: 3.0, completion: 15.0 },
  'claude-3-haiku': { prompt: 0.25, completion: 1.25 },
  // Gemini
  'gemini-1.5-pro': { prompt: 1.25, completion: 5.0 },
  'gemini-1.5-flash': { prompt: 0.075, completion: 0.3 },
  // Ernie
  'ernie-4.0': { prompt: 1.35, completion: 5.4 },
  'ernie-3.5': { prompt: 1.35, completion: 5.4 },
  // Default (unknown model)
  default: { prompt: 1.0, completion: 2.0 },
};

/** 计算 Token 费用 */
function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const price = MODEL_PRICES[model] || MODEL_PRICES['default'];
  const promptCost = (promptTokens / 1_000_000) * price.prompt;
  const completionCost = (completionTokens / 1_000_000) * price.completion;
  return Math.round((promptCost + completionCost) * 1e8) / 1e8; // 8 位小数
}

@Injectable()
export class CostMonitorService {
  private readonly logger = new Logger(CostMonitorService.name);

  constructor(
    @InjectRepository(AiUsageLog)
    private readonly logRepo: Repository<AiUsageLog>,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  //  用量日志
  // ============================================================

  /** 记录一次 LLM 调用日志 */
  async logUsage(input: UsageLogInput): Promise<AiUsageLog> {
    const totalTokens = input.promptTokens + input.completionTokens;
    const estimatedCost = estimateCost(input.model, input.promptTokens, input.completionTokens);

    const log = this.logRepo.create({
      providerId: input.providerId,
      model: input.model,
      taskType: input.taskType || 'chat',
      userId: input.userId || null,
      projectId: input.projectId || null,
      conversationId: input.conversationId || null,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens,
      estimatedCost,
      success: input.success ? 1 : 0,
      errorMessage: input.errorMessage || null,
      latencyMs: input.latencyMs || null,
    });

    return this.logRepo.save(log);
  }

  // ============================================================
  //  用量统计
  // ============================================================

  /** 获取用量统计 */
  async getStats(query: UsageStatsQuery): Promise<UsageStats> {
    const where: any = {
      createdAt: Between(query.startDate, query.endDate),
    };
    if (query.providerId) where.providerId = query.providerId;
    if (query.taskType) where.taskType = query.taskType;
    if (query.userId) where.userId = query.userId;
    if (query.projectId) where.projectId = query.projectId;

    const logs = await this.logRepo.find({ where });

    const totalCalls = logs.length;
    const successCalls = logs.filter((l) => l.success === 1).length;

    let totalTokens = 0;
    let totalCost = 0;
    const byProvider: Record<string, { tokens: number; cost: number; calls: number }> = {};
    const byTaskType: Record<string, { tokens: number; cost: number; calls: number }> = {};

    for (const log of logs) {
      totalTokens += log.totalTokens;
      totalCost += Number(log.estimatedCost);

      // 按供应商
      if (!byProvider[log.providerId]) {
        byProvider[log.providerId] = { tokens: 0, cost: 0, calls: 0 };
      }
      byProvider[log.providerId].tokens += log.totalTokens;
      byProvider[log.providerId].cost += Number(log.estimatedCost);
      byProvider[log.providerId].calls++;

      // 按任务类型
      if (!byTaskType[log.taskType]) {
        byTaskType[log.taskType] = { tokens: 0, cost: 0, calls: 0 };
      }
      byTaskType[log.taskType].tokens += log.totalTokens;
      byTaskType[log.taskType].cost += Number(log.estimatedCost);
      byTaskType[log.taskType].calls++;
    }

    return {
      totalTokens,
      totalCost: Math.round(totalCost * 1e4) / 1e4,
      totalCalls,
      successRate: totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) / 100 : 0,
      byProvider,
      byTaskType,
    };
  }

  /** 获取当月统计 */
  async getCurrentMonthStats(userId?: string): Promise<UsageStats> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return this.getStats({ startDate: start, endDate: end, userId });
  }

  // ============================================================
  //  预算熔断
  // ============================================================

  /** 获取月度预算上限（美元，从配置读取，默认 100） */
  private getMonthlyBudget(): number {
    return Number(this.configService.get('AI_MONTHLY_BUDGET') || 100);
  }

  /** 检查预算状态 */
  async checkBudget(userId?: string): Promise<BudgetStatus> {
    const budgetLimit = this.getMonthlyBudget();
    const stats = await this.getCurrentMonthStats(userId);
    const currentSpent = stats.totalCost;
    const usageRate = budgetLimit > 0 ? currentSpent / budgetLimit : 0;

    return {
      budgetLimit,
      currentSpent: Math.round(currentSpent * 1e4) / 1e4,
      remaining: Math.round((budgetLimit - currentSpent) * 1e4) / 1e4,
      usageRate: Math.round(usageRate * 1e4) / 1e4,
      isBlocked: usageRate >= 1,
      shouldWarn: usageRate >= 0.8,
    };
  }

  /**
   * 检查是否可继续调用（预算熔断）
   *
   * @returns true = 可继续，false = 已熔断
   */
  async canProceed(userId?: string): Promise<{ allowed: boolean; reason?: string }> {
    const budget = await this.checkBudget(userId);

    if (budget.isBlocked) {
      return {
        allowed: false,
        reason: `月度 AI 预算已耗尽（${budget.currentSpent}/${budget.budgetLimit} USD），如需继续使用请联系管理员。`,
      };
    }

    if (budget.shouldWarn) {
      this.logger.warn(
        `AI 预算使用率 ${Math.round(budget.usageRate * 100)}%（${budget.currentSpent}/${budget.budgetLimit} USD）`,
      );
    }

    return { allowed: true };
  }

  // ============================================================
  //  辅助
  // ============================================================

  /** 获取模型定价信息 */
  getModelPrice(model: string): { prompt: number; completion: number } {
    return MODEL_PRICES[model] || MODEL_PRICES['default'];
  }

  /** 获取所有支持的模型定价 */
  getAllModelPrices(): Record<string, { prompt: number; completion: number }> {
    return { ...MODEL_PRICES };
  }
}

export { estimateCost, MODEL_PRICES };
