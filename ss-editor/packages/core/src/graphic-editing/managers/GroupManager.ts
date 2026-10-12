// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';
import { eventBus, Events } from '../../utils/event/eventBus';

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export interface GraphicGroup {
  id: string;
  name: string;
  expanded: boolean;
  locked: boolean;
  visible: boolean;
  children: string[];
  parentId: string | null;
  transform: Transform;
}

export interface GraphicGroupHierarchy extends Omit<GraphicGroup, 'children'> {
  children: (string | GraphicGroupHierarchy)[];
}

export class GroupManager {
    private groups: Map<string, GraphicGroup> = new Map();
    private graphicMap: Map<string, IGraphic>;

    constructor() {
        this.graphicMap = new Map();
    }
    
    updateReferences(_graphics: IGraphic[], graphicMap: Map<string, IGraphic>): void {
        this.graphicMap = graphicMap;
    }

    createGroup(graphicIds: string[], name?: string, parentId?: string): GraphicGroup | null {
        const validIds = graphicIds.filter(id => this.graphicMap.has(id));

        if (validIds.length === 0) {
            console.warn('[GroupManager.createGroup] no valid IDs in graphicMap!');
            return null;
        }

        validIds.forEach(id => {
            const oldGroup = this.getGroupForGraphic(id);
            if (oldGroup) {
                this.removeGraphicsFromGroup(oldGroup.id, [id]);
            }
        });

        const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const group: GraphicGroup = {
            id,
            name: name || `Group ${this.groups.size + 1}`,
            expanded: true,
            locked: false,
            visible: true,
            children: [...validIds],
            parentId: parentId || null,
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        };

        this.groups.set(id, group);
        
        if (parentId && this.groups.has(parentId)) {
            const parentGroup = this.groups.get(parentId)!;
            if (!parentGroup.children.includes(id)) {
                parentGroup.children.push(id);
            }
        }

        eventBus.emit(Events.GROUP_CREATED, { group });
        
        return group;
    }

    deleteGroup(groupId: string, keepGraphics: boolean = true): boolean {
        const group = this.groups.get(groupId);
        if (!group) {
            return false;
        }

        if (group.parentId && this.groups.has(group.parentId)) {
            const parentGroup = this.groups.get(group.parentId)!;
            parentGroup.children = parentGroup.children.filter(id => id !== groupId);
        }

        const childGroups = this.getChildGroups(groupId);
        childGroups.forEach(childId => {
            this.deleteGroup(childId, keepGraphics);
        });

        this.groups.delete(groupId);
        eventBus.emit(Events.GROUP_DELETED, { groupId, keepGraphics });
        
        return true;
    }

    addGraphicsToGroup(groupId: string, graphicIds: string[]): boolean {
        const group = this.groups.get(groupId);
        if (!group) {
            return false;
        }

        graphicIds.forEach(id => {
            if (!group.children.includes(id) && this.graphicMap.has(id)) {
                const oldGroup = this.getGroupForGraphic(id);
                if (oldGroup) {
                    this.removeGraphicsFromGroup(oldGroup.id, [id]);
                }
                group.children.push(id);
            }
        });

        eventBus.emit(Events.GROUP_UPDATED, { groupId });
        return true;
    }

    removeGraphicsFromGroup(groupId: string, graphicIds: string[]): boolean {
        const group = this.groups.get(groupId);
        if (!group) {
            return false;
        }

        graphicIds.forEach(id => {
            const index = group.children.indexOf(id);
            if (index !== -1) {
                group.children.splice(index, 1);
            }
        });

        if (group.children.length === 0) {
            this.deleteGroup(groupId, true);
        }

        eventBus.emit(Events.GROUP_UPDATED, { groupId });
        return true;
    }

    renameGroup(groupId: string, name: string): boolean {
        const group = this.groups.get(groupId);
        if (!group) {
            return false;
        }

        group.name = name;
        eventBus.emit(Events.GROUP_UPDATED, { groupId });
        return true;
    }

