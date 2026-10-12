// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';

/** 图库格式目录（第一层：图元GIF/PNG/SVG） */
export interface GalleryFormat {
  id: string;
  name: string;
  imageCount: number;
}

/** 图库分类目录（第二层：交通/仪表/开关等） */
export interface GalleryCategory {
  id: string;
  name: string;
  imageCount: number;
}

/** 图库图片文件（第三层） */
export interface GalleryImage {
  fileName: string;
  url: string;
  size: number;
}

export const galleryApi = {
  /** 列出所有格式目录 */
  listFormats(): Promise<ApiResponse<GalleryFormat[]>> {
    return client.get('/gallery/formats').then((res) => res.data);
  },

  /** 列出指定格式下的分类目录 */
  listCategories(format: string): Promise<ApiResponse<GalleryCategory[]>> {
    return client
      .get('/gallery/categories', { params: { format } })
      .then((res) => res.data);
  },

  /** 列出指定分类下的图片文件 */
  listImages(format: string, category: string): Promise<ApiResponse<GalleryImage[]>> {
    return client
      .get('/gallery/images', { params: { format, category } })
      .then((res) => res.data);
  },

  /** 上传图片（base64，admin） */
  uploadImage(payload: {
    format: string;
    category: string;
    fileName: string;
    base64: string;
  }): Promise<ApiResponse<{ fileName: string }>> {
    return client.post('/gallery/upload', payload).then((res) => res.data);
  },

  /** 删除指定图片（admin） */
  deleteImage(format: string, category: string, fileName: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return client
      .delete('/gallery/images', { params: { format, category, fileName } })
      .then((res) => res.data);
  },

  /**
   * 构造图片访问 URL（后端 GET /gallery/image 端点）
   */
  buildImageUrl(format: string, category: string, fileName: string): string {
    const params = new URLSearchParams({ format, category, fileName });
    return `${client.defaults.baseURL}/gallery/image?${params.toString()}`;
  },
};
