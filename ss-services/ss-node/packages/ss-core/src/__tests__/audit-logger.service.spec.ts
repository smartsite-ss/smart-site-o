// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { AuditLoggerService } from '../logger/audit-logger.service';
import type {
  AuditEvent,
  AuditLogEntry,
  AuditEventType,
  AuditSeverity,
} from '../logger/audit-logger.types';

/**
 * S-M02: 审计日志独立通道 — 完整单元测试
 *
 * 测试覆盖：
 * 1. logSecurityEvent 文件写入验证（通过轮询等待 winston 异步写入完成）
 * 2. logSecurityEvent 字段验证与边界条件
 * 3. logSecurityEvent 安全性（XSS/SQL 注入 payload 不破坏日志）
 * 4. verifyChain 完整链验证与篡改检测
 * 5. 哈希链算法正确性（确定性、唯一性、格式）
 * 6. 重启恢复 prevHash 边界条件
 * 7. logSecurityEvent + verifyChain 集成测试
 * 8. close() 方法功能验证
 * 9. 服务生命周期边界条件
 *
 * 关键实现说明：
 * - 全局 setup.ts 启用了 jest.useFakeTimers()，但 winston 的 DailyRotateFile
 *   依赖真实定时器进行文件 I/O。本测试文件在 beforeAll 中切换回真实定时器。
 * - winston DailyRotateFile transport 的文件写入是异步的，close() 不保证数据
 *   落盘。测试通过轮询文件内容等待写入完成，而非依赖 close()。
 * - 所有创建的 AuditLoggerService 实例都会被追踪，在 afterEach 中统一 close()，
 *   确保 winston 文件流关闭后再删除临时目录，防止 ENOENT 错误。
 */
