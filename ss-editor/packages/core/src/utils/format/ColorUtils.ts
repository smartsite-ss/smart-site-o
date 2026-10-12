// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 颜色管理工具类
 */
export class ColorUtils {
  /**
   * RGB颜色接口
   */
  public static rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  /**
   * HEX颜色转换为RGB
   * @param hex HEX颜色值
   * @returns RGB颜色对象
   */
  public static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * RGB转换为HSL
   * @param r 红色通道值 (0-255)
   * @param g 绿色通道值 (0-255)
   * @param b 蓝色通道值 (0-255)
   * @returns HSL颜色对象
   */
  public static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h, s, l };
  }

  /**
   * HSL转换为RGB
   * @param h 色相 (0-1)
   * @param s 饱和度 (0-1)
   * @param l 亮度 (0-1)
   * @returns RGB颜色对象
   */
  public static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  /**
   * 调整颜色亮度
   * @param color HEX颜色值
   * @param amount 亮度调整量 (-1 到 1)
   * @returns 调整后的HEX颜色值
   */
  public static adjustBrightness(color: string, amount: number): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;

    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.l = Math.max(0, Math.min(1, hsl.l + amount));

    const adjustedRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    return this.rgbToHex(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b);
  }

  /**
   * 混合两种颜色
   * @param color1 第一种颜色 (HEX)
   * @param color2 第二种颜色 (HEX)
   * @param ratio 混合比例 (0-1)
   * @returns 混合后的HEX颜色值
   */
  public static mixColors(color1: string, color2: string, ratio: number): string {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    if (!rgb1 || !rgb2) return color1;

    const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
    const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
    const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

    return this.rgbToHex(r, g, b);
  }

  /**
   * 生成对比色
   * @param color HEX颜色值
   * @returns 对比色 (HEX)
   */
  public static getContrastColor(color: string): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return '#000000';

    // 计算亮度
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  /**
   * 解析颜色字符串，支持HEX、RGB、RGBA格式
   * @param color 颜色字符串
   * @returns 颜色对象
   */
  public static parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
    // 处理HEX格式
    if (color.startsWith('#')) {
      const rgb = this.hexToRgb(color);
      if (rgb) {
        return { ...rgb, a: 1 };
      }
    }

    // 处理RGB格式
    const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
        a: 1
      };
    }

    // 处理RGBA格式
    const rgbaMatch = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)$/);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1]),
        g: parseInt(rgbaMatch[2]),
        b: parseInt(rgbaMatch[3]),
        a: parseFloat(rgbaMatch[4])
      };
    }

    return null;
  }

  /**
   * 将颜色对象转换为RGBA字符串
   * @param color 颜色对象
   * @returns RGBA字符串
   */
  public static toRgbaString(color: { r: number; g: number; b: number; a: number }): string {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }

  /**
   * 将颜色对象转换为RGB字符串
   * @param color 颜色对象
   * @returns RGB字符串
   */
  public static toRgbString(color: { r: number; g: number; b: number }): string {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  /**
   * 解析 hex 颜色为数值（安全版）
   * 处理 #RRGGBB 和 #RRGGBBAA 格式，输出无符号 32 位整数
   */
  private static _parseHexForColorMath(hex: string): number {
    let h = hex.replace('#', '');
    if (h.length === 8) h = h.substring(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return 0;
    return parseInt(h, 16) >>> 0;
  }

  /**
   * 使颜色变亮（线性偏移），amount 范围 0-1
   */
  public static lightenColor(hex: string, amount: number): string {
    const num = this._parseHexForColorMath(hex);
    const delta = Math.round(255 * amount);
    const r = Math.min(255, ((num >> 16) & 0xFF) + delta);
    const g = Math.min(255, ((num >> 8) & 0xFF) + delta);
    const b = Math.min(255, (num & 0xFF) + delta);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * 使颜色变暗（线性偏移），amount 范围 0-1
   */
  public static darkenColor(hex: string, amount: number): string {
    const num = this._parseHexForColorMath(hex);
    const delta = Math.round(255 * amount);
    const r = Math.max(0, ((num >> 16) & 0xFF) - delta);
    const g = Math.max(0, ((num >> 8) & 0xFF) - delta);
    const b = Math.max(0, (num & 0xFF) - delta);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * 向白色方向插值，percent 范围 0-100
   */
  public static lightenTowardsWhite(hex: string, percent: number): string {
    const rgb = this.parseColor(hex);
    if (!rgb) return hex;
    const factor = percent / 100;
    const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor));
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * 向黑色方向插值，percent 范围 0-100
   */
  public static darkenTowardsBlack(hex: string, percent: number): string {
    const rgb = this.parseColor(hex);
    if (!rgb) return hex;
    const factor = percent / 100;
    const r = Math.max(0, Math.floor(rgb.r * (1 - factor)));
    const g = Math.max(0, Math.floor(rgb.g * (1 - factor)));
    const b = Math.max(0, Math.floor(rgb.b * (1 - factor)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * HEX颜色 + 透明度 → RGBA 字符串
   */
  public static hexToRgba(hex: string, alpha: number): string {
    const num = this._parseHexForColorMath(hex);
    const r = (num >> 16) & 0xFF;
    const g = (num >> 8) & 0xFF;
    const b = num & 0xFF;
    return `rgba(${r},${g},${b},${alpha})`;
  }
}