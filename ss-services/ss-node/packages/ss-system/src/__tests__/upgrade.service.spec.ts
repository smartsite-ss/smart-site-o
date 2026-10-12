// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PathResolverService } from '@ss-node/ss-core';
import { UpgradeService } from '../upgrade/upgrade.service';
import { BackupService } from '../backup/backup.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('UpgradeService', () => {
  let service: UpgradeService;
  let mockDataSource: any;
  let mockBackupService: any;
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `upgrade-test-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    process.env.MIGRATIONS_DIR = tempDir;
  });

  afterAll(() => {
    delete process.env.MIGRATIONS_DIR;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    mockDataSource = {
      options: { type: 'sqlite' },
      query: jest.fn().mockResolvedValue([]),
    };

    mockBackupService = {
      createSystemBackup: jest.fn().mockResolvedValue({ filename: 'backup.gz', status: 'success' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpgradeService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: BackupService, useValue: mockBackupService },
        { provide: PathResolverService, useValue: { resolve: jest.fn((p: string) => p), getProjectRoot: jest.fn().mockReturnValue('/fake/project-root') } },
      ],
    }).compile();

    service = module.get<UpgradeService>(UpgradeService);
    jest.clearAllMocks();
  });

  describe('checkVersion', () => {
    it('TC-UPG-001: should check for updates', async () => {
      const result = await service.checkVersion();

      expect(result.currentVersion).toBeDefined();
      expect(result.latestVersion).toBeDefined();
      expect(typeof result.updateAvailable).toBe('boolean');
    });
  });

  describe('downloadUpgrade', () => {
    it('TC-UPG-010: should download upgrade package', async () => {
      const result = await service.downloadUpgrade('0.2.0');

      expect(result.path).toBeDefined();
      expect(result.sha256).toBeDefined();
      expect(result.sha256.length).toBe(64);
    });
  });

  describe('runMigrations', () => {
    it('TC-UPG-020: should run pending migrations', async () => {
      const result = await service.runMigrations();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('performUpgrade', () => {
    it('TC-UPG-030: should perform upgrade with backup', async () => {
      const result = await service.performUpgrade('0.2.0');

      expect(result.success).toBe(true);
      expect(result.rollbackAvailable).toBe(true);
      expect(mockBackupService.createSystemBackup).toHaveBeenCalledWith('auto');
    });
  });

  describe('rollback', () => {
    it('TC-UPG-040: should rollback after upgrade', async () => {
      await service.performUpgrade('0.2.0');
      const result = await service.rollback();

      expect(result.success).toBe(true);
    });

    it('TC-UPG-041: should throw when no previous version', async () => {
      await expect(service.rollback()).rejects.toThrow();
    });
  });
});
