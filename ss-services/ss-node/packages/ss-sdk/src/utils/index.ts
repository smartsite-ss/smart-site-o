// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';

// ==================== ID 生成器 ====================

/** 生成标准 UUID v4 */
export function generateId(): string {
  return uuidv4();
}

/** 生成短 ID（基于 nanoid 风格的随机字符串） */
export function generateShortId(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/** 生成带业务前缀的 ID */
export function generateBusinessId(prefix: string, length: number = 12): string {
  return `${prefix}-${generateShortId(length)}`;
}

/** 生成设备 ID */
export function generateDeviceId(): string {
  return generateBusinessId('DEV', 10);
}

/** 生成标签 ID */
export function generateTagId(): string {
  return generateBusinessId('TAG', 10);
}

/** 生成告警 ID */
export function generateAlarmId(): string {
  return generateBusinessId('ALM', 10);
}

// ==================== 分页构建 ====================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ==================== 敏感数据脱敏 ====================

/** 脱敏配置 */
export interface MaskOptions {
  /** 显示前 N 位 */
  showFirst?: number;
  /** 显示后 N 位 */
  showLast?: number;
  /** 掩码字符 */
  maskChar?: string;
}

const DEFAULT_MASK_OPTIONS: MaskOptions = {
  showLast: 4,
  maskChar: '*',
};

/** 通用脱敏函数 */
export function maskSensitive(value: string, options?: MaskOptions | number): string {
  if (!value) return '***';

  const opts: MaskOptions =
    typeof options === 'number' ? { showLast: options } : { ...DEFAULT_MASK_OPTIONS, ...options };

  const { showFirst = 0, showLast = 0, maskChar = '*' } = opts;

  if (showFirst + showLast >= value.length) {
    return maskChar.repeat(3);
  }

  const firstPart = showFirst > 0 ? value.slice(0, showFirst) : '';
  const lastPart = showLast > 0 ? value.slice(-showLast) : '';
  const maskLen = Math.max(value.length - showFirst - showLast, 3);
  return firstPart + maskChar.repeat(maskLen) + lastPart;
}

/** 密码脱敏：完全遮蔽 */
export function maskPassword(_password: string): string {
  return '******';
}

/** Token 脱敏：仅显示前后几位 */
export function maskToken(token: string): string {
  if (!token || token.length <= 8) return '***';
  return maskSensitive(token, { showFirst: 4, showLast: 4 });
}

/** 手机号脱敏：138****1234 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return '***';
  return maskSensitive(phone, { showFirst: 3, showLast: 4 });
}

/** 邮箱脱敏：a***b@domain.com */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const maskedLocal =
    local.length <= 2 ? local[0] + '***' : local[0] + '***' + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
}

// ==================== 工具函数 ====================

/** 深度冻结对象 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    Object.keys(obj).forEach((key) => {
      deepFreeze((obj as Record<string, unknown>)[key]);
    });
  }
  return obj;
}

/** 安全 JSON 解析 */
export function safeJsonParse<T = unknown>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/** 延迟 Promise */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 重试执行 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries) {
        await delay(delayMs * (i + 1));
      }
    }
  }
  throw lastError;
}

// ==================== 日期工具函数 ====================

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 格式化日期时间为 YYYY-MM-DD HH:mm:ss */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const datePart = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}:${seconds}`;
}

/** 获取某天的开始时间 */
export function startOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 获取某天的结束时间 */
export function endOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** 获取某月的第一天 */
export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/** 获取某月的最后一天 */
export function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

// ==================== 校验工具函数 ====================

/** 校验邮箱 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** 校验手机号（中国大陆） */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/** 校验 IP 地址 */
export function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
  return ipv4Regex.test(ip);
}

// ==================== 加密工具函数 ====================

/** 创建哈希（SHA-256） */
export function createHash256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** 创建 MD5 哈希 */
export function createHashMd5(data: string): string {
  return createHash('md5').update(data).digest('hex');
}

/** 生成随机 Token */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// ==================== 文件路径工具 ====================

/** 获取文件扩展名 */
export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(idx + 1).toLowerCase() : '';
}

/** 获取文件基本名（不含扩展名） */
export function getFileBasename(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}
