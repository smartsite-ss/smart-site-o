// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface DataPoint {
  tagId: string;
  deviceId: string;
  projectId: string;
  value: number | string | boolean;
  timestamp: Date;
  quality: number;
  metadata?: Record<string, any>;
}
export interface QueryOptions {
  tagIds?: string[];
  deviceIds?: string[];
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  aggregation?: {
    function: 'avg' | 'max' | 'min' | 'sum' | 'count';
    interval?: string;
  };
}
export interface WriteResult {
  success: boolean;
  written: number;
  failed: number;
  errors?: Error[];
}
export interface StorageAdapter {
  name: string;
  write(points: DataPoint[]): Promise<WriteResult>;
  read(options: QueryOptions): Promise<DataPoint[]>;
  delete(options: { tagIds?: string[]; before?: Date }): Promise<number>;
  health(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: any;
  }>;
  close(): Promise<void>;
}
