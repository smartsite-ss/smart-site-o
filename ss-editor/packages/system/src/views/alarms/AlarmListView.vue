<template>
  <div class="alarm-list">
    <!-- 统一工具栏 -->
    <div class="unified-toolbar">
      <div class="toolbar-left">
        <h1 class="toolbar-title">
          {{ $t('system.alarms.title') }}
        </h1>
        <div class="toolbar-item">
          <label class="toolbar-label">{{ $t('system.alarms.project') }}</label>
          <select
            v-model="selectedProjectId"
            class="toolbar-select"
            @change="onProjectChange"
          >
            <option
              v-for="proj in projectStore.projects"
              :key="proj.projectId"
              :value="proj.projectId"
            >
              {{ proj.projectName }}
            </option>
          </select>
        </div>
        <span
          v-if="store.activeCount > 0"
          class="alarm-summary"
        >
          <span class="active-dot" />
          {{ $t('system.alarms.activeAlarmCount', { count: store.activeCount }) }}
        </span>
      </div>
      <div class="toolbar-right">
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="router.push({ name: 'alarm-statistics' })"
        >
          {{ $t('system.alarmStatistics.title') }}
        </button>
      </div>
    </div>

    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'records' }"
        @click="activeTab = 'records'"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
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
        {{ $t('system.alarms.recordsTab') }}
        <span
          v-if="store.activeCount > 0"
          class="tab-badge"
        >{{ store.activeCount }}</span>
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'stats' }"
        @click="switchTab('stats')"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        ><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
        {{ $t('system.alarms.statsTab') }}
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'rules' }"
        @click="activeTab = 'rules'"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        ><line
          x1="4"
          y1="21"
          x2="4"
          y2="14"
        /><line
          x1="4"
          y1="10"
          x2="4"
          y2="3"
        /><line
          x1="12"
          y1="21"
          x2="12"
          y2="12"
        /><line
          x1="12"
          y1="8"
          x2="12"
          y2="3"
        /><line
          x1="20"
          y1="21"
          x2="20"
          y2="16"
        /><line
          x1="20"
          y1="12"
          x2="20"
          y2="3"
        /><line
          x1="1"
          y1="14"
          x2="7"
          y2="14"
        /><line
          x1="9"
          y1="8"
          x2="15"
          y2="8"
        /><line
          x1="17"
          y1="16"
          x2="23"
          y2="16"
        /></svg>
        {{ $t('system.alarms.rulesTab') }}
      </button>
    </div>

    <SsLoading
      v-if="store.loading"
      :text="$t('system.alarms.loading')"
      size="small"
    />

    <div
      v-else-if="store.error && activeTab !== 'stats'"
      class="error-state"
    >
      <p>{{ store.error }}</p>
      <button
        class="sys-btn sys-btn-secondary sys-btn-sm"
        @click="fetchData"
      >
        {{ $t('system.alarms.retry') }}
      </button>
    </div>

    <!-- ===== 报警记录 Tab ===== -->
    <template v-else>
      <div
        v-if="activeTab === 'records'"
        class="tab-content"
      >
        <!-- 筛选栏（含实时/历史切换） -->
        <div class="filter-bar">
          <div class="sub-tabs-inline">
            <button
              class="sub-tab"
              :class="{ active: recordsScope === 'all' }"
              @click="switchRecordsScope('all')"
            >
              {{ $t('system.alarms.scopeAll') }}
            </button>
            <button
              class="sub-tab"
              :class="{ active: recordsScope === 'history' }"
              @click="switchRecordsScope('history')"
            >
              {{ $t('system.alarms.scopeHistory') }}
            </button>
          </div>
          <div class="filter-divider" />
          <div class="filter-item">
            <label>{{ $t('system.alarms.filterLevel') }}</label>
            <select
              v-model="filters.level"
              class="filter-select"
              @change="applyFilters"
            >
              <option value="">
                {{ $t('system.alarms.filterAll') }}
              </option>
              <option value="info">
                {{ $t('system.alarms.levelInfo') }}
              </option>
              <option value="warning">
                {{ $t('system.alarms.levelWarning') }}
              </option>
              <option value="error">
                {{ $t('system.alarms.levelError') }}
              </option>
              <option value="critical">
                {{ $t('system.alarms.levelCritical') }}
              </option>
            </select>
          </div>
          <div class="filter-item">
            <label>{{ $t('system.alarms.filterStatus') }}</label>
            <select
              v-model="filters.status"
              class="filter-select"
              @change="applyFilters"
            >
              <option value="">
                {{ $t('system.alarms.filterAll') }}
              </option>
              <option value="active">
                {{ $t('system.alarms.active') }}
              </option>
              <option value="acknowledged">
                {{ $t('system.alarms.acknowledged') }}
              </option>
              <option value="cleared">
                {{ $t('system.alarms.cleared') }}
              </option>
            </select>
          </div>
          <div class="filter-item">
            <label>{{ $t('system.alarms.filterAlarmType') }}</label>
            <select
              v-model="filters.alarmType"
              class="filter-select"
              @change="applyFilters"
            >
              <option value="">
                {{ $t('system.alarms.filterAll') }}
              </option>
              <option
                v-for="item in alarmTypeOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
          </div>
          <div class="filter-item">
            <label>{{ $t('system.alarms.filterDispositionType') }}</label>
            <select
              v-model="filters.dispositionType"
              class="filter-select"
              @change="applyFilters"
            >
              <option value="">
                {{ $t('system.alarms.filterAll') }}
              </option>
              <option
                v-for="item in dispositionTypeOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
          </div>
          <div class="filter-item">
            <label>{{ $t('system.alarms.filterKeyword') }}</label>
            <input
              v-model="filters.keyword"
              type="text"
              class="filter-input"
              :placeholder="$t('system.alarms.filterKeywordPlaceholder')"
              @keyup.enter="applyFilters"
            >
          </div>
          <div class="filter-item">
            <label>{{ $t('system.alarms.filterDateRange') }}</label>
            <TimeRangePicker
              v-model="filters.dateRange"
              mode="date"
              :placeholder="$t('system.alarms.filterDateRangePlaceholder')"
              size="sm"
              @change="applyFilters"
            />
          </div>
          <div class="filter-actions">
            <button
              class="sys-btn sys-btn-primary sys-btn-sm"
              @click="applyFilters"
            >
              {{ $t('system.alarms.filterSearch') }}
            </button>
            <button
              class="sys-btn sys-btn-secondary sys-btn-sm"
              @click="resetFilters"
            >
              {{ $t('system.alarms.filterReset') }}
            </button>
          </div>
        </div>

        <!-- 批量操作工具栏 -->
        <div
          v-if="selectedIds.size > 0"
          class="batch-bar"
        >
          <span class="batch-info">{{ $t('system.alarms.batchSelected', { count: selectedIds.size }) }}</span>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            @click="handleBatchAcknowledge"
          >
            {{ $t('system.alarms.batchAcknowledge') }}
          </button>
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="handleBatchClear"
          >
            {{ $t('system.alarms.batchClear') }}
          </button>
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="clearSelection"
          >
            {{ $t('system.alarms.batchCancel') }}
          </button>
        </div>

        <!-- 报警记录表格 -->
        <div class="records-table-wrapper">
          <table class="records-table">
            <thead>
              <tr>
                <th class="col-check">
                  <input
                    type="checkbox"
                    :checked="isAllSelected"
                    :indeterminate="isIndeterminate"
                    @change="toggleSelectAll"
                  >
                </th>
                <th class="col-time">
                  {{ $t('system.alarms.time') }}
                </th>
                <th class="col-device">
                  {{ $t('system.alarms.device') }}
                </th>
                <th class="col-tag">
                  {{ $t('system.alarms.tag') }}
                </th>
                <th class="col-rule">
                  {{ $t('system.alarms.rule') }}
                </th>
                <th class="col-level">
                  {{ $t('system.alarms.level') }}
                </th>
                <th class="col-type">
                  {{ $t('system.alarms.alarmType') }}
                </th>
                <th class="col-disposition">
                  {{ $t('system.alarms.dispositionType') }}
                </th>
                <th class="col-value">
                  {{ $t('system.alarms.triggerValue') }}
                </th>
                <th class="col-msg">
                  {{ $t('system.alarms.message') }}
                </th>
                <th class="col-status">
                  {{ $t('system.alarms.status') }}
                </th>
                <th
                  v-if="recordsScope === 'history' || recordsScope === 'all'"
                  class="col-recovered"
                >
                  {{ $t('system.alarms.recoveredAt') }}
                </th>
                <th class="col-actions">
                  {{ $t('system.alarms.actions') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredRecords.length === 0">
                <td
                  :colspan="recordsScope === 'history' || recordsScope === 'all' ? 13 : 12"
                  class="empty-row"
                >
                  {{ $t('system.alarms.noAlarms') }}
                </td>
              </tr>
              <tr
                v-for="row in paginatedRecords"
                :key="row.id"
                :class="{ 'row-selected': selectedIds.has(row.id) }"
              >
                <td class="col-check">
                  <input
                    type="checkbox"
                    :checked="selectedIds.has(row.id)"
                    @change="toggleRow(row.id)"
                  >
                </td>
                <td class="col-time">
                  {{ formatDate(row.createdAt) }}
                </td>
                <td class="col-device">
                  {{ row.deviceName || row.deviceId || '-' }}
                </td>
                <td class="col-tag">
                  {{ row.tagName || row.tagId || '-' }}
                </td>
                <td class="col-rule">
                  {{ row.rule?.name || '-' }}
                </td>
                <td class="col-level">
                  <span
                    class="level-badge"
                    :class="'level-' + row.level"
                  >{{ levelLabel(row.level) }}</span>
                </td>
                <td class="col-type">
                  {{ dictLabel(alarmTypeOptions, row.alarmType) }}
                </td>
                <td class="col-disposition">
                  {{ dictLabel(dispositionTypeOptions, row.dispositionType) }}
                </td>
                <td class="col-value">
                  {{ formatNumber(row.triggerValue) }}
                </td>
                <td class="col-msg">
                  {{ row.message || '-' }}
                </td>
                <td class="col-status">
                  <span
                    class="status-badge"
                    :class="'status-' + row.status"
                  >{{ statusLabel(row.status) }}</span>
                </td>
                <td
                  v-if="recordsScope === 'history' || recordsScope === 'all'"
                  class="col-recovered"
                >
                  <template v-if="row.recoveredAt && row.clearReason === 'auto'">
                    <div class="recovered-time">
                      {{ formatDate(row.recoveredAt) }}
                    </div>
                    <div
                      v-if="row.recoveredValue != null && row.recoveredValue !== ''"
                      class="recovered-value"
                    >
                      {{ $t('system.alarms.recoveredValue') }}: {{ formatNumber(Number(row.recoveredValue)) }}
                    </div>
                  </template>
                  <span
                    v-else-if="row.clearReason === 'manual'"
                    class="text-muted"
                  >{{ $t('system.alarms.clearReasonManual') }} · {{ formatDate(row.clearedAt) }}</span>
                  <span
                    v-else-if="row.clearReason === 'rule_disabled'"
                    class="text-muted"
                  >{{ $t('system.alarms.clearReasonRuleDisabled') }} · {{ formatDate(row.clearedAt) }}</span>
                  <span
                    v-else
                    class="text-muted"
                  >-</span>
                </td>
                <td class="col-actions">
                  <div class="row-actions">
                    <button
                      v-if="row.status === 'active'"
                      class="sys-btn sys-btn-secondary sys-btn-sm"
                      @click="handleAcknowledge(row.id)"
                    >
                      {{ $t('system.alarms.acknowledge') }}
                    </button>
                    <button
                      v-if="row.status === 'active' || row.status === 'acknowledged'"
                      class="sys-btn sys-btn-secondary sys-btn-sm"
                      @click="handleClear(row.id)"
                    >
                      {{ $t('system.alarms.clear') }}
                    </button>
                    <button
                      v-if="row.deviceId && row.tagId"
                      class="sys-btn sys-btn-secondary sys-btn-sm"
                      @click="openAlarmDataDialog(row)"
                    >
                      {{ $t('system.alarms.viewRealtime') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <SmartTablePagination
            :current-page="currentPage"
            :total-pages="totalPages"
            :total="filteredRecords.length"
            :showing-from="showingFrom"
            :showing-to="showingTo"
            :page-size="pageSize"
            :page-sizes="pageSizes"
            @go="handlePageGo"
            @go-input="handlePageInput"
            @size-change="handlePageSizeChange"
          />
        </div>
      </div>

      <!-- ===== 报警规则 Tab ===== -->
      <div
        v-if="activeTab === 'rules'"
        class="tab-content"
      >
        <div class="rules-toolbar">
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            @click="router.push({ name: 'system-alarm-rules' })"
          >
            <svg
              width="14"
              height="14"
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
            {{ $t('system.alarms.createRule') }}
          </button>
        </div>
        <div class="rules-hint-banner">
          {{ $t('system.alarms.noRulesDesc') }}
        </div>
        <SmartTable
          table-id="alarm-rules"
          :data="store.rules"
          :columns="ruleColumns"
          :loading="store.loading"
          :empty-text="$t('system.alarms.noRules')"
          show-column-toggle
          show-export
          :show-refresh="true"
          @refresh="fetchData"
        >
          <template #cell-level="{ row }">
            <span
              class="level-badge"
              :class="'level-' + row.level"
            >{{ levelLabel(row.level) }}</span>
          </template>
          <template #cell-enabled="{ row }">
            <span
              class="tag-status"
              :class="row.enabled ? 'enabled' : 'disabled'"
            >{{ row.enabled ? $t('system.alarms.enabled') : $t('system.alarms.disabled') }}</span>
          </template>
        </SmartTable>
      </div>

      <!-- ===== 统计报表 Tab ===== -->
      <div
        v-if="activeTab === 'stats'"
        class="tab-content"
      >
        <SsLoading
          v-if="statsLoading"
          :text="$t('system.alarms.loading')"
          size="small"
        />
        <template v-else-if="store.statistics">
          <!-- 总览卡片 -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">
                {{ store.statistics.total }}
              </div>
              <div class="stat-label">
                {{ $t('system.alarms.totalAlarms') }}
              </div>
            </div>
            <div class="stat-card stat-card-active">
              <div class="stat-value text-danger">
                {{ store.statistics.active || 0 }}
              </div>
              <div class="stat-label">
                {{ $t('system.alarms.active') }}
              </div>
            </div>
            <div class="stat-card stat-card-ack">
              <div class="stat-value text-warning">
                {{ store.statistics.acknowledged || 0 }}
              </div>
              <div class="stat-label">
                {{ $t('system.alarms.acknowledged') }}
              </div>
            </div>
            <div class="stat-card stat-card-clr">
              <div class="stat-value text-success">
                {{ store.statistics.cleared || 0 }}
              </div>
              <div class="stat-label">
                {{ $t('system.alarms.cleared') }}
              </div>
            </div>
          </div>

          <!-- 级别分布 + Top规则 双栏 -->
          <div class="stats-two-col">
            <!-- 级别分布 -->
            <div class="stats-panel">
              <h3 class="section-title">
                {{ $t('system.alarms.levelDist') }}
              </h3>
              <div class="level-dist">
                <div
                  v-for="lvl in levelDistData"
                  :key="lvl.key"
                  class="level-dist-row"
                >
                  <span
                    class="level-dist-label"
                    :class="'level-tag-' + lvl.key"
                  >{{ lvl.label }}</span>
                  <div class="level-dist-bar-wrap">
                    <div
                      class="level-dist-bar"
                      :style="{ width: lvl.pct + '%', background: lvl.color }"
                    />
                  </div>
                  <span class="level-dist-count">{{ lvl.count }}</span>
                  <span class="level-dist-pct">{{ lvl.pct }}%</span>
                </div>
              </div>
            </div>

            <!-- Top 报警规则 -->
            <div class="stats-panel">
              <h3 class="section-title">
                {{ $t('system.alarms.topRules') }}
              </h3>
              <div
                v-if="store.topRules.length > 0"
                class="top-rules-list"
              >
                <div
                  v-for="(rule, idx) in store.topRules.slice(0, 5)"
                  :key="rule.ruleId"
                  class="top-rule-row"
                >
                  <span class="top-rule-rank">{{ idx + 1 }}</span>
                  <div class="top-rule-info">
                    <span class="top-rule-name">{{ rule.ruleName }}</span>
                    <span class="top-rule-last">{{ $t('system.alarms.lastTriggered') }}: {{ formatDate(rule.lastTriggered) }}</span>
                  </div>
                  <span class="top-rule-count">{{ rule.count }}</span>
                </div>
              </div>
              <div
                v-else
                class="empty-state-small"
              >
                {{ $t('system.alarms.noTopRules') }}
              </div>
            </div>
          </div>

          <!-- 设备排行 + 变量排行 双栏 -->
          <div class="stats-two-col">
            <div class="stats-panel">
              <h3 class="section-title">
                {{ $t('system.alarms.deviceStats') }}
              </h3>
              <div
                v-if="store.statsByDevice.length > 0"
                class="top-rules-list"
              >
                <div
                  v-for="(d, idx) in store.statsByDevice.slice(0, 5)"
                  :key="d.deviceId"
                  class="top-rule-row"
                >
                  <span class="top-rule-rank">{{ idx + 1 }}</span>
                  <div class="top-rule-info">
                    <span class="top-rule-name">{{ d.deviceName }}</span>
                    <span class="top-rule-last">ID: {{ d.deviceId }}</span>
                  </div>
                  <span class="top-rule-count">{{ d.count }}</span>
                </div>
              </div>
              <div
                v-else
                class="empty-state-small"
              >
                {{ $t('system.alarms.noDeviceStats') }}
              </div>
            </div>
            <div class="stats-panel">
              <h3 class="section-title">
                {{ $t('system.alarms.tagStats') }}
              </h3>
              <div
                v-if="store.statsByTag.length > 0"
                class="top-rules-list"
              >
                <div
                  v-for="(item, idx) in store.statsByTag.slice(0, 5)"
                  :key="item.tagId"
                  class="top-rule-row"
                >
                  <span class="top-rule-rank">{{ idx + 1 }}</span>
                  <div class="top-rule-info">
                    <span class="top-rule-name">{{ item.tagName }}</span>
                    <span class="top-rule-last">ID: {{ item.tagId }}</span>
                  </div>
                  <span class="top-rule-count">{{ item.count }}</span>
                </div>
              </div>
              <div
                v-else
                class="empty-state-small"
              >
                {{ $t('system.alarms.noTagStats') }}
              </div>
            </div>
          </div>

          <!-- 7天趋势 -->
          <div
            v-if="store.trends.length > 0"
            class="trends-section"
          >
            <h3 class="section-title">
              {{ $t('system.alarms.trend7Days') }}
            </h3>
            <div class="trends-bar">
              <div
                v-for="trend in store.trends"
                :key="trend.date + '-' + trend.level"
                class="trend-bar-wrap"
                :title="$t('system.alarms.alarmCount', { date: trend.date, count: trend.count })"
              >
                <div class="trend-bar-label">
                  {{ trend.count }}
                </div>
                <div
                  class="trend-bar"
                  :style="{ height: barHeight(trend.count) + 'px', background: levelColor(trend.level) }"
                />
                <div class="trend-bar-date">
                  {{ formatTrendDate(trend.date) }}
                </div>
              </div>
            </div>
          </div>
          <div
            v-else
            class="empty-state"
          >
            {{ $t('system.alarms.noStatsData') }}
          </div>
        </template>
        <div
          v-else
          class="empty-state"
        >
          {{ $t('system.alarms.noStatsData') }}
        </div>
      </div>
    </template>

    <!-- 告警数据弹窗 -->
    <AlarmDataDialog
      v-model:visible="alarmDialogVisible"
      :alarm-time="alarmDialogRecord?.createdAt || ''"
      :trigger-value="alarmDialogRecord?.triggerValue || ''"
      :tag-id="alarmDialogRecord?.tagId || ''"
      :tag-name="alarmDialogRecord?.tagName"
      :device-id="alarmDialogRecord?.deviceId"
      :device-name="alarmDialogRecord?.deviceName"
      :project-id="alarmDialogRecord?.projectId || ''"
      :rule-name="alarmDialogRecord?.rule?.name"
      :level="alarmDialogRecord?.level || ''"
      :message="alarmDialogRecord?.message"
      :condition="alarmDialogRecord?.rule?.condition"
      :condition-value="alarmDialogRecord?.rule?.conditionValue"
      :acknowledged-at="alarmDialogRecord?.acknowledgedAt || ''"
      :recovered-at="alarmDialogRecord?.recoveredAt || ''"
      :recovered-value="alarmDialogRecord?.recoveredValue || ''"
      :clear-reason="alarmDialogRecord?.clearReason || ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { useAlarmStore } from '../../stores/alarm.store';
import { useProjectStore } from '../../stores/project.store';
import { useProjectContext } from '../../composables/useProjectContext';
import { SmartTable, SmartTablePagination } from '../../components/smart-table';
import type { SmartTableColumn } from '../../components/smart-table';
import { SsLoading, TimeRangePicker } from '@scada-editor/shared';
import type { TimeRange } from '@scada-editor/shared';
import AlarmDataDialog from './components/AlarmDataDialog.vue';
import { dictApi } from '../../api/modules/dict.api';
import type { DictItem } from '../../api/modules/dict.api';

const store = useAlarmStore();
const projectStore = useProjectStore();
const { loadDefault } = useProjectContext();
const router = useRouter();
const { t } = useI18n();
const activeTab = ref<'records' | 'rules' | 'stats'>('records');
const selectedProjectId = ref('');
const selectedIds = ref<Set<string>>(new Set());
const statsLoading = ref(false);

/** 记录子标签：all=全部 / realtime=实时告警(isActive=true) / history=历史告警(isActive=false)。
 *  Phase 5.6：基于 isActive 字段显式区分实时/历史，替代隐式 status 映射 */
const recordsScope = ref<'all' | 'realtime' | 'history'>('all');

// 告警数据弹窗
const alarmDialogVisible = ref(false);
const alarmDialogRecord = ref<any>(null);

// 字典选项（告警类型、告警处置类型）
const alarmTypeOptions = ref<DictItem[]>([]);
const dispositionTypeOptions = ref<DictItem[]>([]);

async function loadDicts() {
  try {
    const [typeRes, actionRes] = await Promise.all([
      dictApi.getDict('alarmType'),
      dictApi.getDict('alarmActionType'),
    ]);
    alarmTypeOptions.value = typeRes.data?.items ?? [];
    dispositionTypeOptions.value = actionRes.data?.items ?? [];
  } catch (e) {
    // 字典加载失败不阻塞主流程
  }
}

function dictLabel(options: DictItem[], value?: string): string {
  if (!value) return '-';
  return options.find((o) => o.value === value)?.label ?? value;
}

// 筛选条件
const filters = reactive({
  level: '',
  status: '',
  keyword: '',
  dateRange: { start: '', end: '' } as TimeRange,
  alarmType: '',
  dispositionType: '',
});

// 前端本地过滤（后端已过滤，这里作为显示兜底）
const filteredRecords = computed(() => store.records);

// 分页状态（客户端分页）
const currentPage = ref(1);
const pageSize = ref(20);
const pageSizes = [10, 20, 50, 100];
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / pageSize.value)));
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRecords.value.slice(start, start + pageSize.value);
});
const showingFrom = computed(() => filteredRecords.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1);
const showingTo = computed(() => Math.min(currentPage.value * pageSize.value, filteredRecords.value.length));

