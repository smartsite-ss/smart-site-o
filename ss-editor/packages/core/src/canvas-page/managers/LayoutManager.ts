// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';

export type LayoutType = 'grid' | 'flow' | 'circle' | 'free';

export interface GridLayoutConfig {
    columns: number;
    gap: number;
    startX: number;
    startY: number;
}

export class LayoutManager {
    private currentLayout: LayoutType = 'free';

    setLayout(layout: LayoutType): void {
        this.currentLayout = layout;
    }

    getCurrentLayout(): LayoutType {
        return this.currentLayout;
    }

    gridLayout(graphics: IGraphic[], config: GridLayoutConfig): void {
        const { columns, gap, startX, startY } = config;
        
        graphics.forEach((graphic, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            
            const width = graphic.config?.geometry?.width || 100;
            const height = graphic.config?.geometry?.height || 100;
            
            const x = startX + col * (width + gap);
            const y = startY + row * (height + gap);
            
            // 使用 setPosition 或直接更新 config
            if (graphic.setPosition) {
                graphic.setPosition(x, y);
            } else if (graphic.config?.geometry) {
                graphic.config.geometry.x = x;
                graphic.config.geometry.y = y;
            }
        });
    }
}
