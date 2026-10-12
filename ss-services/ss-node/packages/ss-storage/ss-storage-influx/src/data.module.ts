// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, Global, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoricalData } from './entities/historical-data.entity';
import { DataService } from './data.service';
import { DataQueryService } from './data-query.service';
import { DataController } from './data.controller';
import { InfluxWriteService } from './influx-write.service';
import { InfluxBucketService } from './influx-bucket.service';
import { SqlitePersistWriter } from './sqlite-persist-writer';
import { InfluxPersistWriter } from './influx-persist-writer';
import { InfluxQueryService } from './influx-query.service';
import { InfluxdbAdapterService } from './influxdb-adapter.service';
import { PERSIST_WRITER, PipelineModule } from '@ss-node/ss-collector-sdk';
import { ProjectDatabaseService, EventBusModule } from '@ss-node/ss-core';
import {
  StorageModule,
  StorageEngineRouterService,
  STORAGE_ENGINE_TYPES,
} from '@ss-node/ss-storage';

// multi: true 注册保留以兼容潜在的 @Inject(PERSIST_WRITER) 注入场景
// （注意：multi provider 只有在被注入时才会被实例化，不会触发 onModuleInit）
const persistWriterProviders = [
  { provide: PERSIST_WRITER, useClass: SqlitePersistWriter, multi: true },
  { provide: PERSIST_WRITER, useClass: InfluxPersistWriter, multi: true },
] as any[];

/**
 * 字符串 Token alias —— 供 ss-device 的 DeviceArchiveService / ArchiveService 注入
 *
 * 避免直接 import ss-storage-influx 的类（会产生 workspace 包级别循环依赖：
 * ss-storage-influx → ss-device [DataTag 实体]，ss-device → ss-storage-influx [服务类]）。
 *
 * ss-device 通过 @Inject('INFLUX_WRITE_SERVICE') / @Inject('DATA_QUERY_SERVICE') 注入，
 * 此处用 useExisting 将 Token 映射到实际的 Service 实例。
 */
const serviceTokenAliases = [
  { provide: 'INFLUX_WRITE_SERVICE', useExisting: InfluxWriteService },
  { provide: 'DATA_QUERY_SERVICE', useExisting: DataQueryService },
];

/**
 * @Global() — 数据存储模块声明为全局模块
 *
 * 使 InfluxWriteService / DataQueryService / DataService 可被任意模块注入，
 * 避免业务模块（如 ss-device）需要导入 DataModule 时产生 workspace 包级别的循环依赖
 * （ss-storage-influx 依赖 ss-device 的 DataTag 实体类型，ss-device 不应反向依赖 ss-storage-influx）。
 *
 * 导入 PipelineModule：使 PersistWriterRegistry 可被注入到 SqlitePersistWriter / InfluxPersistWriter，
 * 让它们能在 onModuleInit 时主动注册到 Registry，从而被 PersistStep 调用。
 *
 * PersistWriter 直接在 providers 中列出（而非仅通过 multi: true 注册），
 * 确保 NestJS 实例化它们以触发 onModuleInit → PersistWriterRegistry.register()。
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([HistoricalData]),
    PipelineModule,
    EventBusModule,
    StorageModule,
  ],
  controllers: [DataController],
  providers: [
    DataService,
    DataQueryService,
    InfluxWriteService,
    InfluxBucketService,
    InfluxQueryService,
    InfluxdbAdapterService,
    SqlitePersistWriter,
    InfluxPersistWriter,
    ...persistWriterProviders,
    ...serviceTokenAliases,
  ],
  exports: [
    DataService,
    DataQueryService,
    InfluxWriteService,
    InfluxBucketService,
    InfluxQueryService,
    InfluxdbAdapterService,
  ],
})
export class DataModule implements OnModuleInit {
  constructor(
    private readonly projectDbService: ProjectDatabaseService,
    private readonly storageEngineRouter: StorageEngineRouterService,
    private readonly influxdbAdapter: InfluxdbAdapterService,
  ) {}

  /**
   * 向全局 ProjectDatabaseService 注册 HistoricalData 实体。
   *
   * 这样项目数据库初始化时（synchronize: true），TypeORM 会自动创建
   * data_historical_data 表，并将 HistoricalData.tagId 作为外键引用
   * dev_data_tags.id（DataTag 实体由 DeviceModule 注册）。
   *
   * 若不注册，项目数据库中不会创建该表，SqlitePersistWriter 写入时
   * 会因外键检查失败报错 "FOREIGN KEY constraint failed"。
   */
  onModuleInit(): void {
    this.projectDbService.registerSystemEntities([HistoricalData]);
    // 将 InfluxDB 2 适配器注册到存储引擎路由（引擎类型 influxdb2）
    this.storageEngineRouter.registerAdapter(STORAGE_ENGINE_TYPES.INFLUXDB2, this.influxdbAdapter);
  }
}
