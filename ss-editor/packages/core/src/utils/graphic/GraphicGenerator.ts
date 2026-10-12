// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../graphic-editing/graphic/factory/GraphicFactory';
import {
  GenerateConfig,
  BatchGenerateConfig,
  GenerateResult,
  GridOptions,
  RandomOptions,
} from './GraphicGeneratorTypes';

// 预设颜色池
const COLOR_POOL = [
  '#2196F3FF', '#4CAF50FF', '#FF9800FF', '#F44336FF', '#9C27B0FF',
  '#00BCD4FF', '#FFEB3BFF', '#795548FF', '#607D8BFF', '#E91E63FF',
  '#3F51B5FF', '#009688FF', '#FFC107FF', '#8BC34AFF', '#03A9F4FF',
];

/**
 * 动态图元生成器
 * 用于快速生成指定数量、指定类型的图元，支持多种布局模式
 */
export class GraphicGenerator {
  constructor() {}

  /**
   * 生成指定数量的图元
   * @param config 生成配置
   * @returns 生成结果
   */
  generate(config: GenerateConfig): GenerateResult {
    const startTime = performance.now();
    
    // 验证配置
    this.validateConfig(config);
    
    // 生成位置
    const positions = this.calculatePositions(config);
    
    // 生成图元
    const graphics: IGraphic[] = [];
    positions.forEach((pos, index) => {
      const graphic = this.createGraphic(config, pos, index);
      if (graphic) {
        graphics.push(graphic);
      }
    });
    
    const duration = performance.now() - startTime;
    
    return {
      graphics,
      duration,
      count: graphics.length,
    };
  }

  /**
   * 批量生成多种图元
   * @param config 批量配置
   * @returns 生成结果
   */
  batchGenerate(config: BatchGenerateConfig): GenerateResult {
    const startTime = performance.now();
    const graphics: IGraphic[] = [];
    
    let currentX = 50;
    let currentY = 50;
    
    config.graphics.forEach(graphicConfig => {
      const width = graphicConfig.width || 100;
      const height = graphicConfig.height || 80;
      
      const x = graphicConfig.x ?? currentX;
      const y = graphicConfig.y ?? currentY;
      
      const graphic = GraphicFactory.createGraphic(
        graphicConfig.type,
        x,
        y,
        width,
        height
      );
      
      if (graphic && graphicConfig.customProps) {
        Object.entries(graphicConfig.customProps).forEach(([key, value]) => {
          graphic.setProps(key, value);
        });
      }
      
      if (graphic) {
        graphics.push(graphic);
      }
      
      currentX += width + 20;
      if (currentX > 1800) {
        currentX = 50;
        currentY += height + 20;
      }
    });
    
    const duration = performance.now() - startTime;
    
    return {
      graphics,
      duration,
      count: graphics.length,
    };
  }

  /**
   * 便捷方法：生成网格布局的图元
   * @param type 图元类型
   * @param count 数量
   * @param options 网格选项
   * @returns 图元数组
   */
  generateGrid(type: string, count: number, options?: GridOptions): IGraphic[] {
    const result = this.generate({
      type,
      count,
      layoutMode: 'grid',
      startX: options?.startX ?? 50,
      startY: options?.startY ?? 50,
      areaWidth: 1920,
      areaHeight: 1080,
      cols: options?.cols ?? Math.ceil(Math.sqrt(count)),
      gapX: options?.gapX ?? 20,
      gapY: options?.gapY ?? 20,
      fixedWidth: options?.width ?? 100,
      fixedHeight: options?.height ?? 80,
    });
    return result.graphics;
  }

  /**
   * 便捷方法：生成随机布局的图元
   * @param type 图元类型
   * @param count 数量
   * @param options 随机选项
   * @returns 图元数组
   */
  generateRandom(type: string, count: number, options?: RandomOptions): IGraphic[] {
    const result = this.generate({
      type,
      count,
      layoutMode: 'random',
      startX: 0,
      startY: 0,
      areaWidth: options?.areaWidth ?? 1920,
      areaHeight: options?.areaHeight ?? 1080,
      minWidth: options?.minWidth ?? 60,
      maxWidth: options?.maxWidth ?? 120,
      minHeight: options?.minHeight ?? 30,
      maxHeight: options?.maxHeight ?? 60,
      randomColors: options?.randomColors ?? true,
      randomSizes: options?.randomSizes ?? true,
      randomRotation: options?.randomRotation ?? false,
    });
    return result.graphics;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: GenerateConfig): void {
    if (config.count <= 0) {
      throw new Error('Count must be greater than 0');
    }
    if (config.areaWidth <= 0 || config.areaHeight <= 0) {
      throw new Error('Area dimensions must be greater than 0');
    }
  }

