// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 页面模板管理 — 类型定义
 * 
 * 归属模块：ss-editor / 画布与页面 / 模板管理
 */

/** 模板分类 */
export type TemplateCategory =
  | 'blank'          // 空白
  | 'login'          // 登录页
  | 'dashboard'      // 仪表盘
  | 'industrial'     // 工业监控
  | 'data-screen'    // 数据大屏
  | 'mobile'         // 移动端
  | 'custom';        // 自定义

/** 模板来源 */
export type TemplateSource = 'builtin' | 'user' | 'market';

/** 布局类型 */
export type TemplateLayoutType = 'free' | 'grid' | 'flow' | 'circle';

/** 页面模板 */
export interface PageTemplate {
  /** 模板唯一标识 */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description?: string;
  /** 分类 */
  category: TemplateCategory;
  /** 图标（emoji 或 URL） */
  icon?: string;
  /** 缩略图（dataURL 或远程 URL） */
  thumbnail?: string;

  /** 来源标识 */
  source: TemplateSource;
  /** 作者 */
  author?: string;
  /** 版本号 */
  version: string;

  /** 页面配置 */
  pageConfig: {
    width: number;
    height: number;
    backgroundColor: string;
    backgroundImage?: string;
    layout: TemplateLayoutType;
    themeName?: string;
  };

  /** 图元 JSON 数组 */
  graphics: unknown[];

  /** 标签 */
  tags?: string[];
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/** 模板分类元数据 */
export interface TemplateCategoryMeta {
  key: TemplateCategory;
  labelKey: string;
  icon: string;
}

/** 模板分类列表 */
export const TEMPLATE_CATEGORIES: TemplateCategoryMeta[] = [
  { key: 'blank',       labelKey: 'template.category.blank',       icon: '📄' },
  { key: 'login',       labelKey: 'template.category.login',       icon: '🔑' },
  { key: 'dashboard',   labelKey: 'template.category.dashboard',   icon: '📊' },
  { key: 'industrial',  labelKey: 'template.category.industrial',  icon: '⚙️' },
  { key: 'data-screen', labelKey: 'template.category.dataScreen',  icon: '🖥️' },
  { key: 'mobile',      labelKey: 'template.category.mobile',      icon: '📱' },
  { key: 'custom',      labelKey: 'template.category.custom',      icon: '📋' },
];
