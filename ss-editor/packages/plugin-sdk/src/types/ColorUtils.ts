// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export class ColorUtils {
  static rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h, s, l };
  }

  static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    if (s === 0) {
      const v = Math.round(l * 255);
      return { r: v, g: v, b: v };
    }

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    };
  }

  static lightenColor(hex: string, amount: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    const r = Math.min(255, Math.max(0, rgb.r + Math.round(amount * 255)));
    const g = Math.min(255, Math.max(0, rgb.g + Math.round(amount * 255)));
    const b = Math.min(255, Math.max(0, rgb.b + Math.round(amount * 255)));
    return this.rgbToHex(r, g, b);
  }

  static darkenColor(hex: string, amount: number): string {
    return this.lightenColor(hex, -amount);
  }

  static hexToRgba(hex: string, alpha: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, alpha))})`;
  }

  static adjustBrightness(color: string, amount: number): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.l = Math.max(0, Math.min(1, hsl.l + amount));
    const adjusted = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    return this.rgbToHex(adjusted.r, adjusted.g, adjusted.b);
  }

  static mixColors(color1: string, color2: string, ratio: number): string {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    if (!rgb1 || !rgb2) return color1;
    const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
    const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
    const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);
    return this.rgbToHex(r, g, b);
  }

  static getContrastColor(color: string): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return '#000000';
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  static parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
    if (color.startsWith('#')) {
      const rgb = this.hexToRgb(color);
      return rgb ? { ...rgb, a: 1 } : null;
    }
    const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
      return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]), a: 1 };
    }
    const rgbaMatch = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)$/);
    if (rgbaMatch) {
      return { r: parseInt(rgbaMatch[1]), g: parseInt(rgbaMatch[2]), b: parseInt(rgbaMatch[3]), a: parseFloat(rgbaMatch[4]) };
    }
    return null;
  }

  static toRgbaString(color: { r: number; g: number; b: number; a: number }): string {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }

  static toRgbString(color: { r: number; g: number; b: number }): string {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  static lightenTowardsWhite(hex: string, percent: number): string {
    const rgb = this.parseColor(hex);
    if (!rgb) return hex;
    const factor = percent / 100;
    const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor));
    return `rgb(${r}, ${g}, ${b})`;
  }

  static darkenTowardsBlack(hex: string, percent: number): string {
    const rgb = this.parseColor(hex);
    if (!rgb) return hex;
    const factor = percent / 100;
    const r = Math.max(0, Math.floor(rgb.r * (1 - factor)));
    const g = Math.max(0, Math.floor(rgb.g * (1 - factor)));
    const b = Math.max(0, Math.floor(rgb.b * (1 - factor)));
    return `rgb(${r}, ${g}, ${b})`;
  }
}