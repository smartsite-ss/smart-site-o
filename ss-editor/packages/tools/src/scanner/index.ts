// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { ComponentInfo, ScanOptions } from '../types'

const GRAPHIC_VUE_PATTERNS = ['Graphic.vue', 'graphic.vue']
const ICON_VUE_PATTERNS = ['Icon.vue', 'icon.vue']

function findFile(dir: string, patterns: string[]): string | null {
  for (const pattern of patterns) {
    const fullPath = join(dir, pattern)
    if (existsSync(fullPath)) return fullPath
  }
  return null
}

function hasIconFiles(dir: string, typeName: string): { png: boolean; svg: boolean } {
  return {
    png: existsSync(join(dir, `${typeName}.png`)),
    svg: existsSync(join(dir, `${typeName}.svg`)),
  }
}

function readPackageJson(dir: string): Record<string, unknown> | undefined {
  const pkgPath = join(dir, 'package.json')
  if (!existsSync(pkgPath)) return undefined
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'))
  } catch {
    return undefined
  }
}

export async function scanComponents(
  pluginsDir: string,
  options: ScanOptions = {}
): Promise<ComponentInfo[]> {
  const results: ComponentInfo[] = []

  const categories = options.categories
    ? options.categories.filter(c => existsSync(join(pluginsDir, c)))
    : _discoverCategories(pluginsDir)

  for (const category of categories) {
    const categoryPath = join(pluginsDir, category)
    const components = await scanCategory(categoryPath, category, options)

    if (options.includeEmpty || components.length > 0) {
      results.push(...components)
    }
  }

  return results
}

export async function scanCategories(
  pluginsDir: string
): Promise<Record<string, ComponentInfo[]>> {
  const result: Record<string, ComponentInfo[]> = {}
  const categories = _discoverCategories(pluginsDir)

  for (const category of categories) {
    const categoryPath = join(pluginsDir, category)
    result[category] = await scanCategory(categoryPath, category, {})
  }

  return result
}

async function scanCategory(
  categoryPath: string,
  categoryName: string,
  _options: ScanOptions
): Promise<ComponentInfo[]> {
  const components: ComponentInfo[] = []

  if (!existsSync(categoryPath)) return components

  const entries = readdirSync(categoryPath, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const componentDir = join(categoryPath, entry.name)
    const typeName = entry.name

    const graphicVue = findFile(componentDir, GRAPHIC_VUE_PATTERNS)
    const iconVue = findFile(componentDir, ICON_VUE_PATTERNS)
    const icons = hasIconFiles(componentDir, typeName)
    const pkgJson = readPackageJson(componentDir)

    const info: ComponentInfo = {
      type: typeName,
      category: categoryName,
      dirPath: componentDir,
      hasGraphicVue: !!graphicVue,
      hasIconVue: !!iconVue,
      hasPng: icons.png,
      hasSvg: icons.svg,
      packageJson: pkgJson,
    }

    components.push(info)
  }

  return components.sort((a, b) => a.type.localeCompare(b.type))
}

function _discoverCategories(pluginsDir: string): string[] {
  if (!existsSync(pluginsDir)) return []

  return readdirSync(pluginsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .filter(entry => !entry.name.startsWith('.'))
    .filter(entry => !['node_modules', '__tests__', 'dist', 'build'].includes(entry.name))
    .map(entry => entry.name)
    .sort()
}
