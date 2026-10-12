// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Logger, Query } from '@nestjs/common';
import { PipelineMetricsService } from './pipeline-metrics.service';
import { PipelineOrchestrator } from './pipeline-orchestrator';
import { EnhancedScheduler } from './scheduler/enhanced-scheduler';

@Controller('pipeline/metrics')
export class PipelineMetricsController {
  private readonly logger = new Logger(PipelineMetricsController.name);

  constructor(
    private readonly metricsService: PipelineMetricsService,
    private readonly orchestrator: PipelineOrchestrator,
    private readonly scheduler: EnhancedScheduler,
  ) {}

  /** 返回 Prometheus 文本格式指标 */
  @Get()
  getPrometheusMetrics(): string {
    return this.metricsService.getMetrics();
  }

  /** 返回 JSON 格式指标 */
  @Get('json')
  getJsonMetrics() {
    const snapshot = this.metricsService.getMetricsSnapshot();
    // 诊断日志：若指标为 0，提示可能的原因
    if (snapshot.pipeline_executions_total === 0) {
      this.logger.warn(
        `getJsonMetrics: pipeline_executions_total=0 — Pipeline 从未执行过。` +
          `可能原因: 1) 无设备/标签注册采集任务 2) orchestrator 未注入 scheduler 3) 采集器未启动。` +
          `请访问 /api/v1/pipeline/metrics/diagnostic 查看诊断信息。`,
      );
    }
    return {
      code: 0,
      data: snapshot,
      message: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /** 返回各步骤 P50/P95/P99 延迟统计 */
  @Get('percentiles')
  getPercentiles() {
    return {
      code: 0,
      data: this.orchestrator.getStepTimingStats(),
      message: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /** 返回最近 N 次 Pipeline 耗时分解（用于火焰图可视化） */
  @Get('breakdowns')
  getBreakdowns() {
    return {
      code: 0,
      data: this.orchestrator.getTimingBreakdowns(50),
      message: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 诊断端点：一次性返回 Pipeline 内部状态，用于排查"指标无数据"问题。
   *
   * 排查思路：
   * - scheduler.tasks.size === 0 → 无采集任务，检查设备/标签是否注册
   * - orchestrator.stepCount === 0 → Pipeline 未初始化，检查 PipelineInitializer.onModuleInit
   * - orchestrator.timingHistorySize === 0 但 tasks.size > 0 → 任务未就绪或被熔断
   * - metricsServiceInjected === false → DI 配置错误
   */
  @Get('diagnostic')
  getDiagnostic() {
    const schedulerMetrics = this.scheduler.getMetrics();
    const taskStatus = this.scheduler.getTaskStatus();
    const orchestratorInfo = this.orchestrator.getDiagnosticInfo();
    const metricsSnapshot = this.metricsService.getMetricsSnapshot();

    // 收集所有任务的简要信息（最多 10 条）
    const taskList = Array.from(taskStatus.entries())
      .slice(0, 10)
      .map(([id, task]) => ({
        id,
        deviceId: task.deviceId,
        deviceName: task.deviceClient?.name || task.tagConfig?.deviceName || '',
        tagId: task.tagId,
        tagName: task.tagConfig?.name || '',
        interval: task.interval,
        enabled: task.enabled,
        retryCount: task.retryCount,
        lastExecution: task.lastExecution,
      }));

    const diagnostic = {
      timestamp: new Date().toISOString(),
      orchestrator: orchestratorInfo,
      scheduler: {
        ...schedulerMetrics,
        totalRegisteredTasks: taskStatus.size,
        sampleTasks: taskList,
        circuitStatuses: Array.from(this.scheduler.getAllCircuitStatus().entries()).map(
          ([deviceId, state]) => ({ deviceId, ...state }),
        ),
      },
      metrics: metricsSnapshot,
      diagnosis: this.buildDiagnosis(orchestratorInfo, schedulerMetrics, taskStatus.size),
    };

    this.logger.log(
      `getDiagnostic: tasks=${taskStatus.size}, steps=${orchestratorInfo.stepCount}, ` +
        `timingHistory=${orchestratorInfo.timingHistorySize}, ` +
        `executionsTotal=${metricsSnapshot.pipeline_executions_total}`,
    );

    return {
      code: 0,
      data: diagnostic,
      message: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /** 返回所有有指标数据的协议列表（供前端筛选） */
  @Get('protocols')
  getProtocols() {
    const metrics = this.metricsService.getAllProtocolMetrics();
    const protocols = Object.keys(metrics).map((protocol) => ({
      protocol,
      totalReads: metrics[protocol].totalReads,
      activeConnections: metrics[protocol].activeConnections,
      lastActivity: metrics[protocol].lastActivity,
    }));
    return {
      code: 0,
      data: protocols,
      message: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /** 按协议获取指标详情 */
  @Get('protocol')
  getProtocolMetrics(@Query('protocol') protocol: string) {
    if (!protocol) {
      return {
        code: 1,
        data: null,
        message: 'Missing protocol parameter',
        timestamp: new Date().toISOString(),
      };
    }
    const metrics = this.metricsService.getProtocolMetrics(protocol);
    if (!metrics) {
      return {
        code: 1,
        data: null,
        message: `No metrics found for protocol: ${protocol}`,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      code: 0,
      data: metrics,
      message: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 根据当前状态自动生成诊断结论，帮助用户快速定位问题。
   */
  private buildDiagnosis(
    orchestratorInfo: any,
    schedulerMetrics: any,
    taskCount: number,
  ): string[] {
    const conclusions: string[] = [];

    if (orchestratorInfo.stepCount === 0) {
      conclusions.push(
        '❌ Pipeline 未注册任何步骤 — PipelineInitializer.onModuleInit 未执行或失败',
      );
    } else {
      conclusions.push(`✅ Pipeline 已注册 ${orchestratorInfo.stepCount} 个步骤`);
    }

    if (!orchestratorInfo.metricsServiceInjected) {
      conclusions.push('❌ PipelineMetricsService 未注入到 Orchestrator');
    } else {
      conclusions.push('✅ PipelineMetricsService 已注入');
    }

    if (taskCount === 0) {
      conclusions.push(
        '❌ 调度器无采集任务 — 无设备/标签注册到 scheduler，Pipeline 不会被触发执行。' +
          '请检查: 1) 是否有项目数据库 2) 设备是否配置 driver 3) 设备是否有 DataTag 4) 对应协议插件是否已激活',
      );
    } else {
      conclusions.push(`✅ 调度器已注册 ${taskCount} 个采集任务`);
    }

    if (taskCount > 0 && orchestratorInfo.timingHistorySize === 0) {
      conclusions.push(
        '⚠️ 有任务但无执行历史 — 任务可能未就绪（lastExecution 未初始化）或被熔断器阻止',
      );
    }

    if (orchestratorInfo.timingHistorySize > 0) {
      conclusions.push(
        `✅ Pipeline 已执行，timingHistory 有 ${orchestratorInfo.timingHistorySize} 条记录`,
      );
    }

    return conclusions;
  }
}
