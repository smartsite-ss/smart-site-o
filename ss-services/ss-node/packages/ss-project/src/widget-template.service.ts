// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Widget Template Service（组件模板服务）
 *
 * 与 CanvasTemplateService（页面模板）保持完全一致的存储与返回结构，
 * 但面向"画布内可复用图元零件库"——组件模板包装一个 Graphics 数组
 * （通常是一个 GroupGraphic，内部含多图元）并携带 `variables` 占位符。
 *
 * 存储布局：
 *   {systemDir}/widget-templates/{id}.json        # 完整数据（含 graphics + variables）
 *   {systemDir}/widget-templates/{id}_meta.json   # 元数据（列表用，不含 graphics）
 *   {projectDir}/{projectId}/canvas/widget-templates/{id}.json     # 项目级
 *   {projectDir}/{projectId}/canvas/widget-templates/{id}_meta.json
 *
 * 内置组件模板通过 seedBuiltinWidgetTemplates() 在 onModuleInit 时落地。
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';
// Node 内置 crypto 生成 v4 UUID，替代外部 uuid 依赖（uuid 包类型文件在本机 pnpm store 中残缺）
import { randomUUID as uuidv4 } from 'node:crypto';

/** 组件模板内的变量定义 */
export interface WidgetTemplateVariable {
  key: string; // 占位符键，如 "title"
  label: string; // 展示名
  type: 'text' | 'number' | 'color' | 'bind-tag';
  defaultValue?: string | number;
  targetPath?: string; // 注入目标，如 "graphics[0].props.text"
}

/** 组件模板完整数据结构 */
export interface WidgetTemplateData {
  id: string;
  name: string;
  description?: string;
  category: string;
  author: string;
  source: 'builtin' | 'user' | 'market';
  thumbnail?: string;
  createdAt?: string;
  updatedAt?: string;
  schemaVersion: number;
  graphics: any[]; // IGraphicJSON[]
  variables: WidgetTemplateVariable[];
  tags?: string[];
}

/** 组件模板元数据（列表返回，排除 graphics 与 variables 以减轻体积） */
export interface WidgetTemplateMeta {
  id: string;
  name: string;
  description?: string;
  category: string;
  author: string;
  source: 'builtin' | 'user' | 'market';
  thumbnail?: string;
  createdAt?: string;
  updatedAt?: string;
  schemaVersion: number;
  hasVariables: boolean;
  variableCount: number;
  tags?: string[];
}

export interface WidgetTemplateListResult {
  success: boolean;
  data: WidgetTemplateMeta[];
  source: 'fs' | 'fallback';
}

export interface WidgetTemplateReadResult {
  success: boolean;
  data: WidgetTemplateData;
  source: 'fs';
}

export interface WidgetTemplateWriteResult {
  success: boolean;
  data: WidgetTemplateMeta;
  message: string;
}

export interface WidgetTemplateDeleteResult {
  success: boolean;
  message: string;
}

const SCHEMA_VERSION = 2;
const WIDGET_TYPE = 'both'; // 组件模板同时支持内置/用户/项目级

/** 预置内置组件模板 */
const BUILTIN_WIDGET_TEMPLATES: WidgetTemplateData[] = [
  {
    id: 'sys-water-tank',
    name: '水位储罐',
    description: '带标题与水位指示的储罐组件，支持 {{title}} 与 {{level}} 变量',
    category: 'industry',
    author: 'system',
    source: 'builtin',
    schemaVersion: SCHEMA_VERSION,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    graphics: [
      {
        type: 'group',
        id: 'g',
        name: '水位储罐组',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        children: [
          {
            type: 'rect',
            id: 'tank',
            x: 40,
            y: 20,
            width: 120,
            height: 160,
            props: { fill: '#cfe8ff', stroke: '#3a7bd5' },
          },
          {
            type: 'text',
            id: 'title',
            x: 40,
            y: 4,
            width: 120,
            height: 20,
            props: { text: '{{title}}', fontSize: 14 },
          },
          {
            type: 'text',
            id: 'level',
            x: 40,
            y: 184,
            width: 120,
            height: 16,
            props: { text: '水位: {{level}}%', fontSize: 12 },
          },
        ],
      },
    ],
    variables: [
      { key: 'title', label: '标题', type: 'text', defaultValue: '储罐' },
      { key: 'level', label: '水位百分比', type: 'number', defaultValue: 50 },
    ],
    tags: ['储罐', '水位'],
  },
  {
    id: 'sys-status-lamp',
    name: '状态指示灯',
    description: '带标签的状态指示灯，支持 {{label}} 与 {{color}} 变量',
    category: 'common',
    author: 'system',
    source: 'builtin',
    schemaVersion: SCHEMA_VERSION,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    graphics: [
      {
        type: 'group',
        id: 'g',
        name: '状态灯组',
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        children: [
          {
            type: 'circle',
            id: 'lamp',
            x: 8,
            y: 8,
            width: 24,
            height: 24,
            props: { fill: '{{color}}', stroke: '#333' },
          },
          {
            type: 'text',
            id: 'label',
            x: 40,
            y: 12,
            width: 56,
            height: 16,
            props: { text: '{{label}}', fontSize: 13 },
          },
        ],
      },
    ],
    variables: [
      { key: 'label', label: '标签', type: 'text', defaultValue: '运行' },
      { key: 'color', label: '指示灯颜色', type: 'color', defaultValue: '#22c55e' },
    ],
    tags: ['指示灯', '状态'],
  },
];

