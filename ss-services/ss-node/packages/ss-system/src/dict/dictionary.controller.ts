// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DictionaryLoaderService, DictTable } from './dictionary-loader.service';

@ApiTags('数据字典')
@Controller('dicts')
export class DictionaryController {
  constructor(private readonly dictLoader: DictionaryLoaderService) {}

  @Get()
  @ApiOperation({ summary: '获取字典分类树（按分类分组）' })
  @ApiQuery({ name: 'locale', required: false, description: '语言，默认 zh-CN' })
  getCategories(@Query('locale') locale?: string) {
    return {
      code: 200,
      data: this.dictLoader.getAllCategories(locale),
      message: 'OK',
      locale: locale || 'zh-CN',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('all')
  @ApiOperation({ summary: '获取所有字典表（平铺列表）' })
  @ApiQuery({ name: 'locale', required: false, description: '语言，默认 zh-CN' })
  getAll(@Query('locale') locale?: string) {
    return {
      code: 200,
      data: this.dictLoader.getAllDicts(locale),
      message: 'OK',
      locale: locale || 'zh-CN',
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== 分类管理 ====================

  @Post('categories')
  @ApiOperation({ summary: '创建分类（目录）' })
  @ApiBody({ schema: { properties: { locale: { type: 'string' }, name: { type: 'string' } } } })
  createCategory(@Body() body: { locale: string; name: string }) {
    this.dictLoader.createCategory(body.locale || 'zh-CN', body.name);
    return { code: 200, data: null, message: '分类已创建', timestamp: new Date().toISOString() };
  }

  @Patch('categories')
  @ApiOperation({ summary: '重命名分类' })
  @ApiBody({
    schema: {
      properties: {
        locale: { type: 'string' },
        oldName: { type: 'string' },
        newName: { type: 'string' },
      },
    },
  })
  renameCategory(@Body() body: { locale: string; oldName: string; newName: string }) {
    this.dictLoader.renameCategory(body.locale || 'zh-CN', body.oldName, body.newName);
    return { code: 200, data: null, message: '分类已重命名', timestamp: new Date().toISOString() };
  }

  @Delete('categories')
  @ApiOperation({ summary: '删除分类（目录及所有字典表）' })
  @ApiBody({ schema: { properties: { locale: { type: 'string' }, name: { type: 'string' } } } })
  deleteCategory(@Body() body: { locale: string; name: string }) {
    this.dictLoader.deleteCategory(body.locale || 'zh-CN', body.name);
    return { code: 200, data: null, message: '分类已删除', timestamp: new Date().toISOString() };
  }

  // ==================== 字典表管理 ====================

  @Post('tables')
  @ApiOperation({ summary: '创建字典表（JSON 文件）' })
  @ApiBody({
    schema: {
      properties: {
        locale: { type: 'string' },
        category: { type: 'string' },
        table: { type: 'object' },
      },
    },
  })
  createTable(@Body() body: { locale: string; category: string; table: DictTable }) {
    this.dictLoader.createTable(body.locale || 'zh-CN', body.category, body.table);
    return { code: 200, data: null, message: '字典表已创建', timestamp: new Date().toISOString() };
  }

  @Post('tables/import')
  @ApiOperation({ summary: '导入字典表（覆盖写入 JSON 文件）' })
  @ApiBody({
    schema: {
      properties: {
        locale: { type: 'string' },
        category: { type: 'string' },
        dictId: { type: 'string' },
        table: { type: 'object' },
      },
    },
  })
  importTable(
    @Body() body: { locale: string; category: string; dictId: string; table: DictTable },
  ) {
    this.dictLoader.importTable(body.locale || 'zh-CN', body.category, body.dictId, body.table);
    return { code: 200, data: null, message: '字典表已导入', timestamp: new Date().toISOString() };
  }

  @Get('tables/:dictId/export')
  @ApiOperation({ summary: '导出字典表（返回完整 JSON）' })
  @ApiQuery({ name: 'locale', required: false })
  @ApiQuery({ name: 'category', required: true })
  exportTable(
    @Param('dictId') dictId: string,
    @Query('locale') locale?: string,
    @Query('category') category?: string,
  ) {
    const data = this.dictLoader.exportTable(locale || 'zh-CN', category, dictId);
    return { code: 200, data, message: 'OK', timestamp: new Date().toISOString() };
  }

  @Put('tables/:dictId')
  @ApiOperation({ summary: '更新字典表（合并写入 JSON 文件）' })
  @ApiQuery({ name: 'locale', required: false })
  @ApiQuery({ name: 'category', required: true })
  @ApiBody({ schema: { properties: { table: { type: 'object' } } } })
  updateTable(
    @Param('dictId') dictId: string,
    @Query('locale') locale: string,
    @Query('category') category: string,
    @Body() body: { table: Partial<DictTable> },
  ) {
    this.dictLoader.updateTable(locale || 'zh-CN', category, dictId, body.table);
    return { code: 200, data: null, message: '字典表已更新', timestamp: new Date().toISOString() };
  }

  @Delete('tables/:dictId')
  @ApiOperation({ summary: '删除字典表（删除 JSON 文件）' })
  @ApiBody({ schema: { properties: { locale: { type: 'string' }, category: { type: 'string' } } } })
  deleteTable(@Param('dictId') dictId: string, @Body() body: { locale: string; category: string }) {
    this.dictLoader.deleteTable(body.locale || 'zh-CN', body.category, dictId);
    return { code: 200, data: null, message: '字典表已删除', timestamp: new Date().toISOString() };
  }

  @Get(':dictId')
  @ApiOperation({ summary: '根据 dictId 获取字典表详情，缓存未命中时自动从磁盘加载' })
  @ApiQuery({ name: 'locale', required: false, description: '语言，默认 zh-CN' })
  getDict(@Param('dictId') dictId: string, @Query('locale') locale?: string) {
    // 1. 先查缓存
    let dict = this.dictLoader.getDict(dictId, locale);

    // 2. 缓存未命中，尝试从磁盘加载（支持运行期新增字典）
    if (!dict) {
      dict = this.dictLoader.loadSingleDict(dictId, locale);
    }

    if (!dict) {
      return {
        code: 404,
        data: null,
        message: `字典 ${dictId} 不存在`,
        locale: locale || 'zh-CN',
        timestamp: new Date().toISOString(),
      };
    }
    return {
      code: 200,
      data: dict,
      message: 'OK',
      locale: locale || 'zh-CN',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reload')
  @ApiOperation({ summary: '热重载所有字典（重新扫描目录）' })
  async reload() {
    await this.dictLoader.reloadAll();
    return {
      data: {
        locales: this.dictLoader.getSupportedLocales(),
        count: this.dictLoader.getAllDicts().length,
      },
      message: '字典已重新加载',
      timestamp: new Date().toISOString(),
    };
  }
}
