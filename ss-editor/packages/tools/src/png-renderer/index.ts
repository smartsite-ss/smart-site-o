// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { writeFileSync } from 'fs'
import { join } from 'path'
import type { ComponentInfo, PngRenderOptions } from '../types'

const DEFAULT_OPTIONS = {
  size: 128,
  scale: 2,
  backgroundColor: '#1e1e2e',
  padding: 8,
}

let browserInstance: any = null
let playwrightModule: any = null

async function getPlaywright(): Promise<any> {
  if (playwrightModule) return playwrightModule
  try {
    playwrightModule = await import('playwright')
    return playwrightModule
  } catch {
    const candidates = [
      'playwright',
      join(process.cwd(), 'node_modules', 'playwright'),
    ]
    for (const candidate of candidates) {
      try {
        playwrightModule = await import(candidate)
        return playwrightModule
      } catch { /* noop */ }
    }
    throw new Error(
      [
        '',
        '  [playwright] 未安装 Playwright，无法渲染 PNG。',
        '',
        '  解决方案：',
        '    npm install -D playwright',
        '    npx playwright install chromium',
        '',
        '  或者使用全局安装：',
        '    npm install -g playwright',
        '',
      ].join('\n')
    )
  }
}

async function getBrowser(): Promise<any> {
  if (browserInstance) return browserInstance
  const pw = await getPlaywright()
  browserInstance = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  return browserInstance
}

function buildHtmlPage(svgString: string, options: Required<PngRenderOptions>): string {
  const totalSize = options.size + options.padding * 2
  const svgSize = options.size

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: ${totalSize}px;
  height: ${totalSize}px;
  background-color: ${options.backgroundColor};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
svg {
  width: ${svgSize}px;
  height: ${svgSize}px;
  max-width: ${svgSize}px;
  max-height: ${svgSize}px;
}
</style>
</head>
<body>${svgString}</body>
</html>`
}

export async function renderPng(
  svgString: string,
  options?: PngRenderOptions
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const browser = await getBrowser()
  const page = await browser.newPage({
    viewport: {
      width: opts.size + opts.padding * 2,
      height: opts.size + opts.padding * 2,
      deviceScaleFactor: opts.scale,
    },
  })

  try {
    const html = buildHtmlPage(svgString, opts)
    await page.setContent(html, { waitUntil: 'networkidle' })
    const svgElement = page.locator('svg').first()
    if ((await svgElement.count()) === 0) {
      throw new Error('页面中未找到 SVG 元素')
    }

    const clip = {
      x: opts.padding,
      y: opts.padding,
      width: opts.size,
      height: opts.size,
    }

    const buffer = await svgElement.screenshot({
      clip,
      type: 'png',
    })
    return buffer as Buffer
  } finally {
    await page.close()
  }
}

export async function renderPngToFile(
  svgString: string,
  outputPath: string,
  options?: PngRenderOptions
): Promise<void> {
  const buffer = await renderPng(svgString, options)
  writeFileSync(outputPath, buffer)
}

export async function renderComponentPng(
  componentInfo: ComponentInfo,
  svgContent: string,
  options?: PngRenderOptions
): Promise<string | null> {
  try {
    const outputPath = join(componentInfo.dirPath, `${componentInfo.type}.png`)
    await renderPngToFile(svgContent, outputPath, options)
    return outputPath
  } catch (error: any) {
    console.error(`  [FAIL] ${componentInfo.type}: ${error.message}`)
    return null
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}
