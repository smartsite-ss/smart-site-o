// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * DataSourceReader — 数据源值读取统一工具
 *
 * 为编辑态（DataSourceConfigDialog）和运行态（PreviewCanvas / RuntimeDataPanel）
 * 提供统一的数据源标签值读取、摘要构建能力，消除各处重复的 tagId 提取和 wsStore 读取模式。
 */

export interface TagValueSnapshot {
  tagId: string;
  tagName: string;
  currentValue: unknown;
  quality: string | undefined;
  lastUpdate: number | undefined;
}

export interface SourceSummary {
  lastValue: string | null;
  updatedAt: number | null;
  quality: string | null;
}

export interface WsStoreLike {
  tagValues: Map<string, { value: unknown; quality?: string; timestamp?: number }>;
}

// ── tagId 提取：统一从数据源配置中提取标签 ID ────────────────────────

/**
 * 从数据源配置中提取标签 ID（统一兜底链）。
 * 优先级：ds.properties.tagIds > ds.config.tagIds > ds.tags > ds.properties.tags
 */
export function extractTagIds(ds: Record<string, unknown> | null | undefined): string[] {
  if (!ds) return [];
  const props = (ds.properties || ds.config) as Record<string, unknown> | undefined;
  const tagIds =
    (props?.tagIds as string[] | undefined) ??
    (props?.tags as string[] | undefined) ??
    (ds.tags as string[] | undefined) ??
    [];
  return Array.isArray(tagIds) ? tagIds : [];
}

// ── 标签值读取 ──────────────────────────────────────────────────────

/**
 * 从 wsStore 读取单个标签的实时值快照。
 * 返回 TagValueSnapshot（始终有值，无 WS 数据时 value/quality/ts 为 undefined）。
 */
export function readTagSnapshot(
  tagId: string,
  tagName: string,
  wsStore: WsStoreLike,
): TagValueSnapshot {
  const wsEntry = wsStore.tagValues.get(tagId);
  return {
    tagId,
    tagName: tagName || tagId,
    currentValue: wsEntry?.value,
    quality: wsEntry?.quality,
    lastUpdate: wsEntry?.timestamp,
  };
}

/**
 * 批量读取标签值快照。
 * @param tagIds  - 标签 ID 列表
 * @param tagNames - 标签名称列表（与 tagIds 等长，缺失时用 tagId 兜底）
 */
export function readTagSnapshots(
  tagIds: string[],
  tagNames: string[],
  wsStore: WsStoreLike,
): TagValueSnapshot[] {
  return tagIds.map((tagId, i) => readTagSnapshot(tagId, tagNames[i] || tagId, wsStore));
}

// ── 数据源摘要构建 ──────────────────────────────────────────────────

/**
 * 为单个数据源构建摘要（最新值、更新时间、质量）。
 * 根据数据源 type 生成不同的 lastValue 格式。
 */
export function buildSourceSummary(
  ds: { type?: string; name?: string; url?: string; properties?: Record<string, unknown> },
  tagIds: string[],
  tagNames: string[],
  wsStore: WsStoreLike,
): SourceSummary {
  if (tagIds.length === 0) {
    return { lastValue: null, updatedAt: null, quality: null };
  }

  const snapshots = readTagSnapshots(tagIds, tagNames, wsStore);
  const maxLen = 60;

  // lastValue
  let lastValue: string | null = null;
  switch (ds.type) {
    case 'static': {
      lastValue = snapshots
        .map((t) => `${t.tagName}: ${t.currentValue ?? '—'}`)
        .join('; ');
      lastValue = lastValue.length > maxLen ? lastValue.substring(0, maxLen - 3) + '...' : lastValue;
      // 空值回退
      if (!lastValue || lastValue === '') lastValue = null;
      break;
    }
    case 'tag':
    case 'device': {
      const values = snapshots.map((t) => t.currentValue ?? '—').join(', ');
      lastValue = values.length > maxLen ? values.substring(0, maxLen - 3) + '...' : values;
      break;
    }
    case 'api': {
      const url = ds.url || ds.properties?.url;
      if (typeof url === 'string') {
        lastValue = url.length > 40 ? url.substring(0, 37) + '...' : url;
      }
      break;
    }
    default:
      lastValue = null;
  }

  // updatedAt：取所有标签中最新的 lastUpdate
  let updatedAt: number | null = null;
  for (const s of snapshots) {
    if (s.lastUpdate && (updatedAt === null || s.lastUpdate > updatedAt)) {
      updatedAt = s.lastUpdate;
    }
  }

  // quality：取所有标签中最差的
  let quality: string | null = null;
  for (const s of snapshots) {
    if (!s.quality) continue;
    if (quality === null) {
      quality = s.quality;
    } else if (s.quality !== 'good') {
      quality = s.quality;
      break; // 最差已找到，无需继续
    }
  }

  return { lastValue, updatedAt, quality };
}
