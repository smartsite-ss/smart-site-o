// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ComponentInfo {
  type: string
  category: string
  primaryCategory?: string
  dirPath: string
  hasGraphicVue: boolean
  hasIconVue: boolean
  hasPng: boolean
  hasSvg: boolean
  packageJson?: Record<string, unknown>
}

export interface ScanOptions {
  categories?: string[]
  pluginsDir?: string
  includeEmpty?: boolean
}

export interface SvgExtractOptions {
  size?: number
  backgroundColor?: string
}

export interface PngRenderOptions {
  size?: number
  scale?: number
  backgroundColor?: string
  padding?: number
}

export type IconFormat = 'png' | 'svg' | 'both'

export interface GenerateOptions extends ScanOptions, PngRenderOptions {
  force?: boolean
  format?: IconFormat
}

export interface ComponentGenerateResult {
  type: string
  category: string
  pngPath?: string
  svgPath?: string
  error?: string
}

export interface GenerateResult {
  total: number
  success: number
  failed: number
  skipped: number
  results: ComponentGenerateResult[]
}
