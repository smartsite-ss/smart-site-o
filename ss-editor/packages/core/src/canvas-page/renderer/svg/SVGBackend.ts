// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk'
import {
  IRenderer,
  RenderContext,
  RenderOptions,
  ViewportRect,
  IRendererV2,
  RenderMode,
  RenderStats,
  SVGRenderOptions,
} from '../types'
import { SVGGraphicConverter } from './SVGGraphicConverter'
import { SVGElementPool } from './SVGElementPool'
import { SVGViewportConfig } from './types'

const SVG_NS = 'http://www.w3.org/2000/svg'

export class SVGBackend implements IRenderer, IRendererV2 {
  private svgElement: SVGSVGElement
  private elementMap: Map<string, SVGElement> = new Map()
  private converter: SVGGraphicConverter
  private pool: SVGElementPool
  private scale: number = 1
  private panX: number = 0
  private panY: number = 0
  private svgWidth: number = 0
  private svgHeight: number = 0
  private hiddenCanvas: HTMLCanvasElement | null = null
  private viewportConfig: SVGViewportConfig = {
    viewport: null,
    enabled: false,
    bufferRatio: 0.05,
  }

  constructor(container: HTMLElement, options?: RenderOptions & { svgOptions?: SVGRenderOptions }) {
    this.pool = new SVGElementPool()
    this.converter = new SVGGraphicConverter(this.pool)

    this.svgWidth = options?.width || container.clientWidth
    this.svgHeight = options?.height || container.clientHeight

    this.svgElement = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
    this.svgElement.setAttribute('xmlns', SVG_NS)
    this.svgElement.setAttribute('width', String(this.svgWidth))
    this.svgElement.setAttribute('height', String(this.svgHeight))
    this.svgElement.style.display = 'block'
    this.svgElement.style.width = '100%'
    this.svgElement.style.height = '100%'

    this.hiddenCanvas = document.createElement('canvas')
    this.hiddenCanvas.width = this.svgWidth
    this.hiddenCanvas.height = this.svgHeight

    container.appendChild(this.svgElement)
  }

  render(graphic: IGraphic): void {
    try {
      if (!graphic.getVisible()) return

      const existing = this.elementMap.get(graphic.id)
      if (existing) {
        this.converter.updateElement(existing, graphic)
        return
      }

      const el = this.converter.convert(graphic)
      el.setAttribute('data-graphic-id', graphic.id)
      this.elementMap.set(graphic.id, el)

      const zIndex = graphic.getZIndex?.() || 0
      const allChildren = Array.from(this.svgElement.children)
      let inserted = false
      for (let i = 0; i < allChildren.length; i++) {
        const child = allChildren[i]
        const childId = child.getAttribute('data-graphic-id') || ''
        const childGraphic = this.elementMap.get(childId)
        const childZIndex = childGraphic
          ? (childGraphic as any).getZIndex?.() || 0
          : 0
        if (zIndex < childZIndex) {
          this.svgElement.insertBefore(el, child)
          inserted = true
          break
        }
      }
      if (!inserted) {
        this.svgElement.appendChild(el)
      }
    } catch {
      /* empty */
    }
  }

  update(graphic: IGraphic): void {
    try {
      const existing = this.elementMap.get(graphic.id)
      if (!existing) {
        this.render(graphic)
        return
      }
      this.converter.updateElement(existing, graphic)
    } catch {
      /* empty */
    }
  }

  remove(graphicId: string): void {
    try {
      const el = this.elementMap.get(graphicId)
      if (el && el.parentElement) {
        el.parentElement.removeChild(el)
        this.pool.release(el)
      }
      this.elementMap.delete(graphicId)
    } catch {
      /* empty */
    }
  }

  clear(): void {
    try {
      const children = Array.from(this.svgElement.children)
      for (const child of children) {
        if (child instanceof SVGElement) {
          this.pool.release(child as SVGElement)
        }
      }
      this.svgElement.innerHTML = ''
      this.elementMap.clear()
    } catch {
      /* empty */
    }
  }

  destroy(): void {
    try {
      this.clear()
      this.pool.clear()
      if (this.svgElement.parentElement) {
        this.svgElement.parentElement.removeChild(this.svgElement)
      }
    } catch {
      /* empty */
    }
  }

  resize(width: number, height: number): void {
    this.svgWidth = width
    this.svgHeight = height
    this.svgElement.setAttribute('width', String(width))
    this.svgElement.setAttribute('height', String(height))
    if (this.hiddenCanvas) {
      this.hiddenCanvas.width = width
      this.hiddenCanvas.height = height
    }
  }

  setScale(scale: number): void {
    this.scale = scale
  }

  setPan(x: number, y: number): void {
    this.panX = x
    this.panY = y
    this.svgElement.setAttribute('viewBox', `${-x} ${-y} ${this.svgWidth / this.scale} ${this.svgHeight / this.scale}`)
  }

  getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY }
  }

  getContext(): RenderContext | null {
    if (!this.hiddenCanvas) return null
    const context = this.hiddenCanvas.getContext('2d')
    if (!context) return null
    return {
      canvas: this.hiddenCanvas,
      context,
      width: this.hiddenCanvas.width,
      height: this.hiddenCanvas.height,
    }
  }

  setViewport(viewport: ViewportRect): void {
    this.viewportConfig.viewport = viewport
  }

  getViewport(): ViewportRect | null {
    return this.viewportConfig.viewport ? { ...this.viewportConfig.viewport } : null
  }

  setViewportCulling(enabled: boolean): void {
    this.viewportConfig.enabled = enabled
  }

  isViewportCullingEnabled(): boolean {
    return this.viewportConfig.enabled
  }

  setCullingBuffer(ratio: number): void {
    this.viewportConfig.bufferRatio = Math.max(0, Math.min(1, ratio))
  }

  getMode(): RenderMode {
    return 'svg'
  }

  getStats(): RenderStats {
    return {
      fps: 60,
      drawCalls: this.elementMap.size,
      graphicCount: this.elementMap.size,
      visibleCount: this.elementMap.size,
      cullingEnabled: this.viewportConfig.enabled,
      cullingRatio: 0,
      gpuMemoryEstimate: 0,
      backend: 'svg',
    }
  }

  exportToSVG(): string {
    return this.svgElement.outerHTML
  }

  getSVGElement(): SVGSVGElement {
    return this.svgElement
  }
}