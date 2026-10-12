// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * sourceMeta — 数据源 UI 公共映射
 *
 * 抽取自 VariableSelector / FetchPanel / TagSourceSelector
 * 中重复的 qualityColor / sourceTypeLabel / statusLabel 映射逻辑。
 *
 * 统一包含所有 quality 状态（含 stale/disconnected），消除 3 个文件中的实现差异。
 */

/**
 * 数据质量 → CSS 颜色变量映射。
 * 用于质量指示灯、表格质量列着色等。
 */
export const qualityMeta: Record<string, { color: string; label: string }> = {
  good: { color: 'var(--status-success, #18a058)', label: 'Good' },
  bad: { color: 'var(--status-error, #d03050)', label: 'Bad' },
  uncertain: { color: 'var(--status-warning, #f0a020)', label: 'Uncertain' },
  stale: { color: 'var(--status-warning, #f0a020)', label: 'Stale' },
  disconnected: { color: 'var(--text-secondary, #909399)', label: 'Disconnected' },
};

/**
 * 获取数据质量对应的颜色。
 * 未知质量码回退为次级文本色。
 */
export function getQualityColor(quality: string | undefined | null): string {
  if (!quality) return 'var(--text-secondary, #909399)';
  return qualityMeta[quality]?.color ?? 'var(--text-secondary, #909399)';
}

/**
 * 获取数据质量对应的标签文本。
 */
export function getQualityLabel(quality: string | undefined | null): string {
  if (!quality) return '--';
  return qualityMeta[quality]?.label ?? quality;
}

/**
 * 数据源类型 → 显示标签映射。
 */
export const sourceTypeMeta: Record<string, { label: string; icon: string }> = {
  static: { label: 'Static', icon: '📊' },
  api: { label: 'API', icon: '🌐' },
  tag: { label: 'Tag', icon: '🏷️' },
  database: { label: 'Database', icon: '🗄️' },
  sql: { label: 'SQL', icon: '🗄️' },
};

/**
 * 获取数据源类型的显示标签。
 */
export function getSourceTypeLabel(sourceType: string | undefined | null): string {
  if (!sourceType) return '--';
  return sourceTypeMeta[sourceType]?.label ?? sourceType;
}

/**
 * 数据源状态 → 显示标签 + 颜色映射。
 */
export const statusMeta: Record<string, { label: string; color: string }> = {
  idle: { label: 'Idle', color: 'var(--text-secondary, #909399)' },
  loading: { label: 'Loading', color: 'var(--status-info, #2080f0)' },
  active: { label: 'Active', color: 'var(--status-success, #18a058)' },
  error: { label: 'Error', color: 'var(--status-error, #d03050)' },
  paused: { label: 'Paused', color: 'var(--status-warning, #f0a020)' },
};

/**
 * 获取数据源状态的显示标签。
 */
export function getStatusLabel(status: string | undefined | null): string {
  if (!status) return '--';
  return statusMeta[status]?.label ?? status;
}

/**
 * 获取数据源状态的颜色。
 */
export function getStatusColor(status: string | undefined | null): string {
  if (!status) return 'var(--text-secondary, #909399)';
  return statusMeta[status]?.color ?? 'var(--text-secondary, #909399)';
}
