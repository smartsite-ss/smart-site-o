// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';

/** 知识库模块元数据 */
export interface KbModule {
  id: string;
  name: string;
  nameI18n?: Record<string, string>;
  icon?: string;
  order: number;
  routePath?: string;
  /** 是否为全局章节（系统概述/操作手册） */
  isGlobal?: boolean;
  /** 全局章节类型 */
  globalType?: 'overview' | 'manual';
}

/** 路由映射 */
export interface KbRouteMapping {
  routePattern: string;
  knowledgePath: string;
  hintTextKey?: string;
  hintDismissible?: boolean;
}

/** 单个产品的知识库定义 */
export interface KbProduct {
  id: string;
  name: string;
  nameI18n?: Record<string, string>;
  icon?: string;
  order: number;
  modules: KbModule[];
  routeMap: KbRouteMapping[];
}

/** manifest.json 结构（v2.0 多产品） */
export interface KbManifest {
  version: string;
  products: KbProduct[];
}

/** 产品列表项（精简） */
export interface KbProductListItem {
  id: string;
  name: string;
  nameI18n?: Record<string, string>;
  icon?: string;
  order: number;
  moduleCount: number;
}

/** 产品列表响应 */
export interface KbProductsResponse {
  products: KbProductListItem[];
  defaultProduct: string;
}

/** 文章完整内容 */
export interface KbArticle {
  id: string;
  title: string;
  lang: string;
  /** 产品 ID（v2.0 新增） */
  product: string;
  module: string;
  category: string;
  order: number;
  tags: string[];
  updatedAt: string;
  updatedBy?: string;
  status: string;
  /** Markdown 正文（不含 frontmatter） */
  content: string;
  /** 相对于 {KB_ROOT}/{lang}/{product} 的路径 */
  filePath: string;
  /** 是否为 Fallback 命中 */
  fallback: boolean;
  /** Fallback 时的原始请求语言 */
  requestedLang?: string;
}

/** 目录树节点 */
export interface KbTreeNode {
  id: string;
  title: string;
  type: 'folder' | 'article';
  lang: string;
  /** 产品 ID（v2.0 新增） */
  product?: string;
  /** 是否为全局章节 */
  isGlobal?: boolean;
  globalType?: 'overview' | 'manual';
  fallback: boolean;
  order?: number;
  updatedAt?: string;
  children?: KbTreeNode[];
}

/** 路由匹配结果 */
export interface KbRouteMatch {
  knowledgePath: string;
  hintTextKey?: string;
  articleId?: string;
  lang: string;
  /** 产品 ID（v2.0 新增） */
  product: string;
  fallback: boolean;
  requestedLang?: string;
}

/** 搜索结果 */
export interface KbSearchResult {
  id: string;
  title: string;
  module: string;
  /** 产品 ID（v2.0 新增） */
  product: string;
  filePath: string;
  snippet: string;
  lang: string;
}

/** 语言统计 */
export interface KbLangStat {
  lang: string;
  products: Array<{
    product: string;
    articleCount: number;
    moduleCount: number;
  }>;
  articleCount: number;
  moduleCount: number;
}

export interface KbLangsResponse {
  defaultLang: string;
  supportedLangs: string[];
  stats: KbLangStat[];
}

/** 图片上传响应 */
export interface KbUploadImageResult {
  url: string;
}

/** 默认产品 ID */
export const DEFAULT_PRODUCT = 'ss-data';

export const kbApi = {
  /** 获取所有产品列表 */
  getProducts(): Promise<ApiResponse<KbProductsResponse>> {
    return client.get('/kb/products').then((res) => res.data);
  },

  /** 获取支持的语言列表及统计 */
  getLangs(product?: string): Promise<ApiResponse<KbLangsResponse>> {
    const params = product ? { product } : {};
    return client.get('/kb/langs', { params }).then((res) => res.data);
  },

  /** 获取知识库目录树 */
  getTree(product?: string, lang?: string): Promise<ApiResponse<KbTreeNode[]>> {
    const params: Record<string, string> = {};
    if (product) params.product = product;
    if (lang) params.lang = lang;
    return client.get('/kb/tree', { params }).then((res) => res.data);
  },

  /** 路由匹配知识库路径 */
  matchRoute(
    routePath: string,
    product?: string,
    lang?: string,
  ): Promise<ApiResponse<KbRouteMatch | null>> {
    const params: Record<string, string> = { path: routePath };
    if (product) params.product = product;
    if (lang) params.lang = lang;
    return client.get('/kb/route-match', { params }).then((res) => res.data);
  },

  /** 全文搜索 */
  search(query: string, product?: string, lang?: string): Promise<ApiResponse<KbSearchResult[]>> {
    const params: Record<string, string> = { q: query };
    if (product) params.product = product;
    if (lang) params.lang = lang;
    return client.get('/kb/search', { params }).then((res) => res.data);
  },

  /** 获取单篇文章 */
  getArticle(id: string, product?: string, lang?: string): Promise<ApiResponse<KbArticle>> {
    const params: Record<string, string> = {};
    if (product) params.product = product;
    if (lang) params.lang = lang;
    return client
      .get(`/kb/article/${encodeURIComponent(id)}`, { params })
      .then((res) => res.data);
  },

  /** 更新文章内容（admin，lang 必填） */
  updateArticle(
    id: string,
    content: string,
    lang: string,
    product?: string,
  ): Promise<ApiResponse<KbArticle>> {
    const body: { content: string; lang: string; product?: string } = { content, lang };
    if (product) body.product = product;
    return client
      .put(`/kb/article/${encodeURIComponent(id)}`, body)
      .then((res) => res.data);
  },

  /** 上传图片（admin，base64） */
  uploadImage(
    filename: string,
    base64: string,
    moduleId: string,
    lang: string,
    product?: string,
  ): Promise<ApiResponse<KbUploadImageResult>> {
    const body: {
      filename: string;
      base64: string;
      moduleId: string;
      lang: string;
      product?: string;
    } = { filename, base64, moduleId, lang };
    if (product) body.product = product;
    return client.post('/kb/upload-image', body).then((res) => res.data);
  },

  /**
   * 构造图片访问 URL（后端 GET /kb/image 端点）
   * @param relativePath uploadImage 返回的相对路径，如 "03-device/images/foo.png"
   * @param lang 语言
   * @param product 产品 ID
   */
  buildImageUrl(relativePath: string, lang: string, product?: string): string {
    let url = `${client.defaults.baseURL}/kb/image?path=${encodeURIComponent(relativePath)}&lang=${encodeURIComponent(lang)}`;
    if (product) url += `&product=${encodeURIComponent(product)}`;
    return url;
  },
};
