// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { DataSourceConfig, DataSourceStatus, TagValue, TagMeta } from '../types/data-source.types';

export interface IDataSourceDriver {
  connect(config: DataSourceConfig): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(tagIds: string[]): void;
  unsubscribe(tagIds: string[]): void;
  onData(callback: (values: TagValue[]) => void): void;
  offData(callback: (values: TagValue[]) => void): void;
  getStatus(): DataSourceStatus;
  write(tagId: string, value: unknown): Promise<void>;
  getAvailableTags(): TagMeta[];
}