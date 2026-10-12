<template>
  <div class="project-list">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          {{ $t('system.projects.title') }}
        </h1>
        <span
          v-if="!loading"
          class="project-count"
        >{{ $t('system.projects.projectCount', { count: store.pagination.total }) }}</span>
      </div>
      <!-- 启用状态过滤下拉：位于搜索框左侧，前端过滤当前页项目 -->
      <div class="filter-bar">
        <select
          v-model="enabledFilter"
          class="filter-select"
          :title="$t('system.projects.filterByEnabled')"
        >
          <option value="all">
            {{ $t('system.projects.filterAll') }}
          </option>
          <option value="enabled">
            {{ $t('system.projects.enabled') }}
          </option>
          <option value="disabled">
            {{ $t('system.projects.disabled') }}
          </option>
        </select>
      </div>
      <div class="search-bar">
        <svg
          class="search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
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
          v-model="keyword"
          type="text"
          :placeholder="$t('system.projects.searchPlaceholder')"
          class="search-input"
          @keyup.enter="handleSearch"
        >
      </div>
      <div class="header-actions">
        <button
          class="btn btn-secondary"
          :disabled="store.loading"
          :title="$t('system.projects.refresh')"
          @click="handleRefresh"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :class="{ spinning: store.loading }"
          ><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          {{ $t('system.projects.refresh') }}
        </button>
        <button
          class="btn btn-primary"
          @click="openCreateDialog"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
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
          {{ $t('system.projects.newProject') }}
        </button>
      </div>
    </div>

    <SsLoading
      v-if="store.loading"
      :text="$t('system.projects.loading')"
      size="small"
    />

    <div
      v-else-if="store.error"
      class="error-state"
    >
      <p>{{ store.error }}</p>
      <button
        class="btn btn-secondary"
        @click="handleSearch"
      >
        {{ $t('system.projects.retry') }}
      </button>
    </div>

    <div
      v-else-if="!store.hasProjects"
      class="empty-state"
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
      ><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
      <h3>{{ $t('system.projects.noProjects') }}</h3>
      <p>{{ $t('system.projects.noProjectsDesc') }}</p>
      <button
        class="btn btn-primary"
        @click="openCreateDialog"
      >
        {{ $t('system.projects.newProject') }}
      </button>
    </div>

    <div
      v-else
      class="project-grid"
    >
      <div
        v-for="project in displayProjects"
        :key="project.projectId"
        class="project-card"
        :class="[
          'accent-' + getAccentColor(project.projectName),
          { 'is-recent': isRecentlyUpdated(project.updatedAt), 'is-disabled': !project.enabled, 'is-enabled': project.enabled },
        ]"
        @click="openProject(project.projectId)"
      >
        <!-- 封面图：大图展示，无图时使用主题色渐变 + 首字母 -->
        <div class="card-cover">
          <img
            v-if="project.image"
            :src="projectApi.getImageUrl(project.projectId)"
            class="card-cover-img"
            :alt="project.projectName"
          >
          <div
            v-else
            class="card-cover-fallback"
            :class="'cover-accent-' + getAccentColor(project.projectName)"
          >
            <span class="cover-initial">{{ getInitial(project.projectName) }}</span>
          </div>
          <!-- 停用状态角标：项目未启用时不采集、不在设备树/设备监控显示 -->
          <span
            v-if="!project.enabled"
            class="cover-chip cover-chip-disabled"
            :title="$t('system.projects.disabledHint')"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
            ><circle
              cx="12"
              cy="12"
              r="10"
            /><line
              x1="4.93"
              y1="4.93"
              x2="19.07"
              y2="19.07"
            /></svg>
            {{ $t('system.projects.disabled') }}
          </span>
          <!-- 启用状态角标：项目正在采集 -->
          <span
            v-else
            class="cover-chip cover-chip-enabled"
            :title="$t('system.projects.enabledHint')"
          >
            <span class="enabled-dot" />
            {{ $t('system.projects.enabled') }}
          </span>
          <!-- 最近更新角标 -->
          <span
            v-if="isRecentlyUpdated(project.updatedAt)"
            class="cover-chip cover-chip-recent"
          >
            <span class="recent-dot" />
            {{ $t('system.projects.recentlyUpdated') }}
          </span>
          <!-- 默认项目角标 -->
          <span
            v-if="defaultProjectId === project.projectId"
            class="cover-chip cover-chip-default"
            :title="$t('system.projects.isDefault')"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
            ><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </span>
        </div>
        <div class="card-header">
          <div class="card-title-wrap">
            <h3
              class="card-title"
              :title="project.projectName"
            >
              {{ project.projectName }}
            </h3>
            <div class="card-subtitle">
              <span
                v-if="project.updatedAt"
                class="card-time"
              >{{ formatRelativeTime(project.updatedAt) }}</span>
            </div>
          </div>
          <div class="card-actions">
            <!-- 启用/停用快速切换：停用项目立即停止采集，启用项目立即开始采集 -->
            <button
              class="btn-icon"
              :class="{ 'btn-icon-warning': project.enabled }"
              :title="project.enabled ? $t('system.projects.disable') : $t('system.projects.enable')"
              @click.stop="handleToggleEnabled(project)"
            >
              <svg
                v-if="project.enabled"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><circle
                cx="12"
                cy="12"
                r="10"
              /><line
                x1="4.93"
                y1="4.93"
                x2="19.07"
                y2="19.07"
              /></svg>
              <svg
                v-else
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>
            </button>
            <button
              class="btn-icon"
              :title="$t('system.projects.edit')"
              @click.stop="openEditDialog(project)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              ><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button
              class="btn-icon btn-icon-danger"
              :title="$t('system.projects.delete')"
              @click.stop="confirmDelete(project)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              ><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        </div>
        <p
          v-if="project.description"
          class="card-desc"
          :title="project.description"
        >
          {{ project.description }}
        </p>
        <p
          v-else
          class="card-desc placeholder"
        >
          {{ $t('system.projects.noDescription') }}
        </p>
        <!-- 统计区：页面数 + 文件夹大小 + 版本 -->
        <div class="card-stats">
          <div class="stat-item">
            <span class="stat-value">{{ project.pageCount ?? 0 }}</span>
            <span class="stat-label">{{ $t('system.projects.pages') }}</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-value">{{ formatFileSize(project.folderSize) }}</span>
            <span class="stat-label">{{ $t('system.projects.folderSize') }}</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-value">{{ project.version || $t('system.projects.noVersion') }}</span>
            <span class="stat-label">{{ $t('system.projects.versionLabel') }}</span>
          </div>
        </div>
        <!-- 资源路径：精简参考信息 -->
        <div
          v-if="project.projectPath || project.databasePath"
          class="card-resources"
          :title="(project.projectPath || '') + '\n' + (project.databasePath || '')"
        >
          <div
            v-if="project.projectPath"
            class="resource-item"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            ><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
            <span class="resource-value">{{ shortenPath(project.projectPath) }}</span>
          </div>
          <div
            v-if="project.databasePath"
            class="resource-item"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            ><ellipse
              cx="12"
              cy="5"
              rx="9"
              ry="3"
            /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
            <span class="resource-value">{{ shortenPath(project.databasePath) }}</span>
          </div>
        </div>
        <div class="card-footer">
          <button
            class="btn btn-sm btn-ghost btn-manage"
            @click.stop="handleManage(project.projectId)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            ><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line
              x1="8"
              y1="13"
              x2="16"
              y2="13"
            /><line
              x1="8"
              y1="17"
              x2="16"
              y2="17"
            /></svg>
            {{ $t('system.projects.manage') }}
          </button>
          <button
            class="btn btn-sm btn-ghost btn-default"
            :class="{ 'is-active': defaultProjectId === project.projectId }"
            :title="defaultProjectId === project.projectId ? $t('system.projects.isDefault') : $t('system.projects.setDefault')"
            @click.stop="handleSetDefault(project.projectId)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              :stroke="defaultProjectId === project.projectId ? 'var(--primary)' : 'currentColor'"
              stroke-width="2"
              stroke-linecap="round"
            ><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            {{ defaultProjectId === project.projectId ? $t('system.projects.isDefaultShort') : $t('system.projects.setDefault') }}
          </button>
          <button
            class="btn btn-sm btn-primary btn-open"
            @click.stop="openProject(project.projectId)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            ><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line
              x1="10"
              y1="14"
              x2="21"
              y2="3"
            /></svg>
            {{ $t('system.projects.openEditor') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="store.hasProjects && store.pagination.totalPages > 1"
      class="pagination"
    >
      <button
        class="btn btn-secondary btn-sm"
        :disabled="store.pagination.page <= 1"
        @click="goToPage(store.pagination.page - 1)"
      >
        {{ $t('system.projects.prevPage') }}
      </button>
      <span class="page-info">
        {{ store.pagination.page }} / {{ store.pagination.totalPages }}
      </span>
      <button
        class="btn btn-secondary btn-sm"
        :disabled="!store.hasMore"
        @click="goToPage(store.pagination.page + 1)"
      >
        {{ $t('system.projects.nextPage') }}
      </button>
    </div>

    <div
      v-if="showCreateDialog"
      class="modal-overlay"
      @click.self="closeCreateDialog"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingProject ? $t('system.projects.editProject') : $t('system.projects.newProject') }}</h2>
          <button
            class="modal-close"
            @click="closeCreateDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">{{ $t('system.projects.coverImage') }}</label>
            <div class="image-upload-area">
              <div
                v-if="imagePreview"
                class="image-preview-wrapper"
              >
                <img
                  :src="imagePreview"
                  class="image-preview"
                  alt="cover"
                >
                <button
                  type="button"
                  class="image-remove-btn"
                  :title="$t('system.projects.removeImage')"
                  @click="handleImageRemove"
                >
                  &times;
                </button>
              </div>
              <label
                v-else
                class="image-upload-placeholder"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                ><rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                /><circle
                  cx="8.5"
                  cy="8.5"
                  r="1.5"
                /><path d="M21 15l-5-5L5 21" /></svg>
                <span>{{ $t('system.projects.uploadImageHint') }}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  class="image-file-input"
                  @change="handleImageSelect"
                >
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.projects.name') }} <span class="required">*</span></label>
            <input
              v-model="form.name"
              type="text"
              class="form-input"
              :class="{ 'form-input-disabled': editingProject }"
              :placeholder="$t('system.projects.namePlaceholder')"
              :disabled="!!editingProject"
              maxlength="100"
              @keyup.enter="handleSubmit"
            >
            <p
              v-if="editingProject"
              class="form-hint"
            >
              {{ $t('system.projects.nameReadonly') }}
            </p>
            <p
              v-else
              class="form-hint"
            >
              {{ $t('system.projects.nameHint') }}
            </p>
          </div>
          <div
            v-if="!editingProject"
            class="form-group"
          >
            <label class="form-label">{{ $t('system.projects.code') }}</label>
            <input
              v-model="form.pid"
              type="text"
              class="form-input"
              :placeholder="$t('system.projects.codePlaceholder')"
              maxlength="64"
            >
            <p class="form-hint">
              {{ $t('system.projects.codeHint') }}
            </p>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.projects.version') }}</label>
            <input
              v-model="form.version"
              type="text"
              class="form-input"
              :placeholder="$t('system.projects.versionPlaceholder')"
              maxlength="64"
            >
            <p class="form-hint">
              {{ $t('system.projects.versionHint') }}
            </p>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.projects.address') }}</label>
            <input
              v-model="form.address"
              type="text"
              class="form-input"
              :placeholder="$t('system.projects.addressPlaceholder')"
              maxlength="200"
            >
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ $t('system.projects.longitude') }}</label>
              <input
                v-model="form.longitude"
                type="text"
                class="form-input"
                :placeholder="$t('system.projects.longitudePlaceholder')"
                maxlength="20"
              >
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('system.projects.latitude') }}</label>
              <input
                v-model="form.latitude"
                type="text"
                class="form-input"
                :placeholder="$t('system.projects.latitudePlaceholder')"
                maxlength="20"
              >
            </div>
          </div>
          <!-- 地图选点：弹出地图点选经纬度，确认后自动反向地理编码填充地址 -->
          <div class="geocode-row">
            <button
              type="button"
              class="btn btn-secondary btn-sm btn-geocode"
              :disabled="geocoding"
              @click="showMapPicker = true"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle
                cx="12"
                cy="10"
                r="3"
              /></svg>
              {{ $t('system.projects.mapPickBtn') }}
            </button>
            <span
              v-if="geocoding"
              class="geocode-hint"
            >{{ $t('system.projects.geocoding') }}</span>
            <span
              v-else-if="geocodeHint"
              class="geocode-hint"
              :class="{ 'hint-success': geocodeOk, 'hint-error': !geocodeOk }"
            >{{ geocodeHint }}</span>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.projects.owner') }}</label>
            <input
              v-model="form.owner"
              type="text"
              class="form-input"
              :placeholder="$t('system.projects.ownerPlaceholder')"
              maxlength="64"
            >
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.projects.description') }}</label>
            <textarea
              v-model="form.description"
              class="form-input form-textarea"
              :placeholder="$t('system.projects.descPlaceholder')"
              rows="3"
            />
          </div>
          <!-- 启用状态开关：新建默认停用，启用后才开始数据采集；切换立即生效 -->
          <div class="form-group form-group-switch">
            <label class="form-label">{{ $t('system.projects.enabledLabel') }}</label>
            <div class="switch-row">
              <label class="switch">
                <input
                  v-model="form.enabled"
                  type="checkbox"
                >
                <span class="switch-slider" />
              </label>
              <span class="switch-label">
                {{ form.enabled ? $t('system.projects.enabled') : $t('system.projects.disabled') }}
              </span>
            </div>
            <p class="form-hint">
              {{ $t('system.projects.enabledFormHint') }}
            </p>
          </div>
          <p
            v-if="formSuccess"
            class="form-success"
          >
            {{ formSuccess }}
          </p>
          <p
            v-if="formError"
            class="form-error"
          >
            {{ formError }}
          </p>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeCreateDialog"
          >
            {{ $t('system.projects.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="submitting"
            @click="handleSubmit"
          >
            {{ submitting ? $t('system.projects.submitting') : (editingProject ? $t('system.projects.save') : $t('system.projects.create')) }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showDeleteDialog"
      class="modal-overlay"
      @click.self="closeDeleteDialog"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>{{ $t('system.projects.confirmDelete') }}</h2>
          <button
            class="modal-close"
            @click="closeDeleteDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <p>{{ $t('system.projects.confirmDeleteDesc') }} "<strong>{{ deletingProject?.projectName }}</strong>"？</p>
          <p class="warning-text">
            {{ $t('system.projects.deleteWarning') }}
          </p>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeDeleteDialog"
          >
            {{ $t('system.projects.cancel') }}
          </button>
          <button
            class="btn btn-danger"
            :disabled="submitting"
            @click="handleDelete"
          >
            {{ submitting ? $t('system.projects.deleting') : $t('system.projects.confirmDeleteBtn') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 地图选点弹窗 -->
    <MapPickerDialog
      v-model:visible="showMapPicker"
      :initial-lng="form.longitude"
      :initial-lat="form.latitude"
      @select="handleMapSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { useProjectStore } from '../../stores/project.store';
import { useProjectContext } from '../../composables/useProjectContext';
import { projectApi } from '../../api/modules/project.api';
import type { Project } from '../../types/api';
import { SsLoading } from '@scada-editor/shared';
import MapPickerDialog from './MapPickerDialog.vue';

const router = useRouter();
const store = useProjectStore();
const { t } = useI18n();
const { defaultProjectId, setDefaultProject: setDefault, clearDefaultProject: clearDefault, loadDefault } = useProjectContext();

const keyword = ref('');

/**
 * 启用状态过滤器
 * - 'all'      : 显示全部项目（默认）
 * - 'enabled'  : 仅显示已启用项目
 * - 'disabled' : 仅显示已停用项目
 *
 * 后端 GET /projects 暂未支持 enabled 过滤参数，这里在前端对当前页数据做过滤。
 * 当切换分页时过滤器仍然生效，保证用户筛选上下文不丢失。
 */
type EnabledFilter = 'all' | 'enabled' | 'disabled';
const enabledFilter = ref<EnabledFilter>('all');

/**
 * 按启用状态过滤后的项目列表
 * 直接基于 store.projects 做前端过滤，避免改动后端 API 与 store 签名
 */
const displayProjects = computed<Project[]>(() => {
  if (enabledFilter.value === 'all') return store.projects;
  if (enabledFilter.value === 'enabled') return store.projects.filter((p) => p.enabled);
  return store.projects.filter((p) => !p.enabled);
});
const showCreateDialog = ref(false);
const showDeleteDialog = ref(false);
const showMapPicker = ref(false);
const editingProject = ref<Project | null>(null);
const deletingProject = ref<Project | null>(null);
const submitting = ref(false);
const formError = ref('');
const formSuccess = ref('');
const loading = ref(false);
/** 用户选择的项目封面图片文件（新建时暂存，提交后上传） */
const imageFile = ref<File | null>(null);
/** 图片预览 URL（新建时用 object URL，编辑时用后端 URL） */
const imagePreview = ref('');
/** 反向地理编码加载状态 */
const geocoding = ref(false);
/** 反向地理编码结果提示 */
const geocodeHint = ref('');
/** 反向地理编码是否成功（用于提示样式） */
const geocodeOk = ref(false);
const form = ref({
  name: '',
  pid: '',
  version: '1.0.0',
  address: '',
  longitude: '',
  latitude: '',
  owner: '',
  description: '',
  /** 启用状态：新建默认停用（false），需手动启用后才开始数据采集 */
  enabled: false,
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

/** 相对时间：刚刚 / N分钟前 / N小时前 / N天前 / 绝对日期 */
function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const ONE_DAY = 86400000;
  if (diff < 0 || diff >= ONE_DAY * 7) return formatDate(dateStr);
  if (diff < 60000) return t('system.projects.justNow');
  if (diff < 3600000) {
    return t('system.projects.minutesAgo', { n: Math.floor(diff / 60000) });
  }
  if (diff < ONE_DAY) {
    return t('system.projects.hoursAgo', { n: Math.floor(diff / 3600000) });
  }
  return t('system.projects.daysAgo', { n: Math.floor(diff / ONE_DAY) });
}

/** 判断是否最近更新（24 小时内）—— 业务活跃度指标 */
function isRecentlyUpdated(dateStr?: string): boolean {
  if (!dateStr) return false;
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return false;
  return Date.now() - ts < 86400000;
}

/** 获取项目名称首字母（优先取英文首字母，否则取中文首字） */
function getInitial(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase();
}

/** 根据项目名哈希选取主题色（0-5 共 6 种） */
function getAccentColor(name: string): number {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 6;
}

/** 缩短长路径，仅保留最后 2 级目录 */
function shortenPath(p?: string): string {
  if (!p) return '';
  const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length <= 3) return p;
  return '.../' + parts.slice(-2).join('/');
}

/** 格式化文件大小：字节 → KB/MB/GB 自适应 */
function formatFileSize(bytes?: number): string {
  if (bytes == null || bytes < 0) return '-';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const idx = Math.min(i, units.length - 1);
  const val = bytes / Math.pow(1024, idx);
  // B 显示整数，其余保留 1 位小数
  return idx === 0 ? `${val} ${units[idx]}` : `${val.toFixed(1)} ${units[idx]}`;
}

function openProject(projectId: string) {
  const route = router.resolve(`/editor/${projectId}`);
  window.open(route.href, '_blank');
}

function openCreateDialog() {
  editingProject.value = null;
  form.value = {
    name: '',
    pid: '',
    version: '1.0.0',
    address: '',
    longitude: '',
    latitude: '',
    owner: '',
    description: '',
    // 新建项目默认停用，需手动启用后才开始数据采集
    enabled: false,
  };
  imageFile.value = null;
  imagePreview.value = '';
  formError.value = '';
  geocodeHint.value = '';
  showCreateDialog.value = true;
}

function openEditDialog(project: Project) {
  editingProject.value = project;
  form.value = {
    name: project.projectName,
    pid: project.projectId || '',
    version: project.version || '1.0.0',
    address: project.address || '',
    longitude: project.longitude || '',
    latitude: project.latitude || '',
    owner: project.owner || '',
    description: project.description || '',
    // 兼容旧 projectinfo.json 无 enabled 字段的情况，默认为停用
    enabled: project.enabled ?? false,
  };
  imageFile.value = null;
  imagePreview.value = project.image ? projectApi.getImageUrl(project.projectId) : '';
  formError.value = '';
  geocodeHint.value = '';
  showCreateDialog.value = true;
}

function closeCreateDialog() {
  showCreateDialog.value = false;
  editingProject.value = null;
  // 释放 object URL 避免内存泄漏
  if (imageFile.value && imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value);
  }
  imageFile.value = null;
  imagePreview.value = '';
}

/** 处理图片文件选择 */
function handleImageSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  // 校验文件类型
  if (!file.type.startsWith('image/')) {
    formError.value = t('system.projects.errorImageType');
    input.value = '';
    return;
  }
  // 校验文件大小（10MB）
  if (file.size > 10 * 1024 * 1024) {
    formError.value = t('system.projects.errorImageSize');
    input.value = '';
    return;
  }
  // 释放旧的 object URL
  if (imageFile.value && imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value);
  }
  imageFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
  formError.value = '';
}

/** 移除已选择的图片 */
function handleImageRemove() {
  if (imageFile.value && imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value);
  }
  imageFile.value = null;
  imagePreview.value = '';
}

/**
 * 反向地理编码：根据经纬度调用 OSM Nominatim 获取地址名称。
 * 公共端点限速 1 req/s，仅用于手动触发；accept-language=zh-CN 返回中文地址。
 * 数据来源 © OpenStreetMap 贡献者，遵循 ODbL 协议。
 */
async function reverseGeocode() {
  const lng = form.value.longitude.trim();
  const lat = form.value.latitude.trim();
  if (!lng || !lat) {
    geocodeOk.value = false;
    geocodeHint.value = t('system.projects.geocodeNeedCoords');
    return;
  }
  const decimalRe = /^-?\d+(\.\d+)?$/;
  if (!decimalRe.test(lng) || !decimalRe.test(lat)) {
    geocodeOk.value = false;
    geocodeHint.value = t('system.projects.errorLatLng');
    return;
  }
  geocoding.value = true;
  geocodeHint.value = '';
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=zh-CN&zoom=18`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (data && data.display_name) {
      // display_name 为完整地址字符串，截断到字段最大长度 200
      const name = String(data.display_name).slice(0, 200);
      form.value.address = name;
      geocodeOk.value = true;
      geocodeHint.value = t('system.projects.geocodeSuccess');
    } else {
      geocodeOk.value = false;
      geocodeHint.value = t('system.projects.geocodeNoResult');
    }
  } catch {
    geocodeOk.value = false;
    geocodeHint.value = t('system.projects.geocodeFailed');
  } finally {
    geocoding.value = false;
  }
}

/** 地图选点确认回调：填充经纬度并自动触发反向地理编码获取地址 */
function handleMapSelect(lng: number, lat: number) {
  // 保留 6 位小数，去除尾随 0
  form.value.longitude = String(Number(lng.toFixed(6)));
  form.value.latitude = String(Number(lat.toFixed(6)));
  // 选点后自动获取地址名称
  void reverseGeocode();
}

function confirmDelete(project: Project) {
  deletingProject.value = project;
  showDeleteDialog.value = true;
}

function closeDeleteDialog() {
  showDeleteDialog.value = false;
  deletingProject.value = null;
}

async function handleSubmit() {
  formError.value = '';
  formSuccess.value = '';
  if (!form.value.name.trim()) {
    formError.value = t('system.projects.errorNameEmpty');
    return;
  }
  // 项目代码格式校验（仅新建时填写了代码）
  if (!editingProject.value && form.value.pid.trim()) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(form.value.pid.trim())) {
      formError.value = t('system.projects.errorPidInvalid');
      return;
    }
  }
  // 经纬度格式校验（十进制数字）
  const lng = form.value.longitude.trim();
  const lat = form.value.latitude.trim();
  const decimalRe = /^-?\d+(\.\d+)?$/;
  if ((lng && !decimalRe.test(lng)) || (lat && !decimalRe.test(lat))) {
    formError.value = t('system.projects.errorLatLng');
    return;
  }

  submitting.value = true;
  try {
    if (editingProject.value) {
      await store.updateProject(editingProject.value.projectId, {
        description: form.value.description.trim() || undefined,
        version: form.value.version.trim() || undefined,
        address: form.value.address.trim() || undefined,
        longitude: form.value.longitude.trim() || undefined,
        latitude: form.value.latitude.trim() || undefined,
        owner: form.value.owner.trim() || undefined,
        enabled: form.value.enabled,
      });
      // 编辑时：如果用户选择了新图片，上传到服务器
      if (imageFile.value) {
        await projectApi.uploadImage(editingProject.value.projectId, imageFile.value);
      }
      formSuccess.value = t('system.projects.successSaved');
      setTimeout(() => {
        closeCreateDialog();
      }, 1500);
    } else {
      const project = await store.createProject({
        projectName: form.value.name.trim(),
        projectId: form.value.pid.trim() || undefined,
        version: form.value.version.trim() || undefined,
        address: form.value.address.trim() || undefined,
        longitude: form.value.longitude.trim() || undefined,
        latitude: form.value.latitude.trim() || undefined,
        owner: form.value.owner.trim() || undefined,
        description: form.value.description.trim() || undefined,
        enabled: form.value.enabled,
      });
      if (project) {
        // 新建时：项目创建成功后上传图片（如有）
        if (imageFile.value) {
          try {
            await projectApi.uploadImage(project.projectId, imageFile.value);
          } catch (imgErr) {
            // 图片上传失败不阻塞项目创建流程，仅提示
            console.warn('Project image upload failed:', imgErr);
          }
        }
        closeCreateDialog();
        router.push(`/editor/${project.projectId}`);
        return;
      }
    }
  } catch (e: any) {
    formError.value = editingProject.value
      ? t('system.projects.errorSaveFailed')
      : (e?.response?.data?.message || t('system.projects.errorGeneric'));
  } finally {
    submitting.value = false;
  }
}

async function handleDelete() {
  if (!deletingProject.value) return;

  submitting.value = true;
  try {
    await store.deleteProject(deletingProject.value.projectId);
    closeDeleteDialog();
  } catch (e: any) {
    formError.value = e?.response?.data?.message || t('system.projects.errorDelete');
  } finally {
    submitting.value = false;
  }
}

function handleSearch() {
  store.fetchProjects(1, 20, keyword.value || undefined, true);
}

function handleRefresh() {
  store.fetchProjects(store.pagination.page, store.pagination.pageSize, keyword.value || undefined, true);
}

function goToPage(page: number) {
  store.fetchProjects(page, store.pagination.pageSize, keyword.value || undefined, true);
}

function handleManage(projectId: string) {
  router.push(`/system/projects/${projectId}/manage`);
}

async function handleSetDefault(projectId: string) {
  // 切换：如果已是默认则清除，否则设为默认
  if (defaultProjectId.value === projectId) {
    await clearDefault();
  } else {
    await setDefault(projectId);
  }
}

/**
 * 切换项目启用状态
 *
 * 启用 → 后端立即开始该项目所有设备的数据采集
 * 停用 → 后端立即停止该项目所有设备的采集任务，并从设备树/设备监控中隐藏
 */
async function handleToggleEnabled(project: Project) {
  const targetEnabled = !project.enabled;
  try {
    await store.toggleProjectEnabled(project.projectId, targetEnabled);
  } catch (e: any) {
    formError.value = e?.response?.data?.message || t('system.projects.errorToggleEnabled');
    // 错误提示 3 秒后自动清除
    setTimeout(() => { formError.value = ''; }, 3000);
  }
}

onMounted(() => {
  // 项目管理页加载全部项目（包含停用项），便于切换启用状态
  store.fetchProjects(1, 20, undefined, true);
  loadDefault();
});
</script>

<style scoped>
.project-list {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.spinning {
  animation: spin 0.8s linear infinite;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.project-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.search-bar {
  position: relative;
  flex: 1;
  max-width: 360px;
  margin: 0 auto;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--border);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 6px 10px 6px 32px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: var(--border);
}

.search-input:focus {
  border-color: var(--primary);
}

/* ── 启用状态过滤下拉 ── */
.filter-bar {
  flex-shrink: 0;
}

.filter-select {
  height: 32px;
  padding: 0 28px 0 10px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  /* 用主题色箭头替代原生下拉箭头，保证跨平台视觉一致 */
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237a7a7a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 12px;
}

.filter-select:hover {
  border-color: var(--primary);
}

.filter-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  gap: 12px;
}

.empty-state svg {
  color: var(--border-light);
  margin-bottom: 8px;
}

.empty-state h3 {
  font-size: 18px;
  color: var(--text-secondary);
  margin: 0;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

/* 主题色由 .cover-accent-N 提供（封面渐变背景），见下方封面样式 */

.project-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 14px 12px;
  cursor: pointer;
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.project-card:hover {
  border-color: var(--primary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

/* 最近更新卡片：左侧主题色微光强调业务活跃度 */
.project-card.is-recent {
  border-color: color-mix(in srgb, var(--status-success) 40%, var(--border-light));
}
.project-card.is-recent::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: var(--status-success);
  opacity: 0.6;
}

/* 停用项目卡片：整体降饱和度 + 左侧红色微光条，提示该项目不采集/不在设备树显示 */
.project-card.is-disabled {
  opacity: 0.65;
  filter: saturate(0.6);
}
.project-card.is-disabled::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: var(--status-warning);
  opacity: 0.7;
  z-index: 1;
}
.project-card.is-disabled:hover {
  opacity: 0.85;
  filter: saturate(0.85);
}

.project-card:hover .card-actions {
  opacity: 1;
}

/* ===== 封面图：紧凑布局 — 小图 + 渐变回退 ===== */
.card-cover {
  position: relative;
  height: 88px;
  /* 负边距撑满卡片宽度（突破卡片内边距），顶部紧贴卡片上沿 */
  margin: -14px -14px 12px;
  overflow: hidden;
  background: var(--border-light);
}

.card-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.project-card:hover .card-cover-img {
  transform: scale(1.05);
}

.card-cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-initial {
  font-size: 36px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  letter-spacing: 1px;
  user-select: none;
}

/* 封面渐变背景（6 种主题色，比头像更饱和以适配大面积） */
.cover-accent-0 { background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, black)); }
.cover-accent-1 { background: linear-gradient(135deg, var(--status-success), color-mix(in srgb, var(--status-success) 55%, black)); }
.cover-accent-2 { background: linear-gradient(135deg, var(--status-warning), color-mix(in srgb, var(--status-warning) 55%, black)); }
.cover-accent-3 { background: linear-gradient(135deg, var(--status-error), color-mix(in srgb, var(--status-error) 55%, black)); }
.cover-accent-4 { background: linear-gradient(135deg, var(--status-info, var(--primary)), color-mix(in srgb, var(--status-info, var(--primary)) 55%, black)); }
.cover-accent-5 { background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, black)); }

/* 封面角标（半透明胶囊，叠在封面右上/左上） */
.cover-chip {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  letter-spacing: 0.2px;
}

.cover-chip-recent {
  /* 最近更新角标放在左下角，避免与左上角的启用/停用角标重叠 */
  bottom: 6px;
  left: 6px;
  color: var(--status-success);
}

/* 停用状态角标：左上角，橙红填充背景 + 白色文字，对比强烈 */
.cover-chip-disabled {
  top: 6px;
  left: 6px;
  color: #fff;
  background: var(--status-warning);
  border: 1px solid color-mix(in srgb, var(--status-warning) 70%, white);
}

/* 启用状态角标：左上角，绿色填充背景 + 白色文字，表示项目正在采集 */
.cover-chip-enabled {
  top: 6px;
  left: 6px;
  color: #fff;
  background: var(--status-success);
  border: 1px solid color-mix(in srgb, var(--status-success) 70%, white);
}

.enabled-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.9);
  animation: pulse 2s ease-in-out infinite;
}

.cover-chip-default {
  top: 6px;
  right: 6px;
  color: var(--primary);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.35;
}

.card-subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card-time {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.75;
}

.recent-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--status-success);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.btn-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: 5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--border-light);
  color: var(--text);
}

.btn-icon-danger:hover {
  background: var(--status-error);
  border-color: var(--status-error);
  color: var(--text);
}

/* 启用状态切换按钮：当前启用时高亮为警告色，提示点击会停用采集 */
.btn-icon-warning {
  color: var(--status-warning);
  border-color: color-mix(in srgb, var(--status-warning) 40%, var(--border-light));
}

.btn-icon-warning:hover {
  background: var(--status-warning);
  border-color: var(--status-warning);
  color: var(--text);
}

.card-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 17px;
}

.card-desc.placeholder {
  color: var(--border);
  font-style: italic;
  opacity: 0.7;
}

/* ===== 统计区：紧凑型 ===== */
.card-stats {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 8px;
  padding: 6px 8px;
  background: var(--background, var(--border-light));
  border-radius: 7px;
  border: 1px solid var(--border-light);
}

.stat-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  opacity: 0.75;
  letter-spacing: 0.3px;
}

.stat-divider {
  width: 1px;
  height: 22px;
  background: var(--border-light);
  margin: 0 6px;
  flex-shrink: 0;
}

.card-resources {
  margin-top: auto;
  padding-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  color: var(--text-secondary);
  overflow: hidden;
  opacity: 0.55;
  transition: opacity 0.2s;
}

.project-card:hover .resource-item {
  opacity: 0.8;
}

.resource-item svg {
  flex-shrink: 0;
  color: var(--border);
}

.resource-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 9px;
}

.card-footer {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--border-light);
  color: var(--text);
  border-color: var(--border);
}

.btn-manage {
  flex: 1;
  justify-content: center;
}

.btn-open {
  flex: 1.5;
  justify-content: center;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--surface);
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 70px;
  text-align: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.4;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: var(--text);
}

.btn-primary:hover:not(:disabled) {
  background: var(--button-hover);
}

.btn-secondary {
  background: var(--border-light);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border);
}

.btn-danger {
  background: var(--status-error);
  color: var(--text);
}

.btn-danger:hover:not(:disabled) {
  background: var(--status-error);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-sm {
  width: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 0;
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 14px 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 14px;
}

.form-group {
  margin-bottom: 10px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
  min-width: 0;
}

/* 反向地理编码按钮行 */
.geocode-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.btn-geocode {
  flex-shrink: 0;
}

.geocode-hint {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.geocode-hint.hint-success {
  color: var(--status-success);
}

.geocode-hint.hint-error {
  color: var(--status-error);
}

/* 项目封面图片上传区域 */
.image-upload-area {
  width: 100%;
}

.image-preview-wrapper {
  position: relative;
  width: 100%;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface-secondary);
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.image-remove-btn:hover {
  background: rgba(0, 0, 0, 0.85);
}

.image-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 120px;
  border: 2px dashed var(--border);
  border-radius: 8px;
  background: var(--surface-secondary);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
  font-size: 12px;
}

.image-upload-placeholder:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.image-file-input {
  display: none;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.required {
  color: var(--status-error);
}

.form-input {
  width: 100%;
  padding: 7px 10px;
  background: var(--background);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: var(--border);
}

.form-input:focus {
  border-color: var(--primary);
}

.form-input-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--border-light);
}

.form-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

/* ===== 启用状态开关（toggle switch） ===== */
.form-group-switch {
  padding: 8px 10px;
  background: var(--background, var(--border-light));
  border: 1px solid var(--border-light);
  border-radius: 7px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* 滑块：未选中=灰色靠左，选中:绿色靠右 */
.switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--border);
  border-radius: 20px;
  transition: background 0.25s;
}

.switch-slider::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 3px;
  bottom: 3px;
  background: var(--text);
  border-radius: 50%;
  transition: transform 0.25s;
}

.switch input:checked + .switch-slider {
  background: var(--status-success);
}

.switch input:checked + .switch-slider::before {
  transform: translateX(16px);
}

.switch-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
}

.form-textarea {
  resize: vertical;
  min-height: 50px;
}

.form-success {
  color: var(--status-success);
  font-size: 12px;
  margin: -6px 0 0 0;
}

.form-error {
  color: var(--status-error);
  font-size: 12px;
  margin: -6px 0 0 0;
}

.warning-text {
  color: var(--status-warning);
  font-size: 13px;
  margin: 8px 0 0 0;
}
</style>