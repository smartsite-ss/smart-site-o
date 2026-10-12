// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 预览存储工具类
 * 封装预览功能相关的 IndexedDB 操作（替代 sessionStorage，解决 QuotaExceeded 问题）
 */

import { i18n } from '../../locales';

function t(key: string, params?: Record<string, string | number>): string {
  return i18n.global.t(`previewStorage.${key}`, params as Record<string, unknown>) as string;
}

// ─── IndexedDB 常量 ───

const DB_NAME = 'ScadaPreviewDB';
const DB_VERSION = 1;
const STORE_NAME = 'previewPages';

/** 数据过期时间（5 分钟） */
export const DATA_EXPIRY_MS = 5 * 60 * 1000;

/**
 * 打开 IndexedDB 数据库
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'pageId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 清理过期数据（超过 5 分钟的旧数据）
 */
async function cleanExpiredData(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const cursorRequest = store.openCursor();
    const expiryTime = Date.now() - DATA_EXPIRY_MS;

    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        if (cursor.value.timestamp < expiryTime) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // silently ignore cleanup errors
  }
}

// ─── 类型定义 ───

export interface PageDataValidationResult {
  valid: boolean;
  message?: string;
}

export interface SavePreviewResult {
  success: boolean;
  size?: number;
  error?: string;
}

export interface LoadPreviewResult {
  success: boolean;
  data?: any;
  name?: string;
  timestamp?: number;
  isExpired?: boolean;
  error?: string;
}

// ─── Blob URL 处理 ───

async function blobToBase64(blobUrl: string): Promise<string | null> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function processBlobUrls(data: any): Promise<any> {
  if (!data || typeof data !== 'object') return data;

  if (data.backgroundImage && typeof data.backgroundImage === 'string' &&
      data.backgroundImage.startsWith('blob:')) {
    const base64 = await blobToBase64(data.backgroundImage);
    if (base64) data.backgroundImage = base64;
  }

  if (Array.isArray(data.graphics)) {
    for (const graphic of data.graphics) {
      if (graphic?.config) {
        for (const key of Object.keys(graphic.config)) {
          const value = graphic.config[key];
          if (typeof value === 'string' && value.startsWith('blob:')) {
            const base64 = await blobToBase64(value);
            if (base64) graphic.config[key] = base64;
          }
        }
      }
    }
  }

  return data;
}

function safeStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'function') return undefined;
    if (typeof value === 'symbol') return undefined;
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof HTMLElement) return undefined;
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return undefined;
      seen.add(value);
      if (typeof value.toJSON === 'function') return value.toJSON();
    }
    return value;
  });
}

// ─── IndexedDB 存储 API ───

/**
 * 保存当前页面预览数据到 IndexedDB
 */
export async function savePreviewData(pageData: any, pageName: string = 'Page'): Promise<SavePreviewResult> {
  try {
    const processedData = await processBlobUrls(pageData);
    const jsonString = safeStringify(processedData);
    const dataSize = new Blob([jsonString]).size;

    await cleanExpiredData();

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const pageId = processedData.id || pageName;
    const record = {
      pageId,
      pageName,
      pageData: jsonString,
      timestamp: Date.now(),
    };

    store.put(record);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return { success: true, size: dataSize };
  } catch (storageError) {
    console.error('[PreviewStorage] Failed to save preview data:', storageError);
    return { success: false, error: t('saveFailed') };
  }
}

/**
 * 保存所有页面数据到 IndexedDB（供 PageBrowser 等图元使用）
 */
export async function saveAllPagesData(pages: Array<{ name: string; data: any }>): Promise<void> {
  try {
    await cleanExpiredData();

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const page of pages) {
      const pageId = page.data.id || page.name;
      const jsonString = safeStringify(page.data);
      store.put({
        pageId,
        pageName: page.name,
        pageData: jsonString,
        timestamp: Date.now(),
      });
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[PreviewStorage] Failed to save all pages data:', e);
  }
}

/**
 * 从 IndexedDB 加载当前页面预览数据
 */
export async function loadPreviewData(pageId?: string): Promise<LoadPreviewResult> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    let record: any = null;

    if (pageId) {
      // 按 pageId 精确查找
      record = await new Promise((resolve) => {
        const request = store.get(pageId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
    } else {
      // 取最新的记录
      const cursorRequest = store.openCursor(null, 'prev');
      record = await new Promise((resolve) => {
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          resolve(cursor ? cursor.value : null);
        };
        cursorRequest.onerror = () => resolve(null);
      });
    }

    if (!record) {
      return { success: false, error: t('dataNotFound') };
    }

    const isDataExpired = record.timestamp ? Date.now() - record.timestamp > DATA_EXPIRY_MS : false;

    try {
      const pageData = JSON.parse(record.pageData);
      return {
        success: true,
        data: pageData,
        name: record.pageName || 'Page',
        timestamp: record.timestamp,
        isExpired: isDataExpired,
      };
    } catch {
      return { success: false, error: t('parseFailed') };
    }
  } catch (e) {
    console.error('[PreviewStorage] Failed to load preview data:', e);
    return { success: false, error: t('dataNotFound') };
  }
}

/**
 * 从 IndexedDB 加载所有页面数据
 */
export async function loadAllPagesData(): Promise<Array<{ name: string; data: any }>> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const records: any[] = await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });

    return records.map((r) => ({
      name: r.pageName,
      data: JSON.parse(r.pageData),
    }));
  } catch {
    return [];
  }
}

// ─── 向下兼容的 sessionStorage API（保留旧接口） ───

/**
 * @deprecated 使用 IndexedDB 版本 loadPreviewData(pageId?)
 */
export async function loadPreviewDataFromSession(): Promise<LoadPreviewResult> {
  const pageDataString = sessionStorage.getItem('previewPageData');
  if (!pageDataString) {
    return { success: false, error: t('dataNotFound') };
  }
  try {
    return {
      success: true,
      data: JSON.parse(pageDataString),
      name: sessionStorage.getItem('previewPageName') || 'Page',
    };
  } catch {
    return { success: false, error: t('parseFailed') };
  }
}

// ─── 工具函数 ───

export function validatePageData(data: any): PageDataValidationResult {
  if (!data) {
    return { valid: false, message: t('dataEmpty') };
  }
  if (!data.id && !data.name) {
    return { valid: false, message: t('missingPageInfo') };
  }
  return { valid: true };
}

export function getGraphicsArray(page: any): any[] {
  if (!page) return [];
  if (Array.isArray(page.graphics)) return page.graphics;
  if ('value' in page.graphics && Array.isArray(page.graphics.value)) {
    return page.graphics.value;
  }
  return [];
}

export function clearPreviewData(): void {
  try {
    sessionStorage.removeItem('previewPageData');
    sessionStorage.removeItem('previewPageName');
    sessionStorage.removeItem('previewTimestamp');
    sessionStorage.removeItem('previewAllPages');
  } catch {
    // silently ignore
  }
}

export function getPreviewDataSize(): number {
  return 0;
}

export function isPreviewDataExpired(): boolean {
  return false;
}
