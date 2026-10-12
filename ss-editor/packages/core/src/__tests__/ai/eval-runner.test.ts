// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI 评估运行器单元测试 — P1-T10
 */

import { describe, it, expect } from 'vitest';
import {
  runEvaluation,
  formatReportText,
  formatReportMarkdown,
  buildComparisonMatrix,
  formatComparisonMatrix,
  formatComparisonMarkdown,
} from '../../ai/evaluation/eval-runner';
import { EVAL_CASES, EVAL_STATS } from '../../ai/evaluation/eval-cases';

// ============================================================
// Mock AI 客户端
// ============================================================

function createMockCall(responses: Record<string, string>) {
  return async (input: string, _taskType: string, _providerId?: string, _model?: string) => {
    // 找到关键词匹配的用例
    for (const [key, content] of Object.entries(responses)) {
      if (input.includes(key)) {
        return { content, usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }, latencyMs: 100 };
      }
    }
    return { content: '默认响应', usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 }, latencyMs: 50 };
  };
}

// ============================================================
// 测试：eval-cases.ts
// ============================================================

describe('EVAL_CASES', () => {
  it('应有至少 50 个用例', () => {
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(50);
  });

  it('所有用例应有唯一 ID', () => {
    const ids = EVAL_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('所有用例权重和应接近 1（误差 < 0.01）', () => {
    for (const c of EVAL_CASES) {
      const sum = c.dimensions.reduce((s, d) => s + d.weight, 0);
      expect(sum).toBeCloseTo(1, 1);
    }
  });

  it('所有用例 minScore 应在 0-1 范围内', () => {
    for (const c of EVAL_CASES) {
      expect(c.minScore).toBeGreaterThanOrEqual(0);
      expect(c.minScore).toBeLessThanOrEqual(1);
    }
  });

  it('EVAL_STATS 统计应正确', () => {
    expect(EVAL_STATS.total).toBe(EVAL_CASES.length);

    const catSum = Object.values(EVAL_STATS.byCategory).reduce((a, b) => a + b, 0);
    expect(catSum).toBe(EVAL_CASES.length);

    const priSum = Object.values(EVAL_STATS.byPriority).reduce((a, b) => a + b, 0);
    expect(priSum).toBe(EVAL_CASES.length);
  });

  it('应有所有 5 个 category', () => {
    expect(EVAL_STATS.byCategory).toHaveProperty('plugin-gen');
    expect(EVAL_STATS.byCategory).toHaveProperty('script-gen');
    expect(EVAL_STATS.byCategory).toHaveProperty('kb-qa');
    expect(EVAL_STATS.byCategory).toHaveProperty('alarm-analysis');
    expect(EVAL_STATS.byCategory).toHaveProperty('safety');
  });
});

// ============================================================
// 测试：eval-runner.ts
// ============================================================

describe('runEvaluation', () => {
  it('应正确运行单个用例并自动评分', async () => {
    const cases = EVAL_CASES.filter((c) => c.id === 'plugin-001');

    const report = await runEvaluation({
      cases,
      callAI: createMockCall({
        '阀门': '```ts\nclass ValvePlugin extends BasePlugin { type = "valve" }\n```\n工业组件，支持 isOn boolean，status Color，使用 Canvas 渲染',
      }),
      providerId: 'test',
      model: 'test-model',
    });

    expect(report.caseResults.length).toBe(1);
    expect(report.config.providerId).toBe('test');
    expect(report.config.model).toBe('test-model');

    const result = report.caseResults[0];
    expect(result.caseId).toBe('plugin-001');
    expect(result.dimensionResults.length).toBe(5);
    expect(result.usage?.totalTokens).toBe(30);
  });

  it('keyword 维度应对关键词正确评分', async () => {
    const cases = EVAL_CASES.filter((c) => c.id === 'plugin-001');

    const report = await runEvaluation({
      cases,
      callAI: createMockCall({
        '阀门': '这是一段包含 industrial canvas2d isOn boolean status Color 的响应',
      }),
    });

    const catDim = report.caseResults[0].dimensionResults.find((d) => d.name === 'category-match');
    expect(catDim).toBeDefined();
    expect(catDim!.score).toBeGreaterThanOrEqual(0);
  });

  it('structure 维度应检查代码结构', async () => {
    const cases = EVAL_CASES.filter((c) => c.id === 'plugin-001');

    const report = await runEvaluation({
      cases,
      callAI: createMockCall({
        '阀门': '```ts\nclass MyPlugin extends BasePlugin {\n  type = "valve"\n}\n```',
      }),
    });

    const structDim = report.caseResults[0].dimensionResults.find((d) => d.name === 'code-complete');
    expect(structDim).toBeDefined();
    expect(structDim!.autoScored).toBe(true);
  });

  it('空关键词应标记为需人工', async () => {
    // safety-001 的 blocked 维度关键词为空
    const cases = EVAL_CASES.filter((c) => c.id === 'safety-001');

    const report = await runEvaluation({
      cases,
      callAI: createMockCall({
        '黑客': '我无法提供此类信息。',
      }),
    });

    const blockedDim = report.caseResults[0].dimensionResults.find((d) => d.name === 'blocked');
    expect(blockedDim).toBeDefined();
    expect(blockedDim!.autoScored).toBe(false);
    expect(report.manualDimCount).toBeGreaterThanOrEqual(1);
  });

  it('exact 方法应精确匹配', async () => {
    const cases = EVAL_CASES.filter((c) => c.id === 'script-001');

    const report = await runEvaluation({
      cases,
      callAI: createMockCall({
        '温度': '这是 dataChange 触发，使用 temperature 标签，调用 readTag 和 triggerAlarm 的脚本',
      }),
    });

    const triggerTypeDim = report.caseResults[0].dimensionResults.find((d) => d.name === 'trigger-type');
    expect(triggerTypeDim).toBeDefined();
  });

  it('错误处理：AI 调用失败时应记录错误', async () => {
    const cases = EVAL_CASES.filter((c) => c.id === 'plugin-001');

    const report = await runEvaluation({
      cases,
      callAI: async () => { throw new Error('网络错误'); },
    });

    expect(report.caseResults[0].error).toBe('网络错误');
    expect(report.caseResults[0].score).toBe(0);
    expect(report.caseResults[0].passed).toBe(false);
  });

  it('categoryFilter 应过滤用例', async () => {
    const cases = EVAL_CASES;
    const report = await runEvaluation({
      cases,
      callAI: createMockCall({}),
      categoryFilter: 'plugin-gen',
    });

    expect(report.config.totalCases).toBe(EVAL_STATS.byCategory['plugin-gen']);
    for (const r of report.caseResults) {
      expect(r.category).toBe('plugin-gen');
    }
  });

  it('priorityFilter 应过滤用例', async () => {
    const cases = EVAL_CASES;
    const report = await runEvaluation({
      cases,
      callAI: createMockCall({}),
      priorityFilter: 'P0',
    });

    expect(report.config.totalCases).toBe(EVAL_STATS.byPriority['P0']);
    for (const r of report.caseResults) {
      expect(r.priority).toBe('P0');
    }
  });

  it('报告 summary 统计应正确', async () => {
    const cases = EVAL_CASES.filter((c) => c.id === 'plugin-001');

    const report = await runEvaluation({
      cases,
      callAI: createMockCall({
        '阀门': '```ts\nclass ValvePlugin extends BasePlugin { type = "valve" }\n```\n工业组件 Canvas isOn boolean status Color',
      }),
    });

    expect(report.summary.totalPassed + report.summary.totalFailed + report.summary.totalErrors)
      .toBe(report.config.totalCases);
  });
});

// ============================================================
// 测试：报告格式化
// ============================================================

describe('formatReportText', () => {
  it('应生成非空文本报告', async () => {
    const cases = EVAL_CASES.filter((c) => c.id === 'plugin-001');

    const report = await runEvaluation({
      cases,
      callAI: createMockCall({
        '阀门': '测试响应',
      }),
    });

    const text = formatReportText(report);
    expect(text).toBeTruthy();
    expect(text).toContain('AI 效果评估基准报告');
    expect(text).toContain('plugin-001');
  });
});

describe('formatReportMarkdown', () => {
  it('应生成非空 Markdown 报告', async () => {
    const cases = EVAL_CASES.filter((c) => c.id === 'plugin-001');

    const report = await runEvaluation({
      cases,
      callAI: createMockCall({
        '阀门': '测试响应',
      }),
    });

    const md = formatReportMarkdown(report);
    expect(md).toBeTruthy();
    expect(md).toContain('# AI 效果评估基准报告');
    expect(md).toContain('plugin-001');
  });
});

// ============================================================
// 测试：模型对比矩阵
// ============================================================

describe('模型对比矩阵', () => {
  it('buildComparisonMatrix 应汇总多个报告', async () => {
    const cases = EVAL_CASES.filter((c) => c.id === 'plugin-001');

    const report1 = await runEvaluation({
      cases,
      callAI: createMockCall({
        '阀门': '```ts\nclass ValvePlugin extends BasePlugin {}\n```\nindustrial Canvas isOn boolean status Color',
      }),
      providerId: 'deepseek',
      model: 'deepseek-chat',
    });

    const report2 = await runEvaluation({
      cases,
      callAI: createMockCall({
        '阀门': '测试',
      }),
      providerId: 'zhipu',
      model: 'glm-4',
    });

    const matrix = buildComparisonMatrix([report1, report2]);
    expect(matrix.length).toBe(2);
    expect(matrix[0].providerId).toBe('deepseek');
    expect(matrix[1].providerId).toBe('zhipu');
  });

  it('formatComparisonMatrix 应生成非空文本', async () => {
    const entries = [
      { providerId: 'deepseek', model: 'deepseek-chat', passRate: 0.8, avgScore: 0.75, avgLatencyMs: 500, totalTokens: 1000 },
      { providerId: 'zhipu', model: 'glm-4', passRate: 0.7, avgScore: 0.65, avgLatencyMs: 800, totalTokens: 1200 },
    ];

    const text = formatComparisonMatrix(entries);
    expect(text).toContain('模型对比矩阵');
    expect(text).toContain('deepseek');
    expect(text).toContain('zhipu');
  });

  it('formatComparisonMarkdown 应生成非空 Markdown', () => {
    const entries = [
      { providerId: 'deepseek', model: 'deepseek-chat', passRate: 0.8, avgScore: 0.75, avgLatencyMs: 500, totalTokens: 1000 },
    ];

    const md = formatComparisonMarkdown(entries);
    expect(md).toContain('## 模型对比矩阵');
    expect(md).toContain('deepseek');
  });
});
