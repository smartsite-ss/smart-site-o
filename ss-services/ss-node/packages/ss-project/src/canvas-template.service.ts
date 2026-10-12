// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { PathResolverService } from '@ss-node/ss-core';

/**
 * 画布页面模板管理服务
 *
 * 管理 data/canvas-templates/pages/ 目录下的模板 JSON 文件，
 * 启动时自动 seed 7 套内置模板。
 */

export interface CanvasTemplateData {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  source: 'builtin' | 'user' | 'market';
  author?: string;
  version: string;
  pageConfig: {
    width: number;
    height: number;
    backgroundColor: string;
    backgroundImage?: string;
    layout: string;
    themeName?: string;
  };
  graphics: unknown[];
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TemplateListResult {
  success: boolean;
  count: number;
  templates: CanvasTemplateData[];
}

export interface TemplateReadResult {
  success: boolean;
  data: CanvasTemplateData | null;
}

export interface TemplateWriteResult {
  success: boolean;
  data: CanvasTemplateData;
}

export interface TemplateDeleteResult {
  success: boolean;
  id: string;
}

/** 内置模板种子数据（首次启动时若目录为空则写入） */
const BUILTIN_SEED: CanvasTemplateData[] = [
  {
    id: 'builtin-blank', name: '空白页面', description: '全空白页面，1920×1080，适合从零开始设计',
    category: 'blank', icon: '📄', source: 'builtin', author: 'SS-SCADA', version: '1.0.0',
    pageConfig: { width: 1920, height: 1080, backgroundColor: '#808080', layout: 'free' },
    graphics: [], tags: ['空白', '基础'], createdAt: 1750000000000, updatedAt: 1750000000000,
  },
  {
    id: 'builtin-login', name: '登录页', description: 'SCADA 系统登录页，居中表单布局，深色渐变背景',
    category: 'login', icon: '🔑', source: 'builtin', author: 'SS-SCADA', version: '1.0.0',
    pageConfig: { width: 1440, height: 900, backgroundColor: '#1E2A38', layout: 'free', themeName: 'tech-dark-blue' },
    graphics: [
      { id: 'login-bg', type: 'rect', x: 0, y: 0, width: 1440, height: 900, fill: { type: 'gradient', colors: ['#1E2A38', '#0F1B2A'] }, stroke: 'none' },
      { id: 'login-logo', type: 'image', x: 640, y: 120, width: 160, height: 60, src: '', displayText: 'SS-SCADA' },
      { id: 'login-title', type: 'text', x: 640, y: 220, width: 160, height: 40, text: '智能监控平台', fontSize: 24, fill: '#FFFFFF', textAlign: 'center' },
      { id: 'login-label-username', type: 'text', x: 560, y: 320, width: 80, height: 32, text: '账号', fontSize: 14, fill: '#B0C0D0' },
      { id: 'login-input-username', type: 'input', x: 560, y: 356, width: 320, height: 40, placeholder: '请输入账号', fontSize: 14, fill: '#FFFFFF', stroke: '#3A5A80', cornerRadius: 4 },
      { id: 'login-label-password', type: 'text', x: 560, y: 420, width: 80, height: 32, text: '密码', fontSize: 14, fill: '#B0C0D0' },
      { id: 'login-input-password', type: 'input', x: 560, y: 456, width: 320, height: 40, placeholder: '请输入密码', fontSize: 14, fill: '#FFFFFF', stroke: '#3A5A80', cornerRadius: 4, isPassword: true },
      { id: 'login-btn', type: 'button', x: 632, y: 540, width: 176, height: 44, text: '登 录', fontSize: 16, fill: '#FFFFFF', backgroundColor: '#1890FF', cornerRadius: 4 },
    ],
    tags: ['登录', '认证', '深色'], createdAt: 1750000000000, updatedAt: 1750000000000,
  },
  {
    id: 'builtin-dashboard', name: '仪表盘', description: '运营概览仪表盘，含 KPI 卡片、趋势图和饼图',
    category: 'dashboard', icon: '📊', source: 'builtin', author: 'SS-SCADA', version: '1.0.0',
    pageConfig: { width: 1920, height: 1080, backgroundColor: '#0A1929', layout: 'free', themeName: 'tech-dark-blue' },
    graphics: [
      { id: 'dash-header', type: 'rect', x: 0, y: 0, width: 1920, height: 64, fill: '#0D2137', stroke: '#1A3A5C', strokeWidth: 0 },
      { id: 'dash-header-title', type: 'text', x: 24, y: 16, width: 400, height: 32, text: '运营概览', fontSize: 22, fill: '#FFFFFF', fontWeight: 'bold' },
      { id: 'dash-header-time', type: 'text', x: 1620, y: 20, width: 280, height: 24, text: '2026-07-01 14:30:00', fontSize: 14, fill: '#5A8AB5', textAlign: 'right' },
      { id: 'dash-kpi1', type: 'rect', x: 24, y: 88, width: 440, height: 140, fill: '#0D2137', stroke: '#1A3A5C', cornerRadius: 8 },
      { id: 'dash-kpi1-label', type: 'text', x: 44, y: 104, width: 200, height: 24, text: '设备在线率', fontSize: 14, fill: '#5A8AB5' },
      { id: 'dash-kpi1-value', type: 'text', x: 44, y: 140, width: 200, height: 48, text: '98.6%', fontSize: 40, fill: '#3E92CC', fontWeight: 'bold' },
      { id: 'dash-kpi1-trend', type: 'text', x: 300, y: 160, width: 150, height: 24, text: '↑ 2.1%', fontSize: 14, fill: '#52C41A', textAlign: 'right' },
      { id: 'dash-kpi2', type: 'rect', x: 488, y: 88, width: 440, height: 140, fill: '#0D2137', stroke: '#1A3A5C', cornerRadius: 8 },
      { id: 'dash-kpi2-label', type: 'text', x: 508, y: 104, width: 200, height: 24, text: '今日报警数', fontSize: 14, fill: '#5A8AB5' },
      { id: 'dash-kpi2-value', type: 'text', x: 508, y: 140, width: 200, height: 48, text: '23', fontSize: 40, fill: '#E06C75', fontWeight: 'bold' },
      { id: 'dash-kpi3', type: 'rect', x: 952, y: 88, width: 440, height: 140, fill: '#0D2137', stroke: '#1A3A5C', cornerRadius: 8 },
      { id: 'dash-kpi3-label', type: 'text', x: 972, y: 104, width: 200, height: 24, text: '数据采集量', fontSize: 14, fill: '#5A8AB5' },
      { id: 'dash-kpi3-value', type: 'text', x: 972, y: 140, width: 200, height: 48, text: '1,245,678', fontSize: 36, fill: '#FFD166', fontWeight: 'bold' },
      { id: 'dash-kpi4', type: 'rect', x: 1416, y: 88, width: 480, height: 140, fill: '#0D2137', stroke: '#1A3A5C', cornerRadius: 8 },
      { id: 'dash-kpi4-label', type: 'text', x: 1436, y: 104, width: 200, height: 24, text: '活跃脚本数', fontSize: 14, fill: '#5A8AB5' },
      { id: 'dash-kpi4-value', type: 'text', x: 1436, y: 140, width: 200, height: 48, text: '12', fontSize: 40, fill: '#9D7CD8', fontWeight: 'bold' },
    ],
    tags: ['仪表盘', '概览', 'KPI'], createdAt: 1750000000000, updatedAt: 1750000000000,
  },
  {
    id: 'builtin-industrial-single', name: '工业监控（单设备）', description: '单台设备监控画面，含设备图、实时数据面板和报警列表',
    category: 'industrial', icon: '⚙️', source: 'builtin', author: 'SS-SCADA', version: '1.0.0',
    pageConfig: { width: 1920, height: 1080, backgroundColor: '#172A3A', layout: 'free', themeName: 'blue-dark' },
    graphics: [
      { id: 'ind-header', type: 'rect', x: 0, y: 0, width: 1920, height: 56, fill: '#102030', stroke: '#1A3A5C' },
      { id: 'ind-header-title', type: 'text', x: 24, y: 12, width: 400, height: 32, text: '水泵 #001 — 实时监控', fontSize: 20, fill: '#FFFFFF', fontWeight: 'bold' },
      { id: 'ind-pump', type: 'image', x: 80, y: 120, width: 400, height: 400, src: '', displayText: '水泵本体', fill: '#2A4A6A', stroke: '#3A6A8A' },
      { id: 'ind-gauge-temp', type: 'gauge', x: 540, y: 120, width: 280, height: 280, label: '温度', min: 0, max: 120, value: 45, unit: '°C', fill: '#3E92CC' },
      { id: 'ind-gauge-pressure', type: 'gauge', x: 860, y: 120, width: 280, height: 280, label: '压力', min: 0, max: 10, value: 4.2, unit: 'MPa', fill: '#52C41A' },
      { id: 'ind-data-panel', type: 'rect', x: 1200, y: 80, width: 680, height: 320, fill: '#102030', stroke: '#1A3A5C', cornerRadius: 8 },
      { id: 'ind-data-title', type: 'text', x: 1220, y: 96, width: 200, height: 24, text: '实时数据', fontSize: 16, fill: '#5BA0B5' },
      { id: 'ind-data-flow', type: 'text', x: 1220, y: 140, width: 640, height: 24, text: '流量:  125.6 m³/h', fontSize: 14, fill: '#B0C0D0' },
      { id: 'ind-data-rpm', type: 'text', x: 1220, y: 172, width: 640, height: 24, text: '转速:  1480 rpm', fontSize: 14, fill: '#B0C0D0' },
      { id: 'ind-alarm-panel', type: 'rect', x: 1200, y: 420, width: 680, height: 300, fill: '#102030', stroke: '#1A3A5C', cornerRadius: 8 },
      { id: 'ind-alarm-title', type: 'text', x: 1220, y: 436, width: 200, height: 24, text: '最近报警', fontSize: 16, fill: '#E06C75' },
    ],
    tags: ['工业', '监控', '泵', '单设备'], createdAt: 1750000000000, updatedAt: 1750000000000,
  },
  {
    id: 'builtin-industrial-multi', name: '工业监控（多设备）', description: '多设备矩阵监控画面，4×4 设备网格 + 详情面板',
    category: 'industrial', icon: '🏭', source: 'builtin', author: 'SS-SCADA', version: '1.0.0',
    pageConfig: { width: 1920, height: 1080, backgroundColor: '#0F1E2E', layout: 'free' },
    graphics: [
      { id: 'multi-header', type: 'rect', x: 0, y: 0, width: 1920, height: 56, fill: '#081420', stroke: '#1A3A5C' },
      { id: 'multi-header-title', type: 'text', x: 24, y: 12, width: 400, height: 32, text: '生产线监控总览', fontSize: 20, fill: '#FFFFFF', fontWeight: 'bold' },
    ],
    tags: ['工业', '监控', '多设备', '矩阵'], createdAt: 1750000000000, updatedAt: 1750000000000,
  },
  {
    id: 'builtin-data-screen', name: '数据大屏（基础）', description: '4K 数据大屏，深色科技风，适合大屏展示',
    category: 'data-screen', icon: '🖥️', source: 'builtin', author: 'SS-SCADA', version: '1.0.0',
    pageConfig: { width: 3840, height: 2160, backgroundColor: '#060C29', layout: 'free', themeName: 'dark' },
    graphics: [
      { id: 'screen-header', type: 'rect', x: 0, y: 0, width: 3840, height: 100, fill: '#030818', stroke: '#0A1A40' },
      { id: 'screen-header-title', type: 'text', x: 1600, y: 24, width: 640, height: 52, text: '智慧工厂 — 综合态势', fontSize: 36, fill: '#00D4FF', fontWeight: 'bold', textAlign: 'center' },
      { id: 'screen-header-time', type: 'text', x: 3400, y: 36, width: 400, height: 28, text: '2026-07-01 14:30:00', fontSize: 18, fill: '#00D4FF', textAlign: 'right' },
    ],
    tags: ['大屏', '4K', '科技', '深色'], createdAt: 1750000000000, updatedAt: 1750000000000,
  },
  {
    id: 'builtin-mobile', name: '移动端 H5', description: '移动端竖屏监控页面，紧凑布局',
    category: 'mobile', icon: '📱', source: 'builtin', author: 'SS-SCADA', version: '1.0.0',
    pageConfig: { width: 375, height: 667, backgroundColor: '#FFFFFF', layout: 'free', themeName: 'light' },
    graphics: [
      { id: 'mobile-header', type: 'rect', x: 0, y: 0, width: 375, height: 56, fill: '#1989FA', stroke: 'none' },
      { id: 'mobile-header-title', type: 'text', x: 60, y: 12, width: 255, height: 32, text: '设备监控', fontSize: 18, fill: '#FFFFFF', fontWeight: 'bold', textAlign: 'center' },
      { id: 'mobile-card', type: 'rect', x: 12, y: 72, width: 351, height: 120, fill: '#FFFFFF', stroke: '#EBEDF0', cornerRadius: 8 },
      { id: 'mobile-card-label', type: 'text', x: 28, y: 88, width: 200, height: 24, text: '水泵 #001', fontSize: 16, fill: '#333333', fontWeight: 'bold' },
      { id: 'mobile-card-temp', type: 'text', x: 28, y: 124, width: 160, height: 24, text: '温度: 45.2°C', fontSize: 14, fill: '#666666' },
      { id: 'mobile-card-pressure', type: 'text', x: 28, y: 152, width: 160, height: 24, text: '压力: 4.2 MPa', fontSize: 14, fill: '#666666' },
      { id: 'mobile-tabbar', type: 'rect', x: 0, y: 607, width: 375, height: 60, fill: '#F7F8FA', stroke: '#EBEDF0' },
    ],
    tags: ['移动端', 'H5', '轻量'], createdAt: 1750000000000, updatedAt: 1750000000000,
  },
];

@Injectable()
export class CanvasTemplateService implements OnModuleInit {
  private readonly logger = new Logger(CanvasTemplateService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly pathResolver: PathResolverService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('CanvasTemplateService initializing...');
    this.seedBuiltinTemplates();
  }

