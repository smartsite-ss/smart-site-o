// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { LatestValueRedisService, type LatestValueEntry } from '@ss-node/ss-core';

export interface TagValueEntry {
  value: any;
  quality: string;
  timestamp: Date;
}

export interface DataPoint {
  value: number;
  quality: string;
  timestamp: Date;
}

export interface ProjectSnapshot {
  projectId: string;
  exportedAt: Date;
  devices: Array<{
    id: string;
    deviceCode: string;
    deviceName: string;
    tags: Record<string, TagValueEntry>;
  }>;
}

/**
 * DeviceDataService — 设备最新值读写服务
 *
 * 数据源(改造后):Redis 实时最新值(v3 层级结构)
 * - 设备 Key：ss:latest:{projectId}:{deviceCode}  （Hash，field=tagId，value=JSON 全语义）
 * - tree 索引：ss:latest:tree:{projectId}          （Hash，field=deviceId，value=JSON{deviceCode,deviceName}）
 * - 读取:委托 LatestValueRedisService(HGETALL / pipeline HGETALL)
 * - 写入:委托 LatestValueRedisService.write(供模拟器 / 设备控制 / API 手动下发使用)
 *
 * v3 适配说明:
 * Redis Key 改用 deviceCode(人类可读编码)体现 `项目→设备` 层级,
 * 但本服务对外 API 仍以 deviceId(UUID 主键)为参数(调用方持 deviceId)。
 * 因此 read 路径先通过 deviceRepo 查设备实体获取 deviceCode 再读 Redis;
 * write 路径同样查设备实体获取 deviceCode/deviceName 后写入。
 *
 * 改造历史:
 * 原先读写项目级 SQLite `dev_tag_latest_values` 表(TagLatestValue 实体),
 * 但采集 Pipeline 不写该表(只写 Redis),导致前端 API 拿不到实时采集数据。
 * 现统一以 Redis 为唯一权威源,删除 SQLite 最新值表与实体,消除数据不一致。
 *
 * 同时修复 getDevicesLatestValues 多设备查询 bug:
 * 旧实现 `where: { deviceId: deviceIds.length === 1 ? deviceIds[0] : undefined }`
 * 多设备时 deviceId=undefined 返回全表;现用 Redis pipeline 按指定 deviceIds 精确查询。
 *
 * 历史数据查询(getTagHistory)仍走 influx DataQueryService,本服务仅负责最新值。
 */
@Injectable()
export class DeviceDataService {
  private readonly logger = new Logger(DeviceDataService.name);

  constructor(
    @Inject(getRepositoryToken(require('../entities/device.entity').Device))
    private readonly deviceRepo: any,
    @Optional()
    private readonly latestValueRedisService?: LatestValueRedisService,
  ) {}

  /**
   * 获取设备下所有 Tag 的最新值(从 Redis HGETALL)
   *
   * v3: Redis Key 用 deviceCode,需先通过 deviceRepo 查设备实体获取 deviceCode。
   *
   * @param deviceId 设备 ID(UUID 主键)
   * @param projectId 项目 ID(Redis key 必需;未传时返回空,兼容旧签名)
   */
  async getDeviceLatestValues(
    deviceId: string,
    projectId?: string,
  ): Promise<Record<string, TagValueEntry>> {
    if (!projectId || !this.latestValueRedisService) return {};
    try {
      // v3: readDevice 需要 deviceCode,通过 deviceRepo 查设备实体获取
      const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
      if (!device?.deviceCode) return {};
      const entries = await this.latestValueRedisService.readDevice(projectId, device.deviceCode);
      const result: Record<string, TagValueEntry> = {};
      for (const [tagId, entry] of Object.entries(entries)) {
        result[tagId] = {
          value: entry.value,
          quality: entry.quality,
          timestamp: entry.timestamp,
        };
      }
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown';
      this.logger.error(`getDeviceLatestValues failed (device=${deviceId}): ${msg}`);
      return {};
    }
  }

  /**
   * 批量获取多台设备的最新值(从 Redis pipeline HGETALL)
   *
   * v3: Redis Key 用 deviceCode,需先通过 deviceRepo 批量查设备实体获取
   * deviceId→deviceCode 映射,readDevices 返回 Map<deviceCode, entries>后按 deviceId 重组。
   *
   * 修复 bug:旧 SQLite 实现 multi-device 查询返回全表(详见类注释)。
   * 现用 LatestValueRedisService.readDevices 按指定 deviceCodes 精确批量查询。
   */
  async getDevicesLatestValues(
    deviceIds: string[],
    projectId?: string,
  ): Promise<Map<string, Record<string, TagValueEntry>>> {
    const result = new Map<string, Record<string, TagValueEntry>>();
    if (!projectId || !this.latestValueRedisService || deviceIds.length === 0) return result;
    try {
      // v3: 批量查设备实体,建立 deviceId→deviceCode 映射
      const devices = await this.deviceRepo.find({
        where: { id: In(deviceIds) },
        select: ['id', 'deviceCode'],
      });
      const idToCode = new Map<string, string>();
      const deviceCodes: string[] = [];
      for (const device of devices) {
        if (device.deviceCode) {
          idToCode.set(device.id, device.deviceCode);
          deviceCodes.push(device.deviceCode);
        }
      }
      if (deviceCodes.length === 0) return result;

      // readDevices 返回 Map<deviceCode, entries>,按 deviceId 重新组装返回值
      const deviceEntries = await this.latestValueRedisService.readDevices(projectId, deviceCodes);
      for (const [deviceId, deviceCode] of idToCode) {
        const entries = deviceEntries.get(deviceCode) ?? {};
        const tagValues: Record<string, TagValueEntry> = {};
        for (const [tagId, entry] of Object.entries(entries)) {
          tagValues[tagId] = {
            value: entry.value,
            quality: entry.quality,
            timestamp: entry.timestamp,
          };
        }
        result.set(deviceId, tagValues);
      }
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown';
      this.logger.error(`getDevicesLatestValues failed (${deviceIds.length} devices): ${msg}`);
      return result;
    }
  }

