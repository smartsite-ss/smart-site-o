// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';
import { ShaderProgramPool } from './ShaderProgramPool';
import { BatchGroup } from './types';

export class BatchRenderer {
  private gl: WebGL2RenderingContext;
  private shaderPool: ShaderProgramPool;
  private batchGroups: BatchGroup[] = [];
  private minBatchSize: number;

  constructor(gl: WebGL2RenderingContext, shaderPool: ShaderProgramPool, minBatchSize: number = 8) {
    this.gl = gl;
    this.shaderPool = shaderPool;
    this.minBatchSize = minBatchSize;
  }

  buildBatches(graphics: IGraphic[]): BatchGroup[] {
    this.clear();
    const groupMap = new Map<string, IGraphic[]>();

    for (const graphic of graphics) {
      if (!graphic.getVisible()) continue;

      const shaderName = this.getShaderForGraphic(graphic);
      if (!shaderName) continue;

      let group = groupMap.get(shaderName);
      if (!group) {
        group = [];
        groupMap.set(shaderName, group);
      }
      group.push(graphic);
    }

    groupMap.forEach((gfx, shaderName) => {
      this.batchGroups.push({
        shaderName,
        graphics: gfx,
        instanceCount: gfx.length,
      });
    });

    return this.batchGroups;
  }

  renderBatch(group: BatchGroup): void {
    try {
      const program = this.shaderPool.getProgram(group.shaderName);
      if (!program) return;

      this.gl.useProgram(program);

      if (group.instanceCount >= this.minBatchSize) {
        this.renderInstanced(group);
      } else {
        this.renderIndividually(group);
      }
    } catch {
      /* empty */
    }
  }

  renderBatches(groups: BatchGroup[]): void {
    for (const group of groups) {
      this.renderBatch(group);
    }
  }

  shouldBatch(graphic: IGraphic): boolean {
    return !!this.getShaderForGraphic(graphic);
  }

  clear(): void {
    this.batchGroups = [];
  }

  getStats(): { totalBatches: number; totalInstances: number } {
    let totalInstances = 0;
    for (const group of this.batchGroups) {
      totalInstances += group.instanceCount;
    }
    return {
      totalBatches: this.batchGroups.length,
      totalInstances,
    };
  }

  private renderInstanced(group: BatchGroup): void {
    for (const graphic of group.graphics) {
      this.setupGraphicUniforms(graphic, group.shaderName);
      this.drawQuad();
    }
  }

  private renderIndividually(group: BatchGroup): void {
    for (const graphic of group.graphics) {
      this.setupGraphicUniforms(graphic, group.shaderName);
      this.drawQuad();
    }
  }

  private setupGraphicUniforms(graphic: IGraphic, shaderName: string): void {
    try {
      const pos = graphic.getPosition();
      const size = graphic.getSize();

      const matrixLoc = this.shaderPool.getUniformLocation(shaderName, 'u_matrix');
      if (matrixLoc) {
        const matrix = new Float32Array([
          2.0 / this.gl.canvas.width, 0, 0,
          0, -2.0 / this.gl.canvas.height, 0,
          -1 + 2.0 * pos.x / this.gl.canvas.width,
          1 - 2.0 * pos.y / this.gl.canvas.height,
          1,
        ]);
        this.gl.uniformMatrix3fv(matrixLoc, false, matrix);
      }

      const colorLoc = this.shaderPool.getUniformLocation(shaderName, 'u_color');
      if (colorLoc) {
        const style = graphic.getStyle();
        const color = style?.backgroundColor || style?.color || '#000000';
        const rgba = this.parseColor(color);
        this.gl.uniform4fv(colorLoc, rgba);
      }

      const sizeLoc = this.shaderPool.getUniformLocation(shaderName, 'u_size');
      if (sizeLoc) {
        this.gl.uniform2f(sizeLoc, size.width, size.height);
      }
    } catch {
      /* empty */
    }
  }

  private drawQuad(): void {
    try {
      const buffer = this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING);
      if (buffer) {
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      }
    } catch {
      /* empty */
    }
  }

  private getShaderForGraphic(graphic: IGraphic): string | null {
    const type = graphic.type;

    switch (type) {
      case 'shape':
      case 'button':
        return 'solid-color';
      case 'label':
      case 'textbox':
        return 'textured';
      case 'chart':
      case 'gauge':
      case 'tank':
      case 'valve':
      case 'pump':
        return 'solid-color';
      default:
        return 'solid-color';
    }
  }

  private parseColor(color: string): Float32Array {
    try {
      if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
          const r = parseInt(hex[0] + hex[0], 16) / 255;
          const g = parseInt(hex[1] + hex[1], 16) / 255;
          const b = parseInt(hex[2] + hex[2], 16) / 255;
          return new Float32Array([r, g, b, 1.0]);
        }
        if (hex.length === 6 || hex.length === 8) {
          const r = parseInt(hex.slice(0, 2), 16) / 255;
          const g = parseInt(hex.slice(2, 4), 16) / 255;
          const b = parseInt(hex.slice(4, 6), 16) / 255;
          const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1.0;
          return new Float32Array([r, g, b, a]);
        }
      }

      if (color.startsWith('rgb')) {
        const match = color.match(/[\d.]+/g);
        if (match && match.length >= 3) {
          return new Float32Array([
            parseFloat(match[0]) / 255,
            parseFloat(match[1]) / 255,
            parseFloat(match[2]) / 255,
            match.length >= 4 ? parseFloat(match[3]) : 1.0,
          ]);
        }
      }

      return new Float32Array([0, 0, 0, 1.0]);
    } catch {
      return new Float32Array([0, 0, 0, 1.0]);
    }
  }
}