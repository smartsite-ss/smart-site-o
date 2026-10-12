// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Script, ScriptStatus, ScriptTriggerType } from './entities/script.entity';
import { ScriptEngineService } from './script-engine.service';
import { ScriptApiService } from './script-api.service';
import { EventBusService } from '@ss-node/ss-core';

export type ScriptEventType =
  'alarm.triggered' | 'alarm.cleared' | 'tag.change' | 'device.status' | 'system.startup';

@Injectable()
export class ScriptEventService {
  private readonly logger = new Logger(ScriptEventService.name);

  private eventScripts = new Map<ScriptEventType, Script[]>();

  constructor(
    @Inject(getRepositoryToken(Script))
    private readonly scriptRepo: Repository<Script>,
    private readonly engineService: ScriptEngineService,
    private readonly apiService: ScriptApiService,
    private readonly eventBusService: EventBusService,
  ) {
    this.setupEventListeners();
  }

  async loadEventScripts(projectId?: string): Promise<void> {
    const where: any = {
      triggerType: ScriptTriggerType.EVENT,
      status: ScriptStatus.ACTIVE,
    };
    if (projectId) where.projectId = projectId;

    const scripts = await this.scriptRepo.find({ where });

    const eventMap = new Map<ScriptEventType, Script[]>();

    for (const script of scripts) {
      try {
        const config = script.triggerConfig ? JSON.parse(script.triggerConfig) : {};
        const eventType = config.event as ScriptEventType;

        if (eventType) {
          if (!eventMap.has(eventType)) {
            eventMap.set(eventType, []);
          }
          eventMap.get(eventType)!.push(script);
          this.logger.log(`Registered event script: ${script.name} on ${eventType}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse event config for script ${script.name}`);
      }
    }

    this.eventScripts = eventMap;
    this.logger.log(`Loaded event scripts for ${eventMap.size} event types`);
  }

  private setupEventListeners(): void {
    this.eventBusService.on('alarm.triggered', (data) => {
      this.handleEvent('alarm.triggered', {
        event: 'alarm.triggered',
        alarmData: data,
        timestamp: new Date().toISOString(),
      });
    });

    this.eventBusService.on('alarm.cleared', (data) => {
      this.handleEvent('alarm.cleared', {
        event: 'alarm.cleared',
        alarmData: data,
        timestamp: new Date().toISOString(),
      });
    });

    this.eventBusService.on('tag.change', (data) => {
      this.handleEvent('tag.change', {
        event: 'tag.change',
        tagData: data,
        timestamp: new Date().toISOString(),
      });
    });

    this.eventBusService.on('device.status', (data) => {
      this.handleEvent('device.status', {
        event: 'device.status',
        deviceData: data,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private async handleEvent(
    eventType: ScriptEventType,
    context: Record<string, any>,
  ): Promise<void> {
    const scripts = this.eventScripts.get(eventType);
    if (!scripts || scripts.length === 0) return;

    this.logger.debug(`Handling event ${eventType} for ${scripts.length} scripts`);

    for (const script of scripts) {
      try {
        await this.engineService.execute(script, {
          apiProvider: this.apiService.getApiProvider(script.projectId),
          ...context,
        });
      } catch (error) {
        this.logger.error(`Event script ${script.name} error on ${eventType}: ${error.message}`);
      }
    }
  }

  getEventScripts(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [eventType, scripts] of this.eventScripts) {
      result[eventType] = scripts.map((s) => s.name);
    }
    return result;
  }
}
