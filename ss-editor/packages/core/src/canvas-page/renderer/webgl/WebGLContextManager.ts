// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { GPUFeature, GPUInfo } from '../types';
import { WebGLContextConfig } from './types';

const DEFAULT_CONFIG: WebGLContextConfig = {
  alpha: true,
  antialias: true,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
};

export class WebGLContextManager {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private config: WebGLContextConfig;
  private onContextLost: (() => void) | null = null;
  private onContextRestored: (() => void) | null = null;
  private contextLost = false;
  private supportedExtensions: string[] = [];

  constructor(canvas: HTMLCanvasElement, config?: Partial<WebGLContextConfig>) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_CONFIG, ...config };

    try {
      const ctx = canvas.getContext('webgl2', {
        alpha: this.config.alpha,
        antialias: this.config.antialias,
        premultipliedAlpha: this.config.premultipliedAlpha,
        preserveDrawingBuffer: this.config.preserveDrawingBuffer,
        powerPreference: this.config.powerPreference,
      });

      if (ctx) {
        this.gl = ctx as WebGL2RenderingContext;
        this.supportedExtensions = this.gl.getSupportedExtensions() || [];
      }
    } catch {
      this.gl = null;
    }

    if (this.gl) {
      this.setupContextHandlers();
    }
  }

  getContext(): WebGL2RenderingContext | null {
    return this.contextLost ? null : this.gl;
  }

  isAvailable(): boolean {
    return this.gl !== null;
  }

  isContextLost(): boolean {
    return this.contextLost;
  }

  getExtension(name: string): any {
    try {
      if (!this.gl || this.contextLost) return null;
      return this.gl.getExtension(name);
    } catch {
      return null;
    }
  }

  getGPUInfo(): GPUInfo {
    try {
      if (!this.gl) {
        return {
          renderer: 'N/A',
          vendor: 'N/A',
          version: 'N/A',
          shadingLanguageVersion: 'N/A',
          maxTextureSize: 0,
          maxRenderbufferSize: 0,
          supportedExtensions: [],
          features: [],
        };
      }

      const debugInfo = this.getExtension('WEBGL_debug_renderer_info');
      const features = this.getSupportedFeatures();

      return {
        renderer: debugInfo ? this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A',
        vendor: debugInfo ? this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'N/A',
        version: this.gl.getParameter(this.gl.VERSION),
        shadingLanguageVersion: this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION),
        maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
        maxRenderbufferSize: this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE),
        supportedExtensions: this.supportedExtensions,
        features,
      };
    } catch {
      return {
        renderer: 'Error',
        vendor: 'Error',
        version: 'Error',
        shadingLanguageVersion: 'Error',
        maxTextureSize: 0,
        maxRenderbufferSize: 0,
        supportedExtensions: [],
        features: [],
      };
    }
  }

  checkFeature(feature: GPUFeature): boolean {
    try {
      if (!this.gl || this.contextLost) return false;

      switch (feature) {
        case 'gradient':
        case 'blur':
        case 'blend-mode':
        case 'pattern-fill':
          return true;
        case 'shadow':
          return this.supportedExtensions.indexOf('EXT_shader_texture_lod') >= 0;
        case 'particle':
          return true;
        case 'clip-path':
          return this.getContextAttributes()?.stencil === true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  resize(width: number, height: number): void {
    try {
      this.canvas.width = width;
      this.canvas.height = height;
      if (this.gl && !this.contextLost) {
        this.gl.viewport(0, 0, width, height);
      }
    } catch {
      /* empty */
    }
  }

  destroy(): void {
    try {
      if (this.gl && !this.contextLost) {
        const ext = this.gl.getExtension('WEBGL_lose_context');
        if (ext) {
          ext.loseContext();
        }
      }
      this.gl = null;
      this.supportedExtensions = [];
    } catch {
      /* empty */
    }
  }

  static isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('webgl2');
      return ctx !== null;
    } catch {
      return false;
    }
  }

  private setupContextHandlers(): void {
    if (!this.gl) return;

    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.contextLost = true;
      if (this.onContextLost) {
        this.onContextLost();
      }
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      if (this.onContextRestored) {
        this.onContextRestored();
      }
    });
  }

  private getSupportedFeatures(): GPUFeature[] {
    const features: GPUFeature[] = [];
    const allFeatures: GPUFeature[] = [
      'gradient', 'shadow', 'blur', 'particle',
      'blend-mode', 'clip-path', 'pattern-fill',
    ];

    for (const f of allFeatures) {
      if (this.checkFeature(f)) {
        features.push(f);
      }
    }

    return features;
  }

  private getContextAttributes(): WebGLContextAttributes | null {
    try {
      if (!this.gl) return null;
      return this.gl.getContextAttributes();
    } catch {
      return null;
    }
  }
}