// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * usePropertyEditor - 属性面板核心逻辑 Composable
 *
 * 抽取自 StylePanel.vue，提供：
 * - config/geometry/style computed 引用
 * - style 属性默认值自动注入
 * - 分组折叠状态管理
 * - 防抖更新（150ms）
 * - 自定义属性增删
 * - 图元 ID 复制
 *
 * 用法：
 *   const { config, geometry, style, expandedGroups, ... } = usePropertyEditor(props, emit);
 */
import { ref, reactive, computed, watch, type ComputedRef } from 'vue';
import { usePageStore, type IGraphicConfig, type IGeometry, type IGraphicStyle } from '@scada-editor/core';

// ==================== 类型导出 ====================

export interface GraphicPropertiesData {
  config: IGraphicConfig;
  animation?: {
    enabled: boolean;
    type: string;
    duration: number;
    delay: number;
    properties: Record<string, any>;
  };
}

interface GroupKey {
  [key: string]: boolean;
}

// ==================== 常量 ====================

const TEXT_RELEVANT_TYPES = ['label', 'text', 'button', 'input-text', 'textarea', 'link'];

const DEFAULT_STYLE: Partial<IGraphicStyle> = {
  borderWidth: 0,
  borderRadius: 0,
  opacity: 1,
  borderStyle: 'solid',
  backgroundColor: '#ffffff',
  borderColor: '#000000',
  fontColor: '#000000',
  fontSize: 14,
  fontFamily: 'Arial',
  fontStyle: 'normal',
  fontWeight: 'normal',
  textAlign: 'left',
  letterSpacing: 0,
  lineHeight: 1.2,
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowSpread: 0,
  shadowColor: 'rgba(0,0,0,0.2)',
  padding: '',
  margin: '',
};

const DEFAULT_EXPANDED: GroupKey = {
  graphic: true,
  position: true,
  fillBorder: false,
  textStyle: false,
  shadow: false,
  animation: false,
  layout: false,
  custom: false,
  generic: true,
};

const DEBOUNCE_MS = 150;

// ==================== Composable ====================

export function usePropertyEditor(
  graphicProperties: () => GraphicPropertiesData | undefined,
  emit: (event: 'updateGraphicProperties') => void,
) {
  // ---- Store ----
  const pageStore = usePageStore();

  function updateGraphic(id: string, properties: Partial<Record<string, any>>) {
    const currentPage = pageStore.currentPage;
    if (currentPage?.updateGraphic) {
      currentPage.updateGraphic(id, properties);
    }
  }

  // ---- 核心引用 ----
  const config: ComputedRef<IGraphicConfig | undefined> = computed(
    () => graphicProperties()?.config,
  );

  const geometry: ComputedRef<IGeometry | undefined> = computed(() => config.value?.geometry);
  const style: ComputedRef<IGraphicStyle | undefined> = computed(() => config.value?.style);

  const hasGeometry = computed(() => !!geometry.value);
  const hasStyleConfig = computed(() => !!style.value);

  // ---- 文字样式显隐 ----
  const showTextStyle = computed(() =>
    config.value ? TEXT_RELEVANT_TYPES.includes(config.value.type) : false,
  );

  // ---- style 默认值注入 ----
  watch(config, (newConfig) => {
    if (!newConfig?.style) return;
    const s = newConfig.style;
    for (const [key, val] of Object.entries(DEFAULT_STYLE)) {
      if ((s as Record<string, unknown>)[key] === undefined) {
        (s as Record<string, unknown>)[key] = val;
      }
    }
  }, { immediate: true });

  // ---- 分组折叠 ----
  const expandedGroups = reactive<GroupKey>({ ...DEFAULT_EXPANDED });

  function toggleGroup(key: string, event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.group-label') === event.currentTarget) {
      expandedGroups[key] = !expandedGroups[key];
    }
  }

  // ---- 防抖更新 ----
  let updateTimer: ReturnType<typeof setTimeout> | null = null;

  function commitUpdate() {
    if (!config.value) return;
    const gp = graphicProperties();
    const updatedProperties: Record<string, any> = {
      ...config.value,
      updatedAt: Date.now(),
    };
    if (gp?.animation) {
      updatedProperties.animation = gp.animation;
    }
    updateGraphic(config.value.id, updatedProperties);
    emit('updateGraphicProperties');
  }

  function debouncedUpdate() {
    if (updateTimer) clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      commitUpdate();
    }, DEBOUNCE_MS);
  }

  /** 所有输入/变更事件统一走防抖 */
  function onFieldChange() {
    debouncedUpdate();
  }

  function previewAnimation() {
    if (!config.value) return;
    const page = pageStore.currentPage as any;
    const engine = page?.getAnimationEngine?.();
    if (!engine) return;
    const graphic = page?.graphics?.find((g: any) => g.id === config.value!.id);
    if (graphic) {
      engine.previewOnce(graphic);
    }
  }

  // ---- 自定义属性 ----
  const newPropKey = ref('');
  const newPropValue = ref('');

  function addProp() {
    if (newPropKey.value && newPropValue.value && config.value) {
      config.value.customProps[newPropKey.value] = newPropValue.value;
      newPropKey.value = '';
      newPropValue.value = '';
      commitUpdate(); // 立即提交，不走防抖
    }
  }

  function removeProp(key: string) {
    if (config.value) {
      delete config.value.customProps[key];
      commitUpdate(); // 立即提交
    }
  }

  // ---- 复制 ID ----
  function copyGraphicId() {
    if (config.value) {
      navigator.clipboard.writeText(config.value.id).catch(err => {
        console.error('复制失败:', err);
      });
    }
  }

  // ---- 安全数值属性访问器 ----
  function styleNum(key: keyof IGraphicStyle): number {
    return (style.value?.[key] as number) ?? 0;
  }

  function setStyleNum(key: keyof IGraphicStyle, value: number) {
    if (style.value) {
      (style.value as Record<string, unknown>)[key] = value;
    }
  }

  return {
    // 核心引用
    config,
    geometry,
    style,
    hasGeometry,
    hasStyleConfig,
    showTextStyle,
    // 分组折叠
    expandedGroups,
    toggleGroup,
    // 更新
    onFieldChange,
    commitUpdate,
    previewAnimation,
    // 自定义属性
    newPropKey,
    newPropValue,
    addProp,
    removeProp,
    // 复制 ID
    copyGraphicId,
    // 安全数值属性
    styleNum,
    setStyleNum,
  };
}
