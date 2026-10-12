<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="state-image-picker-overlay"
      @click.self="close"
    >
      <div class="state-image-picker-dialog">
        <div class="dialog-header">
          <span class="dialog-title">{{ $t('stateVariable.imagePicker.title') }}</span>
          <button
            class="dialog-close"
            type="button"
            @click="close"
          >×</button>
        </div>

        <div class="source-tabs">
          <button
            v-for="source in sources"
            :key="source.value"
            type="button"
            class="source-tab"
            :class="{ active: activeSource === source.value }"
            @click="switchSource(source.value)"
          >
            {{ source.label }}
          </button>
        </div>

        <!-- 图库 -->
        <template v-if="activeSource === 'gallery'">
          <div class="gallery-toolbar">
            <select
              v-model="selectedFormat"
              class="select"
              @change="onFormatChange"
            >
              <option
                v-for="f in formats"
                :key="f.id"
                :value="f.id"
              >
                {{ f.name }} ({{ f.imageCount }})
              </option>
            </select>
          </div>

          <div class="gallery-body">
            <aside class="category-sidebar">
              <div
                v-if="loadingCategories"
                class="status-hint"
              >
                {{ $t('stateVariable.imagePicker.loading') }}
              </div>
              <div
                v-else
                class="category-list"
              >
                <div
                  v-for="c in categories"
                  :key="c.id"
                  class="category-item"
                  :class="{ active: c.id === selectedCategory }"
                  @click="selectCategory(c.id)"
                >
                  <span class="category-name">{{ c.name }}</span>
                  <span class="category-count">{{ c.imageCount }}</span>
                </div>
              </div>
            </aside>

            <main class="image-content">
              <div
                v-if="loadingImages"
                class="status-hint"
              >
                {{ $t('stateVariable.imagePicker.loading') }}
              </div>
              <div
                v-else-if="!selectedCategory"
                class="status-hint"
              >
                {{ $t('stateVariable.imagePicker.selectCategory') }}
              </div>
              <div
                v-else-if="images.length === 0"
                class="status-hint"
              >
                {{ $t('stateVariable.imagePicker.empty') }}
              </div>
              <div
                v-else
                class="image-grid"
              >
                <figure
                  v-for="img in images"
                  :key="img.fileName"
                  class="image-card"
                  @click="selectImage(img.url)"
                >
                  <img
                    :src="img.url"
                    :alt="img.fileName"
                    class="image-thumb"
                    loading="lazy"
                  >
                  <figcaption class="image-name">{{ img.fileName }}</figcaption>
                </figure>
              </div>
            </main>
          </div>
        </template>

        <!-- URL -->
        <template v-else-if="activeSource === 'url'">
          <div class="url-row">
            <input
              v-model="urlInput"
              type="text"
              class="url-input"
              :placeholder="$t('stateVariable.imagePicker.urlPlaceholder')"
            >
            <button
              type="button"
              class="btn btn-primary"
              :disabled="!urlInput.trim()"
              @click="confirmUrl"
            >
              {{ $t('stateVariable.imagePicker.confirm') }}
            </button>
          </div>
        </template>

        <!-- 上传 -->
        <template v-else>
          <div class="upload-row">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="file-input"
              @change="handleUpload"
            >
            <span class="upload-hint">{{ $t('stateVariable.imagePicker.uploadHint') }}</span>
          </div>
        </template>

        <div class="dialog-actions">
          <button
            type="button"
            class="btn"
            @click="close"
          >
            {{ $t('stateVariable.imagePicker.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { i18n } from '@scada-editor/core';
import { galleryApi } from '@scada-editor/system';

type ImageSource = 'gallery' | 'url' | 'upload';

interface FormatEntry {
  id: string;
  name: string;
  imageCount: number;
}

interface CategoryEntry {
  id: string;
  name: string;
  imageCount: number;
}

interface ImageEntry {
  fileName: string;
  url: string;
  size: number;
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'select', image: string): void;
}>();

const { t } = i18n.global;

const sources = computed(() => [
  { value: 'gallery' as ImageSource, label: t('stateVariable.imagePicker.sourceGallery') },
  { value: 'url' as ImageSource, label: t('stateVariable.imagePicker.sourceUrl') },
  { value: 'upload' as ImageSource, label: t('stateVariable.imagePicker.sourceUpload') },
]);

const activeSource = ref<ImageSource>('gallery');
const urlInput = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const formats = ref<FormatEntry[]>([]);
const categories = ref<CategoryEntry[]>([]);
const images = ref<ImageEntry[]>([]);
const selectedFormat = ref('');
const selectedCategory = ref('');
const loadingCategories = ref(false);
const loadingImages = ref(false);

function close() {
  emit('update:visible', false);
}

function switchSource(source: ImageSource) {
  activeSource.value = source;
}

function selectImage(url: string) {
  if (!url) return;
  emit('select', url);
  close();
}

function confirmUrl() {
  const url = urlInput.value.trim();
  if (!url) return;
  emit('select', url);
  urlInput.value = '';
  close();
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    console.error('StateImagePicker - file size exceeds 10MB');
    input.value = '';
    return;
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    emit('select', dataUrl);
    close();
  } catch (e) {
    console.error('StateImagePicker - failed to read file:', e);
  } finally {
    input.value = '';
  }
}

async function loadFormats() {
  try {
    const res = await galleryApi.listFormats();
    const data = (res as any)?.data ?? (res as any);
    formats.value = Array.isArray(data) ? data : [];
    if (formats.value.length > 0 && !selectedFormat.value) {
      selectedFormat.value = formats.value[0].id;
      await loadCategories();
    }
  } catch (e) {
    console.error('StateImagePicker - failed to load formats:', e);
    formats.value = [];
  }
}

async function onFormatChange() {
  selectedCategory.value = '';
  images.value = [];
  await loadCategories();
}

async function loadCategories() {
  if (!selectedFormat.value) return;
  loadingCategories.value = true;
  try {
    const res = await galleryApi.listCategories(selectedFormat.value);
    const data = (res as any)?.data ?? (res as any);
    categories.value = Array.isArray(data) ? data : [];
    if (categories.value.length > 0) {
      selectedCategory.value = categories.value[0].id;
      await loadImages();
    } else {
      images.value = [];
    }
  } catch (e) {
    console.error('StateImagePicker - failed to load categories:', e);
    categories.value = [];
  } finally {
    loadingCategories.value = false;
  }
}

async function selectCategory(id: string) {
  selectedCategory.value = id;
  await loadImages();
}

async function loadImages() {
  if (!selectedFormat.value || !selectedCategory.value) return;
  loadingImages.value = true;
  try {
    const res = await galleryApi.listImages(selectedFormat.value, selectedCategory.value);
    const data = (res as any)?.data ?? (res as any);
    images.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('StateImagePicker - failed to load images:', e);
    images.value = [];
  } finally {
    loadingImages.value = false;
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      activeSource.value = 'gallery';
      urlInput.value = '';
      if (formats.value.length === 0) {
        loadFormats();
      }
    }
  },
);

