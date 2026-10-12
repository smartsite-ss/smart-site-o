// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { ClipboardManager } from '../../../graphic-editing/managers/ClipboardManager';

describe('Clipboard Operations', () => {
    describe('ClipboardManager', () => {
        let clipboardManager: ClipboardManager;

        beforeEach(() => {
            clipboardManager = new ClipboardManager();
        });

        const createTransferableData = (id: string): any => ({
            id,
            type: 'rectangle',
            config: {
                id,
                visible: true,
                locked: false,
                zIndex: 0,
                geometry: {
                    x: 100,
                    y: 100,
                    width: 100,
                    height: 100
                }
            }
        });

        describe('set data', () => {
            it('should set copy mode data', () => {
                const data = [createTransferableData('g1')];
                
                clipboardManager.setData(data, 'copy', 'page-1');
                
                expect(clipboardManager.isEmpty()).toBe(false);
                expect(clipboardManager.getData().length).toBe(1);
                expect(clipboardManager.getClipboardMode()).toBe('copy');
                expect(clipboardManager.getSourcePageId()).toBe('page-1');
            });

            it('should set cut mode data', () => {
                const data = [createTransferableData('g1'), createTransferableData('g2')];
                
                clipboardManager.setData(data, 'cut', 'page-2');
                
                expect(clipboardManager.isEmpty()).toBe(false);
                expect(clipboardManager.getData().length).toBe(2);
                expect(clipboardManager.getClipboardMode()).toBe('cut');
                expect(clipboardManager.getSourcePageId()).toBe('page-2');
            });
        });

        describe('get data', () => {
            it('should return clipboard data', () => {
                const data = [createTransferableData('g1')];
                clipboardManager.setData(data, 'copy', 'page-1');
                
                const retrieved = clipboardManager.getData();
                expect(retrieved.length).toBe(1);
                expect(retrieved[0].id).toBe('g1');
            });

            it('should return a copy of the array', () => {
                const data = [createTransferableData('g1')];
                clipboardManager.setData(data, 'copy', 'page-1');
                
                const retrieved = clipboardManager.getData();
                retrieved.push(createTransferableData('g2'));
                
                const original = clipboardManager.getData();
                expect(original.length).toBe(1);
            });
        });

        describe('clear operation', () => {
            it('should clear clipboard data', () => {
                const data = [createTransferableData('g1')];
                clipboardManager.setData(data, 'copy', 'page-1');
                
                clipboardManager.clearData();
                
                expect(clipboardManager.isEmpty()).toBe(true);
                expect(clipboardManager.getSourcePageId()).toBeNull();
            });

            it('clearing empty clipboard should not throw', () => {
                expect(() => clipboardManager.clearData()).not.toThrow();
            });
        });

        describe('empty state', () => {
            it('new clipboard should be empty', () => {
                expect(clipboardManager.isEmpty()).toBe(true);
            });

            it('empty clipboard should return empty array', () => {
                expect(clipboardManager.getData()).toEqual([]);
            });
        });

        describe('item count', () => {
            it('should return item count in clipboard', () => {
                expect(clipboardManager.itemCount).toBe(0);
                
                clipboardManager.setData([createTransferableData('g1')], 'copy', 'page-1');
                expect(clipboardManager.itemCount).toBe(1);
                
                clipboardManager.setData([createTransferableData('g1'), createTransferableData('g2'), createTransferableData('g3')], 'copy', 'page-1');
                expect(clipboardManager.itemCount).toBe(3);
            });
        });
    });
});