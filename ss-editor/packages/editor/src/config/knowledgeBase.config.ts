// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 知识库配置
 *
 * 定义知识库 JSON 文件的加载 URL，支持多优先级配置。
 */

/** 知识库配置接口 */
export interface KnowledgeBaseConfig {
  /** 知识库基础 URL（不含版本路径） */
  baseUrl: string;
  /** 默认版本号 */
  defaultVersion: string;
  /** 完整 URL */
  url: string;
  /** 请求超时（毫秒） */
  timeout: number;
  /** 本地缓存键名 */
  localStorageKey: string;
  /** 是否启用本地缓存 */
  enableCache: boolean;
  /** 缓存有效期（毫秒） */
  cacheTtl: number;
}

/** 获取知识库 URL（按优先级） */
function resolveKbUrl(): string {
  // 优先级 1：运行时全局变量
  if (typeof window !== 'undefined' && (window as any).SCRIPT_KB_URL) {
    return (window as any).SCRIPT_KB_URL;
  }

  // 优先级 2：环境变量（Vite 编译期注入）
  const envUrl = import.meta.env.VITE_SCRIPT_KB_URL;
  if (envUrl) {
    return envUrl;
  }

  // 优先级 3：默认路径（当前 Web 服务器静态目录）
  return '/static/knowledge-base';
}

/** 获取完整知识库 URL（含版本） */
export function getKnowledgeBaseUrl(version?: string): string {
  const baseUrl = resolveKbUrl();
  const ver = version || 'v2';

  // 如果 baseUrl 已经包含 .json，直接使用
  if (baseUrl.endsWith('.json')) {
    return baseUrl;
  }

  // 否则拼接版本路径
  return `${baseUrl}/${ver}/kb-data.json`;
}

/** 获取 versions.json URL */
export function getVersionsUrl(): string {
  const baseUrl = resolveKbUrl();

  if (baseUrl.endsWith('.json')) {
    return baseUrl.replace(/\/v\d+\/kb-data\.json$/, '/versions.json');
  }

  return `${baseUrl}/versions.json`;
}

/** 当前应用版本（用于兼容性检查） */
export function getAppVersion(): string {
  // 从全局变量或 package.json 获取
  if (typeof window !== 'undefined' && (window as any).APP_VERSION) {
    return (window as any).APP_VERSION;
  }

  // 默认版本
  return '1.0.0';
}

/** 默认配置 */
export const knowledgeBaseConfig: KnowledgeBaseConfig = {
  baseUrl: resolveKbUrl(),
  defaultVersion: 'v2',
  url: getKnowledgeBaseUrl(),
  timeout: 10000,
  localStorageKey: 'scada_knowledge_base_cache',
  enableCache: true,
  cacheTtl: 3600000, // 1 小时
};

export default knowledgeBaseConfig;
