<template>
  <div class="template-library">
    <!-- ======================== 左侧：设备模板库树（含分类+模板管理） ======================== -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3 class="sidebar-title">
          {{ t('system.deviceTemplate.library') }}
        </h3>
        <span class="template-count">{{ allTemplatesCount }}</span>
      </div>

      <!-- 工具栏：只显示图标 -->
      <div class="sidebar-toolbar">
        <button
          class="tb-btn"
          :title="t('system.deviceTemplate.actions.newTemplate')"
          @click="openCreateDialog"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
            /><line
              x1="5"
              y1="12"
              x2="19"
              y2="12"
            />
          </svg>
        </button>
        <button
          class="tb-btn"
          :title="t('system.deviceTemplate.actions.import')"
          @click="openImportDialog"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line
              x1="12"
              y1="3"
              x2="12"
              y2="15"
            />
          </svg>
        </button>
        <button
          class="tb-btn"
          :disabled="reloading"
          :title="t('system.deviceTemplate.actions.reload')"
          @click="handleReload"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            :class="{ spinning: reloading }"
          >
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
        <button
          class="tb-btn"
          :disabled="rebuilding"
          :title="t('system.deviceTemplate.actions.rebuild')"
          @click="handleRebuildIndex"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            :class="{ spinning: rebuilding }"
          >
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.12-9.36L1 10" />
          </svg>
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="sidebar-search">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle
            cx="11"
            cy="11"
            r="8"
          /><line
            x1="21"
            y1="21"
            x2="16.65"
            y2="16.65"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="t('system.deviceTemplate.searchPlaceholder')"
        >
      </div>

      <!-- 树结构 -->
      <SsLoading
        v-if="loading && allTemplates.length === 0"
        :text="t('system.templates.loading')"
        size="small"
      />
      <div
        v-else
        class="industry-tree"
      >
        <!-- "全部模板" 根节点 -->
        <div
          class="tree-node root-node"
          :class="{ active: selectedNode?.type === 'root' }"
          @click="selectNode({ type: 'root' })"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              ry="2"
            />
          </svg>
          <span class="node-label">{{ t('system.deviceTemplate.allTemplates') }}</span>
          <span class="node-count">{{ allTemplatesCount }}</span>
        </div>

        <!-- 搜索无结果 -->
        <div
          v-if="searchQuery && filteredTree.length === 0"
          class="sidebar-loading"
        >
          {{ t('system.deviceTemplate.noSearchResults') }}
        </div>

        <!-- 动态树（支持搜索过滤） -->
        <template
          v-for="section in filteredTree"
          :key="section.id"
        >
          <!-- 区段标题 -->
          <div class="tree-section-label">
            {{ section.label }}
          </div>

          <!-- 协议/行业节点 -->
          <template
            v-for="group in section.children"
            :key="group.id"
          >
            <div
              class="tree-node group-node"
              :class="{ expanded: expandedGroups.has(group.id), active: selectedNode?.type === 'group' && selectedNode?.groupId === group.id }"
              @click="toggleGroup(group.id)"
              @contextmenu.prevent="group.contextMenu ? onContextMenu($event, group.contextMenu) : null"
            >
              <svg
                class="chevron"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                :class="{ rotated: expandedGroups.has(group.id) }"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span class="node-label">{{ group.label }}</span>
              <span class="node-count">{{ group.count }}</span>
            </div>

            <!-- 分类/模板子节点（行业展开后同时显示分类及模板） -->
            <div
              v-if="expandedGroups.has(group.id)"
              class="group-children"
            >
              <template
                v-for="child in group.children"
                :key="child.id"
              >
                <!-- 分类节点（文件夹图标，不可展开） -->
                <div
                  v-if="child.type === 'category'"
                  class="tree-node category-node"
                  :class="{ active: selectedNode?.type === 'category' && selectedNode?.categoryId === child.id }"
                  @click="selectNode({ type: 'category', groupId: group.id, categoryId: child.id })"
                  @contextmenu.prevent="child.contextMenu ? onContextMenu($event, child.contextMenu) : null"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    <path d="M2 8h20l-1.58 5.26A2 2 0 0 1 18.47 15H5.53a2 2 0 0 1-1.95-1.74L2 8z" />
                  </svg>
                  <span class="node-label">{{ child.label }}</span>
                  <span class="node-count">{{ child.count }}</span>
                </div>
                <!-- 分类下的模板叶子节点（始终显示） -->
                <template v-if="child.type === 'category'">
                  <div
                    v-for="tpl in child.children"
                    :key="tpl.id"
                    class="tree-node template-node"
                    :class="{ active: selectedNode?.type === 'template' && selectedNode?.templateId === tpl.id }"
                    @click="selectTemplate(tpl.id)"
                    @contextmenu.prevent="onContextMenu($event, { type: 'template', template: tpl.data })"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <g v-html="getTemplateIconSvg(tpl.data?.deviceType)" />
                    </svg>
                    <span class="node-label">{{ tpl.label }}</span>
                    <span class="version-tag">v{{ tpl.data?.version || '' }}</span>
                  </div>
                  <div
                    v-if="child.children.length === 0"
                    class="empty-children"
                  >
                    {{ t('system.deviceTemplate.noTemplates') }}
                  </div>
                </template>
                <!-- 直接挂在行业下的模板叶子节点 -->
                <div
                  v-if="child.type === 'template'"
                  class="tree-node template-node"
                  :class="{ active: selectedNode?.type === 'template' && selectedNode?.templateId === child.id }"
                  @click="selectTemplate(child.id)"
                  @contextmenu.prevent="onContextMenu($event, { type: 'template', template: child.data })"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <g v-html="getTemplateIconSvg(child.data?.deviceType)" />
                  </svg>
                  <span class="node-label">{{ child.label }}</span>
                  <span class="version-tag">v{{ child.data?.version || '' }}</span>
                </div>
              </template>
              <!-- 行业下无任何子节点 -->
              <div
                v-if="!group.children || group.children.length === 0"
                class="empty-children"
              >
                {{ t('system.deviceTemplate.noTemplates') }}
              </div>
            </div>
          </template>
        </template>
      </div>

      <!-- ===== 右键上下文菜单 ===== -->
      <Teleport to="body">
        <div
          v-if="contextMenu.visible"
          class="context-menu-overlay"
          @click="closeContextMenu"
          @contextmenu.prevent="closeContextMenu"
        >
          <div
            class="context-menu-panel"
            :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          >
            <!-- 行业菜单 -->
            <template v-if="contextMenu.type === 'industry'">
              <div
                class="context-item"
                @click="contextCreateCategory"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                ><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line
                  x1="12"
                  y1="11"
                  x2="12"
                  y2="17"
                /><line
                  x1="9"
                  y1="14"
                  x2="15"
                  y2="14"
                /></svg>
                {{ t('system.deviceTemplate.directory.newCategory') }}
              </div>
            </template>
            <!-- 分类菜单 -->
            <template v-if="contextMenu.type === 'category'">
              <div
                class="context-item"
                @click="contextRenameCategory"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                ><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                {{ t('system.deviceTemplate.directory.rename') }}
              </div>
              <div
                class="context-item context-danger"
                @click="contextDeleteCategory"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                ><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                {{ t('system.deviceTemplate.directory.deleteCategory') }}
              </div>
              <div
                v-if="copiedTemplateId"
                class="context-item"
                @click="contextPasteTemplateToCategory"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                ><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect
                  x="8"
                  y="2"
                  width="8"
                  height="4"
                  rx="1"
                  ry="1"
                /></svg>
                {{ t('system.deviceTemplate.actions.paste') }}
              </div>
            </template>
            <!-- 模板菜单 -->
            <template v-if="contextMenu.type === 'template' && contextMenu.template">
              <div
                class="context-item"
                @click="contextEditTemplate"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                ><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                {{ t('system.deviceTemplate.actions.edit') }}
              </div>
              <div
                class="context-item"
                @click="contextCopyTemplate"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                ><rect
                  x="9"
                  y="9"
                  width="13"
                  height="13"
                  rx="2"
                  ry="2"
                /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                {{ t('system.deviceTemplate.actions.copy') }}
              </div>
              <div
                v-if="contextMenu.template.status === 'draft'"
                class="context-item"
                @click="contextPublishTemplate"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                ><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                {{ t('system.deviceTemplate.actions.publish') }}
              </div>
              <div
                v-if="contextMenu.template.status === 'published'"
                class="context-item"
                @click="contextDeprecateTemplate"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                ><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line
                  x1="12"
                  y1="9"
                  x2="12"
                  y2="13"
                /><line
                  x1="12"
                  y1="17"
                  x2="12.01"
                  y2="17"
                /></svg>
                {{ t('system.deviceTemplate.actions.deprecate') }}
              </div>
              <div class="context-divider" />
              <div
                class="context-item context-danger"
                @click="contextDeleteTemplate"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                ><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                {{ t('system.deviceTemplate.actions.delete') }}
              </div>
            </template>
          </div>
        </div>
      </Teleport>
    </aside>

    <!-- ======================== 右侧：选中模板的变量列表 ======================== -->
    <main class="main-area">
      <!-- 已选中模板 -->
      <template v-if="selectedTemplate">
        <!-- 模板信息头 -->
        <div class="template-header">
          <div class="template-info">
            <h2 class="template-name">
              {{ selectedTemplate.name }}
            </h2>
            <span class="version-badge">v{{ selectedTemplate.version }}</span>
            <span
              class="status-tag"
              :class="'status-' + selectedTemplate.status"
            >
              <DictTag
                dict-id="templateStatus"
                :value="selectedTemplate.status"
                size="small"
                :locale="locale"
              />
            </span>
            <span
              v-if="selectedTemplate.deviceType"
              class="device-type-badge"
            >
              <DictLabel
                dict-id="deviceType"
                :value="selectedTemplate.deviceType"
                :locale="locale"
              />
            </span>
          </div>
          <div class="template-meta">
            <span
              v-if="selectedTemplate.industry"
              class="meta-item"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              <DictLabel
                dict-id="industry"
                :value="selectedTemplate.industry"
                :locale="locale"
              />
            </span>
            <span
              v-if="selectedTemplate.category"
              class="meta-item"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              {{ selectedTemplate.category }}
            </span>
            <span
              v-if="selectedTemplate.description"
              class="meta-item description"
              title="{{ selectedTemplate.description }}"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line
                x1="16"
                y1="13"
                x2="8"
                y2="13"
              /><line
                x1="16"
                y1="17"
                x2="8"
                y2="17"
              /></svg>
              {{ selectedTemplate.description }}
            </span>
            <span class="meta-item">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><rect
                x="3"
                y="4"
                width="18"
                height="18"
                rx="2"
                ry="2"
              /><line
                x1="16"
                y1="2"
                x2="16"
                y2="6"
              /><line
                x1="8"
                y1="2"
                x2="8"
                y2="6"
              /><line
                x1="3"
                y1="10"
                x2="21"
                y2="10"
              /></svg>
              {{ t('system.deviceTemplate.updatedAt') }}: {{ formatDate(selectedTemplate.updatedAt) }}
            </span>
          </div>
          <div class="template-actions">
            <button
              class="btn btn-sm btn-secondary"
              :title="t('system.deviceTemplate.actions.edit')"
              @click="openEditDialog(selectedTemplate)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
          </div>
        </div>

        <!-- 变量表格 -->
        <div class="variables-section">
          <div class="variables-toolbar">
            <span class="variables-title">
              {{ t('system.deviceTemplate.variables') }}
              <span class="variable-count">({{ templateVariables.length }})</span>
            </span>
            <div class="variables-toolbar-actions">
              <button
                class="btn-icon btn-add"
                :title="t('system.deviceTemplate.addVariable')"
                @click="openVarAddDialog"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line
                    x1="12"
                    y1="5"
                    x2="12"
                    y2="19"
                  /><line
                    x1="5"
                    y1="12"
                    x2="19"
                    y2="12"
                  />
                </svg>
              </button>
              <div class="variables-search">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                ><circle
                  cx="11"
                  cy="11"
                  r="8"
                /><line
                  x1="21"
                  y1="21"
                  x2="16.65"
                  y2="16.65"
                /></svg>
                <input
                  v-model="varSearchQuery"
                  type="text"
                  class="search-input"
                  :placeholder="t('system.deviceTemplate.varSearchPlaceholder') || 'Filter variables...'"
                >
              </div>
            </div>
          </div>
          <div class="table-wrapper">
            <table
              v-if="templateVariables.length > 0"
              class="data-table"
            >
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ t('system.deviceTemplate.varName') }}</th>
                  <th>{{ t('system.deviceTemplate.varAddress') }}</th>
                  <th>{{ t('system.deviceTemplate.varDataType') }}</th>
                  <th>{{ t('system.deviceTemplate.varDirection') }}</th>
                  <th>{{ t('system.deviceTemplate.varScanRate') }}</th>
                  <th>{{ t('system.deviceTemplate.varUnit') }}</th>
                  <th>{{ t('system.deviceTemplate.varEnabled') }}</th>
                  <th>{{ t('system.deviceTemplate.varDescription') }}</th>
                  <th class="col-actions" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="v in templateVariables"
                  :key="v.order || v.name"
                >
                  <td class="col-order">
                    {{ v.order }}
                  </td>
                  <td class="col-name">
                    {{ v.name }}
                  </td>
                  <td class="col-address">
                    <code>{{ v.address }}</code>
                  </td>
                  <td>
                    <span class="badge">{{ v.dataType || '-' }}</span>
                  </td>
                  <td class="col-direction">
                    <span
                      v-if="v.direction === 'write' || v.direction === 'read-write'"
                      class="badge badge-write"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      ><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      {{ directionLabel(v.direction) }}
                    </span>
                    <span
                      v-else
                      class="badge badge-read"
                    >{{ directionLabel(v.direction || 'read') }}</span>
                  </td>
                  <td class="col-scanrate">
                    {{ v.scanRate || '-' }}
                  </td>
                  <td class="col-unit">
                    <DictLabel
                      dict-id="measurementUnit"
                      :value="v.unit ?? ''"
                      :locale="locale"
                      fallback="-"
                    />
                  </td>
                  <td class="col-enabled">
                    <span
                      class="enabled-dot"
                      :class="{ active: v.enabled !== false }"
                      :title="v.enabled !== false ? t('system.deviceTemplate.enabled') : t('system.deviceTemplate.disabled')"
                    />
                  </td>
                  <td class="col-desc text-muted">
                    {{ v.description || '-' }}
                  </td>
                  <td class="col-actions">
                    <button
                      class="btn-icon"
                      :title="t('system.deviceTemplate.actions.edit')"
                      @click="openVarEditDialog(v)"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      class="btn-icon btn-icon-danger"
                      :title="t('system.deviceTemplate.actions.delete')"
                      @click="handleDeleteVariable(v)"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              v-else
              class="empty-variables"
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                opacity="0.3"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <p>{{ t('system.deviceTemplate.noVariables') }}</p>
            </div>
          </div>
        </div>
      </template>

      <!-- 未选中模板的占位 -->
      <div
        v-else
        class="empty-state"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          opacity="0.3"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line
            x1="16"
            y1="13"
            x2="8"
            y2="13"
          /><line
            x1="16"
            y1="17"
            x2="8"
            y2="17"
          />
        </svg>
        <p>{{ t('system.deviceTemplate.selectTemplateHint') }}</p>
      </div>
    </main>

    <!-- ======================== 创建/编辑模板弹窗 ======================== -->
    <div
      v-if="showFormModal"
      class="modal-overlay"
      @click.self="closeFormModal"
    >
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>{{ isEditing ? t('system.deviceTemplate.editTemplate') : t('system.deviceTemplate.createTemplate') }}</h2>
          <button
            class="modal-close"
            @click="closeFormModal"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div
              v-if="isEditing"
              class="form-group"
            >
              <label>{{ t('system.deviceTemplate.templateId') }}</label>
              <input
                :value="editingId"
                type="text"
                class="form-input"
                disabled
                readonly
              >
            </div>
            <div class="form-group">
              <label>{{ t('system.deviceTemplate.name') }} <span class="required">*</span></label>
              <input
                v-model="form.name"
                type="text"
                class="form-input"
                :placeholder="t('system.deviceTemplate.namePlaceholder')"
              >
            </div>
            <div class="form-group">
              <label>{{ t('system.deviceTemplate.deviceType') }} <span class="required">*</span></label>
              <DictSelector
                v-model="form.deviceType"
                dict-id="deviceType"
                size="small"
                :locale="locale"
              />
            </div>
            <div class="form-group full-width">
              <label>{{ t('system.deviceTemplate.description') }}</label>
              <input
                v-model="form.description"
                type="text"
                class="form-input"
                :placeholder="t('system.deviceTemplate.descriptionPlaceholder')"
              >
            </div>
            <div class="form-group">
              <label>{{ t('system.deviceTemplate.industry') }}</label>
              <DictSelector
                v-model="form.industry"
                dict-id="industry"
                size="small"
                :locale="locale"
                allow-clear
              />
            </div>
            <div class="form-group">
              <label>{{ t('system.deviceTemplate.category') }}</label>
              <input
                v-model="form.category"
                type="text"
                class="form-input"
                :placeholder="t('system.deviceTemplate.categoryPlaceholder')"
              >
            </div>
            <div class="form-group">
              <label>{{ t('system.deviceTemplate.version') }}</label>
              <input
                v-model="form.version"
                type="text"
                class="form-input"
                placeholder="1.0.0"
              >
            </div>
            <div class="form-group">
              <label>{{ t('system.deviceTemplate.status') }}</label>
              <select
                v-model="form.status"
                class="form-input"
              >
                <option value="draft">
                  {{ t('system.deviceTemplate.statusDraft') }}
                </option>
                <option value="published">
                  {{ t('system.deviceTemplate.statusPublished') }}
                </option>
                <option value="deprecated">
                  {{ t('system.deviceTemplate.statusDeprecated') }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ t('system.deviceTemplate.tagsLabel') }}</label>
              <input
                v-model="formTagsText"
                type="text"
                class="form-input"
                :placeholder="t('system.deviceTemplate.tagsPlaceholder')"
              >
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeFormModal"
          >
            {{ t('system.templates.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="submitting"
            @click="submitForm"
          >
            {{ submitting ? t('system.templates.saving') : (isEditing ? t('system.templates.update') : t('system.templates.create')) }}
          </button>
        </div>
      </div>
    </div>

    <!-- ======================== 导入模板弹窗 ======================== -->
    <div
      v-if="showImportModal"
      class="modal-overlay"
      @click.self="closeImportModal"
    >
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>{{ t('system.deviceTemplate.importTitle') }}</h2>
          <button
            class="modal-close"
            @click="closeImportModal"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ t('system.deviceTemplate.pasteJson') }}</label>
            <textarea
              v-model="importJsonText"
              class="form-input form-textarea"
              rows="10"
              placeholder="{&quot;schemaVersion&quot;:&quot;1.0&quot;,&quot;templateType&quot;:&quot;device_tag_template&quot;,&quot;id&quot;:&quot;tpl-xxx&quot;,&quot;name&quot;:&quot;...&quot;,&quot;deviceType&quot;:&quot;modbus_tcp&quot;,...}"
            />
          </div>
          <div
            v-if="importResult"
            class="import-result"
          >
            <div
              v-if="importResult.valid"
              class="alert alert-success"
            >
              {{ t('system.deviceTemplate.importSuccess') }}
            </div>
            <div
              v-else
              class="alert alert-warning"
            >
              {{ t('system.deviceTemplate.importFailed') }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeImportModal"
          >
            {{ t('system.templates.close') }}
          </button>
          <button
            class="btn btn-primary"
            @click="doImport"
          >
            {{ t('system.deviceTemplate.actions.import') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ======================== 目录结构编辑弹窗 ======================== -->
    <div
      v-if="showCategoryDialog"
      class="modal-overlay"
      @click.self="closeCategoryDialog"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>{{ categoryDialogMode === 'create' ? t('system.deviceTemplate.directory.newCategoryTitle') : t('system.deviceTemplate.directory.renameTitle') }}</h2>
          <button
            class="modal-close"
            @click="closeCategoryDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ t('system.deviceTemplate.industry') }}</label>
            <input
              v-model="categoryDialogForm.industryName"
              type="text"
              class="form-input"
              disabled
            >
          </div>
          <div class="form-group">
            <label>{{ categoryDialogMode === 'create' ? t('system.deviceTemplate.directory.categoryName') : t('system.deviceTemplate.directory.newName') }}</label>
            <input
              v-model="categoryDialogForm.categoryName"
              type="text"
              class="form-input"
              :placeholder="t('system.deviceTemplate.directory.categoryNamePlaceholder')"
            >
          </div>
          <div
            v-if="categoryDialogError"
            class="alert alert-warning"
          >
            {{ categoryDialogError }}
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeCategoryDialog"
          >
            {{ t('system.templates.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="categorySubmitting"
            @click="submitCategoryDialog"
          >
            {{ categorySubmitting ? t('system.templates.saving') : t('system.templates.confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ======================== 变量编辑弹窗 ======================== -->
    <div
      v-if="showVarEditModal"
      class="modal-overlay"
      @click.self="closeVarEditModal"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingVariableIndex >= 0 ? t('system.deviceTemplate.editVariable') : t('system.deviceTemplate.addVariable') }}</h2>
          <button
            class="modal-close"
            @click="closeVarEditModal"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <!-- 基础信息 -->
          <div class="edit-section">
            <div class="edit-section-title">
              {{ t('system.deviceTemplate.sectionBasic') }}
            </div>
            <div class="form-grid cols-2">
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.varName') }} <span class="required">*</span></label>
                <input
                  v-model="varEditForm.name"
                  type="text"
                  class="form-input"
                  :placeholder="t('system.deviceTemplate.varNamePlaceholder')"
                  pattern="[a-zA-Z_$][a-zA-Z0-9_$]*"
                  :title="t('system.deviceTemplate.varNameValidation')"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.varDescription') }} <span class="required">*</span></label>
                <input
                  v-model="varEditForm.description"
                  type="text"
                  class="form-input"
                  :placeholder="t('system.deviceTemplate.varDescriptionPlaceholder')"
                  required
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.varCategory') }} <span class="required">*</span></label>
                <DictSelector
                  v-model="varEditForm.category"
                  dict-id="variableCategory"
                  size="small"
                  :locale="locale"
                />
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.varAddress') }} <span class="required">*</span></label>
                <input
                  v-model="varEditForm.address"
                  type="text"
                  class="form-input"
                  :placeholder="t('system.deviceTemplate.varAddressPlaceholder')"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.varDataType') }}</label>
                <DictSelector
                  v-model="varEditForm.dataType"
                  dict-id="tagDataType"
                  size="small"
                  :locale="locale"
                />
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.varDirection') }}</label>
                <select
                  v-model="varEditForm.direction"
                  class="form-input direction-select"
                >
                  <option value="read">
                    {{ t('system.deviceTemplate.directionRead') }}
                  </option>
                  <option value="write">
                    {{ t('system.deviceTemplate.directionWrite') }}
                  </option>
                  <option value="read-write">
                    {{ t('system.deviceTemplate.directionReadWrite') }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.registerCount') }}</label>
                <input
                  v-model.number="varEditForm.registerCount"
                  type="number"
                  class="form-input"
                  min="1"
                  placeholder="1"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.byteOrder') }}</label>
                <DictSelector
                  v-model="varEditForm.byteOrder"
                  dict-id="byteOrder"
                  size="small"
                  :locale="locale"
                />
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    v-model="varEditForm.enabled"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  {{ t('system.deviceTemplate.enabled') }}
                </label>
              </div>
            </div>
          </div>

          <!-- 采集参数 -->
          <div class="edit-section">
            <div class="edit-section-title">
              {{ t('system.deviceTemplate.sectionCollection') }}
            </div>
            <div class="form-grid cols-2">
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.varScanRate') }} (ms)</label>
                <input
                  v-model.number="varEditForm.scanRate"
                  type="number"
                  class="form-input"
                  min="100"
                  step="100"
                  placeholder="1000"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.timeout') }} (ms)</label>
                <input
                  v-model.number="varEditForm.timeout"
                  type="number"
                  class="form-input"
                  min="0"
                  step="100"
                  placeholder="5000"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.retryCount') }}</label>
                <input
                  v-model.number="varEditForm.retryCount"
                  type="number"
                  class="form-input"
                  min="0"
                  placeholder="3"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.priority') }}</label>
                <DictSelector
                  v-model="varEditForm.priority"
                  dict-id="priority"
                  size="small"
                  :locale="locale"
                />
              </div>
            </div>
          </div>

          <!-- 数据转换 -->
          <div class="edit-section">
            <div class="edit-section-title">
              {{ t('system.deviceTemplate.sectionConversion') }}
            </div>
            <div class="form-grid cols-2">
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.scaleFactor') }}</label>
                <input
                  v-model.number="varEditForm.scale"
                  type="number"
                  class="form-input"
                  step="0.01"
                  placeholder="1"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.offset') }}</label>
                <input
                  v-model.number="varEditForm.offset"
                  type="number"
                  class="form-input"
                  step="0.01"
                  placeholder="0"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.conversionType') }}</label>
                <DictSelector
                  v-model="varEditForm.conversionType"
                  dict-id="conversionType"
                  size="small"
                  :locale="locale"
                  allow-clear
                />
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.displayFormat') }}</label>
                <input
                  v-model="varEditForm.displayFormat"
                  type="text"
                  class="form-input"
                  placeholder="%.2f"
                >
              </div>
            </div>
          </div>

          <!-- 工程属性 -->
          <div class="edit-section">
            <div class="edit-section-title">
              {{ t('system.deviceTemplate.sectionEngineering') }}
            </div>
            <div class="form-grid cols-2">
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.varUnit') }}</label>
                <DictSelector
                  v-model="varEditForm.unit"
                  dict-id="measurementUnit"
                  size="small"
                  :locale="locale"
                  filterable
                  allow-custom
                  :placeholder="t('system.deviceTemplate.unitPlaceholder')"
                />
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.minValue') }}</label>
                <input
                  v-model.number="varEditForm.minValue"
                  type="number"
                  class="form-input"
                  step="any"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.maxValue') }}</label>
                <input
                  v-model.number="varEditForm.maxValue"
                  type="number"
                  class="form-input"
                  step="any"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.engMinValue') }}</label>
                <input
                  v-model.number="varEditForm.engMinValue"
                  type="number"
                  class="form-input"
                  step="any"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.engMaxValue') }}</label>
                <input
                  v-model.number="varEditForm.engMaxValue"
                  type="number"
                  class="form-input"
                  step="any"
                >
              </div>
            </div>
          </div>

          <!-- 死区 -->
          <div class="edit-section">
            <div class="edit-section-title">
              {{ t('system.deviceTemplate.sectionDeadband') }}
            </div>
            <div class="form-grid cols-2">
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.deadbandMode') }}</label>
                <DictSelector
                  v-model="varEditForm.deadbandMode"
                  dict-id="deadbandMode"
                  size="small"
                  :locale="locale"
                  allow-clear
                />
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.deadbandValue') }}</label>
                <input
                  v-model.number="varEditForm.deadbandValue"
                  type="number"
                  class="form-input"
                  step="any"
                  min="0"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.deadbandPercent') }} (%)</label>
                <input
                  v-model.number="varEditForm.deadbandPercent"
                  type="number"
                  class="form-input"
                  min="0"
                  max="100"
                  step="0.1"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.deadbandTime') }} (ms)</label>
                <input
                  v-model.number="varEditForm.deadbandTime"
                  type="number"
                  class="form-input"
                  min="0"
                >
              </div>
            </div>
          </div>

          <!-- 报警 -->
          <div class="edit-section">
            <div class="edit-section-title">
              {{ t('system.deviceTemplate.sectionAlarm') }}
            </div>
            <div class="form-grid cols-2">
              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    v-model="varEditForm.alarmEnabled"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  {{ t('system.deviceTemplate.alarmEnabled') }}
                </label>
              </div>
              <div />
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.alarmHighHigh') }} (HH)</label>
                <input
                  v-model.number="varEditForm.alarmHighHigh"
                  type="number"
                  class="form-input"
                  step="any"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.alarmHigh') }} (H)</label>
                <input
                  v-model.number="varEditForm.alarmHigh"
                  type="number"
                  class="form-input"
                  step="any"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.alarmLow') }} (L)</label>
                <input
                  v-model.number="varEditForm.alarmLow"
                  type="number"
                  class="form-input"
                  step="any"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.alarmLowLow') }} (LL)</label>
                <input
                  v-model.number="varEditForm.alarmLowLow"
                  type="number"
                  class="form-input"
                  step="any"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.alarmDeviation') }}</label>
                <input
                  v-model.number="varEditForm.alarmDeviation"
                  type="number"
                  class="form-input"
                  step="any"
                >
              </div>
            </div>
          </div>

          <!-- 质量检查与归档 -->
          <div class="edit-section">
            <div class="edit-section-title">
              {{ t('system.deviceTemplate.sectionQuality') }}
            </div>
            <div class="form-grid cols-2">
              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    v-model="varEditForm.qualityCheckEnabled"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  {{ t('system.deviceTemplate.qualityCheckEnabled') }}
                </label>
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.maxAge') }} (ms)</label>
                <input
                  v-model.number="varEditForm.maxAge"
                  type="number"
                  class="form-input"
                  min="0"
                  placeholder="60000"
                >
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    v-model="varEditForm.archiveEnabled"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  {{ t('system.deviceTemplate.archiveEnabled') }}
                </label>
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.archiveInterval') }} (ms)</label>
                <input
                  v-model.number="varEditForm.archiveInterval"
                  type="number"
                  class="form-input"
                  min="0"
                  placeholder="10000"
                >
              </div>
              <div class="form-group">
                <label>{{ t('system.deviceTemplate.retentionDays') }}</label>
                <input
                  v-model.number="varEditForm.retentionDays"
                  type="number"
                  class="form-input"
                  min="0"
                  placeholder="365"
                >
              </div>
            </div>
          </div>

          <!-- 其他 -->
          <div class="edit-section">
            <div class="edit-section-title">
              {{ t('system.deviceTemplate.sectionOther') }}
            </div>
            <div class="form-grid cols-2">
              <div class="form-group">
                <label>Order</label>
                <input
                  v-model.number="varEditForm.order"
                  type="number"
                  class="form-input"
                  min="0"
                >
              </div>
            </div>
          </div>

          <div
            v-if="varEditError"
            class="alert alert-warning"
            style="margin-top: 12px;"
          >
            {{ varEditError }}
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeVarEditModal"
          >
            {{ t('system.templates.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="varEditSubmitting"
            @click="submitVarEdit"
          >
            {{ varEditSubmitting ? t('system.templates.saving') : t('system.templates.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue';
import { useI18n } from '@scada-editor/core';
import { useTemplateStore } from '../../stores/template.store';
import { templateApi } from '../../api/modules/template.api';
import { showConfirm, showSuccess, showError } from '../../utils/messageBox';
import DictSelector from '../../components/dict/DictSelector.vue';
import DictTag from '../../components/dict/DictTag.vue';
import DictLabel from '../../components/dict/DictLabel.vue';
import { useDict } from '../../composables/useDict';
import { SsLoading } from '@scada-editor/shared';
import type { DeviceTemplate, DeviceTemplateVariable } from '../../api/modules/template.api';

/** 模板索引中行业条目 */
interface TemplateIndexIndustry {
  name: string;
  path?: string;
  categories: TemplateIndexCategory[];
}

/** 模板索引中分类条目 */
interface TemplateIndexCategory {
  name: string;
  templates: TemplateIndexEntry[];
}

/** 模板索引中模板条目 */
interface TemplateIndexEntry {
  id: string;
  name: string;
  description?: string;
  deviceType: string;
  deviceModel?: string;
  version?: string;
  status?: string;
  isDefault?: boolean;
  tags?: string[];
  variableCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** 模板索引结构 */
interface TemplateIndustryIndex {
  industries: TemplateIndexIndustry[];
}

const { t, locale } = useI18n();
const { loadDicts } = useDict();

/** 格式化日期 */
function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleDateString(locale.value, { year: 'numeric', month: '2-digit', day: '2-digit' }) +
      ' ' + d.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// ====== 设备类型对应的 SVG 图标（SVG 内部元素） ======
const deviceTypeSvgContent: Record<string, string> = {
  // Modbus：芯片/微控制器
  modbus_tcp:
    '<rect x="5" y="5" width="14" height="14" rx="2"/>' +
    '<line x1="9" y1="2" x2="9" y2="5"/><line x1="15" y1="2" x2="15" y2="5"/>' +
    '<line x1="9" y1="19" x2="9" y2="22"/><line x1="15" y1="19" x2="15" y2="22"/>' +
    '<line x1="2" y1="9" x2="5" y2="9"/><line x1="2" y1="15" x2="5" y2="15"/>' +
    '<line x1="19" y1="9" x2="22" y2="9"/><line x1="19" y1="15" x2="22" y2="15"/>',
  modbus_rtu:
    '<rect x="5" y="5" width="14" height="14" rx="2"/>' +
    '<line x1="9" y1="2" x2="9" y2="5"/><line x1="15" y1="2" x2="15" y2="5"/>' +
    '<line x1="9" y1="19" x2="9" y2="22"/><line x1="15" y1="19" x2="15" y2="22"/>' +
    '<line x1="2" y1="9" x2="5" y2="9"/><line x1="2" y1="15" x2="5" y2="15"/>' +
    '<line x1="19" y1="9" x2="22" y2="9"/><line x1="19" y1="15" x2="22" y2="15"/>',
  // OPC UA：数据库/服务器
  opc_ua:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/>' +
    '<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>' +
    '<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  // Siemens S7：齿轮/设置
  siemens_s7:
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  // MQTT：WiFi 信号
  mqtt:
    '<circle cx="12" cy="12" r="2"/>' +
    '<path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>',
  // Ethernet/IP：网络接口
  ethernet_ip:
    '<rect x="2" y="6" width="20" height="12" rx="2"/>' +
    '<line x1="12" y1="10" x2="12" y2="14"/><line x1="8" y1="12" x2="16" y2="12"/>',
};

/** 默认模板图标 - 文件 */
const defaultTemplateSvgContent =
  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>';

/** 根据设备类型获取 SVG 图标内容 */
function getTemplateIconSvg(deviceType?: string): string {
  if (deviceType && deviceTypeSvgContent[deviceType]) {
    return deviceTypeSvgContent[deviceType];
  }
  return defaultTemplateSvgContent;
}

/** 方向标签文本 */
function directionLabel(dir?: string): string {
  if (dir === 'write') return t('system.deviceTemplate.directionWrite');
  if (dir === 'read-write') return t('system.deviceTemplate.directionReadWrite');
  return t('system.deviceTemplate.directionRead');
}

const templateStore = useTemplateStore();

/** HTTP 错误类型 */
interface HttpError {
  _errorHandled?: boolean;
  response?: { data?: { message?: string } };
}

// ====== 数据状态 ======
const templates = ref<DeviceTemplate[]>([]);
const loading = ref(false);
const reloading = ref(false);
const rebuilding = ref(false);
const submitting = ref(false);
const searchQuery = ref('');

// ====== 模板库加载状态 ======
const industryIndex = ref<TemplateIndustryIndex | null>(null);
const loadedTemplates = ref<DeviceTemplate[]>([]);
const libraryLoading = ref(false);

// ====== 树节点选中状态 ======
interface SelectedNode {
  type: 'root' | 'group' | 'category' | 'template';
  groupId?: string;
  categoryId?: string;
  templateId?: string;
}
const selectedNode = ref<SelectedNode>({ type: 'root' });
const expandedGroups = reactive(new Set<string>());

// ====== 选中的模板 ======
const selectedTemplate = ref<DeviceTemplate | null>(null);

// ====== 弹窗状态 ======
const showFormModal = ref(false);
const showImportModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const copiedTemplateId = ref<string | null>(null);

const form = ref({
  name: '',
  description: '',
  deviceType: 'modbus_tcp',
  industry: '',
  category: '',
  version: '1.0.0',
  tags: [] as string[],
  status: 'draft' as 'draft' | 'published' | 'deprecated',
});
const formTagsText = ref('');

const importJsonText = ref('');
const importResult = ref<{ valid: boolean } | null>(null);

// ====== 右键上下文菜单 ======
const contextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  type: 'industry' | 'category' | 'template' | null;
  industryName: string;
  categoryName: string;
  template: DeviceTemplate | null;
}>({
  visible: false,
  x: 0,
  y: 0,
  type: null,
  industryName: '',
  categoryName: '',
  template: null,
});

// ====== 分类目录编辑弹窗 ======
const showCategoryDialog = ref(false);
const categoryDialogMode = ref<'create' | 'rename'>('create');
const categoryDialogForm = ref({ industryName: '', categoryName: '' });
const categoryDialogError = ref('');
const categorySubmitting = ref(false);

// ====== 变量编辑弹窗 ======
const showVarEditModal = ref(false);
const varEditSubmitting = ref(false);
const varEditError = ref('');
const editingVariableIndex = ref(-1);
const varEditForm = ref({
  guid: '' as string,
  order: 0,
  name: '',
  address: '',
  dataType: 'float32',
  direction: 'read' as 'read' | 'write' | 'read-write',
  registerCount: undefined as number | undefined,
  byteOrder: 'little-endian' as 'big-endian' | 'little-endian' | undefined,
  enabled: true,
  scanRate: 1000,
  timeout: undefined as number | undefined,
  retryCount: undefined as number | undefined,
  priority: 'normal',
  scale: undefined as number | undefined,
  offset: undefined as number | undefined,
  conversionType: '',
  conversionConfig: null as Record<string, any> | null,
  unit: '',
  displayFormat: '',
  minValue: null as number | null,
  maxValue: null as number | null,
  engMinValue: null as number | null,
  engMaxValue: null as number | null,
  deadbandMode: 'none',
  deadbandValue: 0,
  deadbandPercent: 0,
  deadbandTime: 0,
  alarmEnabled: false,
  alarmHighHigh: null as number | null,
  alarmHigh: null as number | null,
  alarmLow: null as number | null,
  alarmLowLow: null as number | null,
  alarmDeviation: null as number | null,
  qualityCheckEnabled: false,
  maxAge: undefined as number | undefined,
  archiveEnabled: false,
  archiveInterval: undefined as number | undefined,
  retentionDays: undefined as number | undefined,
  description: '',
  category: '',
});

// ====== 计算属性 ======

/** 所有模板列表 */
const allTemplates = computed(() => templates.value);

/** 全部模板数量 */
const allTemplatesCount = computed(() => allTemplates.value.length);

/** 选中的模板的变量列表 */
const varSearchQuery = ref('');
const templateVariables = computed<DeviceTemplateVariable[]>(() => {
  if (!selectedTemplate.value) return [];
  const vars = selectedTemplate.value.variables;
  const list = Array.isArray(vars) ? vars : [];
  const q = varSearchQuery.value.toLowerCase().trim();
  if (!q) return list;
  return list.filter(v =>
    v.name.toLowerCase().includes(q) ||
    v.address.toLowerCase().includes(q) ||
    (v.dataType && v.dataType.toLowerCase().includes(q)) ||
    (v.description && v.description.toLowerCase().includes(q))
  );
});

/** 右键菜单上下文 */
interface ContextMenuContext {
  type: 'industry' | 'category' | 'template' | null;
  industryName?: string;
  categoryName?: string;
  template?: DeviceTemplate | null;
}

/** 构建树结构 */
interface TreeNode {
  id: string;
  label: string;
  count: number;
  type: 'group' | 'category' | 'template';
  children: TreeNode[];
  data?: DeviceTemplate;
  contextMenu?: ContextMenuContext | null;
}

interface TreeSection {
  id: string;
  key: string;
  label: string;
  children: TreeNode[];
}

/** 根据搜索过滤的树 */
const filteredTree = computed<TreeSection[]>(() => {
  const q = searchQuery.value.toLowerCase().trim();

  const sections: TreeSection[] = [
    {
      id: 'industry',
      key: 'industry',
      label: t('system.deviceTemplate.byIndustry'),
      children: buildIndustryTree(q),
    },
  ];

  // 如果有搜索条件，过滤掉空的区段
  if (q) {
    return sections.filter(s => s.children.length > 0);
  }
  return sections;
});

/** 构建行业树（完全基于 index.json） */
function buildIndustryTree(filterQuery: string): TreeNode[] {
  if (!industryIndex.value?.industries?.length) return [];

  const seenIndustries = new Set<string>();
  const nodes: TreeNode[] = [];

  for (const ind of industryIndex.value.industries) {
    // 去重：跳过已出现过的行业名称
    const indKey = ind.name.toLowerCase();
    if (seenIndustries.has(indKey)) continue;
    seenIndustries.add(indKey);

    const indNode: TreeNode = {
      id: `ind:${ind.name || ind.path}`,
      label: ind.name,
      count: 0,
      type: 'group',
      children: [],
      contextMenu: { type: 'industry', industryName: ind.name },
    };

    const seenCategories = new Set<string>();
    const cats: TreeNode[] = [];
    for (const cat of (ind.categories || [])) {
      // 去重：跳过已出现过的分类名称
      const catKey = cat.name.toLowerCase();
      if (seenCategories.has(catKey)) continue;
      seenCategories.add(catKey);

      const catNode: TreeNode = {
        id: `cat:${ind.name}/${cat.name}`,
        label: cat.name,
        count: 0,
        type: 'category',
        children: [],
        contextMenu: { type: 'category', industryName: ind.name, categoryName: cat.name },
      };

      // 添加分类下的模板
      const catTpls = (cat.templates || []).filter((t) => {
        if (!filterQuery) return true;
        return t.name?.toLowerCase().includes(filterQuery);
      });

      const seenTemplateIds = new Set<string>();
      for (const t of catTpls) {
        // 去重：跳过已出现过的模板 ID
        if (seenTemplateIds.has(t.id)) continue;
        seenTemplateIds.add(t.id);

        const tplData = buildTemplateFromIndexEntry(t, ind.name, cat.name);
        catNode.children.push({
          id: t.id,
          label: t.name,
          count: 0,
          type: 'template',
          children: [],
          data: tplData,
          contextMenu: { type: 'template', template: tplData },
        });
        catNode.count++;
      }
      indNode.count += catNode.count;
      cats.push(catNode);
    }

    indNode.children = cats;
    nodes.push(indNode);
  }

  return nodes;
}

/** 从 index 条目构建模板对象 */
function buildTemplateFromIndexEntry(entry: TemplateIndexEntry, industry: string, category: string): DeviceTemplate {
  // 优先从 loadedTemplates 中找完整数据
  const loaded = loadedTemplates.value.find((t) => t.id === entry.id);
  if (loaded) return loaded as DeviceTemplate;

  return {
    id: entry.id,
    name: entry.name,
    description: entry.description || '',
    deviceType: entry.deviceType,
    deviceModel: entry.deviceModel || '',
    industry,
    category,
    protocolType: entry.deviceType,
    version: entry.version || '1.0.0',
    status: (entry.status as 'draft' | 'published' | 'deprecated') || 'draft',
    isDefault: entry.isDefault || false,
    variables: [],
    authorId: '',
    tags: entry.tags || [],
    linkedDevices: 0,
    variableCount: entry.variableCount || 0,
    createdAt: entry.createdAt || '',
    updatedAt: entry.updatedAt || '',
  };
}

// ====== 树操作方法 ======

function toggleGroup(groupId: string) {
  if (expandedGroups.has(groupId)) {
    expandedGroups.delete(groupId);
  } else {
    expandedGroups.add(groupId);
    selectedNode.value = { type: 'group', groupId };
    selectedTemplate.value = null;
  }
}

function selectNode(node: SelectedNode) {
  selectedNode.value = node;
  selectedTemplate.value = null;
}

/** 选中模板：获取完整数据后显示变量 */
async function selectTemplate(templateId: string) {
  selectedNode.value = { type: 'template', templateId };
  // 先尝试从已有数据中获取
  let tpl = allTemplates.value.find(t => t.id === templateId);

  if (tpl && tpl.variables && tpl.variables.length > 0) {
    selectedTemplate.value = tpl;
    return;
  }

  // 尝试从 loadedTemplates 获取
  const loaded = loadedTemplates.value.find((t) => t.id === templateId);
  if (loaded && loaded.variables) {
    selectedTemplate.value = loaded as DeviceTemplate;
    return;
  }

  // 从后端获取完整模板数据
  try {
    loading.value = true;
    const res = await templateApi.getById(templateId, locale.value);  // ✨ 传入 locale
    const data = (res as { data?: unknown })?.data ?? res;
    selectedTemplate.value = data as DeviceTemplate;
  } catch {
    // 如果失败，退而使用已有数据
    if (tpl) {
      selectedTemplate.value = tpl;
    } else {
      showError(t('system.deviceTemplate.notFound'));
    }
  } finally {
    loading.value = false;
  }
}

// ====== 右键菜单 ======

/** 右键菜单数据 */
interface ContextMenuData {
  type: 'industry' | 'category' | 'template' | null;
  industryName?: string;
  categoryName?: string;
  template?: DeviceTemplate | null;
}

function onContextMenu(event: MouseEvent, menuData: ContextMenuData) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: menuData.type,
    industryName: menuData.industryName || '',
    categoryName: menuData.categoryName || '',
    template: menuData.template || null,
  };
}

function closeContextMenu() {
  contextMenu.value.visible = false;
}

function contextCreateCategory() {
  closeContextMenu();
  categoryDialogMode.value = 'create';
  categoryDialogForm.value = {
    industryName: contextMenu.value.industryName,
    categoryName: '',
  };
  categoryDialogError.value = '';
  showCategoryDialog.value = true;
}

function contextRenameCategory() {
  closeContextMenu();
  categoryDialogMode.value = 'rename';
  categoryDialogForm.value = {
    industryName: contextMenu.value.industryName,
    categoryName: contextMenu.value.categoryName,
  };
  categoryDialogError.value = '';
  showCategoryDialog.value = true;
}

async function contextDeleteCategory() {
  closeContextMenu();
  const name = contextMenu.value.categoryName;
  const confirmed = await showConfirm(
    t('system.deviceTemplate.directory.confirmDelete', { name }),
    t('system.deviceTemplate.directory.deleteCategory'),
  );
  if (!confirmed) return;
  try {
    await templateApi.deleteCategory(contextMenu.value.industryName, name);
    showSuccess(t('system.deviceTemplate.directory.deleteSuccess', { name }));
    await afterDirectoryChange();
  } catch (e: unknown) {
    const he = e as HttpError;
    if (!he._errorHandled) {
      showError(he?.response?.data?.message || t('system.deviceTemplate.directory.deleteFailed'));
    }
  }
}

function contextEditTemplate() {
  closeContextMenu();
  const tpl = contextMenu.value.template;
  if (tpl) openEditDialog(tpl);
}

function contextCopyTemplate() {
  closeContextMenu();
  const tpl = contextMenu.value.template;
  if (!tpl) return;
  copiedTemplateId.value = tpl.id;
  showSuccess(t('system.deviceTemplate.copySuccess'));
}

async function contextPasteTemplateToCategory() {
  closeContextMenu();
  if (!copiedTemplateId.value) return;
  const { industryName, categoryName } = contextMenu.value;
  if (!industryName || !categoryName) return;
  try {
    // 1. 克隆模板（后端 generateId() 生成新 ID）
    const cloned = await templateStore.cloneTemplate(copiedTemplateId.value);
    // 2. 更新到目标分类目录
    await templateStore.updateTemplate(cloned.id, {
      industry: industryName,
      category: categoryName,
    }, locale.value);
    showSuccess(t('system.deviceTemplate.pasteSuccess'));
    await refreshAll();
  } catch (e: unknown) {
    const he = e as HttpError;
    if (!he._errorHandled) {
      showError(t('system.deviceTemplate.cloneFailed'));
    }
  }
}

async function contextPublishTemplate() {
  closeContextMenu();
  const tpl = contextMenu.value.template;
  if (!tpl) return;
  const confirmed = await showConfirm(t('system.deviceTemplate.confirmPublish'), t('system.messageBox.confirm'));
  if (!confirmed) return;
  try {
    await templateStore.publishTemplate(tpl.id);
    showSuccess(t('system.deviceTemplate.publishSuccess'));
    await refreshAll();
  } catch (e: unknown) {
    const he = e as HttpError;
    if (!he._errorHandled) {
      showError(t('system.deviceTemplate.publishFailed'));
    }
  }
}

async function contextDeprecateTemplate() {
  closeContextMenu();
  const tpl = contextMenu.value.template;
  if (!tpl) return;
  const confirmed = await showConfirm(t('system.deviceTemplate.confirmDeprecate'), t('system.messageBox.confirm'));
  if (!confirmed) return;
  try {
    await templateStore.deprecateTemplate(tpl.id);
    showSuccess(t('system.deviceTemplate.deprecateSuccess'));
    await refreshAll();
  } catch (e: unknown) {
    const he = e as HttpError;
    if (!he._errorHandled) {
      showError(t('system.deviceTemplate.deprecateFailed'));
    }
  }
}

async function contextDeleteTemplate() {
  closeContextMenu();
  const tpl = contextMenu.value.template;
  if (!tpl) return;
  const confirmed = await showConfirm(
    t('system.deviceTemplate.confirmDeleteDesc', { name: tpl.name }),
    t('system.deviceTemplate.confirmDelete'),
  );
  if (!confirmed) return;
  try {
    await templateStore.deleteTemplate(tpl.id);
    showSuccess(t('system.deviceTemplate.deleteSuccess'));
    if (selectedTemplate.value?.id === tpl.id) {
      selectedTemplate.value = null;
      selectedNode.value = { type: 'root' };
    }
    await refreshAll();
  } catch (e: unknown) {
    const he = e as HttpError;
    if (!he._errorHandled) {
      showError(t('system.deviceTemplate.deleteFailed'));
    }
  }
}

// ====== 创建/编辑模板 ======

function resetForm() {
  form.value = { name: '', description: '', deviceType: 'modbus_tcp', industry: '', category: '', version: '1.0.0', tags: [], status: 'draft' };
  formTagsText.value = '';
}

function openCreateDialog() {
  resetForm();
  isEditing.value = false;
  editingId.value = null;
  showFormModal.value = true;
}

function openEditDialog(tpl: DeviceTemplate) {
  isEditing.value = true;
  editingId.value = tpl.id;
  form.value = {
    name: tpl.name,
    description: tpl.description || '',
    deviceType: tpl.deviceType,
    industry: tpl.industry || '',
    category: tpl.category || '',
    version: tpl.version,
    tags: tpl.tags || [],
    status: tpl.status || 'draft',
  };
  formTagsText.value = (tpl.tags || []).join(', ');
  showFormModal.value = true;
}

function closeFormModal() {
  showFormModal.value = false;
}

async function submitForm() {
  if (!form.value.name?.trim()) {
    showError(t('system.deviceTemplate.errorNameRequired'));
    return;
  }
  submitting.value = true;
  try {
    form.value.tags = formTagsText.value ? formTagsText.value.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (isEditing.value && editingId.value) {
      await templateStore.updateTemplate(editingId.value, {
        name: form.value.name,
        description: form.value.description,
        industry: form.value.industry,
        tags: form.value.tags,
        status: form.value.status,
      }, locale.value);
      showSuccess(t('system.deviceTemplate.saveSuccess'));
    } else {
      await templateStore.createTemplate({
        name: form.value.name,
        description: form.value.description,
        deviceType: form.value.deviceType,
        industry: form.value.industry,
        category: form.value.category,
        version: form.value.version,
        tags: form.value.tags,
      });
      showSuccess(t('system.deviceTemplate.createSuccess', { name: form.value.name }));
    }
    closeFormModal();
    await refreshAll();
  } catch (e: unknown) {
    const he = e as HttpError;
    if (!he._errorHandled) {
      showError(he?.response?.data?.message || t('system.deviceTemplate.saveFailed'));
    }
  } finally {
    submitting.value = false;
  }
}

// ====== 导入 ======

function openImportDialog() {
  importJsonText.value = '';
  importResult.value = null;
  showImportModal.value = true;
}

function closeImportModal() {
  showImportModal.value = false;
}

async function doImport() {
  if (!importJsonText.value) return;
  try {
    const data = JSON.parse(importJsonText.value);
    await templateApi.importTemplate(data);
    importResult.value = { valid: true };
    showSuccess(t('system.deviceTemplate.importSuccess'));
    await refreshAll();
  } catch (e: unknown) {
    importResult.value = { valid: false };
    const he = e as HttpError;
    if (!he._errorHandled) {
      showError(t('system.deviceTemplate.importFailed'));
    }
  }
}

// ====== 热重载 ======

async function handleReload() {
  const confirmed = await showConfirm(t('system.deviceTemplate.confirmReload'), t('system.messageBox.confirm'));
  if (!confirmed) return;
  reloading.value = true;
  try {
    const res = await templateApi.reload();
    const loadedCount = (res as { data?: { loaded?: number } })?.data?.loaded || 0;
    showSuccess(t('system.deviceTemplate.reloadSuccess', { count: loadedCount }));
    await loadLibrary();
    await refreshAll();
  } catch (e: unknown) {
    const he = e as HttpError;
    if (!he._errorHandled) {
      showError(t('system.deviceTemplate.reloadFailed'));
    }
  } finally {
    reloading.value = false;
  }
}

async function handleRebuildIndex() {
  const confirmed = await showConfirm(t('system.deviceTemplate.confirmRebuild'), t('system.messageBox.confirm'));
  if (!confirmed) return;
  rebuilding.value = true;
  try {
    const res = await templateApi.rebuildIndex();
    const data = (res as { data?: { totalTemplates?: number } })?.data;
    showSuccess(t('system.deviceTemplate.rebuildSuccess', { count: data?.totalTemplates || 0 }));
    const reloadRes = await templateApi.reload();
    showSuccess(t('system.deviceTemplate.reloadSuccess', { count: (reloadRes as { data?: { loaded?: number } })?.data?.loaded || 0 }));
    await loadLibrary();
    await refreshAll();
  } catch (e: unknown) {
    const he = e as HttpError;
    if (!he._errorHandled) {
      showError(t('system.deviceTemplate.rebuildFailed'));
    }
  } finally {
    rebuilding.value = false;
  }
}

// ====== 分类目录弹窗 ======

function closeCategoryDialog() {
  showCategoryDialog.value = false;
  categoryDialogError.value = '';
}

async function submitCategoryDialog() {
  const name = categoryDialogForm.value.categoryName.trim();
  if (!name) {
    categoryDialogError.value = t('system.deviceTemplate.directory.errorNameRequired');
    return;
  }
  categorySubmitting.value = true;
  try {
    if (categoryDialogMode.value === 'create') {
      await templateApi.createCategory({
        industryName: categoryDialogForm.value.industryName,
        categoryName: name,
      });
      showSuccess(t('system.deviceTemplate.directory.createSuccess', { name }));
    } else {
      await templateApi.renameCategory({
        industryName: categoryDialogForm.value.industryName,
        oldCategoryName: categoryDialogForm.value.categoryName,
        newCategoryName: name,
      });
      showSuccess(t('system.deviceTemplate.directory.renameSuccess', { name }));
    }
    await afterDirectoryChange();
    closeCategoryDialog();
  } catch (e: unknown) {
    const he = e as HttpError;
    categoryDialogError.value = he?.response?.data?.message || t('system.deviceTemplate.saveFailed');
  } finally {
    categorySubmitting.value = false;
  }
}

// ====== 变量编辑 ======

function openVarEditDialog(v: DeviceTemplateVariable) {
  const tpl = selectedTemplate.value;
  if (!tpl) return;
  const idx = tpl.variables.findIndex(vv => vv.order === v.order && vv.name === v.name);
  editingVariableIndex.value = idx >= 0 ? idx : -1;
  varEditForm.value = {
    guid: v.guid || crypto.randomUUID(),
    order: v.order,
    name: v.name,
    address: v.address,
    dataType: v.dataType || 'float32',
    direction: (v as any).direction || 'read',
    registerCount: v.registerCount ?? undefined,
    byteOrder: (v as any).byteOrder || 'little-endian',
    enabled: v.enabled ?? true,
    scanRate: v.scanRate || 1000,
    timeout: v.timeout ?? undefined,
    retryCount: v.retryCount ?? undefined,
    priority: v.priority || 'normal',
    scale: v.scale ?? undefined,
    offset: v.offset ?? undefined,
    conversionType: v.conversionType || '',
    conversionConfig: v.conversionConfig || null,
    unit: v.unit || '',
    displayFormat: v.displayFormat || '',
    minValue: v.minValue ?? null,
    maxValue: v.maxValue ?? null,
    engMinValue: v.engMinValue ?? null,
    engMaxValue: v.engMaxValue ?? null,
    deadbandMode: v.deadbandMode || 'none',
    deadbandValue: v.deadbandValue ?? 0,
    deadbandPercent: v.deadbandPercent ?? 0,
    deadbandTime: v.deadbandTime ?? 0,
    alarmEnabled: v.alarmEnabled ?? false,
    alarmHighHigh: v.alarmHighHigh ?? null,
    alarmHigh: v.alarmHigh ?? null,
    alarmLow: v.alarmLow ?? null,
    alarmLowLow: v.alarmLowLow ?? null,
    alarmDeviation: v.alarmDeviation ?? null,
    qualityCheckEnabled: v.qualityCheckEnabled ?? false,
    maxAge: v.maxAge ?? undefined,
    archiveEnabled: v.archiveEnabled ?? false,
    archiveInterval: v.archiveInterval ?? undefined,
    retentionDays: v.retentionDays ?? undefined,
    description: v.description || '',
    category: v.category || '',
  };
  varEditError.value = '';
  showVarEditModal.value = true;
}

const NEW_VARIABLE_DEFAULTS = {
  guid: '' as string,
  order: 0,
  name: '',
  address: '',
  dataType: 'float32',
  direction: 'read' as 'read' | 'write' | 'read-write',
  registerCount: undefined as number | undefined,
  byteOrder: 'little-endian' as 'big-endian' | 'little-endian' | undefined,
  enabled: true,
  scanRate: 1000,
  timeout: undefined as number | undefined,
  retryCount: undefined as number | undefined,
  priority: 'normal',
  scale: undefined as number | undefined,
  offset: undefined as number | undefined,
  conversionType: '',
  conversionConfig: null as Record<string, any> | null,
  unit: '',
  displayFormat: '',
  minValue: null as number | null,
  maxValue: null as number | null,
  engMinValue: null as number | null,
  engMaxValue: null as number | null,
  deadbandMode: 'none',
  deadbandValue: 0,
  deadbandPercent: 0,
  deadbandTime: 0,
  alarmEnabled: false,
  alarmHighHigh: null as number | null,
  alarmHigh: null as number | null,
  alarmLow: null as number | null,
  alarmLowLow: null as number | null,
  alarmDeviation: null as number | null,
  qualityCheckEnabled: false,
  maxAge: undefined as number | undefined,
  archiveEnabled: false,
  archiveInterval: undefined as number | undefined,
  retentionDays: undefined as number | undefined,
  description: '',
  category: '',
};

function openVarAddDialog() {
  editingVariableIndex.value = -1;
  varEditForm.value = {
    ...NEW_VARIABLE_DEFAULTS,
    guid: crypto.randomUUID(),
  };
  varEditError.value = '';
  showVarEditModal.value = true;
}

function closeVarEditModal() {
  showVarEditModal.value = false;
  varEditError.value = '';
}

async function handleDeleteVariable(v: DeviceTemplateVariable) {
  const tpl = selectedTemplate.value;
  if (!tpl) return;
  const confirmed = await showConfirm(
    t('system.deviceTemplate.deleteVariableConfirm', { name: v.name }),
    t('system.deviceTemplate.deleteVariable'),
  );
  if (!confirmed) return;
  try {
    const updated = tpl.variables.filter(vv => !(vv.order === v.order && vv.name === v.name));
    await templateStore.updateTemplate(tpl.id, { variables: updated }, locale.value);
    showSuccess(t('system.deviceTemplate.deleteVariableSuccess'));
    await refreshAll();
  } catch {
    showError(t('system.deviceTemplate.deleteVariableFailed'));
  }
}

async function submitVarEdit() {
  const tpl = selectedTemplate.value;
  if (!tpl) return;
  if (!varEditForm.value.name.trim()) {
    varEditError.value = t('system.deviceTemplate.errorNameRequired');
    return;
  }
  // 变量名校验：必须以字母/下划线/美元符开头，后续可包含字母数字下划线美元符
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(varEditForm.value.name.trim())) {
    varEditError.value = t('system.deviceTemplate.errorNameInvalid');
    return;
  }
  if (!varEditForm.value.address.trim()) {
    varEditError.value = t('system.deviceTemplate.errorAddressRequired');
    return;
  }
  if (!varEditForm.value.description.trim()) {
    varEditError.value = t('system.deviceTemplate.errorDescriptionRequired');
    return;
  }
  if (!varEditForm.value.category) {
    varEditError.value = t('system.deviceTemplate.errorCategoryRequired');
    return;
  }
  varEditSubmitting.value = true;
  try {
    const updated = [...tpl.variables];
    const idx = editingVariableIndex.value >= 0 ? editingVariableIndex.value : updated.length;
    if (idx < updated.length) {
      updated[idx] = { ...updated[idx], ...varEditForm.value };
    } else {
      updated.push({ ...varEditForm.value } as DeviceTemplateVariable);
    }
    // 调用更新接口
    await templateStore.updateTemplate(tpl.id, { variables: updated }, locale.value);
    showSuccess(t('system.deviceTemplate.saveSuccess'));
    closeVarEditModal();
    // 刷新模板数据
    await refreshAll();
  } catch (e: unknown) {
    const he = e as HttpError;
    varEditError.value = he?.response?.data?.message || t('system.deviceTemplate.saveFailed');
  } finally {
    varEditSubmitting.value = false;
  }
}

/** 目录变更后的公共处理 */
async function afterDirectoryChange() {
  await templateApi.rebuildIndex();
  const reloadRes = await templateApi.reload();
  showSuccess(t('system.deviceTemplate.reloadSuccess', { count: (reloadRes as { data?: { loaded?: number } })?.data?.loaded || 0 }));
  await loadLibrary();
  await refreshAll();
}

// ====== 数据加载 ======

/** 加载模板库数据（index + 已加载模板） */
async function loadLibrary() {
  libraryLoading.value = true;
  try {
    const [indexRes, loadedRes] = await Promise.all([
      templateApi.getIndex(locale.value),   // ✨ 传入当前语言
      templateApi.getLoaded(locale.value),  // ✨ 传入当前语言
    ]);
    // Axios response.data 得到后端响应体，getIndex 返回 { data: TemplateIndex, message, timestamp }
    // indexRes.data 即为 TemplateIndex 对象
    industryIndex.value = indexRes.data ?? null;
    loadedTemplates.value = Array.isArray(loadedRes.data) ? loadedRes.data : [];
  } catch {
    // API 不可用时静默
  } finally {
    libraryLoading.value = false;
  }
}

/** 刷新所有模板数据 */
async function refreshAll() {
  await fetchTemplates();
  await loadLibrary();
  // 如果当前选中的模板还在列表中，刷新其数据
  if (selectedTemplate.value) {
    const updated = allTemplates.value.find(t => t.id === selectedTemplate.value?.id);
    if (updated) {
      // 尝试从后端获取完整数据
      try {
        const res = await templateApi.getById(updated.id, locale.value);  // ✨ 传入 locale
        selectedTemplate.value = (res.data ?? res) as DeviceTemplate;
      } catch {
        selectedTemplate.value = updated;
      }
    }
  }
}

async function fetchTemplates() {
  loading.value = true;
  try {
    await templateStore.fetchTemplates(1, 1000, undefined, undefined, undefined, locale.value);  // ✨ 传入 locale
    templates.value = templateStore.templates;
  } catch (e: unknown) {
    const he = e as HttpError;
    if (!he._errorHandled) {
      showError(t('system.deviceTemplate.fetchFailed'));
    }
  } finally {
    loading.value = false;
  }
}

// ✨ 新增：监听语言切换
watch(locale, () => {
  refreshAll();
});

// ====== 生命周期 ======

onMounted(() => {
  loadLibrary();
  fetchTemplates();
  // 预加载变量编辑弹窗使用的字典（部分字典可能尚未创建，捕获异常避免控制台报错）
  loadDicts(['tagDataType', 'byteOrder', 'priority', 'conversionType', 'deadbandMode', 'deviceType', 'industry', 'variableCategory', 'templateStatus'], locale.value).catch(() => {});
});
</script>

<style scoped>
/* ===== 页面布局 ===== */
.template-library {
  height: 100%;
  display: flex;
  overflow: hidden;
}

/* ===== 左侧树 ===== */
.sidebar {
  width: 260px;
  min-width: 260px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 8px;
}

.sidebar-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.template-count {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--background);
  padding: 2px 8px;
  border-radius: 10px;
}

.sidebar-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.tb-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.tb-btn:hover {
  background: rgba(255,255,255,0.04);
  color: var(--text);
}

.tb-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 搜索框 */
.sidebar-search {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 12px;
  padding: 6px 10px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.sidebar-search svg {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.search-input {
  border: none;
  background: none;
  color: var(--text);
  font-size: 12px;
  outline: none;
  flex: 1;
  width: 100%;
}

/* 树区域 */
.sidebar-loading {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.industry-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 8px;
}

.tree-section-label {
  padding: 8px 16px 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-secondary);
  font-size: 13px;
  user-select: none;
}

.tree-node:hover {
  background: rgba(255,255,255,0.03);
  color: var(--text);
}

.tree-node.active {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  font-weight: 500;
}

.root-node {
  font-weight: 500;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  margin: 0 0 4px;
  padding: 8px 16px;
}

.group-node {
  font-weight: 500;
  color: var(--text);
}

.chevron {
  transition: transform 0.2s;
  flex-shrink: 0;
}

.chevron.rotated {
  transform: rotate(90deg);
}

.group-children {
  /* background: rgba(0,0,0,0.02); */
}

.category-node {
  padding-left: 36px;
  font-size: 12px;
}

.category-node svg:first-child {
  color: var(--status-warning);
}

.template-node {
  padding-left: 52px;
  font-size: 12px;
}

.template-node .node-label {
  font-weight: 400;
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
  background: var(--background);
  padding: 1px 6px;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.version-tag {
  font-size: 10px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

.empty-children {
  padding: 8px 16px 8px 52px;
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}

/* ===== 右侧主区域 ===== */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 模板信息头 */
.template-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.template-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.template-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* 模板元数据 */
.template-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  padding: 8px 20px 6px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 360px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-item svg {
  flex-shrink: 0;
  opacity: 0.6;
}

.meta-item.description {
  max-width: 480px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.version-badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-draft { background: rgba(107,114,128,0.1); color: var(--text-secondary); }
.status-published { background: color-mix(in srgb, var(--status-online) 10%, transparent); color: var(--status-online); }
.status-deprecated { background: color-mix(in srgb, var(--status-error) 10%, transparent); color: var(--status-error); }

.device-type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  font-size: 11px;
  border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  flex-shrink: 0;
}

/* 变量区域 */
.variables-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.variables-toolbar {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}

.variables-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  flex-shrink: 0;
}

.variable-count {
  color: var(--text-secondary);
  margin-left: 2px;
}

.variables-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

/* 变量搜索 */
.variables-search {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 300px;
  margin-left: auto;
}

.variables-search svg {
  flex-shrink: 0;
  color: var(--text-secondary);
  opacity: 0.5;
}

.search-input {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  background: var(--surface);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--primary);
}

.search-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

/* 表格 */
.table-wrapper {
  flex: 1;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  position: sticky;
  top: 0;
  background: var(--background);
  text-align: left;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.data-table td {
  padding: 7px 16px;
  font-size: 13px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.data-table tr:hover td {
  background: rgba(255,255,255,0.02);
}

.col-order {
  width: 40px;
  color: var(--text-secondary);
  text-align: center;
}

.col-name {
  font-weight: 500;
}

.col-address code {
  font-size: 12px;
  background: rgba(0,0,0,0.04);
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--text);
}

.col-scanrate,
.col-unit {
  color: var(--text-secondary);
  font-size: 12px;
}

.col-desc {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-muted {
  color: var(--text-secondary);
  font-size: 12px;
}

.badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.badge-read {
  background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
  color: var(--text-secondary);
}

.badge-write {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}

.col-direction {
  white-space: nowrap;
}

/* 启用状态圆点 */
.col-enabled {
  text-align: center;
  width: 50px;
}

.enabled-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--text-secondary) 40%, transparent);
  transition: background 0.2s;
}

.enabled-dot.active {
  background: var(--status-success);
  box-shadow: 0 0 4px var(--status-success);
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  gap: 12px;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

.empty-variables {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--text-secondary);
  gap: 8px;
}

.empty-variables p {
  margin: 0;
  font-size: 13px;
}

/* ===== Tooltip ===== */
.tb-btn[title]:not(:disabled):hover::after,
.btn-icon[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--text);
  color: var(--background);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  animation: tooltipFadeIn 0.15s ease-out;
}

.tb-btn[title]:not(:disabled):hover::before,
.btn-icon[title]:hover::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--text);
  pointer-events: none;
  z-index: 100;
}

@keyframes tooltipFadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}

/* ===== 弹窗 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--surface);
  border-radius: 10px;
  width: 640px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.15);
}

.modal-lg { width: 680px; }
.modal-sm { width: 400px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(128,128,128,0.15);
  background: linear-gradient(180deg, color-mix(in srgb, var(--primary) 3%, transparent) 0%, transparent 100%);
  border-radius: 10px 10px 0 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--text-secondary);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.15s ease;
  padding: 0;
  line-height: 1;
}
.modal-close:hover {
  color: var(--status-error);
  background: color-mix(in srgb, var(--status-error) 8%, transparent);
}

/* ===== 变量编辑弹窗 ===== */
.edit-section {
  margin-bottom: 12px;
  padding: 12px 14px 10px;
  border-radius: 8px;
  background: var(--bg-secondary, rgba(0,0,0,0.025));
  border: 1px solid rgba(128,128,128,0.15);
}
.edit-section:nth-child(even) {
  background: color-mix(in srgb, var(--primary) 2%, transparent);
  border-color: color-mix(in srgb, var(--primary) 10%, transparent);
}
.edit-section:last-child {
  margin-bottom: 0;
}
.edit-section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 3px solid var(--primary);
  line-height: 1.4;
  letter-spacing: 0.5px;
  opacity: 0.9;
}

.form-grid.cols-2 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 16px;
  align-items: start;
}

/* 复选框 — 紧凑内联风格 */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(128,128,128,0.2);
  background: linear-gradient(135deg, var(--surface) 0%, rgba(0,0,0,0.01) 100%);
  transition: all 0.15s ease;
  height: 32px;
  box-sizing: border-box;
}
.checkbox-label:hover {
  border-color: var(--primary);
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 6%, transparent) 0%, color-mix(in srgb, var(--primary) 2%, transparent) 100%);
  box-shadow: 0 1px 4px color-mix(in srgb, var(--primary) 10%, transparent);
}
.checkbox-label .form-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--primary);
  flex-shrink: 0;
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid rgba(128,128,128,0.15);
  background: linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--primary) 2%, transparent) 100%);
  border-radius: 0 0 10px 10px;
}

