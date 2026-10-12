// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperationLogService } from '../operation-log/operation-log.service';
import { OperationLog } from '../entities/system.entity';
import { EventBusService } from '@ss-node/ss-core';

jest.mock('@ss-node/ss-core', () => ({
  EventBusService: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
    on: jest.fn(),
    emitConfigChanged: jest.fn(),
  })),
  EventBusModule: class {},
}));

describe('OperationLogService', () => {
  let service: OperationLogService;
  let mockRepo: any;
  let mockEventBus: any;

  const mockOperationLogs: OperationLog[] = [
    {
      id: 'operation-log-1',
      action: 'POST /api/v1/tags',
      resource: '/api/v1/tags',
      resourceId: null,
      userId: 'user-1',
      username: 'admin',
      ip: '127.0.0.1',
      userAgent: 'test',
      details: '{"key":"value"}',
      status: 'success',
      createdAt: new Date('2026-06-01T10:00:00Z'),
    },
    {
      id: 'operation-log-2',
      action: 'DELETE /api/v1/tags/123',
      resource: '/api/v1/tags/:id',
      resourceId: '123',
      userId: 'user-2',
      username: 'operator',
      ip: '192.168.1.1',
      userAgent: 'test',
      details: null,
      status: 'success',
      createdAt: new Date('2026-06-01T11:00:00Z'),
    },
    {
      id: 'operation-log-3',
      action: 'POST /api/v1/auth/login',
      resource: '/api/v1/auth/login',
      resourceId: null,
      userId: 'user-1',
      username: 'admin',
      ip: '127.0.0.1',
      userAgent: 'test',
      details: null,
      status: 'error',
      createdAt: new Date('2026-06-02T09:00:00Z'),
    },
  ];

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      emitConfigChanged: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationLogService,
        { provide: getRepositoryToken(OperationLog), useValue: mockRepo },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<OperationLogService>(OperationLogService);
    jest.clearAllMocks();
  });

  // ==================== record ====================
  describe('record', () => {
    it('TC-OPLOG-001: should record an operation log entry', async () => {
      const entry = {
        action: 'POST /api/v1/tags',
        resource: '/api/v1/tags',
        userId: 'user-1',
        username: 'admin',
        ip: '127.0.0.1',
        status: 'success' as const,
      };
      const savedEntry = { ...entry, id: 'new-id', createdAt: new Date() };
      mockRepo.create.mockReturnValue(savedEntry);
      mockRepo.save.mockResolvedValue(savedEntry);

      const result = await service.record(entry);

      expect(result).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalledWith(savedEntry);
    });

    it('TC-OPLOG-002: should use default values for missing fields', async () => {
      const savedEntry = {
        id: 'new-id',
        action: 'unknown',
        resource: 'unknown',
        status: 'success',
        createdAt: new Date(),
      };
      mockRepo.create.mockReturnValue(savedEntry);
      mockRepo.save.mockResolvedValue(savedEntry);

      const result = await service.record({});

      expect(result).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalled();
      const createArg = mockRepo.create.mock.calls[0][0];
      expect(createArg.action).toBe('unknown');
      expect(createArg.resource).toBe('unknown');
      expect(createArg.status).toBe('success');
    });
  });

  // ==================== query ====================
  describe('query', () => {
    it('TC-OPLOG-010: should query operation logs with pagination', async () => {
      mockRepo.findAndCount.mockResolvedValue([mockOperationLogs, 3]);

      const result = await service.query({ page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(mockRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('TC-OPLOG-011: should filter by userId', async () => {
      mockRepo.findAndCount.mockResolvedValue([[mockOperationLogs[0]], 1]);

      await service.query({ userId: 'user-1' });

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('TC-OPLOG-012: should filter by action', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.query({ action: 'login' });

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: expect.objectContaining({ _value: '%login%' }) },
        }),
      );
    });

    it('TC-OPLOG-013: should filter by status', async () => {
      mockRepo.findAndCount.mockResolvedValue([[mockOperationLogs[2]], 1]);

      await service.query({ status: 'error' });

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'error' } }),
      );
    });

    it('TC-OPLOG-014: should filter by time range', async () => {
      mockRepo.findAndCount.mockResolvedValue([mockOperationLogs, 3]);
      const start = new Date('2026-06-01');
      const end = new Date('2026-06-02');

      await service.query({ startTime: start, endTime: end });

      const callArg = mockRepo.findAndCount.mock.calls[0][0];
      expect(callArg.where.createdAt).toBeDefined();
    });
  });

  // ==================== getStats ====================
  describe('getStats', () => {
    it('TC-OPLOG-020: should return operation log statistics', async () => {
      mockRepo.find.mockResolvedValue(mockOperationLogs);

      const result = await service.getStats();

      expect(result).toBeDefined();
      expect(result.totalActions).toBe(3);
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.topActions).toBeDefined();
      expect(result.topUsers).toBeDefined();
      expect(result.dailyStats).toBeDefined();
    });
  });

  // ==================== cleanupExpired ====================
  describe('cleanupExpired', () => {
    it('TC-OPLOG-030: should delete logs older than 365 days', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 5 });

      const result = await service.cleanupExpired();

      expect(result).toBe(5);
      expect(mockRepo.delete).toHaveBeenCalled();
    });
  });

  // ==================== findById ====================
  describe('findById', () => {
    it('TC-OPLOG-040: should return operation log by id', async () => {
      mockRepo.findOne.mockResolvedValue(mockOperationLogs[0]);

      const result = await service.findById('operation-log-1');

      expect(result).toEqual(mockOperationLogs[0]);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'operation-log-1' } });
    });
  });
});
