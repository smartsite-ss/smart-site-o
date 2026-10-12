// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  IPage,
  IThemeColors,
  ILayout,
  IGraphic,
  SelectionMode,
} from '../../../types';
import { ITimerConfig, ITimerExecutionResult } from '../../../types/timer';
import { FreeLayout } from '../../../canvas-page/layouts/types/FreeLayout';
import { GraphicFactory } from '../factory/GraphicFactory';
import { eventBus, Events } from '../../../utils/event/eventBus';
import { themeManager } from '../../../canvas-page/theme/ThemeManager';
import type { GraphicPropertyChanges } from '@scada-editor/plugin-sdk';
import { getNextGraphicName } from '../../../utils/graphic/graphicNameUtils';
import { SelectionManager } from '../../managers/SelectionManager';
import { LayerManager } from '../../../canvas-page/managers/LayerManager';
import { HistoryManager, AddGraphicChange, RemoveGraphicChange, UpdateGraphicChange, TransformGraphicChange, UpdatePageChange, GroupGraphicChange, ReorderGraphicChange, DuplicateGraphicChange } from '../../managers/HistoryManager';
import { AlignmentManager, AlignmentType, DistributionDirection } from '../../managers/AlignmentManager';
import { LayoutManager, LayoutType, GridLayoutConfig } from '../../../canvas-page/managers/LayoutManager';
import { GraphicGroup, GroupManager } from '../../managers/GroupManager';
import { GridSnapManager, GridSnapConfig, SnapResult } from '../../managers/GridSnapManager';
import { SmartAlignManager, GuideLine } from '../../managers/SmartAlignManager';
import { BatchOperationManager, BatchStyleOptions, SmartPasteOptions } from '../../managers/BatchOperationManager';
import { TimerManager } from '../../../runtime/managers/TimerManager';
import { ZoomManager, FitMode, defaultAutoFitConfig, ScaleRange } from '../../../canvas-page/managers/ZoomManager';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { PageContextImpl } from './PageContextImpl';
import { BindingEngine } from './BindingEngine';
import { EnterAnimationEngine } from '../../../animations/EnterAnimationEngine';
import { LoopAnimationEngine } from '../../../animations/LoopAnimationEngine';
import { safeCopyObject } from '../../../utils/core';

/**
 * 页面基类
 *
 * 架构优化（v2）：
 *   - 删除 _timers/_groups/_guideLines 重复数组，Manager 为单一真相源
 *   - 使用 GraphicOperationHelper 封装变更模式（消除样板代码）
 *   - 按功能域组织方法区段
 */
export class BasePage implements IPage {
  // ==================== 常量 ====================
  private static readonly DEFAULT_PAGE_WIDTH = 1920;
  private static readonly DEFAULT_PAGE_HEIGHT = 1080;
  private static readonly DEFAULT_SCALE = 100;
  private static readonly MIN_SCALE = 10;
  private static readonly MAX_SCALE = 200;
  private static readonly DEFAULT_HISTORY_LIMIT = 50;
  private static readonly DUPLICATE_OFFSET = 20;

  // ==================== 页面属性 ====================
  private _id: string = `page-${Date.now()}`;
  private _name: string = 'New Page';
  private _width: number = BasePage.DEFAULT_PAGE_WIDTH;
  private _height: number = BasePage.DEFAULT_PAGE_HEIGHT;
  private _scale: number = BasePage.DEFAULT_SCALE;
  private _fitMode: FitMode = 'auto';
  private _backgroundColor: string = '';
  private _backgroundImage?: string | undefined;
  private _icon?: string | undefined;
  private _dirty: boolean = false;
  private _themeColors: IThemeColors = {
    primary: '#409EFF',
    secondary: '#606266',
    success: '#67C23A',
    warning: '#E6A23C',
    error: '#F56C6C',
  };
  private _dataSource: any = undefined;
  private _templateId?: string = undefined;
  private _templateMode?: 'reference' | 'copy' = undefined;

  // ==================== 核心数据 ====================
  private _layout: ILayout = new FreeLayout();
  private _graphics: IGraphic[] = [];
  // 注意：_timers/_groups/_guideLines 不再存储副本，由 Manager 统一管理（单一真相源）

  // ==================== 属性访问器 ====================
  get id(): string { return this._id; }
  set id(value: string) { this._id = value; }

  get name(): string { return this._name; }
  set name(value: string) { this._name = value; }

  get width(): number { return this._width; }
  set width(value: number) { this._width = value; }

  get height(): number { return this._height; }
  set height(value: number) { this._height = value; }

  get scale(): number { return this._scale; }
  set scale(value: number) { this._scale = value; }

  get fitMode(): FitMode { return this._fitMode; }
  set fitMode(value: FitMode) { this._fitMode = value; }

  get backgroundColor(): string { return this._backgroundColor; }
  set backgroundColor(value: string) { this._backgroundColor = value; }

  get backgroundImage(): string | undefined { return this._backgroundImage; }
  set backgroundImage(value: string | undefined) { this._backgroundImage = value; }

  get icon(): string | undefined { return this._icon; }
  set icon(value: string | undefined) { this._icon = value; }

  get dirty(): boolean { return this._dirty; }
  set dirty(value: boolean) { this._dirty = value; }
  markDirty(): void { this._dirty = true; }
  clearDirty(): void { this._dirty = false; }

  get themeColors(): IThemeColors { return this._themeColors; }
  set themeColors(value: IThemeColors) { this._themeColors = value; }

  get dataSource(): any { return this._dataSource; }
  set dataSource(value: any) { this._dataSource = value; }

  get templateId(): string | undefined { return this._templateId; }
  set templateId(value: string | undefined) { this._templateId = value; }

  get templateMode(): 'reference' | 'copy' | undefined { return this._templateMode; }
  set templateMode(value: 'reference' | 'copy' | undefined) { this._templateMode = value; }

  get layout(): ILayout { return this._layout; }
  set layout(value: ILayout) { this._layout = value; }

  get graphics(): IGraphic[] { return this._graphics; }
  set graphics(value: IGraphic[]) { this._graphics = value; }

  // timers/groups/guideLines 从 Manager 读取（单一真相源）
  get timers(): ITimerConfig[] { return this.timerManager.toJSON(); }
  set timers(value: ITimerConfig[]) { this.timerManager.fromJSON(value); }

  get groups(): GraphicGroup[] { return this.groupManager.toJSON(); }
  set groups(value: GraphicGroup[]) { this.groupManager.fromJSON(value); }

  get guideLines(): GuideLine[] { return this.smartAlignManager.getAllGuideLines(); }
  set guideLines(value: GuideLine[]) { this.smartAlignManager.fromJSON(value); }

  // ==================== Manager 实例 ====================
  private selectionManager: SelectionManager;
  private layerManager: LayerManager;
  private historyManager: HistoryManager;
  private groupManager: GroupManager;
  private pageContextImpl: PageContextImpl;
  private bindingEngine: BindingEngine;
  private animationEngine: EnterAnimationEngine;
  private loopAnimationEngine: LoopAnimationEngine;
  private _themeUnsubscribe: (() => void) | null = null;

