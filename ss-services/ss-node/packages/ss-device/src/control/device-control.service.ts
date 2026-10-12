// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, BadRequestException, Inject, Optional } from '@nestjs/common';
import { ProjectDatabaseService, EventBusService } from '@ss-node/ss-core';
import { PluginRegistry } from '@ss-node/ss-collector-sdk';
import { DeviceService } from '../device.service';
import { DeviceDataService } from '../data/device-data.service';
import { ControlOperationLog } from './control-operation.entity';
import { QueryControlLogDto } from '../dto/query-control-log.dto';
import { DataTag } from '@ss-node/ss-datatag';

export interface WriteTagParams {
  projectId: string;
  deviceId: string;
  tagId: string;
  value: any;
  reason?: string;
  operatorId: string;
  operatorName: string;
  ipAddress?: string;
}

export interface WriteTagResult {
  success: boolean;
  tagId: string;
  value: any;
  latencyMs: number;
  error?: string;
}

@Injectable()
export class DeviceControlService {
  private readonly logger = new Logger(DeviceControlService.name);

  constructor(
    private readonly deviceService: DeviceService,
    @Inject(PluginRegistry)
    private readonly pluginRegistry: PluginRegistry,
    private readonly deviceDataService: DeviceDataService,
    private readonly projectDbService: ProjectDatabaseService,
    @Optional()
    private readonly eventBus?: EventBusService,
  ) {}

  /**
   * 写入设备标签值（核心反控接口）
   */
  async writeTagValue(params: WriteTagParams): Promise<WriteTagResult> {
    const startTime = Date.now();

    try {
      // 1. 获取设备信息
      const device = await this.deviceService.findOne(params.deviceId, params.projectId);
      if (!device) {
        throw new BadRequestException(`设备不存在: ${params.deviceId}`);
      }

      // 2. 获取标签信息
      const tag = await this.getDataTag(params.tagId, params.projectId);
      if (!tag) {
        throw new BadRequestException(`标签不存在: ${params.tagId}`);
      }

      // 3. 校验 direction（必须是 write 或 read-write）
      if (!tag.direction || tag.direction === 'read') {
        throw new BadRequestException('此变量为只读，不可写入');
      }

      // 4. 值校验
      this.validateValue(tag, params.value);

      // 5. 记录写入前的值（用于审计）
      let previousValue: string | null = null;
      try {
        const prevData = await this.deviceDataService.getDeviceLatestValues(
          params.deviceId,
          params.projectId,
        );
        const prevEntry = prevData[params.tagId];
        if (prevEntry) {
          previousValue = String(prevEntry.value ?? 'null');
        }
      } catch {
        // 非关键，忽略查询错误
      }

      // 6. 获取协议适配器并执行写入（driver 优先，与采集层一致）
      const protocol = device.driver || device.type;
      if (!protocol) {
        throw new BadRequestException('设备类型未配置');
      }

      const adapter = this.pluginRegistry.getAdapter(protocol);
      if (!adapter) {
        throw new BadRequestException(`协议适配器未找到: ${protocol}`);
      }

      // 7. 建立设备连接（临时连接，写入后断开）
      let client: any;
      try {
        const deviceConfig = device.connection || {};
        client = await adapter.connect({
          id: device.id,
          name: device.deviceName,
          protocol,
          connection: deviceConfig,
          scanRate: device.scanRate,
        });
      } catch (err) {
        throw new BadRequestException(`设备连接失败: ${(err as Error).message}`);
      }

      // 8. 构造 ITagContext 并执行写入
      const tagContext = {
        id: tag.id,
        name: tag.name,
        address: tag.address,
        dataType: tag.dataType,
        direction: tag.direction as 'read' | 'write' | 'read-write',
        deviceId: params.deviceId,
        projectId: params.projectId,
        description: tag.description,
        unit: tag.unit,
      };

      try {
        await adapter.writeTag(client, tagContext, params.value);
      } catch (err) {
        // 写入失败也记录审计日志
        await this.logOperation({
          projectId: params.projectId,
          deviceId: params.deviceId,
          deviceName: device.deviceName,
          tagId: params.tagId,
          tagName: tag.name,
          previousValue,
          writtenValue: String(params.value),
          success: false,
          errorMessage: (err as Error).message,
          operatorId: params.operatorId,
          operatorName: params.operatorName,
          reason: params.reason,
          ipAddress: params.ipAddress,
          latencyMs: Date.now() - startTime,
        });
        throw err;
      }

      // 9. 断开临时连接
      try {
        await adapter.disconnect(client);
      } catch {
        this.logger.warn(`断开设备连接时发生异常`);
      }

      const latencyMs = Date.now() - startTime;

      // 9. 更新最新值缓存
      try {
        await this.deviceDataService.updateLatestValue(
          params.tagId,
          params.deviceId,
          params.value,
          'good',
          params.projectId,
        );
      } catch (err) {
        this.logger.warn(`更新最新值缓存失败: ${(err as Error).message}`);
      }

      // 10. 记录操作审计日志
      await this.logOperation({
        projectId: params.projectId,
        deviceId: params.deviceId,
        deviceName: device.deviceName,
        tagId: params.tagId,
        tagName: tag.name,
        previousValue,
        writtenValue: String(params.value),
        success: true,
        operatorId: params.operatorId,
        operatorName: params.operatorName,
        reason: params.reason,
        ipAddress: params.ipAddress,
        latencyMs,
      });

      // 11. 发送事件通知（供 WebSocket 等订阅方）
      try {
        this.eventBus?.emit('device.tag_written' as any, {
          projectId: params.projectId,
          deviceId: params.deviceId,
          tagId: params.tagId,
          tagName: tag.name,
          value: params.value,
          quality: 'good',
          timestamp: new Date().toISOString(),
        });
      } catch {
        // 事件发送失败不阻塞主流程
      }

      this.logger.log(
        `反控写入成功: device=${params.deviceId}, tag=${params.tagId}, value=${params.value}, latency=${latencyMs}ms`,
      );

      return {
        success: true,
        tagId: params.tagId,
        value: params.value,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errMsg = (error as Error).message;
      this.logger.error(
        `反控写入失败: device=${params.deviceId}, tag=${params.tagId}, error=${errMsg}`,
      );
      return {
        success: false,
        tagId: params.tagId,
        value: params.value,
        latencyMs,
        error: errMsg,
      };
    }
  }

  /**
   * 值校验：数据类型 + 范围
   */
  private validateValue(tag: DataTag, value: any): void {
    if (value === null || value === undefined) {
      throw new BadRequestException('写入值不能为空');
    }

    // 范围校验（如果配置了 minValue / maxValue）
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      if (tag.minValue !== null && tag.minValue !== undefined) {
        if (numValue < Number(tag.minValue)) {
          throw new BadRequestException(`写入值 ${value} 小于最小值 ${tag.minValue}`);
        }
      }
      if (tag.maxValue !== null && tag.maxValue !== undefined) {
        if (numValue > Number(tag.maxValue)) {
          throw new BadRequestException(`写入值 ${value} 大于最大值 ${tag.maxValue}`);
        }
      }
    }
  }

