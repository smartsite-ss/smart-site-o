// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk'
import {
  IRendererV2,
  RenderManagerConfig,
  RenderMode,
  RenderStats,
  GraphicAssignment,
} from './types'

export class RenderManager {
  private backends: Map<RenderMode, IRendererV2> = new Map()
  private activeMode: RenderMode
  private config: RenderManagerConfig
  private graphicAssignments: Map<string, RenderMode> = new Map()

  constructor(config: RenderManagerConfig) {
    this.config = {
      defaultMode: config.defaultMode,
      autoDetect: config.autoDetect,
      enableFallback: config.enableFallback,
      allowedModes: config.allowedModes || [],
    }
    this.activeMode = config.defaultMode
  }

  registerBackend(mode: RenderMode, renderer: IRendererV2): void {
    this.backends.set(mode, renderer)
  }

  unregisterBackend(mode: RenderMode): void {
    this.backends.delete(mode)
  }

  setActiveMode(mode: RenderMode): void {
    if (this.config.allowedModes.length > 0 && !this.config.allowedModes.includes(mode)) {
      if (this.config.enableFallback) {
        mode = this.config.allowedModes[0]
      } else {
        return
      }
    }
    this.activeMode = mode
  }

  getActiveBackend(): IRendererV2 | undefined {
    return this.backends.get(this.activeMode)
  }

  getBackend(mode: RenderMode): IRendererV2 | undefined {
    return this.backends.get(mode)
  }

  getAllBackends(): IRendererV2[] {
    return Array.from(this.backends.values())
  }

  assignOptimalBackend(graphic: IGraphic): RenderMode {
    if (!this.config.autoDetect) {
      return this.activeMode
    }

    const renderHint: string | undefined =
      (graphic.config.customProps && graphic.config.customProps.renderHint) ||
      undefined

    if (renderHint === 'static' && this.backends.has('svg')) {
      const assignment: GraphicAssignment = {
        graphicId: graphic.id,
        assignedBackend: 'svg',
        reason: 'static render hint → SVG',
      }
      this.addGraphicAssignment(graphic.id, assignment)
      return 'svg'
    }

    if (renderHint === 'gpu-accelerated' && this.backends.has('webgl')) {
      const assignment: GraphicAssignment = {
        graphicId: graphic.id,
        assignedBackend: 'webgl',
        reason: 'gpu-accelerated render hint → WebGL',
      }
      this.addGraphicAssignment(graphic.id, assignment)
      return 'webgl'
    }

    return this.activeMode
  }

  private addGraphicAssignment(graphicId: string, assignment: GraphicAssignment): void {
    this.graphicAssignments.set(graphicId, assignment.assignedBackend)
  }

  render(graphic: IGraphic): void {
    const mode = this.assignOptimalBackend(graphic)
    const backend = this.backends.get(mode)
    if (backend) {
      try {
        backend.render(graphic)
      } catch {
        /* empty */
      }
    } else {
      const fallback = this.getActiveBackend()
      if (fallback) {
        try {
          fallback.render(graphic)
        } catch {
          /* empty */
        }
      }
    }
  }

  update(graphic: IGraphic): void {
    const mode = this.graphicAssignments.get(graphic.id) || this.activeMode
    const backend = this.backends.get(mode)
    if (backend) {
      try {
        backend.update(graphic)
      } catch {
        /* empty */
      }
    } else {
      const fallback = this.getActiveBackend()
      if (fallback) {
        try {
          fallback.update(graphic)
        } catch {
          /* empty */
        }
      }
    }
  }

  remove(graphicId: string): void {
    const mode = this.graphicAssignments.get(graphicId)
    if (mode) {
      const backend = this.backends.get(mode)
      if (backend) {
        try {
          backend.remove(graphicId)
        } catch {
          /* empty */
        }
      }
      this.graphicAssignments.delete(graphicId)
      return
    }

    this.backends.forEach((backend) => {
      try {
        backend.remove(graphicId)
      } catch {
        /* empty */
      }
    })
    this.graphicAssignments.delete(graphicId)
  }

  clear(): void {
    this.backends.forEach((backend) => {
      try {
        backend.clear()
      } catch {
        /* empty */
      }
    })
    this.graphicAssignments.clear()
  }

  destroy(): void {
    this.backends.forEach((backend) => {
      try {
        backend.destroy()
      } catch {
        /* empty */
      }
    })
    this.backends.clear()
    this.graphicAssignments.clear()
  }

  getStats(): Map<RenderMode, RenderStats> {
    const stats = new Map<RenderMode, RenderStats>()
    this.backends.forEach((backend, mode) => {
      stats.set(mode, backend.getStats())
    })
    return stats
  }

  getConfig(): RenderManagerConfig {
    return { ...this.config }
  }
}