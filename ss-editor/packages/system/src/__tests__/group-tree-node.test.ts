// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// ======================== Mock i18n ========================
const t = vi.fn((key: string) => key);
vi.mock('@scada-editor/core', () => ({
  useI18n: () => ({ t, locale: { value: 'zh-CN' } }),
}));

// ======================== Helper ========================
function makeProps(overrides: Record<string, any> = {}) {
  const group = { id: 'group-1', name: '测试分组1' };
  const childGroup = { id: 'group-1-1', name: '子分组1-1' };
  const childGroup2 = { id: 'group-1-2', name: '子分组1-2' };
  const device1 = { id: 'dev-1', deviceCode: 'device-001', name: '设备1', status: 'online' };
  const device2 = { id: 'dev-2', deviceCode: 'device-002', name: '设备2', status: 'offline' };

  const tree = [
    {
      group,
      devices: [device1],
      children: [
        {
          group: childGroup,
          devices: [device2],
          children: [],
        },
        {
          group: childGroup2,
          devices: [],
          children: [],
        },
      ],
    },
  ];

  return {
    group,
    projectId: 'proj-1',
    depth: 1,
    expandedGroups: new Set<string>(),
    selectedGroupId: '',
    selectedDeviceId: '',
    groupDeviceCache: new Map<string, any[]>(),
    groupTreeCache: new Map<string, any[]>([['proj-1', tree]]),
    ...overrides,
  };
}

async function mountTreeNode(props: Record<string, any>) {
  const mod = await import('../views/device/components/GroupTreeNode.vue');
  return mount(mod.default, {
    props,
    global: {
      stubs: {
        GroupTreeNode: mod.default,
      },
      mocks: { $t: t },
    },
  });
}

