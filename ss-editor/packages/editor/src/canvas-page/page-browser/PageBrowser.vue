<template>
  <div
    ref="rootRef"
    class="page-browser"
    :style="rootStyle"
  >
    <!-- Canvas 2D 渲染层 —— 始终在 DOM 中，避免 v-if 导致 canvasRef 失效 -->
    <canvas
      ref="canvasRef"
      :width="pageWidth"
      :height="pageHeight"
      :style="canvasStyle"
      class="page-browser-canvas"
    />

    <!-- Vue 组件渲染层 -->
    <div class="page-browser-vue-layer">
      <template v-if="vueComponents.length > 0">
        <component
          :is="item.componentDef"
          v-for="item in vueComponents"
          :key="item.id"
          :style="item.style"
          v-bind="item.componentProps"
        />
      </template>
    </div>

    <!-- SVG 渲染层 -->
    <div class="page-browser-svg-layer">
      <div
        v-for="g in svgGraphics"
        :key="g.id"
        :style="getGraphicStyle(g)"
        v-html="getGraphicHtml(g)"
      />
    </div>

    <!-- CSS 渲染层 -->
    <div class="page-browser-css-layer">
      <div
        v-for="g in cssGraphics"
        :key="g.id"
        :style="getGraphicStyle(g)"
        v-html="getGraphicHtml(g)"
      />
    </div>

    <!-- Three.js 渲染层 -->
    <div class="page-browser-three-layer">
      <div
        v-for="g in threeGraphics"
        :key="g.id"
        :ref="(el) => mountThreeGraphic(g, el as HTMLElement)"
        :style="getGraphicStyle(g)"
      />
    </div>

    <!-- 加载中叠加层 -->
    <div
      v-show="loading"
      class="page-browser-loading"
    >
      <span>{{ t('page-browser.loading') }}</span>
    </div>

    <!-- 加载失败叠加层 -->
    <div
      v-show="error"
      class="page-browser-error"
    >
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, type PropType, type Component } from 'vue';
import type { IGraphic } from '@scada-editor/plugin-sdk';
import {
  RendererRegistry,
} from '@scada-editor/core';
import {
  GraphicFactory,
  RenderBackend,
  GraphicComponentRegistry,
} from '@scada-editor/plugin-sdk';
import { Canvas2DBackend, usePageStore, i18n, saveServiceManager } from '@scada-editor/core';
import { loadImageWithAuth } from '../../utils/loadImageWithAuth';

const { t } = i18n.global;

// ─── Props ───
const props = defineProps({
  pageName: { type: String, default: '' },
  displayMode: { type: String as () => 'tile' | 'actual' | 'stretch', default: 'stretch' },
  borderStyle: { type: String as () => 'none' | 'solid' | 'dashed' | 'dotted', default: 'solid' },
  borderWidth: { type: Number, default: 1 },
  borderColor: { type: String, default: '#CCCCCC' },
  backgroundColor: { type: String, default: '#FFFFFF' },
  width: { type: Number, default: 400 },
  height: { type: Number, default: 300 },
  /** 页面数据加载完成回调：将 PageBrowser 尺寸调整为目标页面尺寸，使选择框与实际内容匹配 */
  onPageLoaded: { type: Function as PropType<(pageWidth: number, pageHeight: number) => void>, default: null },
});

// ─── 状态 ───
const rootRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const pageWidth = ref(800);
const pageHeight = ref(600);
const loading = ref(false);
const error = ref<string | null>(null);

// 页面背景 —— 从目标页面数据中读取，未设置时默认透明
const pageBackgroundColor = ref<string | null>(null);
const pageBackgroundImage = ref<string | null>(null);
const pageBackgroundImageEl = ref<HTMLImageElement | null>(null);

// 分类后的图元
const canvas2dGraphics = ref<IGraphic[]>([]);
const vueGraphics = ref<IGraphic[]>([]);
const svgGraphics = ref<IGraphic[]>([]);
const cssGraphics = ref<IGraphic[]>([]);
const threeGraphics = ref<IGraphic[]>([]);

