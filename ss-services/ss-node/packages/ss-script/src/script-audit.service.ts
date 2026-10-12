// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';

export enum ScriptType {
  SANDBOX = 'sandbox',
  NATIVE = 'native',
  EXPRESSION = 'expression',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  VALIDATE = 'validate',
  TEMPLATE_INSTANTIATE = 'template_instantiate',
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: AuditAction;
  scriptId?: string;
  scriptName?: string;
  scriptType: ScriptType;
  details?: string;
  success: boolean;
  errorMessage?: string;
}

export interface ApiWhitelistConfig {
  domains: string[];
  allowedProtocols: string[];
  enabled: boolean;
}

export interface ScriptPermission {
  scriptType: ScriptType;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExecute: boolean;
  canValidate: boolean;
  canView: boolean;
  roles: string[];
}

@Injectable()
export class ScriptAuditService {
  private readonly logger = new Logger(ScriptAuditService.name);

  private auditLogs: AuditEntry[] = [];
  private maxAuditLogs = 5000;

  private apiWhitelist: ApiWhitelistConfig = {
    domains: [],
    allowedProtocols: ['https'],
    enabled: false,
  };

  private readonly defaultPermissions: Record<ScriptType, ScriptPermission> = {
    [ScriptType.SANDBOX]: {
      scriptType: ScriptType.SANDBOX,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canExecute: true,
      canValidate: true,
      canView: true,
      roles: ['admin', 'user', 'viewer'],
    },
    [ScriptType.NATIVE]: {
      scriptType: ScriptType.NATIVE,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canExecute: false,
      canValidate: false,
      canView: true,
      roles: ['admin'],
    },
    [ScriptType.EXPRESSION]: {
      scriptType: ScriptType.EXPRESSION,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canExecute: true,
      canValidate: true,
      canView: true,
      roles: ['admin', 'user'],
    },
  };

  logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    const auditEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.auditLogs.push(auditEntry);

    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs = this.auditLogs.slice(-this.maxAuditLogs);
    }

    if (entry.scriptType === ScriptType.NATIVE) {
      this.logger.warn(
        `AUDIT: Native script action - ${entry.action} on "${entry.scriptName}" by ${entry.userId}`,
      );
    }

    this.logger.debug(
      `AUDIT: ${entry.action} on "${entry.scriptName}" (${entry.scriptType}) by ${entry.userId} - ${entry.success ? 'success' : 'failed'}`,
    );
  }

  getAuditLogs(filters?: {
    userId?: string;
    scriptId?: string;
    scriptType?: ScriptType;
    action?: AuditAction;
    limit?: number;
  }): AuditEntry[] {
    let logs = [...this.auditLogs];

    if (filters?.userId) {
      logs = logs.filter((l) => l.userId === filters.userId);
    }
    if (filters?.scriptId) {
      logs = logs.filter((l) => l.scriptId === filters.scriptId);
    }
    if (filters?.scriptType) {
      logs = logs.filter((l) => l.scriptType === filters.scriptType);
    }
    if (filters?.action) {
      logs = logs.filter((l) => l.action === filters.action);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const limit = filters?.limit || 100;
    return logs.slice(0, limit);
  }

  getPermission(scriptType: ScriptType): ScriptPermission {
    return { ...this.defaultPermissions[scriptType] };
  }

  getAllPermissions(): Record<ScriptType, ScriptPermission> {
    return {
      [ScriptType.SANDBOX]: { ...this.defaultPermissions[ScriptType.SANDBOX] },
      [ScriptType.NATIVE]: { ...this.defaultPermissions[ScriptType.NATIVE] },
      [ScriptType.EXPRESSION]: { ...this.defaultPermissions[ScriptType.EXPRESSION] },
    };
  }

  setPermission(scriptType: ScriptType, permission: Partial<ScriptPermission>): void {
    this.defaultPermissions[scriptType] = {
      ...this.defaultPermissions[scriptType],
      ...permission,
      scriptType,
    };

    this.logger.log(`Updated permissions for script type: ${scriptType}`);
  }

  getApiWhitelist(): ApiWhitelistConfig {
    return { ...this.apiWhitelist, domains: [...this.apiWhitelist.domains] };
  }

  setApiWhitelist(config: Partial<ApiWhitelistConfig>): void {
    this.apiWhitelist = { ...this.apiWhitelist, ...config };
    this.logger.log(
      `API whitelist updated: enabled=${this.apiWhitelist.enabled}, domains=${this.apiWhitelist.domains.join(', ') || '(none)'}`,
    );
  }

  addDomain(domain: string): boolean {
    if (this.apiWhitelist.domains.includes(domain)) {
      return false;
    }
    this.apiWhitelist.domains.push(domain);
    this.logger.log(`Added domain to whitelist: ${domain}`);
    return true;
  }

  removeDomain(domain: string): boolean {
    const idx = this.apiWhitelist.domains.indexOf(domain);
    if (idx < 0) return false;
    this.apiWhitelist.domains.splice(idx, 1);
    this.logger.log(`Removed domain from whitelist: ${domain}`);
    return true;
  }

  isDomainAllowed(url: string): boolean {
    if (!this.apiWhitelist.enabled) return true;

    try {
      const parsed = new URL(url);
      if (!this.apiWhitelist.allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
        return false;
      }

      if (this.apiWhitelist.domains.length === 0) return true;

      return this.apiWhitelist.domains.some(
        (domain) => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain),
      );
    } catch {
      return false;
    }
  }

  clearAuditLogs(): void {
    this.auditLogs = [];
    this.logger.log('Audit logs cleared');
  }

  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
