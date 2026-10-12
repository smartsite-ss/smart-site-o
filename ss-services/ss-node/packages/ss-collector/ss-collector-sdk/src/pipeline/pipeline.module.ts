// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, OnModuleInit, Injectable, Logger, Optional } from '@nestjs/common';
import { PipelineOrchestrator } from './pipeline-orchestrator';
import { ConcurrentPipelineOrchestrator } from './concurrent-pipeline-orchestrator';
import { BoundedBackpressureQueue } from './bounded-backpressure-queue';
import { CircuitBreakerService } from './circuit-breaker.service';
import { OfflineCacheService } from './offline-cache.service';
import { OfflineCacheController } from './offline-cache.controller';
import { PipelineMetricsService } from './pipeline-metrics.service';
import { PipelineMetricsController } from './pipeline-metrics.controller';
import { ProtocolReadStep } from './steps/protocol-read.step';
import { TransformStep } from './steps/transform.step';
import { DeadbandStep } from './steps/deadband.step';
import { QualityCheckStep } from './steps/quality-check.step';
import { AlarmCheckStep } from './steps/alarm-check.step';
import { CacheUpdateStep } from './steps/cache-update.step';
import { PersistStep } from './steps/persist.step';
import { FormatStep } from './steps/format.step';
import { PublishStep } from './steps/publish.step';
import { RetryableProtocolRead, CircuitBreakerDecorator } from './steps/retry-wrapper.step';
import { EnhancedScheduler } from './scheduler/enhanced-scheduler';
import { SchedulerModule } from './scheduler/scheduler.module';
import { DeviceConfigWatcher } from './device-config-watcher.service';
import { PersistWriterRegistry } from './persist-writer-registry';
import { PluginManagerService } from '../plugins/plugin-manager.service';

import { EventBusModule } from '@ss-node/ss-core';

// ---------------------------------------------------------------------------
// 管线初始化器 — 启动时将 Pipeline steps 注入到调度器
// ---------------------------------------------------------------------------

@Injectable()
class PipelineInitializer implements OnModuleInit {
  private readonly logger = new Logger(PipelineInitializer.name);

  constructor(
    private readonly scheduler: EnhancedScheduler,
    private readonly orchestrator: PipelineOrchestrator,
    private readonly pipelineMetricsService: PipelineMetricsService,
    private readonly protocolRead: ProtocolReadStep,
    private readonly transform: TransformStep,
    private readonly deadband: DeadbandStep,
    private readonly qualityCheck: QualityCheckStep,
    private readonly alarmCheck: AlarmCheckStep,
    private readonly cacheUpdate: CacheUpdateStep,
    private readonly persist: PersistStep,
    private readonly format: FormatStep,
    private readonly publish: PublishStep,
    /** PluginModule 是 @Global()，故 PluginManagerService 可跨模块注入；@Optional 以支持单测环境 */
    @Optional() private readonly pluginManagerService?: PluginManagerService,
  ) {}

  onModuleInit(): void {
    const steps = [
      this.protocolRead,
      this.transform,
      this.deadband,
      this.qualityCheck,
      this.alarmCheck,
      this.cacheUpdate,
      this.persist,
      this.format,
      this.publish,
    ];

    // 注册到 PipelineOrchestrator
    for (const step of steps) {
      this.orchestrator.registerStep(step);
    }

    // 注册到 EnhancedScheduler
    this.scheduler.setPipelineSteps(steps);

    // 注入 orchestrator 和 metricsService 到调度器，使其委托 orchestrator.execute() 执行 pipeline，
    // 从而自动记录步骤耗时、错误率、火焰图分解等指标（修复 Pipeline 指标页面无数据问题）
    this.scheduler.setOrchestrator(this.orchestrator);
    this.scheduler.setPipelineMetricsService(this.pipelineMetricsService);

    // 将 PipelineMetricsService 反向注入到 PluginManagerService，
    // 使插件列表 API 能返回按协议维度的真实采集指标（活跃连接/总读取次数/平均响应时间）
    if (this.pluginManagerService) {
      this.pluginManagerService.setPipelineMetricsService(this.pipelineMetricsService);
    }

    this.logger.log(
      `Pipeline initialized: ${steps.length} steps registered → ${steps.map((s) => s.name).join(' → ')}`,
    );
  }
}

@Module({
  imports: [SchedulerModule, EventBusModule],
  providers: [
    PipelineInitializer,
    CircuitBreakerService,
    BoundedBackpressureQueue,
    OfflineCacheService,
    ConcurrentPipelineOrchestrator,
    PipelineOrchestrator,
    PipelineMetricsService,
    ProtocolReadStep,
    TransformStep,
    DeadbandStep,
    QualityCheckStep,
    AlarmCheckStep,
    CacheUpdateStep,
    PersistStep,
    FormatStep,
    PublishStep,
    RetryableProtocolRead,
    CircuitBreakerDecorator,
    DeviceConfigWatcher,
    PersistWriterRegistry,
  ],
  controllers: [OfflineCacheController, PipelineMetricsController],
  exports: [
    PipelineModule,
    SchedulerModule,
    CircuitBreakerService,
    BoundedBackpressureQueue,
    OfflineCacheService,
    ConcurrentPipelineOrchestrator,
    PipelineOrchestrator,
    PipelineMetricsService,
    ProtocolReadStep,
    TransformStep,
    DeadbandStep,
    QualityCheckStep,
    AlarmCheckStep,
    CacheUpdateStep,
    PersistStep,
    FormatStep,
    PublishStep,
    RetryableProtocolRead,
    CircuitBreakerDecorator,
    DeviceConfigWatcher,
    PersistWriterRegistry,
  ],
})
export class PipelineModule {}
