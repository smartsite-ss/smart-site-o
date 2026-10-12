// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 页面模板管理 — Pinia Store（双层级：系统级 + 项目级）
 *
 * 优先通过后端 API 读写 JSON 文件：
 *   系统级 → /api/v1/canvas-templates
 *   项目级 → /api/v1/projects/{projectId}/canvas-templates
 * API 不可用时降级到硬编码内置模板 + localStorage。
 */

import { defineStore } from 'pinia';
import type { TemplateCategory, PageTemplate } from './types';
import { TEMPLATE_CATEGORIES } from './types';
import { BUILTIN_TEMPLATES } from './builtin-templates';

const LS_KEY = 'ss-canvas-page-templates';
const API_BASE = '/api/v1/canvas-templates';

let currentProjectId: string | null = null;

export const useTemplateStore = defineStore('canvas-page-template', {
  state: () => ({
    /** 系统级模板（内置 + 用户提升的） */
    systemTemplates: [] as PageTemplate[],
    /** 项目级模板 */
    projectTemplates: [] as PageTemplate[],
    selectedCategory: 'all' as TemplateCategory | 'all',
    searchKeyword: '',
    isLoading: false,
    /** 模板应用模式：reference（引用）| copy（复制） */
    configMode: 'reference' as 'reference' | 'copy',
  }),

  getters: {
    /** 系统内置模板 */
    builtinTemplates(state): PageTemplate[] {
      return state.systemTemplates.filter(t => t.source === 'builtin');
    },
    /** 系统用户模板（非内置） */
    systemUserTemplates(state): PageTemplate[] {
      return state.systemTemplates.filter(t => t.source === 'user');
    },
    /** 全部模板：项目模板优先，然后系统模板 */
    allTemplates(state): PageTemplate[] {
      return [...state.projectTemplates, ...state.systemTemplates];
    },
    /** 分类筛选后的模板 */
    filteredTemplates(state): PageTemplate[] {
      let templates = state.selectedCategory === 'all'
        ? this.allTemplates
        : this.allTemplates.filter(t => t.category === state.selectedCategory);

      if (state.searchKeyword) {
        const keyword = state.searchKeyword.toLowerCase();
        templates = templates.filter(t =>
          t.name.toLowerCase().includes(keyword) ||
          (t.description && t.description.toLowerCase().includes(keyword)) ||
          (t.tags && t.tags.some(tag => tag.toLowerCase().includes(keyword)))
        );
      }
      return templates;
    },
    categories(): typeof TEMPLATE_CATEGORIES { return TEMPLATE_CATEGORIES; },
    hasUserTemplates(state): boolean {
      return state.projectTemplates.length > 0 || state.systemTemplates.some(t => t.source === 'user');
    },
  },

  actions: {
    // ─── 配置 ───

    /** 获取后端模板配置（应用模式） */
    async fetchConfig() {
      try {
        const res = await fetch(`${API_BASE}/config`);
        if (res.ok) {
          const data = await res.json();
          if (data.templateMode === 'reference' || data.templateMode === 'copy') {
            this.configMode = data.templateMode;
          }
        }
      } catch {
        // 保持默认值 'reference'
      }
    },

    // ─── 项目上下文 ───

    /** 设置当前项目 ID，确保后续操作（保存、提升等）使用正确的项目级 API 路径 */
    setCurrentProjectId(projectId: string | null) {
      currentProjectId = projectId;
    },

    // ─── 加载 ───

    /** 加载两层模板（优先 API，降级 localStorage） */
    async loadTemplates(projectId?: string) {
      if (projectId) currentProjectId = projectId;
      this.isLoading = true;
      try {
        const [systemResult, projectResult] = await Promise.all([
          this.fetchFromApi(API_BASE).catch(() => null),
          projectId ? this.fetchFromApi(`/api/v1/projects/${projectId}/canvas-templates`).catch(() => null) : null,
          this.fetchConfig(),
        ]);

        if (systemResult) {
          this.systemTemplates = systemResult;
        } else {
          console.warn('[TemplateStore] 系统模板 API 不可用，使用本地数据降级');
          this.systemTemplates = [...BUILTIN_TEMPLATES];
          this.loadUserTemplatesFromLocalStorage();
        }

        this.projectTemplates = projectResult || [];
        console.log('[TemplateStore] loadTemplates 完成 →', {
          projectId: projectId || '(未传)',
          currentProjectId,
          systemCount: this.systemTemplates.length,
          projectCount: this.projectTemplates.length,
          selectedCategory: this.selectedCategory,
          projectTemplates: this.projectTemplates.map(t => ({ id: t.id, name: t.name, category: t.category })),
        });
      } finally {
        this.isLoading = false;
      }
    },

    /** 仅加载系统模板（用于系统管理页） */
    async loadSystemTemplates() {
      this.isLoading = true;
      try {
        const result = await this.fetchFromApi(API_BASE);
        this.systemTemplates = result;
      } catch {
        console.warn('[TemplateStore] 系统模板 API 不可用');
        this.systemTemplates = [...BUILTIN_TEMPLATES];
        this.loadUserTemplatesFromLocalStorage();
      } finally {
        this.isLoading = false;
      }
    },

    loadUserTemplatesFromLocalStorage() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.systemTemplates = [...this.systemTemplates, ...parsed.filter((t: PageTemplate) => t.source !== 'builtin')];
          }
        }
      } catch (error) {
        console.warn('[TemplateStore] 加载用户模板失败:', error);
      }
    },

    persistUserTemplatesToLocalStorage() {
      try {
        const userTemplates = this.systemTemplates.filter(t => t.source === 'user');
        localStorage.setItem(LS_KEY, JSON.stringify(userTemplates));
      } catch (error) {
        console.warn('[TemplateStore] 保存用户模板失败:', error);
      }
    },

    // ─── 筛选 ───

    setCategory(category: TemplateCategory | 'all') { this.selectedCategory = category; },
    setSearchKeyword(keyword: string) { this.searchKeyword = keyword; },

    // ─── 查询 ───

    findTemplate(templateId: string): PageTemplate | undefined {
      return this.allTemplates.find(t => t.id === templateId);
    },

    /** 判断模板是否为项目级 */
    isProjectTemplate(templateId: string): boolean {
      return this.projectTemplates.some(t => t.id === templateId);
    },

    // ─── 创建/保存 ───

    /** 保存为模板（默认保存到项目级，否则保存到系统级） */
    async saveAsTemplate(
      templateInfo: {
        name: string;
        description?: string;
        category?: TemplateCategory;
        icon?: string;
        pageConfig: PageTemplate['pageConfig'];
        graphics: unknown[];
        tags?: string[];
      },
      saveToSystem = false,
    ): Promise<PageTemplate | null> {
      const template: PageTemplate = {
        id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: templateInfo.name,
        description: templateInfo.description,
        category: templateInfo.category || 'custom',
        icon: templateInfo.icon,
        source: 'user',
        author: 'current-user',
        version: '1.0.0',
        pageConfig: templateInfo.pageConfig,
        graphics: templateInfo.graphics,
        tags: templateInfo.tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const apiPath = saveToSystem || !currentProjectId
        ? API_BASE
        : `/api/v1/projects/${currentProjectId}/canvas-templates`;

      try {
        const res = await fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template),
        });
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        if (result.success && result.data) {
          if (saveToSystem || !currentProjectId) {
            this.systemTemplates.unshift(result.data);
          } else {
            this.projectTemplates.unshift(result.data);
          }
          return result.data;
        }
        throw new Error('API 返回异常');
      } catch (error) {
        console.warn('[TemplateStore] API 保存失败，降级到 localStorage:', error);
        this.systemTemplates.unshift(template);
        this.persistUserTemplatesToLocalStorage();
        return template;
      }
    },

    /** 复制模板 */
    async duplicateTemplate(templateId: string): Promise<PageTemplate | null> {
      const source = this.allTemplates.find(t => t.id === templateId);
      if (!source) return null;

      const isProject = this.isProjectTemplate(templateId);
      return this.saveAsTemplate({
        name: `${source.name} (副本)`,
        description: source.description,
        category: source.category,
        icon: source.icon,
        pageConfig: { ...source.pageConfig },
        graphics: JSON.parse(JSON.stringify(source.graphics)),
        tags: source.tags ? [...source.tags] : [],
      }, !isProject);
    },

    /** 提升项目模板为系统级 */
    async promoteToSystem(templateId: string): Promise<PageTemplate | null> {
      if (!currentProjectId) return null;
      try {
        const res = await fetch(
          `/api/v1/projects/${currentProjectId}/canvas-templates/${templateId}/promote`,
          { method: 'POST' }
        );
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        if (result.success && result.data) {
          this.systemTemplates.unshift(result.data);
          return result.data;
        }
        return null;
      } catch (error) {
        console.warn('[TemplateStore] 提升模板失败:', error);
        return null;
      }
    },

    // ─── 更新 ───

    async updateTemplate(templateId: string, updates: Partial<PageTemplate>): Promise<boolean> {
      const isProject = this.isProjectTemplate(templateId);
      const apiPath = isProject && currentProjectId
        ? `/api/v1/projects/${currentProjectId}/canvas-templates`
        : API_BASE;

      try {
        const res = await fetch(`${apiPath}/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        if (result.success && result.data) {
          const target = isProject ? this.projectTemplates : this.systemTemplates;
          const idx = target.findIndex(t => t.id === templateId);
          if (idx !== -1) target[idx] = result.data;
          return true;
        }
        throw new Error('API 返回异常');
      } catch (error) {
        console.warn('[TemplateStore] API 更新失败，降级到 localStorage:', error);
        const target = isProject ? this.projectTemplates : this.systemTemplates;
        const template = target.find(t => t.id === templateId);
        if (!template) return false;
        Object.assign(template, updates, { updatedAt: Date.now() });
        if (!isProject) this.persistUserTemplatesToLocalStorage();
        return true;
      }
    },

    async renameTemplate(templateId: string, newName: string): Promise<boolean> {
      return this.updateTemplate(templateId, { name: newName });
    },

    // ─── 删除 ───

    async deleteTemplate(templateId: string): Promise<boolean> {
      const isProject = this.isProjectTemplate(templateId);
      const apiPath = isProject && currentProjectId
        ? `/api/v1/projects/${currentProjectId}/canvas-templates`
        : API_BASE;

      try {
        const res = await fetch(`${apiPath}/${templateId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await res.text());
        if (isProject) {
          this.projectTemplates = this.projectTemplates.filter(t => t.id !== templateId);
        } else {
          this.systemTemplates = this.systemTemplates.filter(t => t.id !== templateId);
        }
        return true;
      } catch (error) {
        console.warn('[TemplateStore] API 删除失败，降级到 localStorage:', error);
        if (isProject) {
          this.projectTemplates = this.projectTemplates.filter(t => t.id !== templateId);
        } else {
          this.systemTemplates = this.systemTemplates.filter(t => t.id !== templateId);
          this.persistUserTemplatesToLocalStorage();
        }
        return true;
      }
    },

    // ─── 导出/导入 ───

    async exportTemplate(templateId: string): Promise<string | null> {
      const template = this.allTemplates.find(t => t.id === templateId);
      if (!template) return null;

      const isProject = this.isProjectTemplate(templateId);
      const apiPath = isProject && currentProjectId
        ? `/api/v1/projects/${currentProjectId}/canvas-templates`
        : API_BASE;

      if (template.source === 'user') {
        try {
          const res = await fetch(`${apiPath}/${templateId}/export`);
          if (res.ok) return await res.text();
        } catch { /* 降级 */ }
      }

      const serialized = { ...template, source: 'user' as const, id: undefined, thumbnail: undefined, createdAt: undefined, updatedAt: undefined };
      return JSON.stringify(serialized, null, 2);
    },

    async importTemplate(json: string): Promise<PageTemplate | null> {
      try {
        let raw: any;
        try { raw = JSON.parse(json); } catch { return null; }

        if (!raw.name || !raw.pageConfig || !Array.isArray(raw.graphics)) {
          console.warn('[TemplateStore] 导入的模板数据格式无效');
          return null;
        }

        const apiPath = currentProjectId
          ? `/api/v1/projects/${currentProjectId}/canvas-templates`
          : API_BASE;

        try {
          const res = await fetch(`${apiPath}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ json }),
          });
          if (res.ok) {
            const result = await res.json();
            if (result.success && result.data) {
              if (currentProjectId) {
                this.projectTemplates.unshift(result.data);
              } else {
                this.systemTemplates.unshift(result.data);
              }
              return result.data;
            }
          }
        } catch { /* 降级 */ }

        const template: PageTemplate = {
          id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: raw.name, description: raw.description || '', category: raw.category || 'custom',
          icon: raw.icon, source: 'user', author: raw.author || 'imported',
          version: raw.version || '1.0.0', pageConfig: raw.pageConfig, graphics: raw.graphics,
          tags: raw.tags || [], createdAt: Date.now(), updatedAt: Date.now(),
        };
        this.systemTemplates.unshift(template);
        this.persistUserTemplatesToLocalStorage();
        return template;
      } catch (error) {
        console.warn('[TemplateStore] 导入模板失败:', error);
        return null;
      }
    },

    // ─── 内部工具 ───

    async fetchFromApi(url: string): Promise<PageTemplate[]> {
    const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      // 兼容全局 TransformInterceptor 包装的 { code, data, message } 和裸 { success, templates } 两种格式
      const result = raw.data || raw;
      if (!result.success || !Array.isArray(result.templates)) throw new Error('API 返回格式异常');
      return result.templates as PageTemplate[];
    },

    async refresh() { await this.loadTemplates(currentProjectId ?? undefined); },
  },
});
