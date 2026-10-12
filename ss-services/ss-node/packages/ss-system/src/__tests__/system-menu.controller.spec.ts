// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { SystemMenuController } from '../config/system-menu.controller';
import { SystemMenuConfigService, SystemMenuItem } from '../config/system-menu-config.service';
import { MenuI18nService } from '../config/menu-i18n.service';

// ============================================================
// Mock @nestjs/swagger decorators
// ============================================================
jest.mock('@nestjs/swagger', () => {
  const noop = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  return {
    ApiTags: (..._tags: string[]) => noop(),
    ApiBearerAuth: () => noop(),
    ApiOperation: (_opts: any) => noop(),
    ApiQuery: (_name: string, _opts?: any) => noop(),
  };
});

// ============================================================
// Mock JWT & RBAC guards — plain objects so NestJS uses them as instances
// ============================================================
jest.mock('@ss-node/ss-core', () => ({
  JwtAuthGuard: { canActivate: jest.fn(() => true) },
  RolesGuard: { canActivate: jest.fn(() => true) },
  Roles: (..._roles: any[]) => jest.fn(),
  UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
}));

describe('SystemMenuController', () => {
  let controller: SystemMenuController;
  let mockMenuService: any;
  let mockI18nService: any;

  const mockMenuItems: SystemMenuItem[] = [
    { id: 'overview', labelKey: 'system.nav.overview', path: '', icon: 'overview', order: 0 },
    {
      id: 'devices',
      labelKey: 'system.nav.devices',
      path: '/devices',
      icon: 'devices',
      roles: ['admin', 'user'],
      order: 20,
    },
    {
      id: 'projects',
      labelKey: 'system.nav.projects',
      path: '/projects',
      icon: 'projects',
      roles: ['admin'],
      order: 10,
    },
  ];

  beforeEach(async () => {
    mockMenuService = {
      getMenu: jest.fn(),
      updateMenu: jest.fn(),
      createMenuItem: jest.fn(),
      updateMenuItem: jest.fn(),
      deleteMenuItem: jest.fn(),
      getMenuButtons: jest.fn(),
      getMenuButtonsByMenu: jest.fn(),
      updateMenuButtons: jest.fn(),
      createMenuButton: jest.fn(),
      deleteMenuButton: jest.fn(),
    };

    mockI18nService = {
      getMenuI18n: jest.fn(),
      getAllMenuI18n: jest.fn(),
      updateMenuI18n: jest.fn(),
      updateMenuItems: jest.fn(),
      syncToLocaleFiles: jest.fn(),
      getSupportedLocales: jest.fn(),
    };

    // Import guards dynamically so Jest mock is applied
    const { JwtAuthGuard, RolesGuard } = await import('@ss-node/ss-core');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemMenuController],
      providers: [
        { provide: SystemMenuConfigService, useValue: mockMenuService },
        { provide: MenuI18nService, useValue: mockI18nService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SystemMenuController>(SystemMenuController);
    jest.clearAllMocks();
  });

  describe('GET /system/menu', () => {
    it('TC-MENU-CTRL-001: should return menu items from service', async () => {
      mockMenuService.getMenu.mockResolvedValue(mockMenuItems);

      const result = await controller.getMenu();

      expect(result).toEqual(mockMenuItems);
      expect(mockMenuService.getMenu).toHaveBeenCalledTimes(1);
    });

    it('TC-MENU-CTRL-002: should return default menu when service returns default', async () => {
      const defaultMenu = [
        { id: 'overview', labelKey: 'system.nav.overview', path: '', icon: 'overview', order: 0 },
      ];
      mockMenuService.getMenu.mockResolvedValue(defaultMenu);

      const result = await controller.getMenu();

      expect(result).toEqual(defaultMenu);
    });

    it('TC-MENU-CTRL-003: should return empty array when service returns empty', async () => {
      mockMenuService.getMenu.mockResolvedValue([]);

      const result = await controller.getMenu();

      expect(result).toEqual([]);
    });

    it('TC-MENU-CTRL-004: should propagate error from service', async () => {
      mockMenuService.getMenu.mockRejectedValue(new Error('Service error'));

      await expect(controller.getMenu()).rejects.toThrow('Service error');
    });
  });

  describe('PUT /system/menu', () => {
    it('TC-MENU-CTRL-010: should update menu via service', async () => {
      mockMenuService.updateMenu.mockResolvedValue(undefined);

      const result = await controller.updateMenu({ menus: mockMenuItems });

      expect(result).toEqual({ ok: true });
      expect(mockMenuService.updateMenu).toHaveBeenCalledWith(mockMenuItems);
    });

    it('TC-MENU-CTRL-011: should handle empty menu update', async () => {
      mockMenuService.updateMenu.mockResolvedValue(undefined);

      const result = await controller.updateMenu({ menus: [] });

      expect(result).toEqual({ ok: true });
      expect(mockMenuService.updateMenu).toHaveBeenCalledWith([]);
    });

    it('TC-MENU-CTRL-012: should propagate error from service on update', async () => {
      mockMenuService.updateMenu.mockRejectedValue(new Error('Update failed'));

      await expect(controller.updateMenu({ menus: mockMenuItems })).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('GET /system/menu/buttons', () => {
    it('TC-BTN-CTRL-001: should return buttons from service', async () => {
      const mockButtons = [
        {
          id: 'btn-1',
          menuId: 'devices',
          labelKey: 'btn.create',
          permissionCode: 'device:create',
          sortOrder: 0,
        },
      ];
      mockMenuService.getMenuButtons.mockResolvedValue(mockButtons);

      const result = await controller.getButtons();

      expect(result).toEqual(mockButtons);
    });
  });

  describe('GET /system/menu/:menuId/buttons', () => {
    it('TC-BTN-CTRL-002: should return buttons filtered by menuId', async () => {
      const mockButtons = [
        {
          id: 'btn-1',
          menuId: 'devices',
          labelKey: 'btn.create',
          permissionCode: 'device:create',
          sortOrder: 0,
        },
      ];
      mockMenuService.getMenuButtonsByMenu.mockResolvedValue(mockButtons);

      const result = await controller.getButtonsByMenu('devices');

      expect(result).toEqual(mockButtons);
      expect(mockMenuService.getMenuButtonsByMenu).toHaveBeenCalledWith('devices');
    });
  });

  describe('PUT /system/menu/buttons', () => {
    it('TC-BTN-CTRL-003: should update buttons via service', async () => {
      const mockButtons = [
        {
          id: 'btn-1',
          menuId: 'devices',
          labelKey: 'btn.create',
          permissionCode: 'device:create',
          sortOrder: 0,
        },
      ];
      mockMenuService.updateMenuButtons.mockResolvedValue(undefined);

      const result = await controller.updateButtons({ buttons: mockButtons });

      expect(result).toEqual({ ok: true });
      expect(mockMenuService.updateMenuButtons).toHaveBeenCalledWith(mockButtons);
    });
  });

  // ──────── 单项 CRUD ────────
  describe('POST /system/menu/item', () => {
    it('TC-CRUD-CTRL-001: should create a single menu item', async () => {
      mockMenuService.createMenuItem.mockResolvedValue({ id: 'new-item' });

      const item: SystemMenuItem = {
        id: 'new-item',
        labelKey: 'new.key',
        path: '/new',
        icon: 'new',
        order: 0,
      };
      const result = await controller.createMenuItem({ item });

      expect(result).toEqual({ ok: true });
      expect(mockMenuService.createMenuItem).toHaveBeenCalledWith(item, null);
    });

    it('TC-CRUD-CTRL-002: should create a child item with parentId', async () => {
      mockMenuService.createMenuItem.mockResolvedValue({ id: 'child' });

      const item: SystemMenuItem = {
        id: 'child',
        labelKey: 'c.key',
        path: '/p/c',
        icon: 'c',
        order: 5,
      };
      const result = await controller.createMenuItem({ item, parentId: 'parent' });

      expect(result).toEqual({ ok: true });
      expect(mockMenuService.createMenuItem).toHaveBeenCalledWith(item, 'parent');
    });
  });

  describe('PUT /system/menu/item/:id', () => {
    it('TC-CRUD-CTRL-010: should update a single menu item', async () => {
      mockMenuService.updateMenuItem.mockResolvedValue({ id: 'existing' });

      const item: SystemMenuItem = {
        id: 'existing',
        labelKey: 'updated.key',
        path: '/updated',
        icon: 'updated',
        order: 10,
      };
      const result = await controller.updateMenuItem('existing', { item });

      expect(result).toEqual({ ok: true });
      expect(mockMenuService.updateMenuItem).toHaveBeenCalledWith('existing', item, undefined);
    });

    it('TC-CRUD-CTRL-011: should update with parentId', async () => {
      mockMenuService.updateMenuItem.mockResolvedValue({ id: 'existing' });

      const item: SystemMenuItem = {
        id: 'existing',
        labelKey: 'updated.key',
        path: '/updated',
        icon: 'updated',
        order: 10,
      };
      const result = await controller.updateMenuItem('existing', { item, parentId: 'new-parent' });

      expect(result).toEqual({ ok: true });
      expect(mockMenuService.updateMenuItem).toHaveBeenCalledWith('existing', item, 'new-parent');
    });
  });

  describe('DELETE /system/menu/:id', () => {
    it('TC-CRUD-CTRL-020: should delete a menu item', async () => {
      mockMenuService.deleteMenuItem.mockResolvedValue(undefined);

      const result = await controller.deleteMenuItem('to-delete');

      expect(result).toEqual({ ok: true });
      expect(mockMenuService.deleteMenuItem).toHaveBeenCalledWith('to-delete');
    });
  });

  // ──────── 菜单国际化 ────────
  describe('GET /system/menu/i18n', () => {
    it('TC-I18N-CTRL-001: should return i18n data for specific menu', async () => {
      const mockTable = { menuId: 'test', menuName: 'Test', category: 'system', items: [] };
      mockI18nService.getMenuI18n.mockReturnValue(mockTable);

      const result = await controller.getMenuI18n('zh-CN', 'test');

      expect(result).toEqual(mockTable);
      expect(mockI18nService.getMenuI18n).toHaveBeenCalledWith('test', 'zh-CN');
    });

    it('TC-I18N-CTRL-002: should return all i18n data when no menuId', async () => {
      const mockTables = [{ menuId: 'a' }, { menuId: 'b' }];
      mockI18nService.getAllMenuI18n.mockReturnValue(mockTables);

      const result = await controller.getMenuI18n('en-US');

      expect(result).toEqual(mockTables);
      expect(mockI18nService.getAllMenuI18n).toHaveBeenCalledWith('en-US');
    });

    it('TC-I18N-CTRL-003: should return null when menu not found', async () => {
      mockI18nService.getMenuI18n.mockReturnValue(undefined);

      const result = await controller.getMenuI18n('zh-CN', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('PUT /system/menu/i18n/items', () => {
    it('TC-I18N-CTRL-010: should update menu i18n items', async () => {
      mockI18nService.updateMenuItems.mockImplementation(() => {});

      const items = [{ labelKey: 'key1', label: 'Name', sortOrder: 0, description: '' }];
      const result = await controller.updateMenuItems({ locale: 'zh-CN', menuId: 'test', items });

      expect(result).toEqual({ ok: true });
      expect(mockI18nService.updateMenuItems).toHaveBeenCalledWith('zh-CN', 'test', items);
    });
  });

  describe('POST /system/menu/i18n/sync', () => {
    it('TC-I18N-CTRL-020: should sync i18n to locale files', async () => {
      mockI18nService.syncToLocaleFiles.mockReturnValue({ synced: 2, errors: [] });

      const result = await controller.syncMenuI18n({ locale: 'zh-CN' });

      expect(result).toEqual({ synced: 2, errors: [] });
      expect(mockI18nService.syncToLocaleFiles).toHaveBeenCalledWith('zh-CN');
    });
  });

  describe('GET /system/menu/i18n/locales', () => {
    it('TC-I18N-CTRL-030: should return supported locales', async () => {
      mockI18nService.getSupportedLocales.mockReturnValue(['zh-CN', 'en-US']);

      const result = await controller.getMenuI18nLocales();

      expect(result).toEqual(['zh-CN', 'en-US']);
    });
  });
});
