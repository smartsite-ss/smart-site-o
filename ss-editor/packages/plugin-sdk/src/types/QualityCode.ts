// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type QualityCode = 'good' | 'uncertain' | 'bad' | 'stale' | 'disconnected';

export interface QualityIndicator {
  code: QualityCode;
  color: string;
  borderStyle: string;
  opacity: number;
  label: string;
}

export const QUALITY_VISUAL_MAP: Record<QualityCode, QualityIndicator> = {
  good: {
    code: 'good',
    color: '#4CAF50',
    borderStyle: 'solid',
    opacity: 1,
    label: 'Good',
  },
  uncertain: {
    code: 'uncertain',
    color: '#FF9800',
    borderStyle: 'dashed',
    opacity: 0.8,
    label: 'Uncertain',
  },
  bad: {
    code: 'bad',
    color: '#F44336',
    borderStyle: 'solid',
    opacity: 1,
    label: 'Bad',
  },
  stale: {
    code: 'stale',
    color: '#9E9E9E',
    borderStyle: 'dotted',
    opacity: 0.6,
    label: 'Stale',
  },
  disconnected: {
    code: 'disconnected',
    color: '#607D8B',
    borderStyle: 'dashed',
    opacity: 0.4,
    label: 'Disconnected',
  },
};