// 缩放（zoomX/zoomY 支持非等比拉伸）
const zoomX = ref(1);
const zoomY = ref(1);

// Canvas2DBackend
let canvasBackend: Canvas2DBackend | null = null;

// Three.js 挂载记录
const threeMounts = new Map<string, HTMLElement>();

// 容器尺寸监听器
let resizeObserver: ResizeObserver | null = null;

// ─── 缩放计算 ───
function recalculateZoom(): void {
  if (pageWidth.value <= 0 || pageHeight.value <= 0) return;

  const cw = rootRef.value?.clientWidth || props.width;
  const ch = rootRef.value?.clientHeight || props.height;

  if (props.displayMode === 'stretch') {
    zoomX.value = cw / pageWidth.value;
    zoomY.value = ch / pageHeight.value;
  } else if (props.displayMode === 'tile') {
    const z = Math.min(cw / pageWidth.value, ch / pageHeight.value);
    zoomX.value = z;
    zoomY.value = z;
  } else {
    zoomX.value = 1;
    zoomY.value = 1;
  }
}

// ─── 计算样式 ───
const rootStyle = computed(() => ({
  width: '100%',
  height: '100%',
  border: props.borderStyle !== 'none'
    ? `${props.borderWidth}px ${BORDER_STYLE_MAP[props.borderStyle]} ${props.borderColor}`
    : 'none',
  backgroundColor: pageBackgroundColor.value || 'transparent',
  overflow: 'hidden',
  position: 'relative' as const,
}));

