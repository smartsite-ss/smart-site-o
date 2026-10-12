// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useProjectStore } from '../../stores/project.store';

vi.mock('../../api/modules/project.api', () => ({
  projectApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exportProject: vi.fn(),
    importProject: vi.fn(),
  },
}));

describe('useProjectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have empty projects list', () => {
      const store = useProjectStore();
      expect(store.projects).toEqual([]);
    });

    it('should have null currentProject', () => {
      const store = useProjectStore();
      expect(store.currentProject).toBeNull();
    });

    it('should have default pagination', () => {
      const store = useProjectStore();
      expect(store.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it('should have loading as false', () => {
      const store = useProjectStore();
      expect(store.loading).toBe(false);
    });

    it('should have empty searchKeyword', () => {
      const store = useProjectStore();
      expect(store.searchKeyword).toBe('');
    });

    it('should have hasProjects as false', () => {
      const store = useProjectStore();
      expect(store.hasProjects).toBe(false);
    });
  });

  describe('fetchProjects', () => {
    it('should fetch and populate projects', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      const mockProjects = [
        { projectId: 'p1', projectName: 'Project 1', description: 'desc1', createdAt: '2024-01-01', updatedAt: '2024-01-02' },
        { projectId: 'p2', projectName: 'Project 2', description: 'desc2', createdAt: '2024-01-03', updatedAt: '2024-01-04' },
      ];
      (projectApi.list as any).mockResolvedValueOnce({
        data: mockProjects,
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      });

      const store = useProjectStore();
      await store.fetchProjects();

      expect(store.projects).toHaveLength(2);
      expect(store.projects[0].projectName).toBe('Project 1');
      expect(store.pagination.total).toBe(2);
    });

    it('should set loading during fetch', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      (projectApi.list as any).mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      });

      const store = useProjectStore();
      const promise = store.fetchProjects();
      expect(store.loading).toBe(true);
      await promise;
      expect(store.loading).toBe(false);
    });

    it('should handle fetch error', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      (projectApi.list as any).mockRejectedValueOnce(new Error('Network error'));

      const store = useProjectStore();
      await store.fetchProjects();

      expect(store.error).toBeTruthy();
      expect(store.projects).toEqual([]);
      expect(store.loading).toBe(false);
    });
  });

  describe('createProject', () => {
    it('should create project and prepend to list', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      const newProject = { projectId: 'new', projectName: 'New Project', description: '', createdAt: '', updatedAt: '' };
      (projectApi.create as any).mockResolvedValueOnce({ data: newProject });

      const store = useProjectStore();
      const result = await store.createProject({ projectName: 'New Project' });

      expect(result).toEqual(newProject);
      expect(store.projects[0]).toEqual(newProject);
      expect(store.pagination.total).toBe(1);
    });

    it('should set error on create failure', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      (projectApi.create as any).mockRejectedValueOnce(new Error('Create failed'));

      const store = useProjectStore();
      await expect(store.createProject({ projectName: 'Fail' })).rejects.toThrow();
      expect(store.error).toBeTruthy();
    });
  });

  describe('deleteProject', () => {
    it('should delete project and decrement total', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      const mockProjects = [{ projectId: 'p1', projectName: 'P1', description: '', createdAt: '', updatedAt: '' }];
      (projectApi.list as any).mockResolvedValueOnce({
        data: mockProjects,
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
      (projectApi.delete as any).mockResolvedValueOnce(undefined);

      const store = useProjectStore();
      await store.fetchProjects();
      await store.deleteProject('p1');

      expect(store.projects).toHaveLength(0);
      expect(store.pagination.total).toBe(0);
    });

    it('should clear currentProject if deleted project is current', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      const mockProjects = [{ projectId: 'p1', projectName: 'P1', description: '', createdAt: '', updatedAt: '' }];
      (projectApi.list as any).mockResolvedValueOnce({
        data: mockProjects,
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
      (projectApi.delete as any).mockResolvedValueOnce(undefined);

      const store = useProjectStore();
      await store.fetchProjects();
      store.currentProject = store.projects[0];
      await store.deleteProject('p1');

      expect(store.currentProject).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('should update project in list and currentProject', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      const original = { projectId: 'p1', projectName: 'Original', description: '', createdAt: '', updatedAt: '' };
      (projectApi.list as any).mockResolvedValueOnce({
        data: [original],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
      const updated = { projectId: 'p1', projectName: 'Updated', description: 'new', createdAt: '', updatedAt: '' };
      (projectApi.update as any).mockResolvedValueOnce({ data: updated });

      const store = useProjectStore();
      await store.fetchProjects();
      store.currentProject = store.projects[0];
      await store.updateProject('p1', { description: 'Updated' });

      expect(store.projects[0].projectName).toBe('Updated');
      expect(store.currentProject?.projectName).toBe('Updated');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      (projectApi.list as any).mockRejectedValueOnce(new Error('Failed'));

      const store = useProjectStore();
      await store.fetchProjects();
      expect(store.error).toBeTruthy();

      store.clearError();
      expect(store.error).toBeNull();
    });
  });

  describe('hasMore', () => {
    it('should be true when more pages available', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      (projectApi.list as any).mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 100, totalPages: 5 },
      });

      const store = useProjectStore();
      await store.fetchProjects(1);
      expect(store.hasMore).toBe(true);
    });

    it('should be false when on last page', async () => {
      const { projectApi } = await import('../../api/modules/project.api');
      (projectApi.list as any).mockResolvedValueOnce({
        data: [],
        pagination: { page: 5, pageSize: 20, total: 100, totalPages: 5 },
      });

      const store = useProjectStore();
      await store.fetchProjects(5);
      expect(store.hasMore).toBe(false);
    });
  });
});