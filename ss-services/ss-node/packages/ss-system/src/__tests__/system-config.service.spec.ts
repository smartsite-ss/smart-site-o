// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { SystemConfigService } from '../config/system-config.service';
import { SystemConfig } from '../entities/system.entity';
import { EventBusService, PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';

jest.mock('@ss-node/ss-core', () => ({
  EventBusService: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
    emitConfigChanged: jest.fn(),
  })),
  PathResolverService: jest.fn().mockImplementation(() => ({
    resolve: jest.fn((p: string) => p),
    getProjectRoot: jest.fn().mockReturnValue('/fake/project-root'),
  })),
  EventBusModule: class {},
}));

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    copyFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    readdirSync: jest.fn().mockReturnValue([]),
  };
});

describe('SystemConfigService (enhanced)', () => {
  let service: SystemConfigService;
  let mockRepo: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockEventBus = {
      emit: jest.fn(),
      emitConfigChanged: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: getRepositoryToken(SystemConfig), useValue: mockRepo },
        { provide: EventBusService, useValue: mockEventBus },
        {
          provide: PathResolverService,
          useValue: { resolve: jest.fn((p: string) => p), getProjectRoot: jest.fn().mockReturnValue('/fake/project-root') },
        },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
    jest.clearAllMocks();
    // 清理 process.env 中的测试键
    delete process.env.PORT;
    delete process.env.JWT_SECRET;
    delete process.env.MEMORY_WARN_PERCENT;
    delete process.env.NODE_ENV;
    delete process.env.__pending_restart__;
  });

  describe('get (with metadata fallback)', () => {
    it('TC-CFG-100: should return env value first', async () => {
      process.env.PORT = '5000';
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.get('PORT');
      expect(result).toBe('5000');
      delete process.env.PORT;
    });

    it('TC-CFG-101: should return default value when env and db are empty', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.get('PORT');
      expect(result).toBe('4000'); // 默认值
    });

    it('TC-CFG-102: should return null for unknown key without default', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.get('UNKNOWN_KEY_NO_DEFAULT');
      expect(result).toBeNull();
    });
  });

  describe('getMetadata', () => {
    it('TC-CFG-110: should return all metadata sorted', () => {
      const result = service.getMetadata();
      expect(result.length).toBeGreaterThan(0);
      // 第一个应该是 application 分类（order=10）
      expect(result[0].category).toBe('application');
    });
  });

  describe('getMetadataByCategory', () => {
    it('TC-CFG-111: should group by category', () => {
      const grouped = service.getMetadataByCategory();
      expect(grouped.application).toBeDefined();
      expect(grouped.application.length).toBeGreaterThan(0);
      expect(grouped.security).toBeDefined();
    });
  });

  describe('getAllWithMeta', () => {
    it('TC-CFG-120: should return all configs with metadata and values', async () => {
      mockRepo.find.mockResolvedValue([
        { key: 'PORT', value: '5000', type: 'number', description: '', updatedAt: new Date() },
      ]);

      const result = await service.getAllWithMeta();

      expect(result.length).toBeGreaterThan(0);
      const port = result.find((c) => c.key === 'PORT');
      expect(port).toBeDefined();
      expect(port!.category).toBe('application');
      expect(port!.categoryLabel).toBe('应用配置');
      expect(port!.restartRequired).toBe(true);
    });

    it('TC-CFG-121: should mask sensitive values', async () => {
      process.env.JWT_SECRET = 'my-secret-key';
      mockRepo.find.mockResolvedValue([]);

      const result = await service.getAllWithMeta();
      const jwt = result.find((c) => c.key === 'JWT_SECRET');

      expect(jwt).toBeDefined();
      expect(jwt!.sensitive).toBe(true);
      expect(jwt!.value).toBe('***');
      delete process.env.JWT_SECRET;
    });

    it('TC-CFG-122: should set source to env when env value exists', async () => {
      process.env.PORT = '5000';
      mockRepo.find.mockResolvedValue([]);

      const result = await service.getAllWithMeta();
      const port = result.find((c) => c.key === 'PORT');
      expect(port!.source).toBe('env');
      expect(port!.value).toBe('5000');
      delete process.env.PORT;
    });

    it('TC-CFG-123: should set source to default when no env or db', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.getAllWithMeta();
      const port = result.find((c) => c.key === 'PORT');
      expect(port!.source).toBe('default');
      expect(port!.value).toBe('4000');
    });
  });

  describe('getWithMeta', () => {
    it('TC-CFG-130: should return single config with meta', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.getWithMeta('PORT');
      expect(result).toBeDefined();
      expect(result!.key).toBe('PORT');
    });

    it('TC-CFG-131: should return null for unknown key', async () => {
      const result = await service.getWithMeta('UNKNOWN_KEY');
      expect(result).toBeNull();
    });
  });

  describe('setWithMeta', () => {
    it('TC-CFG-140: should update config and return restartRequired flag', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({
        key: 'PORT',
        value: '5000',
        type: 'number',
        updatedAt: new Date(),
      });
      mockRepo.save.mockResolvedValue({});

      const result = await service.setWithMeta('PORT', '5000');

      expect(result.key).toBe('PORT');
      expect(result.restartRequired).toBe(true);
      expect(result.hotReloadable).toBe(false);
      expect(result.addedToPendingRestart).toBe(true);
      expect(process.env.PORT).toBe('5000');
      delete process.env.PORT;
    });

    it('TC-CFG-141: should not add to pending restart for hot-reloadable configs', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({
        key: 'MEMORY_WARN_PERCENT',
        value: '75',
        type: 'number',
        updatedAt: new Date(),
      });
      mockRepo.save.mockResolvedValue({});

      const result = await service.setWithMeta('MEMORY_WARN_PERCENT', '75');

      expect(result.restartRequired).toBe(false);
      expect(result.addedToPendingRestart).toBe(false);
      delete process.env.MEMORY_WARN_PERCENT;
    });

    it('TC-CFG-142: should throw BadRequestException for unknown config', async () => {
      await expect(service.setWithMeta('UNKNOWN_KEY', 'value')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC-CFG-143: should throw BadRequestException for invalid value', async () => {
      await expect(service.setWithMeta('PORT', '70000')).rejects.toThrow(BadRequestException);
    });

    it('TC-CFG-144: should throw BadRequestException for non-editable config', async () => {
      await expect(service.setWithMeta('SYSTEM_CONFIG_ENCRYPTION_KEY', 'new-key')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC-CFG-145: should write env file when writeEnv is true', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({
        key: 'PORT',
        value: '5000',
        type: 'number',
        updatedAt: new Date(),
      });
      mockRepo.save.mockResolvedValue({});
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('PORT=4000\n');

      const result = await service.setWithMeta('PORT', '5000', { writeEnv: true });

      expect(result.envFileUpdated).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
      delete process.env.PORT;
    });

    it('TC-CFG-146: should not write env file when envFile is false', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({
        key: 'DEFAULT_SCAN_RATE',
        value: '2000',
        type: 'number',
        updatedAt: new Date(),
      });
      mockRepo.save.mockResolvedValue({});

      const result = await service.setWithMeta('DEFAULT_SCAN_RATE', '2000', {
        writeEnv: true,
      });

      expect(result.envFileUpdated).toBe(false);
      delete process.env.DEFAULT_SCAN_RATE;
    });
  });

  describe('getRestartRequired', () => {
    it('TC-CFG-150: should return empty array when no pending restart', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.getRestartRequired();
      expect(result).toEqual([]);
    });

    it('TC-CFG-151: should return pending restart keys', async () => {
      mockRepo.findOne.mockResolvedValue({
        key: '__pending_restart__',
        value: '["PORT","JWT_SECRET"]',
        type: 'string',
      });
      const result = await service.getRestartRequired();
      expect(result).toEqual(['PORT', 'JWT_SECRET']);
    });

    it('TC-CFG-152: should handle invalid JSON gracefully', async () => {
      mockRepo.findOne.mockResolvedValue({
        key: '__pending_restart__',
        value: 'invalid-json',
        type: 'string',
      });
      const result = await service.getRestartRequired();
      expect(result).toEqual([]);
    });
  });

  describe('clearPendingRestart', () => {
    it('TC-CFG-160: should clear pending restart list', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({
        key: '__pending_restart__',
        value: '[]',
        type: 'string',
        updatedAt: new Date(),
      });
      mockRepo.save.mockResolvedValue({});

      await service.clearPendingRestart();
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('removeFromPendingRestart', () => {
    it('TC-CFG-170: should remove specified keys from pending list', async () => {
      mockRepo.findOne.mockImplementation((opts) => {
        if (opts.where.key === '__pending_restart__') {
          return {
            key: '__pending_restart__',
            value: '["PORT","JWT_SECRET"]',
            type: 'string',
            updatedAt: new Date(),
          };
        }
        return null;
      });
      mockRepo.save.mockResolvedValue({});

      await service.removeFromPendingRestart(['PORT']);
      // 第二次 set 调用时应该保存了只有 JWT_SECRET 的列表
      const saveCall = mockRepo.save.mock.calls[0][0];
      expect(JSON.parse(saveCall.value)).toEqual(['JWT_SECRET']);
    });
  });
});
