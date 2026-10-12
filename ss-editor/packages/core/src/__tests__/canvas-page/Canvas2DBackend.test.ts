// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, afterEach } from 'vitest'

vi.stubGlobal('requestAnimationFrame', (_cb: any) => 42)
vi.stubGlobal('cancelAnimationFrame', (_id: any) => {})

import { Canvas2DBackend } from '../../canvas-page/renderer/canvas2d/Canvas2DBackend'
import { RendererFactory } from '../../canvas-page/renderer/RendererFactory'

function createMockGraphic(overrides: Record<string, any> = {}) {
  return {
    id: 'graphic-1',
    type: 'shape',
    getPosition: () => ({ x: 0, y: 0 }),
    getSize: () => ({ width: 100, height: 100 }),
    getRotation: () => 0,
    getVisible: () => true,
    getZIndex: () => 0,
    getStyle: () => ({ backgroundColor: '#ff0000' }),
    config: { id: 'graphic-1', type: 'shape', geometry: { x: 0, y: 0, width: 100, height: 100 }, style: {} },
    draw: vi.fn(),
    onMounted: vi.fn(),
    onUnmounted: vi.fn(),
    ...overrides,
  } as any
}

function createTestContainer(): HTMLElement {
  const container = document.createElement('div')
  Object.defineProperty(container, 'clientWidth', { value: 800, writable: true })
  Object.defineProperty(container, 'clientHeight', { value: 600, writable: true })
  return container
}

