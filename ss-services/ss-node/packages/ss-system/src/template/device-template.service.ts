// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository, In, Not, IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TemplateStatus } from '../enums/template-status.enum';
import { CreateDeviceTemplateDto } from '../dto/create-device-template.dto';
import { UpdateDeviceTemplateDto } from '../dto/update-device-template.dto';
import { ApplyTemplateDto } from '../dto/apply-template.dto';
import { SyncTemplateDto } from '../dto/sync-template.dto';
import { PaginationDto, PaginatedResult } from '@ss-node/ss-sdk';
import { Device } from '@ss-node/ss-device/entities/device.entity';
import {
  DataTag,
  TagDataType,
  ConversionType,
  DeadbandMode,
} from '@ss-node/ss-device/entities/data-tag.entity';
import { TemplateLoaderService, LoadedTemplate } from './template-loader.service';
import { TemplateIndexService } from './template-index.service';
import { EventBusService, ProjectDatabaseService } from '@ss-node/ss-core';
import type { TemplateDevicesSyncedEvent } from '@ss-node/ss-core';

export interface ApplyResult {
  deviceId: string;
  templateVersion: string;
  created: number;
  skipped: number;
  errors: Array<{ name: string; message: string }>;
}

export interface SyncResult {
  totalDevices: number;
  synced: number;
  skipped: number;
  errors: Array<{ deviceId: string; message: string }>;
}

/** JSON 文件模板格式（与 data/templates/ 中的文件格式一致） */
export interface TemplateJsonFile {
  schemaVersion: string;
  templateType: string;
  id: string;
  name: string;
  description: string;
  deviceType: string;
  deviceModel: string;
  version: string;
  status: string;
  isDefault: boolean;
  authorId: string;
  tags: string[];
  industry: string;
  category: string;
  protocol: { type: string; config: Record<string, any> };
  variables: any[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    linkedDevices: number;
    usageCount: number;
    rating: number;
  };
}

/** 返回给控制器的模板对象格式（兼容旧的 DeviceTagTemplate 接口） */
export interface TemplateResponse {
  id: string;
  name: string;
  description: string;
  deviceType: string;
  industry?: string;
  category?: string;
  version: string;
  status: TemplateStatus;
  isDefault: boolean;
  variables: any[];
  authorId: string;
  tags: string[];
  linkedDevices: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DeviceTemplateService {
  private readonly logger = new Logger(DeviceTemplateService.name);
  private readonly templatesDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectDbService: ProjectDatabaseService,
    private readonly templateLoader: TemplateLoaderService,
    private readonly indexService: TemplateIndexService,
    @Optional() private readonly eventBus?: EventBusService,
  ) {
    this.templatesDir = this.indexService.getBasePath();
  }

  // ===== 项目库访问助手 =====

  /** 获取项目级 DataTag Repository（读写项目库 system.db） */
  private async getTagRepo(projectId: string): Promise<Repository<DataTag>> {
    const ds = await this.projectDbService.getSystemDb(projectId);
    return ds.getRepository(DataTag);
  }

  /** 获取项目级 Device Repository（读写项目库 system.db） */
  private async getDeviceRepo(projectId: string): Promise<Repository<Device>> {
    const ds = await this.projectDbService.getSystemDb(projectId);
    return ds.getRepository(Device);
  }

  /** 解析 PROJECTS_DIR 为绝对路径 */
  private resolveProjectsDir(): string {
    const rawDir = this.configService.get<string>('PROJECTS_DIR') || path.join('data', 'projects');
    if (path.isAbsolute(rawDir)) return rawDir;
    const projectRoot =
      process.env.NODE_ENV === 'production'
        ? process.cwd()
        : path.resolve(__dirname, '..', '..', '..', '..');
    return path.resolve(projectRoot, rawDir);
  }

  /** 发现所有项目名称（扫描项目目录） */
  private discoverProjects(): string[] {
    const dir = this.resolveProjectsDir();
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  }

  /** 按 projectId + deviceId 在项目库中查找设备 */
  private async findDeviceInProject(projectId: string, deviceId: string): Promise<Device | null> {
    const repo = await this.getDeviceRepo(projectId);
    return repo.findOne({ where: { id: deviceId } });
  }

