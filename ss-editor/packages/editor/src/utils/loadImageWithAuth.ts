// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { resolveAssetPath } from '@scada-editor/core';

const TOKEN_KEY = 'scada_access_token';

/**
 * S-C03: Token 通过 HttpOnly Cookie 传输，getToken() 仅用于兼容回退。
 * 认证主要依赖 fetch 的 credentials: 'include'。
 */
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 使用认证令牌加载图片资源（统一解决 401 授权问题）
 *
 * S-C03: 通过 credentials: 'include' 携带 HttpOnly Cookie 认证，
 * 同时保留 Bearer Header 兼容回退。
 *
 * @param src - 原始图片路径（相对路径 / API 路径 / blob URL / data URL）
 * @returns 加载完成的 HTMLImageElement，加载失败时 reject
 */
export async function loadImageWithAuth(src: string): Promise<HTMLImageElement> {
  const resolvedSrc = resolveAssetPath(src);

  // blob / data URL 无需认证，直接加载
  if (resolvedSrc.startsWith('blob:') || resolvedSrc.startsWith('data:')) {
    return loadImageFromUrl(resolvedSrc);
  }

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // S-C03: 携带 HttpOnly Cookie 凭证
  const response = await fetch(resolvedSrc, { credentials: 'include', headers });
  if (!response.ok) {
    throw new Error(`Failed to load image (${response.status}): ${resolvedSrc}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to decode image blob: ${resolvedSrc}`));
    };
    img.crossOrigin = 'anonymous';
    img.src = blobUrl;
  });
}

/**
 * 从 URL 加载图片（用于 blob/data URL，无需认证）
 */
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}