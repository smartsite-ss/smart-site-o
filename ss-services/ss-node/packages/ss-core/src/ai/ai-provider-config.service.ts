// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI Provider 配置服务 — 管理全局数据库表 sys_ai_providers
 *
 * 提供 AI 供应商配置的 CRUD 操作，支持 API Key 加密存储。
 * LLMProxyService 在启动和热更新时通过此服务读取配置。
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { AiProvider } from './entities/ai-provider.entity';
import { ProviderConfig } from './llm.types';
import { PROVIDER_PRESETS, ProviderPreset, findPreset } from './provider-presets';

const ENCRYPTION_KEY =
  process.env.SYSTEM_CONFIG_ENCRYPTION_KEY || 'ss-v7-default-encryption-key-32b';
const SENSITIVE_PREFIX = 'ENC:';

/** 创建/更新 DTO */
export interface CreateAiProviderDto {
  providerId: string;
  name: string;
  apiKey: string;
  apiBase: string;
  defaultModel: string;
  models?: string[];
  enabled?: boolean;
  sortOrder?: number;
  config?: Record<string, any>;
}

export type UpdateAiProviderDto = Partial<CreateAiProviderDto>;

/** 返回给前端的视图（apiKey 脱敏） */
export interface AiProviderView {
  id: string;
  providerId: string;
  name: string;
  apiKey: string;
  apiBase: string;
  defaultModel: string;
  models: string[];
  enabled: boolean;
  sortOrder: number;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AiProviderConfigService {
  private readonly logger = new Logger(AiProviderConfigService.name);

  constructor(
    @InjectRepository(AiProvider)
    private readonly repo: Repository<AiProvider>,
  ) {}

  /** 查询所有供应商配置（apiKey 脱敏） */
  async findAll(): Promise<AiProviderView[]> {
    const list = await this.repo.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    return list.map((e) => this.toView(e));
  }

  /** 查询单个供应商配置（返回完整 apiKey，供 LLMProxyService 使用） */
  async findById(id: string): Promise<AiProvider | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** 按 providerId 查询已启用的供应商配置 */
  async findEnabledByProviderId(providerId: string): Promise<AiProvider | null> {
    return this.repo.findOne({ where: { providerId, enabled: 1 } });
  }

  /** 查询所有已启用的供应商配置 */
  async findEnabled(): Promise<AiProvider[]> {
    return this.repo.find({ where: { enabled: 1 }, order: { sortOrder: 'ASC' } });
  }

  /** 创建供应商配置 */
  async create(dto: CreateAiProviderDto): Promise<AiProviderView> {
    this.validateDto(dto);
    const entity = this.repo.create({
      providerId: dto.providerId,
      name: dto.name,
      apiKey: this.encrypt(dto.apiKey),
      apiBase: dto.apiBase,
      defaultModel: dto.defaultModel,
      models: JSON.stringify(dto.models || []),
      enabled: dto.enabled === false ? 0 : 1,
      sortOrder: dto.sortOrder ?? 0,
      config: JSON.stringify(dto.config || {}),
    });
    const saved = await this.repo.save(entity);
    this.logger.log(`AI Provider 创建: ${dto.name} (${dto.providerId})`);
    return this.toView(saved);
  }

  /** 更新供应商配置 */
  async update(id: string, dto: UpdateAiProviderDto): Promise<AiProviderView> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new BadRequestException(`AI Provider 不存在: ${id}`);
    }