  /** 获取指定 Tag 的历史数据 (stub for InfluxDB integration) */
  async getTagHistory(
    tagId: string,
    range: { start: Date; end: Date },
    _options?: { interval?: number; aggregation?: 'avg' | 'min' | 'max' },
  ): Promise<DataPoint[]> {
    this.logger.log(`getTagHistory: ${tagId} [${range.start} - ${range.end}]`);
    // TODO: Integrate with InfluxDB for real time-series data
    return [];
  }

  /** 导出项目数据快照(设备列表来自 DB,Tag 最新值来自 Redis) */
  async exportProjectSnapshot(projectId: string): Promise<ProjectSnapshot> {
    const devices = await this.deviceRepo.find({ where: { projectId } });
    const snapshot: ProjectSnapshot = {
      projectId,
      exportedAt: new Date(),
      devices: [],
    };

    // 一次性读取项目下所有设备的最新值(若 Redis 不可用则 tags 为空)
    const deviceLatestMap: Map<string, Record<string, LatestValueEntry>> = this
      .latestValueRedisService
      ? await this.latestValueRedisService.readAll(projectId).catch((err: Error) => {
          this.logger.warn(`exportProjectSnapshot readAll failed: ${err.message}`);
          return new Map<string, Record<string, LatestValueEntry>>();
        })
      : new Map<string, Record<string, LatestValueEntry>>();

    for (const device of devices) {
      const latestValues: Record<string, TagValueEntry> = {};
      const entries: Record<string, LatestValueEntry> = deviceLatestMap.get(device.id) ?? {};
      for (const [tagId, entry] of Object.entries(entries)) {
        latestValues[tagId] = {
          value: entry.value,
          quality: entry.quality,
          timestamp: entry.timestamp,
        };
      }
      snapshot.devices.push({
        id: device.id,
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        tags: latestValues,
      });
    }
    return snapshot;
  }

  /**
   * 写入 Tag 最新值(供模拟器 / 设备控制 / API 手动下发使用)
   *
   * v3: 写入 Redis(HSET 设备 Hash `ss:latest:{projectId}:{deviceCode}` + HSET tree 索引),
   * 与采集 Pipeline 的 RedisLatestValuePersistWriter 写入同一 key,保证读取一致。
   *
   * 需通过 deviceRepo 查设备实体获取 deviceCode/deviceName/projectId(v3 Redis Key 必需)。
   *
   * @param tagId 标签 ID
   * @param deviceId 设备 ID(UUID 主键)
   * @param value 标签值
   * @param quality 数据质量
   * @param projectId 项目 ID(未传时通过 deviceRepo 反查设备所属项目)
   */
  async updateLatestValue(
    tagId: string,
    deviceId: string,
    value: any,
    quality: string,
    projectId?: string,
  ): Promise<void> {
    if (!this.latestValueRedisService) {
      this.logger.warn(`updateLatestValue skipped: LatestValueRedisService unavailable`);
      return;
    }

    // 查设备实体:获取 deviceCode/deviceName,并在 projectId 缺失时反查所属项目
    let device: any = null;
    try {
      device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      this.logger.warn(`updateLatestValue cannot resolve device for device=${deviceId}: ${msg}`);
      return;
    }
    if (!device) {
      this.logger.warn(
        `updateLatestValue skipped: device not found (tag=${tagId}, device=${deviceId})`,
      );
      return;
    }

    const resolvedProjectId = projectId ?? device.projectId;
    if (!resolvedProjectId) {
      this.logger.warn(
        `updateLatestValue skipped: no projectId (tag=${tagId}, device=${deviceId})`,
      );
      return;
    }
    if (!device.deviceCode) {
      this.logger.warn(
        `updateLatestValue skipped: device has no deviceCode (tag=${tagId}, device=${deviceId})`,
      );
      return;
    }

    await this.latestValueRedisService.write({
      projectId: resolvedProjectId,
      deviceCode: device.deviceCode,
      deviceId,
      tagId,
      value,
      quality,
      timestamp: new Date(),
      deviceName: device.deviceName,
    });
  }
}