function handlePageGo(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}
function handlePageInput(val: string) {
  const p = parseInt(val, 10);
  if (!isNaN(p)) handlePageGo(p);
}
function handlePageSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
}

// 级别分布数据
const LEVEL_COLORS: Record<string, string> = {
  info: 'var(--text-secondary)',
  warning: 'var(--status-warning)',
  error: 'var(--status-error)',
  critical: 'var(--status-error)',
};

const levelDistData = computed(() => {
  const byLevel = store.statistics?.byLevel || {};
  const total = store.statistics?.total || 1;
  const keys = ['critical', 'error', 'warning', 'info'];
  return keys.map((key) => ({
    key,
    label: levelLabel(key),
    count: byLevel[key] || 0,
    pct: total > 0 ? Math.round(((byLevel[key] || 0) / total) * 100) : 0,
    color: LEVEL_COLORS[key] || 'var(--text-secondary)',
  }));
});

function levelColor(level: string): string {
  return LEVEL_COLORS[level] || 'var(--text-secondary)';
}

const ruleColumns = computed<SmartTableColumn[]>(() => [
  { key: 'name', title: t('system.alarms.ruleName'), dataKey: 'name' },
  { key: 'tag', title: t('system.alarms.relatedTag'), dataKey: 'tag', render: (v: any) => v?.name || '-' },
  { key: 'condition', title: t('system.alarms.condition'), dataKey: 'condition', render: (v, row: any) => `${v} ${row.conditionValue || ''}` },
  { key: 'level', title: t('system.alarms.level'), dataKey: 'level' },
  { key: 'debounceMs', title: t('system.alarms.debounce'), dataKey: 'debounceMs', render: (v) => `${v}ms` },
  { key: 'enabled', title: t('system.alarms.status'), dataKey: 'enabled' },
]);

