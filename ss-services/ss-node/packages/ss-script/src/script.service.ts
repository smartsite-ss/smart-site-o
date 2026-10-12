// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Script, ScriptExecution, ScriptStatus, ScriptTriggerType } from './entities/script.entity';
import { ScriptEngineService, ExecutionResult } from './script-engine.service';
import { ScriptApiService } from './script-api.service';
import { ScriptSchedulerService } from './script-scheduler.service';
import { ExecutionQueueService, ExecutionPriority } from './execution-queue.service';
import { ExecuteScriptDto, AsyncExecutionResponse } from './dto/script.dto';
import { I18nService } from '@ss-node/ss-i18n';

/**
 * ScriptService — 脚本管理服务
 *
 * Phase 5.1/5.2 改造：executeScript 接入 ExecutionQueueService
 * - 手动生成 executionId（randomUUID），先创建 ScriptExecution 记录（status='queued'）
 * - 构建 executeFn（更新记录状态 + 调 engineService.runScript）
 * - async=true：入队后立即返回 { executionId, status:'queued' }（fire-and-forget）
 * - async=false：入队并 await，返回 ExecutionResult
 * - 优先级映射：manual→NORMAL, scheduled→LOW, event→HIGH, pipeline→NORMAL
 */
@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  constructor(
    @Inject(getRepositoryToken(Script))
    private readonly scriptRepo: Repository<Script>,
    @Inject(getRepositoryToken(ScriptExecution))
    private readonly executionRepo: Repository<ScriptExecution>,
    private readonly engineService: ScriptEngineService,
    private readonly apiService: ScriptApiService,
    private readonly schedulerService: ScriptSchedulerService,
    private readonly queueService: ExecutionQueueService,
    @Inject(I18nService)
    private readonly i18nService: I18nService,
  ) {}

  async create(dto: Partial<Script>): Promise<Script> {
    const script = this.scriptRepo.create(dto);
    const saved = await this.scriptRepo.save(script);

    if (saved.triggerType === ScriptTriggerType.SCHEDULED && saved.status === ScriptStatus.ACTIVE) {
      await this.schedulerService.scheduleScript(saved);
    }

    return saved;
  }

  async findAll(projectId: string): Promise<Script[]> {
    return this.scriptRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, projectId: string): Promise<Script> {
    const script = await this.scriptRepo.findOne({ where: { id, projectId } });
    if (!script)
      throw new NotFoundException(
        this.i18nService.tSync('common.not_found', { resource: 'Script' }),
      );
    return script;
  }

  async update(id: string, dto: Partial<Script>, projectId: string): Promise<Script> {
    const script = await this.findOne(id, projectId);
    Object.assign(script, dto);
    const saved = await this.scriptRepo.save(script);

    if (saved.triggerType === ScriptTriggerType.SCHEDULED) {
      if (saved.status === ScriptStatus.ACTIVE) {
        await this.schedulerService.scheduleScript(saved);
      } else {
        this.schedulerService.unscheduleScript(id);
      }
    }

    return saved;
  }

  async remove(id: string, projectId: string): Promise<void> {
    const script = await this.findOne(id, projectId);
    this.schedulerService.unscheduleScript(id);
    await this.scriptRepo.remove(script);
  }

  /**
   * 执行脚本 — 通过 ExecutionQueueService 接管调度，支持同步/异步模式
   *
   * @param id 脚本 ID
   * @param projectId 项目 ID
   * @param dto 执行选项（params/async/priority/userId）
   * @returns 同步模式返回 ExecutionResult；异步模式返回 { executionId, status }
   */
  async executeScript(
    id: string,
    projectId: string,
    dto?: ExecuteScriptDto,
  ): Promise<ExecutionResult | AsyncExecutionResponse> {
    const script = await this.findOne(id, projectId);

    const isAsync = dto?.async ?? false;
    const priority = this.mapPriority(script.triggerType, dto?.priority);
    const userId = dto?.userId ?? 'system';
    const context: Record<string, any> = dto?.params ?? {};

    // 手动生成 executionId（先于记录创建，供队列任务引用）
    const executionId = randomUUID();
    const apiProvider = this.apiService.getApiProvider(projectId);

    // 1. 创建执行记录（status='queued'）
    const execution = this.executionRepo.create({
      id: executionId,
      scriptId: script.id,
      trigger: script.triggerType,
      status: 'queued',
      startedAt: new Date(),
      memoryUsedMb: 0,
    });
    await this.executionRepo.save(execution);

    // 2. 构建执行函数（更新记录状态 + 调用 runScript 纯执行）
    const executeFn = async (): Promise<ExecutionResult> => {
      execution.status = 'running';
      await this.executionRepo.save(execution);

      const result = await this.engineService.runScript(script, {
        apiProvider,
        ...context,
        trigger: 'manual',
        userId,
      });

      execution.status = result.success ? 'completed' : 'failed';
      execution.result =
        result.success && result.result !== undefined
          ? typeof result.result === 'string'
            ? result.result
            : JSON.stringify(result.result)
          : undefined;
      execution.error = result.error;
      execution.durationMs = result.durationMs;
      execution.finishedAt = new Date();
      await this.executionRepo.save(execution);

      return result;
    };

    // 3. 入队执行
    const enqueuePromise = this.queueService.enqueue(
      executionId,
      script.id,
      projectId,
      priority,
      executeFn,
      script.timeoutMs || 300000,
    );

    if (isAsync) {
      // 异步模式：fire-and-forget，立即返回 executionId
      enqueuePromise.catch((err) => {
        this.logger.error(`Async execution ${executionId} failed: ${err.message}`);
      });
      return { executionId, status: 'queued' };
    }

    // 同步模式：等待队列执行完成
    return enqueuePromise;
  }

  /** 查询执行记录详情 */
  async getExecution(executionId: string, _projectId: string): Promise<ScriptExecution> {
    const execution = await this.executionRepo.findOne({ where: { id: executionId } });
    if (!execution) {
      throw new NotFoundException(
        this.i18nService.tSync('common.not_found', { resource: 'ScriptExecution' }),
      );
    }
    return execution;
  }

  /** 取消执行（取消队列任务 + 更新记录状态） */
  async cancelExecution(
    executionId: string,
    _projectId: string,
  ): Promise<{ executionId: string; cancelled: boolean }> {
    const cancelled = this.queueService.cancelJob(executionId);
    if (cancelled) {
      const execution = await this.executionRepo.findOne({ where: { id: executionId } });
      if (execution && (execution.status === 'queued' || execution.status === 'running')) {
        execution.status = 'cancelled';
        execution.finishedAt = new Date();
        await this.executionRepo.save(execution);
      }
    }
    return { executionId, cancelled };
  }

  async getExecutionHistory(scriptId: string, limit: number = 20): Promise<ScriptExecution[]> {
    return this.executionRepo.find({
      where: { scriptId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getApiFunctions() {
    return this.apiService.getApiFunctions().map((f) => ({
      name: f.name,
      description: f.description,
      parameters: f.parameters,
    }));
  }

  /**
   * 优先级映射：显式指定优先于触发类型默认值
   * - manual → NORMAL, scheduled → LOW, event → HIGH, pipeline → NORMAL
   */
  private mapPriority(
    triggerType: ScriptTriggerType,
    explicit?: string,
  ): ExecutionPriority {
    if (explicit) {
      const map: Record<string, ExecutionPriority> = {
        critical: ExecutionPriority.CRITICAL,
        high: ExecutionPriority.HIGH,
        normal: ExecutionPriority.NORMAL,
        low: ExecutionPriority.LOW,
      };
      if (map[explicit] !== undefined) return map[explicit];
    }
    switch (triggerType) {
      case ScriptTriggerType.EVENT:
        return ExecutionPriority.HIGH;
      case ScriptTriggerType.SCHEDULED:
        return ExecutionPriority.LOW;
      default:
        return ExecutionPriority.NORMAL;
    }
  }
}
