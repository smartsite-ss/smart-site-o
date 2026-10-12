// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 图元样式组合式 API

import { computed } from 'vue';
import { useTheme } from './useTheme';
import { designTokens } from './tokens';

export interface GraphicStateStyles {
  base: {
    position: string;
    transformOrigin: string;
    transition: string;
  };
  selected: {
    zIndex: string;
    border: string;
    borderRadius: string;
  };
  locked: {
    opacity: string;
  };
  hidden: {
    display: string;
  };
  dragging: {
    cursor: string;
    zIndex: string;
  };
  resizing: {
    cursor: string;
    zIndex: string;
  };
  controlPoints: {
    display: string;
    position: string;
    top: string;
    left: string;
    right: string;
    bottom: string;
    pointerEvents: string;
    zIndex: string;
  };
  controlPoint: {
    position: string;
    width: string;
    height: string;
    backgroundColor: string;
    border: string;
    borderRadius: string;
    pointerEvents: string;
    cursor: string;
    transition: string;
  };
  types: {
    rect: {
      border: string;
      backgroundColor: string;
      borderRadius: string;
    };
    circle: {
      border: string;
      backgroundColor: string;
      borderRadius: string;
    };
    text: {
      fontFamily: string;
      fontSize: string;
      color: string;
      lineHeight: string;
      whiteSpace: string;
    };
    image: {
      border: string;
      backgroundColor: string;
    };
    line: {
      border: string;
      backgroundColor: string;
    };
    polygon: {
      border: string;
      backgroundColor: string;
    };
  };
}

export function useGraphicStyle() {
  const { theme } = useTheme();

  const graphicStyle = computed<GraphicStateStyles>(() => {
    const currentTheme = theme.value;

    return {
      base: {
        position: 'absolute',
        transformOrigin: 'top left',
        transition: `all ${currentTheme.transition.fast}`,
      },
      selected: {
        zIndex: '1000',
        border: `2px solid ${currentTheme.primary}`,
        borderRadius: currentTheme.radius.sm,
      },
      locked: {
        opacity: '0.7',
      },
      hidden: {
        display: 'none',
      },
      dragging: {
        cursor: 'grabbing',
        zIndex: '2000',
      },
      resizing: {
        cursor: 'nw-resize',
        zIndex: '2000',
      },
      controlPoints: {
        display: 'none',
        position: 'absolute',
        top: '-8px',
        left: '-8px',
        right: '-8px',
        bottom: '-8px',
        pointerEvents: 'none',
        zIndex: '1001',
      },
      controlPoint: {
        position: 'absolute',
        width: '8px',
        height: '8px',
        backgroundColor: currentTheme.primary,
        border: '1px solid var(--surface, #FFFFFF)',
        borderRadius: '50%',
        pointerEvents: 'all',
        cursor: 'pointer',
        transition: `all ${currentTheme.transition.fast}`,
      },
      types: {
        rect: {
          border: `1px solid ${currentTheme.border}`,
          backgroundColor: currentTheme.surface,
          borderRadius: currentTheme.radius.sm,
        },
        circle: {
          border: `1px solid ${currentTheme.border}`,
          backgroundColor: currentTheme.surface,
          borderRadius: '50%',
        },
        text: {
          fontFamily: designTokens.fonts.primary,
          fontSize: '14px',
          color: currentTheme.text,
          lineHeight: '1.5',
          whiteSpace: 'nowrap',
        },
        image: {
          border: `1px solid ${currentTheme.border}`,
          backgroundColor: currentTheme.surface,
        },
        line: {
          border: `1px solid ${currentTheme.border}`,
          backgroundColor: 'transparent',
        },
        polygon: {
          border: `1px solid ${currentTheme.border}`,
          backgroundColor: currentTheme.surface,
        },
      },
    };
  });

  const getGraphicBaseStyle = () => {
    return graphicStyle.value.base;
  };

  const getGraphicSelectedStyle = () => {
    return graphicStyle.value.selected;
  };

  const getGraphicLockedStyle = () => {
    return graphicStyle.value.locked;
  };

  const getGraphicHiddenStyle = () => {
    return graphicStyle.value.hidden;
  };

  const getGraphicDraggingStyle = () => {
    return graphicStyle.value.dragging;
  };

  const getGraphicResizingStyle = () => {
    return graphicStyle.value.resizing;
  };

  const getGraphicControlPointsStyle = () => {
    return graphicStyle.value.controlPoints;
  };

  const getGraphicControlPointStyle = (position: 'top-left' | 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left') => {
    const baseStyle = { ...graphicStyle.value.controlPoint };

    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: '0', left: '0', cursor: 'nw-resize' };
      case 'top':
        return { ...baseStyle, top: '0', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' };
      case 'top-right':
        return { ...baseStyle, top: '0', right: '0', cursor: 'ne-resize' };
      case 'right':
        return { ...baseStyle, top: '50%', right: '0', transform: 'translateY(-50%)', cursor: 'e-resize' };
      case 'bottom-right':
        return { ...baseStyle, bottom: '0', right: '0', cursor: 'se-resize' };
      case 'bottom':
        return { ...baseStyle, bottom: '0', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' };
      case 'bottom-left':
        return { ...baseStyle, bottom: '0', left: '0', cursor: 'sw-resize' };
      case 'left':
        return { ...baseStyle, top: '50%', left: '0', transform: 'translateY(-50%)', cursor: 'w-resize' };
      default:
        return baseStyle;
    }
  };

  const getGraphicTypeStyle = (type: 'rect' | 'circle' | 'text' | 'image' | 'line' | 'polygon') => {
    return graphicStyle.value.types[type] || {};
  };

  const applyGraphicStyle = (element: HTMLElement, options: {
    type: 'rect' | 'circle' | 'text' | 'image' | 'line' | 'polygon';
    selected?: boolean;
    locked?: boolean;
    hidden?: boolean;
    dragging?: boolean;
    resizing?: boolean;
  }) => {
    const { type, selected = false, locked = false, hidden = false, dragging = false, resizing = false } = options;

    Object.entries(getGraphicBaseStyle()).forEach(([key, value]) => {
      (element.style as any)[key] = value as string;
    });

    Object.entries(getGraphicTypeStyle(type)).forEach(([key, value]) => {
      (element.style as any)[key] = value as string;
    });

    if (selected) {
      Object.entries(getGraphicSelectedStyle()).forEach(([key, value]) => {
        (element.style as any)[key] = value as string;
      });
    }

    if (locked) {
      Object.entries(getGraphicLockedStyle()).forEach(([key, value]) => {
        (element.style as any)[key] = value as string;
      });
    }

    if (hidden) {
      Object.entries(getGraphicHiddenStyle()).forEach(([key, value]) => {
        (element.style as any)[key] = value as string;
      });
    }

    if (dragging) {
      Object.entries(getGraphicDraggingStyle()).forEach(([key, value]) => {
        (element.style as any)[key] = value as string;
      });
    }

    if (resizing) {
      Object.entries(getGraphicResizingStyle()).forEach(([key, value]) => {
        (element.style as any)[key] = value as string;
      });
    }
  };

  return {
    graphicStyle,
    getGraphicBaseStyle,
    getGraphicSelectedStyle,
    getGraphicLockedStyle,
    getGraphicHiddenStyle,
    getGraphicDraggingStyle,
    getGraphicResizingStyle,
    getGraphicControlPointsStyle,
    getGraphicControlPointStyle,
    getGraphicTypeStyle,
    applyGraphicStyle,
  };
}