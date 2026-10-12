// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlarmRecord, AlarmStatus } from './entities/alarm.entity';

export interface SuppressionRule {
  id: string;
  name: string;
  type: 'maintenance' | 'offline' | 'parent_child' | 'schedule';
  targetIds: string[];
  suppressAlarms: boolean;
  suppressNotifications: boolean;
  startTime?: Date;
  endTime?: Date;
}

@Injectable()
export class AlarmSuppressionService {
  private readonly logger = new Logger(AlarmSuppressionService.name);

  private suppressionRules: SuppressionRule[] = [];

  constructor(
    @Inject(getRepositoryToken(AlarmRecord))
    private readonly alarmRecordRepo: Repository<AlarmRecord>,
  ) {}

  addRule(rule: SuppressionRule): void {
    this.suppressionRules.push(rule);
    this.logger.log(`Added suppression rule: ${rule.name}`);
  }

  removeRule(ruleId: string): boolean {
    const index = this.suppressionRules.findIndex((r) => r.id === ruleId);
    if (index >= 0) {
      this.suppressionRules.splice(index, 1);
      this.logger.log(`Removed suppression rule: ${ruleId}`);
      return true;
    }
    return false;
  }

  getRules(): SuppressionRule[] {
    return [...this.suppressionRules];
  }

  shouldSuppress(tagId: string, ruleId: string): { suppressed: boolean; reason?: string } {
    const now = Date.now();

    for (const rule of this.suppressionRules) {
      if (rule.type === 'schedule') {
        if (rule.startTime && rule.endTime) {
          if (now >= rule.startTime.getTime() && now <= rule.endTime.getTime()) {
            return { suppressed: true, reason: `定时抑制: ${rule.name}` };
          }
        }
        continue;
      }

      if (
        rule.targetIds.includes(tagId) ||
        rule.targetIds.includes(ruleId) ||
        rule.targetIds.includes('*')
      ) {
        const reason =
          rule.type === 'maintenance'
            ? `维护模式抑制: ${rule.name}`
            : rule.type === 'offline'
              ? `设备离线抑制: ${rule.name}`
              : `父子关联抑制: ${rule.name}`;

        return { suppressed: true, reason };
      }
    }

    return { suppressed: false };
  }

  async suppressExistingAlarms(rule: SuppressionRule): Promise<number> {
    if (!rule.suppressAlarms) return 0;

    const records = await this.alarmRecordRepo.find({
      where: { status: AlarmStatus.ACTIVE },
    });

    let count = 0;
    for (const record of records) {
      if (rule.targetIds.includes(record.ruleId) || rule.targetIds.includes('*')) {
        record.status = AlarmStatus.SHELVED;
        record.shelveReason = `自动抑制: ${rule.name}`;
        record.shelvedAt = new Date();
        await this.alarmRecordRepo.save(record);
        count++;
      }
    }

    this.logger.log(`Suppressed ${count} existing alarms for rule: ${rule.name}`);
    return count;
  }

  async unsuppressAll(type: string): Promise<number> {
    const result = await this.alarmRecordRepo.update(
      {
        status: AlarmStatus.SHELVED,
        shelveReason: `自动抑制: ${type}`,
      } as any,
      { status: AlarmStatus.ACTIVE },
    );

    this.logger.log(`Unsuppressed alarms for type: ${type}`);
    return result.affected || 0;
  }
}
