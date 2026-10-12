// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMenuStore } from '../../stores/menu.store';
import type { SystemMenuItem, SystemRole } from '../../config/system-menu.config';

// Mock the API client
vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Re-import to use the mocked version
import client from '../../api/client';

const mockMenuItems: SystemMenuItem[] = [
  {
    id: 'device',
    labelKey: 'system.menu.device',
    path: '/system/device',
    icon: 'device',
    order: 1,
    roles: ['admin', 'user'],
  },
  {
    id: 'alarm',
    labelKey: 'system.menu.alarm',
    path: '/system/alarm',
    icon: 'alarm',
    order: 2,
    roles: ['admin', 'user'],
  },
  {
    id: 'system',
    labelKey: 'system.menu.system',
    path: '/system/settings',
    icon: 'settings',
    order: 99,
    roles: ['admin'],
    children: [
      {
        id: 'system-config',
        labelKey: 'system.menu.systemConfig',
        path: '/system/settings/config',
        icon: 'settings',
        order: 1,
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'public',
    labelKey: 'system.menu.public',
    path: '/system/public',
    icon: 'info',
    order: 50,
    roles: [],
  },
];

describe('useMenuStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with empty menu items (DB 唯一数据源)', () => {
      const store = useMenuStore();
      expect(store.items).toEqual([]);
    });

    it('should start with loading=false', () => {
      const store = useMenuStore();
      expect(store.loading).toBe(false);
    });

    it('should start with error=null', () => {
      const store = useMenuStore();
      expect(store.error).toBeNull();
    });

    it('should start with loaded=false', () => {
      const store = useMenuStore();
      expect(store.loaded).toBe(false);
    });
  });

  describe('loadMenu()', () => {
    it('should set loading=true while fetching', async () => {
      const store = useMenuStore();
      vi.mocked(client.get).mockResolvedValueOnce({
        data: { code: 200, data: mockMenuItems, message: 'success', timestamp: '2026-01-01T00:00:00Z' },
      });
      const promise = store.loadMenu();
      expect(store.loading).toBe(true);
      await promise;
    });

    it('should handle TransformInterceptor wrapped response { code, data, message, timestamp }', async () => {
      const store = useMenuStore();
      vi.mocked(client.get).mockResolvedValueOnce({
        data: { code: 200, data: mockMenuItems, message: 'success', timestamp: '2026-01-01T00:00:00Z' },
      });

      await store.loadMenu();

      expect(store.items).toEqual(mockMenuItems);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('should handle raw array response (no TransformInterceptor wrapping)', async () => {
      const store = useMenuStore();
      vi.mocked(client.get).mockResolvedValueOnce({
        data: mockMenuItems,
      });

      await store.loadMenu();

      expect(store.items).toEqual(mockMenuItems);
    });

    it('should set items to empty array when API returns empty array', async () => {
      const store = useMenuStore();
      vi.mocked(client.get).mockResolvedValueOnce({
        data: { code: 200, data: [], message: 'success', timestamp: '2026-01-01T00:00:00Z' },
      });

      await store.loadMenu();

      expect(store.items).toEqual([]);
      expect(store.loaded).toBe(true);
    });

    it('should handle API error gracefully and keep empty array (no fallback)', async () => {
      const store = useMenuStore();
      vi.mocked(client.get).mockRejectedValueOnce(new Error('Network error'));

      await store.loadMenu();

      expect(store.items).toEqual([]);
      expect(store.error).toBe('Network error');
      expect(store.loaded).toBe(false);
    });

    it('should handle unknown error type with fallback message', async () => {
      const store = useMenuStore();
      vi.mocked(client.get).mockRejectedValueOnce('unknown error');

      await store.loadMenu();

      expect(store.error).toBe('菜单加载失败');
    });

    it('should set loading=false after success', async () => {
      const store = useMenuStore();
      vi.mocked(client.get).mockResolvedValueOnce({
        data: mockMenuItems,
      });

      await store.loadMenu();
      expect(store.loading).toBe(false);
    });

    it('should set loading=false after failure', async () => {
      const store = useMenuStore();
      vi.mocked(client.get).mockRejectedValueOnce(new Error('fail'));

      await store.loadMenu();
      expect(store.loading).toBe(false);
    });
  });

  describe('filterByRole()', () => {
    it('should return public-only items when role is null', () => {
      const store = useMenuStore();
      store.items = mockMenuItems;
      const result = store.filterByRole(store.items, null);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('public');
    });

    it('should return public-only items when role is undefined (no role)', () => {
      const store = useMenuStore();
      store.items = mockMenuItems;
      const result = store.filterByRole(store.items, undefined);
      expect(result.length).toBe(1);
    });

    it('should filter admin-only items for admin role', () => {
      const store = useMenuStore();
      store.items = mockMenuItems;
      const result = store.filterByRole(store.items, 'admin' as SystemRole);

      expect(result.length).toBe(4); // device, alarm, system(with children), public
      expect(result.find(m => m.id === 'device')).toBeDefined();
      expect(result.find(m => m.id === 'alarm')).toBeDefined();
      expect(result.find(m => m.id === 'system')).toBeDefined();
      expect(result.find(m => m.id === 'public')).toBeDefined();
    });

    it('should exclude admin-only items for user role', () => {
      const store = useMenuStore();
      store.items = mockMenuItems;
      const result = store.filterByRole(store.items, 'user' as SystemRole);

      expect(result.length).toBe(3); // device, alarm, public
      expect(result.find(m => m.id === 'system')).toBeUndefined();
    });

    it('should include public items (empty roles array) in all role filters', () => {
      const store = useMenuStore();
      store.items = mockMenuItems;

      for (const role of ['admin', 'user', 'viewer'] as SystemRole[]) {
        const result = store.filterByRole(store.items, role);
        expect(result.find(m => m.id === 'public')).toBeDefined();
      }
    });

    it('should recursively filter child menus', () => {
      const store = useMenuStore();
      store.items = mockMenuItems;

      // Admin sees system with children
      const adminResult = store.filterByRole(store.items, 'admin' as SystemRole);
      const systemMenu = adminResult.find(m => m.id === 'system');
      expect(systemMenu?.children).toBeDefined();
      expect(systemMenu!.children!.length).toBe(1);
      expect(systemMenu!.children![0].id).toBe('system-config');

      // User doesn't see system at all
      const userResult = store.filterByRole(store.items, 'user' as SystemRole);
      expect(userResult.find(m => m.id === 'system')).toBeUndefined();
    });

    it('should handle empty menu array', () => {
      const store = useMenuStore();
      const result = store.filterByRole([], 'admin' as SystemRole);
      expect(result).toEqual([]);
    });

    it('should handle menu items without roles field', () => {
      const store = useMenuStore();
      const items: SystemMenuItem[] = [
        { id: 'a', labelKey: 'a', path: '/a', icon: 'test', order: 1 },
      ];
      // No roles field → treated as public
      const adminResult = store.filterByRole(items, 'admin' as SystemRole);
      expect(adminResult.length).toBe(1);

      const nullResult = store.filterByRole(items, null);
      expect(nullResult.length).toBe(1);
    });
  });

  describe('filterByMenuIds()', () => {
    it('admin bypass: 返回全部菜单（忽略 menuIds）', () => {
      const store = useMenuStore();
      const result = store.filterByMenuIds(mockMenuItems, [], true);
      expect(result).toEqual(mockMenuItems);
    });

    it('admin bypass: 即使 menuIds 非空也返回全部', () => {
      const store = useMenuStore();
      const result = store.filterByMenuIds(mockMenuItems, ['device'], true);
      expect(result.length).toBe(mockMenuItems.length);
    });

    it('非 admin 空 menuIds: 返回空数组', () => {
      const store = useMenuStore();
      const result = store.filterByMenuIds(mockMenuItems, [], false);
      expect(result).toEqual([]);
    });

    it('非 admin undefined menuIds: 当作空数组处理', () => {
      const store = useMenuStore();
      const result = store.filterByMenuIds(mockMenuItems, undefined, false);
      expect(result).toEqual([]);
    });

    it('非 admin null menuIds: 当作空数组处理', () => {
      const store = useMenuStore();
      const result = store.filterByMenuIds(mockMenuItems, null, false);
      expect(result).toEqual([]);
    });

    it('非 admin 部分勾选: 只保留命中的项', () => {
      const store = useMenuStore();
      const result = store.filterByMenuIds(mockMenuItems, ['device'], false);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('device');
      expect(result[0].children).toBeUndefined();
    });

    it('父菜单自身勾选 + 子菜单勾选: 保留父，子菜单按 menuIds 过滤', () => {
      const store = useMenuStore();
      const result = store.filterByMenuIds(mockMenuItems, ['system', 'system-config'], false);
      const systemItem = result.find(m => m.id === 'system');
      expect(systemItem).toBeDefined();
      expect(systemItem!.children?.length).toBe(1);
      expect(systemItem!.children![0].id).toBe('system-config');
    });

    it('父菜单自身未勾选但有子菜单勾选: 作为容器保留', () => {
      const store = useMenuStore();
      const result = store.filterByMenuIds(mockMenuItems, ['system-config'], false);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('system');
      expect(result[0].children?.length).toBe(1);
      expect(result[0].children![0].id).toBe('system-config');
    });

    it('父菜单自身勾选但子菜单均未勾选: 保留父，children 为 undefined', () => {
      const store = useMenuStore();
      const result = store.filterByMenuIds(mockMenuItems, ['system'], false);
      const systemItem = result.find(m => m.id === 'system');
      expect(systemItem).toBeDefined();
      expect(systemItem!.children).toBeUndefined();
    });

    it('未勾选项被移除', () => {
      const store = useMenuStore();
      const result = store.filterByMenuIds(mockMenuItems, ['device'], false);
      expect(result.find(m => m.id === 'alarm')).toBeUndefined();
      expect(result.find(m => m.id === 'system')).toBeUndefined();
      expect(result.find(m => m.id === 'public')).toBeUndefined();
    });

    it('空菜单数组: 返回空数组', () => {
      const store = useMenuStore();
      expect(store.filterByMenuIds([], ['device'], false)).toEqual([]);
    });

    it('3 层嵌套: 祖父未勾选、父未勾选、孙勾选 → 祖父与父均作为容器保留', () => {
      const store = useMenuStore();
      const threeLevelMenu: SystemMenuItem[] = [
        {
          id: 'grand',
          labelKey: 'g',
          path: '/g',
          icon: 'g',
          order: 1,
          children: [
            {
              id: 'parent',
              labelKey: 'p',
              path: '/p',
              icon: 'p',
              order: 1,
              children: [
                { id: 'leaf', labelKey: 'l', path: '/l', icon: 'l', order: 1 },
              ],
            },
          ],
        },
      ];
      const result = store.filterByMenuIds(threeLevelMenu, ['leaf'], false);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('grand');
      expect(result[0].children!.length).toBe(1);
      expect(result[0].children![0].id).toBe('parent');
      expect(result[0].children![0].children!.length).toBe(1);
      expect(result[0].children![0].children![0].id).toBe('leaf');
    });
  });
});
