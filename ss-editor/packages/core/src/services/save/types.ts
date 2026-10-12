// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 项目数据结构
 */
export interface ProjectData {
  version: string;
  savedAt: number;
  currentPageId: string;
  pages: PageData[];
  /** 页面 ID → 分组名映射（按需加载时使用） */
  pageGroups?: Record<string, string>;
  /** 分组名 → 分组显示名映射 */
  groupNames?: Record<string, string>;
}

/**
 * 页面数据结构
 */
export interface PageData {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  graphics: any[];
  /** 页面背景图片 */
  backgroundImage?: string;
  /** 标记为延迟加载（仅含大纲信息，graphics 为空） */
  _lazy?: boolean;
  /** 模板引用 ID（引用模式） */
  templateId?: string;
  /** 模板应用模式 */
  templateMode?: 'reference' | 'copy';
}

/**
 * 保存服务接口
 * 不同实现（localStorage/mock/server）需实现此接口
 */
export interface ISaveService {
  /**
   * 保存项目数据
   */
  save(data: ProjectData): Promise<void>;

  /**
   * 加载项目数据
   */
  load(): Promise<ProjectData | null>;

  /**
   * 删除项目数据
   */
  delete(): Promise<void>;

  /**
   * 检查是否有已保存的数据
   */
  hasSavedData(): Promise<boolean>;
}

/**
 * 保存服务配置
 */
export interface SaveServiceConfig {
  /**
   * 服务类型：local/mock/server
   */
  type: 'local' | 'mock' | 'server';

  /**
   * API 基础路径（仅 server 模式需要）
   */
  apiBaseUrl?: string;
}

/**
 * 保存状态
 */
export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';
