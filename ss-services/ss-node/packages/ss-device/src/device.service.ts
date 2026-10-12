// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  Inject,
  Optional,
  Logger,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Like, In, DeepPartial, FindOptionsWhere } from 'typeorm';
import { Device } from './entities/device.entity';
import { DataTag } from './entities/data-tag.entity';
import { DeviceGroup } from './entities/device-group.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { CreateDataTagDto, UpdateDataTagDto, TagDataType } from '@ss-node/ss-datatag';
import { CreateDeviceGroupDto } from './dto/create-device-group.dto';
import { UpdateDeviceGroupDto } from './dto/update-device-group.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { PaginatedResult } from '@ss-node/ss-sdk';
import { I18nService } from '@ss-node/ss-i18n';
import {
  DataPointCacheService,
  EventBusService,
  DeviceStateManager,
  ProjectDatabaseService,
  ErrorFactory,
  AuthorizationService,
} from '@ss-node/ss-core';
import { PluginRegistry } from '@ss-node/ss-collector-sdk';
import { ChannelConfigService } from './channel/channel-config.service';
import { TemplateLoaderService } from '@ss-node/ss-system';

/**
 * TemplateLoaderService 的最小接口定义（用于类型安全）。
 * ss-device 现在直接依赖 @ss-node/ss-system（已在 package.json 中声明），
 * 循环依赖通过 NestJS forwardRef 处理，不再需要 require() hack。
 */
interface ITemplateVariable {
  order: number;
  name: string;
  address: string;
  dataType: string;
  [key: string]: any; // 允许 TemplateVariable 的所有其他属性
}

interface ITemplate {
  id: string;
  name: string;
  deviceType: string;
  version: string;
  variables: ITemplateVariable[];
}

interface ITemplateLoaderService {
  getTemplate(templateId: string): ITemplate | undefined;
}

/** 项目设备树节点（三级：项目→分组→设备） */
export interface ProjectDeviceTree {
  projectId: string;
  projectName: string;
  groups: DeviceTree[];
  /** 未分组的设备（groupId 为空），挂载在项目节点下 */
  rootDevices: DeviceSummary[];
}

export interface DeviceTree {
  group: {
    id: string;
    name: string;
    sortOrder: number;
    parentId?: string;
  };
  children: DeviceTree[];
  devices: DeviceSummary[];
}

export interface DeviceSummary {
  id: string;
  deviceCode: string;
  deviceName: string;
  type: string;
  status: string;
}

/** 设备统计信息 */
export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  connecting: number;
  degraded: number;
  error: number;
  totalTags: number;
}

