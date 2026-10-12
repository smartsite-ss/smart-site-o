// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '../types';
import { GraphicFactory } from '../graphic-editing/graphic/factory/GraphicFactory';
import { usePageStore } from './page.store';
import { stateService } from '../services/state.service';
import { graphicCache } from './graphic-defaults';
import { getNextGraphicName } from '../utils/graphic/graphicNameUtils';

/** 根据ID获取图形 */
export function getGraphicById(id: string): IGraphic | undefined {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage) return undefined;
  const graphics =
    'value' in currentPage.graphics
      ? currentPage.graphics.value
      : (currentPage.graphics as IGraphic[]);
  return (graphics as IGraphic[]).find((g) => g.id === id);
}

/** 获取当前页面 */
export function getCurrentPage() {
  const pageStore = usePageStore();
  return pageStore.currentPage;
}

/** 获取当前页面的图形列表 */
export function getCurrentPageGraphics(): IGraphic[] | undefined {
  const currentPage = getCurrentPage();
  if (!currentPage) return undefined;
  const graphics = currentPage.graphics;
  if (Array.isArray(graphics)) {
    return graphics;
  }
  return (graphics as { value: IGraphic[] }).value;
}

/** 根据ID查找图形 */
export function findGraphicById(id: string): IGraphic | undefined {
  const currentPage = getCurrentPage();
  if (!currentPage) return undefined;
  const graphics =
    'value' in currentPage.graphics
      ? currentPage.graphics.value
      : (currentPage.graphics as IGraphic[]);
  return (
    (graphics as IGraphic[]).find((graphic: IGraphic) => graphic.id === id) || undefined
  );
}

/** 添加图形 */
export function addGraphic(
  type: string,
  x: number,
  y: number,
  width: number,
  height: number
): IGraphic | undefined {
  const currentPage = getCurrentPage();
  if (!currentPage || typeof currentPage.addGraphic !== 'function')
    return undefined;

  const graphic = GraphicFactory.createGraphic(
    type,
    x,
    y,
    width,
    height
  ) as IGraphic;
  if (!graphic) return undefined;

  // ★ 按同类图元最大编码递增名称
  const existingGraphics = currentPage.graphics;
  const graphicsArr = Array.isArray(existingGraphics) ? existingGraphics : (existingGraphics as any).value || [];
  const newName = getNextGraphicName(type, graphicsArr as IGraphic[]);
  graphic.config.name = newName;

  // 添加图形
  currentPage.addGraphic(graphic as IGraphic);

  currentPage.selectGraphic(graphic.id);

  // 失效查找缓存
  graphicCache.invalidate();

  return graphic;
}

/** 删除图形 */
export function removeGraphic(id: string) {
  const currentPage = getCurrentPage();
  if (!currentPage) return;
  currentPage.removeGraphic(id);

  // 失效查找缓存
  graphicCache.invalidate();
}

/** 复制页面图形 */
export function copyPageGraphics(sourcePageId: string, targetPageId: string) {
  const pageStore = usePageStore();
  const sourcePage = pageStore.pages.find((p) => p.id === sourcePageId);
  const targetPage = pageStore.pages.find((p) => p.id === targetPageId);
  if (!sourcePage || !targetPage) return;

  const sourceGraphics = sourcePage.graphics;
  const copiedGraphics = sourceGraphics.map((graphic) => {
    const newGraphic = GraphicFactory.createGraphicFromJSON(
      graphic.toJSON()
    );
    const { x, y } = newGraphic.getPosition();
    newGraphic.setPosition(x + 20, y + 20);
    return newGraphic;
  });

  // 追加而非替换，保留目标页面原有图元
  for (const graphic of copiedGraphics) {
    targetPage.addGraphic(graphic);
  }
}

/** 删除页面图形 */
export function removePageGraphics(pageId: string) {
  const pageStore = usePageStore();
  const page = pageStore.pages.find((p) => p.id === pageId);
  if (page) {
    const ids = page.getGraphics().map(g => g.id);
    for (const id of ids) {
      page.removeGraphic(id);
    }
  }
}

/** 切换选择状态 */
export function toggleSelection(id: string) {
  const currentPage = getCurrentPage();
  if (!currentPage) return;
  if (currentPage.selectedGraphicIds.includes(id)) {
    currentPage.removeFromSelection(id);
  } else {
    currentPage.addToSelection(id);
  }
}

/** 调整间距 */
export function adjustSpacing(spacing: number, direction: 'horizontal' | 'vertical') {
  const currentPage = getCurrentPage();
  if (!currentPage || typeof currentPage.adjustSpacing !== 'function')
    return;
  currentPage.adjustSpacing(spacing, direction);
}

/** 批量编辑 */
export function batchEdit(properties: Partial<IGraphic>) {
  const currentPage = getCurrentPage();
  if (!currentPage || typeof currentPage.batchEdit !== 'function') return;
  currentPage.batchEdit(properties);
}

/** 模板编辑 - 保存为模板 */
export function saveAsTemplate(name: string) {
  return stateService.saveTemplate(name);
}

/** 模板编辑 - 应用模板 */
export function applyTemplate(templateIndex: number) {
  stateService.applyTemplate(templateIndex);
}