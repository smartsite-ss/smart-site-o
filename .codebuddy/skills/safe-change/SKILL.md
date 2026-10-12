---
name: safe-change
description: SCADA编辑器变更安全守卫。当用户修改ss-editor核心代码（图元操作、选择系统、组合、剪贴板、撤销重做、Manager等）时自动触发，执行变更安全检查、生成回归测试用例、审查选择状态同步/事件触发/历史记录完整性。
---

# SCADA 编辑器变更安全守卫

## 触发条件

当用户修改以下类型代码时自动激活：
- 修改 `BasePage.ts`、`BaseGraphic.ts`、`GraphicFactory.ts`
- 修改 `SelectionManager`、`GroupManager`、`HistoryManager`、`ClipboardManager`、`AlignmentManager`、`LayerManager`
- 修改 `graphic.store.ts`、`useGraphic.ts`、`useCanvasInteraction.ts`、`useSelection.ts`
- 修改任何 `*Manager.ts` 文件
- 修改任何涉及图元操作（增删改、复制粘贴、组合取消组合、对齐分布、撤销重做）的代码
- 用户明确提出"变更安全"、"回归测试"、"防改错"等意图

## 第一步：变更影响分析

读取被修改的文件，分析变更的影响范围：

### 1.1 识别受影响的 Manager

检查变更涉及哪些 Manager，标记依赖链：

```
Manager 依赖关系：
SelectionManager ←── GroupManager（组内图元选中状态）
HistoryManager   ←── 所有 Manager（操作记录）
ClipboardManager ←── SelectionManager（复制/剪切选中项）
LayerManager     ←── GroupManager（组合层级）
AlignmentManager ←── SelectionManager（对齐选中项）
```

### 1.2 检查六大安全规则

逐条检查变更是否违反规则，输出检查结果：

| 规则 | 检查要点 |
|------|---------|
| 规则1：变更必须配测试 | 变更是否附带测试？Bug修复是否有复现测试？ |
| 规则2：选择状态同步 | 是否改变选中状态？是否先 clear 再 select？是否触发 SELECTION_CHANGED？ |
| 规则3：集合遍历安全 | 是否在遍历中修改集合？是否先拷贝再操作？ |
| 规则4：撤销/重做完整性 | 复合操作是否使用 CompositeChange？Change 对象是否完整？ |
| 规则5：事件触发规则 | 状态变更后是否触发对应事件？循环内是否重复触发？ |
| 规则6：Manager 间引用一致性 | 跨 Manager 操作时所有引用是否同步更新？ |

### 1.3 高风险文件审查

如果变更涉及红名单文件，标记审查等级：

| 文件 | 风险等级 | 审查要求 |
|------|:--------:|---------|
| `BasePage.ts` | 🔴 | 2人审查 + 全量E2E |
| `graphic.store.ts` | 🔴 | 2人审查 + 全量E2E |
| `SelectionManager.ts` | 🔴 | 2人审查 + 选择相关全量测试 |
| `GroupManager.ts` | 🔴 | 2人审查 + 组合相关全量测试 |
| `HistoryManager.ts` | 🟡 | 1人审查 + 历史相关全量测试 |
| `ClipboardManager.ts` | 🟡 | 1人审查 + 剪贴板流程测试 |
| `useGraphic.ts` | 🔴 | 2人审查 + 全量E2E |
| `useCanvasInteraction.ts` | 🟡 | 1人审查 + 交互流程测试 |

## 第二步：输出安全检查报告

以表格形式输出检查结果：

```markdown
## 变更安全检查报告

### 影响分析
- 涉及的 Manager：___
- 选择状态变更：是/否 → 是否正确同步：是/否
- 事件触发：是/否 → 事件名：___ → 触发时机是否正确：是/否
- 撤销/重做：是/否 → Change 类型：___ → 是否完整：是/否
- 集合遍历：是/否 → 是否安全：是/否

### 规则检查
| 规则 | 通过 | 说明 |
|------|:----:|------|
| 规则1：变更必须配测试 | ✅/❌ | ___ |
| 规则2：选择状态同步 | ✅/❌ | ___ |
| 规则3：集合遍历安全 | ✅/❌ | ___ |
| 规则4：撤销/重做完整性 | ✅/❌ | ___ |
| 规则5：事件触发规则 | ✅/❌ | ___ |
| 规则6：Manager间引用一致性 | ✅/❌ | ___ |

### 风险等级：🔴 高 / 🟡 中 / 🟢 低
```

## 第三步：生成回归测试用例

根据变更类型，自动生成对应的回归测试用例。使用以下模板：

### 3.1 选择状态回归测试（最高频 Bug）

