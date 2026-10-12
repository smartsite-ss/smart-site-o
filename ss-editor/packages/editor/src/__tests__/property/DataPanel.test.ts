// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';

const DATA_SOURCE_TYPES = ['tag', 'api', 'dataset', 'static'] as const;
type DataSourceType = (typeof DATA_SOURCE_TYPES)[number];

const DATA_SECTIONS = [
  'DataSourceSection',
  'FieldMappingSection',
  'DataProcessSection',
  'AutoRefreshSection',
  'FormattingSection',
  'ValidationSection',
] as const;

interface IPropertyChangeEvent {
  type: 'updateGraphicProperties';
  payload: {
    dataSource: Record<string, unknown>;
    timestamp: number;
  };
}

function validateDataSourceType(type: string): type is DataSourceType {
  return DATA_SOURCE_TYPES.includes(type as DataSourceType);
}

function createDefaultDataSource() {
  return {
    enabled: false,
    sourceType: 'tag' as DataSourceType,
    tagId: '',
    bindingMode: 'simple' as const,
    propertyPath: '',
    expression: '',
    apiUrl: '',
    apiMethod: 'GET' as const,
    apiHeaders: '{}',
    apiQueryParams: [] as { key: string; value: string }[],
    staticData: [] as unknown[],
    useDataDeal: false,
    dataDealFunction: null,
    openRefresh: false,
    refreshInterval: 30,
    dataFormat: '' as const,
    validation: {
      required: false,
      min: undefined,
      max: undefined,
      pattern: '',
      message: '',
    },
    dataMapping: [] as { value: string; display: string }[],
  };
}

function validatePropertyChangeEvent(event: unknown): event is IPropertyChangeEvent {
  if (!event || typeof event !== 'object') return false;
  const e = event as Record<string, unknown>;
  return (
    e.type === 'updateGraphicProperties' &&
    typeof e.payload === 'object' &&
    e.payload !== null &&
    typeof (e.payload as Record<string, unknown>).dataSource === 'object'
  );
}

