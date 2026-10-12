<template>
  <div
    ref="containerRef"
    class="preview-canvas-container"
    :class="transitionClass"
  >
    <!-- 设备尺寸选择 - 仅在 showControls=true 时显示 -->
    <div
      v-if="showControls"
      class="preview-controls"
    >
      <select
        v-model="selectedDevice"
        @change="changeDevice"
      >
        <option value="custom">
          {{ $t('runtime.preview.deviceCustom') }}
        </option>
        <option value="desktop">
          {{ $t('runtime.preview.deviceDesktop') }} (1920x1080)
        </option>
        <option value="tablet">
          {{ $t('runtime.preview.deviceTablet') }} (768x1024)
        </option>
        <option value="mobile">
          {{ $t('runtime.preview.deviceMobile') }} (375x667)
        </option>
      </select>
      <!-- 当前实际适配模式徽标（auto 已解析为具体模式，优化方案 C2 策略可见化） -->
      <span
        class="fit-mode-badge"
        :title="fitModeDescription"
      >
        {{ fitModeLabel }}
      </span>
      <ZoomSlider 
        v-model="zoomValue" 
        :use-page-scale="false"
        :min-scale="scaleMinPercent"
        :max-scale="scaleMaxPercent"
        :disabled="computedFitMode === 'stretch'"
        @scale-change="handleScaleChange"
      />
      <button
        class="zoom-button"
        @click="resetZoom"
      >
        {{ $t('runtime.preview.reset') }}
      </button>
    </div>

    <!-- 画布容器 -->
    <div
      ref="wrapperRef"
      class="canvas-wrapper"
      :class="canvasWrapperClass"
      @mousedown="showControls ? handleMouseDown : null"
      @mousemove="showControls ? handleMouseMove : null"
      @mouseup="showControls ? handleMouseUp : null"
      @mouseleave="showControls ? handleMouseUp : null"
      @wheel.passive="showControls ? handleWheel : null"
      @contextmenu.prevent="handleContextMenu"
    >
      <div class="canvas-content-area">
        <canvas
          ref="canvasRef"
          :width="canvasWidth"
          :height="canvasHeight"
          class="preview-canvas"
          @click="handleCanvasClick"
        />
      </div>

      <VueComponentsContainer
        ref="vueContainerRef"
        :sorted-graphics="sortedGraphics"
        :zoom="zoom"
        :zoom-y="zoomY"
        :pan-x="panX"
        :pan-y="panY"
        :canvas-el="canvasRef"
        mode="runtime"
      />

      <SvgComponentsContainer
        ref="svgContainerRef"
        :sorted-graphics="sortedGraphics"
        :zoom="zoom"
        :zoom-y="zoomY"
        :pan-x="panX"
        :pan-y="panY"
        :canvas-el="canvasRef"
      />

      <CssComponentsContainer
        ref="cssContainerRef"
        :sorted-graphics="sortedGraphics"
        :zoom="zoom"
        :zoom-y="zoomY"
        :pan-x="panX"
        :pan-y="panY"
        :canvas-el="canvasRef"
      />

      <ThreeComponentsContainer
        ref="threeContainerRef"
        :sorted-graphics="sortedGraphics"
        :zoom="zoom"
        :zoom-y="zoomY"
        :pan-x="panX"
        :pan-y="panY"
        :canvas-el="canvasRef"
      />
    </div>

    <RuntimeDataPanel
      :visible="showDataPanel"
      :sources="dataPanelSources"
      :ws-connected="wsStore.isConnected"
      @close="closeDataPanel"
      @refresh="() => refreshDataPanel(false)"
    />

    <ContextMenuUI
      :visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
      @close="closeContextMenu"
      @item-click="handleContextMenuItem"
    />

    <ThemeSelectorPanel
      :visible="showThemePanel"
      :current-theme="currentTheme"
      @close="closeThemePanel"
      @select="handleSelectTheme"
    />

    <PerformancePanel
      :visible="showPerformancePanel"
      @close="showPerformancePanel = false"
    />

    <StatisticsPanel
      :visible="showStatisticsPanel"
      @close="showStatisticsPanel = false"
    />

    <ScriptMonitorDialog
      :visible="showScriptMonitorDialog"
      @close="showScriptMonitorDialog = false"
    />

    <DebugPanel
      :visible="showDebugPanel"
      :diagnostic-info="diagnosticInfo"
      :show-overlay="showDiagnosticOverlay"
      :fit-mode="currentFitModeSelection"
      :zoom="zoom"
      :pan-x="panX"
      :pan-y="panY"
      :canvas-width="canvasWidth"
      :canvas-height="canvasHeight"
      :graphics-count="graphicsList.length"
      :backend-exists="!!canvasBackend"
      @close="showDebugPanel = false"
      @run-diagnostic="runCanvasDiagnostics"
      @toggle-overlay="toggleDiagnosticOverlay"
      @refresh-page="refreshPage"
      @change-fit-mode="switchFitMode"
    />

    <!-- 轮播指示器 -->
    <CarouselIndicator
      :visible="carouselControlsVisible"
      :pages="carouselState.carouselPages"
      :current-index="carouselState.currentIndex"
      @go-to="carouselManager?.goTo($event)"
    />

    <!-- 轮播控制栏 -->
    <CarouselControls
      :visible="carouselControlsVisible"
      :state="carouselState"
      :interval="carouselConfig.interval"
      @play="carouselManager?.play()"
      @pause="carouselManager?.pause()"
      @previous="carouselManager?.previous()"
      @next="carouselManager?.next()"
      @go-to="carouselManager?.goTo($event)"
    />

    <!-- 轮播设置面板 -->
    <CarouselSettingsPanel
      :visible="showCarouselSettings"
      :config="carouselConfig"
      :all-pages="pageStore.pages.map(p => ({ id: p.id, name: p.name }))"
      @close="showCarouselSettings = false"
      @save="handleCarouselConfigSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { usePageStore, type IGraphic, BasePage, ZoomManager, defaultAutoFitConfig, type FitMode, EnterAnimationEngine, Canvas2DBackend, RendererRegistry, ScriptEngine, themeManager, invalidateThemeCache, resolveAssetPath, i18n, saveServiceManager, CarouselManager, type CarouselConfig, DEFAULT_CAROUSEL_CONFIG, type CarouselState, loadAllPagesData, extractTagIds, readTagSnapshot, buildSourceSummary, ScadaDataManager } from '@scada-editor/core';
import { RenderBackend } from '@scada-editor/plugin-sdk';
import { pageApi, useWsStore, usePageDataSourceStore } from '@scada-editor/system';
import { loadImageWithAuth } from '../utils/loadImageWithAuth';
import { VIEWPORT } from '../canvas-page/design-canvas/constants';
import ZoomSlider from '../common/ZoomSlider.vue';
import VueComponentsContainer from '../canvas-page/design-canvas/core/VueComponentsContainer.vue';
import SvgComponentsContainer from '../canvas-page/design-canvas/core/SvgComponentsContainer.vue';
import CssComponentsContainer from '../canvas-page/design-canvas/core/CssComponentsContainer.vue';
import ThreeComponentsContainer from '../canvas-page/design-canvas/core/ThreeComponentsContainer.vue';
import RuntimeDataPanel from './RuntimeDataPanel.vue';
import ThemeSelectorPanel from './ThemeSelectorPanel.vue';
import PerformancePanel from './PerformancePanel.vue';
import StatisticsPanel from './StatisticsPanel.vue';
import ContextMenuUI from '../common/ContextMenu.vue';
import ScriptMonitorDialog from './ScriptMonitorDialog.vue';
import DebugPanel from './DebugPanel.vue';
import CarouselControls from './CarouselControls.vue';
import CarouselIndicator from './CarouselIndicator.vue';
import CarouselSettingsPanel from './CarouselSettingsPanel.vue';

const props = defineProps({
  width: {
    type: Number,
    default: 800,
  },
  height: {
    type: Number,
    default: 600,
  },
  autoSize: {
    type: Boolean,
    default: true
  },
  showControls: {
    type: Boolean,
    default: true
  },
  fitMode: {
    type: String as () => FitMode,
    default: 'auto'
  },
  /** 轮播初始配置（从项目 projectinfo.json 加载） */
  carouselConfig: {
    type: Object as () => CarouselConfig | null,
    default: null,
  },
});

