// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { ComponentInfo, SvgExtractOptions } from '../types'

const TEMPLATE_RE = /<template[^>]*>([\s\S]*?)<\/template>/
const VUE_DIRECTIVE_RE = /\s(v-if|v-else|v-else-if|v-for|v-show|v-model|v-text|v-html|v-once|v-pre|v-cloak|v-slot)(?:\s|=|>|$)/g
const EVENT_HANDLER_RE = /\s@[\w-]+(?:\.[\w-]+)*(?:\s*=|\s+[^=\s])?/g
const INTERPOLATION_RE = /\{\{[\s\S]*?\}\}/g

function findGraphicVueFile(dirPath: string): string | null {
  const files = ['Graphic.vue', 'graphic.vue']
  for (const f of files) {
    const fullPath = join(dirPath, f)
    if (existsSync(fullPath)) return fullPath
  }
  const nameMatch = dirPath.replace(/[/\\]$/, '').split(/[/\\]/).pop()
  if (nameMatch) {
    const candidate = join(dirPath, `${nameMatch}Graphic.vue`)
    if (existsSync(candidate)) return candidate
  }
  return null
}

function extractTemplateContent(source: string): string | null {
  const match = source.match(TEMPLATE_RE)
  return match ? match[1].trim() : null
}

function extractRootSvg(templateContent: string): string | null {
  const svgStart = templateContent.indexOf('<svg')
  if (svgStart === -1) return null
  let depth = 0
  let i = svgStart
  let inTag = false
  while (i < templateContent.length) {
    if (templateContent[i] === '<') {
      if (templateContent.slice(i, i + 4) === '<svg' && !inTag) {
        inTag = true
      } else if (templateContent.slice(i, i + 2) === '</') {
        const closeTag = templateContent.indexOf('>', i)
        if (closeTag !== -1) {
          depth--
          if (depth < 0) {
            return templateContent.slice(svgStart, closeTag + 1)
          }
          i = closeTag + 1
          continue
        }
      } else if (inTag && depth === 0) {
        const closeAngle = templateContent.indexOf('>', i)
        if (closeAngle !== -1 && templateContent[closeAngle - 1] !== '/') {
          if (templateContent[i + 1] !== '/' && templateContent[i + 1] !== '!') {
            depth++
          }
        }
      }
    } else if (templateContent[i] === '>' && inTag && depth === 0) {
      inTag = false
    }
    i++
  }
  return null
}

function stripVueDirectives(svg: string): string {
  let result = svg
  result = result.replace(VUE_DIRECTIVE_RE, ' ')
  result = result.replace(EVENT_HANDLER_RE, ' ')
  result = result.replace(INTERPOLATION_RE, '')
  result = result.replace(/\s+/g, ' ').trim()
  return resolveVueBindings(result)
}

function resolveVueBindings(svg: string): string {
  const propDefaults: Record<string, string> = {
    w: '100',
    h: '100',
    color: '#8b5cf6',
    backgroundColor: 'transparent',
    lineWidth: '2',
    fontSize: '14',
    roate: '0',
    dur: '5',
    cls: '',
    dataset: '0',
    bgWidth: '20',
    boardWidth: '4',
  }

  function resolveBindingValue(expr: string): string {
    expr = expr.trim()
    if (!expr || expr === "''" || expr === '""') return ''
    if (/^['"]/.test(expr)) return expr.replace(/^['"]|['"]$/g, '')
    if (/^\d+(\.\d+)?$/.test(expr)) return expr
    if (expr.startsWith('`')) {
      let resolved = expr.slice(1, -1)
      for (const [key, val] of Object.entries(propDefaults)) {
        resolved = resolved.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), val)
      }
      return resolved
    }
    if (expr.includes('+') || expr.includes(' ') && !expr.includes('(')) {
      let resolved = expr
      for (const [key, val] of Object.entries(propDefaults)) {
        resolved = resolved.replace(new RegExp(`\\b${key}\\b`, 'g'), val)
      }
      try {
        if (/^[\d\s+\-*/().]+$/.test(resolved)) {
          return String(eval(resolved))
        }
      } catch { /* noop */ }
      return resolved.includes("'") ? resolved : `'${resolved}'`
    }
    return propDefaults[expr] ?? expr
  }

  result = svg.replace(
    /:(\w+(?:-\w+)*)=(["'])(.*?)\2/g,
    (_match, attr, _quote, value) => {
      const resolved = resolveBindingValue(value)
      if (resolved === '') return ''
      return `${attr}="${resolved}"`
    }
  )

  result = result.replace(
    /:(\w+(?:-\w+)*)="([^"]*?)"/g,
    (_match, attr, value) => {
      const resolved = resolveBindingValue(value)
      if (resolved === '') return ''
      return `${attr}="${resolved}"`
    }
  )

  result = result.replace(
    /:\s*(\w+(?:-\w+)*)\s*=\s*\{\s*([^}]*?)\s*\}/g,
    (_match, attr, value) => {
      const resolved = resolveBindingValue(value.trim())
      if (resolved === '') return ''
      return `${attr}="${resolved}"`
    }
  )

  result = result.replace(
    /:style="\{([^}]*)\}"/g,
    (_match, styleContent) => {
      const props: string[] = []
      styleContent.split(',').forEach((part) => {
        const [key, ...valParts] = part.split(':').map((s) => s.trim())
        const val = valParts.join(':').trim()
        if (key && val) {
          props.push(`${key}: ${val}`)
        }
      })
      return props.length > 0 ? `style="{ ${props.join('; ')} }"` : ''
    }
  )

  result = result.replace(
    /:class="([^"]*)"/g,
    (_match, classExpr) => {
      const resolved = resolveBindingValue(classExpr)
      return resolved ? `class="${resolved}"` : ''
    }
  )

  return result
}

function normalizeSvg(svg: string): string {
  let result = svg
  result = result.replace(/class="[^"]*-graphic"/gi, '')
  result = result.replace(/<desc>[^<]*<\/desc>/g, '')
  result = result.replace(/id="path-roate"/g, '')
  result = result.replace(/id="path"/g, '')
  result = result.replace(/id="circle"/g, '')
  result = result.replace(/\s+/g, ' ')
  result = result.replace(/>\s+</g, '><')
  result = result.trim()
  if (!result.startsWith('<?xml') && !result.startsWith('<svg')) {
    result = result.replace(/^(\s*)/, '')
  }
  return result
}

export async function extractSvg(
  componentInfo: ComponentInfo,
  _options?: SvgExtractOptions
): Promise<string | null> {
  const vueFile = findGraphicVueFile(componentInfo.dirPath)
  if (!vueFile) return null

  const source = readFileSync(vueFile, 'utf-8')
  const templateContent = extractTemplateContent(source)
  if (!templateContent) return null

  const rawSvg = extractRootSvg(templateContent)
  if (!rawSvg) return null

  const cleaned = stripVueDirectives(rawSvg)
  return normalizeSvg(cleaned)
}

export async function extractAllSvgs(
  components: ComponentInfo[],
  options?: SvgExtractOptions
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  for (const comp of components) {
    const svg = await extractSvg(comp, options)
    if (svg) {
      result.set(comp.type, svg)
    }
  }
  return result
}