    if (dto.providerId !== undefined) entity.providerId = dto.providerId;
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.apiKey !== undefined) entity.apiKey = this.encrypt(dto.apiKey);
    if (dto.apiBase !== undefined) entity.apiBase = dto.apiBase;
    if (dto.defaultModel !== undefined) entity.defaultModel = dto.defaultModel;
    if (dto.models !== undefined) entity.models = JSON.stringify(dto.models);
    if (dto.enabled !== undefined) entity.enabled = dto.enabled ? 1 : 0;
    if (dto.sortOrder !== undefined) entity.sortOrder = dto.sortOrder;
    if (dto.config !== undefined) entity.config = JSON.stringify(dto.config);

    const saved = await this.repo.save(entity);
    this.logger.log(`AI Provider 更新: ${saved.name} (${saved.providerId})`);
    return this.toView(saved);
  }

  /** 删除供应商配置 */
  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new BadRequestException(`AI Provider 不存在: ${id}`);
    }
    await this.repo.delete({ id });
    this.logger.log(`AI Provider 删除: ${entity.name} (${entity.providerId})`);
  }

  /** 切换启用/禁用 */
  async toggleEnabled(id: string, enabled: boolean): Promise<AiProviderView> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new BadRequestException(`AI Provider 不存在: ${id}`);
    }
    entity.enabled = enabled ? 1 : 0;
    const saved = await this.repo.save(entity);
    this.logger.log(`AI Provider ${enabled ? '启用' : '禁用'}: ${saved.name}`);
    return this.toView(saved);
  }

  /**
   * 按数据库 ID 获取供应商的完整 ProviderConfig（解密 apiKey，不限启用状态）
   *
   * 供连接测试场景使用：用户可能在启用前先验证配置是否正确。
   */
  async getProviderConfigById(id: string): Promise<ProviderConfig | null> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) return null;
    const extra = this.parseJson<Record<string, any>>(p.config, {});
    return {
      providerId: p.providerId as any,
      apiKey: this.decryptIfNeeded(p.apiKey),
      apiBase: p.apiBase,
      defaultModel: p.defaultModel,
      codegenModel: extra.codegenModel,
      liteModel: extra.liteModel,
      embeddingModel: extra.embeddingModel,
      embeddingDim: extra.embeddingDim,
      timeout: extra.timeout ?? 60000,
      maxRetries: extra.maxRetries ?? 3,
    } as ProviderConfig;
  }

  /**
   * 获取已启用 Provider 的 ProviderConfig 列表（供 LLMProxyService 初始化使用）
   * 解密 apiKey 后返回完整配置
   */
  async getEnabledProviderConfigs(): Promise<ProviderConfig[]> {
    const providers = await this.findEnabled();
    return providers.map((p) => {
      const extra = this.parseJson<Record<string, any>>(p.config, {});
      return {
        providerId: p.providerId as any,
        apiKey: this.decryptIfNeeded(p.apiKey),
        apiBase: p.apiBase,
        defaultModel: p.defaultModel,
        codegenModel: extra.codegenModel,
        liteModel: extra.liteModel,
        embeddingModel: extra.embeddingModel,
        embeddingDim: extra.embeddingDim,
        timeout: extra.timeout ?? 60000,
        maxRetries: extra.maxRetries ?? 3,
      } as ProviderConfig;
    });
  }

  /**
   * 获取所有预置供应商模板（供前端展示供应商选择列表）
   */
  getPresets(): ProviderPreset[] {
    return PROVIDER_PRESETS;
  }

  /**
   * 确保预置供应商已种入数据库
   *
   * 首次启动时，将所有预置供应商写入数据库（apiKey 为空、enabled=0），
   * 用户在前端只需填入 API Key 并启用即可使用。
   * 已存在的 providerId 跳过（不覆盖用户配置）。
   */
  async ensureDefaultProviders(): Promise<void> {
    try {
      const existing = await this.repo.find();
      const existingIds = new Set(existing.map((e) => e.providerId));

      const toInsert: AiProvider[] = [];
      PROVIDER_PRESETS.forEach((preset, index) => {
        if (!existingIds.has(preset.providerId)) {
          const entity = this.repo.create({
            providerId: preset.providerId,
            name: preset.name,
            apiKey: '', // 用户需在前端填入
            apiBase: preset.apiBase,
            defaultModel: preset.defaultModel,
            models: JSON.stringify(preset.models),
            enabled: 0, // 默认禁用，用户启用后生效
            sortOrder: index,
            config: JSON.stringify({
              codegenModel: preset.codegenModel,
              liteModel: preset.liteModel,
              embeddingModel: preset.embeddingModel,
              embeddingDim: preset.embeddingDim,
              timeout: preset.timeout,
              maxRetries: preset.maxRetries,
              region: preset.region,
              apiKeyUrl: preset.apiKeyUrl,
              supportsEmbedding: preset.supportsEmbedding,
              description: preset.description,
            }),
          });
          toInsert.push(entity);
        }
      });

      if (toInsert.length > 0) {
        await this.repo.save(toInsert);
        this.logger.log(
          `已种入 ${toInsert.length} 个预置 AI Provider 配置（默认禁用，需填入 API Key 后启用）`,
        );
      }
    } catch (err) {
      this.logger.error(`种入预置 Provider 配置失败: ${(err as Error).message}`);
    }
  }

  /**
   * 按预置模板快速创建供应商配置（仅需 API Key）
   *
   * 用户选择预置供应商后，只需提供 API Key，其余配置从预置模板自动填充。
   */
  async createFromPreset(providerId: string, apiKey: string): Promise<AiProviderView> {
    const preset = findPreset(providerId);
    if (!preset) {
      throw new BadRequestException(`未知的供应商预设: ${providerId}`);
    }
    if (!apiKey?.trim()) {
      throw new BadRequestException('API Key 不能为空');
    }

    // 检查是否已存在同 providerId 的配置
    const existing = await this.repo.findOne({ where: { providerId } });
    if (existing) {
      // 已存在则更新 API Key 并启用
      existing.apiKey = this.encrypt(apiKey);
      existing.enabled = 1;
      const saved = await this.repo.save(existing);
      this.logger.log(`AI Provider 从预置更新: ${preset.name} (${providerId})`);
      return this.toView(saved);
    }

    // 创建新配置
    const entity = this.repo.create({
      providerId: preset.providerId,
      name: preset.name,
      apiKey: this.encrypt(apiKey),
      apiBase: preset.apiBase,
      defaultModel: preset.defaultModel,
      models: JSON.stringify(preset.models),
      enabled: 1, // 从预置创建后直接启用
      sortOrder: PROVIDER_PRESETS.findIndex((p) => p.providerId === providerId),
      config: JSON.stringify({
        codegenModel: preset.codegenModel,
        liteModel: preset.liteModel,
        embeddingModel: preset.embeddingModel,
        embeddingDim: preset.embeddingDim,
        timeout: preset.timeout,
        maxRetries: preset.maxRetries,
        region: preset.region,
        apiKeyUrl: preset.apiKeyUrl,
        supportsEmbedding: preset.supportsEmbedding,
        description: preset.description,
      }),
    });
    const saved = await this.repo.save(entity);
    this.logger.log(`AI Provider 从预置创建: ${preset.name} (${providerId})`);
    return this.toView(saved);
  }

  // ==================== 私有方法 ====================

  private validateDto(dto: CreateAiProviderDto): void {
    if (!dto.providerId?.trim()) {
      throw new BadRequestException('providerId 不能为空');
    }
    if (!dto.name?.trim()) {
      throw new BadRequestException('name 不能为空');
    }
    if (!dto.apiKey?.trim()) {
      throw new BadRequestException('apiKey 不能为空');
    }
    if (!dto.apiBase?.trim()) {
      throw new BadRequestException('apiBase 不能为空');
    }
    if (!dto.defaultModel?.trim()) {
      throw new BadRequestException('defaultModel 不能为空');
    }
  }

  private toView(entity: AiProvider): AiProviderView {
    return {
      id: entity.id,
      providerId: entity.providerId,
      name: entity.name,
      apiKey: entity.apiKey?.startsWith(SENSITIVE_PREFIX) ? '***' : entity.apiKey,
      apiBase: entity.apiBase,
      defaultModel: entity.defaultModel,
      models: this.parseJson(entity.models, []),
      enabled: entity.enabled === 1,
      sortOrder: entity.sortOrder,
      config: this.parseJson(entity.config, {}),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private parseJson<T>(str: string, fallback: T): T {
    try {
      return JSON.parse(str) as T;
    } catch {
      return fallback;
    }
  }

  /** AES-256-GCM 加密 */
  private encrypt(value: string): string {
    try {
      const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(value, 'utf-8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      return `${SENSITIVE_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error(`加密失败: ${(error as Error).message}`);
      return value;
    }
  }

  /** AES-256-GCM 解密 */
  private decrypt(encryptedValue: string): string {
    try {
      const parts = encryptedValue.replace(SENSITIVE_PREFIX, '').split(':');
      if (parts.length !== 3) return encryptedValue;
      const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');
      return decrypted;
    } catch (error) {
      this.logger.error(`解密失败: ${(error as Error).message}`);
      return encryptedValue;
    }
  }

  private decryptIfNeeded(value: string): string {
    if (value && value.startsWith(SENSITIVE_PREFIX)) {
      return this.decrypt(value);
    }
    return value;
  }
}