// 全选状态
const isAllSelected = computed(() => filteredRecords.value.length > 0 && filteredRecords.value.every((r) => selectedIds.value.has(r.id)));
const isIndeterminate = computed(() => {
  const count = filteredRecords.value.filter((r) => selectedIds.value.has(r.id)).length;
  return count > 0 && count < filteredRecords.value.length;
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(filteredRecords.value.map((r) => r.id));
  }
}

function toggleRow(id: string) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedIds.value = next;
}

function clearSelection() {
  selectedIds.value = new Set();
}

function levelLabel(l: string) {
  const labels: Record<string, string> = {
    info: t('system.alarms.levelInfo'),
    warning: t('system.alarms.levelWarning'),
    error: t('system.alarms.levelError'),
    critical: t('system.alarms.levelCritical'),
  };
  return labels[l] || l;
}

function statusLabel(s: string) {
  const labels: Record<string, string> = {
    active: t('system.alarms.active'),
    acknowledged: t('system.alarms.acknowledged'),
    cleared: t('system.alarms.cleared'),
    shelved: t('system.alarms.shelved'),
  };
  return labels[s] || s;
}

function formatNumber(val: number): string {
  if (val == null) return '-';
  return Number.isInteger(val) ? String(val) : Number(val).toFixed(2);
}

