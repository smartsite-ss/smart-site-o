// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AlarmStatisticsService } from '../statistics/alarm-statistics.service';
import { AlarmRecord } from '../entities/alarm.entity';
import { Repository } from 'typeorm';
import { ProjectDatabaseService } from '@ss-node/ss-core';
import { ConfigService } from '@nestjs/config';
import { AlarmLevel } from '@ss-node/ss-sdk';

// ============================================================
// Smart Mock QueryBuilder
// Emulates TypeORM QueryBuilder for AlarmRecord by evaluating
// select / where / groupBy / orderBy / limit against in-memory
// records. Supports the SQL expression patterns used by
// AlarmStatisticsService (COUNT, SUM(CASE WHEN...BETWEEN),
// AVG/MAX/MIN(julianday...), strftime, COALESCE).
// ============================================================

/** Format a Date using a strftime-like format string (UTC). */
function formatStrftime(fmt: string, date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  return fmt.replace('%Y', String(y)).replace('%m', m).replace('%d', d).replace('%H', h);
}

/** Evaluate a SQL expression against a set of records. Returns string | null | undefined. */
function evaluateExpression(
  expr: string,
  records: AlarmRecord[],
  params: Record<string, any>,
): any {
  const e = expr.trim();

  // COUNT(*)
  if (/^COUNT\(\*\)$/i.test(e)) return String(records.length);

  // Simple field reference: r.field
  const fieldMatch = e.match(/^r\.(\w+)$/);
  if (fieldMatch) return (records[0] as any)?.[fieldMatch[1]];

  // COALESCE(r.field, '')
  const coalesceMatch = e.match(/^COALESCE\(r\.(\w+),\s*''\)$/i);
  if (coalesceMatch) return (records[0] as any)?.[coalesceMatch[1]] ?? '';

  // strftime('format', r.field) — daily/hourly time bucket
  const strftimeMatch = e.match(/^strftime\('([^']+)',\s*r\.(\w+)\)$/i);
  if (strftimeMatch) {
    const [, fmt, field] = strftimeMatch;
    const val = (records[0] as any)?.[field] as Date;
    if (!val) return '';
    return formatStrftime(fmt, val);
  }

  // SUM(CASE WHEN r.field BETWEEN :p1 AND :p2 THEN 1 ELSE 0 END)
  const sumBetweenMatch = e.match(
    /^SUM\(CASE WHEN r\.(\w+)\s+BETWEEN\s+:(\w+)\s+AND\s+:(\w+)\s+THEN\s+1\s+ELSE\s+0\s+END\)$/i,
  );
  if (sumBetweenMatch) {
    const [, field, p1, p2] = sumBetweenMatch;
    const start = new Date(params[p1]);
    const end = new Date(params[p2]);
    return String(
      records.filter((r) => {
        const v = new Date((r as any)[field]);
        return v >= start && v <= end;
      }).length,
    );
  }

  // AVG/MAX/MIN((julianday(r.f1) - julianday(r.f2)) * 86400000)
  const aggMatch = e.match(
    /^(AVG|MAX|MIN)\(\(julianday\(r\.(\w+)\)\s*-\s*julianday\(r\.(\w+)\)\)\s*\*\s*86400000\)$/i,
  );
  if (aggMatch) {
    const [, agg, f1, f2] = aggMatch;
    const times = records
      .map((r) => {
        const v1 = (r as any)[f1] as Date;
        const v2 = (r as any)[f2] as Date;
        if (!v1 || !v2) return NaN;
        return v1.getTime() - v2.getTime();
      })
      .filter((t) => !isNaN(t));
    if (times.length === 0) return null;
    if (agg.toUpperCase() === 'AVG') return String(times.reduce((a, b) => a + b, 0) / times.length);
    if (agg.toUpperCase() === 'MAX') return String(Math.max(...times));
    if (agg.toUpperCase() === 'MIN') return String(Math.min(...times));
  }

  // (julianday(r.f1) - julianday(r.f2)) * 86400000 — per-record response time
  const perRecordMatch = e.match(
    /^\(julianday\(r\.(\w+)\)\s*-\s*julianday\(r\.(\w+)\)\)\s*\*\s*86400000$/,
  );
  if (perRecordMatch) {
    const [, f1, f2] = perRecordMatch;
    const v1 = (records[0] as any)?.[f1] as Date;
    const v2 = (records[0] as any)?.[f2] as Date;
    if (!v1 || !v2) return null;
    return String(v1.getTime() - v2.getTime());
  }

  return null;
}

