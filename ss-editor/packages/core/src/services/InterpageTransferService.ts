// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../graphic-editing/graphic/factory/GraphicFactory';

export interface ITransferableData {
    id: string;
    type: string;
    config: any;
    x: number;
    y: number;
    width: number;
    height: number;
}

export class InterpageTransferService {
    private idCounter: number = 0;

    /**
     * 序列化单个图形（与 toJSON 格式完全兼容）
     */
    serializeGraphic(graphic: IGraphic): ITransferableData {
        const graphicData = graphic.toJSON();
        return {
            id: graphicData.id,
            type: graphicData.type,
            config: graphicData.config,
            x: graphicData.config.geometry?.x || 0,
            y: graphicData.config.geometry?.y || 0,
            width: graphicData.config.geometry?.width || 0,
            height: graphicData.config.geometry?.height || 0
        };
    }

    /**
     * 批量序列化图形
     */
    serializeGraphics(graphics: IGraphic[]): ITransferableData[] {
        return graphics.map(g => this.serializeGraphic(g));
    }

    /**
     * 反序列化单个图形（与 GraphicFactory 完全兼容）
     */
    deserializeGraphic(data: ITransferableData): IGraphic {
        // 重构为与 toJSON 格式一致的结构
        const jsonData = {
            id: data.id,
            type: data.type,
            config: data.config
        };
        
        // 使用 GraphicFactory 创建图形
        const graphic = GraphicFactory.createGraphicFromJSON(jsonData);
        return graphic;
    }

    /**
     * 批量反序列化图形
     */
    deserializeGraphics(data: ITransferableData[]): IGraphic[] {
        return data.map(d => this.deserializeGraphic(d));
    }

    /**
     * 坐标转换
     */
    transformCoordinates(graphic: IGraphic, offsetX: number, offsetY: number): void {
        if (graphic.config.geometry) {
            graphic.config.geometry.x += offsetX;
            graphic.config.geometry.y += offsetY;
        }
    }

    /**
     * 生成新 ID
     */
    generateNewId(existingIds: string[]): string {
        let newId: string;
        do {
            newId = `graphic-${Date.now()}-${this.idCounter++}`;
        } while (existingIds.includes(newId));
        return newId;
    }

    /**
     * 重新分配 ID（避免冲突）
     */
    reassignIds(graphics: IGraphic[], existingIds: string[]): IGraphic[] {
        return graphics.map(graphic => {
            const newId = this.generateNewId(existingIds);
            // 更新 ID
            graphic.id = newId;
            graphic.config.id = newId;
            existingIds.push(newId);
            return graphic;
        });
    }
}
