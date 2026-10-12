// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * InfluxDB 桶元数据
 */
export interface InfluxBucketInfo {
  /** 桶名称 */
  name: string;
  /** 对应的项目 ID */
  projectId: string;
  /** 组织名称 */
  org: string;
  /** 创建时间 */
  createdAt: string;
  /** 数据保留策略（小时），0 表示永久保留 */
  retentionHours: number;
}

/**
 * InfluxDB 数据点路由信息
 */
export interface DataPointRoute {
  /** 目标桶名称 */
  bucket: string;
  /** 目标组织 */
  org: string;
  /** 度量名称 */
  measurement: string;
  /** 标签 */
  tags: Record<string, string>;
  /** 字段值 */
  fields: Record<string, number | string | boolean>;
  /** 时间戳（ISO 8601） */
  timestamp?: string;
}

/**
 * InfluxDB 项目桶隔离服务
 *
 * 职责：
 * 1. 为每个项目创建独立的 InfluxDB 桶（bucket）
 * 2. 桶命名规范：project-{projectId}
 * 3. 根据 projectId 自动路由数据到对应桶
 * 4. 项目删除时清理对应的桶和数据
 */
@Injectable()
export class InfluxdbProjectIsolationService implements OnModuleDestroy {
  private readonly logger = new Logger(InfluxdbProjectIsolationService.name);

  /** 项目 ID → 桶信息映射 */
  private readonly bucketRegistry = new Map<string, InfluxBucketInfo>();

  /** InfluxDB 连接配置 */
  private readonly influxUrl: string;
  private readonly influxToken: string;
  private readonly influxOrg: string;
  private readonly defaultRetentionHours: number;

  constructor(private readonly configService: ConfigService) {
    this.influxUrl = this.configService.get<string>('INFLUXDB_URL') || 'http://localhost:8086';
    this.influxToken = this.configService.get<string>('INFLUXDB_TOKEN') || '';
    this.influxOrg = this.configService.get<string>('INFLUXDB_ORG') || 'ss-org';
    this.defaultRetentionHours = this.configService.get<number>('INFLUXDB_RETENTION_HOURS') || 0;
  }

  /**
   * 获取项目的 InfluxDB 桶名称
   * 命名规范：project-{projectId}
   */
  getBucketName(projectId: string): string {
    return `project-${projectId}`;
  }

  /**
   * 创建项目的 InfluxDB 桶
   *
   * 通过 InfluxDB v2 API 创建桶，如果桶已存在则跳过
   *
   * @param projectId   项目 ID
   * @param options     可选配置（保留策略等）
   */
  async createProjectBucket(
    projectId: string,
    options?: { retentionHours?: number; org?: string },
  ): Promise<InfluxBucketInfo> {
    const bucketName = this.getBucketName(projectId);
    const org = options?.org || this.influxOrg;
    const retentionHours = options?.retentionHours ?? this.defaultRetentionHours;

    // 检查是否已注册
    const existing = this.bucketRegistry.get(projectId);
    if (existing) {
      this.logger.log(`Bucket "${bucketName}" already registered for project ${projectId}`);
      return existing;
    }

    try {
      // 检查桶是否已存在
      const existingBucket = await this.findBucketByName(bucketName, org);
      if (existingBucket) {
        this.logger.log(`Bucket "${bucketName}" already exists in InfluxDB, registering locally`);
        const info: InfluxBucketInfo = {
          name: bucketName,
          projectId,
          org,
          createdAt: existingBucket.createdAt || new Date().toISOString(),
          retentionHours,
        };
        this.bucketRegistry.set(projectId, info);
        return info;
      }

      // 通过 InfluxDB API 创建桶
      const bucket = await this.callInfluxApi('/api/v2/buckets', 'POST', {
        orgID: await this.getOrgId(org),
        name: bucketName,
        retentionRules:
          retentionHours > 0 ? [{ type: 'expire', everySeconds: retentionHours * 3600 }] : [],
      });

      const info: InfluxBucketInfo = {
        name: bucketName,
        projectId,
        org,
        createdAt: bucket.createdAt || new Date().toISOString(),
        retentionHours,
      };

      this.bucketRegistry.set(projectId, info);
      this.logger.log(
        `Bucket "${bucketName}" created for project ${projectId}` +
          (retentionHours > 0 ? ` (retention: ${retentionHours}h)` : ''),
      );
      return info;
    } catch (err) {
      this.logger.error(
        `Failed to create bucket "${bucketName}" for project ${projectId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * 为数据点路由到正确的项目桶
   *
   * @param projectId   项目 ID
   * @param measurement 度量名称
   * @param fields      字段值
   * @param tags        标签（可选）
   * @param timestamp   时间戳（可选）
   */
  routeDataPoint(
    projectId: string,
    measurement: string,
    fields: Record<string, number | string | boolean>,
    tags?: Record<string, string>,
    timestamp?: string,
  ): DataPointRoute {
    const bucketName = this.getBucketName(projectId);

    return {
      bucket: bucketName,
      org: this.influxOrg,
      measurement,
      tags: {
        projectId,
        ...(tags || {}),
      },
      fields,
      timestamp,
    };
  }

  /**
   * 批量路由数据点到项目桶
   *
   * @param projectId 项目 ID
   * @param points    数据点数组
   */
  routeDataPoints(
    projectId: string,
    points: Array<{
      measurement: string;
      fields: Record<string, number | string | boolean>;
      tags?: Record<string, string>;
      timestamp?: string;
    }>,
  ): DataPointRoute[] {
    return points.map((point) =>
      this.routeDataPoint(projectId, point.measurement, point.fields, point.tags, point.timestamp),
    );
  }

  /**
   * 获取项目的桶信息
   */
  getBucketInfo(projectId: string): InfluxBucketInfo | undefined {
    return this.bucketRegistry.get(projectId);
  }

  /**
   * 获取所有已注册的桶信息
   */
  getAllBuckets(): InfluxBucketInfo[] {
    return Array.from(this.bucketRegistry.values());
  }

  /**
   * 获取已注册的桶数量
   */
  get bucketCount(): number {
    return this.bucketRegistry.size;
  }

  /**
   * 删除项目的 InfluxDB 桶
   *
   * @param projectId 项目 ID
   */
  async deleteProjectBucket(projectId: string): Promise<void> {
    const bucketName = this.getBucketName(projectId);
    const info = this.bucketRegistry.get(projectId);

    try {
      // 尝试通过 API 删除桶
      const existingBucket = await this.findBucketByName(bucketName, this.influxOrg);
      if (existingBucket && existingBucket.id) {
        await this.callInfluxApi(`/api/v2/buckets/${existingBucket.id}`, 'DELETE');
        this.logger.log(`Bucket "${bucketName}" deleted from InfluxDB`);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to delete bucket "${bucketName}" from InfluxDB: ${(err as Error).message}`,
      );
    }

    this.bucketRegistry.delete(projectId);
    if (info) {
      this.logger.log(`Bucket "${bucketName}" unregistered for project ${projectId}`);
    }
  }