  private _groupEditMode: { active: boolean; groupId: string | null } = {
    active: false,
    groupId: null,
  };

  // ==================== 懒加载 Manager ====================
  private _alignmentManager?: AlignmentManager;
  private get alignmentManager(): AlignmentManager {
    if (!this._alignmentManager) this._alignmentManager = new AlignmentManager();
    return this._alignmentManager;
  }

  private _layoutManager?: LayoutManager;
  private get layoutManager(): LayoutManager {
    if (!this._layoutManager) this._layoutManager = new LayoutManager();
    return this._layoutManager;
  }

  private _gridSnapManager?: GridSnapManager;
  private get gridSnapManager(): GridSnapManager {
    if (!this._gridSnapManager) this._gridSnapManager = new GridSnapManager();
    return this._gridSnapManager;
  }

  private _smartAlignManager?: SmartAlignManager;
  private get smartAlignManager(): SmartAlignManager {
    if (!this._smartAlignManager) this._smartAlignManager = new SmartAlignManager();
    return this._smartAlignManager;
  }

  private _batchOperationManager?: BatchOperationManager;
  private get batchOperationManager(): BatchOperationManager {
    if (!this._batchOperationManager) this._batchOperationManager = new BatchOperationManager();
    return this._batchOperationManager;
  }

  private _timerManager?: TimerManager;
  private get timerManager(): TimerManager {
    if (!this._timerManager) this._timerManager = new TimerManager();
    return this._timerManager;
  }

  constructor() {
    this.selectionManager = new SelectionManager();
    this.layerManager = new LayerManager();
    this.historyManager = new HistoryManager(BasePage.DEFAULT_HISTORY_LIMIT);
    this.groupManager = new GroupManager();
    this.pageContextImpl = new PageContextImpl(this, this.groupManager);
    this.animationEngine = new EnterAnimationEngine();
    this.pageContextImpl.animationEngine = this.animationEngine;
    this.loopAnimationEngine = new LoopAnimationEngine();
    this.pageContextImpl.loopAnimationEngine = this.loopAnimationEngine;
    this.bindingEngine = new BindingEngine(this.pageContextImpl);
  }

  // ==================== 初始化 / 序列化 ====================

  init(
    options: {
      id?: string;
      name?: string;
      width?: number;
      height?: number;
      scale?: number;
      backgroundColor?: string;
      backgroundImage?: string;
      icon?: string;
      themeColors?: IThemeColors;
      layout?: ILayout;
      graphics?: IGraphic[];
      selectedGraphicId?: string | null;
      selectedGraphicIds?: string[];
      timers?: ITimerConfig[];
      groups?: GraphicGroup[];
      guideLines?: GuideLine[];
      dataSource?: any;
    } = {}
  ) {
    this._id = options.id || this._id;
    this._name = options.name || this._name;
    this._width = options.width || BasePage.DEFAULT_PAGE_WIDTH;
    this._height = options.height || BasePage.DEFAULT_PAGE_HEIGHT;
    this._scale = options.scale || BasePage.DEFAULT_SCALE;
    this._scale = Math.max(BasePage.MIN_SCALE, Math.min(BasePage.MAX_SCALE, this._scale));
    this._backgroundColor = options.backgroundColor || this._backgroundColor;
    this._backgroundImage = options.backgroundImage;
    this._icon = options.icon;
    this._themeColors = options.themeColors || this._themeColors;
    this._layout = options.layout || this._layout;
    this._graphics = options.graphics || this._graphics;
    for (const graphic of this._graphics) {
      this._injectPageContext(graphic);
    }
    this._dataSource = options.dataSource || undefined;
    // 数据源从 Manager 读取（单一真相源，无需 syncXxxToManager）
    if (options.timers) this.timerManager.fromJSON(options.timers);
    if (options.groups) this.groupManager.fromJSON(options.groups);
    if (options.guideLines) this.smartAlignManager.fromJSON(options.guideLines);

    this.groupManager.updateReferences(this.graphics, new Map(this.graphics.map(g => [g.id, g])));

    if (options.selectedGraphicIds && options.selectedGraphicIds.length > 0) {
      this.selectionManager.selectMultiple(options.selectedGraphicIds);
    } else if (options.selectedGraphicId) {
      this.selectionManager.select(options.selectedGraphicId);
    }

    this._themeUnsubscribe = themeManager.subscribe(() => {
      this._onThemeChanged(themeManager.getCurrentThemeName());
    });
  }

  clone(): BasePage {
    const clonedPage = new BasePage();
    clonedPage.init({
      id: `page-${Date.now()}`,
      name: `${this.name} Copy`,
      width: this.width,
      height: this.height,
      scale: this.scale,
      backgroundColor: this.backgroundColor,
      backgroundImage: this.backgroundImage,
      icon: this.icon,
      themeColors: { ...this.themeColors },
      layout: this.layout.clone() as ILayout,
      graphics: this.graphics.map((g) => {
        const clonedGraphic = GraphicFactory.createGraphicFromJSON(g.toJSON());
        return clonedGraphic;
      }),
      selectedGraphicId: null,
      selectedGraphicIds: [],
      timers: this.timers.map(timer => ({ ...timer })),
      groups: this.groups.map(group => ({ ...group })),
      guideLines: this.guideLines.map(line => ({ ...line })),
    });
    return clonedPage;
  }

