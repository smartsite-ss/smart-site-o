// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { SystemI18nService, I18nAuthError } from '../i18n/system-i18n.service';
import { I18nService } from '@ss-node/ss-i18n';

jest.mock('@ss-node/ss-i18n', () => ({
  I18nService: jest.fn().mockImplementation(() => ({
    tSync: jest.fn().mockImplementation((key: string, args?: any) => {
      if (args) {
        return `translated:${key} with ${JSON.stringify(args)}`;
      }
      return `translated:${key}`;
    }),
    getSupportedLanguages: jest.fn(() => ['zh-CN', 'en-US']),
    getFallbackLanguage: jest.fn(() => 'zh-CN'),
  })),
  I18nModule: class {},
}));

describe('SystemI18nService', () => {
  let service: SystemI18nService;
  let mockI18n: any;

  beforeEach(async () => {
    mockI18n = {
      tSync: jest.fn().mockImplementation((key: string, args?: any) => {
        if (args && typeof args === 'object' && Object.keys(args).length > 0) {
          return `translated:${key} with ${JSON.stringify(args)}`;
        }
        return `translated:${key}`;
      }),
      getSupportedLanguages: jest.fn(() => ['zh-CN', 'en-US']),
      getFallbackLanguage: jest.fn(() => 'zh-CN'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemI18nService, { provide: I18nService, useValue: mockI18n }],
    }).compile();

    service = module.get<SystemI18nService>(SystemI18nService);
    jest.clearAllMocks();
  });

  describe('translate', () => {
    it('TC-I18N-001: should translate a key', () => {
      const result = service.translate('system.health.ok');

      expect(result).toBe('translated:system.health.ok');
      expect(mockI18n.tSync).toHaveBeenCalledWith('system.health.ok', undefined, undefined);
    });

    it('TC-I18N-002: should translate with language', () => {
      const result = service.translate('system.health.ok', 'en-US');

      expect(result).toBe('translated:system.health.ok');
      expect(mockI18n.tSync).toHaveBeenCalledWith('system.health.ok', undefined, 'en-US');
    });
  });

  describe('translateWithArgs', () => {
    it('TC-I18N-010: should translate with arguments', () => {
      const result = service.translateWithArgs('system.notification.role_changed', {
        role: 'admin',
      });

      expect(result).toContain('role');
      expect(mockI18n.tSync).toHaveBeenCalled();
    });
  });

  describe('getSupportedLanguages', () => {
    it('TC-I18N-020: should return supported languages', () => {
      const langs = service.getSupportedLanguages();

      expect(langs).toContain('zh-CN');
      expect(langs).toContain('en-US');
    });
  });

  describe('getCurrentLanguage', () => {
    it('TC-I18N-030: should return current language', () => {
      const lang = service.getCurrentLanguage();

      expect(lang).toBe('zh-CN');
    });
  });

  describe('I18nAuthError', () => {
    it('TC-I18N-040: should create I18nAuthError', () => {
      const error = new I18nAuthError('system.error.unauthorized', 401);

      expect(error.i18nKey).toBe('system.error.unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('I18nAuthError');
    });

    it('TC-I18N-041: should get localized message', () => {
      const error = new I18nAuthError('system.error.not_found', 404);
      const message = error.getLocalizedMessage(service);

      expect(message).toBe('translated:system.error.not_found');
    });

    it('TC-I18N-042: should get localized message with args', () => {
      const error = new I18nAuthError('system.terminal.command_blocked', 403, {
        command: 'rm -rf',
      });
      const message = error.getLocalizedMessage(service);

      expect(message).toContain('command');
    });
  });
});
