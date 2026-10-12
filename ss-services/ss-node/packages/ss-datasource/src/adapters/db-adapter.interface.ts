// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
  length?: number;
}

export interface DbAdapter {
  testConnection(
    config: Record<string, any>,
  ): Promise<{ success: boolean; latency: number; error?: string }>;
  getTables(config: Record<string, any>): Promise<string[]>;
  getColumns(config: Record<string, any>, tableName: string): Promise<ColumnInfo[]>;
  executeQuery(config: Record<string, any>, sql: string): Promise<any[]>;
}
