// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Feature Flag Service — P1-T07 AI Feature Flag 体系
 *
 * 7 个 AI Feature Flag，支持：
 *   - 环境变量级开关（AI_FEATURE_*，Production 级门控）
 *   - 运行时查询（供 Guard / Controller 使用）
 *   - 前端响应式 Composable（useFeatureFlag）
 *
 * 所有 Flag 默认值 false（安全默认）。
 * Phase 2+ 可迁移为 SystemConfigService 数据库驱动（运行时开关）。
 *
 * 关联决策：D-012（Feature Flag 门控）
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** AI 功能标志键名常量 */
export const AI_FEATURE_FLAGS = {
  /** AI 助手面板（聊天 UI + 流式问答） */
  ASSISTANT: 'ai.assistant.enabled',
  /** 插件代码生成 */
  CODEGEN: 'ai.codegen.enabled',
  /** 脚本代码生成 */
  SCRIPT: 'ai.script.enabled',
  /** 智能画面创建 */
  SCENE: 'ai.scene.enabled',
  /** 知识库问答（RAG） */
  KB: 'ai.kb.enabled',
  /** 智能告警分析 */
  ALARM: 'ai.alarm.enabled',
  /** CLI Agent */
  CLI: 'ai.cli.enabled',
} as const;

export type AiFeatureFlag = (typeof AI_FEATURE_FLAGS)[keyof typeof AI_FEATURE_FLAGS];

/** 环境变量映射：Feature Flag → 环境变量名 */
const FLAG_TO_ENV: Record<string, string> = {
  [AI_FEATURE_FLAGS.ASSISTANT]: 'AI_FEATURE_ASSISTANT_ENABLED',
  [AI_FEATURE_FLAGS.CODEGEN]: 'AI_FEATURE_CODEGEN_ENABLED',
  [AI_FEATURE_FLAGS.SCRIPT]: 'AI_FEATURE_SCRIPT_ENABLED',
  [AI_FEATURE_FLAGS.SCENE]: 'AI_FEATURE_SCENE_ENABLED',
  [AI_FEATURE_FLAGS.KB]: 'AI_FEATURE_KB_ENABLED',
  [AI_FEATURE_FLAGS.ALARM]: 'AI_FEATURE_ALARM_ENABLED',
  [AI_FEATURE_FLAGS.CLI]: 'AI_FEATURE_CLI_ENABLED',
};

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 检查指定 Feature Flag 是否启用
   * @param flag — 功能标志键名
   * @returns true = 已启用，false = 未启用
   */
  isEnabled(flag: AiFeatureFlag): boolean {
    const envKey = FLAG_TO_ENV[flag];
    if (!envKey) {
      this.logger.warn(`未知的 Feature Flag: ${flag}`);
      return false;
    }
    const value = this.configService.get<string>(envKey);
    return value === 'true';
  }

  /**
   * 返回当前所有 Flag 的状态快照
   * @returns { [flag: string]: boolean }
   */
  getAllFlags(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [flag, envKey] of Object.entries(FLAG_TO_ENV)) {
      result[flag] = this.configService.get<string>(envKey) === 'true';
    }
    return result;
  }

  /**
   * 检查多个 Flag 中是否有任一启用
   */
  anyEnabled(flags: AiFeatureFlag[]): boolean {
    return flags.some((f) => this.isEnabled(f));
  }

  /**
   * 检查多个 Flag 是否全部启用
   */
  allEnabled(flags: AiFeatureFlag[]): boolean {
    return flags.every((f) => this.isEnabled(f));
  }
}
