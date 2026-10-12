// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { Graphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../../graphic-editing/graphic/factory/GraphicFactory';
import { LayerManager } from '../../../canvas-page/managers/LayerManager';

vi.mock('../../../utils/eventBus', () => ({
    eventBus: {
        emit: vi.fn(),
    },
    Events: {
        GRAPHIC_UPDATED: 'GRAPHIC_UPDATED',
    },
}));

@Graphic('layer-test-shape', 'Layer Test Shape', 'basic')
class LayerTestShape extends BaseGraphic {
    static defaultWidth = 100;
    static defaultHeight = 100;
    
    constructor(x: number = 0, y: number = 0, width: number = 100, height: number = 100) {
        super('layer-test-shape', x, y, width, height);
    }

    draw(): void {}

    containsPoint(): boolean {
        return false;
    }

    intersectsRegion(): boolean {
        return false;
    }
}

describe('Layer Operations', () => {
    beforeAll(() => {
        if (!GraphicFactory.hasGraphic('layer-test-shape')) {
            GraphicFactory.registerGraphic('layer-test-shape', LayerTestShape, 'Layer Test Shape', 'basic');
        }
    });

    describe('LayerManager', () => {
        let manager: LayerManager;
        let graphics: any[];

        beforeEach(() => {
            const graphic1 = new LayerTestShape(100, 100, 100, 100);
            graphic1.id = 'g1';
            graphic1.setZIndex(1);
            
            const graphic2 = new LayerTestShape(100, 100, 100, 100);
            graphic2.id = 'g2';
            graphic2.setZIndex(2);
            
            const graphic3 = new LayerTestShape(100, 100, 100, 100);
            graphic3.id = 'g3';
            graphic3.setZIndex(3);

            graphics = [graphic1, graphic2, graphic3];

            manager = new LayerManager();
        });

        describe('bringToFront', () => {
            it('should bring graphic to the topmost layer', () => {
                manager.bringToFront(graphics, 'g1', 'test-page');
                
                expect(graphics[0].getZIndex()).toBe(4);
                expect(graphics[0].getZIndex()).toBeGreaterThan(graphics[1].getZIndex());
                expect(graphics[0].getZIndex()).toBeGreaterThan(graphics[2].getZIndex());
            });

            it('should handle non-existent graphic', () => {
                expect(() => manager.bringToFront(graphics, 'not-exist', 'test-page')).not.toThrow();
            });
        });

        describe('sendToBack', () => {
            it('should send graphic to the bottommost layer', () => {
                manager.sendToBack(graphics, 'g3', 'test-page');
                
                expect(graphics[2].getZIndex()).toBe(0);
                expect(graphics[2].getZIndex()).toBeLessThan(graphics[0].getZIndex());
                expect(graphics[2].getZIndex()).toBeLessThan(graphics[1].getZIndex());
            });

            it('should handle non-existent graphic', () => {
                expect(() => manager.sendToBack(graphics, 'not-exist', 'test-page')).not.toThrow();
            });
        });

        describe('bringForward', () => {
            it('should swap graphic with the next graphic layer', () => {
                const initialZ1 = graphics[0].getZIndex();
                const initialZ2 = graphics[1].getZIndex();
                
                manager.bringForward(graphics, 'g1', 'test-page');
                
                expect(graphics[0].getZIndex()).toBe(initialZ2);
                expect(graphics[1].getZIndex()).toBe(initialZ1);
            });

            it('topmost graphic should remain unchanged when moving forward', () => {
                const initialZIndex = graphics[2].getZIndex();
                manager.bringForward(graphics, 'g3', 'test-page');
                
                expect(graphics[2].getZIndex()).toBe(initialZIndex);
            });
        });

        describe('sendBackward', () => {
            it('should swap graphic with the previous graphic layer', () => {
                const initialZ2 = graphics[1].getZIndex();
                const initialZ3 = graphics[2].getZIndex();
                
                manager.sendBackward(graphics, 'g3', 'test-page');
                
                expect(graphics[2].getZIndex()).toBe(initialZ2);
                expect(graphics[1].getZIndex()).toBe(initialZ3);
            });

            it('bottommost graphic should remain unchanged when moving backward', () => {
                const initialZIndex = graphics[0].getZIndex();
                manager.sendBackward(graphics, 'g1', 'test-page');
                
                expect(graphics[0].getZIndex()).toBe(initialZIndex);
            });
        });

        describe('get sorted graphics', () => {
            it('should return graphics sorted by zIndex ascending', () => {
                const sorted = manager.getSortedGraphics(graphics);
                
                expect(sorted[0].id).toBe('g1');
                expect(sorted[1].id).toBe('g2');
                expect(sorted[2].id).toBe('g3');
            });
        });
    });
});