const canvasStyle = computed(() => {
  if (props.displayMode === 'stretch') {
    // 拉伸满屏：不保持比例，分别计算 X/Y 缩放
    return {
      transform: `scale(${zoomX.value}, ${zoomY.value})`,
      transformOrigin: 'top left',
      width: `${pageWidth.value}px`,
      height: `${pageHeight.value}px`,
    };
  }
  if (props.displayMode === 'tile') {
    const cw = rootRef.value?.clientWidth || props.width;
    const ch = rootRef.value?.clientHeight || props.height;
    const scale = Math.min(cw / pageWidth.value, ch / pageHeight.value);
    return {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${pageWidth.value}px`,
      height: `${pageHeight.value}px`,
    };
  }
  return {
    width: `${pageWidth.value}px`,
    height: `${pageHeight.value}px`,
  };
});

const BORDER_STYLE_MAP: Record<string, string> = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
};

// ─── Vue 组件列表 ───
const vueComponents = computed(() => {
  return vueGraphics.value
    .filter((g: any) => g.componentName)
    .map((g: any) => {
      const def = GraphicComponentRegistry.get(g.componentName);
      if (!def) return null;
      return {
        id: g.id,
        componentDef: def,
        style: getGraphicStyle(g),
        componentProps: g.getComponentProps?.() || {},
      };
    })
    .filter(Boolean) as Array<{ id: string; componentDef: Component; style: Record<string, string>; componentProps: Record<string, any> }>;
});

// ─── 图元样式 ───
function getGraphicStyle(g: any): Record<string, string> {
  const pos = g.getPosition?.() || g.config?.geometry || { x: 0, y: 0 };
  const size = g.getSize?.() || g.config?.geometry || { width: 0, height: 0 };
  const rotation = g.getRotation?.() ?? g.config?.geometry?.rotation ?? 0;
  return {
    position: 'absolute',
    left: `${pos.x * zoomX.value}px`,
    top: `${pos.y * zoomY.value}px`,
    width: `${size.width * zoomX.value}px`,
    height: `${size.height * zoomY.value}px`,
    transform: `rotate(${rotation}deg)`,
    pointerEvents: 'none',
    overflow: 'hidden',
  };
}

// ─── SVG/CSS 图元 HTML ───
function getGraphicHtml(g: any): string {
  if (typeof g.getSvgTemplate === 'function') {
    return g.getSvgTemplate(g.props);
  }
  if (typeof g.getHtmlTemplate === 'function') {
    return g.getHtmlTemplate(g.props);
  }
  return '';
}

// ─── Three.js 图元挂载 ───
function mountThreeGraphic(g: any, el: HTMLElement | null): void {
  if (!el || threeMounts.has(g.id)) return;
  threeMounts.set(g.id, el);
  if (typeof g.mount === 'function') {
    g.mount(el);
  }
}

// ─── 图元分类 ───
function classifyGraphics(graphics: IGraphic[]): void {
  const c2d: IGraphic[] = [];
  const vue: IGraphic[] = [];
  const svg: IGraphic[] = [];
  const css: IGraphic[] = [];
  const three: IGraphic[] = [];

  for (const g of graphics) {
    try {
      const backend = RendererRegistry.getBackendForPlugin(g as any);
      switch (backend) {
        case RenderBackend.CANVAS_2D:     c2d.push(g); break;
        case RenderBackend.VUE_COMPONENT:  vue.push(g); break;
        case RenderBackend.SVG_DOM:       svg.push(g); break;
        case RenderBackend.CSS_DOM:       css.push(g); break;
        case RenderBackend.THREE_3D:      three.push(g); break;
      }
    } catch {
      c2d.push(g);
    }
  }

  canvas2dGraphics.value = c2d.sort((a, b) => (a.config?.zIndex ?? 0) - (b.config?.zIndex ?? 0));
  vueGraphics.value = vue;
  svgGraphics.value = svg;
  cssGraphics.value = css;
  threeGraphics.value = three;
}

// ─── 加载页面数据 ───
async function loadPageData(): Promise<void> {
  if (!props.pageName) return;

  loading.value = true;
  error.value = null;

  try {
    // 从 pageStore 中查找（已打开的页面）—— 优先使用内存中的数据
    let targetPageData: { width: number; height: number; graphics: any[] } | null = null;
    const pageStore = usePageStore();
    const targetPage = pageStore.pages.find(p => p.name === props.pageName);

    if (targetPage) {
      targetPageData = {
        width: targetPage.width || 800,
        height: targetPage.height || 600,
        graphics: (targetPage.graphics || []) as any[],
      };
      pageBackgroundColor.value = targetPage.backgroundColor || null;
      pageBackgroundImage.value = targetPage.backgroundImage || null;
    }

    // pageStore 中找不到时，尝试从项目持久化数据加载指定页面
    if (!targetPageData) {
      try {
        const projectData = await saveServiceManager.load();
        if (projectData?.pages) {
          const pageData = projectData.pages.find(p => p.name === props.pageName);
          if (pageData) {
            targetPageData = {
              width: pageData.width,
              height: pageData.height,
              graphics: pageData.graphics || [],
            };
            pageBackgroundColor.value = pageData.backgroundColor || null;
            pageBackgroundImage.value = pageData.backgroundImage || null;
          }
        }
      } catch {
        // 保存服务不可用或未初始化，静默处理
      }
    }

    // 两种方式都没找到，报告页面不存在
    if (!targetPageData) {
      error.value = props.pageName + t('page-browser.errors.pageNotFound');
      loading.value = false;
      return;
    }

    pageWidth.value = targetPageData.width || 800;
    pageHeight.value = targetPageData.height || 600;

    // 反序列化图元
    // 注意：从 pageStore 获取的 graphics 已是 IGraphic 实例（已由 BasePage.fromJSON 反序列化），
    // 需要先通过 toJSON() 转回原始 JSON 再反序列化，否则 createGraphicFromJSON 无法正确提取几何信息。
    const rawGraphics = targetPageData.graphics || [];

    const allGraphics = rawGraphics
      .map((g: any) => {
        try {
          const jsonData = typeof g.toJSON === 'function' ? g.toJSON() : g;
          return GraphicFactory.createGraphicFromJSON(jsonData);
        }
        catch (e) {
          console.warn(`[PageBrowser] Failed to create graphic:`, typeof g.toJSON === 'function' ? g.type : g?.type, e);
          return null;
        }
      })
      .filter(Boolean) as IGraphic[];

    // 分类
    classifyGraphics(allGraphics);

    // 计算缩放（基于实际容器尺寸，确保与编辑器缩放一致）
    recalculateZoom();

    // 预加载页面背景图片
    await preloadPageBackgroundImage();

    await nextTick();
    initCanvasBackend();
    syncCanvasGraphics();

    // 通知外部页面已加载完成，自动将 PageBrowser 尺寸调整为目标页面尺寸
    // 使编辑器中的选择框与实际页面内容尺寸一致
    if (typeof props.onPageLoaded === 'function') {
      props.onPageLoaded(pageWidth.value, pageHeight.value);
    }
  } catch (err: any) {
    error.value = err?.message || t('page-browser.errors.loadFailed');
    console.warn(`[PageBrowser] Failed to load page: ${props.pageName}`, err);
  } finally {
    loading.value = false;
  }
}

// ─── 预加载页面背景图片 ───
async function preloadPageBackgroundImage(): Promise<void> {
  pageBackgroundImageEl.value = null;
  const src = pageBackgroundImage.value;
  if (!src) return;

  try {
    const img = await loadImageWithAuth(src);
    pageBackgroundImageEl.value = img;
  } catch {
    console.warn(`[PageBrowser] Failed to load background image: ${src}`);
  }
}

// ─── Canvas2DBackend ───
function initCanvasBackend(): void {
  if (canvasBackend) {
    canvasBackend.destroy();
  }

  if (!canvasRef.value) {
    console.warn('[PageBrowser] canvasRef not available');
    return;
  }

  canvasBackend = new Canvas2DBackend(canvasRef.value as HTMLElement, {
    canvas: canvasRef.value,
    width: pageWidth.value,
    height: pageHeight.value,
    renderMode: 'canvas',
    onBackgroundRender: (ctx: CanvasRenderingContext2D) => {
      // 绘制背景色（无背景色时保持透明，不填充）
      const bgColor = pageBackgroundColor.value;
      if (bgColor && bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, pageWidth.value, pageHeight.value);
      }
      // 绘制背景图片（异步加载，加载完成后自动出现在下一帧）
      const bgImage = pageBackgroundImageEl.value;
      if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
        ctx.drawImage(bgImage, 0, 0, pageWidth.value, pageHeight.value);
      }
    },
  });
}

function syncCanvasGraphics(): void {
  if (!canvasBackend) return;
  for (const g of canvas2dGraphics.value) {
    canvasBackend.render(g);
  }
}

// ─── 生命周期 ───
onMounted(async () => {
  await nextTick();

  // 监听容器尺寸变化（编辑器缩放/geometry 调整时自动重算 zoom）
  if (rootRef.value) {
    resizeObserver = new ResizeObserver(() => {
      recalculateZoom();
    });
    resizeObserver.observe(rootRef.value);
  }

  await loadPageData();
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (canvasBackend) {
    canvasBackend.destroy();
    canvasBackend = null;
  }
  // 卸载 Three.js 图元
  for (const [id, _el] of threeMounts) {
    const g = threeGraphics.value.find(g => g.id === id);
    if (g && typeof (g as any).unmount === 'function') {
      (g as any).unmount();
    }
  }
  threeMounts.clear();
});

// 监听 pageName 变化
watch(() => props.pageName, () => { loadPageData(); });

// 监听 pageStore.pages 变化，当页面数据加载完成时重试
// 解决预览模式下 pageStore 延迟加载导致找不到目标页面的问题
watch(
  () => usePageStore().pages.map(p => p.name),
  () => {
    if (error.value && props.pageName) {
      loadPageData();
    }
  },
);

// 监听 displayMode 变化
watch(() => props.displayMode, () => {
  recalculateZoom();
});

// 监听 geometry 变化
watch(() => [props.width, props.height], () => {
  if (pageWidth.value > 0 && pageHeight.value > 0) {
    recalculateZoom();
  }
});
</script>

<style scoped>
.page-browser {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.page-browser-canvas {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}

.page-browser-vue-layer,
.page-browser-svg-layer,
.page-browser-css-layer,
.page-browser-three-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}

.page-browser-loading,
.page-browser-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #999;
  background: rgba(255, 255, 255, 0.85);
  z-index: 100;
}

.page-browser-error {
  color: #FF4444;
}
</style>