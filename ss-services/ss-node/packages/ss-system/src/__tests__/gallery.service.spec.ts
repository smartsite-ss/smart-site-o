// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GalleryService } from '../gallery/gallery.service';
import { PathResolverService } from '@ss-node/ss-core';

/**
 * GalleryService 单元测试 — 纯文件方案
 *
 * 覆盖场景：
 *  1. 服务初始化（自动创建图库根目录）
 *  2. listFormats（格式目录列表 + 图片计数）
 *  3. listCategories（分类目录列表 + 图片计数）
 *  4. listImages（图片文件列表 + URL + 大小）
 *  5. uploadImage（上传写入 + 文件名净化 + 扩展名校验）
 *  6. deleteImage（删除）
 *  7. resolveImagePath（路径解析 + 越界/遍历防护）
 */
describe('GalleryService', () => {
  let service: GalleryService;
  let tempDir: string;
  let imagesRoot: string;
  let mockConfigService: { get: jest.Mock };
  let mockPathResolver: { resolve: jest.Mock };

  beforeAll(() => {
    tempDir = path.join(
      os.tmpdir(),
      `gallery-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    imagesRoot = path.join(tempDir, 'images');
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    if (fs.existsSync(imagesRoot)) {
      fs.rmSync(imagesRoot, { recursive: true, force: true });
    }

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'DATA_DIR') return tempDir;
        if (key === 'IMAGES_DIR') return imagesRoot;
        return undefined;
      }),
    };

    mockPathResolver = {
      resolve: jest.fn((p: string) => path.resolve(p)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalleryService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PathResolverService, useValue: mockPathResolver },
      ],
    }).compile();

    service = module.get<GalleryService>(GalleryService);
    await service.onModuleInit();
  });

  // ==================== 1. 初始化 ====================

  describe('onModuleInit', () => {
    it('应创建图库根目录', () => {
      expect(fs.existsSync(imagesRoot)).toBe(true);
    });

    it('应暴露正确的图库根目录路径', () => {
      expect(service.getImagesRoot()).toBe(path.resolve(imagesRoot));
    });
  });

  // ==================== 2. listFormats ====================

  describe('listFormats', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(imagesRoot, '图元PNG'), { recursive: true });
      fs.mkdirSync(path.join(imagesRoot, '图元SVG'), { recursive: true });
      fs.writeFileSync(path.join(imagesRoot, '图元PNG', 'a.png'), 'x');
      fs.writeFileSync(path.join(imagesRoot, '图元PNG', 'b.png'), 'x');
    });

    it('应返回所有格式目录', async () => {
      const formats = await service.listFormats();
      const ids = formats.map((f) => f.id);
      expect(ids).toContain('图元PNG');
      expect(ids).toContain('图元SVG');
    });

    it('应统计格式目录下的图片数', async () => {
      const formats = await service.listFormats();
      const png = formats.find((f) => f.id === '图元PNG');
      expect(png?.imageCount).toBe(2);
      const svg = formats.find((f) => f.id === '图元SVG');
      expect(svg?.imageCount).toBe(0);
    });

    it('应忽略隐藏目录', async () => {
      fs.mkdirSync(path.join(imagesRoot, '.hidden'), { recursive: true });
      const formats = await service.listFormats();
      expect(formats.map((f) => f.id)).not.toContain('.hidden');
    });
  });

  // ==================== 3. listCategories ====================

  describe('listCategories', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(imagesRoot, '图元PNG', '交通'), { recursive: true });
      fs.mkdirSync(path.join(imagesRoot, '图元PNG', '开关'), { recursive: true });
      fs.writeFileSync(path.join(imagesRoot, '图元PNG', '交通', '1.png'), 'x');
    });

    it('应返回指定格式下的分类目录', async () => {
      const categories = await service.listCategories('图元PNG');
      const names = categories.map((c) => c.name);
      expect(names).toContain('交通');
      expect(names).toContain('开关');
    });

    it('应统计分类目录下的图片数', async () => {
      const categories = await service.listCategories('图元PNG');
      const traffic = categories.find((c) => c.name === '交通');
      expect(traffic?.imageCount).toBe(1);
    });

    it('应拒绝非法格式名', async () => {
      await expect(service.listCategories('../etc')).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== 4. listImages ====================

  describe('listImages', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(imagesRoot, '图元PNG', '交通'), { recursive: true });
      fs.writeFileSync(path.join(imagesRoot, '图元PNG', '交通', '1.png'), 'image-data');
      fs.writeFileSync(path.join(imagesRoot, '图元PNG', '交通', 'not-image.txt'), 'txt');
    });

    it('应返回指定分类下的图片文件（过滤非图片扩展名）', async () => {
      const images = await service.listImages('图元PNG', '交通');
      expect(images.length).toBe(1);
      expect(images[0].fileName).toBe('1.png');
    });

    it('应返回带 /api/v1/gallery/image 前缀的访问 URL', async () => {
      const images = await service.listImages('图元PNG', '交通');
      expect(images[0].url).toBe(
        '/api/v1/gallery/image?format=%E5%9B%BE%E5%85%83PNG&category=%E4%BA%A4%E9%80%9A&fileName=1.png',
      );
    });

    it('应返回图片大小', async () => {
      const images = await service.listImages('图元PNG', '交通');
      expect(images[0].size).toBe(Buffer.from('image-data').length);
    });

    it('不存在的分类应返回空数组', async () => {
      const images = await service.listImages('图元PNG', '不存在');
      expect(images).toEqual([]);
    });
  });

  // ==================== 5. uploadImage ====================

  describe('uploadImage', () => {
    it('应写入图片文件并返回文件名', async () => {
      const buffer = Buffer.from('fake-png');
      const fileName = await service.uploadImage(buffer, 'car.png', '图元PNG', '交通');
      expect(fileName).toBe('car.png');
      const filePath = path.join(imagesRoot, '图元PNG', '交通', 'car.png');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath)).toEqual(buffer);
    });

    it('应对文件名做安全清理（去除路径遍历字符）', async () => {
      const fileName = await service.uploadImage(
        Buffer.from('x'),
        '../../etc/passwd.png',
        '图元PNG',
        '交通',
      );
      expect(fileName).not.toContain('..');
      expect(fileName).toBe('passwd.png');
    });

    it('应拒绝非法扩展名', async () => {
      await expect(
        service.uploadImage(Buffer.from('x'), 'evil.exe', '图元PNG', '交通'),
      ).rejects.toThrow(BadRequestException);
    });

    it('应拒绝空文件名', async () => {
      await expect(
        service.uploadImage(Buffer.from('x'), '///', '图元PNG', '交通'),
      ).rejects.toThrow(BadRequestException);
    });

    it('应拒绝非法格式名', async () => {
      await expect(
        service.uploadImage(Buffer.from('x'), 'a.png', '../etc', '交通'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== 6. deleteImage ====================

  describe('deleteImage', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(imagesRoot, '图元PNG', '交通'), { recursive: true });
      fs.writeFileSync(path.join(imagesRoot, '图元PNG', '交通', '1.png'), 'x');
    });

    it('应删除指定图片', async () => {
      await service.deleteImage('图元PNG', '交通', '1.png');
      expect(fs.existsSync(path.join(imagesRoot, '图元PNG', '交通', '1.png'))).toBe(false);
    });

    it('应拒绝带路径分隔符的文件名', async () => {
      await expect(service.deleteImage('图元PNG', '交通', '../1.png')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== 7. resolveImagePath 路径遍历防护 ====================

  describe('resolveImagePath', () => {
    it('应解析到图库根目录内的绝对路径', () => {
      const abs = service.resolveImagePath('图元PNG', '交通', '1.png');
      expect(abs).toBe(path.join(imagesRoot, '图元PNG', '交通', '1.png'));
    });

    it('应拒绝包含 ../ 的文件名', () => {
      expect(() => service.resolveImagePath('图元PNG', '交通', '../secret.png')).toThrow(
        BadRequestException,
      );
    });

    it('应拒绝格式名中的路径分隔符', () => {
      expect(() => service.resolveImagePath('../etc', '交通', '1.png')).toThrow(
        BadRequestException,
      );
    });

    it('应拒绝分类名为 .. 的遍历', () => {
      expect(() => service.resolveImagePath('图元PNG', '..', '1.png')).toThrow(
        BadRequestException,
      );
    });

    it('应拒绝绝对路径文件名', () => {
      expect(() => service.resolveImagePath('图元PNG', '交通', '/etc/passwd')).toThrow(
        BadRequestException,
      );
    });
  });
});
