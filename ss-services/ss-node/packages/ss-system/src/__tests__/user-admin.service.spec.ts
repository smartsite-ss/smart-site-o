// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserAdminService } from '../admin/user-admin.service';
import { User, UserRole, ScadaWebSocketGateway, EventBusService } from '@ss-node/ss-core';

jest.mock('@ss-node/ss-core', () => ({
  User: class {},
  UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
  ScadaWebSocketGateway: class {},
  EventBusService: jest.fn().mockImplementation(() => ({ emit: jest.fn() })),
  EventBusModule: class {},
  JwtAuthGuard: class {},
  RolesGuard: class {},
  Roles: () => jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UserAdminService', () => {
  let service: UserAdminService;
  let mockUserRepo: any;
  let mockWsGateway: any;
  let mockEventBus: any;

  const mockUsers: User[] = [
    {
      id: 'user-1',
      username: 'admin',
      password: 'hashed',
      email: 'admin@test.com',
      displayName: 'Admin',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date('2026-06-01'),
      updatedAt: new Date('2026-06-02'),
    },
    {
      id: 'user-2',
      username: 'operator',
      password: 'hashed',
      email: 'op@test.com',
      displayName: 'Operator',
      role: UserRole.USER,
      isActive: true,
      createdAt: new Date('2026-06-03'),
      updatedAt: new Date('2026-06-04'),
    },
    {
      id: 'user-3',
      username: 'viewer',
      password: 'hashed',
      email: 'viewer@test.com',
      displayName: 'Viewer',
      role: UserRole.VIEWER,
      isActive: false,
      createdAt: new Date('2026-06-05'),
      updatedAt: new Date('2026-06-06'),
    },
  ];

  beforeEach(async () => {
    mockUserRepo = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    mockWsGateway = {
      sendToUser: jest.fn(),
      getConnectionCount: jest.fn(() => 0),
    };

    mockEventBus = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAdminService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: ScadaWebSocketGateway, useValue: mockWsGateway },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<UserAdminService>(UserAdminService);
    jest.clearAllMocks();
  });

  describe('listUsers', () => {
    it('TC-UA-001: should return paginated user list', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([mockUsers, 3]);

      const result = await service.listUsers({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
    });

    it('TC-UA-002: should filter by search keyword', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[mockUsers[0]], 1]);

      await service.listUsers({ search: 'admin' });

      const callArg = mockUserRepo.findAndCount.mock.calls[0][0];
      expect(callArg.where.username).toBeDefined();
    });

    it('TC-UA-003: should filter by role', async () => {
      mockUserRepo.findAndCount.mockResolvedValue([[mockUsers[0]], 1]);

      await service.listUsers({ role: UserRole.ADMIN });

      const callArg = mockUserRepo.findAndCount.mock.calls[0][0];
      expect(callArg.where.role).toBe('admin');
    });
  });

  describe('getUserDetail', () => {
    it('TC-UA-010: should return user detail', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUsers[0]);

      const result = await service.getUserDetail('user-1');

      expect(result).toBeDefined();
      expect(result.username).toBe('admin');
    });
  });

  describe('toggleUserStatus', () => {
    it('TC-UA-020: should disable user', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUsers[1]);
      mockUserRepo.save.mockResolvedValue({ ...mockUsers[1], isActive: false });

      const result = await service.toggleUserStatus('user-2', false);

      expect(result.isActive).toBe(false);
      expect(mockWsGateway.sendToUser).toHaveBeenCalled();
    });

    it('TC-UA-021: should enable user', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUsers[2]);
      mockUserRepo.save.mockResolvedValue({ ...mockUsers[2], isActive: true });

      const result = await service.toggleUserStatus('user-3', true);

      expect(result.isActive).toBe(true);
    });
  });

  describe('updateUserRole', () => {
    it('TC-UA-030: should update user role', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUsers[1]);
      mockUserRepo.save.mockResolvedValue({ ...mockUsers[1], role: UserRole.ADMIN });

      const result = await service.updateUserRole('user-2', UserRole.ADMIN);

      expect(result.role).toBe('admin');
    });
  });

  describe('resetPassword', () => {
    it('TC-UA-040: should reset user password', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUsers[1]);
      mockUserRepo.save.mockResolvedValue(mockUsers[1]);

      const result = await service.resetPassword('user-2');

      expect(result.newPassword).toBeDefined();
      expect(result.newPassword.length).toBe(16);
    });
  });

  describe('deleteUser', () => {
    it('TC-UA-050: should delete user', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUsers[1]);
      mockUserRepo.delete.mockResolvedValue({ affected: 1 });

      await service.deleteUser('user-2');

      expect(mockUserRepo.delete).toHaveBeenCalledWith('user-2');
    });

    it('TC-UA-051: should prevent deleting last admin', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUsers[0]);
      mockUserRepo.count.mockResolvedValue(1);

      await expect(service.deleteUser('user-1')).rejects.toThrow('最后一个管理员');
    });
  });
});
