// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ScriptAuditService, ScriptType, AuditAction } from '../script-audit.service';

describe('ScriptAuditService', () => {
  let service: ScriptAuditService;

  beforeEach(() => {
    service = new ScriptAuditService();
  });

  describe('logAudit', () => {
    it('should log an audit entry', () => {
      service.logAudit({
        userId: 'user-1',
        action: AuditAction.EXECUTE,
        scriptId: 'script-1',
        scriptName: 'test-script',
        scriptType: ScriptType.SANDBOX,
        success: true,
      });

      const logs = service.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('user-1');
      expect(logs[0].action).toBe(AuditAction.EXECUTE);
    });

    it('should log native script audit with extra warning', () => {
      service.logAudit({
        userId: 'admin-1',
        action: AuditAction.EXECUTE,
        scriptId: 'native-1',
        scriptName: 'native-script',
        scriptType: ScriptType.NATIVE,
        success: true,
      });

      const logs = service.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].scriptType).toBe(ScriptType.NATIVE);
    });
  });

  describe('getAuditLogs with filters', () => {
    it('should filter by userId', () => {
      service.logAudit({
        userId: 'user-1',
        action: AuditAction.CREATE,
        scriptName: 'script-a',
        scriptType: ScriptType.SANDBOX,
        success: true,
      });
      service.logAudit({
        userId: 'user-2',
        action: AuditAction.UPDATE,
        scriptName: 'script-b',
        scriptType: ScriptType.SANDBOX,
        success: true,
      });

      const logs = service.getAuditLogs({ userId: 'user-1' });
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('user-1');
    });

    it('should filter by scriptType', () => {
      service.logAudit({
        userId: 'user-1',
        action: AuditAction.EXECUTE,
        scriptName: 'native-script',
        scriptType: ScriptType.NATIVE,
        success: true,
      });
      service.logAudit({
        userId: 'user-1',
        action: AuditAction.EXECUTE,
        scriptName: 'sandbox-script',
        scriptType: ScriptType.SANDBOX,
        success: true,
      });

      const logs = service.getAuditLogs({ scriptType: ScriptType.NATIVE });
      expect(logs).toHaveLength(1);
      expect(logs[0].scriptType).toBe(ScriptType.NATIVE);
    });
  });

  describe('permissions', () => {
    it('should return sandbox permissions with all access', () => {
      const perm = service.getPermission(ScriptType.SANDBOX);
      expect(perm.canCreate).toBe(true);
      expect(perm.canExecute).toBe(true);
      expect(perm.roles).toContain('admin');
      expect(perm.roles).toContain('user');
    });

    it('should return native permissions with admin-only access', () => {
      const perm = service.getPermission(ScriptType.NATIVE);
      expect(perm.canCreate).toBe(false);
      expect(perm.canExecute).toBe(false);
      expect(perm.roles).toEqual(['admin']);
    });

    it('should allow updating permissions', () => {
      service.setPermission(ScriptType.SANDBOX, { canExecute: false });
      const perm = service.getPermission(ScriptType.SANDBOX);
      expect(perm.canExecute).toBe(false);
    });
  });

  describe('API whitelist', () => {
    it('should allow domains when whitelist is disabled', () => {
      const allowed = service.isDomainAllowed('https://example.com/api');
      expect(allowed).toBe(true);
    });

    it('should restrict domains when whitelist is enabled', () => {
      service.setApiWhitelist({ enabled: true });
      service.addDomain('example.com');

      expect(service.isDomainAllowed('https://example.com/api')).toBe(true);
      expect(service.isDomainAllowed('https://other.com/api')).toBe(false);
    });

    it('should enforce HTTPS protocol', () => {
      service.setApiWhitelist({ enabled: true });
      service.addDomain('example.com');

      expect(service.isDomainAllowed('http://example.com/api')).toBe(false);
    });
  });
});
