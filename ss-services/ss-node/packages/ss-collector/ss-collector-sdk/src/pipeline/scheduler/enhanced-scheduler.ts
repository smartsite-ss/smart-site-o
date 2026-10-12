// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { PipelineContext, PipelineStep, PipelineOrchestrator } from '../pipeline-orchestrator';
import { PipelineMetricsService } from '../pipeline-metrics.service';
import { EventBusService, MetricsCollectorService, DeviceStateManager } from '@ss-node/ss-core';
import { PluginRegistry } from '../../plugins';
import { IsolationMode } from '../../plugins';

export enum TaskPriority {
  CRITICAL = 100,
  HIGH = 75,
  NORMAL = 50,
  LOW = 25,
}

export interface AcquisitionTask {
  id: string;
  deviceId: string;
  tagId: string;
  tagConfig: any;
  deviceClient: any;
  priority: TaskPriority;
  interval: number;
  lastExecution?: Date;
  retryCount: number;
  maxRetries: number;
  enabled: boolean;
  /** 内部：延迟重试定时器句柄，用于 unregister 时取消 */
  _retryTimer?: ReturnType<typeof setTimeout>;
}

export interface SchedulerConfig {
  maxConcurrentTasks: number;
  maxQueueSize: number;
  schedulingIntervalMs: number;
  enableBackpressure: boolean;
  defaultMaxRetries: number;
  circuitFailureThreshold: number;
  circuitResetTimeoutMs: number;
  throttleFailureThreshold: number;
  throttleFactor: number;
}

const DEFAULT_CONFIG: Required<SchedulerConfig> = {
  maxConcurrentTasks: 10,
  maxQueueSize: 1000,
  schedulingIntervalMs: 50,
  enableBackpressure: true,
  defaultMaxRetries: 3,
  circuitFailureThreshold: 5,
  circuitResetTimeoutMs: 30000,
  throttleFailureThreshold: 3,
  throttleFactor: 2,
};

/**
 * online 事件发射节流上限（毫秒）。
 * 低频采集任务（如 60s）的 online 事件发射间隔不超过此值，
 * 避免设备状态长时间不刷新；高频任务仍按 scanRate 节流。
 */
const MAX_ONLINE_EMIT_INTERVAL_MS = 30000;

/**
 * 采集汇总日志输出间隔（毫秒）。
 * 调度器按此周期输出每个设备的采集统计，替代此前每 tag 每周期的细碎日志，
 * 便于运维快速识别"哪个插件/进程/设备/变量数/成功失败数"。
 */
const COLLECTION_SUMMARY_INTERVAL_MS = 30000;

/**
 * 单设备采集周期统计。
 * 在汇总窗口内累加：读取次数、成功/失败数、累计耗时，输出后清零。
 */
interface DeviceCycleStats {
  /** 协议（插件 protocol，如 modbus_tcp / opc_ua） */
  protocol: string;
  /** 设备名（用于日志可读性） */
  deviceName: string;
  /** 当前注册到该设备的 tag 任务数 */
  tagCount: number;
  /** 汇总窗口内完成的读取次数 */
  reads: number;
  /** 汇总窗口内 quality ∈ {good, out_of_range} 的次数 */
  successCount: number;
  /** 汇总窗口内 quality ∈ {bad, comm_error} 或抛错的次数 */
  errorCount: number;
  /** 汇总窗口内累计耗时（ms） */
  totalDurationMs: number;
}

export interface SchedulerMetrics {
  totalTasks: number;
  runningTasks: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  throughputPerSecond: number;
}

interface DeviceCircuitState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  openedAt?: Date;
  throttledInterval?: number;
}

