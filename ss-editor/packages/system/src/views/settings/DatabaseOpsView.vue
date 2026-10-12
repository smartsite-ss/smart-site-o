<template>
  <div class="db-ops-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.database.title') }}
      </h1>
    </div>

    <!-- ==================== 标签页 ==================== -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="tab-btn"
        :class="{ active: activeTab === tab.name }"
        @click="activeTab = tab.name"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ==================== 备份管理 ==================== -->
    <div
      v-if="activeTab === 'backup'"
      class="tab-content"
    >
      <!-- 备份统计 -->
      <div
        v-if="backupStats"
        class="stats-bar"
      >
        <div class="stat-item">
          <span class="stat-label">{{ $t('system.database.statsTotal') }}</span>
          <span class="stat-value">{{ backupStats.total }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('system.database.statsSystemCount') }}</span>
          <span class="stat-value">{{ backupStats.systemCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('system.database.statsProjectCount') }}</span>
          <span class="stat-value">{{ backupStats.projectCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('system.database.statsTotalSize') }}</span>
          <span class="stat-value">{{ backupStats.totalSizeFormatted }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('system.database.statsAuto') }}</span>
          <span class="stat-value">{{ backupStats.autoCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('system.database.statsManual') }}</span>
          <span class="stat-value">{{ backupStats.manualCount }}</span>
        </div>
        <div
          v-if="backupStats.freeSpaceBytes"
          class="stat-item"
        >
          <span class="stat-label">{{ $t('system.database.statsFreeSpace') }}</span>
          <span class="stat-value">{{ formatBytes(backupStats.freeSpaceBytes) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('system.database.statsBackupDir') }}</span>
          <span class="stat-value mono">{{ backupStats.backupDir }}</span>
        </div>
      </div>

      <!-- ==================== 全局数据库备份 ==================== -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <span>{{ $t('system.database.systemCategory') }}</span>
            <span class="tag tag-info">{{ $t('system.database.systemDb') }}</span>
          </div>
          <div class="card-header-actions">
            <button
              class="btn btn-primary btn-sm"
              :disabled="systemBackupLoading"
              @click="handleCreateSystemBackup"
            >
              <span
                v-if="systemBackupLoading"
                class="spinner"
              />
              {{ $t('system.database.createSystemBackup') }}
            </button>
            <button
              class="btn btn-secondary btn-sm"
              @click="openConfigModal('system')"
            >
              {{ $t('system.database.scheduledBackupConfig') }}
            </button>
            <button
              class="btn btn-secondary btn-sm"
              :disabled="cleanupLoading === 'system'"
              @click="handleCleanup('system')"
            >
              <span
                v-if="cleanupLoading === 'system'"
                class="spinner"
              />
              {{ $t('system.database.cleanup') }}
            </button>
          </div>
        </div>
        <div class="card-body">
          <div
            v-if="backupListLoading"
            class="loading-overlay"
          >
            <span class="spinner" />
            {{ $t('common.loading') }}
          </div>
          <table
            v-else
            class="data-table"
          >
            <thead>
              <tr>
                <th>{{ $t('system.database.filename') }}</th>
                <th>{{ $t('system.database.size') }}</th>
                <th>{{ $t('system.database.backupType') }}</th>
                <th>{{ $t('system.database.createdAt') }}</th>
                <th>{{ $t('system.database.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in systemBackups"
                :key="row.filename"
              >
                <td>{{ row.filename }}</td>
                <td>{{ formatBytes(row.size) }}</td>
                <td>{{ row.type === 'auto' ? $t('system.database.autoBackup') : $t('system.database.manualBackup') }}</td>
                <td>{{ formatTime(row.createdAt) }}</td>
                <td>
                  <div class="btn-group">
                    <button
                      class="btn-icon"
                      :title="$t('system.database.download')"
                      @click="handleDownload(row.filename)"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line
                        x1="12"
                        y1="15"
                        x2="12"
                        y2="3"
                      /></svg>
                    </button>
                    <button
                      class="btn-icon btn-icon-warning"
                      :title="$t('system.database.restore')"
                      @click="handleRestore(row)"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      ><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    </button>
                    <button
                      class="btn-icon btn-icon-danger"
                      :title="$t('system.database.delete')"
                      @click="handleDeleteBackup(row)"
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
                </td>
              </tr>
              <tr v-if="systemBackups.length === 0">
                <td
                  colspan="5"
                  class="empty-cell"
                >
                  {{ $t('system.database.noBackups') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ==================== 项目数据库备份 ==================== -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <span>{{ $t('system.database.projectCategory') }}</span>
            <span class="tag tag-success">{{ projectBackups.length }} {{ $t('system.database.projectDb') }}</span>
          </div>
          <div class="card-header-actions">
            <button
              class="btn btn-primary btn-sm"
              :disabled="selectedBackupLoading || selectedProjects.length === 0"
              @click="handleBackupSelected"
            >
              <span
                v-if="selectedBackupLoading"
                class="spinner"
              />
              {{ $t('system.database.backupSelected') }} ({{ selectedProjects.length }})
            </button>
            <button
              class="btn btn-secondary btn-sm"
              :disabled="backupAllLoading"
              @click="handleBackupAllProjects"
            >
              <span
                v-if="backupAllLoading"
                class="spinner"
              />
              {{ $t('system.database.backupAllProjects') }}
            </button>
            <button
              class="btn btn-secondary btn-sm"
              @click="openConfigModal('project')"
            >
              {{ $t('system.database.scheduledBackupConfig') }}
            </button>
            <button
              class="btn btn-secondary btn-sm"
              :disabled="cleanupLoading === 'project'"
              @click="handleCleanup('project')"
            >
              <span
                v-if="cleanupLoading === 'project'"
                class="spinner"
              />
              {{ $t('system.database.cleanup') }}
            </button>
          </div>
        </div>

        <!-- 项目勾选列表 -->
        <div class="project-select-bar">
          <button
            class="btn btn-text btn-sm"
            @click="selectAllProjects"
          >
            {{ $t('system.database.selectAll') }}
          </button>
          <button
            class="btn btn-text btn-sm"
            @click="selectedProjectRows = []"
          >
            {{ $t('system.database.selectNone') }}
          </button>
        </div>

        <div class="card-body">
          <div
            v-if="backupListLoading"
            class="loading-overlay"
          >
            <span class="spinner" />
            {{ $t('common.loading') }}
          </div>
          <table
            v-else
            class="data-table"
          >
            <thead>
              <tr>
                <th class="col-check">
                  <input
                    type="checkbox"
                    :checked="selectedProjectRows.length === projectBackups.length && projectBackups.length > 0"
                    @change="handleSelectAll"
                  >
                </th>
                <th>{{ $t('system.database.projectName') }}</th>
                <th>{{ $t('system.database.filename') }}</th>
                <th>{{ $t('system.database.size') }}</th>
                <th>{{ $t('system.database.backupType') }}</th>
                <th>{{ $t('system.database.createdAt') }}</th>
                <th>{{ $t('system.database.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in projectBackups"
                :key="row.id"
                :class="{ selected: selectedProjectRows.includes(row.id) }"
              >
                <td class="col-check">
                  <input
                    type="checkbox"
                    :checked="selectedProjectRows.includes(row.id)"
                    @change="toggleProjectRow(row.id)"
                  >
                </td>
                <td>{{ row.projectName }}</td>
                <td>{{ row.filename }}</td>
                <td>{{ formatBytes(row.size) }}</td>
                <td>{{ row.type === 'auto' ? $t('system.database.autoBackup') : $t('system.database.manualBackup') }}</td>
                <td>{{ formatTime(row.createdAt) }}</td>
                <td>
                  <div class="btn-group">
                    <button
                      class="btn-icon"
                      :title="$t('system.database.download')"
                      @click="handleDownload(row.filename)"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line
                        x1="12"
                        y1="15"
                        x2="12"
                        y2="3"
                      /></svg>
                    </button>
                    <button
                      class="btn-icon btn-icon-warning"
                      :title="$t('system.database.restore')"
                      @click="handleRestore(row)"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      ><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    </button>
                    <button
                      class="btn-icon btn-icon-danger"
                      :title="$t('system.database.delete')"
                      @click="handleDeleteBackup(row)"
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
                </td>
              </tr>
              <tr v-if="projectBackups.length === 0">
                <td
                  colspan="7"
                  class="empty-cell"
                >
                  {{ $t('system.database.noBackups') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==================== 备份日志 ==================== -->
    <div
      v-if="activeTab === 'logs'"
      class="tab-content"
    >
      <div class="action-bar">
        <div class="filter-row">
          <select
            v-model="logFilter.dbType"
            class="form-select"
            @change="loadBackupLogs"
          >
            <option value="">
              {{ $t('system.database.dbType') }}
            </option>
            <option value="system">
              {{ $t('system.database.systemDb') }}
            </option>
            <option value="project">
              {{ $t('system.database.projectDb') }}
            </option>
          </select>
          <select
            v-model="logFilter.backupType"
            class="form-select"
            @change="loadBackupLogs"
          >
            <option value="">
              {{ $t('system.database.backupType') }}
            </option>
            <option value="auto">
              {{ $t('system.database.autoBackup') }}
            </option>
            <option value="manual">
              {{ $t('system.database.manualBackup') }}
            </option>
          </select>
          <select
            v-model="logFilter.status"
            class="form-select"
            @change="loadBackupLogs"
          >
            <option value="">
              {{ $t('system.database.status') }}
            </option>
            <option value="success">
              {{ $t('system.database.normal') }}
            </option>
            <option value="failed">
              {{ $t('system.database.abnormal') }}
            </option>
          </select>
        </div>
        <button
          class="btn btn-text btn-sm"
          @click="loadBackupLogs"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          ><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          {{ $t('system.database.refresh') }}
        </button>
      </div>

      <div class="card">
        <div class="card-body">
          <div
            v-if="logsLoading"
            class="loading-overlay"
          >
            <span class="spinner" />
            {{ $t('common.loading') }}
          </div>
          <table
            v-else
            class="data-table"
          >
            <thead>
              <tr>
                <th>{{ $t('system.database.createdAt') }}</th>
                <th>{{ $t('system.database.dbType') }}</th>
                <th>{{ $t('system.database.backupType') }}</th>
                <th>{{ $t('system.database.projectName') }}</th>
                <th>{{ $t('system.database.filename') }}</th>
                <th>{{ $t('system.database.size') }}</th>
                <th>{{ $t('system.database.status') }}</th>
                <th>{{ $t('system.database.triggeredBy') }}</th>
                <th>{{ $t('system.database.errorMessage') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in backupLogs"
                :key="row.id || row.createdAt"
              >
                <td>{{ formatTime(row.createdAt) }}</td>
                <td>
                  <span
                    class="tag"
                    :class="row.dbType === 'system' ? 'tag-info' : 'tag-success'"
                  >{{ row.dbType === 'system' ? $t('system.database.systemDb') : $t('system.database.projectDb') }}</span>
                </td>
                <td>
                  <span
                    class="tag"
                    :class="row.backupType === 'auto' ? 'tag-default' : 'tag-warning'"
                  >{{ row.backupType === 'auto' ? $t('system.database.autoBackup') : $t('system.database.manualBackup') }}</span>
                </td>
                <td>{{ row.projectName || '-' }}</td>
                <td>{{ row.filename }}</td>
                <td>{{ formatBytes(row.sizeBytes) }}</td>
                <td>
                  <span
                    class="tag"
                    :class="row.status === 'success' ? 'tag-success' : 'tag-error'"
                  >{{ row.status === 'success' ? $t('system.database.normal') : $t('system.database.abnormal') }}</span>
                </td>
                <td>{{ row.triggeredBy || '-' }}</td>
                <td class="error-cell">
                  {{ row.errorMessage || '-' }}
                </td>
              </tr>
              <tr v-if="backupLogs.length === 0">
                <td
                  colspan="9"
                  class="empty-cell"
                >
                  {{ $t('system.database.noBackups') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==================== 数据库运行 ==================== -->
    <div
      v-if="activeTab === 'status'"
      class="tab-content"
    >
      <div class="action-bar">
        <button
          class="btn btn-text btn-sm"
          @click="loadDatabaseStatus"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          ><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          {{ $t('system.database.refresh') }}
        </button>
      </div>

      <!-- 系统数据库 -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <span>{{ $t('system.database.systemDatabase') }}</span>
          </div>
          <div class="card-header-actions">
            <span
              class="tag"
              :class="dbStatus.system?.exists ? 'tag-success' : 'tag-error'"
            >
              {{ dbStatus.system?.exists ? $t('system.database.normal') : $t('system.database.abnormal') }}
            </span>
          </div>
        </div>
        <div class="card-body">
          <div
            v-if="!dbStatus.system?.exists && dbStatus.system?.errorMessage"
            class="error-banner"
          >
            {{ dbStatus.system.errorMessage }}
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">{{ $t('system.database.filePath') }}</span>
              <span class="info-value mono">{{ dbStatus.system?.path || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ $t('system.database.size') }}</span>
              <span class="info-value">{{ dbStatus.system?.sizeFormatted || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ $t('system.database.tableCount') }}</span>
              <span class="info-value">{{ dbStatus.system?.tableCount ?? '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ $t('system.database.lastModified') }}</span>
              <span class="info-value">{{ dbStatus.system?.lastModified ? formatTime(dbStatus.system.lastModified) : '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 项目数据库 -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <span>{{ $t('system.database.projectDatabases') }}</span>
          </div>
        </div>
        <div class="card-body">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ $t('system.database.projectName') }}</th>
                <th>{{ $t('system.database.status') }}</th>
                <th>{{ $t('system.database.size') }}</th>
                <th>{{ $t('system.database.tableCount') }}</th>
                <th>{{ $t('system.database.lastModified') }}</th>
                <th>{{ $t('system.database.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in dbStatus.projects || []"
                :key="row.name"
              >
                <td>{{ row.name }}</td>
                <td>
                  <span
                    class="tag"
                    :class="row.exists ? 'tag-success' : 'tag-error'"
                  >{{ row.exists ? $t('system.database.normal') : $t('system.database.abnormal') }}</span><span
                    v-if="!row.exists && row.errorMessage"
                    class="error-hint"
                  >{{ row.errorMessage }}</span>
                </td>
                <td>{{ row.sizeFormatted || '-' }}</td>
                <td>{{ row.tableCount ?? '-' }}</td>
                <td>{{ row.lastModified ? formatTime(row.lastModified) : '-' }}</td>
                <td>
                  <div
                    v-if="row.exists"
                    class="project-actions"
                  >
                    <button
                      class="btn btn-secondary btn-sm"
                      :disabled="isProjectOpLoading(row.name, 'events')"
                      @click="handleClearEvents(row)"
                    >
                      <span
                        v-if="isProjectOpLoading(row.name, 'events')"
                        class="spinner"
                      />
                      {{ $t('system.database.clearEvents') }}
                    </button>
                    <button
                      class="btn btn-secondary btn-sm"
                      :disabled="isProjectOpLoading(row.name, 'logs')"
                      @click="handleClearLogs(row)"
                    >
                      <span
                        v-if="isProjectOpLoading(row.name, 'logs')"
                        class="spinner"
                      />
                      {{ $t('system.database.clearLogs') }}
                    </button>
                    <button
                      class="btn btn-secondary btn-sm"
                      :disabled="isProjectOpLoading(row.name, 'shrink')"
                      @click="handleShrinkProject(row)"
                    >
                      <span
                        v-if="isProjectOpLoading(row.name, 'shrink')"
                        class="spinner"
                      />
                      {{ $t('system.database.shrinkData') }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!dbStatus.projects || dbStatus.projects.length === 0">
                <td
                  colspan="6"
                  class="empty-cell"
                >
                  {{ $t('system.database.noProjectDatabases') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==================== 健康检查 ==================== -->
    <div
      v-if="activeTab === 'health'"
      class="tab-content"
    >
      <!-- 完整性检查 -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <span>{{ $t('system.database.integrityCheck') }}</span>
          </div>
          <div class="card-header-actions">
            <button
              class="btn btn-secondary btn-sm"
              :disabled="integrityLoading"
              @click="handleIntegrityCheck"
            >
              <span
                v-if="integrityLoading"
                class="spinner"
              />
              {{ $t('system.database.runCheck') }}
            </button>
          </div>
        </div>
        <div class="card-body">
          <div
            v-if="integrityResult"
            class="check-result"
            :class="integrityResult.ok ? 'result-ok' : 'result-fail'"
          >
            <svg
              v-if="integrityResult.ok"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><circle
              cx="12"
              cy="12"
              r="10"
            /><line
              x1="15"
              y1="9"
              x2="9"
              y2="15"
            /><line
              x1="9"
              y1="9"
              x2="15"
              y2="15"
            /></svg>
            <span class="check-message">{{ integrityResult.message }}</span>
            <span class="check-time">{{ $t('system.database.checkTime') }}: {{ formatTime(integrityResult.checkedAt) }}</span>
          </div>
          <div
            v-else
            class="check-result check-pending"
          >
            {{ $t('system.database.notChecked') }}
          </div>
        </div>
      </div>

      <!-- 空间回收 -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <span>{{ $t('system.database.spaceReclaim') }}</span>
          </div>
          <div class="card-header-actions">
            <button
              class="btn btn-secondary btn-sm"
              :disabled="vacuumLoading"
              @click="confirmVacuum"
            >
              <span
                v-if="vacuumLoading"
                class="spinner"
              />
              {{ $t('system.database.runVacuum') }}
            </button>
          </div>
        </div>
        <div class="card-body">
          <div
            v-if="vacuumResult"
            class="check-result result-ok"
          >
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ $t('system.database.beforeVacuum') }}</span>
                <span class="info-value">{{ formatBytes(vacuumResult.beforeBytes) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ $t('system.database.afterVacuum') }}</span>
                <span class="info-value">{{ formatBytes(vacuumResult.afterBytes) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ $t('system.database.freedSpace') }}</span>
                <span class="info-value highlight">{{ vacuumResult.freedFormatted }}</span>
              </div>
            </div>
          </div>
          <div
            v-else
            class="check-result check-pending"
          >
            {{ $t('system.database.notVacuumed') }}
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== InfluxDB 运维 ==================== -->
    <div
      v-if="activeTab === 'influxdb'"
      class="tab-content"
    >
      <div class="action-bar">
        <button
          class="btn btn-text btn-sm"
          @click="loadInfluxDbData"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          ><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          {{ $t('system.database.refresh') }}
        </button>
      </div>

      <!-- 汇总统计 -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">
            {{ influxBuckets.length }}
          </div>
          <div class="stat-label">
            {{ $t('system.influxdb.bucketsCount') }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            {{ totalInfluxStorage }}
          </div>
          <div class="stat-label">
            {{ $t('system.influxdb.totalStorage') }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            <span
              class="status-dot"
              :class="influxHealthStatusClass"
            />
            {{ influxHealthLabel }}
          </div>
          <div class="stat-label">
            {{ $t('system.influxdb.health') }}
          </div>
        </div>
      </div>

      <!-- 概览 -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <span>{{ $t('system.influxdb.overview') }}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">{{ $t('system.influxdb.url') }}</span>
              <span class="info-value mono">{{ influxConfig.url }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ $t('system.influxdb.org') }}</span>
              <span class="info-value">{{ influxConfig.org }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ $t('system.influxdb.bucket') }}</span>
              <span class="info-value">{{ influxConfig.bucket }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ $t('system.influxdb.tokenLabel') }}</span>
              <span class="info-value mono">
                <span v-if="influxConfig.tokenMasked">{{ influxConfig.tokenMasked }}</span>
                <span
                  v-else
                  class="muted"
                >-</span>
              </span>
            </div>
          </div>
          <hr>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">{{ $t('system.influxdb.reachable') }}</span>
              <span class="info-value">
                <span
                  class="tag"
                  :class="influxSetup.reachable ? 'tag-success' : 'tag-error'"
                >{{ influxSetup.reachable ? $t('system.influxdb.reachable') : $t('system.influxdb.unreachable') }}</span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ $t('system.influxdb.initialized') }}</span>
              <span class="info-value">
                <span
                  class="tag"
                  :class="influxSetup.initialized ? 'tag-success' : 'tag-warning'"
                >{{ influxSetup.initialized ? $t('system.influxdb.yes') : $t('system.influxdb.no') }}</span>
              </span>
            </div>
            <div
              v-if="influxHealth"
              class="info-item"
            >
              <span class="info-label">{{ $t('system.influxdb.version') }}</span>
              <span class="info-value">{{ influxHealth.version || '-' }}</span>
            </div>
            <div
              v-if="influxHealth && influxHealth.responseTimeMs != null"
              class="info-item"
            >
              <span class="info-label">{{ $t('system.influxdb.responseTime') }}</span>
              <span class="info-value">{{ influxHealth.responseTimeMs }}ms</span>
            </div>
          </div>
          <div
            v-if="influxHealthLoading"
            class="health-checking"
          >
            <span class="spinner" /> {{ $t('system.influxdb.checking') }}
          </div>
          <div
            v-if="influxHealth && influxHealth.error"
            class="check-result result-warn"
          >
            {{ influxHealth.error }}
          </div>
        </div>
      </div>

      <!-- Bucket 列表 -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <span>{{ $t('system.influxdb.buckets') }}</span>
            <span class="card-header-count">{{ influxBuckets.length }}</span>
          </div>
          <div class="card-header-actions">
            <button
              class="btn btn-secondary btn-sm"
              :disabled="influxBuckets.length === 0"
              @click="handleExportBucketList"
            >
              {{ $t('system.influxdb.exportList') }}
            </button>
            <button
              class="btn btn-secondary btn-sm"
              :disabled="influxBucketsLoading"
              @click="loadInfluxBuckets"
            >
              <span
                v-if="influxBucketsLoading"
                class="spinner"
              />
              {{ $t('system.database.refresh') }}
            </button>
          </div>
        </div>
        <div class="card-body">
          <div
            v-if="influxBucketsLoading"
            class="check-result check-pending"
          >
            {{ $t('system.database.loading') }}
          </div>
          <div
            v-else-if="influxBuckets.length === 0"
            class="check-result check-pending"
          >
            {{ $t('system.influxdb.noBuckets') }}
          </div>
          <table
            v-else
            class="data-table"
          >
            <thead>
              <tr>
                <th>{{ $t('system.influxdb.bucketName') }}</th>
                <th>{{ $t('system.influxdb.id') }}</th>
                <th>{{ $t('system.influxdb.size') }}</th>
                <th>{{ $t('system.influxdb.proportion') }}</th>
                <th>{{ $t('system.influxdb.measurements') }}</th>
                <th>{{ $t('system.influxdb.lastWrite') }}</th>
                <th>{{ $t('system.influxdb.retention') }}</th>
                <th>{{ $t('system.database.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="b in influxBuckets"
                :key="b.id"
                :class="{ 'row-highlight': b.name === influxConfig.bucket }"
              >
                <td class="mono">
                  {{ b.name }}
                  <span
                    v-if="b.name === influxConfig.bucket"
                    class="tag tag-info tag-sm"
                  >{{ $t('system.influxdb.defaultBucket') }}</span>
                </td>
                <td class="mono muted">
                  {{ b.id }}
                </td>
                <td>
                  <span v-if="b.storageBytes != null">{{ formatBytes(b.storageBytes) }}</span>
                  <span
                    v-else
                    class="muted"
                  >-</span>
                </td>
                <td class="col-proportion">
                  <div
                    v-if="b.storageBytes != null && totalStorageBytes > 0"
                    class="size-bar-container"
                  >
                    <div
                      class="size-bar-fill"
                      :style="{ width: getStorageProportion(b.storageBytes) + '%' }"
                    />
                    <span class="size-bar-label">{{ getStorageProportion(b.storageBytes) }}%</span>
                  </div>
                  <span
                    v-else
                    class="muted"
                  >-</span>
                </td>
                <td>
                  <span v-if="b.measurementCount != null">{{ b.measurementCount }}</span>
                  <span
                    v-else
                    class="muted"
                  >-</span>
                </td>
                <td>
                  <span v-if="b.lastWriteAt">{{ formatTime(b.lastWriteAt) }}</span>
                  <span
                    v-else
                    class="muted"
                  >{{ $t('system.influxdb.noData') }}</span>
                </td>
                <td>
                  <span v-if="b.retentionPeriodHrs && b.retentionPeriodHrs > 0">
                    {{ formatRetention(b.retentionPeriodHrs) }}
                  </span>
                  <span
                    v-else
                    class="muted"
                  >{{ $t('system.database.unlimited') }}</span>
                </td>
                <td>
                  <button
                    class="btn-icon"
                    :disabled="exportingBucket !== ''"
                    :title="$t('system.influxdb.exportBucket')"
                    @click="handleExportBucketData(b.name)"
                  >
                    <span
                      v-if="exportingBucket === b.name"
                      class="spinner"
                    />
                    <svg
                      v-else
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line
                      x1="12"
                      y1="15"
                      x2="12"
                      y2="3"
                    /></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 操作 -->
      <div
        v-if="!influxSetup.initialized || influxSetup.reachable"
        class="card"
      >
        <div class="card-header">
          <div class="card-header-left">
            <span>{{ $t('system.influxdb.actions') }}</span>
          </div>
        </div>
        <div class="card-body card-actions-row">
          <div
            v-if="!influxSetup.initialized"
            class="action-section"
          >
            <p class="setup-hint">
              {{ $t('system.influxdb.setupHint') }}
            </p>
            <button
              class="btn btn-primary"
              :disabled="influxSetupLoading"
              @click="handleInfluxSetup"
            >
              <span
                v-if="influxSetupLoading"
                class="spinner"
              />
              {{ $t('system.influxdb.setup') }}
            </button>
          </div>
          <div class="action-section">
            <p class="setup-hint">
              {{ $t('system.influxdb.credentialNote') }}
            </p>
            <a
              :href="influxConfig.url"
              target="_blank"
              class="btn btn-secondary"
            >
              {{ $t('system.influxdb.openWebUi') }}
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 定时备份配置弹窗 ==================== -->
    <div
      v-if="showConfigModal"
      class="modal-overlay"
      @click.self="showConfigModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>{{ configModalTitle }}</h2>
          <button
            class="modal-close"
            @click="showConfigModal = false"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">{{ $t('system.database.enableScheduledBackup') }}</label>
            <button
              class="toggle"
              :class="{ active: configForm.enabled }"
              @click="configForm.enabled = !configForm.enabled"
            >
              <span class="toggle-thumb" />
            </button>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.database.cronExpression') }}</label>
            <CronExpressionInput v-model="configForm.cronExpression" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.database.retentionDays') }}</label>
            <input
              v-model.number="configForm.retentionDays"
              type="number"
              class="form-input"
              :min="1"
              :max="365"
            >
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.database.maxSizeMb') }}</label>
            <div class="input-suffix">
              <input
                v-model.number="configForm.maxSizeMb"
                type="number"
                class="form-input"
                :min="100"
                :max="102400"
                :step="100"
              >
              <span class="input-suffix-text">{{ $t('system.database.mb') }}</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.database.backupLocationLabel') }}</label>
            <input
              v-model="configForm.backupLocation"
              type="text"
              class="form-input"
              :placeholder="$t('system.database.backupLocationPlaceholder', { type: configCategory })"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="showConfigModal = false"
          >
            {{ $t('system.database.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="configSaving"
            @click="handleSaveConfig"
          >
            <span
              v-if="configSaving"
              class="spinner"
            />
            {{ $t('system.database.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { CronExpressionInput } from '@scada-editor/shared';
import {
  databaseApi,
  type BackupInfo,
  type BackupConfig,
  type CategoryBackupConfig,
  type BackupStats,
  type BackupLogEntry,
  type DatabaseStatus,
} from '../../api/modules/database.api';
import {
  baseServicesApi,
  type InfluxSetupStatus,
  type InfluxHealthStatus,
  type InfluxBucket,
  type InfluxConfig,
} from '../../api/modules/base-services.api';
import { showConfirm, showSuccess, showError } from '../../utils/messageBox';

const { t, locale } = useI18n();

// ==================== 状态 ====================

const activeTab = ref('backup');
const systemBackupLoading = ref(false);
const selectedBackupLoading = ref(false);
const backupAllLoading = ref(false);
const backupListLoading = ref(false);
const configSaving = ref(false);
const integrityLoading = ref(false);
const vacuumLoading = ref(false);
const logsLoading = ref(false);
const cleanupLoading = ref<string | null>(null);
const showConfigModal = ref(false);

const systemBackups = ref<BackupInfo[]>([]);
const projectBackups = ref<BackupInfo[]>([]);
const backupStats = ref<BackupStats | null>(null);
const backupLogs = ref<BackupLogEntry[]>([]);
const dbStatus = ref<{ system: DatabaseStatus | null; projects: DatabaseStatus[] }>({
  system: null,
  projects: [],
});

/** 当前配置弹窗对应的类型 */
const configCategory = ref<'system' | 'project'>('system');
const configForm = ref<CategoryBackupConfig>({
  enabled: true,
  cronExpression: '0 3 * * *',
  retentionDays: 30,
  backupLocation: '',
  maxSizeMb: 1024,
});
const fullBackupConfig = ref<BackupConfig | null>(null);

/** 选中的项目备份行（用于勾选备份） */
const selectedProjectRows = ref<string[]>([]);

// ==================== InfluxDB 状态 ====================

const influxSetupLoading = ref(false);
const influxHealthLoading = ref(false);
const influxSetup = ref<InfluxSetupStatus>({
  reachable: false,
  initialized: false,
  tokenConfigured: false,
});
const influxHealth = ref<InfluxHealthStatus | null>(null);
const influxConfig = ref<InfluxConfig>({
  url: 'http://localhost:8086',
  org: 'ss-org',
  bucket: 'ss_node_data',
  tokenConfigured: false,
  tokenMasked: '',
});
const influxBuckets = ref<InfluxBucket[]>([]);
const influxBucketsLoading = ref(false);

const totalInfluxStorage = computed(() => {
  const total = influxBuckets.value.reduce((sum, b) => sum + (b.storageBytes ?? 0), 0);
  return total > 0 ? formatBytes(total) : '-';
});

const totalStorageBytes = computed(() => {
  return influxBuckets.value.reduce((sum, b) => sum + (b.storageBytes ?? 0), 0);
});

function getStorageProportion(bytes: number): number {
  if (totalStorageBytes.value <= 0) return 0;
  return Math.round((bytes / totalStorageBytes.value) * 100);
}
const influxHealthStatusClass = computed(() => {
  if (!influxHealth.value) return '';
  return influxHealth.value.status === 'healthy' ? 'status-dot-ok' : influxHealth.value.status === 'degraded' ? 'status-dot-warn' : 'status-dot-err';
});
const influxHealthLabel = computed(() => {
  if (!influxHealth.value) return t('system.influxdb.notCheckedShort');
  return t(`system.influxdb.${influxHealth.value.status}`);
});

const selectedProjects = computed(() => {
  const names = new Set<string>();
  for (const row of projectBackups.value) {
    if (selectedProjectRows.value.includes(row.id) && row.projectName) {
      names.add(row.projectName);
    }
  }
  return Array.from(names);
});

const integrityResult = ref<any>(null);
const vacuumResult = ref<any>(null);

const logFilter = ref<{
  dbType?: 'system' | 'project';
  backupType?: 'auto' | 'manual';
  status?: 'success' | 'failed';
}>({});

const configModalTitle = computed(() => {
  return configCategory.value === 'system'
    ? `${t('system.database.scheduledBackupConfig')} - ${t('system.database.configForSystem')}`
    : `${t('system.database.scheduledBackupConfig')} - ${t('system.database.configForProject')}`;
});

// ==================== 标签页配置 ====================

const tabs = computed(() => [
  { name: 'backup', label: t('system.database.backupTab') },
  { name: 'logs', label: t('system.database.logsTab') },
  { name: 'status', label: t('system.database.statusTab') },
  { name: 'health', label: t('system.database.healthTab') },
  { name: 'influxdb', label: t('system.influxdb.tabLabel') },
]);

// 切换到 InfluxDB 标签时自动加载数据
watch(activeTab, (tab) => {
  if (tab === 'influxdb') {
    loadInfluxDbData();
  }
});

// ==================== 加载 ====================

async function loadBackups() {
  backupListLoading.value = true;
  try {
    const res = await databaseApi.getBackups();
    const all = res.data || [];
    systemBackups.value = all.filter((b) => b.dbType === 'system');
    projectBackups.value = all.filter((b) => b.dbType === 'project');
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.loadBackupsFailed'));
    }
  } finally {
    backupListLoading.value = false;
  }
}

async function loadBackupStats() {
  try {
    const res = await databaseApi.getBackupStats();
    backupStats.value = res.data || null;
  } catch {
    // 静默忽略
  }
}

async function loadBackupLogs() {
  logsLoading.value = true;
  try {
    const res = await databaseApi.getBackupLogs({ ...logFilter.value, limit: 200 });
    backupLogs.value = res.data || [];
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.loadLogsFailed'));
    }
  } finally {
    logsLoading.value = false;
  }
}

async function loadBackupConfig() {
  try {
    const res = await databaseApi.getBackupConfig();
    if (res.data) {
      fullBackupConfig.value = res.data;
    }
  } catch {
    // ignore
  }
}

async function loadDatabaseStatus() {
  try {
    const res = await databaseApi.getDatabaseStatus();
    if (res.data) {
      dbStatus.value = res.data;
    }
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.loadStatusFailed'));
    }
  }
}

// ==================== 操作：备份 ====================

async function handleCreateSystemBackup() {
  systemBackupLoading.value = true;
  try {
    const res = await databaseApi.createSystemBackup();
    showSuccess(t('system.database.backupSuccess', { filename: res.data?.filename }));
    await Promise.all([loadBackups(), loadBackupStats(), loadBackupLogs()]);
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.backupFailed'));
    }
  } finally {
    systemBackupLoading.value = false;
  }
}

function toggleProjectRow(id: string) {
  const index = selectedProjectRows.value.indexOf(id);
  if (index === -1) {
    selectedProjectRows.value.push(id);
  } else {
    selectedProjectRows.value.splice(index, 1);
  }
}

function handleSelectAll(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.checked) {
    selectedProjectRows.value = projectBackups.value.map((b) => b.id);
  } else {
    selectedProjectRows.value = [];
  }
}

function selectAllProjects() {
  selectedProjectRows.value = projectBackups.value.map((b) => b.id);
}

async function handleBackupSelected() {
  if (selectedProjects.value.length === 0) {
    showError(t('system.database.backupSelectedNone'));
    return;
  }
  const confirmed = await showConfirm(
    t('system.database.backupAllProjectsConfirm'),
    t('system.database.backupSelected'),
  );
  if (!confirmed) return;

  selectedBackupLoading.value = true;
  try {
    const res = await databaseApi.backupSelectedProjects(selectedProjects.value);
    const count = Array.isArray(res.data) ? res.data.length : 0;
    showSuccess(t('system.database.backupSelectedSuccess', { count }));
    selectedProjectRows.value = [];
    await Promise.all([loadBackups(), loadBackupStats(), loadBackupLogs()]);
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.backupSelectedFailed'));
    }
  } finally {
    selectedBackupLoading.value = false;
  }
}

async function handleBackupAllProjects() {
  const confirmed = await showConfirm(
    t('system.database.backupAllProjectsConfirm'),
    t('system.database.backupAllProjects'),
  );
  if (!confirmed) return;

  backupAllLoading.value = true;
  try {
    const res = await databaseApi.backupAllProjects();
    const count = Array.isArray(res.data) ? res.data.length : 0;
    showSuccess(t('system.database.backupAllProjectsSuccess', { count }));
    await Promise.all([loadBackups(), loadBackupStats(), loadBackupLogs()]);
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.backupAllProjectsFailed'));
    }
  } finally {
    backupAllLoading.value = false;
  }
}

// ==================== 操作：下载/恢复/删除 ====================

function handleDownload(filename: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  window.open(`${baseUrl}/system/backup/${filename}/download`, '_blank');
}

async function handleRestore(row: BackupInfo) {
  const confirmed = await showConfirm(
    t('system.database.restoreConfirmDesc', { filename: row.filename }),
    t('system.database.restoreConfirmTitle'),
  );
  if (!confirmed) return;

  try {
    if (row.dbType === 'project' && row.projectName) {
      await databaseApi.restoreProjectBackup(row.filename, row.projectName);
    } else {
      await databaseApi.restoreBackup(row.filename);
    }
    showSuccess(t('system.database.restoreSuccess'));
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.restoreFailed'));
    }
  }
}

async function handleDeleteBackup(row: BackupInfo) {
  const confirmed = await showConfirm(
    t('system.database.deleteConfirmDesc', { filename: row.filename }),
    t('system.database.deleteConfirmTitle'),
  );
  if (!confirmed) return;

  try {
    await databaseApi.deleteBackup(row.filename);
    showSuccess(t('system.database.deleteSuccess'));
    await Promise.all([loadBackups(), loadBackupStats()]);
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.deleteFailed'));
    }
  }
}

// ==================== 操作：配置 ====================

function openConfigModal(category: 'system' | 'project') {
  configCategory.value = category;
  const cfg = fullBackupConfig.value?.[category];
  configForm.value = {
    enabled: cfg?.enabled ?? (category === 'system'),
    cronExpression: cfg?.cronExpression ?? (category === 'system' ? '0 3 * * *' : '30 3 * * *'),
    retentionDays: cfg?.retentionDays ?? 30,
    backupLocation: cfg?.backupLocation ?? '',
    maxSizeMb: cfg?.maxSizeMb ?? (category === 'system' ? 1024 : 2048),
  };
  showConfigModal.value = true;
}

async function handleSaveConfig() {
  configSaving.value = true;
  try {
    const patch: Partial<BackupConfig> = {
      [configCategory.value]: { ...configForm.value },
    } as any;
    const res = await databaseApi.saveBackupConfig(patch);
    if (res.data) {
      fullBackupConfig.value = res.data;
    }
    showSuccess(t('system.database.configSaved'));
    showConfigModal.value = false;
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.configSaveFailed'));
    }
  } finally {
    configSaving.value = false;
  }
}

// ==================== 操作：清理 ====================

async function handleCleanup(dbType: 'system' | 'project') {
  const days = fullBackupConfig.value?.[dbType]?.retentionDays ?? 30;
  const typeLabel = dbType === 'system' ? t('system.database.systemDb') : t('system.database.projectDb');
  const confirmed = await showConfirm(
    t('system.database.cleanupConfirm', { days, type: typeLabel }),
    t('system.database.cleanup'),
  );
  if (!confirmed) return;

  cleanupLoading.value = dbType;
  try {
    const res = await databaseApi.cleanupExpired(dbType, days);
    showSuccess(t('system.database.cleanupSuccess', { count: (res.data as any)?.deleted ?? 0 }));
    await Promise.all([loadBackups(), loadBackupStats(), loadBackupLogs()]);
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.cleanupFailed'));
    }
  } finally {
    cleanupLoading.value = null;
  }
}

// ==================== 操作：健康检查 ====================

async function handleIntegrityCheck() {
  integrityLoading.value = true;
  try {
    const res = await databaseApi.checkIntegrity();
    integrityResult.value = res.data;
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.integrityCheckFailed'));
    }
  } finally {
    integrityLoading.value = false;
  }
}

async function confirmVacuum() {
  const confirmed = await showConfirm(
    t('system.database.vacuumConfirm'),
    t('system.database.runVacuum'),
  );
  if (!confirmed) return;
  await handleVacuum();
}

async function handleVacuum() {
  vacuumLoading.value = true;
  try {
    const res = await databaseApi.vacuumSystem();
    vacuumResult.value = res.data;
    showSuccess(t('system.database.vacuumSuccess'));
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.vacuumFailed'));
    }
  } finally {
    vacuumLoading.value = false;
  }
}

// ==================== 操作：项目数据库清空/收缩 ====================

/** 项目数据库操作加载状态（同时只允许一个项目的一个操作） */
const projectOpLoading = ref<{ project: string; op: 'events' | 'logs' | 'shrink' } | null>(null);

function isProjectOpLoading(project: string, op: 'events' | 'logs' | 'shrink'): boolean {
  return projectOpLoading.value?.project === project && projectOpLoading.value?.op === op;
}

async function handleClearEvents(row: DatabaseStatus) {
  const confirmed = await showConfirm(
    t('system.database.clearEventsConfirm', { name: row.name }),
    t('system.database.clearEvents'),
  );
  if (!confirmed) return;

  projectOpLoading.value = { project: row.name, op: 'events' };
  try {
    const res = await databaseApi.clearProjectEvents(row.name);
    showSuccess(t('system.database.clearEventsSuccess', { count: res.data?.deleted ?? 0 }));
    await loadDatabaseStatus();
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.clearEventsFailed'));
    }
  } finally {
    projectOpLoading.value = null;
  }
}

async function handleClearLogs(row: DatabaseStatus) {
  const confirmed = await showConfirm(
    t('system.database.clearLogsConfirm', { name: row.name }),
    t('system.database.clearLogs'),
  );
  if (!confirmed) return;

  projectOpLoading.value = { project: row.name, op: 'logs' };
  try {
    const res = await databaseApi.clearProjectLogs(row.name);
    showSuccess(t('system.database.clearLogsSuccess', { count: res.data?.deleted ?? 0 }));
    await loadDatabaseStatus();
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.clearLogsFailed'));
    }
  } finally {
    projectOpLoading.value = null;
  }
}

async function handleShrinkProject(row: DatabaseStatus) {
  const confirmed = await showConfirm(
    t('system.database.shrinkConfirm', { name: row.name }),
    t('system.database.shrinkData'),
  );
  if (!confirmed) return;

  projectOpLoading.value = { project: row.name, op: 'shrink' };
  try {
    const res = await databaseApi.vacuumProject(row.name);
    showSuccess(t('system.database.shrinkSuccess', { freed: res.data?.freedFormatted ?? '0 B' }));
    await loadDatabaseStatus();
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.database.shrinkFailed'));
    }
  } finally {
    projectOpLoading.value = null;
  }
}

// ==================== InfluxDB 操作 ====================

async function loadInfluxDbData() {
  await Promise.all([
    loadInfluxSetupStatus(),
    loadInfluxConfig(),
    handleInfluxHealthCheck(),
    loadInfluxBuckets(),
  ]);
}

async function loadInfluxConfig() {
  try {
    const res = await baseServicesApi.getInfluxConfig();
    if ((res as any).data) {
      influxConfig.value = (res as any).data;
    } else {
      influxConfig.value = res as any;
    }
  } catch {
    // 使用默认值
  }
}

async function loadInfluxSetupStatus() {
  try {
    const res = await baseServicesApi.checkInfluxSetup();
    influxSetup.value = res.data || {
      reachable: false,
      initialized: false,
      tokenConfigured: false,
    };
  } catch {
    // 静默失败，保持默认值
  }
}

async function handleInfluxHealthCheck() {
  influxHealthLoading.value = true;
  try {
    const res = await baseServicesApi.checkInfluxHealth();
    influxHealth.value = res.data || null;
  } catch (e: any) {
    if (!e._errorHandled) {
      showError('InfluxDB health check failed');
    }
  } finally {
    influxHealthLoading.value = false;
  }
}

async function handleInfluxSetup() {
  influxSetupLoading.value = true;
  try {
    const res = await baseServicesApi.setupInfluxDB();
    if (res.data?.success) {
      showSuccess(t('system.influxdb.setupSuccess'));
      // 重新加载状态
      await loadInfluxSetupStatus();
    } else {
      showError(res.data?.message || t('system.influxdb.setupFailed'));
    }
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.influxdb.setupFailed'));
    }
  } finally {
    influxSetupLoading.value = false;
  }
}

async function loadInfluxBuckets() {
  influxBucketsLoading.value = true;
  try {
    const res = await baseServicesApi.listInfluxBuckets();
    influxBuckets.value = (res as any).data ?? res ?? [];
  } catch {
    // 静默失败
  } finally {
    influxBucketsLoading.value = false;
  }
}

/** 正在导出的 bucket 名称（空串表示空闲，用于按钮禁用态） */
const exportingBucket = ref<string>('');

/** 导出单个 Bucket 的时序数据为 CSV（通过鉴权 API 客户端获取 Blob） */
async function handleExportBucketData(bucketName: string) {
  if (exportingBucket.value) return;
  exportingBucket.value = bucketName;
  try {
    const blob = await baseServicesApi.exportBucketData(bucketName, '-1d');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bucketName}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess(t('system.influxdb.exportSuccess'));
  } catch {
    showError(t('system.influxdb.exportFailed'));
  } finally {
    exportingBucket.value = '';
  }
}

/** 导出 Bucket 列表监控数据为 CSV */
function handleExportBucketList() {
  const headers = [
    t('system.influxdb.bucketName'),
    t('system.influxdb.id'),
    t('system.influxdb.size'),
    t('system.influxdb.proportion'),
    t('system.influxdb.measurements'),
    t('system.influxdb.lastWrite'),
    t('system.influxdb.retention'),
  ];
  const rows = influxBuckets.value.map((b) => {
    const proportion = getStorageProportion(b.storageBytes ?? 0);
    const retention = b.retentionPeriodHrs && b.retentionPeriodHrs > 0
      ? formatRetention(b.retentionPeriodHrs)
      : t('system.database.unlimited');
    return [
      b.name,
      b.id,
      b.storageBytes != null ? formatBytes(b.storageBytes) : '-',
      `${proportion}%`,
      b.measurementCount != null ? String(b.measurementCount) : '-',
      b.lastWriteAt ? formatTime(b.lastWriteAt) : '-',
      retention,
    ];
  });
  const csvContent = '\uFEFF' + [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `influxdb-buckets-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showSuccess(t('system.influxdb.exportSuccess'));
}

// ==================== 工具 ====================

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatRetention(hours: number): string {
  if (!hours || hours <= 0) return '∞';
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  if (d === 0) return `${h}h`;
  if (h === 0) return `${d}d`;
  return `${d}d ${h}h`;
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const lang = locale.value === 'en-US' ? 'en-US' : 'zh-CN';
  return d.toLocaleString(lang, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

onMounted(() => {
  loadBackups();
  loadBackupConfig();
  loadDatabaseStatus();
  loadBackupStats();
  loadBackupLogs();
});
</script>

<style scoped>
.db-ops-page {
  padding: 16px;
  min-height: 100%;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.tab-content {
  padding-top: 12px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

/* ===== 标签页 ===== */
.tabs {
  display: flex;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 500;
}

/* ===== 统计栏 ===== */
.stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  color: var(--text);
  font-weight: 600;
}

.stat-value.mono {
  font-family: monospace;
  font-size: 11px;
  font-weight: 500;
}

/* ===== 卡片 ===== */
.card {
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header-actions {
  display: flex;
  gap: 8px;
}

.card-body {
  padding: 16px;
}

/* ===== 按钮 ===== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
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
  background: color-mix(in srgb, var(--primary) 80%, black);
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-text {
  background: transparent;
  color: var(--text-secondary);
  padding: 4px 8px;
}

.btn-text:hover {
  color: var(--text);
}

.btn-sm {
  padding: 5px 12px;
  font-size: 12px;
}

.btn-group {
  display: flex;
  gap: 2px;
}

/* ===== 项目数据库操作按钮组（文字按钮，间距更大） ===== */
.project-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  color: var(--text);
  background: var(--border-light);
}

.btn-icon-warning:hover {
  color: var(--status-warning);
  border-color: var(--status-warning);
  background: color-mix(in srgb, var(--status-warning) 10%, transparent);
}

.btn-icon-danger:hover {
  color: var(--status-error);
  border-color: var(--status-error);
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
}

/* ===== 标签 ===== */
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.tag-default {
  background: var(--surface);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.tag-info {
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: color-mix(in srgb, var(--primary) 70%, transparent);
}

.tag-success {
  background: color-mix(in srgb, var(--status-online) 15%, transparent);
  color: color-mix(in srgb, var(--status-online) 70%, transparent);
}

.tag-warning {
  background: color-mix(in srgb, var(--status-warning) 15%, transparent);
  color: color-mix(in srgb, var(--status-warning) 70%, transparent);
}

.tag-error {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  color: color-mix(in srgb, var(--status-error) 70%, transparent);
}

/* ===== 数据表格 ===== */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 10px 12px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.data-table tr:hover {
  background: var(--border-light);
}

.data-table tr.selected {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
}

.col-check {
  width: 40px;
}

.empty-cell {
  text-align: center;
  padding: 32px;
  color: var(--text-secondary);
}

.error-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--status-error);
}

.error-banner {
  padding: 8px 12px;
  margin-bottom: 12px;
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-error) 30%, transparent);
  border-radius: 6px;
  color: color-mix(in srgb, var(--status-error) 70%, transparent);
  font-size: 12px;
  font-family: monospace;
  word-break: break-all;
}

.error-hint {
  display: block;
  font-size: 11px;
  color: color-mix(in srgb, var(--status-error) 70%, transparent);
  margin-top: 2px;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 项目选择栏 ===== */
.project-select-bar {
  display: flex;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
}

/* ===== 信息网格 ===== */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 13px;
  min-width: 80px;
}

.info-value {
  color: var(--text);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-value.mono {
  font-family: monospace;
  font-size: 12px;
}

.info-value.highlight {
  color: var(--status-online);
  font-weight: 600;
}

/* ===== 检查结果 ===== */
.check-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
}

.check-result.result-ok {
  background: color-mix(in srgb, var(--status-online) 10%, transparent);
  color: var(--status-online);
}

.check-result.result-fail {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  color: var(--status-error);
}

.check-result.check-pending {
  color: var(--text-secondary);
}

.check-result.result-warn {
  background: color-mix(in srgb, var(--status-warning) 10%, transparent);
  color: var(--status-warning);
}

.check-message {
  flex: 1;
}

.check-time {
  color: var(--text-secondary);
  font-size: 12px;
}

/* ===== 加载覆盖层 ===== */
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary);
  gap: 8px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== 弹窗 ===== */
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
  max-width: 640px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
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
  font-size: 18px;
  transition: all 0.15s;
}

.modal-close:hover {
  color: var(--text);
  background: var(--border-light);
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

/* ===== 表单 ===== */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: var(--text-secondary);
}

.form-input:focus {
  border-color: var(--primary);
}

.form-select {
  width: 140px;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.form-select option {
  background: var(--background);
  color: var(--text);
}

/* ===== 开关 ===== */
.toggle {
  width: 44px;
  height: 24px;
  background: var(--border);
  border-radius: 12px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}

.toggle.active {
  background: var(--primary);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: var(--text);
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle.active .toggle-thumb {
  transform: translateX(20px);
}

/* ===== 输入框后缀 ===== */
.input-suffix {
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-suffix .form-input {
  flex: 1;
}

.input-suffix-text {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== 筛选行 ===== */
.filter-row {
  display: flex;
  gap: 12px;
}

/* ===== InfluxDB 运维 ===== */
.setup-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.error-text {
  color: var(--status-error);
}

/* ===== InfluxDB 统计卡片 ===== */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== 状态指示点 ===== */
.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot-ok {
  background: var(--status-online);
}

.status-dot-warn {
  background: var(--status-warning);
}

.status-dot-err {
  background: var(--status-error);
}

/* ===== 卡片内分隔线 ===== */
.card-body hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 16px 0;
}

/* ===== 卡片标题计数 ===== */
.card-header-count {
  font-size: 12px;
  background: var(--border);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
}

/* ===== 操作行 ===== */
.card-actions-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.action-section {
  flex: 1;
  min-width: 200px;
}

/* ===== 健康检查加载 ===== */
.health-checking {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 12px;
}

/* ===== 默认桶高亮 ===== */
.row-highlight td {
  background: var(--border);
}

/* ===== 小标签 ===== */
.tag-sm {
  font-size: 11px;
  padding: 1px 6px;
  margin-left: 6px;
  vertical-align: middle;
}

/* ===== 存储占比进度条 ===== */
.col-proportion {
  min-width: 120px;
}

.size-bar-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.size-bar-fill {
  height: 6px;
  background: var(--primary);
  border-radius: 3px;
  min-width: 2px;
  transition: width 0.3s ease;
}

.size-bar-label {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>