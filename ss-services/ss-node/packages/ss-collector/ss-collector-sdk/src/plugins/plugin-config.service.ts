// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface PluginRuntimeConfig {
  /** 隔离模式：in_process | worker_thread | child_process */
  isolationMode?: string;
  /** 插件激活状态（持久化，重启后恢复） */
  activated?: boolean;
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

/**
 * 采集插件运行时配置持久化服务
 *
 * - 每个插件的配置独立存储在 {PLUGIN_CONFIG_DIR}/{protocol}.json
 * - 启动时自动加载所有已有配置
 * - 运行时读写通过内存缓存 + 即时写盘
 */
@Injectable()
export class PluginConfigService implements OnModuleInit {
  private readonly logger = new Logger(PluginConfigService.name);

  /** 配置存储根目录 */
  private readonly configDir: string;

  /** 内存缓存：protocol → PluginRuntimeConfig */
  private readonly cache = new Map<string, PluginRuntimeConfig>();

  constructor(
    private readonly configService: ConfigService,
    private readonly pathResolver: PathResolverService,
  ) {
    const configured =
      this.configService.get<string>('PLUGIN_CONFIG_DIR') || process.env['PLUGIN_CONFIG_DIR'];
    this.configDir = configured
      ? this.resolvePath(configured)
      : path.join(this.getProjectRoot(), 'data', 'plugin-configs');
  }

  /**
   * 获取 ss-services/ss-node 项目根目录的绝对路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 5 级 = ss-services/ss-node
   *   （本文件位于 packages/ss-collector/ss-collector-sdk/dist/plugins/）
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *
   * 与 app.module.ts getDatabaseConfig()、collector-bootstrap.service.ts resolveProjectsDir() 保持一致。
   */
  private getProjectRoot(): string {
    return this.pathResolver.getProjectRoot();
  }

  private resolvePath(p: string): string {
    return this.pathResolver.resolve(p);
  }

  async onModuleInit(): Promise<void> {
    this.ensureDir(this.configDir);
    await this.loadAllConfigs();
    this.logger.log(`Plugin config dir: ${this.configDir} (${this.cache.size} configs loaded)`);
  }

  // -----------------------------------------------------------------------
  //  读
  // -----------------------------------------------------------------------

  /** 获取某个插件的运行时配置（优先内存缓存） */
  getConfig(protocol: string): PluginRuntimeConfig {
    return this.cache.get(protocol) ?? {};
  }

  /** 获取某个插件的隔离模式配置，未配置返回 undefined */
  getIsolationMode(protocol: string): string | undefined {
    return this.cache.get(protocol)?.isolationMode;
  }

  /** 获取所有已配置插件的配置映射 */
  getAllConfigs(): ReadonlyMap<string, PluginRuntimeConfig> {
    return this.cache;
  }

  // -----------------------------------------------------------------------
  //  写
  // -----------------------------------------------------------------------

  /**
   * 更新某个插件的运行时配置
   *
   * - 同时更新内存缓存和磁盘文件
   * - 传入 null / undefined 的字段不覆盖（保持原值）
   */
  saveConfig(protocol: string, partial: Partial<PluginRuntimeConfig>): PluginRuntimeConfig {
    const existing = this.cache.get(protocol) ?? {};
    const merged: PluginRuntimeConfig = { ...existing, ...partial };

    // 清理 undefined 字段
    for (const key of Object.keys(merged) as (keyof PluginRuntimeConfig)[]) {
      if (merged[key] === undefined) delete merged[key];
    }

    this.cache.set(protocol, merged);
    this.writeConfigFile(protocol, merged);
    this.logger.log(`Plugin config saved: ${protocol} → ${JSON.stringify(merged)}`);

    return merged;
  }

  /**
   * 更新插件隔离模式（便捷方法）
   */
  setIsolationMode(protocol: string, mode: string): PluginRuntimeConfig {
    return this.saveConfig(protocol, { isolationMode: mode });
  }

  /** 获取插件的持久化激活状态 */
  getActivated(protocol: string): boolean | undefined {
    return this.cache.get(protocol)?.activated;
  }

  /** 持久化插件的激活状态 */
  setActivated(protocol: string, activated: boolean): PluginRuntimeConfig {
    return this.saveConfig(protocol, { activated });
  }

  /** 删除某个插件的配置文件 */
  deleteConfig(protocol: string): void {
    this.cache.delete(protocol);
    const filePath = this.getConfigFilePath(protocol);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Plugin config deleted: ${protocol}`);
    }
  }

  // -----------------------------------------------------------------------
  //  文件 I/O
  // -----------------------------------------------------------------------

  private getConfigFilePath(protocol: string): string {
    return path.join(this.configDir, `${protocol}.json`);
  }

  /** 启动时扫描并加载所有 *.json 配置文件 */
  private async loadAllConfigs(): Promise<void> {
    if (!fs.existsSync(this.configDir)) return;

    const files = fs.readdirSync(this.configDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const protocol = file.replace('.json', '');
      const config = this.readConfigFile(protocol);
      if (config) {
        this.cache.set(protocol, config);
      }
    }
    this.logger.debug(`Loaded ${this.cache.size} plugin config(s) from ${this.configDir}`);
  }

  private readConfigFile(protocol: string): PluginRuntimeConfig | null {
    const filePath = this.getConfigFilePath(protocol);
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as PluginRuntimeConfig;
      // 基础校验
      if (typeof parsed !== 'object' || parsed === null) {
        this.logger.warn(`Invalid plugin config: ${filePath}`);
        return null;
      }
      return parsed;
    } catch (err) {
      this.logger.warn(`Failed to read plugin config ${filePath}: ${(err as Error).message}`);
      return null;
    }
  }

  private writeConfigFile(protocol: string, config: PluginRuntimeConfig): void {
    this.ensureDir(this.configDir);
    const filePath = this.getConfigFilePath(protocol);
    try {
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error(`Failed to write plugin config ${filePath}: ${(err as Error).message}`);
    }
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
