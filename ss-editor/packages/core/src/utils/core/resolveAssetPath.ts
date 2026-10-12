// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 解析静态资源路径，将硬编码的 API 版本前缀替换为当前版本。
 *
 * 问题背景：保存的 backgroundImage 路径可能包含固定 API 版本前缀（如 /api/v1/...），
 * 当后端 API 版本升级后，这些路径会失效。此工具函数将路径中的旧版本前缀
 * 替换为当前配置的 baseURL，确保资源始终可访问。
 *
 * @param path - 原始资源路径，可能为绝对路径（/api/v1/...）、相对路径或 blob URL
 * @param baseURL - 当前 API baseURL，默认为 '/api/v1'
 * @returns 解析后的路径，使用当前 API baseURL
 */
export function resolveAssetPath(path: string, baseURL: string = '/api/v1'): string {
  if (!path) return path;

  // 保留 blob URL 和 data URL 不变
  if (path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }

  // 保留完整 HTTP(S) URL 不变
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // 匹配 /api/v{digits}/... 格式的路径，替换为当前 baseURL
  const apiVersionPrefixRegex = /^\/api\/v\d+\//;
  if (apiVersionPrefixRegex.test(path)) {
    return path.replace(apiVersionPrefixRegex, baseURL + '/');
  }

  // 如果是相对路径（不以 / 开头），拼接当前 baseURL
  if (!path.startsWith('/')) {
    return baseURL + '/' + path;
  }

  // 如果路径以 / 开头但不匹配 /api/v{digits}/，直接拼接
  if (path.startsWith('/')) {
    return baseURL + path;
  }

  return path;
}