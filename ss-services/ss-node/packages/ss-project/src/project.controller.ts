// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FindAllProjectsQueryDto } from './dto/find-all-projects.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  ReadRoles,
  WriteRoles,
  Public,
} from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('项目管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name);

  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @WriteRoles()
  @ApiOperation({ summary: '创建项目' })
  create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    return this.projectService.create(createProjectDto, req.user.id);
  }

  @Get()
  @ReadRoles()
  @ApiOperation({ summary: '获取所有项目（支持分页，默认排除停用项目，传 includeDisabled=true 获取全部）' })
  findAll(
    @Request() req,
    @Query() query: FindAllProjectsQueryDto,
  ) {
    return this.projectService.findAll(req.user.id, query, query.includeDisabled === true);
  }

  @Get('overview')
  @ReadRoles()
  @ApiOperation({ summary: '获取系统概览统计（所有项目聚合）' })
  getOverview() {
    return this.projectService.getOverview();
  }

  @Get('default-config')
  @ReadRoles()
  @ApiOperation({ summary: '获取默认项目配置' })
  getDefaultProject() {
    const projectId = this.projectService.getDefaultProjectId();
    return { projectId };
  }

  @Put('default-config')
  @WriteRoles()
  @ApiOperation({ summary: '设置默认项目' })
  setDefaultProject(@Body() body: { projectId: string }) {
    if (!body.projectId) {
      throw new BadRequestException('projectId 不能为空');
    }
    this.projectService.setDefaultProjectId(body.projectId);
    return { success: true, projectId: body.projectId };
  }

  @Delete('default-config')
  @WriteRoles()
  @ApiOperation({ summary: '清除默认项目配置' })
  clearDefaultProject() {
    this.projectService.clearDefaultProjectId();
    return { success: true };
  }

  @Post('migrate-pids')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '批量迁移所有项目的 projectId（修复历史 GUID/中文 projectId）' })
  migrateAllProjectIds() {
    return this.projectService.migrateAllProjectIds();
  }

  @Get(':projectId')
  @ReadRoles()
  @ApiOperation({ summary: '获取单个项目' })
  findOne(@Param('projectId') projectId: string, @Request() req) {
    return this.projectService.findOne(projectId, req.user.id);
  }

  @Patch(':projectId')
  @WriteRoles()
  @ApiOperation({ summary: '更新项目' })
  update(@Param('projectId') projectId: string, @Body() dto: UpdateProjectDto, @Request() req) {
    return this.projectService.update(projectId, dto, req.user.id);
  }

  @Delete(':projectId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除项目' })
  remove(@Param('projectId') projectId: string, @Request() req) {
    return this.projectService.remove(projectId, req.user.id);
  }

  @Post(':projectId/diagnose')
  @WriteRoles()
  @ApiOperation({ summary: '诊断项目资源完整性' })
  diagnose(@Param('projectId') projectId: string) {
    return this.projectService.diagnoseProject(projectId);
  }

  @Post(':projectId/regenerate-pid')
  @WriteRoles()
  @ApiOperation({ summary: '重新生成单个项目的 projectId（基于项目名称拼音首字母）' })
  regenerateProjectId(@Param('projectId') projectId: string) {
    return this.projectService.regenerateProjectId(projectId);
  }

  @Post(':projectId/init-resources')
  @WriteRoles()
  @ApiOperation({ summary: '初始化项目缺失资源（子目录/数据库）' })
  async initResources(
    @Param('projectId') projectId: string,
    @Body('resources') resources?: string[],
  ) {
    const result = await this.projectService.initProjectResources(projectId, resources);
    // 修复后自动诊断，返回修复后健康度
    const diagnoseResult = await this.projectService.diagnoseProject(projectId);
    return { ...result, healthAfter: diagnoseResult.health };
  }

  @Get(':projectId/manage-info')
  @ReadRoles()
  @ApiOperation({ summary: '获取项目管理信息（页面数、数据库大小、时间等）' })
  getManageInfo(@Param('projectId') projectId: string) {
    return this.projectService.getManageInfo(projectId);
  }

  @Post(':projectId/image')
  @WriteRoles()
  @ApiOperation({ summary: '上传项目封面图片' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  uploadImage(@Param('projectId') projectId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('缺少图片文件');
    }
    const relativePath = this.projectService.uploadProjectImage(
      projectId,
      file.buffer,
      file.originalname || 'cover.png',
    );
    return { success: true, image: relativePath };
  }

  @Get(':projectId/image')
  @Public()
  @ApiOperation({ summary: '获取项目封面图片（允许 <img> 标签无鉴权加载）' })
  getImage(@Param('projectId') projectId: string, @Res() res: Response) {
    const filePath = this.projectService.getProjectImagePath(projectId);
    if (!filePath) {
      throw new NotFoundException('项目封面图片不存在');
    }
    // 根据扩展名设置 Content-Type
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Post(':projectId/export')
  @WriteRoles()
  @ApiOperation({
    summary: '导出项目为 ZIP 文件',
    description:
      '可选 query 参数：includePages=true|false、includeProjectDb=true|false、includeRtdb=true|false。' +
      '未传任何参数时默认全部包含（向后兼容）。',
  })
  async exportZip(
    @Param('projectId') projectId: string,
    @Request() req,
    @Res() res: Response,
    @Query('includePages') includePages?: string,
    @Query('includeProjectDb') includeProjectDb?: string,
    @Query('includeRtdb') includeRtdb?: string,
  ) {
    try {
      // 解析选择性导出参数：'true'/'false' 字符串转布尔，未传则 undefined（走默认全量）
      const parseBool = (v: string | undefined): boolean | undefined => {
        if (v === undefined) return undefined;
        return v === 'true' || v === '1';
      };
      const hasAnyParam =
        includePages !== undefined || includeProjectDb !== undefined || includeRtdb !== undefined;
      const options = hasAnyParam
        ? {
            includePages: parseBool(includePages) ?? true,
            includeProjectDb: parseBool(includeProjectDb) ?? true,
            includeRtdb: parseBool(includeRtdb) ?? true,
          }
        : undefined;

      const { filePath, projectName: _projectName } = await this.projectService.exportProjectZip(
        projectId,
        req.user.id,
        options,
      );
      const fileName = path.basename(filePath);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          this.logger.warn(`Failed to cleanup temp file: ${filePath}`);
        }
      });
    } catch (error) {
      const err = error as any;
      res.status(err.status || 500).json({
        message: err.message || '导出失败',
      });
    }
  }

  @Post('import')
  @WriteRoles()
  @ApiOperation({ summary: '导入项目（ZIP 文件）' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importZip(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Query('overwrite') overwrite?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传 ZIP 文件');
    }

    if (!file.originalname.toLowerCase().endsWith('.zip')) {
      throw new BadRequestException('仅支持 .zip 格式的文件');
    }

    const result = await this.projectService.importProjectZip(file.buffer, req.user.id, {
      overwrite: overwrite === 'true',
    });

    return {
      data: result.project,
      warnings: result.warnings,
    };
  }
}
