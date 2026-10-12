// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { computed } from 'vue';
import {
  type ChartTagBinding,
  type ChartVariableBinding,
  createDefaultSeriesStyle,
  DEFAULT_TREND_COLORS,
} from '@scada-editor/shared';
import type { SelectableVariable } from '../components/tag-variable/types';
import { useProjectId } from './useProjectId';

export type TagBindingMode = 'flat' | 'array-single' | 'array-multiple';

export type TagBindingItem = ChartVariableBinding | ChartTagBinding;

export interface TagBindingOptions {
  /** 绑定存储形态：flat 平铺字段 / array-single 单变量数组 / array-multiple 多变量数组 */
  mode: TagBindingMode;
  /** 绑定项是否附带趋势样式（仅 array-multiple 趋势组件使用） */
  withStyle?: boolean;
  /** flat 模式选中变量时额外写回的字段（如 unit / decimalPlaces 带出） */
  extraFields?: (variable: SelectableVariable) => Record<string, unknown>;
}

/**
 * 统一管理「设备变量绑定」的读写逻辑，供各系统插件配置面板复用。
 * 泛型 TBinding 用于区分无样式（ChartVariableBinding）与带趋势样式（ChartTagBinding）两种绑定项。
 */
export function useTagBinding<TBinding extends TagBindingItem = ChartVariableBinding>(
  props: { graphicProperties: any },
  emit: () => void,
  options: TagBindingOptions,
) {
  const projectId = useProjectId();
  const customProps = computed(() => props.graphicProperties?.config?.customProps ?? {});

  const tags = computed<TBinding[]>(() => {
    const raw = customProps.value.tags;
    return Array.isArray(raw) ? (raw as TBinding[]) : [];
  });

  const current = computed<ChartVariableBinding | null>(() => {
    const cp = customProps.value;
    if (!cp.tagId) return null;
    return {
      projectId: cp.projectId ?? projectId.value,
      deviceId: cp.deviceId ?? '',
      deviceCode: cp.deviceCode ?? '',
      deviceName: cp.deviceName ?? '',
      tagId: cp.tagId,
      tagName: cp.tagName ?? '',
      dataType: cp.dataType ?? 'float',
    };
  });

  function bindLabel(item: TagBindingItem): string {
    const device = item.deviceName || item.deviceCode || '';
    const tag = item.tagName || item.tagId;
    return device ? `${device}.${tag}` : tag;
  }

  function buildBinding(variable: SelectableVariable): TBinding {
    const base = {
      projectId: projectId.value,
      deviceId: variable.deviceId,
      deviceCode: variable.deviceCode,
      deviceName: variable.deviceName,
      tagId: variable.tagId,
      tagName: variable.tagName,
      dataType: variable.dataType,
    };
    if (!options.withStyle) return base as TBinding;
    const color = DEFAULT_TREND_COLORS[tags.value.length % DEFAULT_TREND_COLORS.length];
    return { ...base, style: createDefaultSeriesStyle(color) } as TBinding;
  }

  function writeTags(next: TagBindingItem[]) {
    const gp = props.graphicProperties as any;
    if (!gp?.config) return;
    if (!gp.config.customProps) gp.config.customProps = {};
    gp.config.customProps.tags = next;
    emit();
  }

  /** 以替换引用的方式修改 tags，保证编辑态响应式刷新；趋势组件复用此方法修改每变量样式 */
  function mutateTags(mutator: (list: TBinding[]) => void) {
    const next = tags.value.slice();
    mutator(next);
    writeTags(next);
  }

  function addVariable(variable: SelectableVariable) {
    if (options.mode === 'flat') {
      const gp = props.graphicProperties as any;
      if (!gp?.config) return;
      if (!gp.config.customProps) gp.config.customProps = {};
      Object.assign(gp.config.customProps, {
        projectId: projectId.value,
        deviceId: variable.deviceId,
        deviceCode: variable.deviceCode,
        deviceName: variable.deviceName,
        tagId: variable.tagId,
        tagName: variable.tagName,
        dataType: variable.dataType,
        ...(options.extraFields ? options.extraFields(variable) : {}),
      });
      emit();
      return;
    }

    if (options.mode === 'array-single') {
      writeTags([buildBinding(variable)]);
      return;
    }

    mutateTags((list) => {
      if (list.some((t) => t.tagId === variable.tagId)) return;
      list.push(buildBinding(variable));
    });
  }

  function removeTag(index: number) {
    mutateTags((list) => {
      list.splice(index, 1);
    });
  }

  function clearTag() {
    writeTags([]);
  }

  function clearBind() {
    const gp = props.graphicProperties as any;
    if (!gp?.config) return;
    if (!gp.config.customProps) gp.config.customProps = {};
    Object.assign(gp.config.customProps, {
      projectId: '',
      deviceId: '',
      deviceCode: '',
      deviceName: '',
      tagId: '',
      tagName: '',
      dataType: 'float',
    });
    emit();
  }

  return {
    projectId,
    tags,
    current,
    bindLabel,
    addVariable,
    removeTag,
    clearTag,
    clearBind,
    mutateTags,
  };
}