  /**
   * 获取 DataTag（从项目级数据库）
   */
  private async getDataTag(tagId: string, projectId: string): Promise<DataTag | null> {
    try {
      const ds = await this.projectDbService.getSystemDb(projectId);
      const repo = ds.getRepository(DataTag);
      return repo.findOne({ where: { id: tagId } });
    } catch (err) {
      this.logger.error(`获取标签失败: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * 记录操作审计日志
   */
  private async logOperation(params: {
    projectId: string;
    deviceId: string;
    deviceName: string;
    tagId: string;
    tagName: string;
    previousValue: string | null;
    writtenValue: string;
    success: boolean;
    errorMessage?: string;
    operatorId: string;
    operatorName: string;
    reason?: string;
    ipAddress?: string;
    latencyMs: number;
  }): Promise<void> {
    try {
      const ds = await this.projectDbService.getSystemDb(params.projectId);
      const repo = ds.getRepository(ControlOperationLog);
      const log = repo.create({
        projectId: params.projectId,
        deviceId: params.deviceId,
        deviceName: params.deviceName,
        tagId: params.tagId,
        tagName: params.tagName,
        previousValue: params.previousValue ?? undefined,
        writtenValue: params.writtenValue,
        success: params.success,
        errorMessage: params.errorMessage ?? undefined,
        operatorId: params.operatorId,
        operatorName: params.operatorName,
        reason: params.reason ?? undefined,
        ipAddress: params.ipAddress ?? undefined,
        latencyMs: params.latencyMs,
      });
      await repo.save(log);
    } catch (err) {
      this.logger.error(`审计日志写入失败: ${(err as Error).message}`);
    }
  }

  /**
   * 查询操作日志（分页 + 筛选）
   * @param projectId 项目ID
   * @param deviceId 可选：设备ID，不传则查询项目下所有设备的操作日志
   */
  async queryLogs(
    projectId: string,
    deviceId: string | undefined,
    dto: QueryControlLogDto,
  ): Promise<{
    items: ControlOperationLog[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    try {
      const ds = await this.projectDbService.getSystemDb(projectId);
      const repo = ds.getRepository(ControlOperationLog);

      const page = dto.page || 1;
      const pageSize = dto.pageSize || 20;

      const query = repo
        .createQueryBuilder('log')
        .where('log.projectId = :projectId', { projectId });

      if (deviceId) {
        query.andWhere('log.deviceId = :deviceId', { deviceId });
      }

      if (dto.keyword) {
        query.andWhere(
          '(log.tagName LIKE :keyword OR log.operatorName LIKE :keyword OR log.deviceName LIKE :keyword)',
          { keyword: `%${dto.keyword}%` },
        );
      }

      if (dto.success !== undefined) {
        query.andWhere('log.success = :success', { success: dto.success });
      }

      if (dto.startDate) {
        query.andWhere('log.createdAt >= :startDate', { startDate: dto.startDate });
      }
      if (dto.endDate) {
        query.andWhere('log.createdAt <= :endDate', { endDate: dto.endDate });
      }

      if (dto.deviceName) {
        query.andWhere('log.deviceName LIKE :deviceName', { deviceName: `%${dto.deviceName}%` });
      }

      const [items, total] = await query
        .orderBy('log.createdAt', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      this.logger.error(`查询操作日志失败: ${(err as Error).message}`);
      throw err;
    }
  }
}
