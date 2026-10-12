// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface DeviceExportRow {
  deviceCode: string;
  deviceName: string;
  nameAlias?: string;
  description?: string;
  type: string;
  driver?: string;
  templateId?: string;
  groupId?: string;
  connection?: Record<string, any>;
}

export interface ImportResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  deviceCode?: string;
  message: string;
}
