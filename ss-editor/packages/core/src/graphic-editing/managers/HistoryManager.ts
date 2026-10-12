// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';
import { i18n } from '../../locales';
import { IPage } from '../graphic/base/IPage';
import { eventBus, Events } from '../../utils/event/eventBus';

export interface HistorySnapshot {
    type: 'add' | 'remove' | 'update' | 'transform';
    timestamp: number;
    data: any;
}

export interface IChange {
    type: 'add' | 'remove' | 'update' | 'transform' | 'batch';
    timestamp: number;
    redo(): void;
    undo(): void;
    getDescription(): string;
    getChangeCount?(): number;
}

export class AddGraphicChange implements IChange {
    type = 'add' as const;
    timestamp: number;
    private page: IPage;
    private graphic: IGraphic;

    constructor(page: IPage, graphic: IGraphic) {
        this.page = page;
        this.graphic = graphic;
        this.timestamp = Date.now();
    }

    undo(): void {
        this.page.removeGraphic(this.graphic.id, false);
    }

    redo(): void {
        this.page.addGraphic(this.graphic, true, false);
    }

    getDescription(): string {
        return i18n.global.t('history.addGraphic');
    }
}

export class RemoveGraphicChange implements IChange {
    type = 'remove' as const;
    timestamp: number;
    private page: IPage;
    private graphic: IGraphic;

    constructor(page: IPage, graphic: IGraphic) {
        this.page = page;
        this.graphic = graphic;
        this.timestamp = Date.now();
    }

    undo(): void {
        this.page.addGraphic(this.graphic, true, false);
    }

    redo(): void {
        this.page.removeGraphic(this.graphic.id, false);
    }

    getDescription(): string {
        return i18n.global.t('history.removeGraphic');
    }
}

export class UpdateGraphicChange implements IChange {
    type = 'update' as const;
    timestamp: number;
    private page: IPage;
    private graphicId: string;
    private oldProperties: any;
    private newProperties: any;

    constructor(page: IPage, graphicId: string, oldProperties: any, newProperties: any) {
        this.page = page;
        this.graphicId = graphicId;
        this.oldProperties = oldProperties;
        this.newProperties = newProperties;
        this.timestamp = Date.now();
    }

    /**
     * 还原属性：对 geometry 使用 setPosition/setSize/setRotation 就地修改，
     * 避免 _updateGeometry 替换 config.geometry 对象导致 Vue/Canvas 引用断裂。
     */
    undo(): void {
        const graphic = this.page.findGraphicById(this.graphicId);
        if (!graphic) return;
        this._applyProperties(graphic, this.oldProperties, this.newProperties);
    }

    redo(): void {
        const graphic = this.page.findGraphicById(this.graphicId);
        if (!graphic) return;
        this._applyProperties(graphic, this.newProperties, this.oldProperties);
    }

    /**
     * 将 source 中的属性应用到 graphic。
     * geometry 从 delta 中提取变更字段，通过 setPosition/setSize/setRotation 应用
     * 其余属性（style/visible/locked/zIndex）通过 graphic.update() 应用
     */
    private _applyProperties(graphic: IGraphic, source: any, delta: any): void {
        const deltaGeom = delta?.geometry || delta?.config?.geometry;

        if (deltaGeom) {
            this._applyGeometry(graphic, source, deltaGeom);
        } else {
            graphic.update(source);
        }
    }

    /**
     * 应用几何属性：仅设置 delta 中出现的字段，
     * 通过 setPosition/setSize/setRotation 就地修改，不替换 config.geometry 对象
     */
    private _applyGeometry(graphic: IGraphic, source: any, deltaGeom: any): void {
        const srcGeom = source?.geometry || source?.config?.geometry || {};

        if (deltaGeom.x !== undefined || deltaGeom.y !== undefined) {
            graphic.setPosition(srcGeom.x ?? 0, srcGeom.y ?? 0);
        }
        if (deltaGeom.width !== undefined || deltaGeom.height !== undefined) {
            graphic.setSize(srcGeom.width ?? 0, srcGeom.height ?? 0);
        }
        if (deltaGeom.rotation !== undefined) {
            graphic.setRotation(srcGeom.rotation ?? 0);
        }

        // 其余属性（style/visible/locked/zIndex）通过 update 应用，剔除 geometry 避免重复替换
        const sourceClone = { ...source };
        delete sourceClone.geometry;
        if (source.config) {
            const configClone = { ...source.config };
            delete configClone.geometry;
            sourceClone.config = configClone;
        }
        if (Object.keys(sourceClone).length > 0 && sourceClone.config && Object.keys(sourceClone.config).length === 0) {
            delete sourceClone.config;
        }
        if (Object.keys(sourceClone).length > 0) {
            graphic.update(sourceClone);
        }
    }

