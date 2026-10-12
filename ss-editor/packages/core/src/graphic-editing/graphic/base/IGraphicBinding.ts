// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 声明式图元属性绑定
 *
 * 配置在图元 customProps.bindings 中，由 BindingEngine 自动解析和执行。
 * 支持跨图元属性双向同步，无需手写联动代码。
 */
export interface IGraphicBinding {
  /** 源图元ID（"self" 表示自身） */
  sourceId: string;

  /** 源属性路径，如 "customProps.value" */
  sourcePath: string;

  /** 目标图元ID */
  targetId: string;

  /** 目标属性路径 */
  targetPath: string;

  /** 可选：变换函数名或自定义函数 */
  transform?: string | ((value: any) => any);

  /** 可选：触发条件 */
  condition?: {
    field: string;
    operator: string;
    value: any;
  };
}