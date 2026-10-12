// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ISaveService, ProjectData } from '@scada-editor/core';
import { pageApi } from '@scada-editor/system';

async function urlToBlob(url: string): Promise<Blob> {
  if (url.startsWith('data:')) {
    const arr = url.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }
    return await response.blob();
  } catch (err) {
    throw new Error(`Failed to fetch blob from URL (${url.slice(0, 80)}...): ${err instanceof Error ? err.message : String(err)}`);
  }
}

function isDataOrBlobUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('data:') || url.startsWith('blob:');
}

function isRelativePath(url: string | undefined): boolean {
  if (!url) return false;
  return !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/');
}

function isAbsoluteApiPath(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('/api/') || url.startsWith('http://') || url.startsWith('https://');
}

function buildResourceUrl(projectId: string, pageName: string, fileName: string, groupName?: string): string {
  const params = groupName ? `?group=${encodeURIComponent(groupName)}` : '';
  return `/api/v1/projects/${projectId}/pages/${encodeURIComponent(pageName)}/${encodeURIComponent(fileName)}${params}`;
}

// ─── 按需加载：保存页面名到分组名的映射 ───
// pageName → groupName（用于按需加载时知道从哪个分组加载页面数据）
const pageGroupMapping = new Map<string, string | undefined>();

/**
 * 获取页面名到分组名的映射
 */
export function getPageGroupMapping(): Map<string, string | undefined> {
  return pageGroupMapping;
}

/**
 * 按需加载单个页面的完整数据（含 graphics）
 * 由 EditorView 在用户打开页面时调用
 * @param pageId 页面唯一 ID（UUID），用于从映射表查找分组。如果 pageId 有值则优先使用，否则回退到 pageName。
 *               不同分组中同名的页面有不同的 pageId，使用 pageId 可确保正确查找分组。
 */
export async function loadPageData(
  projectId: string,
  pageName: string,
  pageId?: string,
): Promise<any | null> {
  try {
    // 优先使用 pageId 查找分组映射，确保同名页面在不同分组中能正确加载
    const mappingKey = pageId || pageName;
    const groupName = pageGroupMapping.get(mappingKey);
    const res = await pageApi.readPage(projectId, pageName, groupName);
    const result = res.data || (res as any);
    if (!result?.success || !result?.data) return null;
    const pageData = result.data;
    // 解析背景图 URL
    if (isRelativePath(pageData.backgroundImage)) {
      pageData.backgroundImage = buildResourceUrl(projectId, pageName, pageData.backgroundImage, groupName);
    }
    return pageData;
  } catch (err) {
    console.error(`[projectSaveService] Failed to load page data for "${pageName}":`, err);
    return null;
  }
}

/**
 * 按需加载多个页面数据（批量，用于首次打开时填充当前页数据）
 */
export async function loadPagesData(
  projectId: string,
  pageNames: string[],
): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  await Promise.allSettled(
    pageNames.map(async (name) => {
      const data = await loadPageData(projectId, name);
      if (data) results.set(name, data);
    }),
  );
  return results;
}

async function uploadBackgroundForPage(projectId: string, page: any, groupName?: string): Promise<void> {
  const bgImage: string | undefined = page.backgroundImage;
  if (!bgImage) return;

  // 已是相对路径（如 "bg.png"），无需处理
  if (isRelativePath(bgImage)) return;

  // 已上传过的绝对 API 路径 → 提取文件名即可，无需重新上传
  if (isAbsoluteApiPath(bgImage)) {
    const fileName = bgImage.split('/').pop() || 'bg.png';
    page.backgroundImage = fileName;
    return;
  }

  if (!isDataOrBlobUrl(bgImage)) return;

  const pageName = page.name || page.id;
  try {
    const blob = await urlToBlob(page.backgroundImage);
    // 后端 uploadPageBackground 统一将背景图保存为 bg.png
    // 因此前端上传后也必须将 backgroundImage 设置为 bg.png，确保 page.json 中的路径与实际文件一致
    const fileName = 'bg.png';
    const file = new File([blob], fileName, { type: blob.type });
    await pageApi.uploadBackground(projectId, pageName, file, groupName);
    page.backgroundImage = fileName;
  } catch (err) {
    console.warn(`[projectSaveService] Failed to upload background for page ${pageName}:`, err);
    // 上传失败时不清除 backgroundImage，保留原始 data/blob URL 以便下次重试
  }
}