    getDescription(): string {
        return i18n.global.t('history.updateGraphic');
    }
}

export class TransformGraphicChange implements IChange {
    type = 'transform' as const;
    timestamp: number;
    private page: IPage;
    private graphicId: string;
    private oldTransform: { x: number; y: number; width: number; height: number; rotation: number };
    private newTransform: { x: number; y: number; width: number; height: number; rotation: number };

    constructor(
        page: IPage,
        graphicId: string,
        oldTransform: { x: number; y: number; width: number; height: number; rotation: number },
        newTransform: { x: number; y: number; width: number; height: number; rotation: number }
    ) {
        this.page = page;
        this.graphicId = graphicId;
        this.oldTransform = oldTransform;
        this.newTransform = newTransform;
        this.timestamp = Date.now();
    }

    undo(): void {
        const graphic = this.page.findGraphicById(this.graphicId);
        if (graphic) {
            const t = this.oldTransform;
            const prev = this.newTransform;
            graphic.setPosition(t.x, t.y);
            graphic.setSize(t.width, t.height);
            graphic.setRotation(t.rotation);

            graphic.onPropertyChanged?.({ geometry: { ...t } });

            if (t.x !== prev.x || t.y !== prev.y) {
                eventBus.emit(Events.GRAPHIC_MOVED, {
                    graphicId: this.graphicId,
                    newPosition: { x: t.x, y: t.y },
                    pageId: this.page.id,
                    graphic,
                });
            }
            if (t.width !== prev.width || t.height !== prev.height) {
                eventBus.emit(Events.GRAPHIC_RESIZED, {
                    graphicId: this.graphicId,
                    newSize: { width: t.width, height: t.height },
                    pageId: this.page.id,
                    graphic,
                });
            }
        }
    }

    redo(): void {
        const graphic = this.page.findGraphicById(this.graphicId);
        if (graphic) {
            const t = this.newTransform;
            const prev = this.oldTransform;
            graphic.setPosition(t.x, t.y);
            graphic.setSize(t.width, t.height);
            graphic.setRotation(t.rotation);

            graphic.onPropertyChanged?.({ geometry: { ...t } });

            if (t.x !== prev.x || t.y !== prev.y) {
                eventBus.emit(Events.GRAPHIC_MOVED, {
                    graphicId: this.graphicId,
                    newPosition: { x: t.x, y: t.y },
                    pageId: this.page.id,
                    graphic,
                });
            }
            if (t.width !== prev.width || t.height !== prev.height) {
                eventBus.emit(Events.GRAPHIC_RESIZED, {
                    graphicId: this.graphicId,
                    newSize: { width: t.width, height: t.height },
                    pageId: this.page.id,
                    graphic,
                });
            }
        }
    }

    getDescription(): string {
        return i18n.global.t('history.transformGraphic');
    }
}

export class UpdatePageChange implements IChange {
    type = 'update' as const;
    timestamp: number;
    private page: IPage;
    private oldProperties: any;
    private newProperties: any;

    constructor(page: IPage, oldProperties: any, newProperties: any) {
        this.page = page;
        this.oldProperties = oldProperties;
        this.newProperties = newProperties;
        this.timestamp = Date.now();
    }

    undo(): void {
        Object.assign(this.page, this.oldProperties);
    }

    redo(): void {
        Object.assign(this.page, this.newProperties);
    }

