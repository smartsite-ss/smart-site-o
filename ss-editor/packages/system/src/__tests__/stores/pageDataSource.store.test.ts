// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePageDataSourceStore } from '../../stores/pageDataSource.store';
import type { DataSourceRecord } from '../../api/modules/dataSource.api';

const mockDataSource: DataSourceRecord = {
  id: 'ds-1',
  projectId: 'proj-1',
  type: 'static',
  name: 'Test Source',
  enabled: true,
  status: 'connected',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const mockVariable = {
  tagId: 'tag-1',
  tagName: 'Temperature',
  dataSourceId: 'ds-1',
  dataType: 'float' as const,
};

const mockBinding = {
  graphicId: 'gfx-1',
  graphicName: 'Gauge',
  graphicType: 'gauge',
  tagId: 'tag-1',
};

describe('usePageDataSourceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // ====================================================================
  // 1. initial state (Initial State)
  // ====================================================================
  describe('initial state', () => {
    it('currentGroup should be null', () => {
      const store = usePageDataSourceStore();
      expect(store.currentGroup).toBeNull();
    });

    it('selectedGraphicId should be null', () => {
      const store = usePageDataSourceStore();
      expect(store.selectedGraphicId).toBeNull();
    });

    it('loading should be false', () => {
      const store = usePageDataSourceStore();
      expect(store.loading).toBe(false);
    });

    it('error should be null', () => {
      const store = usePageDataSourceStore();
      expect(store.error).toBeNull();
    });

    it('currentFetchResult should be null', () => {
      const store = usePageDataSourceStore();
      expect(store.currentFetchResult).toBeNull();
    });

    it('fetchLoading should be false', () => {
      const store = usePageDataSourceStore();
      expect(store.fetchLoading).toBe(false);
    });

    it('fetchError should be null', () => {
      const store = usePageDataSourceStore();
      expect(store.fetchError).toBeNull();
    });

    it('computed dataSources should return empty array', () => {
      const store = usePageDataSourceStore();
      expect(store.dataSources).toEqual([]);
    });

    it('computed variables should return empty array', () => {
      const store = usePageDataSourceStore();
      expect(store.variables).toEqual([]);
    });

    it('computed graphicBindings should return empty array', () => {
      const store = usePageDataSourceStore();
      expect(store.graphicBindings).toEqual([]);
    });

    it('computed selectedGraphicBinding should return null', () => {
      const store = usePageDataSourceStore();
      expect(store.selectedGraphicBinding).toBeNull();
    });

    it('computed variablesByDataSource should return empty object', () => {
      const store = usePageDataSourceStore();
      expect(store.variablesByDataSource).toEqual({});
    });

    it('computed unbindedGraphicIds should return empty array', () => {
      const store = usePageDataSourceStore();
      expect(store.unbindedGraphicIds).toEqual([]);
    });
  });

  // ====================================================================
  // 2. Group initialization (initGroup / loadGroup / clearGroup)
  // ====================================================================
  describe('initGroup', () => {
    it('should create a new group with given pageId and empty arrays', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');

      expect(store.currentGroup).not.toBeNull();
      expect(store.currentGroup!.pageId).toBe('page-1');
      expect(store.currentGroup!.dataSources).toEqual([]);
      expect(store.currentGroup!.variables).toEqual([]);
      expect(store.currentGroup!.graphicBindings).toEqual([]);
    });

    it('should overwrite existing group when called again', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource(mockDataSource);
      store.initGroup('page-2');

      expect(store.currentGroup!.pageId).toBe('page-2');
      expect(store.currentGroup!.dataSources).toEqual([]);
    });
  });

  describe('loadGroup', () => {
    it('should load specified group data', () => {
      const store = usePageDataSourceStore();
      const group = {
        pageId: 'page-1',
        dataSources: [mockDataSource],
        variables: [mockVariable],
        graphicBindings: [mockBinding],
      };
      store.loadGroup(group);

      expect(store.currentGroup!.pageId).toBe('page-1');
      expect(store.currentGroup!.dataSources).toHaveLength(1);
      expect(store.currentGroup!.variables).toHaveLength(1);
      expect(store.currentGroup!.graphicBindings).toHaveLength(1);
    });

    it('should create a copy of the group (not reference)', () => {
      const store = usePageDataSourceStore();
      const group = {
        pageId: 'page-1',
        dataSources: [mockDataSource],
        variables: [],
        graphicBindings: [],
      };
      store.loadGroup(group);
      group.pageId = 'modified';

      expect(store.currentGroup!.pageId).toBe('page-1');
    });
  });

  describe('clearGroup', () => {
    it('should set currentGroup to null', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      expect(store.currentGroup).not.toBeNull();

      store.clearGroup();
      expect(store.currentGroup).toBeNull();
    });

    it('should be safe to call when group is already null', () => {
      const store = usePageDataSourceStore();
      expect(() => store.clearGroup()).not.toThrow();
      expect(store.currentGroup).toBeNull();
    });
  });

  // ====================================================================
  // 3. DataSource CRUD
  // ====================================================================
  describe('addDataSource', () => {
    it('should add a data source to the group', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource(mockDataSource);

      expect(store.dataSources).toHaveLength(1);
      expect(store.dataSources[0].id).toBe('ds-1');
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() => store.addDataSource(mockDataSource)).not.toThrow();
      expect(store.currentGroup).toBeNull();
    });

    it('should append multiple data sources', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource(mockDataSource);
      store.addDataSource({ ...mockDataSource, id: 'ds-2' });

      expect(store.dataSources).toHaveLength(2);
    });
  });

  describe('updateDataSource', () => {
    it('should update specified data source properties', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource(mockDataSource);
      store.updateDataSource('ds-1', { name: 'Updated Source' });

      expect(store.dataSources[0].name).toBe('Updated Source');
    });

    it('should not throw for non-existent id', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      expect(() => store.updateDataSource('nonexistent', { name: 'X' })).not.toThrow();
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() => store.updateDataSource('ds-1', { name: 'X' })).not.toThrow();
    });
  });

  describe('removeDataSource', () => {
    it('should remove data source from the group', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource(mockDataSource);
      store.addDataSource({ ...mockDataSource, id: 'ds-2' });

      store.removeDataSource('ds-1');
      expect(store.dataSources).toHaveLength(1);
      expect(store.dataSources[0].id).toBe('ds-2');
    });

    it('should also remove variables belonging to the data source', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource(mockDataSource);
      store.addVariables([mockVariable]);

      store.removeDataSource('ds-1');
      expect(store.variables).toHaveLength(0);
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() => store.removeDataSource('ds-1')).not.toThrow();
    });
  });

  describe('getDataSourceById', () => {
    it('should return the data source with given id', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource(mockDataSource);

      const result = store.getDataSourceById('ds-1');
      expect(result).toBeDefined();
      expect(result!.id).toBe('ds-1');
    });

    it('should return undefined for non-existent id', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');

      const result = store.getDataSourceById('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return undefined when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      const result = store.getDataSourceById('ds-1');
      expect(result).toBeUndefined();
    });
  });

  // ====================================================================
  // 4. Graphic selection (selectGraphic)
  // ====================================================================
  describe('selectGraphic', () => {
    it('should set selectedGraphicId', () => {
      const store = usePageDataSourceStore();
      store.selectGraphic('gfx-1');
      expect(store.selectedGraphicId).toBe('gfx-1');
    });

    it('should clear selectedGraphicId when null is passed', () => {
      const store = usePageDataSourceStore();
      store.selectGraphic('gfx-1');
      store.selectGraphic(null);
      expect(store.selectedGraphicId).toBeNull();
    });
  });

  // ====================================================================
  // 5. Variable management
  // ====================================================================
  describe('addVariables', () => {
    it('should add variables to the group', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addVariables([mockVariable]);

      expect(store.variables).toHaveLength(1);
      expect(store.variables[0].tagId).toBe('tag-1');
    });

    it('should not add duplicate variables with same tagId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addVariables([mockVariable]);
      store.addVariables([mockVariable]);

      expect(store.variables).toHaveLength(1);
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() => store.addVariables([mockVariable])).not.toThrow();
    });
  });

  describe('updateVariableValue', () => {
    it('should update variable value and quality', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addVariables([mockVariable]);

      store.updateVariableValue('tag-1', 42, 'good');
      const v = store.getVariableByTagId('tag-1');
      expect(v!.currentValue).toBe(42);
      expect(v!.quality).toBe('good');
    });

    it('should set lastUpdate timestamp', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addVariables([mockVariable]);

      const before = Date.now();
      store.updateVariableValue('tag-1', 42);
      const v = store.getVariableByTagId('tag-1');
      expect(v!.lastUpdate).toBeGreaterThanOrEqual(before);
    });

    it('should keep existing quality if not provided', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addVariables([{ ...mockVariable, quality: 'good' }]);

      store.updateVariableValue('tag-1', 100);
      const v = store.getVariableByTagId('tag-1');
      expect(v!.quality).toBe('good');
    });

    it('should not throw for non-existent tagId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      expect(() => store.updateVariableValue('nonexistent', 0)).not.toThrow();
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() => store.updateVariableValue('tag-1', 0)).not.toThrow();
    });
  });

  describe('removeVariable', () => {
    it('should remove variable and associated bindings', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addVariables([mockVariable]);
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');

      store.removeVariable('tag-1');

      expect(store.variables).toHaveLength(0);
      expect(store.graphicBindings).toHaveLength(0);
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() => store.removeVariable('tag-1')).not.toThrow();
    });
  });

  describe('getVariableByTagId', () => {
    it('should return variable by tagId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addVariables([mockVariable]);

      const result = store.getVariableByTagId('tag-1');
      expect(result).toBeDefined();
      expect(result!.tagId).toBe('tag-1');
    });

    it('should return undefined for non-existent tagId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');

      const result = store.getVariableByTagId('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return undefined when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      const result = store.getVariableByTagId('tag-1');
      expect(result).toBeUndefined();
    });
  });

  describe('getVariablesByDataSourceId', () => {
    it('should return variables filtered by dataSourceId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addVariables([
        mockVariable,
        { ...mockVariable, tagId: 'tag-2', dataSourceId: 'ds-2' },
      ]);

      const result = store.getVariablesByDataSourceId('ds-1');
      expect(result).toHaveLength(1);
      expect(result[0].tagId).toBe('tag-1');
    });

    it('should return empty array for non-existent dataSourceId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');

      const result = store.getVariablesByDataSourceId('nonexistent');
      expect(result).toEqual([]);
    });

    it('should return empty array when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      const result = store.getVariablesByDataSourceId('ds-1');
      expect(result).toEqual([]);
    });
  });

  // ====================================================================
  // 6. Graphic binding
  // ====================================================================
  describe('bindGraphicToVariable', () => {
    it('should create a new binding', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');

      expect(store.graphicBindings).toHaveLength(1);
      expect(store.graphicBindings[0].graphicId).toBe('gfx-1');
      expect(store.graphicBindings[0].graphicName).toBe('Gauge');
      expect(store.graphicBindings[0].graphicType).toBe('gauge');
      expect(store.graphicBindings[0].tagId).toBe('tag-1');
    });

    it('should update existing binding for same graphicId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');
      store.bindGraphicToVariable('gfx-1', 'Updated', 'meter', 'tag-2');

      expect(store.graphicBindings).toHaveLength(1);
      expect(store.graphicBindings[0].graphicName).toBe('Updated');
      expect(store.graphicBindings[0].graphicType).toBe('meter');
      expect(store.graphicBindings[0].tagId).toBe('tag-2');
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() =>
        store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1'),
      ).not.toThrow();
    });
  });

  describe('bindGraphicToDataSource', () => {
    it('should create a new binding with dataSourceId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToDataSource('gfx-1', 'Chart', 'chart', 'ds-1');

      expect(store.graphicBindings).toHaveLength(1);
      expect(store.graphicBindings[0].dataSourceId).toBe('ds-1');
      expect(store.graphicBindings[0].tagId).toBe('ds-1');
    });

    it('should update existing binding for same graphicId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToDataSource('gfx-1', 'Chart', 'chart', 'ds-1');
      store.bindGraphicToDataSource('gfx-1', 'Updated', 'line', 'ds-2');

      expect(store.graphicBindings).toHaveLength(1);
      expect(store.graphicBindings[0].graphicName).toBe('Updated');
      expect(store.graphicBindings[0].dataSourceId).toBe('ds-2');
      expect(store.graphicBindings[0].tagId).toBe('ds-2');
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() =>
        store.bindGraphicToDataSource('gfx-1', 'Chart', 'chart', 'ds-1'),
      ).not.toThrow();
    });
  });

  describe('unbindGraphic', () => {
    it('should remove binding for given graphicId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');
      store.bindGraphicToVariable('gfx-2', 'Meter', 'meter', 'tag-2');

      store.unbindGraphic('gfx-1');
      expect(store.graphicBindings).toHaveLength(1);
      expect(store.graphicBindings[0].graphicId).toBe('gfx-2');
    });

    it('should not throw for non-existent graphicId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      expect(() => store.unbindGraphic('nonexistent')).not.toThrow();
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() => store.unbindGraphic('gfx-1')).not.toThrow();
    });
  });

  describe('getBindingByGraphicId', () => {
    it('should return binding for given graphicId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');

      const binding = store.getBindingByGraphicId('gfx-1');
      expect(binding).toBeDefined();
      expect(binding!.graphicId).toBe('gfx-1');
    });

    it('should return undefined for non-existent graphicId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');

      const binding = store.getBindingByGraphicId('nonexistent');
      expect(binding).toBeUndefined();
    });

    it('should return undefined when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      const binding = store.getBindingByGraphicId('gfx-1');
      expect(binding).toBeUndefined();
    });
  });

  describe('getBindingsByTagId', () => {
    it('should return all bindings for given tagId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');
      store.bindGraphicToVariable('gfx-2', 'Meter', 'meter', 'tag-1');
      store.bindGraphicToVariable('gfx-3', 'Chart', 'chart', 'tag-2');

      const bindings = store.getBindingsByTagId('tag-1');
      expect(bindings).toHaveLength(2);
    });

    it('should return empty array for non-existent tagId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');

      const bindings = store.getBindingsByTagId('nonexistent');
      expect(bindings).toEqual([]);
    });

    it('should return empty array when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      const bindings = store.getBindingsByTagId('tag-1');
      expect(bindings).toEqual([]);
    });
  });

  describe('updateBindingScripts', () => {
    it('should update filterScript and driverScript', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');
      store.updateBindingScripts('gfx-1', {
        filterScript: 'value > 10',
        driverScript: 'return value * 2',
      });

      const binding = store.getBindingByGraphicId('gfx-1');
      expect(binding!.filterScript).toBe('value > 10');
      expect(binding!.driverScript).toBe('return value * 2');
    });

    it('should only update provided script fields', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');
      store.updateBindingScripts('gfx-1', { filterScript: 'new filter' });

      const binding = store.getBindingByGraphicId('gfx-1');
      expect(binding!.filterScript).toBe('new filter');
      expect(binding!.driverScript).toBeUndefined();
    });

    it('should not throw for non-existent graphicId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      expect(() =>
        store.updateBindingScripts('nonexistent', { filterScript: 'x' }),
      ).not.toThrow();
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() =>
        store.updateBindingScripts('gfx-1', { filterScript: 'x' }),
      ).not.toThrow();
    });
  });

  describe('updateBindingExecutionStatus', () => {
    it('should update lastExecution on binding', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');
      const before = Date.now();
      store.updateBindingExecutionStatus('gfx-1', true, 42);

      const binding = store.getBindingByGraphicId('gfx-1');
      expect(binding!.lastExecution).toBeDefined();
      expect(binding!.lastExecution!.success).toBe(true);
      expect(binding!.lastExecution!.elapsed).toBe(42);
      expect(binding!.lastExecution!.timestamp).toBeGreaterThanOrEqual(before);
    });

    it('should store failed execution status', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');
      store.updateBindingExecutionStatus('gfx-1', false, 0);

      const binding = store.getBindingByGraphicId('gfx-1');
      expect(binding!.lastExecution!.success).toBe(false);
      expect(binding!.lastExecution!.elapsed).toBe(0);
    });

    it('should not throw for non-existent graphicId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      expect(() =>
        store.updateBindingExecutionStatus('nonexistent', true, 10),
      ).not.toThrow();
    });

    it('should not throw when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      expect(() =>
        store.updateBindingExecutionStatus('gfx-1', true, 10),
      ).not.toThrow();
    });
  });

  describe('getUnboundGraphics', () => {
    it('should return graphics not present in bindings', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');

      const allGraphics = [
        { id: 'gfx-1', name: 'Gauge', type: 'gauge' },
        { id: 'gfx-2', name: 'Meter', type: 'meter' },
      ];

      const unbound = store.getUnboundGraphics(allGraphics);
      expect(unbound).toHaveLength(1);
      expect(unbound[0].id).toBe('gfx-2');
    });

    it('should return all graphics when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      const allGraphics = [
        { id: 'gfx-1', name: 'Gauge', type: 'gauge' },
      ];

      const unbound = store.getUnboundGraphics(allGraphics);
      expect(unbound).toHaveLength(1);
    });
  });

  // ====================================================================
  // 7. Computed properties
  // ====================================================================
  describe('selectedGraphicBinding', () => {
    it('should return binding for selected graphic', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');
      store.selectGraphic('gfx-1');

      expect(store.selectedGraphicBinding).not.toBeNull();
      expect(store.selectedGraphicBinding!.graphicId).toBe('gfx-1');
    });

    it('should return null when no graphic is selected', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.bindGraphicToVariable('gfx-1', 'Gauge', 'gauge', 'tag-1');

      expect(store.selectedGraphicBinding).toBeNull();
    });

    it('should return null when selected graphic has no binding', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.selectGraphic('gfx-1');

      expect(store.selectedGraphicBinding).toBeNull();
    });

    it('should return null when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      store.selectGraphic('gfx-1');
      expect(store.selectedGraphicBinding).toBeNull();
    });
  });

  describe('variablesByDataSource', () => {
    it('should group variables by dataSourceId', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addVariables([
        mockVariable,
        { ...mockVariable, tagId: 'tag-2', dataSourceId: 'ds-1' },
        { ...mockVariable, tagId: 'tag-3', dataSourceId: 'ds-2' },
      ]);

      const grouped = store.variablesByDataSource;
      expect(grouped['ds-1']).toHaveLength(2);
      expect(grouped['ds-2']).toHaveLength(1);
    });

    it('should return empty object when no variables', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');

      expect(store.variablesByDataSource).toEqual({});
    });
  });

  // ====================================================================
  // 8. Data fetching (fetchDataSourceData)
  // ====================================================================
  describe('fetchDataSourceData', () => {
    it('should return error for unknown dataSourceId', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');

      const result = await store.fetchDataSourceData('nonexistent');
      expect(result.error).toContain('not found');
      expect(result.errorType).toBeDefined();
    });

    it('should set fetchError and currentFetchResult on unknown source', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');

      await store.fetchDataSourceData('nonexistent');
      expect(store.fetchError).toContain('not found');
      expect(store.currentFetchResult).not.toBeNull();
      expect(store.currentFetchResult!.error).toContain('not found');
    });

    it('should handle static type with properties.variables', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'static',
        properties: {
          variables: [
            { tagId: 't1', value: 100, dataType: 'int' },
            { tagId: 't2', value: 'hello', dataType: 'string' },
          ],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.sourceType).toBe('static');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].tagId).toBe('t1');
      expect(result.items[0].value).toBe(100);
      expect(result.items[1].tagId).toBe('t2');
    });

    it('should handle static type with empty variables', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'static',
        properties: {},
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(0);
    });

    it('should handle api type without url (fallback to config)', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        properties: { key: 'value' },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].tagId).toBe('config');
    });

    it('should handle api type with successful fetch and fieldMappings', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { temperature: 25.5, humidity: 60 } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
        properties: {
          fieldMappings: [
            { tagId: 'temp', jsonPath: 'temperature', scale: 1, offset: 0 },
            { tagId: 'humid', jsonPath: 'humidity' },
          ],
        },
        dataPath: 'data',
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].tagId).toBe('temp');
      expect(result.items[0].value).toBe(25.5);
      expect(result.items[1].tagId).toBe('humid');
      expect(result.items[1].value).toBe(60);

      vi.unstubAllGlobals();
    });

    it('should handle api type with scale and offset', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: 10 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
        properties: {
          fieldMappings: [
            { tagId: 'v1', jsonPath: 'value', scale: 2, offset: 5 },
          ],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items[0].value).toBe(25);

      vi.unstubAllGlobals();
    });

    it('should handle api type with POST method and body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'ok' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
        method: 'POST',
        body: { query: 'test' },
        properties: {},
      });

      const _result = await store.fetchDataSourceData('ds-1');
      expect(mockFetch).toHaveBeenCalled();
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ query: 'test' });

      vi.unstubAllGlobals();
    });

    it('should handle api type fetch failure (network error)', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].tagId).toBe('error');
      expect(result.items[0].quality).toBe('bad');
      expect(result.rawData).toHaveProperty('errorType', 'network');

      vi.unstubAllGlobals();
    });

    it('should handle api type with array response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ a: 1 }, { b: 2 }]),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].tagId).toBe('api_item_0');

      vi.unstubAllGlobals();
    });

    it('should handle api type with object response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ key1: 'v1', key2: 'v2' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].tagId).toBe('key1');

      vi.unstubAllGlobals();
    });

    it('should handle tag type with properties.tagIds and existing variables', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'tag',
        properties: { tagIds: ['tag-1', 'tag-2'] },
      });
      store.addVariables([
        { ...mockVariable, currentValue: 123, quality: 'good', lastUpdate: Date.now() },
      ]);

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].tagId).toBe('tag-1');
      expect(result.items[0].value).toBe(123);
      expect(result.items[0].quality).toBe('good');
    });

    it('should handle tag type with no items but sourceName', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'tag',
        properties: { sourceName: 'TestDevice', tagIds: [] },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].tagId).toBe('config');
    });

    it('should handle device type like tag type', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'device',
        properties: { tagIds: ['tag-1'] },
      });
      store.addVariables([{ ...mockVariable, currentValue: 99 }]);

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].value).toBe(99);
    });

    it('should handle sql type with queryMode sql', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'sql',
        properties: {
          queryMode: 'sql',
          sqlQuery: 'SELECT * FROM table',
          sqlColumnMappings: [],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].tagId).toBe('query');
      expect(result.items[0].value).toBe('SELECT * FROM table');
    });

    it('should handle database type with queryMode table', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'database',
        properties: {
          queryMode: 'table',
          tableName: 'my_table',
          selectedColumns: [
            { tagId: 'col1', columnName: 'temperature', dataType: 'float' },
            { tagId: 'col2', columnName: 'pressure', dataType: 'int' },
          ],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].tagId).toBe('col1');
      expect(result.items[1].tagId).toBe('col2');
      expect(result.items[0].value).toBeNull();
    });

    it('should handle database type with queryMode table and no selectedColumns', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'database',
        properties: {
          queryMode: 'table',
          tableName: 'my_table',
          selectedColumns: [],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].tagId).toBe('config');
    });

    it('should handle default type (output properties JSON)', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'dynamic' as any,
        name: 'DynamicSource',
        properties: { key: 'value' },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].tagId).toBe('config');
      expect(typeof result.items[0].value).toBe('string');
    });

    it('should set fetchLoading to true during fetch and false after', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'ok' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
      });

      const promise = store.fetchDataSourceData('ds-1');
      expect(store.fetchLoading).toBe(true);
      await promise;
      expect(store.fetchLoading).toBe(false);

      vi.unstubAllGlobals();
    });

    it('should clear currentFetchResult before fetch', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'static',
        properties: { variables: [] },
      });

      (store as any).currentFetchResult = { sourceId: 'old' };
      await store.fetchDataSourceData('ds-1');
      expect(store.currentFetchResult!.sourceId).toBe('ds-1');
    });

    it('should update store state with result on success', async () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'static',
        properties: { variables: [{ tagId: 't1', value: 42 }] },
      });

      await store.fetchDataSourceData('ds-1');
      expect(store.currentFetchResult).not.toBeNull();
      expect(store.currentFetchResult!.sourceId).toBe('ds-1');
      expect(store.currentFetchResult!.items).toHaveLength(1);
    });
  });

  describe('clearFetchResult', () => {
    it('should reset fetch result to null', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      (store as any).currentFetchResult = { sourceId: 'test' };
      (store as any).fetchError = 'some error';
      (store as any).fetchLoading = true;

      store.clearFetchResult();
      expect(store.currentFetchResult).toBeNull();
      expect(store.fetchError).toBeNull();
      expect(store.fetchLoading).toBe(false);
    });
  });

  // ====================================================================
  // 9. ExportImport (toJSON / fromJSON)
  // ====================================================================
  describe('toJSON', () => {
    it('should return a copy of currentGroup', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource(mockDataSource);

      const json = store.toJSON();
      expect(json).not.toBeNull();
      expect(json!.pageId).toBe('page-1');
      expect(json!.dataSources).toHaveLength(1);
    });

    it('should return null when currentGroup is null', () => {
      const store = usePageDataSourceStore();
      const json = store.toJSON();
      expect(json).toBeNull();
    });

    it('should return a copy (not reference)', () => {
      const store = usePageDataSourceStore();
      store.initGroup('page-1');

      const json = store.toJSON();
      json!.pageId = 'modified';
      expect(store.currentGroup!.pageId).toBe('page-1');
    });
  });

  describe('fromJSON', () => {
    it('should load group from JSON data', () => {
      const store = usePageDataSourceStore();
      const group = {
        pageId: 'page-json',
        dataSources: [mockDataSource],
        variables: [mockVariable],
        graphicBindings: [mockBinding],
      };
      store.fromJSON(group);

      expect(store.currentGroup!.pageId).toBe('page-json');
      expect(store.currentGroup!.dataSources).toHaveLength(1);
      expect(store.currentGroup!.variables).toHaveLength(1);
      expect(store.currentGroup!.graphicBindings).toHaveLength(1);
    });

    it('should create a copy of the group', () => {
      const store = usePageDataSourceStore();
      const group = {
        pageId: 'page-json',
        dataSources: [],
        variables: [],
        graphicBindings: [],
      };
      store.fromJSON(group);
      group.pageId = 'modified';

      expect(store.currentGroup!.pageId).toBe('page-json');
    });
  });

  // ====================================================================
  // 10. Utility functions (resolveDataPath / applyScale)
  // ====================================================================
  describe('resolveDataPath', () => {
    // resolveDataPath is internal, test via fetchDataSourceData with dataPath
    it('should resolve nested path from api response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ level1: { level2: { value: 42 } } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
        dataPath: 'level1.level2',
        properties: {
          fieldMappings: [{ tagId: 'v', jsonPath: 'value' }],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items[0].value).toBe(42);

      vi.unstubAllGlobals();
    });

    it('should return undefined for non-existent path', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ a: 1 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
        dataPath: 'nonexistent.path',
        properties: {
          fieldMappings: [{ tagId: 'v', jsonPath: 'x' }],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items[0].value).toBeNull();

      vi.unstubAllGlobals();
    });
  });

  describe('applyScale', () => {
    it('should apply scale multiplier when scale is provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ val: 10 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
        properties: {
          fieldMappings: [{ tagId: 'v', jsonPath: 'val', scale: 2 }],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items[0].value).toBe(20);

      vi.unstubAllGlobals();
    });

    it('should apply offset when offset is provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ val: 10 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
        properties: {
          fieldMappings: [{ tagId: 'v', jsonPath: 'val', offset: 5 }],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items[0].value).toBe(15);

      vi.unstubAllGlobals();
    });

    it('should apply both scale and offset', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ val: 10 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
        properties: {
          fieldMappings: [{ tagId: 'v', jsonPath: 'val', scale: 2, offset: 5 }],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items[0].value).toBe(25);

      vi.unstubAllGlobals();
    });

    it('should not apply scale when value is not a number', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ val: 'hello' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
        properties: {
          fieldMappings: [{ tagId: 'v', jsonPath: 'val', scale: 2, offset: 5 }],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items[0].value).toBe('hello');

      vi.unstubAllGlobals();
    });

    it('should not apply scale when scale is 1 and offset is 0', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ val: 10 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const store = usePageDataSourceStore();
      store.initGroup('page-1');
      store.addDataSource({
        ...mockDataSource,
        type: 'api',
        url: 'http://test.com/api',
        properties: {
          fieldMappings: [{ tagId: 'v', jsonPath: 'val', scale: 1, offset: 0 }],
        },
      });

      const result = await store.fetchDataSourceData('ds-1');
      expect(result.items[0].value).toBe(10);

      vi.unstubAllGlobals();
    });
  });

  // ====================================================================
  // clearError
  // ====================================================================
  describe('clearError', () => {
    it('should clear error state', () => {
      const store = usePageDataSourceStore();
      (store as any).error = 'some error';

      store.clearError();
      expect(store.error).toBeNull();
    });
  });
});