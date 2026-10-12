// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI 效果评估 — P1-T10
 *
 * 评估框架：50+ 基准用例 + 自动评分 + 报告生成 + 模型对比矩阵
 */

export {
  EVAL_CASES,
  EVAL_STATS,
} from './eval-cases';
export type {
  EvalCase,
  EvalDimension,
  EvalStructureCheck,
} from './eval-cases';

export {
  runEvaluation,
  formatReportText,
  formatReportMarkdown,
  buildComparisonMatrix,
  formatComparisonMatrix,
  formatComparisonMarkdown,
} from './eval-runner';
export type {
  EvalRunConfig,
  EvalAIResponse,
  EvalCaseResult,
  EvalDimensionResult,
  EvalReport,
  EvalSummary,
  CategoryStat,
  ModelComparisonEntry,
} from './eval-runner';
