// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlarmRecord, AlarmStatus, AlarmLevel } from '../entities/alarm.entity';
import { EventBusService } from '@ss-node/ss-core';

export interface EscalationConfig {
  timeoutMs: number;
  escalateToLevel: string;
  notifyChannels: string[];
}

const MAX_ESCALATION_LEVELS = 3;

const LEVEL_ORDER: Record<string, number> = {
  [AlarmLevel.INFO]: 0,
  [AlarmLevel.WARNING]: 1,
  [AlarmLevel.ERROR]: 2,
  [AlarmLevel.CRITICAL]: 3,
};

const NEXT_LEVEL: Record<string, string> = {
  [AlarmLevel.INFO]: AlarmLevel.WARNING,
  [AlarmLevel.WARNING]: AlarmLevel.ERROR,
  [AlarmLevel.ERROR]: AlarmLevel.CRITICAL,
};

@Injectable()
export class AlarmEscalatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlarmEscalatorService.name);

  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private escalationChain: Map<string, string[]> = new Map();
  private escalationConfigs: Map<string, EscalationConfig> = new Map();

  private periodicTimer: NodeJS.Timeout | null = null;

  private defaultConfig: EscalationConfig = {
    timeoutMs: 5 * 60 * 1000,
    escalateToLevel: AlarmLevel.WARNING,
    notifyChannels: ['email'],
  };

  constructor(
    @Inject(getRepositoryToken(AlarmRecord))
    private readonly alarmRecordRepo: Repository<AlarmRecord>,
    private readonly eventBusService: EventBusService,
  ) {}

  onModuleInit(): void {
    this.periodicTimer = setInterval(() => {
      this.periodicCheck();
    }, 30000);
  }

  onModuleDestroy(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();
  }

  checkEscalation(alarmRecordId: string): boolean {
    const chain = this.escalationChain.get(alarmRecordId);
    if (!chain) return false;
    return chain.length < MAX_ESCALATION_LEVELS;
  }

  startEscalationTimer(alarmRecordId: string, config?: EscalationConfig): void {
    if (this.escalationTimers.has(alarmRecordId)) {
      return;
    }

    const cfg = config || this.defaultConfig;
    this.escalationConfigs.set(alarmRecordId, cfg);

    const timer = setTimeout(() => {
      this.escalate(alarmRecordId);
    }, cfg.timeoutMs);

    this.escalationTimers.set(alarmRecordId, timer);
    this.logger.log(`Started escalation timer for alarm ${alarmRecordId}`);
  }

  cancelEscalationTimer(alarmRecordId: string): void {
    const timer = this.escalationTimers.get(alarmRecordId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alarmRecordId);
      this.escalationConfigs.delete(alarmRecordId);
      this.logger.log(`Cancelled escalation timer for alarm ${alarmRecordId}`);
    }
  }

  async escalate(alarmRecordId: string): Promise<void> {
    this.escalationTimers.delete(alarmRecordId);

    const record = await this.alarmRecordRepo.findOne({ where: { id: alarmRecordId } });
    if (!record) {
      this.logger.warn(`Alarm record ${alarmRecordId} not found for escalation`);
      return;
    }

    if (record.status !== AlarmStatus.ACTIVE) {
      this.logger.log(`Alarm ${alarmRecordId} is not active, skipping escalation`);
      return;
    }

    const currentLevelIdx = LEVEL_ORDER[record.level] ?? -1;
    if (currentLevelIdx < 0) {
      this.logger.warn(`Unknown alarm level: ${record.level}`);
      return;
    }

    const chain = this.escalationChain.get(alarmRecordId) || [];
    chain.push(record.level);

    if (chain.length >= MAX_ESCALATION_LEVELS) {
      this.logger.log(
        `Alarm ${alarmRecordId} reached max escalation levels (${MAX_ESCALATION_LEVELS})`,
      );
      this.escalationChain.set(alarmRecordId, chain);
      return;
    }

    const nextLevel = NEXT_LEVEL[record.level];
    if (!nextLevel) {
      this.logger.log(`No next level for ${record.level}, skipping escalation`);
      return;
    }

    const oldLevel = record.level;
    record.level = nextLevel as AlarmLevel;
    record.message = `[升级] ${record.message} — ${oldLevel} → ${nextLevel}`;
    record.dispositionType = 'alarm.escalated';
    await this.alarmRecordRepo.save(record);

    this.escalationChain.set(alarmRecordId, chain);

    this.eventBusService.emit('alarm.escalated', {
      recordId: record.id,
      projectId: record.projectId,
      ruleId: record.ruleId,
      deviceId: record.deviceId,
      fromLevel: oldLevel,
      toLevel: nextLevel,
      message: record.message,
      escalationChain: [...chain, nextLevel],
      timestamp: Date.now(),
    });

    this.logger.log(`Escalated alarm ${alarmRecordId}: ${oldLevel} → ${nextLevel}`);

    const cfg = this.escalationConfigs.get(alarmRecordId) || this.defaultConfig;
    this.startEscalationTimer(alarmRecordId, {
      timeoutMs: cfg.timeoutMs,
      escalateToLevel: NEXT_LEVEL[nextLevel] || nextLevel,
      notifyChannels: cfg.notifyChannels,
    });
  }

  async periodicCheck(): Promise<void> {
    this.logger.debug('Running periodic escalation check');

    const activeRecords = await this.alarmRecordRepo.find({
      where: { status: AlarmStatus.ACTIVE },
    });

    for (const record of activeRecords) {
      if (this.escalationTimers.has(record.id)) continue;

      const chain = this.escalationChain.get(record.id);
      if (chain && chain.length >= MAX_ESCALATION_LEVELS) continue;

      const cfg = this.escalationConfigs.get(record.id) || this.defaultConfig;
      this.startEscalationTimer(record.id, cfg);
    }
  }

  getEscalationChain(alarmRecordId: string): string[] {
    return this.escalationChain.get(alarmRecordId) || [];
  }

  clearEscalationChain(alarmRecordId: string): void {
    this.escalationChain.delete(alarmRecordId);
    this.cancelEscalationTimer(alarmRecordId);
  }
}
