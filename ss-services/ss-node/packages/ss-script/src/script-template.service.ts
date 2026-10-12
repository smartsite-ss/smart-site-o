// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { StructuredLogger } from '@ss-node/ss-core';
import { ScriptTemplate, TemplateCategory } from './entities/script-template.entity';
import { Script, ScriptStatus, ScriptTriggerType } from './entities/script.entity';
import { ScriptService } from './script.service';
import { CreateScriptTemplateDto, UpdateScriptTemplateDto } from './dto/script-template.dto';

interface TemplateFilter {
  category?: string;
  keyword?: string;
}

interface BuiltinTemplateDef {
  name: string;
  description: string;
  category: TemplateCategory;
  triggerType: ScriptTriggerType;
  triggerConfig: string | null;
  code: string;
  tags: string[];
  author: string;
  version: string;
}

@Injectable()
export class ScriptTemplateService implements OnModuleInit {
  private readonly logger = new StructuredLogger();

  constructor(
    @Inject(getRepositoryToken(ScriptTemplate))
    private readonly templateRepo: Repository<ScriptTemplate>,
    private readonly scriptService: ScriptService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initBuiltinTemplates();
  }

  async initBuiltinTemplates(): Promise<void> {
    const definitions = this.getBuiltinTemplateDefinitions();

    for (const def of definitions) {
      const existing = await this.templateRepo.findOne({
        where: { name: def.name, isBuiltin: true },
      });
      if (!existing) {
        const template = this.templateRepo.create({
          ...def,
          isBuiltin: true,
        });
        await this.templateRepo.save(template);
        this.logger.log(`Registered builtin template: ${def.name}`, ScriptTemplateService.name);
      }
    }
  }

  private getBuiltinTemplateDefinitions(): BuiltinTemplateDef[] {
    return [
      {
        name: '温度单位转换',
        description: '将华氏度转换为摄氏度，适用于 Pipeline 数据转换步骤',
        category: TemplateCategory.DATA_TRANSFORM,
        triggerType: ScriptTriggerType.PIPELINE,
        triggerConfig: null,
        tags: ['temperature', 'transform', 'unit-conversion'],
        author: 'system',
        version: '1.0.0',
        code: `// 温度单位转换：华氏度 → 摄氏度
// 公式: C = (F - 32) * 5 / 9
const fahrenheit = Number(ctx.value);
if (isNaN(fahrenheit)) {
  return null;
}
const celsius = (fahrenheit - 32) * 5 / 9;
return celsius;`,
      },
      {
        name: '设备离线告警',
        description: '检测设备是否离线，当设备超过指定时间未上报数据时触发告警',
        category: TemplateCategory.ALARM_CONDITION,
        triggerType: ScriptTriggerType.EVENT,
        triggerConfig: JSON.stringify({ eventType: 'device.offline' }),
        tags: ['alarm', 'device', 'offline'],
        author: 'system',
        version: '1.0.0',
        code: `// 设备离线告警：检测设备是否离线
// 当设备超过指定时间未上报数据时触发告警
const deviceId = ctx.deviceId;
const lastSeen = ctx.lastSeen;
const timeoutMs = (ctx.config?.timeoutMinutes || 5) * 60 * 1000;

if (!deviceId || !lastSeen) {
  return { alarmed: false, reason: 'missing_data' };
}

const now = Date.now();
const elapsed = now - new Date(lastSeen).getTime();

if (elapsed > timeoutMs) {
  const message = '设备 ' + deviceId + ' 已离线 ' + Math.round(elapsed / 1000 / 60) + ' 分钟';
  await triggerAlarm(deviceId, message, 'critical');
  return { alarmed: true, level: 'critical', message, deviceId };
}

return { alarmed: false, reason: 'online' };`,
      },
      {
        name: '定时数据汇总',
        description: '每小时汇总指定标签的数据，计算最大值、最小值和平均值',
        category: TemplateCategory.REPORT,
        triggerType: ScriptTriggerType.SCHEDULED,
        triggerConfig: JSON.stringify({ cron: '0 * * * *' }),
        tags: ['report', 'summary', 'hourly'],
        author: 'system',
        version: '1.0.0',
        code: `// 定时数据汇总：每小时汇总指定标签的数据
// 触发方式: Cron "0 * * * *" (每小时整点)
const tagIds = ctx.tagIds || [];
const now = new Date();
const periodStart = new Date(now.getTime() - 60 * 60 * 1000);

const summary = {
  period: { start: periodStart.toISOString(), end: now.toISOString() },
  tags: [],
};

for (const tagId of tagIds) {
  const data = await readTagHistory(tagId, periodStart, now);
  if (data && data.length > 0) {
    const values = data.map(d => Number(d.value)).filter(v => !isNaN(v));
    if (values.length > 0) {
      summary.tags.push({
        tagId,
        count: values.length,
        min: Math.min.apply(null, values),
        max: Math.max.apply(null, values),
        avg: values.reduce(function(a, b) { return a + b; }, 0) / values.length,
      });
    }
  }
}

log('info', '数据汇总完成: ' + JSON.stringify(summary));
return summary;`,
      },
      {
        name: '数据质量检查',
        description: '检查数据是否在合理范围内，支持范围检查和变化率检查',
        category: TemplateCategory.DATA_TRANSFORM,
        triggerType: ScriptTriggerType.PIPELINE,
        triggerConfig: null,
        tags: ['quality', 'validation', 'range-check'],
        author: 'system',
        version: '1.0.0',
        code: `// 数据质量检查：检查数据是否在合理范围内
// 超出范围的数据标记为无效
const value = Number(ctx.value);
const config = ctx.config || {};
const minValue = config.minValue !== undefined ? config.minValue : -Infinity;
const maxValue = config.maxValue !== undefined ? config.maxValue : Infinity;
const maxChangeRate = config.maxChangeRate !== undefined ? config.maxChangeRate : Infinity;
const previousValue = ctx.previousValue !== undefined ? Number(ctx.previousValue) : null;
const elapsedSeconds = ctx.elapsedSeconds || 0;

if (isNaN(value)) {
  return { valid: false, reason: 'not_a_number' };
}

if (value < minValue || value > maxValue) {
  return { valid: false, reason: 'out_of_range', value: value, min: minValue, max: maxValue };
}

if (previousValue !== null && !isNaN(previousValue) && elapsedSeconds > 0) {
  const changeRate = Math.abs(value - previousValue) / elapsedSeconds;
  if (changeRate > maxChangeRate) {
    return { valid: false, reason: 'change_rate_exceeded', changeRate: changeRate, maxChangeRate: maxChangeRate };
  }
}

return { valid: true, value: value };`,
      },
    ];
  }

