// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { FieldError } from './types';

/**
 * 采集通道配置校验工具
 *
 * 从 Modbus / S7 / MQTT 插件中提取的公共校验逻辑
 */
export class ConfigValidator {
  private static readonly IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
  private static readonly HOSTNAME_REGEX =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  /**
   * 校验主机地址（IP / 主机名 / localhost）
   */
  static isValidHost(host: string): boolean {
    return (
      host === 'localhost' ||
      ConfigValidator.IPV4_REGEX.test(host) ||
      ConfigValidator.HOSTNAME_REGEX.test(host)
    );
  }

  /**
   * 校验端口号范围
   */
  static isValidPort(port: number): boolean {
    return port >= 1 && port <= 65535;
  }

  /**
   * 校验数值范围
   */
  static isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * 校验主机地址并返回错误项（用于 validateChannelConfig）
   */
  static validateHost(
    host: string,
    field: string = 'host',
    label: string = '主机地址',
  ): FieldError | null {
    if (host && !ConfigValidator.isValidHost(host)) {
      return { field, message: `${label}格式无效` };
    }
    return null;
  }

  /**
   * 校验端口范围并返回错误项
   */
  static validatePort(
    port: number | undefined,
    field: string = 'port',
    label: string = '端口号',
  ): FieldError | null {
    if (port !== undefined && !ConfigValidator.isValidPort(port)) {
      return { field, message: `${label}必须在1-65535范围内` };
    }
    return null;
  }

  /**
   * 校验数值范围并返回错误项
   */
  static validateRange(
    value: number | undefined,
    min: number,
    max: number,
    field: string,
    label: string,
  ): FieldError | null {
    if (value !== undefined && !ConfigValidator.isInRange(value, min, max)) {
      return { field, message: `${label}必须在${min}-${max}范围内` };
    }
    return null;
  }

  /**
   * 校验 URL 前缀
   */
  static validateUrlPrefix(
    url: string | undefined,
    prefixes: string[],
    field: string,
    label: string,
  ): FieldError | null {
    if (url && !prefixes.some((p) => url.startsWith(p))) {
      return { field, message: `${label}必须以 ${prefixes.join(' 或 ')} 开头` };
    }
    return null;
  }

  /**
   * 校验枚举值
   */
  static validateEnum(
    value: any | undefined,
    allowedValues: any[],
    field: string,
    label: string,
  ): FieldError | null {
    if (value !== undefined && !allowedValues.includes(value)) {
      return { field, message: `${label}必须为 ${allowedValues.join('、')} 之一` };
    }
    return null;
  }
}
