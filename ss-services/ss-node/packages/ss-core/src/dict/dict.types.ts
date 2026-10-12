// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 数据字典项
 */
export interface DictItem {
  value: string;
  label: string;
  sortOrder?: number;
  description?: string;
}

/**
 * 数据字典表
 */
export interface DictTable {
  dictId: string;
  dictName: string;
  category: string;
  items: DictItem[];
}

/**
 * 数据字典分类
 */
export interface DictCategory {
  category: string;
  name: string;
  tables: DictTable[];
}