class MockQueryBuilder {
  private records: AlarmRecord[];
  private selects: { expression: string; alias: string }[] = [];
  private wheres: { condition: string; params: Record<string, any> }[] = [];
  private groupBys: string[] = [];
  private orderBys: { field: string; direction: string }[] = [];
  private limitValue?: number;
  private parameters: Record<string, any> = {};

  constructor(records: AlarmRecord[]) {
    this.records = records;
  }

  select(expression: string, alias?: string): this {
    this.selects.push({ expression, alias: alias ?? expression });
    return this;
  }
  addSelect(expression: string, alias?: string): this {
    this.selects.push({ expression, alias: alias ?? expression });
    return this;
  }
  where(condition: string, params?: any): this {
    this.wheres.push({ condition, params: params ?? {} });
    return this;
  }
  andWhere(condition: string, params?: any): this {
    this.wheres.push({ condition, params: params ?? {} });
    return this;
  }
  groupBy(field: string): this {
    this.groupBys.push(field);
    return this;
  }
  orderBy(field: string, direction?: string): this {
    this.orderBys.push({ field, direction: direction ?? 'ASC' });
    return this;
  }
  limit(n: number): this {
    this.limitValue = n;
    return this;
  }
  setParameters(params: Record<string, any>): this {
    Object.assign(this.parameters, params);
    return this;
  }

  private getAllParams(): Record<string, any> {
    const all: Record<string, any> = { ...this.parameters };
    for (const w of this.wheres) Object.assign(all, w.params);
    return all;
  }

  private matches(record: AlarmRecord, condition: string, params: any): boolean {
    const c = condition.trim();
    if (c === 'r.acknowledgedAt IS NOT NULL') return record.acknowledgedAt != null;
    if (c === 'r.deviceId IS NOT NULL') return record.deviceId != null;
    const m = c.match(/^r\.(\w+)\s*(>=|<=|>|<|=)\s*:(\w+)$/);
    if (m) {
      const [, field, op, param] = m;
      const pv = params[param];
      const rv = (record as any)[field];
      if (op === '=') {
        if (rv instanceof Date || pv instanceof Date) {
          return new Date(rv).getTime() === new Date(pv).getTime();
        }
        return rv === pv;
      }
      const rTime = new Date(rv).getTime();
      const pTime = new Date(pv).getTime();
      if (op === '>=') return rTime >= pTime;
      if (op === '<=') return rTime <= pTime;
      if (op === '>') return rTime > pTime;
      if (op === '<') return rTime < pTime;
    }
    return true;
  }

  private filterRecords(): AlarmRecord[] {
    const params = this.getAllParams();
    return this.records.filter((r) =>
      this.wheres.every((w) => this.matches(r, w.condition, params)),
    );
  }

  private getGroupKey(record: AlarmRecord): string {
    const gb = this.groupBys[0];
    if (gb.startsWith('r.')) {
      return String((record as any)[gb.substring(2)] ?? '');
    }
    const sel = this.selects.find((s) => s.alias === gb);
    if (sel) {
      return String(evaluateExpression(sel.expression, [record], this.getAllParams()) ?? '');
    }
    return '';
  }

  private applyOrderBy(rows: any[]): any[] {
    if (this.orderBys.length === 0) return rows;
    return [...rows].sort((a, b) => {
      for (const { field, direction } of this.orderBys) {
        const av = a[field];
        const bv = b[field];
        const dir = direction.toUpperCase() === 'DESC' ? -1 : 1;
        if (typeof av === 'string' && typeof bv === 'string' && isNaN(Number(av))) {
          return av.localeCompare(bv) * dir;
        }
        return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
      }
      return 0;
    });
  }