function formatDate(d?: string): string {
  if (!d) return '-';
  return new Date(d).toLocaleString('zh-CN');
}

function formatTrendDate(d: string): string {
  if (!d) return '';
  return d.substring(5);
}

function barHeight(count: number): number {
  const maxCount = Math.max(...store.trends.map((t: any) => t.count), 1);
  return Math.max(4, (count / maxCount) * 120);
}

async function handleAcknowledge(recordId: string) {
  if (!selectedProjectId.value) return;
  try { await store.acknowledgeAlarm(selectedProjectId.value, recordId); } catch { /* ignore */ }
}

async function handleClear(recordId: string) {
  if (!selectedProjectId.value) return;
  try { await store.clearAlarm(selectedProjectId.value, recordId); } catch { /* ignore */ }
}

function openAlarmDataDialog(row: any) {
  alarmDialogRecord.value = row;
  alarmDialogVisible.value = true;
}

async function handleBatchAcknowledge() {
  if (!selectedProjectId.value || selectedIds.value.size === 0) return;
  try {
    await store.batchAcknowledgeAlarms(selectedProjectId.value, [...selectedIds.value]);
    clearSelection();
  } catch { /* ignore */ }
}

async function handleBatchClear() {
  if (!selectedProjectId.value || selectedIds.value.size === 0) return;
  try {
    await store.batchClearAlarms(selectedProjectId.value, [...selectedIds.value]);
    clearSelection();
  } catch { /* ignore */ }
}

