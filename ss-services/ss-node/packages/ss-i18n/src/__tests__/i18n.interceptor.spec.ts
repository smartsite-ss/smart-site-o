// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { I18nInterceptor } from '../i18n.interceptor';
import { I18nService } from '../i18n.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

// Mock translations for the interceptor tests
const TEST_TRANSLATIONS = {
  'zh-CN': { greeting: '你好' },
  'en-US': { greeting: 'Hello' },
};

function createService(): I18nService {
  const service = new I18nService();
  for (const [lang, translations] of Object.entries(TEST_TRANSLATIONS)) {
    (service as any).translations.set(lang, translations);
  }
  return service;
}

function createMockContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getType: () => 'http',
    getClass: () => ({}),
    getHandler: () => ({}),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({}),
    switchToWs: () => ({}),
  } as unknown as ExecutionContext;
}

function createMockHandler(): CallHandler {
  return {
    handle: () => of('test-response'),
  };
}

describe('I18nInterceptor', () => {
  let service: I18nService;
  let interceptor: I18nInterceptor;

  beforeEach(() => {
    service = createService();
    interceptor = new I18nInterceptor(service);
  });

  // TC-I18N-020: detect locale from query param
  describe('TC-I18N-020: detect locale from query param', () => {
    it('should detect locale from query param', (done) => {
      const request: Record<string, any> = {
        query: { locale: 'en-US' },
        headers: {},
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe('en-US');
        expect(service.getLanguage()).toBe('en-US');
        done();
      });
    });

    it('should detect zh-CN from query param', (done) => {
      const request: Record<string, any> = {
        query: { locale: 'zh-CN' },
        headers: {},
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe('zh-CN');
        expect(service.getLanguage()).toBe('zh-CN');
        done();
      });
    });
  });

  // TC-I18N-021: detect locale from Accept-Language header
  describe('TC-I18N-021: detect locale from Accept-Language header', () => {
    it('should detect locale from Accept-Language header', (done) => {
      const request: Record<string, any> = {
        query: {},
        headers: {
          'accept-language': 'en-US,en;q=0.9',
        },
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe('en-US');
        expect(service.getLanguage()).toBe('en-US');
        done();
      });
    });

    it('should detect zh from Accept-Language header and normalize to zh-CN', (done) => {
      const request: Record<string, any> = {
        query: {},
        headers: {
          'accept-language': 'zh-CN,zh;q=0.9',
        },
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe('zh-CN');
        expect(service.getLanguage()).toBe('zh-CN');
        done();
      });
    });
  });

  // TC-I18N-022: detect locale from cookie
  describe('TC-I18N-022: detect locale from cookie', () => {
    it('should detect locale from cookie', (done) => {
      const request: Record<string, any> = {
        query: {},
        headers: {
          cookie: 'locale=en-US; other=value',
        },
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe('en-US');
        expect(service.getLanguage()).toBe('en-US');
        done();
      });
    });

    it('should detect locale from cookie when it is the only cookie', (done) => {
      const request: Record<string, any> = {
        query: {},
        headers: {
          cookie: 'locale=zh-CN',
        },
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe('zh-CN');
        expect(service.getLanguage()).toBe('zh-CN');
        done();
      });
    });
  });

  // TC-I18N-023: query param takes priority over header
  describe('TC-I18N-023: query param takes priority over header', () => {
    it('should use query param over Accept-Language header', (done) => {
      const request: Record<string, any> = {
        query: { locale: 'en-US' },
        headers: {
          'accept-language': 'zh-CN,zh;q=0.9',
        },
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe('en-US');
        expect(service.getLanguage()).toBe('en-US');
        done();
      });
    });

    it('should use query param over cookie', (done) => {
      const request: Record<string, any> = {
        query: { locale: 'en-US' },
        headers: {
          cookie: 'locale=zh-CN',
          'accept-language': 'zh-CN,zh;q=0.9',
        },
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe('en-US');
        expect(service.getLanguage()).toBe('en-US');
        done();
      });
    });
  });

  // TC-I18N-024: unknown locale falls back to default
  describe('TC-I18N-024: unknown locale falls back to default', () => {
    it('should fallback to default when unknown locale in query param', (done) => {
      const request: Record<string, any> = {
        query: { locale: 'fr-FR' },
        headers: {},
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe(service.getFallbackLanguage());
        done();
      });
    });

    it('should fallback to default when unknown locale in Accept-Language', (done) => {
      const request: Record<string, any> = {
        query: {},
        headers: {
          'accept-language': 'fr-FR,fr;q=0.9',
        },
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe(service.getFallbackLanguage());
        done();
      });
    });
  });

  // TC-I18N-025: no locale info uses default
  describe('TC-I18N-025: no locale info uses default', () => {
    it('should use default language when no locale info provided', (done) => {
      const request: Record<string, any> = {
        query: {},
        headers: {},
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe(service.getFallbackLanguage());
        expect(service.getLanguage()).toBe(service.getFallbackLanguage());
        done();
      });
    });
  });

  // Additional: cookie takes priority over header
  describe('cookie priority over Accept-Language', () => {
    it('should use cookie locale over Accept-Language header', (done) => {
      const request: Record<string, any> = {
        query: {},
        headers: {
          cookie: 'locale=en-US',
          'accept-language': 'zh-CN,zh;q=0.9',
        },
      };
      const ctx = createMockContext(request);
      const handler = createMockHandler();

      interceptor.intercept(ctx, handler).subscribe(() => {
        expect(request.i18nLang).toBe('en-US');
        expect(service.getLanguage()).toBe('en-US');
        done();
      });
    });
  });
});
