// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AlarmRecord, AlarmStatus, AlarmLevel } from './entities/alarm.entity';
import { EventBusService } from '@ss-node/ss-core';

export interface EscalationRule {
  id: string;
  name: string;
  delayMs: number;
  fromLevel: AlarmLevel;
  toLevel: AlarmLevel;
  notifyChannels: string[];
  message: string;
}

@Injectable()
export class AlarmEscalationService {
  private readonly logger = new Logger(AlarmEscalationService.name);

  private escalationRules: EscalationRule[] = [
    {
      id: 'default-info',
      name: 'Info → Warning (5min)',
      delayMs: 5 * 60 * 1000,
      fromLevel: AlarmLevel.INFO,
      toLevel: AlarmLevel.WARNING,
      notifyChannels: ['email'],
      message: '报警已升级为警告',
    },
    {
      id: 'default-warning',
      name: 'Warning → Error (3min)',
      delayMs: 3 * 60 * 1000,
      fromLevel: AlarmLevel.WARNING,
      toLevel: AlarmLevel.ERROR,
      notifyChannels: ['email', 'sound'],
      message: '报警已升级为严重',
    },
    {
      id: 'default-error',
      name: 'Error → Critical (1min)',
      delayMs: 1 * 60 * 1000,
      fromLevel: AlarmLevel.ERROR,
      toLevel: AlarmLevel.CRITICAL,
      notifyChannels: ['email', 'sound', 'popup'],
      message: '报警已升级为紧急',
    },
  ];

  constructor(
    @Inject(getRepositoryToken(AlarmRecord))
    private readonly alarmRecordRepo: Repository<AlarmRecord>,
    private readonly eventBusService: EventBusService,
  ) {}

  setRules(rules: EscalationRule[]): void {
    this.escalationRules = rules;
  }

  getRules(): EscalationRule[] {
    return [...this.escalationRules];
  }

  async checkAndEscalate(): Promise<number> {
    let escalatedCount = 0;

    for (const rule of this.escalationRules) {
      const thresholdTime = new Date(Date.now() - rule.delayMs);

      const pendingRecords = await this.alarmRecordRepo.find({
        where: {
          level: rule.fromLevel,
          status: AlarmStatus.ACTIVE,
          createdAt: LessThan(thresholdTime),
        },
      });

      for (const record of pendingRecords) {
        await this.escalate(record, rule);
        escalatedCount++;
      }
    }

    if (escalatedCount > 0) {
      this.logger.log(`Escalated ${escalatedCount} alarms`);
    }

    return escalatedCount;
  }

  private async escalate(record: AlarmRecord, rule: EscalationRule): Promise<void> {
    record.level = rule.toLevel;
    record.message = `[升级] ${record.message} — ${rule.message}`;
    record.dispositionType = 'alarm.escalated';
    await this.alarmRecordRepo.save(record);

    this.eventBusService.emit('alarm.escalated', {
      recordId: record.id,
      fromLevel: rule.fromLevel,
      toLevel: rule.toLevel,
      notifyChannels: rule.notifyChannels,
      timestamp: Date.now(),
    });

    this.logger.log(`Escalated alarm ${record.id}: ${rule.fromLevel} → ${rule.toLevel}`);
  }
}
