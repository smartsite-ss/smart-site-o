<template>
  <div
    class="modal-overlay"
    @click.self="$emit('close')"
  >
    <div class="modal tag-editor-modal">
      <div class="modal-header">
        <h2>{{ $t('system.deviceTemplate.tags.editTitle') }}</h2>
        <button
          class="modal-close"
          @click="$emit('close')"
        >
          &times;
        </button>
      </div>
      <div class="modal-body">
        <div class="tag-editor-body">
          <div
            v-if="loading"
            class="loading-state"
          >
            {{ $t('system.templates.loading') }}
          </div>
          <div v-else>
            <div class="template-info">
              <span class="info-label">{{ $t('system.deviceTemplate.tags.templateName') }}</span>
              <span class="info-value">{{ templateName }}</span>
            </div>

            <div class="current-tags">
              <span class="tags-label">{{ $t('system.deviceTemplate.tags.currentTags') }}</span>
              <div class="tags-list">
                <span
                  v-for="tag in editableTags"
                  :key="tag"
                  class="tag-chip"
                >
                  {{ tag }}
                  <button
                    class="tag-remove"
                    @click="removeTag(tag)"
                  >&times;</button>
                </span>
                <span
                  v-if="editableTags.length === 0"
                  class="no-tags"
                >{{ $t('system.deviceTemplate.tags.noTags') }}</span>
              </div>
            </div>

            <div class="add-tag-section">
              <div class="add-tag-row">
                <input
                  ref="tagInputRef"
                  v-model="newTag"
                  type="text"
                  class="form-input tag-input"
                  :placeholder="$t('system.deviceTemplate.tags.addTagPlaceholder')"
                  @keydown.enter.prevent="addTag"
                  @keydown.esc="hideSuggestions"
                  @input="onTagInput"
                  @focus="onTagInput"
                >
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="!newTag.trim()"
                  @click="addTag"
                >
                  {{ $t('system.deviceTemplate.tags.add') }}
                </button>
              </div>

              <div
                v-if="showSuggestions && filteredSuggestions.length > 0"
                class="suggestions-dropdown"
              >
                <div
                  v-for="suggestion in filteredSuggestions"
                  :key="suggestion"
                  class="suggestion-item"
                  @click="selectSuggestion(suggestion)"
                >
                  {{ suggestion }}
                </div>
              </div>

              <div
                v-if="allTags.length > 0"
                class="suggested-tags"
              >
                <span class="suggested-label">{{ $t('system.deviceTemplate.tags.suggestedTags') }}</span>
                <div class="suggested-list">
                  <span
                    v-for="tag in suggestedTags"
                    :key="tag"
                    class="suggested-chip"
                    @click="addTagFromSuggestion(tag)"
                  >
                    + {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="error"
          class="alert alert-error"
        >
          {{ error }}
        </div>
      </div>
      <div class="modal-footer">
        <button
          class="btn btn-secondary"
          @click="$emit('close')"
        >
          {{ $t('system.templates.cancel') }}
        </button>
        <button
          class="btn btn-primary"
          :disabled="saving || !hasChanges"
          @click="saveTags"
        >
          {{ saving ? $t('system.templates.saving') : $t('system.deviceTemplate.tags.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useI18n } from '@scada-editor/core';
import { useTemplateStore } from '../../stores/template.store';

const props = defineProps<{
  templateId: string;
  templateName: string;
  currentTags: string[];
  allAvailableTags: string[];
  projectId: string;
}>();

const emit = defineEmits<{
  close: [];
  saved: [tags: string[]];
}>();

const { t } = useI18n();
const templateStore = useTemplateStore();

const editableTags = ref<string[]>([...props.currentTags]);
const newTag = ref('');
const showSuggestions = ref(false);
const saving = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const tagInputRef = ref<HTMLInputElement | null>(null);

const hasChanges = computed(() => {
  if (props.currentTags.length !== editableTags.value.length) return true;
  const sorted = [...editableTags.value].sort();
  const origSorted = [...props.currentTags].sort();
  return sorted.some((t, i) => t !== origSorted[i]);
});

const filteredSuggestions = computed(() => {
  if (!newTag.value.trim()) return [];
  const lower = newTag.value.toLowerCase();
  return props.allAvailableTags.filter(
    (t) => t.toLowerCase().includes(lower) && !editableTags.value.includes(t),
  ).slice(0, 8);
});

const suggestedTags = computed(() => {
  return props.allAvailableTags
    .filter((t) => !editableTags.value.includes(t))
    .slice(0, 10);
});

const allTags = computed(() => props.allAvailableTags);

function addTag() {
  const trimmed = newTag.value.trim();
  if (!trimmed) return;
  if (editableTags.value.includes(trimmed)) {
    newTag.value = '';
    hideSuggestions();
    return;
  }
  editableTags.value = [...editableTags.value, trimmed];
  newTag.value = '';
  hideSuggestions();
  nextTick(() => tagInputRef.value?.focus());
}

function removeTag(tag: string) {
  editableTags.value = editableTags.value.filter((t) => t !== tag);
}

function onTagInput() {
  showSuggestions.value = newTag.value.trim().length > 0;
}

function hideSuggestions() {
  showSuggestions.value = false;
}

function selectSuggestion(tag: string) {
  newTag.value = '';
  if (!editableTags.value.includes(tag)) {
    editableTags.value = [...editableTags.value, tag];
  }
  hideSuggestions();
  nextTick(() => tagInputRef.value?.focus());
}

function addTagFromSuggestion(tag: string) {
  if (!editableTags.value.includes(tag)) {
    editableTags.value = [...editableTags.value, tag];
  }
}

async function saveTags() {
  if (!props.projectId || !props.templateId) return;
  saving.value = true;
  error.value = null;
  try {
    await templateStore.updateTemplate(props.templateId, {
      tags: editableTags.value,
    });
    emit('saved', editableTags.value);
    emit('close');
  } catch (e: any) {
    error.value = e?.response?.data?.message || t('system.deviceTemplate.tags.saveFailed');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
}
.modal { background: var(--surface); border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.tag-editor-modal { width: 520px; max-height: 80vh; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-header h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text); }
.modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary); padding: 0; line-height: 1; }
.modal-close:hover { color: var(--text); }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--border); }

.tag-editor-body { min-height: 180px; }
.template-info { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 8px 12px; background: rgba(26,115,232,0.06); border-radius: 6px; }
.info-label { font-size: 12px; color: var(--text-secondary); }
.info-value { font-size: 13px; font-weight: 500; color: var(--text); }

.current-tags { margin-bottom: 20px; }
.tags-label { display: block; font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
.tags-list { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 16px; background: rgba(26,115,232,0.1);
  color: var(--primary); font-size: 12px; font-weight: 500;
  border: 1px solid rgba(26,115,232,0.2);
}
.tag-remove {
  background: none; border: none; color: var(--primary); cursor: pointer;
  font-size: 14px; padding: 0; line-height: 1; opacity: 0.6;
}
.tag-remove:hover { opacity: 1; }
.no-tags { font-size: 12px; color: var(--text-secondary); font-style: italic; }

.add-tag-section { position: relative; }
.add-tag-row { display: flex; gap: 8px; }
.tag-input { flex: 1; }
.form-input {
  padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--background); color: var(--text); font-size: 13px; outline: none;
}
.form-input:focus { border-color: var(--primary); }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--border); color: var(--text); }
.btn-secondary:hover { background: var(--text-secondary); color: #fff; }
.btn-sm { padding: 6px 12px; font-size: 12px; }

.suggestions-dropdown {
  position: absolute; top: 100%; left: 0; right: 0;
  background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
  max-height: 160px; overflow-y: auto; z-index: 10; margin-top: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.suggestion-item {
  padding: 6px 12px; font-size: 13px; color: var(--text); cursor: pointer;
}
.suggestion-item:hover { background: rgba(26,115,232,0.08); color: var(--primary); }

.suggested-tags { margin-top: 14px; }
.suggested-label { font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 6px; }
.suggested-list { display: flex; flex-wrap: wrap; gap: 6px; }
.suggested-chip {
  display: inline-flex; padding: 3px 10px; border-radius: 14px;
  background: var(--background); color: var(--text-secondary); font-size: 12px;
  cursor: pointer; border: 1px dashed var(--border); transition: all 0.15s;
}
.suggested-chip:hover { border-color: var(--primary); color: var(--primary); background: rgba(26,115,232,0.06); }

.alert { padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-top: 12px; }
.alert-error { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
.loading-state { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); }
</style>