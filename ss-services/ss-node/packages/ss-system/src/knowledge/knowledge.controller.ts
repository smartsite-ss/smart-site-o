// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Put,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';
import { KnowledgeService } from './knowledge.service';
import type {
  KbTreeNode,
  KbArticle,
  KbRouteMatch,
  KbSearchResult,
  KbLangsResponse,
  KbProductsResponse,
} from './knowledge.types';

/**
 * 知识库控制器（v2.0 多产品架构）
 *
 * 路由前缀：/api/v1/kb
 * 读取类 API：所有登录用户可访问
 * 写入类 API：仅 admin 可访问
 *
 * 产品参数：
 *   - 所有 API 的 ?product= 缺省时使用默认产品 ss-data（向后兼容）
 *
 * 语言参数：
 *   - 读取类 API 的 ?lang= 缺省时使用 KB_DEFAULT_LANG
 *   - 写入类 API 的 lang 必填（指明本次编辑的语言版本）
 */
@ApiTags('知识库')
@Controller('kb')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class KnowledgeController {
  constructor(private readonly kbService: KnowledgeService) {}

  @Get('products')
  @ApiOperation({ summary: '获取所有产品列表' })
  async getProducts(): Promise<KbProductsResponse> {
    return this.kbService.getProducts();
  }

  @Get('langs')
  @ApiOperation({ summary: '获取支持的语言列表 + 文章数统计（按产品）' })
  @ApiQuery({ name: 'product', required: false, description: '产品 ID（默认 ss-data）' })
  async getLangs(@Query('product') product?: string): Promise<KbLangsResponse> {
    return this.kbService.getLangs(product);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取目录树（缺失语言自动 Fallback 默认语言）' })
  @ApiQuery({ name: 'product', required: false, description: '产品 ID（默认 ss-data）' })
  @ApiQuery({ name: 'lang', required: false, description: '语言代码' })
  async getTree(
    @Query('product') product?: string,
    @Query('lang') lang?: string,
  ): Promise<KbTreeNode[]> {
    return this.kbService.getTree(product, lang);
  }

  @Get('route-match')
  @ApiOperation({ summary: '根据前端路由匹配知识库路径' })
  @ApiQuery({ name: 'path', required: true, description: '前端路由路径' })
  @ApiQuery({ name: 'product', required: false, description: '产品 ID（默认 ss-data）' })
  @ApiQuery({ name: 'lang', required: false, description: '语言代码' })
  async matchRoute(
    @Query('path') routePath: string,
    @Query('product') product?: string,
    @Query('lang') lang?: string,
  ): Promise<KbRouteMatch | null> {
    if (!routePath) throw new BadRequestException('Missing path query');
    return this.kbService.matchRoute(routePath, product, lang);
  }

  @Get('search')
  @ApiOperation({ summary: '全文搜索（仅在指定语言+产品目录内搜索）' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
  @ApiQuery({ name: 'product', required: false, description: '产品 ID（默认 ss-data）' })
  @ApiQuery({ name: 'lang', required: false, description: '语言代码' })
  async search(
    @Query('q') query: string,
    @Query('product') product?: string,
    @Query('lang') lang?: string,
  ): Promise<KbSearchResult[]> {
    return this.kbService.search(query, product, lang);
  }

  @Get('article/*')
  @ApiOperation({ summary: '读取文章（支持多级路径如 00-manual/installation）' })
  @ApiQuery({ name: 'product', required: false, description: '产品 ID（默认 ss-data）' })
  @ApiQuery({ name: 'lang', required: false, description: '语言代码' })
  async getArticle(
    @Param('0') id: string,
    @Query('product') product?: string,
    @Query('lang') lang?: string,
  ): Promise<KbArticle> {
    return this.kbService.getArticle(id, product, lang);
  }

  @Put('article/*')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新文章（支持多级路径）' })
  async updateArticle(
    @Param('0') id: string,
    @Body() body: { lang: string; content: string; product?: string },
    @Req() req: any,
  ): Promise<KbArticle> {
    if (!body?.lang || !body?.content) {
      throw new BadRequestException('Missing lang or content in body');
    }
    const userId = req.user?.username || req.user?.sub || 'unknown';
    return this.kbService.updateArticle(id, body.content, userId, body.lang, body.product);
  }

  @Post('upload-image')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '上传图片（base64，按语言+产品+模块目录隔离存储）' })
  async uploadImage(
    @Body()
    body: {
      lang: string;
      moduleId: string;
      filename: string;
      base64: string;
      product?: string;
    },
  ): Promise<{ url: string }> {
    if (!body?.lang || !body?.moduleId || !body?.filename || !body?.base64) {
      throw new BadRequestException('Missing lang/moduleId/filename/base64');
    }
    const buffer = Buffer.from(body.base64, 'base64');
    const url = await this.kbService.uploadImage(
      buffer,
      body.filename,
      body.moduleId,
      body.lang,
      body.product,
    );
    return { url };
  }

  @Get('image')
  @ApiOperation({ summary: '读取知识库图片（按语言+产品目录定位）' })
  @ApiQuery({ name: 'path', required: true, description: '图片相对路径' })
  @ApiQuery({ name: 'lang', required: true, description: '语言代码' })
  @ApiQuery({ name: 'product', required: false, description: '产品 ID（默认 ss-data）' })
  async getImage(
    @Query('path') relPath: string,
    @Query('lang') lang: string,
    @Res() res: Response,
    @Query('product') product?: string,
  ): Promise<void> {
    if (!relPath) throw new BadRequestException('Missing path query');
    const resolved = await this.kbService.resolveImagePath(relPath, lang, product);
    res.sendFile(resolved);
  }
}
