<template>
  <!-- 分组节点（只读：用于设备监控视图，无编辑/删除操作） -->
  <div
    class="tree-node group-node"
    :style="{ paddingLeft: (16 + depth * 12) + 'px' }"
    :class="{ expanded: expandedGroups.has(group.id) }"
    @click="onToggleGroup"
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
      class="node-icon group-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
    <span class="node-label">{{ group.name }}</span>
    <span class="node-count">{{ totalDescendantDevices }}</span>
  </div>

  <!-- 展开后：先显示子分组，再显示设备 -->
  <div
    v-if="expandedGroups.has(group.id)"
    class="group-children"
    :style="{ marginLeft: '12px' }"
  >
    <!-- 子分组（递归） -->
    <MonitorGroupTreeNode
      v-for="child in childGroups"
      :key="child.id"
      :group="child"
      :project-id="projectId"
      :depth="depth + 1"
      :expanded-groups="expandedGroups"
      :selected-device-id="selectedDeviceId"
      :group-device-cache="groupDeviceCache"
      :group-tree-cache="groupTreeCache"
      @toggle-group="onToggleGroupBubble"
      @select-device="onSelectDeviceBubble"
    />

    <!-- 直属于该分组的设备 -->
    <div
      v-for="dev in directDevices"
      :key="dev.id"
      class="tree-node device-node"
      :style="{ paddingLeft: (16 + (depth + 1) * 12) + 'px' }"
      :class="{ active: selectedDeviceId === dev.id }"
      @click="onSelectDevice(dev)"
    >
      <svg
        class="node-icon device-icon"
        :class="'device-status-' + (dev.status || 'offline')"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect
          x="2"
          y="3"
          width="20"
          height="14"
          rx="2"
        />
        <line
          x1="8"
          y1="21"
          x2="16"
          y2="21"
        />
        <line
          x1="12"
          y1="17"
          x2="12"
          y2="21"
        />
      </svg>
      <span class="node-label">{{ dev.deviceName || dev.deviceCode }}</span>
      <span
        class="status-dot"
        :class="'status-' + (dev.status || 'offline')"
      />
    </div>
    <div
      v-if="directDevices.length === 0 && childGroups.length === 0"
      class="tree-empty-small"
    >
      {{ $t('system.devices.noDevices') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  group: any;
  projectId: string;
  depth: number;
  expandedGroups: Set<string>;
  selectedDeviceId: string;
  groupDeviceCache: Map<string, any[]>;
  groupTreeCache: Map<string, any[]>;
}>();

const emit = defineEmits<{
  toggleGroup: [groupId: string];
  selectDevice: [projectId: string, groupId: string, deviceId: string];
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

// 是否有可展开内容（子分组或直属设备）
const hasExpandableContent = computed(() => childGroups.value.length > 0 || directDevices.value.length > 0);

// 直属设备 — 优先使用 tree item 的 devices
const directDevices = computed(() => {
  if (treeItem.value?.devices && Array.isArray(treeItem.value.devices)) {
    return treeItem.value.devices;
  }
  // 回退到缓存
  const raw = props.groupDeviceCache.get(`${props.projectId}::${props.group.id}`);
  return Array.isArray(raw) ? raw : [];
});

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

function onSelectDevice(dev: any) {
  emit('selectDevice', props.projectId, props.group.id, dev.id);
}

function onToggleGroupBubble(groupId: string) {
  emit('toggleGroup', groupId);
}

function onSelectDeviceBubble(projId: string, groupId: string, deviceId: string) {
  emit('selectDevice', projId, groupId, deviceId);
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
.tree-node.device-node.active { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }

.group-node { font-weight: 500; }
.device-node { font-size: 12px; }

/* 节点图标配色：分组=琥珀色（文件夹），设备=按状态着色 */
.node-icon { flex-shrink: 0; }
.group-icon { color: var(--status-warning); }
.device-icon { color: var(--text-secondary); }

/* 设备图标按状态着色 */
.device-icon.device-status-online { color: var(--status-online); }
.device-icon.device-status-offline { color: var(--status-offline); }
.device-icon.device-status-connecting { color: var(--primary); }
.device-icon.device-status-degraded { color: var(--status-warning); }
.device-icon.device-status-error { color: var(--status-error); }

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
