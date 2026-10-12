// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserService, CreateUserDto, UpdateUserDto } from '../user.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { RegisterDto } from '../../auth/dto/register.dto';
import { I18nService } from '@ss-node/ss-i18n';

// Mock I18nService
const mockI18nService = {
  tSync: jest.fn().mockReturnValue('i18n-message'),
};

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<Repository<User>>;
  let roleRepo: jest.Mocked<Repository<Role>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: createMockRepo() },
        { provide: getRepositoryToken(Role), useValue: createMockRepo() },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
  });

  // ============================================================
  // findById
  // ============================================================
  describe('findById', () => {
    it('should return user with roleEntity and position relations', async () => {
      const user = { id: 'user-1', username: 'u1' } as User;
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.findById('user-1');

      expect(result).toBe(user);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        relations: ['roleEntity', 'position'],
      });
    });

    it('should return null when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // findByUsername
  // ============================================================
  describe('findByUsername', () => {
    it('should return user by username', async () => {
      const user = { id: 'user-1', username: 'testuser' } as User;
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.findByUsername('testuser');

      expect(result).toBe(user);
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } });
    });

    it('should return null when username is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.findByUsername('nobody');
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // findByUsernameOrEmail
  // ============================================================
  describe('findByUsernameOrEmail', () => {
    it('should query with OR clause for username and email', async () => {
      const user = { id: 'user-1', username: 'u', email: 'e@x.com' } as User;
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.findByUsernameOrEmail('u', 'e@x.com');

      expect(result).toBe(user);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: [{ username: 'u' }, { email: 'e@x.com' }],
      });
    });
  });

  // ============================================================
  // createUser (register flow)
  // ============================================================
  describe('createUser', () => {
    const dto: RegisterDto = {
      username: 'newuser',
      password: 'Password123',
      email: 'new@test.com',
    };

    it('should hash password and save the user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const createdUser = { id: 'new-id', username: 'newuser' } as User;
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);

      const result = await service.createUser(dto);

      expect(result).toBe(createdUser);
      // password should be hashed (bcrypt hashes start with $2)
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          email: 'new@test.com',
          password: expect.stringMatching(/^\$2[aby]\$/),
        }),
      );
      expect(userRepo.save).toHaveBeenCalledWith(createdUser);
    });

    it('should throw ConflictException when username or email already exists', async () => {
      const existing = { id: 'existing', username: 'newuser', email: 'other@test.com' } as User;
      userRepo.findOne.mockResolvedValue(existing);

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
      expect(mockI18nService.tSync).toHaveBeenCalledWith('auth.register.failed_user_exists');
      expect(userRepo.create).not.toHaveBeenCalled();
    });

    it('should hash the password using bcrypt with salt rounds 10', async () => {
      userRepo.findOne.mockResolvedValue(null);
      // Capture the DTO passed to create() to verify password was hashed
      const createdDto: any = {};
      userRepo.create.mockImplementation((dto) => {
        Object.assign(createdDto, dto);
        return dto as User;
      });
      userRepo.save.mockResolvedValue({} as User);

      await service.createUser(dto);

      // password should be a bcrypt hash (not plaintext) and verifyable against original
      expect(createdDto.password).not.toBe('Password123');
      expect(createdDto.password).toMatch(/^\$2[aby]\$/);
      expect(await bcrypt.compare('Password123', createdDto.password)).toBe(true);
    });
  });

  // ============================================================
  // changePassword
  // ============================================================
  describe('changePassword', () => {
    it('should update password when old password is valid and new is different', async () => {
      const oldHash = await bcrypt.hash('OldPass123', 10);
      const user = { id: 'user-1', password: oldHash } as User;
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.changePassword('user-1', 'OldPass123', 'NewPass456');

      expect(user.password).not.toBe(oldHash);
      expect(user.password).toMatch(/^\$2[aby]\$/);
      expect(await bcrypt.compare('NewPass456', user.password)).toBe(true);
      expect(userRepo.save).toHaveBeenCalledWith(user);
    });

    it('should throw BadRequestException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.changePassword('nobody', 'old', 'new')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException when old password is incorrect', async () => {
      const user = { id: 'user-1', password: await bcrypt.hash('CorrectPass123', 10) } as User;
      userRepo.findOne.mockResolvedValue(user);

      await expect(service.changePassword('user-1', 'WrongPass', 'NewPass456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException when new password equals old password', async () => {
      const password = 'SamePass123';
      const user = { id: 'user-1', password: await bcrypt.hash(password, 10) } as User;
      userRepo.findOne.mockResolvedValue(user);

      await expect(service.changePassword('user-1', password, password)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // updateProfile
  // ============================================================
  describe('updateProfile', () => {
    it('should update displayName and email', async () => {
      const user = {
        id: 'user-1',
        displayName: 'Old Name',
        email: 'old@test.com',
      } as User;
      // First findOne call: findById → returns user
      // Second findOne call: email collision check → returns null (no collision)
      userRepo.findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(null);
      userRepo.save.mockResolvedValue(user);

      const result = await service.updateProfile('user-1', {
        displayName: 'New Name',
        email: 'new@test.com',
      });

      expect(result.displayName).toBe('New Name');
      expect(result.email).toBe('new@test.com');
      expect(userRepo.save).toHaveBeenCalledWith(user);
    });

    it('should throw BadRequestException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('nobody', { displayName: 'x' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when new email is already taken', async () => {
      const user = { id: 'user-1', email: 'old@test.com' } as User;
      const other = { id: 'other', email: 'taken@test.com' } as User;
      userRepo.findOne
        .mockResolvedValueOnce(user) // findById
        .mockResolvedValueOnce(other); // email collision check

      await expect(service.updateProfile('user-1', { email: 'taken@test.com' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should not check email collision when email is unchanged', async () => {
      const user = { id: 'user-1', email: 'same@test.com' } as User;
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.updateProfile('user-1', { email: 'same@test.com' });

      // findOne should be called only once (for findById), not twice (for collision)
      expect(userRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // findAll
  // ============================================================
  describe('findAll', () => {
    it('should return all users with relations ordered by createdAt DESC', async () => {
      const users = [{ id: 'u1' }, { id: 'u2' }] as User[];
      userRepo.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toBe(users);
      expect(userRepo.find).toHaveBeenCalledWith({
        relations: ['roleEntity', 'position'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  // ============================================================
  // adminCreateUser
  // ============================================================
  describe('adminCreateUser', () => {
    const dto: CreateUserDto = {
      username: 'admin-created',
      password: 'Password123',
      email: 'admin@test.com',
      displayName: 'Admin Created',
      roleId: 'role-1',
      positionId: 'pos-1',
      phone: '12345',
    };

    it('should hash password and create user with role and position', async () => {
      userRepo.findOne.mockResolvedValue(null); // no existing user
      const role = { id: 'role-1', code: 'editor' } as Role;
      roleRepo.findOne.mockResolvedValue(role);
      const createdUser = { id: 'new-id', ...dto } as User;
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);

      const result = await service.adminCreateUser(dto);

      expect(result).toBe(createdUser);
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'admin-created',
          email: 'admin@test.com',
          displayName: 'Admin Created',
          phone: '12345',
          roleId: 'role-1',
          positionId: 'pos-1',
          password: expect.stringMatching(/^\$2[aby]\$/),
        }),
      );
      expect(createdUser.role).toBe('editor');
      expect(userRepo.save).toHaveBeenCalledWith(createdUser);
    });

    it('should default displayName to username when not provided', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockImplementation((u) => u as User);
      userRepo.save.mockResolvedValue({} as User);

      await service.adminCreateUser({
        username: 'justname',
        password: 'Password123',
        email: 'e@x.com',
      });

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'justname',
          displayName: 'justname',
        }),
      );
    });

    it('should default phone to empty string when not provided', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockImplementation((u) => u as User);
      userRepo.save.mockResolvedValue({} as User);

      await service.adminCreateUser({
        username: 'u',
        password: 'Password123',
        email: 'e@x.com',
      });

      expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({ phone: '' }));
    });

    it('should default roleId and positionId to null when not provided', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockImplementation((u) => u as User);
      userRepo.save.mockResolvedValue({} as User);

      await service.adminCreateUser({
        username: 'u',
        password: 'Password123',
        email: 'e@x.com',
      });

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: null, positionId: null }),
      );
    });

    it('should throw ConflictException when username or email already exists', async () => {
      const existing = { id: 'existing', username: 'admin-created' } as User;
      userRepo.findOne.mockResolvedValue(existing);

      await expect(service.adminCreateUser(dto)).rejects.toThrow(ConflictException);
    });

    it('should not sync role snapshot when roleId is not provided', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockImplementation((u) => u as User);
      userRepo.save.mockResolvedValue({} as User);

      await service.adminCreateUser({
        username: 'u',
        password: 'Password123',
        email: 'e@x.com',
      });

      expect(roleRepo.findOne).not.toHaveBeenCalled();
    });

    it('should not set role snapshot when role lookup returns null', async () => {
      userRepo.findOne.mockResolvedValue(null);
      roleRepo.findOne.mockResolvedValue(null);
      const createdUser: any = { id: 'new' };
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);

      await service.adminCreateUser(dto);

      expect(createdUser.role).toBeUndefined();
    });
  });

  // ============================================================
  // adminUpdateUser
  // ============================================================
  describe('adminUpdateUser', () => {
    it('should update provided fields', async () => {
      const user = {
        id: 'user-1',
        displayName: 'Old',
        email: 'old@test.com',
        phone: '111',
        avatar: 'old.png',
        isActive: true,
      } as User;
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      const dto: UpdateUserDto = {
        displayName: 'New',
        phone: '222',
        avatar: 'new.png',
        isActive: false,
      };

      const result = await service.adminUpdateUser('user-1', dto);

      expect(result.displayName).toBe('New');
      expect(result.phone).toBe('222');
      expect(result.avatar).toBe('new.png');
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.adminUpdateUser('nobody', { displayName: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when updating to an existing email', async () => {
      const user = { id: 'user-1', email: 'old@test.com' } as User;
      const other = { id: 'other', email: 'taken@test.com' } as User;
      userRepo.findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(other);

      await expect(service.adminUpdateUser('user-1', { email: 'taken@test.com' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update role snapshot when roleId is provided', async () => {
      const user: any = { id: 'user-1' };
      const role = { id: 'role-new', code: 'admin' } as Role;
      userRepo.findOne.mockResolvedValue(user);
      roleRepo.findOne.mockResolvedValue(role);
      userRepo.save.mockResolvedValue(user);

      await service.adminUpdateUser('user-1', { roleId: 'role-new' });

      expect(user.roleId).toBe('role-new');
      expect(user.role).toBe('admin');
    });

    it('should clear roleId when roleId is null/empty', async () => {
      const user: any = { id: 'user-1', roleId: 'old' };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.adminUpdateUser('user-1', { roleId: '' });

      expect(user.roleId).toBeNull();
    });

    it('should update positionId when provided', async () => {
      const user: any = { id: 'user-1' };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.adminUpdateUser('user-1', { positionId: 'pos-2' });

      expect(user.positionId).toBe('pos-2');
    });

    it('should clear positionId when null/empty', async () => {
      const user: any = { id: 'user-1', positionId: 'old' };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.adminUpdateUser('user-1', { positionId: '' });

      expect(user.positionId).toBeNull();
    });
  });

  // ============================================================
  // assignRole
  // ============================================================
  describe('assignRole', () => {
    it('should assign role to user and sync role snapshot', async () => {
      const user: any = { id: 'user-1' };
      const role = { id: 'role-1', code: 'editor' } as Role;
      userRepo.findOne.mockResolvedValue(user);
      roleRepo.findOne.mockResolvedValue(role);
      userRepo.save.mockResolvedValue(user);

      const result = await service.assignRole('user-1', 'role-1');

      expect(result.roleId).toBe('role-1');
      expect(result.role).toBe('editor');
      expect(userRepo.save).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.assignRole('nobody', 'role-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when role is not found', async () => {
      const user: any = { id: 'user-1' };
      userRepo.findOne.mockResolvedValue(user);
      roleRepo.findOne.mockResolvedValue(null);

      await expect(service.assignRole('user-1', 'no-role')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // assignPosition
  // ============================================================
  describe('assignPosition', () => {
    it('should assign position to user', async () => {
      const user: any = { id: 'user-1', positionId: null };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      const result = await service.assignPosition('user-1', 'pos-1');

      expect(result.positionId).toBe('pos-1');
      expect(userRepo.save).toHaveBeenCalledWith(user);
    });

    it('should clear position when positionId is empty', async () => {
      const user: any = { id: 'user-1', positionId: 'old' };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      const result = await service.assignPosition('user-1', '');

      expect(result.positionId).toBeNull();
    });

    it('should throw NotFoundException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.assignPosition('nobody', 'pos-1')).rejects.toThrow(NotFoundException);
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