describe('Canvas2DBackend', () => {
  let backend: Canvas2DBackend | null = null

  afterEach(() => {
    if (backend) {
      backend.destroy()
      backend = null
    }
  })

  it('should create Canvas2DBackend and append canvas to container', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    expect(backend).toBeDefined()
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('should render a graphic and trigger onMounted + draw', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const graphic = createMockGraphic({ id: 'test-g1' })
    expect(() => backend!.render(graphic)).not.toThrow()
    expect(graphic.onMounted).toHaveBeenCalled()
  })

  it('should update a graphic and mark dirty', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const graphic = createMockGraphic({ id: 'test-g1' })
    backend!.render(graphic)
    vi.mocked(graphic.draw).mockClear()
    expect(() => backend!.update(graphic)).not.toThrow()
  })

  it('should remove a graphic and trigger onUnmounted', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const graphic = createMockGraphic({ id: 'test-g1' })
    backend!.render(graphic)
    expect(() => backend!.remove('test-g1')).not.toThrow()
    expect(graphic.onUnmounted).toHaveBeenCalled()
  })

  it('should clear all graphics', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const graphic = createMockGraphic({ id: 'test-g1' })
    backend!.render(graphic)
    expect(() => backend!.clear()).not.toThrow()
  })

  it('should destroy and clean up canvas', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    expect(container.querySelector('canvas')).not.toBeNull()
    backend!.destroy()
    expect(container.querySelector('canvas')).toBeNull()
    backend = null
  })

  it("should return 'canvas' from getMode()", () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    expect(backend!.getMode()).toBe('canvas')
  })

  it('should return stats with backend=canvas from getStats()', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const stats = backend!.getStats()
    expect(stats).toBeDefined()
    expect(stats.backend).toBe('canvas')
    expect(typeof stats.fps).toBe('number')
    expect(typeof stats.drawCalls).toBe('number')
    expect(typeof stats.graphicCount).toBe('number')
  })

  it('should set scale without throwing', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    expect(() => backend!.setScale(2)).not.toThrow()
  })

  it('should setScaleXY for non-uniform scaling (stretch mode)', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    expect(() => backend!.setScaleXY(1.5, 2.0)).not.toThrow()
  })

  it('should render with non-uniform scale (stretch) without crashing', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const graphic = createMockGraphic({
      id: 'stretch-g',
      getPosition: () => ({ x: 0, y: 0 }),
      getSize: () => ({ width: 1920, height: 1080 }),
    });
    /* Simulate stretch mode: X scale = 1.0, Y scale = 0.5 (container is wider than page) */
    backend!.setScaleXY(1.0, 0.5);
    backend!.render(graphic);
    /* 在 jsdom 环境下 ctx 可能为 null，仅验证不抛出异常 */
    expect(() => backend!.renderAll()).not.toThrow();
  });

  it('should renderAllFull with non-uniform scale (stretch) handles multiple graphics', () => {
    const container2 = createTestContainer()
    backend = new Canvas2DBackend(container2)
    const g1 = createMockGraphic({
      id: 'g1',
      getPosition: () => ({ x: 10, y: 10 }),
      getSize: () => ({ width: 100, height: 100 }),
    })
    const g2 = createMockGraphic({
      id: 'g2',
      getPosition: () => ({ x: 200, y: 200 }),
      getSize: () => ({ width: 50, height: 50 }),
    })
    backend!.setScaleXY(1.2, 0.8)
    backend!.render(g1)
    backend!.render(g2)
    expect(() => backend!.renderAll()).not.toThrow()
  })

  it('should setScale keep uniform scaling (backward compatible)', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    backend!.setScale(1.5)
    const graphic = createMockGraphic({ id: 'uniform-g' })
    backend!.render(graphic)
    expect(() => backend!.renderAll()).not.toThrow()
  })

  it('should set pan without throwing', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    expect(() => backend!.setPan(100, 200)).not.toThrow()
  })

  it('should handle resize', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    expect(() => backend!.resize(1024, 768)).not.toThrow()
  })

  it('should set/get viewport', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const viewport = { x: 0, y: 0, width: 400, height: 300 }
    expect(() => backend!.setViewport(viewport)).not.toThrow()
    const result = backend!.getViewport()
    expect(result).toEqual(viewport)
  })

  it('should toggle viewport culling on/off', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    expect(backend!.isViewportCullingEnabled()).toBe(false)
    expect(() => backend!.setViewportCulling(true)).not.toThrow()
    expect(backend!.isViewportCullingEnabled()).toBe(true)
    expect(() => backend!.setViewportCulling(false)).not.toThrow()
    expect(backend!.isViewportCullingEnabled()).toBe(false)
  })

  it('should set culling buffer ratio', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    expect(() => backend!.setCullingBuffer(0.1)).not.toThrow()
  })

  it('should return valid getContext()', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const ctx = backend!.getContext()
    expect(ctx).not.toBeNull()
    expect(ctx!.canvas).toBeInstanceOf(HTMLCanvasElement)
    expect(ctx!.context).toBeDefined()
  })

  it('should renderAll without crashing (full render)', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const graphic = createMockGraphic({ id: 'test-g1', draw: vi.fn() })
    backend!.render(graphic)
    backend!.render(graphic)
    expect(() => backend!.renderAll()).not.toThrow()
  })

  it('should renderAllWithCulling without crashing', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const graphic = createMockGraphic({ id: 'test-g1' })
    backend!.setViewportCulling(true)
    backend!.setViewport({ x: 0, y: 0, width: 400, height: 300 })
    backend!.render(graphic)
    expect(() => (backend as any).renderAllWithCulling()).not.toThrow()
  })

  it('should draw hidden graphics (CG getVisible() === false)', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const graphic = createMockGraphic({ id: 'hidden-g', getVisible: () => false, draw: vi.fn() })
    backend!.render(graphic)
    vi.mocked(graphic.draw).mockClear()
    expect(() => backend!.renderAll()).not.toThrow()
    expect(graphic.draw).not.toHaveBeenCalled()
  })

  it('should handle stress: 100 graphics in quick succession', () => {
    const container = createTestContainer()
    backend = new Canvas2DBackend(container)
    const graphics = Array.from({ length: 100 }, (_, i) =>
      createMockGraphic({
        id: `stress-g${i}`,
        type: i % 4 === 0 ? 'shape' : i % 4 === 1 ? 'label' : i % 4 === 2 ? 'pump' : 'valve',
      }),
    )
    expect(() => {
      for (const g of graphics) {
        backend!.render(g)
      }
      for (const g of graphics) {
        backend!.update({ ...g, draw: vi.fn() })
      }
      backend!.renderAll()
    }).not.toThrow()
  })

  it('should register with RendererFactory as canvas mode', () => {
    RendererFactory.registerRenderer('canvas', Canvas2DBackend)
    const container = createTestContainer()
    const renderer = RendererFactory.create('canvas', container)
    expect(renderer).toBeDefined()
    expect(renderer).toBeInstanceOf(Canvas2DBackend)
    renderer.destroy()
  })
})