  async getRawMany(): Promise<any[]> {
    const filtered = this.filterRecords();
    const params = this.getAllParams();

    if (this.groupBys.length > 0) {
      const groups = new Map<string, AlarmRecord[]>();
      for (const r of filtered) {
        const key = this.getGroupKey(r);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }
      let rows: any[] = [];
      for (const [, recs] of groups) {
        const row: any = {};
        for (const s of this.selects) {
          row[s.alias] = evaluateExpression(s.expression, recs, params);
        }
        rows.push(row);
      }
      rows = this.applyOrderBy(rows);
      if (this.limitValue != null) rows = rows.slice(0, this.limitValue);
      return rows;
    }

    const isAggregate = this.selects.some((s) => /^(COUNT|AVG|SUM|MAX|MIN)\(/i.test(s.expression));

    if (isAggregate) {
      const row: any = {};
      for (const s of this.selects) {
        row[s.alias] = evaluateExpression(s.expression, filtered, params);
      }
      return [row];
    }

    let rows = filtered.map((r) => {
      const row: any = {};
      for (const s of this.selects) {
        row[s.alias] = evaluateExpression(s.expression, [r], params);
      }
      return row;
    });
    rows = this.applyOrderBy(rows);
    if (this.limitValue != null) rows = rows.slice(0, this.limitValue);
    return rows;
  }

  async getRawOne(): Promise<any> {
    const rows = await this.getRawMany();
    return rows[0] ?? null;
  }

  async getCount(): Promise<number> {
    return this.filterRecords().length;
  }
}

// ============================================================
// Mock helpers
// ============================================================

const mockRule = (name: string) => ({ name }) as any;

interface MockRepo {
  find: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
  records: AlarmRecord[];
}

/**
 * 根据 where 条件过滤记录(支持 MongoDB 风格的 $gte/$lte/$ne 操作符,
 * 与 AlarmStatisticsService.buildDateFilter 生成的 where 结构对齐)。
 *
 * service 经重构后用 repo.find({ where }) / repo.count({ where }) 直接查询,
 * 不再走 createQueryBuilder,因此 mock 的 find/count 必须实现等价的过滤逻辑,
 * 否则返回 undefined 导致 "records is not iterable"。
 */
function matchesWhere(record: AlarmRecord, where: Record<string, any>): boolean {
  for (const [field, condition] of Object.entries(where)) {
    const recordValue = (record as any)[field];
    if (condition !== null && typeof condition === 'object' && !(condition instanceof Date)) {
      // 操作符对象: { $gte, $lte, $ne }
      if (condition.$gte !== undefined) {
        const rv =
          recordValue instanceof Date ? recordValue.getTime() : new Date(recordValue).getTime();
        const pv =
          condition.$gte instanceof Date
            ? condition.$gte.getTime()
            : new Date(condition.$gte).getTime();
        if (!(rv >= pv)) return false;
      }
      if (condition.$lte !== undefined) {
        const rv =
          recordValue instanceof Date ? recordValue.getTime() : new Date(recordValue).getTime();
        const pv =
          condition.$lte instanceof Date
            ? condition.$lte.getTime()
            : new Date(condition.$lte).getTime();
        if (!(rv <= pv)) return false;
      }
      if (condition.$ne !== undefined) {
        if (condition.$ne === null) {
          if (recordValue === null || recordValue === undefined) return false;
        } else if (recordValue === condition.$ne) {
          return false;
        }
      }
    } else {
      // 等值匹配
      if (recordValue !== condition) return false;
    }
  }
  return true;
}

function createMockRepo(): MockRepo {
  const repo: MockRepo = {
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    records: [],
  };
  // find: 按 where 条件过滤 records(与 service 的 find({ where }) 调用对齐)
  repo.find.mockImplementation((options?: { where?: Record<string, any> }) => {
    const where = options?.where ?? {};
    return repo.records.filter((r) => matchesWhere(r, where));
  });
  // count: 同 find 的过滤逻辑,返回计数
  repo.count.mockImplementation((options?: { where?: Record<string, any> }) => {
    const where = options?.where ?? {};
    return repo.records.filter((r) => matchesWhere(r, where)).length;
  });
  repo.createQueryBuilder.mockImplementation(() => new MockQueryBuilder(repo.records));
  return repo;
}

function createMockProjectDbService(): jest.Mocked<Partial<ProjectDatabaseService>> {
  return { getSystemDb: jest.fn() };
}

function createMockConfigService(): jest.Mocked<Partial<ConfigService>> {
  return { get: jest.fn().mockReturnValue('shared') };
}

function makeRecord(overrides: Partial<AlarmRecord> = {}): AlarmRecord {
  const record = new AlarmRecord();
  Object.assign(record, {
    id: 'record-001',
    level: AlarmLevel.WARNING,
    deviceId: 'device-001',
    projectId: 'project-001',
    createdAt: new Date('2025-01-15T10:00:00Z'),
    acknowledgedAt: new Date('2025-01-15T10:05:00Z'),
    message: '温度值 95 超过阈值 80',
    rule: mockRule('温度过高'),
    ...overrides,
  });
  return record;
}

function makeSampleRecords(): AlarmRecord[] {
  return [
    makeRecord({
      id: 'rec-001',
      level: AlarmLevel.INFO,
      deviceId: 'device-001',
      createdAt: new Date('2025-01-10T08:00:00Z'),
      acknowledgedAt: new Date('2025-01-10T08:02:00Z'),
      message: 'Normal reading',
      rule: mockRule('Info Rule'),
    }),
    makeRecord({
      id: 'rec-002',
      level: AlarmLevel.WARNING,
      deviceId: 'device-001',
      createdAt: new Date('2025-01-10T09:00:00Z'),
      acknowledgedAt: new Date('2025-01-10T09:10:00Z'),
      message: '温度值 85 超过阈值 80',
      rule: mockRule('温度过高'),
    }),
    makeRecord({
      id: 'rec-003',
      level: AlarmLevel.WARNING,
      deviceId: 'device-002',
      createdAt: new Date('2025-01-10T10:00:00Z'),
      acknowledgedAt: new Date('2025-01-10T10:15:00Z'),
      message: '温度值 90 超过阈值 80',
      rule: mockRule('温度过高'),
    }),
    makeRecord({
      id: 'rec-004',
      level: AlarmLevel.ERROR,
      deviceId: 'device-001',
      createdAt: new Date('2025-01-11T08:00:00Z'),
      acknowledgedAt: new Date('2025-01-11T08:30:00Z'),
      message: '压力值 150 超过阈值 120',
      rule: mockRule('压力过高'),
    }),
    makeRecord({
      id: 'rec-005',
      level: AlarmLevel.ERROR,
      deviceId: 'device-003',
      createdAt: new Date('2025-01-11T09:00:00Z'),
      acknowledgedAt: null,
      message: '压力值 160 超过阈值 120',
      rule: mockRule('压力过高'),
    }),
    makeRecord({
      id: 'rec-006',
      level: AlarmLevel.CRITICAL,
      deviceId: 'device-001',
      createdAt: new Date('2025-01-11T10:00:00Z'),
      acknowledgedAt: new Date('2025-01-11T10:01:00Z'),
      message: '设备离线',
      rule: mockRule('设备离线检测'),
    }),
    makeRecord({
      id: 'rec-007',
      level: AlarmLevel.CRITICAL,
      deviceId: 'device-002',
      createdAt: new Date('2025-01-12T08:00:00Z'),
      acknowledgedAt: new Date('2025-01-12T08:05:00Z'),
      message: '设备离线',
      rule: mockRule('设备离线检测'),
    }),
    makeRecord({
      id: 'rec-008',
      level: AlarmLevel.WARNING,
      deviceId: 'device-001',
      createdAt: new Date('2025-01-12T12:00:00Z'),
      acknowledgedAt: new Date('2025-01-12T12:08:00Z'),
      message: '温度值 88 超过阈值 80',
      rule: mockRule('温度过高'),
    }),
    makeRecord({
      id: 'rec-009',
      level: AlarmLevel.INFO,
      deviceId: 'device-003',
      createdAt: new Date('2025-01-13T08:00:00Z'),
      acknowledgedAt: null,
      message: 'Normal reading',
      rule: mockRule('Info Rule'),
    }),
    makeRecord({
      id: 'rec-010',
      level: AlarmLevel.WARNING,
      deviceId: 'device-002',
      createdAt: new Date('2025-01-14T10:00:00Z'),
      acknowledgedAt: new Date('2025-01-14T10:12:00Z'),
      message: '温度值 92 超过阈值 80',
      rule: mockRule('温度过高'),
    }),
  ];
}

/** Create records spread across the trend test's current & previous periods. */
function makeTrendRecords(currentCount: number, previousCount: number): AlarmRecord[] {
  const currentDates = [
    new Date('2025-01-03T10:00:00Z'),
    new Date('2025-01-04T10:00:00Z'),
    new Date('2025-01-05T10:00:00Z'),
    new Date('2025-01-03T14:00:00Z'),
    new Date('2025-01-04T16:00:00Z'),
  ];
  const previousDates = [
    new Date('2024-12-31T10:00:00Z'),
    new Date('2025-01-01T10:00:00Z'),
    new Date('2025-01-02T10:00:00Z'),
  ];
  const records: AlarmRecord[] = [];
  for (let i = 0; i < currentCount; i++) {
    records.push(makeRecord({ id: `curr-${i}`, createdAt: currentDates[i % currentDates.length] }));
  }
  for (let i = 0; i < previousCount; i++) {
    records.push(
      makeRecord({ id: `prev-${i}`, createdAt: previousDates[i % previousDates.length] }),
    );
  }
  return records;
}

// ============================================================
// Test cases
// ============================================================

describe('AlarmStatisticsService', () => {
  let service: AlarmStatisticsService;
  let repo: MockRepo;

  beforeEach(() => {
    repo = createMockRepo();
    repo.records = makeSampleRecords();
    const projectDbService = createMockProjectDbService();
    const configService = createMockConfigService();
    service = new AlarmStatisticsService(
      repo as any,
      projectDbService as any,
      configService as any,
    );
  });

  describe('getStatisticsByLevel', () => {
    it('TC-ALM-200: should return counts grouped by level ordered by count DESC', async () => {
      const result = await service.getStatisticsByLevel();
      expect(result).toHaveLength(4);
      const warning = result.find((r) => r.level === AlarmLevel.WARNING);
      expect(warning?.count).toBe(4);
      // ordered by count DESC
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count);
      }
    });

    it('TC-ALM-201: should filter by startDate', async () => {
      const result = await service.getStatisticsByLevel(undefined, '2025-01-11T00:00:00Z');
      const total = result.reduce((s, r) => s + r.count, 0);
      expect(total).toBe(7); // rec-004..010
    });

    it('TC-ALM-202: should filter by endDate', async () => {
      const result = await service.getStatisticsByLevel(
        undefined,
        undefined,
        '2025-01-10T23:59:59Z',
      );
      const total = result.reduce((s, r) => s + r.count, 0);
      expect(total).toBe(3); // rec-001,002,003
    });

    it('TC-ALM-203: should return empty array when no records', async () => {
      repo.records = [];
      const result = await service.getStatisticsByLevel();
      expect(result).toEqual([]);
    });
  });