任何改变选中图元的操作，必须生成以下测试：

```typescript
describe('变更后选择状态回归测试', () => {
  // 核心断言辅助
  function expectSelected(expectedIds: string[]) {
    const selectedIds = page.selectedGraphicIds;
    expect(selectedIds).toHaveLength(expectedIds.length);
    expect(selectedIds.sort()).toEqual(expectedIds.sort());
  }

  function expectNotSelected(ids: string[]) {
    ids.forEach(id => {
      expect(page.selectedGraphicIds).not.toContain(id);
    });
  }

  it('操作后选中状态正确', () => { /* 具体断言 */ });
  it('操作后原选中状态正确清除', () => { /* 具体断言 */ });
  it('操作后SELECTION_CHANGED事件触发', () => { /* 具体断言 */ });
});
```

### 3.2 撤销/重做回归测试

任何可撤销操作，必须生成以下测试：

```typescript
describe('变更后撤销/重做回归测试', () => {
  function captureState() {
    return {
      graphicCount: page.graphics.length,
      selectedIds: [...page.selectedGraphicIds],
      graphicPositions: page.graphics.map(g => ({ id: g.id, ...g.getPosition() }))
    };
  }

  it('撤销后状态恢复正确', () => { /* 具体断言 */ });
  it('重做后状态恢复正确', () => { /* 具体断言 */ });
  it('复合操作原子撤销', () => { /* 批量操作一次撤销全部恢复 */ });
});
```

### 3.3 跨 Manager 联动测试

涉及多个 Manager 的变更，必须生成联动测试：

```typescript
describe('跨Manager联动回归测试', () => {
  it('A→B→C 操作链完整性', () => { /* 组合→移动→取消组合 */ });
  it('联动操作撤销后状态一致', () => { /* 撤销中间步骤 */ });
  it('联动操作边界条件', () => { /* 空选择、单图元等 */ });
});
```

### 3.4 边界条件测试

```typescript
describe('边界条件回归测试', () => {
  it('空画布操作不崩溃', () => { /* 空状态执行所有操作 */ });
  it('单图元操作正常', () => { /* 最少图元数 */ });
  it('大量图元操作不超时', () => { /* 1000个图元 */ });
  it('嵌套操作正常', () => { /* 5层嵌套组合 */ });
  it('快速连续操作不崩溃', () => { /* 100次撤销/重做 */ });
});
```

## 第四步：变更前自查清单

输出变更前必须确认的清单，要求用户逐项确认：

### 影响分析
- [ ] 此变更影响哪些 Manager？
- [ ] 此变更是否改变选中状态？如果是，是否调用了 clear() + select()？
- [ ] 此变更是否需要触发事件？触发哪个事件？触发时机对吗？
- [ ] 此变更是否需要撤销/重做支持？Change 对象完整吗？
- [ ] 此变更是否涉及集合遍历？是否在遍历中修改了集合？

### 测试覆盖
- [ ] 已有测试是否全部通过？
- [ ] 新增的测试是否覆盖了变更点？
- [ ] 边界条件测试（空选择、单图元、大量图元）是否覆盖？
- [ ] 撤销/重做测试是否覆盖？

### 回归检查
- [ ] 关联功能是否受影响？
- [ ] E2E 流程是否正常？
- [ ] 性能是否受影响？

## 操作-选中状态对照表（快速参考）

| 操作 | 操作后选中状态 | 需clear | 需触发事件 |
|------|--------------|:------:|:--------:|
| 添加图元 | 保持当前选中 | 否 | 否 |
| 删除图元 | 清空选中 | 是 | 是 |
| 复制（Duplicate） | 仅选中新图元 | 是 | 是 |
| 粘贴（Paste） | 仅选中新图元 | 是 | 是 |
| 组合（Group） | 选中组合 | 是 | 是 |
| 取消组合（Ungroup） | 选中原成员 | 是 | 是 |
| 框选（Box Select） | 选中框内图元 | 是 | 是 |
| 单击图元 | 仅选中该图元 | 是 | 是 |
| Shift+点击 | 切换该图元选中 | 否 | 是 |
| 点击空白 | 清空选中 | 是 | 是 |

## 安全代码模板

### 安全的选择状态变更

```typescript
function safeSelectionChange(action: () => IGraphic | IGraphic[] | null) {
  const selectionManager = currentPage.getSelectionManager();
  // 1. 执行业务操作
  const result = action();
  // 2. 同步选择状态（先 clear 再 select）
  selectionManager.clear();
  if (result) {
    const ids = Array.isArray(result) ? result.map(g => g.id) : [result.id];
    ids.forEach(id => selectionManager.select(id));
  }
  // 3. 广播事件
  eventBus.emit(Events.SELECTION_CHANGED, {
    pageId: currentPage.id,
    selectedIds: selectionManager.getSelectedIds()
  });
  return result;
}
```

