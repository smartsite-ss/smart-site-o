// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 知识库类型定义 — 纯文件方案（v2.0 多产品架构）
 *
 * 存储模型：
 *   - manifest.json：多产品清单 + 每个产品的模块清单和路由映射（语言无关）
 *   - Markdown frontmatter：每篇文章自带元数据（id/title/lang/module 等）
 *   - Git：版本历史（不内置版本表）
 *
 * 文件结构：
 *   ${KB_ROOT}/{lang}/{product}/{module}/*.md
 */

/** 知识库模块元数据（语言无关，来自 manifest.json） */
export interface KbModule {
  id: string;
  name: string;
  nameI18n?: Record<string, string>;
  icon?: string;
  order: number;
  routePath?: string;
  /** 是否为全局章节（系统概述/操作手册） */
  isGlobal?: boolean;
  /** 全局章节类型：overview（系统概述）/ manual（操作手册） */
  globalType?: 'overview' | 'manual';
}

/** 路由映射（语言无关，来自 manifest.json） */
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
  /** 该产品的模块清单 */
  modules: KbModule[];
  /** 该产品的路由映射 */
  routeMap: KbRouteMapping[];
}

/** manifest.json 结构（v2.0 多产品） */
export interface KbManifest {
  version: string;
  /** 产品列表（v2.0 新增，替代 v1.0 的 modules/routeMap 顶层字段） */
  products: KbProduct[];
}

/** 产品列表项（精简，用于前端产品选择器） */
export interface KbProductListItem {
  id: string;
  name: string;
  nameI18n?: Record<string, string>;
  icon?: string;
  order: number;
  moduleCount: number;
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
  /** 匹配片段 */
  snippet: string;
  lang: string;
}

/** 语言统计（按产品） */
export interface KbLangStat {
  lang: string;
  /** 各产品的文章统计 */
  products: Array<{
    product: string;
    articleCount: number;
    moduleCount: number;
  }>;
  /** 兼容字段：总文章数 */
  articleCount: number;
  /** 兼容字段：总模块数 */
  moduleCount: number;
}

export interface KbLangsResponse {
  defaultLang: string;
  supportedLangs: string[];
  stats: KbLangStat[];
}

/** 产品列表响应 */
export interface KbProductsResponse {
  products: KbProductListItem[];
  defaultProduct: string;
}
