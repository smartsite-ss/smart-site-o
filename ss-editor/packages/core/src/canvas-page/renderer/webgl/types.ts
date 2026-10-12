// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { GPUFeature, GPUInfo } from '../types';
import { IGraphic } from '@scada-editor/plugin-sdk';

export type { GPUFeature, GPUInfo };

export interface ShaderProgramConfig {
  name: string;
  vertexSource: string;
  fragmentSource: string;
  attributes: string[];
  uniforms: string[];
}

export interface BatchGroup {
  shaderName: string;
  graphics: IGraphic[];
  instanceCount: number;
}

export interface WebGLContextConfig {
  alpha: boolean;
  antialias: boolean;
  premultipliedAlpha: boolean;
  preserveDrawingBuffer: boolean;
  powerPreference: 'default' | 'high-performance' | 'low-power';
}