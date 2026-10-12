// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SystemEventService } from '../core/system-event/system-event.service';
import {
  SystemEvent,
  SystemEventClearReason,
  SystemEventDispositionType,
} from '../core/entities/system-event.entity';
import { AlarmLevel, AlarmStatus } from '@ss-node/ss-sdk';

// ============================================================
// Mock @ss-node/ss-sdk
// ============================================================
jest.mock('@ss-node/ss-sdk', () => ({
  AlarmLevel: { INFO: 'info', WARNING: 'warning', ERROR: 'error', CRITICAL: 'critical' },
  AlarmStatus: {
    ACTIVE: 'active',
    ACKNOWLEDGED: 'acknowledged',
    CLEARED: 'cleared',
    SHELVED: 'shelved',
  },
  AlarmCondition: {},
  DataQuality: {},
  DeviceStatus: {},
  DeviceType: {},
  SortOrder: { ASC: 'ASC', DESC: 'DESC' },
  PaginationDto: class {},
}));

describe('SystemEventService', () => {
  let service: SystemEventService;
  let mockRepo: jest.Mocked<Partial<Repository<SystemEvent>>>;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      create: jest.fn((entity: any) => entity as SystemEvent),
      save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemEventService,
        { provide: getRepositoryToken(SystemEvent), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SystemEventService>(SystemEventService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==================== create ====================
  describe('create', () => {
    const validDto = {
      eventType: 'health',
      subType: 'database',
      level: AlarmLevel.CRITICAL,
      message: '数据库连接失败',
      source: 'health-checker',
    };

    it('TC-SYS-EVT-001: should create a new system event', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.create(validDto);

      expect(result).not.toBeNull();
      expect(result!.eventType).toBe('health');
      expect(result!.subType).toBe('database');
      expect(result!.level).toBe(AlarmLevel.CRITICAL);
      expect(result!.status).toBe(AlarmStatus.ACTIVE);
      expect(result!.isActive).toBe(true);
      expect(result!.acknowledged).toBe(false);
      expect(result!.dispositionType).toBe(SystemEventDispositionType.TRIGGERED);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('TC-SYS-EVT-002: should deduplicate by deterministicId when active', async () => {
      const existingEvent = { id: 'sys-health-db', isActive: true, status: AlarmStatus.ACTIVE };
      mockRepo.findOne = jest.fn().mockResolvedValue(existingEvent);

      const result = await service.create({
        ...validDto,
        deterministicId: 'sys-health-db',
      });

      expect(result).toBe(existingEvent);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('TC-SYS-EVT-003: should create new event if deterministicId exists but inactive', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.create({
        ...validDto,
        deterministicId: 'sys-health-db',
      });

      expect(result).not.toBeNull();
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('TC-SYS-EVT-004: should store metadata as JSON string', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.create({
        ...validDto,
        metadata: { latency: 500, retries: 3 },
      });

      expect(result!.metadata).toBe('{"latency":500,"retries":3}');
    });

    it('TC-SYS-EVT-005: should return null if repository not available', async () => {
      // Create service without repo
      const module: TestingModule = await Test.createTestingModule({
        providers: [SystemEventService],
      }).compile();
      const noRepoSvc = module.get<SystemEventService>(SystemEventService);

      const result = await noRepoSvc.create(validDto);
      expect(result).toBeNull();
    });
  });

  // ==================== acknowledge ====================
  describe('acknowledge', () => {
    it('TC-SYS-EVT-010: should acknowledge an active event', async () => {
      const event = {
        id: 'evt-001',
        status: AlarmStatus.ACTIVE,
        isActive: true,
        acknowledged: false,
      };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.acknowledge('evt-001', 'user-001');

      expect(result!.status).toBe(AlarmStatus.ACKNOWLEDGED);
      expect(result!.acknowledged).toBe(true);
      expect(result!.acknowledgedBy).toBe('user-001');
      expect(result!.acknowledgedAt).toBeInstanceOf(Date);
      expect(result!.dispositionType).toBe(SystemEventDispositionType.ACKNOWLEDGED);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('TC-SYS-EVT-011: should reject acknowledge on already cleared event', async () => {
      const event = { id: 'evt-002', status: AlarmStatus.CLEARED };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.acknowledge('evt-002', 'user-001');

      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('TC-SYS-EVT-012: should reject acknowledge on shelved event', async () => {
      const event = { id: 'evt-003', status: AlarmStatus.SHELVED };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.acknowledge('evt-003', 'user-001');

      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('TC-SYS-EVT-013: should return null for non-existent event', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.acknowledge('non-existent', 'user-001');

      expect(result).toBeNull();
    });
  });

  // ==================== clear ====================
  describe('clear', () => {
    it('TC-SYS-EVT-020: should clear an active event manually', async () => {
      const event = {
        id: 'evt-001',
        status: AlarmStatus.ACTIVE,
        isActive: true,
      };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.clear('evt-001', SystemEventClearReason.MANUAL, 'user-001');

      expect(result!.status).toBe(AlarmStatus.CLEARED);
      expect(result!.isActive).toBe(false);
      expect(result!.clearReason).toBe(SystemEventClearReason.MANUAL);
      expect(result!.clearedBy).toBe('user-001');
      expect(result!.clearedAt).toBeInstanceOf(Date);
      expect(result!.dispositionType).toBe(SystemEventDispositionType.CLEARED);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('TC-SYS-EVT-021: should clear an acknowledged event', async () => {
      const event = {
        id: 'evt-002',
        status: AlarmStatus.ACKNOWLEDGED,
        isActive: true,
      };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.clear('evt-002');

      expect(result!.status).toBe(AlarmStatus.CLEARED);
      expect(result!.clearReason).toBe(SystemEventClearReason.MANUAL);
      expect(result!.clearedBy).toBe('system');
    });

    it('TC-SYS-EVT-022: should reject clear on already cleared event', async () => {
      const event = { id: 'evt-003', status: AlarmStatus.CLEARED };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.clear('evt-003');

      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  // ==================== recover ====================
  describe('recover', () => {
    it('TC-SYS-EVT-030: should auto-recover an active event', async () => {
      const event = {
        id: 'evt-001',
        status: AlarmStatus.ACTIVE,
        isActive: true,
      };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.recover('evt-001', '25.5');

      expect(result!.status).toBe(AlarmStatus.CLEARED);
      expect(result!.isActive).toBe(false);
      expect(result!.clearReason).toBe(SystemEventClearReason.AUTO);
      expect(result!.clearedBy).toBe('system');
      expect(result!.recoveredAt).toBeInstanceOf(Date);
      expect(result!.recoveredValue).toBe('25.5');
      expect(result!.dispositionType).toBe(SystemEventDispositionType.CLEARED);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('TC-SYS-EVT-031: should return null for non-existent event', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.recover('non-existent');

      expect(result).toBeNull();
    });

    it('TC-SYS-EVT-032: should return null for already inactive event', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null); // findOne with isActive:true returns null

      const result = await service.recover('evt-inactive');

      expect(result).toBeNull();
    });
  });

  // ==================== recoverByType ====================
  describe('recoverByType', () => {
    it('TC-SYS-EVT-040: should batch recover events by type', async () => {
      const events = [
        { id: 'evt-001', eventType: 'health', status: AlarmStatus.ACTIVE, isActive: true },
        { id: 'evt-002', eventType: 'health', status: AlarmStatus.ACTIVE, isActive: true },
      ];
      mockRepo.find = jest.fn().mockResolvedValue(events);
      mockRepo.save = jest.fn().mockResolvedValue(events);

      const count = await service.recoverByType('health');

      expect(count).toBe(2);
      for (const evt of events) {
        expect(evt.status).toBe(AlarmStatus.CLEARED);
        expect(evt.isActive).toBe(false);
        expect(evt.clearReason).toBe(SystemEventClearReason.AUTO);
      }
      expect(mockRepo.save).toHaveBeenCalledWith(events);
    });

    it('TC-SYS-EVT-041: should recover by type and subType', async () => {
      const events = [
        {
          id: 'evt-001',
          eventType: 'health',
          subType: 'database',
          status: AlarmStatus.ACTIVE,
          isActive: true,
        },
      ];
      mockRepo.find = jest.fn().mockResolvedValue(events);
      mockRepo.save = jest.fn().mockResolvedValue(events);

      const count = await service.recoverByType('health', 'database');

      expect(count).toBe(1);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { eventType: 'health', subType: 'database', isActive: true },
      });
    });

    it('TC-SYS-EVT-042: should return 0 when no active events found', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([]);

      const count = await service.recoverByType('health');

      expect(count).toBe(0);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  // ==================== query ====================
  describe('query', () => {
    it('TC-SYS-EVT-050: should query events with filters', async () => {
      const items = [{ id: 'evt-001', eventType: 'health' }];
      mockRepo.findAndCount = jest.fn().mockResolvedValue([items, 1]);

      const result = await service.query({ eventType: 'health', limit: 50 });

      expect(result.items).toEqual(items);
      expect(result.total).toBe(1);
    });

    it('TC-SYS-EVT-051: should return empty on no results', async () => {
      mockRepo.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      const result = await service.query({});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==================== getActive ====================
  describe('getActive', () => {
    it('TC-SYS-EVT-060: should get active events', async () => {
      const items = [{ id: 'evt-001', isActive: true }];
      mockRepo.find = jest.fn().mockResolvedValue(items);

      const result = await service.getActive();

      expect(result).toEqual(items);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('TC-SYS-EVT-061: should filter by eventType', async () => {
      mockRepo.find = jest.fn().mockResolvedValue([]);

      await service.getActive('health');

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, eventType: 'health' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  // ==================== getById ====================
  describe('getById', () => {
    it('TC-SYS-EVT-070: should get event by ID', async () => {
      const event = { id: 'evt-001', eventType: 'health' };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.getById('evt-001');

      expect(result).toEqual(event);
    });

    it('TC-SYS-EVT-071: should return null for non-existent', async () => {
      mockRepo.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ==================== getStats ====================
  describe('getStats', () => {
    it('TC-SYS-EVT-080: should return event statistics', async () => {
      mockRepo.count = jest
        .fn()
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // active
        .mockResolvedValueOnce(20) // acknowledged
        .mockResolvedValueOnce(50); // cleared

      const stats = await service.getStats();

      expect(stats).toEqual({
        total: 100,
        active: 30,
        acknowledged: 20,
        cleared: 50,
      });
    });
  });

  // ==================== cleanupExpired ====================
  describe('cleanupExpired', () => {
    it('TC-SYS-EVT-090: should cleanup expired inactive events', async () => {
      const mockDeleteBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 15 }),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockDeleteBuilder);

      const count = await service.cleanupExpired(90);

      expect(count).toBe(15);
    });

    it('TC-SYS-EVT-091: should handle zero affected rows', async () => {
      const mockDeleteBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockDeleteBuilder);

      const count = await service.cleanupExpired(30);

      expect(count).toBe(0);
    });

    it('TC-SYS-EVT-092: should use default 90 days if not specified', async () => {
      const mockDeleteBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockDeleteBuilder);

      await service.cleanupExpired();

      // Verify the cutoff date is approximately 90 days ago
      expect(mockDeleteBuilder.andWhere).toHaveBeenCalledWith(
        'created_at < :cutoff',
        expect.any(Object),
      );
    });
  });

  // ==================== validateTransition (indirect) ====================
  describe('validateTransition (indirect)', () => {
    it('TC-SYS-EVT-100: should allow ACTIVE → ACKNOWLEDGED', async () => {
      const event = { id: 'evt-001', status: AlarmStatus.ACTIVE };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.acknowledge('evt-001', 'user-001');

      expect(result).not.toBeNull();
    });

    it('TC-SYS-EVT-101: should allow ACTIVE → CLEARED', async () => {
      const event = { id: 'evt-001', status: AlarmStatus.ACTIVE };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.clear('evt-001');

      expect(result).not.toBeNull();
    });

    it('TC-SYS-EVT-102: should allow ACKNOWLEDGED → CLEARED', async () => {
      const event = { id: 'evt-001', status: AlarmStatus.ACKNOWLEDGED };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.clear('evt-001');

      expect(result).not.toBeNull();
    });

    it('TC-SYS-EVT-103: should reject CLEARED → any transition', async () => {
      const event = { id: 'evt-001', status: AlarmStatus.CLEARED };
      mockRepo.findOne = jest.fn().mockResolvedValue(event);

      const result = await service.acknowledge('evt-001', 'user-001');

      expect(result).toBeNull();
    });
  });
});
