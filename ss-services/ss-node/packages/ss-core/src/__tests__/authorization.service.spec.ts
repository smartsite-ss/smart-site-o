// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthorizationService,
  ProjectAuthDto,
  DeviceAuthDto,
  TagAuthDto,
} from '../core/user/authorization.service';
import { ProjectAuthorization } from '../core/user/entities/project-authorization.entity';
import { DeviceAuthorization } from '../core/user/entities/device-authorization.entity';
import { TagAuthorization } from '../core/user/entities/tag-authorization.entity';
import { Role } from '../core/user/entities/role.entity';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let projectAuthRepo: jest.Mocked<Repository<ProjectAuthorization>>;
  let deviceAuthRepo: jest.Mocked<Repository<DeviceAuthorization>>;
  let tagAuthRepo: jest.Mocked<Repository<TagAuthorization>>;
  let roleRepo: jest.Mocked<Repository<Role>>;

  const mockRole: Role = {
    id: 'role-1',
    name: 'Test Role',
    code: 'test',
    description: '',
    permissions: [],
    menuIds: [],
    isSystem: false,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminRole: Role = {
    ...mockRole,
    id: 'role-admin',
    name: 'Admin',
    code: 'admin',
    permissions: ['*:*'],
    isSystem: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: getRepositoryToken(ProjectAuthorization), useValue: createMockRepo() },
        { provide: getRepositoryToken(DeviceAuthorization), useValue: createMockRepo() },
        { provide: getRepositoryToken(TagAuthorization), useValue: createMockRepo() },
        { provide: getRepositoryToken(Role), useValue: createMockRepo() },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    projectAuthRepo = module.get(getRepositoryToken(ProjectAuthorization));
    deviceAuthRepo = module.get(getRepositoryToken(DeviceAuthorization));
    tagAuthRepo = module.get(getRepositoryToken(TagAuthorization));
    roleRepo = module.get(getRepositoryToken(Role));
  });

  // ──────── Project Authorization ────────

  describe('Project Authorization', () => {
    it('should get project auths for a role', async () => {
      const mockAuths = [
        {
          id: 'pa-1',
          roleId: 'role-1',
          projectId: 'proj-1',
          permission: 'read',
          createdAt: new Date(),
        } as ProjectAuthorization,
      ];
      projectAuthRepo.find.mockResolvedValue(mockAuths);

      const result = await service.getProjectAuths('role-1');
      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('proj-1');
      expect(projectAuthRepo.find).toHaveBeenCalledWith({ where: { roleId: 'role-1' } });
    });

    it('should return accessible project IDs', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.find.mockResolvedValue([
        {
          id: 'pa-1',
          roleId: 'role-1',
          projectId: 'proj-1',
          permission: 'read',
          createdAt: new Date(),
        } as ProjectAuthorization,
        {
          id: 'pa-2',
          roleId: 'role-1',
          projectId: 'proj-2',
          permission: 'write',
          createdAt: new Date(),
        } as ProjectAuthorization,
      ]);

      const result = await service.getAccessibleProjectIds('role-1');
      expect(result).toEqual(['proj-1', 'proj-2']);
    });

    it('should return ["*"] for admin role', async () => {
      roleRepo.findOne.mockResolvedValue(mockAdminRole);

      const result = await service.getAccessibleProjectIds('role-admin');
      expect(result).toEqual(['*']);
    });

    it('should check project permission correctly', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue({
        id: 'pa-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'write',
        createdAt: new Date(),
      } as ProjectAuthorization);

      const canWrite = await service.checkProjectPermission('role-1', 'proj-1', 'write');
      const canRead = await service.checkProjectPermission('role-1', 'proj-1', 'read');
      const canAdmin = await service.checkProjectPermission('role-1', 'proj-1', 'admin');

      expect(canWrite).toBe(true);
      expect(canRead).toBe(true);
      expect(canAdmin).toBe(false); // write < admin
    });

    it('should deny when no project auth exists', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);

      const result = await service.checkProjectPermission('role-1', 'no-auth-proj', 'read');
      expect(result).toBe(false);
    });

    it('should set project auths (delete old, insert new)', async () => {
      const auths: ProjectAuthDto[] = [
        { roleId: 'role-1', projectId: 'proj-1', permission: 'read' },
        { roleId: 'role-1', projectId: 'proj-2', permission: 'write' },
      ];

      await service.setProjectAuths('role-1', auths);

      expect(projectAuthRepo.delete).toHaveBeenCalledWith({ roleId: 'role-1' });
      expect(projectAuthRepo.save).toHaveBeenCalled();
    });

    it('should only delete and not insert when auths is empty', async () => {
      await service.setProjectAuths('role-1', []);

      expect(projectAuthRepo.delete).toHaveBeenCalledWith({ roleId: 'role-1' });
      expect(projectAuthRepo.save).not.toHaveBeenCalled();
    });

    it('should default permission to read when not provided in setProjectAuths', async () => {
      const auths: ProjectAuthDto[] = [
        { roleId: 'role-1', projectId: 'proj-1' }, // 未指定 permission
      ];

      await service.setProjectAuths('role-1', auths);

      expect(projectAuthRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: 'role-1',
          projectId: 'proj-1',
          permission: 'read',
        }),
      );
    });

    it('should bypass permission check for admin role (*:*)', async () => {
      roleRepo.findOne.mockResolvedValue(mockAdminRole);

      const canRead = await service.checkProjectPermission('role-admin', 'any-proj', 'read');
      const canWrite = await service.checkProjectPermission('role-admin', 'any-proj', 'write');
      const canAdmin = await service.checkProjectPermission('role-admin', 'any-proj', 'admin');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
      expect(canAdmin).toBe(true);
      expect(projectAuthRepo.findOne).not.toHaveBeenCalled();
    });

    it('should add a new project auth when not exists', async () => {
      projectAuthRepo.findOne.mockResolvedValue(null);
      projectAuthRepo.create.mockReturnValue({
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'read',
      } as ProjectAuthorization);
      projectAuthRepo.save.mockResolvedValue({
        id: 'pa-new',
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'read',
      } as ProjectAuthorization);

      const result = await service.addProjectAuth({
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'read',
      });

      expect(result.projectId).toBe('proj-1');
      expect(projectAuthRepo.create).toHaveBeenCalledWith({
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'read',
      });
    });

    it('should default permission to read when addProjectAuth omits it', async () => {
      projectAuthRepo.findOne.mockResolvedValue(null);
      projectAuthRepo.create.mockReturnValue({} as ProjectAuthorization);
      projectAuthRepo.save.mockResolvedValue({ id: 'x' } as ProjectAuthorization);

      await service.addProjectAuth({ roleId: 'role-1', projectId: 'proj-1' });

      expect(projectAuthRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'read' }),
      );
    });

    it('should update existing project auth permission on add', async () => {
      const existing = {
        id: 'pa-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'read',
        createdAt: new Date(),
      } as ProjectAuthorization;
      projectAuthRepo.findOne.mockResolvedValue(existing);
      projectAuthRepo.save.mockResolvedValue({ ...existing, permission: 'write' });

      await service.addProjectAuth({
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'write',
      });

      expect(existing.permission).toBe('write');
      expect(projectAuthRepo.save).toHaveBeenCalledWith(existing);
    });

    it('should remove a project auth', async () => {
      await service.removeProjectAuth('role-1', 'proj-1');

      expect(projectAuthRepo.delete).toHaveBeenCalledWith({ roleId: 'role-1', projectId: 'proj-1' });
    });
  });

  // ──────── Device Authorization ────────

  describe('Device Authorization', () => {
    it('should get device auths for a role and project', async () => {
      const mockAuths = [
        {
          id: 'da-1',
          roleId: 'role-1',
          projectId: 'proj-1',
          deviceId: 'dev-1',
          permission: 'read',
          createdAt: new Date(),
        } as DeviceAuthorization,
      ];
      deviceAuthRepo.find.mockResolvedValue(mockAuths);

      const result = await service.getDeviceAuths('role-1', 'proj-1');
      expect(result).toHaveLength(1);
    });

    it('should return accessible device IDs', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      deviceAuthRepo.find.mockResolvedValue([
        {
          id: 'da-1',
          roleId: 'role-1',
          projectId: 'proj-1',
          deviceId: 'dev-1',
          permission: 'read',
          createdAt: new Date(),
        } as DeviceAuthorization,
      ]);

      const result = await service.getAccessibleDeviceIds('role-1', 'proj-1');
      expect(result).toEqual(['dev-1']);
    });

    it('should return ["*"] for admin role', async () => {
      roleRepo.findOne.mockResolvedValue(mockAdminRole);

      const result = await service.getAccessibleDeviceIds('role-admin', 'proj-1');
      expect(result).toEqual(['*']);
    });

    it('should return ["*"] for project admin role', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue({
        id: 'pa-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'admin',
        createdAt: new Date(),
      } as ProjectAuthorization);

      const result = await service.getAccessibleDeviceIds('role-1', 'proj-1');
      expect(result).toEqual(['*']);
    });

    it('should check device permission', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      deviceAuthRepo.findOne.mockResolvedValue({
        id: 'da-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
        permission: 'write',
        createdAt: new Date(),
      } as DeviceAuthorization);

      const canWrite = await service.checkDevicePermission('role-1', 'proj-1', 'dev-1', 'write');
      expect(canWrite).toBe(true);
    });

    it('should set device auths', async () => {
      const auths: DeviceAuthDto[] = [
        { roleId: 'role-1', projectId: 'proj-1', deviceId: 'dev-1', permission: 'read' },
      ];

      await service.setDeviceAuths('role-1', 'proj-1', auths);

      expect(deviceAuthRepo.delete).toHaveBeenCalledWith({ roleId: 'role-1', projectId: 'proj-1' });
      expect(deviceAuthRepo.save).toHaveBeenCalled();
    });

    it('should only delete and not insert when device auths is empty', async () => {
      await service.setDeviceAuths('role-1', 'proj-1', []);

      expect(deviceAuthRepo.delete).toHaveBeenCalledWith({ roleId: 'role-1', projectId: 'proj-1' });
      expect(deviceAuthRepo.save).not.toHaveBeenCalled();
    });

    it('should default permission to read when not provided in setDeviceAuths', async () => {
      const auths: DeviceAuthDto[] = [
        { roleId: 'role-1', projectId: 'proj-1', deviceId: 'dev-1' },
      ];

      await service.setDeviceAuths('role-1', 'proj-1', auths);

      expect(deviceAuthRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: 'role-1',
          projectId: 'proj-1',
          deviceId: 'dev-1',
          permission: 'read',
        }),
      );
    });

    it('should bypass device permission check for admin role (*:*)', async () => {
      roleRepo.findOne.mockResolvedValue(mockAdminRole);

      const canRead = await service.checkDevicePermission('role-admin', 'proj-1', 'dev-1', 'read');
      const canWrite = await service.checkDevicePermission('role-admin', 'proj-1', 'dev-1', 'write');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
      expect(deviceAuthRepo.findOne).not.toHaveBeenCalled();
    });

    it('should bypass device permission check for project admin role', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue({
        id: 'pa-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'admin',
        createdAt: new Date(),
      } as ProjectAuthorization);

      const canRead = await service.checkDevicePermission('role-1', 'proj-1', 'dev-1', 'read');
      const canWrite = await service.checkDevicePermission('role-1', 'proj-1', 'dev-1', 'write');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
      expect(deviceAuthRepo.findOne).not.toHaveBeenCalled();
    });

    it('should check device permission with read < write level', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      deviceAuthRepo.findOne.mockResolvedValue({
        id: 'da-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
        permission: 'read',
        createdAt: new Date(),
      } as DeviceAuthorization);

      const canRead = await service.checkDevicePermission('role-1', 'proj-1', 'dev-1', 'read');
      const canWrite = await service.checkDevicePermission('role-1', 'proj-1', 'dev-1', 'write');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(false); // read < write
    });

    it('should deny device permission when no auth exists', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      deviceAuthRepo.findOne.mockResolvedValue(null);

      const result = await service.checkDevicePermission('role-1', 'proj-1', 'no-dev', 'read');
      expect(result).toBe(false);
    });

    it('should add a new device auth when not exists', async () => {
      deviceAuthRepo.findOne.mockResolvedValue(null);
      deviceAuthRepo.create.mockReturnValue({
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
        permission: 'read',
      } as DeviceAuthorization);
      deviceAuthRepo.save.mockResolvedValue({
        id: 'da-new',
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
        permission: 'read',
      } as DeviceAuthorization);

      const result = await service.addDeviceAuth({
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
        permission: 'read',
      });

      expect(result.deviceId).toBe('dev-1');
      expect(deviceAuthRepo.create).toHaveBeenCalledWith({
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
        permission: 'read',
      });
    });

    it('should default permission to read when addDeviceAuth omits it', async () => {
      deviceAuthRepo.findOne.mockResolvedValue(null);
      deviceAuthRepo.create.mockReturnValue({} as DeviceAuthorization);
      deviceAuthRepo.save.mockResolvedValue({ id: 'x' } as DeviceAuthorization);

      await service.addDeviceAuth({
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
      });

      expect(deviceAuthRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'read' }),
      );
    });

    it('should update existing device auth permission on add', async () => {
      const existing = {
        id: 'da-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
        permission: 'read',
        createdAt: new Date(),
      } as DeviceAuthorization;
      deviceAuthRepo.findOne.mockResolvedValue(existing);
      deviceAuthRepo.save.mockResolvedValue({ ...existing, permission: 'write' });

      await service.addDeviceAuth({
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
        permission: 'write',
      });

      expect(existing.permission).toBe('write');
      expect(deviceAuthRepo.save).toHaveBeenCalledWith(existing);
    });

    it('should remove a device auth', async () => {
      await service.removeDeviceAuth('role-1', 'proj-1', 'dev-1');

      expect(deviceAuthRepo.delete).toHaveBeenCalledWith({
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
      });
    });
  });

  // ──────── Device Group ID Derivation (v8.0: 从设备授权推导，废弃独立分组授权表) ────────

  describe('Device Group ID Derivation (v8.0)', () => {
    it('TC-DEV-GROUP-001: should return ["*"] for admin role', async () => {
      roleRepo.findOne.mockResolvedValue(mockAdminRole);

      const result = await service.getAccessibleDeviceGroupIds('role-admin', 'proj-1');
      expect(result).toEqual(['*']);
    });

    it('TC-DEV-GROUP-002: should return ["*"] for project admin role', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue({
        id: 'pa-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'admin',
        createdAt: new Date(),
      } as ProjectAuthorization);

      const result = await service.getAccessibleDeviceGroupIds('role-1', 'proj-1');
      expect(result).toEqual(['*']);
    });

    it('TC-DEV-GROUP-003: should derive group IDs from device auths', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      deviceAuthRepo.find.mockResolvedValue([
        {
          id: 'da-1',
          roleId: 'role-1',
          projectId: 'proj-1',
          deviceId: 'dev-1',
          permission: 'read',
          createdAt: new Date(),
        } as DeviceAuthorization,
        {
          id: 'da-2',
          roleId: 'role-1',
          projectId: 'proj-1',
          deviceId: 'dev-2',
          permission: 'write',
          createdAt: new Date(),
        } as DeviceAuthorization,
      ]);
      // Mock raw SQL to return group_id for each device (SQL DISTINCT applied)
      (deviceAuthRepo as any).manager = {
        query: jest.fn().mockResolvedValue([
          { group_id: 'grp-1' },
          { group_id: 'grp-2' },
        ]),
      };

      const result = await service.getAccessibleDeviceGroupIds('role-1', 'proj-1');
      expect(result).toEqual(['grp-1', 'grp-2']);
    });

    it('TC-DEV-GROUP-004: should return empty array when no device auths exist', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      deviceAuthRepo.find.mockResolvedValue([]);

      const result = await service.getAccessibleDeviceGroupIds('role-1', 'proj-1');
      expect(result).toEqual([]);
    });

    it('TC-DEV-GROUP-005: should return empty array when SQL query fails (sys_devices missing)', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      deviceAuthRepo.find.mockResolvedValue([
        {
          id: 'da-1',
          roleId: 'role-1',
          projectId: 'proj-1',
          deviceId: 'dev-1',
          permission: 'read',
          createdAt: new Date(),
        } as DeviceAuthorization,
      ]);
      // Manager missing query method → throws → catch returns []
      (deviceAuthRepo as any).manager = {};

      const result = await service.getAccessibleDeviceGroupIds('role-1', 'proj-1');
      expect(result).toEqual([]);
    });

    it('TC-DEV-GROUP-006: should filter out null group_ids from SQL result', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      deviceAuthRepo.find.mockResolvedValue([
        {
          id: 'da-1',
          roleId: 'role-1',
          projectId: 'proj-1',
          deviceId: 'dev-1',
          permission: 'read',
          createdAt: new Date(),
        } as DeviceAuthorization,
      ]);
      (deviceAuthRepo as any).manager = {
        query: jest.fn().mockResolvedValue([
          { group_id: 'grp-1' },
          { group_id: null },      // should be filtered out
          { group_id: 'grp-2' },
          { group_id: null },      // should be filtered out
        ]),
      };

      const result = await service.getAccessibleDeviceGroupIds('role-1', 'proj-1');
      expect(result).toEqual(['grp-1', 'grp-2']);
    });
  });

  // ──────── Device Permission Project Validation (v8.0 新增) ────────

  describe('Device Permission Project Validation (v8.0)', () => {
    it('TC-DEV-AUTH-017: should deny when device projectId mismatches input projectId', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      // Mock sys_devices query: device belongs to DIFFERENT project
      (deviceAuthRepo as any).manager = {
        query: jest.fn().mockResolvedValue([{ project_id: 'other-project' }]),
      };

      const result = await service.checkDevicePermission('role-1', 'proj-1', 'dev-1', 'read');
      expect(result).toBe(false);
    });

    it('TC-DEV-AUTH-018: should deny when device not found in sys_devices', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      // Mock sys_devices query: empty result
      (deviceAuthRepo as any).manager = {
        query: jest.fn().mockResolvedValue([]),
      };

      const result = await service.checkDevicePermission('role-1', 'proj-1', 'dev-missing', 'read');
      expect(result).toBe(false);
    });

    it('TC-DEV-AUTH-019: should proceed when device project matches', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      // Mock sys_devices: device belongs to the correct project
      (deviceAuthRepo as any).manager = {
        query: jest.fn().mockResolvedValue([{ project_id: 'proj-1' }]),
      };
      // But no device auth exists → should still return false
      deviceAuthRepo.findOne.mockResolvedValue(null);

      const result = await service.checkDevicePermission('role-1', 'proj-1', 'dev-1', 'read');
      expect(result).toBe(false);
    });

    it('TC-DEV-AUTH-020: should allow when device project matches and auth exists', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      (deviceAuthRepo as any).manager = {
        query: jest.fn().mockResolvedValue([{ project_id: 'proj-1' }]),
      };
      deviceAuthRepo.findOne.mockResolvedValue({
        id: 'da-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
        permission: 'read',
        createdAt: new Date(),
      } as DeviceAuthorization);

      const canRead = await service.checkDevicePermission('role-1', 'proj-1', 'dev-1', 'read');
      expect(canRead).toBe(true);
    });

    it('TC-DEV-AUTH-021: should proceed when sys_devices query throws (catch and continue)', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      // Manager missing query → throws → catch block proceeds
      (deviceAuthRepo as any).manager = {};
      deviceAuthRepo.findOne.mockResolvedValue({
        id: 'da-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        deviceId: 'dev-1',
        permission: 'read',
        createdAt: new Date(),
      } as DeviceAuthorization);

      const canRead = await service.checkDevicePermission('role-1', 'proj-1', 'dev-1', 'read');
      expect(canRead).toBe(true);
    });
  });

  // ──────── Tag Authorization（原 tag-authorization.spec.ts 合并，TC-TAG-AUTH-xxx 编号保留） ────────

  describe('Tag Authorization', () => {
    it('TC-TAG-AUTH-003: should get tag auths for a role and project', async () => {
      tagAuthRepo.find.mockResolvedValue([
        {
          id: 'ta-1',
          roleId: 'role-1',
          projectId: 'proj-1',
          tagId: 'tag-1',
          permission: 'read',
          createdAt: new Date(),
        } as TagAuthorization,
      ]);

      const result = await service.getTagAuths('role-1', 'proj-1');
      expect(result).toHaveLength(1);
      expect(result[0].tagId).toBe('tag-1');
      expect(tagAuthRepo.find).toHaveBeenCalledWith({ where: { roleId: 'role-1', projectId: 'proj-1' } });
    });

    it('TC-TAG-AUTH-012: should return accessible tag IDs', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      tagAuthRepo.find.mockResolvedValue([
        {
          id: 'ta-1',
          roleId: 'role-1',
          projectId: 'proj-1',
          tagId: 'tag-1',
          permission: 'read',
          createdAt: new Date(),
        } as TagAuthorization,
        {
          id: 'ta-2',
          roleId: 'role-1',
          projectId: 'proj-1',
          tagId: 'tag-2',
          permission: 'write',
          createdAt: new Date(),
        } as TagAuthorization,
      ]);

      const result = await service.getAccessibleTagIds('role-1', 'proj-1');
      expect(result).toEqual(['tag-1', 'tag-2']);
    });

    it('TC-TAG-AUTH-010: should return ["*"] for admin role (super admin)', async () => {
      roleRepo.findOne.mockResolvedValue(mockAdminRole);

      const result = await service.getAccessibleTagIds('role-admin', 'proj-1');
      expect(result).toEqual(['*']);
    });

    it('TC-TAG-AUTH-011: should return ["*"] for project admin role', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue({
        id: 'pa-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'admin',
        createdAt: new Date(),
      } as ProjectAuthorization);

      const result = await service.getAccessibleTagIds('role-1', 'proj-1');
      expect(result).toEqual(['*']);
    });

    it('TC-TAG-AUTH-001: should bypass tag permission check for admin role (*:*)', async () => {
      roleRepo.findOne.mockResolvedValue(mockAdminRole);

      const canRead = await service.checkTagPermission('role-admin', 'proj-1', 'tag-1', 'read');
      const canWrite = await service.checkTagPermission('role-admin', 'proj-1', 'tag-1', 'write');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
      expect(tagAuthRepo.findOne).not.toHaveBeenCalled();
    });

    it('TC-TAG-AUTH-002: should bypass tag permission check for project admin role', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue({
        id: 'pa-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        permission: 'admin',
        createdAt: new Date(),
      } as ProjectAuthorization);

      const canRead = await service.checkTagPermission('role-1', 'proj-1', 'tag-1', 'read');
      const canWrite = await service.checkTagPermission('role-1', 'proj-1', 'tag-1', 'write');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
      expect(tagAuthRepo.findOne).not.toHaveBeenCalled();
    });

    it('TC-TAG-AUTH-004: should check tag permission (explicit read auth, read<write)', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      tagAuthRepo.findOne.mockResolvedValue({
        id: 'ta-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        tagId: 'tag-1',
        permission: 'read',
        createdAt: new Date(),
      } as TagAuthorization);

      const canRead = await service.checkTagPermission('role-1', 'proj-1', 'tag-1', 'read');
      const canWrite = await service.checkTagPermission('role-1', 'proj-1', 'tag-1', 'write');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(false); // read < write
    });

    it('TC-TAG-AUTH-005: should check tag permission (explicit write auth, write>=read)', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      tagAuthRepo.findOne.mockResolvedValue({
        id: 'ta-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        tagId: 'tag-1',
        permission: 'write',
        createdAt: new Date(),
      } as TagAuthorization);

      const canRead = await service.checkTagPermission('role-1', 'proj-1', 'tag-1', 'read');
      const canWrite = await service.checkTagPermission('role-1', 'proj-1', 'tag-1', 'write');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
    });

    it('TC-TAG-AUTH-006: should deny tag permission when no auth exists (returns false for fallback)', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      projectAuthRepo.findOne.mockResolvedValue(null);
      tagAuthRepo.findOne.mockResolvedValue(null);

      const result = await service.checkTagPermission('role-1', 'proj-1', 'no-auth-tag', 'read');
      expect(result).toBe(false);
    });

    it('TC-TAG-AUTH-030: should set tag auths (delete old, insert new)', async () => {
      const auths: TagAuthDto[] = [
        { roleId: 'role-1', projectId: 'proj-1', tagId: 'tag-1', permission: 'read' },
        { roleId: 'role-1', projectId: 'proj-1', tagId: 'tag-2', permission: 'write' },
      ];

      await service.setTagAuths('role-1', 'proj-1', auths);

      expect(tagAuthRepo.delete).toHaveBeenCalledWith({ roleId: 'role-1', projectId: 'proj-1' });
      expect(tagAuthRepo.save).toHaveBeenCalled();
    });

    it('TC-TAG-AUTH-031: should only delete and not insert when tag auths is empty', async () => {
      await service.setTagAuths('role-1', 'proj-1', []);

      expect(tagAuthRepo.delete).toHaveBeenCalledWith({ roleId: 'role-1', projectId: 'proj-1' });
      expect(tagAuthRepo.save).not.toHaveBeenCalled();
    });

    it('TC-TAG-AUTH-032: should default permission to read when not provided in setTagAuths', async () => {
      const auths: TagAuthDto[] = [
        { roleId: 'role-1', projectId: 'proj-1', tagId: 'tag-1' },
      ];

      await service.setTagAuths('role-1', 'proj-1', auths);

      expect(tagAuthRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: 'role-1',
          projectId: 'proj-1',
          tagId: 'tag-1',
          permission: 'read',
        }),
      );
    });

    it('TC-TAG-AUTH-020: should add a new tag auth when not exists', async () => {
      tagAuthRepo.findOne.mockResolvedValue(null);
      tagAuthRepo.create.mockReturnValue({
        roleId: 'role-1',
        projectId: 'proj-1',
        tagId: 'tag-1',
        permission: 'read',
      } as TagAuthorization);
      tagAuthRepo.save.mockResolvedValue({
        id: 'ta-new',
        roleId: 'role-1',
        projectId: 'proj-1',
        tagId: 'tag-1',
        permission: 'read',
      } as TagAuthorization);

      const result = await service.addTagAuth({
        roleId: 'role-1',
        projectId: 'proj-1',
        tagId: 'tag-1',
        permission: 'read',
      });

      expect(result.tagId).toBe('tag-1');
      expect(tagAuthRepo.create).toHaveBeenCalledWith({
        roleId: 'role-1',
        projectId: 'proj-1',
        tagId: 'tag-1',
        permission: 'read',
      });
    });

    it('TC-TAG-AUTH-022: should default permission to read when addTagAuth omits it', async () => {
      tagAuthRepo.findOne.mockResolvedValue(null);
      tagAuthRepo.create.mockReturnValue({} as TagAuthorization);
      tagAuthRepo.save.mockResolvedValue({ id: 'x' } as TagAuthorization);

      await service.addTagAuth({ roleId: 'role-1', projectId: 'proj-1', tagId: 'tag-1' });

      expect(tagAuthRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'read' }),
      );
    });

    it('TC-TAG-AUTH-021: should update existing tag auth permission on add', async () => {
      const existing = {
        id: 'ta-1',
        roleId: 'role-1',
        projectId: 'proj-1',
        tagId: 'tag-1',
        permission: 'read',
        createdAt: new Date(),
      } as TagAuthorization;
      tagAuthRepo.findOne.mockResolvedValue(existing);
      tagAuthRepo.save.mockResolvedValue({ ...existing, permission: 'write' });

      await service.addTagAuth({
        roleId: 'role-1',
        projectId: 'proj-1',
        tagId: 'tag-1',
        permission: 'write',
      });

      expect(existing.permission).toBe('write');
      expect(tagAuthRepo.save).toHaveBeenCalledWith(existing);
    });

    it('TC-TAG-AUTH-040: should remove a tag auth', async () => {
      await service.removeTagAuth('role-1', 'proj-1', 'tag-1');

      expect(tagAuthRepo.delete).toHaveBeenCalledWith({
        roleId: 'role-1',
        projectId: 'proj-1',
        tagId: 'tag-1',
      });
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
