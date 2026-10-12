// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ErrorLogService } from '../error-log/error-log.service';
import { ErrorLog } from '../entities/system.entity';

describe('ErrorLogService', () => {
  let service: ErrorLogService;
  let mockRepo: any;

  const mockErrorLogs: ErrorLog[] = [
    {
      id: 'err-1',
      level: 'error',
      message: 'DB connection failed',
      stack: 'Error: DB connection failed\n  at ...',
      context: 'DatabaseModule',
      url: '/api/v1/tags',
      method: 'GET',
      userId: 'user-1',
      ip: '127.0.0.1',
      createdAt: new Date('2026-06-01T10:00:00Z'),
    },
    {
      id: 'err-2',
      level: 'warning',
      message: 'Disk space low',
      stack: null,
      context: 'DiskMonitor',
      url: null,
      method: null,
      userId: null,
      ip: null,
      createdAt: new Date('2026-06-01T11:00:00Z'),
    },
  ];

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorLogService, { provide: getRepositoryToken(ErrorLog), useValue: mockRepo }],
    }).compile();

    service = module.get<ErrorLogService>(ErrorLogService);
    jest.clearAllMocks();
  });

  describe('capture', () => {
    it('TC-ERR-001: should capture and persist error log', async () => {
      const entry = { level: 'error', message: 'Test error', context: 'TestModule' };
      const saved = { ...entry, id: 'new-id', createdAt: new Date() };
      mockRepo.create.mockReturnValue(saved);
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.capture(entry);

      expect(result).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('TC-ERR-002: should handle optional fields', async () => {
      const entry = {
        level: 'fatal',
        message: 'Critical error',
        stack: 'stack trace',
        userId: 'user-1',
        ip: '10.0.0.1',
      };
      const saved = { ...entry, id: 'new-id', createdAt: new Date() };
      mockRepo.create.mockReturnValue(saved);
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.capture(entry);

      expect(result).toBeDefined();
    });
  });

  describe('query', () => {
    it('TC-ERR-010: should query error logs with pagination', async () => {
      mockRepo.findAndCount.mockResolvedValue([mockErrorLogs, 2]);

      const result = await service.query({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockRepo.findAndCount).toHaveBeenCalled();
    });

    it('TC-ERR-011: should filter by level', async () => {
      mockRepo.findAndCount.mockResolvedValue([[mockErrorLogs[0]], 1]);

      await service.query({ level: 'error' });

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { level: 'error' } }),
      );
    });
  });

  describe('getStats', () => {
    it('TC-ERR-020: should return error statistics', async () => {
      mockRepo.find.mockResolvedValue(mockErrorLogs);

      const result = await service.getStats();

      expect(result).toBeDefined();
      expect(result.total).toBe(2);
      expect(result.byLevel).toBeDefined();
      expect(result.byModule).toBeDefined();
      expect(result.recentErrors).toBeDefined();
    });
  });

  describe('delete', () => {
    it('TC-ERR-030: should delete error log by id', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      await service.delete('err-1');

      expect(mockRepo.delete).toHaveBeenCalledWith('err-1');
    });
  });
});
