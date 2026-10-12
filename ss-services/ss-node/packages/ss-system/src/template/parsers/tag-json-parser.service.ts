// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, BadRequestException } from '@nestjs/common';

/** 从 JSON 解析出的标签原始数据 */
export interface ParsedJsonTag {
  name: string;
  address: string;
  dataType: string;
  description?: string;
  unit?: string;
  minValue?: number | null;
  maxValue?: number | null;
  scanRate?: number;
  enabled?: boolean;
  category?: string;
  order?: number;
  [key: string]: any;
}

/** JSON 解析结果 */
export interface JsonParseResult {
  tags: ParsedJsonTag[];
  /** 如果是对象格式，保留元数据 */
  metadata?: {
    schemaVersion?: string;
    templateType?: string;
    name?: string;
    description?: string;
    deviceType?: string;
    version?: string;
  };
}

@Injectable()
export class TagJsonParserService {
  private readonly logger = new Logger(TagJsonParserService.name);

  /**
   * 解析 JSON 字符串，返回标签数据
   * 支持两种格式：
   *   1. 数组格式：[{name, address, dataType, ...}, ...]
   *   2. 对象格式：{ tags: [...], name, deviceType, ... }
   */
  parse(jsonString: string): JsonParseResult {
    let parsed: any;

    try {
      parsed = JSON.parse(jsonString);
    } catch (error: any) {
      throw new BadRequestException(`JSON 解析失败: ${error.message}`);
    }

    if (parsed === null || parsed === undefined) {
      throw new BadRequestException('JSON 数据为空');
    }

    // 数组格式
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        throw new BadRequestException('JSON 标签数组为空');
      }
      return {
        tags: parsed.map((item, index) => this.normalizeTag(item, index)),
      };
    }

    // 对象格式
    if (typeof parsed === 'object') {
      // 支持 tags 字段
      if (Array.isArray(parsed.tags)) {
        if (parsed.tags.length === 0) {
          throw new BadRequestException('JSON 中 tags 数组为空');
        }
        return {
          tags: parsed.tags.map((item: any, index: number) => this.normalizeTag(item, index)),
          metadata: {
            schemaVersion: parsed.schemaVersion,
            templateType: parsed.templateType,
            name: parsed.name,
            description: parsed.description,
            deviceType: parsed.deviceType,
            version: parsed.version,
          },
        };
      }

      // 支持 variables 字段（与模板内部格式一致）
      if (Array.isArray(parsed.variables)) {
        if (parsed.variables.length === 0) {
          throw new BadRequestException('JSON 中 variables 数组为空');
        }
        return {
          tags: parsed.variables.map((item: any, index: number) => this.normalizeTag(item, index)),
          metadata: {
            schemaVersion: parsed.schemaVersion,
            templateType: parsed.templateType,
            name: parsed.name,
            description: parsed.description,
            deviceType: parsed.deviceType,
            version: parsed.version,
          },
        };
      }

      throw new BadRequestException(
        'JSON 格式不支持：期望数组格式或包含 tags/variables 字段的对象格式',
      );
    }

    throw new BadRequestException('JSON 格式不支持：期望数组或对象类型');
  }

  /**
   * 规范化单个标签数据
   */
  private normalizeTag(item: any, index: number): ParsedJsonTag {
    if (typeof item !== 'object' || item === null) {
      throw new BadRequestException(`JSON 第 ${index + 1} 个标签数据格式无效，期望对象类型`);
    }

    const tag: ParsedJsonTag = {
      name: String(item.name ?? item.tagName ?? ''),
      address: String(item.address ?? ''),
      dataType: String(item.dataType ?? item.data_type ?? ''),
      description: item.description ? String(item.description) : undefined,
      unit: item.unit ? String(item.unit) : undefined,
      minValue:
        item.minValue !== undefined && item.minValue !== null ? Number(item.minValue) : undefined,
      maxValue:
        item.maxValue !== undefined && item.maxValue !== null ? Number(item.maxValue) : undefined,
      scanRate: item.scanRate !== undefined ? Number(item.scanRate) : undefined,
      enabled: item.enabled !== undefined ? Boolean(item.enabled) : undefined,
      category: item.category ? String(item.category) : undefined,
      order: item.order !== undefined ? Number(item.order) : index + 1,
    };

    // 保留其他字段
    const knownFields = new Set([
      'name',
      'tagName',
      'address',
      'dataType',
      'data_type',
      'description',
      'unit',
      'minValue',
      'maxValue',
      'scanRate',
      'enabled',
      'category',
      'order',
    ]);
    for (const key of Object.keys(item)) {
      if (!knownFields.has(key)) {
        tag[key] = item[key];
      }
    }

    return tag;
  }
}