  describe('getStatisticsByDevice', () => {
    it('TC-ALM-204: should return count for given device', async () => {
      const result = await service.getStatisticsByDevice('device-001');
      expect(result).toEqual({ deviceId: 'device-001', count: 5 });
    });

    it('TC-ALM-205: should return 0 for unknown device', async () => {
      const result = await service.getStatisticsByDevice('unknown-device');
      expect(result.count).toBe(0);
    });

    it('TC-ALM-206: should filter by date range', async () => {
      const result = await service.getStatisticsByDevice(
        'device-001',
        undefined,
        '2025-01-11T00:00:00Z',
      );
      expect(result.count).toBe(3); // rec-004,006,008
    });
  });

  describe('getStatisticsByTime', () => {
    it('TC-ALM-207: should group by day for daily interval', async () => {
      const result = await service.getStatisticsByTime(
        undefined,
        '2025-01-10T00:00:00Z',
        '2025-01-10T23:59:59Z',
        'daily',
      );
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe('2025-01-10T00:00:00.000Z');
      expect(result[0].count).toBe(3);
    });

    it('TC-ALM-208: should group by hour for hourly interval', async () => {
      const result = await service.getStatisticsByTime(
        undefined,
        '2025-01-10T00:00:00Z',
        '2025-01-10T23:59:59Z',
        'hourly',
      );
      expect(result).toHaveLength(3); // 08:00, 09:00, 10:00
      expect(result.map((r) => r.time).sort()).toEqual([
        '2025-01-10T08:00:00.000Z',
        '2025-01-10T09:00:00.000Z',
        '2025-01-10T10:00:00.000Z',
      ]);
    });

    it('TC-ALM-209: should filter by date range', async () => {
      const result = await service.getStatisticsByTime(
        undefined,
        '2025-01-12T00:00:00Z',
        '2025-01-12T23:59:59Z',
        'daily',
      );
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(2); // rec-007,008
    });
  });

