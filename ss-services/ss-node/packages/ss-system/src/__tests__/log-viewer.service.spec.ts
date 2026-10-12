// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { PathResolverService } from '@ss-node/ss-core';
import { LogViewerService } from '../log-viewer/log-viewer.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('LogViewerService', () => {
  let service: LogViewerService;
  let module: TestingModule;
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `log-test-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(tempDir, 'app-2026-06-01.log'),
      '[2026-06-01T10:00:00Z] [error] [DatabaseModule] Connection failed\n' +
        '[2026-06-01T10:01:00Z] [warn] [DiskMonitor] Low disk space\n' +
        '[2026-06-01T10:02:00Z] [info] [AuthModule] User logged in\n',
    );
    process.env.LOG_DIR = tempDir;
  });

  afterAll(() => {
    delete process.env.LOG_DIR;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        LogViewerService,
        { provide: PathResolverService, useValue: { resolve: jest.fn((p: string) => p), getProjectRoot: jest.fn().mockReturnValue('/fake/project-root') } },
      ],
    }).compile();

    service = module.get<LogViewerService>(LogViewerService);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('getRecentLogs', () => {
    it('TC-LOG-001: should return recent logs', async () => {
      const logs = await service.getRecentLogs({}, 100);

      expect(logs.length).toBeGreaterThan(0);
    });

    it('TC-LOG-002: should filter by level', async () => {
      const logs = await service.getRecentLogs({ level: 'error' }, 100);

      expect(logs.every((l) => l.level === 'error')).toBe(true);
    });

    it('TC-LOG-003: should filter by module', async () => {
      const logs = await service.getRecentLogs({ module: 'DatabaseModule' }, 100);

      expect(logs.every((l) => l.module.includes('DatabaseModule'))).toBe(true);
    });

    it('TC-LOG-004: should filter by keyword', async () => {
      const logs = await service.getRecentLogs({ keyword: 'Connection' }, 100);

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('getLogFiles', () => {
    it('TC-LOG-010: should return log file list', () => {
      const files = service.getLogFiles();

      expect(files.length).toBeGreaterThan(0);
      expect(files[0]).toContain('.log');
    });
  });

  describe('subscribeToLogs', () => {
    it('TC-LOG-020: should return an observable', () => {
      const observable = service.subscribeToLogs();

      expect(observable).toBeDefined();
      expect(observable.subscribe).toBeDefined();

      // 订阅后立即取消，触发 watcher 清理，避免 EPERM
      const subscription = observable.subscribe();
      subscription.unsubscribe();
    });
  });
});
