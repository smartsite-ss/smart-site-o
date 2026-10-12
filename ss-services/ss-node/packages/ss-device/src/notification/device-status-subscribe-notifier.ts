// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 设备状态订阅消息通知器（二期 10 #6）
 *
 * 订阅 `device:statusChange` 事件（DeviceStateMachine 发射），
 * 设备进入离线/故障状态时，经 WechatSubscribeMessageChannel（@Global 模块，@Optional 注入）
 * 下发微信小程序订阅消息。发送失败仅记录日志，不阻塞状态机主流程。
 *
 * 设备名补全：事件载荷不含 deviceName，按项目库模式查询设备实体补全（查不到回退设备 ID）。
 */
import { Injectable, Inject, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceStatus } from '@ss-node/ss-sdk';
import {
  EventBusService,
  ProjectDatabaseService,
  WechatSubscribeMessageChannel,
} from '@ss-node/ss-core';
import { Device } from '../entities/device.entity';
import { StatusChangeEvent } from '../state/device-state-machine';

/** 仅推送离线/故障两类状态（二期需求约定） */
const NOTIFIED_STATUSES: DeviceStatus[] = [DeviceStatus.OFFLINE, DeviceStatus.ERROR];

@Injectable()
export class DeviceStatusSubscribeNotifier implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceStatusSubscribeNotifier.name);
  private readonly handler: (event: StatusChangeEvent) => void;
  /** 数据库模式：isolated=项目独立DB, unified=全局DB */
  private readonly dbMode: string;

  constructor(
    @Optional()
    private readonly eventBus: EventBusService | undefined,
    @Optional()
    private readonly subscribeChannel: WechatSubscribeMessageChannel | undefined,
    @Inject(getRepositoryToken(Device))
    private readonly deviceRepository: Repository<Device>,
    @Inject(ProjectDatabaseService)
    private readonly projectDbService: ProjectDatabaseService,
    configService: ConfigService,
  ) {
    this.dbMode = configService.get<string>('PROJECT_DB_MODE', 'isolated');
    this.handler = (event) => {
      void this.handleStatusChange(event);
    };
  }

  onModuleInit(): void {
    if (!this.eventBus) {
      return;
    }
    if (!this.subscribeChannel) {
      this.logger.warn(
        'WechatSubscribeMessageChannel 不可用，跳过设备状态订阅消息订阅',
      );
      return;
    }
    this.eventBus.on('device:statusChange', this.handler);
    this.logger.log(
      'DeviceStatusSubscribeNotifier initialized — listening for device:statusChange',
    );
  }

  onModuleDestroy(): void {
    this.eventBus?.off('device:statusChange', this.handler);
  }

  /** 处理设备状态变更：过滤目标状态 → 补全设备名 → 下发订阅消息 */
  private async handleStatusChange(event: StatusChangeEvent): Promise<void> {
    if (!NOTIFIED_STATUSES.includes(event.toStatus)) {
      return;
    }
    const channel = this.subscribeChannel;
    if (!channel) {
      return;
    }
    try {
      const deviceRepo = await this.getDeviceRepo(event.projectId);
      const device = await deviceRepo.findOne({ where: { id: event.deviceId } });
      await channel.notifyDeviceStatus({
        deviceName: device?.deviceName || event.deviceId,
        status: event.toStatus as string,
        projectId: event.projectId,
        timestamp: new Date(event.timestamp),
      });
    } catch (error) {
      // 通知失败降级为日志，不阻塞设备状态机主流程
      this.logger.warn(
        `设备状态订阅消息发送失败：deviceId=${event.deviceId} ${(error as Error).message}`,
      );
    }
  }

  /** 按项目库模式获取设备 Repository（与 DeviceService.getRepos 同模式） */
  private async getDeviceRepo(projectId: string): Promise<Repository<Device>> {
    if (this.dbMode === 'isolated' && this.projectDbService) {
      const ds = await this.projectDbService.getSystemDb(projectId);
      return ds.getRepository(Device);
    }
    return this.deviceRepository;
  }
}