function buildFilterParams() {
  const params: Record<string, any> = {};
  if (filters.level) params.level = filters.level;
  if (filters.status) params.status = filters.status;
  if (filters.keyword) params.keyword = filters.keyword;
  if (filters.alarmType) params.alarmType = filters.alarmType;
  if (filters.dispositionType) params.dispositionType = filters.dispositionType;
  if (filters.dateRange.start) params.startDate = filters.dateRange.start;
  if (filters.dateRange.end) params.endDate = filters.dateRange.end;
  // Phase 5.6：基于 isActive 字段显式区分实时/历史
  if (recordsScope.value === 'realtime') params.isActive = true;
  else if (recordsScope.value === 'history') params.isActive = false;
  return params;
}

/** 切换实时/历史子标签（Phase 5.6） */
function switchRecordsScope(scope: 'all' | 'realtime' | 'history') {
  if (recordsScope.value === scope) return;
  recordsScope.value = scope;
  clearSelection();
  // 切换 scope 后实时拉取（applyFilters 已封装加载逻辑）
  applyFilters();
}

async function applyFilters() {
  if (!selectedProjectId.value) return;
  clearSelection();
  currentPage.value = 1;
  await store.fetchRecords(selectedProjectId.value, buildFilterParams());
}

function resetFilters() {
  filters.level = '';
  filters.status = '';
  filters.keyword = '';
  filters.alarmType = '';
  filters.dispositionType = '';
  filters.dateRange = { start: '', end: '' };
  applyFilters();
}

