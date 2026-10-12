// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';
import { WebGLShaderManager } from './WebGLShaderManager';
import { WebGLFallbackBridge } from './WebGLFallbackBridge';

export class BatchProcessor {
  private gl: WebGL2RenderingContext;
  private shaderManager: WebGLShaderManager;
  private fallbackBridge: WebGLFallbackBridge;
  private canvas: HTMLCanvasElement;

  constructor(
    gl: WebGL2RenderingContext,
    shaderManager: WebGLShaderManager,
    fallbackBridge: WebGLFallbackBridge,
    canvas: HTMLCanvasElement,
  ) {
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.fallbackBridge = fallbackBridge;
    this.canvas = canvas;
    this.setupQuadBuffer();
  }

  setupQuadBuffer(): void {
    try {
      const vertices = new Float32Array([
        0, 0,
        0, 1,
        1, 0,
        1, 1,
      ]);

      const buffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    } catch {
      /* empty */
    }
  }

  drawGraphic(graphic: IGraphic, shaderName: string, scale: number, panX: number, panY: number): void {
    try {
      const program = this.shaderManager.getProgram(shaderName);
      if (!program) return;

      this.gl.useProgram(program);

      const pos = graphic.getPosition();
      const size = graphic.getSize();

      const matrixLoc = this.shaderManager.getUniformLocation(shaderName, 'u_matrix');
      if (matrixLoc) {
        const sx = 2.0 / this.canvas.width * scale;
        const sy = -2.0 / this.canvas.height * scale;
        const tx = -1 + 2.0 * (panX + pos.x * scale) / this.canvas.width;
        const ty = 1 - 2.0 * (panY + pos.y * scale) / this.canvas.height;
        const matrix = new Float32Array([
          sx, 0, 0,
          0, sy, 0,
          tx, ty, 1,
        ]);
        this.gl.uniformMatrix3fv(matrixLoc, false, matrix);
      }

      const colorLoc = this.shaderManager.getUniformLocation(shaderName, 'u_color');
      if (colorLoc) {
        const style = graphic.getStyle();
        const color = style?.backgroundColor || style?.color || '#000000';
        const rgba = WebGLShaderManager.parseColor(color);
        this.gl.uniform4fv(colorLoc, rgba);
      }

      const sizeLoc = this.shaderManager.getUniformLocation(shaderName, 'u_size');
      if (sizeLoc) {
        this.gl.uniform2f(sizeLoc, size.width, size.height);
      }

      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    } catch {
      /* empty */
    }
  }

  renderAllWithFallback(graphics: Map<string, IGraphic>): void {
    try {
      const renderer = this.fallbackBridge.getCanvasRenderer();
      const allGraphics = Array.from(graphics.values());
      renderer.clear();
      for (const graphic of allGraphics) {
        renderer.render(graphic);
      }
    } catch {
      /* empty */
    }
  }
}