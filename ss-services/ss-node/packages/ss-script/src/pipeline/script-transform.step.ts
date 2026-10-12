// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineContext, PipelineStep } from '@ss-node/ss-collector-sdk';
import { Script, ScriptStatus, ScriptTriggerType } from '../entities/script.entity';
import { ScriptEngineService } from '../script-engine.service';

@Injectable()
export class ScriptTransformStep implements PipelineStep {
  readonly name = 'ScriptTransform';
  readonly order = 3;

  private readonly logger = new Logger(ScriptTransformStep.name);

  constructor(
    @Inject(getRepositoryToken(Script))
    private readonly scriptRepo: Repository<Script>,
    private readonly engineService: ScriptEngineService,
  ) {}

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    try {
      const scripts = await this.scriptRepo.find({
        where: {
          projectId: ctx.projectId,
          status: ScriptStatus.ACTIVE,
          triggerType: ScriptTriggerType.PIPELINE,
        },
      });

      if (scripts.length === 0) {
        this.logger.debug(`No pipeline scripts found for project ${ctx.projectId}`);
        return ctx;
      }

      const pipelineContext = {
        tagId: ctx.tagId,
        deviceId: ctx.deviceId,
        projectId: ctx.projectId,
        rawValue: ctx.rawValue,
        transformedValue: ctx.transformedValue,
        quality: ctx.quality,
        tagConfig: ctx.tagConfig,
        errors: ctx.errors,
        shouldPersist: ctx.shouldPersist,
        shouldPublish: ctx.shouldPublish,
      };

      for (const script of scripts) {
        try {
          const config = script.triggerConfig ? JSON.parse(script.triggerConfig) : {};
          const stepName = config.stepName || 'transform';

          if (stepName !== 'transform') continue;

          this.logger.debug(`Running transform script: ${script.name} for tag ${ctx.tagId}`);

          const result = await this.engineService.execute(script, {
            pipeline: pipelineContext,
            ctx: pipelineContext,
          });

          if (result.success && result.result !== undefined) {
            if (typeof result.result === 'object' && result.result !== null) {
              if (result.result.transformedValue !== undefined) {
                ctx.transformedValue = result.result.transformedValue;
              }
              if (result.result.quality !== undefined) {
                ctx.quality = result.result.quality;
              }
              if (result.result.shouldPersist !== undefined) {
                ctx.shouldPersist = result.result.shouldPersist;
              }
              if (result.result.shouldPublish !== undefined) {
                ctx.shouldPublish = result.result.shouldPublish;
              }
            } else {
              ctx.transformedValue = result.result;
            }
          }

          if (!result.success) {
            ctx.errors.push({
              step: this.name,
              message: `Script "${script.name}" error: ${result.error}`,
              code: 'SCRIPT_TRANSFORM_ERROR',
            });
          }
        } catch (scriptError) {
          this.logger.error(
            `Script transform error for ${script.name}: ${(scriptError as Error).message}`,
          );
          ctx.errors.push({
            step: this.name,
            message: `Script "${script.name}" error: ${(scriptError as Error).message}`,
            code: 'SCRIPT_TRANSFORM_ERROR',
          });
        }
      }

      return ctx;
    } catch (error) {
      this.logger.error(`ScriptTransformStep error: ${(error as Error).message}`);
      ctx.errors.push({
        step: this.name,
        message: (error as Error).message,
        code: 'SCRIPT_TRANSFORM_ERROR',
      });
      return ctx;
    }
  }
}

@Injectable()
export class ScriptAlarmConditionStep implements PipelineStep {
  readonly name = 'ScriptAlarmCondition';
  readonly order = 4;

  private readonly logger = new Logger(ScriptAlarmConditionStep.name);

  constructor(
    @Inject(getRepositoryToken(Script))
    private readonly scriptRepo: Repository<Script>,
    private readonly engineService: ScriptEngineService,
  ) {}

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    try {
      const scripts = await this.scriptRepo.find({
        where: {
          projectId: ctx.projectId,
          status: ScriptStatus.ACTIVE,
          triggerType: ScriptTriggerType.PIPELINE,
        },
      });

      const alarmScripts = scripts.filter((script) => {
        try {
          const config = script.triggerConfig ? JSON.parse(script.triggerConfig) : {};
          return config.stepName === 'alarm';
        } catch {
          return false;
        }
      });

      if (alarmScripts.length === 0) {
        return ctx;
      }

      const pipelineContext = {
        tagId: ctx.tagId,
        deviceId: ctx.deviceId,
        projectId: ctx.projectId,
        rawValue: ctx.rawValue,
        transformedValue: ctx.transformedValue,
        quality: ctx.quality,
        tagConfig: ctx.tagConfig,
        errors: ctx.errors,
        shouldPersist: ctx.shouldPersist,
        shouldPublish: ctx.shouldPublish,
      };

      for (const script of alarmScripts) {
        try {
          this.logger.debug(`Running alarm condition script: ${script.name} for tag ${ctx.tagId}`);

          const result = await this.engineService.execute(script, {
            pipeline: pipelineContext,
            ctx: pipelineContext,
          });

          if (result.success && result.result !== undefined) {
            if (typeof result.result === 'object' && result.result !== null) {
              if (result.result.alarmTriggered === true) {
                ctx.errors.push({
                  step: this.name,
                  message: `Alarm triggered by script "${script.name}": ${result.result.alarmMessage || 'custom condition met'}`,
                  code: 'SCRIPT_ALARM',
                });
              }
            }
          }
        } catch (scriptError) {
          this.logger.error(
            `Script alarm condition error for ${script.name}: ${(scriptError as Error).message}`,
          );
        }
      }

      return ctx;
    } catch (error) {
      this.logger.error(`ScriptAlarmConditionStep error: ${(error as Error).message}`);
      return ctx;
    }
  }
}
