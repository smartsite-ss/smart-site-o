// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Translate, TranslateParam, I18nParam } from '../decorators/i18n.decorator';
import { I18nService } from '../i18n.service';

// Embedded test translation data
const TEST_TRANSLATIONS = {
  'zh-CN': {
    greeting: '你好',
    welcome: '欢迎, {{name}}',
    error: {
      auth: {
        AUTH_001: '认证失败',
      },
    },
  },
  'en-US': {
    greeting: 'Hello',
    welcome: 'Welcome, {{name}}',
    error: {
      auth: {
        AUTH_001: 'Authentication failed',
      },
    },
  },
};

function createMockExecutionContext(requestOverrides: Record<string, any> = {}): ExecutionContext {
  const request = {
    i18nService: null as I18nService | null,
    i18nParams: {},
    ...requestOverrides,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => jest.fn(),
    }),
    getType: () => 'http',
    getClass: () => ({}) as any,
    getHandler: () => ({}) as any,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getData: () => ({}) }),
    switchToWs: () => ({ getData: () => ({}), getClient: () => ({}) }),
  } as unknown as ExecutionContext;
}

function createI18nService(): I18nService {
  const service = new I18nService();
  for (const [lang, translations] of Object.entries(TEST_TRANSLATIONS)) {
    (service as any).translations.set(lang, translations);
  }
  return service;
}

/**
 * Extract the factory function from a NestJS param decorator created by createParamDecorator.
 * This works by applying the decorator to a dummy class method and reading the metadata.
 */
function getParamDecoratorFactory(
  decorator: Function,
  data?: any,
): (data: any, ctx: ExecutionContext) => any {
  class TestClass {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    test(@decorator(data) _value: any) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'test');
  if (!args) {
    throw new Error(`No ROUTE_ARGS_METADATA found for decorator`);
  }
  const key = Object.keys(args)[0];
  return args[key].factory;
}

// TC-I18N-DEC-001: @Translate() decorator
describe('TC-I18N-DEC-001: @Translate() decorator', () => {
  it('should translate a simple key using @Translate decorator', () => {
    const i18nService = createI18nService();
    const ctx = createMockExecutionContext({ i18nService });
    const factory = getParamDecoratorFactory(Translate, 'greeting');

    const result = factory('greeting', ctx);
    expect(result).toBe('你好');
  });

  it('should translate a nested key using @Translate decorator', () => {
    const i18nService = createI18nService();
    const ctx = createMockExecutionContext({ i18nService });
    const factory = getParamDecoratorFactory(Translate, 'error.auth.AUTH_001');

    const result = factory('error.auth.AUTH_001', ctx);
    expect(result).toBe('认证失败');
  });

  it('should return the key itself when i18nService is not available', () => {
    const ctx = createMockExecutionContext({ i18nService: null });
    const factory = getParamDecoratorFactory(Translate, 'greeting');

    const result = factory('greeting', ctx);
    expect(result).toBe('greeting');
  });

  it('should translate in English when language is switched', () => {
    const i18nService = createI18nService();
    i18nService.setLanguage('en-US');
    const ctx = createMockExecutionContext({ i18nService });
    const factory = getParamDecoratorFactory(Translate, 'greeting');

    const result = factory('greeting', ctx);
    expect(result).toBe('Hello');
  });
});

// TC-I18N-DEC-002: @TranslateParam() decorator
describe('TC-I18N-DEC-002: @TranslateParam() decorator', () => {
  it('should return i18nParams from request', () => {
    const params = { name: '小明', count: 5 };
    const ctx = createMockExecutionContext({ i18nParams: params });
    const factory = getParamDecoratorFactory(TranslateParam);

    const result = factory(undefined, ctx);
    expect(result).toEqual(params);
  });

  it('should return empty object when no i18nParams set', () => {
    const ctx = createMockExecutionContext();
    const factory = getParamDecoratorFactory(TranslateParam);

    const result = factory(undefined, ctx);
    expect(result).toEqual({});
  });

  it('should return i18nParams with string and number values', () => {
    const params = { name: 'Alice', age: 30, score: 95.5 };
    const ctx = createMockExecutionContext({ i18nParams: params });
    const factory = getParamDecoratorFactory(TranslateParam);

    const result = factory(undefined, ctx);
    expect(result).toEqual(params);
  });
});

// TC-I18N-DEC-003: @I18nParam() decorator
describe('TC-I18N-DEC-003: @I18nParam() decorator', () => {
  it('should return the i18nService instance from request', () => {
    const i18nService = createI18nService();
    const ctx = createMockExecutionContext({ i18nService });
    const factory = getParamDecoratorFactory(I18nParam);

    const result = factory(undefined, ctx);
    expect(result).toBe(i18nService);
  });

  it('should return undefined when i18nService is not set on request', () => {
    const ctx = createMockExecutionContext({ i18nService: undefined });
    const factory = getParamDecoratorFactory(I18nParam);

    const result = factory(undefined, ctx);
    expect(result).toBeUndefined();
  });

  it('should return null when i18nService is null', () => {
    const ctx = createMockExecutionContext({ i18nService: null });
    const factory = getParamDecoratorFactory(I18nParam);

    const result = factory(undefined, ctx);
    expect(result).toBeNull();
  });
});

// TC-I18N-DEC-004: Combined decorator usage scenario
describe('TC-I18N-DEC-004: Combined decorator usage scenario', () => {
  it('should support using @Translate with @TranslateParam together', () => {
    const i18nService = createI18nService();
    const params = { name: 'World' };
    const ctx = createMockExecutionContext({ i18nService, i18nParams: params });

    const translateFactory = getParamDecoratorFactory(Translate, 'welcome');
    const paramFactory = getParamDecoratorFactory(TranslateParam);
    const i18nFactory = getParamDecoratorFactory(I18nParam);

    const translatedKey = translateFactory('welcome', ctx);
    const resolvedParams = paramFactory(undefined, ctx);
    const resolvedService = i18nFactory(undefined, ctx);

    expect(translatedKey).toBe('欢迎, {{name}}');
    expect(resolvedParams).toEqual(params);
    expect(resolvedService).toBe(i18nService);
  });

  it('should allow manual translation with resolved params', () => {
    const i18nService = createI18nService();
    const params = { name: 'World' };
    const ctx = createMockExecutionContext({ i18nService, i18nParams: params });

    const translateFactory = getParamDecoratorFactory(Translate, 'welcome');
    const paramFactory = getParamDecoratorFactory(TranslateParam);

    const translatedKey = translateFactory('welcome', ctx);
    const resolvedParams = paramFactory(undefined, ctx);

    const result = i18nService.translate(
      translatedKey as string,
      resolvedParams as unknown as Record<string, string | number>,
    );
    expect(result).toBe('欢迎, World');
  });
});
