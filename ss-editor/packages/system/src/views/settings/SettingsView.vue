<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.settings.title') }}
      </h1>
      <div class="header-actions">
        <div class="locale-select-wrapper">
          <select
            v-model="locale"
            class="locale-select"
          >
            <option value="zh-CN">
              {{ $t('system.settings.langZhCN') }}
            </option>
            <option value="en-US">
              {{ $t('system.settings.langEnUS') }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 标签页导航 -->
    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'appearance' }"
        @click="switchTab('appearance')"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <circle
            cx="12"
            cy="12"
            r="3"
          /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        {{ $t('system.settings.tabAppearance') }}
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'config' }"
        @click="switchTab('config')"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <circle
            cx="12"
            cy="12"
            r="3"
          /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        {{ $t('system.settings.tabConfig') }}
      </button>
    </div>

    <!-- 外观与布局 -->
    <div
      v-if="activeTab === 'appearance'"
      class="tab-content"
    >
      <div class="settings-grid">
        <div class="settings-card">
          <div class="card-header">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <circle
                cx="12"
                cy="12"
                r="3"
              /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <h3>{{ $t('system.settings.appearance') }}</h3>
          </div>
          <div class="card-body">
            <div class="theme-selector">
              <label class="theme-label">{{ $t('system.settings.selectTheme') }}</label>
              <select
                v-model="selectedTheme"
                class="theme-select"
                @change="handleThemeChange"
              >
                <option
                  v-for="theme in availableThemes"
                  :key="theme"
                  :value="theme"
                >
                  {{ $t(`system.layout.theme.${themeNameToCamel(theme)}`) }}
                </option>
              </select>
            </div>
            <div class="theme-preview">
              <div class="preview-header">
                {{ $t('system.settings.themePreview') }}
              </div>
              <div class="preview-colors">
                <div
                  class="color-dot primary"
                  :style="{ background: colors.primary }"
                  :title="$t('system.settings.primaryColor')"
                />
                <div
                  class="color-dot secondary"
                  :style="{ background: colors.secondary }"
                  :title="$t('system.settings.secondaryColor')"
                />
                <div
                  class="color-dot accent"
                  :style="{ background: colors.accent }"
                  :title="$t('system.settings.accentColor')"
                />
                <div
                  class="color-dot success"
                  :style="{ background: colors.success }"
                  :title="$t('system.settings.success')"
                />
                <div
                  class="color-dot warning"
                  :style="{ background: colors.warning }"
                  :title="$t('system.settings.warning')"
                />
                <div
                  class="color-dot error"
                  :style="{ background: colors.error }"
                  :title="$t('system.settings.error')"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="card-header">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <h3>{{ $t('system.settings.themeInfo') }}</h3>
          </div>
          <div class="card-body">
            <div class="theme-info">
              <div class="info-row">
                <span class="info-label">{{ $t('system.settings.currentTheme') }}</span><span class="info-value">{{ currentThemeName }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ $t('system.settings.primaryColor') }}</span><span
                  class="info-value color-value"
                  :style="{ color: colors.primary }"
                >{{ colors.primary }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ $t('system.settings.backgroundColor') }}</span><span
                  class="info-value color-value"
                  :style="{ color: colors.background }"
                >{{ colors.background }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ $t('system.settings.textColor') }}</span><span
                  class="info-value color-value"
                  :style="{ color: colors.text }"
                >{{ colors.text }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card full-width">
          <div class="card-header">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
              /><line
                x1="3"
                y1="9"
                x2="21"
                y2="9"
              /><line
                x1="9"
                y1="3"
                x2="9"
                y2="21"
              />
            </svg>
            <h3>{{ $t('system.settings.layoutConfig') }}</h3>
          </div>
          <div class="card-body">
            <div class="layout-config-form">
              <div class="config-field">
                <label class="field-label">{{ $t('system.settings.headerHeight') }}: <strong>{{ headerHeight }}px</strong></label>
                <div class="range-control">
                  <input
                    type="range"
                    min="48"
                    max="80"
                    step="2"
                    class="range-input"
                    :value="headerHeight"
                    @input="handleHeaderHeightChange"
                  >
                  <div class="range-marks">
                    <span>48</span><span>64</span><span>80</span>
                  </div>
                </div>
              </div>
              <div class="config-field">
                <label class="field-label">{{ $t('system.settings.sidebarWidth') }}: <strong>{{ sidebarWidth }}px</strong></label>
                <div class="range-control">
                  <input
                    type="range"
                    min="160"
                    max="280"
                    step="10"
                    class="range-input"
                    :value="sidebarWidth"
                    @input="handleSidebarWidthChange"
                  >
                  <div class="range-marks">
                    <span>160</span><span>220</span><span>280</span>
                  </div>
                </div>
              </div>
              <div class="config-field">
                <label class="field-label toggle-field">
                  <span>{{ $t('system.settings.aiAssistantVisible') }}</span>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      :checked="aiAssistantVisible"
                      @change="handleAiAssistantToggle"
                    >
                    <span class="toggle-slider" />
                  </label>
                </label>
                <p class="field-hint">
                  {{ $t('system.settings.aiAssistantVisibleHint') }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 调试工具 -->
        <div class="settings-card full-width">
          <div class="card-header">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <h3>{{ $t('system.settings.debugTools') }}</h3>
          </div>
          <div class="card-body">
            <div class="debug-tools-form">
              <div class="config-field">
                <label class="field-label">
                  <span>{{ $t('system.settings.clearCache') }}</span>
                </label>
                <p class="field-hint">
                  {{ $t('system.settings.clearCacheHint') }}
                </p>
                <button
                  class="btn btn-danger btn-sm"
                  :disabled="clearingCache"
                  @click="handleClearCache"
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
                  >
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line
                      x1="10"
                      y1="11"
                      x2="10"
                      y2="17"
                    /><line
                      x1="14"
                      y1="11"
                      x2="14"
                      y2="17"
                    />
                  </svg>
                  {{ clearingCache ? $t('system.settings.clearCacheProcessing') : $t('system.settings.clearCache') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card full-width">
          <div class="card-header">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h3>{{ $t('system.nav.notificationChannels') }}</h3>
          </div>
          <div class="card-body">
            <p class="channel-desc">
              {{ $t('system.notificationChannel.title') }}
            </p>
            <router-link
              to="/system/notification-channels"
              class="btn btn-primary btn-sm"
            >
              {{ $t('system.notificationChannel.title') }}
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 系统配置 Tab -->
    <div
      v-if="activeTab === 'config'"
      class="tab-content"
    >
      <SsLoading
        v-if="configLoading && allConfigs.length === 0"
        :text="$t('common.loading')"
        size="small"
      />

      <div
        v-else
        class="config-panels"
      >
        <!-- 统计卡片 -->
        <div class="overview-grid">
          <div class="stat-card">
            <div class="stat-label">
              {{ $t('system.systemConfig.stats.total') }}
            </div>
            <div class="stat-value">
              {{ stats.total }}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">
              {{ $t('system.systemConfig.stats.modified') }}
            </div>
            <div class="stat-value">
              {{ stats.modified }}
            </div>
          </div>
          <div
            class="stat-card stat-card-warning"
            @click="scrollToPendingRestart"
          >
            <div class="stat-label">
              {{ $t('system.systemConfig.stats.pendingRestart') }}
            </div>
            <div class="stat-value">
              {{ pendingRestartKeys.length }}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">
              {{ $t('system.systemConfig.stats.sensitive') }}
            </div>
            <div class="stat-value">
              {{ stats.sensitive }}
            </div>
          </div>
        </div>

        <!-- 待重启配置区域 -->
        <div
          ref="pendingRestartRef"
          class="section-card"
          :class="{ 'section-warning': pendingRestartKeys.length > 0 }"
        >
          <div class="section-header">
            <h2 class="section-title">
              {{ $t('system.systemConfig.pendingRestart.title') }}
            </h2>
            <div class="section-actions">
              <span
                v-if="pendingRestartKeys.length > 0"
                class="pending-count-badge"
              >
                {{ $t('system.systemConfig.pendingRestart.count', { count: pendingRestartKeys.length }) }}
              </span>
              <button
                v-if="pendingRestartKeys.length > 0"
                class="btn btn-secondary btn-sm"
                :disabled="clearingPending"
                @click="handleClearPendingRestart"
              >
                {{ $t('system.systemConfig.pendingRestart.clear') }}
              </button>
            </div>
          </div>
          <div
            v-if="pendingRestartKeys.length === 0"
            class="empty-state"
          >
            {{ $t('system.systemConfig.pendingRestart.empty') }}
          </div>
          <div
            v-else
            class="pending-list"
          >
            <span
              v-for="key in pendingRestartKeys"
              :key="key"
              class="pending-tag"
            >{{ key }}</span>
          </div>
        </div>

        <!-- 搜索和筛选 -->
        <div class="section-card">
          <div class="filter-bar">
            <input
              v-model="searchKeyword"
              type="text"
              class="form-input search-input"
              :placeholder="$t('system.systemConfig.searchPlaceholder')"
            >
            <select
              v-model="selectedCategory"
              class="form-input category-select"
            >
              <option value="">
                {{ $t('system.systemConfig.allCategories') }}
              </option>
              <option
                v-for="cat in categories"
                :key="cat"
                :value="cat"
              >
                {{ $t(`system.systemConfig.categories.${cat}`) }}
              </option>
            </select>
            <div class="filter-bar-actions">
              <button
                class="btn btn-secondary btn-sm"
                :disabled="configLoading"
                @click="loadConfigs(true)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                {{ $t('system.systemConfig.refresh') }}
              </button>
              <button
                class="btn btn-danger btn-sm"
                :disabled="restarting"
                @click="handleRestart"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M3 12a9 9 0 1 0 9-9" /><polyline points="3 4 3 12 11 12" />
                </svg>
                {{ $t('system.systemConfig.restart') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 配置列表（按分类分组） -->
        <div
          v-if="filteredGroups.length === 0"
          class="empty-state"
        >
          {{ $t('system.systemConfig.noConfigs') }}
        </div>
        <div
          v-for="group in filteredGroups"
          :key="group.category"
          class="section-card"
        >
          <div class="section-header">
            <h2 class="section-title">
              {{ $t(`system.systemConfig.categories.${group.category}`) }}
            </h2>
            <span class="section-count">{{ group.items.length }}</span>
          </div>
          <div class="table-wrapper">
            <table class="config-table">
              <thead>
                <tr>
                  <th class="col-key">
                    {{ $t('system.systemConfig.edit.key') }}
                  </th>
                  <th class="col-desc">
                    {{ $t('system.systemConfig.edit.description') }}
                  </th>
                  <th class="col-value">
                    {{ $t('system.systemConfig.edit.currentValue') }}
                  </th>
                  <th class="col-source">
                    {{ $t('system.systemConfig.edit.type') }}
                  </th>
                  <th class="col-badges" />
                  <th class="col-actions" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in group.items"
                  :key="item.key"
                >
                  <td class="mono-text col-key">
                    {{ item.key }}
                    <span
                      v-if="item.restartRequired"
                      class="restart-badge"
                      :title="$t('system.config.restartRequired')"
                    >↻</span>
                  </td>
                  <td class="col-desc">
                    <span class="config-desc-text">{{ item.description }}</span>
                    <span
                      v-if="item.sensitive"
                      class="sensitive-badge"
                    >{{ $t('system.config.sensitive') }}</span>
                  </td>
                  <td class="mono-text col-value">
                    <span
                      v-if="item.sensitive && !revealedKeys.has(item.key)"
                      class="sensitive-value"
                    >••••••••</span>
                    <span v-else>{{ item.value || '—' }}</span>
                    <button
                      v-if="item.sensitive && item.value"
                      class="icon-btn"
                      @click="toggleReveal(item.key)"
                    >
                      {{ revealedKeys.has(item.key) ? $t('system.systemConfig.hideValue') : $t('system.systemConfig.showValue') }}
                    </button>
                  </td>
                  <td class="col-source">
                    <span
                      class="source-badge"
                      :class="'source-' + item.source"
                    >{{ $t('system.systemConfig.sources.' + item.source) }}</span>
                  </td>
                  <td class="col-badges">
                    <div class="badge-group">
                      <span
                        v-if="item.restartRequired"
                        class="config-badge badge-restart"
                      >{{ $t('system.systemConfig.badges.restartRequired') }}</span>
                      <span
                        v-if="item.hotReloadable"
                        class="config-badge badge-hot"
                      >{{ $t('system.systemConfig.badges.hotReloadable') }}</span>
                      <span
                        v-if="item.sensitive"
                        class="config-badge badge-sensitive"
                      >{{ $t('system.systemConfig.badges.sensitive') }}</span>
                      <span
                        v-if="item.envFile"
                        class="config-badge badge-env"
                      >ENV</span>
                    </div>
                  </td>
                  <td class="col-actions">
                    <button
                      v-if="item.editable"
                      class="btn btn-secondary btn-sm"
                      @click="openEditModal(item)"
                    >
                      {{ $t('system.systemConfig.edit.title') }}
                    </button>
                    <span
                      v-else
                      class="readonly-text"
                    >{{ $t('system.systemConfig.badges.readonly') }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑配置弹窗 -->
    <div
      v-if="editModalVisible"
      class="modal-overlay"
      @click.self="closeEditModal"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ $t('system.systemConfig.edit.title') }}
          </h3>
          <button
            class="modal-close"
            @click="closeEditModal"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label class="form-label">{{ $t('system.systemConfig.edit.key') }}</label>
            <div class="form-value mono-text">
              {{ editingItem?.key }}
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">{{ $t('system.systemConfig.edit.description') }}</label>
            <div class="form-value">
              {{ editingItem?.description }}
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">{{ $t('system.systemConfig.edit.type') }}</label>
            <div class="form-value">
              {{ editingItem ? $t('system.systemConfig.valueTypes.' + (editingItem.type as string)) : '' }}
            </div>
          </div>
          <div
            v-if="editingItem?.defaultValue"
            class="form-row"
          >
            <label class="form-label">{{ $t('system.systemConfig.edit.defaultValue') }}</label>
            <div class="form-value mono-text">
              {{ editingItem?.defaultValue }}
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">{{ $t('system.systemConfig.edit.value') }}</label>
            <div
              v-if="editingItem?.enumValues?.length"
              class="form-value"
            >
              <select
                v-model="editValue"
                class="form-input"
              >
                <option
                  v-for="opt in editingItem.enumValues"
                  :key="opt"
                  :value="opt"
                >
                  {{ opt }}
                </option>
              </select>
            </div>
            <div
              v-else-if="editingItem?.type === 'boolean'"
              class="form-value"
            >
              <select
                v-model="editValue"
                class="form-input"
              >
                <option value="true">
                  true
                </option>
                <option value="false">
                  false
                </option>
              </select>
            </div>
            <div
              v-else
              class="form-value"
            >
              <input
                v-model="editValue"
                :type="editingItem?.sensitive ? 'password' : 'text'"
                class="form-input"
              >
            </div>
          </div>
          <div
            v-if="editingItem?.envFile"
            class="form-row form-row-checkbox"
          >
            <label class="checkbox-label">
              <input
                v-model="writeEnv"
                type="checkbox"
              >
              <span>{{ $t('system.systemConfig.edit.writeEnv') }}</span>
            </label>
            <p class="checkbox-hint">
              {{ $t('system.systemConfig.edit.writeEnvHint') }}
            </p>
          </div>
          <div
            v-if="editingItem?.restartRequired"
            class="restart-hint"
          >
            {{ $t('system.systemConfig.badges.restartRequired') }}
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeEditModal"
          >
            {{ $t('system.systemConfig.edit.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="saving"
            @click="handleSave"
          >
            {{ saving ? $t('system.systemConfig.edit.saving') : $t('system.systemConfig.edit.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n, useTheme, useConfigStore } from '@scada-editor/core';
import { systemApi } from '../../api/modules/system.api';
import { showConfirm, showSuccess, showError } from '../../utils/messageBox';
import { SsLoading } from '@scada-editor/shared';
import type { ConfigItemView, ConfigCategory, RestartState } from '../../types/api';

const { colors, currentThemeName, setTheme, availableThemes } = useTheme();
const { t, locale } = useI18n();
const configStore = useConfigStore();
const route = useRoute();
const router = useRouter();

// ===== Tab（支持 query 参数 ?tab=config） =====
const activeTab = ref<'appearance' | 'config'>(
  (route.query.tab === 'config' ? 'config' : 'appearance') as 'appearance' | 'config',
);

function switchTab(tab: 'appearance' | 'config') {
  activeTab.value = tab;
  if (tab === 'config') loadConfigs();
  // 更新 URL query 参数
  router.replace({ query: tab === 'config' ? { tab: 'config' } : {} });
}

// ===== 外观 =====
const selectedTheme = ref<string>(currentThemeName.value);
const headerHeight = ref(configStore.ui?.headerHeight ?? 60);
const sidebarWidth = ref(configStore.ui?.sidebarWidth ?? 200);
const aiAssistantVisible = computed(() => configStore.ui?.aiAssistantVisible !== false);

function themeNameToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function handleThemeChange() {
  setTheme(selectedTheme.value);
}

function handleHeaderHeightChange(event: Event) {
  const target = event.target as HTMLInputElement;
  headerHeight.value = parseInt(target.value, 10);
  configStore.updateUIConfig({ headerHeight: headerHeight.value });
}

function handleSidebarWidthChange(event: Event) {
  const target = event.target as HTMLInputElement;
  sidebarWidth.value = parseInt(target.value, 10);
  configStore.updateUIConfig({ sidebarWidth: sidebarWidth.value });
}

function handleAiAssistantToggle(event: Event) {
  const target = event.target as HTMLInputElement;
  configStore.updateUIConfig({ aiAssistantVisible: target.checked });
}

// ===== 系统配置 =====
const configLoading = ref(false);
const saving = ref(false);
const restarting = ref(false);
const clearingPending = ref(false);
const editModalVisible = ref(false);
const writeEnv = ref(false);
const editValue = ref('');
const searchKeyword = ref('');
const selectedCategory = ref('');
const revealedKeys = reactive(new Set<string>());
const pendingRestartKeys = ref<string[]>([]);
const restartState = ref<RestartState | null>(null);
const pendingRestartRef = ref<HTMLElement | null>(null);

const allConfigs = ref<ConfigItemView[]>([]);
const editingItem = ref<ConfigItemView | null>(null);

let statusPollTimer: ReturnType<typeof setInterval> | null = null;

// 计算属性
const categories = computed<ConfigCategory[]>(() => {
  const set = new Set<ConfigCategory>();
  allConfigs.value.forEach((c) => set.add(c.category));
  return Array.from(set);
});

const filteredGroups = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  const groups: { category: ConfigCategory; items: ConfigItemView[] }[] = [];
  const catMap = new Map<ConfigCategory, ConfigItemView[]>();

  for (const item of allConfigs.value) {
    if (selectedCategory.value && item.category !== selectedCategory.value) continue;
    if (keyword) {
      const matchesKey = item.key.toLowerCase().includes(keyword);
      const matchesDesc = item.description.toLowerCase().includes(keyword);
      if (!matchesKey && !matchesDesc) continue;
    }
    if (!catMap.has(item.category)) catMap.set(item.category, []);
    catMap.get(item.category)!.push(item);
  }

  for (const [category, items] of catMap) {
    groups.push({ category, items });
  }
  return groups;
});

const stats = computed(() => {
  let modified = 0;
  let sensitive = 0;
  for (const c of allConfigs.value) {
    if (c.source === 'db' || c.source === 'env') modified++;
    if (c.sensitive) sensitive++;
  }
  return {
    total: allConfigs.value.length,
    modified,
    sensitive,
  };
});

// 数据加载
async function loadConfigs(force = false) {
  if (!force && allConfigs.value.length > 0) return;
  configLoading.value = true;
  try {
    // 使用 allSettled 避免一个接口失败导致另一个数据也无法展示
    const [configsResult, pendingResult] = await Promise.allSettled([
      systemApi.getAllWithMeta(),
      systemApi.getRestartRequired(),
    ]);

    // 处理配置数据
    if (configsResult.status === 'fulfilled') {
      const configsRes = configsResult.value;
      const rawData = (configsRes as any)?.data ?? configsRes;
      allConfigs.value = Array.isArray(rawData) ? rawData : [];
    } else {
      allConfigs.value = [];
      if (!(configsResult.reason as any)?._errorHandled) {
        showError(
          configsResult.reason?.response?.data?.message ||
            configsResult.reason?.message ||
            t('system.systemConfig.loadFailed'),
        );
      }
    }

    // 处理待重启配置
    if (pendingResult.status === 'fulfilled') {
      const pendingData = (pendingResult.value as any)?.data ?? pendingResult.value;
      pendingRestartKeys.value = pendingData?.keys ?? [];
    } else {
      pendingRestartKeys.value = [];
    }
  } finally {
    configLoading.value = false;
  }
}

async function loadRestartStatus() {
  try {
    const res = await systemApi.getRestartStatus();
    const rawState = (res as any)?.data ?? res;
    restartState.value = rawState && typeof rawState === 'object' ? rawState : null;
    if (restartState.value?.status === 'restarting') {
      restarting.value = true;
      startStatusPolling();
    }
  } catch {
    // 静默处理
  }
}

// 编辑配置
function openEditModal(item: ConfigItemView) {
  editingItem.value = item;
  editValue.value = item.value === '***' ? '' : (item.value || '');
  writeEnv.value = false;
  editModalVisible.value = true;
}

function closeEditModal() {
  editModalVisible.value = false;
  editingItem.value = null;
  editValue.value = '';
  writeEnv.value = false;
}

async function handleSave() {
  if (!editingItem.value) return;
  if (!editValue.value && editValue.value !== '0') {
    showError(t('system.systemConfig.validation.required'));
    return;
  }

  saving.value = true;
  try {
    await systemApi.updateConfigWithMeta(editingItem.value.key, editValue.value, {
      writeEnv: writeEnv.value,
    });
    showSuccess(t('system.systemConfig.updateSuccess'));
    closeEditModal();
    await loadConfigs(true);
  } catch (err: any) {
    if (!(err as any)._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.systemConfig.updateFailed'));
    }
  } finally {
    saving.value = false;
  }
}

// 待重启管理
async function handleClearPendingRestart() {
  const confirmed = await showConfirm(t('system.systemConfig.pendingRestart.clearConfirm'));
  if (!confirmed) return;

  clearingPending.value = true;
  try {
    await systemApi.clearRestartRequired();
    showSuccess(t('system.systemConfig.pendingRestart.clearSuccess'));
    await loadConfigs(true);
  } catch (err: any) {
    if (!(err as any)._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.systemConfig.pendingRestart.clearFailed'));
    }
  } finally {
    clearingPending.value = false;
  }
}

// 系统重启
async function handleRestart() {
  const confirmed = await showConfirm(
    t('system.systemConfig.restartConfirm'),
    t('system.systemConfig.restartConfirmTitle'),
  );
  if (!confirmed) return;

  restarting.value = true;
  try {
    await systemApi.triggerRestart();
    showSuccess(t('system.systemConfig.restartSuccess'));
    startStatusPolling();
  } catch (err: any) {
    restarting.value = false;
    if (!(err as any)._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.systemConfig.restartFailed'));
    }
  }
}

function startStatusPolling() {
  if (statusPollTimer) clearInterval(statusPollTimer);
  statusPollTimer = setInterval(async () => {
    try {
      const res = await systemApi.getRestartStatus();
      const rawState = (res as any)?.data ?? res;
      restartState.value = rawState && typeof rawState === 'object' ? rawState : null;
      if (restartState.value?.status === 'ready' || restartState.value?.status === 'idle') {
        restarting.value = false;
        stopStatusPolling();
        showSuccess(t('system.systemConfig.clearMarkerSuccess'));
      } else if (restartState.value?.status === 'failed') {
        restarting.value = false;
        stopStatusPolling();
        showError(restartState.value?.errorMessage || t('system.systemConfig.restartFailed'));
      }
    } catch {
      // 轮询失败时继续
    }
  }, 2000);
}

function stopStatusPolling() {
  if (statusPollTimer) {
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
}

// 工具函数
function toggleReveal(key: string) {
  if (revealedKeys.has(key)) {
    revealedKeys.delete(key);
  } else {
    revealedKeys.add(key);
  }
}

function scrollToPendingRestart() {
  pendingRestartRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 调试工具：清空浏览器缓存 =====
const clearingCache = ref(false);

async function handleClearCache() {
  const confirmed = await showConfirm(
    t('system.settings.clearCacheConfirm'),
    t('system.settings.clearCache'),
  );
  if (!confirmed) return;

  clearingCache.value = true;
  try {
    // 1. 清空 localStorage
    localStorage.clear();
    // 2. 清空 sessionStorage
    sessionStorage.clear();
    // 3. 清空 Cookies（逐个置过期）
    document.cookie.split(';').forEach((c) => {
      const eq = c.indexOf('=');
      const name = eq > -1 ? c.substring(0, eq).trim() : c.trim();
      if (!name) return;
      // 覆盖根路径与各级可能的 path，确保清除
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${location.hostname}`;
    });
    // 4. 清空 Cache Storage API（Service Worker 缓存）
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    // 5. 清空 IndexedDB（如果有）
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs
          .filter((db): db is { name: string } => !!db.name)
          .map((db) => new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          })),
      );
    }

    showSuccess(t('system.settings.clearCacheSuccess'));
    // 延迟刷新，让用户看到提示
    setTimeout(() => {
      window.location.reload();
    }, 600);
  } catch (e) {
    console.error('Clear cache failed:', e);
    showError(t('system.settings.clearCacheFailed'));
    clearingCache.value = false;
  }
}

// 生命周期
onMounted(() => {
  selectedTheme.value = currentThemeName.value;
  // 如果通过 ?tab=config 进入，则加载配置
  if (route.query.tab === 'config') {
    activeTab.value = 'config';
    loadConfigs();
    loadRestartStatus();
  }
});

onUnmounted(() => {
  stopStatusPolling();
});
</script>

<style scoped>
.settings-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.locale-select-wrapper {
  position: relative;
}

.locale-select {
  padding: 6px 30px 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
  appearance: auto;
}

.locale-select:focus, .locale-select:hover {
  border-color: var(--primary);
}

/* ===== Tab 导航 ===== */
.tab-nav {
  display: flex;
  gap: 2px;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--border);
  padding-bottom: 0;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-content {
  min-height: 300px;
}

/* ===== 外观布局 ===== */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.settings-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.settings-card.full-width {
  grid-column: 1 / -1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}

.card-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.card-body {
  padding: 16px 20px;
}

.theme-selector {
  margin-bottom: 16px;
}

.theme-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.theme-select {
  width: 100%;
  padding: 10px 12px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.theme-select:focus {
  border-color: var(--primary);
}

.theme-preview {
  background: var(--background);
  border-radius: 8px;
  padding: 12px;
}

.preview-header {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.preview-colors {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  cursor: pointer;
  transition: transform 0.2s;
}

.color-dot:hover {
  transform: scale(1.1);
}

.theme-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.info-label {
  color: var(--text-secondary);
}

.info-value {
  color: var(--text);
}

.color-value {
  font-family: 'Courier New', monospace;
}

.channel-desc {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.layout-config-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.debug-tools-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.debug-tools-form .field-hint {
  margin: -4px 0 4px 0;
}

.debug-tools-form .btn {
  align-self: flex-start;
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 14px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-label strong {
  color: var(--primary);
  font-size: 15px;
}

.range-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.range-input {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid var(--surface);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.15s;
}

.range-input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.range-marks {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  padding: 0 2px;
}

.toggle-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-hint {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 22px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  border-radius: 22px;
  transition: 0.3s;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text);
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* ===== 系统配置 ===== */
.config-panels {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 统计卡片 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 18px;
  transition: border-color 0.15s;
}

.stat-card:hover {
  border-color: var(--primary);
}

.stat-card-warning {
  cursor: pointer;
  border-color: var(--status-warning);
}

.stat-card-warning:hover {
  border-color: var(--status-warning);
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

/* 通用卡片 */
.section-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.section-warning {
  border-color: var(--status-warning);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--background);
  padding: 2px 8px;
  border-radius: 10px;
}

.pending-count-badge {
  font-size: 12px;
  color: var(--status-warning);
  font-weight: 500;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-bar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.search-input {
  flex: 1;
  min-width: 180px;
  max-width: 320px;
}

.category-select {
  width: 160px;
}

.form-input {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
  background: var(--background);
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--primary);
}

/* 表格 */
.table-wrapper {
  overflow-x: auto;
}

.config-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.config-table th,
.config-table td {
  padding: 9px 14px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.config-table th {
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--background);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.config-table tbody tr:hover {
  background: var(--hover);
}

.config-table tbody tr:last-child td {
  border-bottom: none;
}

.mono-text {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

.col-key { width: auto; white-space: nowrap; font-weight: 500; }
.col-desc { width: auto; }
.col-value { width: auto; max-width: 260px; word-break: break-all; }
.col-source { width: 90px; white-space: nowrap; }
.col-badges { width: 120px; white-space: nowrap; }
.col-actions { width: 80px; text-align: right; white-space: nowrap; }

.config-desc-text {
  color: var(--text-secondary);
  font-size: 12px;
}

.restart-badge {
  display: inline-block;
  margin-left: 4px;
  color: var(--status-warning);
  font-size: 14px;
  font-weight: 700;
  cursor: help;
}

.sensitive-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  color: var(--status-error);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.sensitive-value {
  letter-spacing: 2px;
  color: var(--text-secondary);
}

.icon-btn {
  background: none;
  border: none;
  font-size: 11px;
  color: var(--primary);
  cursor: pointer;
  padding: 2px 4px;
  margin-left: 4px;
}

.icon-btn:hover {
  text-decoration: underline;
}

/* 来源标识 */
.source-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.source-env {
  background: color-mix(in srgb, var(--status-online) 10%, transparent);
  color: var(--status-success);
}

.source-db {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

.source-default {
  background: rgba(156, 163, 175, 0.1);
  color: var(--text-secondary);
}

.source-null {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  color: var(--status-error);
}

/* 配置标识 */
.badge-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.config-badge {
  display: inline-block;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-restart {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  color: var(--status-error);
}

.badge-hot {
  background: color-mix(in srgb, var(--status-online) 10%, transparent);
  color: var(--status-success);
}

.badge-sensitive {
  background: color-mix(in srgb, var(--status-warning) 10%, transparent);
  color: var(--status-warning);
}

.badge-env {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

.readonly-text {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 待重启标签 */
.pending-list {
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pending-tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  color: var(--status-error);
}

.empty-state {
  padding: 28px 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fade-in 0.2s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-dialog {
  width: 500px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--surface);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  animation: scale-in 0.2s ease;
}

@keyframes scale-in {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0 4px;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 18px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
}

.form-row {
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-value {
  font-size: 14px;
  color: var(--text);
}

.form-value .form-input {
  width: 100%;
  box-sizing: border-box;
}

.form-row-checkbox {
  background: var(--background);
  padding: 10px 12px;
  border-radius: 6px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}

.checkbox-label input {
  cursor: pointer;
}

.checkbox-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 5px 0 0 0;
}

.restart-hint {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  color: var(--status-error);
}

/* 通用按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.4;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: var(--text); }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-secondary { background: var(--background); color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.btn-danger { background: var(--status-error); color: var(--text); }
.btn-danger:hover:not(:disabled) { filter: brightness(1.1); }
.btn-sm { padding: 5px 10px; font-size: 12px; }
</style>