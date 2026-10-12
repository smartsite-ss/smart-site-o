// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface GraphicStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  [key: string]: any;
}

export class GraphicStyleManager {
  private static defaultStyles: Record<string, GraphicStyle> = {
    default: {
      fill: 'var(--surface)',
      stroke: 'var(--border)',
      strokeWidth: 1,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '400',
      textAlign: 'center',
    },
    button: {
      fill: 'var(--primary)',
      stroke: 'var(--button-hover)',
      strokeWidth: 1,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '500',
      textAlign: 'center',
    },
    text: {
      fill: 'var(--text)',
      stroke: 'none',
      strokeWidth: 0,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '400',
      textAlign: 'left',
    },
    rectangle: {
      fill: 'var(--surface)',
      stroke: 'var(--border)',
      strokeWidth: 1,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '400',
      textAlign: 'center',
    },
    circle: {
      fill: 'var(--surface)',
      stroke: 'var(--border)',
      strokeWidth: 1,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '400',
      textAlign: 'center',
    },
    pipe: {
      fill: 'var(--industrial-pipe-stopped)',
      stroke: 'var(--border)',
      strokeWidth: 1,
    },
    tank: {
      fill: 'var(--industrial-tank-normal)',
      stroke: 'var(--border)',
      strokeWidth: 2,
    },
    gauge: {
      fill: 'var(--industrial-gauge-normal)',
      stroke: 'var(--border)',
      strokeWidth: 1,
    },
    valve: {
      fill: 'var(--industrial-valve-closed)',
      stroke: 'var(--border)',
      strokeWidth: 1,
    },
    alarm: {
      fill: 'var(--industrial-alarm-minor)',
      stroke: 'var(--border)',
      strokeWidth: 1,
    },
  };

  public static getDefaultStyle(type: string): GraphicStyle {
    return this.defaultStyles[type] || this.defaultStyles.default;
  }

  public static mergeStyles(baseStyle: GraphicStyle, overrideStyle: GraphicStyle): GraphicStyle {
    return {
      ...baseStyle,
      ...overrideStyle,
    };
  }

  public static applyTheme(style: GraphicStyle, theme: Record<string, string>): GraphicStyle {
    const themedStyle: GraphicStyle = { ...style };

    Object.keys(themedStyle).forEach((key) => {
      const value = themedStyle[key];
      if (typeof value === 'string' && value.startsWith('var(--')) {
        const variableName = value.replace('var(--', '').replace(')', '');
        if (theme[variableName]) {
          themedStyle[key] = theme[variableName];
        }
      }
    });

    return themedStyle;
  }

  public static validateStyle(style: GraphicStyle): GraphicStyle {
    const validated: GraphicStyle = {};

    if (style.fill) {
      validated.fill = style.fill;
    }

    if (style.stroke) {
      validated.stroke = style.stroke;
    }

    if (style.strokeWidth !== undefined && style.strokeWidth >= 0) {
      validated.strokeWidth = style.strokeWidth;
    }

    if (style.fontSize !== undefined && style.fontSize > 0) {
      validated.fontSize = style.fontSize;
    }

    if (style.fontFamily) {
      validated.fontFamily = style.fontFamily;
    }

    if (style.fontWeight) {
      validated.fontWeight = style.fontWeight;
    }

    if (style.textAlign) {
      validated.textAlign = style.textAlign;
    }

    Object.keys(style).forEach((key) => {
      if (!(key in validated)) {
        validated[key] = style[key];
      }
    });

    return validated;
  }

  public static registerDefaultStyle(type: string, style: GraphicStyle): void {
    this.defaultStyles[type] = this.validateStyle(style);
  }

  public static getAllDefaultStyles(): Record<string, GraphicStyle> {
    return { ...this.defaultStyles };
  }
}