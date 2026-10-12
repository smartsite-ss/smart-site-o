<template>
  <div
    class="property-panel"
    :style="themeStyles"
  >
    <div
      v-if="selectedGraphic"
      class="property-section"
    >
      <h3>{{ $t('propertyPanel.componentProperties') }}</h3>

      <!-- 标签页切换 -->
      <div class="property-tabs">
        <button
          class="tab-button"
          :class="{ active: activeTab === 'style' }"
          @click="activeTab = 'style'"
        >
          {{ $t('propertyPanel.style') }}
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'data' }"
          @click="activeTab = 'data'"
        >
          {{ $t('propertyPanel.data') }}
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'interaction' }"
          @click="activeTab = 'interaction'"
        >
          {{ $t('propertyPanel.interaction') }}
        </button>
      </div>

      <!-- 样式面板 -->
      <div
        v-if="activeTab === 'style'"
        class="tab-content"
      >
        <StylePanel
          :graphic-properties="graphicProperties"
          @update-graphic-properties="updateGraphicProperties"
        />
      </div>

      <!-- 数据绑定面板 -->
      <div
        v-if="activeTab === 'data'"
        class="tab-content"
      >
        <DataPanel
          :key="graphicProperties?.config?.id ?? 'data-panel'"
          :graphic-properties="graphicProperties"
          @update-graphic-properties="updateGraphicProperties"
        />
      </div>

      <!-- 事件交互面板 -->
      <div
        v-if="activeTab === 'interaction'"
        class="tab-content"
      >
        <InteractionPanel
          :graphic-properties="graphicProperties"
          @update-graphic-properties="updateGraphicProperties"
        />
      </div>
    </div>

    <!-- 画布属性 -->
    <div
      v-else
      class="property-section"
    >
      <h3>{{ $t('propertyPanel.canvasProperties') }}</h3>
      
      <!-- 标签页切换 -->
      <div class="property-tabs">
        <button
          class="tab-button"
          :class="{ active: canvasActiveTab === 'properties' }"
          @click="canvasActiveTab = 'properties'"
        >
          {{ $t('propertyPanel.properties') }}
        </button>
        <button
          class="tab-button"
          :class="{ active: canvasActiveTab === 'timers' }"
          @click="canvasActiveTab = 'timers'"
        >
          {{ $t('propertyPanel.timers') }}
        </button>
        <button
          class="tab-button"
          :class="{ active: canvasActiveTab === 'json' }"
          @click="canvasActiveTab = 'json'"
        >
          {{ $t('tabPanel.json') }}
        </button>
      </div>

      <!-- 画布属性内容 -->
      <div
        v-if="canvasActiveTab === 'properties'"
        class="tab-content"
      >
        <CanvasProperties 
          :page-properties="pageProperties" 
          @update-page-properties="updatePageProperties"
        />
      </div>

      <!-- 定时器内容 -->
      <div
        v-if="canvasActiveTab === 'timers'"
        class="tab-content"
      >
        <TimerPanel 
          :page="(pageStore.currentPage || null) as any" 
          @update-page="updatePageProperties"
        />
      </div>

      <!-- JSON 编辑器内容 -->
      <div
        v-if="canvasActiveTab === 'json'"
        class="tab-content"
      >
        <JsonPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSelection } from '../../composables/useSelection';
import { useGraphic } from '../../composables/useGraphic';
import { useTheme, usePageStore } from '@scada-editor/core';
import StylePanel from './StylePanel.vue';
import DataPanel from './sections/data/DataPanel.vue';
import InteractionPanel from './InteractionPanel.vue';
import CanvasProperties from '../../canvas-page/CanvasProperties.vue';
import JsonPanel from '../../panels/json/JsonPanel.vue';
import TimerPanel from '../../scada-business/timer/TimerPanel.vue';

const { themeStyles } = useTheme();

const { selectedGraphic } = useSelection();
const { updateGraphic } = useGraphic();

// 图形属性 - 使用 any 类型避免复杂的类型检查
const graphicProperties = ref<any>({
  config: {
    id: '',
    type: '',
    name: '',
    geometry: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      scale: 1,
    },
    style: {
      backgroundColor: '#ffffff',
      color: '#000000',
      fontSize: 14,
      fontFamily: 'Arial',
      fontStyle: 'normal',
      fontWeight: 'normal',
      textAlign: 'left',
      letterSpacing: 0,
      lineHeight: 1.5,
      borderColor: '#000000',
      borderWidth: 1,
      borderRadius: 0,
      borderStyle: 'solid',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowSpread: 0,
      opacity: 1,
      padding: '0px',
      margin: '0px',
    },
    locked: false,
    visible: true,
    disabled: false,
    zIndex: 0,
    isGroup: false,
    groupId: null,
    groupMembers: [],
    customProps: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  events: [],
  dataSource: {
    type: '',
    target: null,
    payload: {},
    timestamp: Date.now(),
    validation: {
      required: false,
      min: null,
      max: null,
      pattern: '',
      script: '',
      message: '',
    },
    enabled: false,
    dataSource: '',
    dataField: '',
    displayField: '',
    dataMapping: [],
  },
  animation: {
    enabled: false,
    type: 'fade-in',
    duration: 0.5,
    delay: 0,
    properties: {},
  },
});

// 标签页状态
const activeTab = ref('style');
const canvasActiveTab = ref('properties');

