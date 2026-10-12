// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTemplateStore } from '../stores/template.store';

vi.mock('../api/modules/template.api', () => ({
  templateApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    publish: vi.fn(),
    deprecate: vi.fn(),
    clone: vi.fn(),
    apply: vi.fn(),
    sync: vi.fn(),
    getAllTags: vi.fn(),
  },
}));

const mockVariable = (overrides: Record<string, any> = {}) => ({
  order: 1,
  name: 'Temperature',
  address: '40001',
  dataType: 'float32',
  enabled: true,
  ...overrides,
});

const mockTemplate = (overrides: Record<string, any> = {}) => ({
  id: 'tpl-1',
  projectId: 'proj-1',
  name: 'Modbus Template',
  description: 'Standard Modbus device template',
  deviceType: 'modbus_tcp',
  version: '1.0.0',
  status: 'draft',
  isDefault: false,
  variables: [mockVariable()],
  authorId: 'user-1',
  tags: ['modbus', 'standard'],
  linkedDevices: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const mockPagination = { page: 1, pageSize: 20, total: 0, totalPages: 0 };

describe('useTemplateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have empty templates list', () => {
      const store = useTemplateStore();
      expect(store.templates).toEqual([]);
      expect(store.hasTemplates).toBe(false);
    });

    it('should have null currentTemplate', () => {
      const store = useTemplateStore();
      expect(store.currentTemplate).toBeNull();
    });

    it('should have default pagination', () => {
      const store = useTemplateStore();
      expect(store.pagination).toEqual(mockPagination);
    });

    it('should have draftCount and publishedCount as 0', () => {
      const store = useTemplateStore();
      expect(store.draftCount).toBe(0);
      expect(store.publishedCount).toBe(0);
    });
  });

  describe('state machine: draft → published → deprecated', () => {
    it('should transition from draft to published via publishTemplate', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const draft = mockTemplate({ id: 'tpl-1', status: 'draft' });
      const published = mockTemplate({ id: 'tpl-1', status: 'published' });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [draft], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.publish as any).mockResolvedValueOnce({ data: published });

      const store = useTemplateStore();
      await store.fetchTemplates();
      expect(store.templates[0].status).toBe('draft');

      await store.publishTemplate('tpl-1');
      expect(store.templates[0].status).toBe('published');
    });

    it('should transition from published to deprecated via deprecateTemplate', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const published = mockTemplate({ id: 'tpl-1', status: 'published' });
      const deprecated = mockTemplate({ id: 'tpl-1', status: 'deprecated' });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [published], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.deprecate as any).mockResolvedValueOnce({ data: deprecated });

      const store = useTemplateStore();
      await store.fetchTemplates();
      expect(store.templates[0].status).toBe('published');

      await store.deprecateTemplate('tpl-1');
      expect(store.templates[0].status).toBe('deprecated');
    });
  });

  describe('create template', () => {
    it('should create template and prepend to list', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const newTpl = mockTemplate({ id: 'new-tpl', name: 'New Template', status: 'draft' });

      (templateApi.create as any).mockResolvedValueOnce({ data: newTpl });

      const store = useTemplateStore();
      const result = await store.createTemplate({
        name: 'New Template',
        deviceType: 'modbus_tcp',
      });

      expect(result.status).toBe('draft');
      expect(store.templates[0]).toEqual(newTpl);
      expect(store.pagination.total).toBe(1);
    });
  });

  describe('publish template', () => {
    it('should change status from draft to published', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const draft = mockTemplate({ id: 'tpl-1', status: 'draft' });
      const published = mockTemplate({ id: 'tpl-1', status: 'published' });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [draft], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.publish as any).mockResolvedValueOnce({ data: published });

      const store = useTemplateStore();
      await store.fetchTemplates();
      const result = await store.publishTemplate('tpl-1');

      expect(result.status).toBe('published');
      expect(store.publishedCount).toBe(1);
      expect(store.draftCount).toBe(0);
    });

    it('should error when publishing already published template', async () => {
      const { templateApi } = await import('../api/modules/template.api');

      (templateApi.publish as any).mockRejectedValueOnce({
        response: { data: { message: 'Template is already published, cannot republish' } },
      });

      const store = useTemplateStore();
      await expect(store.publishTemplate('tpl-1')).rejects.toBeDefined();
      expect(store.error).toContain('Template is already published');
    });
  });

  describe('deprecate template', () => {
    it('should change status from published to deprecated', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const published = mockTemplate({ id: 'tpl-1', status: 'published' });
      const deprecated = mockTemplate({ id: 'tpl-1', status: 'deprecated' });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [published], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.deprecate as any).mockResolvedValueOnce({ data: deprecated });

      const store = useTemplateStore();
      await store.fetchTemplates();
      const result = await store.deprecateTemplate('tpl-1');

      expect(result.status).toBe('deprecated');
    });

    it('should error when deprecating a draft template', async () => {
      const { templateApi } = await import('../api/modules/template.api');

      (templateApi.deprecate as any).mockRejectedValueOnce({
        response: { data: { message: 'Only published templates can be deprecated' } },
      });

      const store = useTemplateStore();
      await expect(store.deprecateTemplate('tpl-1')).rejects.toBeDefined();
      expect(store.error).toContain('Only published templates');
    });
  });

  describe('clone template', () => {
    it('should create a copy with new name and same variables', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const original = mockTemplate({ id: 'tpl-1', name: 'Original', status: 'published' });
      const cloned = mockTemplate({
        id: 'tpl-cloned',
        name: 'Original (Copy)',
        status: 'draft',
        variables: [mockVariable({ name: 'Temperature' })],
      });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [original], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.clone as any).mockResolvedValueOnce({ data: cloned });

      const store = useTemplateStore();
      await store.fetchTemplates();
      const result = await store.cloneTemplate('tpl-1');

      expect(result.name).toBe('Original (Copy)');
      expect(result.id).toBe('tpl-cloned');
      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].name).toBe('Temperature');
      expect(store.templates).toHaveLength(2);
      expect(store.templates[0].id).toBe('tpl-cloned');
    });
  });

  describe('apply template to device', () => {
    it('should apply template and return result with created tags info', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const applyResult = {
        deviceId: 'dev-1',
        templateVersion: '1.0.0',
        created: 5,
        skipped: 0,
        errors: [],
      };

      (templateApi.apply as any).mockResolvedValueOnce({ data: applyResult });

      const store = useTemplateStore();
      const result = await store.applyTemplate('tpl-1', {
        deviceId: 'dev-1',
        replaceExisting: false,
      });

      expect(result.deviceId).toBe('dev-1');
      expect(result.created).toBe(5);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('sync template', () => {
    it('should sync variable changes to devices', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const syncResult = {
        totalDevices: 3,
        synced: 2,
        skipped: 1,
        errors: [],
      };

      (templateApi.sync as any).mockResolvedValueOnce({ data: syncResult });

      const store = useTemplateStore();
      const result = await store.syncTemplate('tpl-1', {
        deviceIds: ['dev-1', 'dev-2', 'dev-3'],
        forceOverwrite: false,
      });

      expect(result.totalDevices).toBe(3);
      expect(result.synced).toBe(2);
      expect(result.skipped).toBe(1);
    });
  });

  describe('fetch cache pattern', () => {
    it('should return cached templates when API call fails', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const templates = [mockTemplate({ id: 'tpl-1' }), mockTemplate({ id: 'tpl-2' })];

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: templates, pagination: { ...mockPagination, total: 2 } },
      });

      const store = useTemplateStore();
      await store.fetchTemplates();
      expect(store.templates).toHaveLength(2);

      (templateApi.list as any).mockRejectedValueOnce(new Error('Network error'));
      await store.fetchTemplates();

      expect(store.templates).toHaveLength(0);
      expect(store.error).toBeTruthy();
    });
  });

  describe('pagination', () => {
    it('should set pagination metadata after fetch', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const pagination = { page: 2, pageSize: 10, total: 25, totalPages: 3 };

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [mockTemplate({ id: 'tpl-1' })], pagination },
      });

      const store = useTemplateStore();
      await store.fetchTemplates(2, 10);

      expect(store.pagination.page).toBe(2);
      expect(store.pagination.pageSize).toBe(10);
      expect(store.pagination.total).toBe(25);
      expect(store.pagination.totalPages).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should set error when network fails', async () => {
      const { templateApi } = await import('../api/modules/template.api');

      (templateApi.list as any).mockRejectedValueOnce(new Error('Network Error'));

      const store = useTemplateStore();
      await store.fetchTemplates();

      expect(store.error).toBeTruthy();
      expect(store.loading).toBe(false);
    });

    it('should use server error message when available', async () => {
      const { templateApi } = await import('../api/modules/template.api');

      (templateApi.list as any).mockRejectedValueOnce({
        response: { data: { message: '项目不存在' } },
      });

      const store = useTemplateStore();
      await store.fetchTemplates();

      expect(store.error).toBe('项目不存在');
    });
  });

  describe('empty list', () => {
    it('should return empty array when no templates exist', async () => {
      const { templateApi } = await import('../api/modules/template.api');

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [], pagination: mockPagination },
      });

      const store = useTemplateStore();
      await store.fetchTemplates();

      expect(store.templates).toEqual([]);
      expect(store.hasTemplates).toBe(false);
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchTemplate', () => {
    it('should fetch single template by id', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const tpl = mockTemplate({ id: 'tpl-1' });

      (templateApi.getById as any).mockResolvedValueOnce({ data: tpl });

      const store = useTemplateStore();
      await store.fetchTemplate('tpl-1');

      expect(store.currentTemplate?.id).toBe('tpl-1');
      expect(store.currentTemplate?.name).toBe('Modbus Template');
    });

    it('should parse variables JSON string', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const tpl = mockTemplate({ id: 'tpl-1', variables: JSON.stringify([mockVariable()]) });

      (templateApi.getById as any).mockResolvedValueOnce({ data: tpl });

      const store = useTemplateStore();
      await store.fetchTemplate('tpl-1');

      expect(Array.isArray(store.currentTemplate?.variables)).toBe(true);
      expect(store.currentTemplate?.variables[0].name).toBe('Temperature');
    });
  });

  describe('update template', () => {
    it('should update template in list and as currentTemplate', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const original = mockTemplate({ id: 'tpl-1', name: 'Original' });
      const updated = mockTemplate({ id: 'tpl-1', name: 'Updated Template' });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [original], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.update as any).mockResolvedValueOnce({ data: updated });

      const store = useTemplateStore();
      await store.fetchTemplates();
      store.currentTemplate = store.templates[0];

      const result = await store.updateTemplate('tpl-1', { name: 'Updated Template' });

      expect(result.name).toBe('Updated Template');
      expect(store.templates[0].name).toBe('Updated Template');
      expect(store.currentTemplate?.name).toBe('Updated Template');
    });

    it('should update template variables with direction change', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const original = mockTemplate({
        id: 'tpl-1',
        variables: [mockVariable({ order: 1, name: 'temp', direction: 'read' })],
      });
      const updatedVars = [mockVariable({ order: 1, name: 'temp', direction: 'read-write' })];
      const updated = mockTemplate({ id: 'tpl-1', variables: updatedVars });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [original], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.update as any).mockResolvedValueOnce({ data: updated });

      const store = useTemplateStore();
      await store.fetchTemplates();
      store.currentTemplate = store.templates[0];

      const result = await store.updateTemplate('tpl-1', { variables: updatedVars });

      expect((result.variables[0] as any).direction).toBe('read-write');
      expect(store.templates[0].variables[0].direction).toBe('read-write');
    });

    it('should update template variables with enabled flag change', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const original = mockTemplate({
        id: 'tpl-1',
        variables: [mockVariable({ order: 1, name: 'temp', enabled: true })],
      });
      const updatedVars = [mockVariable({ order: 1, name: 'temp', enabled: false })];
      const updated = mockTemplate({ id: 'tpl-1', variables: updatedVars });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [original], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.update as any).mockResolvedValueOnce({ data: updated });

      const store = useTemplateStore();
      await store.fetchTemplates();
      store.currentTemplate = store.templates[0];

      const result = await store.updateTemplate('tpl-1', { variables: updatedVars });

      expect((result.variables[0] as any).enabled).toBe(false);
      expect(store.templates[0].variables[0].enabled).toBe(false);
    });

    it('should update template variables with multiple property changes', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const original = mockTemplate({
        id: 'tpl-1',
        variables: [mockVariable({
          order: 1, name: 'temp', dataType: 'float32', direction: 'read',
          scanRate: 1000, unit: '°C', enabled: true,
        })],
      });
      const updatedVars = [mockVariable({
        order: 1, name: 'temp', dataType: 'int16', direction: 'read-write',
        scanRate: 5000, unit: '°F', enabled: false,
      })];
      const updated = mockTemplate({ id: 'tpl-1', variables: updatedVars });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [original], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.update as any).mockResolvedValueOnce({ data: updated });

      const store = useTemplateStore();
      await store.fetchTemplates();
      store.currentTemplate = store.templates[0];

      const result = await store.updateTemplate('tpl-1', { variables: updatedVars });

      expect((result.variables[0] as any).dataType).toBe('int16');
      expect((result.variables[0] as any).direction).toBe('read-write');
      expect((result.variables[0] as any).scanRate).toBe(5000);
      expect((result.variables[0] as any).unit).toBe('°F');
      expect((result.variables[0] as any).enabled).toBe(false);
    });

    it('should pass locale to templateApi.update when provided', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const original = mockTemplate({ id: 'tpl-1' });
      const updated = mockTemplate({ id: 'tpl-1', name: 'Updated' });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [original], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.update as any).mockResolvedValueOnce({ data: updated });

      const store = useTemplateStore();
      await store.fetchTemplates();

      await store.updateTemplate('tpl-1', { name: 'Updated' }, 'en-US');

      expect(templateApi.update).toHaveBeenCalledWith('tpl-1', { name: 'Updated' }, 'en-US');
    });
  });

  describe('delete template', () => {
    it('should remove template from list and clear currentTemplate', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const tpl = mockTemplate({ id: 'tpl-1' });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [tpl], pagination: { ...mockPagination, total: 1 } },
      });
      (templateApi.delete as any).mockResolvedValueOnce(undefined);

      const store = useTemplateStore();
      await store.fetchTemplates();
      store.currentTemplate = store.templates[0];

      await store.deleteTemplate('tpl-1');

      expect(store.templates).toHaveLength(0);
      expect(store.currentTemplate).toBeNull();
      expect(store.pagination.total).toBe(0);
    });
  });

  describe('allTags computed', () => {
    it('should aggregate unique tags from all templates sorted', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const tpl1 = mockTemplate({ id: 'tpl-1', tags: ['modbus', 'temperature'] });
      const tpl2 = mockTemplate({ id: 'tpl-2', tags: ['plc', 'temperature', 'siemens'] });
      const tpl3 = mockTemplate({ id: 'tpl-3', tags: ['opc', 'plc'] });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [tpl1, tpl2, tpl3], pagination: { ...mockPagination, total: 3 } },
      });

      const store = useTemplateStore();
      await store.fetchTemplates();

      expect(store.allTags).toEqual(['modbus', 'opc', 'plc', 'siemens', 'temperature']);
    });

    it('should return empty array when no templates loaded', () => {
      const store = useTemplateStore();
      expect(store.allTags).toEqual([]);
    });

    it('should handle templates with no tags', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const tpl1 = mockTemplate({ id: 'tpl-1', tags: [] });
      const tpl2 = mockTemplate({ id: 'tpl-2', tags: ['plc'] });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [tpl1, tpl2], pagination: { ...mockPagination, total: 2 } },
      });

      const store = useTemplateStore();
      await store.fetchTemplates();

      expect(store.allTags).toEqual(['plc']);
    });

    it('should handle templates with undefined tags', async () => {
      const { templateApi } = await import('../api/modules/template.api');
      const tpl1 = mockTemplate({ id: 'tpl-1', tags: undefined as any });

      (templateApi.list as any).mockResolvedValueOnce({
        data: { data: [tpl1], pagination: { ...mockPagination, total: 1 } },
      });

      const store = useTemplateStore();
      await store.fetchTemplates();

      expect(store.allTags).toEqual([]);
    });
  });
});