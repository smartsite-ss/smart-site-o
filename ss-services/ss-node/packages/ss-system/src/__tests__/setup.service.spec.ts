// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SetupService } from '../setup/setup.service';
import { User, UserRole } from '@ss-node/ss-core';

jest.mock('@ss-node/ss-core', () => ({
  User: class {},
  UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('SetupService', () => {
  let service: SetupService;
  let mockUserRepo: any;

  beforeEach(async () => {
    mockUserRepo = {
      count: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SetupService, { provide: getRepositoryToken(User), useValue: mockUserRepo }],
    }).compile();

    service = module.get<SetupService>(SetupService);
    jest.clearAllMocks();
  });

  describe('getSetupStatus', () => {
    it('TC-SETUP-001: should return not initialized when no admin exists', async () => {
      mockUserRepo.count.mockResolvedValue(0);

      const result = await service.getSetupStatus();

      expect(result.initialized).toBe(false);
      expect(result.steps.adminAccount).toBe(false);
    });

    it('TC-SETUP-002: should return initialized when admin exists', async () => {
      mockUserRepo.count.mockResolvedValue(1);

      const result = await service.getSetupStatus();

      expect(result.initialized).toBe(true);
    });
  });

  describe('createAdminAccount', () => {
    it('TC-SETUP-010: should create admin account', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      const savedUser = { id: 'new-id', username: 'admin', role: UserRole.ADMIN };
      mockUserRepo.create.mockReturnValue(savedUser);
      mockUserRepo.save.mockResolvedValue(savedUser);

      const result = await service.createAdminAccount({
        username: 'admin',
        password: 'Admin',
        email: 'admin@test.com',
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBe('new-id');
    });

    it('TC-SETUP-011: should throw when username exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'existing', username: 'admin' });

      await expect(
        service.createAdminAccount({
          username: 'admin',
          password: 'Admin',
          email: 'admin@test.com',
        }),
      ).rejects.toThrow('用户名已存在');
    });
  });

  describe('completeSetup', () => {
    it('TC-SETUP-020: should complete setup', async () => {
      mockUserRepo.count.mockResolvedValue(1);

      const result = await service.completeSetup();

      expect(result.success).toBe(true);
    });

    it('TC-SETUP-021: should throw when no admin exists', async () => {
      mockUserRepo.count.mockResolvedValue(0);

      await expect(service.completeSetup()).rejects.toThrow('管理员账户');
    });
  });
});
