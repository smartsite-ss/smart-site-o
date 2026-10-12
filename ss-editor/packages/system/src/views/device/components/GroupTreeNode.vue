<template>
  <!-- 分组节点 -->
  <div
    class="tree-node group-node"
    :style="{ paddingLeft: (16 + depth * 12) + 'px' }"
    :class="{
      expanded: expandedGroups.has(group.id),
      active: !selectedDeviceId && selectedGroupId === group.id
    }"
    @click="onSelectGroup"
  >
    <svg
      v-if="hasExpandableContent"
      class="chevron"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      :class="{ rotated: expandedGroups.has(group.id) }"
      @click.stop="onToggleGroup"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
    <span
      v-else
      class="chevron-placeholder"
    />
    <svg
      class="node-icon folder-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
    <span class="node-label">{{ group.name }}</span>
    <span class="node-count">{{ totalDescendantDevices }}</span>
    <div
      class="group-actions"
      @click.stop
    >
      <button
        class="btn-tree-action"
        :title="$t('system.devices.edit')"
        @click="$emit('editGroup', group)"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        ><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
      </button>
      <button
        class="btn-tree-action btn-tree-action-danger"
        :title="$t('system.devices.delete')"
        @click="$emit('deleteGroup', group)"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        ><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
      </button>
    </div>
  </div>

  <!-- 展开后：递归显示子分组（设备列表在右侧表格中展示，不在此树中显示） -->
  <div
    v-if="expandedGroups.has(group.id)"
    class="group-children"
    :style="{ marginLeft: '12px' }"
  >
    <!-- 子分组（递归） -->
    <GroupTreeNode
      v-for="child in childGroups"
      :key="child.id"
      :group="child"
      :project-id="projectId"
      :depth="depth + 1"
      :expanded-groups="expandedGroups"
      :selected-group-id="selectedGroupId"
      :selected-device-id="selectedDeviceId"
      :group-device-cache="groupDeviceCache"
      :group-tree-cache="groupTreeCache"
      @toggle-group="onToggleGroupBubble"
      @select-group="onSelectGroupBubble"
      @select-device="onSelectDeviceBubble"
      @edit-group="onEditGroupBubble"
      @delete-group="onDeleteGroupBubble"
    />
    <div
      v-if="childGroups.length === 0"
      class="tree-empty-small"
    >
      {{ $t('system.devices.noSubGroups') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@scada-editor/core';

const { t: _t } = useI18n();

const props = defineProps<{
  group: any;
  projectId: string;
  depth: number;
  expandedGroups: Set<string>;
  selectedGroupId: string;
  selectedDeviceId: string;
  groupDeviceCache: Map<string, any[]>;
  groupTreeCache: Map<string, any[]>;
}>();

const emit = defineEmits<{
  toggleGroup: [groupId: string];
  selectGroup: [projectId: string, groupId: string];
  selectDevice: [projectId: string, groupId: string, deviceId: string];
  editGroup: [group: any];
  deleteGroup: [group: any];
}>();

// 在树形结构中查找当前分组对应的 tree item
function findTreeItem(items: any[], groupId: string): any | null {
  for (const item of items) {
    if (item.group?.id === groupId) return item;
    if (item.children && Array.isArray(item.children)) {
      const found = findTreeItem(item.children, groupId);
      if (found) return found;
    }
  }
  return null;
}

// 当前分组对应的 tree item（包含 children 和 devices）
const treeItem = computed(() => {
  const raw = props.groupTreeCache.get(props.projectId);
  const tree = Array.isArray(raw) ? raw : [];
  return findTreeItem(tree, props.group.id);
});

// 子分组 — 使用树形结构的 children
const childGroups = computed(() => {
  if (!treeItem.value?.children || !Array.isArray(treeItem.value.children)) return [];
  return treeItem.value.children.map((child: any) => child.group).filter(Boolean);
});

// 是否有可展开内容（有子分组即可展开）
const hasExpandableContent = computed(() => childGroups.value.length > 0);

// 递归计算该分组下的设备总数（含子分组设备）
const totalDescendantDevices = computed(() => {
  if (!treeItem.value) return 0;
  let count = (treeItem.value.devices || []).length;
  function countTreeDevices(items: any[]) {
    for (const item of items) {
      if (item.devices) count += item.devices.length;
      if (item.children && Array.isArray(item.children)) {
        countTreeDevices(item.children);
      }
    }
  }
  if (treeItem.value.children) countTreeDevices(treeItem.value.children);
  return count;
});

function onToggleGroup() {
  emit('toggleGroup', props.group.id);
}

function onSelectGroup() {
  emit('selectGroup', props.projectId, props.group.id);
  // 有可展开内容时，单击分组名也自动展开
  if (hasExpandableContent.value && !props.expandedGroups.has(props.group.id)) {
    emit('toggleGroup', props.group.id);
  }
}

function onToggleGroupBubble(groupId: string) {
  emit('toggleGroup', groupId);
}

function onSelectGroupBubble(projId: string, groupId: string) {
  emit('selectGroup', projId, groupId);
}

function onSelectDeviceBubble(projId: string, groupId: string, deviceId: string) {
  emit('selectDevice', projId, groupId, deviceId);
}

function onEditGroupBubble(group: any) {
  emit('editGroup', group);
}

function onDeleteGroupBubble(group: any) {
  emit('deleteGroup', group);
}
</script>

<style scoped>
.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
  color: var(--text);
}

.tree-node:hover { background: var(--border-light); }
.tree-node.active { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }

.group-node { font-weight: 500; }
.device-node { font-size: 12px; }

.chevron {
  flex-shrink: 0;
  transition: transform 0.2s;
  color: var(--text-secondary);
}
.chevron.rotated { transform: rotate(90deg); }

.chevron-placeholder {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--border-light);
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.node-icon {
  flex-shrink: 0;
}

.group-node {
  font-weight: 500;
}

.group-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  width: 0;
  overflow: visible;
}
.group-node:hover .group-actions { opacity: 1; width: auto; overflow: visible; }

.btn-tree-action {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.btn-tree-action:hover { color: var(--text); background: var(--border-light); }
.btn-tree-action-danger:hover { color: var(--status-error); background: rgba(220, 38, 38, 0.12); border-color: var(--status-error); }

.group-children {
  border-left: 1px solid var(--border);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.status-online { background: var(--status-online); }
.status-dot.status-offline { background: var(--text-secondary); }
.status-dot.status-connecting { background: var(--primary); }
.status-dot.status-degraded { background: var(--status-warning); }
.status-dot.status-error { background: var(--status-error); }

.tree-empty-small {
  padding: 8px 16px 8px 48px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