/** 项目级 Repository 集合 */
interface ProjectRepos {
  deviceRepo: Repository<Device>;
  dataTagRepo: Repository<DataTag>;
  deviceGroupRepo: Repository<DeviceGroup>;
}

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  /** 数据库模式：isolated=项目独立DB, unified=全局DB */
  private readonly dbMode: string;
  private readonly err: ErrorFactory;

  constructor(
    @Inject(getRepositoryToken(Device))
    private deviceRepository: Repository<Device>,
    @Inject(getRepositoryToken(DataTag))
    private dataTagRepository: Repository<DataTag>,
    @Inject(getRepositoryToken(DeviceGroup))
    private deviceGroupRepository: Repository<DeviceGroup>,
    @Inject(I18nService)
    private i18nService: I18nService,
    @Inject(ProjectDatabaseService)
    private projectDbService: ProjectDatabaseService,
    private configService: ConfigService,
    @Optional()
    @Inject(PluginRegistry)
    private pluginRegistry?: PluginRegistry,
    @Optional()
    @Inject(DataPointCacheService)
    private cacheService?: DataPointCacheService,
    @Optional()
    @Inject(ChannelConfigService)
    private channelConfigService?: ChannelConfigService,
    @Optional()
    @Inject(forwardRef(() => TemplateLoaderService))
    private templateLoaderService?: ITemplateLoaderService,
    @Optional()
    private readonly eventBus?: EventBusService,
    @Optional()
    @Inject(forwardRef(() => DeviceStateManager))
    private readonly deviceStateManager?: DeviceStateManager,
    @Inject(forwardRef(() => AuthorizationService))
    private readonly authorizationService?: AuthorizationService,
  ) {
    this.dbMode = this.configService.get<string>('PROJECT_DB_MODE', 'isolated');
    this.err = new ErrorFactory(this.i18nService);
    // 诊断日志：确认 TemplateLoaderService 是否成功注入
    if (this.templateLoaderService) {
      this.logger.log('TemplateLoaderService injected successfully — template binding is active');
    } else {
      this.logger.warn(
        'TemplateLoaderService NOT injected — template binding will be skipped! ' +
          'Check: @ss-node/ss-system dependency in ss-device/package.json and SystemModule import in DeviceModule',
      );
    }
  }

  /**
   * 根据项目ID获取对应的 Repository 集合
   * - isolated 模式：通过 ProjectDatabaseService 获取项目级 DataSource
   * - unified 模式：使用全局注入的 Repository（兼容旧行为）
   */
  private async getRepos(projectId: string): Promise<ProjectRepos> {
    if (this.dbMode === 'isolated' && this.projectDbService) {
      const ds = await this.projectDbService.getSystemDb(projectId);
      return {
        deviceRepo: ds.getRepository(Device),
        dataTagRepo: ds.getRepository(DataTag),
        deviceGroupRepo: ds.getRepository(DeviceGroup),
      };
    }
    return {
      deviceRepo: this.deviceRepository,
      dataTagRepo: this.dataTagRepository,
      deviceGroupRepo: this.deviceGroupRepository,
    };
  }

  async create(createDeviceDto: CreateDeviceDto, projectId: string): Promise<Device> {
    const { deviceRepo, dataTagRepo } = await this.getRepos(projectId);

    // Check deviceCode uniqueness
    const existing = await deviceRepo.findOne({
      where: { deviceCode: createDeviceDto.deviceCode, projectId },
    });
    if (existing) {
      this.err.conflict('error.device.DEV_002', { deviceCode: createDeviceDto.deviceCode });
    }

    // Validate channel config（自动注入 protocol 字段，避免前端重复传递）
    if (this.channelConfigService && createDeviceDto.connection) {
      const connection = { ...createDeviceDto.connection, protocol: createDeviceDto.driver };
      this.channelConfigService.validate(connection as any);
    }

    // ⭐ 调用采集插件的 validateChannelConfig() 做协议特有校验
    await this.validateWithPlugin(createDeviceDto.driver, createDeviceDto.connection);

    // 从模板推导设备类型（提示词.md 要求：选择设备模板，而非手动选择设备类型）
    let deviceType = 'modbus_tcp'; // 默认值
    let templateVersion: string | undefined;
    if (this.templateLoaderService && createDeviceDto.templateId) {
      const template = this.templateLoaderService.getTemplate(createDeviceDto.templateId);
      if (template) {
        deviceType = template.deviceType || deviceType;
        templateVersion = template.version;
        this.logger.log(
          `Device type derived from template ${createDeviceDto.templateId}: ${deviceType}`,
        );
      }
    }

    const device = deviceRepo.create({
      ...createDeviceDto,
      type: deviceType as any,
      projectId,
      templateVersion: createDeviceDto.templateVersion || templateVersion,
      templateAppliedAt: new Date(),
    });
    const saved = await deviceRepo.save(device);

    // 自动实例化模板标签：根据模板变量创建 DataTag
    if (this.templateLoaderService && createDeviceDto.templateId) {
      const template = this.templateLoaderService.getTemplate(createDeviceDto.templateId);
      if (template && template.variables?.length) {
        const tagEntities = template.variables.map((v) =>
          dataTagRepo.create({
            name: v.name,
            description: (v as any).description,
            deviceId: saved.id,
            projectId,
            address: v.address,
            dataType: v.dataType as any,
            retryCount: (v as any).registerCount ?? (v as any).retryCount ?? 3,
            scanRate: (v as any).scanRate ?? 1000,
            timeout: (v as any).timeout ?? 5000,
            enabled: (v as any).enabled ?? true,
            scale: (v as any).scale,
            offset: (v as any).offset,
            conversionType: (v as any).conversionType as any,
            conversionConfig: (v as any).conversionConfig,
            unit: (v as any).unit,
            displayFormat: (v as any).displayFormat,
            minValue: (v as any).minValue,
            maxValue: (v as any).maxValue,
            deadbandMode: (v as any).deadbandMode as any,
            deadbandValue: (v as any).deadbandValue,
            deadbandPercent: (v as any).deadbandPercent,
            deadbandTime: (v as any).deadbandTime,
            alarmEnabled: (v as any).alarmEnabled ?? false,
            alarmHighHigh: (v as any).alarmHighHigh,
            alarmHigh: (v as any).alarmHigh,
            alarmLow: (v as any).alarmLow,
            alarmLowLow: (v as any).alarmLowLow,
            alarmDeviation: (v as any).alarmDeviation,
            qualityCheckEnabled: (v as any).qualityCheckEnabled ?? false,
            maxAge: (v as any).maxAge,
            archiveEnabled: (v as any).archiveEnabled ?? false,
            archiveInterval: (v as any).archiveInterval,
            archiveDeadband: (v as any).archiveDeadband,
          }),
        );
        await dataTagRepo.save(tagEntities);
        this.logger.log(
          `Template ${createDeviceDto.templateId} auto-applied to device ${saved.id}: ${tagEntities.length} tags created`,
        );
      }
    }

    // 通知采集层：设备已创建，需建立连接 + 注册采集任务
    this.eventBus?.emit('device.created', {
      deviceId: saved.id,
      projectId: saved.projectId,
      protocol: saved.driver || saved.type,
      connection: saved.connection,
      scanRate: saved.scanRate,
      templateId: saved.templateId,
      templateVersion: saved.templateVersion,
      timestamp: Date.now(),
    });

    this.logger.log(
      `Device created: ${saved.id} (${saved.deviceName}), protocol=${saved.driver || saved.type}`,
    );
    return saved;
  }

  async findAll(projectId: string, query?: QueryDeviceDto, roleId?: string): Promise<PaginatedResult<Device>> {
    const { deviceRepo } = await this.getRepos(projectId);
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const baseWhere: any = { projectId };

    // ───── 设备授权过滤 ─────
    if (roleId && this.authorizationService) {
      const accessibleIds = await this.authorizationService.getAccessibleDeviceIds(roleId, projectId);
      if (accessibleIds.length === 0) {
        // 角色在此项目下未授权任何设备 → 返回空列表
        return { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
      }
      if (accessibleIds[0] !== '*') {
        baseWhere.id = In(accessibleIds);
      }
      // accessibleIds[0] === '*' → 不添加过滤，返回全部
    }

    if (query?.deviceCode) {
      baseWhere.deviceCode = query.deviceCode;
    }
    if (query?.status && query.status !== 'all') {
      baseWhere.status = query.status;
    }
    if (query?.type) {
      baseWhere.type = query.type;
    }
    if (query?.groupId) {
      baseWhere.groupId = query.groupId;
    }

    let where: any;
    if (query?.search) {
      const searchStr = `%${query.search}%`;
      where = [
        { ...baseWhere, deviceName: Like(searchStr) },
        { ...baseWhere, deviceCode: Like(searchStr) },
        { ...baseWhere, nameAlias: Like(searchStr) },
      ];
    } else {
      where = baseWhere;
    }

    const order: any = {};
    if (query?.sortBy) {
      order[query.sortBy] = query.sortOrder || 'ASC';
    } else {
      order.createdAt = 'DESC';
    }

    const [data, total] = await deviceRepo.findAndCount({
      where,
      skip,
      take: pageSize,
      order,
    });

    // 合并 DeviceStateManager 内存中的实时状态
    const merged = data.map((d) => this.mergeMemoryStatus(d));

    return {
      data: this.desensitizeDevices(merged),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取设备统计信息（总数、各状态数量、标签总数）
   * 用于系统概览页面的设备状态分布展示
   */
  async getDeviceStats(projectId: string, roleId?: string): Promise<DeviceStats> {
    const { deviceRepo, dataTagRepo } = await this.getRepos(projectId);

    // ───── 设备授权过滤 ─────
    const deviceWhere: any = { projectId };
    if (roleId && this.authorizationService) {
      const accessibleIds = await this.authorizationService.getAccessibleDeviceIds(roleId, projectId);
      if (accessibleIds.length === 0) {
        return { total: 0, online: 0, offline: 0, connecting: 0, degraded: 0, error: 0, totalTags: 0 };
      }
      if (accessibleIds[0] !== '*') {
        deviceWhere.id = In(accessibleIds);
      }
    }

    const devices = await deviceRepo.find({
      where: deviceWhere,
      select: ['id', 'status', 'lastDataAt', 'offlinePeriod'],
    });

    const total = devices.length;
    let online = 0;
    let offline = 0;
    let connecting = 0;
    let degraded = 0;
    let error = 0;

    const now = Date.now();
    for (const device of devices) {
      // 合并内存实时状态
      const memState = this.deviceStateManager?.getState(device.id);
      let status: string = memState ? memState.status : device.status;

      // 心跳超时兜底：即使 status 标记为 online，若最近数据时间超过 offlinePeriod，判定为离线。
      // deviceStateManager 可能未注入或未及时更新，用 lastDataAt + offlinePeriod 做实时兜底。
      if (status === 'online' && device.lastDataAt) {
        const offlineThreshold = device.offlinePeriod || 30000;
        if (now - device.lastDataAt.getTime() > offlineThreshold) {
          status = 'offline';
        }
      }

      switch (status) {
        case 'online':
          online++;
          break;
        case 'offline':
          offline++;
          break;
        case 'connecting':
          connecting++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'error':
          error++;
          break;
        default:
          offline++;
          break;
      }
    }

    const deviceIds = devices.map((d) => d.id);
    let tagCount = 0;
    if (deviceIds.length > 0) {
      tagCount = await dataTagRepo.count({
        where: { deviceId: In(deviceIds) },
      });
    }

    return { total, online, offline, connecting, degraded, error, totalTags: tagCount };
  }

  async findOne(id: string, projectId: string): Promise<Device> {
    const { deviceRepo, dataTagRepo } = await this.getRepos(projectId);
    const device = await deviceRepo.findOne({
      where: { id, projectId },
    });
    if (!device) this.err.notFound('error.device.DEV_001', { id });
    // 查询设备关联的数据标签（模板实例化生成 + 手动添加）
    let tags = await dataTagRepo.find({ where: { deviceId: id } });

    // 自动修复：如果设备已绑定模板但点表为空（可能因历史 DI 失败导致模板未实例化），
    // 在此自动重新应用模板。applyTemplate 是幂等的（按名称去重），不会重复创建。
    if (device.templateId && (tags?.length ?? 0) === 0 && this.templateLoaderService) {
      this.logger.log(
        `Device ${id} has templateId "${device.templateId}" but 0 tags — auto-applying template to fix missing tags`,
      );
      try {
        await this.applyTemplate(id, device.templateId, projectId);
        // 重新加载标签
        tags = await dataTagRepo.find({ where: { deviceId: id } });
        this.logger.log(`Auto-apply completed: ${tags.length} tags now exist for device ${id}`);
      } catch (err: any) {
        this.logger.warn(
          `Auto-apply template failed for device ${id}: ${err.message}. Tags may need manual creation.`,
        );
      }
    }

    (device as any).tags = tags;
    // 合并内存实时状态 + 密码脱敏
    return this.desensitizeDevice(this.mergeMemoryStatus(device));
  }

  /**
   * 用 DeviceStateManager 内存中的实时状态覆盖 DB 返回的设备状态。
   * 前端列表显示以内存状态为准（最新采集回调更新的状态）。
   */
  private mergeMemoryStatus(device: Device): Device {
    const memoryState = this.deviceStateManager?.getState(device.id);
    if (memoryState) {
      device.status = memoryState.status as any;
      if (memoryState.lastOnlineAt) {
        device.lastOnlineAt = new Date(memoryState.lastOnlineAt) as any;
      }
      if (memoryState.lastOfflineAt) {
        device.lastOfflineAt = new Date(memoryState.lastOfflineAt) as any;
      }
      if (memoryState.lastDataAt) {
        device.lastDataAt = new Date(memoryState.lastDataAt) as any;
      }
      // 合并运行时错误信息
      if (memoryState.lastErrorMessage) {
        (device as any).lastErrorMsg = memoryState.lastErrorMessage;
      }
      // 合并运行时错误计数：failingTags 数量
      const failingCount = memoryState.failingTags?.length ?? 0;
      (device as any).errorCount = failingCount;
      // 合并采集诊断数据
      if (memoryState.diagnostics) {
        (device as any)._diagnostics = {
          retryCount: memoryState.diagnostics.retryCount,
          circuitState: memoryState.diagnostics.circuitState,
          consecutiveFailures: memoryState.diagnostics.consecutiveFailures,
          lastErrorAt: memoryState.diagnostics.lastErrorAt,
        };
      }
    }
    return device;
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto, projectId: string): Promise<Device> {
    const { deviceRepo } = await this.getRepos(projectId);
    const device = await this.findOne(id, projectId);
    if (updateDeviceDto.deviceCode && updateDeviceDto.deviceCode !== device.deviceCode) {
      const existing = await deviceRepo.findOne({
        where: { deviceCode: updateDeviceDto.deviceCode, projectId },
      });
      if (existing) {
        this.err.conflict('error.device.DEV_002', { deviceCode: updateDeviceDto.deviceCode });
      }
    }

    // ⭐ 如果更新 connection 配置，调用插件校验接口
    if (updateDeviceDto.connection) {
      await this.validateWithPlugin(device.driver, updateDeviceDto.connection);
    }

    // 检测变更字段（用于通知采集层执行增量操作）
    const changedFields: string[] = [];
    const changes: Record<string, { old: any; new: any }> = {};
    if (
      updateDeviceDto.connection &&
      JSON.stringify(updateDeviceDto.connection) !== JSON.stringify(device.connection)
    ) {
      changedFields.push('connection');
      changes.connection = { old: device.connection, new: updateDeviceDto.connection };
    }
    if (updateDeviceDto.scanRate !== undefined && updateDeviceDto.scanRate !== device.scanRate) {
      changedFields.push('scanRate');
      changes.scanRate = { old: device.scanRate, new: updateDeviceDto.scanRate };
    }
    if (
      updateDeviceDto.deviceName !== undefined &&
      updateDeviceDto.deviceName !== device.deviceName
    ) {
      changedFields.push('deviceName');
      changes.deviceName = { old: device.deviceName, new: updateDeviceDto.deviceName };
    }
    if (updateDeviceDto.groupId !== undefined && updateDeviceDto.groupId !== device.groupId) {
      changedFields.push('groupId');
      changes.groupId = { old: device.groupId, new: updateDeviceDto.groupId };
    }

    // 检测 templateId 是否变更：编辑设备绑定/切换模板时需实例化点表
    const oldTemplateId = device.templateId ?? null;
    const newTemplateId = updateDeviceDto.templateId ?? null;
    const templateChanged = newTemplateId !== oldTemplateId;
    if (templateChanged) {
      changedFields.push('tags');
      changes.tags = { old: oldTemplateId, new: newTemplateId };
    }
    // 检测采集驱动是否变更
    if (updateDeviceDto.driver && updateDeviceDto.driver !== device.driver) {
      changedFields.push('driver');
      changes.driver = { old: device.driver, new: updateDeviceDto.driver };
    }
    // 修复历史问题：如果模板未变更但设备没有点表（可能因之前 DI 失败），也需重新应用
    const effectiveTemplateId = newTemplateId ?? oldTemplateId;
    const needsReapply =
      !templateChanged && effectiveTemplateId && ((device as any).tags?.length ?? 0) === 0;

    Object.assign(device, updateDeviceDto);
    const saved = await deviceRepo.save(device);

    // 模板变更时实例化标签（与创建设备时的自动实例化逻辑一致）
    if (templateChanged && newTemplateId) {
      this.logger.log(
        `Template changed for device ${saved.id}: ${oldTemplateId || '(none)'} → ${newTemplateId}, applying template...`,
      );
      await this.applyTemplate(saved.id, newTemplateId, projectId);
    }

    // 模板未变更但点表为空，重新应用模板修复历史问题
    if (needsReapply) {
      this.logger.log(
        `Template unchanged for device ${saved.id} but 0 tags found — re-applying template ${effectiveTemplateId} to fix missing tags`,
      );
      await this.applyTemplate(saved.id, effectiveTemplateId!, projectId);
    }

    // 通知采集层：设备配置变更（通道/频率/驱动/状态等）
    if (changedFields.length > 0) {
      this.eventBus?.emit('device.updated', {
        deviceId: saved.id,
        projectId: saved.projectId,
        protocol: saved.driver || saved.type,
        changedFields,
        connection: changedFields.includes('connection') ? saved.connection : undefined,
        scanRate: changedFields.includes('scanRate') ? saved.scanRate : undefined,
        offlinePeriod: changedFields.includes('offlinePeriod') ? saved.offlinePeriod : undefined,
        driver: changedFields.includes('driver') ? saved.driver : undefined,
        changes,
        timestamp: Date.now(),
      });

      this.logger.log(
        `Device updated: ${saved.id} (${saved.deviceName}), changed: ${changedFields.join(', ')}`,
      );
    }

    return this.findOne(saved.id, projectId);
  }

  async remove(id: string, projectId: string): Promise<void> {
    const { deviceRepo, dataTagRepo } = await this.getRepos(projectId);
    const device = await this.findOne(id, projectId);

    // 1. 删除设备关联的所有数据标签（先清理外键依赖）
    const tags = await dataTagRepo.find({ where: { deviceId: id } });
    if (tags.length > 0) {
      const tagIds = tags.map((t) => t.id);
      if (this.dbMode === 'isolated' && this.projectDbService) {
        const ds = await this.projectDbService.getSystemDb(projectId);
        await ds.query(
          `DELETE FROM alm_alarm_rules WHERE tagId IN (${tagIds.map(() => '?').join(',')})`,
          tagIds,
        );
        await ds.query(
          `DELETE FROM data_historical_data WHERE tagId IN (${tagIds.map(() => '?').join(',')})`,
          tagIds,
        );
      }
      await dataTagRepo.remove(tags);
      this.logger.log(`Cascade deleted ${tags.length} tags for device ${id}`);
    }

    // 2. 删除设备 (SQLite 外键级联：dev_device_status_log, dev_device_group_members)
    await deviceRepo.remove(device);

    // 3. 通知采集层：设备已删除，需断开连接 + 注销采集任务
    this.eventBus?.emit('device.deleted', {
      deviceId: id,
      projectId,
      protocol: device.driver || device.type,
      timestamp: Date.now(),
    });

    this.logger.log(`Device ${id} (${device.deviceName}) deleted with cascade`);
  }

  async addTag(
    deviceId: string,
    createDataTagDto: CreateDataTagDto,
    projectId: string,
  ): Promise<DataTag> {
    const { dataTagRepo } = await this.getRepos(projectId);
    await this.findOne(deviceId, projectId);
    const tag = dataTagRepo.create({
      ...createDataTagDto,
      deviceId,
    } as unknown as DeepPartial<DataTag>);
    return dataTagRepo.save(tag);
  }

  async addTags(deviceId: string, dtos: CreateDataTagDto[], projectId: string): Promise<DataTag[]> {
    const { dataTagRepo } = await this.getRepos(projectId);
    await this.findOne(deviceId, projectId);
    const tags = dtos.map((dto) =>
      dataTagRepo.create({
        ...dto,
        deviceId,
      } as unknown as DeepPartial<DataTag>),
    );
    return dataTagRepo.save(tags);
  }

  async removeTag(tagId: string, deviceId: string, projectId: string): Promise<void> {
    const { dataTagRepo } = await this.getRepos(projectId);
    await this.findOne(deviceId, projectId);
    const tag = await dataTagRepo.findOne({ where: { id: tagId, deviceId } });
    if (!tag) this.err.notFound('error.data.DATA_005', { tagId });
    // 先清理外键依赖记录
    if (this.dbMode === 'isolated' && this.projectDbService) {
      const ds = await this.projectDbService.getSystemDb(projectId);
      await ds.query('DELETE FROM alm_alarm_rules WHERE tagId = ?', [tagId]);
      await ds.query('DELETE FROM data_historical_data WHERE tagId = ?', [tagId]);
    }
    await dataTagRepo.remove(tag);
  }

  async updateDataTag(
    tagId: string,
    deviceId: string,
    updateDataTagDto: UpdateDataTagDto,
    projectId: string,
  ): Promise<DataTag> {
    const { dataTagRepo } = await this.getRepos(projectId);
    await this.findOne(deviceId, projectId);
    const tag = await dataTagRepo.findOne({ where: { id: tagId, deviceId } });
    if (!tag) this.err.notFound('error.data.DATA_005', { tagId });
    Object.assign(tag, updateDataTagDto);
    return dataTagRepo.save(tag);
  }

  async createGroup(dto: CreateDeviceGroupDto, projectId: string): Promise<DeviceGroup> {
    const { deviceGroupRepo } = await this.getRepos(projectId);
    const group = deviceGroupRepo.create({ ...dto, projectId });
    return deviceGroupRepo.save(group);
  }

  async findAllGroups(projectId: string): Promise<DeviceGroup[]> {
    const { deviceGroupRepo } = await this.getRepos(projectId);
    return deviceGroupRepo.find({
      where: { projectId },
      order: { sortOrder: 'ASC' },
    });
  }

  async findOneGroup(id: string, projectId: string): Promise<DeviceGroup> {
    const { deviceGroupRepo } = await this.getRepos(projectId);
    const group = await deviceGroupRepo.findOne({
      where: { id, projectId },
      relations: ['children'],
    });
    if (!group) this.err.notFound('error.device.DEV_001', { id });
    return group;
  }

  async updateGroup(
    id: string,
    dto: UpdateDeviceGroupDto,
    projectId: string,
  ): Promise<DeviceGroup> {
    const { deviceGroupRepo } = await this.getRepos(projectId);
    const group = await this.findOneGroup(id, projectId);
    Object.assign(group, dto);
    return deviceGroupRepo.save(group);
  }

  async removeGroup(id: string, projectId: string): Promise<void> {
    const { deviceGroupRepo } = await this.getRepos(projectId);
    const group = await this.findOneGroup(id, projectId);

    if (group.children?.length) {
      for (const child of group.children) {
        child.parentId = group.parentId || null;
        await deviceGroupRepo.save(child);
      }
    }

    await deviceGroupRepo.remove(group);
  }

  /**
   * 移动设备到指定分组（支持跨多级分组移动）
   * @param deviceId 设备ID
   * @param targetGroupId 目标分组ID，null 表示移出分组（未分组）
   * @param projectId 项目ID
   */
  async moveDevice(
    deviceId: string,
    targetGroupId: string | null,
    projectId: string,
  ): Promise<Device> {
    const { deviceRepo, deviceGroupRepo } = await this.getRepos(projectId);
    const device = await this.findOne(deviceId, projectId);

    // 校验目标分组存在且属于当前项目
    if (targetGroupId) {
      const targetGroup = await deviceGroupRepo.findOne({
        where: { id: targetGroupId, projectId },
      });
      if (!targetGroup) {
        this.err.notFound('error.device.DEV_001', { id: targetGroupId });
      }
    }

    const oldGroupId = device.groupId;
    // groupId 实体类型为 string，但列允许 null；targetGroupId 为 null 时 TypeORM 存 null
    device.groupId = targetGroupId as string;
    const saved = await deviceRepo.save(device);

    // 通知采集层：设备分组变更
    this.eventBus?.emit('device.updated', {
      deviceId: saved.id,
      projectId: saved.projectId,
      protocol: saved.driver || saved.type,
      changedFields: ['groupId'],
      changes: { groupId: { old: oldGroupId, new: targetGroupId } },
      timestamp: Date.now(),
    });

    this.logger.log(
      `Device ${saved.id} moved to group ${targetGroupId || '(none)'} (was ${oldGroupId || '(none)'})`,
    );
    return saved;
  }

  /**
   * 获取分组的完整路径（从根到当前分组）
   * 通过 parentId 链向上遍历，带循环引用检测防止无限循环
   * @param groupId 分组ID
   * @param projectId 项目ID
   * @returns 路径数组，索引 0 为根分组，末尾为当前分组
   */
  async getGroupPath(groupId: string, projectId: string): Promise<DeviceGroup[]> {
    const { deviceGroupRepo } = await this.getRepos(projectId);

    const path: DeviceGroup[] = [];
    const visited = new Set<string>();
    let currentId: string | null = groupId;

    while (currentId) {
      // 循环引用检测：如果已访问过该节点，中止遍历
      if (visited.has(currentId)) {
        this.logger.warn(
          `Cycle detected in group path at groupId=${currentId}, aborting path traversal`,
        );
        break;
      }
      visited.add(currentId);

      const group = await deviceGroupRepo.findOne({
        where: { id: currentId, projectId },
      });
      if (!group) break;

      path.unshift(group); // 插入到头部，最终顺序为根→当前
      currentId = group.parentId;
    }

    return path;
  }

  /**
   * 获取设备分组树（三级：项目→分组→设备）
   * 提示词.md 第4条要求：设备树显示 项目→分组→设备 三级
   */
  async getGroupTree(projectId: string, projectName?: string, roleId?: string): Promise<ProjectDeviceTree> {
    const { deviceGroupRepo, deviceRepo } = await this.getRepos(projectId);

    const groups = await deviceGroupRepo.find({
      where: { projectId },
      relations: ['children'],
      order: { sortOrder: 'ASC' },
    });

    // ───── 设备授权过滤 ─────
    let authorizedDeviceIds: string[] | null = null;
    if (roleId && this.authorizationService) {
      const accessibleIds = await this.authorizationService.getAccessibleDeviceIds(roleId, projectId);
      if (accessibleIds.length > 0 && accessibleIds[0] !== '*') {
        authorizedDeviceIds = accessibleIds;
      }
    }

    const devices = await deviceRepo.find({
      where: {
        projectId,
        ...(authorizedDeviceIds ? { id: In(authorizedDeviceIds) } : {}),
      },
      select: ['id', 'deviceCode', 'deviceName', 'type', 'status', 'groupId'],
    });

    const deviceMap = new Map<string, DeviceSummary[]>();
    const rootDevices: DeviceSummary[] = [];
    for (const device of devices) {
      // 合并内存实时状态
      const memState = this.deviceStateManager?.getState(device.id);
      const displayStatus = memState ? memState.status : device.status;

      const summary: DeviceSummary = {
        id: device.id,
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        type: device.type,
        status: displayStatus,
      };

      const key = device.groupId;
      if (!key) {
        // 未分组的设备挂载到项目根
        rootDevices.push(summary);
      } else {
        if (!deviceMap.has(key)) deviceMap.set(key, []);
        deviceMap.get(key)!.push(summary);
      }
    }

    const rootGroups = groups.filter((g) => !g.parentId);
    const groupTree = rootGroups.map((g) => this.buildTreeNode(g, groups, deviceMap));

    return {
      projectId,
      projectName: projectName || projectId,
      groups: groupTree,
      rootDevices,
    };
  }

  /**
   * 密码脱敏：掩码设备连接配置中的敏感字段
   * 适用于 findAll 列表场景下的密码保护
   */
  desensitizeDevices(devices: Device[]): Device[] {
    return devices.map((d) => this.desensitizeDevice(d));
  }

  /**
   * 调用采集插件的 validateChannelConfig() 做协议特有语义校验
   */
  private async validateWithPlugin(driver: string, connection: Record<string, any>): Promise<void> {
    if (!this.pluginRegistry || !connection) return;

    try {
      const adapter = this.pluginRegistry.getAdapter(driver);
      if (!adapter) {
        this.logger.warn(`No adapter found for driver ${driver}, skipping plugin validation`);
        return;
      }
      const result = await adapter.validateChannelConfig(connection);
      if (!result.valid) {
        throw new BadRequestException({
          code: 'CH_007',
          message: '采集插件通道配置校验失败',
          errors: result.errors,
        });
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(`Plugin validation error for driver ${driver}: ${(error as Error).message}`);
    }
  }

  private desensitizeDevice(device: Device): Device {
    if (!device.connection || typeof device.connection !== 'object') {
      return device;
    }

    const SENSITIVE_KEYS = ['password', 'privatekeypath', 'certificatepath', 'keypath', 'capath'];
    const connection = { ...device.connection };

    const maskSensitive = (obj: Record<string, any>) => {
      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
          if (typeof obj[key] === 'string' && obj[key].length > 0) {
            obj[key] = '***';
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          maskSensitive(obj[key]);
        }
      }
    };

    maskSensitive(connection);
    return { ...device, connection };
  }

  private buildTreeNode(
    group: DeviceGroup,
    allGroups: DeviceGroup[],
    deviceMap: Map<string, DeviceSummary[]>,
  ): DeviceTree {
    const children = allGroups
      .filter((g) => g.parentId === group.id)
      .map((g) => this.buildTreeNode(g, allGroups, deviceMap));

    return {
      group: {
        id: group.id,
        name: group.name,
        sortOrder: group.sortOrder,
        parentId: group.parentId || undefined,
      },
      children,
      devices: deviceMap.get(group.id) || [],
    };
  }

  async searchTags(
    projectId: string,
    query?: string,
    tagType?: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<DataTag>> {
    const { deviceRepo, dataTagRepo } = await this.getRepos(projectId);
    const devices = await deviceRepo.find({
      where: { projectId },
      select: ['id'],
    });
    const deviceIds = devices.map((d) => d.id);

    if (deviceIds.length === 0) {
      return { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
    }

    const where: any = { deviceId: In(deviceIds), enabled: true };

    if (query) {
      where.name = Like(`%${query}%`);
    }

    if (tagType) {
      where.dataType = tagType;
    }

    const skip = (page - 1) * pageSize;
    const [data, total] = await dataTagRepo.findAndCount({
      where,
      relations: ['device'],
      skip,
      take: pageSize,
      order: { name: 'ASC' },
    });

    return {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * 按设备查询数据标签列表（"管理端与移动端共用的唯一权威入口"，
   * 详见架构设计 07-接口设计规范 §3.3 / §4.1）。
   * - 校验设备在项目下存在（不存在抛 DEV_001）
   * - 按 deviceId 过滤，支持 keyword（按 name 模糊）、dataType、enabled 过滤
   * - 分页返回 { data, pagination }（与 ss-device / ss-datatag findAll 统一结构）
   */
  async findTagsByDevice(
    projectId: string,
    deviceId: string,
    query: { page?: number; pageSize?: number; keyword?: string; dataType?: string; enabled?: boolean } = {},
  ): Promise<PaginatedResult<DataTag>> {
    const { deviceRepo, dataTagRepo } = await this.getRepos(projectId);
    // 校验设备存在性（复用 findOne 的存在性检查，但不触发模板自动应用副作用）
    const device = await deviceRepo.findOne({ where: { id: deviceId, projectId }, select: ['id'] });
    if (!device) this.err.notFound('error.device.DEV_001', { id: deviceId });

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: FindOptionsWhere<DataTag> = { deviceId };
    if (query.keyword) {
      where.name = Like(`%${query.keyword}%`);
    }
    if (query.dataType) {
      const dataType = Object.values(TagDataType).find((v) => v === query.dataType);
      if (dataType) where.dataType = dataType;
    }
    if (query.enabled !== undefined && query.enabled !== null) {
      where.enabled = query.enabled;
    }

    const skip = (page - 1) * pageSize;
    const [data, total] = await dataTagRepo.findAndCount({
      where,
      skip,
      take: pageSize,
      order: { name: 'ASC' },
    });

    return {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async batchGetLatest(
    projectId: string,
    tagIds: string[],
  ): Promise<Record<string, { value: any; quality: string; timestamp: number }>> {
    const result: Record<string, { value: any; quality: string; timestamp: number }> = {};

    if (this.cacheService) {
      const cached = await this.cacheService.getMany(tagIds);
      cached.forEach((entry, tagId) => {
        result[tagId] = {
          value: entry.value,
          quality: entry.quality,
          timestamp: entry.timestamp,
        };
      });
    }

    for (const tagId of tagIds) {
      if (!result[tagId]) {
        result[tagId] = { value: null, quality: 'unknown', timestamp: Date.now() };
      }
    }

    return result;
  }

  /**
   * 应用设备模板：从模板加载变量定义，实例化为 DataTag
   * 提示词.md 第1条要求：添加设备时需选择设备模板
   */
  async applyTemplate(deviceId: string, templateId: string, projectId: string): Promise<DataTag[]> {
    const { deviceRepo, dataTagRepo } = await this.getRepos(projectId);
    // ⚠️ 使用 deviceRepo.findOne 而非 this.findOne，避免与 findOne 中的自动修复逻辑形成无限递归
    const device = await deviceRepo.findOne({ where: { id: deviceId, projectId } });
    if (!device) {
      this.err.notFound('error.device.DEV_001', { id: deviceId });
    }

    let createdTags: DataTag[] = [];

    if (this.templateLoaderService) {
      const template = this.templateLoaderService.getTemplate(templateId);
      if (!template) {
        this.logger.warn(
          `Template ${templateId} not found in loader cache, applying templateId only. ` +
            `Available templates may not include this ID.`,
        );
      } else if (!template.variables || template.variables.length === 0) {
        this.logger.warn(
          `Template ${templateId} found but has no variables — no tags will be created`,
        );
      } else {
        // 检查已存在的标签，避免重复创建
        const existingTags = await dataTagRepo.find({ where: { deviceId } });
        const existingNames = new Set(existingTags.map((t) => t.name));

        // 过滤掉已存在的标签（同名标签视为已实例化）
        const newVariables = template.variables.filter((v) => !existingNames.has(v.name));
        const skippedCount = template.variables.length - newVariables.length;

        if (newVariables.length > 0) {
          const tagEntities = newVariables.map((v) =>
            dataTagRepo.create({
              name: v.name,
              description: v.description,
              deviceId,
              projectId,
              address: v.address,
              dataType: v.dataType as any,
              retryCount: v.registerCount ?? v.retryCount,
              scanRate: v.scanRate,
              timeout: v.timeout,
              enabled: v.enabled,
              scale: v.scale,
              offset: v.offset,
              decimalPlaces: v.decimalPlaces,
              engMinValue: v.engMinValue,
              engMaxValue: v.engMaxValue,
              conversionType: v.conversionType as any,
              conversionConfig: v.conversionConfig,
              unit: v.unit,
              displayFormat: v.displayFormat,
              minValue: v.minValue,
              maxValue: v.maxValue,
              deadbandMode: v.deadbandMode as any,
              deadbandValue: v.deadbandValue,
              deadbandPercent: v.deadbandPercent,
              deadbandTime: v.deadbandTime,
              alarmEnabled: v.alarmEnabled,
              alarmHighHigh: v.alarmHighHigh,
              alarmHigh: v.alarmHigh,
              alarmLow: v.alarmLow,
              alarmLowLow: v.alarmLowLow,
              alarmDeviation: v.alarmDeviation,
              qualityCheckEnabled: v.qualityCheckEnabled,
              maxAge: v.maxAge,
              archiveEnabled: v.archiveEnabled,
              archiveInterval: v.archiveInterval,
              retentionDays: v.retentionDays,
              category: v.category,
              tags: v.tags,
              direction: v.direction,
              templateVariableGuid: (v as any).guid,
            }),
          );
          createdTags = await dataTagRepo.save(tagEntities);
        }
        this.logger.log(
          `Template ${templateId} applied to device ${deviceId}: ${createdTags.length} created, ${skippedCount} skipped (already exist)`,
        );
      }
    } else {
      this.logger.warn(`TemplateLoaderService not available, templateId saved only`);
    }

    device.templateId = templateId;
    device.templateVersion = this.templateLoaderService?.getTemplate(templateId)?.version;
    device.templateAppliedAt = new Date();
    await deviceRepo.save(device);

    // 通知采集层：设备标签已变更
    if (createdTags.length > 0) {
      this.eventBus?.emit('device.updated', {
        deviceId,
        projectId,
        protocol: device.driver || device.type,
        changedFields: ['tags'],
        changes: {
          tags: { old: '(reloaded)', new: `template: ${templateId} v${device.templateVersion}` },
        },
        timestamp: Date.now(),
      });
    }

    return createdTags;
  }

  async syncTemplateTags(
    deviceId: string,
    templateId: string,
    projectId: string,
  ): Promise<{ updated: number; added: number; removed: number }> {
    const { dataTagRepo } = await this.getRepos(projectId);
    const device = await this.findOne(deviceId, projectId);

    if (!this.templateLoaderService) {
      this.logger.warn(`TemplateLoaderService not available, sync skipped`);
      return { updated: 0, added: 0, removed: 0 };
    }

    const template = this.templateLoaderService.getTemplate(templateId);
    if (!template) {
      this.logger.warn(`Template ${templateId} not found, sync skipped`);
      return { updated: 0, added: 0, removed: 0 };
    }

    const existingTags = await dataTagRepo.find({ where: { deviceId } });
    const existingNameMap = new Map(existingTags.map((t) => [t.name, t]));

    let updated = 0;
    let added = 0;
    let removed = 0;

    // 更新已有 tag 或新增
    for (const v of template.variables) {
      const existing = existingNameMap.get(v.name);
      if (existing) {
        existingNameMap.delete(v.name);
        Object.assign(existing, {
          description: v.description,
          address: v.address,
          dataType: v.dataType,
          retryCount: v.registerCount ?? v.retryCount,
          scanRate: v.scanRate,
          timeout: v.timeout,
          enabled: v.enabled,
          scale: v.scale,
          offset: v.offset,
          decimalPlaces: v.decimalPlaces,
          displayFormat: v.displayFormat,
          unit: v.unit,
          minValue: v.minValue,
          maxValue: v.maxValue,
          engMinValue: v.engMinValue,
          engMaxValue: v.engMaxValue,
          deadbandMode: v.deadbandMode,
          deadbandValue: v.deadbandValue,
          deadbandPercent: v.deadbandPercent,
          deadbandTime: v.deadbandTime,
          conversionType: v.conversionType,
          conversionConfig: v.conversionConfig,
          alarmEnabled: v.alarmEnabled,
          alarmHighHigh: v.alarmHighHigh,
          alarmHigh: v.alarmHigh,
          alarmLow: v.alarmLow,
          alarmLowLow: v.alarmLowLow,
          alarmDeviation: v.alarmDeviation,
          qualityCheckEnabled: v.qualityCheckEnabled,
          maxAge: v.maxAge,
          archiveEnabled: v.archiveEnabled,
          archiveInterval: v.archiveInterval,
          retentionDays: v.retentionDays,
          category: v.category,
          tags: v.tags,
          direction: v.direction,
          templateVariableGuid: (v as any).guid,
        });
        await dataTagRepo.save(existing);
        updated++;
      } else {
        const newTag = dataTagRepo.create({
          name: v.name,
          description: v.description,
          deviceId,
          projectId,
          address: v.address,
          dataType: v.dataType as any,
          retryCount: v.registerCount ?? v.retryCount,
          scanRate: v.scanRate,
          timeout: v.timeout,
          enabled: v.enabled,
          scale: v.scale,
          offset: v.offset,
          decimalPlaces: v.decimalPlaces,
          displayFormat: v.displayFormat,
          unit: v.unit,
          minValue: v.minValue,
          maxValue: v.maxValue,
          engMinValue: v.engMinValue,
          engMaxValue: v.engMaxValue,
          deadbandMode: v.deadbandMode as any,
          deadbandValue: v.deadbandValue,
          deadbandPercent: v.deadbandPercent,
          deadbandTime: v.deadbandTime,
          conversionType: v.conversionType as any,
          conversionConfig: v.conversionConfig,
          alarmEnabled: v.alarmEnabled,
          alarmHighHigh: v.alarmHighHigh,
          alarmHigh: v.alarmHigh,
          alarmLow: v.alarmLow,
          alarmLowLow: v.alarmLowLow,
          alarmDeviation: v.alarmDeviation,
          qualityCheckEnabled: v.qualityCheckEnabled,
          maxAge: v.maxAge,
          archiveEnabled: v.archiveEnabled,
          archiveInterval: v.archiveInterval,
          retentionDays: v.retentionDays,
          category: v.category,
          tags: v.tags,
          direction: v.direction,
          templateVariableGuid: (v as any).guid,
        });
        await dataTagRepo.save(newTag);
        added++;
      }
    }

    // 删除模板中已不存在的 tag（先清理外键依赖记录）
    if (existingNameMap.size > 0) {
      const staleTagIds = Array.from(existingNameMap.values()).map((t) => t.id);
      if (this.dbMode === 'isolated' && this.projectDbService) {
        const ds = await this.projectDbService.getSystemDb(projectId);
        // 删除关联的报警规则（alm_alarm_rules.tagId FK → dev_data_tags.id）
        await ds.query(
          `DELETE FROM alm_alarm_rules WHERE tagId IN (${staleTagIds.map(() => '?').join(',')})`,
          staleTagIds,
        );
        // 清理关联的历史数据（data_historical_data.tagId FK → dev_data_tags.id）
        await ds.query(
          `DELETE FROM data_historical_data WHERE tagId IN (${staleTagIds.map(() => '?').join(',')})`,
          staleTagIds,
        );
      }
      for (const [, tag] of existingNameMap) {
        await dataTagRepo.remove(tag);
        removed++;
      }
    }

    device.templateVersion = template.version;
    device.templateAppliedAt = new Date();
    const { deviceRepo } = await this.getRepos(projectId);
    await deviceRepo.save(device);

    this.logger.log(
      `Template sync for device ${deviceId}: updated=${updated}, added=${added}, removed=${removed}`,
    );
    return { updated, added, removed };
  }

  /**
   * 解绑设备模板：清除 templateId/templateVersion/templateAppliedAt
   * @param deleteTags 是否删除模板生成的 Tag（默认 false，保留已实例化的 Tag）
   */
  async unbindTemplate(
    deviceId: string,
    projectId: string,
    deleteTags = false,
  ): Promise<{ templateId: string | null; tagsDeleted: number }> {
    const { deviceRepo, dataTagRepo } = await this.getRepos(projectId);
    const device = await this.findOne(deviceId, projectId);

    if (!device.templateId) {
      this.err.badRequest('error.device.DEV_001', { id: deviceId });
    }

    const previousTemplateId = device.templateId;
    let tagsDeleted = 0;

    if (deleteTags) {
      const tags = await dataTagRepo.find({ where: { deviceId } });
      if (tags.length > 0) {
        await dataTagRepo.remove(tags);
        tagsDeleted = tags.length;
      }
    }

    device.templateId = null as any;
    device.templateVersion = null as any;
    device.templateAppliedAt = null as any;
    await deviceRepo.save(device);

    this.logger.log(
      `Template unbound for device ${deviceId}: templateId=${previousTemplateId}, tagsDeleted=${tagsDeleted}`,
    );

    return { templateId: previousTemplateId, tagsDeleted };
  }
}
