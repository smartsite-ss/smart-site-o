<template>
  <div class="tag-selector">
    <div class="tag-selector-search">
      <div class="search-input-wrapper">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle
            cx="11"
            cy="11"
            r="8"
          />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          v-model="searchQuery"
          :placeholder="$t('system.tags.searchPlaceholder')"
          class="search-input"
          @input="onSearch(($event.target as HTMLInputElement).value)"
        >
        <button
          v-if="searchQuery"
          class="clear-btn"
          @click="clearSearch"
        >
          ✕
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="tag-selector-loading"
    >
      {{ $t('system.tags.searching') }}
    </div>

    <div
      v-else-if="filteredTags.length === 0 && searchQuery"
      class="tag-selector-empty"
    >
      {{ $t('system.tags.noMatch') }}
    </div>

    <div
      v-else-if="filteredTags.length === 0 && !searchQuery"
      class="tag-selector-empty"
    >
      {{ $t('system.tags.noTags') }}
    </div>

    <div
      v-else
      class="tag-selector-list"
    >
      <div
        v-for="tag in filteredTags"
        :key="tag.id"
        class="tag-selector-item"
        :class="{
          'tag-selector-item--selected': selectedTagId === tag.id,
          'tag-selector-item--bad-quality': tag.quality === 'bad' || tag.quality === 'disconnected',
          'tag-selector-item--stale': tag.quality === 'stale' || tag.quality === 'uncertain',
        }"
        @click="selectTag(tag)"
      >
        <div class="tag-selector-item-info">
          <div class="tag-selector-item-name">
            {{ tag.name }}
          </div>
          <div class="tag-selector-item-address">
            {{ tag.address }}
          </div>
          <div
            v-if="tag.unit"
            class="tag-selector-item-unit"
          >
            {{ tag.unit }}
          </div>
        </div>
        <div
          v-if="tag.currentValue !== null && tag.currentValue !== undefined"
          class="tag-selector-item-value"
        >
          <span class="value-text">{{ formatDisplayValue(tag.currentValue) }}</span>
          <span
            v-if="tag.unit"
            class="value-unit"
          >{{ tag.unit }}</span>
          <span
            class="quality-dot"
            :class="'quality-' + (tag.quality || 'unknown')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTagStore } from '@scada-editor/system';
import { useI18n } from '@scada-editor/core';

const props = defineProps<{
  projectId: string;
  modelValue?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  select: [tag: any];
}>();

const tagStore = useTagStore();
const { t: _t } = useI18n();
const searchQuery = ref('');
const selectedTagId = ref<string | null>(null);
const loading = ref(false);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const filteredTags = computed(() => {
  if (searchQuery.value) {
    return tagStore.searchResults;
  }
  return tagStore.tags;
});

function onSearch(value: string) {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = setTimeout(async () => {
    if (value && props.projectId) {
      loading.value = true;
      try {
        await tagStore.searchTags(props.projectId, value);
      } finally {
        loading.value = false;
      }
    }
  }, 300);
}

function selectTag(tag: any) {
  selectedTagId.value = tag.id;
  emit('update:modelValue', tag.id);
  emit('select', tag);
}

function clearSearch() {
  searchQuery.value = '';
  onSearch('');
}

function formatDisplayValue(value: any): string {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return String(value);
}
</script>

<style scoped>
.tag-selector {
  width: 100%;
}

.tag-selector-search {
  margin-bottom: 8px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 8px;
  color: #999;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 6px 28px 6px 28px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--primary, #2080f0);
}

.clear-btn {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  line-height: 1;
}

.clear-btn:hover {
  color: #666;
}

.tag-selector-loading,
.tag-selector-empty {
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.tag-selector-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.tag-selector-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.15s;
}

.tag-selector-item:last-child {
  border-bottom: none;
}

.tag-selector-item:hover {
  background-color: #f5f7fa;
}

.tag-selector-item--selected {
  background-color: #e8f4fd;
}

.tag-selector-item--bad-quality {
  border-left: 3px solid #d03050;
}

.tag-selector-item--stale {
  border-left: 3px solid #f0a020;
}

.tag-selector-item-info {
  flex: 1;
  min-width: 0;
}

.tag-selector-item-name {
  font-weight: 500;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-selector-item-address {
  font-size: 11px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-selector-item-unit {
  font-size: 10px;
  color: #888;
  margin-top: 1px;
}

.tag-selector-item-value {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 12px;
}

.value-text {
  font-weight: 600;
  font-size: 13px;
  color: #2080f0;
}

.value-unit {
  font-size: 11px;
  color: #999;
}

.quality-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.quality-good {
  background-color: #18a058;
}

.quality-uncertain {
  background-color: #f0a020;
}

.quality-bad {
  background-color: #d03050;
}

.quality-stale {
  background-color: #999;
}

.quality-disconnected {
  background-color: #ccc;
}

.quality-unknown {
  background-color: #e0e0e0;
}
</style>