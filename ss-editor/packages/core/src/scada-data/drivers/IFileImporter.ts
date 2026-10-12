// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface TagConfig {
  tagId: string;
  tagName: string;
  dataType: string;
  unit?: string;
  min?: number;
  max?: number;
  values?: Array<{ timestamp: number; value: unknown }>;
}

export interface IFileImporter {
  parse(file: File): Promise<TagConfig[]>;
  getSupportedFormats(): string[];
}