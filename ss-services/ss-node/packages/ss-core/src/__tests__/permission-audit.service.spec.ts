// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionAuditService, CreateAuditLogDto } from '../core/user/permission-audit.service';
import { PermissionAuditLog } from '../core/user/entities/permission-audit-log.entity';

describe('PermissionAuditService', () => {
  let service: PermissionAuditService;
  let auditRepo: jest.Mocked<Repository<PermissionAuditLog>>;

  const mockLog: PermissionAuditLog = {
    id: 'log-1',
    operatorId: 'user-1',
    operatorName: 'admin',
    action: 'update_permissions',
    targetType: 'role',
    targetId: 'role-1',
    changes: { before: ['device:view'], after: ['device:view', 'device:create'] },
    ipAddress: '192.168.1.1',
    createdAt: new Date('2026-07-10T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionAuditService,
        { provide: getRepositoryToken(PermissionAuditLog), useValue: createMockRepo() },
      ],
    }).compile();

    service = module.get<PermissionAuditService>(PermissionAuditService);
    auditRepo = module.get(getRepositoryToken(PermissionAuditLog));
  });

  // ──────── log ────────

  describe('log', () => {
    const dto: CreateAuditLogDto = {
      operatorId: 'user-1',
      operatorName: 'admin',
      action: 'grant_role',
      targetType: 'user',
      targetId: 'user-2',
      changes: { roleId: 'role-1' },
      ipAddress: '10.0.0.1',
    };

    it('should create an audit log entry', async () => {
      auditRepo.create.mockReturnValue({ ...dto } as PermissionAuditLog);
      auditRepo.save.mockResolvedValue({ ...dto, id: 'new-log' } as PermissionAuditLog);

      const result = await service.log(dto);
      expect(result.id).toBe('new-log');
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'user-1',
          action: 'grant_role',
          targetType: 'user',
          targetId: 'user-2',
          ipAddress: '10.0.0.1',
        }),
      );
    });

    it('should default changes to null when not provided', async () => {
      const dtoWithoutChanges: CreateAuditLogDto = {
        operatorId: 'user-1',
        operatorName: 'admin',
        action: 'revoke_role',
        targetType: 'user',
        targetId: 'user-2',
      };
      auditRepo.create.mockReturnValue({} as PermissionAuditLog);
      auditRepo.save.mockResolvedValue({ id: 'x' } as PermissionAuditLog);

      await service.log(dtoWithoutChanges);
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: null,
        }),
      );
    });

    it('should default ipAddress to null when not provided', async () => {
      const dtoWithoutIp: CreateAuditLogDto = {
        operatorId: 'user-1',
        operatorName: 'admin',
        action: 'update_auth',
        targetType: 'project_auth',
        targetId: 'pa-1',
      };
      auditRepo.create.mockReturnValue({} as PermissionAuditLog);
      auditRepo.save.mockResolvedValue({ id: 'x' } as PermissionAuditLog);

      await service.log(dtoWithoutIp);
      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
        }),
      );
    });
  });

  // ──────── findAll ────────

  describe('findAll', () => {
    it('should return paginated audit logs with default params', async () => {
      auditRepo.findAndCount.mockResolvedValue([[mockLog], 1]);

      const result = await service.findAll();

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply custom page and pageSize', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 3, pageSize: 10 });

      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1)*10
          take: 10,
        }),
      );
    });

    it('should cap pageSize at 100', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ pageSize: 500 });

      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should apply filter by operatorId', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ operatorId: 'user-1' });

      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ operatorId: 'user-1' }),
        }),
      );
    });

    it('should apply filter by action', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ action: 'grant_role' });

      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'grant_role' }),
        }),
      );
    });

    it('should apply filter by targetType', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ targetType: 'role' });

      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ targetType: 'role' }),
        }),
      );
    });

    it('should apply filter by targetId', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ targetId: 'role-1' });

      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ targetId: 'role-1' }),
        }),
      );
    });

    it('should apply multiple filters simultaneously', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ operatorId: 'user-1', action: 'grant_role', targetType: 'user' });

      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            operatorId: 'user-1',
            action: 'grant_role',
            targetType: 'user',
          }),
        }),
      );
    });

    it('should clamp negative page to 1 and fallback falsy pageSize to default 20', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      // page=-5 → Math.max(1, -5)=1; pageSize=0 (falsy) → 0||20=20 → Math.max(1,20)=20
      await service.findAll({ page: -5, pageSize: 0 });

      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // (1-1)*20
          take: 20, // falsy pageSize 回落到默认 20
        }),
      );
    });
  });

  // ──────── findByOperator ────────

  describe('findByOperator', () => {
    it('should call findAll with operatorId filter', async () => {
      auditRepo.findAndCount.mockResolvedValue([[mockLog], 1]);

      const result = await service.findByOperator('user-1', 2, 10);

      expect(result.items).toHaveLength(1);
      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ operatorId: 'user-1' }),
          skip: 10, // (2-1)*10
          take: 10,
        }),
      );
    });

    it('should use default page and pageSize when not provided', async () => {
      auditRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findByOperator('user-1');

      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  // ──────── findByTarget ────────

  describe('findByTarget', () => {
    it('should call findAll with targetType and targetId filters', async () => {
      auditRepo.findAndCount.mockResolvedValue([[mockLog], 1]);

      const result = await service.findByTarget('role', 'role-1');

      expect(result.total).toBe(1);
      expect(auditRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            targetType: 'role',
            targetId: 'role-1',
          }),
        }),
      );
    });
  });

  // ──────── findRecent ────────

  describe('findRecent', () => {
    it('should return recent logs with default limit 50', async () => {
      auditRepo.find.mockResolvedValue([mockLog]);

      const result = await service.findRecent();

      expect(result).toHaveLength(1);
      expect(auditRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });

    it('should accept custom limit', async () => {
      auditRepo.find.mockResolvedValue([mockLog]);

      await service.findRecent(10);

      expect(auditRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });
  });

  // ──────── findByDateRange ────────

  describe('findByDateRange', () => {
    it('should return logs filtered by date range', async () => {
      const logInRange: PermissionAuditLog = {
        ...mockLog,
        createdAt: new Date('2026-07-09T12:00:00Z'),
      };
      const logOutOfRange: PermissionAuditLog = {
        ...mockLog,
        createdAt: new Date('2026-06-01T12:00:00Z'),
      };
      auditRepo.findAndCount.mockResolvedValue([[logInRange, logOutOfRange], 2]);

      const result = await service.findByDateRange('2026-07-01T00:00:00Z', '2026-07-10T23:59:59Z');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('log-1');
    });

    it('should return all logs when no end date filter matches', async () => {
      auditRepo.findAndCount.mockResolvedValue([[mockLog], 1]);

      const result = await service.findByDateRange('', '');

      expect(result.items).toHaveLength(1);
    });
  });
});

/** 创建模拟 Repository */
function createMockRepo<T>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    save: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockImplementation((dto) => dto),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
    query: jest.fn(),
    manager: {} as any,
    metadata: {} as any,
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    upsert: jest.fn(),
    preload: jest.fn(),
    restore: jest.fn(),
    softDelete: jest.fn(),
    softRemove: jest.fn(),
    recover: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    merge: jest.fn(),
    findOneOrFail: jest.fn(),
    findByIds: jest.fn(),
    exist: jest.fn(),
    clear: jest.fn(),
    sum: jest.fn(),
    average: jest.fn(),
    minimum: jest.fn(),
    maximum: jest.fn(),
    target: {} as any,
    hasId: jest.fn(),
    getId: jest.fn(),
    extend: jest.fn(),
  } as any;
}
