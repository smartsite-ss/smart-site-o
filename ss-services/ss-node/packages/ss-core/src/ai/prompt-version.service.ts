// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI Prompt 版本管理 Service — P2-T08
 *
 * 提供：
 *   1. Prompt 模板 CRUD
 *   2. 版本管理（draft→active→archived 流转）
 *   3. 模板渲染（{{variable}} 语法）
 *   4. A/B 测试辅助
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiPrompt, AiPromptVersion } from './entities/ai-prompt.entity';

/** 创建 Prompt 的 DTO */
export interface CreatePromptDto {
  key: string;
  name: string;
  taskType?: string;
  description?: string;
}

/** 创建版本的 DTO */
export interface CreateVersionDto {
  promptId: string;
  version: string;
  systemPrompt: string;
  variables?: string;
  llmConfig?: string;
  changelog?: string;
  createdBy?: string;
}

/** 版本流程操作 */
export type VersionAction = 'publish' | 'archive' | 'rollback';

@Injectable()
export class PromptVersionService {
  private readonly logger = new Logger(PromptVersionService.name);

  constructor(
    @InjectRepository(AiPrompt)
    private readonly promptRepo: Repository<AiPrompt>,
    @InjectRepository(AiPromptVersion)
    private readonly versionRepo: Repository<AiPromptVersion>,
  ) {}

  // ============================================================
  //  Prompt 模板 CRUD
  // ============================================================

  /** 创建 Prompt 模板 */
  async createPrompt(dto: CreatePromptDto): Promise<AiPrompt> {
    const prompt = this.promptRepo.create({
      key: dto.key,
      name: dto.name,
      taskType: dto.taskType || 'chat',
      description: dto.description,
    });
    return this.promptRepo.save(prompt);
  }

  /** 获取所有 Prompt 模板 */
  async listPrompts(): Promise<AiPrompt[]> {
    return this.promptRepo.find({ order: { updatedAt: 'DESC' } });
  }

  /** 按 key 查找 Prompt */
  async getPromptByKey(key: string): Promise<AiPrompt | null> {
    return this.promptRepo.findOne({ where: { key } });
  }

  /** 更新 Prompt 模板 */
  async updatePrompt(id: string, dto: Partial<CreatePromptDto>): Promise<void> {
    await this.promptRepo.update(id, dto);
  }

  // ============================================================
  //  版本管理
  // ============================================================

  /** 创建新版本（状态为 draft） */
  async createVersion(dto: CreateVersionDto): Promise<AiPromptVersion> {
    const version = this.versionRepo.create({
      promptId: dto.promptId,
      version: dto.version,
      status: 'draft',
      systemPrompt: dto.systemPrompt,
      variables: dto.variables || null,
      llmConfig: dto.llmConfig || null,
      changelog: dto.changelog || null,
      createdBy: dto.createdBy || null,
    });
    return this.versionRepo.save(version);
  }

  /** 获取 Prompt 的所有版本 */
  async listVersions(promptId: string): Promise<AiPromptVersion[]> {
    return this.versionRepo.find({
      where: { promptId },
      order: { createdAt: 'DESC' },
    });
  }

  /** 获取活跃版本 */
  async getActiveVersion(promptId: string): Promise<AiPromptVersion | null> {
    return this.versionRepo.findOne({
      where: { promptId, status: 'active' },
    });
  }

  /** 获取活跃版本的 System Prompt（按 prompt key） */
  async getActiveSystemPrompt(promptKey: string): Promise<string | null> {
    const prompt = await this.getPromptByKey(promptKey);
    if (!prompt) return null;
    const version = await this.getActiveVersion(prompt.id);
    return version?.systemPrompt || null;
  }

  /** 发布版本（draft → active，旧 active → archived） */
  async publishVersion(versionId: string): Promise<void> {
    const version = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!version || version.status !== 'draft') {
      throw new Error(`版本 ${versionId} 不是 draft 状态，无法发布`);
    }

    // 将旧的 active 版本归档
    const oldActive = await this.versionRepo.findOne({
      where: { promptId: version.promptId, status: 'active' },
    });
    if (oldActive) {
      await this.versionRepo.update(oldActive.id, { status: 'archived' });
    }

    // 发布新版本
    await this.versionRepo.update(versionId, { status: 'active' });
    await this.promptRepo.update(version.promptId, { activeVersionId: versionId });

    this.logger.log(`Prompt ${version.promptId} 版本已发布: ${version.version}`);
  }

  /** 归档版本（active → archived） */
  async archiveVersion(versionId: string): Promise<void> {
    const version = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!version || version.status !== 'active') {
      throw new Error(`版本 ${versionId} 不是 active 状态，无法归档`);
    }
    await this.versionRepo.update(versionId, { status: 'archived' });
    await this.promptRepo.update(version.promptId, { activeVersionId: null as any });
  }

  /** 回滚到指定版本 */
  async rollbackToVersion(versionId: string): Promise<void> {
    const target = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!target) throw new Error(`版本 ${versionId} 不存在`);

    // 将当前 active 归档
    const current = await this.versionRepo.findOne({
      where: { promptId: target.promptId, status: 'active' },
    });
    if (current) {
      await this.versionRepo.update(current.id, { status: 'archived' });
    }

    // 将目标版本设为 active
    await this.versionRepo.update(versionId, { status: 'active' });
    await this.promptRepo.update(target.promptId, { activeVersionId: versionId });

    this.logger.log(`Prompt ${target.promptId} 已回滚到版本: ${target.version}`);
  }

  // ============================================================
  //  模板渲染
  // ============================================================

  /**
   * 渲染 System Prompt 模板（{{variable}} 语法）
   *
   * @param template 模板字符串
   * @param variables 变量键值对
   * @returns 渲染后的字符串
   */
  renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  /**
   * 获取并渲染活跃版本的 System Prompt
   *
   * @param promptKey Prompt 标识键
   * @param variables 模板变量
   * @returns 渲染后的 System Prompt，若不存在则返回 null
   */
  async getRenderedSystemPrompt(
    promptKey: string,
    variables: Record<string, string> = {},
  ): Promise<string | null> {
    const template = await this.getActiveSystemPrompt(promptKey);
    if (!template) return null;
    return this.renderTemplate(template, variables);
  }

  // ============================================================
  //  A/B 测试辅助
  // ============================================================

  /** 获取指定版本的 System Prompt */
  async getVersionSystemPrompt(versionId: string): Promise<string | null> {
    const version = await this.versionRepo.findOne({ where: { id: versionId } });
    return version?.systemPrompt || null;
  }
}
