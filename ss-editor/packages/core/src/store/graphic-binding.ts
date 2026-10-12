// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { usePageStore } from './page.store';
import { resolveDataPath, DATA_BINDING_TARGETS } from './graphic-defaults';
import { showAlert } from '../utils/messageBox';

/** 数据绑定 - 绑定数据
 * 
 * v3.1: 不再修改 graphic.dataSource 的配置字段（enabled / dataSource / dataField）。
 * 这些字段由 DataPanel.onDataSourceSelected 统一管理，BindingManager 仅负责 WS 标签订阅。
 */
export function bindDataHelper(graphicId: string, _dataSource: string, _dataField: string) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return;

  const graphic = currentPage.graphics.find((g) => g.id === graphicId);
  if (graphic) {
    // 仅标记页面脏数据，不修改 graphic.dataSource 配置字段
    currentPage.markDirty?.();
  }
}

/** 数据绑定 - 解除绑定
 * 
 * v3.1: 不再重置 graphic.dataSource 的配置字段（enabled / dataSource / dataField）。
 * 这些字段由 DataPanel.onDataSourceSelected 统一管理，BindingManager 仅负责 WS 标签订阅。
 */
export function unbindDataHelper(_graphicId: string) {
  // 仅管理 BindingManager 内部状态，不修改 graphic.dataSource 配置字段
}

/** 数据绑定 - 应用数据 */
export function applyDataHelper(data: Record<string, any>) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return;

  currentPage.graphics.forEach((graphic) => {
    if (graphic.dataSource?.enabled && graphic.dataSource?.dataField) {
      const value = resolveDataPath(data, graphic.dataSource.dataField);
      if (value !== null && value !== undefined) {
        const targetProp = DATA_BINDING_TARGETS[graphic.type];
        if (targetProp && graphic.config.customProps) {
          graphic.config.customProps[targetProp] = value;
          currentPage.updateGraphic(graphic.id, { config: { ...graphic.config } });
        }
      }
    }
  });
}

/** 事件交互 - 添加事件 */
export function addEventHandlerHelper(graphicId: string, eventType: string) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return;

  const graphic = currentPage.graphics.find((g) => g.id === graphicId);
  if (graphic) {
    if (!graphic.events) {
      graphic.events = {
        eventHandlers: {},
        type: '',
        payload: {},
        timestamp: Date.now(),
      };
    }
    if (!graphic.events.eventHandlers) {
      graphic.events.eventHandlers = {};
    }
    graphic.events.eventHandlers[eventType] = {
      id: crypto.randomUUID(),
      eventType,
      actions: [],
    };
    currentPage.markDirty?.();
  }
}

/** 事件交互 - 删除事件 */
export function removeEventHandlerHelper(graphicId: string, eventId: string) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return;

  const graphic = currentPage.graphics.find((g) => g.id === graphicId);
  if (graphic) {
    if (graphic.events.eventHandlers) {
      delete graphic.events.eventHandlers[eventId];
      currentPage.markDirty?.();
    }
  }
}

/** 事件交互 - 添加动作 */
export function addActionHelper(graphicId: string, eventId: string, actionType: string) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return;

  const graphic = currentPage.graphics.find((g) => g.id === graphicId);
  if (graphic?.events.eventHandlers[eventId]) {
    const event = graphic.events.eventHandlers[eventId];
    if (event) {
      event.actions.push({
        id: crypto.randomUUID(),
        actionType,
        target: '',
        value: '',
        conditions: [],
      });
      currentPage.markDirty?.();
    }
  }
}

/** 事件交互 - 删除动作 */
export function removeActionHelper(graphicId: string, eventId: string, actionId: string) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return;

  const graphic = currentPage.graphics.find((g) => g.id === graphicId);
  if (graphic) {
    const event = graphic.events.eventHandlers[eventId];
    if (event) {
      event.actions = event.actions.filter((a) => a.id !== actionId);
      currentPage.markDirty?.();
    }
  }
}