async function fetchData() {
  if (!selectedProjectId.value) return;
  await Promise.all([
    store.fetchRules(selectedProjectId.value),
    store.fetchRecords(selectedProjectId.value, buildFilterParams()),
  ]);
}

async function fetchStatsData() {
  if (!selectedProjectId.value) return;
  statsLoading.value = true;
  try {
    await Promise.all([
      store.fetchStatistics(selectedProjectId.value),
      store.fetchTrends(selectedProjectId.value),
      store.fetchTopRules(selectedProjectId.value),
      store.fetchStatsByDevice(selectedProjectId.value),
      store.fetchStatsByTag(selectedProjectId.value),
    ]);
  } finally {
    statsLoading.value = false;
  }
}

function switchTab(tab: typeof activeTab.value) {
  activeTab.value = tab;
  if (tab === 'stats') {
    fetchStatsData();
  }
}

function onProjectChange() {
  clearSelection();
  resetFilters();
  recordsScope.value = 'all';
  fetchData();
  // 如果当前在统计标签页，切换项目后也需要刷新统计
  if (activeTab.value === 'stats') {
    fetchStatsData();
  }
}

onMounted(async () => {
  if (!projectStore.projects.length) await projectStore.fetchProjects();
  if (!selectedProjectId.value && projectStore.projects.length > 0) {
    // 优先使用默认项目，否则选中第一个
    const defaultId = await loadDefault();
    if (defaultId && projectStore.projects.some(p => p.projectId === defaultId)) {
      selectedProjectId.value = defaultId;
    } else {
      selectedProjectId.value = projectStore.projects[0].projectId;
    }
  }
  // 加载字典（告警类型、处置类型）—— 全局字典，加载一次即可
  loadDicts();
  await fetchData();
});
</script>

