// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk'
import { SVGElementPool } from './SVGElementPool'

export class SVGGraphicConverter {
  private pool: SVGElementPool

  constructor(pool?: SVGElementPool) {
    this.pool = pool || new SVGElementPool()
  }

  convert(graphic: IGraphic): SVGElement {
    const type = graphic.type
    const geometry = graphic.config.geometry
    const style = graphic.config.style

    try {
      switch (type) {
        case 'shape':
        case 'button':
          return this.createRect(graphic, geometry, style)
        case 'label':
        case 'textbox':
          return this.createText(graphic, geometry, style)
        case 'image':
          return this.createImage(graphic, geometry, style)
        case 'line':
          return this.createLine(graphic, geometry, style)
        default:
          return this.createForeignObject(graphic, geometry, style)
      }
    } catch {
      return this.createForeignObject(graphic, geometry, style)
    }
  }

  updateElement(el: SVGElement, graphic: IGraphic): void {
    try {
      const type = graphic.type
      const geometry = graphic.config.geometry
      const style = graphic.config.style

      switch (type) {
        case 'shape':
        case 'button':
          this.updateRect(el, geometry, style)
          break
        case 'label':
        case 'textbox':
          this.updateText(el, graphic, geometry, style)
          break
        case 'image':
          this.updateImage(el, geometry, style)
          break
        case 'line':
          this.updateLine(el, geometry, style)
          break
        default:
          this.updateForeignObject(el, graphic, geometry, style)
      }
    } catch {
      /* empty */
    }
  }

  private createRect(
    _graphic: IGraphic,
    geometry: { x: number; y: number; width: number; height: number },
    style: Record<string, any>
  ): SVGElement {
    const rect = this.pool.acquire('rect')
    rect.setAttribute('x', String(geometry.x))
    rect.setAttribute('y', String(geometry.y))
    rect.setAttribute('width', String(geometry.width))
    rect.setAttribute('height', String(geometry.height))
    if (style.backgroundColor) {
      rect.setAttribute('fill', style.backgroundColor)
    }
    if (style.borderColor) {
      rect.setAttribute('stroke', style.borderColor)
    }
    if (style.borderWidth) {
      rect.setAttribute('stroke-width', String(style.borderWidth))
    }
    if (style.borderRadius) {
      rect.setAttribute('rx', String(style.borderRadius))
      rect.setAttribute('ry', String(style.borderRadius))
    }
    if (style.opacity !== undefined) {
      rect.setAttribute('opacity', String(style.opacity))
    }
    return rect
  }

  private updateRect(
    el: SVGElement,
    geometry: { x: number; y: number; width: number; height: number },
    style: Record<string, any>
  ): void {
    el.setAttribute('x', String(geometry.x))
    el.setAttribute('y', String(geometry.y))
    el.setAttribute('width', String(geometry.width))
    el.setAttribute('height', String(geometry.height))
    if (style.backgroundColor) {
      el.setAttribute('fill', style.backgroundColor)
    }
    if (style.borderColor) {
      el.setAttribute('stroke', style.borderColor)
    }
    if (style.borderWidth != null) {
      el.setAttribute('stroke-width', String(style.borderWidth))
    }
    if (style.borderRadius != null) {
      el.setAttribute('rx', String(style.borderRadius))
      el.setAttribute('ry', String(style.borderRadius))
    }
    if (style.opacity !== undefined) {
      el.setAttribute('opacity', String(style.opacity))
    }
  }

  private createText(
    graphic: IGraphic,
    geometry: { x: number; y: number; width: number; height: number },
    style: Record<string, any>
  ): SVGElement {
    const text = this.pool.acquire('text')
    text.setAttribute('x', String(geometry.x))
    text.setAttribute('y', String(geometry.y + (style.fontSize || 14)))
    text.setAttribute('font-size', String(style.fontSize || 14))
    text.setAttribute('fill', style.color || style.fontColor || '#000')
    text.setAttribute('text-anchor', style.textAlign === 'center' ? 'middle' : style.textAlign === 'right' ? 'end' : 'start')
    const content = graphic.config.customProps?.text || ''
    text.textContent = content
    return text
  }

