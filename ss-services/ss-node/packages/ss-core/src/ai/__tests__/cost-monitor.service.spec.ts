// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 成本监控 Service 单元测试 — P2-T08
 */

import { CostMonitorService, estimateCost, MODEL_PRICES } from '../cost-monitor.service';

function makeService(monthlyBudget = 100) {
  const mockLogRepo: any = {
    create: jest.fn((dto) => ({ ...dto, id: 'log-1' })),
    save: jest.fn((e) => Promise.resolve({ ...e, id: e.id || 'log-1' })),
    find: jest.fn(() => Promise.resolve([])),
  };

  const mockConfig: any = {
    get: jest.fn((key: string) => {
      if (key === 'AI_MONTHLY_BUDGET') return String(monthlyBudget);
      return undefined;
    }),
  };

  return { service: new CostMonitorService(mockLogRepo, mockConfig), mockLogRepo, mockConfig };
}

describe('estimateCost', () => {
  it('应正确计算费用', () => {
    const cost = estimateCost('deepseek-chat', 1000000, 1000000);
    // prompt: 0.27, completion: 1.10 → 1.37
    expect(cost).toBeCloseTo(1.37, 1);
  });

  it('未知模型应使用默认定价', () => {
    const cost = estimateCost('unknown-model', 1000000, 1000000);
    expect(cost).toBeCloseTo(3.0, 1); // 1+2
  });

  it('零 Token 应返回零费用', () => {
    const cost = estimateCost('deepseek-chat', 0, 0);
    expect(cost).toBe(0);
  });
});

describe('MODEL_PRICES', () => {
  it('应包含已知模型定价', () => {
    expect(MODEL_PRICES['deepseek-chat']).toBeDefined();
    expect(MODEL_PRICES['gpt-4o']).toBeDefined();
    expect(MODEL_PRICES['claude-3-opus']).toBeDefined();
    expect(MODEL_PRICES['default']).toBeDefined();
  });
});

describe('CostMonitorService — 日志记录', () => {
  it('应记录日志', async () => {
    const { service, mockLogRepo } = makeService();
    await service.logUsage({
      providerId: 'deepseek',
      model: 'deepseek-chat',
      taskType: 'chat',
      promptTokens: 1000,
      completionTokens: 500,
      success: true,
    });
    expect(mockLogRepo.save).toHaveBeenCalledTimes(1);
    expect(mockLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        totalTokens: 1500,
        success: 1,
      }),
    );
  });

  it('应记录失败日志', async () => {
    const { service, mockLogRepo } = makeService();
    await service.logUsage({
      providerId: 'deepseek',
      model: 'deepseek-chat',
      taskType: 'chat',
      promptTokens: 500,
      completionTokens: 0,
      success: false,
      errorMessage: 'timeout',
    });
    expect(mockLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success: 0,
        errorMessage: 'timeout',
      }),
    );
  });
});

describe('CostMonitorService — 预算检查', () => {
  it('预算充足时应允许继续', async () => {
    const { service, mockLogRepo } = makeService(100);
    // 模拟当月已花费 50
    mockLogRepo.find = jest.fn(() =>
      Promise.resolve([
        {
          totalTokens: 10000000,
          estimatedCost: 50,
          success: 1,
          providerId: 'd',
          taskType: 'chat',
          model: 'm',
        },
      ]),
    );
    const result = await service.canProceed();
    expect(result.allowed).toBe(true);
  });

  it('达 100% 时应熔断', async () => {
    const { service, mockLogRepo } = makeService(100);
    mockLogRepo.find = jest.fn(() =>
      Promise.resolve([
        {
          totalTokens: 20000000,
          estimatedCost: 110,
          success: 1,
          providerId: 'd',
          taskType: 'chat',
          model: 'm',
        },
      ]),
    );
    const result = await service.canProceed();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('已耗尽');
  });

  it('达 80% 时应告警但不阻断', async () => {
    const { service, mockLogRepo } = makeService(100);
    mockLogRepo.find = jest.fn(() =>
      Promise.resolve([
        {
          totalTokens: 15000000,
          estimatedCost: 85,
          success: 1,
          providerId: 'd',
          taskType: 'chat',
          model: 'm',
        },
      ]),
    );
    const result = await service.canProceed();
    expect(result.allowed).toBe(true);
  });
});

describe('CostMonitorService — 模型定价', () => {
  it('应获取已知模型定价', () => {
    const { service } = makeService();
    const price = service.getModelPrice('deepseek-chat');
    expect(price.prompt).toBe(0.27);
    expect(price.completion).toBe(1.1);
  });

  it('应获取所有模型定价', () => {
    const { service } = makeService();
    const all = service.getAllModelPrices();
    expect(all['deepseek-chat']).toBeDefined();
    expect(all['default']).toBeDefined();
  });
});

describe('CostMonitorService — 统计', () => {
  it('应返回当前月统计', async () => {
    const { service, mockLogRepo } = makeService();
    mockLogRepo.find = jest.fn(() =>
      Promise.resolve([
        {
          totalTokens: 1000,
          estimatedCost: 0.05,
          success: 1,
          providerId: 'deepseek',
          taskType: 'chat',
          model: 'm',
        },
        {
          totalTokens: 500,
          estimatedCost: 0.02,
          success: 0,
          providerId: 'deepseek',
          taskType: 'codegen',
          model: 'm',
        },
      ]),
    );
    const stats = await service.getCurrentMonthStats();
    expect(stats.totalTokens).toBe(1500);
    expect(stats.totalCost).toBe(0.07);
    expect(stats.totalCalls).toBe(2);
    expect(stats.successRate).toBe(0.5);
    expect(stats.byProvider['deepseek'].tokens).toBe(1500);
    expect(stats.byTaskType['chat'].calls).toBe(1);
    expect(stats.byTaskType['codegen'].calls).toBe(1);
  });
});
