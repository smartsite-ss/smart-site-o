// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { resolveAssetPath as resolveAssetPathCore } from '@scada-editor/core';
import { getBaseURL } from '../api/client';

/**
 * 解析静态资源路径（system 包装版本，自动注入当前 API baseURL）。
 *
 * @param path - 原始资源路径
 * @returns 解析后的路径
 */
export function resolveAssetPath(path: string): string {
  return resolveAssetPathCore(path, getBaseURL());
}