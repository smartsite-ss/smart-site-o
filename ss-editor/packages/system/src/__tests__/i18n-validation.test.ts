// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import zhCN from '../locales/zh-CN.json';
import enUS from '../locales/en-US.json';

function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      keys.push(...getKeys(val as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getAllValues(obj: Record<string, unknown>): string[] {
  const values: string[] = [];
  for (const val of Object.values(obj)) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      values.push(...getAllValues(val as Record<string, unknown>));
    } else if (typeof val === 'string') {
      values.push(val);
    }
  }
  return values;
}

function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const item of arr) {
    if (seen.has(item)) {
      dupes.add(item);
    } else {
      seen.add(item);
    }
  }
  return [...dupes];
}

function hasChineseChars(str: string): boolean {
  return /[\u4e00-\u9fff]/.test(str);
}

const THEME_NAMES = ['light', 'dark', 'techLightBlue', 'techDarkBlue', 'blue', 'highContrast'];
const NAV_KEYS = ['overview', 'projects', 'devices', 'alarms', 'scripts', 'reports', 'settings'];

describe('i18n Validation', () => {
  describe('locale files exist and parse', () => {
    it('zh-CN.json should be valid and have system key', () => {
      expect(zhCN).toBeDefined();
      expect(typeof zhCN).toBe('object');
      expect(zhCN.system).toBeDefined();
    });

    it('en-US.json should be valid and have system key', () => {
      expect(enUS).toBeDefined();
      expect(typeof enUS).toBe('object');
      expect(enUS.system).toBeDefined();
    });
  });

  describe('same key structure', () => {
    it('both locales should have the same top-level keys', () => {
      const zhKeys = Object.keys(zhCN).sort();
      const enKeys = Object.keys(enUS).sort();
      expect(zhKeys).toEqual(enKeys);
    });

    it('both locales should have the same nested key structure', () => {
      const zhKeys = getKeys(zhCN).sort();
      const enKeys = getKeys(enUS).sort();

      const zhSet = new Set(zhKeys);
      const enSet = new Set(enKeys);

      const missingInEN = zhKeys.filter(k => !enSet.has(k));
      const missingInZH = enKeys.filter(k => !zhSet.has(k));

      expect(missingInEN).toEqual([]);
      expect(missingInZH).toEqual([]);
    });
  });

  describe('no empty translations', () => {
    it('zh-CN.json should have no empty or null values', () => {
      const zhValues = getAllValues(zhCN);
      const emptyValues = zhValues.filter(v => v === '' || v === null || v === undefined);
      expect(emptyValues).toEqual([]);
    });

    it('en-US.json should have no empty or null values', () => {
      const enValues = getAllValues(enUS);
      const emptyValues = enValues.filter(v => v === '' || v === null || v === undefined);
      expect(emptyValues).toEqual([]);
    });
  });

  describe('no English in Chinese locale', () => {
    it('zh-CN.json values should contain Chinese characters or mixed content', () => {
      const zhValues = getAllValues(zhCN);
      const pureEnglishValues: string[] = [];

      for (const val of zhValues) {
        if (!hasChineseChars(val) && /^[a-zA-Z0-9\s\-→.,!?()]+$/.test(val)) {
          pureEnglishValues.push(val);
        }
      }

      const allowedEnglish = [
        'Smart Scada', 'Node', 'CPU', '0, 0\n50, 25\n100, 100',
        'Modbus TCP', 'Modbus RTU', 'OPC UA', 'MQTT', 'Siemens S7', 'TID', 'unitId',
        // 版本号/文件名/数据库名等技术标识符
        '1.0.0', 'projectinfo.json', 'system.db', 'event.db',
        // OPC UA 安全策略名称
        'Basic128Rsa15', 'Basic256', 'Basic256Sha256',
        // 协议/技术名称
        'WebSocket', 'JSONPath', 'InfluxDB', 'PDF', 'Excel',
        // 语言名称（语言切换器中显示）
        'English',
        // 通用缩写/单位
        'IP', 'ID', 'MB', 'ENV', 'URL', 'User-Agent',
        // WS 监控/系统配置中的技术术语
        'Socket ID', 'i18n Key', 'Token', 'Bucket', 'API Key',
      ];
      const unallowed = pureEnglishValues.filter(v => !allowedEnglish.includes(v));
      expect(unallowed).toEqual([]);
    });
  });

  describe('brand name consistent', () => {
    it('system.brand should be "Smart Scada" in both locales', () => {
      expect(zhCN.system.brand).toBe('Smart Scada');
      expect(enUS.system.brand).toBe('Smart Scada');
    });
  });

  describe('specific key validation', () => {
    it('system.title should be 数据中台 in zh-CN and "Data Center" in en-US', () => {
      expect(zhCN.system.title).toBe('数据中台');
      expect(enUS.system.title).toBe('Data Center');
    });

    it('system.login.username should be 用户名 in zh-CN and "Username" in en-US', () => {
      expect(zhCN.system.login.username).toBe('用户名');
      expect(enUS.system.login.username).toBe('Username');
    });

    it('system.login.password should be 密码 in zh-CN and "Password" in en-US', () => {
      expect(zhCN.system.login.password).toBe('密码');
      expect(enUS.system.login.password).toBe('Password');
    });
  });

  describe('theme names exist', () => {
    it('zh-CN should have all 6 theme names', () => {
      for (const theme of THEME_NAMES) {
        expect(zhCN.system.layout.theme[theme as keyof typeof zhCN.system.layout.theme]).toBeDefined();
        expect(typeof zhCN.system.layout.theme[theme as keyof typeof zhCN.system.layout.theme]).toBe('string');
      }
    });

    it('en-US should have all 6 theme names', () => {
      for (const theme of THEME_NAMES) {
        expect(enUS.system.layout.theme[theme as keyof typeof enUS.system.layout.theme]).toBeDefined();
        expect(typeof enUS.system.layout.theme[theme as keyof typeof enUS.system.layout.theme]).toBe('string');
      }
    });
  });

  describe('nav structure complete', () => {
    it('zh-CN nav should have all 7 sections', () => {
      for (const key of NAV_KEYS) {
        expect(zhCN.system.nav[key as keyof typeof zhCN.system.nav]).toBeDefined();
        expect(typeof zhCN.system.nav[key as keyof typeof zhCN.system.nav]).toBe('string');
      }
    });

    it('en-US nav should have all 7 sections', () => {
      for (const key of NAV_KEYS) {
        expect(enUS.system.nav[key as keyof typeof enUS.system.nav]).toBeDefined();
        expect(typeof enUS.system.nav[key as keyof typeof enUS.system.nav]).toBe('string');
      }
    });
  });

  describe('no duplicate keys', () => {
    it('zh-CN.json should have no duplicate keys', () => {
      const allKeys = getKeys(zhCN);
      const duplicates = findDuplicates(allKeys);
      expect(duplicates).toEqual([]);
    });

    it('en-US.json should have no duplicate keys', () => {
      const allKeys = getKeys(enUS);
      const duplicates = findDuplicates(allKeys);
      expect(duplicates).toEqual([]);
    });
  });
});