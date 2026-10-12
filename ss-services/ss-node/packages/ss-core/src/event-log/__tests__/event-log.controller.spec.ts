// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @nestjs/swagger — Controller 使用 ApiTags/ApiBearerAuth/ApiOperation/ApiQuery 装饰器
// ============================================================
jest.mock('@nestjs/swagger', () => {
  const deco = (): any => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  return {
    ApiTags: (..._tags: string[]) => deco(),
    ApiBearerAuth: () => deco(),
    ApiOperation: (_opts: any) => deco(),
    ApiParam: (_opts: any) => deco(),
    ApiQuery: (_opts: any) => deco(),
    ApiProperty: (_opts?: any) => () => {},
    ApiPropertyOptional: (_opts?: any) => () => {},
    ApiBody: (_opts: any) => deco(),
    ApiResponse: (_opts: any) => deco(),
  };
});

// ============================================================
// Mock guard 模块 — Controller 直接从相对路径导入 JwtAuthGuard/RolesGuard/Roles/UserRole
// 避免 NestJS TestingModule 尝试实例化 guard 及其依赖（Reflector 等）
// ============================================================
jest.mock('../../core/auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class MockJwtAuthGuard {
    canActivate = () => true;
  },
}));
jest.mock('../../core/auth/guards/roles.guard', () => ({
  RolesGuard: class MockRolesGuard {
    canActivate = () => true;
  },
}));
jest.mock('../../core/auth/decorators/roles.decorator', () => ({
  Roles: (..._roles: any[]) => (target: any, key?: string, descriptor?: any) => descriptor ?? target,
}));
jest.mock('../../core/user/entities/user.entity', () => ({
  UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
  User: class {},
  Role: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { EventLogController } from '../event-log.controller';
import { EventLogService } from '../event-log.service';
import { EventLogQueryDto } from '../event-log-query.dto';
import { EventLog } from '../entities/event-log.entity';

/**
 * EventLogController 单元测试
 *
 * 覆盖 3 个 REST API 端点：
 * 1. GET /system/event-logs       — findByFilter（分页 + 多维筛选 + 日期转换）
 * 2. GET /system/event-logs/failed — findFailed（失败事件快速查询）
 * 3. GET /system/event-logs/:id   — findOne（详情含订阅者追踪）
 *
 * 验证 Controller 正确转发查询参数到 EventLogService，并完成 ISO 日期字符串 → Date 的转换。
 * Guard 依赖（JwtAuthGuard/RolesGuard）通过 jest.mock 替换为空实现，
 * 避免在单元测试中实例化 Reflector 等 DI 依赖。
 */
describe('EventLogController', () => {
  let controller: EventLogController;
  let service: jest.Mocked<EventLogService>;

  beforeEach(async () => {
    const mockService = {
      findByFilter: jest.fn(),
      findFailed: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventLogController],
      providers: [{ provide: EventLogService, useValue: mockService }],
    }).compile();

    controller = module.get<EventLogController>(EventLogController);
    service = module.get(EventLogService) as jest.Mocked<EventLogService>;
  });

  describe('findByFilter', () => {
    it('应将查询参数转发给 service.findByFilter', async () => {
      const mockResult = {
        items: [{ id: 'log-1', eventType: 'device.created' } as EventLog],
        total: 1,
      };
      service.findByFilter.mockResolvedValue(mockResult);

      const result = await controller.findByFilter({
        projectId: 'demo-project',
        eventType: 'device.created',
        status: 'processed',
        emittedBy: 'user-001',
        page: 1,
        pageSize: 20,
      });

      expect(service.findByFilter).toHaveBeenCalledWith({
        projectId: 'demo-project',
        eventType: 'device.created',
        status: 'processed',
        emittedBy: 'user-001',
        page: 1,
        pageSize: 20,
      });
      expect(result).toBe(mockResult);
    });

    it('应将 ISO 日期字符串转换为 Date 对象', async () => {
      service.findByFilter.mockResolvedValue({ items: [], total: 0 });

      await controller.findByFilter({
        startTime: '2026-08-01T00:00:00.000Z',
        endTime: '2026-08-04T23:59:59.999Z',
        page: 1,
        pageSize: 10,
      });

      const callArgs = service.findByFilter.mock.calls[0][0];
      expect(callArgs.startTime).toBeInstanceOf(Date);
      expect(callArgs.endTime).toBeInstanceOf(Date);
      expect((callArgs.startTime as Date).toISOString()).toBe('2026-08-01T00:00:00.000Z');
      expect((callArgs.endTime as Date).toISOString()).toBe('2026-08-04T23:59:59.999Z');
    });

    it('应在无 startTime/endTime 时不设置 Date 字段', async () => {
      service.findByFilter.mockResolvedValue({ items: [], total: 0 });

      await controller.findByFilter({ page: 1, pageSize: 20 });

      const callArgs = service.findByFilter.mock.calls[0][0];
      expect(callArgs.startTime).toBeUndefined();
      expect(callArgs.endTime).toBeUndefined();
    });

    it('应使用 DTO 默认分页参数（page=1, pageSize=20）', async () => {
      service.findByFilter.mockResolvedValue({ items: [], total: 0 });

      // 模拟 ValidationPipe：将普通对象赋值到 DTO 实例以应用字段默认值
      const dto = Object.assign(new EventLogQueryDto(), {});
      await controller.findByFilter(dto);

      const callArgs = service.findByFilter.mock.calls[0][0];
      expect(callArgs.page).toBe(1);
      expect(callArgs.pageSize).toBe(20);
    });
  });

  describe('findFailed', () => {
    it('应将 projectId/时间范围转发给 service.findFailed', async () => {
      const mockResult = [{ id: 'log-failed-1', eventType: 'device.created' } as EventLog];
      service.findFailed.mockResolvedValue(mockResult);

      const result = await controller.findFailed(
        'demo-project',
        '2026-08-01T00:00:00.000Z',
        '2026-08-04T23:59:59.999Z',
      );

      expect(service.findFailed).toHaveBeenCalledWith({
        projectId: 'demo-project',
        startTime: new Date('2026-08-01T00:00:00.000Z'),
        endTime: new Date('2026-08-04T23:59:59.999Z'),
      });
      expect(result).toBe(mockResult);
    });

    it('应在无参数时传入空 filter', async () => {
      service.findFailed.mockResolvedValue([]);

      await controller.findFailed();

      expect(service.findFailed).toHaveBeenCalledWith({});
    });

    it('应仅在提供 projectId 时设置该字段', async () => {
      service.findFailed.mockResolvedValue([]);

      await controller.findFailed('demo-project');

      const callArgs = service.findFailed.mock.calls[0][0];
      expect(callArgs.projectId).toBe('demo-project');
      expect(callArgs.startTime).toBeUndefined();
      expect(callArgs.endTime).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('应将 id 转发给 service.findOne', async () => {
      const mockLog = { id: 'log-1', eventType: 'device.created' } as EventLog;
      service.findOne.mockResolvedValue(mockLog);

      const result = await controller.findOne('log-1');

      expect(service.findOne).toHaveBeenCalledWith('log-1');
      expect(result).toBe(mockLog);
    });

    it('应在 service 返回 null 时透传 null', async () => {
      service.findOne.mockResolvedValue(null);

      const result = await controller.findOne('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