const emit = defineEmits<{
  /** 轮播配置变更（用户通过设置面板保存） */
  carouselConfigChanged: [config: CarouselConfig];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
// 画布滚动视口（.canvas-wrapper）：尺寸测量以此为准，clientWidth 已排除纵向滚动条宽度
const wrapperRef = ref<HTMLDivElement | null>(null);
// 四个图元容器组件引用：适配/容器尺寸变化后刷新画布偏移（优化方案 P0-2）
const vueContainerRef = ref<{ updateCanvasOffset: () => void } | null>(null);
const svgContainerRef = ref<{ updateCanvasOffset: () => void } | null>(null);
const cssContainerRef = ref<{ updateCanvasOffset: () => void } | null>(null);
const threeContainerRef = ref<{ updateCanvasOffset: () => void } | null>(null);
const containerWidth = ref(props.width);
const containerHeight = ref(props.height);
// 画布分辨率 = 容器尺寸（始终填满容器，无溢出，无滚动条）
const canvasWidth = ref(props.width);
const canvasHeight = ref(props.height);
const pageStore = usePageStore();
const wsStore = useWsStore();

// 背景图片绘制参数（根据 fitMode 统一计算）
const bgImageDrawParams = ref<{
  x: number;
  y: number;
  width: number;
  height: number;
}>({ x: 0, y: 0, width: props.width, height: props.height });
let resizeObserver: ResizeObserver | null = null;

// 直接存储图形列表的 ref，避免响应式依赖问题
const graphicsList = ref<IGraphic[]>([]);

// 缓存背景图片
let cachedBgImage: HTMLImageElement | null = null;
let cachedBgImageSrc: string | null = null;

let animEngine: EnterAnimationEngine | null = null;
let animPageContext: any = null;
let animInitialized = false;

let canvasBackend: Canvas2DBackend | null = null;
const registeredGraphics = new Set<string>();

// 背景图片加载失败重试次数限制
const BG_IMAGE_MAX_RETRIES = 3;
const bgImageRetryCount = new Map<string, number>();
const bgImageExhausted = new Set<string>();

// 调试面板状态
const showDebugPanel = ref(false);
const showDiagnosticOverlay = ref(false);

// 画布诊断结果接口
interface CanvasDiagnosticResult {
  timestamp: number;
  canvasRefExists: boolean;
  canvasRefTag: string;
  canvasRefInDOM: boolean;
  totalCanvasesInDOM: number;
  canvasWidth: number;
  canvasHeight: number;
  canvasCssDisplay: string;
  canvasCssVisibility: string;
  canvasCssOpacity: string;
  canvasCssWidth: string;
  canvasCssHeight: string;
  containerCssDisplay: string;
  testDrawSuccess: boolean;
  backendExists: boolean;
  backendStats: Record<string, any> | null;
  graphicsCount: number;
  zoom: number;
  panX: number;
  panY: number;
  fitMode: string;
  currentPageName: string;
  currentPageId: string;
  currentPageSize: string;
  backgroundImageLoaded: boolean;
}

const diagnosticInfo = ref<CanvasDiagnosticResult | null>(null);

/** 运行画布诊断 - 可独立调用 */
function runCanvasDiagnostics(): CanvasDiagnosticResult {
  const allCanvases = document.querySelectorAll('canvas');
  const canvas = canvasRef.value;

  let testDrawSuccess = false;
  if (canvas) {
    try {
      const testCtx = canvas.getContext('2d');
      if (testCtx) {
        const w = canvas.width;
        const h = canvas.height;
        testCtx.save();
        testCtx.fillStyle = 'rgba(0, 0, 255, 0.3)';
        testCtx.fillRect(0, 0, w, h);
        testCtx.fillStyle = '#FFFFFF';
        testCtx.font = 'bold 28px sans-serif';
        testCtx.textAlign = 'center';
        testCtx.textBaseline = 'middle';
        testCtx.fillText('DIAGNOSTIC', w / 2, h / 2);
        testCtx.restore();
        testDrawSuccess = true;
      }
    } catch (e) {
      console.warn('[Diagnostic] 测试绘制失败:', e);
    }
  }

  const currentPage = pageStore.currentPage;

  const result: CanvasDiagnosticResult = {
    timestamp: Date.now(),
    canvasRefExists: !!canvas,
    canvasRefTag: canvas?.tagName || 'N/A',
    canvasRefInDOM: canvas ? document.contains(canvas) : false,
    totalCanvasesInDOM: allCanvases.length,
    canvasWidth: canvas?.width || 0,
    canvasHeight: canvas?.height || 0,
    canvasCssDisplay: canvas ? getComputedStyle(canvas).display : 'N/A',
    canvasCssVisibility: canvas ? getComputedStyle(canvas).visibility : 'N/A',
    canvasCssOpacity: canvas ? getComputedStyle(canvas).opacity : 'N/A',
    canvasCssWidth: canvas ? getComputedStyle(canvas).width : 'N/A',
    canvasCssHeight: canvas ? getComputedStyle(canvas).height : 'N/A',
    containerCssDisplay: containerRef.value ? getComputedStyle(containerRef.value).display : 'N/A',
    testDrawSuccess,
    backendExists: !!canvasBackend,
    backendStats: canvasBackend?.getStats?.() || null,
    graphicsCount: graphicsList.value.length,
    zoom: zoom.value,
    panX: panX.value,
    panY: panY.value,
    fitMode: computedFitMode.value,
    currentPageName: currentPage?.name || 'N/A',
    currentPageId: currentPage?.id || 'N/A',
    currentPageSize: currentPage ? `${(currentPage as any).width} × ${(currentPage as any).height}` : 'N/A',
    backgroundImageLoaded: !!cachedBgImage && cachedBgImage.complete,
  };

  diagnosticInfo.value = result;
  return result;
}

/** 切换诊断覆盖层 */
function toggleDiagnosticOverlay(on?: boolean) {
  showDiagnosticOverlay.value = on !== undefined ? on : !showDiagnosticOverlay.value;
}

// 加载背景图片（带缓存+重试限制）
const loadBackgroundImage = async (src: string): Promise<HTMLImageElement | null> => {
  // 将相对路径（如 bg.png）解析为页面目录下的完整 API 路径
  const effectiveSrc = resolvePageAssetPath(src);
  const resolvedSrc = resolveAssetPath(effectiveSrc);

  // 校验路径有效性：忽略明显无效的路径（截断的 base64、双重编码等脏数据）
  if (!isValidImagePath(resolvedSrc)) {
    bgImageExhausted.add(resolvedSrc);
    console.warn('[PreviewCanvas] 背景图片路径无效，已跳过:', resolvedSrc);
    return null;
  }

  // 已超过重试次数，不再加载
  if (bgImageExhausted.has(resolvedSrc)) {
    return null;
  }

  if (cachedBgImage && cachedBgImageSrc === resolvedSrc && cachedBgImage.complete) {
    return cachedBgImage;
  }

  try {

    const img = await loadImageWithAuth(effectiveSrc);
    cachedBgImage = img;
    cachedBgImageSrc = resolvedSrc;
    bgImageRetryCount.delete(resolvedSrc);
    return img;
  } catch (err) {
    const count = (bgImageRetryCount.get(resolvedSrc) || 0) + 1;
    bgImageRetryCount.set(resolvedSrc, count);
    console.error(`[PreviewCanvas] 背景图片加载失败(第${count}次):`, resolvedSrc, err);
    if (count >= BG_IMAGE_MAX_RETRIES) {
      bgImageExhausted.add(resolvedSrc);
      console.warn(`[PreviewCanvas] 背景图片加载失败 ${count} 次，停止重试: ${resolvedSrc}`);
    }
    return null;
  }
};

/** 将页面相对路径解析为完整 API 路径：bg.png → /api/v1/projects/{project}/pages/{page}/bg.png */
function resolvePageAssetPath(src: string): string {
  if (!src) return src;
  // 已是绝对路径或完整 URL，直接返回
  if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
    return src;
  }
  const currentPage = pageStore.currentPage;
  const projectName = (currentPage as any)?.projectId || '';
  const pageName = currentPage?.name || '';
  if (!projectName || !pageName) return src;
  return `/api/v1/projects/${encodeURIComponent(projectName)}/pages/${encodeURIComponent(pageName)}/${src}`;
}

/** 组合解析：先解析页面相对路径，再规范化 API 版本前缀 */
function resolvePageBgSrc(src: string | undefined): string | null {
  if (!src) return null;
  return resolveAssetPath(resolvePageAssetPath(src));
}

/** 校验图片路径是否为有效格式 */
function isValidImagePath(path: string): boolean {
  if (!path) return false;
  // data URL / blob URL: 始终有效
  if (path.startsWith('data:image/') || path.startsWith('blob:')) return true;
  // HTTP(S) URL: 始终有效
  if (path.startsWith('http://') || path.startsWith('https://')) return true;
  // /api/v{digits}/... 含有效资源段
  if (/^\/api\/v\d+\/.+/.test(path)) return true;
  // 相对路径（如 bg.png）— 至少以字母/数字/下划线开头且有扩展名
  if (/^[a-zA-Z0-9_].+\.[a-zA-Z]{2,}$/.test(path)) return true;
  // 截断的 base64 片段（如 9k=、%25%3D 等）或只有版本前缀无资源段：无效
  return false;
}

const preloadBackgroundImage = () => {
  const currentPage = pageStore.currentPage;
  if (!currentPage?.backgroundImage) {
    cachedBgImage = null;
    cachedBgImageSrc = null;
    return;
  }

  loadBackgroundImage(currentPage.backgroundImage).then((img) => {
    if (img) {
      drawCanvas();
    }
  });
};

const initAnimationEngine = () => {
  if (!animInitialized) {
    animEngine = new EnterAnimationEngine(() => {
      drawCanvas();
    });
    animPageContext = { 
      animationEngine: animEngine,
      getPage: () => ({ 
        mode: 'preview' as const,
        selectedGraphicIds: [],
      }),
    };
    animInitialized = true;
  }
};

// 安全获取图元数组
const getSafeGraphics = (page: any): IGraphic[] => {
  if (!page) return [];

  if (Array.isArray(page.graphics)) {
    return page.graphics;
  }
  
  if (page.graphics && 'value' in page.graphics && Array.isArray(page.graphics.value)) {
    return page.graphics.value;
  }
  
  return [];
};

// 同步图形列表
const syncGraphics = () => {
  const currentPage = pageStore.currentPage;
  if (!currentPage) {
    graphicsList.value = [];
    return;
  }

  const graphics = getSafeGraphics(currentPage);

  // 直接赋值，不要展开操作
  graphicsList.value = graphics.slice().sort(
    (a: IGraphic, b: IGraphic) =>
      (a.config?.zIndex ?? 0) - (b.config?.zIndex ?? 0)
  );
};

// 简化 sortedGraphics，直接返回 graphicsList.value
const sortedGraphics = computed(() => {
  return graphicsList.value;
});

// 画布包装器 CSS class
const canvasWrapperClass = computed(() => {
  const classes: Record<string, boolean> = {};
  if (!props.showControls) {
    classes['no-controls'] = true;
  }
  if (computedFitMode.value === 'stretch') {
    classes['stretch-mode'] = true;
  }
  // 按实际生效模式锁定滚动轴：适应宽度不应出现横向滚动条，适应高度同理（避免亚像素/越界图元引发多余滚动条）
  if (resolvedFitMode.value === 'fitWidth') {
    classes['fit-width-mode'] = true;
  }
  if (resolvedFitMode.value === 'fitHeight') {
    classes['fit-height-mode'] = true;
  }
  return classes;
});

// 设备尺寸配置
const devices = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

// 状态管理
const selectedDevice = ref('custom');

/** 当前选中的设备模拟尺寸（未选设备时为 null，优化方案 P1-1） */
const getActiveDeviceSize = (): { width: number; height: number } | null =>
  selectedDevice.value !== 'custom'
    ? devices[selectedDevice.value as keyof typeof devices]
    : null;

