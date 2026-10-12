<template>
  <div class="script-list">
    <div class="left-panel">
      <div class="panel-header">
        <h2 class="panel-title">
          {{ $t('system.scripts.title') }}
        </h2>
        <div class="panel-header-actions">
          <button
            class="btn btn-secondary btn-sm"
            :title="$t('system.scriptTemplates.title')"
            @click="goToTemplateMarket"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
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
            {{ $t('system.scriptTemplates.title') }}
          </button>
          <button
            class="btn btn-primary btn-sm"
            @click="openCreateDialog"
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
            {{ $t('system.scripts.new') }}
          </button>
        </div>
      </div>

      <SsLoading
        v-if="scriptStore.loading"
        :text="$t('system.scripts.loading')"
        size="small"
      />
      <div
        v-else-if="scriptStore.scripts.length === 0"
        class="sidebar-empty"
      >
        <p>{{ $t('system.scripts.noScripts') }}</p>
      </div>
      <div
        v-else
        class="script-nav"
      >
        <button
          v-for="s in scriptStore.scripts"
          :key="s.id"
          class="script-item"
          :class="{ active: selectedScriptId === s.id }"
          @click="selectScript(s.id)"
        >
          <div class="script-item-name">
            {{ s.name }}
          </div>
          <div class="script-item-meta">
            <span
              class="status-dot"
              :class="'dot-' + s.status"
            />
            {{ s.status }}
          </div>
        </button>
      </div>

      <div
        v-if="selectedScript"
        class="script-info"
      >
        <div class="info-row">
          <span class="info-label">{{ $t('system.scripts.status') }}</span>
          <span
            class="status-dot"
            :class="'dot-' + selectedScript.status"
          />
          {{ selectedScript.status }}
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('system.scripts.trigger') }}</span>
          {{ triggerLabel(selectedScript.triggerType) }}
        </div>
        <div
          v-if="selectedScript.timeoutMs"
          class="info-row"
        >
          <span class="info-label">{{ $t('system.scripts.timeout') }}</span>{{ selectedScript.timeoutMs }}ms
        </div>
        <div
          v-if="selectedScript.description"
          class="info-row info-desc"
        >
          {{ selectedScript.description }}
        </div>
      </div>
    </div>

    <div class="right-panel">
      <div
        v-if="!selectedScript"
        class="editor-empty"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        ><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
        <h3>{{ $t('system.scripts.selectOrCreate') }}</h3>
        <p>{{ $t('system.scripts.selectHint') }}</p>
      </div>

      <template v-else>
        <div class="editor-toolbar">
          <div class="toolbar-left">
            <span class="script-name">{{ selectedScript.name }}</span>
          </div>
          <div class="toolbar-right">
            <button
              class="btn btn-secondary btn-sm"
              :disabled="executing"
              @click="handleExecute"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              ><polygon points="5 3 19 12 5 21 5 3" /></svg>
              {{ executing ? $t('system.scripts.executing') : $t('system.scripts.run') }}
            </button>
            <button
              class="btn btn-primary btn-sm"
              :disabled="saving"
              @click="handleSave"
            >
              {{ saving ? $t('system.scripts.saving') : $t('system.scripts.save') }}
            </button>
            <button
              class="btn-icon"
              :title="$t('system.scripts.delete')"
              @click="confirmDelete"
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
        </div>

        <div class="editor-container">
          <ScriptEditor
            v-model="codeContent"
            mode="driver"
            height="100%"
            :show-toolbar="false"
            :show-debug-panel="false"
          />
        </div>

        <div
          v-if="executionResult"
          class="execution-result"
          :class="executionResult.success ? 'result-success' : 'result-error'"
        >
          <div class="result-header">
            <span>{{ executionResult.success ? $t('system.scripts.executionSuccess') : $t('system.scripts.executionFailure') }}</span>
            <span class="result-duration">{{ executionResult.durationMs }}ms</span>
          </div>
          <pre class="result-body">{{ executionResult.result || executionResult.error }}</pre>
        </div>
      </template>
    </div>

    <div
      v-if="showCreateDialog"
      class="modal-overlay"
      @click.self="closeCreateDialog"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>{{ $t('system.scripts.newScript') }}</h2>
          <button
            class="modal-close"
            @click="closeCreateDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">{{ $t('system.scripts.scriptName') }} <span class="required">*</span></label>
            <input
              v-model="form.name"
              type="text"
              class="form-input"
              :placeholder="$t('system.scripts.namePlaceholder')"
              @keyup.enter="handleCreateSubmit"
            >
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.scripts.triggerType') }}</label>
            <select
              v-model="form.triggerType"
              class="form-input form-select"
            >
              <option value="manual">
                {{ $t('system.scripts.manual') }}
              </option>
              <option value="scheduled">
                {{ $t('system.scripts.scheduled') }}
              </option>
              <option value="event">
                {{ $t('system.scripts.eventDriven') }}
              </option>
              <option value="pipeline">
                {{ $t('system.scripts.pipeline') }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.scripts.description') }}</label>
            <input
              v-model="form.description"
              type="text"
              class="form-input"
              :placeholder="$t('system.scripts.descPlaceholder')"
            >
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('system.scripts.content') }}</label>
            <textarea
              v-model="form.code"
              class="form-input form-textarea"
              rows="8"
              :placeholder="$t('system.scripts.contentPlaceholder')"
            />
          </div>
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
            {{ $t('system.scripts.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="submitting"
            @click="handleCreateSubmit"
          >
            {{ submitting ? $t('system.scripts.creating') : $t('system.scripts.create') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { useScriptStore } from '../../stores/script.store';
import { useProjectStore } from '../../stores/project.store';
import { showConfirm, showSuccess, showError } from '../../utils/messageBox';
import type { Script } from '../../types/api';
import ScriptEditor from '../../components/script/ScriptEditor.vue';
import { SsLoading } from '@scada-editor/shared';

const router = useRouter();
const scriptStore = useScriptStore();
const projectStore = useProjectStore();
const { t } = useI18n();

const selectedScriptId = ref<string | null>(null);
const selectedScript = ref<Script | null>(null);
const codeContent = ref('');

const executing = ref(false);
const saving = ref(false);
const executionResult = ref<{ success: boolean; result?: string; error?: string; durationMs: number } | null>(null);

const showCreateDialog = ref(false);
const submitting = ref(false);
const formError = ref('');
const form = ref({
  name: '',
  description: '',
  triggerType: 'manual',
  code: '',
});

function goToTemplateMarket() {
  router.push({ name: 'script-templates' });
}

function triggerLabel(type: string) {
  const map: Record<string, string> = {
    manual: t('system.scripts.manual'),
    scheduled: t('system.scripts.scheduled'),
    event: t('system.scripts.eventDriven'),
    pipeline: t('system.scripts.pipeline'),
  };
  return map[type] || type;
}

async function selectScript(id: string) {
  const projectId = projectStore.projects[0]?.projectId;
  if (!projectId) return;

  await scriptStore.fetchScript(projectId, id);
  selectedScriptId.value = id;
  selectedScript.value = scriptStore.currentScript;

  if (selectedScript.value) {
    codeContent.value = selectedScript.value.code || '';
  }
}

async function handleExecute() {
  if (!selectedScriptId.value) return;
  const projectId = projectStore.projects[0]?.projectId;
  if (!projectId) return;

  executing.value = true;
  executionResult.value = null;
  try {
    const result = await scriptStore.executeScript(projectId, selectedScriptId.value);
    executionResult.value = {
      success: result?.status === 'success',
      result: result?.result,
      error: result?.error,
      durationMs: result?.durationMs || 0,
    };
  } catch (e: any) {
    executionResult.value = {
      success: false,
      error: e?.response?.data?.message || t('system.scripts.errorExecute'),
      durationMs: 0,
    };
  } finally {
    executing.value = false;
  }
}

async function handleSave() {
  if (!selectedScriptId.value) return;
  const projectId = projectStore.projects[0]?.projectId;
  if (!projectId) return;

  saving.value = true;
  try {
    await scriptStore.updateScript(projectId, selectedScriptId.value, {
      code: codeContent.value,
    });
  } catch {
    /* ignore */
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!selectedScriptId.value) return;
  const confirmed = await showConfirm(t('system.scripts.confirmDeleteDesc'), t('system.scripts.confirmDeleteTitle'));
  if (!confirmed) return;
  const projectId = projectStore.projects[0]?.projectId;
  if (!projectId) return;
  try {
    await scriptStore.deleteScript(projectId, selectedScriptId.value);
    selectedScript.value = null;
    selectedScriptId.value = null;
    showSuccess(t('system.scripts.deleted'));
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.scripts.errorDelete'));
    }
  }
}

function openCreateDialog() {
  form.value = { name: '', description: '', triggerType: 'manual', code: '' };
  formError.value = '';
  showCreateDialog.value = true;
}

function closeCreateDialog() {
  showCreateDialog.value = false;
}

async function handleCreateSubmit() {
  formError.value = '';
  if (!form.value.name.trim()) { formError.value = t('system.scripts.errorNameRequired'); return; }
  const projectId = projectStore.projects[0]?.projectId;
  if (!projectId) return;

  submitting.value = true;
  try {
    const script = await scriptStore.createScript(projectId, {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      triggerType: form.value.triggerType,
      code: form.value.code.trim() || t('system.scripts.defaultCode'),
    });
    closeCreateDialog();
    if (script) {
      await selectScript(script.id);
    }
  } catch (e: any) {
    formError.value = e?.response?.data?.message || t('system.scripts.errorCreate');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  if (!projectStore.projects.length) await projectStore.fetchProjects();
  const projectId = projectStore.projects[0]?.projectId;
  if (projectId) {
    await scriptStore.fetchScripts(projectId);
  }
});
</script>

<style scoped>
.script-list {
  height: 100%;
  display: flex;
  overflow: hidden;
}

.left-panel {
  width: 260px;
  border-right: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.sidebar-loading,
.sidebar-empty {
  padding: 24px 16px;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
}

.script-nav {
  overflow-y: auto;
  flex: 1;
}

.script-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.script-item:hover { background: var(--border); }
.script-item.active { background: rgba(26, 115, 232, 0.12); }

.script-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 2px;
}

.script-item-meta {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.dot-active { background: var(--status-success); }
.dot-draft { background: var(--text-secondary); }
.dot-paused { background: var(--status-warning); }
.dot-error { background: var(--status-error); }

.script-info {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.info-label {
  color: var(--text-secondary);
  min-width: 36px;
}

.info-desc {
  margin-top: 6px;
  color: var(--text-secondary);
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  gap: 8px;
}

.editor-empty h3 { font-size: 18px; color: var(--text-secondary); margin: 0; }
.editor-empty p { margin: 0; font-size: 14px; }
.editor-empty svg { color: var(--border); }

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.script-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.toolbar-right {
  display: flex;
  gap: 6px;
}

.editor-container {
  flex: 1;
  overflow: hidden;
}

.execution-result {
  border-top: 1px solid var(--border);
  padding: 12px 16px;
  max-height: 160px;
  overflow-y: auto;
  flex-shrink: 0;
}

.result-success { background: color-mix(in srgb, var(--status-online) 15%, transparent); }
.result-error { background: color-mix(in srgb, var(--status-error) 15%, transparent); }

.result-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
}

.result-success .result-header { color: var(--status-success); }
.result-error .result-header { color: var(--status-error); }

.result-duration {
  font-size: 12px;
  color: var(--text-secondary);
}

.result-body {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 100px;
  overflow-y: auto;
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
.btn-primary { background: var(--primary); color: var(--text); }
.btn-primary:hover:not(:disabled) { background: var(--primary); }
.btn-secondary { background: var(--border); color: var(--text); }
.btn-secondary:hover:not(:disabled) { background: var(--border-light); }
.btn-sm { padding: 5px 10px; font-size: 13px; }

.btn-icon {
  width: 30px;
  height: 30px;
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

.btn-icon:hover { background: color-mix(in srgb, var(--status-error) 12%, transparent); border-color: var(--status-error); color: var(--status-error); }

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
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.modal-header h2 { font-size: 18px; font-weight: 600; color: var(--text); margin: 0; }
.modal-close { background: none; border: none; font-size: 24px; color: var(--text-secondary); cursor: pointer; padding: 0; line-height: 1; }
.modal-close:hover { color: var(--text); }

.modal-body { padding: 20px 24px; }

.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 24px 20px; }

.form-group { margin-bottom: 14px; }

.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
.required { color: var(--status-error); }

.form-input {
  width: 100%;
  padding: 9px 12px;
  background: var(--background);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input::placeholder { color: var(--border); }
.form-input:focus { border-color: var(--primary); }

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 20px;
  padding-right: 32px;
}

.form-select option { background: var(--surface); color: var(--text); }

.form-error { color: var(--status-error); font-size: 13px; margin: -4px 0 0 0; }
</style>