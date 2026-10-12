// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 样式Token管理类
 */
export class StyleTokenManager {
  // 间距Token
  private static spacingTokens = {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  };

  // 字体Token
  private static typographyTokens = {
    fontFamily: {
      primary: 'Arial, sans-serif',
      secondary: 'Helvetica, sans-serif',
      monospace: 'Courier New, monospace'
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '24px',
      xxl: '32px'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },
    lineHeight: {
      tight: '1.2',
      normal: '1.5',
      loose: '1.8'
    }
  };

  // 边框Token
  private static borderTokens = {
    width: {
      thin: '1px',
      medium: '2px',
      thick: '4px'
    },
    radius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px'
    }
  };

  // 阴影Token
  private static shadowTokens = {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)'
  };

  /**
   * 获取间距Token
   * @param size 间距大小
   * @returns 间距值
   */
  public static getSpacing(size: keyof typeof StyleTokenManager.spacingTokens): string {
    return this.spacingTokens[size];
  }

  /**
   * 获取字体族
   * @param type 字体类型
   * @returns 字体族
   */
  public static getFontFamily(type: keyof typeof StyleTokenManager.typographyTokens.fontFamily): string {
    return this.typographyTokens.fontFamily[type];
  }

  /**
   * 获取字体大小
   * @param size 字体大小
   * @returns 字体大小值
   */
  public static getFontSize(size: keyof typeof StyleTokenManager.typographyTokens.fontSize): string {
    return this.typographyTokens.fontSize[size];
  }

  /**
   * 获取字体权重
   * @param weight 字体权重
   * @returns 字体权重值
   */
  public static getFontWeight(weight: keyof typeof StyleTokenManager.typographyTokens.fontWeight): string {
    return this.typographyTokens.fontWeight[weight];
  }

  /**
   * 获取行高
   * @param type 行高类型
   * @returns 行高值
   */
  public static getLineHeight(type: keyof typeof StyleTokenManager.typographyTokens.lineHeight): string {
    return this.typographyTokens.lineHeight[type];
  }

  /**
   * 获取边框宽度
   * @param width 边框宽度
   * @returns 边框宽度值
   */
  public static getBorderWidth(width: keyof typeof StyleTokenManager.borderTokens.width): string {
    return this.borderTokens.width[width];
  }

  /**
   * 获取边框半径
   * @param size 边框半径大小
   * @returns 边框半径值
   */
  public static getBorderRadius(size: keyof typeof StyleTokenManager.borderTokens.radius): string {
    return this.borderTokens.radius[size];
  }

  /**
   * 获取阴影
   * @param size 阴影大小
   * @returns 阴影值
   */
  public static getShadow(size: keyof typeof StyleTokenManager.shadowTokens): string {
    return this.shadowTokens[size];
  }

  /**
   * 获取所有间距Token
   * @returns 所有间距Token
   */
  public static getAllSpacingTokens(): typeof StyleTokenManager.spacingTokens {
    return { ...this.spacingTokens };
  }

  /**
   * 获取所有字体Token
   * @returns 所有字体Token
   */
  public static getAllTypographyTokens(): typeof StyleTokenManager.typographyTokens {
    return { ...this.typographyTokens };
  }

  /**
   * 获取所有边框Token
   * @returns 所有边框Token
   */
  public static getAllBorderTokens(): typeof StyleTokenManager.borderTokens {
    return { ...this.borderTokens };
  }

  /**
   * 获取所有阴影Token
   * @returns 所有阴影Token
   */
  public static getAllShadowTokens(): typeof StyleTokenManager.shadowTokens {
    return { ...this.shadowTokens };
  }

  /**
   * 注册自定义Token
   * @param type Token类型
   * @param tokens Token对象
   */
  public static registerTokens(type: 'spacing' | 'typography' | 'border' | 'shadow', tokens: any): void {
    switch (type) {
      case 'spacing':
        this.spacingTokens = { ...this.spacingTokens, ...tokens };
        break;
      case 'typography':
        this.typographyTokens = { ...this.typographyTokens, ...tokens };
        break;
      case 'border':
        this.borderTokens = { ...this.borderTokens, ...tokens };
        break;
      case 'shadow':
        this.shadowTokens = { ...this.shadowTokens, ...tokens };
        break;
    }
  }
}