@Injectable()
export class EnhancedScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EnhancedScheduler.name);

  private tasks = new Map<string, AcquisitionTask>();
  private runningTasksCount = 0;

  private schedulerInterval: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  private circuitCheckTimer: NodeJS.Timeout | null = null;

  private config: Required<SchedulerConfig>;
  private pipelineSteps: PipelineStep[] = [];

  /**
   * Pipeline 执行器与指标服务，由 PipelineInitializer 在启动阶段通过 setter 注入。
   * 不使用构造器注入是为了避免 SchedulerModule ↔ PipelineModule 的循环依赖。
   * - orchestrator：委托执行 pipeline，自动记录步骤耗时、错误率、火焰图分解
   * - pipelineMetricsService：用于更新 queueDepth / activeTasks 等 gauge 指标
   */
  private orchestrator?: PipelineOrchestrator;
  private pipelineMetricsService?: PipelineMetricsService;

  private deviceCircuits = new Map<string, DeviceCircuitState>();

  /** 设备最近一次 online 事件发射时间（用于节流，避免高频 readTag 淹没 EventBus） */
  private lastOnlineEmitAt = new Map<string, number>();

  /**
   * 按设备维度的采集周期统计。
   * key = deviceId，value = 当前汇总窗口内的累计指标。
   * 由 registerTask/unregisterTask 维护 tagCount，
   * 由 handlePipelineResult/handleTaskError 累加 reads/success/error/duration，
   * 由 emitCollectionSummary 周期输出并清零 reads/success/error/duration。
   */
  private deviceStats = new Map<string, DeviceCycleStats>();

  /** 采集汇总日志定时器 */
  private summaryTimer: NodeJS.Timeout | null = null;

  /** P1优化：错误日志节流 — 同一设备/标签 5 秒内只输出 1 条 warn */
  private lastErrorLogAt = new Map<string, number>();

  private metrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalExecutionTime: 0,
    startTime: Date.now(),
  };

  constructor(
    @Optional() config?: Partial<SchedulerConfig>,
    @Optional() private readonly eventBus?: EventBusService,
    @Optional() private readonly metricsCollector?: MetricsCollectorService,
    @Optional() private readonly deviceStateManager?: DeviceStateManager,
    /**
     * 插件注册表（@Global PluginModule 提供），用于在汇总日志中解析
     * "当前协议 → isolationMode → 进程名" 的映射关系。
     * 单测环境可能未注入，需做空值保护。
     */
    @Optional() private readonly pluginRegistry?: PluginRegistry,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  onModuleInit() {
    this.logger.log(`Scheduler initialized with config: ${JSON.stringify(this.config)}`);
    this.startSchedulingLoop();
    this.startMetricsCollection();
    this.startCircuitRecoveryCheck();
    this.startCollectionSummary();
  }

  onModuleDestroy() {
    this.logger.log('Shutting down scheduler...');

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.circuitCheckTimer) {
      clearInterval(this.circuitCheckTimer);
      this.circuitCheckTimer = null;
    }

    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
      this.summaryTimer = null;
    }
  }

  setPipelineSteps(steps: PipelineStep[]): void {
    this.pipelineSteps = steps.sort((a, b) => a.order - b.order);
    this.logger.debug(
      `Pipeline steps configured: ${this.pipelineSteps.map((s) => s.name).join(' → ')}`,
    );
  }

  /**
   * 注入 PipelineOrchestrator，使调度器委托 orchestrator.execute() 执行 pipeline，
   * 从而自动记录步骤耗时、错误率、火焰图分解等指标。
   * 由 PipelineInitializer 在 onModuleInit 阶段调用。
   */
  setOrchestrator(orchestrator: PipelineOrchestrator): void {
    this.orchestrator = orchestrator;
    this.logger.log('PipelineOrchestrator injected, metrics collection enabled');
  }

  /**
   * 注入 PipelineMetricsService，用于更新队列深度、活跃任务数等 gauge 指标。
   * 由 PipelineInitializer 在 onModuleInit 阶段调用。
   */
  setPipelineMetricsService(metricsService: PipelineMetricsService): void {
    this.pipelineMetricsService = metricsService;
  }

  registerTask(task: AcquisitionTask): void {
    if (this.tasks.size >= this.config.maxQueueSize && this.config.enableBackpressure) {
      this.applyBackpressure();
      throw new Error(`Task queue full (${this.tasks.size}/${this.config.maxQueueSize})`);
    }

    task.retryCount = 0;
    task.maxRetries = task.maxRetries || this.config.defaultMaxRetries;
    task.enabled = true;
    task.lastExecution = new Date();

    this.tasks.set(task.id, task);
    this.readyTasksCache = null; // P3：任务变更时失效缓存

    // 维护按设备维度的 tag 计数，供汇总日志输出"采集了多少个变量"
    this.ensureDeviceStats(task).tagCount++;

    this.logger.debug(
      `Task registered: ${task.id} (priority: ${task.priority}, interval: ${task.interval}ms)`,
    );
  }

  unregisterTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    const deleted = this.tasks.delete(taskId);
    this.readyTasksCache = null; // P3：任务变更时失效缓存
    // 清理 online 事件节流记录，避免内存泄漏
    if (deleted && task) {
      // 取消挂起的重试定时器（驱动切换时防止旧任务在注销后仍执行）
      if (task._retryTimer) {
        clearTimeout(task._retryTimer);
        task._retryTimer = undefined;
      }
      const hasOtherTasks = Array.from(this.tasks.values()).some(
        (t) => t.deviceId === task.deviceId,
      );
      if (!hasOtherTasks) {
        this.lastOnlineEmitAt.delete(task.deviceId);
        // 该设备已无任何采集任务，移除其统计记录和熔断器状态
        this.deviceStats.delete(task.deviceId);
        this.deviceCircuits.delete(task.deviceId);
      } else {
        // 仍有其他任务，仅递减 tagCount
        const stats = this.deviceStats.get(task.deviceId);
        if (stats && stats.tagCount > 0) {
          stats.tagCount--;
        }
      }
    }
    return deleted;
  }

  /**
   * 更新指定设备所有采集任务的执行间隔（用于 scanRate 变更场景）
   * @param deviceId 设备 ID
   * @param interval 新的采集间隔（ms）
   * @returns 被更新的任务数量
   */
  updateTaskInterval(deviceId: string, interval: number): number {
    if (interval < 1) {
      this.logger.warn(`Invalid interval ${interval}ms for device ${deviceId}, ignored`);
      return 0;
    }
    let updated = 0;
    for (const task of this.tasks.values()) {
      if (task.deviceId === deviceId) {
        task.interval = interval;
        updated++;
      }
    }
    if (updated > 0) {
      this.logger.log(
        `Updated ${updated} task(s) interval to ${interval}ms for device ${deviceId}`,
      );
    } else {
      this.logger.warn(`No tasks found for device ${deviceId}, scanRate update skipped`);
    }
    return updated;
  }

  enableTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = true;
      this.readyTasksCache = null; // P3：任务启用时失效缓存
      this.logger.debug(`Task ${taskId} enabled`);
    }
  }

  disableTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = false;
      this.readyTasksCache = null; // P3：任务禁用时失效缓存
      this.logger.debug(`Task ${taskId} disabled`);
    }
  }

  getTaskStatus(): Map<string, AcquisitionTask> {
    return new Map(this.tasks);
  }

  getDeviceCircuitStatus(deviceId: string): DeviceCircuitState | undefined {
    return this.deviceCircuits.get(deviceId);
  }

  getAllCircuitStatus(): Map<string, DeviceCircuitState> {
    return new Map(this.deviceCircuits);
  }

  getMetrics(): SchedulerMetrics {
    const elapsed = (Date.now() - this.metrics.startTime) / 1000;

    return {
      totalTasks: this.tasks.size,
      runningTasks: this.runningTasksCount,
      queuedTasks: this.getReadyTasks().length,
      completedTasks: this.metrics.successfulExecutions,
      failedTasks: this.metrics.failedExecutions,
      averageExecutionTime:
        elapsed > 0
          ? Math.round(this.metrics.totalExecutionTime / this.metrics.totalExecutions)
          : 0,
      throughputPerSecond:
        elapsed > 0 ? Math.round((this.metrics.successfulExecutions / elapsed) * 100) / 100 : 0,
    };
  }

  private startSchedulingLoop(): void {
    this.schedulerInterval = setInterval(async () => {
      await this.executeNextBatch();
    }, this.config.schedulingIntervalMs);

    this.logger.log(`Scheduling loop started (interval: ${this.config.schedulingIntervalMs}ms)`);
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      const metrics = this.getMetrics();

      // 同步 gauge 指标到 PipelineMetricsService（供 /pipeline/metrics/json 端点暴露）
      if (this.pipelineMetricsService) {
        this.pipelineMetricsService.setQueueDepth(metrics.queuedTasks);
        this.pipelineMetricsService.setActiveTasks(metrics.runningTasks);
      }

      if (metrics.runningTasks > 0 || metrics.failedTasks > 0) {
        this.logger.debug(
          `Scheduler Metrics: Running=${metrics.runningTasks}, ` +
            `Queued=${metrics.queuedTasks}, ` +
            `Completed=${metrics.completedTasks}, ` +
            `Failed=${metrics.failedTasks}, ` +
            `Throughput=${metrics.throughputPerSecond}/s`,
        );
      }
    }, 5000);
  }

  private startCircuitRecoveryCheck(): void {
    this.circuitCheckTimer = setInterval(() => {
      this.checkCircuitRecovery();
    }, 5000);
  }

  /**
   * 启动采集汇总日志定时器。
   * 每隔 COLLECTION_SUMMARY_INTERVAL_MS 输出一次按设备维度的采集统计，
   * 替代此前每 tag 每周期的细碎日志，便于运维快速识别采集健康度。
   */
  private startCollectionSummary(): void {
    this.summaryTimer = setInterval(() => {
      this.emitCollectionSummary();
    }, COLLECTION_SUMMARY_INTERVAL_MS);
  }

  /**
   * 输出采集汇总日志并重置窗口计数。
   *
   * 输出格式示例：
   *   [EnhancedScheduler] Collection summary (30s) — 2 device(s):
   *     [modbus_tcp/node(main)] device=test-device2 (deviceId=5deba4b0): tags=10, reads=300, success=298, errors=2, avgMs=12
   *     [opc_ua/worker] device=test-device1 (deviceId=abc123): tags=5, reads=150, success=150, errors=0, avgMs=8
   *
   * 若窗口内无任何采集活动，则跳过输出以避免噪音。
   */
  private emitCollectionSummary(): void {
    if (this.deviceStats.size === 0) {
      return;
    }

    const entries = Array.from(this.deviceStats.values()).filter((s) => s.reads > 0);
    if (entries.length === 0) {
      return;
    }

    const intervalSec = Math.round(COLLECTION_SUMMARY_INTERVAL_MS / 1000);
    const lines = entries.map((s) => {
      const processName = this.resolveProcessName(s.protocol);
      const avgMs = s.reads > 0 ? Math.round(s.totalDurationMs / s.reads) : 0;
      return `  [${s.protocol}/${processName}] device=${s.deviceName}: tags=${s.tagCount}, reads=${s.reads}, success=${s.successCount}, errors=${s.errorCount}, avgMs=${avgMs}`;
    });

    this.logger.log(
      `Collection summary (${intervalSec}s) — ${entries.length} device(s):\n${lines.join('\n')}`,
    );

    // 重置窗口计数（保留 protocol/deviceName/tagCount，因为这些是当前状态而非窗口增量）
    for (const s of this.deviceStats.values()) {
      s.reads = 0;
      s.successCount = 0;
      s.errorCount = 0;
      s.totalDurationMs = 0;
    }
  }

  /**
   * 根据协议推导进程名（与 PluginManagerService 保持一致）。
   * - in_process   → node (main: ${protocol})
   * - worker_thread→ worker (${protocol})
   * - child_process→ ss-collector-${protocol}[.exe]
   * 若 pluginRegistry 未注入或协议未注册，返回 'unknown'。
   */
  private resolveProcessName(protocol: string): string {
    if (!this.pluginRegistry || !protocol) {
      return 'unknown';
    }
    const plugin = this.pluginRegistry.getPlugin(protocol);
    const mode = plugin?.meta?.isolationMode ?? IsolationMode.IN_PROCESS;
    switch (mode) {
      case IsolationMode.WORKER_THREAD:
        return `worker (${protocol})`;
      case IsolationMode.CHILD_PROCESS:
        return process.platform === 'win32'
          ? `ss-collector-${protocol}.exe`
          : `ss-collector-${protocol}`;
      case IsolationMode.IN_PROCESS:
      default:
        return `node (main: ${protocol})`;
    }
  }

  /**
   * 获取或创建设备的采集统计记录。
   * - protocol/deviceName 从 task 上下文推导，注册时即固化（不变动）
   * - tagCount 由 registerTask/unregisterTask 维护
   * - reads/success/error/duration 由 handlePipelineResult/handleTaskError 累加
   */
  private ensureDeviceStats(task: AcquisitionTask): DeviceCycleStats {
    let stats = this.deviceStats.get(task.deviceId);
    if (!stats) {
      stats = {
        protocol: task.deviceClient?.protocol || 'unknown',
        deviceName: task.tagConfig?.deviceName || task.deviceClient?.name || task.deviceId,
        tagCount: 0,
        reads: 0,
        successCount: 0,
        errorCount: 0,
        totalDurationMs: 0,
      };
      this.deviceStats.set(task.deviceId, stats);
    }
    return stats;
  }

  private async executeNextBatch(): Promise<void> {
    if (this.runningTasksCount >= this.config.maxConcurrentTasks) {
      return;
    }

    const readyTasks = this.getReadyTasks()
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.config.maxConcurrentTasks - this.runningTasksCount);

    for (const task of readyTasks) {
      if (!task.enabled) continue;

      if (this.isCircuitOpen(task.deviceId)) {
        continue;
      }

      this.runningTasksCount++;
      task.lastExecution = new Date();

      this.executeTask(task).finally(() => {
        this.runningTasksCount--;
      });
    }
  }

  /** P3优化：就绪任务缓存 — 避免每秒 100 次（10ms → 50ms 后为 20 次）O(n)遍历 */
  private readyTasksCache: AcquisitionTask[] | null = null;
  private readyTasksCacheAt: number = 0;

  private getReadyTasks(): AcquisitionTask[] {
    const now = Date.now();

    // P3优化：同毫秒内返回缓存（连续快速调用时避免重复 O(n) 遍历）
    if (this.readyTasksCache && this.readyTasksCacheAt === now) {
      return this.readyTasksCache;
    }

    const tasks = Array.from(this.tasks.values());
    const ready: AcquisitionTask[] = [];
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (!task.enabled || !task.lastExecution) continue;
      if (now - task.lastExecution.getTime() >= task.interval) {
        ready.push(task);
      }
    }

    this.readyTasksCache = ready;
    this.readyTasksCacheAt = now;
    return ready;
  }

  private async executeTask(task: AcquisitionTask): Promise<void> {
    const startTime = Date.now();

    try {
      const initialCtx: PipelineContext = {
        tagId: task.tagId,
        deviceId: task.deviceId,
        projectId: task.tagConfig.projectId || 'default',
        deviceCode: task.tagConfig?.deviceCode || task.deviceClient?.deviceCode,
        tagName: task.tagConfig?.name,
        deviceName: task.tagConfig?.deviceName || task.deviceClient?.name,
        tagConfig: task.tagConfig,
        deviceClient: task.deviceClient,
        deviceType: task.deviceClient?.protocol || undefined,
        deviceConnection: task.deviceClient?.connection || undefined,
        rawValue: undefined,
        transformedValue: undefined,
        quality: 'unknown',
        shouldPersist: true,
        shouldPublish: true,
        startTime: Date.now(),
        errors: [],
      };

      // 优先委托 PipelineOrchestrator 执行（自动记录步骤耗时、错误率、火焰图分解等指标）
      // 若 orchestrator 未注入（例如单元测试场景），降级为直接遍历 steps 执行
      const ctx = this.orchestrator
        ? await this.orchestrator.execute(initialCtx)
        : await this.executeStepsFallback(initialCtx);

      const durationMs = Date.now() - startTime;
      this.handlePipelineResult(task, ctx, durationMs);

      task.retryCount = 0;
      this.recordSuccess(durationMs);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.handleTaskError(task, error as Error, durationMs);
    }
  }

  /**
   * 降级执行路径：直接遍历 pipelineSteps 执行（不经过 orchestrator）。
   * 仅在 orchestrator 未注入时使用，保留原有行为。
   */
  private async executeStepsFallback(initialCtx: PipelineContext): Promise<PipelineContext> {
    let ctx = initialCtx;
    for (const step of this.pipelineSteps) {
      ctx = await step.process(ctx);
    }
    return ctx;
  }

  private handlePipelineResult(
    task: AcquisitionTask,
    ctx: PipelineContext,
    durationMs: number,
  ): void {
    const deviceId = task.deviceId;

    // 按设备维度累计采集指标（用于周期汇总日志）
    // - comm_error / bad：计入 errorCount
    // - good / out_of_range：计入 successCount（out_of_range 仍代表通信链路正常）
    const stats = this.ensureDeviceStats(task);
    stats.reads++;
    stats.totalDurationMs += durationMs;
    const isCommOk = ctx.quality !== 'comm_error' && ctx.quality !== 'bad';
    if (isCommOk) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }

    if (ctx.quality === 'comm_error') {
      this.handleCommError(deviceId, task, ctx);
    } else if (ctx.quality === 'bad') {
      this.handleDataError(deviceId, task, ctx);
    } else if (ctx.quality === 'out_of_range') {
      this.handleOutOfRange(deviceId, task, ctx);
    } else {
      // 采集成功：重置熔断器 + 发射 online 事件（节流）
      this.handleCommSuccess(deviceId, task);
    }
  }

  /**
   * 采集成功处理：重置熔断器并发射 device_status_changed { status: 'online' } 事件。
   *
   * 事件采用自适应节流 —— 节流间隔 = min(scanRate, 30s)：
   * - 高频任务（如 100ms）：按 scanRate 节流，避免淹没 EventBus
   * - 低频任务（如 60s）：按 30s 上限节流，避免设备状态长时间不刷新
   * DeviceCollectorBootstrap 收到事件后更新 deviceStatusMap 的 status 和 lastHeartbeat。
   */
  private handleCommSuccess(deviceId: string, task: AcquisitionTask): void {
    this.resetDeviceFailure(deviceId);

    // 优先使用 DeviceStateManager（统一状态管理）
    if (this.deviceStateManager) {
      this.deviceStateManager.setOnline(deviceId);
      return;
    }

    // 降级：通过 EventBus 通知（旧路径，后续移除）
    if (this.eventBus) {
      const now = Date.now();
      const lastEmit = this.lastOnlineEmitAt.get(deviceId) || 0;
      // 自适应节流：min(scanRate, 30s)，确保低频设备状态不过期
      const throttleMs = Math.min(
        task.interval > 0 ? task.interval : 1000,
        MAX_ONLINE_EMIT_INTERVAL_MS,
      );

      if (now - lastEmit >= throttleMs) {
        this.lastOnlineEmitAt.set(deviceId, now);
        if (!lastEmit) {
          this.logger.log(`Device ${deviceId}: first successful read → emitting online event`);
        }
        this.eventBus.emitDeviceStatusChanged({
          deviceId,
          projectId: task.tagConfig?.projectId || '',
          status: 'online',
          timestamp: now,
        });
      }
    } else {
      this.logger.warn(
        `Device ${deviceId} read success but eventBus is not available — device_status_changed NOT emitted`,
      );
    }
  }

  private handleCommError(deviceId: string, task: AcquisitionTask, ctx: PipelineContext): void {
    const circuit = this.getOrCreateCircuit(deviceId);
    circuit.failureCount++;
    circuit.lastFailureTime = new Date();

    // P1优化：同设备 5s 内只输出 1 条 comm error warn
    if (this.shouldLogError(deviceId)) {
      this.logger.warn(
        `Comm error for device ${deviceId} (${circuit.failureCount}/${this.config.circuitFailureThreshold}): ` +
          `${ctx.errors[0]?.message}`,
      );
    }

    if (this.metricsCollector) {
      this.metricsCollector.increment('collector.comm.error', 1, [
        { key: 'deviceId', value: deviceId },
      ]);
    }

    // 优先使用 DeviceStateManager
    if (this.deviceStateManager) {
      this.deviceStateManager.setError(deviceId, ctx.errors[0]?.message);
      // 推送采集诊断数据
      this.deviceStateManager.setDiagnostics(deviceId, {
        circuitState: circuit.state,
        consecutiveFailures: circuit.failureCount,
        lastErrorAt: circuit.lastFailureTime.getTime(),
      });
    } else if (this.eventBus) {
      this.eventBus.emitDeviceStatusChanged({
        deviceId,
        projectId: task.tagConfig?.projectId || '',
        status: 'error',
        errorMessage: ctx.errors[0]?.message,
        timestamp: Date.now(),
      });
    }

    if (circuit.failureCount >= this.config.circuitFailureThreshold) {
      this.openCircuit(deviceId);
    } else if (circuit.failureCount >= this.config.throttleFailureThreshold) {
      this.throttleDevice(deviceId);
    }
  }

  private handleDataError(deviceId: string, task: AcquisitionTask, ctx: PipelineContext): void {
    // P1优化：同标签 5s 内只输出 1 条 data error warn
    if (this.shouldLogError(`data:${task.tagId}`)) {
      this.logger.warn(
        `Data error for tag ${task.tagId}: ${ctx.errors.map((e) => e.message).join(', ')}`,
      );
    }

    if (this.metricsCollector) {
      this.metricsCollector.increment('collector.data.error', 1, [
        { key: 'deviceId', value: deviceId },
        { key: 'tagId', value: task.tagId },
      ]);
    }
  }

  private handleOutOfRange(deviceId: string, task: AcquisitionTask, ctx: PipelineContext): void {
    // P1优化：同标签 5s 内只输出 1 条 out of range warn
    if (this.shouldLogError(`oor:${task.tagId}`)) {
      this.logger.warn(`Out of range for tag ${task.tagId}: value=${ctx.transformedValue}`);
    }

    if (this.metricsCollector) {
      this.metricsCollector.increment('collector.data.out_of_range', 1, [
        { key: 'deviceId', value: deviceId },
        { key: 'tagId', value: task.tagId },
      ]);
    }
  }

  private handleTaskError(task: AcquisitionTask, error: Error, durationMs: number): void {
    task.retryCount++;

    // 按设备维度累计异常指标（pipeline 抛错场景，未走到 quality 判定）
    const stats = this.ensureDeviceStats(task);
    stats.reads++;
    stats.errorCount++;
    stats.totalDurationMs += durationMs;

    this.logger.warn(
      `Task ${task.id} failed (attempt ${task.retryCount}/${task.maxRetries}): ${error.message}`,
    );

    // 首次失败即设置设备错误状态，让前端立即感知
    if (task.retryCount === 1 && this.deviceStateManager) {
      this.deviceStateManager.setError(task.deviceId, error.message);
    }

    if (this.metricsCollector) {
      this.metricsCollector.increment('collector.task.error', 1, [
        { key: 'deviceId', value: task.deviceId },
      ]);
    }

    if (task.retryCount < task.maxRetries) {
      const delay = Math.min(500 * Math.pow(2, task.retryCount), 5000);

      task._retryTimer = setTimeout(() => {
        task._retryTimer = undefined;
        this.executeTask(task).catch((err) => {
          this.logger.error(`Retry failed for task ${task.id}: ${err.message}`);
          this.recordFailure();
        });
      }, delay);
    } else {
      this.logger.error(`Task ${task.id} permanently failed after ${task.maxRetries} retries`);

      // 设置设备错误状态（含错误详情）
      if (this.deviceStateManager) {
        this.deviceStateManager.setError(task.deviceId, error.message);
        const circuit = this.deviceCircuits.get(task.deviceId);
        this.deviceStateManager.setDiagnostics(task.deviceId, {
          retryCount: task.retryCount,
          circuitState: circuit?.state ?? 'closed',
          consecutiveFailures: circuit?.failureCount ?? task.retryCount,
        });
      }

      if (task.priority === TaskPriority.CRITICAL) {
        this.handleCriticalTaskFailure(task, error);
      }

      this.recordFailure();
    }
  }

  private handleCriticalTaskFailure(task: AcquisitionTask, error: Error): void {
    this.logger.error(
      `CRITICAL TASK FAILURE: ${task.id} (${task.deviceId}/${task.tagId}) - ${error.message}`,
    );

    if (this.eventBus) {
      this.eventBus.emit('processing_error', {
        taskId: task.id,
        deviceId: task.deviceId,
        tagId: task.tagId,
        error: error.message,
      });
    }
  }

  /** P1优化：错误日志节流 — 同 key 5 秒内返回 false（跳过日志） */
  private shouldLogError(key: string): boolean {
    const now = Date.now();
    const last = this.lastErrorLogAt.get(key);
    if (last && now - last < 5000) {
      return false;
    }
    this.lastErrorLogAt.set(key, now);
    return true;
  }

  private getOrCreateCircuit(deviceId: string): DeviceCircuitState {
    if (!this.deviceCircuits.has(deviceId)) {
      this.deviceCircuits.set(deviceId, { state: 'closed', failureCount: 0 });
    }
    return this.deviceCircuits.get(deviceId)!;
  }

  private isCircuitOpen(deviceId: string): boolean {
    const circuit = this.deviceCircuits.get(deviceId);
    if (!circuit) return false;

    if (circuit.state === 'open') {
      if (circuit.openedAt) {
        const elapsed = Date.now() - circuit.openedAt.getTime();
        if (elapsed > this.config.circuitResetTimeoutMs) {
          this.logger.warn(`Circuit for device ${deviceId} auto-reset after timeout`);
          this.deviceCircuits.delete(deviceId);
          return false;
        }
      }
      return true;
    }

    return false;
  }

  private openCircuit(deviceId: string): void {
    const circuit = this.getOrCreateCircuit(deviceId);
    circuit.state = 'open';
    circuit.openedAt = new Date();

    this.logger.error(`Circuit breaker OPENED for device ${deviceId}`);

    if (this.eventBus) {
      this.eventBus.emitDeviceStatusChanged({
        deviceId,
        projectId: '',
        status: 'error',
        errorMessage: 'Too many communication errors',
        timestamp: Date.now(),
      });
    }

    if (this.metricsCollector) {
      this.metricsCollector.increment('collector.circuit.open', 1, [
        { key: 'deviceId', value: deviceId },
      ]);
    }
  }

  private throttleDevice(deviceId: string): void {
    const circuit = this.getOrCreateCircuit(deviceId);
    circuit.throttledInterval = (circuit.throttledInterval || 1) * this.config.throttleFactor;

    this.logger.warn(
      `Device ${deviceId} throttled: interval multiplier=${circuit.throttledInterval}x`,
    );

    for (const task of this.tasks.values()) {
      if (task.deviceId === deviceId) {
        task.interval = task.interval * this.config.throttleFactor;
      }
    }
  }

  private resetDeviceFailure(deviceId: string): void {
    const circuit = this.deviceCircuits.get(deviceId);
    if (circuit) {
      if (circuit.failureCount > 0) {
        this.logger.log(`Device ${deviceId} recovered, resetting failure count`);
      }
      this.deviceCircuits.delete(deviceId);
    }
  }

  private checkCircuitRecovery(): void {
    for (const [deviceId, circuit] of this.deviceCircuits) {
      if (circuit.state === 'open' && circuit.openedAt) {
        const elapsed = Date.now() - circuit.openedAt.getTime();
        if (elapsed > this.config.circuitResetTimeoutMs) {
          this.logger.warn(`Circuit for device ${deviceId} entering half-open state`);
          circuit.state = 'half-open';
          circuit.failureCount = 0;

          if (this.eventBus) {
            this.eventBus.emitDeviceStatusChanged({
              deviceId,
              projectId: '',
              status: 'connecting',
              errorMessage: 'Circuit half-open, testing connectivity',
              timestamp: Date.now(),
            });
          }
        }
      }
    }
  }

  private applyBackpressure(): void {
    this.logger.warn(
      `Applying backpressure: queue size ${this.tasks.size}/${this.config.maxQueueSize}`,
    );

    for (const [, task] of this.tasks) {
      if (task.priority < TaskPriority.NORMAL) {
        task.interval = Math.min(task.interval * 2, 60000);
        this.logger.debug(`Reduced frequency for low-priority task ${task.id}: ${task.interval}ms`);
      }
    }
  }

  private recordSuccess(executionTime: number): void {
    this.metrics.totalExecutions++;
    this.metrics.successfulExecutions++;
    this.metrics.totalExecutionTime += executionTime;
  }

  private recordFailure(): void {
    this.metrics.totalExecutions++;
    this.metrics.failedExecutions++;
  }

  resetMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTime: 0,
      startTime: Date.now(),
    };
    this.logger.log('Scheduler metrics reset');
  }
}
