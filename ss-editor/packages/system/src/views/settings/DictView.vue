<template>
  <div class="dict-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.nav.dict') }}
      </h1>
      <div class="header-actions">
        <button
          class="btn btn-secondary btn-sm"
          :disabled="loading"
          @click="reloadDicts"
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
            :class="{ spinning: loading }"
          >
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {{ $t('common.reload') }}
        </button>
      </div>
    </div>

    <div class="dict-body">
      <!-- ======================== 左侧分类树 ======================== -->
      <div class="dict-sidebar">
        <div class="sidebar-toolbar">
          <button
            class="btn btn-sm btn-secondary"
            @click="openCategoryDialog('create')"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line
                x1="12"
                y1="5"
                x2="12"
                y2="19"
              /><line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
              />
            </svg>
            {{ $t('system.dict.addCategory') }}
          </button>
        </div>

        <div class="category-list">
          <div
            v-for="cat in categories"
            :key="cat.category"
            class="dict-category-group"
          >
            <div
              class="category-header"
              @click="toggleCategory(cat.category)"
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
                class="folder-icon"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span class="category-name">{{ cat.category }}</span>
              <span class="category-count">{{ cat.tables.length }}</span>
              <span
                class="category-actions"
                @click.stop
              >
                <button
                  class="icon-btn"
                  :title="$t('system.dict.rename')"
                  @click="openCategoryDialog('rename', cat.category)"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  class="icon-btn icon-btn--danger"
                  :title="$t('system.dict.delete')"
                  @click="confirmDeleteCategory(cat.category)"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </span>
            </div>
            <div
              v-if="expandedCategories[cat.category]"
              class="category-tables"
            >
              <div
                v-for="table in cat.tables"
                :key="table.dictId"
                class="table-item"
                :class="{ 'table-item--active': selectedDictId === table.dictId }"
                @click="selectDict(table.dictId)"
              >
                <span class="table-name">{{ table.dictName }}</span>
                <span
                  class="table-actions"
                  @click.stop
                >
                  <button
                    class="icon-btn"
                    :title="$t('system.dict.edit')"
                    @click="openTableDialog('edit', cat.category, table)"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    class="icon-btn icon-btn--danger"
                    :title="$t('system.dict.delete')"
                    @click="confirmDeleteTable(cat.category, table)"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                  <button
                    class="icon-btn"
                    :title="$t('system.dict.export')"
                    @click="exportTable(cat.category, table)"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line
                        x1="12"
                        y1="3"
                        x2="12"
                        y2="15"
                      />
                    </svg>
                  </button>
                </span>
              </div>
              <div class="table-add-row">
                <button
                  class="btn-text"
                  @click="openTableDialog('create', cat.category)"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line
                      x1="12"
                      y1="5"
                      x2="12"
                      y2="19"
                    /><line
                      x1="5"
                      y1="12"
                      x2="19"
                      y2="12"
                    />
                  </svg>
                  {{ $t('system.dict.addTable') }}
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="categories.length === 0 && !loading && !error"
            class="sidebar-empty"
          >
            {{ $t('system.dict.noData') }}
          </div>
          <div
            v-if="error && !loading"
            class="sidebar-error"
          >
            {{ error }}
          </div>
        </div>
      </div>

      <!-- ======================== 右侧字典详情 ======================== -->
      <div class="dict-content">
        <div
          v-if="!selectedDict && !error"
          class="dict-empty"
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="empty-icon"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line
              x1="8"
              y1="7"
              x2="16"
              y2="7"
            /><line
              x1="8"
              y1="11"
              x2="14"
              y2="11"
            />
          </svg>
          <p>{{ $t('system.dict.selectHint') }}</p>
        </div>

        <div
          v-if="error"
          class="dict-error"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="error-icon"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            /><line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            /><line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </svg>
          <p>{{ error }}</p>
          <button
            class="btn btn-secondary btn-sm"
            @click="fetchCategories"
          >
            {{ $t('common.retry') }}
          </button>
        </div>

        <div
          v-else-if="selectedDict"
          class="dict-detail"
        >
          <div class="dict-info-bar">
            <div class="dict-info">
              <span class="dict-label">{{ selectedDict.dictName }}</span>
              <span class="dict-desc">{{ selectedDict.description }}</span>
              <span class="dict-meta">v{{ selectedDict.version }} · {{ selectedDict.items.length }} {{ $t('system.dict.items') }}</span>
            </div>
            <div class="dict-info-actions">
              <span class="dict-id-badge">{{ selectedDict.dictId }}</span>
              <button
                class="icon-btn"
                :title="$t('system.dict.edit')"
                @click="openTableDialog('edit', selectedCategoryName, selectedDict)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="dict-table-toolbar">
            <span class="toolbar-title">{{ $t('system.dict.items') }}</span>
            <div class="toolbar-actions">
              <button
                class="btn btn-sm btn-secondary"
                @click="openItemDialog('create')"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line
                    x1="12"
                    y1="5"
                    x2="12"
                    y2="19"
                  /><line
                    x1="5"
                    y1="12"
                    x2="19"
                    y2="12"
                  />
                </svg>
                {{ $t('system.dict.addItem') }}
              </button>
              <button
                class="btn btn-sm btn-secondary"
                @click="openImportDialog"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line
                    x1="12"
                    y1="15"
                    x2="12"
                    y2="3"
                  />
                </svg>
                {{ $t('system.dict.import') }}
              </button>
              <button
                class="btn btn-sm btn-secondary"
                @click="exportTable(selectedCategoryName, selectedDict)"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line
                    x1="12"
                    y1="3"
                    x2="12"
                    y2="15"
                  />
                </svg>
                {{ $t('system.dict.export') }}
              </button>
            </div>
          </div>

          <div class="dict-table-wrap">
            <table class="dict-table">
              <thead>
                <tr>
                  <th class="col-order">
                    #
                  </th>
                  <th class="col-value">
                    {{ $t('system.dict.colValue') }}
                  </th>
                  <th class="col-label">
                    {{ $t('system.dict.colLabel') }}
                  </th>
                  <th class="col-desc">
                    {{ $t('system.dict.colDescription') }}
                  </th>
                  <th class="col-actions">
                    {{ $t('system.dict.actions') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in selectedDict.items"
                  :key="item.value"
                >
                  <td class="col-order">
                    {{ item.sortOrder }}
                  </td>
                  <td class="col-value">
                    <code class="value-tag">{{ item.value }}</code>
                  </td>
                  <td class="col-label">
                    {{ item.label }}
                  </td>
                  <td class="col-desc">
                    {{ item.description }}
                  </td>
                  <td class="col-actions">
                    <button
                      class="icon-btn"
                      :title="$t('system.dict.edit')"
                      @click="openItemDialog('edit', item)"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      class="icon-btn icon-btn--danger"
                      :title="$t('system.dict.delete')"
                      @click="deleteItem(index)"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================== 分类弹窗（创建/重命名） ======================== -->
    <div
      v-if="showCategoryDialog"
      class="modal-overlay"
      @click.self="closeCategoryDialog"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>{{ categoryDialogMode === 'create' ? $t('system.dict.addCategory') : $t('system.dict.renameCategory') }}</h2>
          <button
            class="modal-close"
            @click="closeCategoryDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ $t('system.dict.categoryName') }}</label>
            <input
              v-model="categoryForm.name"
              type="text"
              class="form-input"
              :placeholder="$t('system.dict.categoryNamePlaceholder')"
              @keyup.enter="submitCategory"
            >
          </div>
          <div
            v-if="categoryError"
            class="form-error"
          >
            {{ categoryError }}
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeCategoryDialog"
          >
            {{ $t('system.templates.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="categorySubmitting"
            @click="submitCategory"
          >
            {{ categorySubmitting ? $t('system.templates.saving') : $t('system.templates.confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ======================== 字典表弹窗（创建/编辑元数据） ======================== -->
    <div
      v-if="showTableDialog"
      class="modal-overlay"
      @click.self="closeTableDialog"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>{{ tableDialogMode === 'create' ? $t('system.dict.addTable') : $t('system.dict.editTable') }}</h2>
          <button
            class="modal-close"
            @click="closeTableDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>{{ $t('system.dict.dictId') }} <span class="required">*</span></label>
              <input
                v-model="tableForm.dictId"
                type="text"
                class="form-input"
                :disabled="tableDialogMode === 'edit'"
                :placeholder="$t('system.dict.dictIdPlaceholder')"
              >
            </div>
            <div class="form-group">
              <label>{{ $t('system.dict.dictName') }} <span class="required">*</span></label>
              <input
                v-model="tableForm.dictName"
                type="text"
                class="form-input"
                :placeholder="$t('system.dict.dictNamePlaceholder')"
              >
            </div>
            <div class="form-group">
              <label>{{ $t('system.dict.version') }}</label>
              <input
                v-model="tableForm.version"
                type="text"
                class="form-input"
                placeholder="1.0"
              >
            </div>
            <div class="form-group">
              <label>{{ $t('system.dict.sortOrder') }}</label>
              <input
                v-model.number="tableForm.sortOrder"
                type="number"
                class="form-input"
                min="0"
              >
            </div>
            <div class="form-group full-width">
              <label>{{ $t('system.dict.description') }}</label>
              <input
                v-model="tableForm.description"
                type="text"
                class="form-input"
                :placeholder="$t('system.dict.descriptionPlaceholder')"
              >
            </div>
          </div>
          <div
            v-if="tableError"
            class="form-error"
          >
            {{ tableError }}
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeTableDialog"
          >
            {{ $t('system.templates.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="tableSubmitting"
            @click="submitTable"
          >
            {{ tableSubmitting ? $t('system.templates.saving') : $t('system.templates.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ======================== 字典条目编辑弹窗 ======================== -->
    <div
      v-if="showItemDialog"
      class="modal-overlay"
      @click.self="closeItemDialog"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>{{ itemDialogMode === 'create' ? $t('system.dict.addItem') : $t('system.dict.editItem') }}</h2>
          <button
            class="modal-close"
            @click="closeItemDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>{{ $t('system.dict.itemValue') }} <span class="required">*</span></label>
              <input
                v-model="itemForm.value"
                type="text"
                class="form-input"
                :placeholder="$t('system.dict.itemValuePlaceholder')"
              >
            </div>
            <div class="form-group">
              <label>{{ $t('system.dict.itemLabel') }} <span class="required">*</span></label>
              <input
                v-model="itemForm.label"
                type="text"
                class="form-input"
                :placeholder="$t('system.dict.itemLabelPlaceholder')"
              >
            </div>
            <div class="form-group">
              <label>{{ $t('system.dict.sortOrder') }}</label>
              <input
                v-model.number="itemForm.sortOrder"
                type="number"
                class="form-input"
                min="0"
              >
            </div>
            <div class="form-group full-width">
              <label>{{ $t('system.dict.itemDescription') }}</label>
              <input
                v-model="itemForm.description"
                type="text"
                class="form-input"
                :placeholder="$t('system.dict.itemDescriptionPlaceholder')"
              >
            </div>
          </div>
          <div
            v-if="itemError"
            class="form-error"
          >
            {{ itemError }}
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeItemDialog"
          >
            {{ $t('system.templates.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="itemSubmitting"
            @click="submitItem"
          >
            {{ itemSubmitting ? $t('system.templates.saving') : $t('system.templates.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ======================== 导入弹窗 ======================== -->
    <div
      v-if="showImportDialog"
      class="modal-overlay"
      @click.self="closeImportDialog"
    >
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>{{ $t('system.dict.importTable') }}</h2>
          <button
            class="modal-close"
            @click="closeImportDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ $t('system.dict.importJsonHint') }}</label>
            <textarea
              v-model="importJson"
              class="form-input form-textarea"
              rows="12"
              placeholder="{&quot;dictId&quot;:&quot;...&quot;,&quot;dictName&quot;:&quot;...&quot;,&quot;category&quot;:&quot;...&quot;,&quot;description&quot;:&quot;...&quot;,&quot;version&quot;:&quot;1.0&quot;,&quot;sortOrder&quot;:1,&quot;items&quot;:[...]}"
            />
          </div>
          <div
            v-if="importError"
            class="form-error"
          >
            {{ importError }}
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeImportDialog"
          >
            {{ $t('system.templates.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="importSubmitting"
            @click="submitImport"
          >
            {{ importSubmitting ? $t('system.templates.saving') : $t('system.dict.import') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { showConfirm } from '../../utils/messageBox';
import { dictApi, type DictCategory, type DictTable, type DictItem } from '../../api/modules/dict.api';

const { t, locale } = useI18n();
const loading = ref(false);
const error = ref<string | null>(null);
const categories = ref<DictCategory[]>([]);
const expandedCategories = ref<Record<string, boolean>>({});
const selectedDictId = ref<string | null>(null);

/** 选中的字典表 */
const selectedDict = computed(() => {
  if (!selectedDictId.value) return null;
  for (const cat of categories.value) {
    const found = cat.tables.find(t => t.dictId === selectedDictId.value);
    if (found) return found;
  }
  return null;
});

/** 选中字典表所属的分类名 */
const selectedCategoryName = computed(() => {
  if (!selectedDictId.value) return '';
  for (const cat of categories.value) {
    if (cat.tables.some(t => t.dictId === selectedDictId.value)) return cat.category;
  }
  return '';
});

// ==================== 数据加载 ====================

async function fetchCategories() {
  loading.value = true;
  error.value = null;
  try {
    const res = await dictApi.getCategories(locale.value);
    categories.value = res.data || [];
    if (categories.value.length > 0 && !expandedCategories.value[categories.value[0].category]) {
      expandedCategories.value[categories.value[0].category] = true;
    }
  } catch (e: any) {
    if (import.meta.env.DEV) console.error('加载字典失败:', e);
    error.value = e?.response?.data?.message || e?.message || t('system.dict.loadError');
  } finally {
    loading.value = false;
  }
}

async function reloadDicts() {
  loading.value = true;
  error.value = null;
  try {
    await dictApi.reload();
    await fetchCategories();
  } catch (e: any) {
    if (import.meta.env.DEV) console.error('重载字典失败:', e);
    error.value = e?.response?.data?.message || e?.message || t('system.dict.reloadError');
  } finally {
    loading.value = false;
  }
}

function toggleCategory(category: string) {
  expandedCategories.value[category] = !expandedCategories.value[category];
}

function selectDict(dictId: string) {
  selectedDictId.value = dictId;
}

// ==================== 分类管理 ====================

const showCategoryDialog = ref(false);
const categoryDialogMode = ref<'create' | 'rename'>('create');
const categoryForm = ref({ name: '' });
const categoryOriginalName = ref('');
const categoryError = ref('');
const categorySubmitting = ref(false);

function openCategoryDialog(mode: 'create' | 'rename', categoryName?: string) {
  categoryDialogMode.value = mode;
  categoryError.value = '';
  categorySubmitting.value = false;
  if (mode === 'rename' && categoryName) {
    categoryOriginalName.value = categoryName;
    categoryForm.value = { name: categoryName };
  } else {
    categoryOriginalName.value = '';
    categoryForm.value = { name: '' };
  }
  showCategoryDialog.value = true;
}

function closeCategoryDialog() {
  showCategoryDialog.value = false;
  categoryError.value = '';
}

async function submitCategory() {
  const name = categoryForm.value.name.trim();
  if (!name) {
    categoryError.value = t('system.dict.categoryNameRequired');
    return;
  }
  categorySubmitting.value = true;
  try {
    if (categoryDialogMode.value === 'create') {
      await dictApi.createCategory(locale.value, name);
    } else {
      await dictApi.renameCategory(locale.value, categoryOriginalName.value, name);
    }
    closeCategoryDialog();
    await fetchCategories();
  } catch (e: any) {
    categoryError.value = e?.response?.data?.message || e?.message || t('system.templates.saveFailed');
  } finally {
    categorySubmitting.value = false;
  }
}

async function confirmDeleteCategory(categoryName: string) {
  const confirmed = await showConfirm(t('system.dict.confirmDeleteCategory', { name: categoryName }));
  if (!confirmed) return;
  try {
    await dictApi.deleteCategory(locale.value, categoryName);
    if (selectedDictId.value && selectedCategoryName.value === categoryName) {
      selectedDictId.value = null;
    }
    await fetchCategories();
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || t('system.templates.saveFailed');
  }
}

// ==================== 字典表管理 ====================

const showTableDialog = ref(false);
const tableDialogMode = ref<'create' | 'edit'>('create');
const tableFormCategory = ref('');
const tableForm = ref<Omit<DictTable, 'items'>>({
  dictId: '',
  dictName: '',
  category: '',
  description: '',
  version: '1.0',
  sortOrder: 1,
});
const tableError = ref('');
const tableSubmitting = ref(false);

function openTableDialog(mode: 'create' | 'edit', category: string, table?: DictTable) {
  tableDialogMode.value = mode;
  tableFormCategory.value = category;
  tableError.value = '';
  tableSubmitting.value = false;
  if (mode === 'edit' && table) {
    tableForm.value = {
      dictId: table.dictId,
      dictName: table.dictName,
      category: table.category,
      description: table.description,
      version: table.version,
      sortOrder: table.sortOrder,
    };
  } else {
    tableForm.value = {
      dictId: '',
      dictName: '',
      category,
      description: '',
      version: '1.0',
      sortOrder: 1,
    };
  }
  showTableDialog.value = true;
}

function closeTableDialog() {
  showTableDialog.value = false;
  tableError.value = '';
}

async function submitTable() {
  if (!tableForm.value.dictId.trim()) {
    tableError.value = t('system.dict.dictIdRequired');
    return;
  }
  if (!tableForm.value.dictName.trim()) {
    tableError.value = t('system.dict.dictNameRequired');
    return;
  }
  tableSubmitting.value = true;
  try {
    if (tableDialogMode.value === 'create') {
      const newTable: DictTable = {
        ...tableForm.value,
        items: [],
      } as DictTable;
      await dictApi.createTable(locale.value, tableFormCategory.value, newTable);
    } else {
      await dictApi.updateTable(locale.value, tableFormCategory.value, tableForm.value.dictId, tableForm.value);
    }
    closeTableDialog();
    await fetchCategories();
  } catch (e: any) {
    tableError.value = e?.response?.data?.message || e?.message || t('system.templates.saveFailed');
  } finally {
    tableSubmitting.value = false;
  }
}

async function confirmDeleteTable(category: string, table: DictTable) {
  const confirmed = await showConfirm(t('system.dict.confirmDeleteTable', { name: table.dictName }));
  if (!confirmed) return;
  try {
    await dictApi.deleteTable(locale.value, category, table.dictId);
    if (selectedDictId.value === table.dictId) {
      selectedDictId.value = null;
    }
    await fetchCategories();
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || t('system.templates.saveFailed');
  }
}

// ==================== 导出 ====================

async function exportTable(category: string, table: DictTable) {
  try {
    const res = await dictApi.exportTable(table.dictId, locale.value, category);
    const data = JSON.stringify(res.data, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.dictId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || t('system.templates.saveFailed');
  }
}

// ==================== 字典条目管理 ====================

const showItemDialog = ref(false);
const itemDialogMode = ref<'create' | 'edit'>('create');
const editingItemIndex = ref(-1);
const itemForm = ref<DictItem>({
  value: '',
  label: '',
  sortOrder: 1,
  description: '',
});
const itemError = ref('');
const itemSubmitting = ref(false);

function openItemDialog(mode: 'create' | 'edit', item?: DictItem) {
  itemDialogMode.value = mode;
  itemError.value = '';
  itemSubmitting.value = false;
  if (mode === 'edit' && item) {
    editingItemIndex.value = selectedDict.value?.items.indexOf(item) ?? -1;
    itemForm.value = { ...item };
  } else {
    editingItemIndex.value = -1;
    const maxOrder = selectedDict.value?.items.reduce((max, it) => Math.max(max, it.sortOrder), 0) || 0;
    itemForm.value = { value: '', label: '', sortOrder: maxOrder + 1, description: '' };
  }
  showItemDialog.value = true;
}

function closeItemDialog() {
  showItemDialog.value = false;
  itemError.value = '';
}

async function submitItem() {
  if (!itemForm.value.value.trim()) {
    itemError.value = t('system.dict.itemValueRequired');
    return;
  }
  if (!itemForm.value.label.trim()) {
    itemError.value = t('system.dict.itemLabelRequired');
    return;
  }
  itemSubmitting.value = true;
  try {
    const dict = selectedDict.value;
    if (!dict) return;
    const items = [...dict.items];
    if (itemDialogMode.value === 'edit' && editingItemIndex.value >= 0) {
      items[editingItemIndex.value] = { ...itemForm.value };
    } else {
      items.push({ ...itemForm.value });
    }
    items.sort((a, b) => a.sortOrder - b.sortOrder);
    await dictApi.updateTable(locale.value, selectedCategoryName.value, dict.dictId, { items } as any);
    closeItemDialog();
    // 更新本地缓存
    if (selectedDict.value) {
      selectedDict.value.items = items;
    }
  } catch (e: any) {
    itemError.value = e?.response?.data?.message || e?.message || t('system.templates.saveFailed');
  } finally {
    itemSubmitting.value = false;
  }
}

async function deleteItem(index: number) {
  const dict = selectedDict.value;
  if (!dict) return;
  const confirmed = await showConfirm(t('system.dict.confirmDeleteItem'));
  if (!confirmed) return;
  try {
    const items = dict.items.filter((_, i) => i !== index);
    await dictApi.updateTable(locale.value, selectedCategoryName.value, dict.dictId, { items } as any);
    dict.items = items;
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || t('system.templates.saveFailed');
  }
}

// ==================== 导入 ====================

const showImportDialog = ref(false);
const importJson = ref('');
const importError = ref('');
const importSubmitting = ref(false);

function openImportDialog() {
  importJson.value = '';
  importError.value = '';
  importSubmitting.value = false;
  showImportDialog.value = true;
}

function closeImportDialog() {
  showImportDialog.value = false;
  importError.value = '';
}

async function submitImport() {
  if (!importJson.value.trim()) {
    importError.value = t('system.dict.importJsonRequired');
    return;
  }
  importSubmitting.value = true;
  try {
    const parsed = JSON.parse(importJson.value);
    if (!parsed.dictId || !parsed.dictName) {
      importError.value = t('system.dict.importInvalidFormat');
      return;
    }
    const dictId = parsed.dictId;
    const category = selectedCategoryName.value;
    parsed.category = category;
    if (!Array.isArray(parsed.items)) {
      parsed.items = [];
    }
    await dictApi.importTable(locale.value, category, dictId, parsed);
    closeImportDialog();
    await fetchCategories();
    selectedDictId.value = dictId;
  } catch (e: any) {
    if (e instanceof SyntaxError) {
      importError.value = t('system.dict.importInvalidJson');
    } else {
      importError.value = e?.response?.data?.message || e?.message || t('system.templates.saveFailed');
    }
  } finally {
    importSubmitting.value = false;
  }
}

onMounted(() => {
  fetchCategories();
});
</script>

<style scoped>
.dict-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ===== 按钮 ===== */
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
.btn-secondary { background: var(--border); color: var(--text); border: 1px solid transparent; }
.btn-secondary:hover:not(:disabled) { background: var(--border); }
.btn-sm { padding: 5px 10px; font-size: 13px; }

.spinning { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.dict-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ===== 左侧分类树 ===== */
.dict-sidebar {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
}

.sidebar-toolbar {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.category-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.dict-category-group {
  margin-bottom: 2px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  transition: background 0.15s;
  user-select: none;
}
.category-header:hover { background: rgba(128,128,128,0.06); }
.category-header:hover .category-actions { opacity: 1; }

.folder-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.category-name {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--background);
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.category-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.category-tables {
  padding-left: 4px;
}

.table-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px 5px 32px;
  font-size: 12.5px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 4px;
  margin: 0 6px;
  transition: all 0.15s;
}
.table-item:hover { background: rgba(128,128,128,0.06); color: var(--text); }
.table-item:hover .table-actions { opacity: 1; }
.table-item--active {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  font-weight: 500;
}

.table-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.table-add-row {
  padding: 2px 12px 2px 32px;
  margin: 0 6px;
}

.btn-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
  width: 100%;
}
.btn-text:hover { background: rgba(128,128,128,0.06); color: var(--primary); }

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}
.icon-btn:hover { background: rgba(128,128,128,0.1); color: var(--text); }
.icon-btn--danger:hover { background: color-mix(in srgb, var(--status-error) 10%, transparent); color: var(--status-error); }

.sidebar-empty,
.sidebar-error {
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
}
.sidebar-empty { color: var(--text-secondary); }
.sidebar-error { color: var(--status-error); }

/* ===== 右侧内容 ===== */
.dict-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.dict-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-secondary);
  gap: 12px;
}

.dict-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--status-error);
  gap: 12px;
}

.error-icon { opacity: 0.5; }
.empty-icon { opacity: 0.3; }

.dict-info-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.dict-info { display: flex; flex-direction: column; gap: 4px; }
.dict-label { font-size: 18px; font-weight: 600; color: var(--text); }
.dict-desc { font-size: 13px; color: var(--text-secondary); }
.dict-meta { font-size: 12px; color: var(--text-secondary); }

.dict-info-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.dict-id-badge {
  padding: 3px 10px;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  white-space: nowrap;
}

/* ===== 字典表工具栏 ===== */
.dict-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.toolbar-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

/* ===== 字典表 ===== */
.dict-table-wrap {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.dict-table {
  width: 100%;
  border-collapse: collapse;
}

.dict-table th {
  text-align: left;
  padding: 10px 14px;
  background: var(--background);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.dict-table td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-size: 13px;
}

.dict-table tbody tr:last-child td { border-bottom: none; }
.dict-table tbody tr:hover td { background: rgba(128,128,128,0.03); }

.col-order { width: 50px; text-align: center; color: var(--text-secondary); }
.col-value { width: 160px; }
.col-label { width: 200px; }
.col-desc { }
.col-actions { width: 80px; text-align: center; white-space: nowrap; }
.col-actions .icon-btn { width: 24px; height: 24px; }

.value-tag {
  padding: 2px 6px;
  background: var(--background);
  border-radius: 3px;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--text);
}

/* ===== 弹窗 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--surface);
  border-radius: 10px;
  width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
}

.modal-lg { width: 680px; }
.modal-sm { width: 420px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  border-radius: 10px 10px 0 0;
}
.modal-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.modal-close {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--text-secondary);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.15s;
  padding: 0;
  line-height: 1;
}
.modal-close:hover { color: var(--status-error); background: color-mix(in srgb, var(--status-error) 8%, transparent); }

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  border-radius: 0 0 10px 10px;
}

/* ===== 表单 ===== */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-grid .full-width {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.required { color: var(--status-error); }

.form-input {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent); }
.form-input:disabled { opacity: 0.5; }
.form-input::placeholder { color: var(--text-secondary); opacity: 0.5; }

.form-textarea {
  resize: vertical;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  min-height: 200px;
}

.form-error {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--status-error) 8%, transparent);
  color: var(--status-error);
  font-size: 12px;
}
</style>