// 画布相关状态
const zoom = ref(1);
const zoomX = ref(1);
const zoomY = ref(1);
const zoomValue = ref(100);
const panX = ref(0);
const panY = ref(0);
const computedFitMode = ref<FitMode>('auto');
// 实际生效的适配模式（auto 已解析为具体模式；用于控件区徽标显示，优化方案 C2）
const resolvedFitMode = ref<FitMode>('contain');

// 适配模式徽标文案（auto 显示解析结果，非 auto 直接显示模式名）
// 经 unknown 断言窄化 t 签名：非字面量 key 会触发 vue-i18n messages 字面量 schema 深度实例化（TS2589）
const translate = (key: string): string =>
  (i18n.global as unknown as { t: (key: string) => string }).t(key);
const fitModeLabel = computed(() => {
  const label = translate(`zoomManager.fitModes.${resolvedFitMode.value}.label`);
  return computedFitMode.value === 'auto' ? `auto → ${label}` : label;
});
const fitModeDescription = computed(() =>
  translate(`zoomManager.fitModes.${resolvedFitMode.value}.description`)
);

// ★ 统一缩放范围（百分比）：来源于 pageStore 可配置缩放三参数，对齐编辑态约束链（优化方案 C3）
// 此前预览态依赖 ZoomManager 内部兑底默认 10~200，绕开用户在 CanvasSettings 中的配置
const scaleMinPercent = computed(() => pageStore.scaleMin ?? VIEWPORT.SCALE_MIN);
const scaleMaxPercent = computed(() => pageStore.scaleMax ?? VIEWPORT.SCALE_MAX);

/**
 * ★ 以容器中心为锚点更新缩放（对齐编辑态 zoomAtAnchor 的 CANVAS_CENTER 语义，优化方案 P1-4）
 * 保持画布中心视觉位置不变：pan' = center - (center - pan) × (newZoom / oldZoom)
 * 此前滑杆/滚轮只改 zoom 不调 pan，缩放围绕 (0,0) 原点，中心内容随缩放飞出视口
 */
const zoomAtContainerCenter = (newZoom: number) => {
  const oldZoom = zoom.value;
  if (oldZoom <= 0 || newZoom === oldZoom) return;
  const ratio = newZoom / oldZoom;
  const centerX = containerWidth.value / 2;
  const centerY = containerHeight.value / 2;
  panX.value = centerX - (centerX - panX.value) * ratio;
  panY.value = centerY - (centerY - panY.value) * ratio;
};

/** 应用新缩放并同步 Canvas 后端（clamp + 中心锚点 + zoomX/zoomY 同步） */
const applyZoom = (newScalePercent: number) => {
  const clampedPercent = Math.max(
    scaleMinPercent.value,
    Math.min(scaleMaxPercent.value, newScalePercent),
  );
  const newZoom = clampedPercent / 100;
  zoomAtContainerCenter(newZoom);
  zoom.value = newZoom;
  zoomX.value = newZoom;
  zoomY.value = newZoom;
  zoomValue.value = clampedPercent;
  if (canvasBackend) {
    canvasBackend.setScale(zoom.value);
    canvasBackend.setPan(panX.value, panY.value);
  }
};

// 本地临时覆盖的显示模式（不持久化到页面，仅当前预览会话有效）
const localFitMode = ref<FitMode | null>(null);
// 当前显示模式选中态（本地覆盖优先）：右键菜单勾选与调试面板高亮共用，保证两处一致（运行态显示模式统一）
const currentFitModeSelection = computed<FitMode>(() => localFitMode.value || computedFitMode.value);
const isDragging = ref(false);
const hasDragged = ref(false);
const startX = ref(0);
const startY = ref(0);
const startPanX = ref(0);
const startPanY = ref(0);

const showDataPanel = ref(false);
const dataPanelSources = ref<any[]>([]);
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
const AUTO_REFRESH_INTERVAL = 3000; // 面板打开时每 3 秒自动刷新（兜底）

// 响应式自动刷新：每次 wsStore flush 时触发（对齐编辑态 DataSourceConfigDialog）
// 同时调用 syncGraphics() 生成新数组引用 + drawCanvas() 重绘 Canvas 2D 图元
const wsVersion = ref(0);
let tagValueUnsubscribeFn: (() => void) | null = null;
watch(
  () => wsStore.tagFlushVersion,
  (newVersion) => {
    wsVersion.value++;
    syncGraphics();
    drawCanvas();
  },
);

const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuItems = computed(() => {
  const fitModes: FitMode[] = ['auto', 'contain', 'fitWidth', 'fitHeight', 'stretch'];
  const currentMode = currentFitModeSelection.value;
  return [
    { id: 'refresh', label: translate('runtime.menu.refresh') },
    { id: 'divider-1', label: '─' },
    { id: 'data-panel', label: translate('runtime.menu.dataPanel') },
    { id: 'fullscreen', label: translate('runtime.menu.fullscreen') },
    { id: 'theme-toggle', label: translate('runtime.menu.themeToggle') },
    { id: 'performance', label: translate('runtime.menu.performance') },
    { id: 'statistics', label: translate('runtime.menu.statistics') },
    { id: 'script-monitor', label: translate('runtime.menu.scriptMonitor') },
    { id: 'divider-2', label: '─' },
    // 显示模式分组（恢复 P2-1c 死代码对应的菜单项，当前模式前缀 ✓）
    { id: 'fitmode-header', label: translate('runtime.preview.fitModeGroup') },
    ...fitModes.map(mode => ({
      id: `fitmode-${mode}`,
      label: (mode === currentMode ? '✓ ' : '') + translate(`zoomManager.fitModes.${mode}.label`),
    })),
    { id: 'divider-3', label: '─' },
    { id: 'debug-panel', label: translate('runtime.menu.debugPanel') },
    { id: 'divider-4', label: '─' },
    { id: 'carousel-settings', label: translate('runtime.menu.carouselSettings') },
  ];
});

function handleContextMenu(event: MouseEvent) {
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;
  contextMenuVisible.value = true;
}

function closeContextMenu() {
  contextMenuVisible.value = false;
}

const showThemePanel = ref(false);
const currentTheme = ref(themeManager.getCurrentThemeName());

const showPerformancePanel = ref(false);
const showStatisticsPanel = ref(false);
const showScriptMonitorDialog = ref(false);

// 轮播相关状态
const carouselManager = ref<CarouselManager | null>(null);
const carouselStateTimer = ref<ReturnType<typeof setInterval> | null>(null);
const carouselConfig = ref<CarouselConfig>(
  props.carouselConfig ? { ...DEFAULT_CAROUSEL_CONFIG, ...props.carouselConfig } : { ...DEFAULT_CAROUSEL_CONFIG },
);
const carouselState = ref<CarouselState>({
  isRunning: false,
  isPaused: false,
  currentIndex: 0,
  elapsedTime: 0,
  carouselPages: [],
});
const showCarouselSettings = ref(false);
const carouselControlsVisible = computed(() => {
  return carouselConfig.value.enabled
    && (carouselState.value.carouselPages.length > 1
      || carouselConfig.value.showSinglePage);
});
const transitionClass = ref('');

function handleContextMenuItem(item: { id: string; label: string }) {
  if (item.id === 'refresh') {
    refreshPage();
  } else if (item.id === 'data-panel') {
    openDataPanel();
  } else if (item.id === 'fullscreen') {
    toggleFullscreen();
  } else if (item.id === 'theme-toggle') {
    showThemePanel.value = true;
  } else if (item.id === 'performance') {
    showPerformancePanel.value = !showPerformancePanel.value;
  } else if (item.id === 'statistics') {
    showStatisticsPanel.value = !showStatisticsPanel.value;
  } else if (item.id === 'script-monitor') {
    showScriptMonitorDialog.value = true;
  } else if (item.id === 'debug-panel') {
    showDebugPanel.value = !showDebugPanel.value;
    if (showDebugPanel.value) {
      nextTick(() => runCanvasDiagnostics());
    }
  } else if (item.id === 'carousel-settings') {
    showCarouselSettings.value = true;
  } else if (item.id === 'fitmode-header') {
    // 点击"显示模式"标题不做任何操作，仅作为分组标识
  } else if (item.id && typeof item.id === 'string' && item.id.startsWith('fitmode-')) {
    const mode = item.id.replace('fitmode-', '') as FitMode;
    switchFitMode(mode);
  }
}

/** 切换显示模式（仅更新当前显示，不持久化到页面） */
function switchFitMode(mode: FitMode) {
  localFitMode.value = mode;
  scrollbarCompensationApplied = false;
  applyAutoFit();
  drawCanvas();
  scheduleScrollbarCompensation();
}

function closeThemePanel() {
  showThemePanel.value = false;
}