  /** 跨项目查找：按 templateId 查找所有关联设备 */
  private async findDevicesByTemplateId(templateId: string): Promise<Device[]> {
    const projects = this.discoverProjects();
    const results: Device[] = [];
    for (const projectId of projects) {
      try {
        const repo = await this.getDeviceRepo(projectId);
        const devices = await repo.find({ where: { templateId } });
        results.push(...devices);
      } catch {
        // 跳过无法连接的 project DB
      }
    }
    return results;
  }

  /** 跨项目查找：按 deviceIds + projectId 查找设备 */
  private async findDevicesByIds(projectId: string, deviceIds: string[]): Promise<Device[]> {
    const repo = await this.getDeviceRepo(projectId);
    return repo.find({ where: { id: In(deviceIds) } });
  }

  // ===== JSON 文件操作助手 =====

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private generateId(): string {
    return 'tpl-' + crypto.randomUUID().substring(0, 12);
  }

  /**
   * 从 LoadedTemplate 转换为 TemplateResponse
   */
  private loadedToResponse(loaded: LoadedTemplate): TemplateResponse {
    return {
      id: loaded.id,
      name: loaded.name,
      description: loaded.description || '',
      deviceType: loaded.deviceType,
      industry: loaded.industry || '',
      category: loaded.category || '',
      version: loaded.version,
      status: loaded.status as TemplateStatus,
      isDefault: loaded.isDefault,
      variables: loaded.variables || [],
      authorId: 'system',
      tags: loaded.tags || [],
      linkedDevices: 0,
      createdAt: new Date(loaded.createdAt || Date.now()),
      updatedAt: new Date(loaded.updatedAt || Date.now()),
    };
  }

  /**
   * 从 TemplateResponse 转换为 JSON 文件格式
   */
  private responseToJson(template: TemplateResponse): TemplateJsonFile {
    return {
      schemaVersion: '1.0',
      templateType: 'device_tag_template',
      id: template.id,
      name: template.name,
      description: template.description || '',
      deviceType: template.deviceType,
      deviceModel: template.deviceType,
      version: template.version,
      status: template.status,
      isDefault: template.isDefault ?? false,
      authorId: template.authorId || 'system',
      tags: template.tags || [],
      industry: template.industry || '自定义模板',
      category: template.category || '通用',
      protocol: { type: template.deviceType, config: {} },
      variables: template.variables || [],
      metadata: {
        createdAt: template.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        linkedDevices: template.linkedDevices || 0,
        usageCount: 0,
        rating: 0,
      },
    };
  }

