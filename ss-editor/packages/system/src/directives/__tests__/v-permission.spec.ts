// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../stores/auth.store';

// Mock the auth API to prevent import errors
vi.mock('../../api/modules/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../../api/modules/user.api', () => ({
  userApi: {
    getProfile: vi.fn(),
  },
}));

import { vPermission } from '../v-permission';

function createTestElement(tag = 'button'): HTMLElement {
  return document.createElement(tag);
}

function createBinding(value: string | string[], arg?: string): any {
  return {
    value,
    arg,
    instance: null,
    oldValue: null,
    modifiers: {},
    dir: {},
  };
}

function setUserRole(role: string | null, permissions?: string[]) {
  const store = useAuthStore();
  store.user = role ? { id: '1', username: 'test', role, displayName: 'Test' } as any : null;
  store.permissions = permissions || [];
}

describe('v-permission', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('hide mode (default)', () => {
    it('should NOT remove element when user has the permission', () => {
      setUserRole('admin', ['project:create']);
      const el = createTestElement();
      const parent = document.createElement('div');
      parent.appendChild(el);

      vPermission.mounted!(el, createBinding('project:create'));

      expect(parent.contains(el)).toBe(true);
    });

    it('should remove element when user lacks the permission', () => {
      setUserRole('viewer', ['device:read']);
      const el = createTestElement();
      const parent = document.createElement('div');
      parent.appendChild(el);

      vPermission.mounted!(el, createBinding('project:create'));

      expect(parent.contains(el)).toBe(false);
    });

    it('should show element if user has ANY of specified permissions (array)', () => {
      setUserRole('user', ['project:edit']);
      const el = createTestElement();
      const parent = document.createElement('div');
      parent.appendChild(el);

      vPermission.mounted!(el, createBinding(['project:create', 'project:edit']));

      expect(parent.contains(el)).toBe(true);
    });

    it('should remove element if user has NONE of specified permissions (array)', () => {
      setUserRole('viewer', ['device:read']);
      const el = createTestElement();
      const parent = document.createElement('div');
      parent.appendChild(el);

      vPermission.mounted!(el, createBinding(['project:create', 'project:edit']));

      expect(parent.contains(el)).toBe(false);
    });

    it('should remove element when user has no role', () => {
      setUserRole(null);
      const el = createTestElement();
      const parent = document.createElement('div');
      parent.appendChild(el);

      vPermission.mounted!(el, createBinding('project:create'));

      expect(parent.contains(el)).toBe(false);
    });
  });

  describe('disable mode (v-permission:disable)', () => {
    it('should NOT disable element when user has the permission', () => {
      setUserRole('admin', ['project:create']);
      const el = createTestElement('button') as HTMLButtonElement;

      vPermission.mounted!(el, createBinding('project:create', 'disable'));

      expect(el.disabled).toBe(false);
      expect(el.getAttribute('disabled')).toBeNull();
    });

    it('should disable element when user lacks the permission', () => {
      setUserRole('viewer', ['device:read']);
      const el = createTestElement('button') as HTMLButtonElement;

      vPermission.mounted!(el, createBinding('project:create', 'disable'));

      expect(el.disabled).toBe(true);
      expect(el.classList.contains('permission-disabled')).toBe(true);
    });

    it('should add permission-disabled class when disabled', () => {
      setUserRole('viewer', []);
      const el = createTestElement('div');

      vPermission.mounted!(el, createBinding('project:create', 'disable'));

      expect(el.getAttribute('disabled')).toBe('true');
      expect(el.classList.contains('permission-disabled')).toBe(true);
    });

    it('should set disabled attribute on non-interactive elements', () => {
      setUserRole('viewer', []);
      const el = createTestElement('span');

      vPermission.mounted!(el, createBinding('project:create', 'disable'));

      expect(el.getAttribute('disabled')).toBe('true');
    });
  });
});
