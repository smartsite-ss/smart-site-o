<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="map-picker-overlay"
      @click.self="handleClose"
    >
      <div class="map-picker-dialog">
        <div class="map-picker-header">
          <h3>{{ $t('system.projects.mapPickerTitle') }}</h3>
          <button
            class="modal-close"
            @click="handleClose"
          >
            &times;
          </button>
        </div>
        <div class="map-picker-body">
          <!-- 搜索栏 -->
          <div class="map-search-bar">
            <input
              v-model="searchKeyword"
              type="text"
              class="map-search-input"
              :placeholder="$t('system.projects.mapSearchPlaceholder')"
              @keyup.enter="handleSearch"
            >
            <button
              class="btn btn-secondary btn-sm"
              :disabled="searching"
              @click="handleSearch"
            >
              {{ searching ? $t('system.projects.mapSearching') : $t('system.projects.mapSearchBtn') }}
            </button>
            <button
              class="btn btn-secondary btn-sm btn-locate"
              :title="$t('system.projects.mapLocateMe')"
              @click="handleLocateMe"
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
              ><circle
                cx="12"
                cy="12"
                r="4"
              /><line
                x1="12"
                y1="2"
                x2="12"
                y2="5"
              /><line
                x1="12"
                y1="19"
                x2="12"
                y2="22"
              /><line
                x1="2"
                y1="12"
                x2="5"
                y2="12"
              /><line
                x1="19"
                y1="12"
                x2="22"
                y2="12"
              /></svg>
            </button>
          </div>
          <!-- 搜索结果 -->
          <div
            v-if="searchResults.length"
            class="map-search-results"
          >
            <div
              v-for="(item, idx) in searchResults"
              :key="idx"
              class="search-result-item"
              :title="item.display_name"
              @click="handleSelectSearchResult(item)"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle
                cx="12"
                cy="10"
                r="3"
              /></svg>
              <span class="result-text">{{ item.display_name }}</span>
            </div>
          </div>
          <!-- 地图容器 -->
          <div
            ref="mapContainerRef"
            class="map-container"
          />
          <!-- 坐标显示 -->
          <div class="coord-display">
            <span class="coord-item"><span class="coord-label">LNG</span>{{ selectedLng !== null ? selectedLng.toFixed(6) : '—' }}</span>
            <span class="coord-item"><span class="coord-label">LAT</span>{{ selectedLat !== null ? selectedLat.toFixed(6) : '—' }}</span>
            <span class="coord-hint">{{ $t('system.projects.mapClickHint') }}</span>
          </div>
        </div>
        <div class="map-picker-footer">
          <span class="map-attribution">© OpenStreetMap contributors</span>
          <div class="footer-actions">
            <button
              class="btn btn-secondary"
              @click="handleClose"
            >
              {{ $t('system.projects.mapCancel') }}
            </button>
            <button
              class="btn btn-primary"
              :disabled="selectedLng === null"
              @click="handleConfirm"
            >
              {{ $t('system.projects.mapConfirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// 修复打包器环境下 Leaflet 默认标记图标路径失效问题
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useI18n } from '@scada-editor/core';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const props = defineProps<{
  visible: boolean;
  initialLng?: string;
  initialLat?: string;
}>();

const emit = defineEmits<{
  'update:visible': [val: boolean];
  select: [lng: number, lat: number];
}>();

const { t: _t } = useI18n();
void _t;

const mapContainerRef = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let marker: L.Marker | null = null;

const selectedLng = ref<number | null>(null);
const selectedLat = ref<number | null>(null);
const searchKeyword = ref('');
const searching = ref(false);
const searchResults = ref<SearchResult[]>([]);

function handleClose() {
  emit('update:visible', false);
}

function handleConfirm() {
  if (selectedLng.value !== null && selectedLat.value !== null) {
    emit('select', selectedLng.value, selectedLat.value);
  }
  emit('update:visible', false);
}

/** 放置/移动标记并更新坐标 */
function placeMarker(lat: number, lng: number, fly = true) {
  if (!map) return;
  const latlng = L.latLng(lat, lng);
  if (!marker) {
    marker = L.marker(latlng, { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker!.getLatLng();
      selectedLat.value = p.lat;
      selectedLng.value = p.lng;
    });
  } else {
    marker.setLatLng(latlng);
  }
  selectedLat.value = lat;
  selectedLng.value = lng;
  if (fly) {
    map.setView(latlng, Math.max(map.getZoom(), 13));
  }
}

function initMap() {
  if (!mapContainerRef.value || map) return;
  const initLat = props.initialLat ? parseFloat(props.initialLat) : NaN;
  const initLng = props.initialLng ? parseFloat(props.initialLng) : NaN;
  const hasInit = !isNaN(initLat) && !isNaN(initLng);
  // 无初始坐标时默认定位中国中心
  const center: L.LatLngExpression = hasInit ? [initLat, initLng] : [35.0, 105.0];
  map = L.map(mapContainerRef.value, { zoomControl: true }).setView(center, hasInit ? 13 : 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
  map.on('click', (e: L.LeafletMouseEvent) => {
    placeMarker(e.latlng.lat, e.latlng.lng, false);
  });
  if (hasInit) {
    placeMarker(initLat, initLng, false);
  }
  // 弹窗渲染后尺寸可能未就绪，需强制重算
  nextTick(() => map?.invalidateSize());
  setTimeout(() => map?.invalidateSize(), 200);
}

function destroyMap() {
  if (map) {
    map.remove();
    map = null;
    marker = null;
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      // 重置选中状态（保留初始坐标由 initMap 读取）
      selectedLng.value = null;
      selectedLat.value = null;
      searchResults.value = [];
      searchKeyword.value = '';
      nextTick(() => initMap());
    } else {
      destroyMap();
    }
  },
);

onBeforeUnmount(() => {
  destroyMap();
});

/** 关键字搜索地点（OSM Nominatim） */
async function handleSearch() {
  const q = searchKeyword.value.trim();
  if (!q) return;
  searching.value = true;
  searchResults.value = [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&accept-language=zh-CN&limit=5&q=${encodeURIComponent(q)}`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (resp.ok) {
      searchResults.value = await resp.json();
    }
  } catch {
    // 网络异常时静默，仅清空结果
  } finally {
    searching.value = false;
  }
}

function handleSelectSearchResult(item: SearchResult) {
  const lat = parseFloat(item.lat);
  const lng = parseFloat(item.lon);
  if (!isNaN(lat) && !isNaN(lng)) {
    placeMarker(lat, lng, true);
  }
  searchResults.value = [];
}

/** 浏览器定位 */
function handleLocateMe() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      placeMarker(pos.coords.latitude, pos.coords.longitude, true);
    },
    () => {
      // 定位失败时静默
    },
    { enableHighAccuracy: true, timeout: 8000 },
  );
}
</script>

<style scoped>
.map-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  backdrop-filter: blur(4px);
}

.map-picker-dialog {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  width: 80vw;
  max-width: 1000px;
  height: 80vh;
  max-height: 700px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.map-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.map-picker-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text);
}

.map-picker-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.map-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.map-search-input {
  flex: 1;
  padding: 7px 12px;
  background: var(--background);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.map-search-input:focus {
  border-color: var(--primary);
}

.btn-locate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.map-search-results {
  position: absolute;
  top: 53px;
  left: 16px;
  right: 16px;
  z-index: 1000;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  max-height: 220px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  border-bottom: 1px solid var(--background);
  transition: background 0.15s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}

.search-result-item svg {
  flex-shrink: 0;
  color: var(--primary);
}

.result-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-container {
  flex: 1;
  min-height: 0;
  background: var(--background);
}

.coord-display {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-top: 1px solid var(--border-light);
  background: var(--background);
  flex-shrink: 0;
}

.coord-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
  font-family: 'Courier New', monospace;
}

.coord-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--border-light);
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}

.coord-hint {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.8;
}

.map-picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
}

.map-attribution {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.footer-actions {
  display: flex;
  gap: 8px;
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
  background: var(--border-light);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