### 安全的集合遍历

```typescript
// ✅ 先拷贝再操作
const idsToRemove = [...currentPage.selectedGraphicIds];
idsToRemove.forEach(id => currentPage.removeGraphic(id));

// ✅ 事务模式
currentPage.batchOperation(() => {
  const ids = [...currentPage.selectedGraphicIds];
  ids.forEach(id => currentPage.removeGraphic(id));
});
```

### 安全的复合操作（撤销/重做）

```typescript
const changes: IChange[] = [];
const idsToRemove = [...currentPage.selectedGraphicIds];
idsToRemove.forEach(id => {
  const graphic = currentPage.findGraphicById(id);
  if (graphic) {
    changes.push(new RemoveGraphicChange(currentPage, graphic.toJSON()));
  }
});
const compositeChange = new CompositeChange(changes);
currentPage.getHistoryManager().saveChange(compositeChange);
idsToRemove.forEach(id => currentPage.removeGraphic(id));
```

### 安全的事件触发

```typescript
// ✅ 批量操作完成后触发一次
graphics.forEach(g => currentPage.addGraphic(g));
eventBus.emit(Events.GRAPHIC_ADDED, {
  pageId: currentPage.id,
  graphicIds: graphics.map(g => g.id)
});
```

## 测试辅助工具

```typescript
// packages/core/src/__tests__/helpers/test-utils.ts
export function createTestPage(options?: { id?: string }) {
  return new BasePage({
    id: options?.id ?? `test-page-${Date.now()}`,
    width: 1920, height: 1080,
  });
}

export function createTestGraphic(options: {
  id: string; x?: number; y?: number;
  width?: number; height?: number; rotation?: number;
}) {
  return new BaseGraphic({
    type: 'test-shape', id: options.id,
    x: options.x ?? 0, y: options.y ?? 0,
    width: options.width ?? 100, height: options.height ?? 100,
    rotation: options.rotation ?? 0,
  });
}

export function createTestGraphics(count: number, prefix = 'g') {
  return Array.from({ length: count }, (_, i) =>
    createTestGraphic({ id: `${prefix}${i}`, x: i * 110, y: 0 })
  );
}

export function expectPosition(graphic: IGraphic, expected: { x: number; y: number }) {
  const pos = graphic.getPosition();
  expect(pos.x).toBeCloseTo(expected.x, 1);
  expect(pos.y).toBeCloseTo(expected.y, 1);
}

export function expectSelectedIds(page: BasePage, expectedIds: string[]) {
  expect(page.selectedGraphicIds.sort()).toEqual(expectedIds.sort());
}
```

## 十大 E2E 核心回归路径

任何核心变更后，必须验证以下 10 条路径：

1. 创建图元→修改属性→撤销→重做
2. 选择→组合→移动→取消组合→独立移动
3. 复制→粘贴→删除粘贴的→撤销恢复
4. 剪切→粘贴→撤销剪切恢复原位
5. 多选→对齐→撤销→位置恢复
6. 组合→复制组合→移动副本不影响原组合
7. 组编辑→修改组内图元→退出→撤销
8. 批量删除10个图元→一次撤销全部恢复
9. 缩放后操作图元坐标正确
10. 创建→组合→复制→对齐→删除→撤销→重做

## Bug 根因快速索引

| Bug 现象 | 最可能原因 | 检查位置 |
|----------|-----------|---------|
| 操作后选中状态不对 | 缺少 clear() 或 select() | SelectionManager 调用处 |
| 批量删除漏删 | 遍历中修改集合 | forEach + removeGraphic |
| 撤销后状态断裂 | 缺少 CompositeChange | HistoryManager.saveChange |
| 粘贴位置错误 | 偏移计算累加错误 | paste() 中的 offset 计算 |
| 画布不更新 | 缺少事件触发 | 操作后是否有 emit |
| 组合内操作异常 | GroupManager 引用过期 | updateGroupManagerReferences() |
| 属性面板不刷新 | 缺少 GRAPHIC_UPDATED 事件 | 属性修改后是否有 emit |

## 参考文档

- [变更安全规则](./变更安全规则.md) - 完整的6条规则、自查清单、红名单
- [核心回归测试用例模板](../07-测试方案/03-核心回归测试用例模板.md) - 可直接使用的测试模板
- [图元操作功能详细测试文档](../02-功能说明/图元操作功能详细测试文档.md) - 已有测试覆盖情况