    getDescription(): string {
        return i18n.global.t('history.updatePage');
    }
}

export class GroupGraphicChange implements IChange {
    type = 'update' as const;
    timestamp: number;
    private page: IPage;
    private groupId: string;
    private memberIds: string[];
    private isGrouping: boolean;

    constructor(page: IPage, groupId: string, memberIds: string[], isGrouping: boolean) {
        this.page = page;
        this.groupId = groupId;
        this.memberIds = memberIds;
        this.isGrouping = isGrouping;
        this.timestamp = Date.now();
    }

    undo(): void {
        if (this.isGrouping) {
            this.page.ungroup(this.groupId);
        } else {
            const group = this.page.createGroup(this.memberIds);
            if (group) this.groupId = group.id;
        }
    }

    redo(): void {
        if (this.isGrouping) {
            const group = this.page.createGroup(this.memberIds);
            if (group) this.groupId = group.id;
        } else {
            this.page.ungroup(this.groupId);
        }
    }

    getDescription(): string {
        return this.isGrouping ? i18n.global.t('history.groupGraphic') : i18n.global.t('history.ungroupGraphic');
    }
}

export class ReorderGraphicChange implements IChange {
    type = 'update' as const;
    timestamp: number;
    private page: IPage;
    private graphicId: string;
    private oldIndex: number;
    private newIndex: number;

    constructor(page: IPage, graphicId: string, oldIndex: number, newIndex: number) {
        this.page = page;
        this.graphicId = graphicId;
        this.oldIndex = oldIndex;
        this.newIndex = newIndex;
        this.timestamp = Date.now();
    }

    undo(): void {
        this.page.reorderGraphic(this.graphicId, this.oldIndex);
    }

    redo(): void {
        this.page.reorderGraphic(this.graphicId, this.newIndex);
    }

    getDescription(): string {
        return i18n.global.t('history.reorderGraphic');
    }
}

export class DuplicateGraphicChange implements IChange {
    type = 'add' as const;
    timestamp: number;
    private page: IPage;
    private newGraphic: IGraphic;
    private newId: string;

    constructor(page: IPage, _originalGraphic: IGraphic, newGraphic: IGraphic) {
        this.page = page;
        this.newGraphic = newGraphic;
        this.newId = newGraphic.id;
        this.timestamp = Date.now();
    }

    undo(): void {
        this.page.removeGraphic(this.newId, false);
    }

    redo(): void {
        this.page.addGraphic(this.newGraphic, true, false);
    }

    getDescription(): string {
        return i18n.global.t('history.duplicateGraphic');
    }
}

export class CompositeChange implements IChange {
    type = 'batch' as const;
    timestamp: number;
    private changes: IChange[] = [];
    private description: string;

    constructor(description: string = i18n.global.t('history.batchOperation')) {
        this.description = description;
        this.timestamp = Date.now();
    }

    addChange(change: IChange): void {
        this.changes.push(change);
    }

    undo(): void {
        for (let i = this.changes.length - 1; i >= 0; i--) {
            this.changes[i].undo();
        }
    }

    redo(): void {
        for (const change of this.changes) {
            change.redo();
        }
    }

    getDescription(): string {
        return this.description;
    }

    getChangeCount(): number {
        return this.changes.length;
    }

    isEmpty(): boolean {
        return this.changes.length === 0;
    }
}

export class HistoryManager {
    private changes: IChange[] = [];
    private currentIndex: number = -1;
    private maxHistoryLength: number = 50;
    private batchStack: CompositeChange[] = [];

    constructor(maxLength: number = 50) {
        this.maxHistoryLength = maxLength;
    }

    get currentBatch(): CompositeChange | null {
        return this.batchStack.length > 0 ? this.batchStack[this.batchStack.length - 1] : null;
    }

    startBatch(description: string = i18n.global.t('history.batchOperation')): void {
        this.batchStack.push(new CompositeChange(description));
    }

    endBatch(): void {
        const finished = this.batchStack.pop();
        if (!finished || finished.isEmpty()) return;

        const parent = this.batchStack.length > 0 ? this.batchStack[this.batchStack.length - 1] : null;
        if (parent) {
            parent.addChange(finished);
        } else {
            this.addBatchToHistory(finished);
        }
    }