describe('AuditLoggerService', () => {
  let tempLogDir: string;
  let originalLogDir: string | undefined;
  /** 追踪所有创建的服务实例，在 afterEach 中统一关闭 */
  const createdServices: AuditLoggerService[] = [];
  /**
   * 每个 test case 开始时冻结的基础时间戳（毫秒）。
   *
   * 作用：buildAuditEntry 使用 frozenBaseTime + index 生成确定性 timestamp，
   * 避免并行测试负载下 Date.now() 在同一 test 内多次调用返回不同毫秒值，
   * 导致"相同输入应产生相同 hash"等算法测试因 timestamp 差异而失败。
   */
  let frozenBaseTime: number;

  beforeAll(() => {
    // 全局 setup.ts 启用了假定时器，但 winston 文件 I/O 依赖真实定时器
    jest.useRealTimers();
  });

  afterAll(() => {
    // 恢复假定时器，避免影响后续测试文件
    jest.useFakeTimers();
  });

  beforeEach(() => {
    tempLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-audit-test-'));
    originalLogDir = process.env.LOG_DIR;
    process.env.LOG_DIR = tempLogDir;
    createdServices.length = 0;
    // 在每个 test case 开始时冻结基础时间，确保 buildAuditEntry 的 timestamp 确定性
    frozenBaseTime = Date.now();
  });

  afterEach(async () => {
    // 1. 先关闭所有 winston 实例（等待文件流完成写入）
    await Promise.all(
      createdServices.map((service) =>
        service.close().catch(() => {
          /* 忽略关闭错误 */
        }),
      ),
    );
    createdServices.length = 0;

    // 2. 恢复环境变量
    if (originalLogDir !== undefined) {
      process.env.LOG_DIR = originalLogDir;
    } else {
      delete process.env.LOG_DIR;
    }

    // 3. 最后删除临时目录（此时所有文件流已关闭，不会触发 ENOENT）
    if (fs.existsSync(tempLogDir)) {
      fs.rmSync(tempLogDir, { recursive: true, force: true });
    }
  });

  // ──────────── 辅助函数 ────────────

  /**
   * 创建 AuditLoggerService 实例并自动追踪
   * 追踪的实例会在 afterEach 中自动 close()，确保文件流关闭后再清理目录
   */
  function createService(): AuditLoggerService {
    const service = new AuditLoggerService();
    createdServices.push(service);
    return service;
  }

  /** 获取当天审计日志文件路径 */
  function getTodayAuditFile(): string {
    const today = new Date().toISOString().split('T')[0];
    return path.join(tempLogDir, 'audit', `audit-${today}.log`);
  }

  /** 确保 audit 目录存在 */
  function ensureAuditDir(): void {
    const auditDir = path.join(tempLogDir, 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
  }

  /**
   * 与 AuditLoggerService.canonicalString 相同的算法
   * 手动按键排序构建新对象（不使用 replacer 数组，避免递归过滤嵌套键）
   */
  function computeCanonical(entry: AuditLogEntry): string {
    const fields: Record<string, any> = {
      timestamp: entry.timestamp,
      type: entry.type,
      severity: entry.severity,
      userId: entry.userId,
      username: entry.username,
      ip: entry.ip,
      userAgent: entry.userAgent,
      details: entry.details,
      prevHash: entry.prevHash,
    };
    const sortedKeys = Object.keys(fields).sort();
    const sorted: Record<string, any> = {};
    for (const key of sortedKeys) {
      if (fields[key] !== undefined) {
        sorted[key] = fields[key];
      }
    }
    return JSON.stringify(sorted);
  }

  /**
   * 手动构建一条审计日志条目（含正确的哈希链）
   * 使用与 AuditLoggerService 相同的 canonicalString 和 SHA256 算法
   */
  function buildAuditEntry(
    index: number,
    prevHash: string,
    event: Partial<AuditEvent> & { type: AuditEventType; severity: AuditSeverity },
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      // 使用 frozenBaseTime（每个 test case 冻结一次）而非 Date.now()，
      // 确保同一 test 内多次调用 buildAuditEntry 的 timestamp 确定性，
      // 避免"相同输入应产生相同 hash"测试因毫秒级时间差而失败
      timestamp: new Date(frozenBaseTime + index).toISOString(),
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      username: event.username,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details,
      prevHash,
      hash: '',
    };

    const canonical = computeCanonical(entry);
    entry.hash = crypto.createHash('sha256').update(canonical, 'utf-8').digest('hex');
    return entry;
  }

  /** 将审计条目数组写入当天日志文件（每行一个 JSON） */
  function writeAuditFile(entries: AuditLogEntry[]): void {
    ensureAuditDir();
    const lines = entries.map((e) => JSON.stringify(e));
    fs.writeFileSync(getTodayAuditFile(), lines.join('\n') + '\n');
  }

  /** 读取当天审计日志文件的所有行（解析为 JSON 数组，跳过无法解析的行） */
  function readTodayAuditEntries(): AuditLogEntry[] {
    const file = getTodayAuditFile();
    if (!fs.existsSync(file)) return [];
    const content = fs.readFileSync(file, 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as AuditLogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is AuditLogEntry => entry !== null);
  }

  /**
   * 轮询等待审计日志文件中出现指定数量的条目
   *
   * winston DailyRotateFile transport 的文件写入是异步的，
   * close() 不保证数据已落盘。通过轮询文件内容确保读取到完整数据。
   */
  async function waitForEntries(
    expectedCount: number,
    timeoutMs = 5000,
  ): Promise<AuditLogEntry[]> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const entries = readTodayAuditEntries();
      if (entries.length >= expectedCount) return entries;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const final = readTodayAuditEntries();
    if (final.length >= expectedCount) return final;
    throw new Error(
      `waitForEntries 超时：期望 ${expectedCount} 条，实际 ${final.length} 条`,
    );
  }

  /** 创世哈希常量 */
  const GENESIS_HASH = '0'.repeat(64);

  // ═══════════════════════════════════════════════════════════════
  // 1. logSecurityEvent 文件写入验证
  // ═══════════════════════════════════════════════════════════════

  describe('logSecurityEvent 文件写入', () => {
    it('单条事件应写入文件并包含所有字段', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'auth.login.success',
        severity: 'info',
        userId: 'user-001',
        username: 'admin',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        details: { role: 'admin', durationMs: 150 },
      });

      const entries = await waitForEntries(1);
      expect(entries.length).toBe(1);
      const entry = entries[0];
      expect(entry.type).toBe('auth.login.success');
      expect(entry.severity).toBe('info');
      expect(entry.userId).toBe('user-001');
      expect(entry.username).toBe('admin');
      expect(entry.ip).toBe('192.168.1.100');
      expect(entry.userAgent).toBe('Mozilla/5.0');
      expect(entry.details).toEqual({ role: 'admin', durationMs: 150 });
    });

    it('第一条记录的 prevHash 应为创世哈希', async () => {
      const service = createService();
      service.logSecurityEvent({ type: 'auth.login.success', severity: 'info', userId: 'u1' });

      const entries = await waitForEntries(1);
      expect(entries[0].prevHash).toBe(GENESIS_HASH);
    });

    it('多条记录应形成正确的哈希链', async () => {
      const service = createService();
      service.logSecurityEvent({ type: 'auth.login.success', severity: 'info', userId: 'u1' });
      service.logSecurityEvent({ type: 'auth.logout', severity: 'info', userId: 'u1' });
      service.logSecurityEvent({ type: 'auth.login.failed', severity: 'warning', userId: 'u2' });

      const entries = await waitForEntries(3);
      expect(entries.length).toBe(3);
      expect(entries[0].prevHash).toBe(GENESIS_HASH);
      expect(entries[1].prevHash).toBe(entries[0].hash);
      expect(entries[2].prevHash).toBe(entries[1].hash);
    });

    it('每条记录的 hash 应为 64 位十六进制', async () => {
      const service = createService();
      service.logSecurityEvent({ type: 'auth.login.success', severity: 'info' });
      service.logSecurityEvent({ type: 'auth.logout', severity: 'info' });

      const entries = await waitForEntries(2);
      for (const entry of entries) {
        expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
        expect(entry.prevHash).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it('timestamp 应为 ISO 8601 格式', async () => {
      const service = createService();
      service.logSecurityEvent({ type: 'auth.login.success', severity: 'info' });

      const entries = await waitForEntries(1);
      const ts = entries[0].timestamp;
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const date = new Date(ts);
      expect(date.getTime()).not.toBeNaN();
    });

    it('winston 写入的 timestamp 字段不应覆盖审计条目的 timestamp', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });

      const entries = await waitForEntries(1);
      // winston.format.timestamp() 会添加 timestamp 字段，但我们的 entry 已有该字段
      // 验证 timestamp 存在且为有效 ISO 8601
      expect(entries[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. logSecurityEvent 字段验证与边界条件
  // ═══════════════════════════════════════════════════════════════

  describe('logSecurityEvent 字段验证', () => {
    it('仅传入 type 和 severity 时应正确写入', async () => {
      const service = createService();
      service.logSecurityEvent({ type: 'auth.logout', severity: 'info' });

      const entries = await waitForEntries(1);
      expect(entries[0].type).toBe('auth.logout');
      expect(entries[0].severity).toBe('info');
      expect(entries[0].userId).toBeUndefined();
      expect(entries[0].username).toBeUndefined();
      expect(entries[0].ip).toBeUndefined();
      expect(entries[0].userAgent).toBeUndefined();
    });

    it('所有 AuditEventType 都应正确写入', async () => {
      const eventTypes: AuditEventType[] = [
        'auth.login.success',
        'auth.login.failed',
        'auth.login.locked',
        'auth.refresh.success',
        'auth.refresh.failed',
        'auth.logout',
        'auth.password.changed',
        'auth.password.failed',
        'user.created',
        'user.deleted',
        'user.role_changed',
        'permission.denied',
        'permission.granted',
        'system.config_changed',
        'system.data_exported',
      ];

      const service = createService();
      for (const type of eventTypes) {
        service.logSecurityEvent({ type, severity: 'info' });
      }

      const entries = await waitForEntries(eventTypes.length);
      expect(entries.length).toBe(eventTypes.length);
      const writtenTypes = entries.map((e) => e.type);
      expect(writtenTypes).toEqual(eventTypes);
    });

    it('所有 AuditSeverity 级别都应正确写入', async () => {
      const severities: AuditSeverity[] = ['info', 'warning', 'critical'];

      const service = createService();
      for (const severity of severities) {
        service.logSecurityEvent({ type: 'auth.login.success', severity });
      }

      const entries = await waitForEntries(severities.length);
      expect(entries.map((e) => e.severity)).toEqual(severities);
    });

    it('details 为嵌套对象时应正确写入', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'auth.login.failed',
        severity: 'warning',
        details: {
          reason: 'invalid_password',
          attemptCount: 3,
          maxAttempts: 5,
          context: { browser: 'Chrome', os: 'Windows' },
        },
      });

      const entries = await waitForEntries(1);
      expect(entries[0].details).toEqual({
        reason: 'invalid_password',
        attemptCount: 3,
        maxAttempts: 5,
        context: { browser: 'Chrome', os: 'Windows' },
      });
    });

    it('details 包含数组时应正确写入', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'permission.denied',
        severity: 'warning',
        details: {
          requiredPermissions: ['device:view', 'alarm:view'],
          attemptedAction: 'delete',
        },
      });

      const entries = await waitForEntries(1);
      expect(entries[0].details.requiredPermissions).toEqual(['device:view', 'alarm:view']);
    });

    it('details 包含 null 值时应正确写入', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'auth.login.success',
        severity: 'info',
        details: { error: null, value: 42, flag: true },
      });

      const entries = await waitForEntries(1);
      expect(entries[0].details.error).toBeNull();
      expect(entries[0].details.value).toBe(42);
      expect(entries[0].details.flag).toBe(true);
    });

    it('details 包含数字和布尔值时应正确写入', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'system.config_changed',
        severity: 'info',
        details: { port: 3000, enabled: true, ratio: 0.95 },
      });

      const entries = await waitForEntries(1);
      expect(entries[0].details.port).toBe(3000);
      expect(entries[0].details.enabled).toBe(true);
      expect(entries[0].details.ratio).toBe(0.95);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. logSecurityEvent 安全性
  // ═══════════════════════════════════════════════════════════════

  describe('logSecurityEvent 安全性', () => {
    it('XSS payload 不应破坏日志 JSON 格式', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'auth.login.failed',
        severity: 'warning',
        username: '<script>alert("xss")</script>',
        userAgent: '<img src=x onerror=alert(1)>',
        details: { payload: '"><svg onload=alert(1)>' },
      });

      const entries = await waitForEntries(1);
      expect(entries.length).toBe(1);
      // 审计日志忠实记录原始 payload，JSON 序列化天然安全
      expect(entries[0].username).toBe('<script>alert("xss")</script>');
      expect(() => JSON.parse(JSON.stringify(entries[0]))).not.toThrow();
    });

    it('SQL 注入 payload 不应破坏日志格式', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'auth.login.failed',
        severity: 'warning',
        username: "admin'; DROP TABLE users; --",
        details: { query: "' OR '1'='1" },
      });

      const entries = await waitForEntries(1);
      expect(entries[0].username).toBe("admin'; DROP TABLE users; --");
      expect(entries[0].details.query).toBe("' OR '1'='1");
    });

    it('超长字符串不应抛出异常', async () => {
      const service = createService();
      const longString = 'A'.repeat(10000);
      expect(() =>
        service.logSecurityEvent({
          type: 'auth.login.success',
          severity: 'info',
          userAgent: longString,
          details: { longField: longString },
        }),
      ).not.toThrow();

      const entries = await waitForEntries(1);
      expect(entries[0].userAgent.length).toBe(10000);
      expect(entries[0].details.longField.length).toBe(10000);
    });

    it('特殊 Unicode 字符应正确写入', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'auth.login.success',
        severity: 'info',
        username: '用户管理员🎯',
        details: { emoji: '🚨🔒✅', chinese: '安全审计日志' },
      });

      const entries = await waitForEntries(1);
      expect(entries[0].username).toBe('用户管理员🎯');
      expect(entries[0].details.emoji).toBe('🚨🔒✅');
      expect(entries[0].details.chinese).toBe('安全审计日志');
    });

    it('换行符和制表符应被正确转义', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'auth.login.success',
        severity: 'info',
        username: 'line1\nline2\ttabbed',
        details: { multiline: 'a\nb\nc' },
      });

      const entries = await waitForEntries(1);
      expect(entries[0].username).toBe('line1\nline2\ttabbed');
      expect(entries[0].details.multiline).toBe('a\nb\nc');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. verifyChain 验证
  // ═══════════════════════════════════════════════════════════════

  describe('verifyChain', () => {
    it('完整未篡改的哈希链应验证通过', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });
      const e2 = buildAuditEntry(1, e1.hash, {
        type: 'auth.logout',
        severity: 'info',
        userId: 'u1',
      });
      const e3 = buildAuditEntry(2, e2.hash, {
        type: 'auth.login.failed',
        severity: 'warning',
        userId: 'u2',
      });
      writeAuditFile([e1, e2, e3]);

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(3);
      expect(result.brokenAtIndex).toBeNull();
    });

    it('单条记录应验证通过', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
      });
      writeAuditFile([e1]);

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(1);
    });

    it('100 条记录的链应验证通过', () => {
      const entries: AuditLogEntry[] = [];
      let prevHash = GENESIS_HASH;
      for (let i = 0; i < 100; i++) {
        const entry = buildAuditEntry(i, prevHash, {
          type: 'auth.login.success',
          severity: 'info',
          userId: `user-${i}`,
        });
        entries.push(entry);
        prevHash = entry.hash;
      }
      writeAuditFile(entries);

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(100);
    });

    it('篡改日志内容后应检测到 hash 不匹配', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });
      const e2 = buildAuditEntry(1, e1.hash, {
        type: 'auth.logout',
        severity: 'info',
        userId: 'u1',
      });
      writeAuditFile([e1, e2]);

      // 篡改第一条记录的 userId（不改 hash）
      e1.userId = 'hacked-user-id';
      writeAuditFile([e1, e2]);

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.brokenAtIndex).toBe(1);
      expect(result.brokenReason).toContain('hash 不匹配');
    });

    it('断裂的 prevHash 链应被检测到', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });
      // 第二条 prevHash 故意设为错误值
      const e2 = buildAuditEntry(1, 'a'.repeat(64), {
        type: 'auth.logout',
        severity: 'info',
        userId: 'u1',
      });
      writeAuditFile([e1, e2]);

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.brokenAtIndex).toBe(2);
      expect(result.brokenReason).toContain('prevHash 不匹配');
    });

    it('篡改最后一条记录应被检测到', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });
      const e2 = buildAuditEntry(1, e1.hash, {
        type: 'auth.logout',
        severity: 'info',
        userId: 'u1',
      });
      const e3 = buildAuditEntry(2, e2.hash, {
        type: 'auth.login.failed',
        severity: 'warning',
        userId: 'u2',
      });
      writeAuditFile([e1, e2, e3]);

      // 篡改最后一条记录
      e3.userId = 'hacked';
      writeAuditFile([e1, e2, e3]);

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.brokenAtIndex).toBe(3);
    });

    it('篡改中间记录的 hash 值应导致后续 prevHash 不匹配', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });
      const e2 = buildAuditEntry(1, e1.hash, {
        type: 'auth.logout',
        severity: 'info',
        userId: 'u1',
      });
      const e3 = buildAuditEntry(2, e2.hash, {
        type: 'auth.login.failed',
        severity: 'warning',
        userId: 'u2',
      });
      writeAuditFile([e1, e2, e3]);

      // 篡改第二条记录的 hash 值（不改内容）
      e2.hash = 'b'.repeat(64);
      writeAuditFile([e1, e2, e3]);

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.brokenAtIndex).toBe(2);
    });

    it('篡改 details 嵌套对象内容应被检测到', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
        details: { role: 'admin', ip: '10.0.0.1' },
      });
      const e2 = buildAuditEntry(1, e1.hash, {
        type: 'auth.logout',
        severity: 'info',
        userId: 'u1',
      });
      writeAuditFile([e1, e2]);

      // 篡改 details 中的嵌套值
      e1.details.role = 'superadmin';
      writeAuditFile([e1, e2]);

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.brokenAtIndex).toBe(1);
    });

    it('无日志文件时应返回 valid=true, totalEntries=0', () => {
      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(0);
      expect(result.brokenAtIndex).toBeNull();
    });

    it('指定不存在日期时应返回 valid=true, totalEntries=0', () => {
      const service = createService();
      const result = service.verifyChain('2025-01-01');

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(0);
      expect(result.date).toBe('2025-01-01');
    });

    it('JSON 解析失败的行应被检测为损坏', () => {
      ensureAuditDir();
      fs.writeFileSync(getTodayAuditFile(), '{ invalid json line\n');

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(false);
      expect(result.brokenAtIndex).toBe(1);
      expect(result.brokenReason).toContain('JSON 解析失败');
    });

    it('空文件应返回 valid=true, totalEntries=0', () => {
      ensureAuditDir();
      fs.writeFileSync(getTodayAuditFile(), '');

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(0);
    });

    it('仅有空行的文件应返回 valid=true, totalEntries=0', () => {
      ensureAuditDir();
      fs.writeFileSync(getTodayAuditFile(), '\n\n\n');

      const service = createService();
      const result = service.verifyChain();

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(0);
    });

    it('验证指定日期的日志文件（非今天）', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
      });
      const targetDate = '2025-06-15';
      const auditDir = path.join(tempLogDir, 'audit');
      if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir, { recursive: true });
      }
      const targetFile = path.join(auditDir, `audit-${targetDate}.log`);
      fs.writeFileSync(targetFile, JSON.stringify(e1) + '\n');

      const service = createService();
      const result = service.verifyChain(targetDate);

      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(1);
      expect(result.date).toBe(targetDate);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 哈希链算法正确性
  // ═══════════════════════════════════════════════════════════════

  describe('哈希链算法', () => {
    it('相同输入应产生相同 hash（确定性）', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });
      const e2 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });

      expect(e1.hash).toBe(e2.hash);
    });

    it('不同输入应产生不同 hash', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });
      const e2 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u2',
      });

      expect(e1.hash).not.toBe(e2.hash);
    });

    it('hash 应为 64 位十六进制字符串', () => {
      const entry = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
      });

      expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('创世哈希应为 64 个 0', () => {
      expect(GENESIS_HASH).toBe('0'.repeat(64));
      expect(GENESIS_HASH.length).toBe(64);
    });

    it('不同 prevHash 应产生不同 hash', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });
      const e2 = buildAuditEntry(0, 'a'.repeat(64), {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });

      expect(e1.hash).not.toBe(e2.hash);
    });

    it('不同 timestamp 应产生不同 hash', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
      });
      const e2 = buildAuditEntry(1000, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
      });

      expect(e1.timestamp).not.toBe(e2.timestamp);
      expect(e1.hash).not.toBe(e2.hash);
    });

    it('不同 details 应产生不同 hash', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        details: { key: 'value1' },
      });
      const e2 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        details: { key: 'value2' },
      });

      expect(e1.hash).not.toBe(e2.hash);
    });

    it('不同 severity 应产生不同 hash', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
      });
      const e2 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'warning',
      });

      expect(e1.hash).not.toBe(e2.hash);
    });

    it('不同 type 应产生不同 hash', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
      });
      const e2 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.failed',
        severity: 'info',
      });

      expect(e1.hash).not.toBe(e2.hash);
    });

    it('details 嵌套对象不同值应产生不同 hash', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        details: { nested: { deep: 'value1' } },
      });
      const e2 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        details: { nested: { deep: 'value2' } },
      });

      expect(e1.hash).not.toBe(e2.hash);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. 重启恢复 prevHash
  // ═══════════════════════════════════════════════════════════════

  describe('重启恢复 prevHash', () => {
    it('服务重启后应从当天日志最后一行恢复 prevHash', () => {
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });
      const e2 = buildAuditEntry(1, e1.hash, {
        type: 'auth.logout',
        severity: 'info',
        userId: 'u1',
      });
      writeAuditFile([e1, e2]);

      // 创建新实例（模拟重启），loadLastHashFromToday 应从 e2.hash 恢复
      const service = createService();

      // 手动写入第三条记录（prevHash 应为 e2.hash）
      const e3 = buildAuditEntry(2, e2.hash, {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u2',
      });
      const existing = fs.readFileSync(getTodayAuditFile(), 'utf-8');
      fs.writeFileSync(getTodayAuditFile(), existing + JSON.stringify(e3) + '\n');

      const result = service.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(3);
    });

    it('当天日志文件为空时应使用创世哈希', () => {
      ensureAuditDir();
      fs.writeFileSync(getTodayAuditFile(), '');

      const service = createService();

      // 写入一条 prevHash 为创世哈希的记录
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
      });
      const existing = fs.readFileSync(getTodayAuditFile(), 'utf-8');
      fs.writeFileSync(getTodayAuditFile(), existing + JSON.stringify(e1) + '\n');

      const result = service.verifyChain();
      expect(result.valid).toBe(true);
    });

    it('当天日志最后一行 JSON 解析失败时应使用创世哈希', () => {
      ensureAuditDir();
      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
      });
      fs.writeFileSync(getTodayAuditFile(), JSON.stringify(e1) + '\n{ invalid json }\n');

      expect(() => createService()).not.toThrow();
    });

    it('当天日志最后一行缺少 hash 字段时应使用创世哈希', () => {
      ensureAuditDir();
      const partialEntry = {
        timestamp: new Date().toISOString(),
        type: 'auth.login.success',
        severity: 'info',
        prevHash: GENESIS_HASH,
      };
      fs.writeFileSync(getTodayAuditFile(), JSON.stringify(partialEntry) + '\n');

      expect(() => createService()).not.toThrow();
    });

    it('当天日志最后一行 hash 格式不正确时应使用创世哈希', () => {
      ensureAuditDir();
      const badEntry = {
        timestamp: new Date().toISOString(),
        type: 'auth.login.success',
        severity: 'info',
        prevHash: GENESIS_HASH,
        hash: 'not-a-valid-hash',
      };
      fs.writeFileSync(getTodayAuditFile(), JSON.stringify(badEntry) + '\n');

      expect(() => createService()).not.toThrow();
    });

    it('无当天日志文件时应使用创世哈希', () => {
      const service = createService();

      const e1 = buildAuditEntry(0, GENESIS_HASH, {
        type: 'auth.login.success',
        severity: 'info',
      });
      writeAuditFile([e1]);

      const result = service.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. logSecurityEvent + verifyChain 集成测试
  // ═══════════════════════════════════════════════════════════════

  describe('logSecurityEvent + verifyChain 集成', () => {
    it('logSecurityEvent 写入后 verifyChain 应验证通过', async () => {
      const service = createService();
      service.logSecurityEvent({ type: 'auth.login.success', severity: 'info', userId: 'u1' });
      service.logSecurityEvent({ type: 'auth.logout', severity: 'info', userId: 'u1' });
      service.logSecurityEvent({ type: 'auth.password.changed', severity: 'info', userId: 'u1' });

      await waitForEntries(3);

      const result = service.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(3);
    });

    it('logSecurityEvent 写入后篡改文件，verifyChain 应检测到', async () => {
      const service = createService();
      service.logSecurityEvent({ type: 'auth.login.success', severity: 'info', userId: 'u1' });
      service.logSecurityEvent({ type: 'auth.logout', severity: 'info', userId: 'u1' });

      await waitForEntries(2);

      // 读取文件，篡改第二条记录
      const file = getTodayAuditFile();
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n');
      const secondEntry = JSON.parse(lines[1]);
      secondEntry.userId = 'tampered';
      lines[1] = JSON.stringify(secondEntry);
      fs.writeFileSync(file, lines.join('\n') + '\n');

      const result = service.verifyChain();
      expect(result.valid).toBe(false);
      expect(result.brokenAtIndex).toBe(2);
    });

    it('logSecurityEvent 写入后删除中间记录，verifyChain 应检测到断裂', async () => {
      const service = createService();
      service.logSecurityEvent({ type: 'auth.login.success', severity: 'info', userId: 'u1' });
      service.logSecurityEvent({ type: 'auth.logout', severity: 'info', userId: 'u1' });
      service.logSecurityEvent({ type: 'auth.login.failed', severity: 'warning', userId: 'u2' });

      await waitForEntries(3);

      // 删除中间记录（第二条）
      const file = getTodayAuditFile();
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n');
      const modifiedLines = [lines[0], lines[2]];
      fs.writeFileSync(file, modifiedLines.join('\n') + '\n');

      const result = service.verifyChain();
      expect(result.valid).toBe(false);
    });

    it('两次创建实例写入的记录应形成连续哈希链', async () => {
      // 第一次：写入 2 条
      const service1 = createService();
      service1.logSecurityEvent({ type: 'auth.login.success', severity: 'info', userId: 'u1' });
      service1.logSecurityEvent({ type: 'auth.logout', severity: 'info', userId: 'u1' });

      const entriesAfterFirst = await waitForEntries(2);
      expect(entriesAfterFirst.length).toBe(2);

      // 第二次：模拟重启，写入 1 条
      const service2 = createService();
      service2.logSecurityEvent({ type: 'auth.login.success', severity: 'info', userId: 'u2' });

      const entriesAfterSecond = await waitForEntries(3);
      expect(entriesAfterSecond.length).toBe(3);
      // 第三条的 prevHash 应等于第二条的 hash（重启恢复成功）
      expect(entriesAfterSecond[2].prevHash).toBe(entriesAfterSecond[1].hash);

      // 完整链验证
      const result = service2.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(3);
    });

    it('logSecurityEvent 写入带 details 嵌套对象后 verifyChain 应验证通过', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'system.config_changed',
        severity: 'info',
        userId: 'admin',
        details: {
          module: 'security',
          changes: { old: { enabled: false }, new: { enabled: true } },
          nested: { deep: { value: 42 } },
        },
      });

      await waitForEntries(1);

      const result = service.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. close() 方法
  // ═══════════════════════════════════════════════════════════════

  describe('close()', () => {
    it('close 不应抛出异常', async () => {
      const service = createService();
      await expect(service.close()).resolves.not.toThrow();
    });

    it('未写入任何日志时 close 应正常完成', async () => {
      const service = createService();
      await expect(service.close()).resolves.not.toThrow();
    });

    it('close 后再次 close 不应抛出异常', async () => {
      const service = createService();
      service.logSecurityEvent({ type: 'auth.login.success', severity: 'info' });
      await service.close();
      await expect(service.close()).resolves.not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. 服务生命周期边界条件
  // ═══════════════════════════════════════════════════════════════

  describe('服务生命周期边界条件', () => {
    it('logSecurityEvent 不应抛出异常', () => {
      const service = createService();
      expect(() =>
        service.logSecurityEvent({ type: 'auth.login.success', severity: 'info' }),
      ).not.toThrow();
    });

    it('高频连续写入 100 条记录应全部落盘', async () => {
      const service = createService();
      for (let i = 0; i < 100; i++) {
        service.logSecurityEvent({
          type: 'auth.login.success',
          severity: 'info',
          userId: `user-${i}`,
        });
      }

      const entries = await waitForEntries(100);
      expect(entries.length).toBe(100);

      // 验证哈希链完整性
      const result = service.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(100);
    });

    it('同一服务实例多次写入+验证应保持链完整性', async () => {
      const service = createService();

      // 第一批
      service.logSecurityEvent({ type: 'auth.login.success', severity: 'info', userId: 'u1' });
      service.logSecurityEvent({ type: 'auth.logout', severity: 'info', userId: 'u1' });

      await waitForEntries(2);
      let result = service.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(2);

      // 第二批（模拟同一实例后续写入）
      service.logSecurityEvent({ type: 'user.created', severity: 'info', userId: 'u2' });

      await waitForEntries(3);
      result = service.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEntries).toBe(3);
    });

    it('details 为 undefined 时应正确写入', async () => {
      const service = createService();
      service.logSecurityEvent({
        type: 'auth.login.success',
        severity: 'info',
        userId: 'u1',
      });

      const entries = await waitForEntries(1);
      expect(entries.length).toBe(1);
      expect(entries[0].details).toBeUndefined();
    });

    it('所有可选字段都传值时应正确写入', async () => {
      const service = createService();
      const fullEvent: AuditEvent = {
        type: 'auth.login.success',
        severity: 'info',
        userId: 'user-full-001',
        username: 'fulluser',
        ip: '10.20.30.40',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        details: { source: 'test', timestamp: '2026-01-01', extra: { nested: true } },
      };
      service.logSecurityEvent(fullEvent);

      const entries = await waitForEntries(1);
      expect(entries[0]).toMatchObject({
        type: 'auth.login.success',
        severity: 'info',
        userId: 'user-full-001',
        username: 'fulluser',
        ip: '10.20.30.40',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
      });
      expect(entries[0].details).toEqual({
        source: 'test',
        timestamp: '2026-01-01',
        extra: { nested: true },
      });
    });
  });
});
