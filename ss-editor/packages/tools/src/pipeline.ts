// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type {
  ComponentInfo,
  GenerateOptions,
  GenerateResult,
  ComponentGenerateResult,
  SvgExtractOptions,
  PngRenderOptions,
} from './types'
import { extractSvg } from './svg-extractor/index'
import { renderPngToFile } from './png-renderer/index'

const DEFAULT_GENERATE_OPTIONS: Required<Omit<GenerateOptions, 'categories' | 'pluginsDir' | 'includeEmpty'>> = {
  size: 128,
  scale: 2,
  backgroundColor: '#1e1e2e',
  padding: 8,
  force: false,
  format: 'both',
}

export async function generateIcons(
  components: ComponentInfo[],
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const opts = { ...DEFAULT_GENERATE_OPTIONS, ...options }
  const results: ComponentGenerateResult[] = []
  let success = 0
  let failed = 0
  let skipped = 0

  const needSvg = opts.format === 'svg' || opts.format === 'both'
  const needPng = opts.format === 'png' || opts.format === 'both'

  for (const comp of components) {
    const result: ComponentGenerateResult = {
      type: comp.type,
      category: comp.category,
    }

    try {
      if (!comp.hasGraphicVue) {
        skipped++
        result.error = 'No Graphic.vue found'
        results.push(result)
        continue
      }

      let svgContent: string | null = null

      if (needSvg) {
        svgContent = await extractSvg(comp, {
          size: opts.size,
          backgroundColor: opts.backgroundColor,
        } as SvgExtractOptions)

        if (svgContent) {
          const svgPath = join(comp.dirPath, `${comp.type}.svg`)
          if (!existsSync(svgPath) || opts.force) {
            mkdirSync(comp.dirPath, { recursive: true })
            writeFileSync(svgPath, svgContent)
            result.svgPath = svgPath
          }
        }
      }

      if (needPng) {
        const pngRenderOpts: PngRenderOptions = {
          size: opts.size,
          scale: opts.scale,
          backgroundColor: opts.backgroundColor,
          padding: opts.padding,
        }

        if (svgContent) {
          const pngPath = join(comp.dirPath, `${comp.type}.png`)
          if (!existsSync(pngPath) || opts.force) {
            mkdirSync(comp.dirPath, { recursive: true })
            await renderPngToFile(svgContent, pngPath, pngRenderOpts)
            result.pngPath = pngPath
          }
        } else {
          const extractedSvg = await extractSvg(comp, {
            size: opts.size,
            backgroundColor: opts.backgroundColor,
          } as SvgExtractOptions)

          if (extractedSvg) {
            const pngPath = join(comp.dirPath, `${comp.type}.png`)
            if (!existsSync(pngPath) || opts.force) {
              mkdirSync(comp.dirPath, { recursive: true })
              await renderPngToFile(extractedSvg, pngPath, pngRenderOpts)
              result.pngPath = pngPath
            }
          }
        }
      }

      success++
    } catch (error: any) {
      failed++
      result.error = error.message || String(error)
    }

    results.push(result)
  }

  return {
    total: components.length,
    success,
    failed,
    skipped,
    results,
  }
}
