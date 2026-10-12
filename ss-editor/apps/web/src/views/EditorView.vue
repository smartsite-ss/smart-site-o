<template>
  <div
    class="app"
    :style="themeStyles"
  >
    <!-- 顶部工具栏 -->
    <header class="app-header">
      <AppHeader
        @open-settings="openSettings"
        @save="manualSave"
        @open-project="handleOpenProject"
        @close-project="handleCloseProject"
        @export-project="handleExportProject"
        @import-project="handleImportProject"
      />
    </header>

    <!-- 模板编辑模式提示栏 -->
    <div v-if="isTemplateEditMode" class="template-edit-banner">
      <span class="template-edit-banner-icon">📐</span>
      <span class="template-edit-banner-text">{{ t('system.canvasTemplate.editing') }}</span>
      <button class="template-edit-banner-btn" @click="router.push('/system/canvas-templates')">
        {{ t('system.canvasTemplate.backToList') }}
      </button>
    </div>
    
    <!-- 主内容区域 -->
    <main class="app-content">
      <!-- 左侧图层面板 -->
      <aside 
        v-if="configStore.ui.showLayerPanel !== false"
        class="app-layer" 
        :class="{ collapsed: leftPanelCollapsed }"
        :style="{ width: leftPanelCollapsed ? configStore.ui.collapsedPanelWidth + 'px' : leftPanelWidth + 'px' }"
      >
        <!-- 折叠切换按钮 -->
        <button
          class="panel-toggle-btn"
          :class="{ expanded: !leftPanelCollapsed }"
          :data-tooltip="leftPanelCollapsed ? t('editor.expandPanel') : t('editor.collapsePanel')"
          @click="toggleLeftPanel"
        >
          <span class="toggle-icon">{{ leftPanelCollapsed ? '›' : '‹' }}</span>
        </button>
        
        <!-- 内容 -->
        <div
          v-show="!leftPanelCollapsed"
          class="panel-content"
        >
          <SidePanel />
        </div>
        
        <!-- 拖拽手柄 -->
        <div 
          v-show="!leftPanelCollapsed"
          class="resize-handle right"
          @mousedown="startLeftResize"
        />
      </aside>
      
      <!-- 中央设计区域 -->
      <div class="app-main">
        <!-- 项目恢复期 loading 覆盖层：从挂载到 restoreProject 完成期间显示 -->
        <div
          v-if="projectLoading"
          class="app-main-loading"
        >
          <SsLoading
            text="正在恢复项目"
            size="medium"
          />
        </div>
        <div
          class="app-canvas"
          :class="{ 'app-canvas--hidden': projectLoading }"
        >
          <!-- 画布工具栏 -->
          <div
            v-if="configStore.ui.showToolbar !== false"
            class="canvas-controls"
          >
            <EditorTools
              :snap-to-grid="snapToGrid"
              :is-format-painter-active="isFormatPainterActive"
              @refresh="refresh"
              @zoom-in="zoomIn"
              @zoom-out="zoomOut"
              @reset-zoom="resetZoom"
              @fit-to-window="fitToWindow"
              @fit-to-content="fitToContent"
              @toggle-grid="toggleGrid"
              @toggle-snap-to-grid="toggleSnapToGrid"
              @toggle-ruler="toggleRuler"
              @toggle-reference-lines="toggleReferenceLines"
              @align-left="alignLeft"
              @align-right="alignRight"
              @align-top="alignTop"
              @align-bottom="alignBottom"
              @align-center="alignCenter"
              @align-middle="alignMiddle"
              @distribute-horizontal="distributeHorizontal"
              @distribute-vertical="distributeVertical"
              @undo="undo"
              @redo="redo"
              @preview="preview"
              @export="exportPage"
              @preview-in-new-tab="previewInNewTab"
              @format-painter="handleFormatPainter"
            />
          </div>
          
          <!-- 页面标签 -->
          <div class="canvas-tabs">
            <PageTabs :project-id="projectId" />
          </div>
          
          <!-- 画布区域 -->
          <DesignCanvas
            ref="designCanvasRef"
            :format-painter-manager="formatPainterManager"
          />
        </div>
      </div>
      
      <!-- 右侧属性面板 -->
      <aside
        v-if="configStore.ui.showPropertyPanel !== false"
        class="app-property"
        :class="{ collapsed: rightPanelCollapsed }"
        :style="{ width: rightPanelCollapsed ? configStore.ui.collapsedPanelWidth + 'px' : rightPanelWidth + 'px' }"
      >
        <!-- 折叠切换按钮 -->
        <button
          class="panel-toggle-btn"
          :class="{ expanded: !rightPanelCollapsed }"
          :data-tooltip="rightPanelCollapsed ? t('editor.expandPanel') : t('editor.collapsePanel')"
          @click="toggleRightPanel"
        >
          <span class="toggle-icon">{{ rightPanelCollapsed ? '‹' : '›' }}</span>
        </button>

        <!-- 内容 -->
        <div
          v-show="!rightPanelCollapsed"
          class="panel-content"
        >
          <PropertyPanel />
        </div>

        <!-- 拖拽手柄 -->
        <div
          v-show="!rightPanelCollapsed"
          class="resize-handle left"
          @mousedown="startRightResize"
        />
      </aside>
    </main>

    <!-- AI 助手浮动面板（可拖动，P1-T04） -->
    <FloatingAiPanel />

    <!-- 底部脚本编辑抽屉 -->
    <ScriptDrawer />

    <!-- 底部状态栏已整合到 DesignCanvas 中 -->

    <!-- 预览模态框 -->
    <div
      v-if="showPreview"
      class="preview-modal"
      @click="closePreview"
    >
      <div
        class="preview-modal-content"
        @click.stop
      >
        <div class="preview-modal-header">
          <h2>{{ t('editor.pagePreview') }}</h2>
          <button
            class="close-button"
            @click="closePreview"
          >
            ×
          </button>
        </div>
        <div class="preview-modal-body">
          <PreviewCanvas
            :width="previewWidth"
            :height="previewHeight"
          />
        </div>
      </div>
    </div>

    <!-- 设置模态框 -->
    <SettingsModal 
      :visible="showSettingsModal" 
      @close="closeSettingsModal" 
    />

    <!-- 打开工程对话框 -->
    <OpenProjectDialog
      v-model:visible="showOpenProjectDialog"
      :current-project-id="projectId"
      @selected="onProjectSelected"
    />

    <!-- 导入工程对话框 -->
    <div
      v-if="showImportDialog"
      class="dialog-overlay"
      @click.self="showImportDialog = false"
    >
      <div class="dialog-container">
        <div class="dialog-header">
          <h2>{{ t('editor.importProject') }}</h2>
          <button
            class="close-btn"
            @click="showImportDialog = false"
          >
            ×
          </button>
        </div>
        <div class="dialog-body">
          <p class="import-hint">
            {{ t('editor.selectZipFile') }}
          </p>
          <input
            ref="importFileInput"
            type="file"
            accept=".zip"
            class="import-file-input"
            @change="onImportFileSelected"
          >
          <div
            v-if="importStatus"
            class="import-status"
            :class="importStatus.type"
          >
            {{ importStatus.message }}
          </div>
        </div>
        <div class="dialog-footer">
          <button
            class="btn btn-cancel"
            @click="showImportDialog = false"
          >
            {{ t('editor.cancel') }}
          </button>
          <button
            v-if="importOverwriteNeeded"
            class="btn btn-warning"
            @click="confirmImportOverwrite"
          >
            {{ t('editor.overwrite') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DesignCanvas, PreviewCanvas, EditorTools, AppHeader, PropertyPanel, SidePanel, PageTabs, SettingsModal, ScriptDrawer, FloatingAiPanel

 } from '@scada-editor/editor';
import { 
  useTheme, 
  useConfigStore, 
  usePageStore, 
  useTemplateStore,
  keyboardService, 
  KeyboardContext, 
  eventBus, 
  Events,
  SaveServiceConfig,
  savePreviewData,
  saveAllPagesData,
  i18n,
  FormatPainterManager,
  MessageService,
  BasePage,
  stateService,
  normalizeTemplateGraphics,
  GraphicFactory,
} from '@scada-editor/core';
import type { PageTemplate } from '@scada-editor/core';
// 经 unknown 断言窄化 t 签名：解构 i18n.global 会触发 vue-i18n messages 字面量 schema 深度类型实例化（TS2589）
const t = (key: string, params?: Record<string, unknown>): string =>
  (i18n.global as unknown as { t: (key: string, params?: Record<string, unknown>) => string }).t(key, params);
import { showAlert, showConfirm, useGraphic, useProjectSave, useProjectData } from '@scada-editor/editor';
import { SsLoading } from '@scada-editor/shared';
import { createProjectSaveService, loadPageData } from '../services/projectSaveService';
import { pageApi, projectApi, useProjectStore, usePageDataSourceStore } from '@scada-editor/system';
import OpenProjectDialog from '../components/OpenProjectDialog.vue';
import { ScadaDataManager, BindingManager } from '@scada-editor/core';
import { useDataSourceLifecycle, buildGraphicBindingsFromPage } from '../composables/useDataSourceLifecycle';

const route = useRoute();
const router = useRouter();
const projectId = (route.params.projectId as string | undefined) || 'default-project';
const projectStore = useProjectStore();
const templateStore = useTemplateStore();

/** 编辑模式：项目页面 / 模板页面 */
type EditorMode = 'project' | 'template';

/** 当前编辑模式 */
const editorMode = ref<EditorMode>('project');

/** 正在编辑的画布模板 ID（从路由 params 传入，仅在 editorMode=template 时有值） */
const canvasTemplateEditId = ref<string | null>(
  (route.params.canvasTemplateId as string) || null,
);

/** 模板编辑时的项目 ID（从 query 传入，用于区分项目级/系统级模板保存路径） */
const canvasTemplateProjectId = ref<string | null>(
  (route.query.projectId as string) || null,
);

// 根据路由参数初始化编辑模式
if (canvasTemplateEditId.value) {
  editorMode.value = 'template';
}

/** 是否处于模板编辑模式 */
const isTemplateEditMode = computed(() => editorMode.value === 'template');

// 面板状态 - 使用 configStore
const configStore = useConfigStore();
const leftPanelWidth = computed({
  get: () => configStore.ui.leftPanelWidth,
  set: (val) => configStore.updateUIConfig({ leftPanelWidth: val })
});
const rightPanelWidth = computed({
  get: () => configStore.ui.rightPanelWidth,
  set: (val) => configStore.updateUIConfig({ rightPanelWidth: val })
});
const leftPanelCollapsed = computed({
  get: () => configStore.ui.leftPanelCollapsed,
  set: (val) => configStore.updateUIConfig({ leftPanelCollapsed: val })
});
const rightPanelCollapsed = computed({
  get: () => configStore.ui.rightPanelCollapsed,
  set: (val) => configStore.updateUIConfig({ rightPanelCollapsed: val })
});

// 拖拽状态
const isResizingLeft = ref<boolean>(false);
const isResizingRight = ref<boolean>(false);
const resizeStartX = ref<number>(0);
const resizeStartWidth = ref<number>(0);

// 项目恢复加载状态：从挂载到 restoreProject 完成期间显示 loading 覆盖层
const projectLoading = ref<boolean>(true);

// 引用 DesignCanvas 组件
const designCanvasRef = ref<InstanceType<typeof DesignCanvas> | null>(null);

// 格式刷管理器
const formatPainterManager = new FormatPainterManager();
const isFormatPainterActive = ref(false);

formatPainterManager.onModeChange((mode) => {
  isFormatPainterActive.value = mode !== 'idle';
});

// 设置模态框
const showSettingsModal = ref<boolean>(false);

// 工程操作对话框
const showOpenProjectDialog = ref(false);
const showImportDialog = ref(false);
const importFileInput = ref<HTMLInputElement | null>(null);
const importStatus = ref<{ type: string; message: string } | null>(null);
const importOverwriteNeeded = ref(false);
let pendingImportFile: File | null = null;
const openSettings = () => {
  showSettingsModal.value = true;
};
const closeSettingsModal = () => {
  showSettingsModal.value = false;
};

// 主题相关
const pageStore = usePageStore();
const { themeStyles } = useTheme();
 
 

// 使用统一的 useGraphic composable
const {
  alignLeft: alignLeftFromGraphic,
  alignRight: alignRightFromGraphic,
  alignTop: alignTopFromGraphic,
  alignBottom: alignBottomFromGraphic,
  alignCenter: alignCenterFromGraphic,
  alignMiddle: alignMiddleFromGraphic,
  distributeHorizontal: distributeHorizontalFromGraphic,
  distributeVertical: distributeVerticalFromGraphic,
  undo: undoFromGraphic,
  redo: redoFromGraphic,
  exportPage: exportPageFromGraphic
} = useGraphic();
 
// 画布状态
const snapToGrid = ref(true);

// 画布控制方法
const zoomIn = () => designCanvasRef.value?.zoomIn();
const zoomOut = () => designCanvasRef.value?.zoomOut();
const resetZoom = () => designCanvasRef.value?.resetZoom();
const fitToWindow = () => designCanvasRef.value?.fitToWindow();
const fitToContent = () => designCanvasRef.value?.fitToContent();
const toggleGrid = () => designCanvasRef.value?.toggleGrid();
const toggleSnapToGrid = () => {
  designCanvasRef.value?.toggleSnapToGrid();
  snapToGrid.value = !snapToGrid.value;
};
const toggleRuler = () => designCanvasRef.value?.toggleRuler();
const toggleReferenceLines = () =>
  designCanvasRef.value?.toggleReferenceLines();
const alignLeft = () => {
  alignLeftFromGraphic();
  designCanvasRef.value?.refresh();
};
const alignRight = () => {
  alignRightFromGraphic();
  designCanvasRef.value?.refresh();
};
const alignTop = () => {
  alignTopFromGraphic();
  designCanvasRef.value?.refresh();
};
const alignBottom = () => {
  alignBottomFromGraphic();
  designCanvasRef.value?.refresh();
};
const alignCenter = () => {
  alignCenterFromGraphic();
  designCanvasRef.value?.refresh();
};
const alignMiddle = () => {
  alignMiddleFromGraphic();
  designCanvasRef.value?.refresh();
};
const distributeHorizontal = () => {
  distributeHorizontalFromGraphic();
  designCanvasRef.value?.refresh();
};
const distributeVertical = () => {
  distributeVerticalFromGraphic();
  designCanvasRef.value?.refresh();
};
const undo = () => {
  undoFromGraphic();
  designCanvasRef.value?.refresh();
};
const redo = () => {
  redoFromGraphic();
  designCanvasRef.value?.refresh();
};

// 格式刷处理
const handleFormatPainter = () => {
  if (formatPainterManager.isActive()) {
    formatPainterManager.deactivate();
  } else {
    const page = pageStore.currentPage;
    if (page && pageStore.selectedGraphicIds?.length === 1) {
      const graphic = page.getGraphicById?.(pageStore.selectedGraphicIds[0]);
      if (graphic) {
        formatPainterManager.activate(graphic);
        return;
      }
    }
    formatPainterManager.activate();
  }
};

// 面板折叠/展开
const toggleLeftPanel = () => {
  leftPanelCollapsed.value = !leftPanelCollapsed.value;
};

const toggleRightPanel = () => {
  rightPanelCollapsed.value = !rightPanelCollapsed.value;
};

// 左侧面板拖拽
const startLeftResize = (e: MouseEvent) => {
  isResizingLeft.value = true;
  resizeStartX.value = e.clientX;
  resizeStartWidth.value = leftPanelWidth.value;
  document.addEventListener('mousemove', onLeftResize);
  document.addEventListener('mouseup', stopLeftResize);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const onLeftResize = (e: MouseEvent) => {
  if (!isResizingLeft.value) return;
  const delta = e.clientX - resizeStartX.value;
  const newWidth = Math.max(configStore.ui.minPanelWidth, Math.min(configStore.ui.maxPanelWidth, resizeStartWidth.value + delta));
  leftPanelWidth.value = newWidth;
};

const stopLeftResize = () => {
  isResizingLeft.value = false;
  document.removeEventListener('mousemove', onLeftResize);
  document.removeEventListener('mouseup', stopLeftResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

// 右侧面板拖拽
const startRightResize = (e: MouseEvent) => {
  isResizingRight.value = true;
  resizeStartX.value = e.clientX;
  resizeStartWidth.value = rightPanelWidth.value;
  document.addEventListener('mousemove', onRightResize);
  document.addEventListener('mouseup', stopRightResize);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const onRightResize = (e: MouseEvent) => {
  if (!isResizingRight.value) return;
  const delta = resizeStartX.value - e.clientX;
  const newWidth = Math.max(configStore.ui.minPanelWidth, Math.min(configStore.ui.maxPanelWidth, resizeStartWidth.value + delta));
  rightPanelWidth.value = newWidth;
};

const stopRightResize = () => {
  isResizingRight.value = false;
  document.removeEventListener('mousemove', onRightResize);
  document.removeEventListener('mouseup', stopRightResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

// 预览当前页面
const showPreview = ref(false);
const previewWidth = ref(800);
const previewHeight = ref(600);

const { initDataSourceLifecycle, destroyDataSourceLifecycle } = useDataSourceLifecycle();

/**
 * 激活当前页面编辑态数据管道（EditorView 中调用）。
 *
 * 注意：不能因「页面级 dataSources 为空」提前返回——wsStore.connect 位于
 * initDataSourceLifecycle 内部（dataSources 守卫之前），直连绑定变量的图元
 * （tag-variable 等，绑定信息写在 config.customProps）同样依赖该连接收数。
 */
async function activateEditModeDataSources() {
  const pageData = pageStore.currentPage as any;
  if (!pageData) return;
  // 确保 graphicBindings 已填充（页面 JSON 可能未持久化）
  if (pageData.dataSource) {
    pageData.dataSource.graphicBindings = buildGraphicBindingsFromPage(pageData);
  }
  await initDataSourceLifecycle(pageData, projectId, 'EditorView');
}

const preview = async () => {
  const page = pageStore.currentPage;
  if (page) {
    previewWidth.value = page.width || 800;
    previewHeight.value = page.height || 600;
  }

  // 清理编辑态绑定，再启动预览态绑定（对齐 §16.3 生命周期）
  await destroyDataSourceLifecycle();

  // 初始化模态预览的数据源，使数据绑定在预览中生效（逻辑抽取至 useDataSourceLifecycle）
  const pageData = pageStore.currentPage as any;
  pageData.dataSource.graphicBindings = buildGraphicBindingsFromPage(pageData);
  await initDataSourceLifecycle(pageData, projectId, 'EditorView');

  showPreview.value = true;
  keyboardService.setContext(KeyboardContext.PREVIEW);
};

const closePreview = async () => {
  showPreview.value = false;
  // 清理预览数据源，恢复编辑态数据绑定
  await destroyDataSourceLifecycle();
  await activateEditModeDataSources();
  // 恢复键盘上下文为全局模式
  keyboardService.setContext(KeyboardContext.GLOBAL);
};

// 注册预览相关的按键
function registerPreviewKeys() {
  keyboardService.registerKey(
    'escape',
    (event) => {
      if (showPreview.value) {
        closePreview();
        event.preventDefault();
      }
    },
    {},
    KeyboardContext.PREVIEW,
    10
  );

  // 格式刷模式下 ESC 退出
  keyboardService.registerKey(
    'escape',
    (event) => {
      if (formatPainterManager.isActive()) {
        formatPainterManager.deactivate();
        event.preventDefault();
      }
    },
    {},
    KeyboardContext.GLOBAL,
    10
  );
}

// 刷新当前编辑的页码及所有图元
const refresh = () => designCanvasRef.value?.refresh();

// 布局配置变化处理
const handleLayoutConfigChanged = (config: {
  leftPanelDefaultWidth: number;
  rightPanelDefaultWidth: number;
}) => {
  leftPanelWidth.value = config.leftPanelDefaultWidth;
  rightPanelWidth.value = config.rightPanelDefaultWidth;
};

let triggerAutoSave: (() => void) | undefined;
let saveListener: (() => void) | null = null;

// 生命周期钩子
onMounted(async () => {
  // 初始化项目上下文，供编辑器内组件通过 projectStore.currentProject 获取项目信息
  if (projectId && projectId !== 'default-project') {
    projectStore.fetchProject(projectId).catch(() => {
      console.warn('[EditorView] 获取项目信息失败，projectId:', projectId);
    });
  }

  // 开始监听键盘事件
  keyboardService.startListening();
  // 注册预览相关的按键
  registerPreviewKeys();

  // 标记进入编辑态，允许 StateService 自动保存
  stateService.setEditMode(true);

  // 初始化保存服务
  initSaveService();

  // 注册保存快捷键监听器
  saveListener = () => {
    manualSave();
  };
  eventBus.on('save-page', saveListener);
  
  // 注册保存全部快捷键监听器
  eventBus.on('save-all-pages', saveAllPages);
  
  // 注册预览快捷键监听
  eventBus.on('preview-in-new-tab', previewInNewTab);

  // 注册布局配置变化监听器
  eventBus.on('layout-config-changed', handleLayoutConfigChanged);

  // 注册页面分组事件监听
  eventBus.on('page-group-created', handlePageGroupCreated);
  eventBus.on('page-group-renamed', handlePageGroupRenamed);
  eventBus.on('page-group-deleted', handlePageGroupDeleted);

  // 注册页面操作事件监听
  eventBus.on('page-renamed', handlePageRenamed);
  eventBus.on('page-moved', handlePageMoved);

  // 注册页面刷新事件
  eventBus.on('page-refresh', handlePageRefresh);

  // 尝试从保存服务恢复项目
  nextTick(async () => {
    // 模板编辑模式：跳过项目恢复，清空页面后直接加载模板
    if (canvasTemplateEditId.value) {
      projectLoading.value = false;
      pageStore.pages.splice(0, pageStore.pages.length);
      pageStore.closedPageIds.splice(0, pageStore.closedPageIds.length);
      await loadTemplateForEditing(canvasTemplateEditId.value);
    } else {
      await restoreProject();
      // 编辑态激活数据管道，画布图元实时显示数据值（对齐 §16.3 生命周期）
      await activateEditModeDataSources();
    }
  });

  // 监听图元变化，触发自动保存
  triggerAutoSave = () => scheduleAutoSave(saveProject);
  eventBus.on(Events.GRAPHIC_ADDED, triggerAutoSave);
  eventBus.on(Events.GRAPHIC_REMOVED, triggerAutoSave);
  eventBus.on(Events.GRAPHIC_UPDATED, triggerAutoSave);

  // 监听图元增删/更新，动态维护数据绑定
  eventBus.on(Events.GRAPHIC_ADDED, ({ graphic }: any) => {
    if (!graphic?.dataSource?.enabled) return;
    const dsId = graphic.dataSource.dataSource;
    if (!dsId) return;
    const propertyPath = graphic.dataSource.propertyPath || 'config.customProps.text';
    const currentPage = pageStore.currentPage as any;
    const variables = currentPage?.dataSource?.variables || [];
    const dsVars = variables.filter((v: any) => v.dataSourceId === dsId);
    for (const v of dsVars) {
      BindingManager.getInstance().bind(graphic.id, v.tagId, v.tagName || v.tagId, propertyPath);
    }
  });

  eventBus.on(Events.GRAPHIC_REMOVED, ({ graphicId }: any) => {
    BindingManager.getInstance().unbind(graphicId);
  });

  eventBus.on(Events.GRAPHIC_UPDATED, ({ graphic, properties }: any) => {
    if (!graphic) return;
    // §12 统一方案：仅 dataSource 配置实际变更时才重建订阅，
    // style/geometry 等变更不做无谓的 unbind + rebind
    if (!properties?.dataSource) return;
    // 先解绑旧绑定，再根据新配置重新注册
    BindingManager.getInstance().unbind(graphic.id);
    if (!graphic.dataSource?.enabled) return;
    const dsId = graphic.dataSource.dataSource;
    if (!dsId) return;
    const propertyPath = graphic.dataSource.propertyPath || 'config.customProps.text';
    const currentPage = pageStore.currentPage as any;
    const variables = currentPage?.dataSource?.variables || [];
    const dsVars = variables.filter((v: any) => v.dataSourceId === dsId);
    for (const v of dsVars) {
      BindingManager.getInstance().bind(graphic.id, v.tagId, v.tagName || v.tagId, propertyPath);
    }
  });
});

onUnmounted(() => {
  // 标记退出编辑态，阻止 StateService 自动保存
  stateService.setEditMode(false);

  // 停止监听键盘事件
  keyboardService.stopListening();
  // 清除预览相关的按键绑定
  keyboardService.unregisterContext(KeyboardContext.PREVIEW);

  // 清除保存监听
  if (saveListener) {
    eventBus.off('save-page', saveListener);
  }
  eventBus.off('save-all-pages', saveAllPages);
  eventBus.off('preview-in-new-tab', previewInNewTab);

  // 清除布局配置变化监听
  eventBus.off('layout-config-changed', handleLayoutConfigChanged);

  // 清除页面分组事件监听
  eventBus.off('page-group-created', handlePageGroupCreated);
  eventBus.off('page-group-renamed', handlePageGroupRenamed);
  eventBus.off('page-group-deleted', handlePageGroupDeleted);

  // 清除页面操作事件监听
  eventBus.off('page-renamed', handlePageRenamed);
  eventBus.off('page-moved', handlePageMoved);

  // 清除自动保存监听
  if (triggerAutoSave) {
    eventBus.off(Events.GRAPHIC_ADDED, triggerAutoSave);
    eventBus.off(Events.GRAPHIC_REMOVED, triggerAutoSave);
    eventBus.off(Events.GRAPHIC_UPDATED, triggerAutoSave);
  }

  // 清理编辑态数据管道
  destroyDataSourceLifecycle();
});

// 导出当前页面为 JSON 格式（使用统一导出）
const exportPage = () => {
  exportPageFromGraphic();
};

// ==================== 保存功能（Composables） ====================

// 配置保存服务（默认使用 localStorage）
const customSaveService = projectId ? createProjectSaveService(projectId) : undefined;

const saveConfig: SaveServiceConfig = projectId
  ? { type: 'server' }
  : { type: 'local' };

const {
  initSaveService,
  saveProject: saveProjectFromComposable,
  restoreProject: restoreProjectFromComposable,
  scheduleAutoSave,
  setAutoSaveEnabled,
  setAutoSaveInterval,
} = useProjectSave(saveConfig, customSaveService, {
  enabled: configStore.autoSave?.enabled ?? true,
  intervalMs: (configStore.autoSave?.interval ?? 300) * 1000,
});

// 使用项目数据 Composable
const { collectProjectData, restorePagesToStore } = useProjectData();

// 监听自动保存配置变化，动态更新
watch(
  () => ({ enabled: configStore.autoSave?.enabled, interval: configStore.autoSave?.interval }),
  ({ enabled, interval }) => {
    if (enabled !== undefined) {
      setAutoSaveEnabled(enabled);
    }
    if (interval !== undefined) {
      setAutoSaveInterval(interval * 1000);
    }
  },
  { immediate: false },
);

// 保存项目（封装 composable 调用）
const saveProject = async () => {
  const projectData = collectProjectData();
  if (!projectData) {
    MessageService.showWarning(t('editor.selectPageFirst'));
    return;
  }

  try {

    // 模板编辑模式：保存到画布模板 API
    if (isTemplateEditMode.value && canvasTemplateEditId.value) {
      const currentPage = pageStore.currentPage;
      if (!currentPage) return;
      const pageData = currentPage.toJSON();
      const result = await templateStore.updateTemplate(canvasTemplateEditId.value, {
        pageConfig: {
          width: pageData.width || 1920,
          height: pageData.height || 1080,
          backgroundColor: pageData.backgroundColor || '#808080',
          layout: 'free',
        },
        graphics: pageData.graphics || [],
      });

      if (result) {
        pageStore.pages.forEach(p => p.clearDirty?.());
        MessageService.showSaveSuccess(t('editor.saveSuccess'));

        // 引用模式：提示同步关联页面
        if (templateStore.configMode === 'reference') {
          const updatedTpl = templateStore.findTemplate(canvasTemplateEditId.value!);
          if (updatedTpl) {
            const linked = pageStore.pages
              .filter(p => p.templateId === canvasTemplateEditId.value)
              .map(p => p.name);

            if (linked.length > 0) {
              const confirmed = await showConfirm(
                t('editor.templateSyncConfirm', { name: updatedTpl.name, pages: linked.join('、') }),
                t('editor.saveSuccess'),
              );
              if (confirmed) {
                syncTemplateToPages(updatedTpl, canvasTemplateEditId.value!);
              }
            }
          }
        }
      }
      return;
    }

    // 同步上传当前页的 preview.png + preview_small.png（与 page.json 同请求落盘）
    const currentPage = pageStore.currentPage;
    if (currentPage) {
      const dataURL = (document.getElementById('canvas') as HTMLCanvasElement | null)?.toDataURL('image/png');
      if (dataURL) {
        const blob = dataURLtoBlob(dataURL);
        const smallDataURL = generateSmallPreviewDataURL(
          document.getElementById('canvas') as HTMLCanvasElement,
          PREVIEW_SMALL_MAX_WIDTH,
          PREVIEW_SMALL_MAX_HEIGHT,
        );
        (projectData as any).previews = {
          previewPageName: currentPage.name || 'Page',
          previewPageId: currentPage.id,
          preview: new File([blob], 'preview.png', { type: 'image/png' }),
          previewSmall: new File([dataURLtoBlob(smallDataURL)], 'preview_small.png', { type: 'image/png' }),
        };
      }
    }

    await saveProjectFromComposable(projectData);

    // 保存成功后清除所有页面的 dirty 标记
    pageStore.pages.forEach(p => p.clearDirty?.());

    if (currentPage) {
      const pageData = currentPage.toJSON();
      savePreviewData(pageData, currentPage.name || 'Page');
    }

    MessageService.showSaveSuccess(t('editor.saveSuccess'));
  } catch (error) {
    console.error('[EditorView] 保存失败', error);
    MessageService.showSaveError(t('editor.saveFailedRetry'));
  }
};

async function handlePageGroupCreated({ groupId: _groupId, groupName }: { groupId: string; groupName: string }) {
  try {
    await pageApi.createGroup(projectId, groupName);
  } catch (error) {
    console.error(`[EditorView] Failed to create group on server:`, error);
    showAlert(t('editor.groupCreateFailed', { name: groupName }));
  }
}

async function handlePageGroupRenamed({ groupId: _groupId, oldName, newName }: { groupId: string; oldName: string; newName: string }) {
  try {
    await pageApi.deleteGroup(projectId, oldName);
    await pageApi.createGroup(projectId, newName);
  } catch (error) {
    console.error(`[EditorView] Failed to rename group on server:`, error);
    showAlert(t('editor.groupRenameFailed', { old: oldName, new: newName }));
  }
}

async function handlePageGroupDeleted({ groupId: _groupId, groupName }: { groupId: string; groupName: string }) {
  try {
    await pageApi.deleteGroup(projectId, groupName);
  } catch (error) {
    console.error(`[EditorView] Failed to delete group on server:`, error);
    showAlert(t('editor.groupDeleteFailed', { name: groupName }));
  }
}

async function handlePageRenamed({ pageId: _pageId, oldName, newName, groupName }: { pageId: string; oldName: string; newName: string; groupName?: string }) {
  try {
    await pageApi.renamePage(projectId, oldName, newName, groupName);
  } catch (error) {
    console.error(`[EditorView] Failed to rename page on server:`, error);
    showAlert(t('editor.pageRenameFailed', { old: oldName, new: newName }));
  }
}

async function handlePageMoved({ pageId: _pageId, pageName, fromGroupName, toGroupName }: { pageId: string; pageName: string; fromGroupName?: string; toGroupName?: string }) {
  try {
    await pageApi.movePage(projectId, pageName, fromGroupName, toGroupName);
  } catch (error) {
    console.error(`[EditorView] Failed to move page on server:`, error);
    showAlert(t('editor.pageMoveFailed', { name: pageName }));
  }
}

// 手动保存（Ctrl+S / 菜单点击）
const manualSave = () => {
  saveProject().catch(err => console.error('[EditorView] 手动保存失败', err));
};

// 工程保存（Ctrl+Shift+S）：保存所有已加载（非 _lazy）的页面
const saveAllPages = async () => {
  const projectData = collectProjectData();
  if (!projectData) {
    MessageService.showWarning(t('editor.selectPageFirst'));
    return;
  }

  // 标记为保存全部（传递给 projectSaveService save() 方法）
  (projectData as any).__saveAll = true;

  try {
    await saveProjectFromComposable(projectData);

    // 保存成功后清除所有页面的 dirty 标记
    pageStore.pages.forEach(p => p.clearDirty?.());

    MessageService.showSaveSuccess(t('editor.saveAllSuccess'));
  } catch (error) {
    console.error('[EditorView] 工程保存失败', error);
    MessageService.showSaveError(t('editor.saveAllFailed'));
  }
};

// 刷新页面结构（从服务器重新加载）
async function handlePageRefresh() {
  try {
    const projectData = await restoreProjectFromComposable();
    if (projectData) {
      const lazyPageNames = restorePagesToStore(projectData);
      pageStore.pages.forEach(page => {
        if (page.scale !== 100) {
          page.scale = 100;
        }
      });
      // 如果有延迟加载的页面，重置加载状态并加载当前页
      if (lazyPageNames.length > 0) {
        loadedPageNames.clear();
        const currentPage = pageStore.currentPage;
        if (currentPage) {
          const currentName = currentPage.name || currentPage.id;
          if (lazyPageNames.includes(currentName)) {
            await ensurePageDataLoaded(currentPage.id);
          }
        }
      }

      // 页面重建后重新激活数据管道（splice 替换页面不改变 currentPageId，
      // 页面切换 watch 不会触发，此处必须显式重建绑定）
      await destroyDataSourceLifecycle();
      await activateEditModeDataSources();
    }
  } catch (error) {
    console.error('[EditorView] Failed to refresh page structure:', error);
  }
}

// ==================== 工程菜单操作 ====================

function handleOpenProject() {
  showOpenProjectDialog.value = true;
}

async function onProjectSelected(projectName: string) {
  await saveProject();
  await savePreviewIfNeeded();

  router.push(`/editor/${projectName}`);
}

async function handleCloseProject() {
  const confirmed = await showConfirm(
    t('editor.closeProjectConfirm'),
    t('editor.closeProject'),
  );
  if (!confirmed) return;

  await saveProject();
  await savePreviewIfNeeded();

  router.push('/');
}

// 延迟辅助函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function handleExportProject() {
  try {
    // 显示9条导出进度日志
    MessageService.showMessage(t('editor.exportStep1'), 'info', 2000);
    await delay(400);
    MessageService.showMessage(t('editor.exportStep2'), 'info', 2000);
    await delay(400);
    MessageService.showMessage(t('editor.exportStep3'), 'info', 2000);
    await delay(400);
    MessageService.showMessage(t('editor.exportStep4'), 'info', 2000);
    await delay(400);
    MessageService.showMessage(t('editor.exportStep5'), 'info', 2000);
    await delay(400);
    MessageService.showMessage(t('editor.exportStep6'), 'info', 5000);
    await delay(400);

    // Step 7: 调用后端 API 生成压缩包
    MessageService.showMessage(t('editor.exportStep7'), 'info', 10000);
    const blob = await projectApi.exportProjectZip(projectId);

    // Step 8: 下载文件
    MessageService.showMessage(t('editor.exportStep8'), 'info', 3000);

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectId}_export.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Step 9: 导出完成
    MessageService.showExportSuccess(t('editor.exportStep9') + ' ' + t('editor.exportSuccess'));
  } catch (error) {
    console.error('[EditorView] Export failed:', error);
    MessageService.showError(t('editor.exportFailed'));
    await showAlert(t('editor.exportFailed'), t('editor.alertTitle.error'), 'error');
  }
}

function handleImportProject() {
  showImportDialog.value = true;
  importStatus.value = null;
  importOverwriteNeeded.value = false;
  pendingImportFile = null;
  nextTick(() => {
    if (importFileInput.value) {
      importFileInput.value.value = '';
    }
  });
}

async function onImportFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.zip')) {
    importStatus.value = { type: 'error', message: t('editor.invalidZipFile') };
    return;
  }

  importStatus.value = { type: 'info', message: t('editor.importing') };

  try {
    const result = await projectApi.importProjectZip(file, false);
    importStatus.value = { type: 'success', message: t('editor.importSuccess', { name: result.data?.projectName || '' }) };

    if (input) input.value = '';

    await showAlert(t('editor.importSuccessMessage', { name: result.data?.projectName || '' }), t('editor.importProject'), 'success');
    setTimeout(() => {
      showImportDialog.value = false;
    }, 1500);
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || '';

    if (errMsg.includes('已存在')) {
      importOverwriteNeeded.value = true;
      pendingImportFile = file;
      importStatus.value = { type: 'warning', message: t('editor.importOverwritePrompt', { name: errMsg }) };
    } else {
      importStatus.value = { type: 'error', message: t('editor.importFailed') + ': ' + errMsg };
    }
  }
}

async function confirmImportOverwrite() {
  if (!pendingImportFile) return;

  importStatus.value = { type: 'info', message: t('editor.importing') };
  importOverwriteNeeded.value = false;

  try {
    const result = await projectApi.importProjectZip(pendingImportFile, true);
    importStatus.value = { type: 'success', message: t('editor.importSuccess', { name: result.data?.projectName || '' }) };
    pendingImportFile = null;

    if (importFileInput.value) {
      importFileInput.value.value = '';
    }

    await showAlert(t('editor.importSuccessMessage', { name: result.data?.projectName || '' }), t('editor.importProject'), 'success');
    setTimeout(() => {
      showImportDialog.value = false;
    }, 1500);
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || '';
    importStatus.value = { type: 'error', message: t('editor.importFailed') + ': ' + errMsg };
  }
}

function getCurrentPageGroupName(): string | undefined {
  const page = pageStore.currentPage;
  if (!page) return undefined;
  const groupId = pageStore.pageGroupMap[page.id];
  if (!groupId) return undefined;
  const group = pageStore.pageGroups.find(g => g.id === groupId);
  return group?.name;
}

async function savePreviewIfNeeded() {
  const currentPage = pageStore.currentPage;
  if (currentPage) {
    try {
      const pageData = typeof (currentPage as any)?.toJSONAsync === 'function'
        ? await (currentPage as any).toJSONAsync()
        : currentPage.toJSON();
      savePreviewData(pageData, currentPage.name || 'Page');
      await uploadPageScreenshot(currentPage.name || 'Page', getCurrentPageGroupName());
    } catch (e) {
      console.warn('[EditorView] Failed to save preview:', e);
    }
  }
}

function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

async function uploadPageScreenshot(pageName: string, groupName?: string) {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.warn('[EditorView] uploadPageScreenshot: canvas element not found');
    return;
  }

  try {
    const dataURL = canvas.toDataURL('image/png');
    const blob = dataURLtoBlob(dataURL);
    const file = new File([blob], 'preview.png', { type: 'image/png' });

    // 生成缩略图（用于页面面板显示）
    const smallDataURL = generateSmallPreviewDataURL(canvas, PREVIEW_SMALL_MAX_WIDTH, PREVIEW_SMALL_MAX_HEIGHT);
    const smallBlob = dataURLtoBlob(smallDataURL);
    const smallFile = new File([smallBlob], 'preview_small.png', { type: 'image/png' });

    await pageApi.uploadPreview(projectId, pageName, file, smallFile, groupName);
  } catch (err) {
    console.warn('[EditorView] Failed to upload page screenshot:', err);
  }
}

// 缩略图最大尺寸（保持纵横比，长边不超过该值）
const PREVIEW_SMALL_MAX_WIDTH = 320;
const PREVIEW_SMALL_MAX_HEIGHT = 240;

/**
 * 将 canvas 缩放后导出为 PNG dataURL。
 * 使用浏览器原生 canvas，无需额外依赖。
 */
function generateSmallPreviewDataURL(source: HTMLCanvasElement, maxW: number, maxH: number): string {
  const ratio = Math.min(maxW / source.width, maxH / source.height, 1);
  const w = Math.max(1, Math.round(source.width * ratio));
  const h = Math.max(1, Math.round(source.height * ratio));

  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const ctx = small.getContext('2d');
  if (!ctx) {
    return source.toDataURL('image/png');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  return small.toDataURL('image/png');
}

// ─── 按需加载：已加载完整数据的页面名集合 ───
const loadedPageNames = new Set<string>();

/**
 * 按需加载页面的完整数据（包含 graphics）
 * 当用户打开一个未加载数据的页面时触发
 */
async function ensurePageDataLoaded(pageId: string): Promise<void> {
  if (loadedPageNames.has(pageId)) return;

  const pageIndex = pageStore.pages.findIndex(p => p.id === pageId);
  if (pageIndex === -1) return;

  const page = pageStore.pages[pageIndex];
  const pageName = page.name || pageId;

  // 如果是本地新建的页面（无 _lazy 标记），无需从后端加载数据
  if (!(page as any)._lazy) {
    loadedPageNames.add(pageId);
    return;
  }

  try {
    const pageData = await loadPageData(projectId, pageName, page.id);
    if (!pageData) {
      loadedPageNames.add(pageId);
      return;
    }

    // ── 创建新 BasePage 实例，加载完整数据 ──
    // 不能直接修改原 page 对象（BasePage 属性非 Vue 响应式），
    // 必须替换 pages 数组中的元素才能触发 Vue 响应式更新
    const newPage = new BasePage();
    newPage.init({
      id: pageData.id || page.id,
      name: pageData.name || page.name,
      width: pageData.width || page.width,
      height: pageData.height || page.height,
      backgroundColor: pageData.backgroundColor || page.backgroundColor || '#808080',
    });
    if (pageData.backgroundImage) {
      newPage.backgroundImage = pageData.backgroundImage;
    }
    if (pageData.scale) {
      newPage.scale = pageData.scale;
    }

    // 用 fromJSON 加载 graphics 等完整数据
    newPage.fromJSON(pageData);

    // 更新 pageGroupMap 映射（如果 ID 变了）
    const oldId = page.id;
    const newId = newPage.id;
    if (oldId !== newId) {
      const existingGroup = pageStore.pageGroupMap[oldId];
      if (existingGroup) {
        pageStore.pageGroupMap = {
          ...pageStore.pageGroupMap,
          [newId]: existingGroup,
        };
        delete pageStore.pageGroupMap[oldId];
      }
    }

    // 从旧页面保留预览小图 URL（来自大纲数据）
    const previewSmallUrl = (page as any).previewSmallUrl;
    if (previewSmallUrl) {
      (newPage as any).previewSmallUrl = previewSmallUrl;
    }

    // 替换 pages 数组中的页面 → 触发 Vue 响应式更新
    // pageStore.currentPage 返回新引用 → sortedGraphics 等 computed 重新求值
    // 所有 watch（deep watch、PluginLayerManager 等）都会自动触发
    pageStore.pages.splice(pageIndex, 1, newPage);

    // 如果新 ID 与旧 ID 不同，需更新 currentPageId
    if (oldId !== newId && pageStore.currentPageId === oldId) {
      pageStore.currentPageId = newId;
    }

    loadedPageNames.add(newId);
  } catch (error) {
    console.error(`[EditorView] Failed to load page data for "${pageName}":`, error);
  }
}

/** 从画布模板管理页打开模板进入编辑模式 */
async function loadTemplateForEditing(templateId: string): Promise<void> {
  try {
    // 如果有 projectId（项目级模板），同时加载系统模板和项目模板
    if (canvasTemplateProjectId.value) {
      await templateStore.loadTemplates(canvasTemplateProjectId.value);
    } else {
      await templateStore.loadSystemTemplates();
    }

    // 在系统模板和项目模板两个列表中搜索
    let tpl = templateStore.systemTemplates.find(t => t.id === templateId);
    if (!tpl) {
      tpl = templateStore.projectTemplates.find(t => t.id === templateId);
    }

    if (!tpl) {
      console.warn('[EditorView] 模板不存在:', templateId);
      MessageService.showWarning('模板不存在');
      return;
    }

    const pageName = tpl.name || 'Template';
    const newPage = pageStore.addPage(pageName);
    const page = newPage as any;

    if (tpl.pageConfig) {
      page.width = tpl.pageConfig.width;
      page.height = tpl.pageConfig.height;
      page.backgroundColor = tpl.pageConfig.backgroundColor;
    }

    if (tpl.graphics && tpl.graphics.length > 0) {
      const normalized = normalizeTemplateGraphics(tpl.graphics as Record<string, any>[]);
      for (const g of normalized) {
        try {
          const graphic = GraphicFactory.createGraphicFromJSON(g);
          if (graphic) {
            page.addGraphic(graphic);
          }
        } catch (e) {
          console.warn('[EditorView] 模板图元创建失败:', g.type, e);
        }
      }
    }

    MessageService.showSuccess(`正在编辑模板：${tpl.name}`);
  } catch (error) {
    console.error('[EditorView] 加载模板失败:', error);
  }
}

/** 将模板图元和配置同步到引用该模板的页面 */
function syncTemplateToPages(template: PageTemplate, templateId: string) {
  const linkedPages = pageStore.pages.filter(p => p.templateId === templateId);

  const normalized = template.graphics && template.graphics.length > 0
    ? normalizeTemplateGraphics(template.graphics as Record<string, any>[])
    : [];

  for (const page of linkedPages) {
    const p = page as any;

    // 更新页面配置
    if (template.pageConfig) {
      p.width = template.pageConfig.width;
      p.height = template.pageConfig.height;
      p.backgroundColor = template.pageConfig.backgroundColor;
    }

    // 替换图元
    if (p.graphics && typeof p.removeGraphic === 'function') {
      const current = [...(p.graphics || [])];
      for (const g of current) {
        try { p.removeGraphic(g.id); } catch { /* ignore */ }
      }
    }

    for (const g of normalized) {
      try {
        const graphic = GraphicFactory.createGraphicFromJSON(g);
        if (graphic) p.addGraphic(graphic);
      } catch (e) {
        console.warn('[EditorView] Sync graphic failed:', g.type, e);
      }
    }

    p.markDirty?.();
  }
}

// 恢复项目（封装 composable 调用）
const restoreProject = async (): Promise<boolean> => {
  try {
    const projectData = await restoreProjectFromComposable();
    if (!projectData) return false;

    const lazyPageNames = restorePagesToStore(projectData);

    pageStore.pages.forEach(page => {
      if (page.scale !== 100) {
        page.scale = 100;
      }
    });

    // 如果有延迟加载的页面，立即加载当前页的完整数据
    if (lazyPageNames.length > 0) {
      const currentPage = pageStore.currentPage;
      if (currentPage) {
        const currentName = currentPage.name || currentPage.id;
        if (lazyPageNames.includes(currentName)) {
          await ensurePageDataLoaded(currentPage.id);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[EditorView] 恢复项目失败', error);
    return false;
  } finally {
    // 无论成功或失败，都关闭 loading 覆盖层，避免画布永久被遮挡
    projectLoading.value = false;
  }
};

// 监听页面切换，触发按需加载 + 数据源生命周期重建
watch(
  () => pageStore.currentPageId,
  async (newPageId, oldPageId) => {
    if (!newPageId) return;
    if (!loadedPageNames.has(newPageId)) {
      await ensurePageDataLoaded(newPageId);
    }
    // 页面切换时重建数据源绑定
    if (oldPageId && newPageId !== oldPageId) {
      await destroyDataSourceLifecycle();
      await activateEditModeDataSources();
    }
  },
);

// 在新标签页预览
const previewInNewTab = async () => {
  const currentPage = pageStore.currentPage;
  if (!currentPage) {
    await showAlert(t('editor.selectPageFirst'), t('editor.alertTitle.info'), 'info');
    return;
  }

  try {
    const pageData = typeof (currentPage as any)?.toJSONAsync === 'function'
      ? await (currentPage as any).toJSONAsync()
      : currentPage.toJSON();

    // 保存所有页面数据到 IndexedDB，供 PageBrowser 等图元在预览中使用
    const allPages = pageStore.pages.map(p => ({
      name: p.name,
      data: p.toJSON(),
    }));
    saveAllPagesData(allPages).catch(() => {
      // silently ignore save errors for all pages
    });

    const pageName = currentPage.name || pageData.id;

    if (isTemplateEditMode.value) {
      // 模板模式：通过 IndexedDB 加载，无需 projectId
      // 预览地址基于部署基路径（H5 内嵌场景 VITE_BASE=/scada-preview/），不能硬编码根路径 /preview
      const previewUrl = `${window.location.origin}${import.meta.env.BASE_URL}preview?mode=template&pageName=${encodeURIComponent(pageName)}`;
      const newWindow = window.open(previewUrl, '_blank');
      if (!newWindow) {
        await showAlert(t('editor.previewTabBlocked'), t('editor.alertTitle.info'), 'info');
      }
      return;
    }

    // 项目模式：保存当前页面到后端，确保预览时可从后端加载
    try {
      const groupName = getCurrentPageGroupName();
      await pageApi.savePage(projectId, currentPage.name || pageData.id, pageData, groupName);
    } catch (saveErr) {
      console.warn('Preview - Failed to save page to backend, preview may show stale data:', saveErr);
    }

    const groupName = getCurrentPageGroupName();
    // 预览地址基于部署基路径（H5 内嵌场景 VITE_BASE=/scada-preview/），不能硬编码根路径 /preview
    let previewUrl = `${window.location.origin}${import.meta.env.BASE_URL}preview?projectId=${encodeURIComponent(projectId)}&pageName=${encodeURIComponent(pageName)}`;
    if (groupName) {
      previewUrl += `&group=${encodeURIComponent(groupName)}`;
    }
    const newWindow = window.open(previewUrl, '_blank');
    if (!newWindow) {
      await showAlert(t('editor.previewTabBlocked'), t('editor.alertTitle.info'), 'info');
    }

  } catch (error) {
    console.error('Preview - Failed to prepare preview:', error);
    await showAlert(t('editor.previewFailed'), t('editor.alertTitle.error'), 'error');
  }
};
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
</style>

<style scoped>
/* 应用主容器 */
.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--background, #1a1a1a);
  color: var(--text, #ffffff);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

/* 顶部工具栏 */
.app-header {
  height: var(--header-height);
  border-bottom: 1px solid var(--border, #2a2a2a);
  background-color: var(--header-background, #2196F3);
  z-index: 100;
  box-shadow: var(--shadow-small);
}

/* 模板编辑模式提示栏 */
.template-edit-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 20px;
  background: var(--primary-light, rgba(64, 158, 255, 0.08));
  border-bottom: 1px solid var(--border, #e0e0e0);
  font-size: 13px;
  color: var(--text, #333);
}

.template-edit-banner-icon {
  font-size: 15px;
  line-height: 1;
}

.template-edit-banner-text {
  flex: 1;
  color: var(--text-secondary, #666);
}

.template-edit-banner-btn {
  padding: 4px 14px;
  font-size: 12px;
  border: 1px solid var(--primary, #409EFF);
  border-radius: 4px;
  background: transparent;
  color: var(--primary, #409EFF);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.template-edit-banner-btn:hover {
  background: var(--primary, #409EFF);
  color: #fff;
}

/* 主内容区域 */
.app-content {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* 左侧图层面板 */
.app-layer {
  width: var(--layer-width);
  border-right: 1px solid var(--border, #2a2a2a);
  background-color: var(--surface, #252525);
  z-index: 5;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  position: relative;
}

 
/* 面板内容容器 */
.panel-content {
  flex: 1;
  overflow: hidden auto;
}

/* 面板切换按钮 */
.panel-toggle-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 64px;
  background: linear-gradient(180deg, var(--surface, #252525) 0%, var(--background, #1a1a1a) 100%);
  border: 1px solid var(--border, #2a2a2a);
  cursor: pointer;
  color: var(--text-secondary, #888);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-icon {
  font-weight: 300;
  transition: transform 0.3s ease;
}

.panel-toggle-btn:hover {
  background: linear-gradient(180deg, var(--primary, #4a90d9) 0%, #357abd 100%);
  color: white;
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.4);
}

.panel-toggle-btn:hover .toggle-icon {
  transform: scale(1.2);
}

.panel-toggle-btn.expanded {
  background: linear-gradient(180deg, var(--surface, #252525) 0%, var(--background, #1a1a1a) 100%);
}

/* Tooltip 效果 */
.panel-toggle-btn::before {
  content: attr(data-tooltip);
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.25s ease;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.app-layer .panel-toggle-btn::before {
  left: calc(100% + 8px);
}

.app-property .panel-toggle-btn::before {
  right: calc(100% + 8px);
}

.panel-toggle-btn:hover::before {
  opacity: 1;
  visibility: visible;
}

.app-layer .panel-toggle-btn {
  right: -12px;
  border-left: none;
  border-radius: 0 4px 4px 0;
}

.app-property .panel-toggle-btn {
  left: -16px;
  border-right: none;
  border-radius: 4px 0 0 4px;
}

.panel-toggle-btn:hover {
  background-color: var(--border, #2a2a2a);
  color: var(--text, #fff);
}

/* 拖拽手柄 */
.resize-handle {
  width: 4px;
  cursor: col-resize;
  background-color: transparent;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 10;
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background-color: var(--primary, #4a90d9);
}

.resize-handle.right {
  right: -2px;
}

.resize-handle.left {
  left: -2px;
}

/* 右侧属性面板 */
.app-property {
  width: var(--property-width);
  border-left: 1px solid var(--border, #2a2a2a);
  background-color: var(--surface, #252525);
  z-index: 10;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  position: relative;
}

 
/* 中央设计区域 */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: var(--background, #1a1a1a);
  overflow: hidden;
  position: relative;
}

/* 项目恢复期 loading 覆盖层 */
.app-main-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--background, #1a1a1a);
  z-index: 50;
}

/* 项目恢复期间隐藏画布内容，避免未就绪的 DesignCanvas 闪现 */
.app-canvas--hidden {
  visibility: hidden;
}

/* 画布容器 */
.app-canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: var(--background, #1a1a1a);
  overflow: hidden;
}

/* 画布工具栏 */
.canvas-controls {
  background-color: var(--surface, #252525);
  border-bottom: 1px solid var(--border, #2a2a2a);
  padding: 0;
  z-index: 20;
}

/* 页面标签 */
.canvas-tabs {
  background-color: var(--surface, #252525);
  border-bottom: 1px solid var(--border, #2a2a2a);
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 15;
}

/* 系统底部状态栏 */
.app-footer {
  height: var(--footer-height);
  border-top: 1px solid var(--border, #2a2a2a);
  background-color: var(--surface, #252525);
  z-index: 100;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
}

/* 预览模态框样式 */
.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.preview-modal-content {
  background-color: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-large);
  width: 840px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.preview-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background-color: var(--surface);
}

.preview-modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text);
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-button:hover {
  background-color: var(--border);
  color: var(--text);
}

.preview-modal-body {
  padding: 0;
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--surface);
}

/* 响应式布局 */
@media (max-width: 1600px) {
  .app-layer:not(.collapsed) {
    width: 240px;
  }

  .app-property:not(.collapsed) {
    width: 280px;
  }
}

@media (max-width: 1400px) {
  .app-layer:not(.collapsed) {
    width: 220px;
  }

  .app-property:not(.collapsed) {
    width: 260px;
  }

  /* 减小工具栏按钮尺寸 */
  .panel-toggle-btn {
    width: 18px;
    height: 56px;
  }
}

@media (max-width: 1200px) {
  .app-layer:not(.collapsed) {
    width: 200px;
  }

  .app-property:not(.collapsed) {
    width: 240px;
  }
}

@media (max-width: 900px) {
  .app-layer {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
  }

  .app-property {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  }
}

/* 导入工程对话框 */
.import-hint {
  margin-bottom: 12px;
  color: var(--text-secondary);
  font-size: 14px;
}

.import-file-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--background);
  color: var(--text);
  font-size: 14px;
}

.import-status {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.import-status.info {
  background-color: var(--toast-info-bg, rgba(59, 130, 246, 0.1));
  color: var(--toast-info-text, var(--primary, #4a90d9));
  border: 1px solid var(--toast-info-border, rgba(59, 130, 246, 0.3));
}

.import-status.success {
  background-color: var(--toast-success-bg, rgba(34, 197, 94, 0.1));
  color: var(--toast-success-text, #22c55e);
  border: 1px solid var(--toast-success-border, rgba(34, 197, 94, 0.3));
}

.import-status.warning {
  background-color: var(--toast-warning-bg, rgba(245, 158, 11, 0.1));
  color: var(--toast-warning-text, #f59e0b);
  border: 1px solid var(--toast-warning-border, rgba(245, 158, 11, 0.3));
}

.import-status.error {
  background-color: var(--toast-error-bg, rgba(239, 68, 68, 0.1));
  color: var(--toast-error-text, #ef4444);
  border: 1px solid var(--toast-error-border, rgba(239, 68, 68, 0.3));
}

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
  width: 480px;
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

.dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
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

.btn-warning {
  background-color: #f59e0b;
  color: #fff;
}

.btn-warning:hover {
  background-color: #d97706;
}
</style>