  describe('getTrendAnalysis', () => {
    it('TC-ALM-210: should detect up trend', async () => {
      repo.records = makeTrendRecords(5, 3);
      const result = await service.getTrendAnalysis('2025-01-03T00:00:00Z', '2025-01-05T23:59:59Z');
      expect(result.currentPeriod.count).toBe(5);
      expect(result.previousPeriod.count).toBe(3);
      expect(result.trend).toBe('up');
    });

    it('TC-ALM-211: should detect down trend', async () => {
      repo.records = makeTrendRecords(2, 5);
      const result = await service.getTrendAnalysis('2025-01-03T00:00:00Z', '2025-01-05T23:59:59Z');
      expect(result.currentPeriod.count).toBe(2);
      expect(result.previousPeriod.count).toBe(5);
      expect(result.trend).toBe('down');
    });

    it('TC-ALM-212: should detect stable trend', async () => {
      repo.records = makeTrendRecords(3, 3);
      const result = await service.getTrendAnalysis('2025-01-03T00:00:00Z', '2025-01-05T23:59:59Z');
      expect(result.currentPeriod.count).toBe(3);
      expect(result.previousPeriod.count).toBe(3);
      expect(result.trend).toBe('stable');
    });
  });

  describe('getTopAlarms', () => {
    it('TC-ALM-213: should return top alarms ordered by count DESC', async () => {
      const result = await service.getTopAlarms(10);
      // 8 distinct messages; "设备离线" and "Normal reading" have count=2
      expect(result.length).toBe(8);
      expect(result[0].count).toBeGreaterThanOrEqual(2);
      const offline = result.find((r) => r.message === '设备离线');
      expect(offline?.count).toBe(2);
    });

    it('TC-ALM-214: should respect limit', async () => {
      const result = await service.getTopAlarms(1);
      expect(result).toHaveLength(1);
    });

    it('TC-ALM-215: should filter by date range', async () => {
      const result = await service.getTopAlarms(10, undefined, '2025-01-11T00:00:00Z');
      const total = result.reduce((s, r) => s + r.count, 0);
      expect(total).toBe(7); // rec-004..010
    });
  });