async function processPagesBackgrounds(projectId: string, pages: any[], groupName?: string): Promise<void> {
  for (const page of pages) {
    await uploadBackgroundForPage(projectId, page, groupName);
  }
}

export function createProjectSaveService(projectId: string): ISaveService {
  // 实例级加载锁：防止 load() 被并发调用导致重复请求
  let loadPromise: Promise<ProjectData | null> | null = null;

  return {
    async save(data: ProjectData): Promise<void> {
      // 当前页面预览（由调用方注入到 data 上）
      const previews = (data as any).previews as
        | { previewPageName?: string; previewPageId?: string; preview?: File | Blob; previewSmall?: File | Blob }
        | undefined;
      const previewPageName = previews?.previewPageName;
      const previewPageId = previews?.previewPageId;
      const previewOptions = (groupName?: string) => ({
        groupName,
        previewPageName,
        previewPageId,
        preview: previews?.preview,
        previewSmall: previews?.previewSmall,
      });

      const pageGroups = (data as any).pageGroups as Record<string, string> | undefined;
      const pages = data.pages || [];

      if (pages.length === 0) {
        console.warn('[projectSaveService] save: pages is empty');
        throw new Error('没有页面数据可保存，请先创建页面');
      }

      // ── 根据 __saveAll 标志确定保存范围 ──
      // 工程保存（__saveAll=true）：保存所有已加载（非 _lazy）的页面
      // Ctrl+S（__saveAll=false 或未设置）：只保存当前编辑页面（由 previewPageName 标识）
      const saveAll = (data as any).__saveAll === true;
      let pagesToSave: any[];

      if (saveAll) {
        // 保存所有已加载的页面（过滤掉 _lazy 占位符，避免覆盖服务端已有数据）
        pagesToSave = pages.filter(page => !page._lazy);
        if (pagesToSave.length === 0) {
          console.warn('[projectSaveService] saveAll: no loaded pages to save');
          throw new Error('没有已加载的页面数据可保存，请先打开需要保存的页面');
        }
      } else if (previewPageName) {
        // Ctrl+S：只保存当前编辑页面
        pagesToSave = pages.filter(page => (page.name || page.id) === previewPageName);
        if (pagesToSave.length === 0) {
          console.warn('[projectSaveService] save: no matching page found for previewPageName:', previewPageName);
          throw new Error('未找到当前编辑页面的数据，请确认页面已打开');
        }
      } else {
        // 无 previewPageName 时保存全部页面（兼容旧调用）
        pagesToSave = pages;
      }

      // 验证 pages 数据可序列化
      try {
        JSON.stringify(pagesToSave);
      } catch (serializeErr) {
        console.error('[projectSaveService] save: pages 序列化失败', serializeErr);
        throw new Error(`页面数据序列化失败: ${(serializeErr as Error).message}`);
      }

      if (pageGroups && Object.keys(pageGroups).length > 0) {
        const groupedPages = new Map<string, any[]>();
        const ungroupedPages: any[] = [];

        for (const page of pagesToSave) {
          const groupId = pageGroups[page.id];
          if (groupId) {
            if (!groupedPages.has(groupId)) {
              groupedPages.set(groupId, []);
            }
            groupedPages.get(groupId)!.push(page);
          } else {
            ungroupedPages.push(page);
          }
        }

        for (const [groupId, groupPages] of groupedPages) {
          const groupName = (data as any).groupNames?.[groupId] || groupId;
          await processPagesBackgrounds(projectId, groupPages, groupName);
          await pageApi.saveAllPages(projectId, groupPages, previewOptions(groupName));
        }

        if (ungroupedPages.length > 0) {
          await processPagesBackgrounds(projectId, ungroupedPages);
          await pageApi.saveAllPages(projectId, ungroupedPages, previewOptions(undefined));
        }
      } else {
        await processPagesBackgrounds(projectId, pagesToSave);
        await pageApi.saveAllPages(projectId, pagesToSave, previewOptions(undefined));
      }
    },

    async load(): Promise<ProjectData | null> {
      // 如果已有正在进行的 load()，直接复用其 Promise
      if (loadPromise) {
        return loadPromise;
      }

      loadPromise = (async () => {
        try {
          // ── 按需加载：先加载大纲（轻量级，仅目录结构，不含 page.json 数据） ──
          const outlineRes = await pageApi.getProjectOutline(projectId);
          const outline = outlineRes.data || (outlineRes as any);
          if (!outline?.success || outline.totalPageCount === 0) return null;

          // 清空旧的映射
          pageGroupMapping.clear();

          const allPages: any[] = [];
          const pageGroups: Record<string, string> = {};
          const groupNames: Record<string, string> = {};

          /** 将大纲中的页面添加到 page list */
          const addPageFromOutline = (
            pageName: string,
            pageId: string | undefined,
            groupName?: string,
            previewSmallUrl?: string,
            backgroundColor?: string,
            backgroundImage?: string,
            width?: number,
            height?: number,
          ) => {
            // 优先使用 outline 返回的 id（page.json 中的唯一 ID），没有时回退到 pageName
            const id = pageId || pageName;
            allPages.push({
              id,
              name: pageName,
              width: width ?? 1920,
              height: height ?? 1080,
              backgroundColor: backgroundColor || '#1e1e2e',
              ...(backgroundImage ? { backgroundImage } : {}),
              graphics: [], // 空 graphics，按需加载
              _lazy: true,  // 标记为延迟加载
              ...(previewSmallUrl ? { previewSmallUrl } : {}),
            });
            if (groupName) {
              pageGroups[id] = groupName;
              groupNames[groupName] = groupName;
            }
            // 使用 pageId（或 pageName 作为 fallback）作为键，确保同名页面在不同分组中能正确查找分组
            pageGroupMapping.set(pageId || pageName, groupName);
          }

          // 先加载根目录页面
          for (const page of outline.rootPages || []) {
            addPageFromOutline(page.name, page.id, undefined, page.previewSmallUrl, page.backgroundColor, page.backgroundImage, page.width, page.height);
          }
          // 再加载分组内页面
          for (const group of outline.groups || []) {
            for (const page of group.pages || []) {
              addPageFromOutline(page.name, page.id, group.name, page.previewSmallUrl, page.backgroundColor, page.backgroundImage, page.width, page.height);
            }
          }

          return {
            version: '1.0',
            savedAt: Date.now(),
            currentPageId: allPages[0]?.id || '',
            pages: allPages,
            ...(Object.keys(pageGroups).length > 0 ? { pageGroups, groupNames } : {}),
          } as ProjectData;
        } catch (err) {
          console.error('[projectSaveService] load failed:', err);
          return null;
        } finally {
          // 清除加载锁
          loadPromise = null;
        }
      })();

      return loadPromise;
    },

    async delete(): Promise<void> {
      try {
        const groupsRes = await pageApi.listGroups(projectId);
        const groupsResult = groupsRes.data || (groupsRes as any);
        const groups = groupsResult?.groups || [];

        for (const group of groups) {
          const listRes = await pageApi.listPages(projectId, group.name);
          const result = listRes.data || (listRes as any);
          const pageFiles = result?.pages || [];
          for (const info of pageFiles) {
            await pageApi.deletePage(projectId, info.name, group.name).catch(() => {});
          }
          await pageApi.deleteGroup(projectId, group.name).catch(() => {});
        }

        const listRes = await pageApi.listPages(projectId);
        const result = listRes.data || (listRes as any);
        const pageFiles = result?.pages || [];
        await Promise.all(
          pageFiles.map((info: { name: string }) =>
            pageApi.deletePage(projectId, info.name).catch(() => {})
          )
        );
      } catch {
        // ignore
      }
    },

    async hasSavedData(): Promise<boolean> {
      try {
        const listRes = await pageApi.listPages(projectId);
        const result = listRes.data || (listRes as any);
        if ((result?.pages || []).length > 0) return true;

        const groupsRes = await pageApi.listGroups(projectId);
        const groupsResult = groupsRes.data || (groupsRes as any);
        return (groupsResult?.groups || []).length > 0;
      } catch {
        return false;
      }
    },
  };
}