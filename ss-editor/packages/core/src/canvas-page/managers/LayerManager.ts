// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';
import { eventBus, Events } from '../../utils/event/eventBus';

export class LayerManager {

    bringToFront(graphics: IGraphic[], id: string, pageId: string): void {
        const graphic = graphics.find(g => g.id === id);
        if (graphic) {
            const maxZIndex = Math.max(...graphics.map((g) => g.getZIndex ? g.getZIndex() : (g.config?.zIndex ?? 0)));
            if (graphic.setZIndex) {
                graphic.setZIndex(maxZIndex + 1);
            } else if (graphic.config) {
                graphic.config.zIndex = maxZIndex + 1;
            }
            eventBus.emit(Events.GRAPHIC_UPDATED, {
                graphicId: id,
                properties: { zIndex: maxZIndex + 1 },
                pageId,
                graphic,
            });
        }
    }

    sendToBack(graphics: IGraphic[], id: string, pageId: string): void {
        const graphic = graphics.find(g => g.id === id);
        if (graphic) {
            const minZIndex = Math.min(...graphics.map((g) => g.getZIndex ? g.getZIndex() : (g.config?.zIndex ?? 0)));
            if (graphic.setZIndex) {
                graphic.setZIndex(minZIndex - 1);
            } else if (graphic.config) {
                graphic.config.zIndex = minZIndex - 1;
            }
            eventBus.emit(Events.GRAPHIC_UPDATED, {
                graphicId: id,
                properties: { zIndex: minZIndex - 1 },
                pageId,
                graphic,
            });
        }
    }

    bringForward(graphics: IGraphic[], id: string, pageId: string): void {
        const graphic = graphics.find(g => g.id === id);
        if (!graphic) return;

        const sortedGraphics = [...graphics].sort((a, b) => {
            const zA = a.getZIndex ? a.getZIndex() : (a.config?.zIndex ?? 0);
            const zB = b.getZIndex ? b.getZIndex() : (b.config?.zIndex ?? 0);
            return zA - zB;
        });

        const currentIndex = sortedGraphics.findIndex((g) => g.id === id);
        if (currentIndex < sortedGraphics.length - 1) {
            const nextGraphic = sortedGraphics[currentIndex + 1];
            const tempZIndex = graphic.getZIndex ? graphic.getZIndex() : (graphic.config?.zIndex ?? 0);
            const nextZIndex = nextGraphic.getZIndex ? nextGraphic.getZIndex() : (nextGraphic.config?.zIndex ?? 0);

            if (graphic.setZIndex) {
                graphic.setZIndex(nextZIndex);
            } else if (graphic.config) {
                graphic.config.zIndex = nextZIndex;
            }

            if (nextGraphic.setZIndex) {
                nextGraphic.setZIndex(tempZIndex);
            } else if (nextGraphic.config) {
                nextGraphic.config.zIndex = tempZIndex;
            }

            eventBus.emit(Events.GRAPHIC_UPDATED, {
                graphicId: id,
                properties: { zIndex: nextZIndex },
                pageId,
                graphic,
            });
            // 同时触发被交换图元的事件，确保 UI 同步更新
            eventBus.emit(Events.GRAPHIC_UPDATED, {
                graphicId: nextGraphic.id,
                properties: { zIndex: tempZIndex },
                pageId,
                graphic: nextGraphic,
            });
        }
    }

    sendBackward(graphics: IGraphic[], id: string, pageId: string): void {
        const graphic = graphics.find(g => g.id === id);
        if (!graphic) return;

        const sortedGraphics = [...graphics].sort((a, b) => {
            const zA = a.getZIndex ? a.getZIndex() : (a.config?.zIndex ?? 0);
            const zB = b.getZIndex ? b.getZIndex() : (b.config?.zIndex ?? 0);
            return zA - zB;
        });

        const currentIndex = sortedGraphics.findIndex((g) => g.id === id);
        if (currentIndex > 0) {
            const prevGraphic = sortedGraphics[currentIndex - 1];
            const tempZIndex = graphic.getZIndex ? graphic.getZIndex() : (graphic.config?.zIndex ?? 0);
            const prevZIndex = prevGraphic.getZIndex ? prevGraphic.getZIndex() : (prevGraphic.config?.zIndex ?? 0);

            if (graphic.setZIndex) {
                graphic.setZIndex(prevZIndex);
            } else if (graphic.config) {
                graphic.config.zIndex = prevZIndex;
            }

            if (prevGraphic.setZIndex) {
                prevGraphic.setZIndex(tempZIndex);
            } else if (prevGraphic.config) {
                prevGraphic.config.zIndex = tempZIndex;
            }

            eventBus.emit(Events.GRAPHIC_UPDATED, {
                graphicId: id,
                properties: { zIndex: prevZIndex },
                pageId,
                graphic,
            });
            // 同时触发被交换图元的事件，确保 UI 同步更新
            eventBus.emit(Events.GRAPHIC_UPDATED, {
                graphicId: prevGraphic.id,
                properties: { zIndex: tempZIndex },
                pageId,
                graphic: prevGraphic,
            });
        }
    }

    getSortedGraphics(graphics: IGraphic[]): IGraphic[] {
        return [...graphics].sort((a, b) => {
            const zA = a.config?.zIndex ?? 0;
            const zB = b.config?.zIndex ?? 0;
            return zA - zB;
        });
    }

    setZIndex(graphics: IGraphic[], id: string, zIndex: number, pageId: string): void {
        const graphic = graphics.find(g => g.id === id);
        if (graphic) {
            if (graphic.setZIndex) {
                graphic.setZIndex(zIndex);
            } else if (graphic.config) {
                graphic.config.zIndex = zIndex;
            }
            eventBus.emit(Events.GRAPHIC_UPDATED, {
                graphicId: id,
                properties: { zIndex },
                pageId,
                graphic,
            });
        }
    }

    getZIndexOrder(graphics: IGraphic[]): string[] {
        return this.getSortedGraphics(graphics).map((g) => g.id);
    }
}
