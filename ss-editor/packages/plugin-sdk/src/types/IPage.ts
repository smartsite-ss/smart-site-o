// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from './IGraphic';

export interface IPage {
  id: string;
  name: string;
  width: number;
  height: number;
  scale: number;
  backgroundColor: string;
  mode?: 'edit' | 'preview';
  graphics: IGraphic[];
  getSize(): { width: number; height: number };
  getGraphics(): IGraphic[];
  findGraphicById(id: string): IGraphic | null;
  getGraphicById(id: string): IGraphic | null;
  addGraphic(graphic: IGraphic, autoZIndex?: boolean): void;
  removeGraphic(id: string): void;
}