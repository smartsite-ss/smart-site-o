// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
} from '../../api/client';

/**
 * S-C03: Token 存储改为内存（不再使用 localStorage）
 *
 * Token 通过 HttpOnly Cookie 由后端管理，前端仅在内存中维护标记。
 * 这些测试验证内存读写的正确性。
 */
describe('token management', () => {
  beforeEach(() => {
    // 测试间通过 clearTokens 重置内存状态
    clearTokens();
  });

  describe('getToken / setToken', () => {
    it('should return null when no token is set', () => {
      expect(getToken()).toBeNull();
    });

    it('should set and get token in memory', () => {
      setToken('test-access-token');
      expect(getToken()).toBe('test-access-token');
    });

    it('should overwrite previous token', () => {
      setToken('first');
      setToken('second');
      expect(getToken()).toBe('second');
    });
  });

  describe('getRefreshToken / setRefreshToken', () => {
    it('should return null when no refresh token is set', () => {
      expect(getRefreshToken()).toBeNull();
    });

    it('should set and get refresh token in memory', () => {
      setRefreshToken('test-refresh-token');
      expect(getRefreshToken()).toBe('test-refresh-token');
    });
  });

  describe('clearTokens', () => {
    it('should clear both tokens from memory', () => {
      setToken('access');
      setRefreshToken('refresh');
      clearTokens();

      expect(getToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });

    it('should not throw when no tokens exist', () => {
      expect(() => clearTokens()).not.toThrow();
    });
  });
});