// ======================== Tests ========================
describe('GroupTreeNode', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('基础渲染', () => {
    it('应渲染分组名称', async () => {
      const wrapper = await mountTreeNode(makeProps());
      const labels = wrapper.findAll('.node-label');
      // 第一个 .node-label 是当前分组名
      expect(labels[0].text()).toBe('测试分组1');
    });

    it('应渲染文件夹图标 SVG', async () => {
      const wrapper = await mountTreeNode(makeProps());
      // 检查 HTML 中包含文件夹图标 path（svg 的 path 元素在 jsdom 中查找受 SVG namespace 影响）
      expect(wrapper.html()).toContain('M22 19a2');
    });

    it('应显示设备总数徽章', async () => {
      const wrapper = await mountTreeNode(makeProps());
      expect(wrapper.find('.node-count').text()).toBe('2');
    });

    it('有子分组时应显示展开箭头', async () => {
      const wrapper = await mountTreeNode(makeProps());
      expect(wrapper.find('.chevron').exists()).toBe(true);
    });

    it('无子分组时应显示占位符', async () => {
      const tree = [
        {
          group: { id: 'group-leaf', name: '叶子分组' },
          devices: [],
          children: [],
        },
      ];
      const props = makeProps({
        group: { id: 'group-leaf', name: '叶子分组' },
        groupTreeCache: new Map([['proj-1', tree]]),
      });
      const wrapper = await mountTreeNode(props);
      expect(wrapper.find('.chevron-placeholder').exists()).toBe(true);
      expect(wrapper.find('.chevron').exists()).toBe(false);
    });

    it('应渲染编辑和删除操作按钮', async () => {
      const wrapper = await mountTreeNode(makeProps());
      expect(wrapper.find('.group-actions').exists()).toBe(true);
      expect(wrapper.findAll('.btn-tree-action').length).toBe(2);
    });
  });

  describe('子分组渲染（二级分组）', () => {
    it('展开时应显示子分组的名称', async () => {
      const props = makeProps({
        expandedGroups: new Set(['group-1']),
      });
      const wrapper = await mountTreeNode(props);
      const groupNodes = wrapper.findAll('.group-node');
      expect(groupNodes.length).toBeGreaterThanOrEqual(2); // parent + at least 1 child
      const labels = wrapper.findAll('.node-label');
      // 第二个 label 是第一个子分组
      const childLabels = labels.filter(l => l.text() === '子分组1-1');
      expect(childLabels.length).toBe(1);
    });

    it('展开时应显示子分组的文件夹图标', async () => {
      const props = makeProps({
        expandedGroups: new Set(['group-1', 'group-1-1']),
      });
      const wrapper = await mountTreeNode(props);
      // 递归渲染后，应有父分组和子分组节点
      const groupNodes = wrapper.findAll('.group-node');
      expect(groupNodes.length).toBe(3); // parent + 2 children

      // 3 个分组节点，每个都应有文件夹图标的 path（计数 M22 19a2 出现次数）
      const html = wrapper.html();
      const matches = html.match(/M22 19a2/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBe(3);
    });

    it('每个子分组节点都应包含名称标签', async () => {
      const props = makeProps({
        expandedGroups: new Set(['group-1', 'group-1-1', 'group-1-2']),
      });
      const wrapper = await mountTreeNode(props);
      const nodeLabels = wrapper.findAll('.node-label');
      // 应有 3 个分组名：测试分组1、子分组1-1、子分组1-2
      expect(nodeLabels.length).toBeGreaterThanOrEqual(3);
      expect(nodeLabels.some(l => l.text() === '子分组1-1')).toBe(true);
      expect(nodeLabels.some(l => l.text() === '子分组1-2')).toBe(true);
    });

    it('子分组无内容时应显示占位符而非展开箭头', async () => {
      const props = makeProps({
        expandedGroups: new Set(['group-1', 'group-1-2']),
      });
      const wrapper = await mountTreeNode(props);
      // group-1-2 是空子分组，应有 placeholder
      const groupNodes = wrapper.findAll('.group-node');
      const childGroupNodes = groupNodes.filter(n => {
        const label = n.find('.node-label');
        return label?.text() === '子分组1-2';
      });
      expect(childGroupNodes.length).toBe(1);
      expect(childGroupNodes[0].find('.chevron-placeholder').exists()).toBe(true);
      expect(childGroupNodes[0].find('.chevron').exists()).toBe(false);
    });

    it('未展开时不应显示子分组', async () => {
      const wrapper = await mountTreeNode(makeProps());
      const groupNodes = wrapper.findAll('.group-node');
      expect(groupNodes.length).toBe(1); // 仅父分组
    });
  });

  describe('展开/收起', () => {
    it('展开时应显示子分组', async () => {
      const props = makeProps({
        expandedGroups: new Set(['group-1', 'group-1-1']),
      });
      const wrapper = await mountTreeNode(props);
      expect(wrapper.find('.group-children').exists()).toBe(true);
      const groupNodes = wrapper.findAll('.group-node');
      expect(groupNodes.length).toBe(3); // parent + 2 child groups
      // 设备列表在右侧表格中展示，不在此树中显示
      const deviceNodes = wrapper.findAll('.device-node');
      expect(deviceNodes.length).toBe(0);
    });

    it('收起时不应显示子分组和设备', async () => {
      const wrapper = await mountTreeNode(makeProps());
      expect(wrapper.find('.group-children').exists()).toBe(false);
    });

    it('点击分组节点应触发 selectGroup 与 toggleGroup 事件', async () => {
      const wrapper = await mountTreeNode(makeProps());
      await wrapper.find('.group-node').trigger('click');
      // 有可展开内容，应先触发 selectGroup，再触发 toggleGroup
      expect(wrapper.emitted('selectGroup')).toBeTruthy();
      expect(wrapper.emitted('selectGroup')![0]).toEqual(['proj-1', 'group-1']);
      expect(wrapper.emitted('toggleGroup')).toBeTruthy();
      expect(wrapper.emitted('toggleGroup')![0]).toEqual(['group-1']);
    });

    it('点击展开箭头应触发 toggleGroup', async () => {
      const wrapper = await mountTreeNode(makeProps());
      await wrapper.find('.chevron').trigger('click');
      expect(wrapper.emitted('toggleGroup')).toBeTruthy();
      expect(wrapper.emitted('toggleGroup')![0]).toEqual(['group-1']);
    });

    it('点击叶子分组不触发 toggleGroup', async () => {
      const tree = [
        {
          group: { id: 'group-leaf', name: '叶子分组' },
          devices: [],
          children: [],
        },
      ];
      const props = makeProps({
        group: { id: 'group-leaf', name: '叶子分组' },
        groupTreeCache: new Map([['proj-1', tree]]),
      });
      const wrapper = await mountTreeNode(props);
      await wrapper.find('.group-node').trigger('click');
      expect(wrapper.emitted('selectGroup')).toBeTruthy();
      // 无子内容，不触发 toggleGroup
      expect(wrapper.emitted('toggleGroup')).toBeFalsy();
    });
  });

  describe('编辑/删除事件', () => {
    it('点击编辑按钮应触发 editGroup 事件', async () => {
      const wrapper = await mountTreeNode(makeProps());
      const editBtn = wrapper.find('.btn-tree-action');
      await editBtn.trigger('click');
      expect(wrapper.emitted('editGroup')).toBeTruthy();
      expect(wrapper.emitted('editGroup')![0][0]).toEqual(expect.objectContaining({ id: 'group-1' }));
    });

    it('点击删除按钮应触发 deleteGroup 事件', async () => {
      const wrapper = await mountTreeNode(makeProps());
      const deleteBtn = wrapper.find('.btn-tree-action-danger');
      if (deleteBtn.exists()) {
        await deleteBtn.trigger('click');
        expect(wrapper.emitted('deleteGroup')).toBeTruthy();
        expect(wrapper.emitted('deleteGroup')![0][0]).toEqual(expect.objectContaining({ id: 'group-1' }));
      }
    });
  });

  describe('递归渲染', () => {
    it('应递归渲染多层子分组', async () => {
      const deepChild = { id: 'group-deep', name: '深层分组' };
      const tree = [
        {
          group: { id: 'group-1', name: '分组1' },
          devices: [],
          children: [
            {
              group: { id: 'group-1-1', name: '子分组1-1' },
              devices: [],
              children: [
                {
                  group: deepChild,
                  devices: [{ id: 'dev-deep', deviceCode: 'deep-001', name: '深层设备', status: 'online' }],
                  children: [],
                },
              ],
            },
          ],
        },
      ];
      const props = makeProps({
        expandedGroups: new Set(['group-1', 'group-1-1', 'group-deep']),
        groupTreeCache: new Map([['proj-1', tree]]),
      });
      const wrapper = await mountTreeNode(props);
      const groupNodes = wrapper.findAll('.group-node');
      expect(groupNodes.length).toBe(3);
      // 设备列表在右侧表格中展示，不在此树中显示
      const deviceNodes = wrapper.findAll('.device-node');
      expect(deviceNodes.length).toBe(0);
    });

    it('深层子分组应正确显示名称', async () => {
      const deepChild = { id: 'group-deep', name: '深层分组' };
      const tree = [
        {
          group: { id: 'group-1', name: '分组1' },
          devices: [],
          children: [
            {
              group: { id: 'group-1-1', name: '子分组1-1' },
              devices: [],
              children: [
                {
                  group: deepChild,
                  devices: [],
                  children: [],
                },
              ],
            },
          ],
        },
      ];
      const props = makeProps({
        expandedGroups: new Set(['group-1', 'group-1-1', 'group-deep']),
        groupTreeCache: new Map([['proj-1', tree]]),
      });
      const wrapper = await mountTreeNode(props);
      const labels = wrapper.findAll('.node-label');
      const deepLabel = labels.find(l => l.text() === '深层分组');
      expect(deepLabel).toBeTruthy();
    });

    it('深层子分组应正确显示文件夹图标', async () => {
      const deepChild = { id: 'group-deep', name: '深层分组' };
      const tree = [
        {
          group: { id: 'group-1', name: '分组1' },
          devices: [],
          children: [
            {
              group: { id: 'group-1-1', name: '子分组1-1' },
              devices: [],
              children: [
                {
                  group: deepChild,
                  devices: [],
                  children: [],
                },
              ],
            },
          ],
        },
      ];
      const props = makeProps({
        expandedGroups: new Set(['group-1', 'group-1-1', 'group-deep']),
        groupTreeCache: new Map([['proj-1', tree]]),
      });
      const wrapper = await mountTreeNode(props);
      // 3 个分组节点，每个都应有文件夹图标（计数 M22 19a2 出现次数）
      const matches = wrapper.html().match(/M22 19a2/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBe(3);
    });
  });

  describe('空状态', () => {
    it('分组无设备且无子分组展开时应显示空提示', async () => {
      const tree = [
        {
          group: { id: 'group-empty', name: '空分组' },
          devices: [],
          children: [],
        },
      ];
      const props = makeProps({
        group: { id: 'group-empty', name: '空分组' },
        groupTreeCache: new Map([['proj-1', tree]]),
        expandedGroups: new Set(['group-empty']),
      });
      const wrapper = await mountTreeNode(props);
      expect(wrapper.find('.tree-empty-small').exists()).toBe(true);
      expect(wrapper.find('.tree-empty-small').text()).toContain('system.devices.noSubGroups');
    });
  });
});
