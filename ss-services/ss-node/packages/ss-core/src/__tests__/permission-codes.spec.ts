// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  PermissionCodes,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATEGORIES,
} from '../core/auth/permission-codes';

describe('PermissionCodes', () => {
  describe('PermissionCodes constant', () => {
    it('should define ALL as *:*', () => {
      expect(PermissionCodes.ALL).toBe('*:*');
    });

    it('should define all project-related codes', () => {
      expect(PermissionCodes.PROJECT_VIEW).toBe('project:view');
      expect(PermissionCodes.PROJECT_CREATE).toBe('project:create');
      expect(PermissionCodes.PROJECT_EDIT).toBe('project:edit');
      expect(PermissionCodes.PROJECT_DELETE).toBe('project:delete');
      expect(PermissionCodes.PROJECT_CONFIG).toBe('project:config');
    });

    it('should define all device-related codes', () => {
      expect(PermissionCodes.DEVICE_VIEW).toBe('device:view');
      expect(PermissionCodes.DEVICE_CREATE).toBe('device:create');
      expect(PermissionCodes.DEVICE_EDIT).toBe('device:edit');
      expect(PermissionCodes.DEVICE_DELETE).toBe('device:delete');
      expect(PermissionCodes.DEVICE_IMPORT).toBe('device:import');
      expect(PermissionCodes.DEVICE_EXPORT).toBe('device:export');
      expect(PermissionCodes.DEVICE_CONNECT).toBe('device:connect');
    });

    it('should define all device group codes', () => {
      expect(PermissionCodes.DEVICE_GROUP_VIEW).toBe('device_group:view');
      expect(PermissionCodes.DEVICE_GROUP_CREATE).toBe('device_group:create');
      expect(PermissionCodes.DEVICE_GROUP_EDIT).toBe('device_group:edit');
      expect(PermissionCodes.DEVICE_GROUP_DELETE).toBe('device_group:delete');
    });

    it('should define all datatag-related codes', () => {
      expect(PermissionCodes.DATATAG_VIEW).toBe('datatag:view');
      expect(PermissionCodes.DATATAG_CREATE).toBe('datatag:create');
      expect(PermissionCodes.DATATAG_EDIT).toBe('datatag:edit');
      expect(PermissionCodes.DATATAG_DELETE).toBe('datatag:delete');
      expect(PermissionCodes.DATATAG_IMPORT).toBe('datatag:import');
      expect(PermissionCodes.DATATAG_EXPORT).toBe('datatag:export');
      expect(PermissionCodes.DATATAG_WRITE).toBe('datatag:write');
    });

    it('should define all alarm-related codes', () => {
      expect(PermissionCodes.ALARM_VIEW).toBe('alarm:view');
      expect(PermissionCodes.ALARM_ACK).toBe('alarm:ack');
      expect(PermissionCodes.ALARM_CONFIGURE).toBe('alarm:configure');
      expect(PermissionCodes.ALARM_RULE_VIEW).toBe('alarm:rule:view');
      expect(PermissionCodes.ALARM_RULE_CREATE).toBe('alarm:rule:create');
      expect(PermissionCodes.ALARM_RULE_EDIT).toBe('alarm:rule:edit');
      expect(PermissionCodes.ALARM_RULE_DELETE).toBe('alarm:rule:delete');
    });

    it('should define all script-related codes', () => {
      expect(PermissionCodes.SCRIPT_VIEW).toBe('script:view');
      expect(PermissionCodes.SCRIPT_CREATE).toBe('script:create');
      expect(PermissionCodes.SCRIPT_EDIT).toBe('script:edit');
      expect(PermissionCodes.SCRIPT_DELETE).toBe('script:delete');
      expect(PermissionCodes.SCRIPT_EXECUTE).toBe('script:execute');
    });

    it('should define all report-related codes', () => {
      expect(PermissionCodes.REPORT_VIEW).toBe('report:view');
      expect(PermissionCodes.REPORT_CREATE).toBe('report:create');
      expect(PermissionCodes.REPORT_EDIT).toBe('report:edit');
      expect(PermissionCodes.REPORT_DELETE).toBe('report:delete');
      expect(PermissionCodes.REPORT_EXPORT).toBe('report:export');
    });

    it('should define all template-related codes', () => {
      expect(PermissionCodes.TEMPLATE_VIEW).toBe('template:view');
      expect(PermissionCodes.TEMPLATE_CREATE).toBe('template:create');
      expect(PermissionCodes.TEMPLATE_EDIT).toBe('template:edit');
      expect(PermissionCodes.TEMPLATE_DELETE).toBe('template:delete');
      expect(PermissionCodes.TEMPLATE_IMPORT).toBe('template:import');
      expect(PermissionCodes.TEMPLATE_EXPORT).toBe('template:export');
    });

    it('should define all plugin-related codes', () => {
      expect(PermissionCodes.PLUGIN_VIEW).toBe('plugin:view');
      expect(PermissionCodes.PLUGIN_CREATE).toBe('plugin:create');
      expect(PermissionCodes.PLUGIN_EDIT).toBe('plugin:edit');
      expect(PermissionCodes.PLUGIN_DELETE).toBe('plugin:delete');
      expect(PermissionCodes.PLUGIN_CONFIG).toBe('plugin:config');
    });

    it('should define all system-related codes', () => {
      expect(PermissionCodes.SYSTEM_USER_VIEW).toBe('system:user:view');
      expect(PermissionCodes.SYSTEM_USER_CREATE).toBe('system:user:create');
      expect(PermissionCodes.SYSTEM_USER_EDIT).toBe('system:user:edit');
      expect(PermissionCodes.SYSTEM_USER_DELETE).toBe('system:user:delete');
      expect(PermissionCodes.SYSTEM_ROLE_VIEW).toBe('system:role:view');
      expect(PermissionCodes.SYSTEM_ROLE_CREATE).toBe('system:role:create');
      expect(PermissionCodes.SYSTEM_ROLE_EDIT).toBe('system:role:edit');
      expect(PermissionCodes.SYSTEM_ROLE_DELETE).toBe('system:role:delete');
      expect(PermissionCodes.SYSTEM_POSITION_VIEW).toBe('system:position:view');
      expect(PermissionCodes.SYSTEM_POSITION_CREATE).toBe('system:position:create');
      expect(PermissionCodes.SYSTEM_POSITION_EDIT).toBe('system:position:edit');
      expect(PermissionCodes.SYSTEM_POSITION_DELETE).toBe('system:position:delete');
      expect(PermissionCodes.SYSTEM_SETTINGS).toBe('system:settings');
      expect(PermissionCodes.SYSTEM_DICT).toBe('system:dict');
      expect(PermissionCodes.SYSTEM_MENU_CONFIG).toBe('system:menu:config');
      expect(PermissionCodes.SYSTEM_MENU).toBe('system:menu');
      expect(PermissionCodes.SYSTEM_AUDIT).toBe('system:audit');
      expect(PermissionCodes.SYSTEM_BASE_SERVICES).toBe('system:base_services');
      expect(PermissionCodes.SYSTEM_CONFIG).toBe('system:config');
      expect(PermissionCodes.SYSTEM_INFO).toBe('system:info');
      expect(PermissionCodes.SYSTEM_OPERATION_LOG).toBe('system:operation_log');
    });

    it('should have all permission code values as unique', () => {
      const values = Object.values(PermissionCodes);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });
  });

  describe('DEFAULT_ROLE_PERMISSIONS', () => {
    it('should give admin *:* permission', () => {
      expect(DEFAULT_ROLE_PERMISSIONS.admin).toContain('*:*');
      expect(DEFAULT_ROLE_PERMISSIONS.admin).toHaveLength(1);
    });

    it('should give user data write and system info permissions', () => {
      const perms = DEFAULT_ROLE_PERMISSIONS.user;
      expect(perms).toContain('device:view');
      expect(perms).toContain('device:create');
      expect(perms).toContain('device_group:view');
      expect(perms).toContain('datatag:view');
      expect(perms).toContain('alarm:view');
      expect(perms).toContain('alarm:configure');
      expect(perms).toContain('trend:view');
      expect(perms).toContain('trend:realtime:view');
      expect(perms).toContain('system:info');
      // should NOT contain admin-only codes
      expect(perms).not.toContain('system:user:create');
      expect(perms).not.toContain('system:role:edit');
      expect(perms).not.toContain('*:*');
    });

    it('should give viewer only read permissions', () => {
      const perms = DEFAULT_ROLE_PERMISSIONS.viewer;
      expect(perms).toContain('device:view');
      expect(perms).toContain('datatag:view');
      expect(perms).toContain('trend:view');
      expect(perms).toContain('trend:realtime:view');
      expect(perms).toContain('report:view');
      expect(perms).toContain('template:view');
      expect(perms).toContain('system:info');
      // should NOT contain any create/edit/delete codes
      expect(perms).not.toContain('device:create');
      expect(perms).not.toContain('device:edit');
      expect(perms).not.toContain('device:delete');
      expect(perms).not.toContain('*:*');
    });

    it('should give user all trend and report read/write permissions', () => {
      const perms = DEFAULT_ROLE_PERMISSIONS.user;
      expect(perms).toContain('report:view');
      expect(perms).toContain('report:create');
      expect(perms).toContain('report:edit');
      expect(perms).toContain('report:delete');
      expect(perms).toContain('report:export');
    });

    it('should give user full alarm permissions including configure', () => {
      const perms = DEFAULT_ROLE_PERMISSIONS.user;
      expect(perms).toContain('alarm:view');
      expect(perms).toContain('alarm:ack');
      expect(perms).toContain('alarm:configure');
      expect(perms).toContain('alarm:rule:view');
      expect(perms).toContain('alarm:rule:create');
      expect(perms).toContain('alarm:rule:edit');
      expect(perms).toContain('alarm:rule:delete');
    });

    it('every default permission code should be defined in PermissionCodes', () => {
      const definedValues = new Set(Object.values(PermissionCodes));
      for (const role of ['admin', 'user', 'viewer'] as const) {
        for (const code of DEFAULT_ROLE_PERMISSIONS[role]) {
          expect(definedValues.has(code as string)).toBe(true);
        }
      }
    });

    it('viewer should not have any write/create/edit/delete/execute permissions', () => {
      const perms = DEFAULT_ROLE_PERMISSIONS.viewer;
      const writeOps = ['create', 'edit', 'delete', 'import', 'export', 'write', 'execute', 'config', 'ack', 'configure'];
      for (const code of perms) {
        const parts = (code as string).split(':');
        const action = parts[parts.length - 1];
        expect(writeOps).not.toContain(action);
      }
      // but 'view' is explicitly allowed
      const viewPerms = perms.filter((p) => (p as string).includes(':view') || (p as string).includes('info'));
      expect(viewPerms.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('PERMISSION_CATEGORIES', () => {
    it('should have categories for all expected modules', () => {
      expect(PERMISSION_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    });

    it('should have correct module names and labels', () => {
      const modules = PERMISSION_CATEGORIES.map((c) => c.module);
      expect(modules).toContain('project');
      expect(modules).toContain('device');
      expect(modules).toContain('device_group');
      expect(modules).toContain('datatag');
      expect(modules).toContain('alarm');
      expect(modules).toContain('script');
      expect(modules).toContain('trend');
      expect(modules).toContain('report');
      expect(modules).toContain('template');
      expect(modules).toContain('plugin');
      expect(modules).toContain('system');
    });

    it('each category should have non-empty codes array', () => {
      for (const category of PERMISSION_CATEGORIES) {
        expect(category.codes.length).toBeGreaterThan(0);
      }
    });
  });
});