    withBatch<T>(description: string, fn: () => T): T {
        this.startBatch(description);
        try {
            return fn();
        } finally {
            this.endBatch();
        }
    }

    private addBatchToHistory(batch: CompositeChange): void {
        if (this.currentIndex < this.changes.length - 1) {
            this.changes = this.changes.slice(0, this.currentIndex + 1);
        }
        this.changes.push(batch);
        this.currentIndex++;

        if (this.changes.length > this.maxHistoryLength) {
            this.changes.shift();
            this.currentIndex--;
        }
    }

    isInBatch(): boolean {
        return this.batchStack.length > 0;
    }

    saveChange(change: IChange): void {
        const batch = this.currentBatch;
        if (batch) {
            batch.addChange(change);
            return;
        }

        if (this.currentIndex < this.changes.length - 1) {
            this.changes = this.changes.slice(0, this.currentIndex + 1);
        }
        
        this.changes.push(change);
        this.currentIndex++;
        
        if (this.changes.length > this.maxHistoryLength) {
            this.changes.shift();
            this.currentIndex--;
        }
    }

    undo(): IChange | null {
        if (this.canUndo()) {
            const change = this.changes[this.currentIndex];
            change.undo();
            this.currentIndex--;
            return change;
        }
        return null;
    }

    redo(): IChange | null {
        if (this.canRedo()) {
            this.currentIndex++;
            const change = this.changes[this.currentIndex];
            change.redo();
            return change;
        }
        return null;
    }

    canUndo(): boolean {
        return this.currentIndex >= 0;
    }

    canRedo(): boolean {
        return this.currentIndex < this.changes.length - 1;
    }

    clearHistory(): void {
        this.changes = [];
        this.currentIndex = -1;
        this.batchStack = [];
    }

    getCurrentIndex(): number {
        return this.currentIndex;
    }

    /**
     * 跳转到指定历史位置。
     * 如果 target < currentIndex：撤销多余步骤；
     * 如果 target > currentIndex：重做多余步骤。
     * @param targetIndex 目标索引（-1 表示无历史），取值 [-1, changes.length - 1]
     */
    jumpTo(targetIndex: number): void {
        const clamped = Math.max(-1, Math.min(targetIndex, this.changes.length - 1));
        if (clamped === this.currentIndex) return;

        if (clamped < this.currentIndex) {
            // 需要撤销 currentIndex 到 clamped+1 之间的步骤
            while (this.currentIndex > clamped) {
                this.changes[this.currentIndex].undo();
                this.currentIndex--;
            }
        } else {
            // 需要重做 currentIndex+1 到 clamped 之间的步骤
            while (this.currentIndex < clamped) {
                this.currentIndex++;
                this.changes[this.currentIndex].redo();
            }
        }
    }

    getHistoryLength(): number {
        return this.changes.length;
    }

    getHistoryChanges(): IChange[] {
        return [...this.changes];
    }

    getUndoDescription(): string | null {
        if (this.canUndo()) {
            return this.changes[this.currentIndex].getDescription();
        }
        return null;
    }

    getRedoDescription(): string | null {
        if (this.canRedo()) {
            return this.changes[this.currentIndex + 1].getDescription();
        }
        return null;
    }

    setMaxHistoryLength(length: number): void {
        this.maxHistoryLength = length;
        if (this.changes.length > this.maxHistoryLength) {
            const removeCount = this.changes.length - this.maxHistoryLength;
            this.changes = this.changes.slice(removeCount);
            this.currentIndex -= removeCount;
            if (this.currentIndex < -1) {
                this.currentIndex = -1;
            }
        }
    }

    getStats(): {
        totalChanges: number;
        undoableChanges: number;
        redoableChanges: number;
        maxLength: number;
    } {
        return {
            totalChanges: this.changes.length,
            undoableChanges: this.currentIndex + 1,
            redoableChanges: this.changes.length - this.currentIndex - 1,
            maxLength: this.maxHistoryLength,
        };
    }
}