@Injectable()
export class WidgetTemplateService {
  private readonly logger = new Logger(WidgetTemplateService.name);
  private readonly systemDir: string;
  private readonly projectDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly pathResolver: PathResolverService,
  ) {
    this.systemDir = this.pathResolver.resolve(
      this.configService.get<string>('WIDGET_TEMPLATES_DIR') || './data/templates',
    );
    this.projectDir = this.pathResolver.resolve(
      this.configService.get<string>('PROJECTS_DIR') || './data/projects',
    );
  }

  onModuleInit(): void {
    this.logger.log('WidgetTemplateService initializing...');
    this.seedBuiltinWidgetTemplates();
  }

  // ─── 路径解析 ───

  private getDirs(projectId?: string): { base: string; meta: string } {
    const base = projectId
      ? path.join(this.projectDir, projectId, 'canvas', 'widget-templates')
      : path.join(this.systemDir, 'widget-templates');
    return { base, meta: base };
  }

  private getDataPath(id: string, projectId?: string): string {
    return path.join(this.getDirs(projectId).base, `${id}.json`);
  }

  private getMetaPath(id: string, projectId?: string): string {
    return path.join(this.getDirs(projectId).base, `${id}_meta.json`);
  }

  private readJSON<T>(filePath: string): T | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`读取 JSON 失败: ${filePath} - ${(err as Error).message}`);
      return null;
    }
  }

  // ─── 内置模板种子 ───

  private seedBuiltinWidgetTemplates(): void {
    const { base } = this.getDirs();
    try {
      fs.mkdirSync(base, { recursive: true });
      for (const tpl of BUILTIN_WIDGET_TEMPLATES) {
        const dataPath = this.getDataPath(tpl.id);
        const metaPath = this.getMetaPath(tpl.id);
        const dataExists = fs.existsSync(dataPath);
        const metaExists = fs.existsSync(metaPath);
        if (!dataExists) {
          fs.writeFileSync(dataPath, JSON.stringify(tpl, null, 2), 'utf-8');
        }
        if (!metaExists) {
          fs.writeFileSync(
            metaPath,
            JSON.stringify(this.toMeta(tpl), null, 2),
            'utf-8',
          );
        }
      }
      this.logger.log(`已确保 ${BUILTIN_WIDGET_TEMPLATES.length} 个内置组件模板存在`);
    } catch (err) {
      this.logger.error(`种子组件模板失败: ${(err as Error).message}`);
    }
  }

  // ─── 元数据转换 ───

  private toMeta(data: WidgetTemplateData): WidgetTemplateMeta {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      author: data.author,
      source: data.source,
      thumbnail: data.thumbnail,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      schemaVersion: data.schemaVersion,
      hasVariables: (data.variables || []).length > 0,
      variableCount: (data.variables || []).length,
      tags: data.tags,
    };
  }

  // ─── 列表 ───

  listTemplates(
    category?: string,
    source?: string,
    projectId?: string,
  ): WidgetTemplateListResult {
    const { base } = this.getDirs(projectId);
    if (!fs.existsSync(base)) {
      fs.mkdirSync(base, { recursive: true });
    }
    try {
      const files = fs
        .readdirSync(base)
        .filter((f) => f.endsWith('_meta.json'));
      let metas: WidgetTemplateMeta[] = files
        .map((f) => this.readJSON<WidgetTemplateMeta>(path.join(base, f)))
        .filter((m): m is WidgetTemplateMeta => m !== null);

      if (category && category !== 'all') {
        metas = metas.filter((m) => m.category === category);
      }
      if (source && source !== 'all') {
        metas = metas.filter((m) => m.source === source);
      }

      metas.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return { success: true, data: metas, source: 'fs' };
    } catch (err) {
      this.logger.error(`列出组件模板失败: ${(err as Error).message}`);
      return { success: true, data: [], source: 'fallback' };
    }
  }

  // ─── 读取完整数据 ───

  readTemplate(
    templateId: string,
    projectId?: string,
  ): WidgetTemplateReadResult {
    const data = this.readJSON<WidgetTemplateData>(
      this.getDataPath(templateId, projectId),
    );
    if (!data) {
      throw new NotFoundException('组件模板不存在');
    }
    return { success: true, data, source: 'fs' };
  }

  // ─── 创建 ───

  createTemplate(
    body: Partial<WidgetTemplateData>,
    projectId?: string,
  ): WidgetTemplateWriteResult {
    if (!body.name) {
      throw new InternalServerErrorException('缺少 name 字段');
    }
    const now = new Date().toISOString();
    // 保留调用方传入的 id（导入/外部指定场景），否则生成新 id
    const id = body.id && body.id.trim() ? body.id.trim() : `wt-${uuidv4().slice(0, 8)}`;
    const data: WidgetTemplateData = {
      id,
      name: body.name,
      description: body.description,
      category: body.category || 'common',
      author: body.author || 'user',
      source: projectId ? 'user' : 'user',
      thumbnail: body.thumbnail,
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
      graphics: body.graphics || [],
      variables: body.variables || [],
      tags: body.tags,
    };
    this.writeTemplate(data, projectId);
    return {
      success: true,
      data: this.toMeta(data),
      message: '组件模板创建成功',
    };
  }

  // ─── 更新 ───

  updateTemplate(
    templateId: string,
    body: Partial<WidgetTemplateData>,
    projectId?: string,
  ): WidgetTemplateWriteResult {
    const existing = this.readJSON<WidgetTemplateData>(
      this.getDataPath(templateId, projectId),
    );
    if (!existing) {
      throw new NotFoundException('组件模板不存在');
    }
    if (existing.source === 'builtin') {
      throw new InternalServerErrorException('内置组件模板不可修改');
    }
    const merged: WidgetTemplateData = {
      ...existing,
      ...body,
      id: existing.id,
      source: existing.source,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };
    this.writeTemplate(merged, projectId);
    return {
      success: true,
      data: this.toMeta(merged),
      message: '组件模板更新成功',
    };
  }

  /** 写入完整数据 + 元数据 */
  private writeTemplate(data: WidgetTemplateData, projectId?: string): void {
    const { base } = this.getDirs(projectId);
    fs.mkdirSync(base, { recursive: true });
    fs.writeFileSync(
      this.getDataPath(data.id, projectId),
      JSON.stringify(data, null, 2),
      'utf-8',
    );
    fs.writeFileSync(
      this.getMetaPath(data.id, projectId),
      JSON.stringify(this.toMeta(data), null, 2),
      'utf-8',
    );
  }

  // ─── 删除 ───

  deleteTemplate(
    templateId: string,
    projectId?: string,
  ): WidgetTemplateDeleteResult {
    const existing = this.readJSON<WidgetTemplateData>(
      this.getDataPath(templateId, projectId),
    );
    if (!existing) {
      throw new NotFoundException('组件模板不存在');
    }
    if (existing.source === 'builtin') {
      throw new InternalServerErrorException('内置组件模板不可删除');
    }
    try {
      fs.rmSync(this.getDataPath(templateId, projectId), { force: true });
      fs.rmSync(this.getMetaPath(templateId, projectId), { force: true });
      return { success: true, message: '组件模板删除成功' };
    } catch (err) {
      throw new InternalServerErrorException(
        `删除失败: ${(err as Error).message}`,
      );
    }
  }

  // ─── 导入 / 导出 ───

  importTemplate(json: string): WidgetTemplateWriteResult {
    let parsed: WidgetTemplateData;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new InternalServerErrorException('JSON 解析失败');
    }
    if (!parsed.id || !parsed.name) {
      throw new InternalServerErrorException('缺少 id 或 name');
    }
    this.writeTemplate({ ...parsed, source: 'user', schemaVersion: SCHEMA_VERSION });
    return {
      success: true,
      data: this.toMeta(parsed),
      message: '组件模板导入成功',
    };
  }

  exportTemplate(templateId: string, projectId?: string): string {
    const data = this.readJSON<WidgetTemplateData>(
      this.getDataPath(templateId, projectId),
    );
    if (!data) throw new NotFoundException('组件模板不存在');
    return JSON.stringify(data, null, 2);
  }

  // ─── 项目级提升为内置（系统级） ───

  promoteToSystem(
    projectId: string,
    templateId: string,
  ): WidgetTemplateWriteResult {
    const data = this.readJSON<WidgetTemplateData>(
      this.getDataPath(templateId, projectId),
    );
    if (!data) {
      throw new NotFoundException('项目级组件模板不存在');
    }
    const promoted: WidgetTemplateData = {
      ...data,
      id: `sys-${templateId.replace(/^.*-/, '')}-${uuidv4().slice(0, 4)}`,
      source: 'builtin',
      author: 'system',
      updatedAt: new Date().toISOString(),
    };
    this.writeTemplate(promoted);
    return {
      success: true,
      data: this.toMeta(promoted),
      message: '已提升为系统级组件模板',
    };
  }
}
