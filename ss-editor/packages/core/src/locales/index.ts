// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { createI18n } from 'vue-i18n';
import enUS from './en-US.json';
import zhCN from './zh-CN.json';

// ── 单一语言清单：新增语言只需在此登记 + 新增对应 json 文件 ──
// key 为主语言代码，aliases 为兼容的历史/简写别名
export const SUPPORTED_LOCALES = {
  'zh-CN': { aliases: ['zh'], messages: zhCN },
  'en-US': { aliases: ['en'], messages: enUS },
} as const;

export type SupportedLocale = keyof typeof SUPPORTED_LOCALES;

function buildMessages(): Record<string, any> {
  const messages: Record<string, any> = {};
  for (const [locale, definition] of Object.entries(SUPPORTED_LOCALES)) {
    messages[locale] = definition.messages;
    for (const alias of definition.aliases) {
      messages[alias] = definition.messages;
    }
  }
  return messages;
}

function buildFallbackLocale(): Record<string, string[]> {
  const fallback: Record<string, string[]> = { default: ['en-US'] };
  for (const [locale, definition] of Object.entries(SUPPORTED_LOCALES)) {
    for (const alias of definition.aliases) {
      fallback[alias] = [locale];
    }
  }
  return fallback;
}

/**
 * i18n 实例的对外门面类型。
 *
 * 背景：TS 5.9 下解析 vue-i18n 9.x Composer['t'] 的泛型重载会触发
 * TS2589（类型实例化过深）。因此通过 unknown 中转账把导出类型收窄为
 * 轻量接口，运行时实例不变，消费方无需任何改动。
 * 注意：app.use(i18n) 处需自行断言（如 `app.use(i18n as any)`）。
 */
export interface II18nGlobalFacade {
  t: (key: string, params?: Record<string, unknown>) => string;
  locale: { value: string };
  mergeLocaleMessage: (locale: string, messages: Record<string, unknown>) => void;
}

export interface II18nFacade {
  global: II18nGlobalFacade;
}

const i18nInstance = createI18n({
  legacy: false, // 使用 Composition API 模式，兼容 useI18n()
  locale: 'zh-CN', // 默认语言
  fallbackLocale: buildFallbackLocale(), // 回退语言 + 语言代码别名
  messages: buildMessages(),
  globalInjection: true, // 全局注入 $t 等方法
});

export const i18n = i18nInstance as unknown as II18nFacade;

export { useI18n } from 'vue-i18n';

export function getLocale(): string {
  return i18n.global.locale.value;
}

export function setLocale(locale: SupportedLocale): void {
  i18n.global.locale.value = locale;
}

/**
 * 供非组件模块使用的翻译函数（便捷封装，等价于 i18n.global.t(key)）。
 */
export function translate(key: string): string {
  return i18n.global.t(key);
}

// ── 语言注册（供插件/子系统统一使用，自动补齐别名） ──
export function registerLocaleMessages(locale: string, messages: Record<string, any>): void {
  i18n.global.mergeLocaleMessage(locale, messages);
  const definition = (SUPPORTED_LOCALES as Record<string, { aliases?: readonly string[] }>)[locale];
  for (const alias of definition?.aliases ?? []) {
    i18n.global.mergeLocaleMessage(alias, messages);
  }
}

// 将 import.meta.glob('./locales/*.json', { eager: true }) 的结果批量注册
export function registerLocaleModules(localeModules: Record<string, any>): void {
  for (const [modulePath, moduleValue] of Object.entries(localeModules)) {
    const fileName = modulePath.split('/').pop() ?? '';
    const locale = fileName.replace(/\.json$/, '');
    if (!locale) continue;
    // 兼容 import.meta.glob 的两种返回形态：{ default } 或直接对象
    const messages = moduleValue?.default ?? moduleValue;
    registerLocaleMessages(locale, messages);
  }
}
