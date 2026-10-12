<template>
  <div class="project-manage">
    <div class="page-header">
      <button
        class="btn btn-secondary btn-sm"
        @click="goBack"
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
          <line
            x1="19"
            y1="12"
            x2="5"
            y2="12"
          />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        {{ $t('system.projects.backToList') }}
      </button>
      <div class="header-tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'info' }]"
          @click="activeTab = 'info'"
        >
          {{ $t('system.projectManage.tabInfo') }}
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'importExport' }]"
          @click="activeTab = 'importExport'"
        >
          {{ $t('system.projectManage.tabImportExport') }}
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'diagnose' }]"
          @click="activeTab = 'diagnose'"
        >
          {{ $t('system.projectManage.tabDiagnose') }}
        </button>
      </div>
    </div>

    <SsLoading
      v-if="loading"
      :text="$t('system.projects.loading')"
      size="small"
    />

    <div
      v-else-if="error"
      class="error-state"
    >
      <p>{{ error }}</p>
      <button
        class="btn btn-secondary"
        @click="fetchData"
      >
        {{ $t('system.projects.retry') }}
      </button>
    </div>

    <!-- 项目信息 Tab -->
    <div
      v-else-if="activeTab === 'info'"
      class="tab-content"
    >
      <div class="info-panel">
        <!-- 项目头部 -->
        <div class="info-header">
          <div class="header-left">
            <div class="project-icon">
              <img
                v-if="manageInfo?.image"
                :src="projectApi.getImageUrl(projectId)"
                class="project-icon-img"
                :alt="manageInfo?.projectName"
              >
              <svg
                v-else
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect
                  x="7"
                  y="7"
                  width="10"
                  height="10"
                  rx="1"
                />
              </svg>
            </div>
            <div class="header-title">
              <div class="header-title-row">
                <h2>{{ manageInfo?.projectName || '—' }}</h2>
                <span
                  v-if="manageInfo?.dbMode"
                  class="header-dbmode-badge"
                  :class="manageInfo.dbMode === 'isolated' ? 'badge-success' : 'badge-info'"
                >{{ manageInfo.dbMode }}</span>
              </div>
              <span
                v-if="manageInfo?.description"
                class="header-desc"
              >{{ manageInfo.description }}</span>
              <div class="header-meta">
                <span
                  v-if="manageInfo?.projectId"
                  class="meta-item"
                >
                  <span class="meta-label">{{ $t('system.projectManage.projectCode') }}</span>
                  <span class="meta-value mono">{{ manageInfo.projectId }}</span>
                </span>
                <span
                  v-if="manageInfo?.pageCount !== undefined"
                  class="meta-item"
                >
                  <span class="meta-label">{{ $t('system.projectManage.pageCount') }}</span>
                  <span class="meta-value">{{ manageInfo.pageCount }} {{ $t('system.projectManage.pagesUnit') }}</span>
                </span>
                <span
                  v-if="manageInfo?.createdAt"
                  class="meta-item"
                >
                  <span class="meta-label">{{ $t('system.projectManage.createdAt') }}</span>
                  <span class="meta-value">{{ formatDate(manageInfo.createdAt) }}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="version-edit-wrap">
            <template v-if="!versionEditing">
              <span class="version-badge">v{{ manageInfo?.version || '1.0.0' }}</span>
              <button
                class="version-edit-btn"
                :title="$t('system.projectManage.editVersion')"
                @click="startEditVersion"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </template>
            <template v-else>
              <input
                ref="versionInputRef"
                v-model="versionDraft"
                class="version-input"
                maxlength="32"
                @keyup.enter="saveVersion"
                @keyup.esc="cancelEditVersion"
              >
              <button
                class="version-save-btn"
                :disabled="versionSaving"
                :title="$t('common.save')"
                @click="saveVersion"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                class="version-cancel-btn"
                :title="$t('common.cancel')"
                @click="cancelEditVersion"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                >
                  <line
                    x1="18"
                    y1="6"
                    x2="6"
                    y2="18"
                  />
                  <line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                  />
                </svg>
              </button>
            </template>
          </div>
        </div>

        <!-- 分组卡片 -->
        <div class="info-cards">
          <!-- 标识信息 -->
          <div class="info-card">
            <div class="card-header">
              <svg
                class="card-icon"
                width="16"
                height="16"
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
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span class="card-title">{{ $t('system.projectManage.groupIdentity') }}</span>
            </div>
            <div class="card-body">
              <div class="field-row">
                <span class="field-label">{{ $t('system.projectManage.projectId') }}</span>
                <div class="field-value-wrap">
                  <span class="field-value mono pill">{{ manageInfo?.tenantId || '—' }}</span>
                  <button
                    v-if="manageInfo?.tenantId"
                    class="copy-btn"
                    :title="$t('system.projectManage.copy')"
                    @click="copyText(manageInfo.tenantId)"
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
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="field-row">
                <span class="field-label">{{ $t('system.projectManage.pageCount') }}</span>
                <span class="field-value">
                  <strong>{{ manageInfo?.pageCount ?? 0 }}</strong>
                  <span class="unit">{{ $t('system.projectManage.pagesUnit') }}</span>
                </span>
              </div>
              <div class="field-row">
                <span class="field-label">{{ $t('system.projectManage.dbMode') }}</span>
                <span class="field-value">
                  <span
                    class="tag"
                    :class="manageInfo?.dbMode === 'isolated' ? 'tag-success' : 'tag-info'"
                  >
                    {{ manageInfo?.dbMode || '—' }}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <!-- 基本信息 -->
          <div class="info-card">
            <div class="card-header">
              <svg
                class="card-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle
                  cx="12"
                  cy="10"
                  r="3"
                />
              </svg>
              <span class="card-title">{{ $t('system.projectManage.groupBasic') }}</span>
            </div>
            <div class="card-body">
              <div class="field-row">
                <span class="field-label">{{ $t('system.projectManage.projectCode') }}</span>
                <div class="field-value-wrap">
                  <span class="field-value mono pill">{{ manageInfo?.projectId || '—' }}</span>
                  <button
                    v-if="manageInfo?.projectId"
                    class="copy-btn"
                    :title="$t('system.projectManage.copy')"
                    @click="copyText(manageInfo.projectId)"
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
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="field-row">
                <span class="field-label">{{ $t('system.projectManage.projectAddress') }}</span>
                <span class="field-value">{{ manageInfo?.address || $t('system.projectManage.notSet') }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">{{ $t('system.projectManage.projectLatLng') }}</span>
                <span
                  v-if="manageInfo?.longitude || manageInfo?.latitude"
                  class="field-value mono"
                >{{ manageInfo?.longitude || '—' }}, {{ manageInfo?.latitude || '—' }}</span>
                <span
                  v-else
                  class="field-value"
                >{{ $t('system.projectManage.notSet') }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">{{ $t('system.projectManage.projectOwner') }}</span>
                <span class="field-value">{{ manageInfo?.owner || $t('system.projectManage.notSet') }}</span>
              </div>
            </div>
          </div>

          <!-- 存储路径 -->
          <div class="info-card">
            <div class="card-header">
              <svg
                class="card-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span class="card-title">{{ $t('system.projectManage.groupStorage') }}</span>
            </div>
            <div class="card-body">
              <div class="field-row field-col">
                <div class="field-label-row">
                  <span class="field-label">{{ $t('system.projectManage.projectPath') }}</span>
                  <button
                    v-if="manageInfo?.projectPath"
                    class="copy-btn"
                    :title="$t('system.projectManage.copy')"
                    @click="copyText(manageInfo.projectPath)"
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
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <span
                  class="field-value mono path-value"
                  :title="manageInfo?.projectPath"
                >{{ manageInfo?.projectPath || '—' }}</span>
              </div>
              <div class="field-row field-col">
                <div class="field-label-row">
                  <span class="field-label">{{ $t('system.projectManage.databasePath') }}</span>
                  <div class="field-actions">
                    <span
                      v-if="manageInfo?.dbSize !== undefined && manageInfo.dbSize > 0"
                      class="size-tag"
                    >{{ formatSize(manageInfo.dbSize) }}</span>
                    <button
                      v-if="manageInfo?.databasePath"
                      class="copy-btn"
                      :title="$t('system.projectManage.copy')"
                      @click="copyText(manageInfo.databasePath)"
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
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                </div>
                <span
                  class="field-value mono path-value"
                  :title="manageInfo?.databasePath"
                >{{ manageInfo?.databasePath || '—' }}</span>
              </div>
              <div class="field-row field-col">
                <div class="field-label-row">
                  <span class="field-label">{{ $t('system.projectManage.rtdbPath') }}</span>
                  <div class="field-actions">
                    <span
                      v-if="manageInfo?.rtdbSize !== undefined && manageInfo.rtdbSize > 0"
                      class="size-tag"
                    >{{ formatSize(manageInfo.rtdbSize) }}</span>
                    <button
                      v-if="manageInfo?.rtdbPath"
                      class="copy-btn"
                      :title="$t('system.projectManage.copy')"
                      @click="copyText(manageInfo.rtdbPath)"
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
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                </div>
                <span
                  class="field-value mono path-value"
                  :title="manageInfo?.rtdbPath"
                >{{ manageInfo?.rtdbPath || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- 时间信息 -->
          <div class="info-card">
            <div class="card-header">
              <svg
                class="card-icon"
                width="16"
                height="16"
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
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span class="card-title">{{ $t('system.projectManage.groupTimestamps') }}</span>
            </div>
            <div class="card-body">
              <div class="field-row">
                <span class="field-label">{{ $t('system.projectManage.createdAt') }}</span>
                <span class="field-value">{{ formatDate(manageInfo?.createdAt) }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">{{ $t('system.projectManage.updatedAt') }}</span>
                <span class="field-value">{{ formatDate(manageInfo?.updatedAt) }}</span>
              </div>
              <div
                v-if="manageInfo?.createdBy"
                class="field-row"
              >
                <span class="field-label">{{ $t('system.projectManage.createdBy') }}</span>
                <span class="field-value">{{ manageInfo.createdBy }}</span>
              </div>
              <div
                v-if="manageInfo?.updatedBy"
                class="field-row"
              >
                <span class="field-label">{{ $t('system.projectManage.updatedBy') }}</span>
                <span class="field-value">{{ manageInfo.updatedBy }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入导出 Tab -->
    <div
      v-else-if="activeTab === 'importExport'"
      class="tab-content"
    >
      <div class="import-export-panel">
        <!-- 导出区域 -->
        <div class="section-card">
          <h3 class="section-title">
            {{ $t('system.projectManage.exportData') }}
          </h3>
          <p class="section-desc">
            {{ $t('system.projectManage.exportDesc') }}
          </p>

          <div class="export-options">
            <label class="checkbox-label">
              <input
                v-model="exportOptions.pages"
                type="checkbox"
              >
              <span>{{ $t('system.projectManage.exportPages') }}</span>
            </label>
            <label class="checkbox-label">
              <input
                v-model="exportOptions.projectDb"
                type="checkbox"
              >
              <span>{{ $t('system.projectManage.exportProjectDb') }}</span>
            </label>
            <label class="checkbox-label">
              <input
                v-model="exportOptions.rtdb"
                type="checkbox"
              >
              <span>{{ $t('system.projectManage.exportRtdb') }}</span>
            </label>
          </div>

          <div class="action-buttons">
            <button
              class="btn btn-primary"
              :disabled="exporting || !hasExportSelection"
              @click="handleExportAll"
            >
              {{ exporting ? $t('system.projectManage.exporting') : $t('system.projectManage.exportAll') }}
            </button>
            <button
              class="btn btn-secondary"
              :disabled="exporting"
              @click="handleExportPages"
            >
              {{ $t('system.projectManage.exportPagesBtn') }}
            </button>
          </div>
        </div>

        <!-- 导入区域 -->
        <div class="section-card">
          <h3 class="section-title">
            {{ $t('system.projectManage.importData') }}
          </h3>
          <p class="section-desc">
            {{ $t('system.projectManage.importDesc') }}
          </p>

          <div class="import-options">
            <label class="radio-label">
              <input
                v-model="importType"
                type="radio"
                value="all"
              >
              <span>{{ $t('system.projectManage.importAll') }}</span>
            </label>
            <label class="radio-label">
              <input
                v-model="importType"
                type="radio"
                value="pages"
              >
              <span>{{ $t('system.projectManage.importPages') }}</span>
            </label>
          </div>

          <div class="action-buttons">
            <input
              ref="importFileInput"
              type="file"
              accept=".zip"
              class="file-input-hidden"
              @change="handleImportFile"
            >
            <button
              class="btn btn-primary"
              :disabled="importing"
              @click="triggerImport"
            >
              {{ importing ? $t('system.projectManage.importing') : $t('system.projectManage.importBtn') }}
            </button>
          </div>

          <div
            v-if="importResult"
            class="import-result"
          >
            <p :class="importResult.success ? 'text-success' : 'text-error'">
              {{ importResult.message }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 资源诊断 Tab -->
    <div
      v-else-if="activeTab === 'diagnose'"
      class="tab-content"
    >
      <div class="diagnose-panel">
        <div
          v-if="!diagnoseResult"
          class="diagnose-empty"
        >
          <p>{{ $t('system.projects.diagnoseNotRun') }}</p>
          <button
            class="btn btn-primary"
            :disabled="diagnosing"
            @click="handleDiagnose"
          >
            {{ diagnosing ? $t('system.projects.diagnosing') : $t('system.projectManage.runDiagnose') }}
          </button>
        </div>

        <template v-else>
          <!-- 健康度头部 -->
          <div :class="['diagnose-health-header', `health-${diagnoseResult.health}`]">
            <span class="health-badge">{{ getHealthIcon(diagnoseResult.health) }}</span>
            <span class="health-label">{{ $t('system.projects.healthStatus') }}:</span>
            <strong>{{ getHealthText(diagnoseResult.health) }}</strong>
            <span class="health-dbmode">({{ $t('system.projects.dbMode') }}: {{ diagnoseResult.dbMode }})</span>
          </div>

          <!-- 资源清单 -->
          <div class="diagnose-resource-list">
            <h4>{{ $t('system.projects.resourceList') }}</h4>
            <div
              v-for="(res, key) in diagnoseResult.resources"
              :key="key"
              class="diagnose-resource-item"
            >
              <span :class="['status-icon', `status-${res?.status}`]">
                {{ getStatusIcon(res?.status ?? '') }}
              </span>
              <span class="resource-name">{{ getResourceLabel(key) }}</span>
              <span class="resource-path">{{ shortenPath(res?.path ?? '') }}</span>
              <span
                v-if="res?.status === 'ok' && res?.size"
                class="resource-size"
              >{{ formatSize(res?.size) }}</span>
              <span :class="['status-tag', `tag-${res?.status}`]">{{ getStatusLabel(res?.status ?? '') }}</span>
            </div>
          </div>

          <!-- 问题列表 -->
          <div
            v-if="(diagnoseResult.issues?.length ?? 0) > 0"
            class="diagnose-issues"
          >
            <h4>{{ $t('system.projects.issuesFound', { count: diagnoseResult.issues?.length ?? 0 }) }}</h4>
            <ol>
              <li
                v-for="(issue, idx) in diagnoseResult.issues"
                :key="idx"
              >
                {{ issue }}
              </li>
            </ol>
          </div>

          <!-- 修复结果 -->
          <div
            v-if="repairResult"
            class="diagnose-repair-result"
          >
            <h4>{{ $t('system.projects.repairResult') }}</h4>
            <div
              v-if="repairResult.initialized.length > 0"
              class="repair-section repair-success"
            >
              <p><strong>{{ $t('system.projects.repaired') }}:</strong></p>
              <ul>
                <li
                  v-for="item in repairResult.initialized"
                  :key="item"
                >
                  {{ getResourceLabel(item) }}
                </li>
              </ul>
            </div>
            <div
              v-if="repairResult.warnings.length > 0"
              class="repair-section repair-warnings"
            >
              <p><strong>{{ $t('system.projects.repairWarnings') }}:</strong></p>
              <ul>
                <li
                  v-for="(w, idx) in repairResult.warnings"
                  :key="idx"
                >
                  {{ w }}
                </li>
              </ul>
            </div>
          </div>
        </template>

        <div
          v-if="diagnoseResult"
          class="diagnose-actions"
        >
          <button
            class="btn btn-secondary"
            :disabled="diagnosing"
            @click="handleDiagnose"
          >
            {{ diagnosing ? $t('system.projects.diagnosing') : $t('system.projects.reDiagnose') }}
          </button>
          <button
            v-if="diagnoseResult.health !== 'healthy'"
            class="btn btn-primary"
            :disabled="repairing"
            @click="handleRepair"
          >
            {{ repairing ? $t('system.projects.repairing') : $t('system.projects.repairAll') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { projectApi, type ManageInfo } from '../../api/modules/project.api';
import type { DiagnoseResult } from '../../types/api';
import { SsLoading } from '@scada-editor/shared';
import { showError, showSuccess } from '../../utils/messageBox';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const projectId = route.params.projectId as string;

const activeTab = ref<'info' | 'importExport' | 'diagnose'>('info');
const loading = ref(false);
const error = ref('');
const manageInfo = ref<ManageInfo | null>(null);
const diagnoseResult = ref<DiagnoseResult | null>(null);
const diagnosing = ref(false);
const repairing = ref(false);
const repairResult = ref<{ initialized: string[]; skipped: string[]; warnings: string[] } | null>(null);
const exporting = ref(false);
const importing = ref(false);
const importResult = ref<{ success: boolean; message: string } | null>(null);
const importFileInput = ref<HTMLInputElement | null>(null);
const importType = ref<'all' | 'pages'>('all');
const exportOptions = ref({
  pages: true,
  projectDb: true,
  rtdb: true,
});

// 版本号编辑
const versionEditing = ref(false);
const versionDraft = ref('');
const versionSaving = ref(false);
const versionInputRef = ref<HTMLInputElement | null>(null);

function startEditVersion() {
  versionDraft.value = manageInfo.value?.version || '1.0.0';
  versionEditing.value = true;
  nextTick(() => {
    versionInputRef.value?.focus();
    versionInputRef.value?.select();
  });
}

function cancelEditVersion() {
  versionEditing.value = false;
  versionDraft.value = '';
}

async function saveVersion() {
  const v = versionDraft.value.trim();
  if (!v) {
    showError(t('system.projectManage.versionEmpty'));
    return;
  }
  if (v === manageInfo.value?.version) {
    versionEditing.value = false;
    return;
  }
  versionSaving.value = true;
  try {
    await projectApi.update(projectId, { version: v });
    if (manageInfo.value) {
      manageInfo.value.version = v;
      manageInfo.value.updatedAt = new Date().toISOString();
    }
    versionEditing.value = false;
    showSuccess(t('system.projectManage.versionSaveSuccess'));
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(e?.response?.data?.message || t('system.projectManage.versionSaveFailed'));
    }
  } finally {
    versionSaving.value = false;
  }
}

const hasExportSelection = computed(() => {
  return exportOptions.value.pages || exportOptions.value.projectDb || exportOptions.value.rtdb;
});

function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function shortenPath(filePath?: string): string {
  if (!filePath) return '—';
  const parts = filePath.replace(/\\/g, '/').split('/');
  if (parts.length <= 3) return filePath;
  return '.../' + parts.slice(-3).join('/');
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  } catch {
    // 忽略复制失败
  }
}

// --- 项目信息 ---
// 初始加载失败时不弹窗：页面已显示 error-state UI（含重试按钮），
// 弹窗会阻塞用户操作且与错误状态 UI 重复。仅动作类失败（诊断/修复/导出/导入）才弹窗。
async function fetchData() {
  loading.value = true;
  error.value = '';
  try {
    const res = await projectApi.getManageInfo(projectId);
    manageInfo.value = res;
  } catch (e: any) {
    error.value = e?.response?.data?.message || t('system.errors.fetchProjectFailed');
  } finally {
    loading.value = false;
  }
}

// --- 诊断 ---
async function handleDiagnose() {
  diagnosing.value = true;
  try {
    const res = await projectApi.diagnose(projectId);
    diagnoseResult.value = res;
    repairResult.value = null;
  } catch (e: any) {
    if (!e._errorHandled) {
      const msg = e?.response?.data?.message || t('system.projects.diagnoseFailed');
      showError(msg);
    }
  } finally {
    diagnosing.value = false;
  }
}

async function handleRepair() {
  repairing.value = true;
  repairResult.value = null;
  try {
    const result = await projectApi.initResources(projectId);
    repairResult.value = {
      initialized: result?.initialized || [],
      skipped: result?.skipped || [],
      warnings: result?.warnings || [],
    };
    if (result?.initialized?.length) {
      showSuccess(t('system.projects.repairSuccessCount', { count: result.initialized.length }));
    }
    await handleDiagnose();
  } catch (e: any) {
    if (!e._errorHandled) {
      const msg = e?.response?.data?.message || t('system.projects.repairFailed');
      showError(msg);
    }
  } finally {
    repairing.value = false;
  }
}

// --- 导出 ---
async function handleExportAll() {
  // 至少需要选择一项
  if (!hasExportSelection.value) {
    showError(t('system.projectManage.exportNoSelection'));
    return;
  }
  exporting.value = true;
  try {
    // 传递用户选择的导出项：未选的项传 false 排除
    const blob = await projectApi.exportProjectZip(projectId, {
      includePages: exportOptions.value.pages,
      includeProjectDb: exportOptions.value.projectDb,
      includeRtdb: exportOptions.value.rtdb,
    });
    downloadBlob(blob, `${projectId}_export.zip`);
    showSuccess(t('system.projectManage.exportSuccess'));
  } catch (e: any) {
    if (!e._errorHandled) {
      // Blob 响应的错误需要从 blob 中解析 JSON
      const msg = await extractBlobErrorMessage(e);
      showError(msg || t('system.projectManage.exportFailed'));
    }
  } finally {
    exporting.value = false;
  }
}

async function handleExportPages() {
  exporting.value = true;
  try {
    const blob = await projectApi.exportPagesZip(projectId);
    downloadBlob(blob, `${projectId}_pages.zip`);
    showSuccess(t('system.projectManage.exportSuccess'));
  } catch (e: any) {
    if (!e._errorHandled) {
      const msg = await extractBlobErrorMessage(e);
      showError(msg || t('system.projectManage.exportFailed'));
    }
  } finally {
    exporting.value = false;
  }
}

/**
 * 从 Blob 错误响应中提取后端返回的 message 字段。
 * 后端导出/导入失败时返回 JSON 错误，但前端 responseType:'blob' 无法直接解析。
 */
async function extractBlobErrorMessage(e: any): Promise<string> {
  const blob = e?.response?.data;
  if (blob instanceof Blob) {
    try {
      const text = await blob.text();
      const json = JSON.parse(text);
      return json?.message || '';
    } catch {
      return '';
    }
  }
  return e?.response?.data?.message || '';
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- 导入 ---
function triggerImport() {
  importFileInput.value?.click();
}

async function handleImportFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  importing.value = true;
  importResult.value = null;
  try {
    if (importType.value === 'all') {
      await projectApi.importProjectZip(file, true);
      importResult.value = { success: true, message: t('system.projectManage.importSuccess') };
    } else {
      await projectApi.importPagesZip(projectId, file, true);
      importResult.value = { success: true, message: t('system.projectManage.importPagesSuccess') };
    }
    await fetchData();
  } catch (e: any) {
    importResult.value = {
      success: false,
      message: e?.response?.data?.message || t('system.projectManage.importFailed'),
    };
  } finally {
    importing.value = false;
    if (target) target.value = '';
  }
}

// --- 诊断辅助函数 ---
const RESOURCE_LABEL_KEY_MAP: Record<string, string> = {
  projectinfo: 'system.projectManage.resourceProjectinfo',
  dbDir: 'system.projectManage.resourceDbDir',
  rtdbDir: 'system.projectManage.resourceRtdbDir',
  pagesDir: 'system.projectManage.resourcePagesDir',
  templateDir: 'system.projectManage.resourceTemplateDir',
  systemDb: 'system.projectManage.resourceSystemDb',
  eventDb: 'system.projectManage.resourceEventDb',
};

function getResourceLabel(key: string): string {
  const labelKey = RESOURCE_LABEL_KEY_MAP[key];
  return labelKey ? t(labelKey) : key;
}

function getStatusIcon(status: string): string {
  if (status === 'ok') return '\u2705';
  if (status === 'empty') return '\u26A0\uFE0F';
  return '\u274C';
}

function getStatusLabel(status: string): string {
  if (status === 'ok') return t('system.projects.statusOk');
  if (status === 'empty') return t('system.projects.statusEmpty');
  if (status === 'missing') return t('system.projects.statusMissing');
  return t('system.projects.statusError');
}

function getHealthIcon(health: string): string {
  if (health === 'healthy') return '\u2705';
  if (health === 'degraded') return '\u26A0\uFE0F';
  return '\u274C';
}

function getHealthText(health: string): string {
  if (health === 'healthy') return t('system.projects.healthy');
  if (health === 'degraded') return t('system.projects.degraded');
  return t('system.projects.unhealthy');
}

function goBack() {
  router.push('/system/projects');
}

onMounted(() => {
  if (projectId) {
    fetchData();
  }
});
</script>

<style scoped>
.project-manage {
  padding: 20px 24px 32px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.header-tabs {
  display: flex;
  gap: 4px;
  background: var(--background);
  border-radius: 8px;
  padding: 3px;
}

.tab-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  background: var(--primary);
  color: var(--text);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* 信息面板 */
.info-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
  min-height: 400px;
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.project-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  flex-shrink: 0;
  overflow: hidden;
}

.project-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  display: block;
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.header-dbmode-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  flex-shrink: 0;
}

.header-dbmode-badge.badge-success {
  background: color-mix(in srgb, var(--status-online) 15%, transparent);
  color: var(--status-online);
}

.header-dbmode-badge.badge-info {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 2px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.meta-label {
  color: var(--text-secondary);
}

.meta-value {
  color: var(--text);
}

.meta-value.mono {
  font-family: 'Courier New', monospace;
  color: var(--primary);
}

.info-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-desc {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-badge {
  display: inline-block;
  padding: 3px 10px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
  flex-shrink: 0;
}

.version-edit-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.version-edit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.version-edit-btn:hover {
  background: var(--primary);
  color: var(--text);
}

.version-input {
  width: 110px;
  padding: 4px 8px;
  border: 1px solid var(--primary);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  font-family: 'Courier New', monospace;
  outline: none;
}

.version-save-btn,
.version-cancel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.version-save-btn {
  background: color-mix(in srgb, var(--status-success) 15%, transparent);
  color: var(--status-success);
}

.version-save-btn:hover:not(:disabled) {
  background: var(--status-success);
  color: var(--text);
}

.version-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.version-cancel-btn {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  color: var(--status-error);
}

.version-cancel-btn:hover {
  background: var(--status-error);
  color: var(--text);
}

/* 分组卡片：自适应平铺，340px 最小宽度确保 4 卡片在桌面端排成 2×2 整齐方阵 */
.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.info-card {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.info-card:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--surface) 60%, transparent);
  border-bottom: 1px solid var(--border);
}

.card-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.card-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 28px;
}

.field-row.field-col {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.field-label {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.field-value {
  font-size: 13px;
  color: var(--text);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--primary);
}

.field-value.mono.pill {
  display: inline-block;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border-radius: 4px;
  font-size: 12px;
}

.field-value.path-value {
  text-align: left;
  word-break: break-all;
  white-space: normal;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.field-value-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-value strong {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.unit {
  margin-left: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
}

.tag-success {
  background: color-mix(in srgb, var(--status-online) 15%, transparent);
  color: var(--status-online);
}

.tag-info {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}

.size-tag {
  display: inline-block;
  padding: 1px 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 10px;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.copy-btn:hover {
  background: var(--primary);
  color: var(--text);
}

/* 导入导出面板 */
.import-export-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 400px;
}

.section-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  background: var(--background);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
}

.export-options,
.import-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.checkbox-label,
.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text);
  cursor: pointer;
}

.checkbox-label input,
.radio-label input {
  accent-color: var(--primary);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.file-input-hidden {
  display: none;
}

.import-result {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
}

.text-success {
  color: var(--status-online);
}

.text-error {
  color: var(--status-error);
}

/* 诊断面板 */
.diagnose-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
  min-height: 400px;
}

.diagnose-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.diagnose-empty p {
  margin-bottom: 16px;
}

.diagnose-health-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.diagnose-health-header.health-healthy {
  background: color-mix(in srgb, var(--status-success) 15%, transparent);
  border: 1px solid var(--status-success);
  color: var(--status-success);
}

.diagnose-health-header.health-degraded {
  background: color-mix(in srgb, var(--status-warning) 15%, transparent);
  border: 1px solid var(--status-warning);
  color: var(--status-warning);
}

.diagnose-health-header.health-unhealthy {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  border: 1px solid var(--status-error);
  color: var(--status-error);
}

.diagnose-resource-list,
.diagnose-issues,
.diagnose-repair-result {
  margin-bottom: 16px;
}

.diagnose-resource-list h4,
.diagnose-issues h4,
.diagnose-repair-result h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.diagnose-resource-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  font-size: 13px;
  border-bottom: 1px solid var(--background);
}

.diagnose-resource-item:last-child {
  border-bottom: none;
}

.status-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.resource-name {
  flex-shrink: 0;
  font-weight: 500;
  color: var(--text);
  min-width: 120px;
}

.resource-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: var(--text-secondary);
}

.resource-size {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
  flex-shrink: 0;
}

.status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  flex-shrink: 0;
}

.status-tag.tag-ok {
  background: color-mix(in srgb, var(--status-success) 15%, transparent);
  color: var(--status-success);
}

.status-tag.tag-empty {
  background: color-mix(in srgb, var(--status-warning) 15%, transparent);
  color: var(--status-warning);
}

.status-tag.tag-missing,
.status-tag.tag-error {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  color: var(--status-error);
}

.diagnose-issues ol {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--text);
}

.diagnose-issues ol li {
  margin-bottom: 4px;
  line-height: 1.6;
}

.diagnose-repair-result .repair-section {
  margin-bottom: 8px;
}

.diagnose-repair-result ul {
  margin: 4px 0 0 0;
  padding-left: 20px;
  font-size: 13px;
}

.repair-success ul li { color: var(--status-success); }
.repair-warnings ul li { color: var(--status-warning); }

.diagnose-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.health-badge { font-size: 18px; }
.health-label { font-size: 13px; }
.health-dbmode { font-size: 12px; opacity: 0.7; margin-left: auto; }

/* 通用按钮 */
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: var(--text);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--border);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--text-secondary);
  color: var(--text);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
</style>