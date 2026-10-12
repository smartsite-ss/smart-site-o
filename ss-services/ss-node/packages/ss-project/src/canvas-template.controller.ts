// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@ss-node/ss-core';
import { Public } from '@ss-node/ss-core';
import {
  CanvasTemplateService,
  CanvasTemplateData,
  TemplateListResult,
  TemplateReadResult,
  TemplateWriteResult,
  TemplateDeleteResult,
} from './canvas-template.service';

@ApiTags('画布模板')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('canvas-templates')
export class CanvasTemplateController {
  private readonly logger = new Logger(CanvasTemplateController.name);

  constructor(
    private readonly canvasTemplateService: CanvasTemplateService,
    private readonly configService: ConfigService,
  ) {}

  /** GET /api/v1/canvas-templates/config — 获取模板配置（含应用模式） */
  @Get('config')
  @ApiOperation({ summary: '获取模板配置' })
  getConfig(): { templateMode: string } {
    const templateMode = this.configService.get<string>('CANVAS_TEMPLATE_MODE') || 'reference';
    return { templateMode };
  }

  /** GET /api/v1/canvas-templates — 获取全部模板列表 */
  @Get()
  @ApiOperation({ summary: '获取模板列表' })
  @ApiQuery({ name: 'category', required: false, description: '按分类筛选' })
  @ApiQuery({ name: 'source', required: false, description: '按来源筛选（builtin/user）' })
  listTemplates(
    @Query('category') category?: string,
    @Query('source') source?: string,
  ): TemplateListResult {
    return this.canvasTemplateService.listTemplates(category, source);
  }

  /** GET /api/v1/canvas-templates/:templateId — 获取单个模板 */
  @Get(':templateId')
  @ApiOperation({ summary: '获取单个模板详情' })
  readTemplate(@Param('templateId') templateId: string): TemplateReadResult {
    const result = this.canvasTemplateService.readTemplate(templateId);
    if (!result.success) {
      throw new HttpException('模板不存在', HttpStatus.NOT_FOUND);
    }
    return result;
  }

  /** POST /api/v1/canvas-templates — 新建用户模板 */
  @Post()
  @ApiOperation({ summary: '新建用户模板' })
  createTemplate(@Body() body: CanvasTemplateData): TemplateWriteResult {
    try {
      return this.canvasTemplateService.createTemplate(body);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '创建模板失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** PUT /api/v1/canvas-templates/:templateId — 更新用户模板 */
  @Put(':templateId')
  @ApiOperation({ summary: '更新用户模板（禁止修改内置模板）' })
  updateTemplate(
    @Param('templateId') templateId: string,
    @Body() body: Partial<CanvasTemplateData>,
  ): TemplateWriteResult {
    try {
      return this.canvasTemplateService.updateTemplate(templateId, body);
    } catch (error) {
      const message = (error as Error).message || '更新模板失败';
      const status = message.includes('内置模板')
        ? HttpStatus.FORBIDDEN
        : message.includes('不存在')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST;
      throw new HttpException(message, status);
    }
  }

  /** DELETE /api/v1/canvas-templates/:templateId — 删除用户模板 */
  @Delete(':templateId')
  @ApiOperation({ summary: '删除用户模板（禁止删除内置模板）' })
  deleteTemplate(@Param('templateId') templateId: string): TemplateDeleteResult {
    try {
      return this.canvasTemplateService.deleteTemplate(templateId);
    } catch (error) {
      const message = (error as Error).message || '删除模板失败';
      const status = message.includes('内置模板')
        ? HttpStatus.FORBIDDEN
        : message.includes('不存在')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST;
      throw new HttpException(message, status);
    }
  }

  /** POST /api/v1/canvas-templates/import — 导入模板 JSON */
  @Post('import')
  @ApiOperation({ summary: '导入模板 JSON' })
  importTemplate(@Body() body: { json: string }): TemplateWriteResult {
    try {
      if (!body.json) {
        throw new HttpException('缺少 json 字段', HttpStatus.BAD_REQUEST);
      }
      return this.canvasTemplateService.importTemplate(body.json);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        (error as Error).message || '导入模板失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** GET /api/v1/canvas-templates/:templateId/export — 导出模板 JSON */
  @Get(':templateId/export')
  @ApiOperation({ summary: '导出模板 JSON 文件下载' })
  exportTemplate(
    @Param('templateId') templateId: string,
    @Res() res: Response,
  ): void {
    try {
      const json = this.canvasTemplateService.exportTemplate(templateId);
      const template = JSON.parse(json);
      const fileName = `${template.name || templateId}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      res.send(json);
    } catch (error) {
      const message = (error as Error).message || '导出模板失败';
      const status = message.includes('不存在')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      throw new HttpException(message, status);
    }
  }
}

// ─── 项目级路由 ───

@ApiTags('画布模板-项目级')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/canvas-templates')
export class ProjectCanvasTemplateController {
  private readonly logger = new Logger(ProjectCanvasTemplateController.name);

  constructor(private readonly canvasTemplateService: CanvasTemplateService) {}

  @Get()
  @ApiOperation({ summary: '获取项目模板列表' })
  listTemplates(
    @Param('projectId') projectId: string,
  ): TemplateListResult {
    return this.canvasTemplateService.listTemplates(undefined, undefined, projectId);
  }

  @Get(':templateId')
  @ApiOperation({ summary: '获取项目模板详情' })
  readTemplate(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
  ): TemplateReadResult {
    const result = this.canvasTemplateService.readTemplate(templateId, projectId);
    if (!result.success) throw new HttpException('模板不存在', HttpStatus.NOT_FOUND);
    return result;
  }

  @Post()
  @ApiOperation({ summary: '新建项目模板' })
  createTemplate(
    @Param('projectId') projectId: string,
    @Body() body: CanvasTemplateData,
  ): TemplateWriteResult {
    try {
      return this.canvasTemplateService.createTemplate(body, projectId);
    } catch (error) {
      throw new HttpException((error as Error).message || '创建模板失败', HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':templateId')
  @ApiOperation({ summary: '更新项目模板' })
  updateTemplate(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
    @Body() body: Partial<CanvasTemplateData>,
  ): TemplateWriteResult {
    try {
      return this.canvasTemplateService.updateTemplate(templateId, body, projectId);
    } catch (error) {
      const message = (error as Error).message || '更新模板失败';
      const status = message.includes('不存在') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      throw new HttpException(message, status);
    }
  }

  @Delete(':templateId')
  @ApiOperation({ summary: '删除项目模板' })
  deleteTemplate(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
  ): TemplateDeleteResult {
    try {
      return this.canvasTemplateService.deleteTemplate(templateId, projectId);
    } catch (error) {
      const message = (error as Error).message || '删除模板失败';
      const status = message.includes('不存在') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      throw new HttpException(message, status);
    }
  }

  @Post(':templateId/promote')
  @ApiOperation({ summary: '提升项目模板为系统级模板' })
  promoteToSystem(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
  ): TemplateWriteResult {
    try {
      return this.canvasTemplateService.promoteToSystem(projectId, templateId);
    } catch (error) {
      throw new HttpException((error as Error).message || '提升模板失败', HttpStatus.BAD_REQUEST);
    }
  }
}
