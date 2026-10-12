// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  DataPointCacheService,
  EventBusService,
  CachedDataPoint,
} from '@ss-node/ss-core';
import { DataTagService, DataTag } from '@ss-node/ss-datatag';
import { AlarmService } from '@ss-node/ss-alarm';
import {
  DataQueryService,
  TrendQueryOptions,
  InterpolationType,
} from '@ss-node/ss-storage-influx';
import { randomUUID } from 'crypto';
import * as http from 'http';
import * as https from 'https';

export interface ScriptApiFunction {
  name: string;
  description: string;
  parameters: string[];
  /**
   * 工厂函数：接收 projectId，返回已绑定项目上下文的函数。
   *
   * 采用工厂模式而非「将 projectId 追加为末尾位置参数」的原因：
   * 当函数存在可选中间参数（如 triggerAlarm 的 options、queryTagHistory 的 options、
   * httpGet/httpPost 的 options）时，调用方省略中间参数会导致 projectId 错位落到
   * options 槽位，projectId 反而变成默认值 ''，破坏项目隔离。
   * 工厂闭包让 projectId 直接进入函数作用域，与调用方传参位置解耦，彻底消除错位风险。
   */
  factory: (projectId: string) => ((...args: any[]) => any | Promise<any>);
}

/**
 * ScriptApiService — 脚本沙箱内可调用的全局 API
 *
 * Phase 4 改造：从 stub 替换为真实实现
 * - readTag/writeTag：连接 DataPointCacheService（ss-core）读写实时值
 * - triggerAlarm：通过 EventBus 发出 'alarm_triggered' 事件（AlarmEventSubscriber 监听后创建 AlarmRecord）
 * - acknowledgeAlarm：调用 AlarmService.acknowledgeAlarm
 * - queryTagHistory：调用 DataQueryService.queryTrendData（InfluxDB）
 * - httpGet/httpPost：统一 HTTP 工具，替换 EngineService 中的重复实现
 *
 * getApiProvider(projectId) 闭包方案：通过工厂模式为每个 projectId 生成一组
 * 已绑定项目上下文的函数，脚本调用时只需传业务参数（如 readTag('tag-1')），
 * projectId 在闭包中被自动捕获，确保项目隔离。
 *
 * 所有依赖均 @Optional 注入，保证在缺少依赖时降级返回假数据而不崩溃。
 */
@Injectable()
export class ScriptApiService {
  private readonly logger = new Logger(ScriptApiService.name);

  private apiFunctions = new Map<string, ScriptApiFunction>();

