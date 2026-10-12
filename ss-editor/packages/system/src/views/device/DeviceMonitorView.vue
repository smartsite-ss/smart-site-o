<template>
  <div class="device-monitor-view">
    <!-- 左侧：项目/分组/设备 三级树 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">{{ $t('system.deviceMonitor.deviceTree') }}</span>
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
              active: projectId === proj.projectId && !selectedDeviceId
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
              class="node-icon project-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <ellipse
                cx="12"
                cy="5"
                rx="9"
                ry="3"
              />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span class="node-label">{{ proj.projectName }}</span>
            <span class="node-count">{{ getProjectDeviceCount(proj.projectId) }}</span>
          </div>

          <!-- 展开后的分组和设备 -->
          <div
            v-if="expandedProjects.has(proj.projectId)"
            class="project-children"
          >
            <div
              v-if="loadingGroups.has(proj.projectId)"
              class="tree-loading"
            >
              {{ $t('common.loading') }}
            </div>
            <template
              v-for="group in getTopLevelGroups(proj.projectId)"
              v-else
              :key="group.id"
            >
              <MonitorGroupTreeNode
                :group="group"
                :project-id="proj.projectId"
                :depth="1"
                :expanded-groups="expandedGroups"
                :selected-device-id="selectedDeviceId"
                :group-device-cache="groupDeviceCache"
                :group-tree-cache="projectGroupTrees"
                @toggle-group="toggleGroupNode"
                @select-device="selectDeviceNode"
              />
            </template>
            <!-- 未分组的根设备（直接挂载在项目节点下） -->
            <div
              v-for="dev in getRootDevices(proj.projectId)"
              :key="'root-dev-' + dev.id"
              class="tree-node device-node root-device-node"
              :class="{ active: selectedDeviceId === dev.id }"
              @click="selectDeviceNode(proj.projectId, '', dev.id)"
            >
              <span class="chevron-placeholder" />
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
              v-if="getTopLevelGroups(proj.projectId).length === 0 && getRootDevices(proj.projectId).length === 0 && !loadingGroups.has(proj.projectId)"
              class="tree-empty-small"
            >
              {{ $t('system.devices.noGroups') }}
            </div>
          </div>
        </template>
      </div>
    </aside>

    <!-- 右侧：设备详情 -->
    <div class="main-content">
      <!-- 未选中设备时的空状态 -->
      <div
        v-if="!selectedDeviceId"
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
        <h3>{{ $t('system.deviceMonitor.selectDeviceHint') }}</h3>
        <p>{{ $t('system.deviceMonitor.selectDeviceDesc') }}</p>
      </div>

      <template v-else>
        <!-- 设备头部 -->
        <div class="device-header">
          <div class="device-header-left">
            <h1 class="device-name">
              {{ device?.deviceName || selectedDeviceId }}
            </h1>
            <span
              v-if="device"
              class="status-badge"
              :class="'status-' + device.status"
              :title="device.status === 'error' ? $t('system.devices.dblclickForErrorDetail') : ''"
              @dblclick="device.status === 'error' && showErrorDetail()"
            >
              {{ deviceStatusLabel(device.status) }}
            </span>
            <span
              v-if="device"
              class="type-badge"
            >{{ deviceTypeLabel(device.type) }}</span>
            <code
              v-if="deviceDeviceCode"
              class="device-code"
            >{{ deviceDeviceCode }}</code>
          </div>
        </div>

        <!-- Tab 切换 -->
        <div class="tab-bar">
          <button
            class="tab-item"
            :class="{ active: activeTab === 'realtime' }"
            @click="activeTab = 'realtime'"
          >
            {{ $t('system.deviceMonitor.tabRealtime') }}
          </button>
          <button
            class="tab-item"
            :class="{ active: activeTab === 'basic' }"
            @click="activeTab = 'basic'"
          >
            {{ $t('system.deviceMonitor.tabBasic') }}
          </button>
          <button
            class="tab-item"
            :class="{ active: activeTab === 'alarms' }"
            @click="activeTab = 'alarms'"
          >
            {{ $t('system.deviceMonitor.tabAlarms') }}
          </button>
        </div>

        <!-- Tab 内容 -->
        <div class="tab-content">
          <!-- 基本信息 -->
          <div
            v-if="activeTab === 'basic'"
            class="tab-pane"
          >
            <SsLoading
              v-if="detailLoading && !device"
              :text="$t('common.loading')"
              size="small"
            />
            <div
              v-else-if="!device"
              class="empty-state-small"
            >
              {{ $t('system.deviceDetail.notFound') }}
            </div>
            <template v-else>
              <!-- 分组1：标识信息 -->
              <section class="info-section">
                <header class="info-section-header">
                  <svg
                    class="section-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                    />
                  </svg>
                  <h3 class="section-title">
                    {{ $t('system.deviceMonitor.groupIdentity') }}
                  </h3>
                </header>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">{{ $t('common.deviceCode') }}</span>
                    <span class="info-value mono device-value">{{ deviceDeviceCode || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('system.deviceMonitor.deviceName') }}</span>
                    <span class="info-value">{{ device.deviceName || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('common.nameAlias') }}</span>
                    <span class="info-value">{{ deviceNameAlias || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('system.deviceMonitor.description') }}</span>
                    <span class="info-value info-value-multiline">{{ device.description || '-' }}</span>
                  </div>
                </div>
              </section>

              <!-- 分组2：协议与配置 -->
              <section class="info-section">
                <header class="info-section-header">
                  <svg
                    class="section-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  <h3 class="section-title">
                    {{ $t('system.deviceMonitor.groupProtocol') }}
                  </h3>
                </header>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">{{ $t('system.deviceMonitor.deviceType') }}</span>
                    <span class="info-value">
                      <span class="type-badge">{{ deviceTypeLabel(device.type) }}</span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('system.deviceMonitor.driver') }}</span>
                    <span class="info-value">
                      <span
                        v-if="deviceDriver"
                        class="driver-inline-tag"
                      >{{ deviceDriver }}</span>
                      <span v-else>-</span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('common.template') }}</span>
                    <span class="info-value mono">{{ deviceTemplateId || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('system.deviceMonitor.scanRate') }}</span>
                    <span class="info-value">{{ formatPeriod(device.scanRate) }}</span>
                  </div>
                </div>
              </section>

              <!-- 分组3：运行状态 -->
              <section class="info-section">
                <header class="info-section-header">
                  <svg
                    class="section-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <h3 class="section-title">
                    {{ $t('system.deviceMonitor.groupRuntime') }}
                  </h3>
                </header>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">{{ $t('system.deviceMonitor.tagCount') }}</span>
                    <span class="info-value">
                      <span class="tag-count-pill">{{ deviceTags.length }} <em>{{ $t('system.deviceMonitor.tags') }}</em></span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('system.deviceMonitor.errorCount') }}</span>
                    <span class="info-value">
                      <span
                        class="error-pill"
                        :class="{ 'error-pill-active': (device.errorCount ?? 0) > 0 }"
                      >{{ device.errorCount || 0 }}</span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('system.deviceMonitor.lastOnline') }}</span>
                    <span class="info-value">
                      <span
                        v-if="device.lastOnlineAt"
                        class="status-time-row"
                      >
                        <span
                          class="status-time-dot"
                          :class="'status-' + (device.status || 'offline')"
                        />
                        <span class="mono">{{ formatTime(device.lastOnlineAt) }}</span>
                      </span>
                      <span
                        v-else
                        class="info-value-empty"
                      >{{ $t('system.deviceMonitor.neverOnline') }}</span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('system.deviceMonitor.lastData') }}</span>
                    <span class="info-value">
                      <span
                        v-if="device.lastDataAt"
                        class="mono"
                      >{{ formatTime(device.lastDataAt) }}</span>
                      <span
                        v-else
                        class="info-value-empty"
                      >{{ $t('system.deviceMonitor.noData') }}</span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ $t('system.deviceMonitor.updateTime') }}</span>
                    <span class="info-value mono">{{ formatTime(device.updatedAt) }}</span>
                  </div>
                </div>
              </section>

              <!-- 通道配置 -->
              <section
                v-if="deviceConnection && Object.keys(deviceConnection).length > 0"
                class="info-section"
              >
                <header class="info-section-header">
                  <svg
                    class="section-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="9"
                      height="9"
                      rx="1"
                    />
                    <rect
                      x="13"
                      y="2"
                      width="9"
                      height="9"
                      rx="1"
                    />
                    <rect
                      x="2"
                      y="13"
                      width="9"
                      height="9"
                      rx="1"
                    />
                    <rect
                      x="13"
                      y="13"
                      width="9"
                      height="9"
                      rx="1"
                    />
                  </svg>
                  <h3 class="section-title">
                    {{ $t('system.devices.channelConfig') }}
                  </h3>
                  <span
                    v-if="deviceDriver"
                    class="driver-tag"
                  >{{ deviceDriver }}</span>
                </header>
                <div class="channel-grid">
                  <div
                    v-for="(value, key) in deviceConnection"
                    :key="key"
                    class="channel-item"
                  >
                    <span class="channel-label">{{ key }}</span>
                    <span class="channel-value">{{ maskSensitive(String(key), value) }}</span>
                  </div>
                </div>
              </section>
            </template>
          </div>

          <!-- 实时数据 -->
          <div
            v-if="activeTab === 'realtime'"
            class="tab-pane tab-pane-full"
          >
            <div class="tab-pane-header">
              <div class="tab-pane-actions">
                <button
                  class="btn btn-secondary btn-sm"
                  @click="toggleAutoRefresh"
                >
                  <span
                    class="auto-dot"
                    :class="{ active: autoRefresh }"
                  />
                  {{ autoRefresh ? $t('system.pipeline.autoRefreshOn') : $t('system.pipeline.autoRefreshOff') }}
                </button>
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="realtimeLoading"
                  @click="refreshRealtimeData"
                >
                  {{ realtimeLoading ? $t('system.pipeline.refreshing') : $t('system.pipeline.refresh') }}
                </button>
                <span
                  v-if="wsConnected"
                  class="ws-status ws-connected"
                >
                  <span class="ws-dot" /> {{ $t('system.deviceMonitor.wsLabel') }} {{ $t('system.deviceMonitor.connected') }}
                </span>
                <span
                  v-else
                  class="ws-status ws-disconnected"
                >
                  <span class="ws-dot" /> {{ $t('system.deviceMonitor.wsLabel') }} {{ $t('system.deviceMonitor.disconnected') }}
                </span>
              </div>
            </div>

            <SsLoading
              v-if="realtimeLoading && tagDataList.length === 0"
              :text="$t('common.loading')"
              size="small"
            />
            <div
              v-else-if="tagDataList.length === 0"
              class="empty-state-small"
            >
              {{ $t('system.devices.noTagData') }}
            </div>
            <table
              v-else
              class="tag-data-table"
            >
              <thead>
                <tr>
                  <th>{{ $t('system.devices.tagName') }}</th>
                  <th class="desc-col">
                    {{ $t('system.devices.tagDescription') }}
                  </th>
                  <th>{{ $t('system.deviceTemplate.varCategory') }}</th>
                  <th>{{ $t('system.devices.tagAddress') }}</th>
                  <th>{{ $t('system.devices.tagDataType') }}</th>
                  <th class="num-col">
                    {{ $t('system.devices.tagScanRate') }}
                  </th>
                  <th>{{ $t('system.devices.tagDirection') }}</th>
                  <th>{{ $t('system.devices.tagUnit') }}</th>
                  <th>{{ $t('system.devices.displayFormat') }}</th>
                  <th class="num-col">
                    {{ $t('system.devices.tagHighLimit') }}
                  </th>
                  <th class="num-col">
                    {{ $t('system.devices.tagLowLimit') }}
                  </th>
                  <th class="num-col">
                    {{ $t('system.devices.tagValue') }}
                  </th>
                  <th>{{ $t('common.quality') }}</th>
                  <th>{{ $t('system.devices.tagUpdatedAt') }}</th>
                  <th class="actions-col">
                    {{ $t('common.actions') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="tag in tagDataList"
                  :key="tag.id || tag.name"
                  class="tag-row"
                  :class="{ 'alarm-row': tag.activeAlarms?.length }"
                >
                  <td class="tag-name">
                    {{ tag.name }}
                  </td>
                  <td class="desc-col tag-desc">
                    {{ tag.description || '-' }}
                  </td>
                  <td class="tag-category">
                    <DictLabel
                      dict-id="variableCategory"
                      :value="tag.category ?? ''"
                      :locale="locale"
                      fallback="-"
                    />
                  </td>
                  <td class="tag-address mono">
                    {{ tag.address || '-' }}
                  </td>
                  <td>
                    <span class="type-badge">{{ tag.dataType || '-' }}</span>
                  </td>
                  <td class="num-col mono">
                    {{ tag.scanRate != null ? tag.scanRate + 'ms' : '-' }}
                  </td>
                  <td>
                    <span
                      class="direction-badge"
                      :class="{
                        'dir-read': tag.direction === 'read',
                        'dir-write': tag.direction === 'write',
                        'dir-rw': tag.direction === 'read-write',
                      }"
                    >
                      {{ getDirectionLabel(tag.direction) }}
                    </span>
                  </td>
                  <td class="tag-unit">
                    {{ tag.unit || '-' }}
                  </td>
                  <td class="mono">
                    {{ tag.displayFormat || '-' }}
                  </td>
                  <td class="num-col mono">
                    {{ tag.alarmHigh ?? '-' }}
                  </td>
                  <td class="num-col mono">
                    {{ tag.alarmLow ?? '-' }}
                  </td>
                  <td class="num-col">
                    <span
                      class="tag-value"
                      :class="{
                        'value-null': tag.value === null || tag.value === undefined,
                        'value-alarm': tag.activeAlarms?.length,
                      }"
                    >
                      {{ tag.wsDisplayValue ?? formatTagValue(tag.value, tag.displayFormat) }}
                    </span>
                  </td>
                  <td>
                    <span
                      class="quality-badge"
                      :class="tag.quality === 'good' ? 'quality-good' : 'quality-bad'"
                    >
                      {{ tag.quality || $t('common.notAvailable') }}
                    </span>
                  </td>
                  <td class="tag-time mono">
                    {{ formatTime(tag.timestamp) }}
                  </td>
                  <td class="actions-col">
                    <div class="actions-btn-group">
                      <button
                        class="btn btn-history"
                        :title="$t('system.tagHistory.clickToQuery')"
                        @click.stop="openTagHistory(tag)"
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
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                        {{ $t('system.tagHistory.view') }}
                      </button>
                      <button
                        class="btn btn-detail"
                        :title="$t('system.tagDetail.viewDetail')"
                        @click.stop="openTagDetail(tag)"
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
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                          />
                          <line
                            x1="12"
                            y1="16"
                            x2="12"
                            y2="12"
                          />
                          <line
                            x1="12"
                            y1="8"
                            x2="12.01"
                            y2="8"
                          />
                        </svg>
                        {{ $t('system.tagDetail.viewDetail') }}
                      </button>
                      <button
                        v-if="tag.direction === 'write' || tag.direction === 'read-write'"
                        class="btn btn-write"
                        :title="$t('system.deviceControl.write')"
                        @click.stop="openWriteModal(tag)"
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
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {{ $t('system.deviceControl.write') }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 报警规则 -->
          <div
            v-if="activeTab === 'alarms'"
            class="tab-pane"
          >
            <div class="tab-pane-header">
              <div class="tab-pane-actions">
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="alarmLoading"
                  @click="loadAlarmRules"
                >
                  {{ alarmLoading ? $t('system.pipeline.refreshing') : $t('system.pipeline.refresh') }}
                </button>
                <span class="alarm-count">
                  {{ $t('system.deviceMonitor.alarmRuleCount', { count: deviceAlarmRules.length }) }}
                </span>
              </div>
            </div>

            <SsLoading
              v-if="alarmLoading && deviceAlarmRules.length === 0"
              :text="$t('common.loading')"
              size="small"
            />
            <div
              v-else-if="deviceAlarmRules.length === 0"
              class="empty-state-small"
            >
              {{ $t('system.deviceMonitor.noAlarmRules') }}
            </div>
            <table
              v-else
              class="alarm-rules-table"
            >
              <thead>
                <tr>
                  <th>{{ $t('system.deviceMonitor.alarmRuleName') }}</th>
                  <th>{{ $t('system.deviceMonitor.alarmTagName') }}</th>
                  <th>{{ $t('system.deviceMonitor.alarmLevel') }}</th>
                  <th>{{ $t('system.deviceMonitor.alarmCondition') }}</th>
                  <th>{{ $t('system.deviceMonitor.alarmThreshold') }}</th>
                  <th>{{ $t('system.deviceMonitor.alarmEnabled') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="rule in deviceAlarmRules"
                  :key="rule.id"
                >
                  <td class="rule-name">
                    {{ rule.name }}
                  </td>
                  <td>{{ rule.tag?.name || rule.tagId }}</td>
                  <td>
                    <span
                      class="level-badge"
                      :class="'level-' + rule.level"
                    >{{ alarmLevelLabel(rule.level) }}</span>
                  </td>
                  <td>{{ alarmConditionLabel(rule.condition) }}</td>
                  <td class="num-col mono">
                    {{ rule.conditionValue }}
                  </td>
                  <td>
                    <span
                      class="enabled-badge"
                      :class="rule.enabled ? 'enabled-yes' : 'enabled-no'"
                    >
                      {{ rule.enabled ? $t('common.yes') : $t('common.no') }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- 标签历史数据弹窗 -->
    <TagHistoryDialog
      v-model:visible="tagHistoryVisible"
      :tag-id="tagHistoryTagId"
      :tag-name="tagHistoryTagName"
      :tag-address="tagHistoryTagAddress"
      :display-format="tagHistoryDisplayFormat"
      :unit="tagHistoryUnit"
      :data-type="tagHistoryDataType"
      :project-id="projectId"
    />

    <!-- 标签详情弹窗 -->
    <TagDetailDialog
      v-model:visible="tagDetailVisible"
      :tag-data="tagDetailData"
    />

    <!-- 反控写入弹窗 -->
    <Teleport to="body">
      <div
        v-if="writeModalVisible"
        class="modal-overlay"
        @click.self="writeModalVisible = false"
      >
        <div class="modal-panel modal-write">
          <div class="modal-header">
            <h3 class="modal-title">
              {{ $t('system.deviceControl.writeTitle') }}
            </h3>
            <button
              class="modal-close"
              @click="writeModalVisible = false"
            >
              &times;
            </button>
          </div>
          <div class="modal-body">
            <div class="write-info">
              <div class="write-info-item">
                <span class="write-info-label">{{ $t('system.deviceMonitor.deviceName') }}</span>
                <span class="write-info-value">{{ device?.deviceName || '-' }}</span>
              </div>
              <div class="write-info-item">
                <span class="write-info-label">{{ $t('system.deviceTemplate.varName') }}</span>
                <span class="write-info-value">{{ writeTag?.name || '-' }}</span>
              </div>
              <div class="write-info-item">
                <span class="write-info-label">{{ $t('system.deviceTemplate.varAddress') }}</span>
                <span class="write-info-value mono">{{ writeTag?.address || '-' }}</span>
              </div>
              <div class="write-info-item">
                <span class="write-info-label">{{ $t('system.deviceControl.currentValue') }}</span>
                <span class="write-info-value mono">
                  {{ writeTag?.wsDisplayValue ?? formatTagValue(writeTag?.value, writeTag?.displayFormat) }}
                  {{ writeTag?.unit || '' }}
                </span>
              </div>
            </div>
            <div class="form-group">
              <label>{{ $t('system.deviceControl.newValue') }} <span class="required">*</span></label>
              <input
                v-model="writeValue"
                type="text"
                class="form-input"
                :placeholder="$t('system.deviceControl.newValue')"
              >
            </div>
            <div class="form-group">
              <label>{{ $t('system.deviceControl.reason') }}</label>
              <input
                v-model="writeReason"
                type="text"
                class="form-input"
                :placeholder="$t('system.deviceControl.reasonPlaceholder')"
              >
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-cancel"
              @click="writeModalVisible = false"
            >
              {{ $t('system.messageBox.cancel') }}
            </button>
            <button
              class="btn btn-primary"
              :disabled="writeLoading"
              @click="handleWriteTag"
            >
              {{ writeLoading ? $t('system.pipeline.refreshing') : $t('system.deviceControl.confirmWrite') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 设备错误详情面板 -->
    <Teleport to="body">
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
                <span class="error-info-value">{{ device?.deviceName || '-' }}</span>
              </div>
              <div class="error-info-row">
                <span class="error-info-label">{{ $t('common.deviceCode') }}</span>
                <span class="error-info-value mono">{{ deviceDeviceCode || '-' }}</span>
              </div>
              <div class="error-info-row">
                <span class="error-info-label">{{ $t('system.devices.driver') }}</span>
                <span class="error-info-value">{{ device?.driver || '-' }}</span>
              </div>
              <div class="error-info-divider" />
              <div class="error-info-row">
                <span class="error-info-label">{{ $t('system.deviceMonitor.status') }}</span>
                <span
                  class="status-badge"
                  :class="'status-' + (device?.status || 'offline')"
                >{{ deviceStatusLabel(device?.status || 'offline') }}</span>
              </div>
              <div class="error-info-row">
                <span class="error-info-label">{{ $t('system.deviceMonitor.errorCount') }}</span>
                <span class="error-info-value">
                  <span
                    class="error-pill"
                    :class="{ 'error-pill-active': (device?.errorCount ?? 0) > 0 }"
                  >{{ device?.errorCount ?? 0 }}</span>
                </span>
              </div>
              <div
                v-if="device?.lastErrorMsg"
                class="error-message-card"
              >
                <div class="error-message-title">
                  {{ $t('system.devices.errorMessage') }}
                </div>
                <pre class="error-message-content">{{ device.lastErrorMsg }}</pre>
              </div>
              <div
                v-else
                class="error-message-card error-message-card-empty"
              >
                <span class="error-message-empty">{{ $t('system.devices.noErrorMessage') }}</span>
              </div>
              <!-- 采集诊断数据 -->
              <div
                v-if="device?._diagnostics"
                class="error-info-divider"
              />
              <div
                v-if="device?._diagnostics"
                class="error-info-diagnostics"
              >
                <div class="diagnostics-title">
                  {{ $t('system.devices.diagnosticsTitle') }}
                </div>
                <div
                  v-if="device._diagnostics.circuitState"
                  class="error-info-row"
                >
                  <span class="error-info-label">{{ $t('system.devices.circuitState') }}</span>
                  <span
                    class="diagnostics-value"
                    :class="'circuit-' + device._diagnostics.circuitState"
                  >{{ $t('system.devices.circuitState_' + device._diagnostics.circuitState) }}</span>
                </div>
                <div
                  v-if="device._diagnostics.consecutiveFailures != null"
                  class="error-info-row"
                >
                  <span class="error-info-label">{{ $t('system.devices.consecutiveFailures') }}</span>
                  <span class="error-info-value">{{ device._diagnostics.consecutiveFailures }}</span>
                </div>
                <div
                  v-if="device._diagnostics.retryCount != null"
                  class="error-info-row"
                >
                  <span class="error-info-label">{{ $t('system.devices.retryCount') }}</span>
                  <span class="error-info-value">{{ device._diagnostics.retryCount }}</span>
                </div>
                <div
                  v-if="device._diagnostics.lastErrorAt"
                  class="error-info-row"
                >
                  <span class="error-info-label">{{ $t('system.devices.lastErrorAt') }}</span>
                  <span class="error-info-value mono">{{ formatErrorTime(device._diagnostics.lastErrorAt) }}</span>
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
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch } from 'vue';
import { useI18n } from '@scada-editor/core';
import { useDeviceStore } from '../../stores/device.store';
import { useProjectStore } from '../../stores/project.store';
import { useWsStore } from '../../stores/ws.store';
import type { Device, AlarmRule, DeviceSummary, DeviceTree, DataTag } from '../../types/api';
import { deviceApi } from '../../api/modules/device.api';
import { alarmApi } from '../../api/modules/alarm.api';
import { SsLoading } from '@scada-editor/shared';
import MonitorGroupTreeNode from './components/MonitorGroupTreeNode.vue';
import TagHistoryDialog from './components/TagHistoryDialog.vue';
import TagDetailDialog from './components/TagDetailDialog.vue';
import DictLabel from '../../components/dict/DictLabel.vue';
import { showError, showSuccess } from '../../utils/messageBox';
import { formatTagValue } from '../../utils/format';
import { useProjectContext } from '../../composables/useProjectContext';

const { t, locale } = useI18n();

/** 标签实时数据项 */
interface TagRealtimeItem {
  id: string;
  name: string;
  description?: string;
  address: string;
  dataType?: string;
  direction?: string;
  scanRate?: number;
  unit?: string;
  displayFormat?: string;
  category?: string;
  alarmHigh?: number;
  alarmLow?: number;
  value: unknown;
  quality: string;
  timestamp: string | number | null;
  /** 后端 FormatStep 产出的格式化字符串（如 "12.34"），WS 推送时携带 */
  wsDisplayValue?: string;
  /** 活跃告警（仅当后端推送包含此字段时存在，无告警时为 undefined） */
  activeAlarms?: Array<{
    alarmId: string;
    level: string;
    condition: string;
    message: string;
  }>;
}

/** 标签详情数据 */
interface TagDetailData {
  name?: string;
  address?: string;
  dataType?: string;
  unit?: string;
  description?: string;
  enabled?: boolean;
  scanRate?: number;
  deadband?: string;
  displayFormat?: string;
  scale?: number;
  offset?: number;
  alarmHigh?: number;
  alarmLow?: number;
  value?: unknown;
  quality?: string;
  timestamp?: string | number | null;
}

const deviceStore = useDeviceStore();
const projectStore = useProjectStore();
const wsStore = useWsStore();

// ===== 设备树状态 =====
const projectId = ref('');
const selectedDeviceId = ref('');
const loading = ref(false);
const expandedProjects = ref(new Set<string>());
const expandedGroups = ref(new Set<string>());
const loadingGroups = ref(new Set<string>());

// 缓存项目分组树数据
const projectGroupTrees = ref<Map<string, DeviceTree[]>>(new Map());
const projectRootDevices = ref<Map<string, DeviceSummary[]>>(new Map());
const groupDeviceCache = ref<Map<string, DeviceSummary[]>>(new Map());

// ===== Tab 状态 =====
const activeTab = ref<'basic' | 'realtime' | 'alarms'>('realtime');

// ===== 设备详情 =====
const device = ref<Device | null>(null);
const deviceTags = ref<DataTag[]>([]);
const detailLoading = ref(false);

// ===== 实时数据 =====
const tagDataList = ref<TagRealtimeItem[]>([]);
const realtimeLoading = ref(false);
const autoRefresh = ref(false);
let realtimeTimer: ReturnType<typeof setInterval> | null = null;

// ===== 报警规则 =====
const deviceAlarmRules = ref<AlarmRule[]>([]);
const alarmLoading = ref(false);

// ===== 标签历史数据弹窗 =====
const tagHistoryVisible = ref(false);
const tagHistoryTagId = ref('');
const tagHistoryTagName = ref('');
const tagHistoryTagAddress = ref('');
const tagHistoryDisplayFormat = ref<string | undefined>(undefined);
const tagHistoryUnit = ref<string | undefined>(undefined);
const tagHistoryDataType = ref<string | undefined>(undefined);

// ===== 标签详情弹窗 =====
const tagDetailVisible = ref(false);
const tagDetailData = ref<TagDetailData | null>(null);

// ===== 反控写入弹窗 =====
const writeModalVisible = ref(false);
const writeLoading = ref(false);
const writeTag = ref<TagRealtimeItem | null>(null);
const writeValue = ref('');
const writeReason = ref('');

// ===== WebSocket 连接状态 =====
const wsConnected = computed(() => wsStore.isConnected);

// ===== 错误详情面板 =====
const showErrorPanel = ref(false);

function showErrorDetail() {
  showErrorPanel.value = true;
}

// ===== 计算属性 =====
const deviceDeviceCode = computed(() => device.value?.deviceCode || device.value?.id || '');
const deviceNameAlias = computed(() => device.value?.nameAlias || '');
const deviceTemplateId = computed(() => device.value?.templateId || '');
const deviceDriver = computed(() => device.value?.driver || '');
const deviceConnection = computed(() => {
  const conn = (device.value as Device)?.connection || (device.value as Device)?.config || {};
  return typeof conn === 'object' ? conn : {};
});

// ===== 标签与映射 =====
const DEVICE_TYPE_LABELS: Record<string, string> = {
  modbus_tcp: t('system.devices.deviceTypes.modbus_tcp'),
  modbus_rtu: t('system.devices.deviceTypes.modbus_rtu'),
  opc_ua: t('system.devices.deviceTypes.opc_ua'),
  mqtt: t('system.devices.deviceTypes.mqtt'),
  siemens_s7: t('system.devices.deviceTypes.siemens_s7'),
  virtual: t('system.devices.deviceTypes.virtual'),
};

const DEVICE_STATUS_LABELS: Record<string, string> = {
  offline: t('system.devices.statusOffline'),
  connecting: t('system.devices.statusConnecting'),
  online: t('system.devices.statusOnline'),
  degraded: t('system.devices.statusDegraded'),
  error: t('system.devices.statusError'),
};

const ALARM_LEVEL_LABELS: Record<string, string> = {
  info: t('system.deviceMonitor.alarmLevelInfo'),
  warning: t('system.deviceMonitor.alarmLevelWarning'),
  error: t('system.deviceMonitor.alarmLevelError'),
  critical: t('system.deviceMonitor.alarmLevelCritical'),
};

const ALARM_CONDITION_LABELS: Record<string, string> = {
  '>': t('system.deviceMonitor.conditionWithSymbol', { symbol: '>', label: t('system.deviceMonitor.conditionGt') }),
  '<': t('system.deviceMonitor.conditionWithSymbol', { symbol: '<', label: t('system.deviceMonitor.conditionLt') }),
  '>=': t('system.deviceMonitor.conditionWithSymbol', { symbol: '>=', label: t('system.deviceMonitor.conditionGe') }),
  '<=': t('system.deviceMonitor.conditionWithSymbol', { symbol: '<=', label: t('system.deviceMonitor.conditionLe') }),
  '==': t('system.deviceMonitor.conditionWithSymbol', { symbol: '==', label: t('system.deviceMonitor.conditionEq') }),
  '!=': t('system.deviceMonitor.conditionWithSymbol', { symbol: '!=', label: t('system.deviceMonitor.conditionNe') }),
};

function deviceTypeLabel(type: string): string {
  return DEVICE_TYPE_LABELS[type] || type;
}

function deviceStatusLabel(status: string): string {
  return DEVICE_STATUS_LABELS[status] || status;
}

function alarmLevelLabel(level: string): string {
  return ALARM_LEVEL_LABELS[level] || level;
}

function alarmConditionLabel(condition: string): string {
  return ALARM_CONDITION_LABELS[condition] || condition;
}

const DIRECTION_LABELS: Record<string, string> = {
  read: 'R',
  write: 'W',
  'read-write': 'R/W',
};

function getDirectionLabel(dir?: string): string {
  if (!dir) return '-';
  return DIRECTION_LABELS[dir] || dir;
}

function formatTime(val?: string | number | Date | null): string {
  if (!val && val !== 0) return '-';
  try {
    let d: Date;
    if (val instanceof Date) {
      d = val;
    } else if (typeof val === 'number') {
      d = new Date(val);
    } else if (typeof val === 'string') {
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

/** 格式化 epoch 毫秒时间戳 */
function formatErrorTime(epochMs?: number): string {
  if (!epochMs) return '-';
  return formatTime(new Date(epochMs));
}

function formatPeriod(ms?: number): string {
  if (ms == null || ms <= 0) return '-';
  if (ms < 1000) return t('system.deviceMonitor.durationMs', { n: ms });
  if (ms < 60000) return t('system.deviceMonitor.durationSec', { n: (ms / 1000).toFixed(1) });
  return t('system.deviceMonitor.durationMin', { n: (ms / 60000).toFixed(1) });
}

// 敏感字段掩码
const SENSITIVE_KEYS = new Set(['password', 'passphrase', 'secret', 'token', 'apikey', 'privateKey', 'cert']);

function maskSensitive(key: string, value: unknown): string {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) {
    return '***';
  }
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');
  return String(value);
}

// ===== 设备树操作 =====

async function loadProjectTree(projId: string) {
  loadingGroups.value.add(projId);
  try {
    await deviceStore.fetchGroupTree(projId);
    const raw = deviceStore.groupTree;
    const treeData = Array.isArray(raw) ? raw : [];
    projectGroupTrees.value.set(projId, treeData);

    // 缓存未分组的根设备
    const rootDevs = Array.isArray(deviceStore.rootDevices) ? deviceStore.rootDevices : [];
    projectRootDevices.value.set(projId, rootDevs);

    const collectTreeItems = (items: DeviceTree[]) => {
      for (const item of items) {
        if (item.group) {
          const key = `${projId}::${item.group.id}`;
          groupDeviceCache.value.set(key, Array.isArray(item.devices) ? item.devices : []);
          // 有子分组或设备时自动展开该分组
          if ((item.children && item.children.length > 0) || (item.devices && item.devices.length > 0)) {
            expandedGroups.value.add(item.group.id);
          }
        }
        if (item.children && Array.isArray(item.children)) {
          collectTreeItems(item.children);
        }
      }
    };
    collectTreeItems(treeData);
  } catch (err: unknown) {
    if (import.meta.env.DEV) console.warn('[DeviceMonitor] loadProjectTree failed:', err);
    showError(t('common.loadError'));
  } finally {
    loadingGroups.value.delete(projId);
  }
}

async function selectProject(projId: string) {
  if (projectId.value === projId && expandedProjects.value.has(projId)) {
    expandedProjects.value.delete(projId);
    return;
  }

  projectId.value = projId;
  selectedDeviceId.value = '';

  if (!expandedProjects.value.has(projId)) {
    expandedProjects.value.add(projId);
    await loadProjectTree(projId);
  }
}

function toggleProject(projId: string) {
  if (expandedProjects.value.has(projId)) {
    expandedProjects.value.delete(projId);
  } else {
    expandedProjects.value.add(projId);
    if (projectId.value !== projId) {
      projectId.value = projId;
      selectedDeviceId.value = '';
      loadProjectTree(projId);
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

async function selectDeviceNode(projId: string, _groupId: string, deviceId: string) {
  if (projId !== projectId.value) {
    projectId.value = projId;
    if (!expandedProjects.value.has(projId)) {
      expandedProjects.value.add(projId);
      await loadProjectTree(projId);
    }
  }
  selectedDeviceId.value = deviceId;
  activeTab.value = 'realtime';
  await loadDeviceDetail();
}

function getTopLevelGroups(projId: string): DeviceTree['group'][] {
  const raw = projectGroupTrees.value.get(projId);
  const tree = Array.isArray(raw) ? raw : [];
  return tree.map((t) => t.group || t).filter((g): g is DeviceTree['group'] => !!(g && g.id));
}

function getProjectDeviceCount(projId: string): number {
  const raw = projectGroupTrees.value.get(projId);
  const tree = Array.isArray(raw) ? raw : [];
  let count = 0;
  for (const t of tree) {
    count += (t.devices || []).length;
  }
  // 加上未分组的根设备
  const rootDevs = projectRootDevices.value.get(projId);
  count += Array.isArray(rootDevs) ? rootDevs.length : 0;
  return count;
}

/** 获取项目下未分组的根设备 */
function getRootDevices(projId: string): DeviceSummary[] {
  const rootDevs = projectRootDevices.value.get(projId);
  return Array.isArray(rootDevs) ? rootDevs : [];
}

async function handleRefresh() {
  loading.value = true;
  try {
    await projectStore.fetchProjects();
    for (const projId of expandedProjects.value) {
      await loadProjectTree(projId);
    }
  } finally {
    loading.value = false;
  }
}

// ===== 设备详情加载 =====

async function loadDeviceDetail() {
  if (!projectId.value || !selectedDeviceId.value) return;
  detailLoading.value = true;
  try {
    const res = await deviceApi.getById(projectId.value, selectedDeviceId.value);
    device.value = res.data;
    deviceTags.value = Array.isArray(res.data?.tags) ? res.data.tags : [];
  } catch (err: unknown) {
    device.value = null;
    deviceTags.value = [];
    if (import.meta.env.DEV) console.warn('[DeviceMonitor] loadDeviceDetail failed:', err);
    showError(t('common.loadError'));
  } finally {
    detailLoading.value = false;
  }
}

// ===== 实时数据 =====

async function refreshRealtimeData() {
  if (!projectId.value || !selectedDeviceId.value) return;
  realtimeLoading.value = true;
  try {
    const [deviceRes, latestRes] = await Promise.all([
      deviceApi.getById(projectId.value, selectedDeviceId.value),
      deviceApi.getLatestValues(projectId.value, selectedDeviceId.value).catch(() => ({ data: {} as Record<string, { value?: unknown; quality?: string; timestamp?: string | null }> })),
    ]);
    const dev = deviceRes.data;
    const tags: DataTag[] = Array.isArray(dev?.tags) ? dev.tags : [];
    const latestValues = latestRes?.data || {};

    const wsTagValues = wsStore.tagValues;
    tagDataList.value = tags.map((tag) => {
      const httpEntry = latestValues[tag.id];
      const wsEntry = wsTagValues.get(tag.id);
      const entry = wsEntry || (httpEntry ? { value: httpEntry.value, quality: httpEntry.quality || 'good', timestamp: httpEntry.timestamp } : null);
      return {
        ...tag,
        value: entry?.value ?? null,
        wsDisplayValue: wsEntry?.displayValue,
        quality: entry?.quality ?? 'N/A',
        timestamp: entry?.timestamp ?? null,
        activeAlarms: wsEntry?.activeAlarms,
      } as TagRealtimeItem;
    });
  } catch (err: unknown) {
    if (import.meta.env.DEV) console.warn('[DeviceMonitor] refreshRealtimeData failed:', err);
  } finally {
    realtimeLoading.value = false;
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  realtimeTimer = setInterval(() => {
    if (selectedDeviceId.value && projectId.value) {
      refreshRealtimeData();
    }
  }, 5000);
}

function stopAutoRefresh() {
  if (realtimeTimer !== null) {
    clearInterval(realtimeTimer);
    realtimeTimer = null;
  }
}

// WebSocket 实时订阅
async function subscribeWsTags() {
  if (!projectId.value || !selectedDeviceId.value) return;
  try {
    await wsStore.connect(projectId.value);
    const tagIds = deviceTags.value.map((t) => t.id);
    if (tagIds.length > 0) {
      wsStore.subscribeTags(tagIds);
    }
  } catch {
    // WS 不可用时降级为 HTTP 模式
  }
}

function unsubscribeWsTags() {
  const tagIds = deviceTags.value.map((t: any) => t.id);
  if (tagIds.length > 0) {
    wsStore.unsubscribeTags(tagIds);
  }
}

// ===== 报警规则 =====

async function loadAlarmRules() {
  if (!projectId.value || !selectedDeviceId.value) return;
  alarmLoading.value = true;
  try {
    const res = await alarmApi.getRules(projectId.value);
    const allRules: AlarmRule[] = res.data || [];
    // 按设备标签 ID 过滤
    const deviceTagIds = new Set(deviceTags.value.map((t) => t.id));
    deviceAlarmRules.value = allRules.filter((r) =>
      r.tagId && deviceTagIds.has(r.tagId)
    );
  } catch (err: unknown) {
    deviceAlarmRules.value = [];
    if (import.meta.env.DEV) console.warn('[DeviceMonitor] loadAlarmRules failed:', err);
  } finally {
    alarmLoading.value = false;
  }
}

/** 打开标签历史数据查询弹窗 */
function openTagHistory(tag: {
  id: string;
  name: string;
  address?: string;
  displayFormat?: string;
  unit?: string;
  dataType?: string;
}) {
  tagHistoryTagId.value = tag.id || '';
  tagHistoryTagName.value = tag.name || '';
  tagHistoryTagAddress.value = tag.address || '';
  tagHistoryDisplayFormat.value = tag.displayFormat;
  tagHistoryUnit.value = tag.unit;
  tagHistoryDataType.value = tag.dataType;
  tagHistoryVisible.value = true;
}

/** 打开标签详情弹窗 */
function openTagDetail(tag: TagRealtimeItem) {
  tagDetailData.value = {
    name: tag.name,
    address: tag.address,
    dataType: tag.dataType,
    unit: tag.unit,
    displayFormat: tag.displayFormat,
    alarmHigh: tag.alarmHigh,
    alarmLow: tag.alarmLow,
    value: tag.value,
    quality: tag.quality,
    timestamp: tag.timestamp,
  };
  tagDetailVisible.value = true;
}

// ===== 反控写入 =====

function openWriteModal(tag: TagRealtimeItem) {
  writeTag.value = tag;
  writeValue.value = '';
  writeReason.value = '';
  writeModalVisible.value = true;
}

async function handleWriteTag() {
  if (!writeValue.value.trim()) {
    showError(t('system.deviceControl.valueRequired'));
    return;
  }
  const tag = writeTag.value;
  if (!tag || !projectId.value || !selectedDeviceId.value) return;

  writeLoading.value = true;
  try {
    const parsedValue = parseWriteValue(writeValue.value.trim(), tag.dataType);
    const res = await deviceApi.controlWriteTag(
      projectId.value,
      selectedDeviceId.value,
      tag.id,
      { value: parsedValue, reason: writeReason.value || undefined },
    );
    if (res?.data?.success) {
      showSuccess(t('system.deviceControl.writeSuccess'));
      writeModalVisible.value = false;
      // 刷新实时数据以获取最新值
      refreshRealtimeData();
    } else {
      const errMsg = res?.data?.error || t('system.deviceControl.writeFailed');
      showError(t('system.deviceControl.writeFailedWithError', { error: errMsg }));
    }
  } catch (err: unknown) {
    const errMsg = (err as any)?.response?.data?.message || (err as Error).message || t('system.deviceControl.writeFailed');
    showError(t('system.deviceControl.writeFailedWithError', { error: errMsg }));
  } finally {
    writeLoading.value = false;
  }
}

/** 根据数据类型解析写入值 */
function parseWriteValue(raw: string, dataType?: string): any {
  if (!dataType) return raw;
  const dt = dataType.toLowerCase();
  if (dt === 'bool' || dt === 'boolean') {
    const lower = raw.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
    return !!raw;
  }
  if (dt.includes('int') || dt.includes('uint') || dt === 'word' || dt === 'dword') {
    const num = parseInt(raw, 10);
    return isNaN(num) ? raw : num;
  }
  if (dt.includes('float') || dt.includes('double') || dt.includes('real')) {
    const num = parseFloat(raw);
    return isNaN(num) ? raw : num;
  }
  return raw;
}

// ===== 选中设备变化时加载数据 =====

watch(selectedDeviceId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    // 清理旧的 WS 订阅
    if (oldId) {
      unsubscribeWsTags();
    }
    loadDeviceDetail().then(() => {
      refreshRealtimeData();
      subscribeWsTags();
    });
  }
});

watch(activeTab, (tab) => {
  if (tab === 'alarms' && deviceAlarmRules.value.length === 0 && !alarmLoading.value) {
    loadAlarmRules();
  }
});

// WebSocket 实时推送驱动：WS 每次收到新值即增量更新表格对应行，
// 无需等待 HTTP 轮询；仅更新 value/quality/timestamp，标签元数据保持不变。
// store 每次推送都会 reassign tagValues 的 Map 引用，因此浅 watch 即可触发。
watch(
  () => wsStore.tagValues,
  () => {
    // 仅在实时数据 Tab 且表格已有数据时更新，避免无意义的重渲染
    if (activeTab.value !== 'realtime' || tagDataList.value.length === 0) return;
    const wsTagValues = wsStore.tagValues;
    let changed = false;
    const newList = tagDataList.value.map((row) => {
      const wsEntry = wsTagValues.get(row.id);
      if (!wsEntry) return row;
      changed = true;
      return {
        ...row,
        value: wsEntry.value,
        // 保留后端 FormatStep 产出的格式化字符串作为前端 formatTagValue 的兜底
        wsDisplayValue: wsEntry.displayValue,
        quality: wsEntry.quality,
        timestamp: wsEntry.timestamp,
        activeAlarms: wsEntry.activeAlarms,
      };
    });
    if (changed) {
      tagDataList.value = newList;
    }
  },
);

onMounted(async () => {
  loading.value = true;
  try {
    // 设备树只需要启用项目；不复用项目管理页可能缓存的全量列表（含停用项目）
    await projectStore.fetchProjects();
    // 优先使用默认项目，否则展开第一个项目
    if (projectStore.projects.length > 0 && !projectId.value) {
      const { loadDefault } = useProjectContext();
      const defaultId = await loadDefault();
      if (defaultId && projectStore.projects.some(p => p.projectId === defaultId)) {
        await selectProject(defaultId);
      } else {
        const firstProj = projectStore.projects[0];
        await selectProject(firstProj.projectId);
      }
    }
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  stopAutoRefresh();
  unsubscribeWsTags();
});

// P1优化：keep-alive 缓存场景下，页面切换时停止/恢复定时器和 WS 订阅，避免泄漏
onDeactivated(() => {
  stopAutoRefresh();
  unsubscribeWsTags();
});

onActivated(() => {
  if (autoRefresh.value && selectedDeviceId.value && projectId.value) {
    startAutoRefresh();
  }
  if (projectId.value && selectedDeviceId.value) {
    subscribeWsTags();
  }
});
</script>

<style scoped>
.device-monitor-view {
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

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}

.btn-refresh:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-refresh .spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

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
.tree-node.active { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }

.project-node { font-weight: 600; padding: 7px 12px; }
.project-icon { color: var(--primary); flex-shrink: 0; }

/* 根设备节点（未分组设备，直接挂载在项目下） */
.root-device-node { padding-left: 40px; font-size: 12px; }
.device-icon { color: var(--text-secondary); flex-shrink: 0; }

/* 设备图标按状态着色 */
.device-icon.device-status-online { color: var(--status-online); }
.device-icon.device-status-offline { color: var(--status-offline); }
.device-icon.device-status-connecting { color: var(--primary); }
.device-icon.device-status-degraded { color: var(--status-warning); }
.device-icon.device-status-error { color: var(--status-error); }

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

.project-children {
  border-left: 1px solid var(--border);
  margin-left: 19px;
}

/* ===== 主内容区 ===== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

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

.empty-state-small {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.device-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px 8px;
  flex-shrink: 0;
}

.device-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.device-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.device-code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  padding: 2px 8px;
  border-radius: 4px;
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

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 读写方向标识 */
.direction-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--surface);
  border: 1px solid var(--border);
}

.dir-read {
  color: var(--status-online);
  border-color: color-mix(in srgb, currentColor 30%, transparent);
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.dir-write {
  color: var(--status-warning);
  border-color: color-mix(in srgb, currentColor 30%, transparent);
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.dir-rw {
  color: var(--primary);
  border-color: color-mix(in srgb, currentColor 30%, transparent);
  background: color-mix(in srgb, currentColor 10%, transparent);
}

/* 描述列 */
.desc-col {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-desc {
  color: var(--text-secondary);
  font-size: 12px;
}

/* ===== Tab 栏 ===== */
.tab-bar {
  display: flex;
  gap: 0;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tab-item {
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-item:hover {
  color: var(--text);
}

.tab-item.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.tab-pane {
  max-width: 1000px;
}

/* 实时数据表列较多，需铺满页面宽度，避免列过窄导致行高被撑高 */
.tab-pane-full {
  max-width: 100%;
}

.tab-pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tab-pane-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ===== 基本信息 ===== */
.info-section {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 16px 20px 18px;
  margin-bottom: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.info-section:hover {
  border-color: var(--border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.info-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
}

.section-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  flex: 1;
  letter-spacing: 0.2px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

/* 当分组字段数为奇数时，最后一项跨满整行并改为横向布局，避免右侧留白 */
.info-grid > .info-item:last-child:nth-child(odd) {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.info-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: var(--text);
  word-break: break-word;
  line-height: 1.5;
}

.info-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--text);
}

.info-value-multiline {
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-value-empty {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 13px;
}

.device-value {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  padding: 2px 8px;
  border-radius: 4px;
  align-self: flex-start;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 标签数量药丸 */
.tag-count-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 3px 10px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
  align-self: flex-start;
}

.tag-count-pill em {
  font-style: normal;
  font-size: 11px;
  font-weight: 400;
  color: var(--primary);
  opacity: 0.7;
}

/* 错误计数药丸 */
.error-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  background: color-mix(in srgb, var(--status-online) 12%, transparent);
  color: var(--status-online);
  align-self: flex-start;
}

.error-pill-active {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  color: var(--status-error);
  animation: error-pulse 2s ease-in-out infinite;
}

@keyframes error-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--status-error) 30%, transparent); }
  50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--status-error) 0%, transparent); }
}

/* 内联驱动徽标 */
.driver-inline-tag {
  display: inline-block;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 4px;
  font-size: 12px;
  color: var(--primary);
  font-family: 'Courier New', monospace;
}

/* 状态时间行：圆点 + 时间 */
.status-time-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.status-time-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.status-time-dot.status-online { background: var(--status-online); box-shadow: 0 0 0 2px color-mix(in srgb, var(--status-online) 20%, transparent); }
.status-time-dot.status-offline { background: var(--status-offline); }
.status-time-dot.status-connecting { background: var(--primary); animation: pulse 2s infinite; }
.status-time-dot.status-degraded { background: var(--status-warning); }
.status-time-dot.status-error { background: var(--status-error); }

.text-danger { color: var(--status-error); }

/* ===== 通道配置（已并入 info-section 体系） ===== */
.channel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 16px;
}

.channel-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: var(--background);
  border-radius: 6px;
  border: 1px solid var(--border-light);
  min-width: 0;
}

.channel-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.channel-value {
  font-size: 13px;
  color: var(--text);
  font-family: 'Courier New', monospace;
  word-break: break-all;
}

.driver-tag {
  display: inline-block;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 4px;
  font-size: 12px;
  color: var(--primary);
  font-family: 'Courier New', monospace;
}

/* ===== 实时数据表 ===== */
.tag-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tag-data-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
}

.tag-data-table td {
  padding: 10px 12px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  /* 默认不换行，避免窄列（如分类）文字折行导致单行行高过高；描述列单独用省略号处理 */
  white-space: nowrap;
}

.tag-name {
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-row {
  cursor: pointer;
  transition: background 0.1s;
}

.tag-row:hover {
  background: color-mix(in srgb, var(--primary) 6%, transparent);
}

/* 告警行高亮 */
.tag-row.alarm-row {
  background: color-mix(in srgb, var(--status-error) 6%, transparent);
  border-left: 3px solid var(--status-error);
}

.tag-row.alarm-row:hover {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
}

/* 告警值红色高亮 */
.value-alarm {
  color: var(--status-error);
  font-weight: 700;
}

.actions-col {
  width: 1%;
  white-space: nowrap;
  text-align: center;
}

.btn-history {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-history:hover {
  background: var(--primary);
  color: var(--text);
  border-color: var(--primary);
}

.tag-row:hover .btn-history {
  border-color: var(--primary);
}

.tag-address {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.tag-unit {
  font-size: 12px;
  color: var(--text-secondary);
}

.mono {
  font-family: 'Courier New', monospace;
}

.tag-value {
  font-weight: 600;
  color: var(--text);
}

.tag-value.value-null {
  color: var(--text-secondary);
  font-style: italic;
}

.tag-time {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.num-col {
  text-align: right;
}

.quality-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 8px;
  font-size: 12px;
}

.quality-good { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.quality-bad { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }

/* ===== 报警规则表 ===== */
.alarm-rules-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.alarm-rules-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
}

.alarm-rules-table td {
  padding: 10px 12px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.rule-name {
  font-weight: 500;
}

.level-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.level-info { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.level-warning { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
.level-error { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }
.level-critical { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }

.enabled-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.enabled-yes { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.enabled-no { background: color-mix(in srgb, var(--status-offline) 15%, transparent); color: var(--text-secondary); }

.alarm-count {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== WebSocket 状态 ===== */
.ws-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
}

.ws-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ws-connected {
  background: color-mix(in srgb, var(--status-online) 10%, transparent);
  color: var(--status-online);
}

.ws-connected .ws-dot {
  background: var(--status-online);
  animation: pulse 2s infinite;
}

.ws-disconnected {
  background: color-mix(in srgb, var(--status-offline) 10%, transparent);
  color: var(--text-secondary);
}

.ws-disconnected .ws-dot {
  background: var(--status-offline);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.auto-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
  margin-right: 6px;
}

.auto-dot.active {
  background: var(--status-online);
  animation: pulse 2s infinite;
}

/* ===== 通用按钮 ===== */
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
.btn-sm { padding: 6px 12px; font-size: 13px; }

/* ===== 操作按钮组 ===== */
.actions-btn-group {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.btn-detail {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-detail:hover {
  background: var(--primary);
  color: var(--text);
  border-color: var(--primary);
}

/* ===== 反控写入按钮与弹窗 ===== */

.btn-write {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border: 1px solid var(--primary);
  border-radius: 6px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-write:hover {
  background: var(--primary);
  color: var(--button-text, #fff);
  border-color: var(--primary);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-panel {
  background: var(--surface);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  min-width: 420px;
  max-width: 520px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
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
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
}

.write-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--surface-alt, color-mix(in srgb, var(--surface) 95%, var(--text) 5%));
  border-radius: 6px;
  border: 1px solid var(--border);
}

.write-info-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.write-info-label {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 60px;
  flex-shrink: 0;
}

.write-info-value {
  font-size: 13px;
  color: var(--text);
  word-break: break-all;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--input-bg, var(--surface));
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--primary);
}

.required {
  color: var(--status-error);
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  background: var(--border);
  color: var(--text);
}

.mono {
  font-family: 'Courier New', Consolas, monospace;
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
