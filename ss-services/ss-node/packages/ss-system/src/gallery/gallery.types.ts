// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 图库类型定义 — 纯文件方案
 *
 * 存储模型：
 *   - 文件系统：${IMAGES_DIR}/{格式}/{分类}/{文件}（图元 PNG/SVG/GIF 图片资源）
 *
 * 不依赖数据库，人工增删文件后自动生效。
 */

/** 图库格式目录（第一层：图元GIF/图元PNG/图元SVG） */
export interface GalleryFormat {
  /** 格式目录名，如 '图元PNG' */
  id: string;
  /** 显示名，默认同 id */
  name: string;
  /** 该格式下的图片总数（不含子分类目录） */
  imageCount: number;
}

/** 图库分类目录（第二层：交通/仪表/开关等） */
export interface GalleryCategory {
  /** 分类目录名，如 '交通' */
  id: string;
  /** 显示名，默认同 id */
  name: string;
  /** 该分类下的图片总数 */
  imageCount: number;
}

/** 图库图片文件（第三层） */
export interface GalleryImage {
  /** 文件名，如 '1.png' */
  fileName: string;
  /** 图片访问 URL */
  url: string;
  /** 文件大小（字节） */
  size: number;
}