  private static async blobToBase64(blobUrl: string): Promise<string | null> {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('BasePage - Failed to convert blob to base64:', error);
      return null;
    }
  }

  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      width: this.width,
      height: this.height,
      scale: this.scale,
      fitMode: this._fitMode,
      backgroundColor: this.backgroundColor,
      backgroundImage: this.backgroundImage,
      icon: this.icon,
      themeColors: this.themeColors,
      layout: this.layout.toJSON(),
      graphics: this.graphics.map((graphic) => graphic.toJSON()),
      groups: this.groups,        // 直接从 groupManager 读取
      timers: this.timers,        // 直接从 timerManager 读取
      guideLines: this.guideLines, // 直接从 smartAlignManager 读取
      dataSource: this._dataSource,
      templateId: this._templateId,
      templateMode: this._templateMode,
    };
  }

  async toJSONAsync(): Promise<any> {
    const jsonData: any = {
      id: this.id,
      name: this.name,
      width: this.width,
      height: this.height,
      scale: this.scale,
      fitMode: this._fitMode,
      backgroundColor: this.backgroundColor,
      icon: this.icon,
      themeColors: this.themeColors,
      layout: this.layout.toJSON(),
      groups: this.groups,
      timers: this.timers,
      guideLines: this.guideLines,
      dataSource: this._dataSource,
      templateId: this._templateId,
      templateMode: this._templateMode,
    };

    if (this.backgroundImage && this.backgroundImage.startsWith('blob:')) {
      const base64 = await BasePage.blobToBase64(this.backgroundImage);
      jsonData.backgroundImage = base64 || this.backgroundImage;
    } else {
      jsonData.backgroundImage = this.backgroundImage;
    }

    jsonData.graphics = await Promise.all(
      this.graphics.map(async (graphic) => {
        const graphicJson = graphic.toJSON();
        if (graphicJson.config) {
          const config = graphicJson.config;
          for (const key of Object.keys(config)) {
            const value = config[key];
            if (typeof value === 'string' && value.startsWith('blob:')) {
              const base64 = await BasePage.blobToBase64(value);
              if (base64) config[key] = base64;
            }
          }
        }
        return graphicJson;
      })
    );

    return jsonData;
  }

  fromJSON(data: any): void {
    if (data) {
      this.id = data.id || this.id;
      this.name = data.name || this.name;
      this.width = data.width || this.width;
      this.height = data.height || this.height;
      this.scale = data.scale || this.scale;
      this.scale = Math.max(BasePage.MIN_SCALE, Math.min(BasePage.MAX_SCALE, this.scale));
      this.fitMode = data.fitMode || this.fitMode;
      this.backgroundColor = data.backgroundColor || this.backgroundColor;
      this.backgroundImage = data.backgroundImage || this.backgroundImage;
      this.icon = data.icon;
      this.themeColors = data.themeColors || this.themeColors;
      this._dataSource = data.dataSource || undefined;
      this._templateId = data.templateId || undefined;
      this._templateMode = data.templateMode || undefined;

      if (data.graphics) {
        this.graphics = data.graphics
          .map((g: any) => {
            try {
              const graphic = GraphicFactory.createGraphicFromJSON(g);
              this._injectPageContext(graphic);
              return graphic;
            } catch (e) {
              console.warn(`[BasePage.fromJSON] Failed to create graphic type "${g?.type || 'unknown'}":`, e);
              return null;
            }
          })
          .filter((g: any) => g !== null);
      }

      if (data.groups) this.groupManager.fromJSON(data.groups);
      if (data.timers) this.timerManager.fromJSON(data.timers);
      if (data.guideLines) this.smartAlignManager.fromJSON(data.guideLines);
    }
  }

  // ==================== 图元查询 ====================

  findGraphicById(id: string): IGraphic | null {
    return this.graphics.find(g => g.id === id) || null;
  }

  getGraphicById(id: string): IGraphic | null {
    return this.findGraphicById(id);
  }

  getGraphics(): IGraphic[] {
    return [...this.graphics];
  }

  // ==================== 图元上下文注入 ====================

  private _injectPageContext(graphic: IGraphic): void {
    if (graphic instanceof BaseGraphic) {
      graphic._setPageContext(this.pageContextImpl);
      this.bindingEngine.attach(graphic);
    }
  }

  private _cleanupGraphic(graphic: IGraphic): void {
    this.bindingEngine.detach(graphic.id);
    if (graphic instanceof BaseGraphic) {
      graphic._setPageContext(null);
    }
  }

  private _onThemeChanged(themeName: string): void {
    for (const graphic of this._graphics) {
      graphic.onThemeChanged?.(themeName);
    }
  }

  private _notifyPropertyChanged(graphic: IGraphic, changes: GraphicPropertyChanges): void {
    graphic.onPropertyChanged?.(changes);
  }

  dispose(): void {
    this._themeUnsubscribe?.();
    this._themeUnsubscribe = null;
    this.timerManager.destroy();
    this.animationEngine.destroy();
    this.loopAnimationEngine.destroy();
  }

  /** 设置动画帧回调（由编辑器层注入 drawCanvas） */
  setAnimationFrameCallback(callback: () => void): void {
    this.animationEngine.setFrameCallback(callback);
  }

  /** 获取动画引擎 */
  getAnimationEngine(): EnterAnimationEngine {
    return this.animationEngine;
  }

  // ==================== 图元增删改（委托模式） ====================

  /** 设置图元布尔标志位（lock/visible），统一处理历史记录 */
  private _setGraphicFlag(id: string, flag: 'locked' | 'visible', value: boolean): void {
    const graphic = this.findGraphicById(id);
    if (!graphic) return;
    const oldProperties = JSON.parse(JSON.stringify(graphic.config));
    if (flag === 'locked') {
      graphic.setLocked(value);
    } else {
      graphic.setVisible(value);
    }
    const change = new UpdateGraphicChange(this, id, oldProperties, { [flag]: value });
    this.historyManager.saveChange(change);
    if (flag === 'locked') {
      this._notifyPropertyChanged(graphic, { locked: value });
    } else {
      graphic.onVisibilityChanged?.(value);
      this._notifyPropertyChanged(graphic, { visible: value });
    }
    this.markDirty();
  }

  addGraphic(graphic: IGraphic, autoZIndex = true, recordHistory = true): void {
    if (!graphic) return;
    if (autoZIndex) {
      graphic.config.zIndex = this.graphics.length;
    }
    this._injectPageContext(graphic);
    this.graphics.push(graphic);
    if (recordHistory) {
      const change = new AddGraphicChange(this, graphic);
      this.historyManager.saveChange(change);
    }
    graphic.onMounted?.();
    eventBus.emit(Events.GRAPHIC_ADDED, { graphic, pageId: this.id });
    this.markDirty();
  }

  removeGraphic(id: string, recordHistory = true): void {
    const index = this.graphics.findIndex(g => g.id === id);
    if (index === -1) return;
    const removedGraphic = this.graphics[index];
    removedGraphic.onUnmounted?.();
    this._cleanupGraphic(removedGraphic);
    this.graphics.splice(index, 1);

    if (this.selectionManager.isSelected(id)) {
      this.selectionManager.removeFromSelection(id);
    }

    if (recordHistory) {
      const change = new RemoveGraphicChange(this, removedGraphic);
      this.historyManager.saveChange(change);
    }
    eventBus.emit(Events.GRAPHIC_REMOVED, {
      graphicId: id,
      pageId: this.id,
      graphic: removedGraphic,
    });
    this.markDirty();
  }

  deleteSelectedGraphics(): void {
    const selectedIds = [...this.selectedGraphicIds];
    if (selectedIds.length === 0) return;

    const removedGraphics: IGraphic[] = [];

    try {
      for (const id of selectedIds) {
        const index = this.graphics.findIndex(g => g.id === id);
        if (index !== -1) {
          const removedGraphic = this.graphics[index];
          this._cleanupGraphic(removedGraphic);
          this.graphics.splice(index, 1);
          removedGraphics.push(removedGraphic);
        }
      }

      this.clearSelection();

      for (const graphic of removedGraphics) {
        const change = new RemoveGraphicChange(this, graphic);
        this.historyManager.saveChange(change);
      }

      for (const graphic of removedGraphics) {
        eventBus.emit(Events.GRAPHIC_REMOVED, {
          graphicId: graphic.id,
          pageId: this.id,
          graphic,
        });
      }
      this.markDirty();
    } catch (error) {
      console.error('批量删除失败:', error);
    }
  }

  /** 通用图元属性更新 —— 封装"保存旧值→修改→历史→事件"模式 */
  updateGraphic(id: string, properties: Partial<Record<string, any>>): void {
    const graphic = this.findGraphicById(id);
    if (!graphic) return;

    const oldProperties = safeCopyObject(graphic.config);

    if (typeof graphic.update === 'function') {
      graphic.update(properties);
    } else {
      Object.assign(graphic, properties);
    }

    const change = new UpdateGraphicChange(this, id, oldProperties, properties);
    this.historyManager.saveChange(change);

    const changeInfo: GraphicPropertyChanges = {};
    if ('geometry' in properties) {
      changeInfo.geometry = (properties as any).geometry;
    }
    if ('style' in properties || 'styles' in properties) {
      changeInfo.style = (properties as any).style || (properties as any).styles;
    }
    const configProps = properties.config as Record<string, any> | undefined;
    const customProps = configProps?.customProps;
    if (customProps && typeof customProps === 'object' && Object.keys(customProps).length > 0) {
      changeInfo.customProps = customProps;
    } else if (!('geometry' in properties) && !('style' in properties) && !('styles' in properties)) {
      changeInfo.customProps = properties;
    }
    if (Object.keys(changeInfo).length > 0) {
      this._notifyPropertyChanged(graphic, changeInfo);
    }

    eventBus.emit(Events.GRAPHIC_UPDATED, {
      graphicId: id,
      properties,
      pageId: this.id,
      graphic,
    });
    this.markDirty();
  }

  updatePageProperties(properties: Partial<Record<string, any>>): void {
    const oldProperties = {
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      backgroundImage: this.backgroundImage,
      scale: this.scale,
    };

    Object.assign(this, properties);

    const change = new UpdatePageChange(this, oldProperties, properties);
    this.historyManager.saveChange(change);

    eventBus.emit(Events.PAGE_UPDATED, {
      pageId: this.id,
      properties,
      oldProperties,
    });
    this.markDirty();
  }

  moveGraphic(id: string, x: number, y: number): void {
    const graphic = this.findGraphicById(id);
    if (!graphic || graphic.getLocked()) return;

    const oldPosition = graphic.getPosition();
    const oldGeometry = { ...graphic.config.geometry };
    const oldTransform = {
      x: oldGeometry.x ?? 0,
      y: oldGeometry.y ?? 0,
      width: oldGeometry.width ?? 0,
      height: oldGeometry.height ?? 0,
      rotation: oldGeometry.rotation ?? 0,
    };
    graphic.setPosition(x, y);

    const newGeometry = graphic.config.geometry;
    const newTransform = {
      x: newGeometry.x ?? 0,
      y: newGeometry.y ?? 0,
      width: newGeometry.width ?? 0,
      height: newGeometry.height ?? 0,
      rotation: newGeometry.rotation ?? 0,
    };
    const change = new TransformGraphicChange(this, id, oldTransform, newTransform);
    this.historyManager.saveChange(change);

    this._notifyPropertyChanged(graphic, { geometry: { x, y } });

    eventBus.emit(Events.GRAPHIC_MOVED, {
      graphicId: id,
      oldPosition,
      newPosition: { x, y },
      pageId: this.id,
      graphic,
    });
    this.markDirty();
  }

  resizeGraphic(id: string, width: number, height: number): void {
    const graphic = this.findGraphicById(id);
    if (!graphic || graphic.getLocked()) return;

    const oldGeometry = { ...graphic.config.geometry };
    const oldTransform = {
      x: oldGeometry.x ?? 0,
      y: oldGeometry.y ?? 0,
      width: oldGeometry.width ?? 0,
      height: oldGeometry.height ?? 0,
      rotation: oldGeometry.rotation ?? 0,
    };
    const oldSize = graphic.getSize();
    graphic.setSize(width, height);

    const newGeometry = graphic.config.geometry;
    const newTransform = {
      x: newGeometry.x ?? 0,
      y: newGeometry.y ?? 0,
      width: newGeometry.width ?? 0,
      height: newGeometry.height ?? 0,
      rotation: newGeometry.rotation ?? 0,
    };
    const change = new TransformGraphicChange(this, id, oldTransform, newTransform);
    this.historyManager.saveChange(change);

    graphic.onResize?.(width, height);
    this._notifyPropertyChanged(graphic, { geometry: { width, height } });

    eventBus.emit(Events.GRAPHIC_RESIZED, {
      graphicId: id,
      oldSize,
      newSize: { width, height },
      pageId: this.id,
      graphic,
    });
    this.markDirty();
  }

  duplicateGraphic(id: string): IGraphic | null {
    const graphic = this.findGraphicById(id);
    if (!graphic) return null;

    const newGraphic = GraphicFactory.createGraphicFromJSON(graphic.toJSON());
    const { x, y } = newGraphic.getPosition();
    newGraphic.setPosition(x + BasePage.DUPLICATE_OFFSET, y + BasePage.DUPLICATE_OFFSET);

    // ★ 按同类图元最大编码递增名称
    const newName = getNextGraphicName(newGraphic.type, this._graphics);
    newGraphic.config.name = newName;

    const originalZIndex = graphic.config.zIndex ?? 0;

    this.graphics.forEach(g => {
      if (g.config.zIndex >= originalZIndex) {
        g.config.zIndex += 1;
      }
    });

    newGraphic.setZIndex(originalZIndex + 1);

    const change = new DuplicateGraphicChange(this, graphic, newGraphic);
    this.historyManager.saveChange(change);

    this.addGraphic(newGraphic, false, false);
    return newGraphic;
  }

  duplicateGroup(groupId: string): { groupId: string; memberIds: string[] } | null {
    this.updateGroupManagerReferences();

    const group = this.groupManager.getGroup(groupId);
    if (!group) return null;

    const members = this.groupManager.getGroupMembers(groupId);
    if (members.length === 0) return null;

    const newMemberIds: string[] = [];
    const oldToNewIdMap = new Map<string, string>();

    for (const member of members) {
      const newGraphic = GraphicFactory.createGraphicFromJSON(member.toJSON());
      const { x, y } = newGraphic.getPosition();
      newGraphic.setPosition(x + BasePage.DUPLICATE_OFFSET, y + BasePage.DUPLICATE_OFFSET);

      // ★ 按同类图元最大编码递增名称
      const newName = getNextGraphicName(newGraphic.type, this._graphics);
      newGraphic.config.name = newName;

      const origZIndex = member.config.zIndex ?? 0;
      newGraphic.setZIndex(origZIndex);

      newGraphic.config.groupId = null;
      newGraphic.config.isGroup = false;
      newGraphic.config.groupMembers = [];

      this.graphics.push(newGraphic);
      this._injectPageContext(newGraphic);

      oldToNewIdMap.set(member.id, newGraphic.id);
      newMemberIds.push(newGraphic.id);

      eventBus.emit(Events.GRAPHIC_ADDED, { graphic: newGraphic, pageId: this.id });
    }

    this.updateGroupManagerReferences();

    const newGroupName = group.name.includes('Copy')
      ? group.name.replace(/ \(Copy \d+\)$/, '') + ` (Copy ${Date.now() % 1000})`
      : `${group.name} Copy`;

    const newGroup = this.groupManager.createGroup(newMemberIds, newGroupName, group.parentId ?? undefined);
    if (!newGroup) {
      console.warn('duplicateGroup: created members but failed to create group');
      return { groupId: '', memberIds: newMemberIds };
    }

    for (const newId of newMemberIds) {
      const graphic = this.findGraphicById(newId);
      if (graphic) graphic.config.groupId = newGroup.id;
    }

    const change = new GroupGraphicChange(this, newGroup.id, newMemberIds, true);
    this.historyManager.saveChange(change);

    this.markDirty();
    return { groupId: newGroup.id, memberIds: newMemberIds };
  }

  cutSelectedGraphics(): IGraphic[] {
    if (this.selectedGraphicIds.length === 0) return [];

    const cutGraphics = this.selectedGraphicIds
      .map(id => {
        const graphic = this.findGraphicById(id);
        return graphic ? { ...graphic.toJSON() } : null;
      })
      .filter((g): g is any => g !== null);

    const sortedIds = [...this.selectedGraphicIds].sort((a, b) => {
      const idxA = this.graphics.findIndex(g => g.id === a);
      const idxB = this.graphics.findIndex(g => g.id === b);
      return idxB - idxA;
    });

    sortedIds.forEach(id => this.removeGraphic(id));
    this.clearSelection();

    return cutGraphics.map(g => GraphicFactory.createGraphicFromJSON(g));
  }

  lockGraphic(id: string): void { this._setGraphicFlag(id, 'locked', true); }
  unlockGraphic(id: string): void { this._setGraphicFlag(id, 'locked', false); }

  toggleGraphicLock(id: string): void {
    const graphic = this.findGraphicById(id);
    if (graphic) this._setGraphicFlag(id, 'locked', !graphic.getLocked());
  }

  showGraphic(id: string): void { this._setGraphicFlag(id, 'visible', true); }
  hideGraphic(id: string): void { this._setGraphicFlag(id, 'visible', false); }

  toggleGraphicVisibility(id: string): void {
    const graphic = this.findGraphicById(id);
    if (graphic) this._setGraphicFlag(id, 'visible', !graphic.getVisible());
  }

  importGraphics(data: any[]): void {
    this.graphics = data.map((item) => GraphicFactory.createGraphicFromJSON(item));
    this.markDirty();
  }

  exportGraphics(): any[] {
    return this.graphics.map((graphic) => graphic.toJSON());
  }

  // ==================== 选择管理 ====================

  get selectedGraphicId(): string | null { return this.selectionManager.getSelectedGraphicId(); }
  get selectedGraphicIds(): string[] { return this.selectionManager.getSelectedGraphicIds(); }

  getSelectionManager(): SelectionManager { return this.selectionManager; }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  selectGraphic(id: string | null): void {
    const oldSelectedGraphicId = this.selectionManager.getSelectedGraphicId();

    if (id) {
      const graphic = this.findGraphicById(id);
      if (!graphic) return;

      if (this._groupEditMode.active && this._groupEditMode.groupId) {
        this.selectionManager.select(id);
      } else {
        this.updateGroupManagerReferences();
        const group = this.groupManager.getGroupForGraphic(id);
        if (group) {
          const previousMode = this.selectionManager.getMode();
          this.selectionManager.setMode(SelectionMode.BOX);
          this.selectMultipleGraphics(group.children);
          this.selectionManager.setMode(previousMode);
        } else {
          this.selectionManager.select(id);
        }
      }
    } else {
      this.selectionManager.clear();
    }

    eventBus.emit(Events.GRAPHIC_SELECTED, {
      graphicId: id,
      oldGraphicId: oldSelectedGraphicId,
      pageId: this.id,
    });
    eventBus.emit(Events.SELECTION_CHANGED, {
      selectedGraphicIds: this.selectionManager.getSelectedGraphicIds(),
      pageId: this.id,
    });
  }

  selectMultipleGraphics(ids: string[]): void {
    const oldSelectedGraphicIds = [...this.selectionManager.getSelectedGraphicIds()];
    const previousMode = this.selectionManager.getMode();
    if (ids.length > 1) {
      this.selectionManager.setMode(SelectionMode.BOX);
    }
    this.selectionManager.selectMultiple(ids);
    if (ids.length > 1) {
      this.selectionManager.setMode(previousMode);
    }
    eventBus.emit(Events.SELECTION_CHANGED, {
      selectedGraphicIds: this.selectionManager.getSelectedGraphicIds(),
      oldSelectedGraphicIds,
      pageId: this.id,
    });
  }

  addToSelection(id: string): void { 
    if (!this.selectionManager.isSelected(id)) {
      this.selectionManager.addToSelection(id);
      eventBus.emit(Events.SELECTION_CHANGED, {
        selectedGraphicIds: this.selectionManager.getSelectedGraphicIds(),
        pageId: this.id,
      });
    }
  }
  removeFromSelection(id: string): void { 
    if (this.selectionManager.isSelected(id)) {
      this.selectionManager.removeFromSelection(id);
      eventBus.emit(Events.SELECTION_CHANGED, {
        selectedGraphicIds: this.selectionManager.getSelectedGraphicIds(),
        pageId: this.id,
      });
    }
  }

  clearSelection(): void {
    const oldSelectedGraphicIds = [...this.selectionManager.getSelectedGraphicIds()];
    this.selectionManager.clear();
    eventBus.emit(Events.SELECTION_CLEARED, { oldSelectedGraphicIds, pageId: this.id });
    eventBus.emit(Events.SELECTION_CHANGED, {
      selectedGraphicIds: this.selectionManager.getSelectedGraphicIds(),
      oldSelectedGraphicIds,
      pageId: this.id,
    });
  }

  hasMultipleSelectedGraphics(): boolean { return this.selectedGraphicIds.length > 1; }
  hasSelectedGraphics(): boolean { return this.selectedGraphicIds.length > 0; }

  private getSelectionGraphics(): IGraphic[] {
    return this.graphics.filter(g => this.selectedGraphicIds.includes(g.id));
  }

  selectGroupMembers(groupId: string): void {
    this.updateGroupManagerReferences();
    const members = this.groupManager.getGroupMembers(groupId);
    if (members.length > 0) {
      const previousMode = this.selectionManager.getMode();
      this.selectionManager.setMode(SelectionMode.BOX);
      this.selectMultipleGraphics(members.map(m => m.id));
      this.selectionManager.setMode(previousMode);
    }
  }

  // ==================== 组编辑模式 ====================

  get groupEditMode(): { active: boolean; groupId: string | null } { return this._groupEditMode; }

  enterGroupEditMode(groupId: string): void {
    this._groupEditMode = { active: true, groupId };
    this.selectionManager.clear();
    const members = this.getGroupMembers(groupId);
    if (members.length > 0) this.selectionManager.select(members[0].id);
    eventBus.emit(Events.GROUP_EDIT_MODE_CHANGED, { pageId: this.id, groupId, active: true });
  }

  exitGroupEditMode(): void {
    const groupId = this._groupEditMode.groupId;
    this._groupEditMode = { active: false, groupId: null };
    if (groupId) {
      this.updateGroupManagerReferences();
      const members = this.groupManager.getGroupMembers(groupId);
      if (members.length > 0) {
        const previousMode = this.selectionManager.getMode();
        this.selectionManager.setMode(SelectionMode.BOX);
        this.selectionManager.clear();
        this.selectMultipleGraphics(members.map(m => m.id));
        this.selectionManager.setMode(previousMode);
      }
    }
    eventBus.emit(Events.GROUP_EDIT_MODE_CHANGED, { pageId: this.id, active: false });
  }

  toggleGroupEditMode(groupId?: string): void {
    if (this._groupEditMode.active) {
      this.exitGroupEditMode();
    } else if (groupId) {
      this.enterGroupEditMode(groupId);
    }
  }

  // ==================== 组合管理 ====================

  getGroupManager(): GroupManager { return this.groupManager; }

  getGroupBounds(groupId: string): { x: number; y: number; width: number; height: number } {
    this.updateGroupManagerReferences();
    return this.groupManager.getGroupBounds(groupId);
  }

  moveGroup(groupId: string, dx: number, dy: number): void {
    this.updateGroupManagerReferences();
    this.groupManager.moveGroup(groupId, dx, dy);
    eventBus.emit('group-moved', { groupId, dx, dy, pageId: this.id });
  }

  scaleGroup(groupId: string, scaleX: number, scaleY: number, centerX?: number, centerY?: number): void {
    this.updateGroupManagerReferences();
    this.groupManager.scaleGroup(groupId, scaleX, scaleY, centerX, centerY);
    eventBus.emit('group-scaled', { groupId, scaleX, scaleY, pageId: this.id });
  }

  rotateGroup(groupId: string, angle: number, centerX?: number, centerY?: number): void {
    this.updateGroupManagerReferences();
    this.groupManager.rotateGroup(groupId, angle, centerX, centerY);
    eventBus.emit('group-rotated', { groupId, angle, pageId: this.id });
  }

  createGroup(graphicIds: string[], groupId?: string): any {
    this.updateGroupManagerReferences();
    const group = this.groupManager.createGroup(graphicIds, groupId);
    return group;
  }

  ungroup(groupId: string): IGraphic[] {
    this.updateGroupManagerReferences();
    const members = this.groupManager.ungroup(groupId);
    return members;
  }

  isGroup(id: string): boolean { return this.groupManager.isGroup(id); }
  getGroupMembers(groupId: string): IGraphic[] { return this.groupManager.getGroupMembers(groupId); }

  removeFromGroup(graphicId: string): void {
    this.updateGroupManagerReferences();
    this.groupManager.removeFromGroup(graphicId);
  }

  addToGroup(graphicId: string, groupId: string): void {
    this.updateGroupManagerReferences();
    this.groupManager.addToGroup(graphicId, groupId);
  }

  updateGroupBounds(groupId: string): void {
    this.updateGroupManagerReferences();
    this.groupManager.updateGroupBounds(groupId);
  }

  groupGraphics(ids: string[]): any {
    this.updateGroupManagerReferences();
    const group = this.groupManager.createGroup(ids);
    if (group) {
      const change = new GroupGraphicChange(this, group.id, [...ids], true);
      this.historyManager.saveChange(change);
      const previousMode = this.selectionManager.getMode();
      this.selectionManager.setMode(SelectionMode.BOX);
      this.selectMultipleGraphics(ids);
      this.selectionManager.setMode(previousMode);
    }
    this.markDirty();
    return group;
  }

  ungroupGraphic(groupId: string): IGraphic[] {
    this.updateGroupManagerReferences();
    const members = this.groupManager.getGroupMembers(groupId);
    const memberIds = members.map(m => m.id);
    const result = this.ungroup(groupId);

    const previousMode = this.selectionManager.getMode();
    this.selectionManager.setMode(SelectionMode.BOX);
    this.selectionManager.clear();
    this.selectMultipleGraphics(memberIds);
    this.selectionManager.setMode(previousMode);

    const change = new GroupGraphicChange(this, groupId, memberIds, false);
    this.historyManager.saveChange(change);
    this.markDirty();

    return result;
  }

  private updateGroupManagerReferences(): void {
    this.groupManager.updateReferences(this.graphics, new Map(this.graphics.map(g => [g.id, g])));
  }

  // ==================== 图层管理 ====================

  getLayerManager(): LayerManager { return this.layerManager; }

  bringToFront(id: string): void {
    const graphic = this.findGraphicById(id);
    if (graphic) {
      const oldIndex = graphic.config.zIndex;
      this.layerManager.bringToFront(this.graphics, id, this.id);
      const newIndex = this.graphics.length - 1;
      const change = new ReorderGraphicChange(this, id, oldIndex, newIndex);
      this.historyManager.saveChange(change);
      this.markDirty();
    }
  }

  sendToBack(id: string): void {
    const graphic = this.findGraphicById(id);
    if (graphic) {
      const oldIndex = graphic.config.zIndex;
      this.layerManager.sendToBack(this.graphics, id, this.id);
      const change = new ReorderGraphicChange(this, id, oldIndex, 0);
      this.historyManager.saveChange(change);
      this.markDirty();
    }
  }

  bringForward(id: string): void {
    const graphic = this.findGraphicById(id);
    if (graphic) {
      const oldIndex = graphic.config.zIndex;
      this.layerManager.bringForward(this.graphics, id, this.id);
      const newIndex = Math.min(oldIndex + 1, this.graphics.length - 1);
      const change = new ReorderGraphicChange(this, id, oldIndex, newIndex);
      this.historyManager.saveChange(change);
      this.markDirty();
    }
  }

  sendBackward(id: string): void {
    const graphic = this.findGraphicById(id);
    if (graphic) {
      const oldIndex = graphic.config.zIndex;
      this.layerManager.sendBackward(this.graphics, id, this.id);
      const newIndex = Math.max(oldIndex - 1, 0);
      const change = new ReorderGraphicChange(this, id, oldIndex, newIndex);
      this.historyManager.saveChange(change);
      this.markDirty();
    }
  }

  reorderGraphic(id: string, newIndex: number): void {
    const graphic = this.findGraphicById(id);
    if (!graphic) return;

    const oldIndex = graphic.config.zIndex;
    if (oldIndex === newIndex) return;

    const sorted = [...this.graphics].sort(
      (a, b) => (a.config.zIndex ?? 0) - (b.config.zIndex ?? 0)
    );

    const dragIdx = sorted.findIndex(g => g.id === id);
    if (dragIdx === -1) return;
    sorted.splice(dragIdx, 1);

    const clampedIndex = Math.min(newIndex, sorted.length);
    sorted.splice(clampedIndex, 0, graphic);

    sorted.forEach((g, idx) => { g.config.zIndex = idx; });

    const change = new ReorderGraphicChange(this, id, oldIndex, newIndex);
    this.historyManager.saveChange(change);

    eventBus.emit(Events.GRAPHIC_UPDATED, {
      graphicId: id,
      properties: { zIndex: clampedIndex },
      pageId: this.id,
      graphic,
    });
    this.markDirty();
  }

  getSortedGraphics(): IGraphic[] { return this.layerManager.getSortedGraphics(this.graphics); }

  // ==================== 历史记录 ====================

  getHistoryManager(): HistoryManager { return this.historyManager; }

  undo(): void { this.historyManager.undo(); this.markDirty(); }
  redo(): void { this.historyManager.redo(); this.markDirty(); }
  canUndo(): boolean { return this.historyManager.canUndo(); }
  canRedo(): boolean { return this.historyManager.canRedo(); }

  startBatch(description: string): void {
    this.historyManager.startBatch(description);
  }

  endBatch(): void {
    this.historyManager.endBatch();
    this.markDirty();
  }

  jumpToHistory(index: number): void {
    this.historyManager.jumpTo(index);
    this.markDirty();
  }

  // ==================== 对齐与分布 ====================

  getAlignmentManager(): AlignmentManager { return this.alignmentManager; }
  getLayoutManager(): LayoutManager { return this.layoutManager; }

  setLayout(layout: LayoutType): void { this.layoutManager.setLayout(layout); }
  getCurrentLayout(): LayoutType { return this.layoutManager.getCurrentLayout(); }
  applyGridLayout(config: GridLayoutConfig): void { this.layoutManager.gridLayout(this.graphics, config); }

  adjustSpacing(spacing: number, direction: 'horizontal' | 'vertical'): void {
    if (this.selectedGraphicIds.length < 2) return;

    const selectedGraphics = this.graphics
      .filter((g) => this.selectedGraphicIds.includes(g.id))
      .sort((a, b) => {
        const posA = a.getPosition();
        const posB = b.getPosition();
        return direction === 'horizontal' ? posA.x - posB.x : posA.y - posB.y;
      });

    if (direction === 'horizontal') {
      let currentX = selectedGraphics[0].getPosition().x + selectedGraphics[0].getSize().width + spacing;
      for (let i = 1; i < selectedGraphics.length; i++) {
        const size = selectedGraphics[i].getSize();
        this.moveGraphic(selectedGraphics[i].id, currentX, selectedGraphics[i].getPosition().y);
        currentX += size.width + spacing;
      }
    } else {
      let currentY = selectedGraphics[0].getPosition().y + selectedGraphics[0].getSize().height + spacing;
      for (let i = 1; i < selectedGraphics.length; i++) {
        const size = selectedGraphics[i].getSize();
        this.moveGraphic(selectedGraphics[i].id, selectedGraphics[i].getPosition().x, currentY);
        currentY += size.height + spacing;
      }
    }
  }

  autoLayout(layoutType: 'grid' | 'flow' | 'circle'): void {
    if (this.selectedGraphicIds.length < 2) return;

    const selectedGraphics = this.graphics.filter((g) => this.selectedGraphicIds.includes(g.id));
    const count = selectedGraphics.length;

    switch (layoutType) {
      case 'grid': {
        const gridCols = Math.ceil(Math.sqrt(count));
        const cellWidth = 120;
        const cellHeight = 80;

        selectedGraphics.forEach((graphic, index) => {
          const col = index % gridCols;
          const row = Math.floor(index / gridCols);
          this.moveGraphic(graphic.id, col * (cellWidth + 20), row * (cellHeight + 20));
          this.resizeGraphic(graphic.id, cellWidth, cellHeight);
        });
        break;
      }
      case 'flow': {
        let x = 0; let y = 0;
        const maxWidth = this.width;
        let rowHeight = 0;

        selectedGraphics.forEach((graphic) => {
          const size = graphic.getSize();
          if (x + size.width > maxWidth) {
            x = 0;
            y += rowHeight;
            rowHeight = 0;
          }
          this.moveGraphic(graphic.id, x, y);
          x += size.width + 20;
          rowHeight = Math.max(rowHeight, size.height);
        });
        break;
      }
      case 'circle': {
        const centerX = 400;
        const centerY = 300;
        const radius = 150;

        selectedGraphics.forEach((graphic, index) => {
          const angle = (index / count) * Math.PI * 2;
          const size = graphic.getSize();
          this.moveGraphic(
            graphic.id,
            centerX + Math.cos(angle) * radius - size.width / 2,
            centerY + Math.sin(angle) * radius - size.height / 2,
          );
        });
        break;
      }
    }
  }

  alignGraphics(alignment: AlignmentType): void {
    if (this.selectedGraphicIds.length < 2) return;

    const selectedGraphics = this.graphics.filter((g) => this.selectedGraphicIds.includes(g.id));
    if (selectedGraphics.length < 2) return;

    switch (alignment) {
      case 'left': this.alignmentManager.alignLeft(selectedGraphics); break;
      case 'right': this.alignmentManager.alignRight(selectedGraphics); break;
      case 'top': this.alignmentManager.alignTop(selectedGraphics); break;
      case 'bottom': this.alignmentManager.alignBottom(selectedGraphics); break;
      case 'center': this.alignmentManager.alignCenter(selectedGraphics); break;
      case 'middle': this.alignmentManager.alignMiddle(selectedGraphics); break;
    }
    this.markDirty();
  }

  distributeGraphics(direction: DistributionDirection): void {
    if (this.selectedGraphicIds.length < 3) return;

    const selectedGraphics = this.graphics.filter((g) => this.selectedGraphicIds.includes(g.id));
    if (selectedGraphics.length < 3) return;

    if (direction === 'horizontal') {
      this.alignmentManager.distributeHorizontal(selectedGraphics);
    } else {
      this.alignmentManager.distributeVertical(selectedGraphics);
    }
    this.markDirty();
  }

  // ==================== 网格吸附 ====================

  setGridSnapConfig(config: Partial<GridSnapConfig>): void { this.gridSnapManager.setConfig(config); }
  getGridSnapConfig(): GridSnapConfig { return this.gridSnapManager.getConfig(); }
  snapPosition(x: number, y: number, referenceGraphics?: IGraphic[]): SnapResult {
    return this.gridSnapManager.snapPosition(x, y, referenceGraphics);
  }
  getGridLines(bounds: { x: number; y: number; width: number; height: number }) {
    return this.gridSnapManager.getGridLines(bounds);
  }
  getGridSnapManager(): GridSnapManager { return this.gridSnapManager; }

  // ==================== 智能对齐 ====================

  setAlignDistance(distance: number): void { this.smartAlignManager.setAlignDistance(distance); }
  detectAlignTargets(draggingGraphic: IGraphic, otherGraphics: IGraphic[]) {
    return this.smartAlignManager.detectAlignTargets(draggingGraphic, otherGraphics);
  }
  makeSameSize(graphics: IGraphic[]): void { this.smartAlignManager.makeSameSize(graphics); this.markDirty(); }
  makeSameWidth(graphics: IGraphic[]): void { this.smartAlignManager.makeSameWidth(graphics); this.markDirty(); }
  makeSameHeight(graphics: IGraphic[]): void { this.smartAlignManager.makeSameHeight(graphics); this.markDirty(); }
  alignToPageEdge(graphics: IGraphic[], type: 'left' | 'right' | 'top' | 'bottom', margin?: number): void {
    this.smartAlignManager.alignToPageEdge(graphics, type, this.width, this.height, margin);
    this.markDirty();
  }
  centerOnPage(graphics: IGraphic[], direction?: 'horizontal' | 'vertical' | 'both'): void {
    this.smartAlignManager.centerOnPage(graphics, this.width, this.height, direction);
    this.markDirty();
  }
  getSmartAlignManager(): SmartAlignManager { return this.smartAlignManager; }

  // ==================== 辅助线 ====================

  addGuideLine(position: number, direction: 'horizontal' | 'vertical'): string {
    this.markDirty();
    return this.smartAlignManager.addGuideLine(position, direction);
  }
  removeGuideLine(id: string): void { this.smartAlignManager.removeGuideLine(id); this.markDirty(); }
  clearAllGuideLines(): void { this.smartAlignManager.clearAllGuideLines(); this.markDirty(); }
  updateGuideLinePosition(id: string, position: number): void { this.smartAlignManager.updateGuideLinePosition(id, position); this.markDirty(); }
  getAllGuideLines(): GuideLine[] { return this.smartAlignManager.getAllGuideLines(); }
  getGuideLine(id: string): GuideLine | null { return this.smartAlignManager.getGuideLine(id); }

  // ==================== 批量操作 ====================

  batchEdit(properties: Record<string, any>): void {
    if (this.selectedGraphicIds.length === 0) return;
    this.graphics
      .filter((g) => this.selectedGraphicIds.includes(g.id))
      .forEach((graphic) => { this.batchOperationManager.addOperation(graphic.id, properties); });
    this.batchOperationManager.execute();
    this.markDirty();
  }

  batchMove(deltaX: number, deltaY: number): void {
    const selectedGraphics = this.getSelectionGraphics();
    if (selectedGraphics.length === 0) return;
    this.batchOperationManager.batchMove(selectedGraphics, deltaX, deltaY);
    this.markDirty();
  }

  batchScale(scaleX: number, scaleY: number, origin?: { x: number; y: number }): void {
    const selectedGraphics = this.getSelectionGraphics();
    if (selectedGraphics.length === 0) return;
    this.batchOperationManager.batchScale(selectedGraphics, scaleX, scaleY, origin);
    this.markDirty();
  }

  batchRotate(degrees: number, origin?: { x: number; y: number }): void {
    const selectedGraphics = this.getSelectionGraphics();
    if (selectedGraphics.length === 0) return;
    this.batchOperationManager.batchRotate(selectedGraphics, degrees, origin);
    this.markDirty();
  }

  batchApplyStyle(styleProperties: BatchStyleOptions): void {
    const selectedGraphics = this.getSelectionGraphics();
    if (selectedGraphics.length === 0) return;
    this.batchOperationManager.batchApplyStyle(selectedGraphics, styleProperties);
    this.markDirty();
  }

  batchSetProperty(propertyPath: string, value: any): void {
    const selectedGraphics = this.getSelectionGraphics();
    if (selectedGraphics.length === 0) return;
    this.batchOperationManager.batchSetProperty(selectedGraphics, propertyPath, value);
    this.markDirty();
  }

  smartPaste(options: SmartPasteOptions): IGraphic[] {
    const selectedGraphics = this.getSelectionGraphics();
    if (selectedGraphics.length === 0) return [];
    const result = this.batchOperationManager.smartPaste(selectedGraphics, options);
    // ★ 按同类图元最大编码递增名称
    for (const g of result) {
      g.config.name = getNextGraphicName(g.type, this._graphics);
    }
    return result;
  }

  spaceEvenlyHorizontal(spacing?: number): void {
    const selectedGraphics = this.getSelectionGraphics();
    if (selectedGraphics.length < 2) return;
    this.batchOperationManager.spaceEvenlyHorizontal(selectedGraphics, spacing);
  }

  spaceEvenlyVertical(spacing?: number): void {
    const selectedGraphics = this.getSelectionGraphics();
    if (selectedGraphics.length < 2) return;
    this.batchOperationManager.spaceEvenlyVertical(selectedGraphics, spacing);
  }

  getBatchOperationManager(): BatchOperationManager { return this.batchOperationManager; }

  // ==================== 定时器管理 ====================

  getTimerManager(): TimerManager { return this.timerManager; }

  addTimer(timer: Omit<ITimerConfig, 'id' | 'lastExecuteTime' | 'executeCount'>): ITimerConfig {
    this.markDirty();
    return this.timerManager.addTimer(timer);
  }

  updateTimer(id: string, config: Partial<ITimerConfig>): void { this.timerManager.updateTimer(id, config); this.markDirty(); }
  removeTimer(id: string): void { this.timerManager.removeTimer(id); this.markDirty(); }
  getTimer(id: string): ITimerConfig | null { return this.timerManager.getTimer(id); }
  getAllTimers(): ITimerConfig[] { return this.timerManager.toJSON(); }
  enableTimer(id: string): void { this.timerManager.enableTimer(id); this.markDirty(); }
  disableTimer(id: string): void { this.timerManager.disableTimer(id); this.markDirty(); }

  startTimers(): void {
    for (const timer of this.timerManager.getAllTimers()) {
      if (timer.enabled) this.timerManager.startTimer(timer.id, this);
    }
  }

  stopTimers(): void { this.timerManager.stopAllTimers(); }
  startTimer(id: string): void { this.timerManager.startTimer(id, this); }
  stopTimer(id: string): void { this.timerManager.stopTimer(id); }

  executeTimerScript(timer: ITimerConfig): ITimerExecutionResult {
    return this.timerManager.executeTimerScript(timer, this);
  }

  // ==================== 视口适配 ====================

  setFitMode(mode: FitMode): void { this._fitMode = mode; }
  getFitMode(): FitMode { return this._fitMode; }

  autoFit(viewportWidth: number, viewportHeight: number, scaleRange?: ScaleRange): void {
    const result = ZoomManager.calculateScaleByMode(
      this._fitMode, this._width, this._height,
      viewportWidth, viewportHeight, defaultAutoFitConfig, scaleRange,
    );
    if (this._fitMode === 'auto') this._fitMode = result.fitMode;
    this._scale = result.scale;
  }

  autoFitToGraphics(viewportWidth: number, viewportHeight: number, scaleRange?: ScaleRange): void {
    const graphics = this.getGraphics();
    if (graphics.length === 0) {
      this.autoFit(viewportWidth, viewportHeight, scaleRange);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    graphics.forEach(graphic => {
      if (graphic && typeof graphic.getPosition === 'function' && typeof graphic.getSize === 'function') {
        const { x, y } = graphic.getPosition();
        const { width, height } = graphic.getSize();
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      }
    });

    const contentWidth = maxX > minX ? maxX - minX : this._width;
    const contentHeight = maxY > minY ? maxY - minY : this._height;

    const result = ZoomManager.calculateScaleByMode(
      this._fitMode, contentWidth, contentHeight,
      viewportWidth, viewportHeight, defaultAutoFitConfig, scaleRange,
    );

    if (this._fitMode === 'auto') this._fitMode = result.fitMode;
    this._scale = result.scale;
  }

  resetFitMode(): void {
    this._fitMode = 'contain';
    this._scale = BasePage.DEFAULT_SCALE;
  }
}