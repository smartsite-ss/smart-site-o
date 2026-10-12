// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Res,
  Req,
  UseGuards,
  Logger,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import {
  PageSaveService,
  SaveAllPagesResult,
  ProjectsDirInfo,
  PageListResult,
  PageReadResult,
  PageSaveResult,
  PageDeleteResult,
  GroupListResult,
  GroupCreateResult,
  GroupDeleteResult,
  ResourceUploadResult,
  ReadAllPagesResult,
  BatchReadPagesResult,
  ProjectOutlineResult,
} from './page-save.service';
import { JwtAuthGuard } from '@ss-node/ss-core';
import { Public } from '@ss-node/ss-core';

@ApiTags('项目管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class PageSaveController {
  private readonly logger = new Logger(PageSaveController.name);

  constructor(private readonly pageSaveService: PageSaveService) {}

  @Get(':projectId/pages/groups')
  @ApiOperation({
    summary: '列出项目所有页面分组',
    description: '扫描项目 pages 目录下的子目录作为分组',
  })
  listGroups(@Param('projectId') projectId: string): GroupListResult {
    return this.pageSaveService.listGroups(projectId);
  }

  @Post(':projectId/pages/groups')
  @ApiOperation({
    summary: '创建页面分组',
    description: '在项目 pages 目录下创建一个子目录作为分组',
  })
  createGroup(
    @Param('projectId') projectId: string,
    @Body() body: { groupName: string },
  ): GroupCreateResult {
    return this.pageSaveService.createGroup(projectId, body.groupName);
  }

  @Delete(':projectId/pages/groups/:groupName')
  @ApiOperation({
    summary: '删除页面分组',
    description: '删除项目 pages 目录下的子目录及其所有页面文件',
  })
  deleteGroup(
    @Param('projectId') projectId: string,
    @Param('groupName') groupName: string,
  ): GroupDeleteResult {
    const decoded = decodeURIComponent(groupName);
    return this.pageSaveService.deleteGroup(projectId, decoded);
  }

  @Post(':projectId/pages/migrate')
  @ApiOperation({
    summary: '迁移项目页面到新的前缀命名规范（p_ / g_）',
    description: '将存量项目 pages 目录下的页面和分组迁移到 p_ / g_ 前缀命名规范，并自动去重',
  })
  migratePages(@Param('projectId') projectId: string): {
    success: boolean;
    projectName: string;
    migratedPages: number;
    migratedGroups: number;
    removedDuplicates: number;
  } {
    const result = this.pageSaveService.migrateProject(projectId);
    return { success: true, projectName: projectId, ...result };
  }

  @Get(':projectId/pages')
  @ApiOperation({
    summary: '列出项目所有页面文件',
    description: '扫描项目 pages 目录，返回所有页面文件信息',
  })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  listPages(
    @Param('projectId') projectId: string,
    @Query('group') groupName?: string,
  ): PageListResult {
    return this.pageSaveService.listPages(projectId, groupName);
  }

  @Get(':projectId/pages/all')
  @ApiOperation({
    summary: '列出项目所有页面（含分组，已去重）',
    description:
      '扫描项目 pages 根目录和所有分组，按页面名称去重后返回。根目录页面优先于分组中的同名页面。',
  })
  listAllPages(@Param('projectId') projectId: string): PageListResult {
    return this.pageSaveService.listAllPages(projectId);
  }

  @Get(':projectId/pages/all/data')
  @ApiOperation({
    summary: '获取所有页面完整数据（含分组，已去重）',
    description:
      '一次返回项目所有页面（根目录+所有分组）的完整 page.json 数据。按页面名称去重，根目录优先。',
  })
  readAllPagesData(@Param('projectId') projectId: string): ReadAllPagesResult {
    return this.pageSaveService.readAllPages(projectId);
  }

  @Get(':projectId/pages/outline')
  @ApiOperation({
    summary: '获取项目页面大纲（轻量级，不含 page.json 数据）',
    description:
      '返回分组及其页面列表、根目录页面列表。仅扫描目录结构，不读取任何 page.json 的内容。' +
      ' 用于编辑器「先加载大纲 → 按需加载页面数据」的按需加载策略。',
  })
  getProjectOutline(@Param('projectId') projectId: string): ProjectOutlineResult {
    return this.pageSaveService.getProjectOutline(projectId);
  }

  @Post(':projectId/pages/batch-read')
  @ApiOperation({
    summary: '批量读取页面完整数据',
    description:
      '一次请求读取多个页面的 page.json 数据（同一分组下），替代 N 次串行 readPage 调用。',
  })
  batchReadPages(
    @Param('projectId') projectId: string,
    @Body() body: { names: string[]; groupName?: string },
  ): BatchReadPagesResult {
    return this.pageSaveService.batchReadPages(projectId, body.names, body.groupName);
  }

  @Get(':projectId/pages/projects-dir')
  @ApiOperation({
    summary: '获取工程目录信息',
    description: '返回当前配置的工程文件保存目录及其存在状态',
  })
  getProjectsDir(@Param('projectId') _projectId: string): ProjectsDirInfo {
    return this.pageSaveService.getProjectsDirInfo();
  }

  @Get(':projectId/pages/:pageName')
  @ApiOperation({
    summary: '读取指定页面文件内容',
    description: '读取项目 pages 目录下的指定页面 JSON 文件',
  })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  readPage(
    @Param('projectId') projectId: string,
    @Param('pageName') pageName: string,
    @Query('group') groupName?: string,
  ): PageReadResult {
    const decoded = decodeURIComponent(pageName);
    return this.pageSaveService.readPage(projectId, decoded, groupName);
  }

  @Get(':projectId/pages/:pageName/preview_small.png')
  @Public()
  @ApiOperation({ summary: '获取页面预览小图（允许 <img> 标签无鉴权加载）' })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  getPreviewSmallImage(
    @Param('projectId') projectId: string,
    @Param('pageName') pageName: string,
    @Query('group') groupName: string | undefined,
    @Res() res: Response,
  ): void {
    const filePath = this.pageSaveService.getPreviewImagePath(
      projectId,
      decodeURIComponent(pageName),
      groupName,
      'preview_small',
    );
    if (!filePath) {
      throw new NotFoundException('页面预览小图不存在');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Get(':projectId/pages/:pageName/preview.png')
  @Public()
  @ApiOperation({ summary: '获取页面预览大图（允许 <img> 标签无鉴权加载）' })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  getPreviewImage(
    @Param('projectId') projectId: string,
    @Param('pageName') pageName: string,
    @Query('group') groupName: string | undefined,
    @Res() res: Response,
  ): void {
    const filePath = this.pageSaveService.getPreviewImagePath(
      projectId,
      decodeURIComponent(pageName),
      groupName,
      'preview',
    );
    if (!filePath) {
      throw new NotFoundException('页面预览图不存在');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Post(':projectId/pages/save')
  @ApiOperation({
    summary: '保存所有页面为独立文件',
    description:
      '保存所有页面数据到项目 pages 目录。可同步上传当前页面的 preview.png / preview_small.png',
  })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'preview', maxCount: 1 },
        { name: 'previewSmall', maxCount: 1 },
      ],
      {
        limits: {
          fieldSize: 50 * 1024 * 1024, // 50MB: pagesJson 文本字段可能很大（含 data URL 背景图等）
          fileSize: 50 * 1024 * 1024, // 50MB: preview.png / preview_small.png
        },
      },
    ),
  )
  async saveAllPages(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @UploadedFiles()
    files?: { preview?: Express.Multer.File[]; previewSmall?: Express.Multer.File[] },
    @Query('group') groupName?: string,
  ): Promise<SaveAllPagesResult> {
    // 使用 @Req() 直接读 req.body，避免 @Body() 与 multer/ValidationPipe 冲突导致
    // multipart 解析后 body 字段丢失（表现为 "缺少 pages 数据" 400 错误）
    const body = (req.body || {}) as Record<string, any>;

    let pages = body?.pages;
    if (!pages && body?.pagesJson) {
      try {
        pages = JSON.parse(body.pagesJson);
      } catch (e) {
        throw new BadRequestException('pagesJson 解析失败');
      }
    }
    if (!Array.isArray(pages)) {
      this.logger.warn(
        `saveAllPages: body keys=${JSON.stringify(Object.keys(body))}, pagesJson type=${typeof body?.pagesJson}`,
      );
      throw new BadRequestException('缺少 pages 数据');
    }

    // 仅当前页（previewPageName 指定的那一页）携带预览图
    const previewPageName = body?.previewPageName as string | undefined;
    const previewPageId = body?.previewPageId as string | undefined;
    const previews: Record<string, { preview?: Buffer; previewSmall?: Buffer }> = {};
    if (previewPageName) {
      previews[previewPageName] = {
        preview: files?.preview?.[0]?.buffer,
        previewSmall: files?.previewSmall?.[0]?.buffer,
      };
      if (previewPageId) {
        this.logger.log(`saveAllPages: preview page name=${previewPageName} id=${previewPageId}`);
      }
    }

    return this.pageSaveService.saveAllPages(projectId, pages, groupName, previews);
  }

  @Post(':projectId/pages/save/:pageName')
  @ApiOperation({
    summary: '保存单个页面文件（含运行态截图）',
    description:
      '创建页面名称对应的文件夹，保存 page.json、preview.png（可选）与 preview_small.png（可选）',
  })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'preview', maxCount: 1 },
        { name: 'previewSmall', maxCount: 1 },
      ],
      {
        limits: {
          fieldSize: 50 * 1024 * 1024,
          fileSize: 50 * 1024 * 1024,
        },
      },
    ),
  )
  savePage(
    @Param('projectId') projectId: string,
    @Param('pageName') pageName: string,
    @Body('page') pageJson: string,
    @UploadedFiles()
    files?: { preview?: Express.Multer.File[]; previewSmall?: Express.Multer.File[] },
    @Query('group') groupName?: string,
  ): PageSaveResult {
    const decoded = decodeURIComponent(pageName);
    if (!pageJson) {
      throw new BadRequestException('缺少页面数据');
    }
    const pageData: Record<string, any> = JSON.parse(pageJson);
    return this.pageSaveService.savePage(
      projectId,
      decoded,
      pageData,
      groupName,
      files?.preview?.[0]?.buffer,
      files?.previewSmall?.[0]?.buffer,
    );
  }

  @Delete(':projectId/pages/:pageName')
  @ApiOperation({ summary: '删除指定页面文件' })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  deletePage(
    @Param('projectId') projectId: string,
    @Param('pageName') pageName: string,
    @Query('group') groupName?: string,
  ): PageDeleteResult {
    const decoded = decodeURIComponent(pageName);
    return this.pageSaveService.deletePage(projectId, decoded, groupName);
  }

  @Patch(':projectId/pages/:pageName/rename')
  @ApiOperation({ summary: '重命名页面', description: '重命名页面文件夹' })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  renamePage(
    @Param('projectId') projectId: string,
    @Param('pageName') pageName: string,
    @Body() body: { newName: string },
    @Query('group') groupName?: string,
  ): PageSaveResult {
    const decoded = decodeURIComponent(pageName);
    return this.pageSaveService.renamePage(projectId, decoded, body.newName, groupName);
  }

  @Patch(':projectId/pages/:pageName/move')
  @ApiOperation({ summary: '移动页面到其他分组', description: '将页面文件夹移动到指定分组' })
  @ApiQuery({ name: 'fromGroup', required: false, description: '源分组名称' })
  movePage(
    @Param('projectId') projectId: string,
    @Param('pageName') pageName: string,
    @Body() body: { toGroup?: string },
    @Query('fromGroup') fromGroup?: string,
  ): PageSaveResult {
    const decoded = decodeURIComponent(pageName);
    return this.pageSaveService.movePage(projectId, decoded, fromGroup, body.toGroup);
  }

  @Post(':projectId/pages/:pageName/background')
  @ApiOperation({ summary: '上传页面背景图片' })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  uploadBackground(
    @Param('projectId') projectId: string,
    @Param('pageName') pageName: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('group') groupName?: string,
  ): ResourceUploadResult {
    const decoded = decodeURIComponent(pageName);
    if (!file) {
      throw new BadRequestException('缺少背景图片文件');
    }
    return this.pageSaveService.uploadPageBackground(
      projectId,
      decoded,
      file.buffer,
      file.originalname || 'background.png',
      groupName,
    );
  }

  @Post(':projectId/pages/:pageName/preview')
  @ApiOperation({ summary: '上传页面截图预览' })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'smallFile', maxCount: 1 },
      ],
      {
        limits: { fileSize: 50 * 1024 * 1024 },
      },
    ),
  )
  uploadPreview(
    @Param('projectId') projectId: string,
    @Param('pageName') pageName: string,
    @UploadedFiles() files?: { file?: Express.Multer.File[]; smallFile?: Express.Multer.File[] },
    @Query('group') groupName?: string,
  ): ResourceUploadResult {
    const decoded = decodeURIComponent(pageName);
    const mainFile = files?.file?.[0];
    if (!mainFile) {
      throw new BadRequestException('缺少预览图片文件');
    }
    return this.pageSaveService.uploadPagePreview(
      projectId,
      decoded,
      mainFile.buffer,
      files?.smallFile?.[0]?.buffer,
      groupName,
    );
  }

  @Get(':projectId/pages/:pageName/:fileName')
  @Public() // 允许 <img> 标签无鉴权加载预览图
  @ApiOperation({ summary: '获取页面资源文件（背景图等）' })
  @ApiQuery({ name: 'group', required: false, description: '分组名称' })
  getResource(
    @Param('projectId') projectId: string,
    @Param('pageName') pageName: string,
    @Param('fileName') fileName: string,
    @Query('group') groupName: string | undefined,
    @Res() res: Response,
  ) {
    const decodedPageName = decodeURIComponent(pageName);
    const decodedFileName = decodeURIComponent(fileName);
    const filePath = this.pageSaveService.getResourceFilePath(
      projectId,
      decodedPageName,
      decodedFileName,
      groupName,
    );

    if (!filePath) {
      throw new NotFoundException('资源文件不存在');
    }

    res.sendFile(filePath);
  }

  @Post(':projectId/pages/export')
  @ApiOperation({
    summary: '导出所有页面为 ZIP 文件',
    description: '将项目 pages 目录打包为 ZIP 下载',
  })
  async exportPagesZip(@Param('projectId') projectId: string, @Res() res: Response) {
    try {
      const { filePath } = await this.pageSaveService.exportPagesZip(projectId);
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
        message: err.message || '导出页面失败',
      });
    }
  }

  @Post(':projectId/pages/import')
  @ApiOperation({ summary: '导入页面（ZIP 文件）', description: '从 ZIP 文件导入页面到项目' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async importPagesZip(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('overwrite') overwrite?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传 ZIP 文件');
    }

    if (!file.originalname.toLowerCase().endsWith('.zip')) {
      throw new BadRequestException('仅支持 .zip 格式的文件');
    }

    const result = await this.pageSaveService.importPagesZip(projectId, file.buffer, {
      overwrite: overwrite === 'true',
    });

    return {
      success: true,
      importedCount: result.importedCount,
      warnings: result.warnings,
    };
  }
}