function handleSelectTheme(themeName: string) {
  themeManager.setTheme(themeName);
  invalidateThemeCache();
  localStorage.setItem('runtime-theme', themeName);
  currentTheme.value = themeName;
  showThemePanel.value = false;

  const graphics = sortedGraphics.value;
  if (Array.isArray(graphics)) {
    for (const graphic of graphics) {
      if (graphic && typeof (graphic as any).onThemeChanged === 'function') {
        try {
          (graphic as any).onThemeChanged(themeName);
        } catch { /* ignore */ }
      }
    }
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function openDataPanel() {
  showDataPanel.value = true;

  // 预览运行在 iframe 中时，Pinia 实例与父窗口隔离，需要自行建立 WS 连接
  if (!wsStore.isConnected) {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    if (projectId) {
      // 收集当前页面所有数据源的 tagId
      const pageData = pageStore.currentPage as any;
      const dsGroup = pageData?.dataSource;
      const allTagIds: string[] = [];
      if (dsGroup?.dataSources) {
        for (const ds of dsGroup.dataSources) {
          const tagIds = extractTagIds(ds);
          allTagIds.push(...tagIds);
        }
      }
      wsStore.connect(projectId).then(() => {
        if (allTagIds.length > 0) {
          wsStore.subscribeTags(allTagIds);
        }
        refreshDataPanel(false);
      }).catch((err: any) => {
        console.warn('[PreviewCanvas] wsStore.connect FAILED:', err?.message || err);
        // WS 连接失败也刷新面板：运行态数据源可能走 HTTP 轮询/Static 等非 WS 驱动
        refreshDataPanel(false);
      });
    } else {
      console.warn('[PreviewCanvas] openDataPanel: 无法获取 projectId');
      refreshDataPanel(false);
    }
  } else {
    refreshDataPanel(false);
  }

  // 启动自动刷新：面板打开期间每 3s 刷新，wsStore 后台持续接收 WS 推送
  if (!autoRefreshTimer) {
    autoRefreshTimer = setInterval(() => refreshDataPanel(true), AUTO_REFRESH_INTERVAL);
  }
}

function closeDataPanel() {
  showDataPanel.value = false;
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// 响应式自动刷新：当 wsStore 推送数据时立即更新面板（对齐编辑态 DataSourceConfigDialog）
watch(wsVersion, () => {
  if (showDataPanel.value) {
    refreshDataPanel(true);
  }
});

function refreshDataPanel(silent = false) {
  const currentPage = pageStore.currentPage as any;
  if (!currentPage) {
    dataPanelSources.value = [];
    return;
  }

  try {
    const sources: any[] = [];
    const dsGroup = currentPage.dataSource;
    const dm = ScadaDataManager.dataSourceManager;

  // 运行态：DataSourceManager 已初始化时，读取其真实状态和缓存值（全部使用公共 API）
  if (dm.initialized) {
    const dmSources = dm.getAllSources();
    // 使用公共 getStatus() 获取每个数据源的状态信息（替代对 _driverRegistry 私有属性的直接访问）
    const statusSnap = dm.getStatus();
    const statusBySourceId = new Map(
      (statusSnap?.sources || []).map((s: any) => [s.id, s]),
    );

    // 获取所有 bindings，并按 variable.dataSourceId 分组到对应数据源（避免从驱动 config 反推）
    const allBindings = dm.getBindings();
    const bindingsBySourceId = new Map<string, any[]>();
    for (const b of allBindings) {
      const meta = dm.getVariableMeta(b.tagId);
      const dsId = meta?.dataSourceId;
      if (!dsId) continue;
      if (!bindingsBySourceId.has(dsId)) bindingsBySourceId.set(dsId, []);
      bindingsBySourceId.get(dsId)!.push(b);
    }

    for (const dsInfo of dmSources) {
      const statusEntry = statusBySourceId.get(dsInfo.id);

      const dsBindings = bindingsBySourceId.get(dsInfo.id) || [];
      // 对 tagId 去重（多个图元可能绑定同一个 tag）
      const seenTagIds = new Set<string>();
      const tags: any[] = [];
      for (const b of dsBindings) {
        if (seenTagIds.has(b.tagId)) continue;
        seenTagIds.add(b.tagId);
        const cached = dm.getCachedValue(b.tagId);
        const meta = dm.getVariableMeta(b.tagId);
        tags.push({
          tagId: b.tagId,
          tagName: meta?.tagName || b.tagId,
          currentValue: cached?.value ?? null,
          quality: cached?.quality ?? 'uncertain',
          lastUpdate: cached?.timestamp ?? 0,
          unit: meta?.unit,
          dataType: meta?.dataType,
        });
      }

      // 数据源级别聚合值
      const firstTag = tags[0];
      sources.push({
        id: dsInfo.id,
        name: statusEntry?.name || dsInfo.id,
        type: dsInfo.type,
        status: statusEntry?.status || dsInfo.status || 'active',
        lastFetchTime: statusEntry?.lastFetchTime || 0,
        errorMessage: statusEntry?.errorMessage || dsInfo.lastError || undefined,
        lastValue: firstTag?.currentValue != null ? String(firstTag.currentValue) : null,
        updatedAt: firstTag?.lastUpdate || null,
        quality: tags.length === 0 ? 'uncertain'
          : tags.length === 1 ? firstTag?.quality
          : tags.some((t: any) => t.quality === 'bad') ? 'bad' : 'good',
        tags,
      });
    }

    dataPanelSources.value = sources;
    return;
  }

  // 编辑态 fallback：从 pageDsStore / wsStore 读取（保持原有逻辑）

  if (dsGroup?.dataSources) {
    // 使用 pageDsStore（对齐编辑态 DataSourceConfigDialog），确保与编辑态共享数据模型
    const pageDsStore = usePageDataSourceStore();
    const allVariables = pageDsStore.variables.length > 0
      ? pageDsStore.variables
      : (dsGroup.variables || []);

    for (const ds of dsGroup.dataSources) {
      // 使用 DataSourceReader 统一提取 tagIds
      let sourceVars = allVariables
        .filter((v: any) => v.dataSourceId === ds.id);

      const tagIds = extractTagIds(ds);
      if (sourceVars.length === 0 && tagIds.length > 0) {
        sourceVars = tagIds.map((tagId: string) => ({
          tagId,
          tagName: tagId,
          dataSourceId: ds.id,
          dataType: 'float',
        }));
      }

      // 构建 tags 数组：DataSourceReader 统一读取 wsStore.tagValues
      const tags = sourceVars.map((v: any) =>
        readTagSnapshot(v.tagId, v.tagName || v.tagId, wsStore),
      );

      // DataSourceReader 统一聚合摘要
      const summary = buildSourceSummary(
        ds,
        sourceVars.map((v: any) => v.tagId),
        sourceVars.map((v: any) => v.tagName || v.tagId),
        wsStore,
      );

      sources.push({
        id: ds.id,
        name: ds.name || ds.id,
        type: ds.type || 'unknown',
        status: ds.enabled !== false ? 'active' : 'paused',
        lastFetchTime: Date.now(),
        lastValue: summary.lastValue,
        updatedAt: summary.updatedAt,
        quality: summary.quality,
        tags,
        wsConnected: wsStore.isConnected,
      });
    }
  }

  dataPanelSources.value = sources;
  } catch (err) {
    console.error('[PreviewCanvas] refreshDataPanel error:', err);
    dataPanelSources.value = [];
  }
}

const syncGraphicsToBackend = () => {
  if (!canvasBackend) {
    console.warn('[PreviewCanvas] syncGraphicsToBackend: canvasBackend is NULL!');
    return;
  }

  const currentIds = new Set<string>();
  const graphics = sortedGraphics.value;
  if (!Array.isArray(graphics)) return;

  initAnimationEngine();

  let canvasBackendUpdateCount = 0;
  for (const graphic of graphics) {
    if (!graphic || !graphic.id) continue;

    // ★ 只将 CANVAS_2D 类型的图元添加到 Canvas2DBackend
    // 与 PageBrowser.vue 的 classifyGraphics() 逻辑对齐
    const backend = RendererRegistry.getBackendForPlugin(graphic as any);
    if (backend !== RenderBackend.CANVAS_2D) {
      continue;
    }

    currentIds.add(graphic.id);

    // ★ 每次同步都重新注入运行态 pageContext，覆盖编辑器注入的 pageContextImpl
    if (graphic && typeof (graphic as any)._setPageContext === 'function') {
      (graphic as any)._setPageContext(animPageContext);
    }

    if (registeredGraphics.has(graphic.id)) {
      canvasBackend.update(graphic);
    } else {
      canvasBackend.render(graphic);
      registeredGraphics.add(graphic.id);
    }
    canvasBackendUpdateCount++;
  }

  for (const id of registeredGraphics) {
    if (!currentIds.has(id)) {
      canvasBackend.remove(id);
      registeredGraphics.delete(id);
    }
  }
  console.log(`[PreviewCanvas.syncGraphicsToBackend] total=${graphics.length}, canvas2d=${canvasBackendUpdateCount}, registered=${registeredGraphics.size}`);
};

/** 刷新页面：从服务端重新加载页面数据，重置缓存，重新计算布局并重绘 */
async function refreshPage(): Promise<void> {
  let freshDataLoaded = false;

  // 1. 优先从后端 API 重新加载当前页面数据
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');
  // 使用当前页面的名称加载，而非 URL 中固定的 pageName（轮播切换时 URL 不变）
  const currentPageForLoad = pageStore.currentPage;
  const currentPageName = currentPageForLoad?.name || urlParams.get('pageName');
  if (projectId && currentPageName) {
    try {
      const response = await pageApi.readPage(projectId, currentPageName);
      // 后端响应可能有多层包装：
      //   无拦截器: { success: true, data: pageJSON }
      //   有拦截器: { data: { success: true, data: pageJSON }, message, timestamp }
      const pageResult = (response as any)?.data || (response as any);
      const pageData = pageResult?.data;
      if (pageData) {
        const currentPage = pageStore.currentPage as BasePage;
        if (currentPage && typeof currentPage.fromJSON === 'function') {
          currentPage.fromJSON(pageData);
          freshDataLoaded = true;
        }
      }
    } catch (err) {
      console.warn('[PreviewCanvas] refreshPage: 从后端 API 重新加载页面失败:', err);
    }
  }

  // 2. 如果无法从 URL 加载，尝试 SaveService（编辑器内预览模式）
  if (!freshDataLoaded && saveServiceManager.isInitialized()) {
    try {
      const projectData = await saveServiceManager.load();
      if (projectData?.pages?.length) {
        const currentPageId = pageStore.currentPage?.id || pageStore.currentPageId;
        const updatedPageData = projectData.pages.find((p: any) => p.id === currentPageId);
        if (updatedPageData) {
            const currentPage = pageStore.currentPage as BasePage;
            if (currentPage && typeof currentPage.fromJSON === 'function') {
              currentPage.fromJSON(updatedPageData);
              freshDataLoaded = true;
            }
          }
      }
    } catch (err) {
      console.warn('[PreviewCanvas] refreshPage: 从 SaveService 重新加载页面数据失败，将使用当前缓存数据刷新:', err);
    }
  }

  // 3. 清除背景图片缓存 + 重试限制
  cachedBgImage = null;
  cachedBgImageSrc = null;
  bgImageRetryCount.clear();
  bgImageExhausted.clear();

  // 4. 重置 Canvas 后端注册的图形
  if (canvasBackend) {
    canvasBackend.clear();
  }
  registeredGraphics.clear();

  // 5. 重新同步图形列表
  syncGraphics();

  // 6. 重新计算布局
  applyAutoFit();

  // 7. 重新加载背景图片
  preloadBackgroundImage();

  // 8. 重绘
  drawCanvas();
}

/**
 * ★ 页面切换（按设计文档 §13.4.3 轮播页面切换链路）
 * Store 驱动，不修改 URL。CarouselManager 和按钮导航统一使用此入口。
 *
 * targetPageId 可能是页面 id（轮播传入）或页面名称（按钮 optionsProvider 使用 p.name 作为 value）。
 * 策略：先按 id 查找，再按 name 查找，统一解析为真实 id 后再操作。
 *
 * 目标页面不在 store 中时，按优先级从 SaveService → IndexedDB → 后端API 加载。
 * 加载完成后执行 stopTimers → applyAutoFit → syncGraphics → startTimers 完整流程。
 */
async function handlePageSwitch(targetPageId: string, oldPageId?: string): Promise<void> {
  // ★ 统一解析：targetPageId 可能是页面名称（按钮下拉 value=p.name）或页面 ID（轮播 value=p.id）
  let resolvedId = targetPageId;
  let existingPage = pageStore.pages.find(p => p.id === targetPageId);
  if (!existingPage) {
    existingPage = pageStore.pages.find(p => p.name === targetPageId);
    if (existingPage) {
      resolvedId = existingPage.id;
      console.log('[PreviewCanvas] handlePageSwitch: 名称→ID 解析:', { name: targetPageId, id: resolvedId });
    }
  }

  // 1. 如果目标页面在 store 中但无图元（IndexedDB 可能存储了空页面），
  //    或者不在 store 中：需要从数据源重新加载
  const pageHasGraphics = existingPage ? getSafeGraphics(existingPage).length > 0 : false;
  if (!existingPage || !pageHasGraphics) {
    if (!existingPage) {
      console.log('[PreviewCanvas] handlePageSwitch: 页面不在 store 中，尝试从数据源加载:', targetPageId);
    } else {
      console.log('[PreviewCanvas] handlePageSwitch: 页面在 store 中但无图元，需要从后端重新加载:', targetPageId);
    }
    let pageData: any = null;

    // 1a. 编辑器内预览：通过 SaveService 加载
    if (saveServiceManager.isInitialized()) {
      try {
        const projectData = await saveServiceManager.load();
        pageData = projectData?.pages?.find((p: any) => p.id === targetPageId || p.name === targetPageId);
        console.log('[PreviewCanvas] handlePageSwitch: SaveService 查找结果:', { found: !!pageData });
      } catch (error) {
        console.warn('[PreviewCanvas] handlePageSwitch: SaveService 加载失败:', error);
      }
    }

    // 1b. 独立预览窗口：通过 IndexedDB 加载（同时支持 id 和 name 匹配）
    if (!pageData) {
      try {
        const allPages = await loadAllPagesData();
        console.log('[PreviewCanvas] handlePageSwitch: IndexedDB 页面列表:',
          allPages.map((p: any) => ({ id: p.data?.id, name: p.data?.name })));
        const pageEntry = allPages.find((p: any) =>
          p.data?.id === targetPageId || p.data?.name === targetPageId);
        pageData = pageEntry?.data;
        console.log('[PreviewCanvas] handlePageSwitch: IndexedDB 查找结果:', {
          targetId: targetPageId, found: !!pageData,
        });
      } catch (error) {
        console.warn('[PreviewCanvas] handlePageSwitch: IndexedDB 加载失败:', error);
      }
    }

    // 1c. 后端 API 兜底
    if (!pageData) {
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('projectId');
      if (projectId) {
        try {
          // targetPageId 可能就是 pageName
          const response = await pageApi.readPage(projectId, targetPageId);
          const result = (response as any)?.data || response;
          pageData = result?.data || result;
        } catch (error) {
          console.warn('[PreviewCanvas] handlePageSwitch: 后端 API 加载失败:', error);
        }
      }
    }

    if (!pageData) {
      console.warn('[PreviewCanvas] handlePageSwitch: 无法加载目标页面:', targetPageId);
      return;
    }

    resolvedId = pageData.id || targetPageId;

    if (existingPage) {
      // 页面已在 store 中但无图元 → 原地刷新数据
      (existingPage as BasePage).fromJSON(pageData);
      console.log('[PreviewCanvas] handlePageSwitch: 页面数据已刷新:', { id: resolvedId, name: pageData.name });
    } else {
      // 页面不在 store 中 → 创建并添加
      const targetPage = new BasePage();
      targetPage.init({
        id: resolvedId,
        name: pageData.name || '',
        width: pageData.width || 1920,
        height: pageData.height || 1080,
        backgroundColor: pageData.backgroundColor || '#FFFFFF',
      });
      targetPage.fromJSON(pageData);
      pageStore.pages = [...pageStore.pages, targetPage];
      console.log('[PreviewCanvas] handlePageSwitch: 页面已加载并添加到 store:', { id: resolvedId, name: pageData.name });
    }
  }

  // 2. 停止旧页定时器
  if (oldPageId) {
    const oldPage = pageStore.pages.find(p => p.id === oldPageId);
    oldPage?.stopTimers?.();
  }

  // 3. 切换到目标页面（Store 驱动）- 使用解析后的真实 ID
  pageStore.setCurrentPage(resolvedId);

  // 4-8. 按 §13.4.3 流程刷新渲染
  applyAutoFit();
  preloadBackgroundImage();
  initAnimationEngine();
  syncGraphics();
  syncGraphicsToBackend();
  drawCanvas();

  // 9. 启动新页定时器
  const newPage = pageStore.currentPage;
  newPage?.startTimers?.();
}

// 绘制画布
const drawCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  syncGraphics();

  if (canvasBackend) {
    syncGraphicsToBackend();
    return;
  }

  // 回退：直接绘制图形（旧路径）
  context.clearRect(0, 0, canvas.width, canvas.height);

  const currentPage = pageStore.currentPage;
  if (currentPage) {
    context.fillStyle = currentPage.backgroundColor || '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (currentPage.backgroundImage) {
      const resolvedBgSrc = resolvePageBgSrc(currentPage.backgroundImage);
      // 已超过重试次数，不再加载（resolvedBgSrc 可空：无效解析时返回 null）
      if (resolvedBgSrc !== null && bgImageExhausted.has(resolvedBgSrc)) {
        // 不显示背景图片
      } else if (cachedBgImage && cachedBgImageSrc === resolvedBgSrc && cachedBgImage.complete) {
        const params = bgImageDrawParams.value;
        context.drawImage(cachedBgImage, params.x, params.y, params.width, params.height);
      } else {
        loadBackgroundImage(currentPage.backgroundImage).then((img) => {
          if (img && img.complete) {
            drawCanvas();
          }
        });
      }
    }
  }

  context.save();
  context.translate(panX.value, panY.value);

  if (computedFitMode.value === 'stretch') {
    context.scale(zoomX.value, zoomY.value);
  } else {
    context.scale(zoom.value, zoom.value);
  }

  const graphics = sortedGraphics.value;
  if (Array.isArray(graphics)) {
    for (let i = 0; i < graphics.length; i++) {
      try {
        const graphic = graphics[i];
        // ★ 只绘制 CANVAS_2D 类型的图元
        const backend = RendererRegistry.getBackendForPlugin(graphic as any);
        if (backend !== RenderBackend.CANVAS_2D) continue;
        if (graphic && typeof graphic.draw === 'function') {
          graphic.draw(context);
        }
      } catch { /* empty */ }
    }
  }

  context.restore();
}

// 设备模拟视口（优化方案 P1-1）：以容器为视口、以设备分辨率为适配目标尺寸，
// 内容在容器内等比居中显示设备比例区域；位图分辨率保持 = 容器尺寸，不做位图拉伸
const changeDevice = () => {
  const device = getActiveDeviceSize();
  scrollbarCompensationApplied = false;
  if (device) {
    applyAutoFit(device.width, device.height);
    scheduleScrollbarCompensation(device.width, device.height);
  } else {
    handleResize();
  }
  drawCanvas();
};

// 缩放功能（滑杆回调）：clamp + 容器中心锚点 + zoomX/zoomY 同步统一由 applyZoom 处理（优化方案 P1-4）
const handleScaleChange = (newScale: number) => {
  // stretch 模式下禁用手动缩放，保护非均匀比例（zoomX/zoomY 仅由 applyAutoFit 设置）
  if (computedFitMode.value === 'stretch') return;
  applyZoom(newScale);
  drawCanvas();
};

// ★ 重置 = 回到自动适配态（对齐编辑态 resetZoom 语义），而非裸 100%（优化方案 C4）
// applyAutoFit 内部已同步 canvasBackend 的 scale/scaleXY/pan/resize；
// 设备模拟选中时重置回到设备适配态（优化方案 P1-1）
const resetZoom = () => {
  const deviceSize = getActiveDeviceSize();
  scrollbarCompensationApplied = false;
  applyAutoFit(deviceSize?.width, deviceSize?.height);
  drawCanvas();
  scheduleScrollbarCompensation(deviceSize?.width, deviceSize?.height);
};

// 鼠标事件处理
const handleMouseDown = (event: MouseEvent) => {
  isDragging.value = true;
  hasDragged.value = false;
  startX.value = event.clientX;
  startY.value = event.clientY;
  startPanX.value = panX.value;
  startPanY.value = panY.value;
};

const handleMouseMove = (event: MouseEvent) => {
  if (isDragging.value) {
    const deltaX = event.clientX - startX.value;
    const deltaY = event.clientY - startY.value;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      hasDragged.value = true;
    }
    panX.value = startPanX.value + deltaX;
    panY.value = startPanY.value + deltaY;
    if (canvasBackend) {
      canvasBackend.setPan(panX.value, panY.value);
    }
    drawCanvas();
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
};

const handleWheel = (event: WheelEvent) => {
  // 只有在按住Ctrl键时才进行缩放
  if (event.ctrlKey) {
    // stretch 模式下禁用缩放，保护非均匀比例
    if (computedFitMode.value === 'stretch') return;
    // 被动模式下 preventDefault 被忽略，缩放计算仍然生效
    // 步进常量化 + clamp + 容器中心锚点统一由 applyZoom 处理（优化方案 P1-4/C3）
    const wheelFactor = event.deltaY > 0
      ? VIEWPORT.PREVIEW_WHEEL_ZOOM_OUT
      : VIEWPORT.PREVIEW_WHEEL_ZOOM_IN;
    applyZoom(zoomValue.value * wheelFactor);
    drawCanvas();
  }
  // 否则不阻止默认事件，允许页面正常滚动
};

// 画布点击事件
const handleCanvasClick = (event: MouseEvent) => {
  // 拖拽操作不触发点击导航
  if (hasDragged.value) return;

  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  
  // 根据是否是stretch模式使用不同的缩放因子计算点击坐标
  const scaleX = computedFitMode.value === 'stretch' ? zoomX.value : zoom.value;
  const scaleY = computedFitMode.value === 'stretch' ? zoomY.value : zoom.value;
  
  const x = (event.clientX - rect.left - panX.value) / scaleX;
  const y = (event.clientY - rect.top - panY.value) / scaleY;

  // 检查是否点击了图形
  const graphics = sortedGraphics.value;
  if (Array.isArray(graphics)) {
    for (let i = graphics.length - 1; i >= 0; i--) {
      const graphic = graphics[i];
      if (graphic && graphic.containsPoint && graphic.containsPoint(x, y)) {
        handleGraphicNavigate(graphic);
        break;
      }
    }
  }
};

/** 处理图元导航（从 customProps 读取导航配置） */
const handleGraphicNavigate = (graphic: IGraphic) => {
  const customProps = (graphic as any).config?.customProps;
  if (!customProps || customProps.targetType === 'none') return;

  if (customProps.targetType === 'page' && customProps.targetPage) {
    const targetPageId = customProps.targetPage;
    const pageExists = pageStore.pages.some(p => p.id === targetPageId);
    if (pageExists) {
      pageStore.setCurrentPage(targetPageId);
    }
  } else if (customProps.targetType === 'url' && customProps.targetUrl) {
    window.open(customProps.targetUrl, '_blank');
  }
};

/**
 * 计算图元边界框并应用自动适配。
 * 位图尺寸行为按容器模式分述（优化方案 P1-3）：
 * - 默认/设备模拟：画布填满容器，无溢出无滚动条；
 * - fitWidth/fitHeight：内容超尺寸时扩展位图分辨率（上限 MAX_BITMAP_SIZE，
 *   超限保持容器尺寸并居中），由 .canvas-wrapper 原生滚动承接溢出，
 *   运行态与控件态行为一致（no-controls 容器同样支持扩展位图 + 滚动，不再降级）。
 * @param targetWidth 设备模拟目标宽（可选）：传入时强制 contain 等比居中，
 *        位图保持容器尺寸，避免位图拉伸变形（优化方案 P1-1）
 * @param targetHeight 设备模拟目标高（可选）
 */
const applyAutoFit = (targetWidth?: number, targetHeight?: number) => {
  const currentPage = pageStore.currentPage as BasePage;
  if (!currentPage) return;

  let panXOffset = 0;
  let panYOffset = 0;

  // 设备模拟时适配目标取设备分辨率，否则取页面尺寸（优化方案 P1-1）
  const pageWidth = targetWidth ?? currentPage.width;
  const pageHeight = targetHeight ?? currentPage.height;
  const isDeviceSimulation = targetWidth !== undefined && targetHeight !== undefined;

  // 优先使用本地临时模式，其次页面属性，最后组件属性，默认auto；
  // 设备模拟强制 contain：内容在容器内等比居中显示设备比例区域（优化方案 P1-1）
  const currentFitMode = isDeviceSimulation
    ? 'contain'
    : (localFitMode.value || currentPage.fitMode || props.fitMode || 'auto');
  computedFitMode.value = currentFitMode;

  // 默认路径：画布填满容器，不产生溢出/滚动条（控件态扩展分支见下方）
  canvasWidth.value = containerWidth.value;
  canvasHeight.value = containerHeight.value;

  // 对stretch模式进行特殊处理（设备模拟不适用：非均匀缩放与等比居中语义冲突）
  if (currentFitMode === 'stretch' && !isDeviceSimulation) {
    // 分别计算x和y轴的缩放因子，使内容完全填充容器
    zoomX.value = containerWidth.value / pageWidth;
    zoomY.value = containerHeight.value / pageHeight;
    resolvedFitMode.value = 'stretch';

    panXOffset = 0;
    panYOffset = 0;

    zoom.value = zoomX.value;
    zoomValue.value = zoomX.value * 100;

    // 背景图：拉伸填满整个画布
    bgImageDrawParams.value = {
      x: 0, y: 0,
      width: canvasWidth.value,
      height: canvasHeight.value,
    };
  } else {
    // 非stretch模式使用ZoomManager计算（缩放范围接入 pageStore 可配置参数，优化方案 C3）
    const result = ZoomManager.calculateScaleByMode(
      currentFitMode,
      pageWidth,
      pageHeight,
      containerWidth.value,
      containerHeight.value,
      defaultAutoFitConfig,
      { minScale: scaleMinPercent.value, maxScale: scaleMaxPercent.value },
    );

    const actualFitMode = result.fitMode;
    const scaleValue = result.scale;

    resolvedFitMode.value = actualFitMode;

    // 设置统一的缩放因子
    zoom.value = scaleValue / 100;
    zoomX.value = zoom.value;
    zoomY.value = zoom.value;
    zoomValue.value = scaleValue;

    // 计算缩放后的尺寸
    const scaledWidth = pageWidth * zoom.value;
    const scaledHeight = pageHeight * zoom.value;

    // 计算偏移量（画布=容器，内容居中或靠边）
    switch (actualFitMode) {
      case 'contain':
        panXOffset = (canvasWidth.value - scaledWidth) / 2;
        panYOffset = (canvasHeight.value - scaledHeight) / 2;
        bgImageDrawParams.value = {
          x: panXOffset, y: panYOffset,
          width: scaledWidth, height: scaledHeight,
        };
        break;
      case 'fitWidth':
        panXOffset = 0;
        panYOffset = scaledHeight > canvasHeight.value ? 0 : (canvasHeight.value - scaledHeight) / 2;
        // 当内容高度超过容器时，扩展画布高度以显示完整内容（控件态/运行态一致），
        // 超限 MAX_BITMAP_SIZE 时保持容器尺寸并居中（优化方案 P1-3）
        if (scaledHeight > canvasHeight.value) {
          if (scaledHeight > VIEWPORT.MAX_BITMAP_SIZE) {
            console.warn(`[PreviewCanvas] fitWidth 扩展位图高度 ${Math.round(scaledHeight)}px 超过上限 ${VIEWPORT.MAX_BITMAP_SIZE}px，已保持容器尺寸并居中显示`);
            panYOffset = (canvasHeight.value - scaledHeight) / 2;
          } else {
            canvasHeight.value = scaledHeight;
          }
        }
        bgImageDrawParams.value = {
          x: 0, y: panYOffset,
          width: scaledWidth, height: scaledHeight,
        };
        break;
      case 'fitHeight':
        panXOffset = scaledWidth > canvasWidth.value ? 0 : (canvasWidth.value - scaledWidth) / 2;
        panYOffset = 0;
        // 当内容宽度超过容器时，扩展画布宽度以显示完整内容（控件态/运行态一致），
        // 超限 MAX_BITMAP_SIZE 时保持容器尺寸并居中（优化方案 P1-3）
        if (scaledWidth > canvasWidth.value) {
          if (scaledWidth > VIEWPORT.MAX_BITMAP_SIZE) {
            console.warn(`[PreviewCanvas] fitHeight 扩展位图宽度 ${Math.round(scaledWidth)}px 超过上限 ${VIEWPORT.MAX_BITMAP_SIZE}px，已保持容器尺寸并居中显示`);
            panXOffset = (canvasWidth.value - scaledWidth) / 2;
          } else {
            canvasWidth.value = scaledWidth;
          }
        }
        bgImageDrawParams.value = {
          x: panXOffset, y: 0,
          width: scaledWidth, height: scaledHeight,
        };
        break;
      default:
        panXOffset = (canvasWidth.value - scaledWidth) / 2;
        panYOffset = (canvasHeight.value - scaledHeight) / 2;
        bgImageDrawParams.value = {
          x: panXOffset, y: panYOffset,
          width: scaledWidth, height: scaledHeight,
        };
    }
  }

  panX.value = panXOffset;
  panY.value = panYOffset;

  if (canvasBackend) {
    if (computedFitMode.value === 'stretch') {
      // stretch 模式需要非均匀缩放，使用 setScaleXY
      if (canvasBackend.setScaleXY) {
        canvasBackend.setScaleXY(zoomX.value, zoomY.value);
      } else {
        canvasBackend.setScale(zoomX.value);
      }
    } else {
      canvasBackend.setScale(zoom.value);
    }
    canvasBackend.setPan(panXOffset, panYOffset);
    // 画布尺寸可能因 fitWidth/fitHeight 模式而扩展，需要同步更新后端
    canvasBackend.resize(canvasWidth.value, canvasHeight.value);
  }

  // 画布尺寸/位置变化后刷新容器组件的画布偏移，避免 DOM 层与 Canvas 层漂移（优化方案 P0-2）
  refreshContainerOffsets();
};

/** 刷新四个图元容器的画布偏移（等 DOM 尺寸生效后读取，优化方案 P0-2） */
const refreshContainerOffsets = () => {
  nextTick(() => {
    vueContainerRef.value?.updateCanvasOffset();
    svgContainerRef.value?.updateCanvasOffset();
    cssContainerRef.value?.updateCanvasOffset();
    threeContainerRef.value?.updateCanvasOffset();
  });
};

// 零尺寸兜底重试（优化方案 P1-2）：隐藏标签页/嵌入式 iframe 挂载时容器尺寸可能为 0，
// 按 PREVIEW_INIT_RETRY_DELAYS 延迟重测，避免 applyAutoFit 得到 zoom≈0 的退化画面，
// 与编辑态 INIT_RETRY_DELAYS 重试机制对齐（00 文档 §7.2）
let zeroSizeRetryCount = 0;
let zeroSizeRetryTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleZeroSizeRetry = () => {
  if (zeroSizeRetryCount >= VIEWPORT.PREVIEW_INIT_MAX_RETRIES) {
    console.warn('[PreviewCanvas] 容器尺寸持续为 0，已放弃适配重试');
    return;
  }
  const delay = VIEWPORT.PREVIEW_INIT_RETRY_DELAYS[zeroSizeRetryCount % VIEWPORT.PREVIEW_INIT_RETRY_DELAYS.length];
  zeroSizeRetryCount++;
  zeroSizeRetryTimer = setTimeout(() => {
    zeroSizeRetryTimer = null;
    handleResize();
  }, delay);
};

// 处理容器大小变化（设备模拟时以设备分辨率为适配目标，优化方案 P1-1）
let pendingResize = false;
// 滚动条补偿：扩展位图（fitWidth/fitHeight）可能触发纵向滚动条出现，使 wrapper 可视宽度收窄，
// 需再适配一次以免内容比可视区宽产生横向滚动条；每次适配动作限一次补偿防振荡
let scrollbarCompensationApplied = false;
const scheduleScrollbarCompensation = (targetWidth?: number, targetHeight?: number) => {
  if (scrollbarCompensationApplied) return;
  scrollbarCompensationApplied = true;
  nextTick(() => {
    const wrapper = wrapperRef.value;
    if (!wrapper || wrapper.clientWidth === containerWidth.value) return;
    containerWidth.value = wrapper.clientWidth;
    containerHeight.value = wrapper.clientHeight;
    applyAutoFit(targetWidth, targetHeight);
    if (canvasBackend) {
      canvasBackend.resize(canvasWidth.value, canvasHeight.value);
    }
    drawCanvas();
  });
};
const handleResize = () => {
  if (pendingResize) return;
  pendingResize = true;
  requestAnimationFrame(() => {
    pendingResize = false;
    if (!props.autoSize || !containerRef.value) return;

    // 优先测量 canvas-wrapper（滚动视口）：clientWidth 已排除纵向滚动条宽度，
    // 若测外层 containerRef，滚动条出现后位图会比可视区宽，引发横向滚动条（滚动条反馈环）
    let measuredWidth: number;
    let measuredHeight: number;
    if (wrapperRef.value) {
      measuredWidth = wrapperRef.value.clientWidth;
      measuredHeight = wrapperRef.value.clientHeight;
    } else {
      const controlsHeight = props.showControls ? (containerRef.value.querySelector('.preview-controls')?.getBoundingClientRect().height || 0) : 0;
      measuredWidth = containerRef.value.clientWidth;
      measuredHeight = containerRef.value.clientHeight - controlsHeight;
    }

    // 容器尺寸为 0 时延迟重试（优化方案 P1-2）
    if (measuredWidth <= 0 || measuredHeight <= 0) {
      scheduleZeroSizeRetry();
      return;
    }
    zeroSizeRetryCount = 0;
    scrollbarCompensationApplied = false;

    containerWidth.value = measuredWidth;
    containerHeight.value = measuredHeight;

    const deviceSize = getActiveDeviceSize();
    applyAutoFit(deviceSize?.width, deviceSize?.height);

    if (canvasBackend) {
      canvasBackend.resize(canvasWidth.value, canvasHeight.value);
    }

    drawCanvas();

    // 滚动条补偿：首次适配若因扩展位图触发纵向滚动条，按收窄后的可视宽度再适配一次（限一次）
    scheduleScrollbarCompensation(deviceSize?.width, deviceSize?.height);
  });
};

// ★ 页面切换 Watch（Store 驱动，按设计文档 §13.4.3）
// 监视 currentPageId 变化，统一调用 handlePageSwitch。
// CarouselManager.next() 和按钮导航都通过 pageStore.setCurrentPage() 触发此 watch。
watch(
  () => pageStore.currentPageId,
  (newId, oldId) => {
    // 首次挂载时 oldId 为 undefined，跳过（由 onMounted 处理初始绘制）
    if (!oldId || newId === oldId) return;
    handlePageSwitch(newId, oldId);
  }
);

// 页面尺寸变化兜底 watch（背景色/fitMode 已有独立 watch；页面切换由 currentPageId watch 统一处理，
// 避免与其双触发导致 applyAutoFit 执行两次，优化方案 P2-2）
watch(
  () => {
    const page = pageStore.currentPage as BasePage | null;
    return page ? `${page.width}x${page.height}` : '';
  },
  (newSize, oldSize) => {
    if (!oldSize || newSize === oldSize) return;
    applyAutoFit();
    drawCanvas();
  }
);

// 监听适配模式变化
watch(
  () => props.fitMode,
  () => {
    applyAutoFit();
    drawCanvas();
  }
);

// 监听页面属性中的fitMode变化
watch(
  () => (pageStore.currentPage as BasePage)?.fitMode,
  (newFitMode) => {
    if (newFitMode) {
      applyAutoFit();
      drawCanvas();
    }
  }
);

// 监听背景图片变化，预加载新图片
watch(
  () => (pageStore.currentPage as BasePage)?.backgroundImage,
  (newBgImage) => {
    if (newBgImage) {
      preloadBackgroundImage();
    } else {
      cachedBgImage = null;
      cachedBgImageSrc = null;
      drawCanvas();
    }
    // 更换背景图片时，清除旧的失败计数
    if (newBgImage) {
      bgImageRetryCount.delete(resolveAssetPath(newBgImage));
      bgImageExhausted.delete(resolveAssetPath(newBgImage));
    }
  }
);

// === 轮播功能 ===

/**
 * 执行页面切换（store 驱动，不动 URL）
 */
function performPageSwitch(pageId: string): void {
  pageStore.setCurrentPage(pageId);
  // 后续由 watch(currentPageId) / watch(currentPage) 自动触发渲染更新
}

/**
 * 轮播页面切换回调（支持过渡效果）
 */
function handleCarouselPageSwitch(pageId: string): void {
  if (carouselConfig.value.transition !== 'none') {
    executeTransition(pageId, carouselConfig.value.transition);
  } else {
    performPageSwitch(pageId);
  }
}

/**
 * 过渡动画执行
 */
function executeTransition(pageId: string, type: string): void {
  carouselManager.value?.pause();
  transitionClass.value = `carousel-transition-${type}`;
  setTimeout(() => {
    performPageSwitch(pageId);
    transitionClass.value = '';
    carouselManager.value?.resume();
  }, 300);
}

/**
 * 轮播配置保存
 */
function handleCarouselConfigSave(config: CarouselConfig): void {
  carouselConfig.value = { ...config };
  carouselManager.value?.updateConfig(config);
  emit('carouselConfigChanged', config);
}

/**
 * 初始化轮播管理器
 */
function initCarousel(): void {
  console.log('[PreviewCanvas] initCarousel 开始:', {
    enabled: carouselConfig.value.enabled,
    autoStart: carouselConfig.value.autoStart,
    interval: carouselConfig.value.interval,
    pageCount: pageStore.pages.length,
  });

  if (!carouselManager.value) {
    carouselManager.value = new CarouselManager(
      carouselConfig.value,
      handleCarouselPageSwitch,
    );
  }

  const pages = pageStore.pages.map((p: { id: string; name: string }, i: number) => ({
    id: p.id,
    name: p.name,
    index: i,
  }));
  carouselManager.value.buildCarouselPages(pages);
  carouselState.value = { ...carouselManager.value.getState() } as CarouselState;

  console.log('[PreviewCanvas] initCarousel 页面列表:', {
    carouselPages: carouselState.value.carouselPages,
    count: carouselState.value.carouselPages.length,
  });

  // 定时同步轮播状态到响应式 ref（驱动 UI 更新：圆点、进度、计时器等）
  if (carouselStateTimer.value) clearInterval(carouselStateTimer.value);
  carouselStateTimer.value = setInterval(() => {
    if (carouselManager.value) {
      carouselState.value = { ...carouselManager.value.getState() } as CarouselState;
    }
  }, 100);

  // 自动开始轮播（需页面数大于1 且 autoStart=true）
  if (carouselConfig.value.autoStart && carouselState.value.carouselPages.length > 1) {
    console.log('[PreviewCanvas] initCarousel: autoStart=true, 启动轮播');
    carouselManager.value.start();
  } else {
    console.log('[PreviewCanvas] initCarousel: 未自动启动', {
      autoStart: carouselConfig.value.autoStart,
      pageCount: carouselState.value.carouselPages.length,
    });
  }
}

// === 轮播功能结束 ===

// 监听外部传入的轮播配置变化（如从项目配置异步加载）
watch(
  () => props.carouselConfig,
  (newConfig) => {
    if (newConfig) {
      carouselConfig.value = { ...DEFAULT_CAROUSEL_CONFIG, ...newConfig };
    }
  },
);

// 组件挂载后绘制画布
onMounted(() => {
  pageStore.setPageMode('preview');
  nextTick(() => {
    if (canvasRef.value) {
      // 确保 canvas 初始尺寸有效：优先读容器实际尺寸（此前 canvasWidth 初始即命中 props.width，
      // 兜底链永远用不到容器实测值，优化方案 P1-2）
      const initWidth = containerRef.value?.clientWidth || canvasWidth.value || window.innerWidth || 1024;
      const initHeight = containerRef.value?.clientHeight || canvasHeight.value || window.innerHeight || 768;

      canvasBackend = new Canvas2DBackend(canvasRef.value as HTMLElement, {
        canvas: canvasRef.value,
        width: initWidth,
        height: initHeight,
        renderMode: 'canvas' as const,
        onBackgroundRender: (ctx: CanvasRenderingContext2D) => {
          try {
            const currentPage = pageStore.currentPage;
            const resolvedSrc = resolvePageBgSrc(currentPage?.backgroundImage);
            const isExhausted = resolvedSrc ? bgImageExhausted.has(resolvedSrc) : false;
            if (currentPage) {
              // 背景色填满整个画布
              const bgColor = currentPage.backgroundColor;
              if (bgColor && bgColor !== 'transparent') {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvasRef.value!.width, canvasRef.value!.height);
              }
              // 背景图片按 fitMode 统一绘制
              const shouldDrawBgImage = currentPage.backgroundImage
                && !isExhausted
                && cachedBgImage?.complete
                && cachedBgImageSrc === resolvedSrc;
              if (shouldDrawBgImage && cachedBgImage) {
                const params = bgImageDrawParams.value;
                ctx.drawImage(cachedBgImage, params.x, params.y, params.width, params.height);
              }
            }

            // ★ 诊断标记（受 showDiagnosticOverlay 控制）
            if (showDiagnosticOverlay.value) {
              const cw = canvasRef.value?.width || 0;
              const ch = canvasRef.value?.height || 0;
              if (cw > 0 && ch > 0) {
                ctx.save();
                // 半透明红色覆盖层（验证 canvas 是否可见）
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.fillRect(0, 0, cw, ch);
                // 黄色边框
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 6;
                ctx.strokeRect(3, 3, cw - 6, ch - 6);
                // 四角三角形
                ctx.fillStyle = '#FF0000';
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, 0); ctx.lineTo(0, 60); ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cw, 0); ctx.lineTo(cw-60, 0); ctx.lineTo(cw, 60); ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, ch); ctx.lineTo(60, ch); ctx.lineTo(0, ch-60); ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cw, ch); ctx.lineTo(cw-60, ch); ctx.lineTo(cw, ch-60); ctx.closePath();
                ctx.fill(); ctx.stroke();
                // 居中文本
                ctx.fillStyle = '#FFFF00';
                ctx.font = 'bold 28px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('CANVAS 诊断', cw/2, ch/2 - 20);
                ctx.font = '16px sans-serif';
                ctx.fillText(`${cw} x ${ch}`, cw/2, ch/2 + 20);
                ctx.restore();
              }
            }
          } catch (e) {
            console.warn('[PreviewCanvas] onBackgroundRender error:', e);
          }
        },
      });
    }

    if (props.autoSize) {
      handleResize();
      if (containerRef.value) {
        // 设备模拟时容器变化同样需要重新适配（以设备分辨率为目标，优化方案 P1-1），
        // 零尺寸场景由 handleResize 内部重试链接管（优化方案 P1-2）
        resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        resizeObserver.observe(containerRef.value);
      }
    } else {
      applyAutoFit();
    }

    initAnimationEngine();
    preloadBackgroundImage();
    drawCanvas();

    // ★ 诊断：使用统一的诊断方法
    const _diagResult = runCanvasDiagnostics();

    // ★ 连接脚本引擎的图元变更处理器到 Canvas2DBackend
    // 使 moveGraphic / setGraphicProps 等脚本 API 能直接更新运行态渲染
    const scriptEngine = ScriptEngine.getInstance();
    scriptEngine.setGraphicChangeHandler((graphicId: string, props: Record<string, any>) => {
      if (!canvasBackend) return;
      const graphic = canvasBackend.getGraphic(graphicId);
      if (!graphic) return;

      // 更新图元位置
      if (typeof props.x === 'number' || typeof props.y === 'number') {
        const pos = graphic.getPosition();
        const newX = typeof props.x === 'number' ? props.x : pos.x;
        const newY = typeof props.y === 'number' ? props.y : pos.y;
        graphic.setPosition(newX, newY);
      }

      // 更新可见性
      if (typeof props.visible === 'boolean') {
        graphic.setVisible(props.visible);
      }

      // 更新旋转角度
      if (typeof props.rotation === 'number') {
        graphic.setRotation(props.rotation);
      }

      // 更新自定义属性
      const customProps: Record<string, any> = {};
      for (const [key, value] of Object.entries(props)) {
        if (!['x', 'y', 'visible', 'rotation'].includes(key)) {
          customProps[key] = value;
        }
      }
      if (Object.keys(customProps).length > 0) {
        if (typeof (graphic as any).setPluginProps === 'function') {
          (graphic as any).setPluginProps(customProps as any);
        }
      }

      // 通知 Canvas2DBackend 更新
      canvasBackend.update(graphic);
    });

    // 启动页面定时器（运行态核心功能）
    const currentPage = pageStore.currentPage as BasePage | null;
    if (currentPage && typeof currentPage.startTimers === 'function') {
      currentPage.startTimers();
    }

    // 初始化轮播管理器
    initCarousel();

    // ★ 监听 DataSourceManager/EventBus 的 tagValueChanged 事件（HTTP轮询/Static/表达式等驱动统一走 EventBus）
    // 数据到达后调用 syncGraphics() 生成新数组引用 + drawCanvas() 重绘 Canvas 2D 图元（如 Label）
    // （BindingManager.handleDataUpdate 只修改 graphic.config 内部属性，不触发 Canvas 重绘）
    tagValueUnsubscribeFn = ScadaDataManager.eventBus.on('tagValueChanged', (event: unknown) => {
      const payload = (event as any)?.payload;
      console.log(`[PreviewCanvas] tagValueChanged event: tagId=${payload?.tagId?.slice(0,8) || '?'}, value=${String(payload?.value || '').slice(0,20)}`);
      syncGraphics();
      drawCanvas();
    });
  });
});

