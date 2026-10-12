// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type QualityCode = 'good' | 'uncertain' | 'bad' | 'stale' | 'disconnected'

export interface QualityIndicator {
  code: QualityCode
  color: string
  borderStyle: string
  opacity: number
  label: string
}

export const QUALITY_VISUAL_MAP: Record<QualityCode, QualityIndicator> = {
  good: {
    code: 'good',
    color: '#4CAF50',
    borderStyle: 'solid',
    opacity: 1,
    label: '正常'
  },
  uncertain: {
    code: 'uncertain',
    color: '#FF9800',
    borderStyle: 'dashed',
    opacity: 0.8,
    label: '不确定'
  },
  bad: {
    code: 'bad',
    color: '#F44336',
    borderStyle: 'solid',
    opacity: 1,
    label: '异常'
  },
  stale: {
    code: 'stale',
    color: '#9E9E9E',
    borderStyle: 'dotted',
    opacity: 0.6,
    label: '过期'
  },
  disconnected: {
    code: 'disconnected',
    color: '#607D8B',
    borderStyle: 'dashed',
    opacity: 0.4,
    label: '断开连接'
  }
}

export interface QualityRule {
  condition: string
  code: QualityCode
  message: string
}

export interface TagMetadata {
  staleThresholdMs: number
  qualityRules: QualityRule[]
}

export interface QualityVisual {
  borderColor: string
  borderWidth: number
  borderStyle: string
  opacity: number
  overlayColor: string
  pulseAnimation: boolean
}