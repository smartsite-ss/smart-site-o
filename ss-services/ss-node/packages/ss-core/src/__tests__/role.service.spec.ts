// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RoleService, CreateRoleDto, UpdateRoleDto } from '../core/user/role.service';
import { Role } from '../core/user/entities/role.entity';

describe('RoleService', () => {
  let service: RoleService;
  let roleRepo: jest.Mocked<Repository<Role>>;

  const mockRole: Role = {
    id: 'role-1',
    name: '测试角色',
    code: 'tester',
    description: '测试用角色',
    permissions: ['device:view', 'alarm:view'],
    menuIds: [],
    isSystem: false,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSystemRole: Role = {
    ...mockRole,
    id: 'role-admin',
    name: '超级管理员',
    code: 'admin',
    permissions: ['*:*'],
    isSystem: true,
    sortOrder: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleService, { provide: getRepositoryToken(Role), useValue: createMockRepo() }],
    }).compile();

    service = module.get<RoleService>(RoleService);
    roleRepo = module.get(getRepositoryToken(Role));
  });

  // ──────── findAll / findById / findByCode ────────

  describe('findAll', () => {
    it('should return all roles sorted by sortOrder', async () => {
      roleRepo.find.mockResolvedValue([mockSystemRole, mockRole]);
      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(roleRepo.find).toHaveBeenCalledWith({ order: { sortOrder: 'ASC' } });
    });

    it('should return empty array when no roles', async () => {
      roleRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return role by id', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      const result = await service.findById('role-1');
      expect(result.id).toBe('role-1');
      expect(roleRepo.findOne).toHaveBeenCalledWith({ where: { id: 'role-1' } });
    });

    it('should throw NotFoundException when role not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return role by code', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      const result = await service.findByCode('tester');
      expect(result?.code).toBe('tester');
    });

    it('should return null when code not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      const result = await service.findByCode('unknown');
      expect(result).toBeNull();
    });
  });

  // ──────── create ────────

  describe('create', () => {
    const dto: CreateRoleDto = {
      name: '新角色',
      code: 'new-role',
      description: '描述',
      permissions: ['device:view'],
      sortOrder: 5,
    };

    it('should create a new role successfully', async () => {
      roleRepo.findOne.mockResolvedValue(null); // code 不存在
      roleRepo.create.mockReturnValue({ ...dto, isSystem: false } as Role);
      roleRepo.save.mockResolvedValue({ ...dto, id: 'new-id', isSystem: false } as Role);

      const result = await service.create(dto);
      expect(result.id).toBe('new-id');
      expect(roleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新角色',
          code: 'new-role',
          isSystem: false,
          sortOrder: 5,
        }),
      );
    });

    it('should throw ForbiddenException when code already exists', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      await expect(service.create(dto)).rejects.toThrow(ForbiddenException);
    });

    it('should default permissions to empty array when not provided', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.create.mockReturnValue({} as Role);
      roleRepo.save.mockResolvedValue({ id: 'x' } as Role);

      await service.create({ name: 'A', code: 'a' });
      expect(roleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: [],
        }),
      );
    });

    it('should default menuIds to empty array when not provided', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.create.mockReturnValue({} as Role);
      roleRepo.save.mockResolvedValue({ id: 'x' } as Role);

      await service.create({ name: 'A', code: 'a' });
      expect(roleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          menuIds: [],
        }),
      );
    });

    it('should persist menuIds when provided in create', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.create.mockReturnValue({} as Role);
      roleRepo.save.mockResolvedValue({ id: 'x' } as Role);

      await service.create({ name: 'A', code: 'a', menuIds: ['projects', 'devices'] });
      expect(roleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          menuIds: ['projects', 'devices'],
        }),
      );
    });

    it('should default sortOrder to 0 when not provided', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.create.mockReturnValue({} as Role);
      roleRepo.save.mockResolvedValue({ id: 'x' } as Role);

      await service.create({ name: 'A', code: 'a' });
      expect(roleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: 0,
        }),
      );
    });

    it('should always set isSystem to false for user-created roles', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.create.mockReturnValue({} as Role);
      roleRepo.save.mockResolvedValue({ id: 'x' } as Role);

      await service.create({ name: 'A', code: 'a' });
      expect(roleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isSystem: false,
        }),
      );
    });
  });

  // ──────── update ────────

  describe('update', () => {
    const dto: UpdateRoleDto = {
      name: '更新名称',
      permissions: ['device:view', 'device:create'],
    };

    it('should update role fields', async () => {
      const existing = { ...mockRole };
      roleRepo.findOne.mockResolvedValue(existing);
      roleRepo.save.mockResolvedValue({ ...existing, ...dto });

      const result = await service.update('role-1', dto);
      expect(result.name).toBe('更新名称');
      expect(result.permissions).toEqual(['device:view', 'device:create']);
    });

    it('should only update provided fields', async () => {
      const existing = { ...mockRole };
      roleRepo.findOne.mockResolvedValue(existing);
      roleRepo.save.mockResolvedValue({ ...existing, name: '新名' });

      await service.update('role-1', { name: '新名' });
      expect(existing.description).toBe(mockRole.description);
      expect(existing.permissions).toBe(mockRole.permissions);
    });

    it('should throw NotFoundException when role not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.update('not-exist', { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('should update sortOrder when provided', async () => {
      const existing = { ...mockRole };
      roleRepo.findOne.mockResolvedValue(existing);
      roleRepo.save.mockResolvedValue({ ...existing, sortOrder: 99 });

      await service.update('role-1', { sortOrder: 99 });
      expect(existing.sortOrder).toBe(99);
    });

    it('should replace menuIds when provided in update', async () => {
      const existing = { ...mockRole, menuIds: ['old-menu'] };
      roleRepo.findOne.mockResolvedValue(existing);
      roleRepo.save.mockResolvedValue(existing);

      await service.update('role-1', { menuIds: ['projects', 'devices', 'alarms'] });
      expect(existing.menuIds).toEqual(['projects', 'devices', 'alarms']);
    });

    it('should not touch menuIds when update dto omits menuIds', async () => {
      const existing = { ...mockRole, menuIds: ['projects'] };
      roleRepo.findOne.mockResolvedValue(existing);
      roleRepo.save.mockResolvedValue(existing);

      await service.update('role-1', { name: '新名' });
      expect(existing.menuIds).toEqual(['projects']);
    });
  });

  // ──────── delete ────────

  describe('delete', () => {
    it('should delete a non-system role', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      await service.delete('role-1');
      expect(roleRepo.remove).toHaveBeenCalledWith(mockRole);
    });

    it('should throw ForbiddenException when deleting system role', async () => {
      roleRepo.findOne.mockResolvedValue(mockSystemRole);
      await expect(service.delete('role-admin')).rejects.toThrow(ForbiddenException);
      expect(roleRepo.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when role not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.delete('not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────── getPermissions ────────

  describe('getPermissions', () => {
    it('should return permissions array for a role', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      const result = await service.getPermissions('role-1');
      expect(result).toEqual(['device:view', 'alarm:view']);
    });

    it('should return empty array when role has no permissions', async () => {
      roleRepo.findOne.mockResolvedValue({ ...mockRole, permissions: [] });
      const result = await service.getPermissions('role-1');
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when role not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.getPermissions('not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────── initSystemRoles ────────

  describe('initSystemRoles', () => {
    it('should initialize system roles when table is empty', async () => {
      roleRepo.count.mockResolvedValue(0);

      await service.initSystemRoles();

      expect(roleRepo.count).toHaveBeenCalled();
      expect(roleRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ code: 'admin', isSystem: true }),
          expect.objectContaining({ code: 'user', isSystem: true }),
          expect.objectContaining({ code: 'viewer', isSystem: true }),
        ]),
      );
    });

    it('should skip initialization when roles already exist', async () => {
      roleRepo.count.mockResolvedValue(3);

      await service.initSystemRoles();

      expect(roleRepo.save).not.toHaveBeenCalled();
    });

    it('should initialize admin role with *:* permission', async () => {
      roleRepo.count.mockResolvedValue(0);
      await service.initSystemRoles();
      const saved = roleRepo.save.mock.calls[0][0] as Role[];
      const admin = saved.find((r) => r.code === 'admin');
      expect(admin?.permissions).toContain('*:*');
    });

    it('should initialize viewer role with only view permissions', async () => {
      roleRepo.count.mockResolvedValue(0);
      await service.initSystemRoles();
      const saved = roleRepo.save.mock.calls[0][0] as Role[];
      const viewer = saved.find((r) => r.code === 'viewer');
      expect(viewer?.permissions).toContain('device:view');
      expect(viewer?.permissions).not.toContain('device:create');
      expect(viewer?.permissions).not.toContain('*:*');
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
