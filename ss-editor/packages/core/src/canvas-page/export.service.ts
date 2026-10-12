// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IPage } from '../types';

/**
 * 导出服务
 * 支持将设计导出为不同的格式
 */
export class ExportService {
  /**
   * 导出为 PNG 格式
   * @param canvas Canvas 元素
   * @param filename 文件名
   */
  static exportAsPNG(
    canvas: HTMLCanvasElement,
    filename: string = 'design.png'
  ): void {
    try {
      const dataURL = canvas.toDataURL('image/png');
      this.downloadFile(dataURL, filename);
    } catch (error) {
      console.error('导出 PNG 失败:', error);
      throw error;
    }
  }

  /**
   * 导出为 JPEG 格式
   * @param canvas Canvas 元素
   * @param filename 文件名
   * @param quality 图片质量 (0-1)
   */
  static exportAsJPEG(
    canvas: HTMLCanvasElement,
    filename: string = 'design.jpg',
    quality: number = 0.9
  ): void {
    try {
      const dataURL = canvas.toDataURL('image/jpeg', quality);
      this.downloadFile(dataURL, filename);
    } catch (error) {
      console.error('导出 JPEG 失败:', error);
      throw error;
    }
  }

  /**
   * 导出为 SVG 格式
   * @param page 页面对象
   * @param filename 文件名
   */
  static exportAsSVG(page: IPage, filename: string = 'design.svg'): void {
    try {
      const svgContent = this.generateSVG(page);
      const dataURL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
      this.downloadFile(dataURL, filename);
    } catch (error) {
      console.error('导出 SVG 失败:', error);
      throw error;
    }
  }

