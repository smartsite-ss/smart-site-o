// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { ERROR_CODE_I18N_KEY, mapErrorCodeToI18n } from '../error-codes';

describe('error-codes', () => {
  describe('ERROR_CODE_I18N_KEY', () => {
    it('should contain all 17 error codes', () => {
      const expectedCodes = [
        'DATA_001', 'DATA_002', 'DATA_003', 'DATA_004',
        'DEV_001', 'DEV_002', 'DEV_003',
        'ALM_001', 'ALM_002',
        'SYS_001', 'SYS_002', 'SYS_003',
        'AUTH_001', 'AUTH_002', 'AUTH_003',
        'VALIDATION_001', 'NOT_FOUND_001',
      ];
      expect(Object.keys(ERROR_CODE_I18N_KEY).sort()).toEqual(expectedCodes.sort());
    });

    it('should map data error codes to correct i18n keys', () => {
      expect(ERROR_CODE_I18N_KEY.DATA_001).toBe('error.data.acquisition_failed');
      expect(ERROR_CODE_I18N_KEY.DATA_002).toBe('error.data.protocol_timeout');
      expect(ERROR_CODE_I18N_KEY.DATA_003).toBe('error.data.persistence_failed');
      expect(ERROR_CODE_I18N_KEY.DATA_004).toBe('error.data.quality_issue');
    });

    it('should map device error codes to correct i18n keys', () => {
      expect(ERROR_CODE_I18N_KEY.DEV_001).toBe('error.device.error');
      expect(ERROR_CODE_I18N_KEY.DEV_002).toBe('error.device.offline');
      expect(ERROR_CODE_I18N_KEY.DEV_003).toBe('error.device.read_error');
    });

    it('should map auth error codes to correct i18n keys', () => {
      expect(ERROR_CODE_I18N_KEY.AUTH_001).toBe('error.auth.unauthorized');
      expect(ERROR_CODE_I18N_KEY.AUTH_002).toBe('error.auth.forbidden');
      expect(ERROR_CODE_I18N_KEY.AUTH_003).toBe('error.auth.token_expired');
    });
  });

  describe('mapErrorCodeToI18n', () => {
    it('should return the correct i18n key for a known error code', () => {
      expect(mapErrorCodeToI18n('DEV_002')).toBe('error.device.offline');
      expect(mapErrorCodeToI18n('AUTH_001')).toBe('error.auth.unauthorized');
      expect(mapErrorCodeToI18n('VALIDATION_001')).toBe('error.validation.invalid_input');
    });

    it('should return undefined for an unknown error code', () => {
      expect(mapErrorCodeToI18n('UNKNOWN_CODE')).toBeUndefined();
      expect(mapErrorCodeToI18n('')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(mapErrorCodeToI18n('')).toBeUndefined();
    });
  });
});