  constructor(
    @Optional() private readonly cacheService?: DataPointCacheService,
    @Optional() private readonly dataTagService?: DataTagService,
    @Optional() private readonly alarmService?: AlarmService,
    @Optional() private readonly dataQueryService?: DataQueryService,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {
    this.registerBuiltInFunctions();
  }

  private registerBuiltInFunctions(): void {
    // ── readTag：读取数据标签当前值 ──
    this.register({
      name: 'readTag',
      description: '读取数据标签当前值',
      parameters: ['tagId'],
      factory: (projectId: string) => async (tagId: string) => {
        void projectId; // 项目上下文（readTag 通过 cacheService 按 tagId 读取，projectId 保留以备审计）
        if (!this.cacheService) {
          this.logger.warn('[ScriptAPI] readTag: DataPointCacheService not available');
          return { tagId, value: null, quality: 'unknown', timestamp: new Date().toISOString() };
        }
        const cached = await this.cacheService.get(tagId);
        if (!cached) {
          return { tagId, value: null, quality: 'unknown', timestamp: new Date().toISOString() };
        }
        return {
          tagId: cached.tagId,
          value: cached.value,
          quality: cached.quality,
          timestamp: new Date(cached.timestamp).toISOString(),
        };
      },
    });

    // ── readTags：批量读取数据标签当前值 ──
    this.register({
      name: 'readTags',
      description: '批量读取数据标签当前值',
      parameters: ['tagIds'],
      factory: (projectId: string) => async (tagIds: string[]) => {
        void projectId;
        if (!this.cacheService) return {};
        const map = await this.cacheService.getMany(tagIds);
        const result: Record<string, any> = {};
        for (const tagId of tagIds) {
          const cached = map.get(tagId);
          result[tagId] = cached
            ? {
                value: cached.value,
                quality: cached.quality,
                timestamp: new Date(cached.timestamp).toISOString(),
              }
            : { value: null, quality: 'unknown', timestamp: new Date().toISOString() };
        }
        return result;
      },
    });

    // ── writeTag：写入数据标签值（更新缓存 + 发 EventBus 事件） ──
    this.register({
      name: 'writeTag',
      description: '写入数据标签值',
      parameters: ['tagId', 'value'],
      factory: (projectId: string) => async (tagId: string, value: any) => {
        // 1. 查 DataTag 获取 deviceId
        let deviceId = '';
        let actualProjectId = projectId;
        if (this.dataTagService) {
          try {
            const tag: DataTag = await this.dataTagService.findById(tagId);
            deviceId = tag.deviceId;
            actualProjectId = tag.projectId || projectId;
          } catch {
            this.logger.warn(`[ScriptAPI] writeTag: DataTag not found ${tagId}, proceeding without deviceId`);
          }
        }
        // 2. 更新缓存
        const now = Date.now();
        const dataPoint: CachedDataPoint = {
          tagId,
          deviceId,
          projectId: actualProjectId,
          value: Number(value),
          timestamp: now,
          quality: 'good',
          cachedAt: now,
        };
        if (this.cacheService) {
          await this.cacheService.set(dataPoint);
        }
        // 3. 发 EventBus 事件（TagUpdatePayload 格式，timestamp 为 ISO 字符串）
        if (this.eventBusService) {
          this.eventBusService.emit('data_point_changed', {
            tagId,
            deviceId,
            projectId: actualProjectId,
            value: Number(value),
            quality: 'good',
            timestamp: new Date(now).toISOString(),
          });
        }
        return { tagId, value, success: true };
      },
    });

    // ── writeTags：批量写入数据标签值 ──
    this.register({
      name: 'writeTags',
      description: '批量写入数据标签值',
      parameters: ['writes'],
      factory: (projectId: string) => async (writes: Array<{ tagId: string; value: any }>) => {
        const results: any[] = [];
        const writeFn = this.apiFunctions.get('writeTag')!.factory(projectId);
        for (const { tagId, value } of writes) {
          const r = await writeFn(tagId, value);
          results.push(r);
        }
        return results;
      },
    });

    // ── log：输出日志 ──
    this.register({
      name: 'log',
      description: '输出日志',
      parameters: ['level', 'message'],
      factory: (projectId: string) => (level: string, message: string) => {
        void projectId;
        switch (level) {
          case 'error':
            this.logger.error(`[ScriptAPI] ${message}`);
            break;
          case 'warn':
            this.logger.warn(`[ScriptAPI] ${message}`);
            break;
          case 'debug':
            this.logger.debug(`[ScriptAPI] ${message}`);
            break;
          default:
            this.logger.log(`[ScriptAPI] ${message}`);
            break;
        }
        return true;
      },
    });

    // ── sleep：脚本休眠（毫秒） ──
    this.register({
      name: 'sleep',
      description: '脚本休眠（毫秒）',
      parameters: ['ms'],
      factory: (projectId: string) => async (ms: number) => {
        void projectId;
        const cappedMs = Math.min(ms, 30000);
        return new Promise((resolve) => setTimeout(resolve, cappedMs));
      },
    });

    // ── triggerAlarm：触发报警（通过 EventBus 发出 alarm_triggered 事件） ──
    // 事件格式匹配 AlarmEventSubscriber.handleAlarmTriggered 的期望：
    // { alarmId, tagId, deviceId, projectId, condition:{severity,type}, value, timestamp, message }
    this.register({
      name: 'triggerAlarm',
      description: '触发报警',
      parameters: ['ruleName', 'message', 'level', 'options'],
      factory: (projectId: string) =>
        (
          ruleName: string,
          message: string,
          level: string = 'warning',
          options: { tagId?: string; deviceId?: string; value?: number } = {},
        ) => {
          const alarmId = randomUUID();
          const validLevels = ['critical', 'high', 'medium', 'low', 'info', 'warning'];
          const severity = (validLevels.includes(level) ? level : 'warning') as any;
          const event = {
            alarmId,
            tagId: options.tagId ?? '',
            deviceId: options.deviceId ?? '',
            projectId,
            condition: { severity, type: 'manual', enabled: true },
            value: options.value,
            timestamp: Date.now(),
            message: `[${ruleName}] ${message}`,
          };
          if (this.eventBusService) {
            this.eventBusService.emit('alarm_triggered', event);
          }
          this.logger.log(
            `[ScriptAPI] triggerAlarm: ${ruleName} - ${message} (${level}) alarmId=${alarmId}`,
          );
          return { alarmId, ruleName, message, level, triggered: true };
        },
    });

    // ── acknowledgeAlarm：确认报警 ──
    this.register({
      name: 'acknowledgeAlarm',
      description: '确认报警',
      parameters: ['alarmId', 'userId'],
      factory: (projectId: string) => async (alarmId: string, userId: string = 'system') => {
        if (!this.alarmService) {
          return { alarmId, acknowledged: false, error: 'AlarmService not available' };
        }
        try {
          const record = await this.alarmService.acknowledgeAlarm(alarmId, userId, projectId);
          return { alarmId, acknowledged: true, status: record.status };
        } catch (err) {
          return { alarmId, acknowledged: false, error: (err as Error).message };
        }
      },
    });

    // ── queryTagHistory：查询标签历史数据（InfluxDB） ──
    this.register({
      name: 'queryTagHistory',
      description: '查询标签历史数据',
      parameters: ['tagIds', 'startTime', 'endTime', 'options'],
      factory: (projectId: string) =>
        async (
          tagIds: string[],
          startTime: string | Date,
          endTime: string | Date,
          options: { maxPoints?: number; interpolation?: 'raw' | 'linear' | 'step'; interval?: number } = {},
        ) => {
          if (!this.dataQueryService) {
            return { data: [], pagination: { total: 0 } };
          }
          const opts: TrendQueryOptions = {
            tagIds,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            projectId,
            maxPoints: options.maxPoints ?? 1000,
            interpolation:
              options.interpolation === 'linear'
                ? InterpolationType.LINEAR
                : options.interpolation === 'step'
                  ? InterpolationType.STEP
                  : InterpolationType.RAW,
            interval: options.interval ?? 1000,
          };
          return this.dataQueryService.queryTrendData(opts);
        },
    });

    // ── httpGet：HTTP GET 请求（真实实现，统一替代 EngineService 中的重复注入） ──
    this.register({
      name: 'httpGet',
      description: 'HTTP GET 请求',
      parameters: ['url', 'options'],
      factory: (projectId: string) =>
        async (url: string, options: { headers?: Record<string, string>; timeout?: number } = {}) => {
          void projectId;
          return this.httpRequest('GET', url, undefined, options);
        },
    });

    // ── httpPost：HTTP POST 请求 ──
    this.register({
      name: 'httpPost',
      description: 'HTTP POST 请求',
      parameters: ['url', 'body', 'options'],
      factory: (projectId: string) =>
        async (
          url: string,
          body: any,
          options: { headers?: Record<string, string>; timeout?: number } = {},
        ) => {
          void projectId;
          return this.httpRequest('POST', url, body, options);
        },
    });

    // ── getTime：获取当前时间戳 ──
    this.register({
      name: 'getTime',
      description: '获取当前时间戳',
      parameters: [],
      factory: (projectId: string) => () => {
        void projectId;
        return { timestamp: Date.now(), iso: new Date().toISOString() };
      },
    });
  }

  /**
   * 统一 HTTP 请求工具方法（替换 EngineService.executeWithPrivileges 中的重复 httpGet 实现）
   */
  private async httpRequest(
    method: 'GET' | 'POST',
    url: string,
    body: any,
    options: { headers?: Record<string, string>; timeout?: number },
  ): Promise<{ status: number; data: string; headers: any; error?: string }> {
    return new Promise((resolve) => {
      const lib = url.startsWith('https') ? https : http;
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch (err) {
        resolve({ status: 0, data: '', headers: {}, error: `Invalid URL: ${(err as Error).message}` });
        return;
      }
      const req = lib.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method,
          headers: options.headers,
          timeout: options.timeout ?? 10000,
        },
        (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => (data += chunk));
          res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
        },
      );
      req.on('error', (err: Error) => resolve({ status: 0, data: '', headers: {}, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 0, data: '', headers: {}, error: 'timeout' });
      });
      if (method === 'POST' && body !== undefined) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  register(func: ScriptApiFunction): void {
    this.apiFunctions.set(func.name, func);
    this.logger.debug(`Registered ScriptAPI function: ${func.name}`);
  }

  unregister(name: string): boolean {
    return this.apiFunctions.delete(name);
  }

  getApiFunctions(): ScriptApiFunction[] {
    return Array.from(this.apiFunctions.values());
  }

  /**
   * 获取 API Provider 映射（绑定 projectId 闭包）
   *
   * 通过工厂模式为每个 projectId 生成一组独立绑定的函数：
   * 脚本调用时只需传业务参数（如 triggerAlarm('rule','msg','warning',{tagId})），
   * projectId 在工厂闭包中被捕获，与调用方传参位置完全解耦，
   * 彻底避免「可选中间参数省略导致 projectId 错位」的隔离泄漏问题。
   *
   * @param projectId 项目 ID（用于项目隔离：triggerAlarm/writeTag/queryTagHistory 等）
   */
  getApiProvider(projectId: string): Record<string, (...args: any[]) => any | Promise<any>> {
    const provider: Record<string, (...args: any[]) => any | Promise<any>> = {};
    for (const [name, func] of this.apiFunctions) {
      // 工厂生成绑定 projectId 的函数，不同 projectId 产生独立闭包
      provider[name] = func.factory(projectId);
    }
    return provider;
  }
}
