// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { RendererFactory } from '../../canvas-page/renderer/RendererFactory';

describe('RendererFactory', () => {
    beforeEach(() => {
        const renderers = (RendererFactory as any)['renderers'];
        if (renderers) {
            renderers.clear();
        }
    });

    it('should return empty available renderers when none registered', () => {
        expect(RendererFactory.getAvailableRenderers()).toEqual([]);
    });

    it('should check if renderer is available', () => {
        expect(RendererFactory.isRendererAvailable('canvas')).toBe(false);
        expect(RendererFactory.isRendererAvailable('konva')).toBe(false);
    });

    it('should throw error for unregistered renderer type', () => {
        const mockContainer = {} as HTMLElement;
        
        expect(() => {
            RendererFactory.create('webgl', mockContainer);
        }).toThrow('Renderer type "webgl" not registered');
    });

    it('should register and track renderer types', () => {
        const mockConstructor = function() {} as any;
        RendererFactory.registerRenderer('canvas', mockConstructor);
        
        expect(RendererFactory.isRendererAvailable('canvas')).toBe(true);
        expect(RendererFactory.getAvailableRenderers()).toEqual(['canvas']);
    });
});