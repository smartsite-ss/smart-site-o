// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export {
  StorageAdapter,
  DataPoint,
  QueryOptions,
  WriteResult,
  AdapterCapabilities,
  NotSupportedError,
} from './interfaces/storage-adapter.interface';
export {
  STORAGE_ENGINE_TYPES,
  StorageEngineType,
  resolveStorageEngineType,
} from './storage-engine-types';
export {
  serializeLineProtocol,
  SerializeLineProtocolOptions,
} from './write/line-protocol-serializer';
export { QueryBuilder } from './query/query-builder.interface';
export { InfluxBaseAdapter, EngineReadRequest } from './adapters/influx-base.adapter';
export { StoragePluginConfig, StoragePluginRegistry } from './interfaces/storage-plugin.interface';
export { StoragePluginRegistryService } from './services/storage-plugin-registry.service';
export { StorageEngineConfigService } from './storage-engine-config.service';
export { StorageEngineRouterService } from './storage-engine-router.service';
export { StorageArchiveService, ArchiveConfig, ArchiveResult } from './storage-archive.service';
export {
  StorageHealthService,
  StorageMetrics,
  HealthCheck,
  HealthCheckResult,
} from './storage-health.service';
export {
  DataMigrationService,
  MigrationConfig,
  MigrationProgress,
  MigrationCheckpoint,
  MigrationResult,
} from './services/data-migration.service';
export {
  BackupService,
  BackupConfig,
  BackupFile,
  BackupResult,
  RestoreOptions,
  RestoreResult,
} from './services/backup.service';
export {
  StoragePerformanceService,
  BatchBufferConfig,
  CacheEntry,
  CompressionResult,
  PerformanceMetrics,
  IndexOptimizationResult,
} from './services/storage-performance.service';
export { MysqlStorageAdapter } from './adapters/mysql-storage.adapter';
export { MongodbStorageAdapter } from './adapters/mongodb-storage.adapter';
export {
  DownsamplingConfig,
  DownsamplingTask,
  DownsamplingResult,
  DownsamplingAggregation,
  DownsamplingGranularity,
  INFLUXDB_ADAPTER,
} from './interfaces/downsampling.interface';
export { DownsamplingService } from './services/downsampling.service';
export { StorageModule } from './storage.module';