    toggleGroup(groupId: string): void {
        const group = this.groups.get(groupId);
        if (group) {
            group.expanded = !group.expanded;
            eventBus.emit(Events.GROUP_UPDATED, { groupId });
        }
    }

    setGroupLocked(groupId: string, locked: boolean): void {
        const group = this.groups.get(groupId);
        if (group) {
            group.locked = locked;
            
            if (locked) {
                group.children.forEach(childId => {
                    if (this.graphicMap.has(childId)) {
                        const graphic = this.graphicMap.get(childId)!;
                        graphic.setLocked(true);
                    }
                });
            } else {
                group.children.forEach(childId => {
                    if (this.graphicMap.has(childId)) {
                        const graphic = this.graphicMap.get(childId)!;
                        graphic.setLocked(false);
                    }
                });
            }

            const childGroups = this.getChildGroups(groupId);
            childGroups.forEach(childId => {
                this.setGroupLocked(childId, locked);
            });

            eventBus.emit(Events.GROUP_UPDATED, { groupId });
        }
    }

    setGroupVisible(groupId: string, visible: boolean): void {
        const group = this.groups.get(groupId);
        if (group) {
            group.visible = visible;

            group.children.forEach(childId => {
                if (this.graphicMap.has(childId)) {
                    const graphic = this.graphicMap.get(childId)!;
                    // 使用 IGraphic 接口的方法替代直接操作
                    graphic.setVisible(visible);
                }
            });

            const childGroups = this.getChildGroups(groupId);
            childGroups.forEach(childId => {
                this.setGroupVisible(childId, visible);
            });

            eventBus.emit(Events.GROUP_UPDATED, { groupId });
        }
    }

    transformGroup(groupId: string, transform: Partial<Transform>): void {
        const group = this.groups.get(groupId);
        if (!group) {
            return;
        }

        Object.assign(group.transform, transform);

        const childGroups = this.getChildGroups(groupId);
        childGroups.forEach(childId => {
            this.transformGroup(childId, transform);
        });

        eventBus.emit(Events.GROUP_TRANSFORMED, { groupId, transform });
    }

    getGroup(groupId: string): GraphicGroup | undefined {
        return this.groups.get(groupId);
    }

    getAllGroups(): GraphicGroup[] {
        return Array.from(this.groups.values());
    }

    getGroupsByParent(parentId: string | null): GraphicGroup[] {
        return Array.from(this.groups.values()).filter(g => g.parentId === parentId);
    }

    getGroupForGraphic(graphicId: string): GraphicGroup | undefined {
        return Array.from(this.groups.values()).find(g => g.children.includes(graphicId));
    }

    getChildGroups(parentId: string): string[] {
        return Array.from(this.groups.values())
            .filter(g => g.parentId === parentId)
            .map(g => g.id);
    }

    isGraphicInGroup(graphicId: string): boolean {
        return Array.from(this.groups.values()).some(g => g.children.includes(graphicId));
    }

    isGroup(id: string): boolean {
        return this.groups.has(id);
    }

    getGroupChildrenRecursive(groupId: string): string[] {
        const group = this.groups.get(groupId);
        if (!group) {
            return [];
        }

        let children: string[] = [...(group.children || [])];
        const childGroups = this.getChildGroups(groupId);
        
        childGroups.forEach(childId => {
            children = [...children, ...this.getGroupChildrenRecursive(childId)];
        });

        return children;
    }

    getGroupHierarchy(): GraphicGroupHierarchy[] {
        const rootGroups = this.getGroupsByParent(null);
        return this.buildHierarchy(rootGroups);
    }

    private buildHierarchy(groups: GraphicGroup[]): GraphicGroupHierarchy[] {
        return groups.map(group => ({
            ...group,
            children: [
                ...group.children.filter(id => !this.groups.has(id)),
                ...this.buildHierarchy(this.getGroupsByParent(group.id))
            ]
        }));
    }

    clear(): void {
        this.groups.clear();
    }

    toJSON(): GraphicGroup[] {
        return Array.from(this.groups.values());
    }