/** 事件交互 - 执行动作 */
export function executeActionHelper(action: any, _graphicId?: string, _eventData?: any) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return;

  switch (action.actionType) {
    case 'show':
      // 显示目标图形
      if (action.target) {
        const targetGraphic = currentPage.graphics.find(
          (g) => g.id === action.target
        );
        if (targetGraphic) {
          targetGraphic.config.visible = true;
          currentPage.markDirty?.();
        }
      }
      break;
    case 'hide':
      // 隐藏目标图形
      if (action.target) {
        const targetGraphic = currentPage.graphics.find(
          (g) => g.id === action.target
        );
        if (targetGraphic) {
          targetGraphic.config.visible = false;
          currentPage.markDirty?.();
        }
      }
      break;
    case 'change':
      // 改变目标图形的属性
      if (action.target) {
        const targetGraphic = currentPage.graphics.find(
          (g) => g.id === action.target
        );
        if (targetGraphic) {
          try {
            const propertyPath = action.target.split('.');
            let target = targetGraphic;

            for (let i = 0; i < propertyPath.length - 1; i++) {
              if (
                target.config.customProps[propertyPath[i]] !== undefined
              ) {
                target = target.config.customProps[propertyPath[i]];
              } else {
                return;
              }
            }

            const propertyName = propertyPath[propertyPath.length - 1];
            target.config.customProps[propertyName] = action.value;
            currentPage.markDirty?.();
          } catch (error) {
            console.error('Error changing property:', error);
          }
        }
      }
      break;
    case 'navigate':
      // 导航到指定URL
      if (action.value) {
        window.location.href = action.value;
      }
      break;
    case 'alert':
      // 显示提示信息
      if (action.value) {
        showAlert(action.value);
      }
      break;
  }
}

/** 事件交互 - 触发事件 */
export function triggerEventHandlerHelper(graphicId: string, eventType: string, eventData?: any) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return;

  const graphic = currentPage.graphics.find((g) => g.id === graphicId);
  if (graphic?.events.eventHandlers?.[eventType]) {
    const event = graphic.events.eventHandlers[eventType];
    if (event) {
      event.actions.forEach((action) => {
        // 检查条件是否满足
        const conditionsMet = action.conditions.every((condition) => {
          let fieldValue = eventData;
          const fieldPath = condition.field.split('.');

          for (const key of fieldPath) {
            if (fieldValue[key] !== undefined) {
              fieldValue = fieldValue[key];
            } else {
              return false;
            }
          }

          // 检查条件
          switch (condition.operator) {
            case 'equal':
              return fieldValue === condition.value;
            case 'notEqual':
              return fieldValue !== condition.value;
            case 'greaterThan':
              return fieldValue > condition.value;
            case 'lessThan':
              return fieldValue < condition.value;
            case 'greaterThanOrEqual':
              return fieldValue >= condition.value;
            case 'lessThanOrEqual':
              return fieldValue <= condition.value;
            case 'contains':
              return fieldValue.includes(condition.value);
            case 'notContains':
              return !fieldValue.includes(condition.value);
            default:
              return true;
          }
        });

        if (conditionsMet) {
          // 执行动作
          executeActionHelper(action, graphicId, eventData);
        }
      });
    }
  }
}

/** 动画效果 - 添加动画 */
export function addAnimationHelper(graphicId: string, animation: any) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return;

  const graphic = currentPage.graphics.find((g) => g.id === graphicId);
  if (graphic) {
    if (!graphic.config.customProps.animations) {
      graphic.config.customProps.animations = [];
    }
    graphic.config.customProps.animations.push(animation);
    currentPage.markDirty?.();
  }
}

/** 动画效果 - 移除动画 */
export function removeAnimationHelper(graphicId: string, animationIndex: number) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return;

  const graphic = currentPage.graphics.find((g) => g.id === graphicId);
  if (graphic && graphic.config.customProps.animations) {
    graphic.config.customProps.animations.splice(animationIndex, 1);
    currentPage.markDirty?.();
  }
}