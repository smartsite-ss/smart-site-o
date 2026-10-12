// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';
import { ISpatialIndex, ViewportRect } from '../types';

export class GridSpatialIndex implements ISpatialIndex {
  private cellSize: number;
  private grid: Map<string, Set<IGraphic>> = new Map();
  private graphicCells: Map<string, string[]> = new Map();

  constructor(cellSize: number = 256) {
    this.cellSize = cellSize;
  }

  build(graphics: IGraphic[]): void {
    this.clear();
    for (const graphic of graphics) {
      this.insert(graphic);
    }
  }

  query(viewport: ViewportRect): IGraphic[] {
    const result: IGraphic[] = [];
    const visited = new Set<string>();

    const minCx = Math.floor(viewport.x / this.cellSize);
    const minCy = Math.floor(viewport.y / this.cellSize);
    const maxCx = Math.floor((viewport.x + viewport.width) / this.cellSize);
    const maxCy = Math.floor((viewport.y + viewport.height) / this.cellSize);

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = `${cx},${cy}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (const graphic of cell) {
            if (!visited.has(graphic.id)) {
              visited.add(graphic.id);
              if (this.intersectsViewport(graphic, viewport)) {
                result.push(graphic);
              }
            }
          }
        }
      }
    }

    return result;
  }

  clear(): void {
    this.grid.clear();
    this.graphicCells.clear();
  }

  private insert(graphic: IGraphic): void {
    try {
      const pos = graphic.getPosition();
      const size = graphic.getSize();
      let bounds: { x: number; y: number; width: number; height: number };
      const rotation = graphic.getRotation?.() || 0;
      if (rotation !== 0 && typeof (graphic as any).getBounds === 'function') {
        const b = (graphic as any).getBounds();
        bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
      } else {
        bounds = { x: pos.x, y: pos.y, width: size.width, height: size.height };
      }

      const minCx = Math.floor(bounds.x / this.cellSize);
      const minCy = Math.floor(bounds.y / this.cellSize);
      const maxCx = Math.floor((bounds.x + bounds.width) / this.cellSize);
      const maxCy = Math.floor((bounds.y + bounds.height) / this.cellSize);

      const cells: string[] = [];
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cx = minCx; cx <= maxCx; cx++) {
          const key = `${cx},${cy}`;
          let cell = this.grid.get(key);
          if (!cell) {
            cell = new Set();
            this.grid.set(key, cell);
          }
          cell.add(graphic);
          cells.push(key);
        }
      }
      this.graphicCells.set(graphic.id, cells);
    } catch {
      /* empty */
    }
  }

  private intersectsViewport(graphic: IGraphic, viewport: ViewportRect): boolean {
    try {
      const pos = graphic.getPosition();
      const size = graphic.getSize();
      return (
        pos.x + size.width > viewport.x &&
        pos.x < viewport.x + viewport.width &&
        pos.y + size.height > viewport.y &&
        pos.y < viewport.y + viewport.height
      );
    } catch {
      return true;
    }
  }
}