// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { watch, ref, type Ref } from 'vue';
import { useI18n } from '@scada-editor/core';

/**
 * useSourceEditor — SourceEditor 通用同步逻辑
 *
 * 抽取自 StaticSourceEditor / ApiSourceEditor / TagSourceSelector / DbSourceEditor 的共性样板：
 * 1. useI18n 初始化
 * 2. 基于 props.typeData 创建响应式 ref，并自动监听变化
 * 3. emitUpdate 工具函数触发 'update' 事件
 *
 * 与抽取基础组件相比，composable 不侵入模板布局，适配 4 个组件差异较大的 UI 结构。
 */
export interface SourceEditorContext {
  /** 从 typeData 取值的函数 */
  getValue: (typeData: Record<string, any>) => any;
  /** 默认值 */
  fallback: any;
}

export function useSourceEditor() {
  const { t } = useI18n();

  /**
   * 创建与 props.typeData 同步的 ref，并自动注册深度监听。
   * 当 typeData 中对应字段变化时，自动更新 ref 值。
   *
   * @param typeDataSource 返回当前 typeData 的 getter 函数
   * @param ctx 取值上下文
   */
  function syncedRef(
    typeDataSource: () => Record<string, any> | undefined,
    ctx: SourceEditorContext,
  ): Ref<any> {
    const initial = typeDataSource() ?? {};
    const r = ref(ctx.getValue(initial) ?? ctx.fallback);

    watch(
      typeDataSource,
      (val) => {
        if (!val) return;
        const next = ctx.getValue(val);
        if (next !== undefined && next !== r.value) r.value = next;
      },
      { deep: true },
    );

    return r;
  }

  /**
   * 触发 'update' 事件的工具函数。
   */
  function emitUpdate(
    emit: (event: 'update', data: Record<string, any>) => void,
    data: Record<string, any>,
  ): void {
    emit('update', data);
  }

  return { t, syncedRef, emitUpdate };
}