  async listTemplates(filter?: TemplateFilter): Promise<ScriptTemplate[]> {
    const where: Record<string, unknown> = {};
    if (filter?.category) {
      where.category = filter.category as TemplateCategory;
    }
    if (filter?.keyword) {
      where.name = Like(`%${filter.keyword}%`);
    }
    return this.templateRepo.find({
      where,
      order: { isBuiltin: 'DESC', createdAt: 'DESC' },
    });
  }

  async getTemplate(id: string): Promise<ScriptTemplate | null> {
    return this.templateRepo.findOne({ where: { id } });
  }

  async createTemplate(dto: CreateScriptTemplateDto): Promise<ScriptTemplate> {
    const template = this.templateRepo.create({
      ...dto,
      isBuiltin: false,
    });
    const saved = await this.templateRepo.save(template);
    this.logger.log(`Created template: ${dto.name}`, ScriptTemplateService.name);
    return saved;
  }

  async updateTemplate(id: string, dto: UpdateScriptTemplateDto): Promise<ScriptTemplate> {
    const template = await this.getTemplate(id);
    if (!template) {
      throw new NotFoundException(`Template with id "${id}" not found`);
    }
    if (template.isBuiltin) {
      throw new BadRequestException('Built-in templates cannot be modified');
    }
    Object.assign(template, dto);
    const saved = await this.templateRepo.save(template);
    this.logger.log(`Updated template: ${saved.name}`, ScriptTemplateService.name);
    return saved;
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = await this.getTemplate(id);
    if (!template) {
      throw new NotFoundException(`Template with id "${id}" not found`);
    }
    if (template.isBuiltin) {
      throw new BadRequestException('Built-in templates cannot be deleted');
    }
    await this.templateRepo.remove(template);
    this.logger.log(`Deleted template: ${template.name}`, ScriptTemplateService.name);
  }

  async instantiateTemplate(id: string, name: string, projectId: string): Promise<Script> {
    const template = await this.getTemplate(id);
    if (!template) {
      throw new NotFoundException(`Template with id "${id}" not found`);
    }

    this.logger.log(
      `Instantiating template "${template.name}" as script "${name}"`,
      ScriptTemplateService.name,
    );

    return this.scriptService.create({
      name,
      description: template.description,
      code: template.code,
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig,
      projectId,
      status: ScriptStatus.DRAFT,
    });
  }
}