onUnmounted(() => {
  pageStore.setPageMode('edit');

  // 清理 EventBus tagValueChanged 监听
  if (tagValueUnsubscribeFn) {
    tagValueUnsubscribeFn();
    tagValueUnsubscribeFn = null;
  }

  // 清理数据面板自动刷新定时器
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }

  // 清理轮播管理器
  if (carouselStateTimer.value) clearInterval(carouselStateTimer.value);
  carouselManager.value?.destroy();
  carouselManager.value = null;
  // 清理脚本引擎的图元变更处理器
  ScriptEngine.getInstance().setGraphicChangeHandler(null);
  
  // 停止页面定时器，清除 window.setInterval/setTimeout 句柄
  const currentPage = pageStore.currentPage as BasePage | null;
  if (currentPage && typeof currentPage.stopTimers === 'function') {
    currentPage.stopTimers();
  }
  
  if (animEngine) {
    animEngine.destroy();
    animEngine = null;
  }
  animInitialized = false;

  if (canvasBackend) {
    canvasBackend.destroy();
    canvasBackend = null;
  }
  registeredGraphics.clear();
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  if (zeroSizeRetryTimer) {
    clearTimeout(zeroSizeRetryTimer);
    zeroSizeRetryTimer = null;
  }
});
</script>

<style scoped>
.preview-canvas-container {
  position: relative;
  border: 1px solid var(--border, #ccc);
  background-color: var(--background, #f5f5f5);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.preview-controls {
  display: flex;
  gap: 10px;
  padding: 10px;
  background-color: var(--surface, #e0e0e0);
  border-bottom: 1px solid var(--border, #ccc);
  align-items: center;
  flex-shrink: 0;
}

.preview-controls select {
  padding: 5px 10px;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--surface, #ffffff);
  color: var(--text, #333333);
}

.fit-mode-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  color: var(--text, #333333);
  background-color: var(--surface, #ffffff);
  border: 1px solid var(--border, #ccc);
}

.zoom-button {
  padding: 5px 10px;
  border: 1px solid var(--control-button-border, #ccc);
  border-radius: 4px;
  background-color: var(--control-button-background, #f5f5f5);
  color: var(--control-button-text, #333333);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.zoom-button:hover {
  background-color: var(--control-button-hover, #d0d0d0);
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  position: relative;
  cursor: grab;
  background-color: var(--background, #f5f5f5);
}

.canvas-content-area {
  position: relative;
  display: inline-block;
}

.canvas-wrapper:active {
  cursor: grabbing;
}

.canvas-wrapper.no-controls {
  cursor: default;
  /* 与控件态一致：允许扩展位图（fitWidth/fitHeight）原生滚动，不再强制裁剪 */
  overflow: auto;
  display: flex;
  padding: 0;
  width: 100%;
  height: 100%;
}

/* stretch 模式：填充整个容器，无 padding，无滚动条（声明在 no-controls 之后以覆盖其 overflow） */
.canvas-wrapper.stretch-mode {
  overflow: hidden;
  padding: 0;
}

.canvas-wrapper.stretch-mode .canvas-content-area {
  display: block;
  width: 100%;
  height: 100%;
}

/* 安全居中：内容小于容器时 margin:auto 居中，大于容器时退化为顶/左对齐可滚动，
 * 避免 flex 强制居中导致溢出部分被裁剪无法滚达（content-area 保持位图自然尺寸） */
.canvas-wrapper.no-controls .canvas-content-area {
  margin: auto;
}

/* 按实际生效模式锁定滚动轴：适应宽度不应出现横向滚动条（亚像素舍入、越界图元、
 * 滚动条补偿残差均不得引发多余滚动条），适应高度同理锁定纵轴 */
.canvas-wrapper.fit-width-mode {
  overflow-x: hidden;
}

.canvas-wrapper.fit-height-mode {
  overflow-y: hidden;
}

/* 预览模式下 canvas 填满容器（背景用主题变量，透明背景页面由页面 backgroundColor 接管，优化方案 P2-1a） */
.preview-canvas {
  display: block;
  margin: 0;
  background-color: var(--surface);
  box-shadow: none;
}

/* 轮播过渡效果 */
.preview-canvas-container.carousel-transition-fade {
  transition: opacity 0.3s ease;
  opacity: 1;
}

.preview-canvas-container.carousel-transition-fade.transition-out {
  opacity: 0;
}

.preview-canvas-container.carousel-transition-slide-left {
  transition: transform 0.3s ease;
  transform: translateX(0);
}

.preview-canvas-container.carousel-transition-slide-left.transition-out {
  transform: translateX(-10%);
}

.preview-canvas-container.carousel-transition-slide-right {
  transition: transform 0.3s ease;
  transform: translateX(0);
}

.preview-canvas-container.carousel-transition-slide-right.transition-out {
  transform: translateX(10%);
}
</style>