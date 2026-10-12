<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="dialog-overlay"
      @click.self="handleCancel"
    >
      <div class="dialog-container">
        <div class="dialog-header">
          <h2>{{ $t('editor.openProject') }}</h2>
          <button
            class="close-btn"
            @click="handleCancel"
          >
            ×
          </button>
        </div>

        <div class="dialog-body">
          <div class="search-bar">
            <input
              v-model="searchKeyword"
              type="text"
              :placeholder="$t('editor.searchProject')"
              class="search-input"
              @input="handleSearch"
            >
          </div>

          <div
            v-if="loading"
            class="loading-state"
          >
            {{ $t('editor.loading') }}
          </div>

          <div
            v-else-if="projects.length === 0"
            class="empty-state"
          >
            {{ $t('editor.noProjects') }}
          </div>

          <div
            v-else
            class="project-list"
          >
            <div
              v-for="project in projects"
              :key="project.tid"
              class="project-card"
              :class="{ selected: selectedProject === project.tid }"
              @click="selectedProject = project.tid"
            >
              <div class="project-card-header">
                <span class="project-name">{{ project.name }}</span>
                <span
                  v-if="project.tid === currentProjectId"
                  class="project-badge"
                >
                  {{ $t('editor.current') }}
                </span>
              </div>
              <div class="project-card-desc">
                {{ project.description || '-' }}
              </div>
              <div class="project-card-meta">
                <span>{{ $t('editor.version') }}: {{ project.version || '1.0.0' }}</span>
                <span>{{ $t('editor.updatedAt') }}: {{ formatDate(project.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button
            class="btn btn-cancel"
            @click="handleCancel"
          >
            {{ $t('editor.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="!selectedProject || selectedProject === currentProjectId"
            @click="handleConfirm"
          >
            {{ $t('editor.open') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { projectApi } from '@scada-editor/system';

interface ProjectItem {
  pid: string;
  tid: string;
  name: string;
  description?: string;
  version?: string;
  updatedAt?: string;
}

const props = defineProps<{
  visible: boolean;
  currentProjectId: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'selected', projectName: string): void;
}>();

const projects = ref<ProjectItem[]>([]);
const loading = ref(false);
const searchKeyword = ref('');
const selectedProject = ref<string | null>(null);

async function fetchProjects(keyword?: string) {
  loading.value = true;
  try {
    const res = await projectApi.list({ page: 1, pageSize: 50, keyword });
    projects.value = (res.data || []) as unknown as ProjectItem[];
  } catch (error) {
    console.error('[OpenProjectDialog] Failed to fetch projects:', error);
    projects.value = [];
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  fetchProjects(searchKeyword.value);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

function handleCancel() {
  emit('update:visible', false);
  selectedProject.value = null;
}

function handleConfirm() {
  if (selectedProject.value && selectedProject.value !== props.currentProjectId) {
    emit('selected', selectedProject.value);
    emit('update:visible', false);
    selectedProject.value = null;
  }
}

onMounted(() => {
  fetchProjects();
});
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog-container {
  background-color: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-large);
  width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.dialog-header h2 {
  margin: 0;
  font-size: 16px;
  color: var(--text);
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text);
}

.dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.search-bar {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--background);
  color: var(--text);
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: var(--primary);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-card {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.project-card:hover {
  border-color: var(--primary);
  background-color: rgba(59, 130, 246, 0.05);
}

.project-card.selected {
  border-color: var(--primary);
  background-color: rgba(59, 130, 246, 0.1);
}

.project-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.project-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
}

.project-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background-color: var(--primary);
  color: #fff;
}

.project-card-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.project-card-meta {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--text-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-cancel {
  background-color: var(--control-button-bg);
  color: var(--text);
}

.btn-cancel:hover {
  background-color: var(--control-button-hover);
}

.btn-primary {
  background-color: var(--primary);
  color: #fff;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>