  /**
   * 清空项目桶中的数据（保留桶结构）
   *
   * @param projectId  项目 ID
   * @param startTime  起始时间（ISO 8601，可选）
   * @param stopTime   结束时间（ISO 8601，可选）
   */
  async purgeProjectData(projectId: string, startTime?: string, stopTime?: string): Promise<void> {
    const bucketName = this.getBucketName(projectId);

    try {
      const predicate = `_measurement =~ /.*/`;
      const timePredicate =
        startTime && stopTime ? ` AND _time >= ${startTime} AND _time <= ${stopTime}` : '';

      // 使用 InfluxDB delete API 删除数据
      await this.callInfluxApi(
        '/api/v2/delete',
        'POST',
        {
          predicate: `${predicate}${timePredicate}`,
          start: startTime || '1970-01-01T00:00:00Z',
          stop: stopTime || new Date().toISOString(),
        },
        {
          'Content-Type': 'application/json',
        },
      );

      this.logger.log(`Data purged from bucket "${bucketName}" for project ${projectId}`);
    } catch (err) {
      this.logger.error(
        `Failed to purge data from bucket "${bucketName}": ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * 检查项目桶是否存在
   */
  async bucketExists(projectId: string): Promise<boolean> {
    const bucketName = this.getBucketName(projectId);
    const existing = await this.findBucketByName(bucketName, this.influxOrg);
    return existing !== null;
  }

  /**
   * 构建 InfluxDB 行协议（Line Protocol）写入数据
   *
   * @param route 路由后的数据点
   * @returns InfluxDB 行协议字符串
   */
  buildLineProtocol(route: DataPointRoute): string {
    const { measurement, tags, fields, timestamp } = route;

    const tagStr = Object.entries(tags)
      .map(([k, v]) => `${k}=${this.escapeTagValue(String(v))}`)
      .join(',');

    const fieldStr = Object.entries(fields)
      .map(([k, v]) => {
        if (typeof v === 'string') {
          return `${k}="${v.replace(/"/g, '\\"')}"`;
        }
        if (typeof v === 'boolean') {
          return `${k}=${v ? 'true' : 'false'}`;
        }
        return `${k}=${v}`;
      })
      .join(',');

    const tagPart = tagStr ? `,${tagStr}` : '';
    const timePart = timestamp ? ` ${new Date(timestamp).getTime() * 1000000}` : '';

    return `${measurement}${tagPart} ${fieldStr}${timePart}`;
  }

  // ============================================================
  // 私有辅助方法
  // ============================================================

  /**
   * 通过桶名称查找桶
   */
  private async findBucketByName(
    bucketName: string,
    org: string,
  ): Promise<{ id: string; name: string; createdAt: string } | null> {
    try {
      const orgId = await this.getOrgId(org);
      const buckets = await this.callInfluxApi(
        `/api/v2/buckets?orgID=${orgId}&name=${encodeURIComponent(bucketName)}`,
        'GET',
      );

      if (buckets?.buckets && buckets.buckets.length > 0) {
        const b = buckets.buckets[0];
        return { id: b.id, name: b.name, createdAt: b.createdAt };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 获取组织 ID
   */
  private async getOrgId(org: string): Promise<string> {
    const orgs = await this.callInfluxApi(`/api/v2/orgs?org=${encodeURIComponent(org)}`, 'GET');

    if (orgs?.orgs && orgs.orgs.length > 0) {
      return orgs.orgs[0].id;
    }

    throw new Error(`Organization "${org}" not found in InfluxDB`);
  }

  /**
   * 调用 InfluxDB v2 API
   */
  private async callInfluxApi(
    path: string,
    method: string,
    body?: any,
    extraHeaders?: Record<string, string>,
  ): Promise<any> {
    const headers: Record<string, string> = {
      Authorization: `Token ${this.influxToken}`,
      ...(extraHeaders || {}),
    };

    if (body && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.influxUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`InfluxDB API error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    if (method === 'DELETE' || response.status === 204) {
      return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /**
   * 转义标签值中的特殊字符
   */
  private escapeTagValue(value: string): string {
    return value.replace(/ /g, '\\ ').replace(/,/g, '\\,').replace(/=/g, '\\=');
  }

  /**
   * 模块销毁时清理
   */
  onModuleDestroy(): void {
    this.bucketRegistry.clear();
    this.logger.log('InfluxDB project isolation service destroyed');
  }
}