  /**
   * 计算所有位置
   */
  private calculatePositions(config: GenerateConfig): { x: number; y: number }[] {
    switch (config.layoutMode) {
      case 'grid':
        return this.layoutGrid(config);
      case 'random':
        return this.layoutRandom(config);
      case 'flow':
        return this.layoutFlow(config);
      case 'spiral':
        return this.layoutSpiral(config);
      default:
        return this.layoutGrid(config);
    }
  }

  /**
   * 网格布局
   */
  private layoutGrid(config: GenerateConfig): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const cols = config.cols ?? Math.ceil(Math.sqrt(config.count));
    const gapX = config.gapX ?? 20;
    const gapY = config.gapY ?? 20;
    const width = config.fixedWidth ?? 100;
    const height = config.fixedHeight ?? 80;
    
    for (let i = 0; i < config.count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({
        x: config.startX + col * (width + gapX),
        y: config.startY + row * (height + gapY),
      });
    }
    
    return positions;
  }

  /**
   * 随机布局
   */
  private layoutRandom(config: GenerateConfig): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const width = config.fixedWidth ?? 100;
    const height = config.fixedHeight ?? 80;
    
    for (let i = 0; i < config.count; i++) {
      positions.push({
        x: config.startX + Math.random() * (config.areaWidth - width - config.startX),
        y: config.startY + Math.random() * (config.areaHeight - height - config.startY),
      });
    }
    
    return positions;
  }

  /**
   * 流式布局
   */
  private layoutFlow(config: GenerateConfig): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const gapX = config.gapX ?? 20;
    const gapY = config.gapY ?? 20;
    const width = config.fixedWidth ?? 100;
    const height = config.fixedHeight ?? 80;
    
    let currentX = config.startX;
    let currentY = config.startY;
    
    for (let i = 0; i < config.count; i++) {
      positions.push({ x: currentX, y: currentY });
      
      currentX += width + gapX;
      
      if (currentX + width > config.startX + config.areaWidth) {
        currentX = config.startX;
        currentY += height + gapY;
      }
    }
    
    return positions;
  }

  /**
   * 螺旋布局
   */
  private layoutSpiral(config: GenerateConfig): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const centerX = config.startX + config.areaWidth / 2;
    const centerY = config.startY + config.areaHeight / 2;
    const width = config.fixedWidth ?? 100;
    const height = config.fixedHeight ?? 80;
    
    let angle = 0;
    let radius = 50;
    
    for (let i = 0; i < config.count; i++) {
      const x = centerX + Math.cos(angle) * radius - width / 2;
      const y = centerY + Math.sin(angle) * radius - height / 2;
      
      positions.push({ x, y });
      
      angle += 0.8;
      radius += 3;
    }
    
    return positions;
  }

  /**
   * 创建单个图元
   */
  private createGraphic(config: GenerateConfig, pos: { x: number; y: number }, index: number): IGraphic | null {
    let width: number;
    let height: number;
    
    if (config.randomSizes) {
      width = this.randomNumber(config.minWidth ?? 60, config.maxWidth ?? 120);
      height = this.randomNumber(config.minHeight ?? 30, config.maxHeight ?? 60);
    } else {
      width = config.fixedWidth ?? 100;
      height = config.fixedHeight ?? 80;
    }
    
    try {
      const graphic = GraphicFactory.createGraphic(config.type, pos.x, pos.y, width, height);
      
      // 随机颜色
      if (config.randomColors) {
        const color = this.randomColor();
        graphic.setStyle({ fillColor: color });
      }
      
      // 随机旋转
      if (config.randomRotation) {
        graphic.setRotation(this.randomRotation());
      }
      
      return graphic;
    } catch (error) {
      console.error(`Failed to create graphic ${index}:`, error);
      return null;
    }
  }

  /**
   * 生成随机颜色
   */
  private randomColor(): string {
    return COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];
  }

  /**
   * 生成范围内的随机数
   */
  private randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 生成随机旋转角度
   */
  private randomRotation(): number {
    return Math.random() * 360;
  }
}
