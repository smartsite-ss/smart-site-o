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
  const group = { id: 'group-1', name: '测试分组1', projectId: 'proj-1' };
  const childGroup = { id: 'group-1-1', name: '子分组1-1', projectId: 'proj-1' };
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
      ],
    },
  ];

  return {
    group,
    projectId: 'proj-1',
    depth: 1,
    expandedGroups: new Set<string>(),
    selectedDeviceId: '',
    groupDeviceCache: new Map<string, any[]>(),
    groupTreeCache: new Map<string, any[]>([['proj-1', tree]]),
    ...overrides,
  };
}

async function mountTreeNode(props: Record<string, any>) {
  const mod = await import('../views/device/components/MonitorGroupTreeNode.vue');
  return mount(mod.default, {
    props,
    global: {
      mocks: { $t: t },
    },
  });
}

// ======================== Tests ========================
describe('MonitorGroupTreeNode', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应渲染分组节点', async () => {
      const wrapper = await mountTreeNode(makeProps());
      expect(wrapper.find('.group-node').exists()).toBe(true);
      expect(wrapper.find('.node-label').text()).toBe('测试分组1');
    });

    it('应显示设备总数徽章', async () => {
      const wrapper = await mountTreeNode(makeProps());
      // 树中有 2 个设备（1 直属 + 1 子分组）
      expect(wrapper.find('.node-count').text()).toBe('2');
    });

    it('有子分组时应显示展开箭头', async () => {
      const wrapper = await mountTreeNode(makeProps());
      expect(wrapper.find('.chevron').exists()).toBe(true);
    });

    it('无子分组时应显示占位符', async () => {
      const tree = [
        {
          group: { id: 'group-leaf', name: '叶子分组', projectId: 'proj-1' },
          devices: [],
          children: [],
        },
      ];
      const props = makeProps({
        group: { id: 'group-leaf', name: '叶子分组', projectId: 'proj-1' },
        groupTreeCache: new Map([['proj-1', tree]]),
      });
      const wrapper = await mountTreeNode(props);
      expect(wrapper.find('.chevron-placeholder').exists()).toBe(true);
      expect(wrapper.find('.chevron').exists()).toBe(false);
    });
  });

  describe('展开/收起', () => {
    it('展开时应显示子分组和设备', async () => {
      const props = makeProps({
        expandedGroups: new Set(['group-1', 'group-1-1']),
      });
      const wrapper = await mountTreeNode(props);
      expect(wrapper.find('.group-children').exists()).toBe(true);
      // 应渲染子分组节点
      const childNodes = wrapper.findAll('.group-node');
      expect(childNodes.length).toBe(2); // 父分组 + 子分组
      // 应渲染设备节点（直属1 + 子分组1）
      const deviceNodes = wrapper.findAll('.device-node');
      expect(deviceNodes.length).toBe(2);
    });

    it('收起时不应显示子分组和设备', async () => {
      const wrapper = await mountTreeNode(makeProps());
      expect(wrapper.find('.group-children').exists()).toBe(false);
    });

    it('点击分组节点应触发 toggleGroup 事件', async () => {
      const wrapper = await mountTreeNode(makeProps());
      await wrapper.find('.group-node').trigger('click');
      expect(wrapper.emitted('toggleGroup')).toBeTruthy();
      expect(wrapper.emitted('toggleGroup')![0]).toEqual(['group-1']);
    });

    it('点击展开箭头也应触发 toggleGroup', async () => {
      const wrapper = await mountTreeNode(makeProps());
      await wrapper.find('.chevron').trigger('click');
      expect(wrapper.emitted('toggleGroup')).toBeTruthy();
      expect(wrapper.emitted('toggleGroup')![0]).toEqual(['group-1']);
    });
  });

  describe('设备选择', () => {
    it('点击设备节点应触发 selectDevice 事件', async () => {
      const props = makeProps({
        expandedGroups: new Set(['group-1']),
      });
      const wrapper = await mountTreeNode(props);
      const deviceNodes = wrapper.findAll('.device-node');
      await deviceNodes[0].trigger('click');
      expect(wrapper.emitted('selectDevice')).toBeTruthy();
      expect(wrapper.emitted('selectDevice')![0]).toEqual(['proj-1', 'group-1', 'dev-1']);
    });

    it('选中的设备应有 active 类', async () => {
      const props = makeProps({
        expandedGroups: new Set(['group-1']),
        selectedDeviceId: 'dev-1',
      });
      const wrapper = await mountTreeNode(props);
      const deviceNodes = wrapper.findAll('.device-node');
      expect(deviceNodes[0].classes()).toContain('active');
    });

    it('未选中的设备不应有 active 类', async () => {
      const props = makeProps({
        expandedGroups: new Set(['group-1']),
        selectedDeviceId: 'dev-other',
      });
      const wrapper = await mountTreeNode(props);
      const deviceNodes = wrapper.findAll('.device-node');
      expect(deviceNodes[0].classes()).not.toContain('active');
    });
  });

  describe('设备状态显示', () => {
    it('应根据设备状态显示对应的状态点', async () => {
      const props = makeProps({
        expandedGroups: new Set(['group-1', 'group-1-1']),
      });
      const wrapper = await mountTreeNode(props);
      const statusDots = wrapper.findAll('.status-dot');
      expect(statusDots.length).toBe(2);
      // 子分组设备先渲染: 设备2 (offline)
      expect(statusDots[0].classes()).toContain('status-offline');
      // 直属设备后渲染: 设备1 (online)
      expect(statusDots[1].classes()).toContain('status-online');
    });

    it('设备状态为空时应默认显示 offline', async () => {
      const tree = [
        {
          group: { id: 'group-1', name: '分组1', projectId: 'proj-1' },
          devices: [{ id: 'dev-nostatus', deviceCode: 'dev-001', name: '无状态设备' }],
          children: [],
        },
      ];
      const props = makeProps({
        groupTreeCache: new Map([['proj-1', tree]]),
        expandedGroups: new Set(['group-1']),
      });
      const wrapper = await mountTreeNode(props);
      const statusDots = wrapper.findAll('.status-dot');
      expect(statusDots[0].classes()).toContain('status-offline');
    });
  });

  describe('空状态', () => {
    it('分组无设备且无子分组时应显示空提示', async () => {
      const tree = [
        {
          group: { id: 'group-empty', name: '空分组', projectId: 'proj-1' },
          devices: [],
          children: [],
        },
      ];
      const props = makeProps({
        group: { id: 'group-empty', name: '空分组', projectId: 'proj-1' },
        groupTreeCache: new Map([['proj-1', tree]]),
        expandedGroups: new Set(['group-empty']),
      });
      const wrapper = await mountTreeNode(props);
      expect(wrapper.find('.tree-empty-small').exists()).toBe(true);
      expect(wrapper.find('.tree-empty-small').text()).toContain('system.devices.noDevices');
    });
  });

  describe('递归渲染', () => {
    it('应递归渲染多层子分组', async () => {
      const deepChild = { id: 'group-deep', name: '深层分组', projectId: 'proj-1' };
      const tree = [
        {
          group: { id: 'group-1', name: '分组1', projectId: 'proj-1' },
          devices: [],
          children: [
            {
              group: { id: 'group-1-1', name: '子分组1-1', projectId: 'proj-1' },
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
      // 应有 3 个分组节点（1 + 1-1 + deep）
      const groupNodes = wrapper.findAll('.group-node');
      expect(groupNodes.length).toBe(3);
      // 应有 1 个设备节点
      const deviceNodes = wrapper.findAll('.device-node');
      expect(deviceNodes.length).toBe(1);
    });
  });

  describe('只读模式（无编辑操作）', () => {
    it('不应渲染编辑按钮', async () => {
      const wrapper = await mountTreeNode(makeProps());
      expect(wrapper.find('.group-actions').exists()).toBe(false);
      expect(wrapper.find('.btn-tree-action').exists()).toBe(false);
    });

    it('不应触发 editGroup 事件', async () => {
      const wrapper = await mountTreeNode(makeProps());
      expect(wrapper.emitted('editGroup')).toBeFalsy();
    });

    it('不应触发 deleteGroup 事件', async () => {
      const wrapper = await mountTreeNode(makeProps());
      expect(wrapper.emitted('deleteGroup')).toBeFalsy();
    });
  });
});
