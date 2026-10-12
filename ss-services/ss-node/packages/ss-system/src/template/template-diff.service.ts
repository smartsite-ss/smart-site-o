// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { TemplateVariable } from '../entities/device-tag-template.entity';

export interface VariableDiff {
  name: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: Partial<TemplateVariable>;
  newValue?: Partial<TemplateVariable>;
  changedFields?: string[];
}

export interface TemplateDiffResult {
  comparedVersions: { left: string; right: string };
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
    totalLeft: number;
    totalRight: number;
  };
  diffs: VariableDiff[];
}

@Injectable()
export class TemplateDiffService {
  private readonly logger = new Logger(TemplateDiffService.name);

  diff(
    leftName: string,
    leftVersion: string,
    leftVariables: TemplateVariable[],
    rightName: string,
    rightVersion: string,
    rightVariables: TemplateVariable[],
  ): TemplateDiffResult {
    const leftMap = new Map<string, TemplateVariable>();
    const rightMap = new Map<string, TemplateVariable>();

    for (const v of leftVariables) {
      leftMap.set(v.name, v);
    }

    for (const v of rightVariables) {
      rightMap.set(v.name, v);
    }

    const diffs: VariableDiff[] = [];
    const allNames = new Set([...leftMap.keys(), ...rightMap.keys()]);

    for (const name of allNames) {
      const left = leftMap.get(name);
      const right = rightMap.get(name);

      if (!left && right) {
        diffs.push({
          name,
          type: 'added',
          newValue: right,
        });
      } else if (left && !right) {
        diffs.push({
          name,
          type: 'removed',
          oldValue: left,
        });
      } else if (left && right) {
        const changedFields = this.findChanges(left, right);
        if (changedFields.length > 0) {
          diffs.push({
            name,
            type: 'modified',
            oldValue: left,
            newValue: right,
            changedFields,
          });
        }
      }
    }

    const added = diffs.filter((d) => d.type === 'added').length;
    const removed = diffs.filter((d) => d.type === 'removed').length;
    const modified = diffs.filter((d) => d.type === 'modified').length;
    const unchanged = leftVariables.length - removed - modified;

    return {
      comparedVersions: {
        left: `${leftName}@${leftVersion}`,
        right: `${rightName}@${rightVersion}`,
      },
      summary: {
        added,
        removed,
        modified,
        unchanged,
        totalLeft: leftVariables.length,
        totalRight: rightVariables.length,
      },
      diffs,
    };
  }

  private findChanges(left: TemplateVariable, right: TemplateVariable): string[] {
    const changedFields: string[] = [];
    const compareFields: Array<keyof TemplateVariable> = [
      'address',
      'dataType',
      'scanRate',
      'timeout',
      'retryCount',
      'scale',
      'offset',
      'conversionType',
      'unit',
      'minValue',
      'maxValue',
      'engMinValue',
      'engMaxValue',
      'deadbandMode',
      'deadbandValue',
      'deadbandPercent',
      'deadbandTime',
      'alarmEnabled',
      'alarmHighHigh',
      'alarmHigh',
      'alarmLow',
      'alarmLowLow',
      'alarmDeviation',
      'qualityCheckEnabled',
      'maxAge',
      'archiveEnabled',
      'archiveInterval',
      'retentionDays',
      'category',
      'enabled',
    ];

    for (const field of compareFields) {
      const lv = left[field];
      const rv = right[field];
      if (JSON.stringify(lv) !== JSON.stringify(rv)) {
        changedFields.push(field);
      }
    }

    return changedFields;
  }
}
