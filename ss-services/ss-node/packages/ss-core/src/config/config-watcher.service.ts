// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';

export interface ConfigSchema {
  [key: string]: any;
}

export interface ConfigChange {
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  source: 'file' | 'api' | 'env' | 'database';
  userId?: string;
}

export interface ConfigWatcherConfig {
  watchPaths: string[];
  watchIntervalMs: number;
  enableFileWatch: boolean;
  enableApiUpdates: boolean;
  enableHistory: boolean;
  maxHistorySize: number;
  validationEnabled: boolean;
  rollbackOnError: boolean;
  debounceMs: number;
}

export interface ConfigSubscription {
  id: string;
  pattern: string | RegExp;
  callback: (change: ConfigChange) => void | Promise<void>;
}

const DEFAULT_CONFIG: ConfigWatcherConfig = {
  watchPaths: [],
  watchIntervalMs: 5000,
  enableFileWatch: true,
  enableApiUpdates: true,
  enableHistory: true,
  maxHistorySize: 100,
  validationEnabled: true,
  rollbackOnError: true,
  debounceMs: 1000,
};

@Injectable()
export class ConfigWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConfigWatcherService.name);

  private config: ConfigWatcherConfig = DEFAULT_CONFIG;

  // 当前配置存储
  private currentConfig: ConfigSchema = {};

  // 配置变更历史
  private changeHistory: ConfigChange[] = [];

  // 文件监视器
  private fileWatchers: fs.FSWatcher[] = [];

  // 定时检查器
  private checkInterval: NodeJS.Timeout | null = null;

  // 防抖定时器
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  // 订阅者列表
  private subscriptions: ConfigSubscription[] = [];

  // 配置校验器
  private validators = new Map<string, (value: any) => boolean>();

  // 上一次的文件内容哈希（用于检测变化）
  private fileHashes = new Map<string, string>();

  constructor(private eventEmitter: EventEmitter2) {}

  onModuleInit(): void {
    this.logger.log('ConfigWatcherService initialized');

    if (this.config.enableFileWatch && this.config.watchPaths.length > 0) {
      this.startFileWatching();
    }

    if (this.config.watchIntervalMs > 0) {
      this.startPeriodicCheck();
    }

    this.logger.log(
      `Watching ${this.config.watchPaths.length} config paths, ` +
        `check interval: ${this.config.watchIntervalMs}ms`,
    );
  }

  onModuleDestroy(): void {
    this.logger.log('ConfigWatcherService destroyed');

    // 清理文件监视器
    for (const watcher of this.fileWatchers) {
      watcher.close();
    }
    this.fileWatchers = [];

    // 清理定时器
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // 清理防抖定时器
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  setConfig(config: Partial<ConfigWatcherConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async loadInitialConfig(configPath: string): Promise<ConfigSchema> {
    try {
      const absolutePath = path.resolve(configPath);

      if (!fs.existsSync(absolutePath)) {
        this.logger.warn(`Config file not found: ${absolutePath}`);
        return {};
      }

      const content = await fs.promises.readFile(absolutePath, 'utf-8');
      const parsedConfig = JSON.parse(content);

      // 验证配置
      if (this.config.validationEnabled && !(await this.validateConfig(parsedConfig))) {
        throw new Error('Configuration validation failed');
      }

      this.currentConfig = { ...this.currentConfig, ...parsedConfig };
      this.updateFileHash(absolutePath, content);

      this.logger.log(
        `Loaded initial config from ${absolutePath}: ${Object.keys(parsedConfig).length} keys`,
      );

      return this.currentConfig;
    } catch (error) {
      this.logger.error(`Failed to load config from ${configPath}: ${error.message}`);
      throw error;
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    const value = this.getNestedValue(this.currentConfig, key);
    return value !== undefined ? value : defaultValue;
  }

  getAll(): ConfigSchema {
    return { ...this.currentConfig };
  }

  async set(
    key: string,
    value: any,
    options?: { source?: ConfigChange['source']; userId?: string },
  ): Promise<boolean> {
    const source = options?.source || 'api';
    const oldValue = this.get(key);

    // 验证值
    if (this.config.validationEnabled && !(await this.validateValue(key, value))) {
      this.logger.warn(`Validation failed for key ${key}`);
      return false;
    }

    // 设置值
    this.setNestedValue(this.currentConfig, key, value);

    // 创建变更记录
    const change: ConfigChange = {
      key,
      oldValue,
      newValue: value,
      timestamp: new Date(),
      source,
      userId: options?.userId,
    };

    // 记录历史
    if (this.config.enableHistory) {
      this.recordChange(change);
    }

    // 通知订阅者（带防抖）
    this.notifySubscribersDebounced(change);

    // 发送事件
    this.eventEmitter.emit('config.changed', change);

    this.logger.debug(`Config updated: ${key} = ${JSON.stringify(value)} (source: ${source})`);

    return true;
  }

  async update(
    updates: ConfigSchema,
    options?: { source?: ConfigChange['source']; userId?: string },
  ): Promise<boolean[]> {
    const results = await Promise.all(
      Object.entries(updates).map(([key, value]) => this.set(key, value, options)),
    );
    return results;
  }

  subscribe(
    pattern: string | RegExp,
    callback: (change: ConfigChange) => void | Promise<void>,
  ): string {
    const subscription: ConfigSubscription = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pattern,
      callback,
    };

    this.subscriptions.push(subscription);
    this.logger.debug(`New config subscription: ${subscription.id} for pattern ${pattern}`);

    return subscription.id;
  }

  unsubscribe(subscriptionId: string): boolean {
    const index = this.subscriptions.findIndex((s) => s.id === subscriptionId);
    if (index !== -1) {
      this.subscriptions.splice(index, 1);
      this.logger.debug(`Unsubscribed: ${subscriptionId}`);
      return true;
    }
    return false;
  }

  addValidator(key: string, validator: (value: any) => boolean): void {
    this.validators.set(key, validator);
    this.logger.debug(`Added validator for key: ${key}`);
  }

  removeValidator(key: string): boolean {
    return this.validators.delete(key);
  }

  getHistory(options?: { limit?: number; key?: string; since?: Date }): ConfigChange[] {
    let history = [...this.changeHistory];

    if (options?.key) {
      history = history.filter((c) => c.key === options.key);
    }

    if (options?.since) {
      history = history.filter((c) => c.timestamp >= options.since!);
    }

    if (options?.limit) {
      history = history.slice(-options.limit);
    }

    return history.reverse(); // 最新的在前
  }

  async rollback(changeId: string): Promise<boolean> {
    const change = this.changeHistory.find((c) => `${c.timestamp.getTime()}` === changeId);

    if (!change) {
      this.logger.warn(`Change not found for rollback: ${changeId}`);
      return false;
    }

    this.logger.log(`Rolling back change: ${change.key} to ${JSON.stringify(change.oldValue)}`);

    return await this.set(change.key, change.oldValue, {
      source: 'api',
      userId: 'system-rollback',
    });
  }

  exportConfig(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  importConfig(
    configJson: string,
    options?: { merge?: boolean; source?: ConfigChange['source'] },
  ): Promise<boolean> {
    try {
      const importedConfig = JSON.parse(configJson);

      if (options?.merge !== false) {
        return this.update(importedConfig, { source: options?.source || 'api' }).then(() => true);
      } else {
        // 替换整个配置
        this.currentConfig = importedConfig;
        return Promise.resolve(true);
      }
    } catch (error) {
      this.logger.error(`Failed to import config: ${error.message}`);
      return Promise.reject(error);
    }
  }

  private startFileWatching(): void {
    for (const watchPath of this.config.watchPaths) {
      const absolutePath = path.resolve(watchPath);

      try {
        if (fs.existsSync(absolutePath)) {
          const watcher = fs.watch(absolutePath, (eventType) => {
            if (eventType === 'change') {
              this.handleFileChange(absolutePath);
            }
          });

          this.fileWatchers.push(watcher);
          this.logger.log(`Watching file: ${absolutePath}`);

          // 初始化文件哈希
          this.updateFileHash(absolutePath, fs.readFileSync(absolutePath, 'utf-8'));
        } else {
          this.logger.warn(`Watch path does not exist: ${absolutePath}`);
        }
      } catch (error) {
        this.logger.error(`Failed to watch ${watchPath}: ${error.message}`);
      }
    }
  }

  private startPeriodicCheck(): void {
    this.checkInterval = setInterval(async () => {
      for (const watchPath of this.config.watchPaths) {
        await this.checkFileForChanges(path.resolve(watchPath));
      }
    }, this.config.watchIntervalMs);
  }

  private async handleFileChange(filePath: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');

      // 检查是否真的有变化（防止重复触发）
      const currentHash = this.hashContent(content);
      const previousHash = this.fileHashes.get(filePath);

      if (currentHash === previousHash) {
        return; // 没有实际变化
      }

      this.logger.log(`Detected file change: ${filePath}`);

      const newConfig = JSON.parse(content);

      // 验证配置
      if (this.config.validationEnabled && !(await this.validateConfig(newConfig))) {
        this.logger.error(`Invalid config in file: ${filePath}, ignoring update`);

        if (this.config.rollbackOnError) {
          this.logger.warn('Rollback: restoring previous config from file');
        }
        return;
      }

      // 检测具体变更
      const changes = this.detectChanges(this.currentConfig, newConfig);

      // 应用变更
      for (const change of changes) {
        change.source = 'file';
        await this.applyChange(change);
      }

      // 更新文件哈希
      this.updateFileHash(filePath, content);
    } catch (error) {
      this.logger.error(`Error handling file change for ${filePath}: ${error.message}`);
    }
  }

  private async checkFileForChanges(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) return;

      const content = await fs.promises.readFile(filePath, 'utf-8');
      const currentHash = this.hashContent(content);
      const previousHash = this.fileHashes.get(filePath);

      if (currentHash !== previousHash) {
        await this.handleFileChange(filePath);
      }
    } catch (error) {
      this.logger.error(`Error checking file ${filePath}: ${error.message}`);
    }
  }

  private detectChanges(oldConfig: ConfigSchema, newConfig: ConfigSchema): ConfigChange[] {
    const changes: ConfigChange[] = [];
    const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);

    for (const key of allKeys) {
      const oldValue = oldConfig[key];
      const newValue = newConfig[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          key,
          oldValue,
          newValue,
          timestamp: new Date(),
          source: 'file',
        });
      }
    }

    return changes;
  }

  private async applyChange(change: ConfigChange): Promise<void> {
    this.setNestedValue(this.currentConfig, change.key, change.newValue);

    if (this.config.enableHistory) {
      this.recordChange(change);
    }

    this.notifySubscribers(change);
    this.eventEmitter.emit('config.changed', change);
  }

  private notifySubscribers(change: ConfigChange): void {
    for (const subscription of this.subscriptions) {
      const matches =
        typeof subscription.pattern === 'string'
          ? change.key.startsWith(subscription.pattern)
          : subscription.pattern.test(change.key);

      if (matches) {
        try {
          subscription.callback(change);
        } catch (error) {
          this.logger.error(`Error in subscriber ${subscription.id}: ${error.message}`);
        }
      }
    }
  }

  private notifySubscribersDebounced(change: ConfigChange): void {
    // 清除之前的防抖定时器
    const existingTimer = this.debounceTimers.get(change.key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新的防抖定时器
    const timer = setTimeout(() => {
      this.notifySubscribers(change);
      this.debounceTimers.delete(change.key);
    }, this.config.debounceMs);

    this.debounceTimers.set(change.key, timer);
  }

  private recordChange(change: ConfigChange): void {
    this.changeHistory.push(change);

    // 限制历史大小
    if (this.changeHistory.length > this.config.maxHistorySize) {
      this.changeHistory.shift();
    }
  }

  private async validateConfig(config: ConfigSchema): Promise<boolean> {
    for (const [key, value] of Object.entries(config)) {
      if (!(await this.validateValue(key, value))) {
        return false;
      }
    }
    return true;
  }

  private async validateValue(key: string, value: any): Promise<boolean> {
    const validator = this.validators.get(key);
    if (validator) {
      try {
        return validator(value);
      } catch (error) {
        this.logger.error(`Validator error for ${key}: ${error.message}`);
        return false;
      }
    }
    return true; // 没有校验器则通过
  }

  private getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((current, part) => {
      return current && current[part] !== undefined ? current[part] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, key: string, value: any): void {
    const parts = key.split('.');
    const lastPart = parts.pop()!;
    let current = obj;

    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[lastPart] = value;
  }

  private hashContent(content: string): string {
    // 简单的哈希实现（生产环境应使用crypto模块）
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  private updateFileHash(filePath: string, content: string): void {
    this.fileHashes.set(filePath, this.hashContent(content));
  }
}