onMounted(() => {
  if (props.visible && formats.value.length === 0) {
    loadFormats();
  }
});
</script>

<style scoped>
.state-image-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 3100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.state-image-picker-dialog {
  width: 720px;
  max-width: 92vw;
  max-height: 76vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-modal);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-title {
  font-size: 14px;
  font-weight: 600;
}

.dialog-close {
  width: 24px;
  height: 24px;
  line-height: 1;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 18px;
}

.dialog-close:hover {
  background: var(--background);
  color: var(--text);
}

.source-tabs {
  display: flex;
  gap: 6px;
}

.source-tab {
  padding: 5px 12px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}

.source-tab.active {
  border-color: var(--primary);
  color: var(--primary);
}

.select,
.url-input {
  height: 32px;
  padding: 0 8px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  box-sizing: border-box;
}

.gallery-toolbar {
  display: flex;
  gap: 8px;
}

.gallery-body {
  display: flex;
  gap: 10px;
  min-height: 240px;
  max-height: 46vh;
  overflow: hidden;
}

.category-sidebar {
  width: 200px;
  flex-shrink: 0;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.category-item:hover {
  background: var(--background);
}

.category-item.active {
  background: rgba(33, 150, 243, 0.12);
  color: var(--primary);
}

.category-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 11px;
  color: var(--text-tertiary);
}

.image-content {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.image-card {
  margin: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: var(--surface);
}

.image-card:hover {
  border-color: var(--primary);
}

.image-thumb {
  width: 100%;
  height: 84px;
  object-fit: contain;
  background: var(--background);
}

.image-name {
  padding: 4px 6px;
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.url-row,
.upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.url-input {
  flex: 1;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.file-input {
  font-size: 13px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  background: var(--surface);
  color: var(--text);
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