<style scoped>
.alarm-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
}

/* ===== 统一工具栏 ===== */
.unified-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
}

.toolbar-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.toolbar-select,
.toolbar-input {
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--text);
  font-size: 13px;
  min-width: 120px;
}

.toolbar-select:focus,
.toolbar-input:focus {
  outline: none;
  border-color: var(--primary);
}

.alarm-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--status-error);
  font-weight: 500;
  white-space: nowrap;
}

.active-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-error);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ===== 筛选栏 ===== */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-shrink: 0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-item label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.filter-select,
.filter-input {
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--text);
  font-size: 13px;
  min-width: 120px;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: var(--primary);
}

.filter-date { min-width: 140px; }

.filter-actions {
  display: flex;
  gap: 6px;
}

/* ===== 批量操作栏 ===== */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: color-mix(in srgb, var(--primary) 10%, var(--surface));
  border: 1px solid var(--primary);
  border-radius: 8px;
  flex-shrink: 0;
}

.batch-info {
  font-size: 13px;
  color: var(--primary);
  font-weight: 500;
  margin-right: auto;
}

/* ===== 表格 ===== */
.records-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.records-table th {
  padding: 10px 12px;
  background: var(--surface);
  color: var(--text-secondary);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
}

.records-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.records-table tbody tr:hover { background: var(--surface); }
.records-table tbody tr.row-selected { background: color-mix(in srgb, var(--primary) 8%, var(--background)); }

.col-check { width: 40px; text-align: center; }
.col-time { min-width: 160px; }
.col-rule { min-width: 100px; }
.col-level { min-width: 80px; }
.col-type { min-width: 90px; }
.col-disposition { min-width: 100px; }
.col-value { min-width: 90px; }
.col-msg { min-width: 120px; }
.col-status { min-width: 90px; }
.col-actions { min-width: 130px; }

.empty-row {
  text-align: center !important;
  color: var(--text-secondary) !important;
  padding: 40px 12px !important;
}

.records-table input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: var(--primary);
  cursor: pointer;
}

/* ===== Tabs ===== */
.tabs {
  display: flex; gap: 4px; margin-bottom: 20px;
  border-bottom: 1px solid var(--border); padding-bottom: 0;
  flex-shrink: 0;
}

.tab {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  background: none; border: none;
  color: var(--text-secondary); font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s;
}

.tab:hover { color: var(--text); }

.tab.active {
  color: var(--status-info);
  border-bottom-color: var(--primary);
}

.tab-badge {
  background: var(--status-error); color: var(--text);
  font-size: 11px; padding: 1px 6px; border-radius: 10px; font-weight: 600;
}

.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 子标签（实时/历史，Phase 5.6） ===== */
.sub-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  padding: 4px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: fit-content;
}

.sub-tabs-inline {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.filter-divider {
  width: 1px;
  height: 24px;
  background: var(--border);
  flex-shrink: 0;
}

.sub-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.sub-tab:hover { color: var(--text); background: var(--surface); }

.sub-tab.active {
  background: var(--surface);
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.sub-tab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--status-error);
  animation: pulse 2s infinite;
}

