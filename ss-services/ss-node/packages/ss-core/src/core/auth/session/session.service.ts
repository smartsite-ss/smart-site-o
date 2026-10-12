// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject } from '@nestjs/common';
import { I18nService } from '@ss-node/ss-i18n';

export interface SessionInfo {
  id: string;
  userId: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  lastActivity: number;
}

export interface LoginHistoryEntry {
  userId: string;
  ip: string;
  userAgent: string;
  timestamp: number;
  success: boolean;
}

export interface AnomalyCheckResult {
  isAnomalous: boolean;
  reason: string;
}

@Injectable()
export class SessionService {
  private sessions: Map<string, SessionInfo> = new Map();
  private userSessions: Map<string, string[]> = new Map();
  private loginHistory: Map<string, LoginHistoryEntry[]> = new Map();
  private readonly MAX_LOGIN_HISTORY = 20;
  private readonly SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    @Inject(I18nService)
    private i18nService: I18nService,
  ) {}

  /**
   * Create a new session for a user
   */
  createSession(userId: string, ip: string, userAgent: string): SessionInfo {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    const session: SessionInfo = {
      id: sessionId,
      userId,
      ip,
      userAgent,
      createdAt: now,
      lastActivity: now,
    };

    this.sessions.set(sessionId, session);

    const userSessionList = this.userSessions.get(userId) || [];
    userSessionList.push(sessionId);
    this.userSessions.set(userId, userSessionList);

    return session;
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): SessionInfo[] {
    const sessionIds = this.userSessions.get(userId) || [];
    return sessionIds
      .map((id) => this.sessions.get(id))
      .filter((s): s is SessionInfo => s !== undefined);
  }

  /**
   * Get a session by its ID
   */
  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Force logout a specific session
   */
  forceLogout(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const userId = session.userId;
    this.sessions.delete(sessionId);

    const userSessionList = this.userSessions.get(userId) || [];
    const updated = userSessionList.filter((id) => id !== sessionId);
    if (updated.length > 0) {
      this.userSessions.set(userId, updated);
    } else {
      this.userSessions.delete(userId);
    }

    return true;
  }

  /**
   * Logout all sessions of a user except the current one
   */
  logoutAllExcept(userId: string, currentSessionId: string): number {
    const sessionIds = this.userSessions.get(userId) || [];
    let logoutCount = 0;

    for (const sessionId of sessionIds) {
      if (sessionId !== currentSessionId) {
        this.sessions.delete(sessionId);
        logoutCount++;
      }
    }

    // Update user sessions to only contain the current session
    const updated = sessionIds.filter((id) => id === currentSessionId);
    if (updated.length > 0) {
      this.userSessions.set(userId, updated);
    } else {
      this.userSessions.delete(userId);
    }

    return logoutCount;
  }

  /**
   * Update session activity timestamp
   */
  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Record a login history entry
   */
  recordLoginHistory(userId: string, ip: string, userAgent: string, success: boolean): void {
    const history = this.loginHistory.get(userId) || [];
    const entry: LoginHistoryEntry = {
      userId,
      ip,
      userAgent,
      timestamp: Date.now(),
      success,
    };
    history.unshift(entry);

    // Keep only last MAX_LOGIN_HISTORY entries
    if (history.length > this.MAX_LOGIN_HISTORY) {
      history.length = this.MAX_LOGIN_HISTORY;
    }

    this.loginHistory.set(userId, history);
  }

  /**
   * Get login history for a user
   */
  getLoginHistory(userId: string): LoginHistoryEntry[] {
    return this.loginHistory.get(userId) || [];
  }

  /**
   * Check if a login from a new IP/location is anomalous
   */
  checkAnomaly(userId: string, ip: string, _userAgent: string): AnomalyCheckResult {
    const history = this.loginHistory.get(userId) || [];
    const successfulLogins = history.filter((e) => e.success);

    // No previous login history - not anomalous
    if (successfulLogins.length === 0) {
      return { isAnomalous: false, reason: '' };
    }

    // Check if IP has been used before in successful logins
    const knownIp = successfulLogins.some((e) => e.ip === ip);
    if (!knownIp) {
      return {
        isAnomalous: true,
        reason:
          this.i18nService.tSync('auth.session.anomaly_new_ip') || 'Login from new IP address',
      };
    }

    return { isAnomalous: false, reason: '' };
  }

  /**
   * Get known IPs for a user (from successful login history)
   */
  getKnownIps(userId: string): string[] {
    const history = this.loginHistory.get(userId) || [];
    const successfulLogins = history.filter((e) => e.success);
    const ips = new Set(successfulLogins.map((e) => e.ip));
    return Array.from(ips);
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpired(): number {
    const expiredSessions: string[] = [];
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT_MS) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.forceLogout(sessionId);
    }

    return expiredSessions.length;
  }

  /**
   * Get total active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  }
}
