<template>
  <div class="device-list-view">
    <!-- 左侧：项目/分组/设备 三级树 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">{{ $t('system.devices.deviceTree') }}</span>
        <div class="sidebar-header-actions">
          <button
            class="btn-refresh"
            :disabled="loading"
            :title="$t('system.devices.refresh')"
            @click="handleRefresh"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              :class="{ spinning: loading }"
            ><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          </button>
          <button
            v-if="projectId"
            class="btn-add-group"
            :title="$t('system.devices.newGroup')"
            @click="openCreateGroupDialog"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
            /><line
              x1="5"
              y1="12"
              x2="19"
              y2="12"
            /></svg>
          </button>
        </div>
      </div>
      <div class="sidebar-tree">
        <div
          v-if="projectStore.projects.length === 0"
          class="tree-empty"
        >
          {{ $t('system.devices.noProjects') }}
        </div>
        <template
          v-for="proj in projectStore.projects"
          :key="proj.projectId"
        >
          <!-- 项目节点 -->
          <div
            class="tree-node project-node"
            :class="{
              expanded: expandedProjects.has(proj.projectId),
              active: projectId === proj.projectId && !selectedGroupId && !selectedDeviceId
            }"
            @click="selectProject(proj.projectId)"
          >
            <svg
              class="chevron"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              :class="{ rotated: expandedProjects.has(proj.projectId) }"
              @click.stop="toggleProject(proj.projectId)"
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
            <span class="node-label">{{ proj.projectName }}</span>
            <span class="node-count">{{ getProjectDeviceCount(proj.projectId) }}</span>
          </div>

          <!-- 展开后的分组和设备 -->
          <div
            v-if="expandedProjects.has(proj.projectId)"
            class="project-children"
          >
            <!-- 加载中 -->
            <div
              v-if="loadingGroups.has(proj.projectId)"
              class="tree-loading"
            >
              {{ $t('common.loading') }}
            </div>
            <!-- 递归分组树 -->
            <template
              v-for="group in getTopLevelGroups(proj.projectId)"
              v-else
              :key="group.id"
            >
              <GroupTreeNode
                :group="group"
                :project-id="proj.projectId"
                :depth="1"
                :expanded-groups="expandedGroups"
                :selected-group-id="selectedGroupId"
                :selected-device-id="selectedDeviceId"
                :group-device-cache="groupDeviceCache"
                :group-tree-cache="projectGroupTrees"
                @toggle-group="toggleGroupNode"
                @select-group="selectGroupNode"
                @select-device="selectDeviceNode"
                @edit-group="openEditGroupDialog"
                @delete-group="confirmDeleteGroup"
              />
            </template>
            <!-- 无分组时的设备 -->
            <div
              v-if="getTopLevelGroups(proj.projectId).length === 0 && !loadingGroups.has(proj.projectId)"
              class="tree-empty-small"
            >
              {{ $t('system.devices.noGroups') }}
            </div>
          </div>
        </template>
      </div>
    </aside>

    <!-- 右侧：主内容区 -->
    <div class="main-content">
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">
            {{ $t('system.devices.title') }}
          </h1>
          <span class="device-count">{{ $t('system.devices.deviceCount', { count: total }) }}</span>
        </div>
        <div class="toolbar">
          <div class="search-box">
            <svg
              class="search-icon"
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
              v-model="searchQuery"
              type="text"
              class="search-input"
              :placeholder="$t('system.devices.searchPlaceholder')"
              @keyup.enter="handleSearch"
            >
            <button
              class="search-btn"
              :title="$t('system.devices.search')"
              @click="handleSearch"
            >
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
            </button>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="btn btn-primary"
            :disabled="!projectId"
            @click="openCreateDialog"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
            /><line
              x1="5"
              y1="12"
              x2="19"
              y2="12"
            /></svg>
            {{ $t('system.devices.addDevice') }}
          </button>
        </div>
      </div>

      <div
        v-if="!projectId"
        class="empty-state"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        ><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
        <h3>{{ $t('system.devices.selectProjectFirst') }}</h3>
        <p>{{ $t('system.devices.selectProjectFirstDesc') }}</p>
      </div>

      <SsLoading
        v-else-if="loading && devices.length === 0"
        :text="$t('system.devices.loading')"
        size="small"
      />

      <div
        v-else-if="devices.length === 0"
        class="empty-state"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        ><rect
          x="2"
          y="3"
          width="20"
          height="14"
          rx="2"
        /><line
          x1="8"
          y1="21"
          x2="16"
          y2="21"
        /><line
          x1="12"
          y1="17"
          x2="12"
          y2="21"
        /></svg>
        <h3>{{ $t('system.devices.noDevices') }}</h3>
        <p>{{ $t('system.devices.noDevicesDesc') }}</p>
        <button
          class="btn btn-primary"
          @click="openCreateDialog"
        >
          {{ $t('system.devices.addDevice') }}
        </button>
      </div>

      <SmartTable
        v-else
        table-id="device-list"
        :data="devices"
        :columns="deviceColumns"
        :loading="loading"
        :pagination="devicePaginationConfig"
        show-column-toggle
        show-export
        :show-refresh="true"
        :empty-text="$t('system.devices.noDevices')"
        @page-change="onDevicePageChange"
        @refresh="fetchData"
      >
        <template #cell-deviceCode="{ row }">
          <div class="cell-primary">
            {{ row.deviceName }}
          </div>
          <code class="device-code">{{ deviceDeviceCode(row) }}</code>
        </template>
        <template #cell-name="{ row }">
          <span class="type-badge">{{ driverLabel(row.driver) }}</span>
          <span
            class="type-badge"
            style="margin-left:4px"
          >{{ deviceTypeLabel(row.type) }}</span>
          <div class="cell-group">
            {{ groupName(row.groupId) }}
          </div>
        </template>
        <template #cell-templateName="{ row }">
          <span
            v-if="row.templateId"
            class="template-badge"
            :title="getTemplateName(row.templateId)"
          >{{ getTemplateName(row.templateId) }}</span>
          <span
            v-else
            class="template-empty"
          >{{ $t('system.devices.noTemplate') }}</span>
        </template>
        <template #cell-status="{ row }">
          <span
            class="status-badge"
            :class="'status-' + row.status"
            :title="row.status === 'error' ? $t('system.devices.dblclickForErrorDetail') : ''"
            @dblclick="row.status === 'error' && showErrorDetail(row)"
          >
            {{ deviceStatusLabel(row.status) }}
          </span>
        </template>
        <template #cell-actions="{ row }">
          <div class="row-actions">
            <button
              class="btn-icon"
              :title="$t('system.devices.viewData')"
              @click="openDataPanel(row)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-5" /></svg>
            </button>
            <button
              class="btn-icon"
              :title="$t('system.devices.moveToGroup')"
              @click="openMoveDialog(row)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              class="btn-icon"
              :title="$t('common.edit')"
              @click="editDevice(row)"
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
            <button
              v-if="row.templateId"
              class="btn-icon"
              :title="$t('system.devices.syncTemplate')"
              :disabled="syncingDeviceIds.has(row.id)"
              @click="handleSyncTemplate(row)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                :class="{ spinning: syncingDeviceIds.has(row.id) }"
              ><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            </button>
            <button
              class="btn-icon btn-icon-danger"
              :title="$t('common.delete')"
              @click="confirmDelete(row)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        </template>
      </SmartTable>
    </div>

    <DeviceFormDialog
      :visible="formDialogVisible"
      :device="editingTarget"
      :project-id="projectId"
      :default-group-id="editingTarget ? undefined : selectedGroupId"
      @update:visible="formDialogVisible = $event"
      @submit="handleSubmit"
    />

    <div
      v-if="showDeleteDialog"
      class="modal-overlay"
      @click.self="showDeleteDialog = false"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>{{ $t('system.devices.confirmDelete') }}</h2>
          <button
            class="modal-close"
            @click="showDeleteDialog = false"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <p>{{ $t('system.devices.deleteConfirmMessage', { name: deletingDevice?.deviceName }) }}</p>
          <p class="warning-text">
            {{ $t('system.devices.deleteWarning') }}
          </p>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="showDeleteDialog = false"
          >
            {{ $t('system.devices.cancel') }}
          </button>
          <button
            class="btn btn-danger"
            :disabled="submitting"
            @click="handleDelete"
          >
            {{ $t('system.devices.confirmDeleteBtn') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 分组创建/编辑对话框 -->
    <div
      v-if="showGroupDialog"
      class="modal-overlay"
      @click.self="closeGroupDialog"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>{{ isEditingGroup ? $t('system.devices.editGroup') : $t('system.devices.newGroup') }}</h2>
          <button
            class="modal-close"
            @click="closeGroupDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">{{ $t('system.devices.groupName') }} <span class="required">*</span></label>
            <input
              v-model="groupForm.name"
              type="text"
              class="form-input"
              :placeholder="$t('system.devices.groupNamePlaceholder')"
              @keyup.enter="handleGroupSubmit"
            >
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.devices.parentGroup') }}</label>
            <select
              v-model="groupForm.parentId"
              class="form-input form-select"
            >
              <option value="">
                {{ $t('system.devices.noParent') }}
              </option>
              <option
                v-for="g in availableParentGroups"
                :key="g.id"
                :value="g.id"
              >
                {{ g.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.devices.description') }}</label>
            <input
              v-model="groupForm.description"
              type="text"
              class="form-input"
              :placeholder="$t('system.devices.groupDescPlaceholder')"
            >
          </div>
          <p
            v-if="groupFormError"
            class="form-error"
          >
            {{ groupFormError }}
          </p>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeGroupDialog"
          >
            {{ $t('system.devices.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="submitting"
            @click="handleGroupSubmit"
          >
            {{ submitting ? $t('system.devices.creating') : (isEditingGroup ? $t('system.devices.save') : $t('system.devices.create')) }}
          </button>
        </div>
      </div>
    </div>

    <!-- 分组删除确认对话框 -->
    <div
      v-if="showDeleteGroupDialog"
      class="modal-overlay"
      @click.self="showDeleteGroupDialog = false"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>{{ $t('system.devices.deleteGroupTitle') }}</h2>
          <button
            class="modal-close"
            @click="showDeleteGroupDialog = false"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <p>{{ $t('system.devices.deleteGroupConfirmMessage', { name: deletingGroup?.name }) }}</p>
          <p class="warning-text">
            {{ $t('system.devices.deleteGroupWarning') }}
          </p>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="showDeleteGroupDialog = false"
          >
            {{ $t('system.devices.cancel') }}
          </button>
          <button
            class="btn btn-danger"
            :disabled="submitting"
            @click="handleDeleteGroup"
          >
            {{ $t('system.devices.confirmDeleteBtn') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 移动设备到分组对话框 -->
    <div
      v-if="showMoveDialog"
      class="modal-overlay"
      @click.self="closeMoveDialog"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>{{ $t('system.devices.moveToGroupTitle') }}</h2>
          <button
            class="modal-close"
            @click="closeMoveDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <p class="move-device-name">
            {{ movingDevice?.deviceName }}
          </p>
          <p class="move-hint">
            {{ $t('system.devices.moveToGroupHint') }}
          </p>
          <div class="move-group-list">
            <div
              class="move-group-item"
              :class="{ selected: moveTargetGroupId === '' }"
              @click="moveTargetGroupId = ''"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><rect
                x="3"
                y="3"
                width="7"
                height="7"
              /><rect
                x="14"
                y="3"
                width="7"
                height="7"
              /><rect
                x="14"
                y="14"
                width="7"
                height="7"
              /><rect
                x="3"
                y="14"
                width="7"
                height="7"
              /></svg>
              <span>{{ $t('system.devices.ungrouped') }}</span>
            </div>
            <div
              v-for="item in flattenedGroupOptions"
              :key="item.id"
              class="move-group-item"
              :class="{ selected: moveTargetGroupId === item.id }"
              :style="{ paddingLeft: (16 + item.depth * 20) + 'px' }"
              @click="moveTargetGroupId = item.id"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              <span>{{ item.name }}</span>
            </div>
            <div
              v-if="flattenedGroupOptions.length === 0"
              class="tree-empty-small"
            >
              {{ $t('system.devices.noGroups') }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeMoveDialog"
          >
            {{ $t('system.devices.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="submitting"
            @click="handleMoveDevice"
          >
            {{ submitting ? $t('system.devices.submitting') : $t('system.devices.moveToGroupConfirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 设备点表数据查看面板 -->
    <DeviceDataPanel
      :visible="showDataPanel"
      :device="dataPanelDevice"
      :project-id="projectId"
      @update:visible="showDataPanel = $event"
    />

    <!-- 设备错误详情面板 -->
    <div
      v-if="showErrorPanel"
      class="modal-overlay"
      @click.self="showErrorPanel = false"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>{{ $t('system.devices.errorDetailTitle') }}</h2>
          <button
            class="modal-close"
            @click="showErrorPanel = false"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="error-info">
            <div class="error-info-row">
              <span class="error-info-label">{{ $t('system.devices.deviceName') }}</span>
              <span class="error-info-value">{{ errorPanelDevice?.deviceName || '-' }}</span>
            </div>
            <div class="error-info-row">
              <span class="error-info-label">{{ $t('common.deviceCode') }}</span>
              <span class="error-info-value mono">{{ errorPanelDevice?.deviceCode || '-' }}</span>
            </div>
            <div class="error-info-row">
              <span class="error-info-label">{{ $t('system.devices.driver') }}</span>
              <span class="error-info-value">{{ errorPanelDevice?.driver || '-' }}</span>
            </div>
            <div class="error-info-divider" />
            <div class="error-info-row">
              <span class="error-info-label">{{ $t('system.deviceMonitor.status') }}</span>
              <span
                class="status-badge"
                :class="'status-' + (errorPanelDevice?.status || 'offline')"
              >{{ deviceStatusLabel(errorPanelDevice?.status || 'offline') }}</span>
            </div>
            <div class="error-info-row">
              <span class="error-info-label">{{ $t('system.deviceMonitor.errorCount') }}</span>
              <span class="error-info-value">
                <span
                  class="error-pill"
                  :class="{ 'error-pill-active': (errorPanelDevice?.errorCount ?? 0) > 0 }"
                >{{ errorPanelDevice?.errorCount ?? 0 }}</span>
              </span>
            </div>
            <div
              v-if="errorPanelDevice?.lastErrorMsg"
              class="error-message-card"
            >
              <div class="error-message-title">
                {{ $t('system.devices.errorMessage') }}
              </div>
              <pre class="error-message-content">{{ errorPanelDevice.lastErrorMsg }}</pre>
            </div>
            <div
              v-else
              class="error-message-card error-message-card-empty"
            >
              <span class="error-message-empty">{{ $t('system.devices.noErrorMessage') }}</span>
            </div>
            <!-- 采集诊断数据 -->
            <div
              v-if="errorPanelDevice?._diagnostics"
              class="error-info-divider"
            />
            <div
              v-if="errorPanelDevice?._diagnostics"
              class="error-info-diagnostics"
            >
              <div class="diagnostics-title">
                {{ $t('system.devices.diagnosticsTitle') }}
              </div>
              <div
                v-if="errorPanelDevice._diagnostics.circuitState"
                class="error-info-row"
              >
                <span class="error-info-label">{{ $t('system.devices.circuitState') }}</span>
                <span
                  class="diagnostics-value"
                  :class="'circuit-' + errorPanelDevice._diagnostics.circuitState"
                >{{ $t('system.devices.circuitState_' + errorPanelDevice._diagnostics.circuitState) }}</span>
              </div>
              <div
                v-if="errorPanelDevice._diagnostics.consecutiveFailures != null"
                class="error-info-row"
              >
                <span class="error-info-label">{{ $t('system.devices.consecutiveFailures') }}</span>
                <span class="error-info-value">{{ errorPanelDevice._diagnostics.consecutiveFailures }}</span>
              </div>
              <div
                v-if="errorPanelDevice._diagnostics.retryCount != null"
                class="error-info-row"
              >
                <span class="error-info-label">{{ $t('system.devices.retryCount') }}</span>
                <span class="error-info-value">{{ errorPanelDevice._diagnostics.retryCount }}</span>
              </div>
              <div
                v-if="errorPanelDevice._diagnostics.lastErrorAt"
                class="error-info-row"
              >
                <span class="error-info-label">{{ $t('system.devices.lastErrorAt') }}</span>
                <span class="error-info-value mono">{{ formatDate(errorPanelDevice._diagnostics.lastErrorAt) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="showErrorPanel = false"
          >
            {{ $t('common.close') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import { useI18n } from '@scada-editor/core';
import { useDeviceStore } from '../../stores/device.store';
import { useProjectStore } from '../../stores/project.store';
import type { Device, DeviceGroup, DeviceTree, DeviceSummary } from '../../types/api';
import type { DeviceTemplateListResult } from '../../api/modules/template.api';
import type { CreateDeviceDto, UpdateDeviceDto } from '../../api/modules/device.api';
import DeviceFormDialog from './components/DeviceFormDialog.vue';
import GroupTreeNode from './components/GroupTreeNode.vue';
import DeviceDataPanel from './components/DeviceDataPanel.vue';
import { showConfirm, showError, showSuccess } from '../../utils/messageBox';
import { SmartTable } from '../../components/smart-table';
import type { SmartTableColumn, PageChangeEvent, PaginationConfig } from '../../components/smart-table';
import { templateApi } from '../../api/modules/template.api';
import { SsLoading } from '@scada-editor/shared';
import { useProjectContext } from '../../composables/useProjectContext';

/** 树节点中的分组信息（来自 DeviceTree.group 的非完整字段） */
interface TreeGroup {
  id: string;
  name: string;
  sortOrder: number;
  parentId?: string;
}

const { t } = useI18n();
const deviceStore = useDeviceStore();
const projectStore = useProjectStore();

const projectId = ref('');
const selectedGroupId = ref('');
const selectedDeviceId = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(20);
const formDialogVisible = ref(false);
const editingTarget = ref<Device | null>(null);
const showDeleteDialog = ref(false);
const deletingDevice = ref<Device | null>(null);
const submitting = ref(false);
const syncingDeviceIds = ref(new Set<string>());

// 分组对话框
const showGroupDialog = ref(false);
const isEditingGroup = ref(false);
const editingGroup = ref<DeviceGroup | null>(null);
const groupForm = ref({ name: '', description: '', parentId: '' });
const groupFormError = ref('');
const showDeleteGroupDialog = ref(false);
const deletingGroup = ref<DeviceGroup | null>(null);

// 树展开状态
const expandedProjects = ref(new Set<string>());
const expandedGroups = ref(new Set<string>());
const loadingGroups = ref(new Set<string>());

// 设备点表数据查看面板
const showDataPanel = ref(false);
const dataPanelDevice = ref<Device | null>(null);

function openDataPanel(device: Device) {
  dataPanelDevice.value = device;
  showDataPanel.value = true;
}

// 设备错误详情面板
const showErrorPanel = ref(false);
const errorPanelDevice = ref<Device | null>(null);

function showErrorDetail(device: Device) {
  errorPanelDevice.value = device;
  showErrorPanel.value = true;
}

// 缓存项目分组树数据: projectId -> groupTree
const projectGroupTrees = ref<Map<string, DeviceTree[]>>(new Map());
// 缓存项目设备列表: `${projectId}::${groupId}` -> DeviceSummary[]
const groupDeviceCache = ref<Map<string, DeviceSummary[]>>(new Map());

// 模板 ID -> 名称 映射（用于列表展示设备绑定的模板名称）
const templateNameMap = ref<Map<string, string>>(new Map());

async function loadTemplateNames() {
  try {
    const res = await templateApi.list({ page: 1, pageSize: 1000 });
    const result: DeviceTemplateListResult = res.data;
    const list = result?.data || [];
    const map = new Map<string, string>();
    for (const tpl of list) {
      if (tpl?.id) map.set(String(tpl.id), tpl.name || tpl.id);
    }
    templateNameMap.value = map;
  } catch {
    // 静默失败，不影响设备列表展示
  }
}

function getTemplateName(templateId?: string): string {
  if (!templateId) return '';
  return templateNameMap.value.get(String(templateId)) || templateId;
}

const devices = computed(() => deviceStore.devices);
const loading = computed(() => deviceStore.loading);
const total = computed(() => deviceStore.pagination.total);
const _totalPages = computed(() => deviceStore.pagination.totalPages);

function deviceDeviceCode(device: Device): string {
  return device.deviceCode || device.id;
}

function formatDate(epochMs: number): string {
  if (!epochMs) return '-';
  return new Date(epochMs).toLocaleString();
}

function _deviceNameAlias(device: Device): string {
  return device.nameAlias || '';
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  modbus_tcp: t('system.devices.deviceTypes.modbus_tcp'),
  modbus_rtu: t('system.devices.deviceTypes.modbus_rtu'),
  opc_ua: t('system.devices.deviceTypes.opc_ua'),
  mqtt: t('system.devices.deviceTypes.mqtt'),
};

const DEVICE_STATUS_LABELS: Record<string, string> = {
  offline: t('system.devices.statusOffline'),
  connecting: t('system.devices.statusConnecting'),
  online: t('system.devices.statusOnline'),
  degraded: t('system.devices.statusDegraded'),
  error: t('system.devices.statusError'),
};

function deviceTypeLabel(type: string): string {
  return DEVICE_TYPE_LABELS[type] || type;
}

function deviceStatusLabel(status: string): string {
  return DEVICE_STATUS_LABELS[status] || status;
}

const DRIVER_LABELS: Record<string, string> = {
  modbus: t('system.devices.deviceTypes.modbus_tcp'),
  opcua: t('system.devices.deviceTypes.opc_ua'),
  mqtt: t('system.devices.deviceTypes.mqtt'),
  s7: 'S7',
  virtual: t('system.devices.driverVirtual'),
};

function driverLabel(driver?: string): string {
  if (!driver) return '-';
  return DRIVER_LABELS[driver] || driver;
}

function groupName(groupId?: string): string {
  if (!groupId || !projectId.value) return t('system.devices.noGroup');
  const groups = getProjectGroups(projectId.value);
  const group = groups.find((g) => g.id === groupId);
  return group?.name || t('system.devices.noGroup');
}

function _channelConfigLabel(connection?: Record<string, unknown>): string {
  if (!connection) return '-';
  const protocol = connection.protocol || connection.type || '';
  const host = connection.host || '';
  const port = connection.port || '';
  if (protocol && host) {
    return `${protocol}://${host}${port ? ':' + port : ''}`;
  }
  return '-';
}

function formatTime(val?: string | number | Date | null): string {
  if (!val && val !== 0) return '-';
  try {
    let d: Date;
    if (val instanceof Date) {
      d = val;
    } else if (typeof val === 'number') {
      // 数字时间戳（毫秒）
      d = new Date(val);
    } else if (typeof val === 'string') {
      // SQLite 存储的日期格式 "YYYY-MM-DD HH:MM:SS" 无时区标记
      // JavaScript 的 new Date() 会按本地时区解析，导致 UTC 时间显示偏差
      // 检测此格式并视为 UTC 处理
      const sqliteMatch = val.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
      if (sqliteMatch) {
        d = new Date(`${sqliteMatch[1]}T${sqliteMatch[2]}Z`);
      } else {
        d = new Date(val);
      }
    } else {
      return '-';
    }
    if (isNaN(d.getTime())) return '-';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  } catch {
    return '-';
  }
}

function formatPeriod(ms?: number): string {
  if (ms == null || ms <= 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function handleSearch() {
  currentPage.value = 1;
  fetchData();
}

function _goToPage(page: number) {
  currentPage.value = page;
  fetchData();
}

// SmartTable column definitions
const deviceColumns = computed<SmartTableColumn<Device>[]>(() => [
  { key: 'deviceCode', title: t('common.deviceCode'), dataKey: 'deviceName', required: true },
  { key: 'name', title: t('system.devices.name'), dataKey: 'type', required: true },
  { key: 'status', title: t('system.devices.status'), dataKey: 'status' },
  { key: 'scanRate', title: t('system.devices.collectPeriod'), dataKey: 'scanRate', render: (v) => formatPeriod(v as number), defaultVisible: false },
  { key: 'offlinePeriod', title: t('system.devices.offlinePeriodLabel'), dataKey: 'offlinePeriod', render: (v) => formatPeriod(v as number), defaultVisible: false },
  { key: 'lastOnlineAt', title: t('system.devices.lastOnline'), dataKey: 'lastOnlineAt', render: (v) => formatTime(v as string) },
  { key: 'lastDataAt', title: t('system.devices.lastData'), dataKey: 'lastDataAt', render: (v) => formatTime(v as string) },
  { key: 'createdAt', title: t('system.devices.createdAt'), dataKey: 'createdAt', render: (v) => formatTime(v as string), defaultVisible: false },
  { key: 'updatedAt', title: t('system.devices.updatedAt'), dataKey: 'updatedAt', render: (v) => formatTime(v as string) },
  { key: 'updatedBy', title: t('system.devices.updatedBy'), dataKey: 'updatedBy', defaultVisible: false },
  { key: 'driver', title: t('system.devices.driver'), dataKey: 'driver' },
  { key: 'templateName', title: t('system.devices.templateName'), dataKey: 'templateId' },
  { key: 'templateVersion', title: t('system.devices.templateVersion'), dataKey: 'templateVersion' },
  { key: 'templateBoundAt', title: t('system.devices.templateBoundAt'), dataKey: 'templateAppliedAt', render: (v) => formatTime(v as string) },
  { key: 'actions', title: t('system.devices.actions'), dataKey: 'id', required: true },
]);

const devicePaginationConfig = computed<PaginationConfig>(() => ({
  page: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  mode: 'server',
}));

function onDevicePageChange(event: PageChangeEvent) {
  if (event.pageSize && event.pageSize !== pageSize.value) {
    pageSize.value = event.pageSize;
    currentPage.value = 1;
  } else {
    currentPage.value = event.page;
  }
  fetchData();
}

async function fetchData() {
  if (!projectId.value) return;
  await deviceStore.fetchDevices(projectId.value, currentPage.value, pageSize.value, searchQuery.value || undefined);
}

/** 定时静默刷新（更新 lastOnlineAt / lastDataAt 等实时字段） */
const REFRESH_INTERVAL_MS = 30000; // 30秒
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => {
    if (projectId.value) {
      deviceStore.silentRefreshDevices(projectId.value, currentPage.value, pageSize.value, searchQuery.value || undefined);
    }
  }, REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function openCreateDialog() {
  if (!projectId.value) {
    showError(t('system.devices.selectProjectFirst'));
    return;
  }
  editingTarget.value = null;
  formDialogVisible.value = true;
}

function editDevice(device: Device) {
  editingTarget.value = device;
  formDialogVisible.value = true;
}

async function handleSyncTemplate(device: Device) {
  if (!projectId.value || !device.templateId) return;
  const confirmed = await showConfirm(
    t('system.devices.syncTemplateConfirm', { name: device.deviceName }),
    t('system.devices.syncTemplate'),
  );
  if (!confirmed) return;
  const deviceId = device.id;
  syncingDeviceIds.value = new Set([...syncingDeviceIds.value, deviceId]);
  try {
    await deviceStore.syncDeviceTemplate(projectId.value, deviceId, device.templateId);
    showSuccess(t('system.devices.syncTemplateSuccess'));
    await fetchData();
    await loadTemplateNames();
  } catch {
    showError(t('system.devices.syncTemplateFailed'));
  } finally {
    const next = new Set(syncingDeviceIds.value);
    next.delete(deviceId);
    syncingDeviceIds.value = next;
  }
}

async function handleSubmit(dto: CreateDeviceDto, resolve?: () => void) {
  if (!projectId.value) {
    showError(t('system.devices.selectProjectFirst'));
    formDialogVisible.value = false;
    resolve?.();
    return;
  }
  try {
    if (editingTarget.value) {
      await deviceStore.updateDevice(projectId.value, editingTarget.value.id, dto as UpdateDeviceDto);
    } else {
      await deviceStore.createDevice(projectId.value, {
        deviceCode: dto.deviceCode,
        deviceName: dto.deviceName,
        nameAlias: dto.nameAlias,
        description: dto.description || '',
        type: dto.type,
        templateId: dto.templateId,
        driver: dto.driver,
        groupId: dto.groupId,
        connection: dto.connection,
        scanRate: dto.scanRate,
        offlinePeriod: dto.offlinePeriod,
      });
    }
    formDialogVisible.value = false;
    await fetchData();
    if (projectId.value) {
      await loadProjectTree(projectId.value);
    }
    resolve?.();
  } catch (e: unknown) {
    const err = e as { _errorHandled?: boolean; response?: { data?: { message?: string; details?: Array<{ field?: string; message?: string }> } }; message?: string };
    if (!err._errorHandled) {
      const respData = err?.response?.data;
      let msg = respData?.message || err?.message || deviceStore.error || '操作失败';
      if (respData?.details && Array.isArray(respData.details)) {
        const detailMsgs = respData.details.map((d) => {
          if (d.field && d.message) {
            return `${d.field}: ${d.message}`;
          }
          return d.message || String(d);
        }).join('\n');
        msg = `${msg}\n\n${t('system.devices.errorDetail')}\n${detailMsgs}`;
      }
      if (import.meta.env.DEV) console.error('[DeviceListView] submit error:', msg);
      showError(msg);
    }
    resolve?.();
  }
}

function confirmDelete(device: Device) {
  deletingDevice.value = device;
  showDeleteDialog.value = true;
}

async function handleDelete() {
  if (!deletingDevice.value) return;
  submitting.value = true;
  try {
    await deviceStore.deleteDevice(projectId.value, deletingDevice.value.id);
    showDeleteDialog.value = false;
    await fetchData();
    if (projectId.value) {
      await loadProjectTree(projectId.value);
    }
  } catch {
    // error handled by store
  } finally {
    submitting.value = false;
  }
}

// ===== 分组管理 =====

// 父分组候选列表（编辑时排除自己）
const availableParentGroups = computed(() => {
  if (!projectId.value) return [];
  const allGroups = getProjectGroups(projectId.value);
  if (!isEditingGroup.value || !editingGroup.value) return allGroups;
  return allGroups.filter((g) => g.id !== editingGroup.value!.id);
});

function openCreateGroupDialog() {
  isEditingGroup.value = false;
  editingGroup.value = null;
  groupForm.value = { name: '', description: '', parentId: selectedGroupId.value || '' };
  groupFormError.value = '';
  showGroupDialog.value = true;
}

function openEditGroupDialog(group: DeviceGroup) {
  isEditingGroup.value = true;
  editingGroup.value = group;
  groupForm.value = {
    name: group.name || '',
    description: group.description || '',
    parentId: group.parentId || '',
  };
  groupFormError.value = '';
  showGroupDialog.value = true;
}

function closeGroupDialog() {
  showGroupDialog.value = false;
  isEditingGroup.value = false;
  editingGroup.value = null;
}

async function handleGroupSubmit() {
  groupFormError.value = '';
  if (!groupForm.value.name.trim()) {
    groupFormError.value = t('system.devices.errorGroupNameEmpty');
    return;
  }
  if (!projectId.value) {
    groupFormError.value = t('system.devices.errorNoProject');
    return;
  }

  submitting.value = true;
  try {
    if (isEditingGroup.value && editingGroup.value) {
      await deviceStore.updateGroup(projectId.value, editingGroup.value.id, {
        name: groupForm.value.name.trim(),
        description: groupForm.value.description.trim() || undefined,
        parentId: groupForm.value.parentId || undefined,
      });
    } else {
      await deviceStore.createGroup(projectId.value, {
        name: groupForm.value.name.trim(),
        description: groupForm.value.description.trim() || undefined,
        parentId: groupForm.value.parentId || undefined,
      });
    }
    closeGroupDialog();
    if (projectId.value) {
      await loadProjectTree(projectId.value);
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    groupFormError.value = err?.response?.data?.message
      || (isEditingGroup.value ? t('system.devices.errorUpdateGroupFailed') : t('system.devices.errorCreateGroupFailed'));
  } finally {
    submitting.value = false;
  }
}

function confirmDeleteGroup(group: DeviceGroup) {
  deletingGroup.value = group;
  showDeleteGroupDialog.value = true;
}

async function handleDeleteGroup() {
  if (!deletingGroup.value) return;
  submitting.value = true;
  try {
    await deviceStore.deleteGroup(projectId.value, deletingGroup.value.id);
    showDeleteGroupDialog.value = false;
    if (projectId.value) {
      await loadProjectTree(projectId.value);
    }
  } catch {
    // error handled by store
  } finally {
    submitting.value = false;
  }
}

// ===== 移动设备到分组 =====

const showMoveDialog = ref(false);
const movingDevice = ref<Device | null>(null);
const moveTargetGroupId = ref<string>('');

interface FlatGroupOption {
  id: string;
  name: string;
  depth: number;
}

// 将分组树展平为带层级的列表，用于移动对话框中的分组选择
const flattenedGroupOptions = computed<FlatGroupOption[]>(() => {
  if (!projectId.value) return [];
  const raw = projectGroupTrees.value.get(projectId.value);
  const tree: DeviceTree[] = Array.isArray(raw) ? raw : [];
  const result: FlatGroupOption[] = [];
  function flatten(items: DeviceTree[], depth: number) {
    for (const item of items) {
      if (item.group) {
        result.push({ id: item.group.id, name: item.group.name, depth });
      }
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        flatten(item.children, depth + 1);
      }
    }
  }
  flatten(tree, 0);
  return result;
});

function openMoveDialog(device: Device) {
  if (!projectId.value) {
    showError(t('system.devices.selectProjectFirst'));
    return;
  }
  movingDevice.value = device;
  // 当前 groupId 作为默认选中（空字符串表示未分组）
  moveTargetGroupId.value = device.groupId || '';
  showMoveDialog.value = true;
}

function closeMoveDialog() {
  showMoveDialog.value = false;
  movingDevice.value = null;
  moveTargetGroupId.value = '';
}

async function handleMoveDevice() {
  if (!movingDevice.value || !projectId.value) return;
  submitting.value = true;
  try {
    const targetId = moveTargetGroupId.value || null;
    await deviceStore.moveDevice(projectId.value, movingDevice.value.id, targetId);
    showMoveDialog.value = false;
    showSuccess(t('system.devices.moveSuccess'));
    // 刷新设备列表和分组树
    await fetchData();
    if (projectId.value) {
      await loadProjectTree(projectId.value);
    }
  } catch (e: unknown) {
    const err = e as { _errorHandled?: boolean; response?: { data?: { message?: string } } };
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || t('system.devices.errorGeneric'));
    }
  } finally {
    submitting.value = false;
  }
}

// ===== 侧边栏树操作 =====

async function loadProjectTree(projId: string) {
  loadingGroups.value.add(projId);
  try {
    await deviceStore.fetchGroupTree(projId);
    const raw = deviceStore.groupTree;
    const treeData: DeviceTree[] = Array.isArray(raw) ? raw : [];
    projectGroupTrees.value.set(projId, treeData);

    // 递归收集所有 treeItem 的设备缓存，并自动展开所有有内容的分组
    const collectTreeItems = (items: DeviceTree[]) => {
      for (const item of items) {
        if (item.group) {
          const key = `${projId}::${item.group.id}`;
          groupDeviceCache.value.set(key, Array.isArray(item.devices) ? item.devices : []);
          // 有子分组时自动展开该分组（设备在右侧表格展示，不在此树中显示）
          if (item.children && item.children.length > 0) {
            expandedGroups.value.add(item.group.id);
          }
        }
        if (item.children && Array.isArray(item.children)) {
          collectTreeItems(item.children);
        }
      }
    };
    collectTreeItems(treeData);

    // 未分组设备
    const allDevices = Array.isArray(deviceStore.devices) ? deviceStore.devices : [];
    groupDeviceCache.value.set(`${projId}::__unassigned__`, allDevices.filter((d) => !d.groupId));
  } catch (err: unknown) {
    if (import.meta.env.DEV) console.warn('[DeviceList] loadProjectTree failed:', err);
    showError(t('common.loadError'));
  } finally {
    loadingGroups.value.delete(projId);
  }
}

async function selectProject(projId: string) {
  if (projectId.value === projId && expandedProjects.value.has(projId)) {
    // 再次点击同一个项目：折叠
    expandedProjects.value.delete(projId);
    stopAutoRefresh();
    return;
  }

  projectId.value = projId;
  selectedGroupId.value = '';
  selectedDeviceId.value = '';
  currentPage.value = 1;

  if (!expandedProjects.value.has(projId)) {
    expandedProjects.value.add(projId);
    await loadProjectTree(projId);
  }

  await fetchData();
  startAutoRefresh();
}

function toggleProject(projId: string) {
  if (expandedProjects.value.has(projId)) {
    expandedProjects.value.delete(projId);
    stopAutoRefresh();
  } else {
    expandedProjects.value.add(projId);
    if (projectId.value === projId) {
      loadProjectTree(projId);
    } else {
      projectId.value = projId;
      selectedGroupId.value = '';
      selectedDeviceId.value = '';
      currentPage.value = 1;
      loadProjectTree(projId).then(() => {
        fetchData();
        startAutoRefresh();
      });
    }
  }
}

function toggleGroupNode(groupId: string) {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId);
  } else {
    expandedGroups.value.add(groupId);
  }
}

function selectGroupNode(projId: string, groupId: string) {
  projectId.value = projId;
  selectedGroupId.value = groupId;
  selectedDeviceId.value = '';
  currentPage.value = 1;
  fetchData();
}

function selectDeviceNode(projId: string, groupId: string, deviceId: string) {
  projectId.value = projId;
  selectedGroupId.value = groupId;
  selectedDeviceId.value = deviceId;
  // 这里可以导航到设备详情或高亮
}

function getTopLevelGroups(projId: string): TreeGroup[] {
  const raw = projectGroupTrees.value.get(projId);
  const tree: DeviceTree[] = Array.isArray(raw) ? raw : [];
  // 后端 tree 的顶层元素即为根分组，group 对象中包含 parentId
  // 多级分组通过 children 递归渲染
  return tree.map((t) => t.group).filter((g): g is TreeGroup => g !== null && typeof g === 'object' && 'id' in g);
}

// 从树结构中递归收集所有分组对象
function getProjectGroups(projId: string): TreeGroup[] {
  const raw = projectGroupTrees.value.get(projId);
  const tree: DeviceTree[] = Array.isArray(raw) ? raw : [];
  const result: TreeGroup[] = [];
  function collect(items: DeviceTree[]) {
    for (const item of items) {
      if (item.group) result.push(item.group);
      if (item.children && Array.isArray(item.children)) {
        collect(item.children);
      }
    }
  }
  collect(tree);
  return result;
}

function _getGroupDevices(projId: string, groupId: string): DeviceSummary[] {
  const raw = groupDeviceCache.value.get(`${projId}::${groupId}`);
  return Array.isArray(raw) ? raw : [];
}

function getProjectDeviceCount(projId: string): number {
  const raw = projectGroupTrees.value.get(projId);
  const tree: DeviceTree[] = Array.isArray(raw) ? raw : [];
  let count = 0;
  for (const t of tree) {
    count += (t.devices || []).length;
  }
  return count;
}

function _getGroupDeviceCount(projId: string, groupId: string): number {
  const raw = groupDeviceCache.value.get(`${projId}::${groupId}`);
  const devs: DeviceSummary[] = Array.isArray(raw) ? raw : [];
  return devs.length;
}

async function handleRefresh() {
  await projectStore.fetchProjects();
  // 刷新所有已展开项目的树数据
  for (const projId of expandedProjects.value) {
    await loadProjectTree(projId);
  }
  // 刷新当前项目设备列表
  if (projectId.value) {
    await fetchData();
  }
}

onMounted(async () => {
  // 设备树只需要启用项目；不复用项目管理页可能缓存的全量列表（含停用项目）
  await projectStore.fetchProjects();
  // 加载设备模板名称映射（用于列表"设备模板"列展示）
  loadTemplateNames();
  // 优先使用默认项目，否则选中第一个
  if (projectStore.projects.length > 0 && !projectId.value) {
    const { loadDefault } = useProjectContext();
    const defaultId = await loadDefault();
    if (defaultId && projectStore.projects.some(p => p.projectId === defaultId)) {
      selectProject(defaultId);
    } else {
      const firstProj = projectStore.projects[0];
      selectProject(firstProj.projectId);
    }
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});

// P1优化：keep-alive 缓存场景下，页面切换时停止/恢复定时器，避免泄漏
onDeactivated(() => {
  stopAutoRefresh();
});

onActivated(() => {
  if (projectId.value) {
    startAutoRefresh();
  }
});
</script>

<style scoped>
.device-list-view {
  height: 100%;
  display: flex;
  overflow: hidden;
}

/* ===== 侧边栏 ===== */
.sidebar {
  width: 240px;
  min-width: 240px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overflow-x: auto;
  background: var(--surface);
}

.sidebar-title {
  padding: 16px 16px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  flex-shrink: 0;
}

.sidebar-header .sidebar-title {
  padding: 0;
}

.btn-add-group {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.btn-add-group:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
}

.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-refresh {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.btn-refresh:hover:not(:disabled) {
  color: var(--primary);
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
}

.btn-refresh:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-refresh .spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.group-actions {
  display: flex;
  gap: 2px;
  opacity: 1;
  transition: opacity 0.15s;
}

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

.btn-tree-action:hover {
  color: var(--text);
  background: var(--border-light);
}

.btn-tree-action-danger:hover {
  color: var(--status-error);
  background: rgba(220, 38, 38, 0.12);
  border-color: var(--status-error);
}

.sidebar-tree {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 4px 0;
}

.tree-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.tree-empty-small {
  padding: 8px 16px 8px 48px;
  font-size: 12px;
  color: var(--text-secondary);
}

.tree-loading {
  padding: 8px 16px 8px 36px;
  font-size: 12px;
  color: var(--text-secondary);
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
  color: var(--text);
}

.tree-node:hover { background: var(--border-light); }
.tree-node.active { background: rgba(59, 130, 246, 0.12); color: var(--primary); }

.project-node { font-weight: 600; padding: 7px 12px; }
.device-node { font-size: 12px; }

.chevron {
  flex-shrink: 0;
  transition: transform 0.2s;
  color: var(--text-secondary);
}

.chevron.rotated { transform: rotate(90deg); }

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

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.status-online { background: var(--status-online); }
.status-dot.status-offline { background: var(--status-offline); }
.status-dot.status-connecting { background: var(--primary); }
.status-dot.status-degraded { background: var(--status-warning); }
.status-dot.status-error { background: var(--status-error); }

.project-children {
  border-left: 1px solid var(--border);
  margin-left: 19px;
}

.group-children {
  border-left: 1px solid var(--border);
  margin-left: 43px;
}

/* ===== 主内容区 ===== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* SmartTable 填充剩余空间，表格内容溢出时显示横向+纵向滚动条 */
.main-content > :deep(.smart-table-root) {
  flex: 1;
  min-height: 0;
  margin: 0 24px 16px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px 12px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.device-count {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.toolbar {
  flex: 1;
  max-width: 480px;
  margin: 0 auto;
  flex-shrink: 0;
}

.search-box {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 36px 7px 36px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input::placeholder { color: var(--text-secondary); }
.search-input:focus { border-color: var(--primary); }

.search-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.search-btn:hover {
  color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  gap: 12px;
}

.empty-state h3 { font-size: 18px; color: var(--text); margin: 0; }
.empty-state p { margin: 0; font-size: 14px; }

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.cell-primary { font-weight: 600; color: var(--text); margin-bottom: 2px; }
.cell-group { font-size: 11px; color: var(--text-secondary); margin-top: 4px; }

.device-code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--primary);
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.template-badge {
  display: inline-block;
  max-width: 180px;
  padding: 3px 10px;
  background: color-mix(in srgb, var(--chart-5) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--chart-5) 20%, transparent);
  border-radius: 4px;
  font-size: 12px;
  color: var(--chart-5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.template-empty {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.status-online { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.status-offline { background: color-mix(in srgb, var(--status-offline) 15%, transparent); color: var(--status-offline); }
.status-connecting { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.status-degraded { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
.status-error { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }

.row-actions {
  display: flex;
  gap: 4px;
  opacity: 1;
  transition: opacity 0.15s;
}

.btn-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  color: var(--text);
  background: var(--border-light);
}

.btn-icon-danger:hover {
  color: var(--status-error);
  background: rgba(220, 38, 38, 0.12);
  border-color: var(--status-error);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.5;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: var(--button-text); }
.btn-primary:hover:not(:disabled) { background: var(--button-hover); }
.btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover:not(:disabled) { background: var(--border-light); }
.btn-danger { background: var(--status-error); color: var(--button-text); }
.btn-danger:hover:not(:disabled) { opacity: 0.9; }
.btn-sm { padding: 6px 12px; font-size: 13px; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--background);
  border-radius: 12px;
  width: 90%;
  max-width: 540px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
}

.modal-sm { width: 400px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-header h2 { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }

.modal-close {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 20px;
}

.modal-close:hover { color: var(--text); background: var(--border-light); }

.modal-body { padding: 20px; overflow-y: auto; }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

.warning-text {
  color: var(--status-warning);
  font-size: 13px;
  margin: 8px 0 0 0;
}

.form-group { margin-bottom: 14px; }

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}

.required { color: var(--status-error); }

.form-input {
  width: 100%;
  padding: 9px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input::placeholder { color: var(--text-secondary); }
.form-input:focus { border-color: var(--primary); }

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 20px;
  padding-right: 32px;
}

.form-select option {
  background: var(--background);
  color: var(--text);
}

.form-textarea {
  resize: vertical;
  min-height: 48px;
}

.form-error {
  color: var(--status-error);
  font-size: 13px;
  margin: -4px 0 0 0;
}

/* ===== 移动设备到分组对话框 ===== */
.move-device-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.move-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
}

.move-group-list {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px;
}

.move-group-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  transition: background 0.15s;
}

.move-group-item:hover {
  background: var(--border-light);
}

.move-group-item.selected {
  background: rgba(59, 130, 246, 0.12);
  color: var(--primary);
  font-weight: 500;
}

/* ===== 错误详情面板 ===== */
.error-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.error-info-label {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 80px;
}

.error-info-value {
  font-size: 13px;
  color: var(--text);
  text-align: right;
  word-break: break-all;
}

.error-info-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.error-message-card {
  margin-top: 8px;
  padding: 12px;
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 6px;
}

.error-message-card-empty {
  background: var(--border-light);
  border-color: var(--border);
}

.error-message-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--status-error);
  margin-bottom: 6px;
}

.error-message-content {
  font-size: 12px;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
}

.error-message-empty {
  font-size: 12px;
  color: var(--text-secondary);
}

.error-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  background: var(--border-light);
  color: var(--text-secondary);
}

.error-pill-active {
  background: rgba(220, 38, 38, 0.12);
  color: var(--status-error);
}

/* ===== 采集诊断 ===== */
.error-info-diagnostics {
  margin-top: 4px;
}

.diagnostics-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.diagnostics-value {
  font-size: 13px;
  font-weight: 500;
}

.diagnostics-value.circuit-open {
  color: var(--status-error);
}

.diagnostics-value.circuit-half-open {
  color: var(--status-warning);
}

.diagnostics-value.circuit-closed {
  color: var(--status-online);
}
</style>