  /**
   * 导出为 JSON 格式
   * @param page 页面对象
   * @param filename 文件名
   */
  static exportAsJSON(page: IPage, filename: string = 'design.json'): void {
    try {
      const jsonContent = JSON.stringify(page, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      this.downloadFile(url, filename);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出 JSON 失败:', error);
      throw error;
    }
  }

  /**
   * 下载文件
   * @param url 文件 URL
   * @param filename 文件名
   */
  private static downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 生成 SVG 内容
   * @param page 页面对象
   * @returns SVG 内容
   */
  private static generateSVG(page: IPage): string {
    const { width, height } = page.getSize();
    let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

    // 绘制图形
    const graphics = page.getGraphics();
    graphics.forEach((graphic) => {
      const { x, y } = graphic.getPosition();
      const { width: graphicWidth, height: graphicHeight } = graphic.getSize();
      const props = graphic.config.customProps;

      switch (graphic.type) {
        case 'button':
          svgContent += this.generateButtonSVG(
            x,
            y,
            graphicWidth,
            graphicHeight,
            props
          );
          break;
        case 'label':
          svgContent += this.generateLabelSVG(
            x,
            y,
            graphicWidth,
            graphicHeight,
            props
          );
          break;
        case 'input':
          svgContent += this.generateInputSVG(
            x,
            y,
            graphicWidth,
            graphicHeight,
            props
          );
          break;
        case 'image':
          svgContent += this.generateImageSVG(
            x,
            y,
            graphicWidth,
            graphicHeight,
            props
          );
          break;
        case 'shape':
          svgContent += this.generateShapeSVG(
            x,
            y,
            graphicWidth,
            graphicHeight,
            props
          );
          break;
        case 'textbox':
          svgContent += this.generateTextboxSVG(
            x,
            y,
            graphicWidth,
            graphicHeight,
            props
          );
          break;
        default:
          break;
      }
    });

    svgContent += '</svg>';
    return svgContent;
  }

  /**
   * 生成按钮的 SVG
   * @param x X 坐标
   * @param y Y 坐标
   * @param width 宽度
   * @param height 高度
   * @param props 属性
   * @returns SVG 字符串
   */
  private static generateButtonSVG(
    x: number,
    y: number,
    width: number,
    height: number,
    props: any
  ): string {
    const {
      text,
      backgroundColor,
      textColor,
      borderColor,
      borderWidth,
      borderRadius,
    } = props;
    return `
      <rect x="${x}" y="${y}" width="${width}" height="${height}" 
        rx="${borderRadius}" ry="${borderRadius}" 
        fill="${backgroundColor}" 
        stroke="${borderColor}" 
        stroke-width="${borderWidth}" />
      <text x="${x + width / 2}" y="${y + height / 2 + 5}" 
        text-anchor="middle" 
        fill="${textColor}" 
        font-size="14">${text}</text>
    `;
  }

  /**
   * 生成标签的 SVG
   * @param x X 坐标
   * @param y Y 坐标
   * @param width 宽度
   * @param height 高度
   * @param props 属性
   * @returns SVG 字符串
   */
  private static generateLabelSVG(
    x: number,
    y: number,
    width: number,
    height: number,
    props: any
  ): string {
    const { text, textColor, fontSize, fontWeight, textAlign } = props;
    let textAnchor = 'middle';
    if (textAlign === 'left') textAnchor = 'start';
    if (textAlign === 'right') textAnchor = 'end';
    return `
      <text x="${x + width / 2}" y="${y + height / 2 + 5}" 
        text-anchor="${textAnchor}" 
        fill="${textColor}" 
        font-size="${fontSize}" 
        font-weight="${fontWeight}">${text}</text>
    `;
  }

  /**
   * 生成输入框的 SVG
   * @param x X 坐标
   * @param y Y 坐标
   * @param width 宽度
   * @param height 高度
   * @param props 属性
   * @returns SVG 字符串
   */
  private static generateInputSVG(
    x: number,
    y: number,
    width: number,
    height: number,
    props: any
  ): string {
    const {
      backgroundColor,
      borderColor,
      borderWidth,
      placeholder,
      textColor,
    } = props;
    return `
      <rect x="${x}" y="${y}" width="${width}" height="${height}" 
        rx="4" ry="4" 
        fill="${backgroundColor}" 
        stroke="${borderColor}" 
        stroke-width="${borderWidth}" />
      <text x="${x + 10}" y="${y + height / 2 + 5}" 
        fill="${textColor}" 
        font-size="14">${placeholder}</text>
    `;
  }

  /**
   * 生成图片的 SVG
   * @param x X 坐标
   * @param y Y 坐标
   * @param width 宽度
   * @param height 高度
   * @param props 属性
   * @returns SVG 字符串
   */
  private static generateImageSVG(
    x: number,
    y: number,
    width: number,
    height: number,
    props: any
  ): string {
    const { imageUrl } = props;
    return `
      <image x="${x}" y="${y}" width="${width}" height="${height}" 
        href="${imageUrl}" />
    `;
  }

  /**
   * 生成形状的 SVG
   * @param x X 坐标
   * @param y Y 坐标
   * @param width 宽度
   * @param height 高度
   * @param props 属性
   * @returns SVG 字符串
   */
  private static generateShapeSVG(
    x: number,
    y: number,
    width: number,
    height: number,
    props: any
  ): string {
    const { shapeType, fillColor, borderColor, borderWidth } = props;
    let shapeSVG = '';

    switch (shapeType) {
      case 'rectangle':
        shapeSVG = `<rect x="${x}" y="${y}" width="${width}" height="${height}" 
          fill="${fillColor}" 
          stroke="${borderColor}" 
          stroke-width="${borderWidth}" />`;
        break;
      case 'circle':
        shapeSVG = `<circle cx="${x + width / 2}" cy="${y + height / 2}" r="${Math.min(width, height) / 2}" 
          fill="${fillColor}" 
          stroke="${borderColor}" 
          stroke-width="${borderWidth}" />`;
        break;
      case 'triangle':
        shapeSVG = `<polygon points="${x + width / 2},${y} ${x},${y + height} ${x + width},${y + height}" 
          fill="${fillColor}" 
          stroke="${borderColor}" 
          stroke-width="${borderWidth}" />`;
        break;
      default:
        break;
    }

    return shapeSVG;
  }

  /**
   * 生成文本框的 SVG
   * @param x X 坐标
   * @param y Y 坐标
   * @param width 宽度
   * @param height 高度
   * @param props 属性
   * @returns SVG 字符串
   */
  private static generateTextboxSVG(
    x: number,
    y: number,
    width: number,
    height: number,
    props: any
  ): string {
    const {
      text,
      backgroundColor,
      borderColor,
      borderWidth,
      textColor,
      padding,
      fontSize,
      fontWeight,
      textAlign,
    } = props;
    let textAnchor = 'start';
    if (textAlign === 'center') textAnchor = 'middle';
    if (textAlign === 'right') textAnchor = 'end';

    // 处理多行文本
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.5;
    let textSVG = '';

    lines.forEach((line: string, index: number) => {
      textSVG += `
        <text x="${x + padding}" y="${y + padding + (index + 1) * lineHeight}" 
          text-anchor="${textAnchor}" 
          fill="${textColor}" 
          font-size="${fontSize}" 
          font-weight="${fontWeight}">${line}</text>
      `;
    });

    return `
      <rect x="${x}" y="${y}" width="${width}" height="${height}" 
        fill="${backgroundColor}" 
        stroke="${borderColor}" 
        stroke-width="${borderWidth}" />
      ${textSVG}
    `;
  }
}
