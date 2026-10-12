// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  CONFIG_METADATA_REGISTRY,
  CONFIG_CATEGORY_INFO,
  PENDING_RESTART_KEY,
  ConfigMetadataHelper,
  ConfigCategory,
} from '../config/config-metadata';

describe('ConfigMetadata', () => {
  describe('CONFIG_METADATA_REGISTRY', () => {
    it('TC-META-001: should have at least 35 config items', () => {
      expect(CONFIG_METADATA_REGISTRY.length).toBeGreaterThanOrEqual(35);
    });

    it('TC-META-002: should have unique keys', () => {
      const keys = CONFIG_METADATA_REGISTRY.map((m) => m.key);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it('TC-META-003: should have all required fields', () => {
      for (const meta of CONFIG_METADATA_REGISTRY) {
        expect(meta.key).toBeDefined();
        expect(meta.category).toBeDefined();
        expect(meta.description).toBeDefined();
        expect(meta.type).toBeDefined();
        expect(typeof meta.sensitive).toBe('boolean');
        expect(typeof meta.editable).toBe('boolean');
        expect(typeof meta.hotReloadable).toBe('boolean');
        expect(typeof meta.restartRequired).toBe('boolean');
        expect(typeof meta.envFile).toBe('boolean');
      }
    });

    it('TC-META-004: should include PORT in application category', () => {
      const port = CONFIG_METADATA_REGISTRY.find((m) => m.key === 'PORT');
      expect(port).toBeDefined();
      expect(port!.category).toBe('application');
      expect(port!.type).toBe('number');
      expect(port!.restartRequired).toBe(true);
      expect(port!.hotReloadable).toBe(false);
      expect(port!.validation?.min).toBe(1);
      expect(port!.validation?.max).toBe(65535);
    });

    it('TC-META-005: should mark JWT_SECRET as sensitive and restart-required', () => {
      const jwt = CONFIG_METADATA_REGISTRY.find((m) => m.key === 'JWT_SECRET');
      expect(jwt).toBeDefined();
      expect(jwt!.sensitive).toBe(true);
      expect(jwt!.restartRequired).toBe(true);
      expect(jwt!.type).toBe('password');
    });

    it('TC-META-006: should mark MEMORY_WARN_PERCENT as hot-reloadable', () => {
      const mem = CONFIG_METADATA_REGISTRY.find((m) => m.key === 'MEMORY_WARN_PERCENT');
      expect(mem).toBeDefined();
      expect(mem!.hotReloadable).toBe(true);
      expect(mem!.restartRequired).toBe(false);
    });

    it('TC-META-007: should mark SYSTEM_CONFIG_ENCRYPTION_KEY as non-editable', () => {
      const encKey = CONFIG_METADATA_REGISTRY.find((m) => m.key === 'SYSTEM_CONFIG_ENCRYPTION_KEY');
      expect(encKey).toBeDefined();
      expect(encKey!.editable).toBe(false);
      expect(encKey!.envFile).toBe(false);
    });
  });

  describe('CONFIG_CATEGORY_INFO', () => {
    it('TC-META-010: should have all 9 categories', () => {
      const categories = Object.keys(CONFIG_CATEGORY_INFO);
      expect(categories.length).toBe(9);
      expect(categories).toContain('application');
      expect(categories).toContain('database');
      expect(categories).toContain('security');
      expect(categories).toContain('collection');
      expect(categories).toContain('communication');
      expect(categories).toContain('storage');
      expect(categories).toContain('logging');
      expect(categories).toContain('i18n');
      expect(categories).toContain('monitoring');
    });

    it('TC-META-011: should have label, icon, order for each category', () => {
      for (const key of Object.keys(CONFIG_CATEGORY_INFO)) {
        const info = CONFIG_CATEGORY_INFO[key as ConfigCategory];
        expect(info.label).toBeDefined();
        expect(info.icon).toBeDefined();
        expect(typeof info.order).toBe('number');
      }
    });
  });

  describe('ConfigMetadataHelper', () => {
    describe('getByKey', () => {
      it('TC-META-020: should return metadata for existing key', () => {
        const meta = ConfigMetadataHelper.getByKey('PORT');
        expect(meta).toBeDefined();
        expect(meta!.key).toBe('PORT');
      });

      it('TC-META-021: should return undefined for non-existing key', () => {
        const meta = ConfigMetadataHelper.getByKey('NON_EXISTING_KEY');
        expect(meta).toBeUndefined();
      });
    });

    describe('getAll', () => {
      it('TC-META-030: should return sorted by category order then key', () => {
        const all = ConfigMetadataHelper.getAll();
        expect(all.length).toBe(CONFIG_METADATA_REGISTRY.length);

        // First item should be from application (order=10)
        expect(all[0].category).toBe('application');
      });
    });

    describe('groupByCategory', () => {
      it('TC-META-040: should group configs by category', () => {
        const grouped = ConfigMetadataHelper.groupByCategory();
        expect(grouped.application).toBeDefined();
        expect(grouped.application.length).toBeGreaterThan(0);
        expect(grouped.security).toBeDefined();
        expect(grouped.monitoring).toBeDefined();
      });

      it('TC-META-041: all items should be in correct group', () => {
        const grouped = ConfigMetadataHelper.groupByCategory();
        for (const item of grouped.application) {
          expect(item.category).toBe('application');
        }
      });
    });

    describe('getRestartRequiredKeys', () => {
      it('TC-META-050: should return keys that require restart', () => {
        const keys = ConfigMetadataHelper.getRestartRequiredKeys();
        expect(keys).toContain('PORT');
        expect(keys).toContain('JWT_SECRET');
        expect(keys).toContain('DB_TYPE');
      });

      it('TC-META-051: should not include hot-reloadable only configs', () => {
        const keys = ConfigMetadataHelper.getRestartRequiredKeys();
        expect(keys).not.toContain('MEMORY_WARN_PERCENT');
        expect(keys).not.toContain('LOG_LEVEL');
      });
    });

    describe('validateValue', () => {
      it('TC-META-060: should reject non-editable config', () => {
        const meta = ConfigMetadataHelper.getByKey('SYSTEM_CONFIG_ENCRYPTION_KEY')!;
        const result = ConfigMetadataHelper.validateValue(meta, 'new-value');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('不允许');
      });

      it('TC-META-061: should validate enum value', () => {
        const meta = ConfigMetadataHelper.getByKey('NODE_ENV')!;
        expect(ConfigMetadataHelper.validateValue(meta, 'development').valid).toBe(true);
        expect(ConfigMetadataHelper.validateValue(meta, 'production').valid).toBe(true);
        const invalid = ConfigMetadataHelper.validateValue(meta, 'staging');
        expect(invalid.valid).toBe(false);
        expect(invalid.error).toContain('development');
      });

      it('TC-META-062: should validate number value', () => {
        const meta = ConfigMetadataHelper.getByKey('PORT')!;
        expect(ConfigMetadataHelper.validateValue(meta, '4000').valid).toBe(true);
        expect(ConfigMetadataHelper.validateValue(meta, '0').valid).toBe(false);
        expect(ConfigMetadataHelper.validateValue(meta, '70000').valid).toBe(false);
        expect(ConfigMetadataHelper.validateValue(meta, 'abc').valid).toBe(false);
      });

      it('TC-META-063: should validate boolean value', () => {
        const meta = ConfigMetadataHelper.getByKey('AUTO_START_BASE_SERVICES')!;
        expect(ConfigMetadataHelper.validateValue(meta, 'true').valid).toBe(true);
        expect(ConfigMetadataHelper.validateValue(meta, 'false').valid).toBe(true);
        expect(ConfigMetadataHelper.validateValue(meta, 'yes').valid).toBe(false);
      });

      it('TC-META-064: should validate pattern for JWT_SECRET', () => {
        const meta = ConfigMetadataHelper.getByKey('JWT_SECRET')!;
        expect(ConfigMetadataHelper.validateValue(meta, 'short').valid).toBe(false);
        expect(
          ConfigMetadataHelper.validateValue(meta, 'this-is-a-long-enough-secret-key').valid,
        ).toBe(true);
      });

      it('TC-META-065: should validate number range for MEMORY_WARN_PERCENT', () => {
        const meta = ConfigMetadataHelper.getByKey('MEMORY_WARN_PERCENT')!;
        expect(ConfigMetadataHelper.validateValue(meta, '50').valid).toBe(true);
        expect(ConfigMetadataHelper.validateValue(meta, '0').valid).toBe(false);
        expect(ConfigMetadataHelper.validateValue(meta, '101').valid).toBe(false);
      });
    });
  });

  describe('PENDING_RESTART_KEY', () => {
    it('TC-META-070: should be defined', () => {
      expect(PENDING_RESTART_KEY).toBe('__pending_restart__');
    });
  });
});