  /** 获取模板目录路径（系统级或项目级） */
  getTemplatesDir(projectId?: string): string {
    const projectsDirRaw = this.configService.get<string>('PROJECTS_DIR') || './data/projects';
    const projectsDir = this.pathResolver.resolve(projectsDirRaw);

    if (projectId) {
      return path.join(projectsDir, projectId, 'canvas-templates', 'pages');
    }
    return path.join(path.dirname(projectsDir), 'canvas-templates', 'pages');
  }

  /** 获取单个模板文件路径 */
  private getTemplateFilePath(templateId: string, projectId?: string): string {
    return path.join(this.getTemplatesDir(projectId), `${templateId}.json`);
  }

  /** Seed 内置模板（仅系统级） */
  private seedBuiltinTemplates(): void {
    const dir = this.getTemplatesDir();
    this.ensureDir(dir);

    const existingFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    if (existingFiles.length > 0) {
      this.logger.log(`模板目录已有 ${existingFiles.length} 个文件，跳过 seed`);
      return;
    }

    this.logger.log(`模板目录为空，开始 seed ${BUILTIN_SEED.length} 套内置模板...`);
    for (const template of BUILTIN_SEED) {
      const filePath = this.getTemplateFilePath(template.id);
      fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
      this.logger.log(`  ✓ 已写入: ${template.id}.json`);
    }
    this.logger.log('内置模板 seed 完成');
  }

