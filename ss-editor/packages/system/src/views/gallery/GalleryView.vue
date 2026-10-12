<template>
  <div class="gallery-page">
    <!-- ========== 页头 ========== -->
    <div class="page-header">
      <h1 class="page-title">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="header-icon"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        {{ $t('system.nav.gallery') }}
      </h1>
      <div class="header-actions">
        <label class="field-label">{{ $t('system.gallery.selectFormat') }}</label>
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
        <button
          v-if="isAdmin"
          class="btn btn-sm btn-primary"
          @click="openUploadDialog"
        >
          {{ $t('system.gallery.upload') }}
        </button>
      </div>
    </div>

    <!-- ========== 主体 ========== -->
    <div class="gallery-body">
      <!-- 左侧分类 -->
      <aside class="gallery-sidebar">
        <div class="sidebar-header">
          {{ $t('system.gallery.selectCategory') }}
        </div>
        <div
          v-if="loadingCategories"
          class="empty-hint"
        >
          {{ $t('common.loading') }}
        </div>
        <div
          v-else-if="categories.length === 0"
          class="empty-hint"
        >
          {{ $t('system.gallery.noCategory') }}
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

      <!-- 右侧图片网格 -->
      <main class="gallery-content">
        <div
          v-if="loadingImages"
          class="content-empty"
        >
          {{ $t('common.loading') }}
        </div>
        <div
          v-else-if="!selectedCategory"
          class="content-empty"
        >
          {{ $t('system.gallery.selectCategory') }}
        </div>
        <div
          v-else-if="images.length === 0"
          class="content-empty"
        >
          {{ $t('system.gallery.noImage') }}
        </div>
        <div
          v-else
          class="image-grid"
        >
          <figure
            v-for="img in images"
            :key="img.fileName"
            class="image-card"
          >
            <img
              :src="img.url"
              :alt="img.fileName"
              class="image-thumb"
              loading="lazy"
            >
            <figcaption class="image-meta">
              <span
                class="image-name"
                :title="img.fileName"
              >{{ img.fileName }}</span>
              <span class="image-size">{{ formatSize(img.size) }}</span>
              <button
                v-if="isAdmin"
                class="btn-icon btn-danger"
                :title="$t('system.gallery.delete')"
                @click="onDeleteImage(img.fileName)"
              >
                ✕
              </button>
            </figcaption>
          </figure>
        </div>
      </main>
    </div>

    <!-- ========== 上传对话框 ========== -->
    <div
      v-if="uploadDialogVisible"
      class="dialog-overlay"
      @click.self="uploadDialogVisible = false"
    >
      <div class="dialog">
        <h3>{{ $t('system.gallery.upload') }}</h3>
        <label class="dialog-label">{{ $t('system.gallery.selectCategory') }}</label>
        <input
          v-model="uploadCategory"
          class="dialog-input"
          :placeholder="$t('system.gallery.newCategory')"
        >
        <input
          ref="uploadFileInput"
          type="file"
          accept="image/*"
          class="file-input"
          @change="onImageSelected"
        >
        <div class="dialog-actions">
          <button
            class="btn btn-sm btn-secondary"
            @click="uploadDialogVisible = false"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { galleryApi } from '../../api/modules/gallery.api';
import type { GalleryFormat, GalleryCategory, GalleryImage } from '../../api/modules/gallery.api';
import { usePermission } from '../../composables/usePermission';
import { showSuccess, showError, showConfirm } from '../../utils/messageBox';
import { useI18n } from '@scada-editor/core';

const { t } = useI18n();
const { isAdmin } = usePermission();

const formats = ref<GalleryFormat[]>([]);
const selectedFormat = ref('');
const categories = ref<GalleryCategory[]>([]);
const selectedCategory = ref('');
const images = ref<GalleryImage[]>([]);

const loadingCategories = ref(false);
const loadingImages = ref(false);

const uploadDialogVisible = ref(false);
const uploadCategory = ref('');
const uploadFileInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  await loadFormats();
});

async function loadFormats() {
  try {
    const res = await galleryApi.listFormats();
    const data = (res as any)?.data ?? (res as any);
    formats.value = Array.isArray(data) ? data : [];
    if (formats.value.length > 0 && !selectedFormat.value) {
      selectedFormat.value = formats.value[0].id;
      await loadCategories();
    }
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(e?.message || t('system.gallery.loadFailed'));
    }
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
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(e?.message || t('system.gallery.loadFailed'));
    }
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
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(e?.message || t('system.gallery.loadFailed'));
    }
    images.value = [];
  } finally {
    loadingImages.value = false;
  }
}

function openUploadDialog() {
  uploadCategory.value = selectedCategory.value || '';
  uploadDialogVisible.value = true;
}

async function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const category = uploadCategory.value.trim() || selectedCategory.value;
  if (!category) {
    showError(t('system.gallery.selectCategory'));
    return;
  }
  try {
    const base64 = await fileToBase64(file);
    await galleryApi.uploadImage({
      format: selectedFormat.value,
      category,
      fileName: file.name,
      base64,
    });
    uploadDialogVisible.value = false;
    showSuccess(t('system.gallery.uploadSuccess'));
    // 若上传到新分类，刷新分类列表
    await loadCategories();
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(e?.message || t('system.gallery.uploadFailed'));
    }
  } finally {
    input.value = '';
  }
}

async function onDeleteImage(fileName: string) {
  const ok = await showConfirm(t('system.gallery.deleteConfirm'));
  if (!ok) return;
  try {
    await galleryApi.deleteImage(selectedFormat.value, selectedCategory.value, fileName);
    showSuccess(t('system.gallery.deleteSuccess'));
    await loadImages();
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(e?.message || t('system.gallery.loadFailed'));
    }
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
</script>

<style scoped>
.gallery-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* ===== 页头 ===== */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.header-icon {
  color: var(--primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.field-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
}

.select:focus {
  outline: none;
  border-color: var(--primary);
}

/* ===== 按钮 ===== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-sm {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
}

.btn-primary {
  background: var(--primary);
  color: var(--text);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-secondary {
  background: var(--surface-alt, rgba(255, 255, 255, 0.08));
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-icon {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-danger:hover {
  color: var(--status-error);
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
}

/* ===== 主体 ===== */
.gallery-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.gallery-sidebar {
  width: 240px;
  min-width: 200px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.category-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  transition: background 0.1s;
}

.category-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.category-item.active {
  background: rgba(var(--primary-rgb, 26, 115, 232), 0.12);
  color: var(--primary);
}

.category-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--surface-alt, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  padding: 0 8px;
}

.empty-hint {
  padding: 20px 14px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

/* ===== 内容区 ===== */
.gallery-content {
  flex: 1;
  overflow-y: auto;
  background: var(--background);
  min-width: 0;
  padding: 16px;
}

.content-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}

.image-card {
  margin: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.image-thumb {
  width: 100%;
  height: 120px;
  object-fit: contain;
  background: color-mix(in srgb, var(--background) 60%, transparent);
  padding: 8px;
}

.image-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
}

.image-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}

.image-size {
  font-size: 11px;
  opacity: 0.7;
}

/* ===== 上传对话框 ===== */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  min-width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.dialog h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: var(--text);
}

.dialog-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.dialog-input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-alt, rgba(255, 255, 255, 0.04));
  color: var(--text);
  font-size: 13px;
  margin-bottom: 12px;
}

.file-input {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
