// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { StorageAdapter } from './storage-adapter.interface';

export interface StoragePluginConfig {
  name: string;
  type: 'influxdb' | 'sqlite' | 'mysql' | 'mongodb';
  enabled: boolean;
  config: Record<string, any>;
}

export interface StoragePluginRegistry {
  register(adapter: StorageAdapter): void;
  get(name: string): StorageAdapter | undefined;
  list(): StorageAdapter[];
  getDefault(): StorageAdapter;
  setDefault(name: string): void;
}