  // ─── CRUD ───

  /** 列出所有模板，支持按 category 和 source 筛选 */
  listTemplates(category?: string, source?: string, projectId?: string): TemplateListResult {
    const dir = this.getTemplatesDir(projectId);
    if (!fs.existsSync(dir)) {
      return { success: true, count: 0, templates: [] };
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const templates: CanvasTemplateData[] = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        const template = JSON.parse(raw) as CanvasTemplateData;
        template.id = template.id || file.replace('.json', '');

        if (category && category !== 'all' && template.category !== category) continue;
        if (source && template.source !== source) continue;

        templates.push(template);
      } catch (error) {
        this.logger.warn(`跳过无效模板文件: ${file}`, (error as Error).message);
      }
    }

    return { success: true, count: templates.length, templates };
  }

  /** 读取单个模板 */
  readTemplate(templateId: string, projectId?: string): TemplateReadResult {
    const filePath = this.getTemplateFilePath(templateId, projectId);
    if (!fs.existsSync(filePath)) {
      return { success: false, data: null };
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as CanvasTemplateData;
      data.id = data.id || templateId;
      return { success: true, data };
    } catch (error) {
      this.logger.error(`读取模板失败: ${templateId}`, (error as Error).message);
      return { success: false, data: null };
    }
  }

