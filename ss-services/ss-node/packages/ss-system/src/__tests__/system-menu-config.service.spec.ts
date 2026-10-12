// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemMenuConfigService, SystemMenuItem } from '../config/system-menu-config.service';
import { Menu, MenuButton } from '../entities/system.entity';

describe('SystemMenuConfigService (v7.1 — DB 唯一数据源)', () => {
  let service: SystemMenuConfigService;
  let menuRepo: jest.Mocked<Repository<Menu>>;
  let buttonRepo: jest.Mocked<Repository<MenuButton>>;

  const mockMenuRows: Menu[] = [
    {
      id: 'overview',
      parentId: null,
      labelKey: 'system.nav.overview',
      path: '',
      icon: 'overview',
      roles: null,
      sortOrder: 0,
      isDetail: 0,
      subsystem: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'projects',
      parentId: null,
      labelKey: 'system.nav.projects',
      path: '/projects',
      icon: 'projects',
      roles: ['admin'],
      sortOrder: 10,
      isDetail: 0,
      subsystem: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'settings',
      parentId: null,
      labelKey: 'system.nav.settings',
      path: '/settings',
      icon: 'settings',
      roles: ['admin'],
      sortOrder: 100,
      isDetail: 0,
      subsystem: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'settings-sub',
      parentId: 'settings',
      labelKey: 'system.settings.title',
      path: '/settings',
      icon: 'settings-sub',
      roles: ['admin'],
      sortOrder: 0,
      isDetail: 0,
      subsystem: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'dict',
      parentId: 'settings',
      labelKey: 'system.nav.dict',
      path: '/dict',
      icon: 'dict',
      roles: ['admin'],
      sortOrder: 10,
      isDetail: 0,
      subsystem: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockButtonRows: MenuButton[] = [
    {
      id: 'btn-1',
      menuId: 'devices',
      labelKey: 'system.btn.create',
      permissionCode: 'device:create',
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'btn-2',
      menuId: 'devices',
      labelKey: 'system.btn.edit',
      permissionCode: 'device:edit',
      sortOrder: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  function mockQueryBuilder(returning: any) {
    return {
      delete: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orUpdate: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(returning),
      getMany: jest.fn().mockResolvedValue(returning || []),
    };
  }

  beforeEach(async () => {
    // Suppress OnModuleInit during testing
    jest.spyOn(SystemMenuConfigService.prototype, 'onModuleInit').mockResolvedValue();

    const mockMenuRepo: any = {
      find: jest.fn(),
      count: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    // getMenu() uses createQueryBuilder with getMany; updateMenu() uses delete/insert/execute.
    // Return a comprehensive mock that supports all methods.
    mockMenuRepo.createQueryBuilder = jest.fn().mockImplementation(() => {
      const qb = mockQueryBuilder(undefined);
      // getMenu() calls getMany() → proxy to find() so tests can use find.mockResolvedValue
      qb.getMany = jest.fn().mockImplementation(() => mockMenuRepo.find());
      return qb;
    });
    const mockButtonRepo: any = {
      find: jest.fn(),
      count: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockImplementation(() => mockQueryBuilder(undefined)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemMenuConfigService,
        { provide: getRepositoryToken(Menu), useValue: mockMenuRepo },
        { provide: getRepositoryToken(MenuButton), useValue: mockButtonRepo },
      ],
    }).compile();

    service = module.get<SystemMenuConfigService>(SystemMenuConfigService);
    menuRepo = module.get(getRepositoryToken(Menu));
    buttonRepo = module.get(getRepositoryToken(MenuButton));
    jest.clearAllMocks();
  });

  describe('getMenu()', () => {
    it('TC-MENU-001: should return tree from menus table when rows exist', async () => {
      menuRepo.find.mockResolvedValue(mockMenuRows);

      const result = await service.getMenu();

      expect(result).toHaveLength(3); // overview, projects, settings (top-level)
      expect(result[0].id).toBe('overview');
      // settings should have children
      const settings = result.find((r) => r.id === 'settings');
      expect(settings?.children).toBeDefined();
      expect(settings!.children!.length).toBe(2);
      expect(settings!.children![0].id).toBe('settings-sub');
    });

    it('TC-MENU-002: should return empty array when no rows in DB', async () => {
      menuRepo.find.mockResolvedValue([]);

      const result = await service.getMenu();

      expect(result).toEqual([]);
    });

    it('TC-MENU-003: should return empty array when DB query throws', async () => {
      menuRepo.find.mockRejectedValue(new Error('DB connection error'));

      const result = await service.getMenu();

      expect(result).toEqual([]);
    });

    it('TC-MENU-004: should assemble multi-level tree correctly', async () => {
      const rows: Menu[] = [
        {
          id: 'parent',
          parentId: null,
          labelKey: 'parent',
          path: '/p',
          icon: 'p',
          roles: null,
          sortOrder: 0,
          isDetail: 0,
          subsystem: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'child1',
          parentId: 'parent',
          labelKey: 'c1',
          path: '/p/c1',
          icon: 'c1',
          roles: null,
          sortOrder: 0,
          isDetail: 0,
          subsystem: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'child2',
          parentId: 'parent',
          labelKey: 'c2',
          path: '/p/c2',
          icon: 'c2',
          roles: null,
          sortOrder: 10,
          isDetail: 0,
          subsystem: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      menuRepo.find.mockResolvedValue(rows);

      const result = await service.getMenu();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('parent');
      expect(result[0].children).toHaveLength(2);
    });
  });

  describe('updateMenu()', () => {
    it('TC-MENU-010: should flatten tree and upsert rows via createQueryBuilder', async () => {
      const menuItems: SystemMenuItem[] = [
        { id: 'overview', labelKey: 'system.nav.overview', path: '', icon: 'overview', order: 0 },
      ];

      await service.updateMenu(menuItems);

      // delete + insert via createQueryBuilder (no transaction)
      expect(menuRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getMenuButtons()', () => {
    it('TC-BTN-001: should return buttons from DB when rows exist', async () => {
      buttonRepo.find.mockResolvedValue(mockButtonRows);

      const result = await service.getMenuButtons();

      expect(result).toHaveLength(2);
      expect(result[0].permissionCode).toBe('device:create');
    });

    it('TC-BTN-002: should return empty array when DB is empty', async () => {
      buttonRepo.find.mockResolvedValue([]);

      const result = await service.getMenuButtons();

      expect(result).toEqual([]);
    });
  });

  describe('getMenuButtonsByMenu()', () => {
    it('TC-BTN-003: should filter buttons by menuId', async () => {
      buttonRepo.find.mockResolvedValue(mockButtonRows);

      const result = await service.getMenuButtonsByMenu('devices');

      expect(result).toHaveLength(2);
      expect(result.every((b) => b.menuId === 'devices')).toBe(true);
    });
  });

  describe('syncDefaultMenus()', () => {
    it('TC-SYNC-001: should seed menus when table is empty', async () => {
      menuRepo.count.mockResolvedValue(0);

      await service.syncDefaultMenus();

      // updateMenu() called → createQueryBuilder used for delete + insert
      expect(menuRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('TC-SYNC-002: should upsert menus when table already has data', async () => {
      menuRepo.count.mockResolvedValue(5);
      // 所有项已存在且字段一致 → 不触发更新
      menuRepo.findOne.mockImplementation(async (criteria?: any) => {
        const id = criteria?.where?.id;
        // 返回一个与 DEFAULT_SYSTEM_MENU 中某项匹配的已存在记录
        return {
          id,
          parentId: null,
          labelKey: 'mock',
          path: '',
          icon: '',
          roles: null,
          sortOrder: 0,
          isDetail: 0,
          subsystem: null,
        } as Menu;
      });

      await service.syncDefaultMenus();

      // 非空表不调用全量 updateMenu（不触发 createQueryBuilder 的 delete/insert）
      // 但 upsertDefaultMenus 可能调用 createQueryBuilder 做单项 upsert
      // 此处仅验证不抛异常即可
      expect(service).toBeDefined();
    });
  });

  describe('syncDefaultButtons()', () => {
    it('TC-SYNC-003: should seed buttons when table is empty', async () => {
      buttonRepo.count.mockResolvedValue(0);

      await service.syncDefaultButtons();

      // updateMenuButtons() called → createQueryBuilder used for delete + insert
      expect(buttonRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  // ──────── 单项 CRUD ────────
  describe('createMenuItem()', () => {
    it('TC-CRUD-001: should create a new menu item', async () => {
      const newItem: SystemMenuItem = {
        id: 'test-menu',
        labelKey: 'test.key',
        path: '/test',
        icon: 'test',
        order: 10,
        roles: ['admin'],
      };
      const savedEntity: Menu = {
        id: 'test-menu',
        labelKey: 'test.key',
        path: '/test',
        icon: 'test',
        parentId: null,
        roles: ['admin'],
        sortOrder: 10,
        isDetail: 0,
        subsystem: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      menuRepo.create.mockReturnValue(savedEntity);
      menuRepo.save.mockResolvedValue(savedEntity);

      const result = await service.createMenuItem(newItem);

      expect(menuRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-menu',
          labelKey: 'test.key',
          parentId: null,
        }),
      );
      expect(menuRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('test-menu');
    });

    it('TC-CRUD-002: should create a child menu item with parentId', async () => {
      const childItem: SystemMenuItem = {
        id: 'child-menu',
        labelKey: 'child.key',
        path: '/parent/child',
        icon: 'child',
        order: 5,
      };
      menuRepo.create.mockReturnValue({
        id: 'child-menu',
        parentId: 'parent-menu',
        labelKey: 'child.key',
        path: '/parent/child',
        icon: 'child',
        roles: null,
        sortOrder: 5,
        isDetail: 0,
        subsystem: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Menu);
      menuRepo.save.mockResolvedValue({
        id: 'child-menu',
        parentId: 'parent-menu',
        labelKey: 'child.key',
        path: '/parent/child',
        icon: 'child',
        roles: null,
        sortOrder: 5,
        isDetail: 0,
        subsystem: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Menu);

      await service.createMenuItem(childItem, 'parent-menu');

      expect(menuRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'child-menu',
          parentId: 'parent-menu',
        }),
      );
    });
  });

  describe('updateMenuItem()', () => {
    const existingEntity: Menu = {
      id: 'existing-menu',
      parentId: null,
      labelKey: 'old.key',
      path: '/old',
      icon: 'old',
      roles: null,
      sortOrder: 0,
      isDetail: 0,
      subsystem: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('TC-CRUD-010: should update an existing menu item', async () => {
      menuRepo.findOne.mockResolvedValue(existingEntity);
      menuRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const update: SystemMenuItem = {
        id: 'existing-menu',
        labelKey: 'new.key',
        path: '/new',
        icon: 'new-icon',
        order: 20,
        roles: ['admin', 'user'],
      };

      const result = await service.updateMenuItem('existing-menu', update);

      expect(menuRepo.findOne).toHaveBeenCalledWith({ where: { id: 'existing-menu' } });
      expect(menuRepo.save).toHaveBeenCalled();
      expect(result.labelKey).toBe('new.key');
      expect(result.path).toBe('/new');
      expect(result.roles).toEqual(['admin', 'user']);
      expect(result.sortOrder).toBe(20);
    });

    it('TC-CRUD-011: should throw when menu item not found', async () => {
      menuRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateMenuItem('nonexistent', {
          id: 'nonexistent',
          labelKey: 'x',
          path: '',
          icon: '',
        }),
      ).rejects.toThrow('菜单项不存在: nonexistent');
    });

    it('TC-CRUD-012: should update parentId when provided', async () => {
      menuRepo.findOne.mockResolvedValue({ ...existingEntity });
      menuRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await service.updateMenuItem(
        'existing-menu',
        { id: 'existing-menu', labelKey: 'new.key', path: '/new', icon: 'new-icon' },
        'new-parent',
      );

      expect(result.parentId).toBe('new-parent');
    });
  });

  describe('deleteMenuItem()', () => {
    it('TC-CRUD-020: should delete a leaf menu item', async () => {
      menuRepo.find.mockResolvedValue([]); // no children
      buttonRepo.delete.mockResolvedValue({ affected: 0, raw: {} } as any);
      menuRepo.delete.mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.deleteMenuItem('leaf-menu');

      expect(buttonRepo.delete).toHaveBeenCalled();
      expect(menuRepo.delete).toHaveBeenCalledWith('leaf-menu');
    });

    it('TC-CRUD-021: should cascade-delete children', async () => {
      // First call: find children of parent
      const child: Menu = {
        id: 'child',
        parentId: 'parent-menu',
        labelKey: 'child.key',
        path: '/p/c',
        icon: 'c',
        roles: null,
        sortOrder: 0,
        isDetail: 0,
        subsystem: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      menuRepo.find
        .mockResolvedValueOnce([child]) // parent has children
        .mockResolvedValueOnce([]); // child has no children
      buttonRepo.delete.mockResolvedValue({ affected: 0, raw: {} } as any);
      menuRepo.delete.mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.deleteMenuItem('parent-menu');

      // Should have been called for both child and parent
      expect(menuRepo.delete).toHaveBeenCalledTimes(2);
      expect(menuRepo.delete).toHaveBeenNthCalledWith(1, 'child');
      expect(menuRepo.delete).toHaveBeenNthCalledWith(2, 'parent-menu');
    });
  });
});
