// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../entities/system.entity';
import { EventBusService, PathResolverService } from '@ss-node/ss-core';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  CONFIG_METADATA_REGISTRY,
  CONFIG_CATEGORY_INFO,
  PENDING_RESTART_KEY,
  ConfigMetadata,
  ConfigMetadataHelper,
  ConfigCategory,
} from './config-metadata';

const ENCRYPTION_KEY =
  process.env.SYSTEM_CONFIG_ENCRYPTION_KEY || 'ss-v7-default-encryption-key-32b';
const SENSITIVE_PREFIX = 'ENC:';

/** 配置项展示视图（含元数据 + 当前值） */
export interface ConfigItemView {
  key: string;
  category: ConfigCategory;
  categoryLabel: string;
  description: string;
  defaultValue?: string;
  type: string;
  enumValues?: string[];
  sensitive: boolean;
  editable: boolean;
  hotReloadable: boolean;
  restartRequired: boolean;
  envFile: boolean;
  validation?: { min?: number; max?: number; pattern?: string };
  /** 当前生效值（敏感字段脱敏） */
  value: string;
  /** 值来源：env / db / default / null */
  source: 'env' | 'db' | 'default' | 'null';
}

/** 配置更新结果 */
export interface ConfigUpdateResult {
  key: string;
  value: string;
  restartRequired: boolean;
  hotReloadable: boolean;
  envFileUpdated: boolean;
  addedToPendingRestart: boolean;
}

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);
  private cache: Map<string, { value: string; type: string }> = new Map();
  private cacheInitialized = false;

  constructor(
    @Inject(getRepositoryToken(SystemConfig))
    private readonly configRepo: Repository<SystemConfig>,
    private readonly eventBusService: EventBusService,
    private readonly pathResolver: PathResolverService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshCache();
  }

  /** 获取配置值（环境变量优先） */
  async get(key: string): Promise<string | null> {
    // 环境变量优先
    const envKey = key.toUpperCase().replace(/\./g, '_');
    if (process.env[envKey] !== undefined) {
      return process.env[envKey]!;
    }

    // 缓存查询
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      return this.decryptIfNeeded(cached.value);
    }

    // 数据库查询
    const config = await this.configRepo.findOne({ where: { key } });
    if (config) {
      this.cache.set(key, { value: config.value, type: config.type });
      return this.decryptIfNeeded(config.value);
    }

    // 元数据默认值兜底
    const meta = ConfigMetadataHelper.getByKey(key);
    if (meta?.defaultValue !== undefined) {
      return meta.defaultValue;
    }

    return null;
  }

  /** 设置配置值 */
  async set(
    key: string,
    value: string,
    description?: string,
    type?: string,
    sensitive?: boolean,
  ): Promise<SystemConfig> {
    let storedValue = value;
    if (sensitive) {
      storedValue = this.encrypt(value);
    }

    let config = await this.configRepo.findOne({ where: { key } });
    if (config) {
      config.value = storedValue;
      if (description !== undefined) config.description = description;
      if (type !== undefined) config.type = type;
      config.updatedAt = new Date();
    } else {
      config = this.configRepo.create({
        key,
        value: storedValue,
        description: description || '',
        type: type || 'string',
        updatedAt: new Date(),
      });
    }

    const saved = await this.configRepo.save(config);
    this.cache.set(key, { value: storedValue, type: config.type });

    // 热更新通知
    this.eventBusService.emitConfigChanged({
      configType: 'system',
      targetId: key,
      changes: { key, value: sensitive ? '***' : value },
      timestamp: Date.now(),
    });

    return saved;
  }

  /** 删除配置 */
  async delete(key: string): Promise<void> {
    await this.configRepo.delete({ key });
    this.cache.delete(key);
  }

  /** 获取所有配置（仅数据库中的，敏感字段脱敏） */
  async getAll(): Promise<SystemConfig[]> {
    const configs = await this.configRepo.find();
    return configs.map((c) => {
      if (c.value.startsWith(SENSITIVE_PREFIX)) {
        return { ...c, value: '***' };
      }
      return c;
    });
  }

  /** 刷新缓存 */
  async refreshCache(): Promise<void> {
    try {
      const configs = await this.configRepo.find();
      this.cache.clear();
      for (const config of configs) {
        this.cache.set(config.key, { value: config.value, type: config.type });
      }
      this.cacheInitialized = true;
      this.logger.log(`Cache refreshed with ${configs.length} configs`);
    } catch (error) {
      this.logger.error(`Failed to refresh cache: ${error.message}`);
    }
  }

  // ==================== 元数据相关方法 ====================

  /** 获取所有配置项元数据 */
  getMetadata(): ConfigMetadata[] {
    return ConfigMetadataHelper.getAll();
  }

  /** 按分类分组获取元数据 */
  getMetadataByCategory(): Record<ConfigCategory, ConfigMetadata[]> {
    return ConfigMetadataHelper.groupByCategory();
  }

  /** 获取所有配置项（含元数据 + 当前值）— 用于前端展示 */
  async getAllWithMeta(): Promise<ConfigItemView[]> {
    const result: ConfigItemView[] = [];
    const dbConfigs = await this.configRepo.find();
    const dbMap = new Map(dbConfigs.map((c) => [c.key, c]));

    for (const meta of this.getMetadata()) {
      const view = await this.buildConfigItemView(meta, dbMap.get(meta.key));
      result.push(view);
    }

    return result;
  }

  /** 获取单个配置项（含元数据 + 当前值） */
  async getWithMeta(key: string): Promise<ConfigItemView | null> {
    const meta = ConfigMetadataHelper.getByKey(key);
    if (!meta) return null;

    const dbConfig = await this.configRepo.findOne({ where: { key } });
    return this.buildConfigItemView(meta, dbConfig);
  }

  /** 更新配置（带元数据校验，可选回写 env 文件） */
  async setWithMeta(
    key: string,
    value: string,
    options: { writeEnv?: boolean; description?: string } = {},
  ): Promise<ConfigUpdateResult> {
    const meta = ConfigMetadataHelper.getByKey(key);
    if (!meta) {
      throw new BadRequestException(`配置项 ${key} 不在元数据注册表中`);
    }

    // 校验
    const validation = ConfigMetadataHelper.validateValue(meta, value);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // 写入数据库
    await this.set(key, value, options.description, meta.type, meta.sensitive);

    // 同步更新 process.env（保证热更新立即生效）
    process.env[key] = value;

    // 回写 env 文件
    let envFileUpdated = false;
    if (options.writeEnv && meta.envFile) {
      envFileUpdated = this.writeEnvFile(key, value);
    }

    // 加入待重启清单（如需重启）
    let addedToPendingRestart = false;
    if (meta.restartRequired && !meta.hotReloadable) {
      await this.addToPendingRestart(key);
      addedToPendingRestart = true;
    }

    this.logger.log(
      `Config updated: ${key}=${meta.sensitive ? '***' : value}, ` +
        `restartRequired=${meta.restartRequired}, envFileUpdated=${envFileUpdated}`,
    );

    return {
      key,
      value: meta.sensitive ? '***' : value,
      restartRequired: meta.restartRequired,
      hotReloadable: meta.hotReloadable,
      envFileUpdated,
      addedToPendingRestart,
    };
  }

  /** 获取待重启清单 */
  async getRestartRequired(): Promise<string[]> {
    const raw = await this.get(PENDING_RESTART_KEY);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  /** 从待重启清单中移除指定 key */
  async removeFromPendingRestart(keys: string[]): Promise<void> {
    const current = await this.getRestartRequired();
    const remaining = current.filter((k) => !keys.includes(k));
    await this.set(PENDING_RESTART_KEY, JSON.stringify(remaining));
  }

  /** 清空待重启清单 */
  async clearPendingRestart(): Promise<void> {
    await this.set(PENDING_RESTART_KEY, '[]');
  }

  // ==================== 私有方法 ====================

  private async buildConfigItemView(
    meta: ConfigMetadata,
    dbConfig?: SystemConfig,
  ): Promise<ConfigItemView> {
    // 值优先级：env > db > default > null
    const envKey = meta.key.toUpperCase();
    let value: string;
    let source: 'env' | 'db' | 'default' | 'null';

    if (process.env[envKey] !== undefined) {
      value = process.env[envKey]!;
      source = 'env';
    } else if (dbConfig) {
      value = this.decryptIfNeeded(dbConfig.value);
      source = 'db';
    } else if (meta.defaultValue !== undefined) {
      value = meta.defaultValue;
      source = 'default';
    } else {
      value = '';
      source = 'null';
    }

    // 敏感字段脱敏
    const displayValue = meta.sensitive && value ? '***' : value;

    return {
      key: meta.key,
      category: meta.category,
      categoryLabel: CONFIG_CATEGORY_INFO[meta.category].label,
      description: meta.description,
      defaultValue: meta.defaultValue,
      type: meta.type,
      enumValues: meta.enumValues,
      sensitive: meta.sensitive,
      editable: meta.editable,
      hotReloadable: meta.hotReloadable,
      restartRequired: meta.restartRequired,
      envFile: meta.envFile,
      validation: meta.validation,
      value: displayValue,
      source,
    };
  }

  private async addToPendingRestart(key: string): Promise<void> {
    const current = await this.getRestartRequired();
    if (!current.includes(key)) {
      current.push(key);
      await this.set(PENDING_RESTART_KEY, JSON.stringify(current));
    }
  }

  /** 回写 env 文件（保留注释 + 备份） */
  private writeEnvFile(key: string, value: string): boolean {
    try {
      const envFilePath = this.resolveEnvFilePath();
      if (!envFilePath || !fs.existsSync(envFilePath)) {
        this.logger.warn(`Env file not found: ${envFilePath}`);
        return false;
      }

      // 备份
      this.backupEnvFile(envFilePath);

      // 读取并按行处理
      const content = fs.readFileSync(envFilePath, 'utf-8');
      const lines = content.split(/\r?\n/);
      let found = false;
      const newLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        // 保留注释与空行
        if (trimmed.startsWith('#') || trimmed === '') {
          newLines.push(line);
          continue;
        }

        // 解析 KEY=VALUE
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) {
          newLines.push(line);
          continue;
        }

        const lineKey = trimmed.substring(0, eqIdx).trim();
        if (lineKey === key) {
          newLines.push(`${key}=${value}`);
          found = true;
        } else {
          newLines.push(line);
        }
      }

      // 未找到对应 KEY → 末尾追加
      if (!found) {
        newLines.push(`${key}=${value}`);
      }

      fs.writeFileSync(envFilePath, newLines.join('\n'), 'utf-8');
      this.logger.log(`Env file updated: ${key}=${value}, file=${envFilePath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to write env file: ${error.message}`);
      return false;
    }
  }

  /** 解析 env 文件路径（与 buildEnvFilePaths() 加载链对齐） */
  private resolveEnvFilePath(): string | null {
    // 生产环境：写入 cwd/.env
    if (process.env.NODE_ENV === 'production') {
      const cwdEnv = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(cwdEnv)) return cwdEnv;
    }

    // 开发环境：写入与启动加载链一致的 .env.{APP_ENV|dev}
    const projectRoot = this.pathResolver.getProjectRoot();
    const envTarget = `.env.${process.env.APP_ENV || 'dev'}`;
    const targetPath = path.join(projectRoot, envTarget);
    if (fs.existsSync(targetPath)) return targetPath;

    return null;
  }

  /** 备份 env 文件（保留最近 10 个） */
  private backupEnvFile(envFilePath: string): void {
    try {
      const dir = path.dirname(envFilePath);
      const ext = path.extname(envFilePath);
      const base = path.basename(envFilePath, ext);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(dir, `${base}.bak.${timestamp}${ext}`);

      fs.copyFileSync(envFilePath, backupPath);

      // 清理超过 10 个的旧备份
      const backups = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith(`${base}.bak.`) && f.endsWith(ext))
        .sort()
        .reverse();
      for (const old of backups.slice(10)) {
        fs.unlinkSync(path.join(dir, old));
      }
    } catch (error) {
      this.logger.warn(`Backup env file failed: ${error.message}`);
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
      this.logger.error(`Encryption failed: ${error.message}`);
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
      this.logger.error(`Decryption failed: ${error.message}`);
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
