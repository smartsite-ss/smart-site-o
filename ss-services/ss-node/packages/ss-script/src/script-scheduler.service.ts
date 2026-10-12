// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject, OnModuleDestroy } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as cron from 'node-cron';
import { Script, ScriptStatus, ScriptTriggerType } from './entities/script.entity';
import { ScriptEngineService } from './script-engine.service';
import { ScriptApiService } from './script-api.service';

interface ScheduledTask {
  scriptId: string;
  cronExpression: string;
  task: cron.ScheduledTask | null;
}

/**
 * ScriptSchedulerService — 基于 node-cron 的标准 Cron 调度器
 *
 * Phase 6.1 升级：setInterval → cron.schedule
 * - 支持完整标准 Cron 表达式（分 时 日 月 周，含 间隔、范围、列表等）
 * - 通过 cron.validate() 校验表达式合法性
 * - 时区固定为 Asia/Shanghai（避免服务器时区差异导致调度偏移）
 * - 实现 OnModuleDestroy，模块销毁时停止所有任务
 * - getApiProvider(script.projectId) 传入项目上下文
 */
@Injectable()
export class ScriptSchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(ScriptSchedulerService.name);

  private scheduledTasks = new Map<string, ScheduledTask>();

  constructor(
    @Inject(getRepositoryToken(Script))
    private readonly scriptRepo: Repository<Script>,
    private readonly engineService: ScriptEngineService,
    private readonly apiService: ScriptApiService,
  ) {}

  async loadScheduledScripts(projectId?: string): Promise<void> {
    const where: any = {
      triggerType: ScriptTriggerType.SCHEDULED,
      status: ScriptStatus.ACTIVE,
    };
    if (projectId) where.projectId = projectId;

    const scripts = await this.scriptRepo.find({ where });

    for (const script of scripts) {
      await this.scheduleScript(script);
    }

    this.logger.log(`Loaded ${scripts.length} scheduled scripts`);
  }

  async scheduleScript(script: Script): Promise<void> {
    if (script.triggerType !== ScriptTriggerType.SCHEDULED) return;
    if (script.status !== ScriptStatus.ACTIVE) {
      this.unscheduleScript(script.id);
      return;
    }

    try {
      const config = script.triggerConfig ? JSON.parse(script.triggerConfig) : {};
      const cronExpression = config.cron || '*/5 * * * *';

      // 使用 node-cron 校验表达式（标准 5 段格式：分 时 日 月 周）
      if (!cron.validate(cronExpression)) {
        this.logger.error(
          `Invalid cron expression for script ${script.name}: ${cronExpression}`,
        );
        return;
      }

      // 先清理旧任务，再注册新任务
      this.unscheduleScript(script.id);

      const task = cron.schedule(
        cronExpression,
        async () => {
          try {
            this.logger.debug(`Running scheduled script: ${script.name}`);
            await this.engineService.execute(script, {
              apiProvider: this.apiService.getApiProvider(script.projectId),
              trigger: 'scheduled',
              scheduledAt: new Date().toISOString(),
            });
          } catch (error) {
            this.logger.error(`Scheduled script error: ${script.name} - ${error.message}`);
          }
        },
        { timezone: 'Asia/Shanghai' },
      );

      this.scheduledTasks.set(script.id, {
        scriptId: script.id,
        cronExpression,
        task,
      });

      this.logger.log(
        `Scheduled script: ${script.name} (${cronExpression}, timezone=Asia/Shanghai)`,
      );
    } catch (error) {
      this.logger.error(`Failed to schedule script ${script.name}: ${error.message}`);
    }
  }

  unscheduleScript(scriptId: string): void {
    const task = this.scheduledTasks.get(scriptId);
    if (task?.task) {
      task.task.stop();
      this.scheduledTasks.delete(scriptId);
      this.logger.debug(`Unscheduled script: ${scriptId}`);
    }
  }

  unscheduleAll(): void {
    for (const [id] of this.scheduledTasks) {
      this.unscheduleScript(id);
    }
  }

  onModuleDestroy(): void {
    this.logger.log('ScriptSchedulerService destroyed, stopping all scheduled tasks');
    this.unscheduleAll();
  }

  getScheduledTasks(): { scriptId: string; cronExpression: string }[] {
    return Array.from(this.scheduledTasks.values()).map((t) => ({
      scriptId: t.scriptId,
      cronExpression: t.cronExpression,
    }));
  }
}
