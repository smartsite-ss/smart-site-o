// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 数据脱敏工具
 *
 * 用于日志、API 响应等场景中的敏感信息遮蔽，支持常见字段类型和递归对象脱敏。
 */
export class DataMask {
  /**
   * 通用字符串脱敏（保持原始长度不变，用 `*` 填充中间部分）
   * @param str 原始字符串
   * @param startKeep 头部保留字符数
   * @param endKeep 尾部保留字符数
   * @returns 脱敏后的字符串
   */
  static maskString(str: string, startKeep: number, endKeep: number): string {
    if (!str) return '';
    const start = Math.max(0, startKeep);
    const end = Math.max(0, endKeep);
    if (start + end >= str.length) {
      return '*'.repeat(str.length);
    }
    const head = str.slice(0, start);
    const tail = str.slice(str.length - end);
    const maskLen = str.length - start - end;
    return head + '*'.repeat(maskLen) + tail;
  }

  /**
   * 手机号脱敏（保持长度，如 `138****5678`）
   * @param phone 手机号
   * @returns 脱敏后的手机号
   */
  static maskPhone(phone: string): string {
    if (!phone) return '';
    if (phone.length < 7) {
      return '*'.repeat(phone.length);
    }
    return this.maskString(phone, 3, 4);
  }

  /**
   * 邮箱脱敏（如 `a***@example.com`）
   * @param email 邮箱地址
   * @returns 脱敏后的邮箱
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email ?? '';
    const atIndex = email.indexOf('@');
    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex);
    if (local.length === 0) return email;
    return local[0] + '***' + domain;
  }

  /**
   * 身份证号脱敏（保持长度，如 `110***********1234`）
   * @param idCard 身份证号
   * @returns 脱敏后的身份证号
   */
  static maskIdCard(idCard: string): string {
    if (!idCard) return '';
    if (idCard.length < 8) {
      return '*'.repeat(idCard.length);
    }
    return this.maskString(idCard, 3, 4);
  }

  /**
   * 密码脱敏（固定返回 `******`）
   * @returns `******`
   */
  static maskPassword(): string {
    return '******';
  }

  /**
   * IP 地址脱敏（掩码第三段，如 `192.168.*.1`）
   * @param ip IPv4 地址
   * @returns 脱敏后的 IP
   */
  static maskIp(ip: string): string {
    if (!ip) return '';
    const parts = ip.split('.');
    if (parts.length !== 4) return ip;
    parts[2] = '*';
    return parts.join('.');
  }

  /**
   * 对象字段脱敏（递归处理嵌套对象和数组）
   *
   * 匹配字段名在 `fields` 中的字段，将其值替换为 `******`。
   * 对数组和嵌套对象会递归处理。
   *
   * @param obj 原始对象
   * @param fields 需要脱敏的字段名列表
   * @returns 脱敏后的对象（浅拷贝，不修改原始对象）
   */
  static maskObject<T>(obj: T, fields: string[]): T {
    if (obj === null || obj === undefined) return obj;
    const fieldsSet = new Set(fields);

    const process = (value: unknown): unknown => {
      if (value === null || value === undefined) return value;
      if (Array.isArray(value)) {
        return value.map(process);
      }
      if (typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
          if (fieldsSet.has(key)) {
            result[key] = '******';
          } else {
            result[key] = process(entryValue);
          }
        }
        return result;
      }
      return value;
    };

    if (typeof obj !== 'object') return obj;
    return process(obj) as T;
  }

  /**
   * JSON 字符串脱敏
   *
   * 解析 JSON 字符串，对指定字段进行递归脱敏后重新序列化。
   * 如果 JSON 解析失败，返回原始字符串。
   *
   * @param json JSON 字符串
   * @param fields 需要脱敏的字段名列表
   * @returns 脱敏后的 JSON 字符串
   */
  static maskJson(json: string, fields: string[]): string {
    try {
      const parsed = JSON.parse(json) as unknown;
      const masked = this.maskObject(parsed, fields);
      return JSON.stringify(masked);
    } catch {
      return json;
    }
  }
}