  private updateText(
    el: SVGElement,
    graphic: IGraphic,
    geometry: { x: number; y: number; width: number; height: number },
    style: Record<string, any>
  ): void {
    el.setAttribute('x', String(geometry.x))
    el.setAttribute('y', String(geometry.y + (style.fontSize || 14)))
    el.setAttribute('font-size', String(style.fontSize || 14))
    el.setAttribute('fill', style.color || style.fontColor || '#000')
    el.setAttribute('text-anchor', style.textAlign === 'center' ? 'middle' : style.textAlign === 'right' ? 'end' : 'start')
    const content = graphic.config.customProps?.text || ''
    el.textContent = content
  }

  private createImage(
    graphic: IGraphic,
    geometry: { x: number; y: number; width: number; height: number },
    // style 预留，后续支持图片滤镜等样式
    _style: Record<string, any>
  ): SVGElement {
    const img = this.pool.acquire('image')
    img.setAttribute('x', String(geometry.x))
    img.setAttribute('y', String(geometry.y))
    img.setAttribute('width', String(geometry.width))
    img.setAttribute('height', String(geometry.height))
    const src = graphic.config.customProps?.src || graphic.config.customProps?.imageUrl || ''
    img.setAttribute('href', src)
    return img
  }

  private updateImage(
    el: SVGElement,
    geometry: { x: number; y: number; width: number; height: number },
    _style: Record<string, any>
  ): void {
    el.setAttribute('x', String(geometry.x))
    el.setAttribute('y', String(geometry.y))
    el.setAttribute('width', String(geometry.width))
    el.setAttribute('height', String(geometry.height))
  }

  private createLine(
    _graphic: IGraphic,
    geometry: { x: number; y: number; width: number; height: number },
    style: Record<string, any>
  ): SVGElement {
    const line = this.pool.acquire('line')
    const x1 = geometry.x
    const y1 = geometry.y
    const x2 = geometry.x + geometry.width
    const y2 = geometry.y + geometry.height
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    line.setAttribute('stroke', style.borderColor || '#000')
    line.setAttribute('stroke-width', String(style.borderWidth || 1))
    return line
  }

  private updateLine(
    el: SVGElement,
    geometry: { x: number; y: number; width: number; height: number },
    _style: Record<string, any>
  ): void {
    el.setAttribute('x1', String(geometry.x))
    el.setAttribute('y1', String(geometry.y))
    el.setAttribute('x2', String(geometry.x + geometry.width))
    el.setAttribute('y2', String(geometry.y + geometry.height))
    el.setAttribute('stroke', _style.borderColor || '#000')
    el.setAttribute('stroke-width', String(_style.borderWidth || 1))
  }

  private createForeignObject(
    graphic: IGraphic,
    geometry: { x: number; y: number; width: number; height: number },
    _style: Record<string, any>
  ): SVGElement {
    const fo = this.pool.acquire('foreignObject')
    fo.setAttribute('x', String(geometry.x))
    fo.setAttribute('y', String(geometry.y))
    fo.setAttribute('width', String(geometry.width))
    fo.setAttribute('height', String(geometry.height))

    const canvas = document.createElement('canvas')
    canvas.width = geometry.width
    canvas.height = geometry.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      try {
        graphic.draw(ctx)
      } catch {
        /* empty */
      }
    }
    const img = document.createElement('img')
    img.src = canvas.toDataURL()
    img.style.width = '100%'
    img.style.height = '100%'
    fo.appendChild(img)

    return fo
  }

  private updateForeignObject(
    el: SVGElement,
    graphic: IGraphic,
    geometry: { x: number; y: number; width: number; height: number },
    _style: Record<string, any>
  ): void {
    el.setAttribute('x', String(geometry.x))
    el.setAttribute('y', String(geometry.y))
    el.setAttribute('width', String(geometry.width))
    el.setAttribute('height', String(geometry.height))

    while (el.firstChild) {
      el.removeChild(el.firstChild)
    }

    const canvas = document.createElement('canvas')
    canvas.width = geometry.width
    canvas.height = geometry.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      try {
        graphic.draw(ctx)
      } catch {
        /* empty */
      }
    }
    const img = document.createElement('img')
    img.src = canvas.toDataURL()
    img.style.width = '100%'
    img.style.height = '100%'
    el.appendChild(img)
  }
}