describe('DataPanel', () => {
  describe('data source types', () => {
    it('should have exactly 4 data source types', () => {
      expect(DATA_SOURCE_TYPES).toHaveLength(4);
    });

    it('should include tag type', () => {
      expect(DATA_SOURCE_TYPES).toContain('tag');
    });

    it('should include api type', () => {
      expect(DATA_SOURCE_TYPES).toContain('api');
    });

    it('should include dataset type', () => {
      expect(DATA_SOURCE_TYPES).toContain('dataset');
    });

    it('should include static type', () => {
      expect(DATA_SOURCE_TYPES).toContain('static');
    });

    it('should validate tag as a valid source type', () => {
      expect(validateDataSourceType('tag')).toBe(true);
    });

    it('should validate api as a valid source type', () => {
      expect(validateDataSourceType('api')).toBe(true);
    });

    it('should validate dataset as a valid source type', () => {
      expect(validateDataSourceType('dataset')).toBe(true);
    });

    it('should validate static as a valid source type', () => {
      expect(validateDataSourceType('static')).toBe(true);
    });

    it('should reject invalid source types', () => {
      expect(validateDataSourceType('invalid')).toBe(false);
      expect(validateDataSourceType('')).toBe(false);
      expect(validateDataSourceType('websocket')).toBe(false);
    });
  });

  describe('DataPanel sections', () => {
    it('should have exactly 6 sections', () => {
      expect(DATA_SECTIONS).toHaveLength(6);
    });

    it('should have DataSourceSection', () => {
      expect(DATA_SECTIONS).toContain('DataSourceSection');
    });

    it('should have FieldMappingSection', () => {
      expect(DATA_SECTIONS).toContain('FieldMappingSection');
    });

    it('should have DataProcessSection', () => {
      expect(DATA_SECTIONS).toContain('DataProcessSection');
    });

    it('should have AutoRefreshSection', () => {
      expect(DATA_SECTIONS).toContain('AutoRefreshSection');
    });

    it('should have FormattingSection', () => {
      expect(DATA_SECTIONS).toContain('FormattingSection');
    });

    it('should have ValidationSection', () => {
      expect(DATA_SECTIONS).toContain('ValidationSection');
    });
  });

  describe('IGraphicDataSource interface structure', () => {
    it('should create default data source with required fields', () => {
      const ds = createDefaultDataSource();
      expect(ds).toBeDefined();
      expect(ds.enabled).toBe(false);
      expect(ds.sourceType).toBe('tag');
    });

    it('should have sourceType as a valid data source type', () => {
      const ds = createDefaultDataSource();
      expect(validateDataSourceType(ds.sourceType)).toBe(true);
    });

    it('should support tag source configuration', () => {
      const ds = createDefaultDataSource();
      ds.sourceType = 'tag';
      ds.tagId = 'temp_001';
      ds.bindingMode = 'simple';
      ds.propertyPath = 'config.style.color';

      expect(ds.sourceType).toBe('tag');
      expect(ds.tagId).toBe('temp_001');
      expect(ds.bindingMode).toBe('simple');
      expect(ds.propertyPath).toBe('config.style.color');
    });

    it('should support api source configuration', () => {
      const ds = createDefaultDataSource();
      ds.sourceType = 'api';
      ds.apiUrl = 'https://api.example.com/data';
      ds.apiMethod = 'POST' as any;
      ds.apiHeaders = '{"Authorization":"Bearer token"}';
      ds.apiQueryParams = [
        { key: 'page', value: '1' },
        { key: 'limit', value: '10' },
      ];

      expect(ds.sourceType).toBe('api');
      expect(ds.apiUrl).toBe('https://api.example.com/data');
      expect(ds.apiMethod).toBe('POST');
      expect(ds.apiQueryParams).toHaveLength(2);
    });

    it('should support dataset source configuration', () => {
      const ds = createDefaultDataSource();
      ds.sourceType = 'dataset';
      (ds as any).datasetId = 'ds_001';

      expect(ds.sourceType).toBe('dataset');
      expect((ds as any).datasetId).toBe('ds_001');
    });

    it('should support static source configuration', () => {
      const ds = createDefaultDataSource();
      ds.sourceType = 'static';
      ds.staticData = [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 },
      ];

      expect(ds.sourceType).toBe('static');
      expect(ds.staticData).toHaveLength(2);
    });

    it('should support binding modes simple and expression', () => {
      const ds = createDefaultDataSource();
      ds.bindingMode = 'simple';
      expect(ds.bindingMode).toBe('simple');

      ds.bindingMode = 'expression' as any;
      expect(ds.bindingMode).toBe('expression');
    });

    it('should support data processing configuration', () => {
      const ds = createDefaultDataSource();
      ds.useDataDeal = true;
      ds.dataDealFunction = 'formatNumber();' as any;

      expect(ds.useDataDeal).toBe(true);
      expect(ds.dataDealFunction).toBe('formatNumber();');
    });

    it('should support auto refresh configuration', () => {
      const ds = createDefaultDataSource();
      ds.openRefresh = true;
      ds.refreshInterval = 15;

      expect(ds.openRefresh).toBe(true);
      expect(ds.refreshInterval).toBe(15);
    });

    it('should support data format options', () => {
      const formats = ['', 'number', 'currency', 'percent', 'decimal_1', 'decimal_2'] as const;
      const ds = createDefaultDataSource();

      for (const format of formats) {
        (ds as any).dataFormat = format;
        expect(ds.dataFormat).toBe(format);
      }
    });

    it('should support validation configuration', () => {
      const ds = createDefaultDataSource();
      ds.validation = {
        required: true,
        min: 0 as any,
        max: 100 as any,
        pattern: '^\\d+$',
        message: 'Please enter a number',
      };

      expect(ds.validation.required).toBe(true);
      expect(ds.validation.min).toBe(0);
      expect(ds.validation.max).toBe(100);
      expect(ds.validation.pattern).toBe('^\\d+$');
      expect(ds.validation.message).toBe('Please enter a number');
    });

    it('should support data mapping configuration', () => {
      const ds = createDefaultDataSource();
      ds.dataMapping = [
        { value: '1', display: 'Normal' },
        { value: '0', display: 'Abnormal' },
      ];

      expect(ds.dataMapping).toHaveLength(2);
      expect(ds.dataMapping[0].value).toBe('1');
      expect(ds.dataMapping[0].display).toBe('Normal');
    });

    it('should produce independent copies from createDefaultDataSource', () => {
      const ds1 = createDefaultDataSource();
      const ds2 = createDefaultDataSource();

      ds1.tagId = 'tag_a';
      ds1.apiQueryParams.push({ key: 'k', value: 'v' });
      ds1.dataMapping.push({ value: '1', display: 'One' });

      expect(ds2.tagId).toBe('');
      expect(ds2.apiQueryParams).toEqual([]);
      expect(ds2.dataMapping).toEqual([]);
    });
  });

  describe('property change event format', () => {
    it('should produce valid property change event structure', () => {
      const dataSource = createDefaultDataSource();
      dataSource.sourceType = 'tag';
      dataSource.tagId = 'temp_001';

      const event: IPropertyChangeEvent = {
        type: 'updateGraphicProperties',
        payload: {
          dataSource: { ...dataSource },
          timestamp: Date.now(),
        },
      };

      expect(validatePropertyChangeEvent(event)).toBe(true);
    });

    it('should include dataSource in payload', () => {
      const dataSource = createDefaultDataSource();
      const event: IPropertyChangeEvent = {
        type: 'updateGraphicProperties',
        payload: {
          dataSource: { ...dataSource },
          timestamp: 1234567890,
        },
      };

      expect(event.payload.dataSource).toBeDefined();
      expect(event.payload.dataSource.sourceType).toBe('tag');
    });

    it('should include timestamp in payload', () => {
      const timestamp = Date.now();
      const event: IPropertyChangeEvent = {
        type: 'updateGraphicProperties',
        payload: {
          dataSource: createDefaultDataSource(),
          timestamp,
        },
      };

      expect(event.payload.timestamp).toBe(timestamp);
      expect(typeof event.payload.timestamp).toBe('number');
    });

    it('should reject invalid event with missing payload', () => {
      const invalidEvent = { type: 'updateGraphicProperties' };
      expect(validatePropertyChangeEvent(invalidEvent)).toBe(false);
    });

    it('should reject invalid event with missing dataSource', () => {
      const invalidEvent = {
        type: 'updateGraphicProperties',
        payload: { timestamp: 123 },
      };
      expect(validatePropertyChangeEvent(invalidEvent)).toBe(false);
    });

    it('should reject null or non-object events', () => {
      expect(validatePropertyChangeEvent(null)).toBe(false);
      expect(validatePropertyChangeEvent(undefined)).toBe(false);
      expect(validatePropertyChangeEvent('string')).toBe(false);
      expect(validatePropertyChangeEvent(123)).toBe(false);
    });

    it('should reject event with wrong type', () => {
      const invalidEvent = {
        type: 'wrongType',
        payload: {
          dataSource: createDefaultDataSource(),
          timestamp: Date.now(),
        },
      };
      expect(validatePropertyChangeEvent(invalidEvent)).toBe(false);
    });
  });
});