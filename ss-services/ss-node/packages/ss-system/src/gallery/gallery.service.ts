// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GalleryFormat, GalleryCategory, GalleryImage } from './gallery.types';

/** 图库支持的图片扩展名 */
const IMAGE_EXTENSIONS = new Set(['.png', '.svg', '.gif', '.jpg', '.jpeg', '.webp']);

/**
 * 图库服务 — 纯文件方案
 *
 * 存储模型：
 *   - 文件系统：${IMAGES_DIR}/{格式}/{分类}/{文件}（图元 PNG/SVG/GIF 图片资源）
 *
 * 不依赖数据库，人工增删文件后自动生效。
 * 图片访问统一走 GET /gallery/image 端点（res.sendFile），与知识库图片访问方式一致。
 */
@Injectable()
export class GalleryService implements OnModuleInit {
  private readonly logger = new Logger(GalleryService.name);
  private readonly imagesRoot: string;

  constructor(
    private readonly config: ConfigService,
    private readonly pathResolver: PathResolverService,
  ) {
    this.imagesRoot = this.resolveImagesRoot();
  }

  private resolveImagesRoot(): string {
    const dataDir = this.config.get<string>('DATA_DIR') || '../../data';
    const absoluteDataDir = this.pathResolver.resolve(dataDir);
    const configured = this.config.get<string>('IMAGES_DIR');
    if (configured) {
      const expanded = configured.replace(/\$\{DATA_DIR\}/g, absoluteDataDir);
      return this.pathResolver.resolve(expanded);
    }
    return path.resolve(absoluteDataDir, 'images');
  }

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.imagesRoot, { recursive: true });
    this.logger.log(`Gallery initialized at ${this.imagesRoot}`);
  }

  getImagesRoot(): string {
    return this.imagesRoot;
  }

  /** 列出所有格式目录（第一层） */
  async listFormats(): Promise<GalleryFormat[]> {
    const entries = await this.readDirSafe(this.imagesRoot);
    const formats: GalleryFormat[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const formatDir = path.join(this.imagesRoot, entry.name);
      formats.push({
        id: entry.name,
        name: entry.name,
        imageCount: await this.countImages(formatDir),
      });
    }
    return formats;
  }

  /** 列出指定格式下的分类目录（第二层） */
  async listCategories(format: string): Promise<GalleryCategory[]> {
    this.assertSafeName(format);
    const formatDir = path.join(this.imagesRoot, format);
    const entries = await this.readDirSafe(formatDir);
    const categories: GalleryCategory[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const categoryDir = path.join(formatDir, entry.name);
      categories.push({
        id: entry.name,
        name: entry.name,
        imageCount: await this.countImages(categoryDir),
      });
    }
    return categories;
  }

  /** 列出指定分类下的图片文件（第三层） */
  async listImages(format: string, category: string): Promise<GalleryImage[]> {
    this.assertSafeName(format);
    this.assertSafeName(category);
    const categoryDir = path.join(this.imagesRoot, format, category);
    const entries = await this.readDirSafe(categoryDir);
    const images: GalleryImage[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith('.')) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;
      const stat = await fs.stat(path.join(categoryDir, entry.name));
      images.push({
        fileName: entry.name,
        url: this.buildImageUrl(format, category, entry.name),
        size: stat.size,
      });
    }
    return images;
  }

  /** 上传图片到指定格式/分类，返回文件名 */
  async uploadImage(
    buffer: Buffer,
    fileName: string,
    format: string,
    category: string,
  ): Promise<string> {
    this.assertSafeName(format);
    this.assertSafeName(category);
    const safeName = this.sanitizeFileName(fileName);
    if (!safeName) throw new BadRequestException('Invalid file name');
    this.assertImageExtension(safeName);
    const categoryDir = path.join(this.imagesRoot, format, category);
    await fs.mkdir(categoryDir, { recursive: true });
    await fs.writeFile(path.join(categoryDir, safeName), buffer);
    this.logger.log(`Image uploaded: ${format}/${category}/${safeName}`);
    return safeName;
  }

  /** 删除指定图片 */
  async deleteImage(format: string, category: string, fileName: string): Promise<void> {
    this.assertSafeName(format);
    this.assertSafeName(category);
    const safeName = path.basename(fileName);
    if (!safeName || safeName !== fileName) throw new BadRequestException('Invalid file name');
    const filePath = this.resolveImagePath(format, category, safeName);
    await fs.unlink(filePath);
    this.logger.log(`Image deleted: ${format}/${category}/${safeName}`);
  }

  /** 解析图片绝对路径（供 controller res.sendFile 使用），含路径遍历防护 */
  resolveImagePath(format: string, category: string, fileName: string): string {
    this.assertSafeName(format);
    this.assertSafeName(category);
    const safeName = path.basename(fileName);
    if (!safeName || safeName !== fileName) throw new BadRequestException('Invalid file name');
    const abs = path.join(this.imagesRoot, format, category, safeName);
    // 二次校验：确保解析后仍在图库根目录下
    const rootWithSep = this.imagesRoot.endsWith(path.sep)
      ? this.imagesRoot
      : this.imagesRoot + path.sep;
    if (!abs.startsWith(rootWithSep) && abs !== this.imagesRoot) {
      throw new BadRequestException('Image path escapes images root');
    }
    return abs;
  }

  // ==================== 私有方法 ====================

  private buildImageUrl(format: string, category: string, fileName: string): string {
    const params = new URLSearchParams({ format, category, fileName });
    return `/api/v1/gallery/image?${params.toString()}`;
  }

  private async readDirSafe(dir: string): Promise<import('fs').Dirent[]> {
    try {
      return await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
  }

  private async countImages(dir: string): Promise<number> {
    const entries = await this.readDirSafe(dir);
    return entries.filter(
      (e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()),
    ).length;
  }

  /** 校验格式/分类名不含路径分隔符与路径遍历字符 */
  private assertSafeName(name: string): void {
    if (
      !name ||
      name.includes('/') ||
      name.includes('\\') ||
      name === '.' ||
      name === '..'
    ) {
      throw new BadRequestException(`Invalid name: ${name}`);
    }
  }

  /** 上传文件名清理：仅保留中英文、数字、点、下划线、连字符 */
  private sanitizeFileName(fileName: string): string {
    const base = path.basename(fileName);
    return base.replace(/[^\u4e00-\u9fa5a-zA-Z0-9._-]/g, '_');
  }

  private assertImageExtension(fileName: string): void {
    const ext = path.extname(fileName).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`Unsupported image extension: ${ext}`);
    }
  }
}
