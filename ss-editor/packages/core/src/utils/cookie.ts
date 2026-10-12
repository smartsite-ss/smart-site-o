// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 简易 Cookie 工具
 * 用于存储非敏感的客户端配置（如标签页状态）
 */

const COOKIE_MAX_AGE_DAYS = 365;
const COOKIE_PATH = '/';

/**
 * 设置 cookie
 */
export function setCookie(name: string, value: string, maxAgeDays: number = COOKIE_MAX_AGE_DAYS): void {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};path=${COOKIE_PATH};max-age=${maxAge};SameSite=Lax`;
}

/**
 * 获取 cookie 值，返回 null 表示不存在
 */
export function getCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const c = cookies[i].trim();
    if (c.startsWith(prefix)) {
      return decodeURIComponent(c.substring(prefix.length));
    }
  }
  return null;
}

/**
 * 删除 cookie
 */
export function deleteCookie(name: string): void {
  document.cookie = `${encodeURIComponent(name)}=;path=${COOKIE_PATH};max-age=0;SameSite=Lax`;
}

/**
 * 设置 JSON cookie
 */
export function setJsonCookie<T>(name: string, value: T, maxAgeDays?: number): void {
  setCookie(name, JSON.stringify(value), maxAgeDays);
}

/**
 * 获取 JSON cookie
 */
export function getJsonCookie<T>(name: string): T | null {
  const raw = getCookie(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