    fromJSON(data: GraphicGroup[]): void {
        this.groups.clear();
        data.forEach(group => {
            this.groups.set(group.id, group);
        });
    }
    
    // 兼容旧接口的方法
    getGroupMembers(groupId: string): IGraphic[] {
        const group = this.groups.get(groupId);
        if (!group) return [];
        
        const members: IGraphic[] = [];
        const children = group.children || [];
        
        children.forEach(childId => {
            if (this.graphicMap.has(childId)) {
                members.push(this.graphicMap.get(childId)!);
            } else if (this.groups.has(childId)) {
                // 如果是子分组，递归获取所有子成员
                members.push(...this.getGroupMembers(childId));
            }
        });
        
        return members;
    }
    
    ungroup(groupId: string): IGraphic[] {
        const group = this.groups.get(groupId);
        if (!group) return [];
        
        // 获取所有成员图元
        const members = this.getGroupMembers(groupId);
        
        // 删除分组（保留图元）
        this.deleteGroup(groupId, true);
        
        return members;
    }
    
    // 旧版本兼容性方法（单个图元从分组中移除）
    removeFromGroup(graphicId: string): void {
        const group = this.getGroupForGraphic(graphicId);
        if (group) {
            this.removeGraphicsFromGroup(group.id, [graphicId]);
        }
    }
    
    // 旧版本兼容性方法（单个图元添加到分组）
    addToGroup(graphicId: string, groupId: string): void {
        this.addGraphicsToGroup(groupId, [graphicId]);
    }
    
    // 旧版本兼容性方法（更新分组边界）
  updateGroupBounds(_groupId: string): void {
    // 实体分组系统不需要手动更新边界
    // 这个方法保留仅用于向后兼容
  }

  getGroupBounds(groupId: string): { x: number; y: number; width: number; height: number } {
    const group = this.groups.get(groupId);
    if (!group) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const members = this.getGroupMembers(groupId);
    if (members.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    members.forEach(graphic => {
      const { x, y } = graphic.getPosition();
      const { width, height } = graphic.getSize();
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  moveGroup(groupId: string, dx: number, dy: number): void {
    const group = this.groups.get(groupId);
    if (!group) {
      return;
    }
    const members = this.getGroupMembers(groupId);
    members.forEach(graphic => {
      const { x, y } = graphic.getPosition();
      graphic.setPosition(x + dx, y + dy);
    });
  }

  scaleGroup(groupId: string, scaleX: number, scaleY: number, centerX?: number, centerY?: number): void {
    const members = this.getGroupMembers(groupId);

    if (centerX === undefined || centerY === undefined) {
      const bounds = this.getGroupBounds(groupId);
      centerX = bounds.x + bounds.width / 2;
      centerY = bounds.y + bounds.height / 2;
    }

    members.forEach(graphic => {
      const { x, y } = graphic.getPosition();
      const { width, height } = graphic.getSize();

      const newX = centerX! + (x - centerX!) * scaleX;
      const newY = centerY! + (y - centerY!) * scaleY;
      graphic.setPosition(newX, newY);
      graphic.setSize(width * scaleX, height * scaleY);
    });
  }

  rotateGroup(groupId: string, angle: number, centerX?: number, centerY?: number): void {
    const members = this.getGroupMembers(groupId);

    if (centerX === undefined || centerY === undefined) {
      const bounds = this.getGroupBounds(groupId);
      centerX = bounds.x + bounds.width / 2;
      centerY = bounds.y + bounds.height / 2;
    }

    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    members.forEach(graphic => {
      const { x, y } = graphic.getPosition();

      const dx = x - centerX!;
      const dy = y - centerY!;
      const newX = centerX! + dx * cos - dy * sin;
      const newY = centerY! + dx * sin + dy * cos;
      graphic.setPosition(newX, newY);

      const currentAngle = (graphic.config.geometry.rotation || 0) + angle;
      graphic.config.geometry.rotation = currentAngle;
    });
  }
}