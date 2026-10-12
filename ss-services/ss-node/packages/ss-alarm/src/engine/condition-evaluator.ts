// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { AlarmCondition } from '../entities/alarm.entity';

@Injectable()
export class ConditionEvaluator {
  private readonly logger = new Logger(ConditionEvaluator.name);

  evaluate(
    value: number,
    condition: AlarmCondition,
    conditionValue: any,
    lastValue?: number | null,
    lastUpdatedAt?: Date | null,
  ): boolean {
    try {
      switch (condition) {
        case AlarmCondition.GT:
          // value > threshold
          return value > this.parseNumeric(conditionValue);

        case AlarmCondition.LT:
          // value < threshold
          return value < this.parseNumeric(conditionValue);

        case AlarmCondition.GTE:
          // value >= threshold
          return value >= this.parseNumeric(conditionValue);

        case AlarmCondition.LTE:
          // value <= threshold
          return value <= this.parseNumeric(conditionValue);

        case AlarmCondition.EQ:
          // value == threshold (浮点容差)
          return Math.abs(value - this.parseNumeric(conditionValue)) < 0.001;

        case AlarmCondition.NEQ:
          // value != threshold
          return Math.abs(value - this.parseNumeric(conditionValue)) >= 0.001;

        case AlarmCondition.RANGE_IN: {
          // min < value < max
          const [min, max] = this.parseRange(conditionValue);
          return value > min && value < max;
        }

        case AlarmCondition.RANGE_OUT: {
          // value < min || value > max
          const [min, max] = this.parseRange(conditionValue);
          return value < min || value > max;
        }

        case AlarmCondition.CHANGED: {
          // 值发生变化时触发：需要 lastValue 进行比较
          if (lastValue === null || lastValue === undefined) {
            // 首次采集，无历史值，不触发
            return false;
          }
          return Math.abs(value - lastValue) >= 0.001;
        }

        case AlarmCondition.RATE: {
          // 变化率超过阈值时触发：rate = (value - lastValue) / timeDelta(seconds)
          if (lastValue === null || lastValue === undefined) {
            return false;
          }
          if (!lastUpdatedAt) {
            return false;
          }
          const threshold = this.parseNumeric(conditionValue);
          const timeDeltaMs = Date.now() - lastUpdatedAt.getTime();
          if (timeDeltaMs <= 0) {
            return false;
          }
          const timeDeltaSec = timeDeltaMs / 1000;
          const rate = Math.abs(value - lastValue) / timeDeltaSec;
          return rate > threshold;
        }

        default:
          this.logger.warn(`Unknown alarm condition: ${condition}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Condition evaluation error: ${error.message}`, {
        value,
        condition,
        conditionValue,
      });
      return false;
    }
  }

  private parseNumeric(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value);
    if (typeof value === 'boolean') return value ? 1 : 0;
    throw new Error(`Cannot parse as numeric: ${value}`);
  }

  private parseRange(val: any): [number, number] {
    if (Array.isArray(val) && val.length >= 2) {
      return [this.parseNumeric(val[0]), this.parseNumeric(val[1])];
    }
    throw new Error(`Cannot parse as range: ${val}`);
  }
}
