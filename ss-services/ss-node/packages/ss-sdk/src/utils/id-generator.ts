// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { randomUUID, randomBytes } from 'crypto';

/** base36 字母表（0-9, a-z） */
const BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** URL 安全字母表（A-Z, a-z, 0-9, _, -） */
const URL_SAFE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/**
 * ID 生成器
 *
 * 提供多种 ID 生成策略，基于 Node.js 内置 crypto 模块，无额外依赖。
 */
export class IdGenerator {
  /**
   * 生成标准 UUID v4
   * @returns 36 字符的 UUID 字符串（如 `550e8400-e29b-41d4-a716-446655440000`）
   */
  static uuid(): string {
    return randomUUID();
  }

  /**
   * 生成短 ID（base36 编码）
   * @param length 长度，默认 8
   * @returns 短 ID 字符串（如 `a3f9k2x7`）
   */
  static shortId(length: number = 8): string {
    const safeLength = Math.max(1, length);
    const bytes = randomBytes(safeLength);
    let result = '';
    for (let i = 0; i < safeLength; i++) {
      result += BASE36_ALPHABET[bytes[i] % BASE36_ALPHABET.length];
    }
    return result;
  }

  /**
   * 生成带前缀的 ID
   * @param prefix 业务前缀（如 `dev`、`tag`）
   * @param length 随机部分长度，默认 8
   * @returns 带前缀的 ID（如 `dev-abc12345`）
   */
  static prefixedId(prefix: string, length: number = 8): string {
    return `${prefix}-${this.shortId(length)}`;
  }

  /**
   * 生成类似 nanoid 的 URL 安全 ID
   * @param length 长度，默认 21（与 nanoid 默认一致）
   * @returns URL 安全的随机 ID（如 `V1StGXR8_Z5jdHi6B-myT`）
   */
  static nanoid(length: number = 21): string {
    const safeLength = Math.max(1, length);
    const bytes = randomBytes(safeLength);
    let result = '';
    for (let i = 0; i < safeLength; i++) {
      result += URL_SAFE_ALPHABET[bytes[i] % URL_SAFE_ALPHABET.length];
    }
    return result;
  }

  /**
   * 生成顺序 ID
   * @param prefix 业务前缀（如 `TMP`）
   * @param seq 序列号
   * @param padding 填充位数，默认 6
   * @returns 顺序 ID（如 `TMP-000001`）
   */
  static sequentialId(prefix: string, seq: number, padding: number = 6): string {
    const safePadding = Math.max(1, padding);
    return `${prefix}-${String(seq).padStart(safePadding, '0')}`;
  }

  /**
   * 生成基于时间的 ID（时间戳 + 随机后缀）
   * @param prefix 可选前缀
   * @returns 基于时间的 ID（如 `dev-lq2abc123456`）
   */
  static timeBasedId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const suffix = this.shortId(6);
    return prefix ? `${prefix}-${timestamp}${suffix}` : `${timestamp}${suffix}`;
  }
}