/* ===== 表单 ===== */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  line-height: 1.2;
}

.required {
  color: var(--status-error);
}

.form-input {
  padding: 7px 10px;
  border: 1px solid rgba(128,128,128,0.25);
  border-radius: 6px;
  background: var(--background);
  color: var(--text);
  font-size: 12px;
  outline: none;
  transition: all 0.15s ease;
}

.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent), inset 0 1px 2px rgba(0,0,0,0.03);
}

.form-input:hover:not(:focus) {
  border-color: rgba(128,128,128,0.4);
}

select.form-input {
  cursor: pointer;
}

.form-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.form-textarea {
  resize: vertical;
  font-family: monospace;
  font-size: 12px;
}

/* ===== 按钮 ===== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 0.2px;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 75%, black) 100%);
  color: var(--text);
  box-shadow: 0 1px 4px color-mix(in srgb, var(--primary) 30%, transparent);
}
.btn-primary:hover {
  box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 40%, transparent);
  transform: translateY(-1px);
}
.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px color-mix(in srgb, var(--primary) 20%, transparent);
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }
.btn-secondary {
  background: rgba(128,128,128,0.08);
  color: var(--text);
  border: 1px solid rgba(128,128,128,0.2);
}
.btn-secondary:hover {
  background: rgba(128,128,128,0.15);
  border-color: rgba(128,128,128,0.3);
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

/* 图标按钮 */
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

/* 表格操作列 */
.col-actions {
  width: 40px;
  text-align: center;
  white-space: nowrap;
}

/* ===== 右键菜单 ===== */
.context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
}

.context-menu-panel {
  position: fixed;
  min-width: 160px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  padding: 4px;
  z-index: 201;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.1s;
}

.context-item:hover {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

.context-danger:hover {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  color: var(--status-error);
}

.context-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 8px;
}

/* ===== 导入结果 ===== */
.import-result { margin-top: 12px; }
.alert {
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
}
.alert-success { background: color-mix(in srgb, var(--status-online) 10%, transparent); color: var(--status-online); border: 1px solid color-mix(in srgb, var(--status-online) 30%, transparent); }
.alert-warning { background: color-mix(in srgb, var(--status-warning) 10%, transparent); color: var(--status-warning); border: 1px solid color-mix(in srgb, var(--status-warning) 30%, transparent); }
</style>