// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Widget Template Controller（组件模板控制器）
 *
 * 与 CanvasTemplateController 保持完全一致的路由风格：
 *   - 全局：/api/v1/widget-templates
 *   - 项目级：/api/v1/projects/:projectId/widget-templates
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  HttpException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@ss-node/ss-core';
import { Public } from '@ss-node/ss-core';
import {
  WidgetTemplateService,
  WidgetTemplateData,
  WidgetTemplateListResult,
  WidgetTemplateReadResult,
  WidgetTemplateWriteResult,
  WidgetTemplateDeleteResult,
} from './widget-template.service';

@ApiTags('widget-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('widget-templates')
export class WidgetTemplateController {
  private readonly logger = new Logger(WidgetTemplateController.name);

  constructor(
    private readonly widgetTemplateService: WidgetTemplateService,
    private readonly configService: ConfigService,
  ) {}

  /** GET /api/v1/widget-templates — 获取组件模板列表 */
  @Get()
  @Public()
  @ApiOperation({ summary: '获取组件模板列表（系统级/内置）' })
  listTemplates(
    @Query('category') category?: string,
    @Query('source') source?: string,
  ): WidgetTemplateListResult {
    return this.widgetTemplateService.listTemplates(category, source);
  }

  /** GET /api/v1/widget-templates/:templateId — 获取单个组件模板 */
  @Get(':templateId')
  @Public()
  @ApiOperation({ summary: '获取单个组件模板详情' })
  readTemplate(@Param('templateId') templateId: string): WidgetTemplateReadResult {
    const result = this.widgetTemplateService.readTemplate(templateId);
    if (!result.success) {
      throw new HttpException('组件模板不存在', HttpStatus.NOT_FOUND);
    }
    return result;
  }

  /** POST /api/v1/widget-templates — 新建用户组件模板 */
  @Post()
  @ApiOperation({ summary: '新建用户组件模板' })
  createTemplate(@Body() body: WidgetTemplateData): WidgetTemplateWriteResult {
    try {
      return this.widgetTemplateService.createTemplate(body);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '创建组件模板失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** PUT /api/v1/widget-templates/:templateId — 更新组件模板 */
  @Put(':templateId')
  @ApiOperation({ summary: '更新组件模板' })
  updateTemplate(
    @Param('templateId') templateId: string,
    @Body() body: Partial<WidgetTemplateData>,
  ): WidgetTemplateWriteResult {
    try {
      return this.widgetTemplateService.updateTemplate(templateId, body);
    } catch (error) {
      const message = (error as Error).message || '更新组件模板失败';
      const status =
        message.includes('内置') ? HttpStatus.FORBIDDEN : HttpStatus.BAD_REQUEST;
      throw new HttpException(message, status);
    }
  }

  /** DELETE /api/v1/widget-templates/:templateId — 删除组件模板 */
  @Delete(':templateId')
  @ApiOperation({ summary: '删除用户组件模板（禁止删除内置）' })
  deleteTemplate(
    @Param('templateId') templateId: string,
  ): WidgetTemplateDeleteResult {
    try {
      return this.widgetTemplateService.deleteTemplate(templateId);
    } catch (error) {
      const message = (error as Error).message || '删除组件模板失败';
      const status = message.includes('内置')
        ? HttpStatus.FORBIDDEN
        : message.includes('不存在')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST;
      throw new HttpException(message, status);
    }
  }

  /** POST /api/v1/widget-templates/import — 导入组件模板 */
  @Post('import')
  @ApiOperation({ summary: '导入组件模板（JSON 字符串）' })
  importTemplate(@Body() body: { json: string }): WidgetTemplateWriteResult {
    try {
      if (!body.json) {
        throw new HttpException('缺少 json 字段', HttpStatus.BAD_REQUEST);
      }
      return this.widgetTemplateService.importTemplate(body.json);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        (error as Error).message || '导入失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** GET /api/v1/widget-templates/:templateId/export — 导出组件模板 */
  @Get(':templateId/export')
  @Public()
  @ApiOperation({ summary: '导出组件模板为 JSON 文件' })
  exportTemplate(
    @Param('templateId') templateId: string,
    @Res() res: Response,
  ): void {
    try {
      const json = this.widgetTemplateService.exportTemplate(templateId);
      const template = JSON.parse(json);
      const fileName = `${template.name || templateId}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      res.status(HttpStatus.OK).send(json);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        (error as Error).message || '导出失败',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}

@ApiTags('project-widget-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/widget-templates')
export class ProjectWidgetTemplateController {
  private readonly logger = new Logger(ProjectWidgetTemplateController.name);

  constructor(private readonly widgetTemplateService: WidgetTemplateService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取项目组件模板列表' })
  listTemplates(@Param('projectId') projectId: string): WidgetTemplateListResult {
    return this.widgetTemplateService.listTemplates(undefined, undefined, projectId);
  }

  @Get(':templateId')
  @Public()
  @ApiOperation({ summary: '获取项目内单个组件模板' })
  readTemplate(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
  ): WidgetTemplateReadResult {
    const result = this.widgetTemplateService.readTemplate(templateId, projectId);
    if (!result.success) throw new HttpException('组件模板不存在', HttpStatus.NOT_FOUND);
    return result;
  }

  @Post()
  @ApiOperation({ summary: '新建项目组件模板' })
  createTemplate(
    @Param('projectId') projectId: string,
    @Body() body: WidgetTemplateData,
  ): WidgetTemplateWriteResult {
    try {
      return this.widgetTemplateService.createTemplate(body, projectId);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '创建组件模板失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':templateId')
  @ApiOperation({ summary: '更新项目组件模板' })
  updateTemplate(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
    @Body() body: Partial<WidgetTemplateData>,
  ): WidgetTemplateWriteResult {
    try {
      return this.widgetTemplateService.updateTemplate(templateId, body, projectId);
    } catch (error) {
      const message = (error as Error).message || '更新组件模板失败';
      const status = message.includes('不存在')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      throw new HttpException(message, status);
    }
  }

  @Delete(':templateId')
  @ApiOperation({ summary: '删除项目组件模板' })
  deleteTemplate(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
  ): WidgetTemplateDeleteResult {
    try {
      return this.widgetTemplateService.deleteTemplate(templateId, projectId);
    } catch (error) {
      const message = (error as Error).message || '删除组件模板失败';
      const status = message.includes('不存在')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      throw new HttpException(message, status);
    }
  }

  @Post(':templateId/promote')
  @ApiOperation({ summary: '将项目组件模板提升为系统级' })
  promoteToSystem(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
  ): WidgetTemplateWriteResult {
    try {
      return this.widgetTemplateService.promoteToSystem(projectId, templateId);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || '提升组件模板失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