  /**
   * 写入模板 JSON 文件（原子写入：先写临时文件再重命名）
   */
  private writeTemplateFile(template: TemplateResponse, locale?: string): void {
    const jsonData = this.responseToJson(template);
    const lang = locale || this.templateLoader.resolveLocale();
    const langDir = path.join(this.templatesDir, lang);
    const industryDir = path.join(langDir, jsonData.industry);
    const categoryDir = path.join(industryDir, jsonData.category);
    this.ensureDir(categoryDir);

    const filePath = path.join(categoryDir, `${template.id}.json`);
    const tmpPath = filePath + '.tmp';

    fs.writeFileSync(tmpPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
    this.logger.log(`模板 JSON 文件已写入: ${filePath}`);
  }

  /**
   * 删除模板 JSON 文件
   */
  private deleteTemplateFile(id: string): void {
    const loaded = this.templateLoader.getTemplate(id);
    if (loaded?.filePath && fs.existsSync(loaded.filePath)) {
      fs.unlinkSync(loaded.filePath);
      this.logger.log(`模板 JSON 文件已删除: ${loaded.filePath}`);
    }
  }

  /**
   * 写操作后刷新索引和缓存
   */
  private async refreshAfterWrite(): Promise<void> {
    this.indexService.rebuildIndex();
    await this.templateLoader.reload();
  }

  /**
   * 检查模板名称是否已存在
   */
  private checkNameExists(name: string, excludeId?: string): boolean {
    const allTemplates = this.templateLoader.getAllTemplates();
    return allTemplates.some((t) => t.name === name && t.id !== excludeId);
  }

  // ===== 模板 CRUD =====

  async create(dto: CreateDeviceTemplateDto, authorId: string): Promise<TemplateResponse> {
    if (this.checkNameExists(dto.name)) {
      throw new BadRequestException('模板名称已存在');
    }

    const now = new Date();
    const template: TemplateResponse = {
      id: this.generateId(),
      name: dto.name,
      description: dto.description || '',
      deviceType: dto.deviceType,
      industry: dto.industry || '',
      category: dto.category || '',
      version: dto.version || '1.0',
      status: TemplateStatus.DRAFT,
      isDefault: false,
      variables: dto.variables || [],
      authorId: authorId || 'system',
      tags: dto.tags || [],
      linkedDevices: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.writeTemplateFile(template);
    await this.refreshAfterWrite();

    return template;
  }

  async findAll(
    query?: PaginationDto & {
      deviceType?: string;
      status?: string;
      keyword?: string;
      locale?: string;
    },
  ): Promise<PaginatedResult<TemplateResponse>> {
    let templates = this.templateLoader
      .getAllTemplates(query?.locale)
      .map((t) => this.loadedToResponse(t));

    // 过滤
    if (query?.deviceType) {
      templates = templates.filter((t) => t.deviceType === query.deviceType);
    }
    if (query?.status) {
      templates = templates.filter((t) => t.status === query.status);
    }
    if (query?.keyword) {
      const kw = query.keyword.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(kw) || (t.description || '').toLowerCase().includes(kw),
      );
    }

    // 排序（按更新时间倒序）
    templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // 分页
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const total = templates.length;
    const start = (page - 1) * pageSize;
    const data = templates.slice(start, start + pageSize);

    return {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findById(id: string, locale?: string): Promise<TemplateResponse> {
    const loaded = this.templateLoader.getTemplate(id, locale);
    if (!loaded) {
      throw new NotFoundException('设备采集变量模板不存在');
    }
    return this.loadedToResponse(loaded);
  }

  async getLinkedDevices(id: string): Promise<Device[]> {
    await this.findById(id);
    return this.findDevicesByTemplateId(id);
  }

  async update(id: string, dto: UpdateDeviceTemplateDto, locale?: string): Promise<TemplateResponse> {
    const template = await this.findById(id, locale);

    if (dto.name !== undefined && dto.name !== template.name) {
      if (this.checkNameExists(dto.name, id)) {
        throw new BadRequestException('模板名称已存在');
      }
    }

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.industry !== undefined) template.industry = dto.industry;
    if (dto.category !== undefined) template.category = dto.category;
    if (dto.tags !== undefined) template.tags = dto.tags;
    if (dto.isDefault !== undefined) template.isDefault = dto.isDefault;
    if (dto.status !== undefined) template.status = dto.status;
    if (dto.variables !== undefined) template.variables = dto.variables;
    if (dto.deviceType !== undefined) template.deviceType = dto.deviceType;
    if (dto.version !== undefined) template.version = dto.version;
    template.updatedAt = new Date();

    this.writeTemplateFile(template, locale);
    await this.refreshAfterWrite();

    return template;
  }

  async remove(id: string): Promise<void> {
    const _template = await this.findById(id);

    const devices = await this.findDevicesByTemplateId(id);
    if (devices.length > 0) {
      throw new BadRequestException('模板已关联设备，无法删除（请先解绑或弃用）');
    }

    this.deleteTemplateFile(id);
    await this.refreshAfterWrite();
  }

  async publish(id: string): Promise<TemplateResponse> {
    const template = await this.findById(id);
    if (template.status === TemplateStatus.PUBLISHED) {
      throw new BadRequestException('模板已发布，不可重复发布');
    }
    if (!template.variables || template.variables.length === 0) {
      throw new BadRequestException('模板没有变量定义，无法发布');
    }
    template.status = TemplateStatus.PUBLISHED;
    template.updatedAt = new Date();

    this.writeTemplateFile(template);
    await this.refreshAfterWrite();

    return template;
  }

  async deprecate(id: string): Promise<TemplateResponse> {
    const template = await this.findById(id);
    if (template.status === TemplateStatus.DEPRECATED) {
      throw new BadRequestException('模板已弃用');
    }
    template.status = TemplateStatus.DEPRECATED;
    template.updatedAt = new Date();

    this.writeTemplateFile(template);
    await this.refreshAfterWrite();

    return template;
  }

  async clone(id: string, authorId: string): Promise<TemplateResponse> {
    const source = await this.findById(id);

    const versionParts = (source.version || '1.0').split('.');
    versionParts[1] = String(Number(versionParts[1] || 0) + 1);
    const newVersion = versionParts.join('.');

    const now = new Date();
    const cloned: TemplateResponse = {
      id: this.generateId(),
      name: `${source.name} (v${newVersion})`,
      description: source.description,
      deviceType: source.deviceType,
      version: newVersion,
      status: TemplateStatus.DRAFT,
      isDefault: false,
      variables: JSON.parse(JSON.stringify(source.variables)),
      authorId,
      tags: [...(source.tags || [])],
      linkedDevices: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.writeTemplateFile(cloned);
    await this.refreshAfterWrite();

    return cloned;
  }

  // ===== 模板应用/同步（仍使用数据库） =====

  async apply(templateId: string, dto: ApplyTemplateDto): Promise<ApplyResult> {
    const template = await this.findById(templateId);
    if (template.status === TemplateStatus.DEPRECATED) {
      throw new BadRequestException('已弃用的模板无法应用');
    }

    const deviceRepo = await this.getDeviceRepo(dto.projectId);
    const tagRepo = await this.getTagRepo(dto.projectId);

    const device = await deviceRepo.findOne({
      where: { id: dto.deviceId },
    });
    if (!device) {
      throw new NotFoundException('设备不存在');
    }

    if (device.type !== template.deviceType) {
      throw new BadRequestException('模板设备类型与目标设备不匹配');
    }

    if (device.templateId && device.templateId !== templateId) {
      throw new BadRequestException('设备已关联其他模板，请先解绑');
    }

    const result: ApplyResult = {
      deviceId: dto.deviceId,
      templateVersion: template.version,
      created: 0,
      skipped: 0,
      errors: [],
    };

    const existingTags = await tagRepo.find({
      where: { deviceId: dto.deviceId },
    });

    const variables = template.variables || [];

    for (const v of variables) {
      try {
        const existing = existingTags.find((t) => t.name === v.name || t.address === v.address);

        if (existing) {
          if (dto.replaceExisting) {
            await tagRepo.delete(existing.id);
          } else {
            result.skipped++;
            continue;
          }
        }

        const tag = tagRepo.create({
          name: v.name,
          description: v.description,
          address: v.address,
          dataType: (v.dataType as TagDataType) ?? TagDataType.FLOAT32,
          deviceId: dto.deviceId,
          projectId: device.projectId,
          scanRate: v.scanRate ?? 1000,
          timeout: v.timeout ?? 5000,
          retryCount: v.retryCount ?? 3,
          priority: Number(v.priority) || 0,
          enabled: v.enabled ?? true,
          scale: v.scale ?? 1.0,
          offset: v.offset ?? 0.0,
          conversionType: (v.conversionType as ConversionType) ?? ConversionType.NONE,
          conversionConfig: v.conversionConfig,
          unit: v.unit ?? '',
          displayFormat: v.displayFormat,
          minValue: v.minValue,
          maxValue: v.maxValue,
          engMinValue: v.engMinValue,
          engMaxValue: v.engMaxValue,
          deadbandMode: (v.deadbandMode as DeadbandMode) ?? DeadbandMode.NONE,
          deadbandValue: v.deadbandValue ?? 0,
          deadbandPercent: v.deadbandPercent ?? 0,
          deadbandTime: v.deadbandTime ?? 0,
          alarmEnabled: v.alarmEnabled ?? false,
          alarmHighHigh: v.alarmHighHigh,
          alarmHigh: v.alarmHigh,
          alarmLow: v.alarmLow,
          alarmLowLow: v.alarmLowLow,
          alarmDeviation: v.alarmDeviation,
          qualityCheckEnabled: v.qualityCheckEnabled ?? false,
          maxAge: v.maxAge ?? 30000,
          archiveEnabled: v.archiveEnabled ?? false,
          archiveInterval: v.archiveInterval ?? 60000,
          retentionDays: v.retentionDays ?? 90,
          category: v.category ?? 'AI',
          tags: v.tags ?? [],
          direction: v.direction,
          templateVariableGuid: v.guid,
        });

        await tagRepo.save(tag);
        result.created++;
      } catch (e: any) {
        result.errors.push({ name: v.name, message: e.message });
      }
    }

    device.templateId = templateId;
    device.templateVersion = template.version;
    await deviceRepo.save(device);

    return result;
  }

  async getAllTags(): Promise<string[]> {
    const templates = this.templateLoader.getAllTemplates();
    const tagSet = new Set<string>();
    for (const tpl of templates) {
      for (const tag of tpl.tags || []) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }

  /**
   * ★ 存量迁移：按 templateId + name 匹配回填已有标签的 templateVariableGuid
   *
   * 背景：引入 GUID 前创建的标签 templateVariableGuid 为 NULL，
   * sync() 使用 Not(IsNull()) 过滤，这些存量标签会被排除在外。
   * 此方法通过 name 匹配模板变量，为存量标签补填 GUID。
   *
   * 幂等性：已填过 GUID 的标签会被跳过（只更新 templateVariableGuid IS NULL 的标签）
   *
   * @param options.dryRun 仅统计不执行写入（默认 false）
   * @param options.templateId 仅迁移指定模板关联的设备（不传则全量迁移）
   */
  async migrateTemplateGuids(options?: {
    templateId?: string;
    dryRun?: boolean;
  }): Promise<{
    totalDevices: number;
    totalTags: number;
    matched: number;
    skipped: number;
    errors: Array<{ deviceId: string; tagName: string; message: string }>;
  }> {
    const dryRun = options?.dryRun ?? false;

    // 跨项目查找设备
    let devices: Device[];
    if (options?.templateId) {
      devices = await this.findDevicesByTemplateId(options.templateId);
    } else {
      const projects = this.discoverProjects();
      devices = [];
      for (const projectId of projects) {
        try {
          const repo = await this.getDeviceRepo(projectId);
          const page = await repo.find({ where: { templateId: Not(IsNull()) as any } });
          devices.push(...page);
        } catch { /* skip inaccessible projects */ }
      }
    }
    if (devices.length === 0) {
      this.logger.log('存量迁移：没有需要迁移的设备');
      return { totalDevices: 0, totalTags: 0, matched: 0, skipped: 0, errors: [] };
    }

    let totalTags = 0;
    let matched = 0;
    let skipped = 0;
    const errors: Array<{ deviceId: string; tagName: string; message: string }> = [];

    for (const device of devices) {
      try {
        if (!device.templateId) continue;

        let template: LoadedTemplate;
        try {
          template = this.templateLoader.getTemplate(device.templateId);
        } catch {
          errors.push({
            deviceId: device.id,
            tagName: '-',
            message: `模板 ${device.templateId} 未找到，跳过设备`,
          });
          skipped++;
          continue;
        }
        if (!template || !template.variables?.length) {
          skipped++;
          continue;
        }

        const variablesByName = new Map<string, string>();
        const duplicates = new Set<string>();
        for (const v of template.variables) {
          if (!v.guid || !v.name) continue;
          if (variablesByName.has(v.name)) {
            duplicates.add(v.name);
          } else {
            variablesByName.set(v.name, v.guid);
          }
        }
        for (const dup of duplicates) {
          variablesByName.delete(dup);
          this.logger.warn(
            `模板 ${template.id}: 变量 "${dup}" 存在重名，跳过 name→GUID 匹配`,
          );
        }

        const tagRepo = await this.getTagRepo(device.projectId);
        const nullTags = await tagRepo.find({
          where: { deviceId: device.id, templateVariableGuid: IsNull() },
        });
        totalTags += nullTags.length;

        if (nullTags.length === 0) continue;

        for (const tag of nullTags) {
          const guid = variablesByName.get(tag.name);
          if (guid) {
            if (!dryRun) {
              tag.templateVariableGuid = guid;
              await tagRepo.save(tag);
            }
            matched++;
          } else {
            this.logger.debug(
              `标签 "${tag.name}"(设备 ${device.deviceName}) 在模板变量中未找到同名匹配，跳过`,
            );
          }
        }
      } catch (e: any) {
        errors.push({
          deviceId: device.id,
          tagName: '-',
          message: e.message,
        });
      }
    }

    const logMsg = dryRun ? '[DRY RUN] ' : '';
    this.logger.log(
      `${logMsg}存量迁移完成: ${devices.length} 设备, ${totalTags} 标签, ` +
        `匹配 ${matched}, 跳过 ${skipped} 设备, 错误 ${errors.length}`,
    );

    return { totalDevices: devices.length, totalTags, matched, skipped, errors };
  }

  async sync(templateId: string, dto: SyncTemplateDto): Promise<SyncResult> {
    const template = await this.findById(templateId);

    let devices: Device[];
    if (dto.deviceIds?.length) {
      if (!dto.projectId) {
        throw new BadRequestException('指定 deviceIds 时必须同时提供 projectId');
      }
      devices = await this.findDevicesByIds(dto.projectId, dto.deviceIds);
    } else if (dto.projectId) {
      const repo = await this.getDeviceRepo(dto.projectId);
      devices = await repo.find({ where: { templateId } });
    } else {
      devices = await this.findDevicesByTemplateId(templateId);
    }

    const result: SyncResult = {
      totalDevices: devices.length,
      synced: 0,
      skipped: 0,
      errors: [],
    };

    const variables = template.variables || [];
    const templateGuids = new Set(variables.map((v) => v.guid));
    const affectedByProject = new Map<string, string[]>();

    for (const device of devices) {
      try {
        const tagRepo = await this.getTagRepo(device.projectId);
        const deviceRepo = await this.getDeviceRepo(device.projectId);

        const existingTags = await tagRepo.find({
          where: { deviceId: device.id, templateVariableGuid: Not(IsNull()) },
        });
        const existingByGuid = new Map(
          existingTags.map((t) => [t.templateVariableGuid, t]),
        );

        let added = 0;
        let updated = 0;

        for (const v of variables) {
          const existing = existingByGuid.get(v.guid);

          if (existing) {
            if (dto.forceOverwrite) {
              Object.assign(existing, {
                name: v.name,
                description: v.description,
                address: v.address,
                dataType: (v.dataType as TagDataType) ?? TagDataType.FLOAT32,
                direction: v.direction,
                scanRate: v.scanRate ?? 1000,
                scale: v.scale ?? 1.0,
                offset: v.offset ?? 0.0,
                conversionType: (v.conversionType as ConversionType) ?? ConversionType.NONE,
                unit: v.unit ?? '',
                displayFormat: v.displayFormat,
                minValue: v.minValue,
                maxValue: v.maxValue,
                deadbandMode: (v.deadbandMode as DeadbandMode) ?? DeadbandMode.NONE,
                alarmHighHigh: v.alarmHighHigh,
                alarmHigh: v.alarmHigh,
                alarmLow: v.alarmLow,
                alarmLowLow: v.alarmLowLow,
                enabled: v.enabled ?? true,
              });
              await tagRepo.save(existing);
              updated++;
            }
          } else {
            const tag = tagRepo.create({
              name: v.name,
              description: v.description,
              address: v.address,
              dataType: (v.dataType as TagDataType) ?? TagDataType.FLOAT32,
              deviceId: device.id,
              projectId: device.projectId,
              enabled: v.enabled ?? true,
              scanRate: v.scanRate ?? 1000,
              direction: v.direction,
              templateVariableGuid: v.guid,
            });
            await tagRepo.save(tag);
            added++;
          }
        }

        const orphans = existingTags.filter(
          (t) => !templateGuids.has(t.templateVariableGuid!),
        );
        if (orphans.length > 0) {
          await tagRepo.remove(orphans);
        }

        device.templateVersion = template.version;
        await deviceRepo.save(device);

        if (!affectedByProject.has(device.projectId)) {
          affectedByProject.set(device.projectId, []);
        }
        affectedByProject.get(device.projectId)!.push(device.id);

        result.synced++;
      } catch (e: any) {
        result.errors.push({ deviceId: device.id, message: e.message });
      }
    }

    for (const [projectId, deviceIds] of affectedByProject) {
      this.eventBus?.emit('template.devices-synced', {
        templateId,
        deviceIds,
        projectId,
        protocol: devices[0]?.driver || devices[0]?.type,
        changeType: 'template_sync',
        timestamp: Date.now(),
      } as TemplateDevicesSyncedEvent);
    }

    return result;
  }
}