  /** 创建模板 */
  createTemplate(data: CanvasTemplateData, projectId?: string): TemplateWriteResult {
    const dir = this.getTemplatesDir(projectId);
    this.ensureDir(dir);

    const template: CanvasTemplateData = {
      ...data,
      id: data.id || `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: projectId ? 'user' : (data.source === 'builtin' ? 'builtin' : 'user'),
      createdAt: data.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const filePath = this.getTemplateFilePath(template.id, projectId);
    if (fs.existsSync(filePath)) {
      throw new Error(`模板 ID 已存在: ${template.id}`);
    }

    fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
    this.logger.log(`已创建模板: ${template.id} (${projectId ? '项目级' : '系统级'})`);
    return { success: true, data: template };
  }

  /** 更新模板（系统级禁止修改内置模板，项目级无限制） */
  updateTemplate(templateId: string, updates: Partial<CanvasTemplateData>, projectId?: string): TemplateWriteResult {
    const existing = this.readTemplate(templateId, projectId);
    if (!existing.success || !existing.data) {
      throw new Error(`模板不存在: ${templateId}`);
    }
    // 系统级内置模板禁止修改
    if (!projectId && existing.data.source === 'builtin') {
      throw new Error(`不允许修改内置模板: ${templateId}`);
    }

    const merged: CanvasTemplateData = {
      ...existing.data,
      ...updates,
      id: templateId,
      updatedAt: Date.now(),
    };

    const filePath = this.getTemplateFilePath(templateId, projectId);
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
    this.logger.log(`已更新模板: ${templateId}`);
    return { success: true, data: merged };
  }

  /** 删除模板（系统级禁止删除内置模板） */
  deleteTemplate(templateId: string, projectId?: string): TemplateDeleteResult {
    const existing = this.readTemplate(templateId, projectId);
    if (!existing.success || !existing.data) {
      throw new Error(`模板不存在: ${templateId}`);
    }
    if (!projectId && existing.data.source === 'builtin') {
      throw new Error(`不允许删除内置模板: ${templateId}`);
    }

    const filePath = this.getTemplateFilePath(templateId, projectId);
    fs.unlinkSync(filePath);
    this.logger.log(`已删除模板: ${templateId}`);
    return { success: true, id: templateId };
  }

  /** 导出模板 JSON 字符串 */
  exportTemplate(templateId: string, projectId?: string): string {
    const result = this.readTemplate(templateId, projectId);
    if (!result.success || !result.data) {
      throw new Error(`模板不存在: ${templateId}`);
    }
    return JSON.stringify(result.data, null, 2);
  }

  /** 将项目级模板提升为系统级模板 */
  promoteToSystem(projectId: string, templateId: string): TemplateWriteResult {
    const existing = this.readTemplate(templateId, projectId);
    if (!existing.success || !existing.data) {
      throw new Error(`项目模板不存在: ${templateId}`);
    }

    const sourceDir = this.getTemplatesDir(projectId);
    const sourceFile = this.getTemplateFilePath(templateId, projectId);
    const targetDir = this.getTemplatesDir();
    this.ensureDir(targetDir);

    // 生成新的系统级 ID（避免与现有系统模板冲突）
    const systemId = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const targetFile = this.getTemplateFilePath(systemId);

    // 清理项目级字段后复制到系统目录
    const systemTemplate: CanvasTemplateData = {
      ...existing.data,
      id: systemId,
      source: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    fs.writeFileSync(targetFile, JSON.stringify(systemTemplate, null, 2), 'utf-8');
    this.logger.log(`已提升模板: ${templateId} (项目级) → ${systemId} (系统级)`);
    return { success: true, data: systemTemplate };
  }

  /** 导入模板 JSON */
  importTemplate(json: string, projectId?: string): TemplateWriteResult {
    let raw: CanvasTemplateData;
    try {
      raw = JSON.parse(json);
    } catch {
      throw new Error('模板 JSON 格式无效');
    }

    if (!raw.name || !raw.pageConfig || !Array.isArray(raw.graphics)) {
      throw new Error('模板数据不完整：缺少 name / pageConfig / graphics');
    }

    const template: CanvasTemplateData = {
      ...raw,
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.createTemplate(template, projectId);
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