// 页面属性
const pageStore = usePageStore();
const pageProperties = ref<any>(pageStore.currentPage || { id: '', name: '', width: 1920, height: 1080, scale: 1, backgroundColor: '#ffffff', backgroundImage: '' });

// 监听当前页面变化
watch(() => pageStore.currentPage, (newPage) => {
  if (newPage) {
    pageProperties.value = newPage;
  }
}, { immediate: true });

// 更新页面属性（支持 undo/redo）
const updatePageProperties = () => {
  if (pageProperties.value && pageProperties.value.id) {
    const currentPage = pageStore.currentPage;
    if (currentPage && typeof currentPage.updatePageProperties === 'function') {
      const properties = {
        width: pageProperties.value.width,
        height: pageProperties.value.height,
        backgroundColor: pageProperties.value.backgroundColor,
        backgroundImage: pageProperties.value.backgroundImage,
        scale: pageProperties.value.scale,
      };
      currentPage.updatePageProperties(properties);
    } else {
      pageStore.updatePage(pageProperties.value.id, pageProperties.value);
    }
  }
};

// 监听选择的图形变化
watch(
  () => {
    const graphic = selectedGraphic.value;
    return graphic 
      ? [
          graphic.id,
          (graphic as any)?.config?.updatedAt,
        ] 
      : null;
  },
  (_newVal, _oldVal) => {
    const newGraphic = selectedGraphic.value;
    if (newGraphic) {
      const config = (newGraphic.config as any) || {};

      const animation = (newGraphic as any)?.animation || {
        enabled: false,
        type: 'fade-in',
        duration: 0.5,
        delay: 0,
        properties: {},
      };

      const dataSource = (newGraphic as any)?.dataSource || {};
      const dataMapping = dataSource?.dataMapping || [];
      const validation = dataSource?.validation || {};

      const events = (newGraphic as any)?.events;
      // 兼容旧数据格式：{ eventHandlers: { [id]: IEvent } } → 提取为数组
      const normalizedEvents = Array.isArray(events)
        ? events
        : (events?.eventHandlers ? Object.values(events.eventHandlers as Record<string, any>) : []);

      graphicProperties.value = {
        config: {
          ...config,
          id: newGraphic.id,
          type: newGraphic.type,
          updatedAt: Date.now(),
        },
        animation,
        dataSource: {
          ...dataSource,
          enabled: dataSource.enabled ?? false,
          dataSource: dataSource.dataSource ?? '',
          dataField: dataSource.dataField ?? '',
          displayField: dataSource.displayField ?? '',
          validation: {
            required: validation.required ?? false,
            min: validation.min ?? null,
            max: validation.max ?? null,
            pattern: validation.pattern ?? '',
            script: validation.script ?? '',
            message: validation.message ?? '',
          },
          dataMapping: [...dataMapping],
        },
        events: normalizedEvents,
      };
    }
  },
  { immediate: true, deep: true }
);

// 更新图形属性
const updateGraphicProperties = () => {
  if (selectedGraphic.value) {
    // 转换数组格式 события → eventHandlers Record 格式
    const eventsArray = graphicProperties.value.events;
    let eventsForUpdate: any = {};
    if (Array.isArray(eventsArray) && eventsArray.length > 0) {
      const handlers: Record<string, any> = {};
      for (const evt of eventsArray) {
        handlers[evt.id] = evt;
      }
      eventsForUpdate = { eventHandlers: handlers };
    }

    const updatedProperties = {
      config: {
        ...(graphicProperties.value.config || {}),
        updatedAt: Date.now(),
      },
      events: eventsForUpdate,
      dataSource: graphicProperties.value.dataSource || {
        type: '',
        target: null,
        payload: {},
        timestamp: Date.now(),
        validation: {
          required: false,
          min: null,
          max: null,
          pattern: '',
          script: '',
          message: '',
        },
        enabled: false,
        dataSource: '',
        dataField: '',
        displayField: '',
        dataMapping: [],
      },
      animation: graphicProperties.value.animation || {
        enabled: false,
        type: 'fade-in',
        duration: 0.5,
        delay: 0,
        properties: {},
      },
    };
    updateGraphic(selectedGraphic.value.id, updatedProperties);
  }
};
</script>


<style lang="scss">
// 全局基础样式——不 scoped，保证规则 100% 命中不受 scope 渗透影响
@import '../../panels/styles/property-panel.scss';
</style>




<style scoped>
.property-panel {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.property-tabs {
  display: flex;
  background-color: var(--background);
  border-bottom: 1px solid var(--border);
  margin: 0;
  padding: 0;
}

.tab-button {
  flex: 1;
  padding: 10px 12px;
  background-color: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  margin: 0;
}

.tab-button:hover {
  background-color: var(--control-button-hover);
  color: var(--text);
}

.tab-button.active {
  color: var(--primary);
  font-weight: 600;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--primary);
  border-radius: 2px 2px 0 0;
}

.property-section h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background-color: var(--background);
  letter-spacing: 0.3px;
}

.property-section p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: center;
  padding: 60px 24px;
  line-height: 1.6;
}

.tab-content {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  outline: none !important;
}

.tab-content > * {
  margin-top: 0 !important;
}

/* 显式覆盖子组件根元素的 padding（@import 在 scoped 中存在 scope 渗透问题） */
.style-panel-content {
  padding: 0 !important;
  margin: 0 !important;
}
</style>
