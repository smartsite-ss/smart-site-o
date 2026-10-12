// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  UseGuards,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';
import { GalleryService } from './gallery.service';
import { GalleryFormat, GalleryCategory, GalleryImage } from './gallery.types';

/**
 * 图库控制器
 *
 * 路由前缀：/api/v1/gallery
 * 读取类 API：所有登录用户可访问
 * 写入类 API（上传/删除）：仅 admin 可访问
 */
@ApiTags('图库管理')
@Controller('gallery')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get('formats')
  @ApiOperation({ summary: '列出所有格式目录（图元GIF/PNG/SVG）' })
  async listFormats(): Promise<GalleryFormat[]> {
    return this.galleryService.listFormats();
  }

  @Get('categories')
  @ApiOperation({ summary: '列出指定格式下的分类目录' })
  @ApiQuery({ name: 'format', required: true, description: '格式目录名，如图元PNG' })
  async listCategories(@Query('format') format: string): Promise<GalleryCategory[]> {
    if (!format) throw new BadRequestException('Missing format query');
    return this.galleryService.listCategories(format);
  }

  @Get('images')
  @ApiOperation({ summary: '列出指定分类下的图片文件' })
  @ApiQuery({ name: 'format', required: true, description: '格式目录名' })
  @ApiQuery({ name: 'category', required: true, description: '分类目录名' })
  async listImages(
    @Query('format') format: string,
    @Query('category') category: string,
  ): Promise<GalleryImage[]> {
    if (!format) throw new BadRequestException('Missing format query');
    if (!category) throw new BadRequestException('Missing category query');
    return this.galleryService.listImages(format, category);
  }

  @Get('image')
  @ApiOperation({ summary: '读取图库图片（静态访问）' })
  @ApiQuery({ name: 'format', required: true, description: '格式目录名' })
  @ApiQuery({ name: 'category', required: true, description: '分类目录名' })
  @ApiQuery({ name: 'fileName', required: true, description: '文件名' })
  async getImage(
    @Query('format') format: string,
    @Query('category') category: string,
    @Query('fileName') fileName: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!format || !category || !fileName) {
      throw new BadRequestException('Missing format/category/fileName query');
    }
    const resolved = this.galleryService.resolveImagePath(format, category, fileName);
    res.sendFile(resolved);
  }

  @Post('upload')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '上传图片到指定格式/分类（base64）' })
  async uploadImage(
    @Body()
    body: {
      format: string;
      category: string;
      fileName: string;
      base64: string;
    },
  ): Promise<{ fileName: string }> {
    if (!body?.format || !body?.category || !body?.fileName || !body?.base64) {
      throw new BadRequestException('Missing format/category/fileName/base64');
    }
    const buffer = Buffer.from(body.base64, 'base64');
    const fileName = await this.galleryService.uploadImage(
      buffer,
      body.fileName,
      body.format,
      body.category,
    );
    return { fileName };
  }

  @Delete('images')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除指定图片' })
  async deleteImage(
    @Query('format') format: string,
    @Query('category') category: string,
    @Query('fileName') fileName: string,
  ): Promise<{ deleted: boolean }> {
    if (!format || !category || !fileName) {
      throw new BadRequestException('Missing format/category/fileName query');
    }
    await this.galleryService.deleteImage(format, category, fileName);
    return { deleted: true };
  }
}