.sub-tab-badge {
  background: var(--status-error);
  color: var(--text);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.col-recovered { min-width: 150px; }
.text-muted { color: var(--text-secondary); font-size: 12px; }
.recovered-time { font-size: 12px; color: var(--text); }
.recovered-value { font-size: 11px; color: var(--status-success); margin-top: 2px; }

/* ===== Badges ===== */
.level-badge {
  display: inline-block; padding: 2px 10px;
  border-radius: 10px; font-size: 12px; font-weight: 500;
}

.level-info { background: var(--border); color: var(--text-secondary); }
.level-warning { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
.level-error { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }
.level-critical { background: color-mix(in srgb, var(--status-error) 22%, transparent); color: var(--status-error); font-weight: 700; }

.status-badge {
  display: inline-block; padding: 2px 10px;
  border-radius: 10px; font-size: 12px; font-weight: 500;
}

.status-active { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }
.status-acknowledged { background: color-mix(in srgb, var(--status-info) 15%, transparent); color: var(--status-info); }
.status-cleared { background: color-mix(in srgb, var(--status-success) 15%, transparent); color: var(--status-success); }
.status-shelved { background: var(--border); color: var(--text-secondary); }

.tag-status { display: inline-block; padding: 1px 8px; border-radius: 8px; font-size: 12px; }
.tag-status.enabled { background: color-mix(in srgb, var(--status-success) 15%, transparent); color: var(--status-success); }
.tag-status.disabled { background: var(--border); color: var(--text-secondary); }

/* ===== 按钮 ===== */
.row-actions { display: flex; gap: 4px; }

/* ===== Rules Tab ===== */
.rules-toolbar {
  display: flex; justify-content: flex-end; margin-bottom: 12px;
}
.rules-toolbar .sys-btn { gap: 6px; }

.rules-hint-banner {
  padding: 10px 16px; margin-bottom: 12px;
  background: var(--background); border: 1px solid var(--border-light);
  border-radius: var(--radius-md); color: var(--text-secondary);
  font-size: 13px; line-height: 1.5;
}

/* ===== Stats Tab ===== */
.stats-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 16px; margin-bottom: 24px;
}

.stat-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 20px; text-align: center;
  border-left: 3px solid var(--border);
}
.stat-card-active { border-left-color: var(--status-error); }
.stat-card-ack { border-left-color: var(--status-warning); }
.stat-card-clr { border-left-color: var(--status-success); }

.stat-value { font-size: 32px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.stat-label { font-size: 13px; color: var(--text-secondary); }

.text-danger { color: var(--status-error); }
.text-warning { color: var(--status-warning); }
.text-success { color: var(--status-success); }

/* 双栏布局 */
.stats-two-col {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 16px; margin-bottom: 24px;
}

.stats-panel {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 20px 24px;
}

/* 级别分布 */
.level-dist { display: flex; flex-direction: column; gap: 10px; }

.level-dist-row {
  display: flex; align-items: center; gap: 10px;
}

.level-dist-label {
  min-width: 52px; font-size: 12px; font-weight: 600;
  text-align: center; padding: 2px 8px; border-radius: 4px;
}
.level-tag-info { background: color-mix(in srgb, var(--text-secondary) 15%, transparent); color: var(--text-secondary); }
.level-tag-warning { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
.level-tag-error { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }
.level-tag-critical { background: color-mix(in srgb, var(--status-error) 22%, transparent); color: var(--status-error); }

.level-dist-bar-wrap {
  flex: 1; height: 8px; background: var(--background);
  border-radius: 4px; overflow: hidden;
}

.level-dist-bar {
  height: 100%; border-radius: 4px; transition: width 0.4s ease;
}

.level-dist-count { font-size: 13px; color: var(--text); font-weight: 600; min-width: 28px; text-align: right; }

.level-dist-pct { font-size: 12px; color: var(--text-secondary); min-width: 32px; text-align: right; }

/* Top 报警规则 */
.top-rules-list { display: flex; flex-direction: column; gap: 8px; }

.top-rule-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--border);
}
.top-rule-row:last-child { border-bottom: none; }

.top-rule-rank {
  width: 24px; height: 24px; border-radius: 6px;
  background: var(--border); color: var(--text-secondary);
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.top-rule-row:nth-child(1) .top-rule-rank { background: color-mix(in srgb, var(--status-warning) 18%, transparent); color: var(--status-warning); }
.top-rule-row:nth-child(2) .top-rule-rank { background: color-mix(in srgb, var(--status-info) 18%, transparent); color: var(--status-info); }
.top-rule-row:nth-child(3) .top-rule-rank { background: color-mix(in srgb, var(--status-success) 18%, transparent); color: var(--status-success); }

.top-rule-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.top-rule-name { font-size: 13px; color: var(--text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.top-rule-last { font-size: 11px; color: var(--text-secondary); }

.top-rule-count {
  font-size: 14px; font-weight: 700; color: var(--text);
  flex-shrink: 0;
}

.empty-state-small {
  display: flex; align-items: center; justify-content: center;
  padding: 30px 20px; color: var(--text-secondary); font-size: 13px;
}

.trends-section {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 20px 24px;
}

.section-title {
  font-size: 16px; font-weight: 600; color: var(--text);
  margin: 0 0 16px 0;
}

.trends-bar {
  display: flex; align-items: flex-end; gap: 8px;
  height: 180px; padding-bottom: 20px;
}

.trend-bar-wrap {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: flex-end; height: 100%;
}

.trend-bar-label { font-size: 11px; color: var(--text); margin-bottom: 4px; }

.trend-bar {
  width: 100%; max-width: 40px; background: var(--primary);
  border-radius: 4px 4px 0 0; transition: height 0.3s; min-width: 16px;
}

.trend-bar-date { font-size: 10px; color: var(--text-secondary); margin-top: 6px; }

/* States */
.error-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 80px 20px;
  color: var(--text-secondary); gap: 12px;
}

.empty-state {
  display: flex; align-items: center; justify-content: center;
  padding: 60px 20px; color: var(--text-secondary); font-size: 14px;
}
</style>