  describe('getResponseTimeStats', () => {
    it('TC-ALM-216: should compute average/max/min/median', async () => {
      const result = await service.getResponseTimeStats();
      expect(result.totalSamples).toBe(8);
      expect(result.average).toBe(622500);
      expect(result.max).toBe(1800000);
      expect(result.min).toBe(60000);
      expect(result.median).toBe(540000);
    });

    it('TC-ALM-217: should return zeros when no acknowledged records', async () => {
      repo.records = [makeRecord({ acknowledgedAt: null })];
      const result = await service.getResponseTimeStats();
      expect(result).toEqual({ average: 0, median: 0, max: 0, min: 0, totalSamples: 0 });
    });

    it('TC-ALM-218: should filter by date range', async () => {
      const result = await service.getResponseTimeStats(undefined, '2025-01-11T00:00:00Z');
      expect(result.totalSamples).toBe(5);
    });
  });

  describe('getAlarmSummary', () => {
    it('TC-ALM-219: should return comprehensive summary', async () => {
      const result = await service.getAlarmSummary(
        'project-001',
        '2025-01-10T00:00:00Z',
        '2025-01-14T23:59:59Z',
      );
      expect(result.projectId).toBe('project-001');
      expect(result.totalAlarms).toBe(10);
      expect(result.byLevel[AlarmLevel.WARNING]).toBe(4);
      expect(result.byDevice['device-001']).toBe(5);
      expect(result.trend).toBeDefined();
      expect(result.topAlarms).toBeDefined();
      expect(result.responseTime).toBeDefined();
    });

    it('TC-ALM-220: should return empty summary for project with no records', async () => {
      repo.records = [];
      const result = await service.getAlarmSummary('empty-project');
      expect(result.totalAlarms).toBe(0);
      expect(result.byLevel).toEqual({});
      expect(result.byDevice).toEqual({});
      expect(result.topAlarms).toEqual([]);
      expect(result.responseTime.totalSamples).toBe(0);
    });
  });
});
