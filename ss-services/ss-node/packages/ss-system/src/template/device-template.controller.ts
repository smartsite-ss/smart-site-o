// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole, ReadRoles, WriteRoles } from '@ss-node/ss-core';
import { DeviceTemplateService, TemplateResponse } from './device-template.service';
import { TemplateLoaderService } from './template-loader.service';
import {
  TemplateIndexService,
  CreateCategoryDto,
  RenameCategoryDto,
} from './template-index.service';
import { CreateDeviceTemplateDto } from '../dto/create-device-template.dto';
import { UpdateDeviceTemplateDto } from '../dto/update-device-template.dto';
import { ApplyTemplateDto } from '../dto/apply-template.dto';
import { SyncTemplateDto } from '../dto/sync-template.dto';

@ApiTags('设备模板')
@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DeviceTemplateController {
  constructor(
    private readonly templateService: DeviceTemplateService,
    private readonly templateLoader: TemplateLoaderService,
    private readonly indexService: TemplateIndexService,
  ) {}

  @Post()
  @WriteRoles()
  @ApiOperation({ summary: '创建设备采集变量模板' })
  create(@Body() dto: CreateDeviceTemplateDto, @Req() req: any): Promise<TemplateResponse> {
    const authorId = req.user?.id || 'system';
    return this.templateService.create(dto, authorId);
  }

  @Get()
  @ReadRoles()
  @ApiOperation({ summary: '获取模板列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'deviceType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  findAll(@Query() query: any) {
    return this.templateService.findAll(query);
  }

  @Get('tags/all')
  @ReadRoles()
  @ApiOperation({ summary: '获取所有模板的标签列表' })
  getAllTags() {
    return this.templateService.getAllTags();
  }

  /**
   * ⚠️ 静态路由必须定义在 @Get(':id') 之前，否则 "index"/"loaded" 会被当作 :id 参数
   */
  @Get('index')
  @ReadRoles()
  @ApiOperation({ summary: '获取设备模板库索引（支持 locale 参数）' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: '语言代码，如 zh-CN / en-US，默认 zh-CN',
  })
  getIndex(@Query('locale') locale?: string) {
    const index = this.templateLoader.getIndex(locale);
    return {
      code: index ? 200 : 404,
      data: index,
      locale: this.templateLoader.resolveLocale(locale),
      message: 'OK',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('loaded')
  @ReadRoles()
  @ApiOperation({ summary: '获取已加载的所有设备模板数据（支持 locale 参数）' })
  @ApiQuery({ name: 'locale', required: false })
  getLoaded(@Query('locale') locale?: string) {
    const templates = this.templateLoader.getAllTemplates(locale);
    return {
      code: 200,
      data: templates,
      locale: this.templateLoader.resolveLocale(locale),
      message: 'OK',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':templateId/export')
  @ReadRoles()
  @ApiOperation({ summary: '导出模板 JSON（支持 locale 参数）' })
  @ApiQuery({ name: 'locale', required: false })
  async exportTemplate(@Param('templateId') templateId: string, @Query('locale') locale?: string) {
    const loaded = this.templateLoader.getTemplate(templateId, locale);
    if (!loaded)
      return {
        code: 404,
        data: null,
        locale: this.templateLoader.resolveLocale(locale),
        message: 'Template not found',
        timestamp: new Date().toISOString(),
      };

    const fs = await import('fs');
    if (loaded.filePath && fs.existsSync(loaded.filePath)) {
      const content = fs.readFileSync(loaded.filePath, 'utf-8');
      return {
        code: 200,
        data: JSON.parse(content),
        locale: this.templateLoader.resolveLocale(locale),
        message: 'OK',
        timestamp: new Date().toISOString(),
      };
    }

    // 回退：返回缓存的模板数据
    return {
      code: 200,
      data: loaded,
      locale: this.templateLoader.resolveLocale(locale),
      message: 'OK (from cache)',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':templateId')
  @ReadRoles()
  @ApiOperation({ summary: '获取模板详情（支持 locale 参数）' })
  @ApiQuery({ name: 'locale', required: false })
  findById(@Param('templateId') templateId: string, @Query('locale') locale?: string): Promise<TemplateResponse> {
    return this.templateService.findById(templateId, locale);
  }

  @Get(':templateId/devices')
  @ReadRoles()
  @ApiOperation({ summary: '获取模板关联的设备列表' })
  getLinkedDevices(@Param('templateId') templateId: string) {
    return this.templateService.getLinkedDevices(templateId);
  }

  @Patch(':templateId')
  @WriteRoles()
  @ApiOperation({ summary: '更新模板（支持 locale 参数）' })
  @ApiQuery({ name: 'locale', required: false })
  update(@Param('templateId') templateId: string, @Body() dto: UpdateDeviceTemplateDto, @Query('locale') locale?: string): Promise<TemplateResponse> {
    return this.templateService.update(templateId, dto, locale);
  }

  @Delete(':templateId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除模板' })
  remove(@Param('templateId') templateId: string) {
    return this.templateService.remove(templateId);
  }

  @Patch(':templateId/publish')
  @WriteRoles()
  @ApiOperation({ summary: '发布模板' })
  publish(@Param('templateId') templateId: string): Promise<TemplateResponse> {
    return this.templateService.publish(templateId);
  }

  @Patch(':templateId/deprecate')
  @WriteRoles()
  @ApiOperation({ summary: '弃用模板' })
  deprecate(@Param('templateId') templateId: string): Promise<TemplateResponse> {
    return this.templateService.deprecate(templateId);
  }

  @Post(':templateId/clone')
  @WriteRoles()
  @ApiOperation({ summary: '克隆模板' })
  clone(@Param('templateId') templateId: string, @Req() req: any): Promise<TemplateResponse> {
    const authorId = req.user?.id || 'system';
    return this.templateService.clone(templateId, authorId);
  }

  @Post(':templateId/apply')
  @WriteRoles()
  @ApiOperation({ summary: '应用模板到设备' })
  apply(@Param('templateId') templateId: string, @Body() dto: ApplyTemplateDto) {
    return this.templateService.apply(templateId, dto);
  }

  @Post(':templateId/sync')
  @WriteRoles()
  @ApiOperation({ summary: '同步模板变更到关联设备' })
  sync(@Param('templateId') templateId: string, @Body() dto: SyncTemplateDto) {
    return this.templateService.sync(templateId, dto);
  }

  @Post(':templateId/migrate-guids')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '★ 存量迁移：按模板回填 GUID 到关联设备标签' })
  async migrateGuidsForTemplate(
    @Param('templateId') templateId: string,
    @Query('dryRun') dryRun?: string,
  ) {
    const result = await this.templateService.migrateTemplateGuids({
      templateId: templateId,
      dryRun: dryRun === 'true',
    });
    return {
      code: 200,
      data: result,
      message: dryRun === 'true' ? 'DRY RUN 完成：未实际写入' : `模板 ${templateId} GUID 迁移完成`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reload')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '重新加载所有语言版本的模板缓存' })
  async reload() {
    const result = await this.templateLoader.reload();
    return {
      code: 200,
      data: { locales: result.locales, loaded: result.count },
      message: 'Templates reloaded',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('migrate-guids')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '★ 存量迁移：全量回填模板变量的 GUID 到已有设备标签' })
  async migrateAllGuids(@Query('dryRun') dryRun?: string) {
    const result = await this.templateService.migrateTemplateGuids({
      dryRun: dryRun === 'true',
    });
    return {
      code: 200,
      data: result,
      message: dryRun === 'true' ? 'DRY RUN 完成：未实际写入' : 'GUID 迁移完成',
      timestamp: new Date().toISOString(),
    };
  }

  // ===== 索引文件管理（目录结构操作）=====

  @Get('index/structure')
  @ReadRoles()
  @ApiOperation({ summary: '获取模板库目录结构（树形）' })
  getIndexStructure() {
    const structure = this.indexService.getDirectoryStructure();
    return { code: 200, data: structure, message: 'OK', timestamp: new Date().toISOString() };
  }

  @Post('index/rebuild')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '从目录结构重建指定语言的 index.json 文件' })
  async rebuildIndex(@Query('locale') locale?: string) {
    // 多语言: 重建并重载指定语言的索引，默认 zh-CN
    const index = await this.templateLoader.rebuildAndReload(locale);
    return {
      code: 200,
      data: index,
      message: `Index rebuilt for locale: ${(index as any)._locale || 'zh-CN'}`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('index/directory/category')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建分类目录（在行业下创建子目录）' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    const result = await this.indexService.createCategory(dto);
    return {
      code: 200,
      data: result,
      message: 'Category created',
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('index/directory/category')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '重命名分类目录' })
  async renameCategory(@Body() dto: RenameCategoryDto) {
    const result = await this.indexService.renameCategory(dto);
    return {
      code: 200,
      data: result,
      message: 'Category renamed',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('index/directory/category')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除分类目录（仅空目录）' })
  async deleteCategory(
    @Query('industryName') industryName: string,
    @Query('categoryName') categoryName: string,
  ) {
    const result = await this.indexService.deleteCategory({ industryName, categoryName });
    return {
      code: 200,
      data: result,
      message: 'Category deleted',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('import')
  @WriteRoles()
  @ApiOperation({ summary: '导入模板（JSON 数据）' })
  async importTemplate(
    @Body() data: Record<string, any>,
    @Req() req: any,
  ): Promise<TemplateResponse> {
    const authorId = req.user?.id || 'system';
    const dto: CreateDeviceTemplateDto = {
      name: data.name || 'Imported Template',
      description: data.description,
      deviceType: data.deviceType || data.protocolType || 'modbus_tcp',
      version: data.version || '1.0',
      variables: data.variables || [],
      tags: data.tags || [],
    };
    return this.templateService.create(dto, authorId);
  }
}
