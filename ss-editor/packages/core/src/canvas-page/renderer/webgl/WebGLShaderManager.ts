// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ShaderProgramPool } from './ShaderProgramPool';
import { IGraphic } from '@scada-editor/plugin-sdk';

export class WebGLShaderManager {
  readonly pool: ShaderProgramPool;

  constructor(gl: WebGL2RenderingContext) {
    this.pool = new ShaderProgramPool(gl);
    this.compileBuiltinShaders();
  }

  registerCustomShader(name: string, vs: string, fs: string): void {
    try {
      this.pool.compileShader(name, vs, fs);
    } catch {
      /* empty */
    }
  }

  getProgram(name: string): WebGLProgram {
    return this.pool.getProgram(name);
  }

  getUniformLocation(programName: string, uniformName: string): WebGLUniformLocation | null {
    return this.pool.getUniformLocation(programName, uniformName);
  }

  clear(): void {
    this.pool.clear();
  }

  getShaderForGraphic(graphic: IGraphic): string | null {
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

  static parseColor(color: string): Float32Array {
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

  private compileBuiltinShaders(): void {
    try {
      this.pool.compileShader(
        'solid-color',
        ShaderProgramPool.SOLID_COLOR_VS,
        ShaderProgramPool.SOLID_COLOR_FS,
      );
      this.pool.compileShader(
        'gradient',
        ShaderProgramPool.GRADIENT_VS,
        ShaderProgramPool.GRADIENT_FS,
      );
      this.pool.compileShader(
        'rounded-rect',
        ShaderProgramPool.ROUNDED_RECT_VS,
        ShaderProgramPool.ROUNDED_RECT_FS,
      );
      this.pool.compileShader(
        'textured',
        ShaderProgramPool.TEXTURED_VS,
        ShaderProgramPool.TEXTURED_FS,
      );
    } catch {
      /* empty */
    }
  }
}