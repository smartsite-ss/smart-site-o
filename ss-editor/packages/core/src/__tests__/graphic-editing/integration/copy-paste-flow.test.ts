// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { BasePage } from '../../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { ClipboardManager } from '../../../graphic-editing/managers/ClipboardManager';
import { GraphicFactory } from '../../../graphic-editing/graphic/factory/GraphicFactory';
import { InterpageTransferService } from '../../../services/InterpageTransferService';

class TestShape extends BaseGraphic {
  static defaultWidth = 100;
  static defaultHeight = 80;

  constructor(x: number = 0, y: number = 0, width: number = 200, height: number = 100) {
    super('test-shape', x, y, width, height);
  }

  draw(_ctx: CanvasRenderingContext2D): void {
  }
}

function createPage(): BasePage {
  const page = new BasePage();
  page.init({ id: 'page-1', name: 'Test Page', width: 1920, height: 1080 });
  return page;
}

describe('Copy-paste integration tests', () => {
  let page: BasePage;
  let clipboardManager: ClipboardManager;
  let transferService: InterpageTransferService;

  beforeAll(() => {
    if (!GraphicFactory.hasGraphic('test-shape')) {
      GraphicFactory.registerGraphic('test-shape', TestShape, 'Test Shape', 'test');
    }
  });

  afterAll(() => {
    GraphicFactory.unregisterGraphic('test-shape');
  });

  beforeEach(() => {
    page = createPage();
    clipboardManager = new ClipboardManager();
    transferService = new InterpageTransferService();
  });

  it('should support full copy-paste workflow', () => {
    const g1 = new TestShape(100, 100, 200, 100);
    g1.id = 'src-g';
    g1.config.name = 'Source Graphic';
    g1.config.style = { backgroundColor: '#FF0000', fontColor: '#FFFFFF' };
    page.addGraphic(g1 as any);

    const transferableData = transferService.serializeGraphics([g1 as any]);
    clipboardManager.setData(transferableData, 'copy', page.id);

    const pastedData = clipboardManager.getData();
    expect(pastedData.length).toBe(1);

    const newGraphics = transferService.deserializeGraphics(pastedData);
    expect(newGraphics.length).toBe(1);
    expect(newGraphics[0].id).not.toBe('src-g');
    expect(newGraphics[0].config.name).toBe('Source Graphic');
    expect(newGraphics[0].config.style.backgroundColor).toBe('#FF0000');
  });

  it('should support cross-page copy-paste', () => {
    const page2 = new BasePage();
    page2.init({ id: 'page-2' });
    const g1 = new TestShape(50, 50, 100, 80);
    g1.id = 'cross-g';
    page.addGraphic(g1 as any);

    clipboardManager.setData(
      transferService.serializeGraphics([g1 as any]),
      'copy',
      page.id
    );

    const data = clipboardManager.getData();
    const newGraphics = transferService.deserializeGraphics(data);
    page2.addGraphic(newGraphics[0] as any);

    expect(page.findGraphicById('cross-g')).not.toBeNull();
    expect(page2.graphics.length).toBe(1);
  });

  it('should support cut-paste workflow', () => {
    const g1 = new TestShape(100, 100, 100, 100);
    g1.id = 'cut-g';
    page.addGraphic(g1 as any);

    clipboardManager.setData(
      transferService.serializeGraphics([g1 as any]),
      'cut',
      page.id
    );
    page.removeGraphic('cut-g');

    expect(page.findGraphicById('cut-g')).toBeNull();

    const data = clipboardManager.getData();
    const newGraphics = transferService.deserializeGraphics(data);
    expect(newGraphics.length).toBe(1);
  });

  it('should return empty array from empty clipboard', () => {
    const data = clipboardManager.getData();
    expect(data).toEqual([]);
  });

  it('should track paste count', () => {
    const g1 = new TestShape(10, 10, 50, 50);
    g1.id = 'paste-cnt-g';
    clipboardManager.setData(
      transferService.serializeGraphics([g1 as any]),
      'copy',
      page.id
    );
    expect(clipboardManager.getPasteCount()).toBe(0);
    clipboardManager.incrementPasteCount();
    expect(clipboardManager.getPasteCount()).toBe(1);
  });

  describe('Group copy-paste', () => {
    function addTwoGraphics() {
      const g1 = new TestShape(100, 100, 200, 100);
      g1.id = 'group-g-0';
      const g2 = new TestShape(300, 100, 200, 100);
      g2.id = 'group-g-1';
      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);
      return { g1, g2 };
    }

    it('should save group metadata in clipboard when copying group members', () => {
      addTwoGraphics();
      const group = page.groupGraphics(['group-g-0', 'group-g-1']); expect(group).not.toBeNull(); /* 模拟选中组员?copy */ page.selectMultipleGraphics(['group-g-0', 'group-g-1']);
      const serializedData = transferService.serializeGraphics(
        page.graphics.filter((g) => page.selectedGraphicIds.includes(g.id))
      );
      clipboardManager.setData(serializedData, 'copy', page.id); /* 验证 groupMetadata 设置 */ clipboardManager.setGroupMetadata({ isGroupCopy: true, sourceGroupId: group.id, groupName: group.name, }); const metadata = clipboardManager.getGroupMetadata(); expect(metadata).not.toBeNull(); expect(metadata!.isGroupCopy).toBe(true); expect(metadata!.sourceGroupId).toBe(group.id); }); it('should paste group members and reconstruct group', () => {
      addTwoGraphics();
      page.groupGraphics(['group-g-0', 'group-g-1']);
      page.selectMultipleGraphics(['group-g-0', 'group-g-1']);

      // copy
      const selectedGraphics = page.graphics.filter((g) =>
        page.selectedGraphicIds.includes(g.id)
      );
      clipboardManager.setData(
        transferService.serializeGraphics(selectedGraphics),
        'copy',
        page.id
      );
      const groupManager = page.getGroupManager();
      const candidateGroup = groupManager.getGroupForGraphic('group-g-0'); clipboardManager.setGroupMetadata({ isGroupCopy: true, sourceGroupId: candidateGroup!.id, groupName: candidateGroup!.name, }); /* paste */ const data = clipboardManager.getData(); let newGraphics = transferService.deserializeGraphics(data); newGraphics = transferService.reassignIds( newGraphics, page.graphics.map((g) => g.id) ); newGraphics.forEach((graphic) => { transferService.transformCoordinates(graphic, 20, 20); page.addGraphic(graphic); }); const newIds = newGraphics.map((g) => g.id); /* 重建组合 */ const metadata = clipboardManager.getGroupMetadata(); if (metadata?.isGroupCopy && newIds.length > 1) { (page as any).updateGroupManagerReferences(); const newGroup = page.groupGraphics(newIds); expect(newGroup).not.toBeNull(); /* 验证新图元在组合 */ for (const newId of newIds) { expect(groupManager.isGraphicInGroup(newId)).toBe(true); } } }); it('should not group when pasting non-group clipboard data', () => { addTwoGraphics(); /* 直接 copy 不设 groupMetadata */ const serializedData = transferService.serializeGraphics( page.graphics.filter((g) => ['group-g-0', 'group-g-1'].includes(g.id))
      );
      clipboardManager.setData(serializedData, 'copy', page.id); const metadata = clipboardManager.getGroupMetadata(); expect(metadata).toBeNull(); /* paste should not call groupGraphics */ const data = clipboardManager.getData(); let newGraphics = transferService.deserializeGraphics(data); newGraphics = transferService.reassignIds( newGraphics, page.graphics.map((g) => g.id) ); newGraphics.forEach((graphic) => { transferService.transformCoordinates(graphic, 20, 20); page.addGraphic(graphic); }); /* Without groupMetadata, should not group */ const groupManager = page.getGroupManager(); for (const g of newGraphics) { expect(groupManager.isGraphicInGroup(g.id)).toBe(false); } }); it('should clear group metadata on new copy of non-group selection', () => {
      addTwoGraphics();
      page.groupGraphics(['group-g-0', 'group-g-1']);
      page.selectMultipleGraphics(['group-g-0', 'group-g-1']);

      clipboardManager.setGroupMetadata({
        isGroupCopy: true,
        sourceGroupId: 'some-id',
        groupName: 'Some Group', }); expect(clipboardManager.getGroupMetadata()).not.toBeNull(); /* 重新 copy 非组合选择 */ const g3 = new TestShape(500, 100, 100, 100); g3.id ='group-g-3';
      page.addGraphic(g3 as any);
      page.selectMultipleGraphics(['group-g-3']);
      clipboardManager.setData(
        transferService.serializeGraphics(
          page.graphics.filter((g) => page.selectedGraphicIds.includes(g.id))
        ),
        'copy',
        page.id
      );
      // setData 应该清空 groupMetadata
      expect(clipboardManager.getGroupMetadata()).toBeNull();
    });
  });
});